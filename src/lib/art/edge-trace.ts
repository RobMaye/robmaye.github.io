/**
 * Edge Trace — Chromata-inspired. Pathfinders crawl through a blended image
 * tracing edges and leaving colored trails on the page background.
 * Trails fade at the edges, merging seamlessly into the page.
 */

interface PathFinder {
  x: number;
  y: number;
  angle: number;
  speed: number;
  life: number;
  maxLife: number;
  hue: number;
}

export function renderEdgeTrace(
  canvas: HTMLCanvasElement,
  imageSrcs: string[],
  options: {
    pathfinderCount?: number;
    speed?: number;
    lineWidth?: number;
    accentColor?: [number, number, number]; // RGB
    bgColor?: string;
    fadeEdge?: boolean;
  } = {}
) {
  const {
    pathfinderCount = 300,
    speed = 1.5,
    lineWidth = 0.6,
    accentColor = [217, 119, 6], // amber
    bgColor = "#fafaf9",
    fadeEdge = true,
  } = options;

  const ctx = canvas.getContext("2d")!;
  const container = canvas.parentElement!;
  const width = container.clientWidth;
  const height = Math.min(500, Math.floor(width * 0.6));

  canvas.width = width;
  canvas.height = height;

  // Load and blend source images
  const images: HTMLImageElement[] = [];
  let loaded = 0;

  function onAllLoaded() {
    // Create blended source for edge detection
    const offscreen = document.createElement("canvas");
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext("2d")!;

    // Blend images
    images.forEach((img, i) => {
      offCtx.globalAlpha = 1 / images.length;
      offCtx.globalCompositeOperation = i === 0 ? "source-over" : "screen";
      drawCover(offCtx, img, width, height);
    });
    offCtx.globalAlpha = 1;
    offCtx.globalCompositeOperation = "source-over";

    // Get pixel data for edge detection
    const imageData = offCtx.getImageData(0, 0, width, height);
    const edgeData = detectEdges(imageData, width, height);

    // Clear canvas to page background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Create pathfinders seeded along edges
    const pathfinders: PathFinder[] = [];
    const edgePoints: [number, number][] = [];

    // Collect edge points
    for (let y = 10; y < height - 10; y += 3) {
      for (let x = 10; x < width - 10; x += 3) {
        if (edgeData[y * width + x] > 100) {
          edgePoints.push([x, y]);
        }
      }
    }

    // Seed pathfinders on edge points
    for (let i = 0; i < pathfinderCount; i++) {
      const [ex, ey] = edgePoints[Math.floor(Math.random() * edgePoints.length)] || [
        Math.random() * width, Math.random() * height
      ];
      pathfinders.push({
        x: ex,
        y: ey,
        angle: Math.random() * Math.PI * 2,
        speed: speed * (0.5 + Math.random()),
        life: 0,
        maxLife: 150 + Math.random() * 300,
        hue: Math.random(),
      });
    }

    let animId: number;
    let frame = 0;
    const maxFrames = 400;

    function animate() {
      if (frame >= maxFrames) return; // Stop after enough drawing

      for (const pf of pathfinders) {
        pf.life++;

        // Read edge strength at current position
        const px = Math.floor(pf.x);
        const py = Math.floor(pf.y);

        if (px >= 0 && px < width && py >= 0 && py < height) {
          const edge = edgeData[py * width + px];
          const srcIdx = (py * width + px) * 4;
          const r = imageData.data[srcIdx];
          const g = imageData.data[srcIdx + 1];
          const b = imageData.data[srcIdx + 2];

          // Steer toward edges
          if (edge > 50) {
            // Follow edge - check neighboring edge strengths
            let bestAngle = pf.angle;
            let bestEdge = 0;
            for (let a = -0.5; a <= 0.5; a += 0.25) {
              const testAngle = pf.angle + a;
              const tx = Math.floor(pf.x + Math.cos(testAngle) * 4);
              const ty = Math.floor(pf.y + Math.sin(testAngle) * 4);
              if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
                const te = edgeData[ty * width + tx];
                if (te > bestEdge) {
                  bestEdge = te;
                  bestAngle = testAngle;
                }
              }
            }
            pf.angle = bestAngle + (Math.random() - 0.5) * 0.2;
          } else {
            pf.angle += (Math.random() - 0.5) * 0.8;
          }

          // Draw
          const prevX = pf.x;
          const prevY = pf.y;
          pf.x += Math.cos(pf.angle) * pf.speed;
          pf.y += Math.sin(pf.angle) * pf.speed;

          // Fade based on life and distance from center
          const distFromCenter = Math.sqrt(
            ((pf.x - width / 2) / (width / 2)) ** 2 +
            ((pf.y - height / 2) / (height / 2)) ** 2
          );
          const edgeFade = fadeEdge ? Math.max(0, 1 - distFromCenter * 0.9) : 1;
          const lifeFade = Math.min(1, pf.life / 20) * Math.max(0, 1 - pf.life / pf.maxLife);
          const alpha = lifeFade * edgeFade * 0.6;

          if (alpha > 0.01) {
            // Mix accent color with source image color
            const mix = 0.4;
            const cr = Math.round(r * (1 - mix) + accentColor[0] * mix);
            const cg = Math.round(g * (1 - mix) + accentColor[1] * mix);
            const cb = Math.round(b * (1 - mix) + accentColor[2] * mix);

            ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha})`;
            ctx.lineWidth = lineWidth + (edge / 255) * 1.5;
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(pf.x, pf.y);
            ctx.stroke();
          }
        }

        // Reset dead or out-of-bounds pathfinders
        if (
          pf.life > pf.maxLife ||
          pf.x < -10 || pf.x > width + 10 ||
          pf.y < -10 || pf.y > height + 10
        ) {
          const [ex, ey] = edgePoints[Math.floor(Math.random() * edgePoints.length)] || [
            Math.random() * width, Math.random() * height
          ];
          pf.x = ex;
          pf.y = ey;
          pf.angle = Math.random() * Math.PI * 2;
          pf.life = 0;
          pf.maxLife = 150 + Math.random() * 300;
        }
      }

      frame++;
      animId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animId);
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

function detectEdges(imageData: ImageData, w: number, h: number): Uint8Array {
  const data = imageData.data;
  const edges = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      // Sobel operator
      const idx = (i: number, j: number) => {
        const p = ((y + j) * w + (x + i)) * 4;
        return data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
      };

      const gx = -idx(-1, -1) + idx(1, -1) - 2 * idx(-1, 0) + 2 * idx(1, 0) - idx(-1, 1) + idx(1, 1);
      const gy = -idx(-1, -1) - 2 * idx(0, -1) - idx(1, -1) + idx(-1, 1) + 2 * idx(0, 1) + idx(1, 1);

      edges[y * w + x] = Math.min(255, Math.sqrt(gx * gx + gy * gy));
    }
  }

  return edges;
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
