/**
 * Halftone Alive — Image rendered as a dot grid where each dot's size,
 * opacity, and color are modulated by an animated Perlin noise field.
 * Dots breathe and shimmer as noise flows across the image.
 */

// Value noise with smoothstep
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

function fbm(x: number, y: number, t: number, octaves: number = 3): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise2D(x * freq + t * 0.3, y * freq + t * 0.2, i * 43);
    amp *= 0.5;
    freq *= 2;
  }
  return value;
}

interface Dot {
  x: number;
  y: number;
  baseRadius: number;
  r: number;
  g: number;
  b: number;
  brightness: number;
}

export function renderHalftoneAlive(
  canvas: HTMLCanvasElement,
  imageSrc: string,
  options: {
    dotSpacing?: number;
    maxRadius?: number;
    bgColor?: string;
    accentColor?: [number, number, number];
    colorMix?: number;         // 0 = pure accent, 1 = pure image color
    noiseScale?: number;
    noiseSpeed?: number;
    pulseAmount?: number;      // How much noise affects dot size (0-1)
    colorShiftAmount?: number; // How much noise shifts color warmth (0-1)
    fadeEdge?: boolean;
  } = {}
) {
  const {
    dotSpacing = 5,
    maxRadius = dotSpacing * 0.42,
    bgColor = "#fafaf9",
    accentColor = [217, 119, 6],
    colorMix = 0.4,
    noiseScale = 0.008,
    noiseSpeed = 0.0008,
    pulseAmount = 0.35,
    colorShiftAmount = 0.3,
    fadeEdge = true,
  } = options;

  const ctx = canvas.getContext("2d")!;
  const img = new Image();
  img.crossOrigin = "anonymous";

  let animId: number;
  let dots: Dot[] = [];
  let width = 0;
  let height = 0;

  img.onload = () => {
    const container = canvas.parentElement!;
    width = container.clientWidth;
    const aspectRatio = img.height / img.width;
    height = Math.min(500, Math.floor(width * Math.min(aspectRatio, 0.6)));

    canvas.width = width;
    canvas.height = height;

    // Get image pixel data
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d")!;
    offCtx.drawImage(img, 0, 0, width, height);
    const imageData = offCtx.getImageData(0, 0, width, height);

    // Pre-calculate dot grid
    const centerX = width / 2;
    const centerY = height / 2;

    for (let y = dotSpacing / 2; y < height; y += dotSpacing) {
      for (let x = dotSpacing / 2; x < width; x += dotSpacing) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        const i = (py * width + px) * 4;

        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Base radius from brightness (darker = bigger)
        const baseRadius = maxRadius * (1 - brightness);

        if (baseRadius < 0.3) continue; // Skip very bright areas

        // Edge fade
        if (fadeEdge) {
          const dx = (x - centerX) / centerX;
          const dy = (y - centerY) / centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 1.2) continue; // Cull dots far from center
        }

        dots.push({ x, y, baseRadius, r, g, b, brightness });
      }
    }

    let time = 0;

    function animate() {
      // Parse bgColor for clearing
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      for (const dot of dots) {
        // Sample noise at this dot's position
        const n = fbm(dot.x * noiseScale, dot.y * noiseScale, time * noiseSpeed);
        // Second noise layer for color
        const n2 = fbm(
          dot.x * noiseScale * 1.5 + 100,
          dot.y * noiseScale * 1.5 + 100,
          time * noiseSpeed * 0.7
        );

        // Modulate radius: base ± pulse
        const radiusMod = 1 + (n - 0.5) * 2 * pulseAmount;
        const radius = Math.max(0.2, dot.baseRadius * radiusMod);

        // Color: blend between image color and accent, shifted by noise
        const warmShift = (n2 - 0.5) * colorShiftAmount;
        const mix = Math.max(0, Math.min(1, colorMix + warmShift));

        const cr = Math.round(dot.r * mix + accentColor[0] * (1 - mix));
        const cg = Math.round(dot.g * mix + accentColor[1] * (1 - mix));
        const cb = Math.round(dot.b * mix + accentColor[2] * (1 - mix));

        // Opacity: based on brightness + noise + edge fade
        let alpha = 0.3 + (1 - dot.brightness) * 0.5 + (n - 0.5) * 0.15;

        if (fadeEdge) {
          const dx = (dot.x - centerX) / centerX;
          const dy = (dot.y - centerY) / centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const edgeFade = Math.max(0, 1 - dist * 0.85);
          alpha *= edgeFade;
        }

        alpha = Math.max(0, Math.min(1, alpha));

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

  return () => cancelAnimationFrame(animId);
}
