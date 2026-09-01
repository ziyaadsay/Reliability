import React, { useState, useEffect, useRef } from "react";

/*
  HSIA / TV / SHS Reliability Dashboard — single-file React component.
  Source: "Reliability / Deact KPIs" tab, Reliability & Deacts workbook.
  No external chart library — all charts are hand-rolled inline SVG so this
  file has a single dependency (React) and can be dropped into any React
  host/bundler without wiring up extra packages.
*/

// ---------------------------------------------------------------------------
// Data (verbatim from the source workbook; gaps are null, not interpolated)
// ---------------------------------------------------------------------------
const DATA = {
  months: [
    "Apr 2024","May 2024","Jun 2024","Jul 2024","Aug 2024","Sep 2024","Oct 2024","Nov 2024","Dec 2024",
    "Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025",
    "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026"
  ],
  ticketRate: {
    HSIA: [1.93,1.96,1.93,1.92,2.01,1.98,2.07,1.97,2.03,2.10,1.77,1.95,1.88,1.87,1.90,2.09,2.08,1.95,1.75,1.90,1.85,1.89,1.64,2.04,2.03,2.23,2.29],
    TV:   [3.19,2.98,2.43,2.49,2.50,2.55,3.04,2.90,2.94,3.53,3.02,3.17,3.01,3.05,2.76,2.86,2.81,2.68,3.00,3.12,2.92,2.90,2.41,2.79,2.71,2.47,2.56],
    SHS:  [4.59,4.20,3.85,3.80,3.97,3.94,4.58,4.40,4.48,4.97,4.06,4.39,4.41,4.40,4.27,4.89,4.93,4.77,4.61,4.27,4.47,4.37,4.21,4.23,3.89,3.81,4.15]
  },
  repairRate: {
    HSIA: [0.49,0.55,0.51,0.53,0.59,0.60,0.62,0.56,0.55,0.59,0.54,0.58,0.58,0.65,0.66,0.74,0.76,0.76,0.84,0.76,0.76,0.77,0.68,0.78,0.81,0.84,0.74],
    TV:   [0.21,0.23,0.21,0.21,0.23,0.25,0.26,0.18,0.16,0.18,0.15,0.19,0.17,0.17,0.15,0.14,0.13,0.13,0.16,0.15,0.14,0.16,0.15,0.16,0.17,0.17,0.12],
    SHS:  [0.47,0.48,0.44,0.43,0.43,0.43,0.54,0.48,0.40,0.50,0.43,0.46,0.46,0.46,0.45,0.50,0.46,0.47,0.54,0.49,0.50,0.54,0.49,0.51,0.53,0.54,0.41]
  },
  churnRate: {
    HSIA: [null,null,null,null,null,null,null,null,null,null,0.88,0.89,1.13,1.16,1.13,1.27,1.20,1.16,1.23,1.07,0.97,0.98,0.81,0.98,1.10,1.08,1.05],
    TV:   [null,null,null,null,null,null,null,null,null,null,1.12,1.13,1.33,1.36,1.31,1.50,1.41,1.37,1.46,1.35,1.19,1.28,1.05,1.24,1.33,1.29,1.30],
    SHS:  [null,null,null,null,null,null,null,null,null,null,1.14,1.27,1.52,1.53,1.34,1.53,1.47,1.29,1.60,1.39,1.00,1.60,1.04,1.25,1.40,1.26,1.51]
  },
  recentMonths: ["Dec 2025","Jan 2026","Feb 2026"],
  calls: {
    HSIA: [51904,52284,47468],
    TV:   [38217,38742,37762],
    SHS:  [44469,42929,34206]
  },
  ticketVolume: {
    HSIA: [34472,35661,27996],
    TV:   [32377,33877,23702],
    SHS:  [39440,39745,35239]
  },
  fieldRepairMonths: ["Dec 2025","Jan 2026","Feb 2026","Mar 2026"],
  fieldRepairVolume: {
    HSIA: [528,516,493,512],
    TV:   [445,482,422,415],
    SHS:  [222,254,204,219]
  },
  deactMonths: ["Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025","Jan 2026","Feb 2026"],
  productTechnicalDeactsK: {
    HSIA: [2.0,1.8,2.0,2.2,2.2,2.2,2.6,2.7,2.6,2.6,2.4,2.0,2.0,1.8],
    TV:   [2.00,1.77,1.87,1.98,1.99,1.94,2.30,2.27,2.14,2.21,2.15,1.79,1.8,1.6],
    SHS:  [1.5,1.5,1.7,1.9,1.9,1.7,2.1,2.3,2.1,2.1,1.9,1.6,1.5,1.4]
  },
  annualChurn: {
    HSIA: { y2026: 0.95, y2025: 1.13, yoyPts: -0.18 },
    TV:   { y2026: 1.17, y2025: 1.36, yoyPts: -0.19 },
    SHS:  { y2026: 1.37, y2025: 1.67, yoyPts: -0.30 }
  },
  hsiaFibreMonths: ["Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025","Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026"],
  hsiaFibreDegraded: {
    volume: [624,952,2076,2451,3374,2505,2641,2541,2197,2358,2524,2467],
    pctOfHsiaRepairs: [4.51,6.13,12.92,15.12,18.85,15.42,16.19,15.50,15.07,14.11,14.56,13.31],
    hsiaJobs: [13826,15529,16073,16207,17901,16242,16317,16392,14574,16717,17332,18530]
  }
};

// ---------------------------------------------------------------------------
// Palette — HSIA/TV are mode-invariant (validated against the dataviz
// accessibility gates: lightness band, chroma floor, CVD separation,
// normal-vision floor, contrast — all pass in both themes on the adjacent
// pairlist). SHS uses the documented default palette's blue, stepped for
// light vs. dark, since TELUS's own gray tones fail the chroma floor.
// ---------------------------------------------------------------------------
const LIGHT_COLOR = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#2a78d6" };
const DARK_COLOR  = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#3987e5" };
const DASH = { HSIA: "0", TV: "9 6", SHS: "1.5 4.5" };
const LABEL = { HSIA: "HSIA", TV: "TV", SHS: "SHS" };
const ORDER = ["HSIA", "TV", "SHS"];

const LIGHT_THEME = {
  bg: "#F4F4F7", surface: "#FFFFFF", border: "#E3E6E8", borderStrong: "#B2B9BF",
  text: "#2C2E30", textSecondary: "#414547", textMuted: "#676E73", textFaint: "#8B959C",
  purple: "#4B286D", purpleDark: "#371E4F", purpleMed: "#613889",
  purpleLightest: "#F2EFF4", purpleLighter: "#D8CBE5",
  good: "#2B8000", bad: "#B3261E", heading: "#4B286D",
  headerGrad: "linear-gradient(135deg,#371E4F 0%,#4B286D 55%,#613889 100%)"
};
const DARK_THEME = {
  bg: "#1c1a20", surface: "#26232b", border: "#3a3542", borderStrong: "#4d4757",
  text: "#F1EEF5", textSecondary: "#D3CCDE", textMuted: "#A79EB6", textFaint: "#8B7FA0",
  purple: "#4B286D", purpleDark: "#371E4F", purpleMed: "#613889",
  purpleLightest: "#2E2838", purpleLighter: "#4d4360",
  good: "#2B8000", bad: "#FF6B6B", heading: "#C9A9E8",
  headerGrad: "linear-gradient(135deg,#26212e 0%,#3a2c50 55%,#4b3766 100%)"
};

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------
function fmtNum(v) { return v == null ? "–" : v.toLocaleString(); }
function fmtPct(v, d = 2) { return v == null ? "–" : v.toFixed(d) + "%"; }
function lastIdx(arr) { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return i; return -1; }

function deltaInfo(curr, prev, invertGood, unit, decimals) {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  const good = invertGood ? diff <= 0 : diff >= 0;
  const flat = Math.abs(diff) < 1e-9;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "▬";
  const magnitude = Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return { text: `${arrow} ${magnitude}${unit} vs prior mo.`, tone: flat ? "flat" : good ? "good" : "bad" };
}

function niceCeil(v) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const frac = v / base;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * base;
}

function useIsDark(themeMode) {
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", handler) : mq.removeListener(handler));
  }, []);
  if (themeMode === "dark") return true;
  if (themeMode === "light") return false;
  return systemDark;
}

// ---------------------------------------------------------------------------
// SVG line chart with an index-based hover tooltip (no external deps)
// ---------------------------------------------------------------------------
const VIEW_W = 800;

function LineChart({ labels, seriesDefs, height = 260, yFmt, colors, T, valueLabel }) {
  const wrapRef = useRef(null);
  const [hoverI, setHoverI] = useState(null);
  const left = 46, right = 54, top = 14, bottom = labels.length ? 22 : 14;
  const plotW = VIEW_W - left - right;
  const plotH = height - top - bottom;

  const allVals = seriesDefs.flatMap((s) => s.data.filter((v) => v != null));
  const max = allVals.length ? niceCeil(Math.max(...allVals) * 1.15) : 1;

  const xScale = (i) => (labels.length <= 1 ? left + plotW / 2 : left + (i * plotW) / (labels.length - 1));
  const yScale = (v) => top + (1 - v / max) * plotH;

  function handleMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    let best = 0, bestD = Infinity;
    for (let i = 0; i < labels.length; i++) {
      const d = Math.abs(xScale(i) - relX);
      if (d < bestD) { bestD = d; best = i; }
    }
    setHoverI(best);
  }

  const tickCount = 4;
  const xLabelStep = Math.max(1, Math.ceil(labels.length / 6));
  const hoverPct = hoverI != null ? (xScale(hoverI) / VIEW_W) * 100 : null;
  const tooltipLeft = hoverPct == null ? 0 : Math.min(88, Math.max(2, hoverPct));
  const tooltipAlignRight = hoverPct != null && hoverPct > 62;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", aspectRatio: `${VIEW_W} / ${height}` }} onMouseMove={handleMove} onMouseLeave={() => setHoverI(null)}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${height}`}>
        {Array.from({ length: tickCount + 1 }).map((_, t) => {
          const v = (max * t) / tickCount;
          const y = yScale(v);
          return (
            <g key={t}>
              <line x1={left} x2={VIEW_W - right} y1={y} y2={y} stroke={T.border} strokeWidth="1" />
              <text x={left - 8} y={y} fontSize="10.5" fill={T.textMuted} textAnchor="end" dominantBaseline="middle">
                {yFmt(v)}
              </text>
            </g>
          );
        })}
        {labels.map((m, i) =>
          i % xLabelStep === 0 ? (
            <text key={i} x={xScale(i)} y={height - 6} fontSize="10" fill={T.textMuted} textAnchor="middle">
              {m.replace(/(\d{4})/, (y) => y.slice(2))}
            </text>
          ) : null
        )}
        {hoverI != null && (
          <line x1={xScale(hoverI)} x2={xScale(hoverI)} y1={top} y2={height - bottom} stroke={T.borderStrong} strokeWidth="1" strokeDasharray="3 3" />
        )}
        {seriesDefs.map((s) => {
          const pts = s.data.map((v, i) => (v == null ? null : { x: xScale(i), y: yScale(v), v })).filter(Boolean);
          if (!pts.length) return null;
          const d = "M " + pts.map((p) => `${p.x},${p.y}`).join(" L ");
          const last = pts[pts.length - 1];
          return (
            <g key={s.key}>
              <path d={d} fill="none" stroke={colors[s.key]} strokeWidth="2.5" strokeDasharray={DASH[s.key] === "0" ? undefined : DASH[s.key]} />
              <text x={last.x + 5} y={last.y} fontSize="11.5" fontWeight="600" fill={colors[s.key]} dominantBaseline="middle">
                {yFmt(last.v)}
              </text>
              {hoverI != null && s.data[hoverI] != null && (
                <circle cx={xScale(hoverI)} cy={yScale(s.data[hoverI])} r="3.5" fill={colors[s.key]} stroke={T.surface} strokeWidth="1.5" />
              )}
            </g>
          );
        })}
      </svg>
      {hoverI != null && (
        <div style={{
          position: "absolute", top: 6, left: `${tooltipLeft}%`,
          transform: tooltipAlignRight ? "translateX(-100%)" : "none",
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: "8px 10px", fontSize: 12, color: T.text, boxShadow: "0 4px 16px rgba(0,0,0,.12)",
          pointerEvents: "none", whiteSpace: "nowrap", zIndex: 2
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{labels[hoverI]}</div>
          {seriesDefs.map((s) => s.data[hoverI] != null && (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[s.key], display: "inline-block" }} />
              {LABEL[s.key]}: <b>{yFmt(s.data[hoverI])}</b>
            </div>
          ))}
        </div>
      )}
      {valueLabel && <div style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>{valueLabel}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG grouped bar chart with static value labels (small category counts,
// so direct labels beat a hover-only encoding)
// ---------------------------------------------------------------------------
function BarChart({ labels, seriesDefs, height = 220, yFmt, colors, T }) {
  const left = 46, right = 10, top = 26, bottom = 26;
  const plotW = VIEW_W - left - right;
  const plotH = height - top - bottom;
  const allVals = seriesDefs.flatMap((s) => s.data.filter((v) => v != null));
  const max = allVals.length ? niceCeil(Math.max(...allVals) * 1.18) : 1;
  const groupW = plotW / labels.length;
  const n = seriesDefs.length || 1;
  const barW = Math.min(34, (groupW * 0.72) / n);
  const groupGap = groupW * 0.14;

  const tickCount = 4;

  return (
    <div style={{ width: "100%", aspectRatio: `${VIEW_W} / ${height}` }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${height}`}>
        {Array.from({ length: tickCount + 1 }).map((_, t) => {
          const v = (max * t) / tickCount;
          const y = top + (1 - v / max) * plotH;
          return (
            <g key={t}>
              <line x1={left} x2={VIEW_W - right} y1={y} y2={y} stroke={T.border} strokeWidth="1" />
              <text x={left - 8} y={y} fontSize="10.5" fill={T.textMuted} textAnchor="end" dominantBaseline="middle">{yFmt(v)}</text>
            </g>
          );
        })}
        {labels.map((m, gi) => {
          const groupX = left + gi * groupW + groupGap / 2;
          return (
            <g key={m}>
              <text x={left + gi * groupW + groupW / 2} y={height - 8} fontSize="11" fill={T.textMuted} textAnchor="middle">{m}</text>
              {seriesDefs.map((s, si) => {
                const v = s.data[gi];
                if (v == null) return null;
                const bh = (v / max) * plotH;
                const x = groupX + si * barW;
                const y = top + plotH - bh;
                return (
                  <g key={s.key}>
                    <rect x={x} y={y} width={barW - 3} height={bh} rx="3" fill={colors[s.key]} />
                    <text x={x + (barW - 3) / 2} y={y - 5} fontSize="10" fill={T.textSecondary} textAnchor="middle">{yFmt(v)}</text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Legend({ keys, colors, T }) {
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", margin: "10px 2px 4px", fontSize: 12.5, color: T.textSecondary, flexWrap: "wrap" }}>
      {keys.map((k) => (
        <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            width: 16, height: 0, borderTop: `3px ${k === "HSIA" ? "solid" : k === "TV" ? "dashed" : "dotted"} ${colors[k]}`,
            borderTopWidth: k === "SHS" ? 4 : 3, borderRadius: 2
          }} />
          {LABEL[k]}
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, delta, color, T }) {
  const toneColor = delta?.tone === "good" ? T.good : delta?.tone === "bad" ? T.bad : T.textMuted;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
      <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block" }} />
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1.1 }}>{value}</div>
      {delta && <div style={{ fontSize: 12.5, marginTop: 6, fontWeight: 600, color: toneColor }}>{delta.text}</div>}
    </div>
  );
}

function DataTable({ labels, seriesDefs, fmt, T }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 10, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 10px", color: T.textMuted, fontWeight: 600, fontSize: 11.5, textTransform: "uppercase" }}>Month</th>
            {seriesDefs.map((s) => (
              <th key={s.key} style={{ textAlign: "right", padding: "6px 10px", color: T.textMuted, fontWeight: 600, fontSize: 11.5, textTransform: "uppercase" }}>{LABEL[s.key]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((m, i) => (
            <tr key={m}>
              <td style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border}`, color: T.textSecondary, fontWeight: 600 }}>{m}</td>
              {seriesDefs.map((s) => (
                <td key={s.key} style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border}`, textAlign: "right", whiteSpace: "nowrap" }}>{fmt(s.data[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableToggle({ open, onClick, T }) {
  return (
    <button onClick={onClick} style={{ fontSize: 12, border: `1px solid ${T.borderStrong}`, background: "transparent", color: T.textMuted, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
      {open ? "Hide table" : "View as table"}
    </button>
  );
}

function ChartCard({ title, T, children, tableOpen, onToggleTable, note }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px 8px", boxShadow: "0 1px 2px rgba(0,0,0,.05)", marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.textSecondary }}>{title}</span>
        <TableToggle open={tableOpen} onClick={onToggleTable} T={T} />
      </div>
      {children}
      {note && <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>{note}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ReliabilityDashboard() {
  const [active, setActive] = useState({ HSIA: true, TV: true, SHS: true });
  const [range, setRange] = useState(27);
  const [themeMode, setThemeMode] = useState("system");
  const [openTables, setOpenTables] = useState({});

  const isDark = useIsDark(themeMode);
  const colors = isDark ? DARK_COLOR : LIGHT_COLOR;
  const T = isDark ? DARK_THEME : LIGHT_THEME;
  const keys = ORDER.filter((k) => active[k]);

  function toggleSeries(k) {
    const willBeActive = !active[k];
    const otherActive = ORDER.some((kk) => kk !== k && active[kk]);
    if (!willBeActive && !otherActive) return;
    setActive({ ...active, [k]: willBeActive });
  }
  function toggleTable(id) { setOpenTables((o) => ({ ...o, [id]: !o[id] })); }

  const months = DATA.months.slice(Math.max(0, DATA.months.length - range));
  const sliceRange = (arr) => arr.slice(Math.max(0, arr.length - range));

  const seriesDefs = (dataset) => keys.map((k) => ({ key: k, data: dataset[k] }));

  const cardStyle = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 2px rgba(0,0,0,.05)" };

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica Neue,Arial,sans-serif", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ background: T.headerGrad, color: "#fff", padding: "28px 0 26px", marginBottom: 28 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                  <circle cx="8" cy="16" r="3" fill="#7C53A5" />
                  <circle cx="16" cy="8" r="3" fill="#2B8000" />
                  <path d="M8 13V6M16 11v7" stroke="rgba(255,255,255,.5)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-.01em" }}>HSIA, TV &amp; SHS Reliability Dashboard</h1>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.78)", margin: 0, maxWidth: 560, lineHeight: 1.5 }}>
                  Calls, tickets, repairs/dispatches &amp; churn — trended monthly, HSIA vs. TV vs. SHS.
                </p>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)", marginTop: 12 }}>
              Source: Reliability / Deact KPIs workbook · figures current through the latest reported month
            </div>
          </div>
          <button onClick={() => setThemeMode(isDark ? "light" : "dark")}
            style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.25)", color: "#fff", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", gap: 6, alignItems: "center" }}>
            <span>{isDark ? "☀️" : "🌙"}</span><span>{isDark ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 20px 64px" }}>
        {/* Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between", ...cardStyle, marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".04em" }}>Product</span>
            <div style={{ display: "flex", gap: 6 }}>
              {ORDER.map((k) => {
                const on = active[k];
                return (
                  <button key={k} onClick={() => toggleSeries(k)}
                    style={{
                      border: `1px solid ${on ? "transparent" : T.borderStrong}`, background: on ? colors[k] : "transparent",
                      color: on ? "#fff" : T.textSecondary, borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 500,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: on ? 1 : 0.55
                    }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: on ? "#fff" : colors[k] }} />
                    {k}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".04em" }}>Trend window</span>
            <div style={{ display: "flex", gap: 6 }}>
              {[["12 mo", 12], ["24 mo", 24], ["All (27 mo)", 27]].map(([label, m]) => (
                <button key={m} onClick={() => setRange(m)}
                  style={{
                    border: `1px solid ${range === m ? T.purple : T.borderStrong}`, background: range === m ? T.purple : "transparent",
                    color: range === m ? "#fff" : T.textSecondary, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer"
                  }}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* CALLS */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 19, margin: 0, color: T.heading, fontWeight: 700 }}>📞 Calls</h2>
            <span style={{ fontSize: 13, color: T.textMuted }}>Inbound call volume by product · Assure/CCAI, latest 3 reported months</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>
            {keys.map((k) => {
              const data = DATA.calls[k];
              const li = data.length - 1;
              return <StatCard key={k} T={T} color={colors[k]} label={`${LABEL[k]} calls · ${DATA.recentMonths[li]}`} value={fmtNum(data[li])}
                delta={deltaInfo(data[li], data[li - 1], true, "", 0)} />;
            })}
          </div>
          <ChartCard title="Monthly call volume" T={T} tableOpen={!!openTables.calls} onToggleTable={() => toggleTable("calls")}
            note="Only three months of call-volume data exist in the source workbook (Dec 2025–Feb 2026, from the Assure Tickets looker / CCAI extract) — shown as a snapshot rather than a long trend.">
            <BarChart labels={DATA.recentMonths} seriesDefs={seriesDefs(DATA.calls)} yFmt={fmtNum} colors={colors} T={T} />
            <Legend keys={keys} colors={colors} T={T} />
            {openTables.calls && <DataTable labels={DATA.recentMonths} seriesDefs={seriesDefs(DATA.calls)} fmt={fmtNum} T={T} />}
          </ChartCard>
        </section>

        {/* TICKETS */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 19, margin: 0, color: T.heading, fontWeight: 700 }}>🎫 Tickets</h2>
            <span style={{ fontSize: 13, color: T.textMuted }}>Trouble-ticket rate (% of subscriber base) · 27-month trend</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>
            {keys.map((k) => {
              const rates = DATA.ticketRate[k];
              const li = lastIdx(rates);
              return <StatCard key={k} T={T} color={colors[k]} label={`${LABEL[k]} ticket rate · ${DATA.months[li]}`} value={fmtPct(rates[li])}
                delta={deltaInfo(rates[li], rates[li - 1], true, "pts", 2)} />;
            })}
          </div>
          <ChartCard title="Ticket rate, monthly" T={T} tableOpen={!!openTables.tickets} onToggleTable={() => toggleTable("tickets")}>
            <LineChart labels={months} seriesDefs={keys.map((k) => ({ key: k, data: sliceRange(DATA.ticketRate[k]) }))} yFmt={(v) => v.toFixed(2) + "%"} colors={colors} T={T} />
            <Legend keys={keys} colors={colors} T={T} />
            {openTables.tickets && <DataTable labels={months} seriesDefs={keys.map((k) => ({ key: k, data: sliceRange(DATA.ticketRate[k]) }))} fmt={(v) => fmtPct(v, 2)} T={T} />}
          </ChartCard>
          <ChartCard title="Ticket volume — latest 3 months" T={T} tableOpen={!!openTables.ticketvol} onToggleTable={() => toggleTable("ticketvol")}>
            <BarChart labels={DATA.recentMonths} seriesDefs={seriesDefs(DATA.ticketVolume)} height={200} yFmt={fmtNum} colors={colors} T={T} />
            <Legend keys={keys} colors={colors} T={T} />
            {openTables.ticketvol && <DataTable labels={DATA.recentMonths} seriesDefs={seriesDefs(DATA.ticketVolume)} fmt={fmtNum} T={T} />}
          </ChartCard>
        </section>

        {/* REPAIRS */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 19, margin: 0, color: T.heading, fontWeight: 700 }}>🛠️ Repairs / Dispatches</h2>
            <span style={{ fontSize: 13, color: T.textMuted }}>Field-repair (truck-roll) rate · 27-month trend</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>
            {keys.map((k) => {
              const rates = DATA.repairRate[k];
              const li = lastIdx(rates);
              return <StatCard key={k} T={T} color={colors[k]} label={`${LABEL[k]} repair rate · ${DATA.months[li]}`} value={fmtPct(rates[li])}
                delta={deltaInfo(rates[li], rates[li - 1], true, "pts", 2)} />;
            })}
          </div>
          <ChartCard title="Repair rate, monthly" T={T} tableOpen={!!openTables.repairs} onToggleTable={() => toggleTable("repairs")}>
            <LineChart labels={months} seriesDefs={keys.map((k) => ({ key: k, data: sliceRange(DATA.repairRate[k]) }))} yFmt={(v) => v.toFixed(2) + "%"} colors={colors} T={T} />
            <Legend keys={keys} colors={colors} T={T} />
            {openTables.repairs && <DataTable labels={months} seriesDefs={keys.map((k) => ({ key: k, data: sliceRange(DATA.repairRate[k]) }))} fmt={(v) => fmtPct(v, 2)} T={T} />}
          </ChartCard>
          <ChartCard title="Field-repair (dispatch) volume — latest 4 months" T={T} tableOpen={!!openTables.repairvol} onToggleTable={() => toggleTable("repairvol")}>
            <BarChart labels={DATA.fieldRepairMonths} seriesDefs={seriesDefs(DATA.fieldRepairVolume)} height={200} yFmt={fmtNum} colors={colors} T={T} />
            <Legend keys={keys} colors={colors} T={T} />
            {openTables.repairvol && <DataTable labels={DATA.fieldRepairMonths} seriesDefs={seriesDefs(DATA.fieldRepairVolume)} fmt={fmtNum} T={T} />}
          </ChartCard>

          <div style={{ background: T.purpleLightest, border: `1px solid ${T.purpleLighter}`, borderRadius: 12, padding: "18px 20px", marginTop: 20 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, color: T.heading }}>HSIA spotlight — severely degraded fibre line</h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: T.textMuted, maxWidth: 640 }}>
              No TV equivalent exists in the source data. Shown separately because it is currently the single largest identified driver of HSIA repairs.
            </p>
            <LineChart labels={DATA.hsiaFibreMonths} seriesDefs={[{ key: "HSIA", data: DATA.hsiaFibreDegraded.pctOfHsiaRepairs }]}
              height={200} yFmt={(v) => v.toFixed(1) + "%"} colors={colors} T={T} />
          </div>
        </section>

        {/* CHURN */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <h2 style={{ fontSize: 19, margin: 0, color: T.heading, fontWeight: 700 }}>📉 Churn</h2>
            <span style={{ fontSize: 13, color: T.textMuted }}>Monthly churn rate (% of subscriber base) · 27-month trend</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 16 }}>
            {keys.map((k) => {
              const rates = DATA.churnRate[k];
              const li = lastIdx(rates);
              const yoy = DATA.annualChurn[k];
              const primary = deltaInfo(rates[li], rates[li - 1], true, "pts", 2);
              return (
                <StatCard key={k} T={T} color={colors[k]} label={`${LABEL[k]} churn rate · ${DATA.months[li]}`} value={fmtPct(rates[li])}
                  delta={primary ? { text: primary.text, tone: primary.tone } : null} />
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 16, marginTop: -6 }}>
            {keys.map((k) => {
              const yoy = DATA.annualChurn[k];
              return (
                <div key={k} style={{ fontSize: 12, color: yoy.yoyPts <= 0 ? T.good : T.bad, fontWeight: 600, padding: "0 4px" }}>
                  {yoy.yoyPts <= 0 ? "▼" : "▲"} {Math.abs(yoy.yoyPts).toFixed(2)}pts YoY ({LABEL[k]} 2026 YTD: {yoy.y2026.toFixed(2)}% vs 2025: {yoy.y2025.toFixed(2)}%)
                </div>
              );
            })}
          </div>
          <ChartCard title="Churn rate, monthly" T={T} tableOpen={!!openTables.churn} onToggleTable={() => toggleTable("churn")}>
            <LineChart labels={months} seriesDefs={keys.map((k) => ({ key: k, data: sliceRange(DATA.churnRate[k]) }))} yFmt={(v) => v.toFixed(2) + "%"} colors={colors} T={T} />
            <Legend keys={keys} colors={colors} T={T} />
            {openTables.churn && <DataTable labels={months} seriesDefs={keys.map((k) => ({ key: k, data: sliceRange(DATA.churnRate[k]) }))} fmt={(v) => fmtPct(v, 2)} T={T} />}
          </ChartCard>
          <ChartCard title="Product/technical deact volume (thousands) — Jan 2025–Feb 2026" T={T} tableOpen={!!openTables.deacts} onToggleTable={() => toggleTable("deacts")}>
            <LineChart labels={DATA.deactMonths} seriesDefs={seriesDefs(DATA.productTechnicalDeactsK)} yFmt={(v) => v.toFixed(1) + "K"} colors={colors} T={T} />
            <Legend keys={keys} colors={colors} T={T} />
            {openTables.deacts && <DataTable labels={DATA.deactMonths} seriesDefs={seriesDefs(DATA.productTechnicalDeactsK)} fmt={(v) => (v == null ? "–" : v.toFixed(1) + "K")} T={T} />}
          </ChartCard>
        </section>
      </div>

      <footer style={{ textAlign: "center", fontSize: 12, color: T.textFaint, padding: "20px 0" }}>
        Built from the Reliability / Deact KPIs workbook · figures reflect what was reported as of the source snapshot, not a live feed
      </footer>
    </div>
  );
}
