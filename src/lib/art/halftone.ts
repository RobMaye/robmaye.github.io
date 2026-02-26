/**
 * Halftone — Renders an image as a grid of circles with varying radii
 * based on pixel brightness. Single accent color on transparent/bg.
 */
export function renderHalftone(
  canvas: HTMLCanvasElement,
  imageSrc: string,
  options: {
    dotSpacing?: number;
    maxRadius?: number;
    color?: string;
    bgColor?: string;
  } = {}
) {
  const {
    dotSpacing = 8,
    maxRadius = dotSpacing * 0.45,
    color = "#d97706",
    bgColor = "transparent",
  } = options;

  const ctx = canvas.getContext("2d")!;
  const img = new Image();
  img.crossOrigin = "anonymous";

  img.onload = () => {
    // Size canvas to container
    const container = canvas.parentElement!;
    const width = container.clientWidth;
    const aspectRatio = img.height / img.width;
    const height = Math.floor(width * aspectRatio);

    canvas.width = width;
    canvas.height = height;

    // Draw image to offscreen canvas for pixel data
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d")!;
    offCtx.drawImage(img, 0, 0, width, height);
    const imageData = offCtx.getImageData(0, 0, width, height);

    // Clear and fill background
    if (bgColor !== "transparent") {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.clearRect(0, 0, width, height);
    }

    // Draw halftone dots
    ctx.fillStyle = color;
    for (let y = dotSpacing / 2; y < height; y += dotSpacing) {
      for (let x = dotSpacing / 2; x < width; x += dotSpacing) {
        const px = Math.floor(x);
        const py = Math.floor(y);
        const i = (py * width + px) * 4;

        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Invert: darker pixels = bigger dots
        const radius = maxRadius * (1 - brightness);

        if (radius > 0.5) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  };

  img.src = imageSrc;
}
