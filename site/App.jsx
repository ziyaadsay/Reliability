import React, { useState, useEffect, useRef } from "react";

/*
  FFH Reliability Scorecards — HSIA / TV / SHS
  Single-file React app: left-nav multi-page layout (Overview + one page per
  product), date-range + product filters, scorecard summary table, SVG charts.

  Source: "Reliability / Deact KPIs" tab, Reliability & Deacts workbook.
  Reporting window: Jan 2025 – Jun 2026 (latest month reported in the source).
  July 2026 is not yet in the workbook; when it lands, append one value to each
  series below and everything (latest figures, deltas, sparklines) follows.

  Calls are reported as an FFH rollup (HSIA + TV combined) — the source has no
  product-level call split. SHS has its own repeat-call series.
*/

// ---------------------------------------------------------------------------
// Data (verbatim from the source workbook; gaps are null, not interpolated)
// ---------------------------------------------------------------------------
const MONTHS = [
  "Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025",
  "Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025",
  "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026"
];

const DATA = {
  // Repeat call rate (%) — FFH is the HSIA+TV rollup; no per-product split exists
  repeatCalls: {
    FFH: [17.02,16.34,17.05,17.07,17.40,17.16,17.46,16.97,14.95,14.75,15.96,15.31,16.54,17.11,16.10,13.87,15.09,13.99],
    SHS: [15.36,14.48,14.33,13.43,12.81,13.23,13.01,13.35,12.57,13.17,13.11,13.27,12.85,12.60,12.28,12.45,12.05,12.14]
  },
  // Trouble-ticket rate (% of subscriber base)
  ticketRate: {
    HSIA: [2.10,1.77,1.95,1.88,1.87,1.90,2.09,2.08,1.95,1.75,1.90,1.85,1.89,1.64,2.04,2.03,2.23,2.29],
    TV:   [3.53,3.02,3.17,3.01,3.05,2.76,2.86,2.81,2.68,3.00,3.12,2.92,2.90,2.41,2.79,2.71,2.47,2.56],
    SHS:  [4.97,4.06,4.39,4.41,4.40,4.27,4.89,4.93,4.77,4.61,4.27,4.47,4.37,4.21,4.23,3.89,3.81,4.15]
  },
  // Field-repair / dispatch rate (% of subscriber base)
  repairRate: {
    HSIA: [0.59,0.54,0.58,0.58,0.65,0.66,0.74,0.76,0.76,0.84,0.76,0.76,0.77,0.68,0.78,0.81,0.84,0.74],
    TV:   [0.18,0.15,0.19,0.17,0.17,0.15,0.14,0.13,0.13,0.16,0.15,0.14,0.16,0.15,0.16,0.17,0.17,0.12],
    SHS:  [0.50,0.43,0.46,0.46,0.46,0.45,0.50,0.46,0.47,0.54,0.49,0.50,0.54,0.49,0.51,0.53,0.54,0.41]
  },
  // Monthly churn rate (%) — first reported Feb 2025 in the source
  churnRate: {
    HSIA: [null,0.88,0.89,1.13,1.16,1.13,1.27,1.20,1.16,1.23,1.07,0.97,0.98,0.81,0.98,1.10,1.08,1.05],
    TV:   [null,1.12,1.13,1.33,1.36,1.31,1.50,1.41,1.37,1.46,1.35,1.19,1.28,1.05,1.24,1.33,1.29,1.30],
    SHS:  [null,1.14,1.27,1.52,1.53,1.34,1.53,1.47,1.29,1.60,1.39,1.00,1.60,1.04,1.25,1.40,1.26,1.51]
  },
  // Product/technical deactivation volume (count, current model)
  productTechDeacts: {
    HSIA: [615,551,612,685,723,675,817,827,827,806,680,568,565,421,506,520,590,588],
    TV:   [474,398,539,540,564,595,615,606,540,576,599,425,456,426,371,405,393,383],
    SHS:  [639,659,843,997,1017,915,1137,1236,1172,1150,964,822,736,712,721,623,671,694]
  },
  // Annualized churn snapshot (go/national RGU), 2026 YTD vs 2025
  annualChurn: {
    HSIA: { y2026: 0.95, y2025: 1.13, yoyPts: -0.18 },
    TV:   { y2026: 1.17, y2025: 1.36, yoyPts: -0.19 },
    SHS:  { y2026: 1.37, y2025: 1.67, yoyPts: -0.30 }
  },
  // Snapshot tables (limited months in the source)
  ticketVolumeMonths: ["Dec 2025","Jan 2026","Feb 2026"],
  ticketVolume: { HSIA: [34472,35661,27996], TV: [32377,33877,23702], SHS: [39440,39745,35239] },
  fieldRepairMonths: ["Dec 2025","Jan 2026","Feb 2026","Mar 2026"],
  fieldRepairVolume: { HSIA: [528,516,493,512], TV: [445,482,422,415], SHS: [222,254,204,219] },
  // HSIA-only spotlight: repairs coded as severely degraded fibre line
  hsiaFibreMonths: ["Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025","Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026"],
  hsiaFibrePct: [4.51,6.13,12.92,15.12,18.85,15.42,16.19,15.50,15.07,14.11,14.56,13.31]
};

// ---------------------------------------------------------------------------
// Palette — HSIA/TV mode-invariant, SHS blue stepped per mode; all validated
// against the dataviz accessibility gates on the adjacent pairlist in both
// themes. FFH (rollup) never shares a chart with the products, so it takes a
// distinct orange from the documented default palette.
// ---------------------------------------------------------------------------
const LIGHT_COLOR = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#2a78d6", FFH: "#eb6834" };
const DARK_COLOR  = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#3987e5", FFH: "#d95926" };
const PRODUCTS = ["HSIA", "TV", "SHS"];

const LIGHT_THEME = {
  bg: "#F4F4F7", surface: "#FFFFFF", border: "#E3E6E8", borderStrong: "#B2B9BF",
  text: "#2C2E30", textSecondary: "#414547", textMuted: "#676E73", textFaint: "#8B959C",
  purple: "#4B286D", purpleLightest: "#F2EFF4", purpleLighter: "#D8CBE5",
  good: "#2B8000", bad: "#B3261E", heading: "#4B286D",
  sidebarBg: "#FFFFFF", navActiveBg: "#F2EFF4", navActiveText: "#4B286D"
};
const DARK_THEME = {
  bg: "#1c1a20", surface: "#26232b", border: "#3a3542", borderStrong: "#4d4757",
  text: "#F1EEF5", textSecondary: "#D3CCDE", textMuted: "#A79EB6", textFaint: "#8B7FA0",
  purple: "#4B286D", purpleLightest: "#2E2838", purpleLighter: "#4d4360",
  good: "#4caf50", bad: "#FF6B6B", heading: "#C9A9E8",
  sidebarBg: "#221f28", navActiveBg: "#2E2838", navActiveText: "#C9A9E8"
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function fmtNum(v) { return v == null ? "–" : v.toLocaleString(); }
function fmtPct(v, d = 2) { return v == null ? "–" : v.toFixed(d) + "%"; }
function lastIdxUpTo(arr, upTo) { for (let i = Math.min(upTo, arr.length - 1); i >= 0; i--) if (arr[i] != null) return i; return -1; }

function niceCeil(v) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const frac = v / base;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * base;
}

// invertGood: for these reliability metrics, a decrease is always good
function delta(curr, prev, unit, decimals) {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  const flat = Math.abs(diff) < 1e-9;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "▬";
  const mag = Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return { text: `${arrow} ${mag}${unit}`, tone: flat ? "flat" : diff <= 0 ? "good" : "bad" };
}

function useIsDark(mode) {
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
  return mode === "dark" ? true : mode === "light" ? false : systemDark;
}

// ---------------------------------------------------------------------------
// SVG charts
// ---------------------------------------------------------------------------
const VIEW_W = 800;

function LineChart({ labels, seriesDefs, height = 240, yFmt, colors, T }) {
  const wrapRef = useRef(null);
  const [hoverI, setHoverI] = useState(null);
  const left = 46, right = 56, top = 14, bottom = 22;
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

  const xLabelStep = Math.max(1, Math.ceil(labels.length / 6));
  const hoverPct = hoverI != null ? (xScale(hoverI) / VIEW_W) * 100 : null;
  const tooltipLeft = hoverPct == null ? 0 : Math.min(88, Math.max(2, hoverPct));
  const tooltipAlignRight = hoverPct != null && hoverPct > 62;

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", aspectRatio: `${VIEW_W} / ${height}` }} onMouseMove={handleMove} onMouseLeave={() => setHoverI(null)}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${height}`}>
        {Array.from({ length: 5 }).map((_, t) => {
          const v = (max * t) / 4;
          const y = yScale(v);
          return (
            <g key={t}>
              <line x1={left} x2={VIEW_W - right} y1={y} y2={y} stroke={T.border} strokeWidth="1" />
              <text x={left - 8} y={y} fontSize="10.5" fill={T.textMuted} textAnchor="end" dominantBaseline="middle">{yFmt(v)}</text>
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
              <path d={d} fill="none" stroke={colors[s.key]} strokeWidth="2.5" />
              <text x={last.x + 5} y={last.y} fontSize="11.5" fontWeight="600" fill={colors[s.key]} dominantBaseline="middle">{yFmt(last.v)}</text>
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
          padding: "8px 10px", fontSize: 12, color: T.text, boxShadow: "0 4px 16px rgba(0,0,0,.14)",
          pointerEvents: "none", whiteSpace: "nowrap", zIndex: 2
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{labels[hoverI]}</div>
          {seriesDefs.map((s) => s.data[hoverI] != null && (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[s.key], display: "inline-block" }} />
              {s.label || s.key}: <b>{yFmt(s.data[hoverI])}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BarChart({ labels, seriesDefs, height = 190, yFmt, colors, T }) {
  const left = 46, right = 10, top = 24, bottom = 24;
  const plotW = VIEW_W - left - right;
  const plotH = height - top - bottom;
  const allVals = seriesDefs.flatMap((s) => s.data.filter((v) => v != null));
  const max = allVals.length ? niceCeil(Math.max(...allVals) * 1.18) : 1;
  const groupW = plotW / labels.length;
  const n = seriesDefs.length || 1;
  const barW = Math.min(40, (groupW * 0.6) / n);

  return (
    <div style={{ width: "100%", aspectRatio: `${VIEW_W} / ${height}` }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${height}`}>
        {Array.from({ length: 5 }).map((_, t) => {
          const v = (max * t) / 4;
          const y = top + (1 - v / max) * plotH;
          return (
            <g key={t}>
              <line x1={left} x2={VIEW_W - right} y1={y} y2={y} stroke={T.border} strokeWidth="1" />
              <text x={left - 8} y={y} fontSize="10.5" fill={T.textMuted} textAnchor="end" dominantBaseline="middle">{yFmt(v)}</text>
            </g>
          );
        })}
        {labels.map((m, gi) => {
          const cx = left + gi * groupW + groupW / 2;
          const startX = cx - (n * barW) / 2;
          return (
            <g key={m}>
              <text x={cx} y={height - 8} fontSize="11" fill={T.textMuted} textAnchor="middle">{m}</text>
              {seriesDefs.map((s, si) => {
                const v = s.data[gi];
                if (v == null) return null;
                const bh = (v / max) * plotH;
                const x = startX + si * barW;
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

function Sparkline({ data, color, T }) {
  const w = 110, h = 30, pad = 3;
  const vals = data.filter((v) => v != null);
  if (!vals.length) return <span style={{ color: T.textFaint }}>–</span>;
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pts = data.map((v, i) => (v == null ? null : {
    x: pad + (i * (w - pad * 2)) / (data.length - 1),
    y: pad + (1 - (v - min) / span) * (h - pad * 2)
  })).filter(Boolean);
  const d = "M " + pts.map((p) => `${p.x},${p.y}`).join(" L ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" />
      <circle cx={last.x} cy={last.y} r="2.4" fill={color} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// UI building blocks
// ---------------------------------------------------------------------------
function DeltaText({ d, T, suffix }) {
  if (!d) return <span style={{ color: T.textFaint }}>–</span>;
  const color = d.tone === "good" ? T.good : d.tone === "bad" ? T.bad : T.textMuted;
  return <span style={{ color, fontWeight: 600 }}>{d.text}{suffix ? ` ${suffix}` : ""}</span>;
}

function StatCard({ label, sub, value, deltaEl, color, T }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}>
      <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
        {label}
      </div>
      <div style={{ fontSize: 27, fontWeight: 800, color: T.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 3 }}>{sub}</div>}
      {deltaEl && <div style={{ fontSize: 12.5, marginTop: 6 }}>{deltaEl}</div>}
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
              <th key={s.key} style={{ textAlign: "right", padding: "6px 10px", color: T.textMuted, fontWeight: 600, fontSize: 11.5, textTransform: "uppercase" }}>{s.label || s.key}</th>
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

function ChartCard({ title, T, children, tableOpen, onToggleTable, note }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px 12px", boxShadow: "0 1px 2px rgba(0,0,0,.05)", marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.textSecondary }}>{title}</span>
        {onToggleTable && (
          <button onClick={onToggleTable} style={{ fontSize: 12, border: `1px solid ${T.borderStrong}`, background: "transparent", color: T.textMuted, borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
            {tableOpen ? "Hide table" : "View as table"}
          </button>
        )}
      </div>
      {children}
      {note && <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>{note}</p>}
    </div>
  );
}

function SectionHeading({ children, T }) {
  return <h2 style={{ fontSize: 17, margin: "32px 0 12px", color: T.heading, fontWeight: 700 }}>{children}</h2>;
}

// ---------------------------------------------------------------------------
// Indicator metadata (drives the scorecard + product pages)
// ---------------------------------------------------------------------------
const INDICATORS = [
  {
    id: "calls", name: "Calls — repeat call rate", unit: "pts", decimals: 2,
    fmt: (v) => fmtPct(v, 2),
    rows: [
      { key: "FFH", label: "FFH (HSIA + TV)", data: DATA.repeatCalls.FFH },
      { key: "SHS", label: "SHS", data: DATA.repeatCalls.SHS }
    ],
    note: "Calls are reported as an FFH rollup (HSIA + TV combined); the source has no product-level call split."
  },
  {
    id: "tickets", name: "Ticket rate", unit: "pts", decimals: 2,
    fmt: (v) => fmtPct(v, 2),
    rows: PRODUCTS.map((p) => ({ key: p, label: p, data: DATA.ticketRate[p] }))
  },
  {
    id: "repairs", name: "Repair / dispatch rate", unit: "pts", decimals: 2,
    fmt: (v) => fmtPct(v, 2),
    rows: PRODUCTS.map((p) => ({ key: p, label: p, data: DATA.repairRate[p] }))
  },
  {
    id: "churn", name: "Churn rate", unit: "pts", decimals: 2,
    fmt: (v) => fmtPct(v, 2),
    rows: PRODUCTS.map((p) => ({ key: p, label: p, data: DATA.churnRate[p] }))
  },
  {
    id: "deacts", name: "Product/technical deacts", unit: "", decimals: 0,
    fmt: fmtNum,
    rows: PRODUCTS.map((p) => ({ key: p, label: p, data: DATA.productTechDeacts[p] }))
  }
];

// Which indicator series a given product page shows
function productIndicators(product) {
  return [
    product === "SHS"
      ? { title: "Calls — repeat call rate (SHS)", key: "SHS", data: DATA.repeatCalls.SHS, fmt: (v) => fmtPct(v, 2), note: null, id: "calls" }
      : { title: "Calls — repeat call rate (FFH rollup)", key: "FFH", data: DATA.repeatCalls.FFH, fmt: (v) => fmtPct(v, 2), id: "calls",
          note: "Calls are only reported as an FFH rollup (HSIA + TV combined) — there is no " + product + "-specific call series in the source." },
    { title: "Ticket rate", key: product, data: DATA.ticketRate[product], fmt: (v) => fmtPct(v, 2), id: "tickets" },
    { title: "Repair / dispatch rate", key: product, data: DATA.repairRate[product], fmt: (v) => fmtPct(v, 2), id: "repairs" },
    { title: "Churn rate", key: product, data: DATA.churnRate[product], fmt: (v) => fmtPct(v, 2), id: "churn",
      note: "Monthly churn is first reported for Feb 2025 in the source; Jan 2025 is not available." },
    { title: "Product/technical deact volume", key: product, data: DATA.productTechDeacts[product], fmt: fmtNum, id: "deacts" }
  ];
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
export default function ReliabilityScorecards() {
  const [page, setPage] = useState("home");
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(MONTHS.length - 1);
  const [activeProducts, setActiveProducts] = useState({ HSIA: true, TV: true, SHS: true });
  const [themeMode, setThemeMode] = useState("system");
  const [openTables, setOpenTables] = useState({});

  const isDark = useIsDark(themeMode);
  const T = isDark ? DARK_THEME : LIGHT_THEME;
  const colors = isDark ? DARK_COLOR : LIGHT_COLOR;

  const rangeMonths = MONTHS.slice(fromIdx, toIdx + 1);
  const sliceR = (arr) => arr.slice(fromIdx, toIdx + 1);
  const latestLabel = MONTHS[toIdx];

  function toggleProduct(p) {
    const willBe = !activeProducts[p];
    if (!willBe && !PRODUCTS.some((k) => k !== p && activeProducts[k])) return;
    setActiveProducts({ ...activeProducts, [p]: willBe });
  }
  function toggleTable(id) { setOpenTables((o) => ({ ...o, [id]: !o[id] })); }

  // A scorecard row's figures, anchored at the end of the selected range
  function rowFigures(data, decimals) {
    const li = lastIdxUpTo(data, toIdx);
    if (li < 0) return { latest: null };
    return {
      latest: data[li], latestMonth: MONTHS[li],
      mom: li >= 1 ? delta(data[li], data[li - 1], "", decimals) : null,
      yoy: li >= 12 ? delta(data[li], data[li - 12], "", decimals) : null
    };
  }

  const rowVisible = (key) =>
    key === "FFH" ? activeProducts.HSIA || activeProducts.TV : activeProducts[key];

  const navItems = [
    { id: "home", label: "Overview", dot: T.heading },
    { id: "HSIA", label: "HSIA", dot: colors.HSIA },
    { id: "TV", label: "TV", dot: colors.TV },
    { id: "SHS", label: "SHS", dot: colors.SHS }
  ];

  const selectStyle = {
    background: T.surface, color: T.text, border: `1px solid ${T.borderStrong}`,
    borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer"
  };

  // ------------------------------ pages ------------------------------
  function HomePage() {
    return (
      <>
        <div style={{ background: T.purpleLightest, border: `1px solid ${T.purpleLighter}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: T.textSecondary, marginBottom: 20 }}>
          Latest reported month in the source workbook: <b>{MONTHS[MONTHS.length - 1]}</b>. July 2026 figures are not yet published in the Reliability / Deact KPIs tab; the dashboard picks them up automatically once added.
        </div>

        {/* headline cards: one per focal indicator */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
          {INDICATORS.map((ind) => {
            const visRows = ind.rows.filter((r) => rowVisible(r.key));
            if (!visRows.length) return null;
            const first = visRows[0];
            const f = rowFigures(first.data, ind.decimals);
            return (
              <StatCard key={ind.id} T={T} color={colors[first.key]}
                label={`${ind.name} · ${first.label}`}
                value={ind.fmt(f.latest)}
                sub={f.latestMonth}
                deltaEl={<DeltaText d={f.mom} T={T} suffix="vs prior mo." />} />
            );
          })}
        </div>

        {/* scorecard table */}
        <SectionHeading T={T}>Scorecard — all indicators, {latestLabel}</SectionHeading>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,.05)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Indicator", "Product", "Latest", "MoM", "YoY", "Trend (selected range)"].map((h, i) => (
                  <th key={h} style={{ textAlign: i >= 2 && i <= 4 ? "right" : "left", padding: "12px 16px", color: T.textMuted, fontWeight: 600, fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".03em", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {INDICATORS.flatMap((ind) =>
                ind.rows.filter((r) => rowVisible(r.key)).map((r, ri) => {
                  const f = rowFigures(r.data, ind.decimals);
                  return (
                    <tr key={ind.id + r.key}>
                      <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, color: T.textSecondary, fontWeight: ri === 0 ? 700 : 400 }}>
                        {ri === 0 ? ind.name : ""}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: colors[r.key] }} />
                          {r.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, textAlign: "right", fontWeight: 700 }}>
                        {ind.fmt(f.latest)}
                        {f.latestMonth && f.latestMonth !== latestLabel && (
                          <span style={{ fontWeight: 400, color: T.textFaint, fontSize: 11 }}> ({f.latestMonth})</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, textAlign: "right", fontSize: 12.5 }}><DeltaText d={f.mom} T={T} /></td>
                      <td style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, textAlign: "right", fontSize: 12.5 }}><DeltaText d={f.yoy} T={T} /></td>
                      <td style={{ padding: "8px 16px", borderBottom: `1px solid ${T.border}` }}>
                        <Sparkline data={sliceR(r.data)} color={colors[r.key]} T={T} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.6 }}>
          MoM/YoY deltas are month-over-month and year-over-year point changes at the end of the selected range; a decrease (▼, green) is favourable for every indicator shown.
          Calls are an FFH rollup (HSIA + TV combined) — no product-level call split exists in the source. Churn rate is first reported for Feb 2025.
          Annual churn (go/national RGU): HSIA {DATA.annualChurn.HSIA.y2026.toFixed(2)}% 2026 YTD vs {DATA.annualChurn.HSIA.y2025.toFixed(2)}% 2025 ·
          TV {DATA.annualChurn.TV.y2026.toFixed(2)}% vs {DATA.annualChurn.TV.y2025.toFixed(2)}% ·
          SHS {DATA.annualChurn.SHS.y2026.toFixed(2)}% vs {DATA.annualChurn.SHS.y2025.toFixed(2)}%.
        </p>
      </>
    );
  }

  function ProductPage({ product }) {
    const inds = productIndicators(product);
    const yoyChurn = DATA.annualChurn[product];
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
          {inds.map((ind) => {
            const f = rowFigures(ind.data, 2);
            return (
              <StatCard key={ind.id} T={T} color={colors[ind.key]}
                label={ind.title.replace(/ — .*/, "") + (ind.key === "FFH" ? " (FFH)" : "")}
                value={ind.fmt(f.latest)} sub={f.latestMonth}
                deltaEl={<DeltaText d={f.mom} T={T} suffix="vs prior mo." />} />
            );
          })}
        </div>
        <div style={{ fontSize: 12.5, color: yoyChurn.yoyPts <= 0 ? T.good : T.bad, fontWeight: 600, margin: "10px 2px 0" }}>
          Annual churn (go/national RGU): {yoyChurn.yoyPts <= 0 ? "▼" : "▲"} {Math.abs(yoyChurn.yoyPts).toFixed(2)}pts YoY — 2026 YTD {yoyChurn.y2026.toFixed(2)}% vs 2025 {yoyChurn.y2025.toFixed(2)}%
        </div>

        {inds.map((ind) => {
          const id = product + "-" + ind.id;
          const defs = [{ key: ind.key, label: ind.key === "FFH" ? "FFH (HSIA + TV)" : product, data: sliceR(ind.data) }];
          return (
            <ChartCard key={id} title={ind.title} T={T} tableOpen={!!openTables[id]} onToggleTable={() => toggleTable(id)} note={ind.note}>
              <LineChart labels={rangeMonths} seriesDefs={defs} yFmt={ind.fmt} colors={colors} T={T} />
              {openTables[id] && <DataTable labels={rangeMonths} seriesDefs={defs} fmt={ind.fmt} T={T} />}
            </ChartCard>
          );
        })}

        <SectionHeading T={T}>Volume snapshots (limited months in source)</SectionHeading>
        <ChartCard title={`Trouble-ticket volume — ${product}`} T={T}
          tableOpen={!!openTables[product + "-tktvol"]} onToggleTable={() => toggleTable(product + "-tktvol")}>
          <BarChart labels={DATA.ticketVolumeMonths} seriesDefs={[{ key: product, data: DATA.ticketVolume[product] }]} yFmt={fmtNum} colors={colors} T={T} />
          {openTables[product + "-tktvol"] && <DataTable labels={DATA.ticketVolumeMonths} seriesDefs={[{ key: product, data: DATA.ticketVolume[product] }]} fmt={fmtNum} T={T} />}
        </ChartCard>
        <ChartCard title={`Field-repair (dispatch) volume — ${product}`} T={T}
          tableOpen={!!openTables[product + "-frvol"]} onToggleTable={() => toggleTable(product + "-frvol")}>
          <BarChart labels={DATA.fieldRepairMonths} seriesDefs={[{ key: product, data: DATA.fieldRepairVolume[product] }]} yFmt={fmtNum} colors={colors} T={T} />
          {openTables[product + "-frvol"] && <DataTable labels={DATA.fieldRepairMonths} seriesDefs={[{ key: product, data: DATA.fieldRepairVolume[product] }]} fmt={fmtNum} T={T} />}
        </ChartCard>

        {product === "HSIA" && (
          <div style={{ background: T.purpleLightest, border: `1px solid ${T.purpleLighter}`, borderRadius: 12, padding: "18px 20px", marginTop: 20 }}>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, color: T.heading }}>HSIA spotlight — severely degraded fibre line</h3>
            <p style={{ margin: "0 0 12px", fontSize: 13, color: T.textMuted, maxWidth: 640 }}>
              Share of HSIA repairs coded as severely degraded fibre line (Jun 2025 – May 2026; this table has its own reporting window in the source). Currently the single largest identified driver of HSIA repairs.
            </p>
            <LineChart labels={DATA.hsiaFibreMonths} seriesDefs={[{ key: "HSIA", data: DATA.hsiaFibrePct }]} height={190} yFmt={(v) => v.toFixed(1) + "%"} colors={colors} T={T} />
          </div>
        )}
      </>
    );
  }

  const pageTitle = page === "home" ? "Overview" : page;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica Neue,Arial,sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 228, flexShrink: 0, background: T.sidebarBg, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: T.purple, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <circle cx="8" cy="16" r="3" fill="#D8CBE5" />
                <circle cx="16" cy="8" r="3" fill="#66CC02" />
                <path d="M8 13V6M16 11v7" stroke="rgba(255,255,255,.55)" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: T.heading, lineHeight: 1.15 }}>Reliability Scorecards</div>
              <div style={{ fontSize: 11, color: T.textFaint }}>FFH · HSIA / TV / SHS</div>
            </div>
          </div>
        </div>
        <nav style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map((item) => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  background: active ? T.navActiveBg : "transparent", color: active ? T.navActiveText : T.textSecondary,
                  border: "none", borderLeft: `3px solid ${active ? T.heading : "transparent"}`,
                  borderRadius: 8, padding: "10px 12px", fontSize: 13.5, fontWeight: active ? 700 : 500, cursor: "pointer"
                }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: item.dot, flexShrink: 0 }} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => setThemeMode(isDark ? "light" : "dark")}
            style={{ width: "100%", background: "transparent", border: `1px solid ${T.borderStrong}`, color: T.textSecondary, borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer" }}>
            {isDark ? "☀️ Light mode" : "🌙 Dark mode"}
          </button>
          <div style={{ fontSize: 10.5, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
            Source: Reliability / Deact KPIs workbook. Jan 2025 – {MONTHS[MONTHS.length - 1]}.
          </div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "26px 28px 64px" }}>
          {/* topbar: title + filters */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: T.heading }}>{pageTitle}</h1>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 3 }}>
                {page === "home" ? "All indicators at a glance — latest reported figures" : `Calls, tickets, repairs/dispatches & churn — ${page}`}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              {page === "home" && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textMuted, textTransform: "uppercase" }}>Products</span>
                  {PRODUCTS.map((p) => {
                    const on = activeProducts[p];
                    return (
                      <button key={p} onClick={() => toggleProduct(p)}
                        style={{
                          border: `1px solid ${on ? "transparent" : T.borderStrong}`, background: on ? colors[p] : "transparent",
                          color: on ? "#fff" : T.textSecondary, borderRadius: 16, padding: "5px 12px", fontSize: 12.5, fontWeight: 600,
                          cursor: "pointer", opacity: on ? 1 : 0.55
                        }}>{p}</button>
                    );
                  })}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textMuted, textTransform: "uppercase" }}>From</span>
                <select value={fromIdx} onChange={(e) => { const v = +e.target.value; setFromIdx(v); if (v > toIdx) setToIdx(v); }} style={selectStyle}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: T.textMuted, textTransform: "uppercase" }}>To</span>
                <select value={toIdx} onChange={(e) => { const v = +e.target.value; setToIdx(v); if (v < fromIdx) setFromIdx(v); }} style={selectStyle}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {page === "home" ? <HomePage /> : <ProductPage product={page} />}
        </div>
        <footer style={{ textAlign: "center", fontSize: 12, color: T.textFaint, padding: "0 0 24px" }}>
          Built from the Reliability / Deact KPIs workbook · figures reflect the source snapshot, not a live feed
        </footer>
      </main>
    </div>
  );
}
