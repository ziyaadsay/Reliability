import React, { useState, useEffect, useRef } from "react";

/*
  FFH Reliability Scorecards — HSIA / TV / SHS
  Single-file React app styled after the CPR Product Health Scorecards
  (cpr-scorecards.telus.gizmos.run): Hanken Grotesk type, white page,
  numbered lavender section bands, months-as-columns scorecard table with
  the reviewing month highlighted. Left menu retained for navigation.

  Source: "Reliability Deact KPIs" tab (main KPI table, columns B..DK),
  Reliability & Deacts workbook. Reporting window: Jan 2025 – Jul 2026.
  Churn (go/national RGU) is reported through Jun 2026.

  Calls (Contacts, offered/answered) are reported as an FFH rollup
  (HSIA + TV combined) — the source has no product-level call split.
  SHS has its own contacts series.
*/

// ---------------------------------------------------------------------------
// Data (extracted cell-for-cell from the source workbook; nulls are months
// the source has not reported, never interpolated)
// ---------------------------------------------------------------------------
const MONTHS = [
  "Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025",
  "Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025",
  "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026","Jul 2026"
];

const DATA = {
  callsOffered: {
    FFH: [159465,142526,142004,143125,143125,135582,142865,155431,181009,181144,158985,164939,149164,126282,150662,141512,142884,151340,155785],
    SHS: [76023,62397,67525,66790,66790,63800,70137,65906,67075,64833,60210,62122,59042,55345,57385,59213,62891,61439,67285]
  },
  callsAnswered: {
    FFH: [138284,120120,133061,131694,131694,126038,134277,135704,126494,123753,130237,126593,125046,117143,132142,125406,127932,135057,133053],
    SHS: [75001,62147,67317,66382,66382,63516,69793,65288,65179,61634,57013,59662,56606,53561,55780,52123,52505,56943,60621]
  },
  ticketRate: {
    HSIA: [2.17,2.10,2.41,2.47,2.50,2.46,2.64,2.64,2.51,2.56,2.63,2.59,2.64,2.40,2.77,2.63,2.93,2.99,2.99],
    TV:   [3.71,3.68,4.02,4.10,4.05,3.54,3.57,3.44,3.35,4.05,4.03,3.77,3.81,3.36,3.78,3.53,3.04,3.10,3.22],
    SHS:  [3.95,3.94,4.82,5.07,4.97,4.76,5.45,5.41,5.28,5.24,4.74,4.86,4.68,4.11,4.30,3.89,3.78,4.12,4.29]
  },
  ticketVolume: {
    HSIA: [40808,39535,45548,46629,47108,46515,50055,50097,47763,48826,50104,49406,50194,45749,52806,50134,55891,57270,57173],
    TV:   [37956,37648,41170,41505,41320,36213,36392,34982,33980,41109,40866,38217,38747,34206,38519,35701,32654,33338,32369],
    SHS:  [35181,35133,43173,45752,45088,43315,49570,49072,47932,47740,43331,44469,42929,37762,39505,35754,34831,38003,39651]
  },
  repairRate: {
    HSIA: [0.65,0.60,0.64,0.64,0.72,0.73,0.82,0.85,0.85,0.94,0.85,0.85,0.76,0.70,0.80,0.91,0.94,0.83,0.91],
    TV:   [0.21,0.17,0.22,0.20,0.18,0.15,0.16,0.15,0.16,0.19,0.18,0.17,0.16,0.15,0.17,0.20,0.18,0.13,0.16],
    SHS:  [0.52,0.45,0.48,0.48,0.50,0.46,0.52,0.48,0.50,0.56,0.51,0.52,0.56,0.61,0.52,0.53,0.54,0.41,0.41]
  },
  repairVolume: {
    HSIA: [12155,11246,12103,12149,13550,13826,15529,16073,16207,17901,16242,16317,16392,14574,16717,17332,17995,15916,17445],
    TV:   [2196,1787,2297,2036,1813,1578,1601,1567,1577,1901,1794,1688,1883,1728,1912,1989,1938,1409,1567],
    SHS:  [4622,4046,4329,4309,4548,4225,4755,4326,4524,5115,4691,4749,5055,4615,4751,4894,4967,3736,3781]
  },
  churnRate: {
    HSIA: [null,0.88,0.89,1.13,1.16,1.13,1.27,1.20,1.16,1.23,1.07,0.97,0.98,0.81,0.98,1.10,1.08,1.05,null],
    TV:   [null,1.12,1.13,1.33,1.36,1.31,1.50,1.41,1.37,1.46,1.35,1.19,1.28,1.05,1.24,1.33,1.29,1.30,null],
    SHS:  [null,1.14,1.27,1.52,1.53,1.34,1.53,1.47,1.29,1.60,1.39,1.00,1.60,1.04,1.25,1.40,1.26,1.51,null]
  },
  annualChurn: {
    HSIA: { y2026: 0.95, y2025: 1.13, yoyPts: -0.18 },
    TV:   { y2026: 1.17, y2025: 1.36, yoyPts: -0.19 },
    SHS:  { y2026: 1.37, y2025: 1.67, yoyPts: -0.30 }
  },
  hsiaFibreMonths: ["Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025","Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026"],
  hsiaFibrePct: [4.51,6.13,12.92,15.12,18.85,15.42,16.19,15.50,15.07,14.11,14.56,13.31]
};

// ---------------------------------------------------------------------------
// Palette — HSIA/TV mode-invariant, SHS blue stepped per mode; validated
// against the dataviz accessibility gates on the adjacent pairlist in both
// themes. FFH (rollup) never shares a chart with the products.
// ---------------------------------------------------------------------------
const LIGHT_COLOR = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#2a78d6", FFH: "#eb6834" };
const DARK_COLOR  = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#3987e5", FFH: "#d95926" };
const PRODUCTS = ["HSIA", "TV", "SHS"];

const LIGHT_THEME = {
  bg: "#FFFFFF", surface: "#FFFFFF", band: "#F6F2FA", panel: "#FAF9FB",
  border: "#E7E3EC", borderStrong: "#C9C2D3",
  text: "#2C2E30", textSecondary: "#414547", textMuted: "#676E73", textFaint: "#9A93A6",
  purple: "#4B286D", ink: "#2A1A3B", purpleLightest: "#F6F2FA", purpleLighter: "#E2D8EC",
  good: "#2B8000", bad: "#B3261E", heading: "#4B286D",
  navActiveBg: "#F6F2FA", navActiveText: "#4B286D", highlightCol: "#EFE7F7"
};
const DARK_THEME = {
  bg: "#17151a", surface: "#211e26", band: "#2A2433", panel: "#1d1a22",
  border: "#3a3542", borderStrong: "#4d4757",
  text: "#F1EEF5", textSecondary: "#D3CCDE", textMuted: "#A79EB6", textFaint: "#857c96",
  purple: "#4B286D", ink: "#3A2A4E", purpleLightest: "#2A2433", purpleLighter: "#4d4360",
  good: "#4caf50", bad: "#FF6B6B", heading: "#C9A9E8",
  navActiveBg: "#2A2433", navActiveText: "#C9A9E8", highlightCol: "#332946"
};

const FONT = "'Hanken Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica Neue,Arial,sans-serif";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function fmtNum(v) { return v == null ? "—" : v.toLocaleString(); }
function fmtNumK(v) { return v == null ? "—" : v >= 10000 ? (v / 1000).toFixed(1) + "K" : v.toLocaleString(); }
function fmtPct(v, d = 2) { return v == null ? "—" : v.toFixed(d) + "%"; }
function lastIdxUpTo(arr, upTo) { for (let i = Math.min(upTo, arr.length - 1); i >= 0; i--) if (arr[i] != null) return i; return -1; }
function shortMonth(m) { const [mo, y] = m.split(" "); return mo.toUpperCase() + "'" + y.slice(2); }

function niceCeil(v) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const frac = v / base;
  const nice = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return nice * base;
}

// For these reliability metrics a decrease is always favourable
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
  const left = 52, right = 60, top = 14, bottom = 22;
  const plotW = VIEW_W - left - right;
  const plotH = height - top - bottom;

  const allVals = seriesDefs.flatMap((s) => s.data.filter((v) => v != null));
  const max = allVals.length ? niceCeil(Math.max(...allVals) * 1.15) : 1;

  const xScale = (i) => (labels.length <= 1 ? left + plotW / 2 : left + (i * plotW) / (labels.length - 1));
  const yScale = (v) => top + (1 - v / max) * plotH;
  const seriesColor = (s) => s.color || colors[s.key];

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
        {seriesDefs.map((s, si) => {
          const pts = s.data.map((v, i) => (v == null ? null : { x: xScale(i), y: yScale(v), v })).filter(Boolean);
          if (!pts.length) return null;
          const d = "M " + pts.map((p) => `${p.x},${p.y}`).join(" L ");
          const last = pts[pts.length - 1];
          const col = seriesColor(s);
          return (
            <g key={si}>
              <path d={d} fill="none" stroke={col} strokeWidth="2.5" strokeDasharray={s.dash || undefined} />
              <text x={last.x + 5} y={last.y} fontSize="11.5" fontWeight="600" fill={col} dominantBaseline="middle">{yFmt(last.v)}</text>
              {hoverI != null && s.data[hoverI] != null && (
                <circle cx={xScale(hoverI)} cy={yScale(s.data[hoverI])} r="3.5" fill={col} stroke={T.surface} strokeWidth="1.5" />
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
          {seriesDefs.map((s, si) => s.data[hoverI] != null && (
            <div key={si} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: seriesColor(s), display: "inline-block" }} />
              {s.label || s.key}: <b>{yFmt(s.data[hoverI])}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UI building blocks
// ---------------------------------------------------------------------------
function DeltaText({ d, T, suffix }) {
  if (!d) return <span style={{ color: T.textFaint }}>—</span>;
  const color = d.tone === "good" ? T.good : d.tone === "bad" ? T.bad : T.textMuted;
  return <span style={{ color, fontWeight: 600 }}>{d.text}{suffix ? ` ${suffix}` : ""}</span>;
}

function Eyebrow({ children, T, style }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.heading, ...style }}>{children}</div>;
}

function StatCard({ label, sub, value, deltaEl, color, T }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.heading, lineHeight: 1.05 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 4 }}>{sub}</div>}
      {deltaEl && <div style={{ fontSize: 12.5, marginTop: 7 }}>{deltaEl}</div>}
    </div>
  );
}

function DataTable({ labels, seriesDefs, fmt, T }) {
  return (
    <div style={{ overflowX: "auto", marginTop: 10, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 10px", color: T.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>Month</th>
            {seriesDefs.map((s, si) => (
              <th key={si} style={{ textAlign: "right", padding: "6px 10px", color: T.textMuted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>{s.label || s.key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((m, i) => (
            <tr key={m}>
              <td style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border}`, color: T.textSecondary, fontWeight: 600 }}>{m}</td>
              {seriesDefs.map((s, si) => (
                <td key={si} style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border}`, textAlign: "right", whiteSpace: "nowrap" }}>{fmt(s.data[i])}</td>
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
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px 12px", marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary }}>{title}</span>
        {onToggleTable && (
          <button onClick={onToggleTable} style={{ fontSize: 12, border: `1px solid ${T.borderStrong}`, background: "transparent", color: T.textMuted, borderRadius: 999, padding: "4px 12px", cursor: "pointer", fontFamily: FONT }}>
            {tableOpen ? "Hide table" : "View as table"}
          </button>
        )}
      </div>
      {children}
      {note && <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>{note}</p>}
    </div>
  );
}

function Legend({ items, T }) {
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", margin: "8px 2px 2px", fontSize: 12.5, color: T.textSecondary, flexWrap: "wrap" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 0, borderTop: `3px ${it.dash ? "dashed" : "solid"} ${it.color}`, borderRadius: 2 }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

// Numbered section with lavender band header, in the reference's style
function Section({ num, eyebrow, title, T, children, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, marginTop: 22, overflow: "hidden", background: T.surface }}>
      <div
        onClick={collapsible ? () => setOpen(!open) : undefined}
        style={{ background: T.band, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, cursor: collapsible ? "pointer" : "default" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.textFaint, letterSpacing: ".05em" }}>{num}</span>
        <div style={{ flex: 1 }}>
          {eyebrow && <div style={{ fontSize: 10.5, fontWeight: 600, color: T.textMuted, letterSpacing: ".04em" }}>{eyebrow}</div>}
          <div style={{ fontSize: 15.5, fontWeight: 700, color: T.heading }}>{title}</div>
        </div>
        {collapsible && (
          <span style={{ color: T.textMuted, fontSize: 13, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
        )}
      </div>
      {open && <div style={{ padding: "20px" }}>{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Indicator metadata (drives the scorecard + product pages)
// ---------------------------------------------------------------------------
const INDICATORS = [
  {
    id: "calls", name: "Calls (contacts offered)", decimals: 0, fmt: fmtNumK, agg2025: "sum",
    rows: [
      { key: "FFH", label: "FFH (HSIA + TV)", data: DATA.callsOffered.FFH },
      { key: "SHS", label: "SHS", data: DATA.callsOffered.SHS }
    ]
  },
  {
    id: "tickets", name: "Ticket rate", decimals: 2, fmt: (v) => fmtPct(v, 2), agg2025: "avg",
    rows: PRODUCTS.map((p) => ({ key: p, label: p, data: DATA.ticketRate[p] }))
  },
  {
    id: "repairs", name: "Repair / dispatch rate", decimals: 2, fmt: (v) => fmtPct(v, 2), agg2025: "avg",
    rows: PRODUCTS.map((p) => ({ key: p, label: p, data: DATA.repairRate[p] }))
  },
  {
    id: "churn", name: "Churn rate", decimals: 2, fmt: (v) => fmtPct(v, 2), agg2025: "avg",
    rows: PRODUCTS.map((p) => ({ key: p, label: p, data: DATA.churnRate[p] }))
  }
];

function agg2025(data, mode) {
  const vals = data.slice(0, 12).filter((v) => v != null);
  if (!vals.length) return null;
  const sum = vals.reduce((a, b) => a + b, 0);
  return mode === "sum" ? sum : sum / vals.length;
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
export default function ReliabilityScorecards() {
  const [page, setPage] = useState("home");
  const [fromIdx, setFromIdx] = useState(12); // default view: 2026 months
  const [toIdx, setToIdx] = useState(MONTHS.length - 1);
  const [activeProducts, setActiveProducts] = useState({ HSIA: true, TV: true, SHS: true });
  const [themeMode, setThemeMode] = useState("system");
  const [openTables, setOpenTables] = useState({});

  const isDark = useIsDark(themeMode);
  const T = isDark ? DARK_THEME : LIGHT_THEME;
  const colors = isDark ? DARK_COLOR : LIGHT_COLOR;

  // load Hanken Grotesk once
  useEffect(() => {
    const id = "hanken-grotesk-font";
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  const rangeMonths = MONTHS.slice(fromIdx, toIdx + 1);
  const sliceR = (arr) => arr.slice(fromIdx, toIdx + 1);
  const latestLabel = MONTHS[toIdx];

  function toggleProduct(p) {
    const willBe = !activeProducts[p];
    if (!willBe && !PRODUCTS.some((k) => k !== p && activeProducts[k])) return;
    setActiveProducts({ ...activeProducts, [p]: willBe });
  }
  function toggleTable(id) { setOpenTables((o) => ({ ...o, [id]: !o[id] })); }

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
    borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer", fontFamily: FONT
  };

  // ------------------------------ pages ------------------------------
  function ScorecardTable() {
    const visibleInds = INDICATORS.map((ind) => ({
      ...ind, rows: ind.rows.filter((r) => rowVisible(r.key))
    })).filter((ind) => ind.rows.length);
    const thBase = { padding: "10px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
    const tdBase = { padding: "9px 12px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", fontSize: 12.5 };
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: "left" }}>Category</th>
              <th style={{ ...thBase, textAlign: "left" }}>Product</th>
              <th style={{ ...thBase, textAlign: "right" }}>▸ 2025</th>
              {rangeMonths.map((m, i) => {
                const isLast = fromIdx + i === toIdx;
                return (
                  <th key={m} style={{ ...thBase, textAlign: "right", background: isLast ? T.highlightCol : undefined, color: isLast ? T.heading : thBase.color }}>
                    {shortMonth(m)}{isLast && <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: ".04em" }}>▸ REVIEWING</div>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleInds.flatMap((ind) =>
              ind.rows.map((r, ri) => (
                <tr key={ind.id + r.key}>
                  <td style={{ ...tdBase, color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".04em", background: T.panel }}>
                    {ri === 0 ? ind.name : ""}
                  </td>
                  <td style={{ ...tdBase, fontWeight: 600, color: T.textSecondary }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[r.key] }} />
                      {r.label}
                    </span>
                  </td>
                  <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: T.text }}>{ind.fmt(agg2025(r.data, ind.agg2025))}</td>
                  {rangeMonths.map((m, i) => {
                    const gi = fromIdx + i;
                    const isLast = gi === toIdx;
                    return (
                      <td key={m} style={{ ...tdBase, textAlign: "right", background: isLast ? T.highlightCol : undefined, fontWeight: isLast ? 700 : 400, color: T.text }}>
                        {ind.fmt(r.data[gi])}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  }

  function HomePage() {
    return (
      <>
        <Section num="01" eyebrow="Executive summary" title="All indicators at a glance" T={T} collapsible>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(225px,1fr))", gap: 14 }}>
            {INDICATORS.flatMap((ind) =>
              ind.rows.filter((r) => rowVisible(r.key)).slice(0, 1).map((r) => {
                const f = rowFigures(r.data, ind.decimals);
                return (
                  <StatCard key={ind.id} T={T} color={colors[r.key]}
                    label={`${ind.name} · ${r.label}`}
                    value={ind.fmt(f.latest)} sub={f.latestMonth}
                    deltaEl={<DeltaText d={f.mom} T={T} suffix="vs prior mo." />} />
                );
              })
            )}
          </div>
          <p style={{ fontSize: 12.5, color: T.textFaint, marginTop: 14, lineHeight: 1.6, marginBottom: 0 }}>
            Latest reported month: <b style={{ color: T.textSecondary }}>{MONTHS[MONTHS.length - 1]}</b> for calls, tickets and repairs. Churn (go/national RGU) is reported through <b style={{ color: T.textSecondary }}>Jun 2026</b> and runs one month behind.
            Annual churn: HSIA {DATA.annualChurn.HSIA.y2026.toFixed(2)}% 2026 YTD vs {DATA.annualChurn.HSIA.y2025.toFixed(2)}% 2025 · TV {DATA.annualChurn.TV.y2026.toFixed(2)}% vs {DATA.annualChurn.TV.y2025.toFixed(2)}% · SHS {DATA.annualChurn.SHS.y2026.toFixed(2)}% vs {DATA.annualChurn.SHS.y2025.toFixed(2)}%.
          </p>
        </Section>

        <Section num="02" eyebrow="Monthly scorecard" title="Reliability scorecard" T={T} collapsible>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
            The month at the end of the selected range is shaded and marked as under review. The 2025 column is the 2025 average for rates and the 2025 total for call volumes. “—” means the source has not reported that month.
          </p>
          <ScorecardTable />
          <p style={{ fontSize: 12, color: T.textFaint, marginTop: 12, lineHeight: 1.6, marginBottom: 0 }}>
            Calls are contacts offered, reported as an FFH rollup (HSIA + TV combined) — no product-level call split exists in the source. Churn rate is first reported for Feb 2025.
          </p>
        </Section>
      </>
    );
  }

  function ProductPage({ product }) {
    const callsKey = product === "SHS" ? "SHS" : "FFH";
    const callsNote = product === "SHS"
      ? "SHS contacts, offered vs. answered."
      : `Calls are only reported as an FFH rollup (HSIA + TV combined) — there is no ${product}-specific call series in the source.`;
    const yoyChurn = DATA.annualChurn[product];

    const tiles = [
      { label: `Calls offered (${callsKey})`, data: DATA.callsOffered[callsKey], fmt: fmtNum, dec: 0, color: colors[callsKey] },
      { label: "Ticket rate", data: DATA.ticketRate[product], fmt: fmtPct, dec: 2, color: colors[product] },
      { label: "Repair / dispatch rate", data: DATA.repairRate[product], fmt: fmtPct, dec: 2, color: colors[product] },
      { label: "Churn rate", data: DATA.churnRate[product], fmt: fmtPct, dec: 2, color: colors[product] }
    ];

    const sections = [
      {
        num: "01", title: "Calls", charts: [{
          id: "calls", title: `Contacts (${callsKey === "FFH" ? "FFH rollup" : "SHS"})`, fmt: fmtNum, note: callsNote,
          defs: [
            { key: callsKey, label: "Offered", data: sliceR(DATA.callsOffered[callsKey]) },
            { key: callsKey, label: "Answered", data: sliceR(DATA.callsAnswered[callsKey]), dash: "7 5" }
          ],
          legend: [
            { label: "Offered", color: colors[callsKey] },
            { label: "Answered", color: colors[callsKey], dash: true }
          ]
        }]
      },
      {
        num: "02", title: "Tickets", charts: [
          { id: "ticketrate", title: "Ticket rate (% of sub base)", fmt: (v) => fmtPct(v, 2), defs: [{ key: product, label: product, data: sliceR(DATA.ticketRate[product]) }] },
          { id: "ticketvol", title: "Ticket volume (Assure Tickets Looker)", fmt: fmtNum, defs: [{ key: product, label: product, data: sliceR(DATA.ticketVolume[product]) }] }
        ]
      },
      {
        num: "03", title: "Repairs / Dispatches", charts: [
          { id: "repairrate", title: "Repair / dispatch rate (% of sub base)", fmt: (v) => fmtPct(v, 2), defs: [{ key: product, label: product, data: sliceR(DATA.repairRate[product]) }] },
          { id: "repairvol", title: "Repair (dispatch) volume", fmt: fmtNum, defs: [{ key: product, label: product, data: sliceR(DATA.repairVolume[product]) }] }
        ]
      },
      {
        num: "04", title: "Churn", charts: [
          {
            id: "churn", title: "Churn rate (go/national RGU)", fmt: (v) => fmtPct(v, 2),
            defs: [{ key: product, label: product, data: sliceR(DATA.churnRate[product]) }],
            note: "Churn runs one month behind the other indicators in the source (reported through Jun 2026; Jan 2025 was never reported)."
          }
        ]
      }
    ];

    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
          {tiles.map((tile, i) => {
            const f = rowFigures(tile.data, tile.dec);
            return (
              <StatCard key={i} T={T} color={tile.color}
                label={tile.label} value={tile.fmt(f.latest)} sub={f.latestMonth}
                deltaEl={<DeltaText d={f.mom} T={T} suffix="vs prior mo." />} />
            );
          })}
        </div>
        <div style={{ fontSize: 12.5, color: yoyChurn.yoyPts <= 0 ? T.good : T.bad, fontWeight: 600, margin: "10px 2px 0" }}>
          Annual churn (go/national RGU): {yoyChurn.yoyPts <= 0 ? "▼" : "▲"} {Math.abs(yoyChurn.yoyPts).toFixed(2)}pts YoY — 2026 YTD {yoyChurn.y2026.toFixed(2)}% vs 2025 {yoyChurn.y2025.toFixed(2)}%
        </div>

        {sections.map((sec) => (
          <Section key={sec.num} num={sec.num} eyebrow={product} title={sec.title} T={T}>
            {sec.charts.map((ch) => {
              const id = product + "-" + ch.id;
              return (
                <ChartCard key={id} title={ch.title} T={T} tableOpen={!!openTables[id]} onToggleTable={() => toggleTable(id)} note={ch.note}>
                  <LineChart labels={rangeMonths} seriesDefs={ch.defs} yFmt={ch.fmt} colors={colors} T={T} />
                  {ch.legend && <Legend items={ch.legend} T={T} />}
                  {openTables[id] && <DataTable labels={rangeMonths} seriesDefs={ch.defs} fmt={ch.fmt} T={T} />}
                </ChartCard>
              );
            })}
            {sec.num === "03" && product === "HSIA" && (
              <div style={{ background: T.purpleLightest, border: `1px solid ${T.purpleLighter}`, borderRadius: 12, padding: "18px 20px", marginTop: 16 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, color: T.heading }}>HSIA spotlight — severely degraded fibre line</h3>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: T.textMuted, maxWidth: 640 }}>
                  Share of HSIA repairs coded as severely degraded fibre line (Jun 2025 – May 2026; this table has its own reporting window in the source). Currently the single largest identified driver of HSIA repairs.
                </p>
                <LineChart labels={DATA.hsiaFibreMonths} seriesDefs={[{ key: "HSIA", label: "HSIA", data: DATA.hsiaFibrePct }]} height={190} yFmt={(v) => v.toFixed(1) + "%"} colors={colors} T={T} />
              </div>
            )}
          </Section>
        ))}
      </>
    );
  }

  const pageTitle = page === "home"
    ? "Reliability monthly performance scorecard"
    : `${page} reliability scorecard`;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: FONT }}>
      {/* Sidebar */}
      <aside style={{ width: 224, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.heading, letterSpacing: "-.01em" }}>✳ TELUS</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 8 }}>Reliability Scorecards</div>
          <div style={{ fontSize: 10.5, color: T.textFaint, letterSpacing: ".05em", textTransform: "uppercase" }}>Internal · FFH</div>
        </div>
        <nav style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems.map((item) => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => setPage(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  background: active ? T.navActiveBg : "transparent", color: active ? T.navActiveText : T.textSecondary,
                  border: "none", borderLeft: `3px solid ${active ? T.heading : "transparent"}`,
                  borderRadius: 8, padding: "9px 12px", fontSize: 13.5, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: FONT
                }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.dot, flexShrink: 0 }} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => setThemeMode(isDark ? "light" : "dark")}
            style={{ width: "100%", background: "transparent", border: `1px solid ${T.borderStrong}`, color: T.textSecondary, borderRadius: 999, padding: "7px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: FONT }}>
            {isDark ? "☀️ Light mode" : "🌙 Dark mode"}
          </button>
          <div style={{ fontSize: 10.5, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
            Source: Reliability Deact KPIs workbook · Jan 2025 – {MONTHS[MONTHS.length - 1]}
          </div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 32px 64px" }}>
          {/* page header, reference-style */}
          <Eyebrow T={T}>Product Health · Reliability{page !== "home" ? ` · ${page}` : ""}</Eyebrow>
          <h1 style={{ fontSize: 27, fontWeight: 700, margin: "8px 0 0", color: T.heading, letterSpacing: "-.01em" }}>{pageTitle}</h1>
          <div style={{ height: 3, width: 96, background: `linear-gradient(90deg, ${T.heading}, #66CC02)`, borderRadius: 2, margin: "12px 0 14px" }} />
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12.5, color: T.textMuted, borderBottom: `1px solid ${T.border}`, paddingBottom: 16, marginBottom: 6 }}>
            <span><b style={{ color: T.textSecondary }}>Scope</b> · {page === "home" ? "FFH cross-product: calls, tickets, repairs/dispatches, churn" : `${page}: calls, tickets, repairs/dispatches, churn`}</span>
            <span><b style={{ color: T.textSecondary }}>Reviewing</b> · {latestLabel}</span>
            <span><b style={{ color: T.textSecondary }}>Operational thru</b> · {MONTHS[MONTHS.length - 1]} (churn: Jun 2026)</span>
          </div>

          {/* filters */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, flexWrap: "wrap", margin: "14px 0 4px" }}>
            {page === "home" && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>Products</span>
                {PRODUCTS.map((p) => {
                  const on = activeProducts[p];
                  return (
                    <button key={p} onClick={() => toggleProduct(p)}
                      style={{
                        border: `1px solid ${on ? "transparent" : T.borderStrong}`, background: on ? T.ink : "transparent",
                        color: on ? "#fff" : T.textSecondary, borderRadius: 999, padding: "5px 13px", fontSize: 12.5, fontWeight: 600,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7, fontFamily: FONT
                      }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: colors[p] }} />
                      {p}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>From</span>
              <select value={fromIdx} onChange={(e) => { const v = +e.target.value; setFromIdx(v); if (v > toIdx) setToIdx(v); }} style={selectStyle}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>To</span>
              <select value={toIdx} onChange={(e) => { const v = +e.target.value; setToIdx(v); if (v < fromIdx) setFromIdx(v); }} style={selectStyle}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
          </div>

          {page === "home" ? <HomePage /> : <ProductPage product={page} />}
        </div>
        <footer style={{ textAlign: "center", fontSize: 12, color: T.textFaint, padding: "0 0 24px" }}>
          Built from the Reliability Deact KPIs workbook · figures reflect the source snapshot, not a live feed
        </footer>
      </main>
    </div>
  );
}
