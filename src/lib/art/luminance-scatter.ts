/**
 * Luminance Scatter — Images rendered as scattered points positioned
 * by luminance. Dark areas are dense clusters, light areas sparse.
 * Points fade radially into the background. Stippled, organic feel.
 */
export function renderLuminanceScatter(
  canvas: HTMLCanvasElement,
  imageSrcs: string[],
  options: {
    pointCount?: number;
    maxSize?: number;
    bgColor?: string;
    monoColor?: string | null;
    fadeRadius?: number;
  } = {}
) {
  const {
    pointCount = 30000,
    maxSize = 1.8,
    bgColor = "#fafaf9",
    monoColor = null, // null = use source colors
    fadeRadius = 0.85,
  } = options;

  const ctx = canvas.getContext("2d")!;
  const container = canvas.parentElement!;
  const width = container.clientWidth;
  const height = Math.min(500, Math.floor(width * 0.6));

  canvas.width = width;
  canvas.height = height;

  const images: HTMLImageElement[] = [];
  let loaded = 0;

  function onAllLoaded() {
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d")!;

    // Blend: first image base, rest overlaid
    drawCover(offCtx, images[0], width, height);
    for (let i = 1; i < images.length; i++) {
      offCtx.globalCompositeOperation = "screen";
      offCtx.globalAlpha = 0.5;
      drawCover(offCtx, images[i], width, height);
    }
    offCtx.globalAlpha = 1;
    offCtx.globalCompositeOperation = "source-over";
    offCtx.filter = "contrast(1.2)";
    offCtx.drawImage(offscreen, 0, 0);
    offCtx.filter = "none";

    const imageData = offCtx.getImageData(0, 0, width, height);

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // Weighted random sampling — darker pixels more likely to be chosen
    let placed = 0;
    let attempts = 0;
    const maxAttempts = pointCount * 5;

    while (placed < pointCount && attempts < maxAttempts) {
      attempts++;
      const x = Math.random() * width;
      const y = Math.random() * height;
      const px = Math.floor(x);
      const py = Math.floor(y);
      const i = (py * width + px) * 4;

      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

      // Probability: darker = more likely to place a dot
      if (Math.random() > (1 - brightness) * 0.8 + 0.1) continue;

      // Distance from center for edge fade
      const dx = (x - centerX) / centerX;
      const dy = (y - centerY) / centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const fade = Math.max(0, 1 - (dist / fadeRadius) ** 2);

      if (fade < 0.02) continue;

      // Jitter position slightly
      const jx = x + (Math.random() - 0.5) * 3;
      const jy = y + (Math.random() - 0.5) * 3;

      const size = maxSize * (0.3 + (1 - brightness) * 0.7);
      const alpha = fade * (0.15 + (1 - brightness) * 0.55);

      if (monoColor) {
        ctx.fillStyle = monoColor;
        ctx.globalAlpha = alpha;
      } else {
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }

      ctx.beginPath();
      ctx.arc(jx, jy, size, 0, Math.PI * 2);
      ctx.fill();

      placed++;
    }

    ctx.globalAlpha = 1;
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
