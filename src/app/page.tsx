"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getChineseColorName } from "@/lib/colorNames";

// ─── 工具函数 ─────────────────────────────────────────────

function pixelateImage(img: HTMLImageElement, gridW: number, gridH: number): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, gridW, gridH);
  return ctx.getImageData(0, 0, gridW, gridH);
}

function renderBeadCanvas(
  canvas: HTMLCanvasElement,
  imageData: ImageData,
  cellSize: number,
  showGrid: boolean,
) {
  const { width: W, height: H, data } = imageData;
  canvas.width = W * cellSize;
  canvas.height = H * cellSize;
  const ctx = canvas.getContext("2d")!;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const px = x * cellSize, py = y * cellSize;

      // 格子背景
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(px, py, cellSize, cellSize);

      if (cellSize >= 6) {
        // 圆形拼豆（略亮）
        ctx.fillStyle = `rgb(${Math.min(255, r + 18)},${Math.min(255, g + 18)},${Math.min(255, b + 18)})`;
        ctx.beginPath();
        ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize * 0.43, 0, Math.PI * 2);
        ctx.fill();
        // 高光
        ctx.fillStyle = "rgba(255,255,255,0.26)";
        ctx.beginPath();
        ctx.arc(px + cellSize * 0.36, py + cellSize * 0.33, cellSize * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (showGrid && cellSize >= 4) {
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= W; x++) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, H * cellSize); ctx.stroke(); }
    for (let y = 0; y <= H; y++) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(W * cellSize, y * cellSize); ctx.stroke(); }
    if (cellSize >= 5) {
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 10) { ctx.beginPath(); ctx.moveTo(x * cellSize, 0); ctx.lineTo(x * cellSize, H * cellSize); ctx.stroke(); }
      for (let y = 0; y <= H; y += 10) { ctx.beginPath(); ctx.moveTo(0, y * cellSize); ctx.lineTo(W * cellSize, y * cellSize); ctx.stroke(); }
    }
  }
}

interface ColorStat {
  hex: string;
  zhName: string;
  r: number; g: number; b: number;
  count: number;
  pct: number;
}

function extractColorStats(imageData: ImageData): ColorStat[] {
  const { data, width, height } = imageData;
  const total = width * height;
  const freq = new Map<string, { r: number; g: number; b: number; count: number }>();
  for (let i = 0; i < total; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    const e = freq.get(hex);
    if (e) e.count++; else freq.set(hex, { r, g, b, count: 1 });
  }
  return Array.from(freq.values())
    .sort((a, b) => b.count - a.count)
    .map(({ r, g, b, count }) => ({
      hex: `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`,
      zhName: getChineseColorName(r, g, b),
      r, g, b, count, pct: Math.round(count / total * 1000) / 10,
    }));
}

function getBrightness(r: number, g: number, b: number) { return 0.299 * r + 0.587 * g + 0.114 * b; }

// ─── 主页面 ──────────────────────────────────────────────

type Tab = "settings" | "colors";

export default function HomePage() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [gridW, setGridW] = useState(64);
  const [gridH, setGridH] = useState(64);
  const [lockRatio, setLockRatio] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [cellSize, setCellSize] = useState(10);
  const [isDragging, setIsDragging] = useState(false);
  const [tab, setTab] = useState<Tab>("settings");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 像素数据（派生，不触发多余渲染）
  const imageData = useMemo<ImageData | null>(() => {
    if (!image) return null;
    return pixelateImage(image, gridW, gridH);
  }, [image, gridW, gridH]);

  // 颜色统计（派生）
  const colorStats = useMemo<ColorStat[]>(() => {
    if (!imageData) return [];
    return extractColorStats(imageData);
  }, [imageData]);

  // Canvas 渲染（纯副作用，无 setState）
  useEffect(() => {
    if (!imageData || !canvasRef.current) return;
    renderBeadCanvas(canvasRef.current, imageData, cellSize, showGrid);
  }, [imageData, cellSize, showGrid]);

  const loadImage = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setImageUrl(url);
      if (lockRatio) {
        const ratio = img.naturalHeight / img.naturalWidth;
        setGridW(64);
        setGridH(Math.max(4, Math.min(256, Math.round(64 * ratio))));
      }
    };
    img.src = url;
  }, [lockRatio]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) loadImage(f);
  }, [loadImage]);

  const handleWidthChange = (v: number) => {
    setGridW(v);
    if (lockRatio && image)
      setGridH(Math.max(4, Math.min(256, Math.round(v * image.naturalHeight / image.naturalWidth))));
  };
  const handleHeightChange = (v: number) => {
    setGridH(v);
    if (lockRatio && image)
      setGridW(Math.max(4, Math.min(256, Math.round(v * image.naturalWidth / image.naturalHeight))));
  };

  const exportPNG = () => {
    if (!canvasRef.current) return;
    const a = document.createElement("a");
    a.download = `bead-${gridW}x${gridH}.png`;
    a.href = canvasRef.current.toDataURL("image/png");
    a.click();
  };

  const S = {
    label: { fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 } as React.CSSProperties,
    card: { padding: "8px 10px", borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)" } as React.CSSProperties,
    row: { display: "flex", justifyContent: "space-between", alignItems: "center" } as React.CSSProperties,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

      {/* 顶栏 */}
      <header style={{ height: 52, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#7c6bff,#ff6b9d)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧩</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>拼豆图纸生成器</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {image && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{gridW}×{gridH} · {colorStats.length} 色 · {(gridW * gridH).toLocaleString()} 颗</span>}
          {image && (
            <button onClick={exportPNG} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导出 PNG
            </button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* 左侧面板 */}
        <aside style={{ width: 272, flexShrink: 0, borderRight: "1px solid var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* 标签 */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 4px", flexShrink: 0 }}>
            {([
              { id: "settings", label: "设置", icon: "⚙️" },
              { id: "colors", label: "颜色统计", icon: "🎨", badge: colorStats.length > 0 ? colorStats.length : null },
            ] as { id: Tab; label: string; icon: string; badge?: number | null }[]).map(({ id, label, icon, badge }) => (
              <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "11px 8px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 600 : 400, color: tab === id ? "var(--accent)" : "var(--text-muted)", borderBottom: `2px solid ${tab === id ? "var(--accent)" : "transparent"}`, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <span>{icon}</span><span>{label}</span>
                {badge != null && <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 10, background: "rgba(124,107,255,0.18)", color: "var(--accent)" }}>{badge}</span>}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── 设置 ── */}
            {tab === "settings" && (<>

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

            </>)}

            {/* ── 颜色统计 ── */}
            {tab === "colors" && (
              colorStats.length === 0
                ? <div style={{ textAlign: "center", color: "var(--text-muted)", paddingTop: 40 }}><div style={{ fontSize: 32, marginBottom: 10 }}>🎨</div><p style={{ fontSize: 13 }}>请先上传图片</p></div>
                : <>
                  {/* 汇总 */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[{ label: "颜色种数", value: colorStats.length }, { label: "总拼豆数", value: (gridW * gridH).toLocaleString() }].map(({ label, value }) => (
                      <div key={label} style={{ ...S.card, textAlign: "center" }}>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>{value}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* 色调条 */}
                  <div>
                    <p style={S.label}>用色比例（前 30）</p>
                    <div style={{ display: "flex", height: 32, borderRadius: 6, overflow: "hidden", border: "1px solid var(--border)" }}>
                      {colorStats.slice(0, 30).map((c) => (
                        <div key={c.hex} title={`${c.hex.toUpperCase()}\n${c.count} 颗 · ${c.pct}%`}
                          style={{ background: c.hex, flex: c.count, minWidth: 2 }} />
                      ))}
                    </div>
                  </div>

                  {/* 明细 */}
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
            )}
          </div>
        </aside>

        {/* 预览区 */}
        <main ref={containerRef} style={{ flex: 1, overflow: "auto", background: "repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%) 0 0 / 20px 20px", display: "flex", alignItems: "flex-start", justifyContent: "flex-start", padding: 20 }}>
          {image ? (
            <canvas ref={canvasRef} style={{ display: "block", imageRendering: "pixelated", borderRadius: 6, boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }} />
          ) : (
            <div style={{ flex: 1, minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "var(--text-muted)" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "rgba(124,107,255,0.07)", border: "1px solid rgba(124,107,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>🧩</div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-dim)", marginBottom: 6 }}>尚未上传图片</p>
                <p style={{ fontSize: 13 }}>上传图片后将自动生成拼豆图纸</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
