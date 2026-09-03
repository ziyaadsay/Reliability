import React, { useState, useEffect, useRef } from "react";

/*
  FFH Reliability Scorecards — HSIA / TV / SHS
  Single-file React app styled after the CPR Product Health Scorecards
  (cpr-scorecards.telus.gizmos.run): Hanken Grotesk type, white page,
  numbered lavender section bands, months-as-columns scorecard table with
  the reviewing month highlighted. Left menu retained for navigation.

  Source: "Reliability Deact KPIs" tab (main KPI table, columns B..DQ),
  Reliability & Deacts workbook. Reporting window: Jan 2025 – Aug 2026.
  Churn (go/national RGU) is reported through Jun 2026.

  Calls (Contacts, offered/answered) are reported as an FFH rollup
  (HSIA + TV combined) — the source has no product-level call split.
  SHS has its own contacts series. "All" figures are computed: volumes are
  summed; rates are blended as total volume over total subscriber base
  (churn: base-weighted mean of product rates).
*/

// ---------------------------------------------------------------------------
// Data (extracted cell-for-cell from the source workbook; nulls are months
// the source has not reported, never interpolated)
// ---------------------------------------------------------------------------
const MONTHS = [
  "Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025",
  "Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025",
  "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026","Jul 2026","Aug 2026"
];

const DATA = {
  callsOffered: {
    FFH: [159465,142526,142004,143125,143125,135582,142865,155431,181009,181144,158985,164939,149164,126282,150662,141512,142884,151340,155785,158179],
    SHS: [76023,62397,67525,66790,66790,63800,70137,65906,67075,64833,60210,62122,59042,55345,57385,59213,62891,61439,67285,68978]
  },
  callsAnswered: {
    FFH: [138284,120120,133061,131694,131694,126038,134277,135704,126494,123753,130237,126593,125046,117143,132142,125406,127932,135057,133053,129856],
    SHS: [75001,62147,67317,66382,66382,63516,69793,65288,65179,61634,57013,59662,56606,53561,55780,52123,52505,56943,60621,59636]
  },
  ticketRate: {
    HSIA: [2.17,2.10,2.41,2.47,2.50,2.46,2.64,2.64,2.51,2.56,2.63,2.59,2.64,2.40,2.77,2.63,2.93,2.99,2.99,3.06],
    TV:   [3.71,3.68,4.02,4.10,4.05,3.54,3.57,3.44,3.35,4.05,4.03,3.77,3.81,3.36,3.78,3.53,3.04,3.10,3.22,3.03],
    SHS:  [3.95,3.94,4.82,5.07,4.97,4.76,5.45,5.41,5.28,5.24,4.74,4.86,4.68,4.11,4.30,3.89,3.78,4.12,4.29,4.08]
  },
  ticketVolume: {
    HSIA: [40808,39535,45548,46629,47108,46515,50055,50097,47763,48826,50104,49406,50194,45749,52806,50134,55891,57270,57173,58789],
    TV:   [37956,37648,41170,41505,41320,36213,36392,34982,33980,41109,40866,38217,38747,34206,38519,35701,32654,33338,32369,34055],
    SHS:  [35181,35133,43173,45752,45088,43315,49570,49072,47932,47740,43331,44469,42929,37762,39505,35754,34831,38003,39651,37724]
  },
  repairRate: {
    HSIA: [0.65,0.60,0.64,0.64,0.72,0.73,0.82,0.85,0.85,0.94,0.85,0.85,0.76,0.70,0.80,0.91,0.94,0.83,0.91,0.79],
    TV:   [0.21,0.17,0.22,0.20,0.18,0.15,0.16,0.15,0.16,0.19,0.18,0.17,0.16,0.15,0.17,0.20,0.18,0.13,0.16,0.12],
    SHS:  [0.52,0.45,0.48,0.48,0.50,0.46,0.52,0.48,0.50,0.56,0.51,0.52,0.56,0.61,0.52,0.53,0.54,0.41,0.41,0.39]
  },
  repairVolume: {
    HSIA: [12155,11246,12103,12149,13550,13826,15529,16073,16207,17901,16242,16317,16392,14574,16717,17332,17995,15916,17445,15082],
    TV:   [2196,1787,2297,2036,1813,1578,1601,1567,1577,1901,1794,1688,1883,1728,1912,1989,1938,1409,1567,1390],
    SHS:  [4622,4046,4329,4309,4548,4225,4755,4326,4524,5115,4691,4749,5055,4615,4751,4894,4967,3736,3781,3653]
  },
  churnRate: {
    HSIA: [null,0.88,0.89,1.13,1.16,1.13,1.27,1.20,1.16,1.23,1.07,0.97,0.98,0.81,0.98,1.10,1.08,1.05,null,null],
    TV:   [null,1.12,1.13,1.33,1.36,1.31,1.50,1.41,1.37,1.46,1.35,1.19,1.28,1.05,1.24,1.33,1.29,1.30,null,null],
    SHS:  [null,1.14,1.27,1.52,1.53,1.34,1.53,1.47,1.29,1.60,1.39,1.00,1.60,1.04,1.25,1.40,1.26,1.51,null,null]
  },
  // Subscriber base per product (2026 Redwood Scorecard; HSIA = HSIA West,
  // TV = IPTV West + Opus)
  subBase: {
    HSIA: [1882545,1884654,1886869,1886034,1886940,1894103,1892708,1894469,1902829,1905345,1905574,1909753,1902859,1904760,1908112,1906873,1907916,1912608,1914753,1920616],
    TV:   [1023254,1023001,1023592,1012348,1021021,1022003,1019316,1016784,1014448,1014746,1013761,1013837,1017435,1018970,1020171,1012595,1074046,1073827,1004848,1124369],
    SHS:  [890445,891993,896592,901871,906328,909317,909257,907488,908288,911221,913204,915714,917354,917870,919034,919511,921166,922159,924471,925508]
  },
  annualChurn: {
    HSIA: { y2026: 0.95, y2025: 1.13, yoyPts: -0.18 },
    TV:   { y2026: 1.17, y2025: 1.36, yoyPts: -0.19 },
    SHS:  { y2026: 1.37, y2025: 1.67, yoyPts: -0.30 }
  },
  hsiaFibreMonths: ["Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025","Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026"],
  hsiaFibrePct: [4.51,6.13,12.92,15.12,18.85,15.42,16.19,15.50,15.07,14.11,14.56,13.31],

  // Ticket drivers by CCT Level 1 — from the Tableau DRD workbook,
  // "Assure CCT Mapping" view (go/DRD2), July 2026, all products combined
  // (pending re-pull with the Assure Roll Up Code product mapping).
  cctMonth: "Jul 2026",
  cctDrivers: [
    { cat: "Connectivity", total: 33137, remote: 19416, dispatch: 13721 },
    { cat: "Wireless", total: 11555, remote: 10311, dispatch: 1244 },
    { cat: "Main Panel", total: 7063, remote: 6225, dispatch: 838 },
    { cat: "Video Issues", total: 6266, remote: 5942, dispatch: 324 },
    { cat: "STB No Boot", total: 5700, remote: 5301, dispatch: 399 },
    { cat: "Outdoor Camera", total: 5058, remote: 4594, dispatch: 464 },
    { cat: "No Dial Tone", total: 4948, remote: 2168, dispatch: 2780 },
    { cat: "Recording Issues", total: 4264, remote: 4173, dispatch: 91 },
    { cat: "Door/Window Sensor", total: 4022, remote: 3793, dispatch: 229 },
    { cat: "Smoke Detector", total: 3685, remote: 3452, dispatch: 233 },
    { cat: "Digital Box", total: 3605, remote: 3518, dispatch: 87 },
    { cat: "Doorbell Camera", total: 3519, remote: 3129, dispatch: 390 },
    { cat: "Other (127 categories)", total: 39470, remote: 34993, dispatch: 4477 }
  ],
  cctTotal: { total: 132292, remote: 107015, dispatch: 25277 }
};

// Derived "All products" series: volumes summed; rates blended as total
// volume / total base; churn as base-weighted mean of product rates.
(function deriveAll() {
  const n = MONTHS.length;
  const P = ["HSIA", "TV", "SHS"];
  const baseAll = [], callsOffAll = [], callsAnsAll = [], tickRateAll = [], tickVolAll = [], repRateAll = [], repVolAll = [], churnAll = [];
  for (let i = 0; i < n; i++) {
    const base = P.reduce((a, p) => a + DATA.subBase[p][i], 0);
    baseAll.push(base);
    callsOffAll.push(DATA.callsOffered.FFH[i] + DATA.callsOffered.SHS[i]);
    callsAnsAll.push(DATA.callsAnswered.FFH[i] + DATA.callsAnswered.SHS[i]);
    const tv = P.reduce((a, p) => a + DATA.ticketVolume[p][i], 0);
    tickVolAll.push(tv);
    tickRateAll.push(Math.round((tv / base) * 10000) / 100);
    const rv = P.reduce((a, p) => a + DATA.repairVolume[p][i], 0);
    repVolAll.push(rv);
    repRateAll.push(Math.round((rv / base) * 10000) / 100);
    if (P.every((p) => DATA.churnRate[p][i] != null)) {
      const w = P.reduce((a, p) => a + DATA.churnRate[p][i] * DATA.subBase[p][i], 0);
      churnAll.push(Math.round((w / base) * 100) / 100);
    } else churnAll.push(null);
  }
  DATA.subBase.All = baseAll;
  DATA.callsOffered.All = callsOffAll;
  DATA.callsAnswered.All = callsAnsAll;
  DATA.ticketRate.All = tickRateAll;
  DATA.ticketVolume.All = tickVolAll;
  DATA.repairRate.All = repRateAll;
  DATA.repairVolume.All = repVolAll;
  DATA.churnRate.All = churnAll;
})();

// ---------------------------------------------------------------------------
// Palette — HSIA/TV mode-invariant, SHS blue stepped per mode; validated
// against the dataviz accessibility gates on the adjacent pairlist in both
// themes. FFH (rollup) never shares a chart with the products. "All" wears
// the TELUS heading purple since it never sits beside the product series.
// ---------------------------------------------------------------------------
const LIGHT_COLOR = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#2a78d6", FFH: "#eb6834", All: "#4B286D" };
const DARK_COLOR  = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#3987e5", FFH: "#d95926", All: "#C9A9E8" };
const PRODUCTS = ["HSIA", "TV", "SHS"];
const SCOPES = ["All", "HSIA", "TV", "SHS"];

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

// Official TELUS logo (embedded from the CPR Scorecards reference page)
const TELUS_LOGO = "data:image/png;base64,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";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function fmtNum(v) { return v == null ? "—" : v.toLocaleString(); }
function fmtNumK(v) { return v == null ? "—" : v >= 10000 ? (v / 1000).toFixed(1) + "K" : v.toLocaleString(); }
function fmtBig(v) {
  if (v == null) return "—";
  if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
  if (v >= 1e4) return (v / 1000).toFixed(1) + "K";
  return v.toLocaleString();
}
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

// goodWhenDown: reliability metrics improve when they fall; subscriber base
// improves when it grows.
function delta(curr, prev, unit, decimals, goodWhenDown = true) {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  const flat = Math.abs(diff) < 1e-9;
  const good = goodWhenDown ? diff <= 0 : diff >= 0;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "▬";
  const mag = Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return { text: `${arrow} ${mag}${unit}`, tone: flat ? "flat" : good ? "good" : "bad" };
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
// Indicator metadata (drives the scorecard table)
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
  const [scope, setScope] = useState("All"); // Overview product filter, defaults to All
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

  function toggleTable(id) { setOpenTables((o) => ({ ...o, [id]: !o[id] })); }

  function rowFigures(data, decimals, goodWhenDown = true) {
    const li = lastIdxUpTo(data, toIdx);
    if (li < 0) return { latest: null };
    return {
      latest: data[li], latestMonth: MONTHS[li],
      mom: li >= 1 ? delta(data[li], data[li - 1], "", decimals, goodWhenDown) : null,
      yoy: li >= 12 ? delta(data[li], data[li - 12], "", decimals, goodWhenDown) : null
    };
  }

  // Which scorecard rows show under the current scope
  const rowVisible = (key) =>
    scope === "All" ? true : key === "FFH" ? scope === "HSIA" || scope === "TV" : key === scope;

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

  // Executive-summary tiles for a scope ("All" or a product)
  function scopeTiles(sc) {
    const callsKey = sc === "All" ? "All" : sc === "SHS" ? "SHS" : "FFH";
    const callsLabel = sc === "All" ? "Calls offered (all products)" : callsKey === "FFH" ? "Calls offered (FFH)" : "Calls offered (SHS)";
    return [
      { label: callsLabel, data: DATA.callsOffered[callsKey], fmt: fmtNum, dec: 0, color: colors[callsKey], goodDown: true },
      { label: "Ticket rate", data: DATA.ticketRate[sc], fmt: fmtPct, dec: 2, color: colors[sc], goodDown: true },
      { label: "Repair / dispatch rate", data: DATA.repairRate[sc], fmt: fmtPct, dec: 2, color: colors[sc], goodDown: true },
      { label: "Churn rate", data: DATA.churnRate[sc], fmt: fmtPct, dec: 2, color: colors[sc], goodDown: true },
      { label: "Subscriber base", data: DATA.subBase[sc], fmt: fmtBig, dec: 0, color: colors[sc], goodDown: false }
    ];
  }

  function TileRow({ tiles }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {tiles.map((tile, i) => {
          const f = rowFigures(tile.data, tile.dec, tile.goodDown);
          return (
            <StatCard key={i} T={T} color={tile.color}
              label={tile.label} value={tile.fmt(f.latest)} sub={f.latestMonth}
              deltaEl={<DeltaText d={f.mom} T={T} suffix="vs prior mo." />} />
          );
        })}
      </div>
    );
  }

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
        <Section num="01" eyebrow="Executive summary" title={scope === "All" ? "All products at a glance" : `${scope} at a glance`} T={T} collapsible>
          <TileRow tiles={scopeTiles(scope)} />
          <p style={{ fontSize: 12.5, color: T.textFaint, marginTop: 14, lineHeight: 1.6, marginBottom: 0 }}>
            Latest reported month: <b style={{ color: T.textSecondary }}>{MONTHS[MONTHS.length - 1]}</b> for calls, tickets, repairs and base. Churn (go/national RGU) is reported through <b style={{ color: T.textSecondary }}>Jun 2026</b>.
            {scope === "All" && " All-product rates are blended: total volume over total subscriber base (churn: base-weighted mean); calls are FFH + SHS contacts offered."}
            {" "}Annual churn: HSIA {DATA.annualChurn.HSIA.y2026.toFixed(2)}% 2026 YTD vs {DATA.annualChurn.HSIA.y2025.toFixed(2)}% 2025 · TV {DATA.annualChurn.TV.y2026.toFixed(2)}% vs {DATA.annualChurn.TV.y2025.toFixed(2)}% · SHS {DATA.annualChurn.SHS.y2026.toFixed(2)}% vs {DATA.annualChurn.SHS.y2025.toFixed(2)}%.
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

        <Section num="03" eyebrow="Ticket drivers" title={`Assure CCT mapping — ${DATA.cctMonth}`} T={T} collapsible>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
            Ticket volume by CCT Level-1 category, split into remote-resolved vs. dispatch-booked, from the DRD (go/DRD2) Tableau workbook's Assure CCT Mapping view. All products combined — a product-mapped refresh (via Assure Roll Up Codes) is pending Tableau reconnection. Top 12 categories shown; the rest are rolled up.
          </p>
          <CctTable />
        </Section>
      </>
    );
  }

  function CctTable() {
    const maxTotal = Math.max(...DATA.cctDrivers.map((r) => r.total));
    const thBase = { padding: "10px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
    const tdBase = { padding: "9px 12px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", fontSize: 12.5 };
    const gt = DATA.cctTotal;
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: "left" }}>CCT Level 1</th>
              <th style={{ ...thBase, textAlign: "right" }}>Total tickets</th>
              <th style={{ ...thBase, textAlign: "left", width: 160 }}></th>
              <th style={{ ...thBase, textAlign: "right" }}>Remote resolved</th>
              <th style={{ ...thBase, textAlign: "right" }}>Dispatch booked</th>
              <th style={{ ...thBase, textAlign: "right" }}>Dispatch rate</th>
            </tr>
          </thead>
          <tbody>
            {DATA.cctDrivers.map((r) => (
              <tr key={r.cat}>
                <td style={{ ...tdBase, fontWeight: 600, color: T.textSecondary }}>{r.cat}</td>
                <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: T.text }}>{r.total.toLocaleString()}</td>
                <td style={{ ...tdBase, padding: "9px 6px" }}>
                  <div style={{ width: `${(r.total / maxTotal) * 100}%`, minWidth: 2, height: 10, background: colors.HSIA, borderRadius: 3, opacity: 0.75 }} />
                </td>
                <td style={{ ...tdBase, textAlign: "right", color: T.textSecondary }}>{r.remote.toLocaleString()}</td>
                <td style={{ ...tdBase, textAlign: "right", color: T.textSecondary }}>{r.dispatch.toLocaleString()}</td>
                <td style={{ ...tdBase, textAlign: "right", color: T.textSecondary }}>{((r.dispatch / r.total) * 100).toFixed(1)}%</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...tdBase, fontWeight: 800, color: T.heading, borderBottom: "none" }}>Total</td>
              <td style={{ ...tdBase, textAlign: "right", fontWeight: 800, color: T.heading, borderBottom: "none" }}>{gt.total.toLocaleString()}</td>
              <td style={{ ...tdBase, borderBottom: "none" }}></td>
              <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: T.heading, borderBottom: "none" }}>{gt.remote.toLocaleString()}</td>
              <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: T.heading, borderBottom: "none" }}>{gt.dispatch.toLocaleString()}</td>
              <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: T.heading, borderBottom: "none" }}>{((gt.dispatch / gt.total) * 100).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  function ProductPage({ product }) {
    const callsKey = product === "SHS" ? "SHS" : "FFH";
    const callsNote = product === "SHS"
      ? "SHS contacts, offered vs. answered."
      : `Calls are only reported as an FFH rollup (HSIA + TV combined) — there is no ${product}-specific call series in the source.`;
    const yoyChurn = DATA.annualChurn[product];

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
            note: "Churn runs behind the other indicators in the source (reported through Jun 2026; Jan 2025 was never reported)."
          }
        ]
      }
    ];

    return (
      <>
        <TileRow tiles={scopeTiles(product)} />
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
          <img src={TELUS_LOGO} alt="TELUS" style={{ height: 28, width: "auto", display: "block", background: isDark ? "#FFFFFF" : "transparent", borderRadius: 6, padding: isDark ? "4px 7px" : 0, boxSizing: "content-box" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 10 }}>Reliability Scorecards</div>
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
            <span><b style={{ color: T.textSecondary }}>Scope</b> · {page === "home" ? (scope === "All" ? "All products: calls, tickets, repairs/dispatches, churn, base" : `${scope}: calls, tickets, repairs/dispatches, churn, base`) : `${page}: calls, tickets, repairs/dispatches, churn, base`}</span>
            <span><b style={{ color: T.textSecondary }}>Reviewing</b> · {latestLabel}</span>
            <span><b style={{ color: T.textSecondary }}>Operational thru</b> · {MONTHS[MONTHS.length - 1]} (churn: Jun 2026)</span>
          </div>

          {/* filters */}
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, flexWrap: "wrap", margin: "14px 0 4px" }}>
            {page === "home" && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>Products</span>
                {SCOPES.map((p) => {
                  const on = scope === p;
                  return (
                    <button key={p} onClick={() => setScope(p)}
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
