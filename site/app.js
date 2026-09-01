(function(){
  "use strict";
  const D = window.DASHBOARD_DATA;
  // HSIA/TV are mode-invariant (validated to pass every adjacent-pair check in
  // both themes); SHS uses the documented default palette's blue, stepped for
  // light vs. dark per references/palette.md.
  const LIGHT_COLOR = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#2a78d6" };
  const DARK_COLOR  = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#3987e5" };
  const DASH = { HSIA: [], TV: [6,4], SHS: [1,3] };
  const DASH_CLASS = { HSIA: "", TV: "dashed", SHS: "dotted" };
  const LABEL = { HSIA: "HSIA", TV: "TV", SHS: "SHS" };

  const state = {
    active: { HSIA: true, TV: true, SHS: true },
    rangeMonths: 27,
    theme: localStorage.getItem("theme") || "system"
  };

  function isDarkMode(){
    return state.theme === "dark" || (state.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function seriesColor(key){ return (isDarkMode() ? DARK_COLOR : LIGHT_COLOR)[key]; }

  // ---------- theme ----------
  function applyTheme(){
    const root = document.documentElement;
    if (state.theme === "dark"){ root.setAttribute("data-theme","dark"); }
    else if (state.theme === "light"){ root.setAttribute("data-theme","light"); }
    else { root.removeAttribute("data-theme"); }
    const isDark = isDarkMode();
    document.getElementById("themeIcon").textContent = isDark ? "☀️" : "🌙";
    document.getElementById("themeLabel").textContent = isDark ? "Light" : "Dark";
    applyChipColors();
    redrawAll();
  }
  function applyChipColors(){
    document.querySelectorAll("#seriesChips .chip").forEach(function(chip){
      const key = chip.getAttribute("data-series");
      const color = seriesColor(key);
      chip.querySelector(".dot").style.background = color;
      chip.style.background = chip.getAttribute("data-active") === "true" ? color : "transparent";
    });
  }
  document.getElementById("themeToggle").addEventListener("click", function(){
    const isDark = state.theme === "dark" || (state.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    state.theme = isDark ? "light" : "dark";
    localStorage.setItem("theme", state.theme);
    applyTheme();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", function(){ if (state.theme === "system") applyTheme(); });

  function cssVar(name){ return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  // ---------- chip controls ----------
  document.querySelectorAll("#seriesChips .chip").forEach(function(chip){
    chip.addEventListener("click", function(){
      const s = chip.getAttribute("data-series");
      const willBeActive = chip.getAttribute("data-active") !== "true";
      const otherActive = Object.keys(state.active).some(k => k !== s && state.active[k]);
      if (!willBeActive && !otherActive) return; // keep at least one series on
      state.active[s] = willBeActive;
      chip.setAttribute("data-active", String(willBeActive));
      applyChipColors();
      redrawAll();
    });
  });

  document.querySelectorAll("#rangeButtons .range-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      document.querySelectorAll("#rangeButtons .range-btn").forEach(b => b.removeAttribute("data-active"));
      btn.setAttribute("data-active","true");
      state.rangeMonths = parseInt(btn.getAttribute("data-months"),10);
      redrawAll();
    });
  });

  document.querySelectorAll(".table-toggle").forEach(function(btn){
    btn.addEventListener("click", function(){
      const el = document.getElementById(btn.getAttribute("data-target"));
      el.classList.toggle("show");
      btn.textContent = el.classList.contains("show") ? "Hide table" : "View as table";
    });
  });

  // ---------- helpers ----------
  function activeKeys(){ return Object.keys(state.active).filter(k => state.active[k]); }
  function fmtPct(v, d){ return v === null || v === undefined ? "–" : v.toFixed(d===undefined?2:d) + "%"; }
  function fmtNum(v){ return v === null || v === undefined ? "–" : v.toLocaleString(); }
  function deltaSpan(curr, prev, invertGood, unit, decimals){
    if (curr === null || prev === null || curr === undefined || prev === undefined) return "";
    const diff = curr - prev;
    const good = invertGood ? diff <= 0 : diff >= 0;
    const cls = Math.abs(diff) < 1e-9 ? "flat" : (good ? "down" : "up");
    const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "▬";
    const d = decimals === undefined ? 2 : decimals;
    const magnitude = Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
    return `<div class="delta ${cls}">${arrow} ${magnitude}${unit} vs prior mo.</div>`;
  }
  function lastIdx(arr){ for (let i=arr.length-1;i>=0;i--){ if (arr[i]!==null && arr[i]!==undefined) return i; } return -1; }

  function endLabelPlugin(){
    return {
      id: "endLabels",
      afterDatasetsDraw(chart){
        const {ctx} = chart;
        chart.data.datasets.forEach((ds, i) => {
          const meta = chart.getDatasetMeta(i);
          if (meta.hidden || !ds.data.length) return;
          let li = -1;
          for (let j = ds.data.length - 1; j >= 0; j--){ if (ds.data[j] !== null) { li = j; break; } }
          if (li < 0) return;
          const pt = meta.data[li];
          if (!pt) return;
          ctx.save();
          ctx.font = "600 11.5px -apple-system, Arial, sans-serif";
          ctx.fillStyle = ds.borderColor || ds.backgroundColor;
          ctx.textBaseline = "middle";
          const val = ds.data[li];
          const text = ds._labelFmt ? ds._labelFmt(val) : String(val);
          ctx.textAlign = "left";
          ctx.fillText(" " + text, pt.x + 4, pt.y);
          ctx.restore();
        });
      }
    };
  }

  const charts = {};
  function baseGrid(){ return cssVar("--border") || "#E3E6E8"; }
  function baseTick(){ return cssVar("--text-muted") || "#676E73"; }
  function baseSurface(){ return cssVar("--surface") || "#FFFFFF"; }
  function baseTextColor(){ return cssVar("--text") || "#2C2E30"; }

  function commonScales(yFmt){
    return {
      x: { grid: { display:false }, ticks: { color: baseTick(), font:{size:11} } },
      y: { grid: { color: baseGrid() }, ticks: { color: baseTick(), font:{size:11}, callback: yFmt }, beginAtZero:true }
    };
  }
  function tooltipBase(yFmt){
    return {
      backgroundColor: baseSurface(),
      titleColor: baseTextColor(),
      bodyColor: baseTextColor(),
      borderColor: baseGrid(),
      borderWidth: 1,
      padding: 10,
      titleFont: { weight: "700", size: 12 },
      bodyFont: { size: 12 },
      callbacks: yFmt ? { label: (ctx) => `${ctx.dataset.label}: ${yFmt(ctx.parsed.y)}` } : undefined
    };
  }

  function makeLine(id, labels, seriesDefs, yFmt){
    const canvas = document.getElementById(id);
    if (charts[id]) charts[id].destroy();
    const datasets = seriesDefs.filter(s => state.active[s.key]).map(s => ({
      label: LABEL[s.key],
      data: s.data,
      borderColor: seriesColor(s.key),
      backgroundColor: seriesColor(s.key),
      borderDash: DASH[s.key],
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2.5,
      tension: 0.25,
      spanGaps: true,
      _labelFmt: yFmt
    }));
    charts[id] = new Chart(canvas, {
      type: "line",
      data: { labels, datasets },
      plugins: [endLabelPlugin()],
      options: {
        responsive:true, maintainAspectRatio:false,
        interaction:{ mode:"index", intersect:false },
        layout:{ padding:{ right: 46 } },
        plugins:{
          legend:{ display:false },
          tooltip: tooltipBase(yFmt)
        },
        scales: commonScales(yFmt)
      }
    });
  }

  function makeBar(id, labels, seriesDefs, yFmt){
    const canvas = document.getElementById(id);
    if (charts[id]) charts[id].destroy();
    const datasets = seriesDefs.filter(s => state.active[s.key]).map(s => ({
      label: LABEL[s.key],
      data: s.data,
      backgroundColor: seriesColor(s.key),
      borderRadius: 4,
      maxBarThickness: 42
    }));
    charts[id] = new Chart(canvas, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip: tooltipBase(yFmt)
        },
        scales: commonScales(yFmt)
      }
    });
  }

  function sliceRange(arr){ return arr.slice(Math.max(0, arr.length - state.rangeMonths)); }

  function renderTable(targetId, labels, seriesDefs, fmt){
    const el = document.getElementById(targetId);
    let head = "<table class='data-table'><thead><tr><th>Month</th>" + seriesDefs.map(s=>`<th>${LABEL[s.key]}</th>`).join("") + "</tr></thead><tbody>";
    let rows = "";
    labels.forEach((m,i) => {
      rows += `<tr><td>${m}</td>` + seriesDefs.map(s => `<td>${fmt(s.data[i])}</td>`).join("") + "</tr>";
    });
    el.innerHTML = head + rows + "</tbody></table>";
  }

  function statCard(key, label, valueStr, deltaHtml){
    return `<div class="stat-card">
      <div class="label"><span class="dot" style="background:${seriesColor(key)}"></span>${label}</div>
      <div class="value">${valueStr}</div>
      ${deltaHtml || ""}
    </div>`;
  }

  function legendRowHtml(keys){
    return `<div class="legend-row">` + keys.map(k => `<div class="item"><span class="swatch ${DASH_CLASS[k]}" style="border-color:${seriesColor(k)}"></span>${LABEL[k]}</div>`).join("") + `</div>`;
  }

  // ---------- render sections ----------
  function renderCalls(){
    const keys = activeKeys();
    const seriesDefs = keys.map(k => ({ key:k, data: D.calls[k] }));
    makeBar("chart-calls", D.recentMonths, seriesDefs, v => v.toLocaleString());
    renderTable("table-calls", D.recentMonths, seriesDefs, fmtNum);
    document.getElementById("legend-calls").innerHTML = legendRowHtml(keys);
    let html = "";
    keys.forEach(k => {
      const data = D.calls[k];
      const li = data.length - 1;
      const delta = deltaSpan(data[li], data[li-1], true, "", 0);
      html += statCard(k, `${LABEL[k]} calls · ${D.recentMonths[li]}`, fmtNum(data[li]), delta);
    });
    document.getElementById("stats-calls").innerHTML = html;
  }

  function renderTickets(){
    const keys = activeKeys();
    const months = sliceRange(D.months);
    const rateDefs = keys.map(k => ({ key:k, data: sliceRange(D.ticketRate[k]) }));
    makeLine("chart-tickets", months, rateDefs, v => v.toFixed(2)+"%");
    renderTable("table-tickets", months, rateDefs, v => fmtPct(v,2));
    document.getElementById("legend-tickets").innerHTML = legendRowHtml(keys);

    const volDefs = keys.map(k => ({ key:k, data: D.ticketVolume[k] }));
    makeBar("chart-ticketvol", D.recentMonths, volDefs, v => v.toLocaleString());
    renderTable("table-ticketvol", D.recentMonths, volDefs, fmtNum);
    document.getElementById("legend-ticketvol").innerHTML = legendRowHtml(keys);

    let html = "";
    keys.forEach(k => {
      const rates = D.ticketRate[k];
      const li = lastIdx(rates);
      const delta = deltaSpan(rates[li], rates[li-1], true, "pts");
      html += statCard(k, `${LABEL[k]} ticket rate · ${D.months[li]}`, fmtPct(rates[li]), delta);
    });
    document.getElementById("stats-tickets").innerHTML = html;
  }

  function renderRepairs(){
    const keys = activeKeys();
    const months = sliceRange(D.months);
    const rateDefs = keys.map(k => ({ key:k, data: sliceRange(D.repairRate[k]) }));
    makeLine("chart-repairs", months, rateDefs, v => v.toFixed(2)+"%");
    renderTable("table-repairs", months, rateDefs, v => fmtPct(v,2));
    document.getElementById("legend-repairs").innerHTML = legendRowHtml(keys);

    const volDefs = keys.map(k => ({ key:k, data: D.fieldRepairVolume[k] }));
    makeBar("chart-repairvol", D.fieldRepairMonths, volDefs, v => v.toLocaleString());
    renderTable("table-repairvol", D.fieldRepairMonths, volDefs, fmtNum);
    document.getElementById("legend-repairvol").innerHTML = legendRowHtml(keys);

    let html = "";
    keys.forEach(k => {
      const rates = D.repairRate[k];
      const li = lastIdx(rates);
      const delta = deltaSpan(rates[li], rates[li-1], true, "pts");
      html += statCard(k, `${LABEL[k]} repair rate · ${D.months[li]}`, fmtPct(rates[li]), delta);
    });
    document.getElementById("stats-repairs").innerHTML = html;

    // HSIA fibre spotlight — single-series, sequential (no legend needed)
    if (charts["chart-fibre"]) charts["chart-fibre"].destroy();
    charts["chart-fibre"] = new Chart(document.getElementById("chart-fibre"), {
      type: "line",
      data: {
        labels: D.hsiaFibreMonths,
        datasets: [{
          label: "% of HSIA repairs coded as severely degraded fibre line",
          data: D.hsiaFibreDegraded.pctOfHsiaRepairs,
          borderColor: seriesColor("HSIA"), backgroundColor: seriesColor("HSIA") + "26",
          fill: true, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 4, tension: 0.25
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        interaction:{ mode:"index", intersect:false },
        plugins:{ legend:{ display:false }, tooltip: tooltipBase(v => v.toFixed(1)+"%") },
        scales: commonScales(v => v.toFixed(0)+"%")
      }
    });
  }

  function renderChurn(){
    const keys = activeKeys();
    const months = sliceRange(D.months);
    const rateDefs = keys.map(k => ({ key:k, data: sliceRange(D.churnRate[k]) }));
    makeLine("chart-churn", months, rateDefs, v => v.toFixed(2)+"%");
    renderTable("table-churn", months, rateDefs, v => fmtPct(v,2));
    document.getElementById("legend-churn").innerHTML = legendRowHtml(keys);

    const deactDefs = keys.map(k => ({ key:k, data: D.productTechnicalDeactsK[k] }));
    makeLine("chart-deacts", D.deactMonths, deactDefs, v => v.toFixed(1)+"K");
    renderTable("table-deacts", D.deactMonths, deactDefs, v => (v===null?"–":v.toFixed(1)+"K"));
    document.getElementById("legend-deacts").innerHTML = legendRowHtml(keys);

    let html = "";
    keys.forEach(k => {
      const rates = D.churnRate[k];
      const li = lastIdx(rates);
      const delta = deltaSpan(rates[li], rates[li-1], true, "pts");
      const yoy = D.annualChurn[k];
      const yoyHtml = `<div class="delta ${yoy.yoyPts<=0?'down':'up'}">${yoy.yoyPts<=0?'▼':'▲'} ${Math.abs(yoy.yoyPts).toFixed(2)}pts YoY (2026 YTD: ${yoy.y2026.toFixed(2)}% vs 2025: ${yoy.y2025.toFixed(2)}%)</div>`;
      html += statCard(k, `${LABEL[k]} churn rate · ${D.months[li]}`, fmtPct(rates[li]), delta + yoyHtml);
    });
    document.getElementById("stats-churn").innerHTML = html;
  }

  function redrawAll(){
    renderCalls();
    renderTickets();
    renderRepairs();
    renderChurn();
  }

  applyTheme();
  redrawAll();
})();
