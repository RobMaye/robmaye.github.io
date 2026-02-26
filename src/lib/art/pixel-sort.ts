/**
 * Pixel Sort — Takes an image and sorts pixel columns/rows by brightness
 * within certain thresholds, creating dreamy glitch streaks.
 * Merges Rome + London with sorted displacement.
 */
export function renderPixelSort(
  canvas: HTMLCanvasElement,
  imageSrc1: string,
  imageSrc2: string,
  options: {
    direction?: "vertical" | "horizontal";
    threshold?: [number, number];
    sortIntensity?: number;
    tintColor?: string;
  } = {}
) {
  const {
    direction = "vertical",
    threshold = [0.2, 0.7],
    sortIntensity = 0.7,
    tintColor = "#d97706",
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

    // Create a blended base from both images
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d")!;

    // Draw first image (left half influence)
    offCtx.globalAlpha = 1;
    drawCover(offCtx, img1, width, height);

    // Blend second image with gradient mask
    const gradient = offCtx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.3, "rgba(0,0,0,0.5)");
    gradient.addColorStop(0.7, "rgba(0,0,0,0.9)");
    gradient.addColorStop(1, "rgba(0,0,0,1)");

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d")!;
    drawCover(tempCtx, img2, width, height);

    // Apply gradient mask to second image
    tempCtx.globalCompositeOperation = "destination-in";
    tempCtx.fillStyle = gradient;
    tempCtx.fillRect(0, 0, width, height);

    offCtx.drawImage(tempCanvas, 0, 0);

    // Desaturate
    offCtx.filter = "grayscale(50%) contrast(1.2)";
    offCtx.drawImage(offscreen, 0, 0);
    offCtx.filter = "none";

    const imageData = offCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Pixel sort
    if (direction === "vertical") {
      for (let x = 0; x < width; x++) {
        sortColumn(data, width, height, x, threshold, sortIntensity);
      }
    } else {
      for (let y = 0; y < height; y++) {
        sortRow(data, width, y, threshold, sortIntensity);
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Amber tint overlay
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = tintColor;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Vignette
    const vig = ctx.createRadialGradient(
      width / 2, height / 2, height * 0.35,
      width / 2, height / 2, Math.max(width, height) * 0.65
    );
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }

  img1.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
  img2.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
  img1.src = imageSrc1;
  img2.src = imageSrc2;
}

function brightness(r: number, g: number, b: number): number {
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

function sortColumn(
  data: Uint8ClampedArray, w: number, h: number, x: number,
  threshold: [number, number], intensity: number
) {
  // Find runs of pixels within brightness threshold
  let start = -1;
  for (let y = 0; y < h; y++) {
    const i = (y * w + x) * 4;
    const b = brightness(data[i], data[i + 1], data[i + 2]);

    if (b >= threshold[0] && b <= threshold[1]) {
      if (start === -1) start = y;
    } else {
      if (start !== -1 && y - start > 3) {
        sortRange(data, w, x, start, y - 1, true, intensity);
      }
      start = -1;
    }
  }
  if (start !== -1) {
    sortRange(data, w, x, start, h - 1, true, intensity);
  }
}

function sortRow(
  data: Uint8ClampedArray, w: number, y: number,
  threshold: [number, number], intensity: number
) {
  let start = -1;
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const b = brightness(data[i], data[i + 1], data[i + 2]);

    if (b >= threshold[0] && b <= threshold[1]) {
      if (start === -1) start = x;
    } else {
      if (start !== -1 && x - start > 3) {
        sortRange(data, w, y, start, x - 1, false, intensity);
      }
      start = -1;
    }
  }
  if (start !== -1) {
    sortRange(data, w, y, start, w - 1, false, intensity);
  }
}

function sortRange(
  data: Uint8ClampedArray, w: number, fixed: number,
  from: number, to: number, isCol: boolean, intensity: number
) {
  const pixels: { r: number; g: number; b: number; a: number; bright: number }[] = [];

  for (let i = from; i <= to; i++) {
    const idx = isCol ? (i * w + fixed) * 4 : (fixed * w + i) * 4;
    pixels.push({
      r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3],
      bright: brightness(data[idx], data[idx + 1], data[idx + 2]),
    });
  }

  const sorted = [...pixels].sort((a, b) => a.bright - b.bright);

  for (let i = from; i <= to; i++) {
    const idx = isCol ? (i * w + fixed) * 4 : (fixed * w + i) * 4;
    const pi = i - from;
    const orig = pixels[pi];
    const sort = sorted[pi];

    data[idx] = Math.round(orig.r * (1 - intensity) + sort.r * intensity);
    data[idx + 1] = Math.round(orig.g * (1 - intensity) + sort.g * intensity);
    data[idx + 2] = Math.round(orig.b * (1 - intensity) + sort.b * intensity);
  }
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
