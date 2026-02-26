/**
 * Dot Matrix — Image rendered as a grid of small squares/circles that
 * encode both brightness and color. Creates a mosaic/LED display feel.
 * Uses a blended Rome+London composite.
 */
export function renderDotMatrix(
  canvas: HTMLCanvasElement,
  imageSrc1: string,
  imageSrc2: string,
  options: {
    cellSize?: number;
    gap?: number;
    shape?: "circle" | "square";
    bgColor?: string;
    monochrome?: boolean;
    monoColor?: string;
  } = {}
) {
  const {
    cellSize = 6,
    gap = 2,
    shape = "circle",
    bgColor = "#0c0a09",
    monochrome = false,
    monoColor = "#d97706",
  } = options;

  const ctx = canvas.getContext("2d")!;

  const img1 = new Image();
  const img2 = new Image();
  img1.crossOrigin = "anonymous";
  img2.crossOrigin = "anonymous";

  let loaded = 0;

  function onBothLoaded() {
    const container = canvas.parentElement!;
    const width = container.clientWidth;
    const height = Math.min(450, Math.floor(width * 0.55));

    canvas.width = width;
    canvas.height = height;

    // Create blended source
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d")!;

    // Draw image 1 at reduced opacity
    offCtx.globalAlpha = 0.6;
    drawCover(offCtx, img1, width, height);

    // Overlay image 2
    offCtx.globalCompositeOperation = "lighter";
    offCtx.globalAlpha = 0.5;
    drawCover(offCtx, img2, width, height);
    offCtx.globalCompositeOperation = "source-over";
    offCtx.globalAlpha = 1;

    const imageData = offCtx.getImageData(0, 0, width, height);

    // Clear canvas
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    const step = cellSize + gap;
    const radius = cellSize / 2;

    for (let y = step / 2; y < height; y += step) {
      for (let x = step / 2; x < width; x += step) {
        const px = Math.min(Math.floor(x), width - 1);
        const py = Math.min(Math.floor(y), height - 1);
        const i = (py * width + px) * 4;

        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const bright = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        if (bright < 0.05) continue;

        if (monochrome) {
          ctx.fillStyle = monoColor;
          ctx.globalAlpha = bright;
        } else {
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.globalAlpha = 0.3 + bright * 0.7;
        }

        if (shape === "circle") {
          ctx.beginPath();
          ctx.arc(x, y, radius * (0.4 + bright * 0.6), 0, Math.PI * 2);
          ctx.fill();
        } else {
          const size = cellSize * (0.4 + bright * 0.6);
          ctx.fillRect(x - size / 2, y - size / 2, size, size);
        }
      }
    }

    ctx.globalAlpha = 1;

    // Subtle scanlines
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  img1.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
  img2.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
  img1.src = imageSrc1;
  img2.src = imageSrc2;
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
