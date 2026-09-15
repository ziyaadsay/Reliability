import React, { useState, useEffect, useRef } from "react";

/*
  FFH Reliability Scorecards — HSIA / TV / SHS
  Single-file React app styled after the CPR Product Health Scorecards.

  Sources:
  - "Reliability Deact KPIs" tab (main KPI table), Churn Measurement 2026
    workbook. Reporting window Jan 2025 – Aug 2026; churn (go/national RGU)
    reported through Jun 2026.
  - "HSIA/TV/SHS Looker Ticket Categories" tabs, same workbook — monthly
    ticket counts by category, Jan 2025 – Aug 2026 (replaces the earlier
    Tableau DRD feed).
  - "Initiatives" tab, same workbook — TV and HSIA initiatives (SHS to be
    added later), grouped under the reliability program's four pillars and
    tagged to the five recurring issues from the cross-source synthesis.

  Calls (Contacts, offered/answered) are split by product from the TS Calls
  Offered by Product workbook; the KPI workbook's FFH rollup is kept in DATA
  for reference only.
  "All" figures are computed: volumes summed; rates blended as total volume
  over total subscriber base (churn: base-weighted mean).
*/

// ---------------------------------------------------------------------------
// KPI data (cell-for-cell from the workbook; nulls = months not reported)
// ---------------------------------------------------------------------------
const MONTHS = [
  "Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025",
  "Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025",
  "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026","Jul 2026","Aug 2026"
];

const DATA = {
  callsOffered: {
    FFH: [159465,142526,142004,143125,143125,135582,142865,155431,181009,181144,158985,164939,149164,126282,150662,141512,142884,151340,155785,158179],
    SHS: [76023,62397,67525,66790,66790,63800,70137,65906,67075,64833,60210,62122,59042,55345,57385,59213,62891,61439,67285,68978],
    "SH+": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]
  },
  callsAnswered: {
    FFH: [138284,120120,133061,131694,131694,126038,134277,135704,126494,123753,130237,126593,125046,117143,132142,125406,127932,135057,133053,129856],
    SHS: [75001,62147,67317,66382,66382,63516,69793,65288,65179,61634,57013,59662,56606,53561,55780,52123,52505,56943,60621,59636],
    "SH+": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]
  },
  ticketRate: {
    HSIA: [2.17,2.10,2.41,2.47,2.50,2.46,2.64,2.64,2.51,2.56,2.63,2.59,2.64,2.40,2.77,2.63,2.93,2.99,2.99,3.06],
    TV:   [3.71,3.68,4.02,4.10,4.05,3.54,3.57,3.44,3.35,4.05,4.03,3.77,3.81,3.36,3.78,3.53,3.04,3.10,3.22,3.03],
    SHS:  [3.95,3.94,4.82,5.07,4.97,4.76,5.45,5.41,5.28,5.24,4.74,4.86,4.68,4.11,4.30,3.89,3.78,4.12,4.29,4.08],
    "SH+": [null,null,null,null,null,null,3.30,3.12,2.83,2.81,2.58,2.97,2.95,3.20,3.42,2.86,2.37,3.16,2.77,2.22]
  },
  ticketVolume: {
    HSIA: [40808,39535,45548,46629,47108,46515,50055,50097,47763,48826,50104,49406,50194,45749,52806,50134,55891,57270,57173,58789],
    TV:   [37956,37648,41170,41505,41320,36213,36392,34982,33980,41109,40866,38217,38747,34206,38519,35701,32654,33338,32369,34055],
    SHS:  [35181,35133,43173,45752,45088,43315,49570,49072,47932,47740,43331,44469,42929,37762,39505,35754,34831,38003,39651,37724],
    "SH+": [null,null,null,null,null,null,748,783,757,789,782,958,1023,1143,1387,1234,1092,1558,1498,1322]
  },
  repairRate: {
    HSIA: [0.65,0.60,0.64,0.64,0.72,0.73,0.82,0.85,0.85,0.94,0.85,0.85,0.76,0.70,0.80,0.91,0.94,0.83,0.91,0.79],
    TV:   [0.21,0.17,0.22,0.20,0.18,0.15,0.16,0.15,0.16,0.19,0.18,0.17,0.16,0.15,0.17,0.20,0.18,0.13,0.16,0.12],
    SHS:  [0.52,0.45,0.48,0.48,0.50,0.46,0.52,0.48,0.50,0.56,0.51,0.52,0.56,0.61,0.52,0.53,0.54,0.41,0.41,0.39],
    "SH+": [null,null,null,null,null,null,0.053,0.080,0.094,0.153,0.158,0.158,0.150,0.132,0.202,0.234,0.194,0.138,0.161,0.089]
  },
  repairVolume: {
    HSIA: [12155,11246,12103,12149,13550,13826,15529,16073,16207,17901,16242,16317,16392,14574,16717,17332,17995,15916,17445,15082],
    TV:   [2196,1787,2297,2036,1813,1578,1601,1567,1577,1901,1794,1688,1883,1728,1912,1989,1938,1409,1567,1390],
    SHS:  [4622,4046,4329,4309,4548,4225,4755,4326,4524,5115,4691,4749,5055,4615,4751,4894,4967,3736,3781,3653],
    "SH+": [null,null,null,null,null,null,12,20,25,43,48,51,52,47,82,101,89,68,87,53]
  },
  churnRate: {
    HSIA: [null,0.88,0.89,1.13,1.16,1.13,1.27,1.20,1.16,1.23,1.07,0.97,0.98,0.81,0.98,1.10,1.08,1.05,null,null],
    TV:   [null,1.12,1.13,1.33,1.36,1.31,1.50,1.41,1.37,1.46,1.35,1.19,1.28,1.05,1.24,1.33,1.29,1.30,null,null],
    SHS:  [null,1.14,1.27,1.52,1.53,1.34,1.53,1.47,1.29,1.60,1.39,1.00,1.60,1.04,1.25,1.40,1.26,1.51,null,null],
    "SH+": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]
  },
  subBase: {
    HSIA: [1882545,1884654,1886869,1886034,1886940,1894103,1892708,1894469,1902829,1905345,1905574,1909753,1902859,1904760,1908112,1906873,1907916,1912608,1914753,1920616],
    TV:   [1023254,1023001,1023592,1012348,1021021,1022003,1019316,1016784,1014448,1014746,1013761,1013837,1017435,1018970,1020171,1012595,1074046,1073827,1004848,1124369],
    SHS:  [890445,891993,896592,901871,906328,909317,909257,907488,908288,911221,913204,915714,917354,917870,919034,919511,921166,922159,924471,925508],
    "SH+": [6860,8257,10250,14069,18065,19982,22662,25129,26721,28074,30333,32272,34667,35736,40608,43215,45994,49289,54000,59600]
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
// Looker ticket categories (workbook tabs, Jan 2025 – Aug 2026). Issues are
// grouped by the five recurring issues from the cross-source synthesis
// (Connectivity · TV · Speed · WiFi · Support); SHS device categories sit in
// their own bucket, matching the synthesis note that SHS-specific issues are
// not mapped to the 5-issue framework.
// ---------------------------------------------------------------------------
const ISSUE_META = {
  Connectivity: { label: "Connection instability, outages & disconnections" },
  TV:           { label: "TV / Optik / PVR reliability" },
  Speed:        { label: "Slow speeds, buffering & lag" },
  WiFi:         { label: "WiFi coverage gaps & dead zones" },
  Support:      { label: "Support & service quality friction" },
  "SHS Hardware": { label: "SHS panels, sensors & devices (outside 5-issue framework)" }
};
const ISSUE_ORDER = ["Connectivity", "TV", "Speed", "WiFi", "Support", "SHS Hardware"];

const LOOKER = {
  HSIA: {
    monthlyTotal: [51899,49793,55855,56761,58936,58399,63006,62623,59217,61519,61508,59567,59904,52240,55612,59691,61600,63872,64686,60572],
    topCat: { name: "Connectivity", series: [39154,37540,41805,42145,43524,43593,46796,46373,43447,44553,44780,43541,43695,37892,40481,43843,44772,46349,47060,44386] },
    topIssues: [
      { issue: "Connectivity › No Dataflow", grp: "Connectivity", a26: 13340, a25: 10305 },
      { issue: "Connectivity › ONT Not Ranged", grp: "Connectivity", a26: 7216, a25: 8536 },
      { issue: "Connectivity › Losing Sync", grp: "Connectivity", a26: 6707, a25: 6525 },
      { issue: "Connectivity › Slow Speeds", grp: "Speed", a26: 6521, a25: 5931 },
      { issue: "Wireless › Can't Connect", grp: "WiFi", a26: 5774, a25: 5334 },
      { issue: "Connectivity › No Sync", grp: "Connectivity", a26: 4522, a25: 4104 },
      { issue: "Wireless › Disconnects", grp: "WiFi", a26: 4159, a25: 3591 },
      { issue: "Wireless › Slow Speeds", grp: "Speed", a26: 3283, a25: 2948 }
    ],
    rising: [
      { issue: "Connectivity › No Dataflow", grp: "Connectivity", a26: 13340, a25: 10305, delta: 3035 },
      { issue: "Incompatible Equipment (new category)", grp: "Speed", a26: 2037, a25: 0, delta: 2037 },
      { issue: "Connectivity › Incompatible Equipment", grp: "Speed", a26: 1522, a25: 0, delta: 1522 }
    ],
    falling: [
      { issue: "Connectivity › ONT Not Ranged", grp: "Connectivity", a26: 7216, a25: 8536, delta: -1320 },
      { issue: "Connectivity › Historical Data", grp: "Connectivity", a26: 2611, a25: 3020, delta: -409 },
      { issue: "Connectivity › No IP", grp: "Connectivity", a26: 1946, a25: 1949, delta: -3 }
    ]
  },
  TV: {
    monthlyTotal: [39631,39191,42556,42165,41236,36721,37319,35035,32164,35516,35342,33290,36340,31148,31562,30675,29513,29868,31363,32801],
    topCat: { name: "STB No Boot", series: [7924,7573,8420,8506,8394,7938,8080,7379,6486,7143,7364,7307,7627,6482,6543,6425,6153,6379,7027,7203] },
    topIssues: [
      { issue: "STB No Boot › Stuck on Initializing", grp: "TV", a26: 4433, a25: 4381, a25x: true },
      { issue: "Video Issues › No Video", grp: "TV", a26: 3629, a25: 5299 },
      { issue: "Recording Issues › Cannot Set Recordings", grp: "TV", a26: 2724, a25: 3110 },
      { issue: "Digital Box › Setup", grp: "TV", a26: 2534, a25: 1651 },
      { issue: "Channel Issues › Channel Not Working", grp: "TV", a26: 2431, a25: 1950 },
      { issue: "STB No Boot › Power Issues", grp: "TV", a26: 2130, a25: 2274 },
      { issue: "Video Issues › Stop/Stuttering/Freezing", grp: "TV", a26: 1998, a25: 2196 },
      { issue: "Digital Box › No Boot", grp: "TV", a26: 1590, a25: 3441 }
    ],
    rising: [
      { issue: "Digital Box › Setup", grp: "TV", a26: 2534, a25: 1651, delta: 883 },
      { issue: "Channel Issues › Channel Not Working", grp: "TV", a26: 2431, a25: 1950, delta: 481 },
      { issue: "Recordings › Functionality", grp: "TV", a26: 442, a25: 206, delta: 236 }
    ],
    falling: [
      { issue: "Digital Box › No Boot", grp: "TV", a26: 1590, a25: 3441, delta: -1851 },
      { issue: "Video Issues › No Video", grp: "TV", a26: 3629, a25: 5299, delta: -1670 },
      { issue: "Recording Issues › Cannot Set Recordings", grp: "TV", a26: 2724, a25: 3110, delta: -386 }
    ]
  },
  SHS: {
    monthlyTotal: [35181,35133,43173,45752,45088,43315,49570,49072,47932,47740,43331,44469,42929,37762,39505,35754,34831,38003,39651,38702],
    topCat: { name: "Main Panel", series: [7355,7107,8697,9210,8879,8465,9704,9359,9247,8988,8798,8823,8319,7360,7328,7469,6772,7519,7683,7273] },
    topIssues: [
      { issue: "Door/Window Sensor › Troubleshoot", grp: "SHS Hardware", a26: 1708, a25: 1793 },
      { issue: "Main Panel › Education", grp: "SHS Hardware", a26: 2155, a25: 2985 },
      { issue: "Smoke Detector › Power issues", grp: "SHS Hardware", a26: 1682, a25: 1251 },
      { issue: "Legacy Equipment › Legacy equipment support", grp: "SHS Hardware", a26: 1432, a25: 3610 },
      { issue: "Main Panel › Panel status", grp: "SHS Hardware", a26: 1333, a25: 1799 },
      { issue: "Outdoor Camera › Troubleshoot", grp: "SHS Hardware", a26: 1651, a25: 2064 },
      { issue: "Doorbell Camera › Troubleshoot", grp: "SHS Hardware", a26: 1394, a25: 1783 },
      { issue: "Mobile App Self-Serve › App support", grp: "Support", a26: 1216, a25: 1585 }
    ],
    rising: [
      { issue: "Smoke Detector › Power issues", grp: "SHS Hardware", a26: 1682, a25: 1251, delta: 431 },
      { issue: "Door/Window Sensor › Power issues", grp: "SHS Hardware", a26: 897, a25: 653, delta: 244 },
      { issue: "Smoke Detector › Education", grp: "SHS Hardware", a26: 780, a25: 541, delta: 239 }
    ],
    falling: [
      { issue: "Legacy Equipment › Legacy equipment support", grp: "SHS Hardware", a26: 1432, a25: 3610, delta: -2178 },
      { issue: "CMS inquiry › Event history", grp: "Support", a26: 574, a25: 1411, delta: -837 },
      { issue: "Main Panel › Education", grp: "SHS Hardware", a26: 2155, a25: 2985, delta: -830 }
    ]
  }
};

// Recurring-issue rollup for the Overview (Aug 2026 vs Aug 2025 volumes)
const OVERVIEW_ISSUES = [
  { grp: "Connectivity", HSIA: [36342, 34439], TV: null, SHS: null },
  { grp: "TV", HSIA: null, TV: [30980, 33224], SHS: null },
  { grp: "Speed", HSIA: [13364, 8879], TV: null, SHS: null },
  { grp: "WiFi", HSIA: [10011, 8925], TV: null, SHS: null },
  { grp: "Support", HSIA: [855, 479], TV: [1821, 1981], SHS: [6108, 9715] },
  { grp: "SHS Hardware", HSIA: null, TV: null, SHS: [32594, 40406] }
];

// ---------------------------------------------------------------------------
// Initiatives (workbook "Initiatives" tab; SHS to be added later).
// pillar: 1 Instrumenting · 2 By Design · 3 Proactive · 4 Front Line —
// assignment follows the four-pillar framing from the reliability program's
// cross-source synthesis. issues: recurring-issue coverage tags.
// ---------------------------------------------------------------------------
const PILLARS = [
  { n: 1, name: "Instrumenting Our Products for Reliability", sub: "Telemetry, detection & signal accuracy" },
  { n: 2, name: "By Design, Build Reliability Into Products", sub: "Hardware, firmware & architecture" },
  { n: 3, name: "Delight Customers by Shifting to Proactive", sub: "Proactive campaigns & outreach enablement" },
  { n: 4, name: "Enable Front Line to Resolve First Time", sub: "Agent tooling, Sweepr & first-call resolution" }
];

const INITIATIVES = [
  // ------------------------- HSIA -------------------------
  { p: "HSIA", pillar: 1, theme: "Wi-Fi", name: "Cloudcheck Fine Tuning", status: "Launched", timeline: "Aug 2026", prime: "A. Schmidt", issues: ["WiFi"],
    desc: "Improves the CloudCheck Wi-Fi QoE score's ability to accurately detect customers experiencing Wi-Fi degradation." },
  { p: "HSIA", pillar: 1, theme: "Wi-Fi", name: "CloudCheck Speed Test Server Capacity", status: "In flight", timeline: "Sep 2026", prime: "J. Thompson", issues: ["WiFi", "Speed"],
    desc: "Raises speed-test server capacity to 1.5 Gbps and improves accuracy in the SmartHome+ app and agent test tools." },
  { p: "HSIA", pillar: 1, theme: "Speed & equipment", name: "Cloudcheck Server Upgrades & Speed Test Improvements", status: "In flight", timeline: "Oct 2026", prime: "J. Thompson", issues: ["Speed"],
    desc: "Major and minor CloudCheck server upgrades improving the accuracy of speed-test capabilities." },
  { p: "HSIA", pillar: 1, theme: "GPON degraded fibre", name: "Fibre Check — Severely Degraded from the OLT", status: "In flight", timeline: "Sep 2026", prime: "Z. Sayhebolay", issues: ["Connectivity"],
    desc: "Integrates 24-hour OLT severely-degraded status into Fibre Check to resolve chronic line drops." },
  { p: "HSIA", pillar: 1, theme: "GPON degraded fibre", name: "HSIA Churn Prediction (LLM Model)", status: "In flight", timeline: "Feb 2026", prime: "I. Kochergin", issues: ["Connectivity"],
    desc: "LLM-powered predictive churn scoring combining network telemetry and customer ticket patterns." },
  { p: "HSIA", pillar: 1, theme: "GPON degraded fibre", name: "GPONe Geographic Analysis & Infrastructure Optimization", status: "In flight", timeline: "Jun 2026 pilot", prime: "D. Wright / Soheila / Errol", issues: ["Connectivity"],
    desc: "Clustering analysis of OLT/FDH degradation hotspots to guide preventive outside-plant repairs." },
  { p: "HSIA", pillar: 1, theme: "GPON degraded fibre", name: "Fibre Check — Bit Errors & Critical Alarms", status: "Ideation", timeline: "2027 capital", prime: "Z. Sayhebolay", issues: ["Connectivity"],
    desc: "Incorporates physical bit errors and critical optical telemetry alarms into Fibre Check diagnostics." },
  { p: "HSIA", pillar: 1, theme: "Wi-Fi", name: "Fibre Check Visual — Wi-Fi CC Recommendations", status: "Ideation", timeline: "2027 capital", prime: "Z. Sayhebolay", issues: ["WiFi"],
    desc: "Integrates Wi-Fi Coverage & Connectivity Index guidance directly into the Fibre Check portal." },
  { p: "HSIA", pillar: 1, theme: "Speed & equipment", name: "Enhanced Speed Test up to 10 Gbps", status: "Ideation", timeline: "2027 capital", prime: "J. Thompson", issues: ["Speed"],
    desc: "New speed-test capability to complete and prove 10 Gbps speed delivery." },
  { p: "HSIA", pillar: 2, theme: "Wi-Fi", name: "Fix Auto Channel Disabled — Firmware", status: "In flight", timeline: "Jun 2026", prime: "Rooshil", issues: ["WiFi"],
    desc: "Firmware remediation for the Arcadyan Boost Wi-Fi 6 auto-channel disabling defect." },
  { p: "HSIA", pillar: 2, theme: "Wi-Fi", name: "SH+ App Migration for Internet Management", status: "In flight", timeline: "Jul 2026", prime: "A. Dhanani", issues: ["WiFi", "Support"],
    desc: "Customer self-serve tools in the SH+ app for outage alerts, Wi-Fi management and password resets." },
  { p: "HSIA", pillar: 2, theme: "Wi-Fi", name: "HSIA Legacy Hardware Upgrades", status: "Ideation", timeline: "2027 capital", prime: "Not resourced", issues: ["WiFi", "Speed"],
    desc: "Targeted hardware replacement program migrating legacy Wi-Fi extenders to Wi-Fi 6 hardware." },
  { p: "HSIA", pillar: 2, theme: "Wi-Fi", name: "Wi-Fi Problematic Device Mitigation", status: "Ideation", timeline: "—", prime: "Not resourced", issues: ["WiFi"],
    desc: "Targeted telemetry investigations and firmware adjustments addressing the top ten troubled Wi-Fi devices." },
  { p: "HSIA", pillar: 2, theme: "Speed & equipment", name: "3 Gig Upgrade on TELUS.com", status: "Launched", timeline: "Aug 2026", prime: "D. Evans", issues: ["Speed"],
    desc: "System fix ensuring 3Gbps web orders trigger fielded XGSPON port swaps instead of software-only drops." },
  { p: "HSIA", pillar: 2, theme: "Speed & equipment", name: "DIY Revamp Live ONT Check", status: "In flight", timeline: "Nov 2026", prime: "D. Wearmouth", issues: ["Speed", "Connectivity"],
    desc: "Automated removal of the Quick Connect flag when no optical light is observed for 7 consecutive days." },
  { p: "HSIA", pillar: 2, theme: "Speed & equipment", name: "Speed Upgrade No Charge", status: "Ideation", timeline: "—", prime: "TBD", issues: ["Speed"],
    desc: "Software speed-upgrade program for congested cohorts to defend against competitor churn." },
  { p: "HSIA", pillar: 2, theme: "GPON degraded fibre", name: "XGSPON Light Requirements Enhancement", status: "Stalled", timeline: "Jul 2026", prime: "A. Broten", issues: ["Connectivity"],
    desc: "Refines optical-loss thresholds for XGSPON based on cable distance and bends." },
  { p: "HSIA", pillar: 2, theme: "GPON degraded fibre", name: "NGMR Build Quality Assurance", status: "Ideation", timeline: "—", prime: "A. Broten", issues: ["Connectivity"],
    desc: "Re-establishes suite-level optical attenuation QA standards for new growth-market builds." },
  { p: "HSIA", pillar: 2, theme: "GPON degraded fibre", name: "Professional Installs at Degraded-Fibre Addresses", status: "Ideation", timeline: "—", prime: "A. Broten", issues: ["Connectivity"],
    desc: "Enforces professional technician installs and move orders at addresses identified with severely degraded fibre." },
  { p: "HSIA", pillar: 2, theme: "Copper strategy", name: "Copper to Fibre Repair Intercept", status: "Launched", timeline: "Oct 2026", prime: "L. Nichols", issues: ["Connectivity"],
    desc: "Intercepts copper repair tickets for fibre-eligible premises and dispatches them as fibre migrations." },
  { p: "HSIA", pillar: 2, theme: "Copper strategy", name: "Copper to WHSIA Technology Change in CSR", status: "In flight", timeline: "Sep 2026", prime: "A. Tirthani", issues: ["Connectivity"],
    desc: "System solution for copper-to-wireless HSIA, then targeted transition of low-speed copper subscribers to Fixed Wireless during service calls." },
  { p: "HSIA", pillar: 2, theme: "Outage", name: "Service Guarantee: Internet Backup to Cellular", status: "Launched", timeline: "Jul 2026", prime: "J. Harrison", issues: ["Connectivity"],
    desc: "Automatic cellular failover backup during fibre outages, restoring seamlessly on recovery." },
  { p: "HSIA", pillar: 3, theme: "Wi-Fi", name: "Wi-Fi RouteThis RAVA Pilot Proactive Campaign", status: "In flight", timeline: "Jul 2026", prime: "F. Ahmed", issues: ["WiFi"],
    desc: "Scales the proactive program using RouteThis RAVA diagnostics to resolve home Wi-Fi issues before contact." },
  { p: "HSIA", pillar: 3, theme: "Wi-Fi", name: "Wi-Fi Scaling — Proactive Campaigns", status: "In flight", timeline: "In planning", prime: "Wi-Fi team", issues: ["WiFi"],
    desc: "Scales automated customer communications for identified Wi-Fi interference and dead zones." },
  { p: "HSIA", pillar: 3, theme: "GPON degraded fibre", name: "GPONe Fibre Degradation Proactive Campaign", status: "In flight", timeline: "Aug 2026", prime: "J. Silva", issues: ["Connectivity"],
    desc: "Revamped proactive outreach program targeting severe degradation signatures." },
  { p: "HSIA", pillar: 3, theme: "Speed & equipment", name: "Gigabit Speed Compatibility ICU Intervention", status: "In flight", timeline: "Jun 2026", prime: "A. Broten / B. Weir", issues: ["Speed"],
    desc: "ICU outbound outreach upgrading customers on 3Gbps+ profiles to XGS-PON equipment." },
  { p: "HSIA", pillar: 3, theme: "Copper strategy", name: "Proactive Intervention C2F Migration", status: "Launched", timeline: "Feb 2027", prime: "A. Tirthani", issues: ["Connectivity"],
    desc: "Proactive migration campaign converting chronic trouble-ticket copper lines to pure fibre." },
  { p: "HSIA", pillar: 3, theme: "Outage", name: "Pulse Cluster GUI for Outages", status: "Launched", timeline: "Feb 2026", prime: "Errol / C. Neuman", issues: ["Connectivity"],
    desc: "Outage-clustering interface grouping 5–10 customer disconnect events for proactive manual triage." },
  { p: "HSIA", pillar: 4, theme: "Wi-Fi", name: "Technician WiFi Certification Tool", status: "Launched", timeline: "Jun 2026", prime: "M. Webber", issues: ["WiFi"],
    desc: "Grows use and quality of the mobile field app guiding access-point placement, coverage mapping and Wi-Fi certification." },
  { p: "HSIA", pillar: 4, theme: "GPON degraded fibre", name: "KIT Test Tool Mandatory Pass on All Jobs", status: "Ideation", timeline: "—", prime: "M. Webber", issues: ["Connectivity"],
    desc: "Reinstates mandatory test validation with distance metrics to reduce repeat truck rolls." },
  { p: "HSIA", pillar: 4, theme: "Speed & equipment", name: "Improve Provisioning Checks for 3 Gig in InSight", status: "In flight", timeline: "In planning", prime: "A. Broten", issues: ["Speed", "Support"],
    desc: "Consolidates six provisioning checks into a single clear validation flag in the agent InSight portal." },

  // ------------------------- TV -------------------------
  { p: "TV", pillar: 1, theme: "Channel Issues", name: "Automated Missing TV Channel Audit", status: "In flight", timeline: "Jan 2026", prime: "N. Desrosiers", issues: ["TV"],
    desc: "Automated audit detecting missing-channel conditions before customers report them." },
  { p: "TV", pillar: 1, theme: "Channel Issues", name: "Option82 Sync", status: "Launched", timeline: "Jun 2026", prime: "C. Millman", issues: ["TV"],
    desc: "Detects NetCracker vs. Optik identity mismatches — a root cause behind multiple TV failures — with one-click sync." },
  { p: "TV", pillar: 1, theme: "Channel Issues", name: "P001 Playback Error Monitoring", status: "In flight", timeline: "Ongoing", prime: "D. Beye", issues: ["TV"],
    desc: "Ongoing monitoring after the CR32 fixes; customer-facing error rate is back to baseline. No further action planned for now." },
  { p: "TV", pillar: 1, theme: "Channel Issues", name: "Claude-Powered Channel-Issue Deepdive", status: "In flight", timeline: "Sep 2026", prime: "A. Kozyniak", issues: ["TV"],
    desc: "New deepdive strategy leveraging Claude to connect platform telemetry, account provisioning and call data for TELUS TV+ channel-issue tickets." },
  { p: "TV", pillar: 1, theme: "Hardware", name: "Shipping Telemetry Automation", status: "In flight", timeline: "Nov 2026", prime: "A. Kozyniak", issues: ["TV", "Support"],
    desc: "Automates shipping telemetry to proactively identify new trends in shipment failures." },
  { p: "TV", pillar: 2, theme: "Hardware", name: "PSU Replacement Campaign", status: "Launched", timeline: "Sep 2025", prime: "D. Culp", issues: ["TV"],
    desc: "Ships replacement power-supply units for the OPUS digital box, a major driver of TV hardware tickets." },
  { p: "TV", pillar: 2, theme: "Hardware", name: "Shipment Notification Redesign", status: "Launched", timeline: "Feb 2026", prime: "K. Liu", issues: ["TV", "Support"],
    desc: "Redesigns equipment-shipment notifications to reduce fulfilment confusion and missed activations." },
  { p: "TV", pillar: 2, theme: "Channel Issues", name: "UUID Auto Sync — Blocking Channels Fix", status: "Launched", timeline: "Mar 2026", prime: "J. Homsavath", issues: ["TV"],
    desc: "Fixes UUID mismatches that block channels, with automatic re-sync." },
  { p: "TV", pillar: 2, theme: "Recording Issues", name: "Recording Restart Issue Fix", status: "Launched", timeline: "May 2026", prime: "A. Kozyniak", issues: ["TV"],
    desc: "Fixes the recording-restart defect affecting PVR playback." },
  { p: "TV", pillar: 2, theme: "Recording Issues", name: "TTV+ Guide Filter Fix", status: "Launched", timeline: "May 2026", prime: "A. Kozyniak", issues: ["TV"],
    desc: "Fixes guide filtering defects in TELUS TV+." },
  { p: "TV", pillar: 2, theme: "Hardware", name: "Revamped OPUS Migration Process", status: "In flight", timeline: "Jun 2026", prime: "M. Ibrahim", issues: ["TV"],
    desc: "Overhauls the OPUS migration process for a smoother hardware transition." },
  { p: "TV", pillar: 2, theme: "Recording Issues", name: "Sports Team Recordings", status: "In flight", timeline: "Jul 2026", prime: "C. Carter", issues: ["TV"],
    desc: "Adds sports-team-based recording capability." },
  { p: "TV", pillar: 2, theme: "Hardware", name: "Equipment Order Fallout Audit", status: "In flight", timeline: "Oct 2026", prime: "A. Kozyniak", issues: ["TV", "Support"],
    desc: "Audits equipment-order fallout to catch failed or stuck orders." },
  { p: "TV", pillar: 2, theme: "Hardware", name: "Shipping Issues Investigation", status: "In flight", timeline: "Nov 2026", prime: "A. Kozyniak", issues: ["TV", "Support"],
    desc: "Three shipping issues identified (missing postal code on proactive-assurance campaigns, CSR orders missing street address or province) under investigation." },
  { p: "TV", pillar: 2, theme: "Recording Issues", name: "Recording Deletion Enhancements", status: "Ideation", timeline: "—", prime: "C. Carter", issues: ["TV"],
    desc: "Enhances recording-deletion behaviour." },
  { p: "TV", pillar: 3, theme: "Video Quality", name: "Low RSSI + Low Bitrate Proactive Campaign", status: "Launched", timeline: "Aug 2026", prime: "G. Sawa", issues: ["TV", "WiFi"],
    desc: "Proactive campaign targeting set-top boxes with low RSSI and low bitrate before customers notice video quality issues." },
  { p: "TV", pillar: 3, theme: "Onboarding", name: "AI STB Onboarding Videos", status: "In flight", timeline: "Sep 2026", prime: "C. Carter", issues: ["TV", "Support"],
    desc: "Six new AI-generated STB onboarding videos in a new Home-page swimlane helping customers with remote and UX usage." },
  { p: "TV", pillar: 4, theme: "Video Quality", name: "InSight Conviva Video Quality Metrics & Co-pilot Ingestion", status: "Ideation", timeline: "—", prime: "Z. Sayhebolay", issues: ["TV", "Support"],
    desc: "Updates InSight's Conviva video-quality metrics and feeds them into the agent co-pilot." }
];

// ---------------------------------------------------------------------------
// Palette — HSIA/TV mode-invariant, SHS blue stepped per mode (validated on
// the adjacent pairlist in both themes). FFH never shares a chart with the
// products; "All" wears the heading purple.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Self-serve customer workflows (Sweepr) — HSIA West Scorecard workbook, rows 49-55.
// Arrays align with MONTHS (Jan 2025 – Aug 2026). a = actuals; t = 2026 monthly targets
// (the source sets targets for 2026 only; churn impact and deacts saved carry no target).
// Rates are percentages; cxEasy is a score (target 4.0); cxSent is comment sentiment
// (negative scale, target -0.50, less negative is better).
// ---------------------------------------------------------------------------
const SWEEPR = {
  resolved: {
    a: [40266, 39898, 43490, 46000, 44336, 47147, 43423, 44346, 51674, 56387, 52820, 50953, 50356, 42781, 53889, 41283, 43179, 45867, 45891, 49069],
    t: [null, null, null, null, null, null, null, null, null, null, null, null, 47551, 47439, 47595, 46384, 45971, 45988, 45989, 45987]
  },
  webAppRate: {
    a: [58.1, 59.5, 59.2, 59.1, 58.7, 59.9, 56.3, 61.3, 52.9, 54.4, 56.8, 54.0, 59.6, 61.3, 64.2, 61.1, 64.2, 63.8, 63.5, 64.1],
    t: [null, null, null, null, null, null, null, null, null, null, null, null, 59.4, 59.7, 60.1, 60.4, 60.7, 61.0, 61.4, 61.7]
  },
  ivrRate: {
    a: [null, null, null, null, null, null, null, null, null, null, null, null, 13.9, 12.7, 12.5, 12.4, null, null, null, null],
    t: [null, null, null, null, null, null, null, null, null, null, null, null, 14.0, 14.0, 14.0, 14.0, 14.0, 14.0, 14.0, 14.0]
  },
  cxEasy: {
    a: [null, null, null, null, null, null, null, null, null, 3.29, 3.35, 3.43, 3.43, 3.49, 3.45, 3.51, 3.45, 3.49, 3.48, 3.44],
    t: [null, null, null, null, null, null, null, null, null, null, null, null, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0, 4.0]
  },
  cxSent: {
    a: [null, null, null, null, null, null, null, null, null, -0.68, -0.66, -0.55, -0.61, -0.57, -0.63, -0.64, -0.61, -0.58, -0.64, -0.67],
    t: [null, null, null, null, null, null, null, null, null, null, null, null, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5]
  },
  churn: {
    a: [null, null, null, null, null, null, null, null, null, null, null, null, 2.25, 2.34, 1.93, 1.96, 1.89, 1.81, 1.81, 1.81],
    t: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
  },
  deacts: {
    a: [null, null, null, null, null, null, null, null, null, null, null, null, 749, 742, 691, 879, 716, 845, 881, 899],
    t: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
  }
};

// ---------------------------------------------------------------------------
// FFH call split by product — TS Calls Offered by Product workbook, Actuals tabs.
// Arrays align with MONTHS (Jan 2025 – Aug 2026).
// HSIA = every field containing "HSIA" (HSIA West, wHSIA, PFE - HSIA, TQ ILEC - HSIA).
// TV = IPTV West + TV+ (OPUS) + PFE - IPTV + TQ ILEC - IPTV, rolled up (no platform split).
// These series also drive the overview scorecard's call rows and the derived
// All-products calls; the KPI workbook's FFH rollup is retained in DATA only
// for reference and is no longer displayed.
// ---------------------------------------------------------------------------
const CALLS_SPLIT = {
  HSIA: {
    offered:  [71682, 62931, 62987, 62533, 65485, 65903, 70864, 75668, 87327, 80838, 74636, 79127, 74019, 61328, 77629, 73862, 83488, 87411, 92079, 93496],
    answered: [62721, 53784, 58862, 58588, 59487, 60466, 65898, 65375, 61542, 56697, 62221, 62803, 63365, 57406, 69218, 66333, 75192, 78792, 80390, 78374]
  },
  TV: {
    offered:  [70986, 63302, 60180, 57649, 60110, 53867, 53371, 55743, 64459, 73649, 65301, 65045, 60826, 48557, 56815, 52649, 49389, 50181, 51497, 53370],
    answered: [62745, 54822, 55965, 53508, 54033, 48853, 49214, 47720, 45778, 52570, 55079, 52475, 52737, 45730, 51223, 47806, 44898, 45464, 45329, 45193]
  }
};

// ---------------------------------------------------------------------------
// TV platform breakout — Optik TV Legacy (Mediaroom) vs TV Evolution (OPUS).
// Arrays align with MONTHS (Jan 2025 – Aug 2026).
// Tickets: Looker Ticket Categories tab, split by Product
//   (Optik TV (Legacy) = Legacy; TV Evolution = OPUS).
// Repairs & base: 2026 Redwood Scorecard workbook, Repair Tracking Detail tab —
//   Legacy = IPTV West + TQ ILEC TV; OPUS = OPUS + PFE Vulcan - TV.
//   The source reports the split for 2026 onward only (2025 = null).
// swaps2026: monthly 2026 repair swap volumes from the Tableau Swapped Orders
//   Combined View dashboard, Repair Swap Orders Volumes (Total TV = Legacy,
//   Total OPUS = OPUS; all technologies). Jan – Aug 2026; September is excluded
//   as a partial month at the time of the pull.
// ---------------------------------------------------------------------------
const TV_PLATFORMS = [
  {
    id: "legacy", name: "Optik TV Legacy", sub: "Mediaroom · IPTV West + TQ ILEC TV",
    tickets: [28724, 28040, 30652, 30984, 31535, 26335, 26637, 24474, 22010, 26283, 25560, 24547, 26833, 23176, 23159, 23715, 20858, 20917, 21489, 22123],
    repairs: [null, null, null, null, null, null, null, null, null, null, null, null, 1581, 1418, 1590, 1663, 1605, 1105, 1263, 1240],
    base: [null, null, null, null, null, null, null, null, null, null, null, null, 821723, 816290, 811279, 798308, 788806, 784491, 761917, 744256],
    swaps2026: [null, null, null, null, null, null, null, null, null, null, null, null, 2003, 1686, 1764, 1443, 1178, 977, 698, 596]
  },
  {
    id: "opus", name: "TV Evolution", sub: "OPUS + PFE Vulcan - TV",
    tickets: [9480, 9810, 10722, 10734, 10003, 10096, 10007, 10731, 12168, 15164, 15504, 13886, 12128, 9921, 9441, 10894, 9879, 11256, 9867, 10678],
    repairs: [null, null, null, null, null, null, null, null, null, null, null, null, 307, 310, 329, 330, 336, 307, 309, 305],
    base: [null, null, null, null, null, null, null, null, null, null, null, null, 313057, 317647, 321934, 331737, 339109, 341964, 363352, 380113],
    swaps2026: [null, null, null, null, null, null, null, null, null, null, null, null, 1352, 1141, 1080, 954, 701, 727, 231, 226]
  }
];
// Per-platform rates derived where both volume and base are reported
TV_PLATFORMS.forEach((p) => {
  p.ticketRate = p.tickets.map((v, i) => (v != null && p.base[i] != null ? +((v / p.base[i]) * 100).toFixed(2) : null));
  p.repairRate = p.repairs.map((v, i) => (v != null && p.base[i] != null ? +((v / p.base[i]) * 100).toFixed(3) : null));
});

const LIGHT_COLOR = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#2a78d6", "SH+": "#00838F", FFH: "#eb6834", All: "#4B286D", SWEEPR: "#eb6834", LEGACY: "#2B8000", OPUS: "#eb6834" };
const DARK_COLOR  = { HSIA: "#7C53A5", TV: "#2B8000", SHS: "#3987e5", "SH+": "#26A5B3", FFH: "#d95926", All: "#C9A9E8", SWEEPR: "#d95926", LEGACY: "#2B8000", OPUS: "#d95926" };
const PRODUCTS = ["HSIA", "TV", "SHS"];
const SCOPES = ["All", "HSIA", "TV", "SHS", "SH+"];

const LIGHT_THEME = {
  bg: "#FFFFFF", surface: "#FFFFFF", band: "#F6F2FA", panel: "#FAF9FB",
  border: "#E7E3EC", borderStrong: "#C9C2D3",
  text: "#2C2E30", textSecondary: "#414547", textMuted: "#676E73", textFaint: "#9A93A6",
  purple: "#4B286D", ink: "#2A1A3B", purpleLightest: "#F6F2FA", purpleLighter: "#E2D8EC",
  good: "#2B8000", bad: "#B3261E", heading: "#4B286D",
  navActiveBg: "#F6F2FA", navActiveText: "#4B286D", highlightCol: "#EFE7F7",
  chipLaunched: "#E5F3DA", chipLaunchedText: "#2B8000", chipFlight: "#EFE7F7", chipFlightText: "#4B286D",
  chipIdea: "#F0EFF2", chipIdeaText: "#676E73", chipStalled: "#FBEAE8", chipStalledText: "#B3261E"
};
const DARK_THEME = {
  bg: "#17151a", surface: "#211e26", band: "#2A2433", panel: "#1d1a22",
  border: "#3a3542", borderStrong: "#4d4757",
  text: "#F1EEF5", textSecondary: "#D3CCDE", textMuted: "#A79EB6", textFaint: "#857c96",
  purple: "#4B286D", ink: "#3A2A4E", purpleLightest: "#2A2433", purpleLighter: "#4d4360",
  good: "#4caf50", bad: "#FF6B6B", heading: "#C9A9E8",
  navActiveBg: "#2A2433", navActiveText: "#C9A9E8", highlightCol: "#332946",
  chipLaunched: "#22391c", chipLaunchedText: "#7fd45f", chipFlight: "#332946", chipFlightText: "#C9A9E8",
  chipIdea: "#2b2830", chipIdeaText: "#A79EB6", chipStalled: "#3d2323", chipStalledText: "#FF8a8a"
};

const FONT = "'Hanken Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica Neue,Arial,sans-serif";

// Official TELUS logo (embedded from the CPR Scorecards reference page)
const TELUS_LOGO = "data:image/png;base64,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";

// ---------------------------------------------------------------------------
// Icons — minimal inline SVG set (stroke inherits currentColor)
// ---------------------------------------------------------------------------
const ICON_PATHS = {
  overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  hsia: "M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01",
  tv: "M3 7h18v12H3zM8 21h8M12 7l4-4M12 7 8 3",
  shs: "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z",
  calls: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  tickets: "M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 1 0-4V8H4zM14 8v8",
  repairs: "M14.5 6.5a4 4 0 0 0-5.6 4.9L4 16.3V20h3.7l4.9-4.9a4 4 0 0 0 4.9-5.6L14 13l-3-3z",
  churn: "M3 7l6 6 4-4 8 8M21 17v4h-4",
  base: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.4M22 21v-1a6 6 0 0 0-4-5.6",
  issues: "M12 3l10 18H2zM12 10v5M12 18.5h.01",
  initiatives: "M5 21V4h13l-2.5 4L18 12H7",
  pillar1: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 12l6-6M7 17a7 7 0 0 1 0-10M17 17a7 7 0 0 0 2-5",
  pillar2: "M12 3 3 8l9 5 9-5zM3 13l9 5 9-5",
  pillar3: "M21 3 10 14M21 3l-7 18-3-8-8-3z",
  pillar4: "M4 19v-1a6 6 0 0 1 12 0v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M18 8l2 2 3-3",
  selfserve: "M13 2 3 14h7l-1 8 10-12h-7z",
  shplus: "M3 11l9-8 9 8M5 9.5V21h14V9.5M12 12v6M9 15h6",
  cx: "M8 10h.01M16 10h.01M8.5 15a4.5 4.5 0 0 0 7 0M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  saved: "M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 3.5c0 4-4 7.5-9 11.5zM9 12l2 2 4-4"
};
function Icon({ name, size = 15, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      <path d={ICON_PATHS[name] || ICON_PATHS.overview} />
    </svg>
  );
}
const PRODUCT_ICON = { All: "overview", HSIA: "hsia", TV: "tv", SHS: "shs", "SH+": "shplus", FFH: "hsia" };

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

// goodWhenDown: reliability metrics improve when they fall; base improves up
function delta(curr, prev, unit, decimals, goodWhenDown = true) {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  const flat = Math.abs(diff) < 1e-9;
  const good = goodWhenDown ? diff <= 0 : diff >= 0;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "▬";
  const mag = Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return { text: `${arrow} ${mag}${unit}`, tone: flat ? "flat" : good ? "good" : "bad" };
}

function yoyPctText(a26, a25) {
  if (!a25) return "new";
  const p = ((a26 - a25) / a25) * 100;
  return (p > 0 ? "+" : "") + p.toFixed(0) + "%";
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

// Derived "All products" series
(function deriveAll() {
  const n = MONTHS.length;
  const P = PRODUCTS;
  const baseAll = [], callsOffAll = [], callsAnsAll = [], tickRateAll = [], tickVolAll = [], repRateAll = [], repVolAll = [], churnAll = [];
  for (let i = 0; i < n; i++) {
    const base = P.reduce((a, p) => a + DATA.subBase[p][i], 0);
    baseAll.push(base);
    callsOffAll.push(CALLS_SPLIT.HSIA.offered[i] + CALLS_SPLIT.TV.offered[i] + DATA.callsOffered.SHS[i]);
    callsAnsAll.push(CALLS_SPLIT.HSIA.answered[i] + CALLS_SPLIT.TV.answered[i] + DATA.callsAnswered.SHS[i]);
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
// SVG line chart
// ---------------------------------------------------------------------------
const VIEW_W = 800;

function LineChart({ labels, seriesDefs, height = 240, yFmt, colors, T }) {
  const wrapRef = useRef(null);
  const [hoverI, setHoverI] = useState(null);
  const left = 52, right = 60, top = 14, bottom = 22;
  const plotW = VIEW_W - left - right;
  const plotH = height - top - bottom;

  const allVals = seriesDefs.flatMap((s) => s.data.filter((v) => v != null));
  const posVals = allVals.filter((v) => v > 0);
  const negVals = allVals.filter((v) => v < 0);
  const max = posVals.length ? niceCeil(Math.max(...posVals) * 1.15) : negVals.length ? 0 : 1;
  const min = negVals.length ? -niceCeil(Math.abs(Math.min(...negVals)) * 1.15) : 0;
  const span = max - min || 1;

  const xScale = (i) => (labels.length <= 1 ? left + plotW / 2 : left + (i * plotW) / (labels.length - 1));
  const yScale = (v) => top + ((max - v) / span) * plotH;
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
          const v = min + (span * t) / 4;
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
        {(() => { const placedLabelYs = []; return seriesDefs.map((s, si) => {
          const pts = s.data.map((v, i) => (v == null ? null : { x: xScale(i), y: yScale(v), v })).filter(Boolean);
          if (!pts.length) return null;
          const d = "M " + pts.map((p) => `${p.x},${p.y}`).join(" L ");
          const last = pts[pts.length - 1];
          const col = seriesColor(s);
          let labelY = last.y;
          for (const py of placedLabelYs) {
            if (Math.abs(labelY - py) < 13) labelY = py + (labelY >= py ? 13 : -13);
          }
          placedLabelYs.push(labelY);
          return (
            <g key={si}>
              <path d={d} fill="none" stroke={col} strokeWidth="2.5" strokeDasharray={s.dash || undefined} />
              <text x={last.x + 5} y={labelY} fontSize="11.5" fontWeight="600" fill={col} dominantBaseline="middle">{yFmt(last.v)}</text>
              {hoverI != null && s.data[hoverI] != null && (
                <circle cx={xScale(hoverI)} cy={yScale(s.data[hoverI])} r="3.5" fill={col} stroke={T.surface} strokeWidth="1.5" />
              )}
            </g>
          );
        }); })()}
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

function StatCard({ icon, label, sub, value, deltas, color, T }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{ color, display: "inline-flex" }}><Icon name={icon} size={14} /></span>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.heading, lineHeight: 1.05 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 4 }}>{sub}</div>}
      {deltas && deltas.map((d, i) => <div key={i} style={{ fontSize: 12.5, marginTop: i === 0 ? 7 : 3 }}>{d}</div>)}
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

function StatusChip({ status, T }) {
  const s = status.toLowerCase();
  let bg = T.chipIdea, fg = T.chipIdeaText;
  if (s.includes("launch")) { bg = T.chipLaunched; fg = T.chipLaunchedText; }
  else if (s.includes("stall")) { bg = T.chipStalled; fg = T.chipStalledText; }
  else if (s.includes("flight")) { bg = T.chipFlight; fg = T.chipFlightText; }
  return <span style={{ background: bg, color: fg, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{status}</span>;
}

// Numbered section with lavender band header
function Section({ num, eyebrow, title, icon, T, children, collapsible, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, marginTop: 22, overflow: "hidden", background: T.surface }}>
      <div
        onClick={collapsible ? () => setOpen(!open) : undefined}
        style={{ background: T.band, padding: "14px 20px", display: "flex", alignItems: "center", gap: 14, cursor: collapsible ? "pointer" : "default" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.textFaint, letterSpacing: ".05em" }}>{num}</span>
        {icon && <span style={{ color: T.heading, display: "inline-flex" }}><Icon name={icon} size={17} /></span>}
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
      { key: "HSIA", label: "HSIA", data: CALLS_SPLIT.HSIA.offered },
      { key: "TV", label: "TV", data: CALLS_SPLIT.TV.offered },
      { key: "SHS", label: "SHS", data: DATA.callsOffered.SHS }
    ]
  },
  {
    id: "tickets", name: "Ticket rate", decimals: 2, fmt: (v) => fmtPct(v, 2), agg2025: "avg",
    rows: [...PRODUCTS, "SH+"].map((p) => ({ key: p, label: p, data: DATA.ticketRate[p] }))
  },
  {
    id: "repairs", name: "Repair / dispatch rate", decimals: 2, fmt: (v) => fmtPct(v, 2), agg2025: "avg",
    rows: [...PRODUCTS, "SH+"].map((p) => ({ key: p, label: p, data: DATA.repairRate[p] }))
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

const INIT_FILTER_KEYS = ["theme", "status", "timeline", "prime"];

// Initiatives covering a recurring-issue group, product-scoped
function initiativesCovering(product, grp) {
  return INITIATIVES.filter((it) => it.p === product && it.issues.includes(grp));
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
export default function ReliabilityScorecards() {
  const [page, setPage] = useState("home");
  const [fromIdx, setFromIdx] = useState(12); // default view: 2026 months
  const [toIdx, setToIdx] = useState(MONTHS.length - 1);
  const [scope, setScope] = useState("All");
  const [themeMode, setThemeMode] = useState("system");
  const [openTables, setOpenTables] = useState({});
  const [openPillars, setOpenPillars] = useState({}); // pillar sections default collapsed
  const NO_INIT_FILTERS = { theme: "All", status: "All", timeline: "All", prime: "All" };
  const [initFilters, setInitFilters] = useState(NO_INIT_FILTERS);

  const isDark = useIsDark(themeMode);
  const T = isDark ? DARK_THEME : LIGHT_THEME;
  const colors = isDark ? DARK_COLOR : LIGHT_COLOR;

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

  const rowVisible = (key) => scope === "All" || key === scope;

  const navItems = [
    { id: "home", label: "Overview", icon: "overview", color: T.heading },
    { id: "HSIA", label: "HSIA", icon: "hsia", color: colors.HSIA },
    { id: "TV", label: "TV", icon: "tv", color: colors.TV },
    { id: "tvplatforms", label: "Platform breakout", icon: "tv", color: colors.TV, child: true },
    { id: "SHS", label: "SHS", icon: "shs", color: colors.SHS },
    { id: "SH+", label: "SH+", icon: "shplus", color: colors["SH+"] },
    { id: "selfserve", label: "Self-serve", icon: "selfserve", color: colors.SWEEPR }
  ];

  const selectStyle = {
    background: T.surface, color: T.text, border: `1px solid ${T.borderStrong}`,
    borderRadius: 8, padding: "6px 10px", fontSize: 13, cursor: "pointer", fontFamily: FONT
  };

  const TILE_META = [
    { key: "calls", icon: "calls" }, { key: "tickets", icon: "tickets" },
    { key: "repairs", icon: "repairs" }, { key: "churn", icon: "churn" }, { key: "base", icon: "base" }
  ];

  // Executive/product tiles. deltaMode: "yoy" (overview) | "both" (product pages)
  function scopeTiles(sc) {
    if (sc === "SH+") {
      return [
        { icon: "tickets", label: "Ticket volume", data: DATA.ticketVolume["SH+"], fmt: fmtNum, dec: 0, color: colors["SH+"], goodDown: true },
        { icon: "tickets", label: "Ticket rate", data: DATA.ticketRate["SH+"], fmt: fmtPct, dec: 2, color: colors["SH+"], goodDown: true },
        { icon: "repairs", label: "Repair volume", data: DATA.repairVolume["SH+"], fmt: fmtNum, dec: 0, color: colors["SH+"], goodDown: true },
        { icon: "repairs", label: "Repair / dispatch rate", data: DATA.repairRate["SH+"], fmt: fmtPct, dec: 2, color: colors["SH+"], goodDown: true },
        { icon: "base", label: "Subscriber base", data: DATA.subBase["SH+"], fmt: fmtBig, dec: 0, color: colors["SH+"], goodDown: false }
      ];
    }
    const callsKey = sc === "All" ? "All" : sc === "SHS" ? "SHS" : "FFH";
    const callsData = CALLS_SPLIT[sc] ? CALLS_SPLIT[sc].offered : DATA.callsOffered[callsKey];
    const callsLabel = sc === "All" ? "Calls offered (all products)" : `Calls offered (${sc})`;
    return [
      { icon: "calls", label: callsLabel, data: callsData, fmt: fmtNum, dec: 0, color: CALLS_SPLIT[sc] ? colors[sc] : colors[callsKey], goodDown: true },
      { icon: "tickets", label: "Ticket rate", data: DATA.ticketRate[sc], fmt: fmtPct, dec: 2, color: colors[sc], goodDown: true },
      { icon: "repairs", label: "Repair / dispatch rate", data: DATA.repairRate[sc], fmt: fmtPct, dec: 2, color: colors[sc], goodDown: true },
      { icon: "churn", label: "Churn rate", data: DATA.churnRate[sc], fmt: fmtPct, dec: 2, color: colors[sc], goodDown: true },
      { icon: "base", label: "Subscriber base", data: DATA.subBase[sc], fmt: fmtBig, dec: 0, color: colors[sc], goodDown: false }
    ];
  }

  function TileRow({ tiles, deltaMode }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {tiles.map((tile, i) => {
          const f = rowFigures(tile.data, tile.dec, tile.goodDown);
          const deltas = [];
          if (deltaMode === "yoy") {
            deltas.push(<DeltaText key="y" d={f.yoy} T={T} suffix="vs prior yr." />);
          } else {
            deltas.push(<DeltaText key="m" d={f.mom} T={T} suffix="vs prior mo." />);
            deltas.push(<DeltaText key="y" d={f.yoy} T={T} suffix="vs prior yr." />);
          }
          return (
            <StatCard key={i} T={T} color={tile.color} icon={tile.icon}
              label={tile.label} value={tile.fmt(f.latest)} sub={f.latestMonth}
              deltas={deltas} />
          );
        })}
      </div>
    );
  }

  // Top ticket issue per product, flagged in the executive summary
  function TopIssueFlags({ prods }) {
    const withData = prods.filter((p) => LOOKER[p]);
    if (!withData.length) {
      return <p style={{ fontSize: 12.5, color: T.textFaint, margin: "14px 2px 0" }}>Ticket category detail is not yet available for {prods.join(", ")}.</p>;
    }
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12, marginTop: 14 }}>
        {withData.map((p) => {
          const t = LOOKER[p].topIssues[0];
          const worse = t.a25 != null && t.a26 > t.a25;
          return (
            <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: T.panel, border: `1px solid ${T.border}`, borderLeft: `3px solid ${colors[p]}`, borderRadius: 10, padding: "10px 14px" }}>
              <span style={{ color: colors[p], display: "inline-flex", marginTop: 2 }}><Icon name={PRODUCT_ICON[p]} size={15} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted }}>{p} · top ticket issue — Aug'26</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary, marginTop: 2 }}>{t.issue}</div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                  {t.a26.toLocaleString()} tickets
                  {t.a25 != null && (
                    <> · <span style={{ color: worse ? T.bad : T.good, fontWeight: 700 }}>{worse ? "▲" : "▼"} {yoyPctText(t.a26, t.a25)} YoY</span></>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ------------------------------ scorecard ------------------------------
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

  // ------------------------------ overview: recurring issues ------------------------------
  function RecurringIssuesTable() {
    const thBase = { padding: "10px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
    const tdBase = { padding: "9px 12px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", fontSize: 12.5 };
    const prods = (scope === "All" ? PRODUCTS : [scope]).filter((p) => LOOKER[p]);
    const rows = OVERVIEW_ISSUES.filter((r) => prods.some((p) => r[p]));
    if (!prods.length) {
      return <p style={{ fontSize: 12.5, color: T.textFaint, margin: 0 }}>Ticket category detail is not yet available for {scope}.</p>;
    }
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: "left" }}>Recurring issue</th>
              {prods.map((p) => <th key={p} style={{ ...thBase, textAlign: "right" }}>{p} · Aug'26</th>)}
              <th style={{ ...thBase, textAlign: "right" }}>Total · Aug'26</th>
              <th style={{ ...thBase, textAlign: "right" }}>YoY (vs Aug'25)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const a26 = prods.reduce((a, p) => a + (r[p] ? r[p][0] : 0), 0);
              const a25 = prods.reduce((a, p) => a + (r[p] ? r[p][1] : 0), 0);
              const d = delta(a26, a25, "", 0, true);
              return (
                <tr key={r.grp}>
                  <td style={{ ...tdBase, fontWeight: 600, color: T.textSecondary, whiteSpace: "normal" }}>{ISSUE_META[r.grp].label}</td>
                  {prods.map((p) => (
                    <td key={p} style={{ ...tdBase, textAlign: "right", color: T.text }}>{r[p] ? r[p][0].toLocaleString() : "—"}</td>
                  ))}
                  <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: T.text }}>{a26.toLocaleString()}</td>
                  <td style={{ ...tdBase, textAlign: "right", fontSize: 12.5 }}>
                    <DeltaText d={d} T={T} /> <span style={{ color: T.textFaint, fontSize: 11.5 }}>({yoyPctText(a26, a25)})</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ------------------------------ initiatives ------------------------------
  function InitiativeRows({ items }) {
    const tdBase = { padding: "9px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12.5, verticalAlign: "top" };
    const thBase = { padding: "8px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" };
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thBase}>Initiative</th>
              <th style={thBase}>Product</th>
              <th style={thBase}>Theme</th>
              <th style={thBase}>Status</th>
              <th style={thBase}>Timeline</th>
              <th style={thBase}>Prime</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.p + it.name}>
                <td style={{ ...tdBase, minWidth: 260 }}>
                  <div style={{ fontWeight: 600, color: T.textSecondary }}>{it.name}</div>
                  <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 2, whiteSpace: "normal", lineHeight: 1.45 }}>{it.desc}</div>
                </td>
                <td style={{ ...tdBase, whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: colors[it.p], fontWeight: 700, fontSize: 12 }}>
                    <Icon name={PRODUCT_ICON[it.p]} size={13} />{it.p}
                  </span>
                </td>
                <td style={{ ...tdBase, whiteSpace: "nowrap", color: T.textMuted }}>{it.theme}</td>
                <td style={{ ...tdBase, whiteSpace: "nowrap" }}><StatusChip status={it.status} T={T} /></td>
                <td style={{ ...tdBase, whiteSpace: "nowrap", color: T.textMuted }}>{it.timeline}</td>
                <td style={{ ...tdBase, whiteSpace: "nowrap", color: T.textMuted }}>{it.prime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function InitiativeFilterBar({ items }) {
    const uniq = (k) => Array.from(new Set(items.map((it) => it[k] || "—"))).sort();
    const active = INIT_FILTER_KEYS.some((k) => initFilters[k] !== "All");
    const count = items.filter((it) => INIT_FILTER_KEYS.every((k) => initFilters[k] === "All" || (it[k] || "—") === initFilters[k])).length;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, marginBottom: 14 }}>
        {INIT_FILTER_KEYS.map((k) => (
          <label key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted }}>{k}</span>
            <select value={initFilters[k]} onChange={(e) => setInitFilters((f) => ({ ...f, [k]: e.target.value }))} style={selectStyle}>
              <option value="All">All</option>
              {uniq(k).map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        ))}
        {active && (
          <button onClick={() => setInitFilters(NO_INIT_FILTERS)}
            style={{ background: "transparent", border: `1px solid ${T.borderStrong}`, color: T.textSecondary, borderRadius: 999, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
            Clear filters
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: T.textFaint, alignSelf: "center" }}>
          {count} of {items.length} initiative{items.length > 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  function PillarInitiatives() {
    const prods = scope === "All" ? ["HSIA", "TV"] : scope === "SHS" || scope === "SH+" ? [] : [scope];
    return (
      <>
        {PILLARS.map((pl) => {
          const items = INITIATIVES.filter((it) => it.pillar === pl.n && prods.includes(it.p));
          if (!items.length) return null;
          const open = !!openPillars[pl.n];
          return (
            <div key={pl.n} style={{ marginBottom: open ? 18 : 8 }}>
              <div
                onClick={() => setOpenPillars((o) => ({ ...o, [pl.n]: !o[pl.n] }))}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: open ? 8 : 0, cursor: "pointer", userSelect: "none" }}>
                <span style={{ color: T.heading, display: "inline-flex" }}><Icon name={"pillar" + pl.n} size={16} /></span>
                <div>
                  <span style={{ fontWeight: 800, color: T.heading, fontSize: 13.5 }}>{pl.n} · {pl.name}</span>
                  <span style={{ color: T.textFaint, fontSize: 12, marginLeft: 8 }}>{pl.sub}</span>
                </div>
                <span style={{ marginLeft: "auto", color: T.textMuted, fontSize: 12, fontWeight: 700 }}>{items.length} initiative{items.length > 1 ? "s" : ""}</span>
                <span style={{ color: T.textMuted, fontSize: 13, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
              </div>
              {open && <InitiativeRows items={items} />}
            </div>
          );
        })}
        {(scope === "SHS" || scope === "SH+") && (
          <p style={{ fontSize: 12.5, color: T.textFaint }}>{scope} initiatives have not been added to the source workbook yet.</p>
        )}
      </>
    );
  }

  // ------------------------------ ticket issues (per product) ------------------------------
  function TicketIssuesSection({ product }) {
    const L = LOOKER[product];
    const thBase = { padding: "9px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
    const tdBase = { padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12.5 };
    const maxA26 = Math.max(...L.topIssues.map((r) => r.a26));
    const moverCard = (title, rows, tone) => (
      <div style={{ flex: 1, minWidth: 260, background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${tone === "up" ? T.bad : T.good}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: tone === "up" ? T.bad : T.good, marginBottom: 8 }}>{title}</div>
        {rows.map((r) => (
          <div key={r.issue} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, padding: "3px 0" }}>
            <span style={{ color: T.textSecondary }}>{r.issue}</span>
            <span style={{ fontWeight: 700, color: tone === "up" ? T.bad : T.good, whiteSpace: "nowrap" }}>
              {r.delta > 0 ? "▲ +" : "▼ "}{r.delta.toLocaleString()} <span style={{ color: T.textFaint, fontWeight: 400 }}>({yoyPctText(r.a26, r.a25)})</span>
            </span>
          </div>
        ))}
      </div>
    );
    return (
      <>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
          {moverCard("Top rising issues · Aug'26 vs Aug'25", L.rising, "up")}
          {moverCard("Top falling issues · Aug'26 vs Aug'25", L.falling, "down")}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Top issues by ticket volume — Aug 2026</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: "left" }}>#</th>
                <th style={{ ...thBase, textAlign: "left" }}>Issue (Category › Sub-category)</th>
                <th style={{ ...thBase, textAlign: "right" }}>Aug'26</th>
                <th style={{ ...thBase, textAlign: "left", width: 130 }}></th>
                <th style={{ ...thBase, textAlign: "right" }}>YoY</th>
                <th style={{ ...thBase, textAlign: "left" }}>Recurring issue</th>
                <th style={{ ...thBase, textAlign: "left" }}>Initiative coverage</th>
              </tr>
            </thead>
            <tbody>
              {L.topIssues.map((r, i) => {
                const cov = initiativesCovering(product, r.grp);
                const d = delta(r.a26, r.a25 || null, "", 0, true);
                return (
                  <tr key={r.issue}>
                    <td style={{ ...tdBase, color: T.textFaint, fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ ...tdBase, fontWeight: 600, color: T.textSecondary, whiteSpace: "nowrap" }}>{r.issue}</td>
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>{r.a26.toLocaleString()}</td>
                    <td style={{ ...tdBase, padding: "8px 6px" }}>
                      <div style={{ width: `${(r.a26 / maxA26) * 100}%`, minWidth: 2, height: 9, background: colors[product], borderRadius: 3, opacity: 0.7 }} />
                    </td>
                    <td style={{ ...tdBase, textAlign: "right", whiteSpace: "nowrap" }}>
                      {r.a25 ? <><DeltaText d={d} T={T} /> <span style={{ color: T.textFaint, fontSize: 11.5 }}>({yoyPctText(r.a26, r.a25)})</span></> : <span style={{ color: T.textFaint }}>new</span>}
                    </td>
                    <td style={{ ...tdBase, whiteSpace: "nowrap", color: T.textMuted, fontSize: 12 }}>{r.grp === "SHS Hardware" ? "SHS hardware" : ISSUE_META[r.grp].label.split(",")[0]}</td>
                    <td style={{ ...tdBase, whiteSpace: "normal", minWidth: 190, fontSize: 12 }}>
                      {cov.length ? (
                        <span style={{ color: T.textSecondary }}>
                          <b style={{ color: T.heading }}>{cov.length}</b> — {cov.slice(0, 2).map((c) => c.name).join("; ")}{cov.length > 2 ? ` +${cov.length - 2} more` : ""}
                        </span>
                      ) : (
                        <span style={{ color: T.textFaint }}>{product === "SHS" ? "— SHS initiatives to be added" : "— no mapped initiative"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
          Looker ticket categories from the Churn Measurement 2026 workbook{product !== "SHS" ? " · initiative coverage counts initiatives tagged to the issue's recurring-issue group" : ""}. YoY compares Aug 2026 against Aug 2025.
        </p>
      </>
    );
  }

  // ------------------------------ TV platform breakout ------------------------------
  function TvPlatformBreakout() {
    const platColor = (p) => colors[p.id === "legacy" ? "LEGACY" : "OPUS"];
    const statRow = (label, text, deltaEl) => (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "5px 0", borderBottom: `1px solid ${T.border}`, fontSize: 12.5 }}>
        <span style={{ color: T.textMuted }}>{label}</span>
        <span style={{ textAlign: "right" }}>
          <b style={{ color: T.text }}>{text}</b>
          {deltaEl && <span style={{ marginLeft: 8 }}>{deltaEl}</span>}
        </span>
      </div>
    );
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 14 }}>
          {TV_PLATFORMS.map((p) => {
            const tk = rowFigures(p.tickets, 0, true);
            const tr = rowFigures(p.ticketRate, 2, true);
            const rp = rowFigures(p.repairs, 0, true);
            const rr = rowFigures(p.repairRate, 3, true);
            const bs = rowFigures(p.base, 0, false);
            const sw = rowFigures(p.swaps2026 || [], 0, true);
            const col = platColor(p);
            const swapTotal = p.swaps2026 == null ? null : p.swaps2026.filter((v) => v != null).reduce((a, b) => a + b, 0);
            return (
              <div key={p.id} style={{ background: T.surface, border: `1px solid ${T.border}`, borderTop: `3px solid ${col}`, borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ color: col, display: "inline-flex" }}><Icon name="tv" size={15} /></span>
                  <span style={{ fontWeight: 800, color: T.heading, fontSize: 14.5 }}>{p.name}</span>
                </div>
                <div style={{ fontSize: 11.5, color: T.textFaint, marginBottom: 10 }}>{p.sub}</div>
                {statRow("Subscriber base", fmtBig(bs.latest), <DeltaText d={bs.mom} T={T} suffix="MoM" />)}
                {statRow(`Tickets · ${tk.latestMonth ? shortMonth(tk.latestMonth) : ""}`, fmtNum(tk.latest), <DeltaText d={tk.yoy} T={T} suffix="YoY" />)}
                {statRow("Ticket rate (% of platform base)", fmtPct(tr.latest, 2), <DeltaText d={tr.mom} T={T} suffix="pts MoM" />)}
                {statRow(`Repairs · ${rp.latestMonth ? shortMonth(rp.latestMonth) : ""}`, fmtNum(rp.latest), <DeltaText d={rp.mom} T={T} suffix="MoM" />)}
                {statRow("Repair rate (% of platform base)", fmtPct(rr.latest, 3), <DeltaText d={rr.mom} T={T} suffix="pts MoM" />)}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "5px 0", fontSize: 12.5 }}>
                  <span style={{ color: T.textMuted }}>Swap volumes · 2026 total</span>
                  <span style={{ textAlign: "right" }}>
                    <b style={{ color: swapTotal == null ? T.textFaint : T.text }}>{swapTotal == null ? "pending" : fmtNum(swapTotal)}</b>
                    {sw.mom && <span style={{ marginLeft: 8 }}><DeltaText d={sw.mom} T={T} suffix="MoM" /></span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: T.textFaint, margin: "10px 2px 16px", lineHeight: 1.6 }}>
          Tickets: Looker Ticket Categories split by product (Optik TV (Legacy) vs TV Evolution). Repairs and base: 2026 Redwood Scorecard, Repair Tracking Detail — Legacy = IPTV West + TQ ILEC TV; TV Evolution = OPUS + PFE Vulcan - TV; the repair and base split is reported for 2026 onward, and repair figures are West-scope so rates can differ from the rolled-up TV repair rate above. Swap volumes are repair swap orders from the Tableau Swapped Orders Combined View dashboard, all technologies (Total TV = Legacy; Total OPUS = TV Evolution), Jan – Aug 2026; September is excluded as a partial month.
        </p>
        <ChartCard title="Ticket volume by platform" T={T}
          tableOpen={!!openTables["tvp-tk"]} onToggleTable={() => toggleTable("tvp-tk")}>
          <LineChart labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].tickets) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].tickets) }
          ]} yFmt={fmtNum} colors={colors} T={T} />
          <Legend items={[{ label: "Optik TV Legacy", color: colors.LEGACY }, { label: "TV Evolution", color: colors.OPUS }]} T={T} />
          {openTables["tvp-tk"] && <DataTable labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].tickets) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].tickets) }
          ]} fmt={fmtNum} T={T} />}
        </ChartCard>
        <ChartCard title="Repair volume by platform" T={T}
          tableOpen={!!openTables["tvp-rp"]} onToggleTable={() => toggleTable("tvp-rp")}
          note="Repair split reported for 2026 onward.">
          <LineChart labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].repairs) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].repairs) }
          ]} yFmt={fmtNum} colors={colors} T={T} />
          <Legend items={[{ label: "Optik TV Legacy", color: colors.LEGACY }, { label: "TV Evolution", color: colors.OPUS }]} T={T} />
          {openTables["tvp-rp"] && <DataTable labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].repairs) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].repairs) }
          ]} fmt={fmtNum} T={T} />}
        </ChartCard>
        <ChartCard title="Repair rate by platform (% of platform base)" T={T}
          tableOpen={!!openTables["tvp-rr"]} onToggleTable={() => toggleTable("tvp-rr")}>
          <LineChart labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].repairRate) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].repairRate) }
          ]} yFmt={(v) => fmtPct(v, 2)} colors={colors} T={T} />
          <Legend items={[{ label: "Optik TV Legacy", color: colors.LEGACY }, { label: "TV Evolution", color: colors.OPUS }]} T={T} />
          {openTables["tvp-rr"] && <DataTable labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].repairRate) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].repairRate) }
          ]} fmt={(v) => fmtPct(v, 3)} T={T} />}
        </ChartCard>
        <ChartCard title="Repair swap volume by platform" T={T}
          tableOpen={!!openTables["tvp-sw"]} onToggleTable={() => toggleTable("tvp-sw")}
          note="Repair swap orders across all technologies, Tableau Swapped Orders Combined View. Reported for 2026; September (partial month) is excluded.">
          <LineChart labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].swaps2026) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].swaps2026) }
          ]} yFmt={fmtNum} colors={colors} T={T} />
          <Legend items={[{ label: "Optik TV Legacy", color: colors.LEGACY }, { label: "TV Evolution", color: colors.OPUS }]} T={T} />
          {openTables["tvp-sw"] && <DataTable labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].swaps2026) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].swaps2026) }
          ]} fmt={fmtNum} T={T} />}
        </ChartCard>
        <ChartCard title="Subscriber base by platform" T={T}
          tableOpen={!!openTables["tvp-bs"]} onToggleTable={() => toggleTable("tvp-bs")}
          note="Base split reported for 2026 onward. The migration from Mediaroom to OPUS is visible in the crossing trends.">
          <LineChart labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].base) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].base) }
          ]} yFmt={fmtBig} colors={colors} T={T} />
          <Legend items={[{ label: "Optik TV Legacy", color: colors.LEGACY }, { label: "TV Evolution", color: colors.OPUS }]} T={T} />
          {openTables["tvp-bs"] && <DataTable labels={rangeMonths} seriesDefs={[
            { key: "LEGACY", label: "Optik TV Legacy", data: sliceR(TV_PLATFORMS[0].base) },
            { key: "OPUS", label: "TV Evolution", data: sliceR(TV_PLATFORMS[1].base) }
          ]} fmt={fmtNum} T={T} />}
        </ChartCard>
      </>
    );
  }

  // ------------------------------ self-serve (Sweepr) ------------------------------
  // goodDown=false: self-serve metrics improve when they rise (churn impact is the exception)
  function sweeprFig(key, dec, goodDown = false) {
    const s = SWEEPR[key];
    const li = lastIdxUpTo(s.a, toIdx);
    if (li < 0) return { latest: null };
    return {
      latest: s.a[li], latestMonth: MONTHS[li], target: s.t[li],
      vsTarget: s.t[li] != null ? delta(s.a[li], s.t[li], "", dec, goodDown) : null,
      mom: li >= 1 ? delta(s.a[li], s.a[li - 1], "", dec, goodDown) : null,
      yoy: li >= 12 ? delta(s.a[li], s.a[li - 12], "", dec, goodDown) : null
    };
  }

  function SelfServePage() {
    const col = colors.SWEEPR;
    const res = sweeprFig("resolved", 0);
    const web = sweeprFig("webAppRate", 1);
    const easy = sweeprFig("cxEasy", 2);
    const chn = sweeprFig("churn", 2, true);
    const dea = sweeprFig("deacts", 0);
    const targetSeries = (key, label) => [
      { key: "SWEEPR", label, data: sliceR(SWEEPR[key].a) },
      { key: "SWEEPR", label: "2026 target", data: sliceR(SWEEPR[key].t), dash: "7 5" }
    ];
    const targetLegend = (label) => (
      <Legend items={[{ label, color: col }, { label: "2026 target", color: col, dash: true }]} T={T} />
    );
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard T={T} color={col} icon="selfserve" label="Resolved sessions" value={fmtNum(res.latest)}
            sub={`${res.latestMonth} · target ${fmtNum(res.target)}`}
            deltas={[<DeltaText key="t" d={res.vsTarget} T={T} suffix="vs target" />, <DeltaText key="y" d={res.yoy} T={T} suffix="vs prior yr." />]} />
          <StatCard T={T} color={col} icon="tickets" label="Web/App resolution rate" value={fmtPct(web.latest, 1)}
            sub={`${web.latestMonth} · target ${fmtPct(web.target, 1)}`}
            deltas={[<DeltaText key="t" d={web.vsTarget} T={T} suffix="pts vs target" />, <DeltaText key="y" d={web.yoy} T={T} suffix="pts vs prior yr." />]} />
          <StatCard T={T} color={col} icon="cx" label="CX 'Easy to follow'" value={easy.latest == null ? "—" : easy.latest.toFixed(2)}
            sub={easy.latest == null ? undefined : `${easy.latestMonth} · target ${easy.target == null ? "—" : easy.target.toFixed(2)}`}
            deltas={[<DeltaText key="t" d={easy.vsTarget} T={T} suffix="vs target" />]} />
          <StatCard T={T} color={col} icon="churn" label="Sweepr involved churn" value={fmtPct(chn.latest, 2)}
            sub={chn.latestMonth}
            deltas={[<DeltaText key="m" d={chn.mom} T={T} suffix="pts vs prior mo." />]} />
          <StatCard T={T} color={col} icon="saved" label="Deacts saved" value={fmtNum(dea.latest)}
            sub={dea.latestMonth}
            deltas={[<DeltaText key="m" d={dea.mom} T={T} suffix="vs prior mo." />]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          Self-serve customer workflows are powered by the Sweepr platform. Targets are set in the source for 2026 only; churn impact and deacts saved carry no target.
        </p>

        <Section num="01" eyebrow="Self-serve" title="Resolved sessions vs target" icon="selfserve" T={T} collapsible>
          <ChartCard title="Blended (v2) resolved sessions" T={T}
            tableOpen={!!openTables["ss-res"]} onToggleTable={() => toggleTable("ss-res")}
            note="Blended resolved sessions across self-serve workflows. The dashed series is the 2026 monthly target from the source scorecard.">
            <LineChart labels={rangeMonths} seriesDefs={targetSeries("resolved", "Resolved sessions")} yFmt={fmtNum} colors={colors} T={T} />
            {targetLegend("Resolved sessions")}
            {openTables["ss-res"] && <DataTable labels={rangeMonths} seriesDefs={[
              { key: "SWEEPR", label: "Actual", data: sliceR(SWEEPR.resolved.a) },
              { key: "SWEEPR", label: "Target", data: sliceR(SWEEPR.resolved.t) }
            ]} fmt={fmtNum} T={T} />}
          </ChartCard>
        </Section>

        <Section num="02" eyebrow="Self-serve" title="Resolution rates" icon="tickets" T={T} collapsible defaultOpen={false}>
          <ChartCard title="Web/App resolution rate" T={T}
            tableOpen={!!openTables["ss-web"]} onToggleTable={() => toggleTable("ss-web")}
            note="Share of Web/App self-serve workflow sessions resolved without an agent. 2026 target rises through the year.">
            <LineChart labels={rangeMonths} seriesDefs={targetSeries("webAppRate", "Web/App rate")} yFmt={(v) => fmtPct(v, 1)} colors={colors} T={T} />
            {targetLegend("Web/App rate")}
            {openTables["ss-web"] && <DataTable labels={rangeMonths} seriesDefs={[
              { key: "SWEEPR", label: "Actual", data: sliceR(SWEEPR.webAppRate.a) },
              { key: "SWEEPR", label: "Target", data: sliceR(SWEEPR.webAppRate.t) }
            ]} fmt={(v) => fmtPct(v, 1)} T={T} />}
          </ChartCard>
          <ChartCard title="CCAI IVR resolution rate" T={T}
            tableOpen={!!openTables["ss-ivr"]} onToggleTable={() => toggleTable("ss-ivr")}
            note="Reported Jan – Apr 2026; the source marks May 2026 onward as not available. Target is 14.0% for 2026.">
            <LineChart labels={rangeMonths} seriesDefs={targetSeries("ivrRate", "CCAI IVR rate")} yFmt={(v) => fmtPct(v, 1)} colors={colors} T={T} />
            {targetLegend("CCAI IVR rate")}
            {openTables["ss-ivr"] && <DataTable labels={rangeMonths} seriesDefs={[
              { key: "SWEEPR", label: "Actual", data: sliceR(SWEEPR.ivrRate.a) },
              { key: "SWEEPR", label: "Target", data: sliceR(SWEEPR.ivrRate.t) }
            ]} fmt={(v) => fmtPct(v, 1)} T={T} />}
          </ChartCard>
        </Section>

        <Section num="03" eyebrow="Self-serve" title="Customer experience" icon="cx" T={T} collapsible defaultOpen={false}>
          <ChartCard title="CX 'Easy to follow' score" T={T}
            tableOpen={!!openTables["ss-easy"]} onToggleTable={() => toggleTable("ss-easy")}
            note="Customer-rated ease of following the workflow. Reported from Oct 2025; the 2026 target is 4.00.">
            <LineChart labels={rangeMonths} seriesDefs={targetSeries("cxEasy", "Easy to follow")} yFmt={(v) => v.toFixed(2)} colors={colors} T={T} />
            {targetLegend("Easy to follow")}
            {openTables["ss-easy"] && <DataTable labels={rangeMonths} seriesDefs={[
              { key: "SWEEPR", label: "Actual", data: sliceR(SWEEPR.cxEasy.a) },
              { key: "SWEEPR", label: "Target", data: sliceR(SWEEPR.cxEasy.t) }
            ]} fmt={(v) => (v == null ? "—" : v.toFixed(2))} T={T} />}
          </ChartCard>
          <ChartCard title="CX 'Comment sentiment' score" T={T}
            tableOpen={!!openTables["ss-sent"]} onToggleTable={() => toggleTable("ss-sent")}
            note="Sentiment of free-text workflow comments on a negative scale — less negative is better. Reported from Oct 2025; the 2026 target is -0.50.">
            <LineChart labels={rangeMonths} seriesDefs={targetSeries("cxSent", "Comment sentiment")} yFmt={(v) => v.toFixed(2)} colors={colors} T={T} />
            {targetLegend("Comment sentiment")}
            {openTables["ss-sent"] && <DataTable labels={rangeMonths} seriesDefs={[
              { key: "SWEEPR", label: "Actual", data: sliceR(SWEEPR.cxSent.a) },
              { key: "SWEEPR", label: "Target", data: sliceR(SWEEPR.cxSent.t) }
            ]} fmt={(v) => (v == null ? "—" : v.toFixed(2))} T={T} />}
          </ChartCard>
        </Section>

        <Section num="04" eyebrow="Self-serve" title="Churn impact" icon="saved" T={T} collapsible defaultOpen={false}>
          <ChartCard title="Sweepr involved churn rate" T={T}
            tableOpen={!!openTables["ss-chn"]} onToggleTable={() => toggleTable("ss-chn")}
            note="Churn rate among customers whose journey involved a Sweepr workflow. Reported for 2026 only; no target is set in the source.">
            <LineChart labels={rangeMonths} seriesDefs={[{ key: "SWEEPR", label: "Churn rate", data: sliceR(SWEEPR.churn.a) }]} yFmt={(v) => fmtPct(v, 2)} colors={colors} T={T} />
            {openTables["ss-chn"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: "SWEEPR", label: "Churn rate", data: sliceR(SWEEPR.churn.a) }]} fmt={(v) => fmtPct(v, 2)} T={T} />}
          </ChartCard>
          <ChartCard title="Deacts saved" T={T}
            tableOpen={!!openTables["ss-dea"]} onToggleTable={() => toggleTable("ss-dea")}
            note="Deactivations avoided through self-serve workflow saves. Reported for 2026 only; no target is set in the source.">
            <LineChart labels={rangeMonths} seriesDefs={[{ key: "SWEEPR", label: "Deacts saved", data: sliceR(SWEEPR.deacts.a) }]} yFmt={fmtNum} colors={colors} T={T} />
            {openTables["ss-dea"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: "SWEEPR", label: "Deacts saved", data: sliceR(SWEEPR.deacts.a) }]} fmt={fmtNum} T={T} />}
          </ChartCard>
        </Section>
      </>
    );
  }

  // ------------------------------ pages ------------------------------
  function HomePage() {
    return (
      <>
        <Section num="01" eyebrow="Executive summary" title={scope === "All" ? "All products at a glance" : `${scope} at a glance`} icon="overview" T={T} collapsible>
          <TileRow tiles={scopeTiles(scope)} deltaMode="yoy" />
          {scope === "All" && (() => {
            const res = sweeprFig("resolved", 0);
            const dea = sweeprFig("deacts", 0);
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, marginTop: 14 }}>
                <StatCard T={T} color={colors.SWEEPR} icon="selfserve" label="Self-serve resolved sessions" value={fmtNum(res.latest)}
                  sub={`${res.latestMonth} · target ${fmtNum(res.target)} · Sweepr workflows`}
                  deltas={[<DeltaText key="t" d={res.vsTarget} T={T} suffix="vs target" />]} />
                <StatCard T={T} color={colors.SWEEPR} icon="saved" label="Self-serve deacts saved" value={fmtNum(dea.latest)}
                  sub={`${dea.latestMonth} · Sweepr workflows`}
                  deltas={[<DeltaText key="m" d={dea.mom} T={T} suffix="vs prior mo." />]} />
              </div>
            );
          })()}
          <TopIssueFlags prods={scope === "All" ? PRODUCTS : [scope]} />
          <p style={{ fontSize: 12.5, color: T.textFaint, marginTop: 14, lineHeight: 1.6, marginBottom: 0 }}>
            Comparisons are year-over-year at the end of the selected range. Latest reported month: <b style={{ color: T.textSecondary }}>{MONTHS[MONTHS.length - 1]}</b> for calls, tickets, repairs and base; churn (go/national RGU) is reported through <b style={{ color: T.textSecondary }}>Jun 2026</b>.
            {scope === "All" && " All-product rates are blended: total volume over total subscriber base (churn: base-weighted mean); calls are HSIA + TV + SHS contacts offered. SH+ is reported separately (from Jul 2025) and is not yet included in the All rollup."}
            {" "}Annual churn: HSIA {DATA.annualChurn.HSIA.y2026.toFixed(2)}% 2026 YTD vs {DATA.annualChurn.HSIA.y2025.toFixed(2)}% 2025 · TV {DATA.annualChurn.TV.y2026.toFixed(2)}% vs {DATA.annualChurn.TV.y2025.toFixed(2)}% · SHS {DATA.annualChurn.SHS.y2026.toFixed(2)}% vs {DATA.annualChurn.SHS.y2025.toFixed(2)}%.
          </p>
        </Section>

        <Section num="02" eyebrow="Monthly scorecard" title="Reliability scorecard" icon="tickets" T={T} collapsible>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
            The month at the end of the selected range is shaded and marked as under review. The 2025 column is the 2025 average for rates and the 2025 total for call volumes. “—” means the source has not reported that month.
          </p>
          <ScorecardTable />
          <p style={{ fontSize: 12, color: T.textFaint, marginTop: 12, lineHeight: 1.6, marginBottom: 0 }}>
            Calls are contacts offered. HSIA and TV call series come from the TS Calls Offered by Product workbook (Actuals tabs); SHS calls come from the KPI workbook. Churn rate is first reported for Feb 2025.
          </p>
        </Section>

        <Section num="03" eyebrow="Ticket analysis" title="Tickets by recurring issue — Aug 2026" icon="issues" T={T} collapsible>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
            Looker ticket counts grouped by the five recurring issues from the cross-source reliability synthesis (perception study, VOC, onboarding, CCTS, OpenSignal and ticket/repair analysis). SHS device categories sit outside the 5-issue framework, matching the synthesis. A falling count (▼, green) is favourable.
          </p>
          <RecurringIssuesTable />
        </Section>

        <Section num="04" eyebrow="Reliability program" title="Initiatives by pillar" icon="initiatives" T={T} collapsible>
          <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
            Every initiative from the workbook's Initiatives tab, grouped under the reliability program's four pillars. Click a pillar to expand or collapse its initiatives. SHS initiatives will be added to the source later.
          </p>
          <PillarInitiatives />
        </Section>
      </>
    );
  }

  function ProductPage({ product }) {
    const hasCalls = product !== "SH+";
    const hasLooker = !!LOOKER[product];
    const split = CALLS_SPLIT[product];
    const callsOffered = split ? split.offered : DATA.callsOffered[product];
    const callsAnswered = split ? split.answered : DATA.callsAnswered[product];
    const callsTitle = `Contacts (${product})`;
    const callsNote = product === "SHS"
      ? "SHS contacts, offered vs. answered."
      : product === "HSIA"
        ? "HSIA contacts offered vs answered — TS Calls Offered by Product workbook (Actuals tabs), summing every field containing HSIA."
        : "TV contacts offered vs answered, rolled up across platforms — TS Calls Offered by Product workbook (Actuals tabs): IPTV West + TV+ (OPUS) + PFE - IPTV + TQ ILEC - IPTV.";
    const yoyChurn = DATA.annualChurn[product];
    const L = LOOKER[product];
    const prodInits = INITIATIVES.filter((it) => it.p === product);

    // Sections are numbered sequentially per product; all are collapsible and
    // only the first starts expanded. Keys force a remount on product change
    // so each page opens in its default state.
    let secNo = 0;
    const sec = (title, icon, children) => {
      secNo += 1;
      return (
        <Section key={`${product}-${title}`} num={String(secNo).padStart(2, "0")} eyebrow={product} title={title} icon={icon}
          T={T} collapsible defaultOpen={secNo === 1}>
          {children}
        </Section>
      );
    };

    return (
      <>
        <TileRow tiles={scopeTiles(product)} deltaMode="both" />
        {yoyChurn && (
          <div style={{ fontSize: 12.5, color: yoyChurn.yoyPts <= 0 ? T.good : T.bad, fontWeight: 600, margin: "10px 2px 0" }}>
            Annual churn (go/national RGU): {yoyChurn.yoyPts <= 0 ? "▼" : "▲"} {Math.abs(yoyChurn.yoyPts).toFixed(2)}pts YoY — 2026 YTD {yoyChurn.y2026.toFixed(2)}% vs 2025 {yoyChurn.y2025.toFixed(2)}%
          </div>
        )}
        {product === "TV" && (
          <div style={{ fontSize: 12.5, margin: "10px 2px 0" }}>
            <button onClick={() => setPage("tvplatforms")}
              style={{ background: "transparent", border: "none", padding: 0, color: T.heading, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: FONT, textDecoration: "underline" }}>
              Platform breakout — Optik TV Legacy vs TV Evolution →
            </button>
          </div>
        )}
        {product === "SH+" && (
          <p style={{ fontSize: 12.5, color: T.textFaint, margin: "10px 2px 0", lineHeight: 1.6 }}>
            SmartHome+ reporting starts Jul 2025 (SH+ reliability KPIs workbook). Calls, churn, ticket categories and improvement initiatives are not yet reported for SH+.
          </p>
        )}

        {hasCalls && sec("Calls", "calls",
          <ChartCard title={callsTitle} T={T}
            tableOpen={!!openTables[product + "-calls"]} onToggleTable={() => toggleTable(product + "-calls")} note={callsNote}>
            <LineChart labels={rangeMonths} seriesDefs={[
              { key: product, label: "Offered", data: sliceR(callsOffered) },
              { key: product, label: "Answered", data: sliceR(callsAnswered), dash: "7 5" }
            ]} yFmt={fmtNum} colors={colors} T={T} />
            <Legend items={[
              { label: "Offered", color: colors[product] },
              { label: "Answered", color: colors[product], dash: true }
            ]} T={T} />
            {openTables[product + "-calls"] && <DataTable labels={rangeMonths} seriesDefs={[
              { key: product, label: "Offered", data: sliceR(callsOffered) },
              { key: product, label: "Answered", data: sliceR(callsAnswered) }
            ]} fmt={fmtNum} T={T} />}
          </ChartCard>
        )}

        {sec("Tickets", "tickets",
          <>
            <ChartCard title="Ticket rate (% of sub base)" T={T}
              tableOpen={!!openTables[product + "-tr"]} onToggleTable={() => toggleTable(product + "-tr")}
              note={product === "SH+" ? "SH+ tickets are reported from Jul 2025 (SH+ reliability KPIs workbook)." : undefined}>
              <LineChart labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.ticketRate[product]) }]} yFmt={(v) => fmtPct(v, 2)} colors={colors} T={T} />
              {openTables[product + "-tr"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.ticketRate[product]) }]} fmt={(v) => fmtPct(v, 2)} T={T} />}
            </ChartCard>
            {hasLooker ? (
              <ChartCard title={`Ticket volume with top category — ${L.topCat.name}`} T={T}
                tableOpen={!!openTables[product + "-tv"]} onToggleTable={() => toggleTable(product + "-tv")}
                note={`Looker ticket categories, Churn Measurement 2026 workbook. The dashed series maps the top category (${L.topCat.name}) as a datapoint against total ${product} tickets.`}>
                <LineChart labels={rangeMonths} seriesDefs={[
                  { key: product, label: "Total tickets", data: sliceR(L.monthlyTotal) },
                  { key: product, label: `Top category: ${L.topCat.name}`, data: sliceR(L.topCat.series), dash: "7 5" }
                ]} yFmt={fmtNum} colors={colors} T={T} />
                <Legend items={[
                  { label: "Total tickets", color: colors[product] },
                  { label: `Top category: ${L.topCat.name}`, color: colors[product], dash: true }
                ]} T={T} />
                {openTables[product + "-tv"] && <DataTable labels={rangeMonths} seriesDefs={[
                  { key: product, label: "Total", data: sliceR(L.monthlyTotal) },
                  { key: product, label: L.topCat.name, data: sliceR(L.topCat.series) }
                ]} fmt={fmtNum} T={T} />}
              </ChartCard>
            ) : (
              <ChartCard title="Ticket volume" T={T}
                tableOpen={!!openTables[product + "-tv"]} onToggleTable={() => toggleTable(product + "-tv")}
                note="Ticket category detail (Looker) is not yet available for SH+, so no top-category overlay is shown.">
                <LineChart labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.ticketVolume[product]) }]} yFmt={fmtNum} colors={colors} T={T} />
                {openTables[product + "-tv"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.ticketVolume[product]) }]} fmt={fmtNum} T={T} />}
              </ChartCard>
            )}
          </>
        )}

        {hasLooker && sec("Ticket issues & movers", "issues", <TicketIssuesSection product={product} />)}

        {sec("Repairs / Dispatches", "repairs",
          <>
            <ChartCard title="Repair / dispatch rate (% of sub base)" T={T}
              tableOpen={!!openTables[product + "-rr"]} onToggleTable={() => toggleTable(product + "-rr")}
              note={product === "SH+" ? "SH+ repairs are reported from Jul 2025 (SH+ reliability KPIs workbook)." : undefined}>
              <LineChart labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.repairRate[product]) }]} yFmt={(v) => fmtPct(v, 2)} colors={colors} T={T} />
              {openTables[product + "-rr"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.repairRate[product]) }]} fmt={(v) => fmtPct(v, 2)} T={T} />}
            </ChartCard>
            <ChartCard title="Repair (dispatch) volume" T={T}
              tableOpen={!!openTables[product + "-rv"]} onToggleTable={() => toggleTable(product + "-rv")}>
              <LineChart labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.repairVolume[product]) }]} yFmt={fmtNum} colors={colors} T={T} />
              {openTables[product + "-rv"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.repairVolume[product]) }]} fmt={fmtNum} T={T} />}
            </ChartCard>
            {product === "HSIA" && (
              <div style={{ background: T.purpleLightest, border: `1px solid ${T.purpleLighter}`, borderRadius: 12, padding: "18px 20px", marginTop: 16 }}>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, color: T.heading }}>HSIA spotlight — severely degraded fibre line</h3>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: T.textMuted, maxWidth: 640 }}>
                  Share of HSIA repairs coded as severely degraded fibre line (Jun 2025 – May 2026; this table has its own reporting window in the source). Currently the single largest identified driver of HSIA repairs.
                </p>
                <LineChart labels={DATA.hsiaFibreMonths} seriesDefs={[{ key: "HSIA", label: "HSIA", data: DATA.hsiaFibrePct }]} height={190} yFmt={(v) => v.toFixed(1) + "%"} colors={colors} T={T} />
              </div>
            )}
          </>
        )}

        {product !== "SH+" && sec("Churn", "churn",
          <ChartCard title="Churn rate (go/national RGU)" T={T}
            tableOpen={!!openTables[product + "-ch"]} onToggleTable={() => toggleTable(product + "-ch")}
            note="Churn runs behind the other indicators in the source (reported through Jun 2026; Jan 2025 was never reported).">
            <LineChart labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.churnRate[product]) }]} yFmt={(v) => fmtPct(v, 2)} colors={colors} T={T} />
            {openTables[product + "-ch"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.churnRate[product]) }]} fmt={(v) => fmtPct(v, 2)} T={T} />}
          </ChartCard>
        )}

        {sec("Initiatives", "initiatives",
          prodInits.length ? (
            <>
              <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
                {product} initiatives from the workbook's Initiatives tab, with status, timeline and prime. Use the filters to narrow the list.
              </p>
              <InitiativeFilterBar items={prodInits} />
              {(() => {
                const filtered = prodInits.filter((it) =>
                  INIT_FILTER_KEYS.every((k) => initFilters[k] === "All" || (it[k] || "—") === initFilters[k])
                );
                return filtered.length ? (
                  <InitiativeRows items={filtered} />
                ) : (
                  <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 0 0" }}>No initiatives match the selected filters.</p>
                );
              })()}
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: T.textFaint, margin: 0 }}>{product} initiatives have not been added to the source workbook yet — this section will populate once they are.</p>
          )
        )}
      </>
    );
  }

  function TvPlatformsPage() {
    return (
      <Section key="tvplatforms" num="01" eyebrow="TV platforms" title="Platform breakout — Optik TV Legacy vs TV Evolution" icon="tv" T={T} collapsible>
        <TvPlatformBreakout />
      </Section>
    );
  }

  const pageTitle = page === "home"
    ? "Reliability monthly performance scorecard"
    : page === "selfserve"
      ? "Self-serve workflows scorecard"
      : page === "tvplatforms"
        ? "TV platform breakout"
        : `${page} reliability scorecard`;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: FONT }}>
      {/* Sidebar */}
      <aside style={{ width: 224, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
          <img src={TELUS_LOGO} alt="TELUS" style={{ height: 28, width: "auto", display: "block", background: isDark ? "#FFFFFF" : "transparent", borderRadius: 6, padding: isDark ? "4px 7px" : 0, boxSizing: "content-box" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 10 }}>Reliability Strategy</div>
        </div>
        <nav style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems.map((item) => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => { setPage(item.id); setInitFilters(NO_INIT_FILTERS); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  background: active ? T.navActiveBg : "transparent", color: active ? T.navActiveText : T.textSecondary,
                  border: "none", borderLeft: `3px solid ${active ? T.heading : "transparent"}`,
                  borderRadius: 8, padding: item.child ? "6px 12px 6px 32px" : "9px 12px",
                  fontSize: item.child ? 12.5 : 13.5, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: FONT
                }}>
                <span style={{ color: item.color, display: "inline-flex" }}><Icon name={item.icon} size={item.child ? 13 : 15} /></span>
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
            Source: Churn Measurement 2026 workbook (KPIs, Looker ticket categories, initiatives) · Self-serve: TCS PLT Charter scorecard (Sweepr) · SH+: SH+ reliability KPIs workbook · Jan 2025 – {MONTHS[MONTHS.length - 1]}
          </div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 32px 64px" }}>
          <Eyebrow T={T}>Product Health · Reliability{page !== "home" ? ` · ${page === "tvplatforms" ? "TV · Platforms" : page}` : ""}</Eyebrow>
          <h1 style={{ fontSize: 27, fontWeight: 700, margin: "8px 0 0", color: T.heading, letterSpacing: "-.01em" }}>{pageTitle}</h1>
          <div style={{ height: 3, width: 96, background: `linear-gradient(90deg, ${T.heading}, #66CC02)`, borderRadius: 2, margin: "12px 0 14px" }} />
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12.5, color: T.textMuted, borderBottom: `1px solid ${T.border}`, paddingBottom: 16, marginBottom: 6 }}>
            <span><b style={{ color: T.textSecondary }}>Scope</b> · {page === "selfserve"
              ? "Self-serve workflows (Sweepr): resolved sessions, resolution rates, CX, churn impact"
              : page === "tvplatforms"
                ? "TV platforms · Optik TV Legacy vs TV Evolution: base, tickets, repairs, swaps"
                : page === "SH+" || (page === "home" && scope === "SH+")
                  ? "SH+: tickets, repairs/dispatches, base (from Jul 2025)"
                  : `${page === "home" ? (scope === "All" ? "All products" : scope) : page}: calls, tickets, repairs/dispatches, churn, base, initiatives`}</span>
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
                      <span style={{ color: on ? "#fff" : colors[p], display: "inline-flex" }}><Icon name={PRODUCT_ICON[p]} size={13} /></span>
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

          {page === "home" ? <HomePage /> : page === "selfserve" ? <SelfServePage /> : page === "tvplatforms" ? <TvPlatformsPage /> : <ProductPage product={page} />}
        </div>
        <footer style={{ textAlign: "center", fontSize: 12, color: T.textFaint, padding: "0 0 24px" }}>
          Built from the Churn Measurement 2026 workbook · figures reflect the source snapshot, not a live feed
        </footer>
      </main>
    </div>
  );
}
