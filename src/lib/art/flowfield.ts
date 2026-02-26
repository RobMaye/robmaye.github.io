/**
 * Flow Field — Perlin noise-driven particle system with fading trails.
 * Pure generative, no source image needed.
 */

// Simple 2D noise implementation (value noise with smoothing)
function noise2D(x: number, y: number, seed: number = 0): number {
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

  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hash(ix + iy * 57);
  const n10 = hash(ix + 1 + iy * 57);
  const n01 = hash(ix + (iy + 1) * 57);
  const n11 = hash(ix + 1 + (iy + 1) * 57);

  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;

  return nx0 * (1 - sy) + nx1 * sy;
}

function fbm(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

interface Particle {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  speed: number;
  life: number;
  maxLife: number;
}

export function renderFlowField(
  canvas: HTMLCanvasElement,
  options: {
    particleCount?: number;
    noiseScale?: number;
    speed?: number;
    trailColor?: string;
    bgColor?: string;
    fadeAlpha?: number;
  } = {}
) {
  const {
    particleCount = 1500,
    noiseScale = 0.003,
    speed = 1.5,
    trailColor = "rgba(217, 119, 6, 0.3)",
    bgColor = "#fafaf9",
    fadeAlpha = 0.02,
  } = options;

  const ctx = canvas.getContext("2d")!;
  const container = canvas.parentElement!;
  const width = container.clientWidth;
  const height = Math.min(400, Math.floor(width * 0.5));

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  const particles: Particle[] = [];
  let animId: number;
  let time = 0;

  function createParticle(): Particle {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      prevX: 0,
      prevY: 0,
      speed: speed * (0.5 + Math.random() * 0.5),
      life: 0,
      maxLife: 100 + Math.random() * 200,
    };
  }

  for (let i = 0; i < particleCount; i++) {
    const p = createParticle();
    p.prevX = p.x;
    p.prevY = p.y;
    particles.push(p);
  }

  function animate() {
    // Fade trail
    ctx.fillStyle =
      bgColor === "#fafaf9"
        ? `rgba(250, 250, 249, ${fadeAlpha})`
        : `rgba(12, 10, 9, ${fadeAlpha})`;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = trailColor;
    ctx.lineWidth = 0.8;

    for (const p of particles) {
      p.prevX = p.x;
      p.prevY = p.y;

      const angle =
        fbm(p.x * noiseScale, p.y * noiseScale + time * 0.0003) *
        Math.PI *
        4;
      p.x += Math.cos(angle) * p.speed;
      p.y += Math.sin(angle) * p.speed;
      p.life++;

      // Draw trail
      if (p.life > 1) {
        ctx.beginPath();
        ctx.moveTo(p.prevX, p.prevY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      // Reset if out of bounds or expired
      if (
        p.x < 0 ||
        p.x > width ||
        p.y < 0 ||
        p.y > height ||
        p.life > p.maxLife
      ) {
        const newP = createParticle();
        p.x = newP.x;
        p.y = newP.y;
        p.prevX = p.x;
        p.prevY = p.y;
        p.speed = newP.speed;
        p.life = 0;
        p.maxLife = newP.maxLife;
      }
    }

    time++;
    animId = requestAnimationFrame(animate);
  }

  animate();

  // Return cleanup function
  return () => cancelAnimationFrame(animId);
}
