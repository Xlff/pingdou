"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getChineseColorName } from "@/lib/colorNames";

// ─── 工具函数 ─────────────────────────────────────────────

function pixelateImage(img: HTMLImageElement, gridW: number, gridH: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = gridW; canvas.height = gridH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, gridW, gridH);
  return ctx.getImageData(0, 0, gridW, gridH);
}

function renderBeadCanvas(canvas: HTMLCanvasElement, imageData: ImageData, cellSize: number, showGrid: boolean) {
  const { width: W, height: H, data } = imageData;
  canvas.width = W * cellSize; canvas.height = H * cellSize;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const px = x * cellSize, py = y * cellSize;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, cellSize, cellSize);
      if (cellSize >= 6) {
        ctx.fillStyle = `rgb(${Math.min(255, r + 18)},${Math.min(255, g + 18)},${Math.min(255, b + 18)})`;
        ctx.beginPath(); ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize * 0.43, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.26)";
        ctx.beginPath(); ctx.arc(px + cellSize * 0.36, py + cellSize * 0.33, cellSize * 0.13, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  if (showGrid && cellSize >= 4) {
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, H * cellSize); ctx.stroke(); }
    for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(W * cellSize, y * cellSize); ctx.stroke(); }
    if (cellSize >= 5) {
      ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 10) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, H * cellSize); ctx.stroke(); }
      for (let y = 0; y <= H; y += 10) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(W * cellSize, y * cellSize); ctx.stroke(); }
    }
  }
}

interface ColorStat { hex: string; zhName: string; r: number; g: number; b: number; count: number; pct: number; }

function extractColorStats(imageData: ImageData): ColorStat[] {
  const { data, width, height } = imageData;
  const total = width * height;
  const freq = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let i = 0; i < total; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    const e = freq.get(hex); if (e) e.count++; else freq.set(hex, { r, g, b, count: 1 });
  }
  return Array.from(freq.values()).sort((a, b) => b.count - a.count).map(({ r, g, b, count }) => ({
    hex: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
    zhName: getChineseColorName(r, g, b), r, g, b, count, pct: Math.round(count / total * 1000) / 10,
  }));
}

function getBrightness(r: number, g: number, b: number) { return 0.299 * r + 0.587 * g + 0.114 * b; }

// ─── 图标 ─────────────────────────────────────────────────

const Icons = {
  preview: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  colors: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a7 7 0 0 1 7 7c0 3.87-4.5 8-7 13C9.5 17 5 12.87 5 9a7 7 0 0 1 7-7z" /></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
};

// ─── 主页面 ──────────────────────────────────────────────

type MobileTab = "preview" | "settings";

export default function HomePage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [gridW, setGridW] = useState(64);
  const [gridH, setGridH] = useState(64);
  const [lockRatio, setLockRatio] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [cellSize, setCellSize] = useState(10);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportWithDetails, setExportWithDetails] = useState(true);
  const [desktopTab, setDesktopTab] = useState<"settings" | "colors">("settings");
  const [mobileTab, setMobileTab] = useState<MobileTab>("preview");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageData = useMemo<ImageData | null>(() => {
    if (!image) return null;
    return pixelateImage(image, gridW, gridH);
  }, [image, gridW, gridH]);

  const colorStats = useMemo<ColorStat[]>(() => {
    if (!imageData) return [];
    return extractColorStats(imageData);
  }, [imageData]);

  useEffect(() => {
    if (!imageData || !canvasRef.current) return;
    renderBeadCanvas(canvasRef.current, imageData, cellSize, showGrid);
  }, [imageData, cellSize, showGrid]);

  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img); setImageUrl(url);
      if (lockRatio) {
        const ratio = img.naturalHeight / img.naturalWidth;
        setGridW(64); setGridH(Math.max(4, Math.min(256, Math.round(64 * ratio))));
      }
      setMobileTab("preview"); // 上传后自动跳到预览
    };
    img.src = url;
  }, [lockRatio]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) loadImage(f);
  }, [loadImage]);

  const handleWidthChange = (v: number) => {
    setGridW(v);
    if (lockRatio && image) setGridH(Math.max(4, Math.min(256, Math.round(v * image.naturalHeight / image.naturalWidth))));
  };
  const handleHeightChange = (v: number) => {
    setGridH(v);
    if (lockRatio && image) setGridW(Math.max(4, Math.min(256, Math.round(v * image.naturalWidth / image.naturalHeight))));
  };

  const exportPNG = () => {
    if (!imageData || colorStats.length === 0) return;
    setIsExporting(true);
    setTimeout(() => {
      try {
        const { width: W, height: H, data } = imageData;
        const EXPORT_CELL = 26;

        if (!exportWithDetails) {
          const rawCanvas = document.createElement("canvas");
          renderBeadCanvas(rawCanvas, imageData, EXPORT_CELL, false);
          const a = document.createElement("a");
          a.download = `bead-pattern-${W}x${H}.png`;
          a.href = rawCanvas.toDataURL("image/png");
          a.click();
          return;
        }

        const PAD_X = 60, PAD_TOP = 120, PAD_BOT = 60;
        const gridW_px = W * EXPORT_CELL;
        const gridH_px = H * EXPORT_CELL;

        const LEGEND_ITEM_W = 200;
        const LEGEND_ITEM_H = 36;
        const CANVAS_W = Math.max(800, PAD_X * 2 + gridW_px);
        const LEGEND_COLS = Math.max(1, Math.floor((CANVAS_W - PAD_X * 2) / LEGEND_ITEM_W));
        const LEGEND_ROWS = Math.ceil(colorStats.length / LEGEND_COLS);
        const LEGEND_H = 60 + LEGEND_ROWS * LEGEND_ITEM_H;
        const CANVAS_H = PAD_TOP + gridH_px + PAD_BOT + LEGEND_H;

        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        const ctx = canvas.getContext("2d")!;

        // 1. Fill background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // 2. Title & summary
        ctx.fillStyle = "#111827";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("拼豆图纸", CANVAS_W / 2, 45);

        ctx.font = "15px sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.fillText(`尺寸: ${W} × ${H}   |   颜色: ${colorStats.length} 种   |   总豆数: ${(W * H).toLocaleString()}`, CANVAS_W / 2, 85);

        // 3. Draw grid and cells
        const colorMap = new Map<string, number>();
        colorStats.forEach((c, idx) => colorMap.set(c.hex, idx + 1));

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
            const num = colorMap.get(hex);

            const px = PAD_X + x * EXPORT_CELL;
            const py = PAD_TOP + y * EXPORT_CELL;

            // Cell bg
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(px, py, EXPORT_CELL, EXPORT_CELL);

            // Bead
            ctx.fillStyle = `rgb(${Math.min(255, r + 18)},${Math.min(255, g + 18)},${Math.min(255, b + 18)})`;
            ctx.beginPath();
            ctx.arc(px + EXPORT_CELL / 2, py + EXPORT_CELL / 2, EXPORT_CELL * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.2)";
            ctx.beginPath();
            ctx.arc(px + EXPORT_CELL * 0.35, py + EXPORT_CELL * 0.35, EXPORT_CELL * 0.12, 0, Math.PI * 2);
            ctx.fill();

            // Index Text
            const bright = getBrightness(r, g, b);
            ctx.fillStyle = bright > 130 ? "rgba(0,0,0,0.8)" : "rgba(255,255,255,0.95)";
            ctx.font = "bold 12px sans-serif";
            ctx.fillText(num?.toString() || "", px + EXPORT_CELL / 2, py + EXPORT_CELL / 2 + 1);
          }
        }

        // 4. Grid lines
        for (let x = 0; x <= W; x++) {
          ctx.lineWidth = x % 10 === 0 ? 1.5 : x % 5 === 0 ? 1 : 0.5;
          ctx.strokeStyle = x % 10 === 0 ? "rgba(0,0,0,0.6)" : x % 5 === 0 ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)";
          ctx.beginPath(); ctx.moveTo(PAD_X + x * EXPORT_CELL, PAD_TOP); ctx.lineTo(PAD_X + x * EXPORT_CELL, PAD_TOP + gridH_px); ctx.stroke();
        }
        for (let y = 0; y <= H; y++) {
          ctx.lineWidth = y % 10 === 0 ? 1.5 : y % 5 === 0 ? 1 : 0.5;
          ctx.strokeStyle = y % 10 === 0 ? "rgba(0,0,0,0.6)" : y % 5 === 0 ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)";
          ctx.beginPath(); ctx.moveTo(PAD_X, PAD_TOP + y * EXPORT_CELL); ctx.lineTo(PAD_X + gridW_px, PAD_TOP + y * EXPORT_CELL); ctx.stroke();
        }

        // 5. Grid Coordinates
        ctx.fillStyle = "#6b7280";
        ctx.font = "12px sans-serif";
        for (let x = 0; x < W; x++) {
          if (x % 5 === 0 || x === W - 1) {
            ctx.fillText((x + 1).toString(), PAD_X + x * EXPORT_CELL + EXPORT_CELL / 2, PAD_TOP - 12);
          }
        }
        for (let y = 0; y < H; y++) {
          if (y % 5 === 0 || y === H - 1) {
            ctx.fillText((y + 1).toString(), PAD_X - 16, PAD_TOP + y * EXPORT_CELL + EXPORT_CELL / 2 + 1);
          }
        }

        // 6. Legend
        const legendY = PAD_TOP + gridH_px + PAD_BOT;
        ctx.fillStyle = "#111827";
        ctx.font = "bold 20px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("颜色详情对照表", PAD_X, legendY);

        const itemsY = legendY + 30;
        ctx.textBaseline = "middle";

        colorStats.forEach((c, idx) => {
          const col = idx % LEGEND_COLS;
          const row = Math.floor(idx / LEGEND_COLS);
          const lx = PAD_X + col * LEGEND_ITEM_W;
          const ly = itemsY + row * LEGEND_ITEM_H;

          ctx.fillStyle = "#f3f4f6";
          ctx.beginPath(); ctx.arc(lx + 12, ly + 14, 11, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = "#374151";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText((idx + 1).toString(), lx + 12, ly + 15);

          ctx.fillStyle = c.hex;
          ctx.fillRect(lx + 32, ly + 4, 20, 20);
          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.strokeRect(lx + 32, ly + 4, 20, 20);

          ctx.fillStyle = "#111827";
          ctx.textAlign = "left";
          ctx.font = "13px sans-serif";
          ctx.fillText(c.zhName, lx + 60, ly + 15);

          ctx.fillStyle = "#6b7280";
          ctx.font = "12px monospace";
          ctx.fillText(`${c.count} 颗`, lx + 130, ly + 15);
        });

        const a = document.createElement("a");
        a.download = `bead-pattern-${W}x${H}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      } catch (err) {
        console.error("Export failed:", err);
        alert("导出遇到问题，图片可能过大");
      } finally {
        setIsExporting(false);
      }
    }, 50);
  };

  // ── 样式辅助 ──
  const S = {
    label: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 } as React.CSSProperties,
    card: { padding: "8px 10px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" } as React.CSSProperties,
    row: { display: "flex", justifyContent: "space-between", alignItems: "center" } as React.CSSProperties,
  };

  // ── 共享面板：设置内容 ──
  const SettingsContent = (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* 上传 */}
      <div>
        <p style={S.label}>上传图片</p>
        <div onClick={() => fileInputRef.current?.click()} onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
          style={{ border: `2px dashed ${isDragging ? "var(--accent)" : "var(--border-hover)"}`, borderRadius: 10, cursor: "pointer", background: isDragging ? "var(--accent-glow)" : "var(--surface2)", transition: "all 0.2s", overflow: "hidden", padding: imageUrl ? 0 : "24px 12px", textAlign: "center" }}>
          {imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imageUrl} alt="preview" style={{ width: "100%", display: "block", borderRadius: 8 }} />
            : <><div style={{ fontSize: 28, marginBottom: 8 }}>📷</div><p style={{ fontSize: 13, color: "var(--text-dim)" }}>点击或拖拽图片到此</p><p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>JPG / PNG / WebP</p></>}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImage(f); }} />
      </div>

      {/* 格子数量 */}
      <div>
        <div style={{ ...S.row, marginBottom: 10 }}>
          <p style={{ ...S.label, marginBottom: 0 }}>格子数量</p>
          <button onClick={() => setLockRatio(!lockRatio)} style={{ background: lockRatio ? "rgba(124,107,255,0.15)" : "transparent", border: `1px solid ${lockRatio ? "var(--accent)" : "var(--border-hover)"}`, color: lockRatio ? "var(--accent)" : "var(--text-muted)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 500 }}>
            {lockRatio ? "🔒 锁定" : "🔓 自由"}
          </button>
        </div>
        {([{ label: "宽", val: gridW, fn: handleWidthChange }, { label: "高", val: gridH, fn: handleHeightChange }]).map(({ label, val, fn }) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ ...S.row, marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{val} 格</span>
            </div>
            <input type="range" min={4} max={256} value={val} onChange={(e) => fn(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
          </div>
        ))}
        <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>共 {(gridW * gridH).toLocaleString()} 颗</p>
      </div>

      {/* 图纸导出 */}
      <div>
        <p style={S.label}>导出选项</p>
        <label style={{ ...S.card, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 12 }}>
          <input type="checkbox" checked={exportWithDetails} onChange={(e) => setExportWithDetails(e.target.checked)} style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
          <span style={{ fontSize: 13 }}>附带坐标位置与颜色详情表</span>
        </label>
      </div>

      {/* 显示选项 */}
      <div>
        <p style={S.label}>显示选项</p>
        <label style={{ ...S.card, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
          <span style={{ fontSize: 13 }}>显示网格线</span>
        </label>
        <div>
          <div style={{ ...S.row, marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: "var(--text-dim)" }}>格子大小（预览）</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{cellSize}px</span>
          </div>
          <input type="range" min={4} max={32} value={cellSize} onChange={(e) => setCellSize(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }} />
        </div>
      </div>
    </div>
  );

  // ── 共享面板：颜色统计内容 ──
  const ColorsContent = (
    <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      {colorStats.length === 0
        ? <div style={{ textAlign: "center", color: "var(--text-muted)", paddingTop: 40 }}><div style={{ fontSize: 32, marginBottom: 10 }}>🎨</div><p style={{ fontSize: 13 }}>请先上传图片</p></div>
        : <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[{ label: "颜色种数", value: colorStats.length }, { label: "总拼豆数", value: (gridW * gridH).toLocaleString() }].map(({ label, value }) => (
              <div key={label} style={{ ...S.card, textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{value}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>
          <div>
            <p style={S.label}>用色分布（前30）</p>
            <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
              {colorStats.slice(0, 30).map((c) => (
                <div key={c.hex} title={`${c.zhName} ${c.hex.toUpperCase()}\n${c.count} 颗 · ${c.pct}%`}
                  style={{ background: c.hex, flex: c.count, minWidth: 2 }} />
              ))}
            </div>
          </div>
          <div>
            <p style={S.label}>颜色明细（{colorStats.length} 种）</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {colorStats.map((c, idx) => {
                const bright = getBrightness(c.r, c.g, c.b);
                const maxCount = colorStats[0].count;
                return (
                  <div key={c.hex + idx} style={{ ...S.card, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", width: 18, textAlign: "right", flexShrink: 0 }}>{idx + 1}</span>
                    <div style={{ width: 24, height: 24, borderRadius: 5, flexShrink: 0, background: c.hex, border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {idx < 3 && <span style={{ fontSize: 8, color: bright > 128 ? "#000" : "#fff", fontWeight: 800 }}>{["①", "②", "③"][idx]}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...S.row, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.zhName}</span>
                        <span style={{ fontSize: 10, color: "var(--text-dim)", flexShrink: 0, marginLeft: 4 }}>{c.pct}%</span>
                      </div>
                      <div style={{ ...S.row, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontFamily: "monospace", color: "var(--text-muted)" }}>{c.hex.toUpperCase()}</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
                        <div style={{ height: "100%", borderRadius: 2, background: c.hex, width: `${(c.count / maxCount) * 100}%`, minWidth: 2 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", flexShrink: 0, minWidth: 32, textAlign: "right" }}>{c.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      }
    </div>
  );

  // ── 画布预览 ──
  const CanvasPreview = (
    <canvas ref={canvasRef} style={{ display: "block", imageRendering: "pixelated", borderRadius: 6, boxShadow: "0 8px 40px rgba(0,0,0,0.6)", maxWidth: "100%" }} />
  );

  const EmptyState = (
    <div style={{ flex: 1, minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--text-muted)" }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(124,107,255,0.07)", border: "1px solid rgba(124,107,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>🧩</div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-dim)", marginBottom: 6 }}>尚未上传图片</p>
        <p style={{ fontSize: 13 }}>上传图片后自动生成拼豆图纸</p>
      </div>
    </div>
  );

  return (
    <div className="app">

      {/* ── 顶栏 ── */}
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#7c6bff,#ff6b9d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🧩</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>拼豆图纸生成器</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {image && <span className="header-summary" style={{ fontSize: 12, color: "var(--text-muted)" }}>{gridW}×{gridH} · {colorStats.length} 色</span>}
          {image && (
            <button onClick={exportPNG} disabled={isExporting} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "none", background: isExporting ? "var(--border-hover)" : "var(--accent)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: isExporting ? "not-allowed" : "pointer" }}>
              {isExporting ? "⏳ 导出中..." : <>{Icons.download} 导出图纸</>}
            </button>
          )}
        </div>
      </header>

      {/* ── 主体 ── */}
      <div className="app-body">

        {/* ── 桌面侧边栏 ── */}
        <aside className={`sidebar${mobileTab === "settings" ? " mobile-open" : ""}`}>
          {/* 桌面 Tab */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 4px", flexShrink: 0 }}>
            {([
              { id: "settings", label: "设置", icon: "⚙️" },
              { id: "colors", label: "颜色统计", icon: "🎨", badge: colorStats.length > 0 ? colorStats.length : null },
            ] as { id: "settings" | "colors"; label: string; icon: string; badge?: number | null }[]).map(({ id, label, icon, badge }) => (
              <button key={id} onClick={() => setDesktopTab(id)} style={{ flex: 1, padding: "11px 8px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: desktopTab === id ? 600 : 400, color: desktopTab === id ? "var(--accent)" : "var(--text-muted)", borderBottom: `2px solid ${desktopTab === id ? "var(--accent)" : "transparent"}`, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <span>{icon}</span><span>{label}</span>
                {badge != null && <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 10, background: "rgba(124,107,255,0.18)", color: "var(--accent)" }}>{badge}</span>}
              </button>
            ))}
          </div>
          {desktopTab === "settings" ? SettingsContent : ColorsContent}
        </aside>

        {/* ── 预览区 ── */}
        <main className="preview-area">
          {image ? CanvasPreview : EmptyState}
        </main>
      </div>

      {/* ── 移动端底部导航 ── */}
      <nav className="mobile-nav">
        {([
          { id: "preview", label: "预览", icon: Icons.preview },
          { id: "settings", label: "设置", icon: Icons.settings },
        ] as { id: MobileTab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
          <button key={id} className={mobileTab === id ? "active" : ""} onClick={() => setMobileTab(id)}>
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
