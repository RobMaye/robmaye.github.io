/**
 * Topographic Contours — Noise-generated elevation data rendered as
 * layered contour lines. Cartographic, intellectual feel.
 */

function noise2D(x: number, y: number, seed: number = 42): number {
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

  const n00 = hash(ix + iy * 131);
  const n10 = hash(ix + 1 + iy * 131);
  const n01 = hash(ix + (iy + 1) * 131);
  const n11 = hash(ix + 1 + (iy + 1) * 131);

  return (n00 * (1 - sx) + n10 * sx) * (1 - sy) +
    (n01 * (1 - sx) + n11 * sx) * sy;
}

function fbm(x: number, y: number, octaves: number = 5): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise2D(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.1;
  }
  return value;
}

export function renderContours(
  canvas: HTMLCanvasElement,
  options: {
    levels?: number;
    lineColor?: string;
    bgColor?: string;
    scale?: number;
    lineWidth?: number;
  } = {}
) {
  const {
    levels = 20,
    lineColor = "#a8a29e",
    bgColor = "transparent",
    scale = 0.006,
    lineWidth = 0.7,
  } = options;

  const ctx = canvas.getContext("2d")!;
  const container = canvas.parentElement!;
  const width = container.clientWidth;
  const height = Math.min(400, Math.floor(width * 0.5));

  canvas.width = width;
  canvas.height = height;

  if (bgColor !== "transparent") {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  // Generate elevation grid
  const step = 2;
  const cols = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  const grid: number[][] = [];

  for (let y = 0; y <= rows; y++) {
    grid[y] = [];
    for (let x = 0; x <= cols; x++) {
      grid[y][x] = fbm(x * step * scale, y * step * scale);
    }
  }

  // Marching squares for each contour level
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;

  for (let level = 0; level < levels; level++) {
    const threshold = level / levels;

    // Thicker lines for every 5th contour
    ctx.lineWidth = level % 5 === 0 ? lineWidth * 2 : lineWidth;
    ctx.globalAlpha = level % 5 === 0 ? 0.8 : 0.4;

    ctx.beginPath();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tl = grid[y][x] >= threshold ? 1 : 0;
        const tr = grid[y][x + 1] >= threshold ? 1 : 0;
        const br = grid[y + 1][x + 1] >= threshold ? 1 : 0;
        const bl = grid[y + 1][x] >= threshold ? 1 : 0;

        const config = tl * 8 + tr * 4 + br * 2 + bl;

        if (config === 0 || config === 15) continue;

        const px = x * step;
        const py = y * step;

        // Interpolate edge crossings
        const interpTop = lerp(px, px + step, grid[y][x], grid[y][x + 1], threshold);
        const interpBottom = lerp(px, px + step, grid[y + 1][x], grid[y + 1][x + 1], threshold);
        const interpLeft = lerp(py, py + step, grid[y][x], grid[y + 1][x], threshold);
        const interpRight = lerp(py, py + step, grid[y][x + 1], grid[y + 1][x + 1], threshold);

        const top = { x: interpTop, y: py };
        const bottom = { x: interpBottom, y: py + step };
        const left = { x: px, y: interpLeft };
        const right = { x: px + step, y: interpRight };

        const segments = marchingSquaresSegments(config, top, right, bottom, left);
        for (const [from, to] of segments) {
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(to.x, to.y);
        }
      }
    }

    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function lerp(p1: number, p2: number, v1: number, v2: number, t: number): number {
  if (Math.abs(v2 - v1) < 0.0001) return (p1 + p2) / 2;
  return p1 + (p2 - p1) * (t - v1) / (v2 - v1);
}

type Pt = { x: number; y: number };

function marchingSquaresSegments(
  config: number, top: Pt, right: Pt, bottom: Pt, left: Pt
): [Pt, Pt][] {
  switch (config) {
    case 1: return [[left, bottom]];
    case 2: return [[bottom, right]];
    case 3: return [[left, right]];
    case 4: return [[top, right]];
    case 5: return [[top, left], [bottom, right]]; // saddle
    case 6: return [[top, bottom]];
    case 7: return [[top, left]];
    case 8: return [[top, left]];
    case 9: return [[top, bottom]];
    case 10: return [[top, right], [left, bottom]]; // saddle
    case 11: return [[top, right]];
    case 12: return [[left, right]];
    case 13: return [[bottom, right]];
    case 14: return [[left, bottom]];
    default: return [];
  }
}
