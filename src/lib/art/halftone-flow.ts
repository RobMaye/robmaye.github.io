/**
 * Halftone Flow — Static halftone dot grid from an image, with an invisible
 * flow field running on top. The flow field's particle density at each dot
 * controls how much of the source image's true color bleeds through vs.
 * staying as flat amber. Where particles converge = rich color emerges.
 * Where sparse = plain amber. Animated.
 *
 * Supports cropping a vertical region of the source image and controlling
 * fade direction (down, up, or radial) for split-layout use.
 */

// ---- Noise ----
function noise2D(x: number, y: number, seed: number = 0): number {
  const hash = (n: number) => {
    let h = n + seed;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = ((h >> 16) ^ h) * 0x45d9f3b;
    h = (h >> 16) ^ h;
    return (h & 0xffff) / 0xffff;
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash(ix + iy * 57);
  const n10 = hash(ix + 1 + iy * 57);
  const n01 = hash(ix + (iy + 1) * 57);
  const n11 = hash(ix + 1 + (iy + 1) * 57);
  return (n00 * (1 - sx) + n10 * sx) * (1 - sy) +
    (n01 * (1 - sx) + n11 * sx) * sy;
}

function fbm(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise2D(x * freq, y * freq, i * 43);
    amp *= 0.5;
    freq *= 2;
  }
  return value;
}

// ---- Flow field particles (invisible, only update a density map) ----
interface Particle {
  x: number;
  y: number;
}

export interface HalftoneFlowOptions {
  dotSpacing?: number;
  maxRadius?: number;
  bgColor?: string;
  accentColor?: [number, number, number];
  particleCount?: number;
  flowNoiseScale?: number;
  flowSpeed?: number;
  colorBleedStrength?: number;
  fadeEdge?: boolean;
  /** Vertical crop region of the source image as fractions [start, end].
   *  e.g. [0, 0.45] = top 45%, [0.55, 1] = bottom 45%. Default: [0, 1] (full image) */
  cropRegion?: [number, number];
  /** Which edge fades to transparent: 'down' = solid top → fade bottom,
   *  'up' = solid bottom → fade top, 'radial' = fade from center outward (default) */
  fadeDirection?: "down" | "up" | "radial";
  /** How far the fade extends (0-1). 0.4 = fade starts 40% from the fading edge. Default 0.5 */
  fadeAmount?: number;
  /** Canvas height override in pixels. If not set, auto-calculated from aspect ratio */
  height?: number;
}

export interface HalftoneFlowController {
  destroy: () => void;
  updateTheme: (bgColor: string, accentColor: [number, number, number]) => void;
}

export function renderHalftoneFlow(
  canvas: HTMLCanvasElement,
  imageSrc: string,
  options: HalftoneFlowOptions = {}
): HalftoneFlowController {
  const {
    dotSpacing = 5,
    maxRadius = dotSpacing * 0.48,
    bgColor: initialBg = "#fafaf9",
    accentColor: initialAccent = [217, 119, 6],
    particleCount = 2500,
    flowNoiseScale = 0.003,
    flowSpeed = 0.8,
    colorBleedStrength = 0.9,
    fadeEdge = true,
    cropRegion = [0, 1],
    fadeDirection = "radial",
    fadeAmount = 0.5,
    height: heightOverride,
  } = options;

  // Mutable theme colors — snapped instantly on toggle
  let liveBg = initialBg;
  let liveAccent: [number, number, number] = [...initialAccent];

  const ctx = canvas.getContext("2d")!;
  const img = new Image();
  img.crossOrigin = "anonymous";
  let animId: number;

  img.onload = () => {
    const container = canvas.parentElement!;
    const width = container.clientWidth;

    // Full image dimensions at this width
    const fullHeight = Math.floor(width * (img.height / img.width));

    // Crop: which rows of the full-size image to sample
    const cropStartPx = Math.floor(fullHeight * cropRegion[0]);
    const cropEndPx = Math.floor(fullHeight * cropRegion[1]);
    const croppedHeight = cropEndPx - cropStartPx;

    // Canvas height: override or natural cropped height
    const isFull = cropRegion[0] === 0 && cropRegion[1] === 1;
    const height = heightOverride || (isFull ? croppedHeight : Math.min(500, croppedHeight));

    canvas.width = width;
    canvas.height = height;

    // Draw full image to offscreen, then sample the cropped region
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = fullHeight;
    const offCtx = offscreen.getContext("2d")!;
    offCtx.drawImage(img, 0, 0, width, fullHeight);

    // Extract just the cropped vertical region
    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = width;
    cropCanvas.height = height;
    const cropCtx = cropCanvas.getContext("2d")!;
    // Draw the cropped portion of the full image, scaled to fit canvas height
    cropCtx.drawImage(
      offscreen,
      0, cropStartPx, width, croppedHeight,  // source rect
      0, 0, width, height                     // dest rect
    );
    const imageData = cropCtx.getImageData(0, 0, width, height);

    // Pre-calculate dot positions
    const centerX = width / 2;

    interface Dot {
      x: number;
      y: number;
      radius: number;
      imgR: number;
      imgG: number;
      imgB: number;
      brightness: number;
      edgeFade: number;
      cellX: number;
      cellY: number;
    }

    const dots: Dot[] = [];
    for (let y = dotSpacing / 2; y < height; y += dotSpacing) {
      for (let x = dotSpacing / 2; x < width; x += dotSpacing) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        const i = (py * width + px) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
        const radius = maxRadius * (1 - brightness);

        if (radius < 0.3) continue;

        // Calculate edge fade based on direction
        let edgeFade = 1;
        if (fadeEdge) {
          if (fadeDirection === "radial") {
            const dx = (x - centerX) / centerX;
            const dy = (y - height / 2) / (height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            edgeFade = Math.max(0, 1 - dist * 0.7);
          } else if (fadeDirection === "down") {
            // Solid at top, fades toward bottom
            const progress = y / height; // 0 at top, 1 at bottom
            const fadeStart = 1 - fadeAmount; // e.g. 0.5 means fade starts at 50%
            edgeFade = progress < fadeStart ? 1 : Math.max(0, 1 - (progress - fadeStart) / fadeAmount);
            // Also fade left/right edges gently
            const dx = Math.abs(x - centerX) / centerX;
            edgeFade *= Math.max(0, 1 - dx * 0.4);
          } else if (fadeDirection === "up") {
            // Solid at bottom, fades toward top
            const progress = 1 - y / height; // 0 at bottom, 1 at top
            const fadeStart = 1 - fadeAmount;
            edgeFade = progress < fadeStart ? 1 : Math.max(0, 1 - (progress - fadeStart) / fadeAmount);
            // Also fade left/right edges gently
            const dx = Math.abs(x - centerX) / centerX;
            edgeFade *= Math.max(0, 1 - dx * 0.4);
          }
          if (edgeFade < 0.01) continue;
        }

        dots.push({
          x, y, radius,
          imgR: r, imgG: g, imgB: b,
          brightness, edgeFade,
          cellX: Math.floor(x / dotSpacing),
          cellY: Math.floor(y / dotSpacing),
        });
      }
    }

    // Density map — grid-aligned to dot spacing for fast lookup
    const gridCols = Math.ceil(width / dotSpacing);
    const gridRows = Math.ceil(height / dotSpacing);
    const densityMap = new Float32Array(gridCols * gridRows);

    // Flow field particles
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
      });
    }

    let time = 0;

    function animate() {
      // Decay density map (so old trails fade)
      for (let i = 0; i < densityMap.length; i++) {
        densityMap[i] *= 0.92;
      }

      // Update flow field particles and stamp density
      for (const p of particles) {
        // Primary flow field
        const angle = fbm(
          p.x * flowNoiseScale + time * 0.0003,
          p.y * flowNoiseScale + time * 0.0002
        ) * Math.PI * 4;

        p.x += Math.cos(angle) * flowSpeed;
        p.y += Math.sin(angle) * flowSpeed;

        // Second noise layer — large-scale intensity modulation.
        // Slower, bigger scale: creates macro zones where color pools vs stays quiet.
        const intensityMod = fbm(
          p.x * flowNoiseScale * 0.4 + time * 0.00008,
          p.y * flowNoiseScale * 0.4 + time * 0.00006,
          3
        );
        // Remap from [0,1] to [0.1, 1.0] — quiet zones still get a whisper
        const modStrength = 0.1 + intensityMod * 0.9;

        // Stamp density in a wide radius, modulated by second noise layer
        const gx = Math.floor(p.x / dotSpacing);
        const gy = Math.floor(p.y / dotSpacing);
        const stampRadius = 3;
        for (let dy = -stampRadius; dy <= stampRadius; dy++) {
          for (let dx = -stampRadius; dx <= stampRadius; dx++) {
            const nx = gx + dx;
            const ny = gy + dy;
            if (nx >= 0 && nx < gridCols && ny >= 0 && ny < gridRows) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist <= stampRadius) {
                const strength = 0.12 * (1 - dist / (stampRadius + 1)) * modStrength;
                densityMap[ny * gridCols + nx] = Math.min(1, densityMap[ny * gridCols + nx] + strength);
              }
            }
          }
        }

        // Reset out-of-bounds particles
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
        }
      }

      // Render dots
      ctx.fillStyle = liveBg;
      ctx.fillRect(0, 0, width, height);

      for (const dot of dots) {
        // Look up flow density at this dot's grid cell
        const di = dot.cellY * gridCols + dot.cellX;
        const density = di >= 0 && di < densityMap.length ? densityMap[di] : 0;

        // Base color: desaturated image color with a subtle warm shift toward accent.
        // This way the resting state already hints at the image, not flat orange.
        const grey = dot.imgR * 0.299 + dot.imgG * 0.587 + dot.imgB * 0.114;
        // Mix image color toward its greyscale (desaturate ~60%), then tint slightly toward accent (~20%)
        const baseR = grey * 0.6 + dot.imgR * 0.2 + liveAccent[0] * 0.2;
        const baseG = grey * 0.6 + dot.imgG * 0.2 + liveAccent[1] * 0.2;
        const baseB = grey * 0.6 + dot.imgB * 0.2 + liveAccent[2] * 0.2;

        // Density controls how much true color shows (0 = warm-muted base, 1 = full image color)
        const colorBleed = density * colorBleedStrength;

        const cr = Math.round(baseR * (1 - colorBleed) + dot.imgR * colorBleed);
        const cg = Math.round(baseG * (1 - colorBleed) + dot.imgG * colorBleed);
        const cb = Math.round(baseB * (1 - colorBleed) + dot.imgB * colorBleed);

        // Density boosts dot size and opacity — capped to prevent overlapping
        const radiusMod = 1 + density * 0.25;
        const alphaMod = 1 + density * 0.2;

        const alpha = Math.min(1, (0.45 + (1 - dot.brightness) * 0.4) * dot.edgeFade * alphaMod);
        const radius = Math.min(dot.radius * radiusMod, dotSpacing * 0.48);

        if (alpha < 0.01 || radius < 0.2) continue;

        ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      time++;
      animId = requestAnimationFrame(animate);
    }

    animate();
  };

  img.src = imageSrc;

  return {
    destroy: () => cancelAnimationFrame(animId),
    updateTheme: (newBg: string, newAccent: [number, number, number]) => {
      liveBg = newBg;
      liveAccent = [...newAccent];
    },
  };
}
