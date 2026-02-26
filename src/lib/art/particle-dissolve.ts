/**
 * Particle Dissolve — Image rendered as thousands of tiny particles.
 * Dense at the center, scattering and dissolving toward the edges
 * into the page background. Particles subtly drift.
 */

interface Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  r: number;
  g: number;
  b: number;
  size: number;
  drift: number;
  driftAngle: number;
  alpha: number;
}

export function renderParticleDissolve(
  canvas: HTMLCanvasElement,
  imageSrcs: string[],
  options: {
    density?: number;
    maxParticleSize?: number;
    bgColor?: string;
    animated?: boolean;
    accentMix?: number;
    accentColor?: [number, number, number];
  } = {}
) {
  const {
    density = 3,
    maxParticleSize = 2.5,
    bgColor = "#fafaf9",
    animated = true,
    accentMix = 0.25,
    accentColor = [217, 119, 6],
  } = options;

  const ctx = canvas.getContext("2d")!;
  const container = canvas.parentElement!;
  const width = container.clientWidth;
  const height = Math.min(500, Math.floor(width * 0.6));

  canvas.width = width;
  canvas.height = height;

  const images: HTMLImageElement[] = [];
  let loaded = 0;
  let animId: number;

  function onAllLoaded() {
    // Blend images
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d")!;

    // First image: full opacity
    drawCover(offCtx, images[0], width, height);

    // Additional images: screen blend
    for (let i = 1; i < images.length; i++) {
      offCtx.globalCompositeOperation = "screen";
      offCtx.globalAlpha = 0.6;
      drawCover(offCtx, images[i], width, height);
    }
    offCtx.globalAlpha = 1;
    offCtx.globalCompositeOperation = "source-over";

    // Desaturate slightly
    offCtx.filter = "grayscale(30%) contrast(1.15)";
    offCtx.drawImage(offscreen, 0, 0);
    offCtx.filter = "none";

    const imageData = offCtx.getImageData(0, 0, width, height);

    // Sample particles
    const particles: Particle[] = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX ** 2 + centerY ** 2);

    for (let y = 0; y < height; y += density) {
      for (let x = 0; x < width; x += density) {
        const i = (y * width + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Distance from center (0-1)
        const dx = (x - centerX) / centerX;
        const dy = (y - centerY) / centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Skip very bright pixels and edge pixels with probability
        const skipProb = dist * 0.7; // More likely to skip at edges
        if (Math.random() < skipProb && dist > 0.5) continue;
        if (brightness > 0.95) continue;

        // Mix with accent color
        const mr = Math.round(r * (1 - accentMix) + accentColor[0] * accentMix);
        const mg = Math.round(g * (1 - accentMix) + accentColor[1] * accentMix);
        const mb = Math.round(b * (1 - accentMix) + accentColor[2] * accentMix);

        // Alpha fades toward edges
        const edgeFade = Math.max(0, 1 - dist * 0.8);
        const alpha = edgeFade * (0.3 + brightness * 0.5);

        // Size varies with brightness and distance
        const size = maxParticleSize * (0.3 + (1 - brightness) * 0.7) * (0.5 + edgeFade * 0.5);

        particles.push({
          x: x + (Math.random() - 0.5) * density,
          y: y + (Math.random() - 0.5) * density,
          originX: x,
          originY: y,
          r: mr,
          g: mg,
          b: mb,
          size,
          drift: 0.2 + Math.random() * 0.5 + dist * 1.5, // More drift at edges
          driftAngle: Math.random() * Math.PI * 2,
          alpha,
        });
      }
    }

    let time = 0;

    function render() {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      for (const p of particles) {
        const offsetX = Math.sin(time * 0.01 + p.driftAngle) * p.drift;
        const offsetY = Math.cos(time * 0.013 + p.driftAngle * 1.3) * p.drift;

        ctx.fillStyle = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x + offsetX, p.y + offsetY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (animated) {
        time++;
        animId = requestAnimationFrame(render);
      }
    }

    render();
  }

  imageSrcs.forEach((src) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      images.push(img);
      loaded++;
      if (loaded === imageSrcs.length) onAllLoaded();
    };
    img.src = src;
  });

  return () => cancelAnimationFrame(animId);
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const imgAspect = img.width / img.height;
  const canvasAspect = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (imgAspect > canvasAspect) {
    sw = img.height * canvasAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / canvasAspect;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}
