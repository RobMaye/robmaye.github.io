/**
 * Double Exposure — Blends two images (e.g. Rome + London) with
 * screen/multiply blend modes and color grading. Creates a dreamy,
 * layered composite.
 */
export function renderDoubleExposure(
  canvas: HTMLCanvasElement,
  imageSrc1: string,
  imageSrc2: string,
  options: {
    blendMode?: GlobalCompositeOperation;
    tintColor?: string;
    tintOpacity?: number;
    vignetteStrength?: number;
    contrast?: number;
  } = {}
) {
  const {
    blendMode = "screen",
    tintColor = "#d97706",
    tintOpacity = 0.15,
    vignetteStrength = 0.6,
    contrast = 1.1,
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

    // Draw first image (base layer) — desaturated
    ctx.filter = `grayscale(40%) contrast(${contrast})`;
    drawCover(ctx, img1, width, height);
    ctx.filter = "none";

    // Blend second image on top
    ctx.globalCompositeOperation = blendMode;
    ctx.filter = `grayscale(60%) contrast(${contrast * 0.9})`;
    drawCover(ctx, img2, width, height);
    ctx.filter = "none";

    // Reset blend mode
    ctx.globalCompositeOperation = "source-over";

    // Apply color tint
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = tintColor;
    ctx.globalAlpha = tintOpacity;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Warm overlay
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = tintColor;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Vignette
    if (vignetteStrength > 0) {
      const gradient = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${vignetteStrength})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // Subtle grain
    addGrain(ctx, width, height, 0.03);
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

function addGrain(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 255 * intensity;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);
}
