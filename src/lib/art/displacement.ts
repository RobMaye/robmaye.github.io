/**
 * Displacement Wave — Takes two images and creates a wavy displacement
 * effect where strips of each image interleave with sinusoidal distortion.
 * Rome and London weaving through each other like time collapsing.
 */
export function renderDisplacement(
  canvas: HTMLCanvasElement,
  imageSrc1: string,
  imageSrc2: string,
  options: {
    waveAmplitude?: number;
    waveFrequency?: number;
    stripHeight?: number;
    tintColor?: string;
    animated?: boolean;
  } = {}
) {
  const {
    waveAmplitude = 30,
    waveFrequency = 0.02,
    stripHeight = 4,
    tintColor = "#d97706",
    animated = true,
  } = options;

  const ctx = canvas.getContext("2d")!;

  const img1 = new Image();
  const img2 = new Image();
  img1.crossOrigin = "anonymous";
  img2.crossOrigin = "anonymous";

  let loaded = 0;
  let animId: number;
  let phase = 0;

  function onBothLoaded() {
    const container = canvas.parentElement!;
    const width = container.clientWidth;
    const height = Math.min(450, Math.floor(width * 0.55));

    canvas.width = width;
    canvas.height = height;

    // Pre-render both images to offscreen canvases
    const off1 = document.createElement("canvas");
    off1.width = width;
    off1.height = height;
    const ctx1 = off1.getContext("2d")!;
    ctx1.filter = "grayscale(30%) contrast(1.1)";
    drawCover(ctx1, img1, width, height);

    const off2 = document.createElement("canvas");
    off2.width = width;
    off2.height = height;
    const ctx2 = off2.getContext("2d")!;
    ctx2.filter = "grayscale(30%) contrast(1.1)";
    drawCover(ctx2, img2, width, height);

    function render() {
      ctx.clearRect(0, 0, width, height);

      for (let y = 0; y < height; y += stripHeight) {
        const stripH = Math.min(stripHeight, height - y);
        const normalizedY = y / height;

        // Sinusoidal displacement
        const displacement = Math.sin(y * waveFrequency + phase) * waveAmplitude;
        const displacement2 = Math.cos(y * waveFrequency * 0.7 + phase * 1.3) * waveAmplitude * 0.6;

        // Alternate between images based on position
        const blend = (Math.sin(normalizedY * Math.PI * 6 + phase * 0.5) + 1) / 2;

        if (blend > 0.5) {
          ctx.drawImage(off1,
            0, y, width, stripH,
            displacement, y, width, stripH
          );
        } else {
          ctx.drawImage(off2,
            0, y, width, stripH,
            displacement2, y, width, stripH
          );
        }
      }

      // Warm color overlay
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = tintColor;
      ctx.globalAlpha = 0.1;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // Vignette
      const vig = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, Math.max(width, height) * 0.65
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, width, height);

      if (animated) {
        phase += 0.008;
        animId = requestAnimationFrame(render);
      }
    }

    render();
  }

  img1.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
  img2.onload = () => { loaded++; if (loaded === 2) onBothLoaded(); };
  img1.src = imageSrc1;
  img2.src = imageSrc2;

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
