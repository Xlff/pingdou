/**
 * 图片像素化 + 颜色量化算法（纯 JS，无依赖）
 *
 * 流程：
 *  1. 将图片缩放到目标格子数 (Canvas)
 *  2. 可选：K-means 聚类找出 N 个代表色
 *  3. 可选：将每个聚类中心映射到最近的真实珠子颜色（Lab CIE76）
 *  4. 可选：Floyd-Steinberg 抖动
 *  5. 返回像素颜色索引 + 颜色统计
 */

import { BeadColor } from "./palettes";

// ─── CIE Lab 颜色转换 ─────────────────────────────────────

function linearize(c: number): number {
  const v = c / 255;
  return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
}

export function rgbToLab(
  r: number,
  g: number,
  b: number,
): [number, number, number] {
  const rl = linearize(r),
    gl = linearize(g),
    bl = linearize(b);
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175) / 1.0;
  let z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;
  const f = (t: number) =>
    t > 0.008856 ? Math.cbrt(t) : 7.787037 * t + 16 / 116;
  x = f(x);
  y = f(y);
  z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIE76 ΔE²（不开方，比较大小时更快） */
function deLab2(
  lab1: [number, number, number],
  lab2: [number, number, number],
): number {
  const dl = lab1[0] - lab2[0],
    da = lab1[1] - lab2[1],
    db = lab1[2] - lab2[2];
  return dl * dl + da * da + db * db;
}

// ─── 调色板 Lab 缓存 ──────────────────────────────────────

interface CachedColor extends BeadColor {
  lab: [number, number, number];
}

function cacheLabValues(palette: BeadColor[]): CachedColor[] {
  return palette.map((c) => ({ ...c, lab: rgbToLab(c.r, c.g, c.b) }));
}

/** 在 Lab 空间中找最近的调色板颜色，返回索引 */
function nearestIdx(
  lab: [number, number, number],
  cached: CachedColor[],
): number {
  let minD = Infinity,
    best = 0;
  for (let i = 0; i < cached.length; i++) {
    const d = deLab2(lab, cached[i].lab);
    if (d < minD) {
      minD = d;
      best = i;
    }
  }
  return best;
}

// ─── K-means 聚类 ─────────────────────────────────────────

/**
 * Mini Lloyd's K-means（Lab 空间）
 * @param pixels  (N, 3) RGB 像素数组
 * @param k       目标聚类数
 * @param iters   迭代次数
 * @returns       k 个聚类中心 RGB [number, number, number][]
 */
export function kMeans(
  pixels: Uint8ClampedArray,
  totalPixels: number,
  k: number,
  iters = 8,
): Array<[number, number, number]> {
  // 随机抽样初始化（K-means++简化版：均匀随机）
  const step = Math.max(1, Math.floor(totalPixels / k));
  const centroids: Array<[number, number, number]> = [];
  for (let i = 0; i < k; i++) {
    const idx = (i * step) % totalPixels;
    centroids.push([pixels[idx * 4], pixels[idx * 4 + 1], pixels[idx * 4 + 2]]);
  }

  // 转 Lab（提前算好）
  const pixLabs = new Float32Array(totalPixels * 3);
  for (let i = 0; i < totalPixels; i++) {
    const [L, a, b] = rgbToLab(
      pixels[i * 4],
      pixels[i * 4 + 1],
      pixels[i * 4 + 2],
    );
    pixLabs[i * 3] = L;
    pixLabs[i * 3 + 1] = a;
    pixLabs[i * 3 + 2] = b;
  }

  const labels = new Int32Array(totalPixels);

  for (let iter = 0; iter < iters; iter++) {
    // 计算聚类中心的 Lab
    const centLabs = centroids.map(([r, g, b]) => rgbToLab(r, g, b));

    // 赋标签
    for (let i = 0; i < totalPixels; i++) {
      let minD = Infinity,
        best = 0;
      const L = pixLabs[i * 3],
        a = pixLabs[i * 3 + 1],
        b = pixLabs[i * 3 + 2];
      for (let j = 0; j < k; j++) {
        const [cL, ca, cb] = centLabs[j];
        const d = (L - cL) ** 2 + (a - ca) ** 2 + (b - cb) ** 2;
        if (d < minD) {
          minD = d;
          best = j;
        }
      }
      labels[i] = best;
    }

    // 更新中心（RGB 均值）
    const sums = Array.from({ length: k }, () => [0, 0, 0, 0]); // [R, G, B, count]
    for (let i = 0; i < totalPixels; i++) {
      const c = labels[i];
      sums[c][0] += pixels[i * 4];
      sums[c][1] += pixels[i * 4 + 1];
      sums[c][2] += pixels[i * 4 + 2];
      sums[c][3]++;
    }
    for (let j = 0; j < k; j++) {
      const cnt = sums[j][3] || 1;
      centroids[j] = [sums[j][0] / cnt, sums[j][1] / cnt, sums[j][2] / cnt];
    }
  }

  return centroids;
}

// ─── Floyd-Steinberg 抖动 ─────────────────────────────────

function floydSteinberg(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  cached: CachedColor[],
): Uint32Array {
  const fr = new Float32Array(w * h),
    fg = new Float32Array(w * h),
    fb = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    fr[i] = pixels[i * 4];
    fg[i] = pixels[i * 4 + 1];
    fb[i] = pixels[i * 4 + 2];
  }
  const result = new Uint32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const r = Math.max(0, Math.min(255, fr[i]));
      const g = Math.max(0, Math.min(255, fg[i]));
      const b = Math.max(0, Math.min(255, fb[i]));
      const idx = nearestIdx(rgbToLab(r, g, b), cached);
      result[i] = idx;
      const c = cached[idx];
      const er = r - c.r,
        eg = g - c.g,
        eb = b - c.b;
      if (x + 1 < w) {
        const ni = i + 1;
        fr[ni] += (er * 7) / 16;
        fg[ni] += (eg * 7) / 16;
        fb[ni] += (eb * 7) / 16;
      }
      if (y + 1 < h) {
        if (x - 1 >= 0) {
          const ni = (y + 1) * w + (x - 1);
          fr[ni] += (er * 3) / 16;
          fg[ni] += (eg * 3) / 16;
          fb[ni] += (eb * 3) / 16;
        }
        {
          const ni = (y + 1) * w + x;
          fr[ni] += (er * 5) / 16;
          fg[ni] += (eg * 5) / 16;
          fb[ni] += (eb * 5) / 16;
        }
        if (x + 1 < w) {
          const ni = (y + 1) * w + (x + 1);
          fr[ni] += er / 16;
          fg[ni] += eg / 16;
          fb[ni] += eb / 16;
        }
      }
    }
  }
  return result;
}

// ─── 主处理函数 ──────────────────────────────────────────

export interface ColorStat {
  id: string;
  name: string;
  nameZh: string;
  hex: string;
  r: number;
  g: number;
  b: number;
  count: number;
  pct: number;
}

export interface ProcessResult {
  /** 每个格子的颜色（对应 palette 的索引，-1 表示原始像素颜色） */
  indexGrid: Uint32Array | null;
  /** 使用的调色板（若 palette 为空则为 null） */
  activePalette: BeadColor[] | null;
  /** 颜色统计（按频率降序） */
  colorStats: ColorStat[];
  /** 原始像素数据（无调色板约束时使用） */
  rawData: ImageData | null;
}

export interface ProcessOptions {
  gridW: number;
  gridH: number;
  palette: BeadColor[]; // 空数组 = 不做调色板约束
  maxColors: number; // K-means 聚类数
  useDithering: boolean;
  useKMeans: boolean; // 是否先做 K-means
}

export function processImage(
  imageData: ImageData,
  opts: ProcessOptions,
): ProcessResult {
  const { gridW, gridH, palette, maxColors, useDithering, useKMeans } = opts;
  const pixels = imageData.data;
  const total = gridW * gridH;

  // ── 无调色板约束：直接返回原始像素 ──
  if (palette.length === 0) {
    const stats = extractRawStats(pixels, total);
    return {
      indexGrid: null,
      activePalette: null,
      colorStats: stats,
      rawData: imageData,
    };
  }

  // ── 有调色板：决定使用哪些颜色 ──

  let activePalette: BeadColor[];

  if (useKMeans && maxColors < palette.length) {
    // 1. K-means 找出 maxColors 个代表色（RGB 空间）
    const centroids = kMeans(pixels, total, maxColors, 10);

    // 2. 每个聚类中心映射到最近的真实珠子颜色（Lab CIE76）
    const paletteLabCache = cacheLabValues(palette);
    const used = new Set<number>();
    for (const [cr, cg, cb] of centroids) {
      const idx = nearestIdx(rgbToLab(cr, cg, cb), paletteLabCache);
      used.add(idx);
    }
    activePalette = Array.from(used).map((i) => palette[i]);
  } else {
    // 不做 K-means，直接频率筛选
    activePalette = selectByFrequency(pixels, total, palette, maxColors);
  }

  const cached = cacheLabValues(activePalette);

  // ── 量化（抖动或最近色） ──
  let indexGrid: Uint32Array;
  if (useDithering) {
    indexGrid = floydSteinberg(pixels, gridW, gridH, cached);
  } else {
    indexGrid = new Uint32Array(total);
    for (let i = 0; i < total; i++) {
      indexGrid[i] = nearestIdx(
        rgbToLab(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]),
        cached,
      );
    }
  }

  // ── 统计 ──
  const freq = new Map<number, number>();
  for (let i = 0; i < total; i++) {
    const idx = indexGrid[i];
    freq.set(idx, (freq.get(idx) ?? 0) + 1);
  }
  const colorStats: ColorStat[] = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([idx, count]) => {
      const c = activePalette[idx];
      return { ...c, count, pct: Math.round((count / total) * 1000) / 10 };
    });

  return { indexGrid, activePalette, colorStats, rawData: null };
}

// ─── 辅助函数 ─────────────────────────────────────────────

function selectByFrequency(
  pixels: Uint8ClampedArray,
  total: number,
  palette: BeadColor[],
  maxColors: number,
): BeadColor[] {
  const cached = cacheLabValues(palette);
  const freq = new Int32Array(palette.length);
  for (let i = 0; i < total; i++) {
    freq[
      nearestIdx(
        rgbToLab(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2]),
        cached,
      )
    ]++;
  }
  const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  const selected = sorted.slice(0, maxColors).map(([i]) => i);
  return selected.map((i) => palette[i]);
}

function extractRawStats(
  pixels: Uint8ClampedArray,
  total: number,
): ColorStat[] {
  const freq = new Map<
    string,
    { r: number; g: number; b: number; count: number }
  >();
  for (let i = 0; i < total; i++) {
    const r = pixels[i * 4],
      g = pixels[i * 4 + 1],
      b = pixels[i * 4 + 2];
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    const e = freq.get(hex);
    if (e) e.count++;
    else freq.set(hex, { r, g, b, count: 1 });
  }
  return Array.from(freq.values())
    .sort((a, b) => b.count - a.count)
    .map(({ r, g, b, count }) => ({
      id: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase(),
      name: "",
      nameZh: "",
      hex: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
      r,
      g,
      b,
      count,
      pct: Math.round((count / total) * 1000) / 10,
    }));
}

// ─── Canvas 渲染 ──────────────────────────────────────────

export function renderToCanvas(
  canvas: HTMLCanvasElement,
  imageData: ImageData,
  result: ProcessResult,
  cellSize: number,
  showGrid: boolean,
): void {
  const { gridW, gridH } = { gridW: imageData.width, gridH: imageData.height };
  canvas.width = gridW * cellSize;
  canvas.height = gridH * cellSize;
  const ctx = canvas.getContext("2d")!;

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const i = y * gridW + x;
      let r: number, g: number, b: number;

      if (result.indexGrid && result.activePalette) {
        const c = result.activePalette[result.indexGrid[i]];
        r = c.r;
        g = c.g;
        b = c.b;
      } else {
        r = imageData.data[i * 4];
        g = imageData.data[i * 4 + 1];
        b = imageData.data[i * 4 + 2];
      }

      const px = x * cellSize,
        py = y * cellSize;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, cellSize, cellSize);

      if (cellSize >= 6) {
        ctx.fillStyle = `rgb(${Math.min(255, r + 18)},${Math.min(255, g + 18)},${Math.min(255, b + 18)})`;
        ctx.beginPath();
        ctx.arc(
          px + cellSize / 2,
          py + cellSize / 2,
          cellSize * 0.43,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.26)";
        ctx.beginPath();
        ctx.arc(
          px + cellSize * 0.36,
          py + cellSize * 0.33,
          cellSize * 0.13,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  if (showGrid && cellSize >= 4) {
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= gridW; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, gridH * cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= gridH; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(gridW * cellSize, y * cellSize);
      ctx.stroke();
    }
    if (cellSize >= 5) {
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= gridW; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, gridH * cellSize);
        ctx.stroke();
      }
      for (let y = 0; y <= gridH; y += 10) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(gridW * cellSize, y * cellSize);
        ctx.stroke();
      }
    }
  }
}
