/**
 * Threshold Ghost — Reduces multiple images to high-contrast silhouettes,
 * overlays them with different accent tones, and fades everything into
 * the background with a radial gradient. Ghostly, layered, architectural.
 */
export function renderThresholdGhost(
  canvas: HTMLCanvasElement,
  imageSrcs: string[],
  options: {
    thresholds?: number[];
    colors?: string[];
    bgColor?: string;
    fadeStrength?: number;
  } = {}
) {
  const {
    thresholds = [0.45, 0.5, 0.55],
    colors = [
      "rgba(217, 119, 6, 0.25)",   // amber
      "rgba(168, 162, 158, 0.2)",   // stone
      "rgba(120, 113, 108, 0.15)",  // darker stone
    ],
    bgColor = "#fafaf9",
    fadeStrength = 0.9,
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
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Process each image as a separate ghost layer
    images.forEach((img, imgIdx) => {
      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext("2d")!;

      // Draw and desaturate
      offCtx.filter = "grayscale(100%) contrast(1.4)";
      drawCover(offCtx, img, width, height);
      offCtx.filter = "none";

      const imageData = offCtx.getImageData(0, 0, width, height);
      const threshold = thresholds[imgIdx % thresholds.length];
      const color = colors[imgIdx % colors.length];

      // Horizontal offset for each layer
      const offsetX = (imgIdx - (images.length - 1) / 2) * width * 0.15;

      // Draw threshold silhouette
      ctx.fillStyle = color;

      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const i = (y * width + x) * 4;
          const brightness = imageData.data[i] / 255;

          if (brightness < threshold) {
            // Distance from center for radial fade
            const dx = (x + offsetX - width / 2) / (width / 2);
            const dy = (y - height / 2) / (height / 2);
            const dist = Math.sqrt(dx * dx + dy * dy);
            const fade = Math.max(0, 1 - dist * fadeStrength);

            if (fade > 0.02) {
              ctx.globalAlpha = fade;
              ctx.fillRect(x + offsetX, y, 2, 2);
            }
          }
        }
      }
    });

    ctx.globalAlpha = 1;

    // Subtle noise grain on top
    const grainData = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < grainData.data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      grainData.data[i] += noise;
      grainData.data[i + 1] += noise;
      grainData.data[i + 2] += noise;
    }
    ctx.putImageData(grainData, 0, 0);
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
