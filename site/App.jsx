import React, { useState, useEffect, useRef } from "react";
import ARCH_HTML from "./architecture.html?raw";
import { ARCH_DECK, ARCH_LINKS } from "./arch-deck.js";

/*
  FFH Reliability Scorecards — HSIA / TV / SHS
  Single-file React app styled after the CPR Product Health Scorecards.

  Sources:
  - "Reliability Deact KPIs" tab (main KPI table), Churn Measurement 2026
    workbook (tab now named "ReliabilityDeact KPIs"). Reporting window
    Jan 2025 – Oct 2026; churn (go/national RGU) reported through Oct 2026.
  - "HSIA/TV/SHS Looker Ticket Categories" tabs, same workbook — monthly
    ticket counts by category, Jan 2025 – Oct 2026 (replaces the earlier
    Tableau DRD feed). For HSIA the category volumes come from the
    "hsia_ticket_recategorization" tab (A9:V13: Looker ticket types rolled up
    to customer pain points); the HSIA Looker tab is used for issue-level
    context only (top issues, risers/fallers, biggest monthly riser).
  - "Initiatives" tab, same workbook — HSIA, TV and SHS initiatives grouped
    under the reliability program's four pillars and tagged to the recurring
    ticket issues (HSIA/TV from the cross-source synthesis, SHS via the
    workbook's pillar sub-themes).

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
  "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026","Jul 2026","Aug 2026","Sep 2026","Oct 2026"
];
// Latest reported month and its labels; the notes analyses run Aug to Oct 2026 and the survey
// analyses keep their own window (Jun to Aug 2026); each says so on its page.
const LATEST = "Oct 2026", LATEST_PRIOR = "Oct 2025", LATEST_SHORT = "Oct'26", LATEST_PRIOR_SHORT = "Oct'25";
const LATEST_YOY = `${LATEST_SHORT} vs ${LATEST_PRIOR_SHORT}`;
const LATEST_PREV_SHORT = "Sep'26";
// The HSIA Review lives in the Archive and is frozen at the last month it was written for (Q3 2026);
// it does not follow LATEST.
const HSIA_REVIEW_LATEST = "Sep 2026";
// The archived TV Review (tvbrief) is frozen at the figures it was written with: dashboard KPIs to September.
const TV_REVIEW_LATEST = "Sep 2026";
// KPI series the archived TV Review was written against (before the TV ticket volumes were restated to include Pik TV and the
// TV calls to include PIK). It keeps these so its prose and figures stay as they were.
const TV_REVIEW_FROZEN = { tv: [37956,37648,41170,41505,41320,36213,36392,34982,33980,41109,40866,38217,38747,34206,38519,35701,32654,33338,32369,32860,37591,37944], tr: [3.15,3.13,3.43,3.47,3.45,3.03,3.05,2.94,2.86,3.46,3.44,3.22,3.27,2.89,3.26,3.03,2.78,2.84,2.77,2.82,3.24,3.28], calls: [70985,63302,60181,57649,60110,53867,53371,55743,64459,73650,65301,65046,60792,48534,56779,52498,49128,50060,51319,53128,58481,61071] };
const LATEST_MOM = `${LATEST_SHORT} vs ${LATEST_PREV_SHORT}`;
// The Looker ticket categories (LOOKER / LOOKER_EXTRA / OVERVIEW_ISSUES) are refreshed a month
// ahead of the KPI tabs: their series run to LOOKER_LATEST and their issue tables compare
// LOOKER_LATEST with the month before and with the same month a year earlier.
const LOOKER_MONTHS = MONTHS;
const LOOKER_LATEST = "Oct 2026", LOOKER_SHORT = "Oct'26", LOOKER_PRIOR_SHORT = "Oct'25", LOOKER_PREV_SHORT = "Sep'26";
const LOOKER_MOM = `${LOOKER_SHORT} vs ${LOOKER_PREV_SHORT}`;

// Health Read commentary per product (hand-written each month; empty = none yet).
// Plain strings render as bullets. Theme entries { t, share, causes, inits, note }
// render as a card with the root causes called out first; `inits` entries that
// match an INITIATIVES name are rendered as live initiative chips (status, prime,
// timeline pulled from the register), anything else as plain text.
// `context` strings (prefixed with "@") render as the lead bullets above the themes.
const HEALTH_COMMENTARY = {
  TV: [
    "@TV tickets rose 1.1% in October to 37,944 (3.28 per 100 subscribers), 8.5% below October 2025. Legacy grew (25,442, +2.7% MoM) while TV+ eased (12,502, -2.0%), and Legacy still carries about two-thirds of the volume. Stuck on Initializing held at its September level, while video quality and channel errors were the largest movers.",
    { t: "STB No Boot › Stuck on Initializing (Legacy)", share: "5,205 tickets (-0.6% MoM) · 14% of TV tickets · the top driver for the second month",
      causes: [
        "Technician findings: gateways left 90 to 150+ days without a reboot accumulate stale NAT tables and memory leaks, causing middleware sync loss that presents as \"all STBs stuck on Initializing\" (All STBs Affected ran 2,258 in October against 2,244 in September)",
        "The rise coincides with the CloudCheck agent upgrade rolled out from 6 July to 16 August. The update included enhancements to the CloudCheck agent that allowed updates to be rolled out to the gateway without requiring a reboot",
        "The issue is strongly tied to the T3200M gateway: about 70% of All STBs Affected tickets"
      ],
      next: [
        "The InSight TV Hardware Check fix launched in October to improve diagnosis; it does not reduce the ticket volume itself",
        "The proactive gateway (sequential) reboot is the only item aimed at the mechanism; it is on hold until January 2027 because of the Q4 firmware rollout targeting security vulnerabilities, so the October level is the pre-fix baseline"
      ],
      inits: ["Sequential Reboot for Stuck on Initializing", "InSight TV Hardware Check fix"],
      note: "Flat MoM, +24% YoY; the volume has held at the September step change" },
    { t: "Video quality", share: "Stop/Stuttering/Freezing 2,813 (+21.9% MoM, +506) · Pixelization 444 (+48.5% MoM, +145)",
      causes: ["Stop/Stuttering/Freezing and Pixelization drive the rise; Video Issues is up 8.5% MoM in total (8,202 tickets), while still 15% below October 2025"],
      next: ["The Mediaroom OVQ proactive campaign restarted in October, after the Low RSSI and Low Bitrate campaign launched in August"],
      inits: ["Mediaroom OVQ Campaign Restart", "Low RSSI + Low Bitrate Proactive Campaign", "IPv4 over Wi-Fi Slow Video Start Investigation"],
      note: "The single largest TV mover in October" },
    { t: "Channel errors", share: "Channel Not Working 2,355 (+4.7% MoM, +105) · Missing Channels 2,130 (+10.6% MoM, +204)",
      causes: ["A defect temporarily preventing access to subscribed channels (fix in testing)", "Channel configuration gaps still being closed in AVS and Mediaroom"],
      inits: ["Subscribed Channel Access Defect Fix", "Channel Config Gap Closing", "Mediaroom SD Downconvert Removal", "P001 Playback Error Monitoring"],
      note: "Channel Issues up 8.2% MoM and 13% YoY; the SD downconvert removal launched in October to ease the perception of lost channels" },
    { t: "Digital Box power & boot (TV+)", share: "Digital Box › No Boot 2,253 tickets (-6.9% MoM, -166)",
      causes: ["OPUS digital box power-supply unit failures"],
      next: ["The PSU Replacement Campaign is on hold after bot issues and is set to resume on 16 November"],
      inits: ["PSU Replacement Campaign", "Revamped OPUS Migration Process", "Equipment Order Fallout Audit"],
      note: "Eased from September and 62% below October 2025" }
  ],
  // HSIA themes: { t, share, causes: [...], inits: [string | { t, sub: [...] }], note }
  HSIA: [
    { t: "Connection Instability & Disconnects", share: "57% of all HSIA tickets (31,461)",
      causes: ["Fibre degradation", "New bucket of work: 'no dataflow provisioning'", "Outages"],
      inits: ["OLT clustering fibre degradation pilot", "GPON/XGSPON Mis-tagging", "No Internet after Release Activation", "Restore Orders Profile Rebuild (after Suspend and Resume Order Fails)", "GPONe Fibre Degradation Proactive Campaign", "Pulse & initial customer comms"],
      note: "MoM drop of ~6% in tickets for October; No Dataflow is still the largest issue at 12,797 (-4.6% MoM, +36% YoY)" },
    { t: "Slow speeds", share: "24% of all HSIA tickets (13,039)",
      causes: ["Incompatible equipment / speed plans", "Customer education"],
      inits: ["DIY Revamp Live ONT Check", "Gigabit Speed Compatibility ICU Intervention Program", "Gigabit Speed & Equipment Compatibility Proactive Campaign", "Server upgrades"],
      note: "Down 1% MoM but up 40% YoY" },
    { t: "Wi-Fi coverage gaps", share: "18% of all HSIA tickets (9,915)",
      causes: ["Gateway location (customer education)", "Additional boosts"],
      inits: ["WAN Connectivity proactive campaign", "Wi-Fi Boost Down proactive campaign", "CloudCheck Wi-Fi QoE fine tuning", "Proactive add boost & poor Wi-Fi"],
      note: "Up ~5% MoM in October; Can't Connect (+292) and Disconnects (+190) were the largest risers" }
  ],
  SHS: [],
  // SH+ themes: from the SH+ Assure ticket and KPI summaries for October 2026. SH+ has no initiative register yet,
  // so the themes carry no inits. Rates are per 100 subscribers.
  "SH+": [
    "@SH+ call tickets rose 19.3% in October to 1,267 (2.00 per 100 subscribers, +0.26 MoM, -0.27 YoY) as the base grew 3.8% to 63,196. Calls offered rose 19.4% to 2,005 (3.17 per 100) and calls answered to 1,874 (2.97 per 100); dispatches fell 22.1% to 53 (0.084 per 100), a 12-month low and the only KPI to improve. September was the 12-month low for tickets and calls, so October is a rebound toward the 6-month average rather than a new trend.",
    "@Assure tickets (Agent + Technician) were 1,210, up 10.9% MoM and 53.4% YoY but 6.5% below the 6-month average of 1,294. Warranty swaps were 120 (9.9% of tickets) against 114 in September, the lowest swap rate since March; half of the swaps (61) are pairing and setup failures.",
    { t: "Self-install setup and pairing", share: "395 tickets across Outdoor, Doorbell and Indoor self-install support · 33% of all Assure tickets",
      causes: [
        "Bluetooth pairing failures: doorbells not discoverable even after a factory reset, and outdoor cameras that stopped working and had to be deleted and re-added",
        "Cameras already mounted with no onboarding guidance, and setup in the SH+ app failing",
        "Pair-failure items rose on both drivers: Outdoor self-install 87 (69 in September) and Doorbell self-install 52 (30)"
      ],
      note: "TELUS Outdoor › Self-install support 212 (-6 MoM, +63% YoY) is the largest issue in every month; Doorbell › Self-install support 138 (+10 MoM, +66% YoY)" },
    { t: "Misrouted education calls", share: "Education › General 95 tickets (+52 MoM, +121%) · second-largest issue",
      causes: [
        "About half of Education-coded tickets (50 of 111) are about internet, Wi-Fi or TV rather than SH+, so they look like calls reaching the SH+ queue in error",
        "Education › General was first used as a code in July 2026 and more than doubled from 43 in September"
      ],
      note: "The largest MoM riser in October; Education › Wi-Fi Settings also rose to 18 (10 in September)" },
    { t: "Login and access", share: "Login / Access › User Credentials 54 tickets (+31 MoM, +135%)",
      causes: [
        "Customer profile not found or mismatched in CASA, leaving customers with no access to the SH+ or My TELUS app (28 login / password tickets)",
        "TELUS Connect app migration calls rose to 26 in the smaller issue groups (12 in September), with devices missing after the move"
      ],
      note: "Back to its 6-month average (53) after a low September (23)" }
  ]
};
const CHURN_THRU = "Oct 2026";

const DATA = {
  callsOffered: {
    FFH: [159465,142526,142004,143125,143125,135582,142865,155431,181009,181144,158985,164939,149164,126282,150662,141512,142884,151340,155785,158179,151541,153567],
    SHS: [76023,62397,67525,66790,66790,63800,70137,65906,67075,64833,60210,62122,59042,55345,57385,59213,62891,61439,67285,68978,56737,59085],
    "SH+": [1509,1337,1892,1619,1523,1096,1317,1282,1185,1163,1123,1359,1355,1699,1954,1937,1808,2320,2258,1990,1679,2005]
  },
  callsAnswered: {
    FFH: [138284,120120,133061,131694,131694,126038,134277,135704,126494,123753,130237,126593,125046,117143,132142,125406,127932,135057,133053,129856,131589,131951],
    SHS: [75001,62147,67317,66382,66382,63516,69793,65288,65179,61634,57013,59662,56606,53561,55780,52123,52505,56943,60621,59636,52997,55277],
    "SH+": [1482,1323,1873,1606,1505,1080,1302,1261,1136,1094,1057,1300,1304,1651,1911,1728,1557,2192,2127,1781,1569,1874]
  },
  ticketRate: {
    HSIA: [1.99,1.93,2.22,2.27,2.29,2.26,2.43,2.43,2.30,2.36,2.42,2.38,2.43,2.13,2.22,2.42,2.50,2.61,2.59,2.70,2.63,2.56],
    TV:   [3.21,3.18,3.5,3.55,3.53,3.1,3.13,3.02,2.94,3.58,3.55,3.33,3.38,2.88,2.84,3.02,2.7,2.84,2.76,2.92,3.34,3.38],
    SHS:  [3.95,3.94,4.82,5.07,4.97,4.76,5.45,5.41,5.28,5.24,4.74,4.86,4.68,4.11,4.30,3.89,3.78,4.12,4.29,4.08,4.01,3.94],
    "SH+": [null,null,null,null,null,null,2.86,2.63,2.28,2.27,2.05,2.30,2.69,3.31,3.31,2.79,2.33,3.13,2.75,2.11,1.74,2.00]
  },
  ticketVolume: {
    HSIA: [40808,39535,45548,46629,47108,46515,50055,50097,47763,48826,50104,49406,50190,43999,46071,50134,51913,54249,53800,56018,54658,53384],
    TV:   [38734,38259,41948,42525,42244,37068,37264,35969,34924,42540,42127,39474,40067,34009,33469,35615,31780,33334,32319,34026,38821,39170],
    SHS:  [35181,35133,43173,45752,45088,43315,49570,49072,47932,47740,43331,44469,42929,37762,39505,35754,34831,38003,39651,37724,37152,36504],
    "SH+": [803,708,1005,862,784,574,702,709,646,672,690,846,934,1183,1343,1205,1073,1542,1485,1212,1062,1267]
  },
  repairRate: {
    HSIA: [0.59,0.55,0.59,0.59,0.66,0.67,0.75,0.78,0.78,0.86,0.78,0.79,0.76,0.70,0.80,0.82,0.86,0.76,0.83,0.78,0.82,0.81],
    TV:   [0.18,0.15,0.19,0.17,0.15,0.13,0.13,0.13,0.13,0.16,0.15,0.14,0.16,0.15,0.17,0.17,0.16,0.12,0.13,0.12,0.14,0.16],
    SHS:  [0.52,0.45,0.48,0.48,0.50,0.46,0.52,0.48,0.50,0.56,0.51,0.52,0.56,0.61,0.52,0.53,0.54,0.41,0.41,0.39,0.42,0.43],
    "SH+": [null,null,null,null,null,null,0.041,0.070,0.074,0.125,0.122,0.125,0.156,0.132,0.202,0.236,0.198,0.138,0.163,0.094,0.112,0.084]
  },
  repairVolume: {
    HSIA: [12155,11246,12103,12149,13550,13826,15529,16073,16207,17901,16242,16317,15966,14238,16357,17074,17856,15745,17149,16156,17096,16892],
    TV:   [2196,1787,2297,2036,1813,1578,1601,1567,1577,1901,1794,1688,1883,1728,1912,1989,1938,1409,1567,1390,1672,1810],
    SHS:  [4622,4046,4329,4309,4548,4225,4755,4326,4524,5115,4691,4749,5055,4615,4751,4894,4967,3736,3781,3653,3884,3937],
    "SH+": [null,null,null,null,null,null,10,19,21,37,41,46,54,47,82,102,91,68,88,54,68,53]
  },
  churnRate: {
    HSIA: [null,0.88,0.89,1.13,1.16,1.13,1.27,1.20,1.16,1.23,1.07,0.97,0.98,0.81,0.98,1.10,1.08,1.05,1.12,1.07,1.05,1.01],
    TV:   [null,1.12,1.13,1.33,1.36,1.31,1.50,1.41,1.37,1.46,1.35,1.19,1.28,1.05,1.24,1.33,1.29,1.30,1.44,1.42,1.41,1.33],
    SHS:  [null,1.14,1.27,1.52,1.53,1.34,1.53,1.47,1.29,1.60,1.39,1.00,1.60,1.04,1.25,1.40,1.26,1.51,1.44,1.42,1.39,1.34],
    "SH+": [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]
  },
  subBase: {
    HSIA: [2046644,2047269,2052340,2052450,2053936,2058921,2059746,2065127,2073529,2073225,2073375,2074903,2067593,2069648,2073167,2071920,2072971,2075052,2074591,2077010,2080642,2082008],
    TV:   [1205452,1201529,1199443,1196987,1196062,1194035,1191503,1189366,1187756,1188117,1188298,1186983,1184435,1182482,1180294,1178353,1175469,1172778,1169649,1165379,1161960,1158517],
    SHS:  [890445,891993,896592,901871,906328,909317,909257,907488,908288,911221,913204,915714,917354,917870,919034,919511,921166,922159,924471,925508,926318,926347],
    "SH+": [9600,10405,12336,15964,19878,21813,24524,27000,28302,29593,33619,36816,34667,35736,40608,43215,45994,49289,54000,57531,60876,63196]
  },
  // "consolidated national results" rows of the KPI tab (2026 YTD vs 2025). HSIA is the
  // West wired line (the KPI tab's HSIA base is HSIA West + TQ ILEC HS from the
  // 2026 Redwood Scorecard; PFE is reported in its own column, restated Nov 2026); TV and SHS carry national lines only.
  annualChurn: {
    HSIA: { y2026: 1.10, y2025: 1.15, yoyPts: -0.05 },
    TV:   { y2026: 1.87, y2025: 1.51, yoyPts: 0.36 },
    SHS:  { y2026: 1.39, y2025: 1.46, yoyPts: -0.07 }
  },
  // "HSIA Fibre Line Repairs" tab: repairs coded severely degraded line as % of HSIA repairs
  hsiaFibreMonths: ["Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025","Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026","Jul 2026","Aug 2026","Sep 2026"],
  hsiaFibrePct: [6.23,13.32,15.09,17.79,14.60,14.76,14.37,13.85,13.15,13.46,13.57,12.21,11.59,10.08,9.96],
  // Voice of Customer (B2B), "Reliability B2B" rows, HSIA West TCS PLT Charter and Toolkit
  // workbook, "HSIA West Scorecard" tab (rows 46-48: Internet West, SmartHome, TV; 2025 actuals in
  // I:T, 2026 actuals in AG:AO). Lower is better. SmartHome is not yet restated in the source, so
  // SHS keeps the earlier pull until that row is populated.
  b2bVoC: {
    HSIA: [23.7,23.2,20.8,19.5,20.4,22.2,22.3,21.6,18.7,20.3,21.9,18.4,22.1,20.8,21.6,20.4,20.9,20.9,20.7,21.1,20.9,null],
    TV:   [23.9,25.2,22.2,20.7,23.0,23.6,22.6,22.8,20.2,21.2,25.1,21.4,23.3,22.3,22.9,24.5,22.5,21.5,22.8,21.7,21.5,null],
    SHS:  [29.0,32.0,26.0,27.0,30.0,27.0,31.0,28.0,32.0,32.0,29.0,27.0,28.0,28.0,22.0,28.0,30.0,28.0,24.0,29.0,null,null]
  }
};

// ---------------------------------------------------------------------------
// Looker ticket categories (workbook tabs, Jan 2025 – Oct 2026, one month ahead of the KPIs). Issues are
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
  "SHS Hardware": { label: "SHS panels, sensors & devices (outside 5-issue framework)" },
  "SH+ Tickets": { label: "SH+ Assure tickets (outside 5-issue framework)" }
};
const ISSUE_ORDER = ["Connectivity", "TV", "Speed", "WiFi", "Support", "SHS Hardware"];

const LOOKER = {
  HSIA: {
    // Volume by customer pain point: HSIA Recategorization Looker tab (Look 2158),
    // Jan 2025 – Oct 2026. The Looker tab below is kept for issue-level context only.
    // Issue rows: a26 = Oct 2026, a25 = Oct 2025, prev = Sep 2026 (Looker Ticket Categories tabs).
    monthlyTotal: [41132,39847,45993,47181,48037,47357,50985,51281,49083,50409,51678,51903,52275,45643,48031,52494,54541,57272,57173,58789,56764,55153],
    topCat: { name: "Connection Instability & Disconnects", series: [26791,25602,29215,30068,31235,30631,33204,33263,31698,31838,31558,30713,28745,25001,26958,29915,31383,32470,33269,34889,33401,31461] },
    catSource: "recategorization",
    topIssues: [
      { issue: "Connectivity › No Dataflow", grp: "Connectivity", a26: 12797, a25: 9392, prev: 13415 },
      { issue: "Connectivity › Slow Speeds", grp: "Speed", a26: 6987, a25: 6493, prev: 6792 },
      { issue: "Connectivity › Losing Sync", grp: "Connectivity", a26: 6500, a25: 6546, prev: 6647 },
      { issue: "Connectivity › ONT Not Ranged", grp: "Connectivity", a26: 5892, a25: 7312, prev: 6453 },
      { issue: "Wireless › Can't Connect", grp: "WiFi", a26: 5493, a25: 5022, prev: 5201 },
      { issue: "Wireless › Disconnects", grp: "WiFi", a26: 4464, a25: 3834, prev: 4274 },
      { issue: "Connectivity › No Sync", grp: "Connectivity", a26: 3662, a25: 3704, prev: 4059 },
      { issue: "Wireless › Slow Speeds", grp: "Speed", a26: 3010, a25: 2998, prev: 3158 }
    ],
    // rising/falling: biggest month-over-month volume movers (Oct vs Sep 2026), issues with 100+ tickets
    rising: [
      { issue: "Wireless › Can't Connect", grp: "WiFi", a26: 5493, a25: 5022, prev: 5201, delta: 292 },
      { issue: "Connectivity › Slow Speeds", grp: "Speed", a26: 6987, a25: 6493, prev: 6792, delta: 195 },
      { issue: "Wireless › Disconnects", grp: "WiFi", a26: 4464, a25: 3834, prev: 4274, delta: 190 }
    ],
    falling: [
      { issue: "Connectivity › No Dataflow", grp: "Connectivity", a26: 12797, a25: 9392, prev: 13415, delta: -618 },
      { issue: "Connectivity › ONT Not Ranged", grp: "Connectivity", a26: 5892, a25: 7312, prev: 6453, delta: -561 },
      { issue: "Connectivity › No Sync", grp: "Connectivity", a26: 3662, a25: 3704, prev: 4059, delta: -397 }
    ]
  },
  TV: {
    monthlyTotal: [38204,37850,41374,41718,41538,36433,36644,35205,34178,41448,41064,38433,38961,33096,32600,34609,30737,32174,31356,32800,37535,37942],
    topCat: { name: "STB No Boot", series: [8480,7806,8505,8569,8455,8006,8240,7379,6318,7336,7429,7366,7689,6716,6643,6938,6251,6342,6831,7203,8626,8324] },
    topIssues: [
      { issue: "STB No Boot › Stuck on Initializing", grp: "TV", a26: 5205, a25: 4190, prev: 5236 },
      { issue: "Video Issues › No Video", grp: "TV", a26: 4754, a25: 6505, prev: 4749 },
      { issue: "Recording Issues › Cannot Set Recordings", grp: "TV", a26: 3454, a25: 4095, prev: 3403 },
      { issue: "Video Issues › Stop/Stuttering/Freezing", grp: "TV", a26: 2813, a25: 2672, prev: 2307 },
      { issue: "Channel Issues › Channel Not Working", grp: "TV", a26: 2355, a25: 2134, prev: 2250 },
      { issue: "Digital Box › No Boot", grp: "TV", a26: 2253, a25: 5983, prev: 2419 },
      { issue: "Digital Box › Setup", grp: "TV", a26: 2148, a25: 1548, prev: 2143 },
      { issue: "Channel Issues › Missing Channels", grp: "TV", a26: 2128, a25: 1575, prev: 1926 }
    ],
    rising: [
      { issue: "Video Issues › Stop/Stuttering/Freezing", grp: "TV", a26: 2813, a25: 2672, prev: 2307, delta: 506 },
      { issue: "Channel Issues › Missing Channels", grp: "TV", a26: 2128, a25: 1575, prev: 1926, delta: 202 },
      { issue: "Video Issues › Pixelization", grp: "TV", a26: 444, a25: 304, prev: 299, delta: 145 }
    ],
    falling: [
      { issue: "Digital Box › No Boot", grp: "TV", a26: 2253, a25: 5983, prev: 2419, delta: -166 },
      { issue: "STB No Boot › Reboot Loop", grp: "TV", a26: 959, a25: 1105, prev: 1077, delta: -118 },
      { issue: "Remote › Programming", grp: "TV", a26: 975, a25: 1086, prev: 1057, delta: -82 }
    ]
  },
  SHS: {
    monthlyTotal: [35888,35833,43965,46504,45961,44223,50683,50121,48962,48839,44322,45432,43986,36977,34961,36722,34900,38993,40749,38702,38221,36504],
    topCat: { name: "Main Panel", series: [6940,6526,8168,8443,8119,7973,9411,9359,8674,8338,8310,8700,7936,7092,6800,7132,6765,7727,7905,7273,7089,7313] },
    topIssues: [
      { issue: "Door/Window Sensor › Troubleshoot", grp: "SHS Hardware", a26: 2041, a25: 2532, prev: 2223 },
      { issue: "Smoke Detector › Troubleshoot", grp: "SHS Hardware", a26: 2041, a25: 2337, prev: 2017 },
      { issue: "Main Panel › Education", grp: "SHS Hardware", a26: 1970, a25: 2355, prev: 2005 },
      { issue: "Main Panel › Panel status", grp: "SHS Hardware", a26: 1761, a25: 2241, prev: 1710 },
      { issue: "Door/Window Sensor › Power issues", grp: "SHS Hardware", a26: 1199, a25: 818, prev: 1053 },
      { issue: "Mobile App Self-Serve › Troubleshoot", grp: "Support", a26: 1189, a25: 2377, prev: 1412 },
      { issue: "Legacy Equipment › Legacy equipment support", grp: "SHS Hardware", a26: 1183, a25: 3467, prev: 1491 },
      { issue: "Smoke Detector › Power issues", grp: "SHS Hardware", a26: 1058, a25: 731, prev: 1236 }
    ],
    rising: [
      { issue: "Door/Window Sensor › Power issues", grp: "SHS Hardware", a26: 1199, a25: 818, prev: 1053, delta: 146 },
      { issue: "Outdoor Camera › Recording issues", grp: "SHS Hardware", a26: 1040, a25: 1750, prev: 906, delta: 134 },
      { issue: "Main Panel › Power issues", grp: "SHS Hardware", a26: 1046, a25: 865, prev: 950, delta: 96 }
    ],
    falling: [
      { issue: "Legacy Equipment › Legacy equipment support", grp: "SHS Hardware", a26: 1183, a25: 3467, prev: 1491, delta: -308 },
      { issue: "Outdoor Camera › Education", grp: "SHS Hardware", a26: 491, a25: 572, prev: 731, delta: -240 },
      { issue: "Mobile App Self-Serve › Troubleshoot", grp: "Support", a26: 1189, a25: 2377, prev: 1412, delta: -223 }
    ]
  },
  "SH+": {
    // SH+ Assure tickets (Agent + Technician, de-duplicated on Trouble Ticket ID) from the SH+ Assure Ticket_Month CSVs,
    // Sep 2025 - Oct 2026 (earlier months are not reported). Totals differ from the KPI scorecard's Call Tickets.
    // Issues are Trouble Code 2 › Trouble Code 3; categories are Trouble Code 2. a26 = Oct 2026, a25 = Oct 2025, prev = Sep 2026.
    monthlyTotal: [null,null,null,null,null,null,null,null,732,789,782,958,1023,1139,1387,1234,1091,1529,1499,1321,1091,1210],
    topCat: { name: "TELUS Outdoor", series: [null,null,null,null,null,null,null,null,347,332,302,349,384,383,574,438,450,638,734,521,453,439] },
    catSource: "assure",
    topIssues: [
      { issue: "TELUS Outdoor › Self-install support", grp: "SH+ Tickets", a26: 212, a25: 130, prev: 218 },
      { issue: "TELUS Doorbell › Self-install support", grp: "SH+ Tickets", a26: 138, a25: 83, prev: 128 },
      { issue: "Education › General", grp: "SH+ Tickets", a26: 95, a25: 0, prev: 43 },
      { issue: "TELUS Outdoor › Camera Not Recording", grp: "SH+ Tickets", a26: 66, a25: 43, prev: 81 },
      { issue: "Login / Access › User Credentials", grp: "SH+ Tickets", a26: 54, a25: 32, prev: 23 },
      { issue: "TELUS Doorbell › Camera Not Recording", grp: "SH+ Tickets", a26: 50, a25: 40, prev: 72 },
      { issue: "TELUS Indoor › Self-install support", grp: "SH+ Tickets", a26: 45, a25: 26, prev: 50 },
      { issue: "TELUS Outdoor › Product Education", grp: "SH+ Tickets", a26: 43, a25: 55, prev: 53 }
    ],
    rising: [
      { issue: "Education › General", grp: "SH+ Tickets", a26: 95, a25: 0, prev: 43, delta: 52 },
      { issue: "Login / Access › User Credentials", grp: "SH+ Tickets", a26: 54, a25: 32, prev: 23, delta: 31 },
      { issue: "TELUS Doorbell › Self-install support", grp: "SH+ Tickets", a26: 138, a25: 83, prev: 128, delta: 10 }
    ],
    falling: [
      { issue: "TELUS Doorbell › Camera Not Recording", grp: "SH+ Tickets", a26: 50, a25: 40, prev: 72, delta: -22 },
      { issue: "TELUS Outdoor › Camera Not Recording", grp: "SH+ Tickets", a26: 66, a25: 43, prev: 81, delta: -15 },
      { issue: "TELUS Outdoor › Product Education", grp: "SH+ Tickets", a26: 43, a25: 55, prev: 53, delta: -10 }
    ],
    cats: [{"name":"TELUS Outdoor","series":[null,null,null,null,null,null,null,null,347,332,302,349,384,383,574,438,450,638,734,521,453,439]},{"name":"TELUS Doorbell","series":[null,null,null,null,null,null,null,null,256,254,247,301,337,313,388,437,351,565,437,409,335,326]},{"name":"Education","series":[null,null,null,null,null,null,null,null,0,0,0,0,0,0,0,0,0,0,9,54,53,113]},{"name":"Login / Access","series":[null,null,null,null,null,null,null,null,0,79,94,119,102,220,169,146,124,127,102,121,61,107]},{"name":"TELUS Indoor","series":[null,null,null,null,null,null,null,null,67,68,91,106,104,91,148,139,119,166,160,135,106,105]},{"name":"Other categories","series":[null,null,null,null,null,null,null,null,62,56,48,83,96,132,108,74,47,33,57,81,83,120]}],
    risers: {"Jan 2026":{"issue":"TELUS Indoor › Self-install support","pct":34.2,"from":38,"to":51},"Feb 2026":{"issue":"Login / Access › App Error","pct":232,"from":25,"to":83},"Mar 2026":{"issue":"TELUS Indoor › Self-install support","pct":81.6,"from":49,"to":89},"Apr 2026":{"issue":"TELUS Doorbell › Chime issues","pct":52.4,"from":21,"to":32},"May 2026":{"issue":"TELUS Outdoor › Camera Not Recording","pct":36.4,"from":44,"to":60},"Jun 2026":{"issue":"TELUS Indoor › Self-install support","pct":128.6,"from":42,"to":96},"Jul 2026":{"issue":"TELUS Outdoor › Existing defect","pct":61.9,"from":21,"to":34},"Aug 2026":{"issue":"Login / Access › Account Provisioning","pct":83.3,"from":24,"to":44},"Sep 2026":{"issue":"TELUS Doorbell › Product Education","pct":15.2,"from":33,"to":38},"Oct 2026":{"issue":"Login / Access › User Credentials","pct":134.8,"from":23,"to":54}}
  }
};
// HSIA: hsia_ticket_recategorization pain points (Connection Instability & Disconnects → Connectivity,
// Slow Speeds → Speed, WiFi Coverage Gaps → WiFi, Other → Support). TV/SHS: Looker Category 1 groups.
// Values are [Oct 2026, Oct 2025]. TV Support = Apps + Abandon + Mobile App; SHS Support =
// Mobile App Self-Serve + CMS inquiry + Abandon + Webpage Portal Self-Serve + Repair appointment.
const OVERVIEW_ISSUES = [
  { grp: "Connectivity", HSIA: [31461, 31838], TV: null, SHS: null },
  { grp: "TV", HSIA: null, TV: [36384, 39451], SHS: null },
  { grp: "Speed", HSIA: [13039, 9289], TV: null, SHS: null },
  { grp: "WiFi", HSIA: [9915, 8799], TV: null, SHS: null },
  { grp: "Support", HSIA: [738, 483], TV: [1560, 1996], SHS: [4853, 9429] },
  { grp: "SHS Hardware", HSIA: null, TV: null, SHS: [31651, 39409] }
];
// Category stacks (Jan 2025 – Oct 2026, aligned with LOOKER_MONTHS): HSIA uses the four customer
// pain points from the HSIA Recategorization Looker tab; TV and SHS use the Looker Category 1 groups (top 5 by Oct 2026 + other). Risers are the biggest
// month-over-month percentage riser among Looker Category 1 › 2 issues with at least 100 tickets in
// the prior month (2026); for HSIA these remain Looker context.
const LOOKER_EXTRA = {"HSIA":{"cats":[{"name":"Connection Instability & Disconnects","series":[26791,25602,29215,30068,31235,30631,33204,33263,31698,31838,31558,30713,28745,25001,26958,29915,31383,32470,33269,34889,33401,31461]},{"name":"Slow Speeds","series":[6299,5957,7080,7638,7677,7747,8290,8723,8710,9289,9937,10927,12226,10649,11089,11906,12515,13302,12812,13095,13190,13039]},{"name":"WiFi Coverage Gaps","series":[7132,7106,8457,8027,8007,8273,8916,8825,8193,8799,9701,9810,10704,9470,9365,10018,9845,10583,10058,9879,9417,9915]},{"name":"Other","series":[910,1182,1241,1448,1118,706,575,470,482,483,482,453,600,523,619,655,798,917,1034,926,756,738]}],"risers":{"Jan 2026":{"issue":"Connectivity › Incompatible Equipment","pct":64.0,"from":1400,"to":2296},"Mar 2026":{"issue":"Abandon › Abandon","pct":20.7,"from":522,"to":630},"Apr 2026":{"issue":"Connectivity › Losing Sync","pct":20.0,"from":5362,"to":6435},"May 2026":{"issue":"Abandon › Abandon","pct":19.2,"from":663,"to":790},"Jun 2026":{"issue":"Wireless › Slow Speeds","pct":12.7,"from":3394,"to":3825},"Jul 2026":{"issue":"Incompatible Equipment › Incompatible","pct":85.9,"from":909,"to":1690},"Aug 2026":{"issue":"Incompatible Equipment › Incompatible","pct":20.5,"from":1690,"to":2037},"Sep 2026":{"issue":"Incompatible Equipment › Incompatible","pct":6.1,"from":2037,"to":2162},"Oct 2026":{"issue":"Wireless › Can't Connect","pct":5.6,"from":5201,"to":5493}}},"TV":{"cats":[{"name":"STB No Boot","series":[8480,7806,8505,8569,8455,8006,8240,7379,6318,7336,7429,7366,7689,6716,6643,6938,6251,6342,6831,7203,8626,8324]},{"name":"Video Issues","series":[9774,9626,10568,10598,9887,9110,8974,8752,8272,9625,8959,7956,8548,7190,6984,7010,6831,6961,6823,6739,7558,8202]},{"name":"Recording Issues","series":[6674,6508,7897,7252,6668,5351,5449,5034,5008,5988,5973,5227,6249,5386,5352,5389,4249,4068,4673,4675,5115,5264]},{"name":"Channel Issues","series":[2761,3003,2667,3543,4656,3169,3075,2970,2966,4354,3214,3757,3398,3136,3574,5031,4155,4701,3409,3504,4559,4933]},{"name":"Digital Box","series":[4238,4327,4596,4613,4476,4724,4647,5286,6400,7885,7189,6630,5494,4292,3903,3950,3699,4336,3806,4373,4923,4776]},{"name":"Other categories","series":[6277,6580,7141,7143,7396,6073,6259,5784,5214,6260,8300,7497,7583,6376,6144,6291,5552,5766,5814,6306,6754,6443]}],"risers":{"Jan 2026":{"issue":"Audio Issues › Distorted Audio","pct":45.3,"from":161,"to":234},"Feb 2026":{"issue":"TV Features › Restart TV","pct":65.0,"from":117,"to":193},"Mar 2026":{"issue":"Abandon › Abandon","pct":45.2,"from":188,"to":273},"Apr 2026":{"issue":"Channel Issues › Channel Not Working","pct":58.2,"from":1735,"to":2744},"May 2026":{"issue":"STB No Boot › Stuck on PVR is Starting","pct":23.3,"from":318,"to":392},"Jun 2026":{"issue":"Channel Issues › Manage My Channels","pct":33.7,"from":460,"to":615},"Jul 2026":{"issue":"STB No Boot › Registration Code","pct":27.3,"from":297,"to":378},"Aug 2026":{"issue":"TV Features › Restart TV","pct":40.7,"from":113,"to":159},"Sep 2026":{"issue":"HS & TV Affected › No Dataflow","pct":51.3,"from":150,"to":227},"Oct 2026":{"issue":"Apps › Prime Video","pct":49.5,"from":105,"to":157}}},"SHS":{"cats":[{"name":"Main Panel","series":[6940,6526,8168,8443,8119,7973,9411,9359,8674,8338,8310,8700,7936,7092,6800,7132,6765,7727,7905,7273,7089,7313]},{"name":"Smoke Detector","series":[2576,2787,3356,3357,3282,3295,3986,4066,3967,4144,3630,3757,3672,3228,3064,3359,3047,3581,3956,4588,4819,4653]},{"name":"Door/Window Sensor","series":[4565,4521,4617,4364,4092,3757,4144,4123,4345,4586,4596,5765,5556,4468,4000,4224,4194,4183,4501,4324,4715,4562]},{"name":"Outdoor Camera","series":[4464,3952,5485,6147,6572,6461,6808,6109,5672,6116,5652,5056,5301,4213,4085,4838,4765,5294,5674,5034,4554,4355]},{"name":"Doorbell Camera","series":[4136,4141,4667,5012,4857,4626,5125,4683,4437,4315,3998,4133,4002,3241,3304,3610,3457,3883,4013,3643,3820,3491]},{"name":"Other categories","series":[13207,13906,17672,19181,19039,18111,21209,21781,21867,21340,18136,18021,17519,14735,13708,13559,12672,14325,14700,13840,13224,12130]}],"risers":{"Jan 2026":{"issue":"CO Detector › Education","pct":36.1,"from":155,"to":211},"Feb 2026":{"issue":"Motion Sensor › Education","pct":11.1,"from":198,"to":220},"Mar 2026":{"issue":"Webpage Portal Self-Serve › Education","pct":46.5,"from":310,"to":454},"Apr 2026":{"issue":"Main Panel › Customer unwilling to troubleshoot","pct":43.7,"from":103,"to":148},"May 2026":{"issue":"Smart thermostat › Troubleshoot","pct":45.0,"from":220,"to":319},"Jun 2026":{"issue":"Doorlock › Power issues","pct":49.0,"from":102,"to":152},"Jul 2026":{"issue":"Repair appointment › Repair appointment","pct":84.8,"from":461,"to":852},"Aug 2026":{"issue":"Smoke Detector › Power issues","pct":33.5,"from":826,"to":1103},"Sep 2026":{"issue":"Smart thermostat › Troubleshoot","pct":67.6,"from":145,"to":243},"Oct 2026":{"issue":"Indoor Camera › Recording issues","pct":20.2,"from":114,"to":137}}}};
Object.entries(LOOKER_EXTRA).forEach(([prod, x]) => Object.assign(LOOKER[prod], x));

// ---------------------------------------------------------------------------
// Initiatives (workbook "Initiatives" tab; HSIA, TV and SHS).
// pillar: 1 Instrumenting · 2 By Design · 3 Proactive · 4 Front Line —
// assignment follows the four-pillar framing from the reliability program's
// cross-source synthesis. issues: recurring-issue coverage tags.
// ---------------------------------------------------------------------------
// TV Resolution Analysis: root cause identified -> fix applied, tickets whose Agent Notes carry both a "Root cause analysis"
// line and a "Resolution" line (structured Copilot summaries). Each line is keyword-classified to one theme (first mentioned).
// Produced by analysis/tv/resolution_flows.py. links: [cause index, fix index, tickets].
const TV_RESOLUTION = {"months":["Sep 2026","Oct 2026"],"Sep 2026":{"tickets":37303,"covered":3438,"causes":[["Provisioning / subscription / account",923],["STB hardware failure",695],["Recording / PVR",422],["Wi-Fi / wireless STB",235],["Extended uptime / cache or buffer",207],["Remote / pairing / batteries",203],["Customer set-up (TV input, power, HDMI)",141],["Cabling / coax / splitter",112],["Line / ONT / fibre",98],["Packet loss / multicast drops",71],["Bandwidth / congestion",13],["Active area outage",1],["Other",317]],"fixes":[["Replaced / shipped a new STB",852],["Resolved remotely (action not named)",673],["Reboot (ONT / modem / STB)",548],["Education / how-to",288],["Wired / moved / reconnected / Wi-Fi change",261],["Refresh / sync / provisioning fix",239],["Escalated (Tier 2 / outage team)",217],["Technician dispatch",202],["Other",158]],"links":[[1,0,517],[0,1,201],[0,2,162],[0,5,162],[0,6,133],[2,1,125],[4,2,97],[2,0,88],[0,3,78],[12,1,77],[2,2,77],[0,0,66],[4,1,61],[0,8,58],[6,4,57],[12,2,53],[12,3,50],[3,1,50],[5,1,50],[3,4,48],[1,7,48],[5,0,47],[3,2,42],[3,0,39],[12,0,38],[12,8,36],[0,7,33],[6,1,32],[2,3,31],[1,2,30],[1,1,30],[0,4,30],[7,4,30],[2,5,29],[5,3,29],[8,2,28],[6,3,27],[12,7,25],[9,2,25],[7,1,25],[1,4,25],[5,7,23],[2,6,23],[2,4,21],[3,3,20],[8,7,20],[9,0,20],[1,3,20],[5,4,19],[12,5,17],[2,8,16],[8,1,16],[3,7,16],[5,2,15],[7,0,15],[12,4,15],[4,3,14],[1,6,13],[2,7,12],[4,8,12],[7,2,11],[7,3,10],[8,6,10],[7,7,9],[5,8,9],[3,8,9],[4,0,8],[1,8,8],[8,0,7],[9,6,7],[8,4,7],[3,6,7],[6,7,7],[12,6,6],[6,2,6],[5,5,6],[7,6,6],[5,6,5],[6,0,5],[9,4,5],[9,7,5],[1,5,4],[8,5,4],[4,4,4],[3,5,4],[4,6,4],[4,5,4],[9,3,4],[6,5,3],[8,3,3],[8,8,3],[7,8,3],[6,8,3],[4,7,3],[7,5,3],[10,1,3],[9,5,2],[10,6,2],[10,3,2],[10,0,2],[10,2,2],[9,1,2],[10,5,1],[10,7,1],[6,6,1],[9,8,1],[11,1,1]]},"Oct 2026":{"tickets":36667,"covered":3215,"causes":[["Provisioning / subscription / account",895],["STB hardware failure",613],["Recording / PVR",417],["Wi-Fi / wireless STB",250],["Remote / pairing / batteries",181],["Extended uptime / cache or buffer",160],["Cabling / coax / splitter",132],["Customer set-up (TV input, power, HDMI)",122],["Line / ONT / fibre",110],["Packet loss / multicast drops",68],["Bandwidth / congestion",15],["Active area outage",12],["Other",240]],"fixes":[["Replaced / shipped a new STB",776],["Resolved remotely (action not named)",589],["Reboot (ONT / modem / STB)",485],["Wired / moved / reconnected / Wi-Fi change",297],["Education / how-to",273],["Escalated (Tier 2 / outage team)",229],["Refresh / sync / provisioning fix",208],["Technician dispatch",177],["Other",181]],"links":[[1,0,438],[0,1,181],[0,2,157],[0,5,149],[0,6,123],[2,1,96],[2,0,85],[2,2,81],[0,0,75],[0,4,72],[5,2,72],[0,8,64],[3,3,64],[12,1,56],[7,3,55],[4,1,52],[12,4,51],[4,0,48],[3,1,45],[5,1,43],[0,7,42],[2,6,40],[6,3,40],[3,0,40],[3,2,39],[1,7,39],[8,2,34],[1,2,33],[0,3,32],[12,8,32],[2,4,31],[12,2,30],[7,1,30],[1,1,27],[1,3,26],[1,4,25],[8,1,25],[6,0,24],[6,1,23],[2,3,23],[2,5,22],[9,2,21],[2,8,20],[4,4,20],[12,0,20],[12,3,19],[3,4,19],[2,7,19],[3,8,19],[4,3,17],[3,7,15],[9,0,15],[7,4,15],[6,7,15],[8,0,14],[4,8,14],[12,5,13],[4,7,12],[5,6,11],[1,5,11],[6,4,11],[9,7,10],[12,6,10],[12,7,9],[5,3,9],[8,5,9],[1,8,9],[6,2,9],[7,0,8],[5,0,8],[8,7,8],[5,4,8],[4,6,8],[9,1,7],[3,5,7],[4,5,7],[8,3,7],[5,8,6],[8,4,6],[9,4,6],[11,4,6],[8,6,5],[7,7,5],[1,6,5],[9,3,5],[7,8,5],[6,8,5],[10,2,4],[6,5,4],[10,8,4],[4,2,3],[10,4,3],[5,7,3],[11,5,3],[9,5,2],[11,1,2],[10,1,2],[8,8,2],[3,6,2],[7,6,2],[7,2,1],[6,6,1],[10,5,1],[10,0,1],[11,2,1],[9,6,1],[7,5,1],[9,8,1]]}};

// HSIA Resolution Analysis: same method as TV_RESOLUTION, with HSIA themes. Produced by analysis/hsia/resolution_flows.py.
const HSIA_RESOLUTION = {"months":["Sep 2026","Oct 2026"],"Sep 2026":{"tickets":56764,"covered":4929,"causes":[["Gateway / modem fault or uptime",1082],["Wi-Fi coverage / interference",962],["Fibre degraded / light level",811],["Provisioning / order / backend",413],["Copper / DSL line quality",297],["Cabling / inside wiring",244],["Dataflow / sync loss (cause not isolated)",232],["Outage / network repair",231],["Customer device / software",224],["Speed / plan mismatch",132],["ONT hardware limit or fault",87],["Other",214]],"fixes":[["Technician dispatch",1367],["Wi-Fi optimisation (placement, channel, booster)",803],["Reboot / reset",645],["Escalated (Tier 2 / CORE / PIWS)",630],["Network repair completed",389],["Education / advice",371],["Equipment replaced / shipped",203],["Resolved remotely (action not named)",198],["Refresh / re-provisioning",130],["Pending / unresolved",58],["Other",135]],"links":[[2,0,572],[1,1,464],[0,2,322],[0,0,187],[3,3,152],[0,4,135],[4,0,123],[1,0,122],[0,1,112],[0,3,101],[1,2,97],[4,3,97],[1,5,86],[0,6,82],[6,3,81],[7,0,73],[2,3,70],[7,5,68],[8,1,60],[2,2,59],[5,4,56],[11,0,56],[5,0,55],[5,1,54],[0,5,52],[3,0,52],[6,0,51],[3,8,48],[1,7,45],[1,3,45],[10,0,44],[2,4,39],[0,7,39],[8,5,38],[3,2,38],[9,5,37],[6,2,34],[1,6,34],[3,5,32],[11,7,32],[6,4,31],[8,2,31],[1,10,30],[3,4,29],[11,1,27],[1,4,26],[9,3,25],[7,4,25],[0,8,23],[11,5,23],[0,10,22],[3,1,20],[8,3,20],[9,1,20],[4,2,19],[5,2,19],[7,3,19],[2,1,19],[8,7,17],[11,10,17],[8,0,16],[9,0,16],[10,6,16],[11,4,15],[11,6,15],[3,10,14],[3,7,13],[7,9,13],[6,8,13],[5,6,13],[2,8,12],[2,5,12],[2,10,12],[5,5,12],[9,10,12],[11,2,12],[4,1,12],[4,8,12],[6,7,12],[8,4,11],[5,7,11],[4,4,10],[8,10,10],[10,4,10],[4,5,9],[7,7,9],[9,6,9],[11,3,9],[3,6,9],[2,7,9],[1,9,9],[8,6,9],[5,3,8],[8,9,7],[7,10,7],[0,9,7],[7,2,7],[5,10,6],[5,8,6],[3,9,6],[10,1,6],[9,7,5],[11,8,5],[4,6,5],[2,6,5],[4,10,5],[6,1,5],[8,8,5],[7,6,5],[7,1,4],[5,9,4],[9,2,4],[1,8,4],[11,9,3],[6,9,3],[10,2,3],[4,7,3],[10,3,3],[10,7,3],[9,9,2],[9,4,2],[4,9,2],[2,9,2],[6,6,1],[7,8,1],[10,8,1],[6,5,1],[10,5,1]]},"Oct 2026":{"tickets":53440,"covered":4209,"causes":[["Gateway / modem fault or uptime",912],["Wi-Fi coverage / interference",862],["Fibre degraded / light level",687],["Provisioning / order / backend",343],["Copper / DSL line quality",236],["Customer device / software",218],["Cabling / inside wiring",203],["Outage / network repair",197],["Dataflow / sync loss (cause not isolated)",161],["Speed / plan mismatch",105],["ONT hardware limit or fault",104],["Other",181]],"fixes":[["Technician dispatch",1124],["Wi-Fi optimisation (placement, channel, booster)",678],["Reboot / reset",556],["Escalated (Tier 2 / CORE / PIWS)",509],["Network repair completed",347],["Education / advice",267],["Resolved remotely (action not named)",233],["Equipment replaced / shipped",172],["Refresh / re-provisioning",121],["Pending / unresolved",69],["Other",133]],"links":[[2,0,461],[1,1,384],[0,2,267],[0,0,149],[0,4,127],[3,3,119],[0,1,117],[1,0,114],[4,0,102],[1,2,94],[2,3,83],[4,3,72],[1,5,67],[7,0,64],[8,3,64],[0,6,60],[0,3,58],[10,0,57],[0,7,56],[3,0,51],[6,1,50],[1,6,48],[6,0,45],[7,5,45],[3,8,44],[1,7,42],[2,2,41],[5,1,38],[5,2,36],[5,5,36],[3,4,33],[3,2,32],[6,4,32],[11,0,31],[8,4,31],[1,3,31],[11,6,30],[2,4,30],[1,10,29],[5,6,28],[0,5,28],[1,4,28],[0,8,27],[7,4,26],[8,2,25],[11,10,22],[9,3,21],[11,1,21],[11,5,20],[5,0,19],[10,7,19],[2,1,19],[9,5,19],[1,9,18],[8,0,17],[5,10,17],[0,10,16],[7,3,16],[6,5,15],[6,3,15],[3,6,15],[9,0,14],[5,3,14],[11,4,14],[2,10,14],[4,2,13],[7,2,13],[3,5,13],[8,8,12],[3,10,12],[9,1,12],[6,6,11],[6,7,11],[3,1,11],[6,2,11],[11,9,11],[2,6,10],[5,7,10],[4,1,10],[11,2,10],[2,5,10],[5,4,10],[4,5,9],[7,6,9],[6,10,9],[9,6,9],[2,9,9],[10,3,8],[11,8,8],[9,2,8],[11,3,8],[4,4,8],[10,1,8],[4,8,7],[3,7,7],[0,9,7],[5,8,7],[1,8,7],[4,6,7],[7,7,6],[9,4,6],[7,9,6],[10,2,6],[7,10,6],[3,9,6],[11,7,6],[2,7,6],[7,1,6],[9,10,5],[9,7,5],[4,7,4],[9,8,4],[8,6,4],[8,5,4],[2,8,4],[6,9,3],[5,9,3],[8,1,2],[10,4,2],[4,10,2],[9,9,2],[10,6,2],[4,9,2],[8,9,1],[10,9,1],[8,10,1],[10,5,1],[6,8,1]]}};

const PILLARS = [
  { n: 1, name: "Instrumenting Our Products for Reliability", sub: "Telemetry, detection & signal accuracy" },
  { n: 2, name: "By Design, Build Reliability Into Products", sub: "Hardware, firmware & architecture" },
  { n: 3, name: "Delight Customers by Shifting to Proactive", sub: "Proactive campaigns & outreach enablement" },
  { n: 4, name: "Enable Front Line to Resolve First Time", sub: "Agent tooling, Sweepr & first-call resolution" }
];

const INITIATIVES = [
  // ------------------------- HSIA -------------------------
  { p: "HSIA", pillar: 1, theme: "Wi-Fi", name: "Cloudcheck Fine Tuning", status: "Launched", timeline: "Aug 2026", prime: "A. Schmidt", impact: "M", issues: ["WiFi"],
    desc: "Improves the CloudCheck Wi-Fi QoE score's ability to accurately detect customers experiencing Wi-Fi degradation." },
  { p: "HSIA", pillar: 1, theme: "Speed & equipment", name: "Cloudcheck Server Upgrades & Speed Test Improvements", status: "In flight", timeline: "Oct 2026", prime: "J. Thompson", impact: "L", issues: ["Speed", "WiFi"],
    desc: "Major and minor CloudCheck server upgrades improving the accuracy of speed tests. Raises speed-test server capacity so customers can test up to 1.5 Gbps, and improves speed-test accuracy in the SmartHome+ app and the agent test tools." },
  { p: "HSIA", pillar: 1, theme: "GPON degraded fibre", name: "Fibre Check — Severely Degraded from the OLT", status: "In flight", timeline: "Oct 2026", prime: "Z. Sayhebolay", impact: "L", issues: ["Connectivity"],
    desc: "Integrates 24-hour OLT severely-degraded status into Fibre Check to resolve chronic line drops." },
  { p: "HSIA", pillar: 1, theme: "GPON degraded fibre", name: "HSIA Churn Prediction (LLM Model)", status: "In flight", timeline: "Feb 2026", prime: "I. Kochergin", impact: "M", issues: ["Connectivity"],
    desc: "LLM-powered predictive churn scoring combining network telemetry and customer ticket patterns." },
  { p: "HSIA", pillar: 1, theme: "GPON degraded fibre", name: "GPONe Geographic Analysis & Infrastructure Optimization", status: "In flight", timeline: "Jun 2026 pilot", prime: "D. Wright / Soheila / Errol", impact: "M", issues: ["Connectivity"],
    desc: "Clustering analysis of OLT/FDH degradation hotspots to guide preventive outside-plant repairs." },
  { p: "HSIA", pillar: 1, theme: "GPON degraded fibre", name: "Fibre Check — Bit Errors & Critical Alarms", status: "Ideation", timeline: "2027 capital", prime: "Z. Sayhebolay", impact: "M", issues: ["Connectivity"],
    desc: "Incorporates physical bit errors and critical optical telemetry alarms into Fibre Check diagnostics." },
  { p: "HSIA", pillar: 1, theme: "Wi-Fi", name: "Fibre Check Visual — Wi-Fi CC Recommendations", status: "Ideation", timeline: "2027 capital", prime: "Z. Sayhebolay", impact: "M", issues: ["WiFi"],
    desc: "Integrates Wi-Fi Coverage & Connectivity Index guidance directly into the Fibre Check portal." },
  { p: "HSIA", pillar: 1, theme: "Speed & equipment", name: "Enhanced Speed Test up to 10 Gbps", status: "Ideation", timeline: "2027 capital", prime: "J. Thompson", issues: ["Speed"],
    desc: "New speed-test capability to complete and prove 10 Gbps speed delivery." },
  { p: "HSIA", pillar: 2, theme: "Wi-Fi", name: "Fix Auto Channel Disabled — Firmware", status: "In flight", timeline: "Jun 2026", prime: "Rooshil", impact: "L", issues: ["WiFi"],
    desc: "Firmware remediation for the Arcadyan Boost Wi-Fi 6 auto-channel disabling defect." },
  { p: "HSIA", pillar: 2, theme: "Wi-Fi", name: "SH+ App Migration for Internet Management", status: "In flight", timeline: "Jul 2026", prime: "A. Dhanani", impact: "L", issues: ["WiFi", "Support"],
    desc: "Customer self-serve tools in the SH+ app for outage alerts, Wi-Fi management and password resets." },
  { p: "HSIA", pillar: 2, theme: "Wi-Fi", name: "HSIA Legacy Hardware Upgrades", status: "Ideation", timeline: "2027 capital", prime: "Not resourced", impact: "L", issues: ["WiFi", "Speed"],
    desc: "Targeted hardware replacement program migrating legacy Wi-Fi extenders to Wi-Fi 6 hardware." },
  { p: "HSIA", pillar: 2, theme: "Wi-Fi", name: "Wi-Fi Problematic Device Mitigation", status: "Ideation", timeline: "—", prime: "Not resourced", issues: ["WiFi"],
    desc: "Targeted telemetry investigations and firmware adjustments addressing the top ten troubled Wi-Fi devices." },
  { p: "HSIA", pillar: 2, theme: "Speed & equipment", name: "3 Gig Upgrade on TELUS.com", status: "Launched", timeline: "Aug 2026", prime: "D. Evans", impact: "L", issues: ["Speed"],
    desc: "System fix ensuring 3Gbps web orders trigger fielded XGSPON port swaps instead of software-only drops." },
  { p: "HSIA", pillar: 2, theme: "Speed & equipment", name: "DIY Revamp Live ONT Check", status: "In flight", timeline: "Nov 2026", prime: "D. Wearmouth", impact: "H", issues: ["Speed", "Connectivity"],
    desc: "Automated removal of the Quick Connect flag when no optical light is observed for 7 consecutive days." },
  { p: "HSIA", pillar: 2, theme: "Speed & equipment", name: "Speed Upgrade No Charge", status: "Ideation", timeline: "—", prime: "TBD", issues: ["Speed"],
    desc: "Software speed-upgrade program for congested cohorts to defend against competitor churn." },
  { p: "HSIA", pillar: 2, theme: "GPON degraded fibre", name: "XGSPON Light Requirements Enhancement", status: "Ideation", timeline: "Jul 2026", prime: "A. Broten", issues: ["Connectivity"],
    desc: "Refines optical-loss thresholds for XGSPON based on cable distance and bends." },
  { p: "HSIA", pillar: 2, theme: "GPON degraded fibre", name: "NGMR Build Quality Assurance", status: "Ideation", timeline: "—", prime: "A. Broten", impact: "L", issues: ["Connectivity"],
    desc: "Re-establishes suite-level optical attenuation QA standards for new growth-market builds." },
  { p: "HSIA", pillar: 2, theme: "GPON degraded fibre", name: "Professional Installs at Degraded-Fibre Addresses", status: "Ideation", timeline: "—", prime: "A. Broten", impact: "L", issues: ["Connectivity"],
    desc: "Enforces professional technician installs and move orders at addresses identified with severely degraded fibre." },
  { p: "HSIA", pillar: 2, theme: "Copper strategy", name: "Copper to Fibre Repair Intercept", status: "Launched", timeline: "Oct 2026", prime: "L. Nichols", impact: "L", issues: ["Connectivity"],
    desc: "Intercepts copper repair tickets for fibre-eligible premises and dispatches them as fibre migrations." },
  { p: "HSIA", pillar: 2, theme: "Copper strategy", name: "Copper to WHSIA Technology Change in CSR", status: "In flight", timeline: "Sep 2026", prime: "A. Tirthani", impact: "M", issues: ["Connectivity"],
    desc: "System solution for copper-to-wireless HSIA, then targeted transition of low-speed copper subscribers to Fixed Wireless during service calls." },
  { p: "HSIA", pillar: 2, theme: "Outage", name: "Service Guarantee: Internet Backup to Cellular", status: "Launched", timeline: "Jul 2026", prime: "J. Harrison", impact: "M", issues: ["Connectivity"],
    desc: "Automatic cellular failover backup during fibre outages, restoring seamlessly on recovery." },

  { p: "HSIA", pillar: 2, theme: "No dataflow provisioning", name: "GPON/XGSPON Mis-tagging", status: "In flight", timeline: "Oct 2026", prime: "A. Broten", impact: "L", issues: ["Connectivity"],
    desc: "Defect fix for connectivity tagged as GPON when it is actually XGSPON, which triggered the incorrect Disconnect WSIR flow on cancelled upgrade orders. OF-10870." },

  { p: "HSIA", pillar: 2, theme: "No dataflow provisioning", name: "No Internet after Release Activation", status: "In flight", timeline: "—", prime: "A. Broten", impact: "L", issues: ["Connectivity"],
    desc: "Defect fix for locations left marked as 'warm home' after the previous customer's service ceased, where the new order failed to recreate the WSIR. OF-11048." },

  { p: "HSIA", pillar: 2, theme: "No dataflow provisioning", name: "Restore Orders Profile Rebuild (after Suspend and Resume Order Fails)", status: "In flight", timeline: "Dec 2026", prime: "S. Di", issues: ["Connectivity"],
    desc: "For resume orders submitted in FIFA NC, gets the associated Option 82, checks whether the suspend redirect flag is removed from the WSIR and, if it is still present, applies the fix directly to the WSIR." },
  { p: "HSIA", pillar: 3, theme: "Wi-Fi", name: "Wi-Fi RouteThis RAVA Pilot Proactive Campaign", status: "Launched", timeline: "Jul 2026", prime: "F. Ahmed", impact: "L", issues: ["WiFi"],
    desc: "Scales the proactive program using RouteThis RAVA diagnostics to resolve home Wi-Fi issues before contact." },
  { p: "HSIA", pillar: 3, theme: "Wi-Fi", name: "Wi-Fi Scaling — Proactive Campaigns", status: "Launched", timeline: "Jun 2026", prime: "J. Silva", impact: "M", issues: ["WiFi"],
    desc: "Scales automated customer communications for identified Wi-Fi interference and dead zones." },
  { p: "HSIA", pillar: 3, theme: "Speed & equipment", name: "How Speed Works Campaign", status: "Ideation", timeline: "—", prime: "Not resourced", issues: ["Speed", "WiFi"],
    desc: "How speed works and Internet quality campaign, carried from sales through to support." },
  { p: "HSIA", pillar: 3, theme: "GPON degraded fibre", name: "GPONe Fibre Degradation Proactive Campaign", status: "In flight", timeline: "Aug 2026", prime: "J. Silva", impact: "M", issues: ["Connectivity"],
    desc: "Revamped proactive outreach program targeting severe degradation signatures." },
  { p: "HSIA", pillar: 3, theme: "Speed & equipment", name: "Gigabit Speed Compatibility ICU Intervention", status: "Launched", timeline: "Jun 2026", prime: "A. Broten / B. Weir", issues: ["Speed"],
    desc: "ICU outbound outreach upgrading customers on 3Gbps+ profiles to XGS-PON equipment." },

  { p: "HSIA", pillar: 3, theme: "Speed & equipment", name: "Gigabit Speed & Equipment Compatibility Proactive Campaign", status: "In flight", timeline: "Nov 2026", prime: "A. Broten / B. Weir / J. Silva", impact: "L", issues: ["Speed"],
    desc: "Works through the 2026 backlog of customers whose speed plans and equipment do not support 1.5 gig, 3 gig and 5 gig plans." },
  { p: "HSIA", pillar: 3, theme: "Copper strategy", name: "Proactive Intervention C2F Migration", status: "Launched", timeline: "Feb 2026", prime: "J. Silva", impact: "L", issues: ["Connectivity"],
    desc: "Proactive migration campaign converting chronic trouble-ticket copper lines to pure fibre." },
  { p: "HSIA", pillar: 3, theme: "Outage", name: "Pulse Cluster GUI for Outages", status: "Launched", timeline: "Feb 2026", prime: "Errol / C. Neuman", impact: "M", issues: ["Connectivity"],
    desc: "Outage-clustering interface grouping 5–10 customer disconnect events for proactive manual triage." },
  { p: "HSIA", pillar: 4, theme: "Wi-Fi", name: "Technician WiFi Certification Tool", status: "Launched", timeline: "Jun 2026", prime: "M. Webber", impact: "M", issues: ["WiFi"],
    desc: "Grows use and quality of the mobile field app guiding access-point placement, coverage mapping and Wi-Fi certification." },
  { p: "HSIA", pillar: 4, theme: "GPON degraded fibre", name: "Auto Test Tools", status: "Ideation", timeline: "2027 capital", prime: "M. Webber", impact: "H", issues: ["Connectivity"],
    desc: "Automated test tool run on every job to prove quality before the technician leaves, reducing repeat truck rolls." },
  { p: "HSIA", pillar: 4, theme: "Wi-Fi", name: "Wi-Fi RouteThis RAVA on TELUS.com", status: "In flight", timeline: "Q4 2026", prime: "A. Broten", issues: ["WiFi", "Support"],
    desc: "Exposes the RouteThis RAVA Wi-Fi AI diagnostics in the support pages on TELUS.com." },
  { p: "HSIA", pillar: 4, theme: "Speed & equipment", name: "Improve Provisioning Checks for 3 Gig in InSight", status: "In flight", timeline: "In planning", prime: "A. Broten", impact: "L", issues: ["Speed", "Support"],
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
  // notFor / pinFor: per-issue overrides of the theme-based initiative coverage in the ticket issues table
  { p: "TV", pillar: 2, theme: "Hardware", name: "PSU Replacement Campaign", status: "On Hold", timeline: "Sep 2025", prime: "D. Culp", issues: ["TV"], notFor: ["STB No Boot › Stuck on Initializing"],
    desc: "Ships replacement power-supply units for the OPUS digital box, a major driver of TV hardware tickets. On hold after bot issues; set to resume on 16 Nov." },
  { p: "TV", pillar: 2, theme: "Hardware", name: "Sequential Reboot for Stuck on Initializing", status: "On Hold", timeline: "Jan 2027", prime: "Z. Sayhebolay", issues: ["TV"], pinFor: ["STB No Boot › Stuck on Initializing"], notFor: ["Digital Box › No Boot"],
    desc: "Proactive gateway reboot to remedy Stuck on Initializing issues (sequential reboot procedure for Optik TV Legacy set-top boxes). On hold because of the Q4 firmware rollout targeting security vulnerabilities; now targeted for Jan 2027." },
  { p: "TV", pillar: 2, theme: "Hardware", name: "InSight TV Hardware Check fix", status: "Launched", timeline: "Oct 2026", prime: "Z. Sayhebolay", issues: ["TV"], pinFor: ["STB No Boot › Stuck on Initializing"],
    desc: "Fixes the InSight TV Hardware Check diagnostic used on set-top box and gateway faults." },
  { p: "TV", pillar: 2, theme: "Hardware", name: "Shipment Notification Redesign", status: "Launched", timeline: "Feb 2026", prime: "K. Liu", issues: ["TV", "Support"],
    desc: "Redesigns equipment-shipment notifications to reduce fulfilment confusion and missed activations." },
  { p: "TV", pillar: 2, theme: "Channel Issues", name: "UUID Auto Sync — Blocking Channels Fix", status: "Launched", timeline: "Mar 2026", prime: "J. Homsavath", issues: ["TV"],
    desc: "Fixes UUID mismatches that block channels, with automatic re-sync." },
  { p: "TV", pillar: 2, theme: "Recording Issues", name: "Recording Restart Issue Fix", status: "Launched", timeline: "May 2026", prime: "A. Kozyniak", issues: ["TV"],
    desc: "Fixes the recording-restart defect affecting PVR playback." },
  { p: "TV", pillar: 2, theme: "Recording Issues", name: "TTV+ Guide Filter Fix", status: "Launched", timeline: "May 2026", prime: "A. Kozyniak", issues: ["TV"],
    desc: "Fixes guide filtering defects in TELUS TV+." },
  { p: "TV", pillar: 2, theme: "Hardware", name: "Revamped OPUS Migration Process", status: "Launched", timeline: "Jun 2026", prime: "M. Ibrahim", issues: ["TV"],
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
  { p: "TV", pillar: 3, theme: "Video Quality", name: "Mediaroom OVQ Campaign Restart", status: "Launched", timeline: "Oct 2026", prime: "G. Sawa", issues: ["TV"],
    desc: "Restarts the Mediaroom (Optik TV Legacy) video-quality proactive campaign." },
  { p: "TV", pillar: 3, theme: "Onboarding", name: "AI STB Onboarding Videos", status: "In flight", timeline: "Nov 2026", prime: "C. Carter", issues: ["TV", "Support"],
    desc: "Five new AI-generated STB onboarding videos in a new Home-page swimlane helping customers with remote and UX usage." },
  { p: "TV", pillar: 3, theme: "Onboarding", name: "BYOD Support Content Update", status: "Launched", timeline: "Oct 2026", prime: "A. Kozyniak", issues: ["TV", "Support"],
    desc: "Updated all BYOD support content, including a Smart TV installation video, on telus.com/watchoptik." },
  { p: "TV", pillar: 1, theme: "Video Quality", name: "IPv4 over Wi-Fi Slow Video Start Investigation", status: "In flight", timeline: "Dec 2026", prime: "C. Carter", issues: ["TV", "WiFi"],
    desc: "Ongoing investigation into slower video start times for IPv4 customers on Wi-Fi." },
  { p: "TV", pillar: 2, theme: "Channel Issues", name: "Channel Config Gap Closing", status: "In flight", timeline: "Sep 2026", prime: "C. Carter", issues: ["TV"],
    desc: "Closes channel configuration gaps: 18 channel updates in AVS and 172 in Mediaroom before Sep 30." },
  { p: "TV", pillar: 2, theme: "Channel Issues", name: "Mediaroom SD Downconvert Removal", status: "Launched", timeline: "Oct 2026", prime: "N. Desrosiers", issues: ["TV"],
    desc: "Removes the Mediaroom SD downconvert to mitigate the perception of lost channels during migration." },
  { p: "TV", pillar: 2, theme: "Channel Issues", name: "Subscribed Channel Access Defect Fix", status: "In flight", timeline: "Nov 2026", prime: "C. Carter", issues: ["TV"],
    desc: "New defect identified temporarily preventing customers from accessing subscribed channels. Fix currently in testing." },
  { p: "TV", pillar: 4, theme: "Video Quality", name: "InSight Conviva Video Quality Metrics & Co-pilot Ingestion", status: "Ideation", timeline: "—", prime: "Z. Sayhebolay", issues: ["TV", "Support"],
    desc: "Updates InSight's Conviva video-quality metrics and feeds them into the agent co-pilot." },
  // ------------------------- SHS -------------------------
  // Workbook rows carry pillar, theme, prime and a month; status is derived
  // from the timeline (dated = In flight, undated or "explore" = Ideation).
  { p: "SHS", pillar: 1, theme: "Telemetry detection & signal accuracy", name: "On-site Wrap-up for Organic Pro-Installs (explore)", status: "Ideation", timeline: "Dec 2026", prime: "Zaki", issues: ["SHS Hardware"],
    desc: "Explores an on-site wrap-up step for organic professional installs so device health and signal are confirmed before the technician leaves." },
  { p: "SHS", pillar: 2, theme: "HW/FW & architecture", name: "App Refreshments", status: "Ideation", timeline: "—", prime: "Sindey", issues: ["Support"],
    desc: "Refresh of the SmartHome Security app experience; timeline to be confirmed." },
  { p: "SHS", pillar: 2, theme: "HW/FW & architecture", name: "ADC Camera Investigation — RCA & Recommendations", status: "In flight", timeline: "Sep 2026", prime: "Zaki", issues: ["SHS Hardware"],
    desc: "Root-cause analysis of Alarm.com camera failures with recommendations for hardware, firmware and support changes." },
  { p: "SHS", pillar: 2, theme: "HW/FW & architecture", name: "Hardware: V516 and IQ5", status: "In flight", timeline: "Nov – Dec 2026", prime: "Leroy", issues: ["SHS Hardware"],
    desc: "V516: new hardware with Bluetooth connectivity and a reconnect method when the Wi-Fi connection is lost (Dec). IQ5 panel (Nov)." },
  { p: "SHS", pillar: 2, theme: "HW/FW & architecture", name: "Firmware: V730, IQ4 v4.6.2 and V750", status: "In flight", timeline: "Sep – Oct 2026", prime: "Leroy / Rosalinda", issues: ["SHS Hardware"],
    desc: "V730 fw 05028 (launched Sep 14): automatic colour night vision in low light, better 2-way audio on long sessions, more reliable 2.4/5 GHz switching, Wi-Fi 6 interop. IQ4 fw v4.6.2 (Sep): PG+ device support, AC-power detection after interruptions, Z-Wave SmartStart, silent arming, cellular performance during outages. V750 fw v02113 (Oct): network connection and audio." },
  { p: "SHS", pillar: 3, theme: "Proactive Campaigns & outreach enablement", name: "Malfunction Sweepr Flow Update", status: "In flight", timeline: "Oct 2026", prime: "Mihaela", issues: ["SHS Hardware", "Support"],
    desc: "Updates the Sweepr self-serve flow for device malfunction so more sensor and detector faults resolve without a call." },
  { p: "SHS", pillar: 3, theme: "Proactive Campaigns & outreach enablement", name: "Legacy: 20+ Device Expansion Support", status: "In flight", timeline: "Q1 2027", prime: "Steve", issues: ["SHS Hardware"],
    desc: "Extends support coverage to more than 20 additional legacy device types." },
  { p: "SHS", pillar: 3, theme: "Proactive Campaigns & outreach enablement", name: "MSF Proactive Campaign Update — Free Shipment", status: "In flight", timeline: "Sep 2026", prime: "Zaki", issues: ["SHS Hardware", "Support"],
    desc: "Free replacement shipment for highly engaged customers with a high likelihood to churn." },
  { p: "SHS", pillar: 4, theme: "Agent Tooling, Sweepr & FCR", name: "Camera Offline PA Campaign Signature Update", status: "In flight", timeline: "Oct 2026", prime: "Brittany", issues: ["SHS Hardware"],
    desc: "Updates the proactive-alert campaign signature that detects offline cameras so outreach reaches the right customers." },
  { p: "SHS", pillar: 4, theme: "Agent Tooling, Sweepr & FCR", name: "BnM Enhanced Reporting", status: "In flight", timeline: "Oct 2026", prime: "Phil", issues: ["Support"],
    desc: "Enhanced reporting for the break-and-maintain (BnM) process to track first-call resolution and repeat contacts." },
  { p: "SHS", pillar: 4, theme: "Agent Tooling, Sweepr & FCR", name: "IQ2 → IQ4 Proactive Upgrade Pilot", status: "In flight", timeline: "Nov 2026", prime: "Zaki", issues: ["SHS Hardware"],
    desc: "Proactive panel upgrade from IQ2 to IQ4, piloted with 500 customers from October." },
  { p: "SHS", pillar: 4, theme: "Agent Tooling, Sweepr & FCR", name: "MSF Battery Replacement Links and Video Updates", status: "In flight", timeline: "Oct 2026", prime: "Patti", issues: ["SHS Hardware", "Support"],
    desc: "Affiliate links and refreshed videos for self-serve battery replacement on sensors and detectors." },
];

// ---------------------------------------------------------------------------
// Palette — HSIA/TV mode-invariant, SHS blue stepped per mode (validated on
// the adjacent pairlist in both themes). FFH never shares a chart with the
// products; "All" wears the heading purple.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Self-serve customer workflows (Sweepr) — Self Assure metrics MCP (https://self-assure-metrics-mcp.telus.gizmos.run/mcp,
// get_metric per key: resolved_sessions_ivr_web, resolution_rate_web_only, cx_easy_to_follow, cx_comment_sentiment,
// churn_rate_sweepr_involved, deacts_saved). It replaces the HSIA West Scorecard rows as the source. The CCAI IVR rate
// is not in the MCP (IVR flows were turned off on 9 Apr 2026), so its Jan to Apr actuals and the 14% target are kept.
// Arrays align with MONTHS (Jan 2025 – Oct 2026). a = actuals; t = 2026 monthly targets.
// Re-read in full each month because the source restates earlier 2026 months (the Oct 2026 pull
// restated Sweepr involved churn and deacts saved for Jan–Aug 2026).
// (the source sets targets for 2026 only; churn impact and deacts saved carry no target).
// Rates are percentages; cxEasy is a score (target 4.0); cxSent is comment sentiment
// (negative scale, target -0.50, less negative is better).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// HSIA customer sentiment — CF&R TELUS Internet survey, Jun–Aug 2026
// (1,914 / 1,934 / 2,518 respondents). Structured ratings plus the open
// verbatims (v1/v2/v3/v6 reason-for-rating, issue descriptions, chatbot).
// The performance and importance batteries are rotating modules, so they are
// point-in-time (performance Aug, importance Jul) rather than a trend.
// Produced by analysis/hsia/analyze_hsia_survey.py. Unweighted counts.
// ---------------------------------------------------------------------------
const HSS = {"months":["Jun 2026","Jul 2026","Aug 2026"],"respondents":[1914,1934,2518],"nps":{"score":[-1.4,1.2,-0.1],"promoters":[33.8,35.3,34.2],"passives":[31.1,30.6,31.4],"detractors":[35.1,34.1,34.4]},"reliability":{"top2":[58.9,55.8,57.3],"good":[23.0,25.5,23.9],"bottom2":[17.9,18.4,18.8],"bottom2N":[342,355,473],"dist":{"Excellent":[449,429,568],"Very good":[679,650,875],"Good":[440,493,601],"Fair":[212,218,288],"Poor":[130,137,185]}},"service":{"top2":[40.6,39.8,40.6],"bottom2":[32.2,32.5,30.9]},"easy":{"agree":[60.3,64.4,65.0],"disagree":[23.3,20.7,20.8],"base":[146,174,197]},"contact":{"contacted":[14.1,15.7,14.1],"issue_no_contact":[15.1,14.8,14.6],"no_issue":[65.9,65.5,66.7],"contactedN":[270,304,356],"issue_no_contactN":[289,286,367]},"churn":{"at_risk":[11.8,12.1,11.4],"downgrade":[4.2,4.6,4.2],"stay":[60.1,59.3,58.5],"upgrade":[5.9,6.8,6.1],"at_riskN":[225,234,288]},"drivers":[{"name":"Frequent loss of connection","v":[140,166,218],"pct":[40.9,46.8,46.1]},{"name":"Inconsistent Internet speeds","v":[133,125,179],"pct":[38.9,35.2,37.8]},{"name":"Slow Internet speeds","v":[119,111,152],"pct":[34.8,31.3,32.1]},{"name":"Home Wi-Fi","v":[114,119,145],"pct":[33.3,33.5,30.7]},{"name":"Interrupted video streaming","v":[83,78,121],"pct":[24.3,22.0,25.6]},{"name":"TELUS customer service","v":[71,96,107],"pct":[20.8,27.0,22.6]},{"name":"Other TELUS services","v":[45,49,85],"pct":[13.2,13.8,18.0]},{"name":"TELUS technical support","v":[52,60,67],"pct":[15.2,16.9,14.2]},{"name":"Other","v":[17,9,22],"pct":[5.0,2.5,4.7]},{"name":"TELUS email problems","v":[9,7,16],"pct":[2.6,2.0,3.4]}],"driverBase":[342,355,473],"attributes":{"perfMonth":"Aug 2026","impMonth":"Jul 2026","rows":[{"name":"Customer service / tech support","bad":643,"base":2059,"pct":31.2,"imp":81.7},{"name":"Wi-Fi performance at home","bad":697,"base":2412,"pct":28.9,"imp":85.8},{"name":"Wi-Fi coverage at home","bad":657,"base":2402,"pct":27.4,"imp":85.4},{"name":"Speed consistency","bad":599,"base":2363,"pct":25.3,"imp":85.6},{"name":"Connection stability","bad":610,"base":2430,"pct":25.1,"imp":89.8},{"name":"Online gaming","bad":216,"base":862,"pct":25.1,"imp":45.6},{"name":"Max upload speed","bad":448,"base":2074,"pct":21.6,"imp":73.3},{"name":"Max download speed","bad":452,"base":2129,"pct":21.2,"imp":76.3},{"name":"Data-usage allowance","bad":300,"base":2118,"pct":14.2,"imp":75.8}]},"verbatimBase":[1877,1887,2460],"polarity":{"positive":[42.9,40.7,40.0],"neutral":[35.9,36.5,35.7],"negative":[21.2,22.8,24.2]},"polarityN":{"positive":[805,768,985],"neutral":[674,689,879],"negative":[398,430,596]},"themes":[{"name":"Positive: satisfied / no issues","v":[984,959,1282],"pct":[52.4,50.8,52.1],"neg":[82,81,150]},{"name":"Price, value & contract increases","v":[616,645,853],"pct":[32.8,34.2,34.7],"neg":[197,220,295]},{"name":"Customer service & support access","v":[586,592,777],"pct":[31.2,31.4,31.6],"neg":[188,192,258]},{"name":"Slow or inconsistent speeds","v":[364,346,492],"pct":[19.4,18.3,20.0],"neg":[100,111,164]},{"name":"Billing & account","v":[352,341,445],"pct":[18.8,18.1,18.1],"neg":[125,142,161]},{"name":"Connection drops & outages","v":[259,268,322],"pct":[13.8,14.2,13.1],"neg":[103,106,143]},{"name":"Chatbot & digital self-serve","v":[217,233,297],"pct":[11.6,12.3,12.1],"neg":[53,60,89]},{"name":"Equipment: modem, router, ONT","v":[181,190,252],"pct":[9.6,10.1,10.2],"neg":[62,75,107]},{"name":"Competitor / switching","v":[147,155,192],"pct":[7.8,8.2,7.8],"neg":[75,67,90]},{"name":"Technician & installation","v":[147,141,184],"pct":[7.8,7.5,7.5],"neg":[56,39,69]},{"name":"Wi-Fi coverage & dead zones","v":[83,103,143],"pct":[4.4,5.5,5.8],"neg":[30,43,55]},{"name":"Email problems","v":[33,28,29],"pct":[1.8,1.5,1.2],"neg":[9,11,14]}],"issueVerbatims":[{"name":"Issue described at contact","v":[526,564,682]},{"name":"Connection / speed","v":[135,143,177]},{"name":"Why never contacted","v":[91,79,100]},{"name":"Customer service / tech support","v":[44,58,71]},{"name":"Home Wi-Fi","v":[47,46,49]},{"name":"Video streaming interrupted","v":[27,32,44]},{"name":"Wi-Fi Plus impact","v":[25,30,33]},{"name":"Other TELUS service issue","v":[21,17,32]}],"issueThemes":[{"name":"Slow or inconsistent speeds","v":[186,161,247]},{"name":"Connection drops & outages","v":[148,159,164]},{"name":"Equipment: modem, router, ONT","v":[99,111,128]},{"name":"Customer service & support access","v":[73,74,103]},{"name":"Billing & account","v":[91,97,100]},{"name":"Wi-Fi coverage & dead zones","v":[60,76,94]},{"name":"Price, value & contract increases","v":[48,55,76]},{"name":"Positive: satisfied / no issues","v":[52,49,66]},{"name":"Technician & installation","v":[41,37,45]},{"name":"Chatbot & digital self-serve","v":[24,34,41]},{"name":"Competitor / switching","v":[16,11,21]}],"chatbot":{"positive":[42,36,49],"neutral":[400,420,576],"negative":[149,182,164]},"reliabilityByContact":{"contacted":{"bad":[86,86,116],"base":[269,302,355],"pct":[32.0,28.5,32.7]},"issue_no_contact":{"bad":[132,133,203],"base":[289,286,367],"pct":[45.7,46.5,55.3]},"no_issue":{"bad":[91,99,113],"base":[1260,1263,1680],"pct":[7.2,7.8,6.7]}},"quotes":{"Competitor / switching":["I had basic cable for two years.  I had many issues and they were never resolved on many calls.  I have now cancelled the cable.","I got apple TV years ago and needed help with setting it up. It was never resolved and I pay for something I don't want and every time I try to cancel it I can't figure out how","Terrible connections and no one wants to do anything about it. Never had these issues with Rogers. Can't wait to get out of my contract."],"Customer service & support access":["Any time we attempt to contact Telus when there's an issue, we wind up on hold for a ridiculous amount of time. Help is slow and often difficult to deal with.","Total lack of humans after business hours, AI has never been able to help with my poor internet. Without internet for days waiting on tech then still having issues spotty internet","Waiting for fibre optic to correct but lots of dropped service in my area and slow"],"Slow or inconsistent speeds":["Any time we attempt to contact Telus when there's an issue, we wind up on hold for a ridiculous amount of time. Help is slow and often difficult to deal with.","Waiting for fibre optic to correct but lots of dropped service in my area and slow","Service is bad human and internet is not reliable. Slow does not keep the speed consistent no help"],"Price, value & contract increases":["Any time we attempt to contact Telus when there's an issue, we wind up on hold for a ridiculous amount of time. Help is slow and often difficult to deal with.","I have never received a proactive call, offering a promotion to bring my fees down or recognizing that my changing needs over time might suit new, less expensive offerings.","Same as the first question I answered. Expensive for what I get. Poor value"],"Wi-Fi coverage & dead zones":["Poor customer and wifi service. Issues never resolved","very poor wifi and internet. none listen to yor request or billing problem. this is very dishonest company.","Expensive, wifi has been slow at times"],"Connection drops & outages":["Waiting for fibre optic to correct but lots of dropped service in my area and slow","Slow performance at peak times and dropped connection while paying for top speed","It’s at times slow for no apparent reasons. There are outages as well."],"Billing & account":["very poor wifi and internet. none listen to yor request or billing problem. this is very dishonest company.","Yes! I’m so frustrated with the lies I feel betrayed! I don’t have the time to sit on long phone calls with agents because bills are not consistent","Rarely have outages… but when there was there was never a billing credit to reflect the lost day."],"Technician & installation":["Total lack of humans after business hours, AI has never been able to help with my poor internet. Without internet for days waiting on tech then still having issues spotty internet","Extremely poor customer service and horrible attitude from your field tech","The tech you sent on July 18th was useless and did not solve my issue.  Internet performance still poor with no ability to connect my smoke alarm, garage opener to wifi"],"Chatbot & digital self-serve":["Total lack of humans after business hours, AI has never been able to help with my poor internet. Without internet for days waiting on tech then still having issues spotty internet","Everyone I deal with is wonderful.   Only one thing hate your AI that answers your calls, they are frustrating and doesn’t matter how you improve it’s still horrible","AI is why Telus gets fair.  There needs to be an easier access to human contact.  Takes too long and frustrating to get help when AI is useless!"],"Equipment: modem, router, ONT":["I had basic cable for two years.  I had many issues and they were never resolved on many calls.  I have now cancelled the cable.","Poor internet performance router is old and drops connection. Peak time receive slow internet even for paying for top package","Again, it never works, has poor connection and I continually have to reset it."]}};

const SWEEPR = {
  resolved: {
    a: [40266,39898,43490,46000,44336,47147,43423,44346,51674,56387,52820,50953,50356,42781,53889,41283,43179,45867,45891,49069,48016,53650],
    t: [null,null,null,null,null,null,null,null,null,null,null,null,47551,47439,47595,46384,45971,45988,45989,45987,46075,46201]
  },
  webAppRate: {
    a: [58.1,59.5,59.2,59.1,58.7,59.9,56.3,61.3,52.9,54.4,56.8,54.0,59.49,61.21,63.96,61.24,64.19,63.79,63.48,64.07,64.43,65.15],
    t: [null,null,null,null,null,null,null,null,null,null,null,null,59.4,59.7,60.1,60.4,60.7,61.0,61.4,61.7,62.0,62.35]
  },
  ivrRate: {
    a: [null,null,null,null,null,null,null,null,null,null,null,null,13.9,12.7,12.5,12.4,null,null,null,null,null,null],
    t: [null,null,null,null,null,null,null,null,null,null,null,null,14.0,14.0,14.0,14.0,14.0,14.0,14.0,14.0,14.0,14.0]
  },
  cxEasy: {
    a: [null,null,null,null,null,null,null,null,null,3.29,3.35,3.43,3.43,3.49,3.45,3.51,3.45,3.49,3.48,3.44,3.5,3.49],
    t: [null,null,null,null,null,null,null,null,null,null,null,null,4.00,4.00,4.00,4.00,4.00,4.00,4.00,4.00,4.00,4.0]
  },
  cxSent: {
    a: [null,null,null,null,null,null,null,null,null,-0.68,-0.66,-0.55,-0.61,-0.57,-0.63,-0.64,-0.61,-0.58,-0.64,-0.67,-0.64,-0.54],
    t: [null,null,null,null,null,null,null,null,null,null,null,null,-0.50,-0.50,-0.50,-0.50,-0.50,-0.50,-0.50,-0.50,-0.50,-0.5]
  },
  churn: {
    a: [null,null,null,null,null,null,null,null,null,null,null,null,1.67,1.85,1.76,1.88,1.85,1.78,1.93,2.17,2.07,1.82],
    t: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]
  },
  deacts: {
    a: [null,null,null,null,null,null,null,null,null,null,null,null,541,403,484,543,494,547,600,457,424,380],
    t: [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]
  }
};

// ---------------------------------------------------------------------------
// Friction Free Product Systems (FFPS) program — transcribed from the "Friction Free
// Product Systems Program Update - October 2026" deck (Google Slides). Dollar values are
// in dollars unless the field name says K or M; CR benefit run-rates are $K per month.
// The September and October decks have no "CRs delivered" slide, so `delivered` is still the August edition.
// The October deck's CR delivery timeline is unchanged (4, 2, 3, 3 CRs, same monthly run-rates), so `pipeline` is as before.
// ---------------------------------------------------------------------------
const FFPS = {
  asOf: "Oct 2026", period: "Jan – Oct 2026 (YTD)",
  source: "Friction Free Product Systems Program Update - October 2026 (Google Slides deck)",
  burndown: {
    crs: { label: "Change Requests (CRs)", sub: "Open CR volume across the year",
      points: [{ label: "Start of year (Jan)", v: 20 }, { label: "End of Q2 (Jun)", v: 47, net: 27, opened: 37, closed: 10 }, { label: "End of Q3 (Sep)", v: 43, net: -4, opened: 5, closed: 9 }, { label: "End of Oct", v: 41, net: -2, opened: 1, closed: 3 }],
      ytd: { net: 21, opened: 43, closed: 22, through: "October" } },
    tickets: { label: "Tickets: billing + non-billing (combined)", sub: "Total open ticket volume across the year",
      points: [{ label: "Start of year (Jan)", v: 292 }, { label: "End of Q2 (Jun)", v: 407, net: 115 }, { label: "End of Sep", v: 402, net: -5 }, { label: "End of Oct", v: 359, net: -43 }],
      ytd: { net: 67, opened: 1267, openedTickets: 999, openedProactive: 268, closed: 484, cancelled: 412, through: "October" },
      note: "Billing tracking began in June." }
  },
  benefits: {
    headline: "Change request, non-billing and billing defect fix benefits are all compounding through Q4: $6.7M recurring benefit against $5.6M spend.", recurring: 6.7,
    sub: "Cumulative benefit tracking by quarter, sourced from monthly reporting data",
    crs: { title: "CRs: benefit by quarter", labels: ["Q1", "Q2", "Q3", "Q4"],
      churn: [18541, 336664, 1375541, 2429934], calls: [0, 77499, 272226, 545172], sbc: [0, 0, 234163, 913351],
      notes: ["Q1: Churn $18,541 (100%), 240 customers saved", "Q2: Churn $336,664 (81%), 4,142 customers saved · Calls $77,499 (19%), 7,000 calls", "Q3: Churn $1,375,541 (73%) · Calls $272,226 (15%), 25,000 calls · SBC $234,163 (12%)", "Q4: Churn $2,429,934 (62%) · Calls $545,172 (14%), 45,000 calls · SBC $913,351 (23%)"] },
    nonBilling: { title: "Non-billing defects: benefit by quarter", labels: ["Q2", "Q3", "Q4"], total: [75244, 529560, 1104931],
      notes: ["Q2 (Apr–Jun): $75,244 cumulative (72% calls, 5,000 / 28% TRs, 108)", "Q3 (Jul–Sep): $529,560 cumulative (65% calls, 25,000 / 35% TRs, 788)", "Q4 (Oct–Dec): $1,104,931 cumulative (70% calls, 27,000 / 30% TRs, 810)"] },
    billing: { title: "Billing defects: cumulative EBITDA benefit, Jun–Oct", labels: ["Jun", "Jul", "Aug", "Sep", "Oct"], ebitda: [330000, 520000, 1000000, 1490000, 1740000],
      drivers: [{ m: "June", calls: 3800, contra: 268000 }, { m: "July", calls: 9700, contra: 400000 }, { m: "August", calls: 19500, contra: 728000 }, { m: "September", calls: 30760, contra: 1061000 }, { m: "October", calls: 36660, contra: 1193000 }],
      note: "Calls = call/ticket volume (count). Contra = $ value, not part of the EBITDA total." },
    totals: [{ v: 3888457, label: "CRs benefit (Q4 cumulative)" }, { v: 1104931, label: "Non-billing benefit (Q4 cumulative)" }, { v: 1740000, label: "Billing EBITDA benefit (October cumulative)" }]
  },
  billingTickets: { period: "June to October", start: { m: "June", v: 107 }, end: { m: "October", v: 239 }, delta: 132, closed: 261, cancelled: 153 },
  finance: { // $M unless noted
    month: "October", monthSpend: 0.75, monthForecast: 0.7, spendToDate: { q1: 0.372, q2: 1.82, q3: 2.1, q4: 0.75, ytd: 5.1 },
    h2Forecast: { q3: 2.1, q4: 1.25 }, remaining: 0.53, remainingPct: 9,
    h1: { spend: 2.19, benefits: 0.46 }, h2: { spend: 3.5, benefits: 2.0 },
    projects: [ // $K: month spend, spend to date, allocation, remaining
      { name: "HSIA/wHSIA/Home Phone", m: 372, toDate: 2200, alloc: 2300, remaining: 120 },
      { name: "FIFA Defects Squad", m: 335, toDate: 2100, alloc: 2500, remaining: 400 },
      { name: "BO Optimization", m: 0, toDate: 550, alloc: 550, remaining: 0 },
      { name: "Systems Health - Green", m: 20, toDate: 115, alloc: 129, remaining: 14 },
      { name: "TV", m: 22, toDate: 95, alloc: 95, remaining: 0 }
    ],
    projectTotal: { name: "Total", m: 750, toDate: 5100, alloc: 5600, remaining: 530 },
    quarterly: [ // $K [spend, receipts]; Q1 to Q3 actual, Q4 forecast; null = TBD
      { name: "HSIA/wHSIA/Home Phone / TV", q1: [176, 63], q2: [840, 396], q3: [860, 1500], q4: [568, 500] },
      { name: "FIFA Defects Squad", q1: [0, 0], q2: [790, null], q3: [1000, null], q4: [772, null] },
      { name: "BO Optimization", q1: [196, null], q2: [148, null], q3: [210, null], q4: [0, null] },
      { name: "Systems Health - Green", q1: [0, 0], q2: [44, null], q3: [51, null], q4: [34, null] }
    ],
    quarterlyTotal: { name: "Total", q1: [372, 63], q2: [1820, 396], q3: [2120, 1500], q4: [1370, 500] }
  },
  delivered: [ // CRs delivered Feb–Aug 2026; add = run-rate added that month, rate = monthly run-rate, cum = cumulative benefit ($K)
    { m: "February", add: null, rate: 18.5, cum: 18.5, crs: [{ id: "ITSS-8027", t: "Customer is left waiting for a DIY assist appointment.", tag: "8% churn" }, { id: "ITSS-7828", t: "Customer address not correct due to no MDU unit numbers.", tag: "Churn" }] },
    { m: "March", add: 26, rate: 42, cum: 63, crs: [{ id: "ITSS-7715", t: "Customer appointments are never on time.", tag: "Call avoidance" }, { id: "ITSS-7874", t: "OPTIK on wHSIA delivery issue.", tag: "Enables 50-80 RGUs" }] },
    { m: "April", add: 0, rate: 42, cum: 107.5, crs: [{ id: "OF-5606", t: "Customer receives wrong appointment email." }] },
    { m: "May", add: 74, rate: 116, cum: 415, crs: [{ id: "ITSS-7929", t: "Blocking clearance issue affects communication with outgoing customer.", tag: "Churn" }, { id: "ITSS-7995", t: "Provisioning issue when Optik TV and wHSIA ordered together.", tag: "400 RGUs/month" }, { id: "BAU-4892", t: "Customer is being billed for unlimited data when it is included in plan.", tag: "Revenue leakage" }] },
    { m: "June", add: 142, rate: 258, cum: 864.5, crs: [{ id: "ITSS-7891", t: "Customer receives equipment that is not required.", tag: "SBC savings - Boost Lite" }, { id: "ITSS-8126", t: "HS3 blocking clearance issue affects communication with outgoing customer.", tag: "Churn" }, { id: "OF-6231", t: "Customers in QC receive different shipping emails to the rest of Canada." }, { id: "OF-3689/1526/2784/3676", t: "Customer has service disconnected as soon as a move is requested.", tag: "Churn" }] },
    { m: "July", add: 59, rate: 317, cum: 1370, crs: [{ id: "ITSS-8168", t: "Customer unable to log into TV+ app or view VOD/TELUS content.", tag: "Call avoidance" }, { id: "ITSS-7658 & CIO-543", t: "XGS vs GPON check: customer does not have equipment to support speeds.", tag: "Call reduction" }, { id: "ITSS-8159", t: "Customer cancelled accounts have new charges appear up to 2 years later." }, { id: "Moves Gap & T.com Functionality", t: "Customer unable to create move order, fills out a form instead for an agent to complete.", tag: "Agent time" }] },
    { m: "August", add: 4, rate: 321, cum: 1890, crs: [{ id: "ITSS-7981", t: "Customer has price re-rate due to GPON/XGS on move.", tag: "Call avoidance / churn" }] }
  ],
  pipeline: [ // CR delivery timeline Sep–Dec 2026; rate = expected monthly benefit ($K)
    { m: "September", rate: 36, crs: [{ id: "ITSS-8234", t: "Customer doesn't get DIY assist appointment" }, { id: "ITSS-8433", t: "Customer can order TV when it's not available to them" }, { id: "BAU-6313", t: "Customer receives incremental NAH when not required" }, { id: "ITSS-5682", t: "Update 911 fees to correctly reflect the rates and description" }] },
    { m: "October", rate: 13, crs: [{ id: "CIO-622", name: "Project Flicker: TechHub Integration", t: "Customer experiences a service interruption that we can prevent" }, { id: "ITSS-8328", t: "Linked to ITSS-5682, for existing customers" }] },
    { m: "November", rate: 220, crs: [{ id: "ITSS-8049", name: "DIY Revamp", t: "Customer gets told they have a new service when they do not" }, { id: "HDDP (ITSS-8049)", name: "DIY Revamp", t: "Enabling HDDP to pull AMS/GPONe data" }, { id: "ITSS-8252", name: "SHS install-credit email quotes", t: "Customer quote is confusing" }] },
    { m: "December", rate: 20, crs: [{ id: "ITSS-8256", t: "Customer has to wait unnecessarily for Custom Home install" }, { id: "OF-4761", t: "Customer picks wrong TV tier combo, doesn't get what they wanted" }, { id: "ITSS-8277", name: "1G for Boost Lite in NGM units", t: "Customer receives Boost7 when not required, and maintain instant NGM customer activations" }] }
  ],
  pipelineNote: "Source: CR/Defect Priority List. Target delivery dates reflect current planning and may shift with prioritization and funding."
};

// ---------------------------------------------------------------------------
// "TELUS Internet: why support tickets rose year over year" analysis (Jan – Sep 2026 vs
// 2025, all TELUS-branded internet excluding Koodo, data through 4 Oct 2026). Figures are
// transcribed from the analysis. They are not recomputed from the dashboard's KPI series,
// whose base (HSIA West + TQ ILEC) and ticket source (Looker Assure) differ, so the
// two are shown side by side in the HSIA Review rather than reconciled.
// ---------------------------------------------------------------------------
const HSIA_YOY = {
  period: "Jan – Sep", y0: 2025, y1: 2026, dataThrough: "4 Oct 2026",
  tickets: { y0: 411385, y1: 463799, delta: 52414, pct: 12.7 },
  lines: { y0: 2171683, y1: 2247114, delta: 75431, pct: 3.5, ratePerLine9mo: 0.1894 },
  monthly: { labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"], note: "The rise is steady across every month; PureFibre West carries the bulk and drives the trend, Copper West is second but flat to down." },
  // Volume-only contribution = growth in the population × its 2025 ticket rate; capped rows are
  // held at their actual change because the per-line rate fell. GPON rows are August ×9.
  drivers: [
    { name: "Customer growth (base +3.5%)", group: "Base growth", v: 14289, share: 27.3, delta: "+75,431 lines", rate: "18.9% per 9 mo" },
    { name: "GPON severely degraded", group: "Network: GPON", v: 8666, share: 16.5, delta: "+1,826 lines", rate: "4.7 per 9 mo", actual: 26406, caveat: true },
    { name: "Gateway reboots (3+ in 7 days)", group: "In-home telemetry", v: 5201, share: 9.9, delta: "+5,973 lines", rate: "11.7% per mo", actual: 5481, capped: true },
    { name: "Poor Wi-Fi index (15% or more)", group: "In-home telemetry", v: 4938, share: 9.4, delta: "+28,567 lines", rate: "1.93% per mo", actual: 9481 },
    { name: "Plan or speed change", group: "Plan change", v: 4934, share: 9.4, delta: "+69,185 events", rate: "7.13% of events", actual: 6335 },
    { name: "Equipment delivered", group: "Provisioning", v: 4586, share: 8.8, delta: "+71,600 events", rate: "6.41% of events", actual: 6967 },
    { name: "Speed test below 50% of plan", group: "Provisioning", v: 4508, share: 8.6, delta: "+471,296 tests", rate: "0.96% per failing test", actual: 5893 },
    { name: "GPON outage (service interrupted)", group: "Network: GPON", v: 3060, share: 5.8, delta: "+586 lines", rate: "11.0 per 9 mo", actual: 3060, capped: true, caveat: true },
    { name: "GPON unknown", group: "Network: GPON", v: 2918, share: 5.6, delta: "+1,366 lines", rate: "2.1 per 9 mo", actual: 6093, caveat: true },
    { name: "Early tenure (under 3 months)", group: "Provisioning", v: 2289, share: 4.4, delta: "+3,697 lines", rate: "6.90% per mo", actual: 7854 },
    { name: "ONT capped (plan faster than ONT)", group: "Provisioning", v: 1411, share: 2.7, delta: "+6,362 lines", rate: "2.47% per mo", actual: 5074 },
    { name: "Overlap removed (double counting)", group: "Adjustment", v: -4386, share: -8.4 }
  ],
  campaigns: { reach: [209454, 634176], callbacks: [14533, 31045], callbackRate: [6.9, 4.9], campaigns: 29 },
  copper: { lines: [351066, 281930], ratePct: [2.63, 3.11], tickets: [82761, 78516] },
  bucket: { tickets: 462994, lineSidePct: 72, wifiPct: 25, noDataflowPct: 19.9, noDataflowGrowthPct: 34, noLineFaultPct: 60,
    // share of a category's callers whose line showed each signal at ticket time (Jan–Sep 2026)
    rows: [
      { cat: "No Dataflow", n: 92037, gponSev: 10.6, outage: 2.3, downtime: 9.3, speed: 3.8, ontCap: 1.7, reboots: 5.4, wifi: 8.2, planChg: 6.4, tenure: 19.0, noFault: 65 },
      { cat: "Slow Speeds", n: 84157, gponSev: 7.0, outage: 0.4, downtime: 8.8, speed: 14.2, ontCap: 1.9, reboots: 8.1, wifi: 8.5, planChg: 9.4, tenure: 12.1, noFault: 62 },
      { cat: "ONT Not Ranged", n: 55475, gponSev: 9.4, outage: 18.1, downtime: 10.4, speed: 4.1, ontCap: 2.3, reboots: 4.8, wifi: 7.8, planChg: 4.2, tenure: 17.6, noFault: 40 },
      { cat: "Losing Sync", n: 50610, gponSev: 6.6, outage: 0.8, downtime: 12.7, speed: 8.5, ontCap: 1.3, reboots: 10.6, wifi: 8.2, planChg: 5.7, tenure: 10.2, noFault: 62 },
      { cat: "Can't Connect", n: 48690, gponSev: 6.7, outage: 0.6, downtime: 7.5, speed: 5.4, ontCap: 1.8, reboots: 6.8, wifi: 8.2, planChg: 5.7, tenure: 20.1, noFault: 69 },
      { cat: "Disconnects", n: 38100, gponSev: 6.0, outage: 0.4, downtime: 9.2, speed: 8.5, ontCap: 1.6, reboots: 9.9, wifi: 10.3, planChg: 5.9, tenure: 10.6, noFault: 64 },
      { cat: "Historical Data", n: 25406, gponSev: 12.1, outage: 25.0, downtime: 15.1, speed: 6.1, ontCap: 1.5, reboots: 6.3, wifi: 7.4, planChg: 4.6, tenure: 11.8, noFault: 43 },
      { cat: "No Sync", n: 24857, gponSev: 3.0, outage: 1.2, downtime: 10.5, speed: 3.6, ontCap: 0.7, reboots: 6.3, wifi: 7.4, planChg: 5.3, tenure: 11.6, noFault: 72 },
      { cat: "Incompatible Equipment", n: 23155, gponSev: 4.6, outage: 0.7, downtime: 5.9, speed: 8.9, ontCap: 24.9, reboots: 4.7, wifi: 6.5, planChg: 12.7, tenure: 22.2, noFault: 53 },
      { cat: "No IP", n: 14670, gponSev: 9.5, outage: 1.8, downtime: 9.7, speed: 3.7, ontCap: 1.5, reboots: 5.8, wifi: 7.5, planChg: 5.7, tenure: 14.0, noFault: 66 }
    ] },
  orders: { total: [1393167, 1714597], pct: 23, backend: [138683, 290969], backendPct: 110, rate30: [8.10, 7.65], baseRate: [2.10, 2.29],
    after90: { y0: 145809, y1: 169383, extra: 23574, expectedExtra: 33641, shareOfIncrease: 36, hsicIncrease: 64751 },
    channels: [
      { name: "CSR (agent)", o: [867598, 944142], pct: 9, rate: [9.6, 9.8] },
      { name: "BackEnd (automated)", o: [138683, 290969], pct: 110, rate: [2.3, 2.6] },
      { name: "Other channels", o: [203412, 265471], pct: 31, rate: [5.9, 6.0] },
      { name: "Unknown", o: [34099, 63850], pct: 87, rate: [5.0, 2.6] },
      { name: "TELUS.com (self-serve)", o: [66901, 71152], pct: 6, rate: [7.2, 6.5] },
      { name: "TELUS Store", o: [48814, 53791], pct: 10, rate: [11.4, 12.1] },
      { name: "F2F", o: [30434, 22699], pct: -25, rate: [7.5, 9.0] }
    ],
    augSep: { ordersPerDay: [6499, 6839], noDataflowPerDay: [400, 414], ticketsPerDay: [1815, 1810] },
    gponAugSep: [
      { m: "GPON status: service interrupted", v: [2960, 2744], pct: -7.3 },
      { m: "Interrupted at least once in the last 7 days", v: [5821, 5139], pct: -11.7 },
      { m: "GPON status: severely degraded", v: [7026, 6349], pct: -9.6 },
      { m: "GPON status: unknown", v: [9539, 9198], pct: -3.6 },
      { m: "ONT out of service", v: [16778, 16567], pct: -1.3 }
    ] },
  noDataflow: { callers: [26496, 32892], pct: 24, tenuredSharePct: 73, offnetSharePct: 30, offnetBasePct: 3,
    // lift = share of No Dataflow callers with the trait ÷ share of all customers with it
    lifts: [
      { t: "GPON link interrupted in the last 7 days", lift: [9.2, 9.6], n: [487, 782] },
      { t: "Equipment delivered in the 7 days before", lift: [11.7, 8.8], n: [1347, 1478] },
      { t: "First 30 days of service", lift: [8.2, 7.4], n: [4066, 4298] },
      { t: "3+ gateway reboots in the last 7 days", lift: [4.5, 4.1], n: [1405, 2030] },
      { t: "GPON severely degraded", lift: [3.4, 3.5], n: [684, 1237] },
      { t: "Plan change in the 30 days before", lift: [3.1, 3.2], n: [1761, 2638] },
      { t: "Offnet (Bell network) East", lift: [4.2, 3.2], n: [812, 2551] },
      { t: "TELUS Boost Wi-Fi 7 (new in 2026)", lift: [null, 1.8], n: [80, 3310] },
      { t: "NH20A firmware v1.18.07-build02", lift: [null, 1.7], n: [0, 7897] },
      { t: "Arcadyan NH20A gateway", lift: [1.4, 1.4], n: [6207, 9705] },
      { t: "Poor Wi-Fi index 15% or more", lift: [1.0, 1.1], n: [1864, 3303] },
      { t: "ONT capped (plan faster than ONT)", lift: [0.8, 1.0], n: [384, 691] }
    ],
    tenure: { oneYearPlus: [18306, 22961], first30: [4066, 4298] },
    notFactors: "Wi-Fi quality (QoE score, poor Wi-Fi index, throughput), ONT model, PON type, number of extenders, ONT capping and ONT alarms" },
  caveats: [
    "GPON telemetry covered only about half of fibre lines in Jan to Jul 2025, so the GPON rows are August multiplied by nine and are directional, not final.",
    "September 2026 plan-change and delivery tickets are partly projected because the data runs to 4 Oct 2026.",
    "Proactive-campaign callbacks (14,533 to 31,045 completed) sit inside the +52,414 and cannot be netted out: there is no campaign tag in the ticket data.",
    "Copper is not a driver: worse per line (2.63% to 3.11% per month) but the base shrank 20%, so it removed about 4,200 tickets.",
    "The orders analysis uses the HSIC ticket table, where the Jan to Sep increase is +64,751; the waterfall uses internet_daily, where it is +52,414."
  ]
};

// ---------------------------------------------------------------------------
// FFH call split by product — TS Calls Offered by Product workbook, Actuals tabs.
// Arrays align with MONTHS (Jan 2025 – Oct 2026); the whole series is re-read each month
// because the source restates earlier months.
// HSIA = HSIA West + TQ ILEC - HSIA (wHSIA and PFE - HSIA are excluded).
// TV = IPTV West + TV+ (OPUS) + PIK + PFE - IPTV + TQ ILEC - IPTV, rolled up; the IPTV West and TV+ (OPUS) components are in TV.parts and feed the By Platform calls.
// These series also drive the overview scorecard's call rows and the derived
// All-products calls; the KPI workbook's FFH rollup is retained in DATA only
// for reference and is no longer displayed.
// ---------------------------------------------------------------------------
const CALLS_SPLIT = {
  HSIA: {
    offered:  [71440,62605,62487,61919,64285,64905,69780,73989,85545,78496,71863,74917,70701,58600,74157,70240,78990,82705,86688,88987,82522,83985],
    answered: [62488,53472,58417,58069,58541,59681,65013,64102,60163,54641,59607,58755,60147,54702,65796,62788,71047,74348,75227,74390,72173,73109]
  },
  TV: {
    offered:  [72229,64023,61102,58800,61175,54717,54251,56911,65677,75367,66999,66748,62455,49888,58263,53985,50736,51794,52789,55015,60401,62892],
    answered: [63891,55459,56813,54565,54968,49626,50001,48670,46679,53910,56603,53993,54230,47012,52582,49073,46226,46977,46603,46792,53337,55255],
    // Offered by component (Actuals - Calls Offered tab): Mediaroom = IPTV West + TQ ILEC - IPTV, OPUS = TV+ (OPUS) + PFE - IPTV, plus PIK
    parts: {
      iptvWest: [43377, 38105, 36261, 35205, 38285, 32433, 32723, 32382, 34847, 38636, 32607, 33650, 33098, 26605, 31919, 28793, 26000, 26467, 29039, 29197, 31006, 32737],
      tqIptv: [9713, 8774, 8156, 7321, 7114, 6366, 5830, 6123, 6028, 7373, 7535, 7323, 8430, 7009, 7869, 6708, 6920, 5573, 5536, 6117, 7048, 7794],
      opus: [17888, 16418, 15759, 15113, 14689, 15027, 14786, 17166, 23513, 27535, 25020, 23941, 19174, 14803, 16865, 16831, 16007, 17784, 16536, 17672, 20269, 20471],
      pfeIptv: [7, 5, 5, 10, 22, 41, 32, 72, 71, 106, 139, 132, 90, 117, 126, 166, 201, 236, 208, 142, 158, 69],
      subs: { iptvWest: [778159, 769931, 761910, 755151, 748185, 742432, 732165, 723609, 718093, 711537, 704056, 694717, 686971, 681360, 675478, 670043, 663345, 658202, 643496, 633923, 620523, 602509], opus: [252876, 259270, 267096, 272706, 279827, 284743, 293636, 301386, 306540, 313647, 321802, 329973, 335688, 339814, 343994, 347536, 351037, 353497, 365045, 370894, 381660, 396852] },
      pik: [1244, 721, 921, 1151, 1065, 850, 880, 1168, 1218, 1717, 1698, 1702, 1663, 1354, 1484, 1487, 1608, 1734, 1470, 1887, 1920, 1821]
    }
  }
};

// ---------------------------------------------------------------------------
// PFE (PureFibre East) HSIA customers — the HSIA > PFE subsection. Arrays align with MONTHS
// (Jan 2025 – Oct 2026). Calls: TS Calls Offered by Product workbook, Actuals - Calls Offered
// tab, "PFE - HSIA" field. Tickets: Churn Measurement 2026 workbook, HSIA Recategorization Looker tab,
// "HSIA PFE" block (Look 2188) Grand Total (equal to the KPI tab PFE column). Repairs: Looker Repairs
// (Kam/Jason's new view) tab, HS PFE row (Look 2190, WOID complete month). Base and churn:
// Churn Measurement 2026 workbook, Reliability/Deact KPIs tab, PFE column of each month. Rates are volume over the PFE base per
// 100 subscribers. PFE churn (go/national) is first reported for Oct 2025.
// ---------------------------------------------------------------------------
const PFE = {
  callsOffered: [240,321,497,609,1200,994,1084,1671,1726,2317,2745,4200,3255,2682,3376,3344,3921,4462,5040,4028,2988,2581],
  ticketVolume: [325,312,445,552,929,842,930,1184,1320,1584,1575,2498,2085,1644,1960,2357,2629,3023,3373,2771,2106,1771],
  ticketRate: [8.45,6.64,7.58,7.80,10.57,7.74,6.96,7.55,7.06,7.28,6.37,8.67,6.52,4.75,5.17,5.67,5.84,6.20,6.43,5.15,3.88,3.24],
  repairVolume: [67,55,66,57,61,74,85,117,140,207,199,284,365,288,376,378,436,467,535,347,393,341],
  repairRate: [1.74,1.17,1.12,0.81,0.69,0.68,0.64,0.75,0.75,0.95,0.81,0.99,1.14,0.83,0.99,0.91,0.97,0.96,1.02,0.64,0.72,0.62],
  churnRate: [null,null,null,null,null,null,null,null,null,5.26,3.23,2.94,2.29,1.34,1.94,2.36,2.14,2.38,2.26,2.49,2.78,3.48],
  subBase: [3844,4700,5871,7073,8785,10881,13359,15691,18702,21764,24707,28805,31982,34636,37878,41545,45040,48790,52423,53843,54226,54593]
};

// ---------------------------------------------------------------------------
// HSIA West on its own — the HSIA > HSIA West subsection. Arrays align with MONTHS
// (Jan 2025 – Oct 2026). TS Calls Offered by Product workbook: calls from the Actuals - Calls
// Offered tab, base from the Actuals - Call Tickets (Normalized) tab's Subscribers block (HSIA West).
// Tickets: Churn Measurement 2026 workbook, HSIA Recategorization Looker tab, the "HSIA West" block
// (Look 2186) Grand Total, the same Looker source as the HSIA scorecard tickets; the rate is those
// tickets over the HSIA West base per 100. Repairs: Churn Measurement 2026 workbook, Looker Repairs
// (Kam/Jason's new view) tab (Look 2190), WOID complete month, HS WEST COPPER + HS WEST FIBRE (kept
// separately as repairCopper / repairFibre; repairVolume is their sum), Jan 2025 onward.
// Churn is not split from TQ ILEC in the source.
// ---------------------------------------------------------------------------
const HSIA_WEST = {
  callsOffered: [66302,58283,58346,57968,59876,60294,64870,69381,81574,73560,66439,69110,64525,53641,67816,65028,72529,75759,79247,81294,74534,75018],
  ticketVolume: [38860,37427,43308,44021,44558,43924,46884,47100,44966,45607,46921,45863,46222,40861,42362,46420,47450,49630,48824,50695,49081,47171],
  repairCopper: [2417,2133,2476,2612,3024,3088,3588,3513,3353,3380,2878,2489,2739,2467,2784,2910,3117,2949,3271,2990,2992,2642],
  repairFibre: [9013,8458,8876,8782,9675,9824,10836,11485,11774,13240,12173,12434,12044,10718,12273,12860,13140,11298,12246,11584,12332,12277],
  repairVolume: [11430,10591,11352,11394,12699,12912,14424,14998,15127,16620,15051,14923,14783,13185,15057,15770,16257,14247,15517,14574,15324,14919],
  repairRate: [0.61,0.56,0.60,0.61,0.67,0.68,0.76,0.79,0.79,0.87,0.79,0.78,0.78,0.69,0.79,0.83,0.85,0.75,0.81,0.76,0.80,0.78],
  ticketRate: [2.07,1.99,2.30,2.34,2.36,2.32,2.48,2.48,2.36,2.39,2.46,2.40,2.43,2.15,2.22,2.43,2.49,2.60,2.56,2.65,2.56,2.46],
  subBase: [1880047,1879997,1884205,1883301,1885097,1889714,1890591,1896338,1904966,1905166,1905168,1910163,1902859,1904760,1908112,1906873,1907916,1910008,1909554,1912016,1915303,1917152]
};

// ---------------------------------------------------------------------------
// TQ ILEC (HSIA) on its own — the HSIA > TQ ILEC subsection. Arrays align with MONTHS (Jan 2025 –
// Oct 2026). TS Calls Offered by Product workbook: calls from the Actuals - Calls Offered tab
// ("TQ ILEC - HSIA"), base from the Actuals - Call Tickets (Normalized) tab's Subscribers block.
// Tickets: Churn Measurement 2026 workbook, HSIA Recategorization Looker tab, the "HSIA TQ ILEC"
// block Totals row (all TQ ILEC regions). Repairs: Looker Repairs (Kam/Jason's new view) tab, HS QC ILEC row
// (Look 2190, WOID complete month), Jan 2025 onward. Churn is not split from HSIA West in the source.
// ---------------------------------------------------------------------------
const TQ_ILEC = {
  callsOffered: [5138,4322,4141,3951,4409,4611,4910,4608,3971,4936,5424,5807,6176,4959,6341,5212,6461,6946,7441,7693,7988,8967],
  ticketVolume: [1892,2058,2164,2519,2452,2512,3097,2908,2704,3073,3061,3408,3854,3028,3537,3494,4181,4379,4695,4896,5100,5463],
  ticketRate: [1.14,1.23,1.29,1.49,1.45,1.48,1.83,1.72,1.60,1.83,1.82,2.07,2.34,1.84,2.14,2.12,2.53,2.65,2.84,2.97,3.08,3.31],
  repairVolume: [546,464,525,529,546,618,825,698,613,744,729,840,917,804,916,889,1046,917,1045,1072,1297,1402],
  repairRate: [0.33,0.28,0.31,0.31,0.32,0.37,0.49,0.41,0.36,0.44,0.43,0.51,0.56,0.49,0.55,0.54,0.63,0.56,0.63,0.65,0.78,0.85],
  subBase: [166597,167272,168135,169149,168839,169207,169155,168789,168563,168059,168207,164740,164734,164888,165055,165047,165055,165044,165037,164994,165339,164856]
};

// ---------------------------------------------------------------------------
// HSIA October Review — slow speeds by month (Jan 2025 – Oct 2026). Churn Measurement 2026
// workbook, HSIA Recategorization Looker tab, the "Slow Speeds" customer pain point (wired and
// wireless slow speeds plus incompatible equipment) in the HSIA All, HSIA West, HSIA TQ ILEC and
// HSIA PFE blocks. The three groups do not add up exactly to HSIA All. Calls and repairs have no
// slow-speed split in the workbook.
// ---------------------------------------------------------------------------
const HSIA_OCT_REVIEW = {
  slow: {
    all: [6236,5906,7008,7533,7497,7585,8099,8567,8497,9067,9720,10506,11908,10397,10784,11481,12045,12721,12214,12616,12833,12673],
    west: [5810,5530,6640,7092,7098,7200,7617,8131,8061,8488,9112,9706,11149,9712,10094,10758,11228,11895,11248,11454,11621,11245],
    tq: [417,371,362,431,388,374,468,428,426,562,592,779,747,664,674,682,753,779,899,1055,1073,1237],
    pfe: [63,51,72,105,180,162,191,156,213,222,217,421,318,252,305,425,470,581,598,479,356,368]
  }
};

// ---------------------------------------------------------------------------
// TV platform breakout — Optik TV Legacy (Mediaroom) vs TV Evolution (OPUS).
// Arrays align with MONTHS (Jan 2025 – Oct 2026).
// Tickets: Looker Ticket Categories tab, split by Product
//   (Optik TV (Legacy) = Legacy; TV Evolution = OPUS).
// Base: TV Customer Base Breakdown workbook, "Customer Base - Provisioned" tab
//   (month-end provisioned subscribers; all regions except BTV and SPLUS).
//   Legacy = Total MR (MediaRoom only); OPUS = Total TTV+ (TTV+ only); mixed-usage
//   customers (both platforms) are tracked separately in TV_MIXED. The three sum
//   to the TV subscriber base in DATA.
// Repairs: 2026 Redwood Scorecard workbook, Repair Tracking Detail tab —
//   Legacy = IPTV West + TQ ILEC TV; OPUS = OPUS + PFE Vulcan - TV; reported for
//   2026 onward from that workbook. 2025 from the 2025 Redwood Scorecard + Metrics workbook, Weekly Repair Projections tab, month-end (ME)
//   columns: Legacy = IPTV + QC ILEC IPTV (TQ ILEC with skeleton jobs), OPUS = OPUS. Same scope as the 2026 definition (PFE IPTV is blank in
//   2025), and the platform total sits within about 15 of the KPI-tab TV repairs for Aug to Dec 2025.
// swaps2026: monthly 2026 repair swap volumes from the Tableau Swapped Orders
//   Combined View dashboard, Repair Swap Orders Volumes (Total TV = Legacy,
//   Total OPUS = OPUS; all technologies). Jan – Aug 2026; the September and October pulls were not yet available from the
//   dashboard at the time of this update.
// ---------------------------------------------------------------------------
const TV_PLATFORMS = [
  {
    id: "legacy", name: "Optik TV Legacy", sub: "Mediaroom",
    tickets: [28724,28040,30652,30984,31535,26336,26637,24474,22010,26284,25560,24547,26833,23176,23159,23715,20858,20917,21489,22122,24775,25441],
    repairs: [2023,1643,2137,1925,1722,1495,1521,1487,1480,1777,1685,1586,1581,1418,1590,1663,1605,1105,1263,1240,1468,1457],
    base: [877573,867858,858767,850265,842199,834348,823476,813912,806087,798957,789090,778873,770803,765185,758690,750717,738234,727030,717565,707751,678167,664799],
    swaps2026: [null,null,null,null,null,null,null,null,null,null,null,null,2003,1686,1764,1443,1178,977,698,596,null,null]
  },
  {
    id: "opus", name: "TV Evolution", sub: "OPUS",
    tickets: [9480,9810,10722,10734,10003,10097,10007,10731,12168,15164,15504,13886,12128,9920,9441,10894,9879,11257,9867,10678,12760,12501],
    repairs: [105,104,113,78,80,69,69,73,89,110,94,88,307,310,329,330,336,307,309,305,390,353],
    base: [320847,326151,333102,338402,345329,350171,359165,367025,372162,379770,388243,396919,402912,407233,411592,415896,420596,423901,436417,442630,453664,469398],
    swaps2026: [null,null,null,null,null,null,null,null,null,null,null,null,1352,1141,1080,954,701,727,231,226,null,null]
  }
];
// Mixed usage: customers provisioned on both Mediaroom and TTV+ (same source as the
// platform bases); subscriber count only for now.
const TV_MIXED = { id: "mixed", name: "Mixed usage", sub: "MR + TTV+", base: [7032,7520,7574,8320,8534,9516,8862,8429,9507,9390,10965,11191,10720,10064,10012,11740,16639,21847,15667,14998,30129,24320] };
// Pik TV (minor product line): tickets only, from the TV Looker Ticket Categories tab (Product = Pik TV). Included in the
// TV ticket volume and rate (the KPI tab total is Optik TV (Legacy) + TV Evolution + Pik TV); its base is not in the rate
// denominator and it is left out of every analysis section.
const TV_PIK = { name: "Pik TV", tickets: [530,409,574,807,706,635,620,764,746,1092,1063,1041,1106,913,869,1006,1043,1160,963,1226,1286,1228] };
// Per-platform rates derived where both volume and base are reported
// Calls offered by platform (TS Calls Offered by Product workbook): Legacy = IPTV West, TV Evolution = TV+ (OPUS), rate over each field's subscribers in that workbook.
TV_PLATFORMS.forEach((p) => {
  const CPp = CALLS_SPLIT.TV.parts, off = p.id === "legacy" ? CPp.iptvWest : CPp.opus, sb = p.id === "legacy" ? CPp.subs.iptvWest : CPp.subs.opus;
  p.callsOffered = off; p.callsBase = sb;
  p.callsRate = off.map((v, i) => (v != null && sb[i] ? Math.round((v / sb[i]) * 10000) / 100 : null));
});
TV_PLATFORMS.forEach((p) => {
  p.ticketRate = p.tickets.map((v, i) => (v != null && p.base[i] != null ? +((v / p.base[i]) * 100).toFixed(2) : null));
  p.repairRate = p.repairs.map((v, i) => (v != null && p.base[i] != null ? +((v / p.base[i]) * 100).toFixed(3) : null));
});

// ---------------------------------------------------------------------------
// TV ticket, sentiment and cross analysis.
// Source: TV agent/technician ticket notes — tickets.* below cover Aug–Sep–Oct
// 2026 (106,584 tickets; the October export runs to 30 Oct; Category 1-3 +
// Agent Notes = agent grouping, Resolution 1-3 + Resolution Text = closure
// grouping, with ~4% carrying a structured technician determination);
// movements compare Oct with Sep. The
// Optik TV customer survey verbatims in survey.* still cover Jun–Jul–Aug 2026
// (1,728 / 1,800 / 2,146 respondents; scoring columns ignored) and have not
// yet been rolled forward. Theme counts come from keyword classification of
// free text and are indicative, not exact.
// ---------------------------------------------------------------------------
const TVA = {"months":["Aug 2026","Sep 2026","Oct 2026"],"tickets":{"total":[32614,37303,36667],"agentCat":[{"name":"STB No Boot","v":[7097,8514,8005],"pct":-6.0},{"name":"Video Issues","v":[6715,7526,7894],"pct":4.9},{"name":"Recording Issues","v":[4669,5100,5107],"pct":0.1},{"name":"Digital Box","v":[4357,4902,4651],"pct":-5.1},{"name":"Channel Issues","v":[3493,4548,4780],"pct":5.1},{"name":"Remote","v":[1707,1931,1792],"pct":-7.2},{"name":"Apps","v":[1185,976,919],"pct":-5.8},{"name":"Audio Issues","v":[765,876,834],"pct":-4.8},{"name":"Recordings","v":[577,727,661],"pct":-9.1},{"name":"HS & TV Affected","v":[447,573,602],"pct":5.1},{"name":"TV Features","v":[515,512,437],"pct":-14.6},{"name":"Mobile App","v":[311,348,287],"pct":-17.5},{"name":"VOD","v":[216,152,142],"pct":-6.6},{"name":"Guide Issues","v":[111,127,129],"pct":1.6},{"name":"PPV/VOD","v":[80,80,63],"pct":-21.2},{"name":"PPV","v":[45,56,62],"pct":10.7}],"rising":[{"name":"Video Issues \u203a Stop/Stuttering/Freezing","v":[2073,2303,2734],"delta":431,"pct":18.7},{"name":"Channel Issues \u203a Missing Channels","v":[1471,1919,2060],"delta":141,"pct":7.3},{"name":"Video Issues \u203a Pixelization","v":[302,298,426],"delta":128,"pct":43.0},{"name":"Recording Issues \u203a Cannot View Recordings List","v":[864,891,953],"delta":62,"pct":7.0},{"name":"Channel Issues \u203a Manage My Channels","v":[359,382,437],"delta":55,"pct":14.4},{"name":"STB No Boot \u203a Red X","v":[248,247,302],"delta":55,"pct":22.3},{"name":"HS & TV Affected \u203a Losing Sync","v":[134,157,194],"delta":37,"pct":23.6},{"name":"Channel Issues \u203a Channel Not Working","v":[1662,2246,2283],"delta":37,"pct":1.6}],"falling":[{"name":"Digital Box \u203a No Boot","v":[1877,2404,2186],"delta":-218,"pct":-9.1},{"name":"STB No Boot \u203a Stuck on Initializing","v":[4084,5170,4988],"delta":-182,"pct":-3.5},{"name":"Video Issues \u203a No Video","v":[4229,4722,4550],"delta":-172,"pct":-3.6},{"name":"STB No Boot \u203a Reboot Loop","v":[906,1070,922],"delta":-148,"pct":-13.8},{"name":"Remote \u203a Programming","v":[934,1047,926],"delta":-121,"pct":-11.6},{"name":"STB No Boot \u203a Quick Client Initialization Error","v":[553,654,562],"delta":-92,"pct":-14.1},{"name":"Recordings \u203a Functionality","v":[516,656,581],"delta":-75,"pct":-11.4},{"name":"STB No Boot \u203a Stuck on TELUS Logo","v":[233,309,241],"delta":-68,"pct":-22.0}],"techR1":[{"name":"Education","v":[10646,12215,11970]},{"name":"Connectivity","v":[4705,5615,6062]},{"name":"(no technician closure)","v":[3999,4652,4444]},{"name":"IPTV","v":[4216,4500,4053]},{"name":"Customer","v":[3802,4130,4037]},{"name":"Optik Evolution","v":[2802,3560,3535]},{"name":"Optik TV Self-Install","v":[619,684,682]},{"name":"HSIA","v":[342,395,339]},{"name":"Pik TV","v":[302,348,327]}],"techRising":[{"name":"Connectivity \u203a Modem/Gateway","v":[1301,1504,1753],"delta":249,"pct":16.6},{"name":"Connectivity \u203a STB/PVR","v":[3140,3797,4012],"delta":215,"pct":5.7},{"name":"Optik TV Self-Install \u203a STB/PVR","v":[433,419,472],"delta":53,"pct":12.6},{"name":"GPON \u203a Inside Premise Equipment","v":[189,180,211],"delta":31,"pct":17.2},{"name":"Optik Evolution \u203a Remote Control","v":[219,204,225],"delta":21,"pct":10.3}],"techFalling":[{"name":"IPTV \u203a Set Top Box","v":[1927,2132,1879],"delta":-253,"pct":-11.9},{"name":"Customer \u203a Customer Training/Education/Inquiry Only","v":[3576,3860,3763],"delta":-97,"pct":-2.5},{"name":"IPTV \u203a Recording Issues - PVR STB","v":[509,533,438],"delta":-95,"pct":-17.8},{"name":"Education \u203a Pik TV","v":[850,1089,1002],"delta":-87,"pct":-8.0},{"name":"Education \u203a IPTV","v":[8183,9269,9186],"delta":-83,"pct":-0.9}],"divergence":{"all":[{"alignment":34.9,"nofault":52.5,"reattribution":65.1,"closed":28320},{"alignment":35.2,"nofault":51.8,"reattribution":64.8,"closed":32333},{"alignment":34.7,"nofault":51.4,"reattribution":65.3,"closed":31954}],"field":[{"alignment":73.0,"nofault":12.5,"nontelus":14.4,"reattribution":27.0,"visits":1409},{"alignment":75.8,"nofault":13.2,"nontelus":17.9,"reattribution":24.2,"visits":1663},{"alignment":76.5,"nofault":12.3,"nontelus":16.6,"reattribution":23.5,"visits":1394}],"perCat":[{"cat":"STB No Boot","n":8005,"alignment":47.5,"nofault":49.7,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Video Issues","n":7894,"alignment":42.8,"nofault":53.6,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Recording Issues","n":5107,"alignment":23.6,"nofault":50.1,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Channel Issues","n":4780,"alignment":13.4,"nofault":53.4,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Digital Box","n":4651,"alignment":47.3,"nofault":49.6,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Remote","n":1792,"alignment":26.7,"nofault":53.9,"techTop":["Education / no fault","Remote control"]},{"cat":"Apps","n":919,"alignment":24.0,"nofault":57.2,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Audio Issues","n":834,"alignment":14.7,"nofault":51.8,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Recordings","n":661,"alignment":25.6,"nofault":48.8,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"HS & TV Affected","n":602,"alignment":47.4,"nofault":36.3,"techTop":["Network / connectivity","Education / no fault"]}],"perCatField":[{"cat":"STB No Boot","n":632,"alignment":85.0,"nofault":9.3,"nontelus":13.9,"techTop":"STB hardware"},{"cat":"Video Issues","n":374,"alignment":80.5,"nofault":13.4,"nontelus":18.4,"techTop":"STB hardware"},{"cat":"Digital Box","n":107,"alignment":73.8,"nofault":19.6,"nontelus":26.2,"techTop":"STB hardware"},{"cat":"Recording Issues","n":97,"alignment":64.9,"nofault":9.3,"nontelus":9.3,"techTop":"STB hardware"},{"cat":"HS & TV Affected","n":96,"alignment":62.5,"nofault":11.5,"nontelus":9.4,"techTop":"Network / connectivity"}]},"closure":[{"tickets":32614,"field_visit_pct":4.3,"agent_education_closure_pct":44.1},{"tickets":37303,"field_visit_pct":4.5,"agent_education_closure_pct":43.6},{"tickets":36667,"field_visit_pct":3.8,"agent_education_closure_pct":43.5}],"determination":[[1211,205],[1370,297],[1166,232]],"fixes":[{"name":"Replaced STB / PVR / OPUS box","v":[223,244,180],"pct":-26.2},{"name":"Wi-Fi / WAP / wireless STB placement","v":[175,224,198],"pct":-11.6},{"name":"Education / no fault found / working on arrival","v":[107,108,101],"pct":-6.5},{"name":"Remote control","v":[66,93,78],"pct":-16.1},{"name":"Recording / PVR settings","v":[72,78,86],"pct":10.3},{"name":"ONT / light level / fibre","v":[74,84,76],"pct":-9.5},{"name":"Firmware / software / reboot fix","v":[60,71,85],"pct":19.7},{"name":"Modem / gateway replaced or reset","v":[41,53,75],"pct":41.5},{"name":"Power supply / power cable","v":[33,55,46],"pct":-16.4},{"name":"Re-terminated / replaced cabling","v":[15,29,27],"pct":-6.9}],"commentCoverage":[19221,20401,20495],"themes":[{"name":"Recording / PVR","v":[4345,4177,4294],"pct":2.8},{"name":"Modem / gateway","v":[3490,3865,4059],"pct":5.0},{"name":"Swap / replacement shipped","v":[3466,3526,3436],"pct":-2.6},{"name":"Ethernet / HDMI / cabling","v":[3315,3465,3295],"pct":-4.9},{"name":"Channel missing / not authorized","v":[2950,3176,3487],"pct":9.8},{"name":"Wi-Fi / wireless STB signal","v":[3146,3012,3185],"pct":5.7},{"name":"Repeat / recurring issue","v":[2466,2504,2484],"pct":-0.8},{"name":"Remote control","v":[2274,2513,2553],"pct":1.6},{"name":"Fibre / ONT / light level","v":[2225,2188,2119],"pct":-3.2},{"name":"Stuck initializing / reboot loop","v":[1773,1951,1957],"pct":0.3},{"name":"No signal / black screen","v":[1470,1602,1640],"pct":2.4},{"name":"Outage / active network event","v":[1364,1495,1600],"pct":7.0},{"name":"Dispatch / technician booked","v":[1313,1516,1447],"pct":-4.6},{"name":"Power / power supply","v":[1095,1225,1231],"pct":0.5},{"name":"Freezing / pixelation / glitching","v":[969,1044,1327],"pct":27.1},{"name":"Audio / sound","v":[808,878,885],"pct":0.8},{"name":"Firmware / software update","v":[760,819,902],"pct":10.1},{"name":"Streaming apps (Netflix, Prime, YouTube, TV+ app)","v":[892,776,791],"pct":1.9},{"name":"Customer wants tech / refuses troubleshooting","v":[336,356,352],"pct":-1.1}],"devices":[{"name":"4K STB","v":[21265,23048,22927],"pct":-0.5},{"name":"OPUS / TV+ box (TV Evolution)","v":[8482,10232,10489],"pct":2.5},{"name":"VIP5662W (Mediaroom PVR)","v":[7321,7471,6829],"pct":-8.6},{"name":"VIP5602W (Mediaroom wSTB)","v":[5578,5829,5719],"pct":-1.9},{"name":"T3200M gateway","v":[4363,5131,4906],"pct":-4.4},{"name":"Pik TV","v":[1187,1481,1376],"pct":-7.1},{"name":"NH20T gateway","v":[427,424,466],"pct":9.9}],"platform":[{"name":"Mediaroom (legacy)","v":[10483,10868,10202],"pct":-6.1},{"name":"OPUS / TV Evolution","v":[7944,9729,9912],"pct":1.9}]},"survey":{"respondents":[1728,1800,2146],"polarity":{"positive":[40.8,38.3,37.2],"neutral":[35.8,38.3,37.9],"negative":[23.3,23.4,24.9]},"polarityN":{"positive":[695,679,782],"neutral":[610,678,797],"negative":[397,415,524]},"themes":[{"name":"Positive: satisfied / no issues","v":[791,786,898],"pct":[45.8,43.7,41.8],"neg":[68,68,80]},{"name":"Customer service & support access","v":[636,657,781],"pct":[36.8,36.5,36.4],"neg":[208,213,271]},{"name":"Price, value & contract increases","v":[561,574,678],"pct":[32.5,31.9,31.6],"neg":[198,189,250]},{"name":"Reliability: freezing, outages & drop-outs","v":[402,426,485],"pct":[23.3,23.7,22.6],"neg":[122,140,150]},{"name":"Billing & account","v":[287,308,371],"pct":[16.6,17.1,17.3],"neg":[121,126,156]},{"name":"Channels, packages & content","v":[273,287,354],"pct":[15.8,15.9,16.5],"neg":[87,89,128]},{"name":"Internet & Wi-Fi","v":[265,268,359],"pct":[15.3,14.9,16.7],"neg":[103,99,150]},{"name":"Set-top box / equipment","v":[231,257,294],"pct":[13.4,14.3,13.7],"neg":[92,93,122]},{"name":"Installation & technicians","v":[130,118,139],"pct":[7.5,6.6,6.5],"neg":[48,41,54]},{"name":"Picture & sound quality","v":[106,100,139],"pct":[6.1,5.6,6.5],"neg":[29,37,41]},{"name":"Recording / PVR","v":[91,104,138],"pct":[5.3,5.8,6.4],"neg":[29,32,47]},{"name":"Apps & streaming","v":[79,104,108],"pct":[4.6,5.8,5.0],"neg":[25,41,48]},{"name":"Remote, guide & navigation","v":[91,89,104],"pct":[5.3,4.9,4.8],"neg":[35,29,42]}],"tvIssues":[{"name":"Customer service experience","v":[70,91,75],"pct":[4.05,5.06,3.49]},{"name":"Interruptions / freezing / restarts","v":[66,73,83],"pct":[3.82,4.06,3.87]},{"name":"Picture quality","v":[44,48,58],"pct":[2.55,2.67,2.7]},{"name":"Recording / PVR","v":[19,19,38],"pct":[1.1,1.06,1.77]},{"name":"Outages / service loss","v":[23,18,27],"pct":[1.33,1.0,1.26]},{"name":"TV features","v":[17,22,20],"pct":[0.98,1.22,0.93]},{"name":"Sound quality","v":[13,21,14],"pct":[0.75,1.17,0.65]},{"name":"Remote control","v":[9,16,21],"pct":[0.52,0.89,0.98]},{"name":"Channel guide / navigation","v":[15,11,18],"pct":[0.87,0.61,0.84]},{"name":"Apps / streaming","v":[12,10,16],"pct":[0.69,0.56,0.75]},{"name":"On-demand / VOD","v":[4,7,5],"pct":[0.23,0.39,0.23]}],"support":{"positive":[34,32,42],"neutral":[408,394,505],"negative":[148,150,186]},"quotes":{"Picture quality":["Seems to stutter and freeze sometimes","Weak signal   and sound  quality","My picture os constantly pixelating. It is a poor watch","Always freezes or is buffering ?"],"Customer service experience":["Not speaking English not communicating with each other so every service call back to square 1","Plusieurs appels avant d'\u00eatre en mesure de r\u00e9gler le probl\u00e8me.  Les agents se lance la balle l'un l'autre en accusant leur coll\u00e8gue de ne pas avoir compris et su r\u00e9gler le probl\u00e8me","My issues tend to go unresolved. I sometimes cases i get some resolution and so get great phone reps who really try. I think you are way overpriced for the glitchy services","Absolutely no one knows anything to help you."],"Interruptions / freezing / restarts":["Home page doesn\u2019t initially load properly or freezes and is unresponsive to the remote","Half the time I can't access cable channels or streaming services","As stated within the questions provided.","Neither of my tvs are working."],"Recording / PVR":["This whole thing was like stepping on a landmine. Picture freezes.","Broken voice and picture frozen in the beginning of recording","Losing last half of recorded programs. Failing to play recorded programs. and some pixelizing on some stations at times.","The PVR listing disappears occasionally"],"Remote control":["Unable to sync Telus remote with tv remote","Not responding when pressing buttons","For some reason I only have one remote for two boxes.","Always having to unplug modem and router screen freezes or says check internet"]}}};

// HSIA agent/technician ticket-notes analysis, Aug – Oct 2026 (October export to 30 Oct;
// generated by
// analysis/hsia/analyze_hsia_notes.py; aggregates only, no customer data)
// SH+ notes analysis (Assure tickets, Aug - Oct 2026): aggregates from the monthly SH+ Assure Ticket CSVs, de-duplicated on Trouble Ticket ID.
// Agent categories are Trouble Code 2 > 3; closures are Resolution Code 2 / 3 (swap = Resolution Code 3 'Warranty Swap'); themes and devices are keyword matches on the first worklog entry of the agent notes (aggregates only, no notes are stored).
const SHPA = {"months":["Aug 2026","Sep 2026","Oct 2026"],"tickets":{"total":[1321,1091,1210],"technician":[70,77,69],"swaps":[177,114,120],"commentCoverage":[1316,1083,1203],"c1":[{"name":"Camera","v":[1065,894,870]},{"name":"SmartHome+ App","v":[190,135,248]},{"name":"Automation Hub","v":[13,20,29]},{"name":"Main Panel","v":[13,12,16]},{"name":"Thermostat","v":[11,4,14]},{"name":"Smoke/CO Sensor","v":[6,0,12]},{"name":"Doorlock","v":[11,10,8]},{"name":"Door/Window Sensor","v":[2,8,4]}],"agentCat":[{"name":"TELUS Outdoor › Self-install support","v":[193,218,212]},{"name":"TELUS Doorbell › Self-install support","v":[161,128,138]},{"name":"Education › General","v":[52,43,95]},{"name":"TELUS Outdoor › Camera Not Recording","v":[106,81,66]},{"name":"Login / Access › User Credentials","v":[61,23,54]},{"name":"TELUS Doorbell › Camera Not Recording","v":[80,72,50]},{"name":"TELUS Indoor › Self-install support","v":[57,50,45]},{"name":"TELUS Outdoor › Product Education","v":[66,53,43]},{"name":"TELUS Doorbell › Product Education","v":[33,38,32]},{"name":"Login / Access › Account Provisioning","v":[44,20,29]},{"name":"Login / Access › App Error","v":[16,18,24]},{"name":"TELUS Doorbell › Wi-Fi - Other Issue","v":[23,17,24]}],"rising":[{"name":"Education › General","delta":52,"pct":120.9,"v":[52,43,95]},{"name":"Login / Access › User Credentials","delta":31,"pct":134.8,"v":[61,23,54]},{"name":"TELUS Doorbell › Self-install support","delta":10,"pct":7.8,"v":[161,128,138]}],"falling":[{"name":"TELUS Doorbell › Camera Not Recording","delta":-22,"pct":-30.6,"v":[80,72,50]},{"name":"TELUS Outdoor › Camera Not Recording","delta":-15,"pct":-18.5,"v":[106,81,66]},{"name":"TELUS Outdoor › Product Education","delta":-10,"pct":-18.9,"v":[66,53,43]},{"name":"TELUS Doorbell › Product Education","delta":-6,"pct":-15.8,"v":[33,38,32]},{"name":"TELUS Outdoor › Self-install support","delta":-6,"pct":-2.8,"v":[193,218,212]}],"resolution2":[{"name":"Education","v":[676,565,652]},{"name":"Troubleshoot","v":[256,191,217]},{"name":"Defective Equipment","v":[184,122,124]},{"name":"(no code)","v":[66,90,64]},{"name":"Appointment","v":[14,19,13]},{"name":"Custom Calling Feature","v":[0,0,13]},{"name":"Equipment Failure Customer Caused","v":[2,3,13]},{"name":"Cancel Ticket","v":[7,9,12]}],"resolution3":[{"name":"Device","v":[450,373,373]},{"name":"App","v":[157,83,141]},{"name":"Warranty Swap","v":[177,114,120]},{"name":"Other Please See Notes","v":[26,78,112]},{"name":"Self-Install Support","v":[106,95,96]},{"name":"(no code)","v":[66,90,64]}],"swapIssues":[{"name":"TELUS Outdoor › Self-install support","v":[10,14,18]},{"name":"TELUS Doorbell › Self-install support","v":[16,8,14]},{"name":"TELUS Outdoor › Camera Not Recording","v":[21,11,12]},{"name":"TELUS Doorbell › Camera Not Recording","v":[19,15,10]},{"name":"TELUS Outdoor › Existing defect","v":[18,10,9]},{"name":"TELUS Indoor › Self-install support","v":[9,4,6]},{"name":"TELUS Indoor › Camera Not Recording","v":[2,4,6]},{"name":"TELUS Doorbell › Existing defect","v":[6,4,5]}],"themes":[{"name":"Offline / disconnects","v":[173,138,172]},{"name":"Login / password / access","v":[222,120,157]},{"name":"Pairing / setup failure","v":[168,119,122]},{"name":"Power / battery","v":[119,97,118]},{"name":"Pro-install / technician request","v":[121,104,104]},{"name":"Defective hardware","v":[153,85,98]},{"name":"Live view issues","v":[111,76,96]},{"name":"Not recording / missing clips","v":[103,62,95]},{"name":"TELUS Connect app migration","v":[14,16,32]},{"name":"Wi-Fi change (router / password)","v":[20,16,25]}],"devices":[{"name":"Doorbell","v":[325,264,258]},{"name":"Outdoor camera","v":[316,231,218]},{"name":"Indoor camera","v":[127,82,80]},{"name":"Hub / panel","v":[63,47,56]},{"name":"Smoke / CO detector","v":[5,2,15]},{"name":"Thermostat","v":[12,7,15]},{"name":"Door lock","v":[6,9,11]}]}};
// SH+ symptom items per issue (Agent tickets), from the Top Issue Drivers and Symptom Items tables of the monthly SH+ Assure Ticket Summary reports.
// v = [Aug 2026, Sep 2026, Oct 2026]: Oct and Sep come from the October report, Aug from the September report (null = item not listed that month). trend = the report's Oct vs Sep label.
const SHP_SYMPTOMS = {"TELUS Outdoor › Self-install support":{"tickets":203,"items":[{"name":"Pair failures","desc":"Cameras that stopped working and had to be deleted and re-added, or arrived already mounted high with no onboarding guidance; setup in the SH+ app failing.","v":[75,69,87],"trend":"Rising"},{"name":"Pro-install requests","desc":"Customers sent from loyalty to book a pro install, or expecting the internet / TV technician to set up the cameras.","v":[43,45,28],"trend":"Declining"},{"name":"Offline / disconnects","desc":"Cameras showing disconnected in the tenant portal; some customers about to travel.","v":[8,15,9],"trend":"Declining"},{"name":"Motion / notifications","desc":"Mixed: plan mismatch found during installation, camera not turning on.","v":[null,0,8],"trend":"New"},{"name":"Account provisioning / billing","desc":"Cameras ordered but not in the tenant portal; cancelling an installation appointment after cancelling a subscription.","v":[8,7,7],"trend":"Static"},{"name":"Defective hardware","desc":"Replacement camera not working, or replacement equipment promised but not received.","v":[5,7,7],"trend":"Static"},{"name":"How-to questions","desc":"Removing old Wi-Fi boosters from the account; needing a longer cable.","v":[5,15,6],"trend":"Declining"},{"name":"Wi-Fi change (new router / password)","desc":"Camera offline or not installable after Wi-Fi changes; repeat callers.","v":[null,0,6],"trend":"New"},{"name":"Reset / firmware","desc":"Factory reset or firmware update needed to recover the device.","v":[2,4,4],"trend":"Static"},{"name":"Live view issues","desc":"Live feed does not load, keeps refreshing or is delayed.","v":[2,3,4],"trend":"Static"},{"name":"Login / password","desc":"Cannot sign in to the SH+ app: invalid credentials or self-serve reset failing.","v":[8,3,4],"trend":"Static"},{"name":"Power / battery","desc":"Camera has no power or light, or battery / charging concerns.","v":[null,0,4],"trend":"New"},{"name":"Smoke / security sensors","desc":"Smoke detector or security sensor alerts (beeping, low battery).","v":[1,3,3],"trend":"Static"},{"name":"Not recording / missing clips","desc":"Camera not recording events or clips missing for a specific incident.","v":[3,1,3],"trend":"Static"},{"name":"Weak Wi-Fi signal","desc":"Poor Wi-Fi at the mounting spot; camera moved or taken down to reconnect.","v":[null,1,3],"trend":"Static"},{"name":"Other / no clear symptom","desc":"Notes too brief or generic to assign a symptom.","v":[23,27,20],"trend":"—"}]},"TELUS Doorbell › Self-install support":{"tickets":124,"items":[{"name":"Pair failures","desc":"Bluetooth pairing failures: doorbell not discoverable even after a factory reset.","v":[55,30,52],"trend":"Rising"},{"name":"Pro-install requests","desc":"Technician requests after repeated replacements (one on a 3rd unit) or a doorbell joined to the wrong (5 GHz) network.","v":[30,26,15],"trend":"Declining"},{"name":"Offline / disconnects","desc":"Doorbell not working or recording since September with no Wi-Fi changes.","v":[11,12,15],"trend":"Rising"},{"name":"Live view issues","desc":"Doorbell already mounted or needing wiring it doesn\u0027t have; no live view during setup.","v":[null,0,7],"trend":"New"},{"name":"Not recording / missing clips","desc":"Camera not recording events or clips missing for a specific incident.","v":[null,2,4],"trend":"Static"},{"name":"Defective hardware","desc":"Suspected faulty unit or replacement equipment requested / not received.","v":[8,5,3],"trend":"Static"},{"name":"How-to questions","desc":"General usage questions; no fault reported.","v":[5,4,3],"trend":"Static"},{"name":"Power / battery","desc":"Camera has no power or light, or battery / charging concerns.","v":[5,3,3],"trend":"Static"},{"name":"TELUS Connect app migration","desc":"Customer moved from the TELUS Connect app and lost access or devices in SH+.","v":[null,1,3],"trend":"Static"},{"name":"Reset / firmware","desc":"Factory reset or firmware update needed to recover the device.","v":[4,4,2],"trend":"Static"},{"name":"Other / no clear symptom","desc":"Notes too brief or generic to assign a symptom.","v":[28,24,17],"trend":"—"}]},"Education › General":{"tickets":93,"items":[{"name":"Non-SH+ call (internet / TV)","desc":"Internet, Wi-Fi security and plan-compatibility calls reaching the SH+ queue (likely misrouted).","v":[16,16,44],"trend":"Rising"},{"name":"How-to questions","desc":"Booster issues and appointment changes for other services.","v":[8,11,14],"trend":"Rising"},{"name":"Pair failures","desc":"Reconnecting deleted devices or Wi-Fi boosters.","v":[3,2,7],"trend":"Rising"},{"name":"Pro-install requests","desc":"Customers asking for professional installation instead of self-install.","v":[3,0,7],"trend":"New"},{"name":"Offline / disconnects","desc":"Device shows offline or drops its connection after setup.","v":[3,0,4],"trend":"New"},{"name":"TELUS Connect app migration","desc":"Customer moved from the TELUS Connect app and lost access or devices in SH+.","v":[null,2,3],"trend":"Static"},{"name":"Other / no clear symptom","desc":"Notes too brief or generic to assign a symptom.","v":[13,11,14],"trend":"—"}]},"TELUS Outdoor › Camera Not Recording":{"tickets":63,"items":[{"name":"Pair failures","desc":"Camera stopped working, or live feed works but recordings / notifications show \"failed to load\".","v":[24,17,18],"trend":"Static"},{"name":"Not recording / missing clips","desc":"Camera never recorded properly since delivery; no power or recording.","v":[11,6,7],"trend":"Static"},{"name":"Offline / disconnects","desc":"Damaged power cord; clips only 2 seconds long.","v":[9,7,6],"trend":"Static"},{"name":"Pro-install requests","desc":"Customer asks for a technician / pro install, or a booked install did not happen.","v":[5,8,3],"trend":"Declining"},{"name":"Power / battery","desc":"Camera has no power or light, or battery / charging concerns.","v":[null,2,3],"trend":"Static"},{"name":"Defective hardware","desc":"Suspected faulty unit or replacement equipment requested / not received.","v":[8,3,2],"trend":"Static"},{"name":"Other / no clear symptom","desc":"Notes too brief or generic to assign a symptom.","v":[31,30,24],"trend":"—"}]},"Login / Access › User Credentials":{"tickets":54,"items":[{"name":"Login / password","desc":"Customer profile not found or mismatched in CASA; no access to the SH+ or My TELUS app.","v":[null,14,28],"trend":"Rising"},{"name":"Offline / disconnects","desc":"Device shows offline or drops its connection after setup.","v":[null,1,4],"trend":"Rising"},{"name":"TELUS Connect app migration","desc":"Customer moved from the TELUS Connect app and lost access or devices in SH+.","v":[null,1,3],"trend":"Static"},{"name":"Other / no clear symptom","desc":"Notes too brief or generic to assign a symptom.","v":[null,7,19],"trend":"—"}]},"TELUS Indoor › Self-install support":{"tickets":45,"items":[{"name":"Pair failures","desc":"Indoor camera keeps searching in the app, or \"failed to verify\" during setup.","v":[31,20,19],"trend":"Static"},{"name":"Pro-install requests","desc":"Customer doesn\u0027t know the Wi-Fi password and asks for help or a technician to install.","v":[7,4,9],"trend":"Rising"},{"name":"How-to questions","desc":"General usage questions; no fault reported.","v":[null,1,4],"trend":"Rising"},{"name":"Offline / disconnects","desc":"Device shows offline or drops its connection after setup.","v":[3,3,3],"trend":"Static"},{"name":"Defective hardware","desc":"Suspected faulty unit or replacement equipment requested / not received.","v":[2,3,0],"trend":"Declining"},{"name":"Other / no clear symptom","desc":"Notes too brief or generic to assign a symptom.","v":[11,16,10],"trend":"—"}]},"TELUS Doorbell › Camera Not Recording":{"tickets":43,"items":[{"name":"Pair failures","desc":"Doorbell stuck on \"we\u0027re almost there\"; chronic backend provisioning issues.","v":[17,19,13],"trend":"Declining"},{"name":"Offline / disconnects","desc":"Device shows offline or drops its connection after setup.","v":[10,10,4],"trend":"Declining"},{"name":"Not recording / missing clips","desc":"Camera not recording events or clips missing for a specific incident.","v":[11,7,4],"trend":"Declining"},{"name":"Power / battery","desc":"Camera has no power or light, or battery / charging concerns.","v":[2,4,4],"trend":"Static"},{"name":"Pro-install requests","desc":"Customer asks for a technician / pro install, or a booked install did not happen.","v":[4,6,3],"trend":"Declining"},{"name":"Defective hardware","desc":"Suspected faulty unit or replacement equipment requested / not received.","v":[6,4,0],"trend":"Declining"},{"name":"Other / no clear symptom","desc":"Notes too brief or generic to assign a symptom.","v":[18,19,15],"trend":"—"}]},"TELUS Outdoor › Product Education":{"tickets":42,"items":[{"name":"Pair failures","desc":"Camera stopped working, or the wrong device was shipped (outdoor camera instead of doorbell).","v":[10,17,11],"trend":"Declining"},{"name":"Pro-install requests","desc":"Customers who didn\u0027t know their equipment was self-install.","v":[9,9,7],"trend":"Static"},{"name":"How-to questions","desc":"General usage questions; no fault reported.","v":[5,1,5],"trend":"Rising"},{"name":"Not recording / missing clips","desc":"Camera not recording events or clips missing for a specific incident.","v":[3,0,4],"trend":"New"},{"name":"Account provisioning / billing","desc":"SH+ / HomeView service not provisioned or billed correctly, blocking setup.","v":[8,4,1],"trend":"Declining"},{"name":"Other / no clear symptom","desc":"Notes too brief or generic to assign a symptom.","v":[26,20,14],"trend":"—"}]},"TELUS Doorbell › Product Education":{"tickets":31,"items":[{"name":"Pro-install requests","desc":"Customer asks for a technician / pro install, or a booked install did not happen.","v":[7,6,5],"trend":"Static"},{"name":"Pair failures","desc":"New device cannot be added or paired in the SH+ app; setup stalls or fails.","v":[3,2,4],"trend":"Static"},{"name":"Offline / disconnects","desc":"Device shows offline or drops its connection after setup.","v":[0,3,3],"trend":"Static"},{"name":"How-to questions","desc":"General usage questions; no fault reported.","v":[3,1,3],"trend":"Static"},{"name":"Account provisioning / billing","desc":"SH+ / HomeView service not provisioned or billed correctly, blocking setup.","v":[1,4,2],"trend":"Static"},{"name":"Other / no clear symptom","desc":"Notes too brief or generic to assign a symptom.","v":[19,18,14],"trend":"—"}]}};
const HSA = {"months":["Aug 2026","Sep 2026","Oct 2026"],"tickets":{"total":[58787,56761,53440],"c1":[{"name":"Connectivity","v":[42732,41325,38212],"pct":-7.5},{"name":"Wireless","v":[13135,12565,12532],"pct":-0.3},{"name":"Incompatible Equipment","v":[1994,2118,1989],"pct":-6.1},{"name":"Abandon","v":[848,702,643],"pct":-8.4},{"name":"NWH","v":[75,46,58],"pct":26.1}],"agentCat":[{"name":"Connectivity › No Dataflow","v":[13151,13255,12151],"pct":-8.3},{"name":"Connectivity › Slow Speeds","v":[6348,6574,6591],"pct":0.3},{"name":"Connectivity › ONT Not Ranged","v":[7117,6358,5592],"pct":-12.0},{"name":"Connectivity › Losing Sync","v":[6391,6307,5984],"pct":-5.1},{"name":"Wireless › Can't Connect","v":[5728,5162,5312],"pct":2.9},{"name":"Wireless › Disconnects","v":[4149,4253,4318],"pct":1.5},{"name":"Connectivity › No Sync","v":[3717,3170,2707],"pct":-14.6},{"name":"Wireless › Slow Speeds","v":[3258,3149,2901],"pct":-7.9},{"name":"Connectivity › Historical Data","v":[2593,2600,2456],"pct":-5.5},{"name":"Incompatible Equipment › Incompatible","v":[1994,2117,1987],"pct":-6.1},{"name":"Connectivity › No IP","v":[1920,1710,1546],"pct":-9.6},{"name":"Connectivity › Incompatible Equipment","v":[1494,1349,1183],"pct":-12.3},{"name":"Abandon › Abandon","v":[848,702,643],"pct":-8.4}],"rising":[{"name":"Wireless › Can't Connect › Some Devices Affected","v":[865,840,1020],"delta":180,"pct":21.4},{"name":"Connectivity › Slow Speeds › Some Devices Affected","v":[654,659,733],"delta":74,"pct":11.2},{"name":"Wireless › Can't Connect › Single Device Affected","v":[1338,1266,1334],"delta":68,"pct":5.4},{"name":"Wireless › Disconnects › All Devices Affected","v":[2972,2990,3025],"delta":35,"pct":1.2},{"name":"Wireless › Disconnects › Some Devices Affected","v":[870,955,973],"delta":18,"pct":1.9},{"name":"Wireless › Disconnects › Single Device Affected","v":[306,306,319],"delta":13,"pct":4.2},{"name":"Connectivity › No Dataflow › Single Device Affected","v":[725,727,733],"delta":6,"pct":0.8}],"falling":[{"name":"Connectivity › No Dataflow › All Devices Affected","v":[11925,12026,10918],"delta":-1108,"pct":-9.2},{"name":"Connectivity › ONT Not Ranged › Alarm Light","v":[3988,3688,3245],"delta":-443,"pct":-12.0},{"name":"Connectivity › No Sync › No DSL Light","v":[2595,2273,1952],"delta":-321,"pct":-14.1},{"name":"Connectivity › Losing Sync › Intermittent Connectivity","v":[6100,6065,5801],"delta":-264,"pct":-4.4},{"name":"Connectivity › ONT Not Ranged › No Power","v":[2003,1861,1646],"delta":-215,"pct":-11.6},{"name":"Wireless › Slow Speeds › All Devices Affected","v":[2135,2091,1909],"delta":-182,"pct":-8.7},{"name":"Connectivity › Incompatible Equipment › Not Required","v":[951,863,707],"delta":-156,"pct":-18.1},{"name":"Connectivity › No IP › No Internet Light","v":[1691,1543,1390],"delta":-153,"pct":-9.9}],"techR1":[{"name":"Education","v":[12410,11990,11123],"pct":-7.2},{"name":"Connectivity","v":[10663,10390,10345],"pct":-0.4},{"name":"(no closure code)","v":[7843,8061,8067],"pct":0.1},{"name":"GPON","v":[7544,7612,6896],"pct":-9.4},{"name":"HSIA","v":[7490,7030,6309],"pct":-10.3},{"name":"Customer","v":[4986,4666,4374],"pct":-6.3},{"name":"Cancel Ticket","v":[1370,1281,1186],"pct":-7.4},{"name":"Found OK","v":[1451,1138,929],"pct":-18.4},{"name":"Outside Plant","v":[1243,1190,903],"pct":-24.1},{"name":"IPTV","v":[753,771,709],"pct":-8.0},{"name":"Network Service Wire","v":[689,691,545],"pct":-21.1},{"name":"NetCracker","v":[702,460,493],"pct":7.2}],"techRising":[{"name":"Connectivity › Modem/Gateway","v":[7688,7701,7828],"delta":127,"pct":1.6},{"name":"HSIA › Boost Wi-Fi 6","v":[326,228,293],"delta":65,"pct":28.5},{"name":"Found OK › Avoidable Dispatch","v":[260,214,272],"delta":58,"pct":27.1},{"name":"NetCracker › Stuck","v":[645,411,452],"delta":41,"pct":10.0},{"name":"HSIA › Ethernet Card/Switch/Router/Hub","v":[125,182,201],"delta":19,"pct":10.4},{"name":"GPON › Provisioning","v":[404,388,389],"delta":1,"pct":0.3}],"techFalling":[{"name":"Education › HSIA","v":[11583,11174,10449],"delta":-725,"pct":-6.5},{"name":"HSIA › Modem/Gateway","v":[4410,4241,3617],"delta":-624,"pct":-14.7},{"name":"GPON › Inside Premise Equipment","v":[5130,5200,4742],"delta":-458,"pct":-8.8},{"name":"Customer › Customer Training/Education/Inquiry Only","v":[4311,4029,3754],"delta":-275,"pct":-6.8},{"name":"GPON › Outside Plant","v":[2010,2024,1765],"delta":-259,"pct":-12.8},{"name":"Found OK › Not Required","v":[965,705,452],"delta":-253,"pct":-35.9}],"divergence":{"all":[{"alignment":54.5,"nofault":39.6,"nontelus":4.0,"reattribution":45.5,"closed":50118},{"alignment":54.9,"nofault":39.0,"nontelus":4.1,"reattribution":45.1,"closed":48025},{"alignment":54.9,"nofault":38.7,"nontelus":3.6,"reattribution":45.1,"closed":44755}],"field":[{"alignment":84.9,"nofault":6.4,"nontelus":13.8,"reattribution":15.1,"visits":14452},{"alignment":83.6,"nofault":6.9,"nontelus":13.4,"reattribution":16.4,"visits":14636},{"alignment":83.9,"nofault":6.6,"nontelus":12.8,"reattribution":16.1,"visits":12543}],"perCat":[{"cat":"Connectivity › No Dataflow","n":12151,"alignment":55.7,"nofault":36.9,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Connectivity › Slow Speeds","n":6591,"alignment":56.6,"nofault":40.9,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Connectivity › Losing Sync","n":5984,"alignment":60.1,"nofault":32.2,"techTop":["Modem / gateway","Education / no fault"]},{"cat":"Connectivity › ONT Not Ranged","n":5592,"alignment":70.3,"nofault":26.4,"techTop":["Access line / fibre / ONT","Education / no fault"]},{"cat":"Wireless › Can't Connect","n":5312,"alignment":33.0,"nofault":57.8,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Wireless › Disconnects","n":4318,"alignment":33.8,"nofault":55.3,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Wireless › Slow Speeds","n":2901,"alignment":33.5,"nofault":56.7,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Connectivity › No Sync","n":2707,"alignment":66.7,"nofault":28.8,"techTop":["Access line / fibre / ONT","Education / no fault"]},{"cat":"Connectivity › Historical Data","n":2456,"alignment":81.3,"nofault":13.9,"techTop":["Access line / fibre / ONT","Education / no fault"]},{"cat":"Incompatible Equipment › Incompatible","n":1987,"alignment":73.8,"nofault":21.9,"techTop":["Access line / fibre / ONT","Modem / gateway"]},{"cat":"Connectivity › No IP","n":1546,"alignment":50.5,"nofault":45.7,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Connectivity › Incompatible Equipment","n":1183,"alignment":59.1,"nofault":36.5,"techTop":["Education / no fault","Modem / gateway"]}],"perCatField":[{"cat":"Connectivity › ONT Not Ranged","n":2769,"alignment":91.4,"nofault":4.9,"nontelus":20.8,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › No Dataflow","n":1671,"alignment":85.0,"nofault":6.4,"nontelus":9.7,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › Losing Sync","n":1627,"alignment":79.0,"nofault":7.3,"nontelus":7.3,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › Historical Data","n":1566,"alignment":92.6,"nofault":3.1,"nontelus":15.1,"techTop":"Access line / fibre / ONT"},{"cat":"Incompatible Equipment › Incompatible","n":1083,"alignment":89.3,"nofault":6.5,"nontelus":6.5,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › Slow Speeds","n":1043,"alignment":85.5,"nofault":9.4,"nontelus":11.2,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › No Sync","n":1010,"alignment":89.8,"nofault":5.6,"nontelus":9.0,"techTop":"Access line / fibre / ONT"},{"cat":"Wireless › Disconnects","n":543,"alignment":47.9,"nofault":12.0,"nontelus":12.3,"techTop":"Access line / fibre / ONT"},{"cat":"Wireless › Can't Connect","n":368,"alignment":45.8,"nofault":12.5,"nontelus":16.1,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › Incompatible Equipment","n":348,"alignment":87.6,"nofault":8.0,"nontelus":7.8,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › No IP","n":304,"alignment":80.4,"nofault":12.6,"nontelus":17.9,"techTop":"Access line / fibre / ONT"},{"cat":"Wireless › Slow Speeds","n":254,"alignment":50.8,"nofault":8.7,"nontelus":11.4,"techTop":"Access line / fibre / ONT"}]},"closure":[{"tickets":58787,"field_visit_pct":24.7,"agent_education_closure_pct":28.8,"no_closure_code_pct":13.3},{"tickets":56761,"field_visit_pct":25.9,"agent_education_closure_pct":28.4,"no_closure_code_pct":14.2},{"tickets":53440,"field_visit_pct":23.6,"agent_education_closure_pct":28.3,"no_closure_code_pct":15.1}],"determination":[[12490,2000],[12704,1969],[10977,1608]],"fixes":[{"name":"ONT replaced / light level / fibre splice","v":[4631,4647,4115],"pct":-11.4},{"name":"Wi-Fi / Boost extender placement or replaced","v":[3887,4167,3686],"pct":-11.5},{"name":"Drop / service wire / outside plant","v":[1733,1597,1319],"pct":-17.4},{"name":"Inside wiring / jack / ethernet","v":[1352,1350,1176],"pct":-12.9},{"name":"Provisioning / profile / port fix","v":[1114,1046,998],"pct":-4.6},{"name":"Modem / gateway replaced","v":[1160,1109,901],"pct":-18.8},{"name":"Education / no fault found / working on arrival","v":[799,817,710],"pct":-13.1},{"name":"Power cycle / factory reset / firmware","v":[675,733,641],"pct":-12.6},{"name":"Power supply / power","v":[157,151,167],"pct":10.6},{"name":"Customer-owned equipment / third-party router","v":[74,64,54],"pct":-15.6}],"commentCoverage":[45489,43185,41042],"themes":[{"name":"ONT / fibre / light level","v":[15321,14339,13694],"pct":-4.5},{"name":"Slow speed / buffering","v":[11736,10884,10639],"pct":-2.3},{"name":"No internet / all devices down","v":[11426,10453,9414],"pct":-9.9},{"name":"Dispatch / technician booked","v":[9936,9720,8934],"pct":-8.1},{"name":"Boost / Wi-Fi extender","v":[9214,8564,8674],"pct":1.3},{"name":"Intermittent drops / disconnects","v":[8267,7882,7987],"pct":1.3},{"name":"Firmware / settings / factory reset","v":[7861,7194,7044],"pct":-2.1},{"name":"Work from home / streaming / gaming impact","v":[7098,7014,7288],"pct":3.9},{"name":"Outage / active network event","v":[7478,6666,6373],"pct":-4.4},{"name":"DSL / copper line","v":[6582,5932,5178],"pct":-12.7},{"name":"Red / alarm light / LOS on ONT or modem","v":[5862,5306,5067],"pct":-4.5},{"name":"Repeat / recurring issue","v":[5399,4871,4690],"pct":-3.7},{"name":"Wi-Fi: cannot connect / single device","v":[3058,2823,2897],"pct":2.6},{"name":"No power / dead equipment","v":[2837,2616,2527],"pct":-3.4},{"name":"Modem / gateway swap shipped","v":[1141,1131,1155],"pct":2.1},{"name":"Customer wants tech / refuses troubleshooting","v":[846,918,915],"pct":-0.3},{"name":"Third-party / customer-owned router","v":[399,407,435],"pct":6.9}],"devices":[{"name":"ONT (Nokia / Huawei / Calix)","v":[37555,35238,34588],"pct":-1.8},{"name":"NH20 / NAH (Network Access Hub)","v":[15519,14383,14132],"pct":-1.7},{"name":"T3200M gateway","v":[10778,10304,9430],"pct":-8.5},{"name":"Actiontec / legacy modem","v":[5395,5211,4651],"pct":-10.7},{"name":"Boost Wi-Fi 6","v":[3313,2948,2669],"pct":-9.5},{"name":"Boost Wi-Fi 7 (BV3)","v":[1551,1645,1727],"pct":5.0},{"name":"Wi-Fi Hub / WFH","v":[1852,1639,1409],"pct":-14.0},{"name":"Boost Lite (BLite)","v":[610,613,616],"pct":0.5}],"access":[{"name":"Fibre (PureFibre / ONT)","v":[42320,39955,39022],"pct":-2.3},{"name":"Copper (DSL / bonded)","v":[27785,27108,25022],"pct":-7.7}],"domainMix":[{"agent":"Gateway / dataflow","n":12066,"v":[1967,3739,635,804,15,114,4570,212]},{"agent":"Access line & ONT","n":13995,"v":[5756,2814,311,847,55,209,3779,219]},{"agent":"Speed","n":5628,"v":[666,1972,321,223,1,54,2301,86]},{"agent":"Wi-Fi","n":10514,"v":[716,2821,599,155,0,84,5960,172]},{"agent":"Equipment compatibility","n":2552,"v":[842,735,107,51,0,43,704,68]}],"closureDomains":["Access line / fibre / ONT","Modem / gateway","Wi-Fi / extenders","Provisioning / back office","Outage","Customer / non-TELUS equipment","Education / no fault","Other product"]}};

// ---------------------------------------------------------------------------
// TV Review: side-load cohorts. Aggregates by deployment date from Chris Tanner's Sideload
// Pre/Post Dashboard (No Boot and Valid IP by deployment date, shared 2 Nov 2026): the
// deployment dates with more than 10,000 devices, each device compared over the days before
// and after its own side-load date (preDays / postDays are the average window lengths). Each
// measure is [before, after] as the % of devices in the window with one ticket (one) or two
// or more tickets (two) in the No Boot and Valid IP ticket groups; two decimals in the source.
// No customer data, and no split by sub-category or by All STBs / One STB.
// ---------------------------------------------------------------------------
const SIDELOAD = {
  asOf: "2 Nov 2026", owner: "Chris Tanner",
  cohorts: [
    { date: "2026-05-11", devices: 13459, preDays: 84, postDays: 85, oneNB: [1.55, 2.62], twoNB: [0.13, 0.21], oneVIP: [0.59, 1.38], twoVIP: [0.01, 0.03] },
    { date: "2026-05-12", devices: 14295, preDays: 84, postDays: 84, oneNB: [1.56, 2.77], twoNB: [0.14, 0.19], oneVIP: [0.48, 1.41], twoVIP: [0.00, 0.04] },
    { date: "2026-07-15", devices: 38430, preDays: 87, postDays: 81, oneNB: [1.34, 2.75], twoNB: [0.15, 0.22], oneVIP: [0.44, 1.41], twoVIP: [0.01, 0.04] },
    { date: "2026-07-16", devices: 26338, preDays: 87, postDays: 81, oneNB: [1.37, 2.96], twoNB: [0.14, 0.30], oneVIP: [0.41, 1.25], twoVIP: [0.01, 0.05] },
    { date: "2026-07-28", devices: 35634, preDays: 85, postDays: 81, oneNB: [1.43, 2.78], twoNB: [0.18, 0.24], oneVIP: [0.43, 1.32], twoVIP: [0.03, 0.04] },
    { date: "2026-07-29", devices: 16581, preDays: 85, postDays: 81, oneNB: [1.41, 2.73], twoNB: [0.08, 0.32], oneVIP: [0.45, 1.29], twoVIP: [0.00, 0.02] },
    { date: "2026-07-30", devices: 10374, preDays: 86, postDays: 81, oneNB: [1.43, 2.61], twoNB: [0.16, 0.19], oneVIP: [0.53, 1.35], twoVIP: [0.01, 0.04] },
    { date: "2026-08-04", devices: 25835, preDays: 86, postDays: 80, oneNB: [1.30, 2.67], twoNB: [0.09, 0.22], oneVIP: [0.45, 1.29], twoVIP: [0.00, 0.04] },
    { date: "2026-08-05", devices: 36519, preDays: 86, postDays: 79, oneNB: [1.45, 2.81], twoNB: [0.15, 0.25], oneVIP: [0.48, 1.19], twoVIP: [0.01, 0.03] },
    { date: "2026-08-10", devices: 23430, preDays: 86, postDays: 74, oneNB: [1.46, 2.61], twoNB: [0.14, 0.23], oneVIP: [0.38, 1.12], twoVIP: [0.00, 0.05] },
    { date: "2026-08-11", devices: 13301, preDays: 86, postDays: 73, oneNB: [1.65, 2.51], twoNB: [0.14, 0.19], oneVIP: [0.43, 1.26], twoVIP: [0.00, 0.04] }
  ]
};
// Derived figures shared by the Review page, the deck and the MCP page.
function sideloadStats(SL) {
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const cs = [...SL.cohorts].sort((a, b) => (a.date < b.date ? -1 : 1));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const KEYS = ["oneNB", "twoNB", "oneVIP", "twoVIP"];
  const rel = (a, b) => (a ? ((b - a) / a) * 100 : null);
  const wavg = (list, k, j) => sum(list.map((c) => c.devices * c[k][j])) / sum(list.map((c) => c.devices));
  const devices = sum(cs.map((c) => c.devices));
  const m = {}; KEYS.forEach((k) => { m[k] = [wavg(cs, k, 0), wavg(cs, k, 1)]; });
  const anyNB = [m.oneNB[0] + m.twoNB[0], m.oneNB[1] + m.twoNB[1]], anyVIP = [m.oneVIP[0] + m.twoVIP[0], m.oneVIP[1] + m.twoVIP[1]];
  const per30 = (c, ks, j) => (sum(ks.map((k) => c[k][j])) * 30) / (j ? c.postDays : c.preDays);
  const extra = (ks) => sum(cs.map((c) => (c.devices * (per30(c, ks, 1) - per30(c, ks, 0))) / 100));
  const rows = cs.map((c) => ({ ...c, short: `${+c.date.slice(8)} ${MON[+c.date.slice(5, 7) - 1]}`, up: Object.fromEntries(KEYS.map((k) => [k, rel(c[k][0], c[k][1])])), totalPp: sum(KEYS.map((k) => c[k][1] - c[k][0])) }));
  const group = (list) => ({ devices: sum(list.map((c) => c.devices)), upOneNB: rel(wavg(list, "oneNB", 0), wavg(list, "oneNB", 1)) });
  const upOne = rows.map((r) => r.up.oneNB);
  return {
    n: cs.length, devices, m, anyNB, anyVIP, rows,
    upOneNB: rel(...m.oneNB), upTwoNB: rel(...m.twoNB), upOneVIP: rel(...m.oneVIP), upTwoVIP: rel(...m.twoVIP), upAnyNB: rel(...anyNB), upAnyVIP: rel(...anyVIP),
    repNB: [(m.twoNB[0] / anyNB[0]) * 100, (m.twoNB[1] / anyNB[1]) * 100],
    repAddedNB: ((m.twoNB[1] - m.twoNB[0]) / (anyNB[1] - anyNB[0])) * 100,
    pairs: cs.length * KEYS.length, worse: sum(cs.map((c) => KEYS.filter((k) => c[k][1] > c[k][0]).length)),
    preDays: sum(cs.map((c) => c.devices * c.preDays)) / devices, postDays: sum(cs.map((c) => c.devices * c.postDays)) / devices,
    postNotLonger: cs.filter((c) => c.postDays <= c.preDays).length,
    extra: { nb: extra(["oneNB", "twoNB"]), vip: extra(["oneVIP", "twoVIP"]) },
    may: group(cs.filter((c) => c.date < "2026-06-01")), julAug: group(cs.filter((c) => c.date >= "2026-06-01")),
    upMin: Math.min(...upOne), upMax: Math.max(...upOne),
    twoVIPRange: [Math.min(...cs.flatMap((c) => c.twoVIP)), Math.max(...cs.flatMap((c) => c.twoVIP))],
    largest: rows.reduce((a, b) => (b.totalPp > a.totalPp ? b : a))
  };
}
const SLS = sideloadStats(SIDELOAD);

// ---------------------------------------------------------------------------
// TV Review: STB No Boot › Stuck on Initializing, Aug – Oct 2026.
// daily.*: agent ticket exports (TV notes files, Aug 1 – Oct 30; the October export ends on
//   the 30th), counts per day of all TV
//   tickets, Stuck on Initializing tickets and the Category 3 split (All STBs Affected /
//   Multiple STBs Affected / One STB Affected). looker.*: the Churn Measurement 2026
//   workbook's TV Looker Ticket Categories tab (Look 2154), Optik TV (Legacy) › STB No
//   Boot › Stuck on Initializing by Category 3, Jan 2025 – Oct 2026 (full months; workbook
//   refreshed 2 Nov). markers: regex counts over the agent notes and resolution text of
//   Stuck on Initializing tickets, Sep and Oct 1 – 30, same patterns both months.
//   sideload: the SIDELOAD cohorts above (device-level pre/post test of the leading cause).
//   causes / actions: the STB No Boot interlocks of 21, 22, 27 and 28 Oct 2026.
// ---------------------------------------------------------------------------
const TV_REVIEW = {"asOf":"30 Oct 2026","period":"Aug – Oct 2026","octDays":30,"daily":{"aug":{"label":"Aug 2026","days":31,"tickets":[715,611,1034,1088,1030,1151,1018,733,734,1113,1285,1192,1138,1120,955,729,1160,1191,1314,1217,1227,970,872,1161,1298,1219,1166,1285,905,820,1163],"stuck":[85,79,107,107,106,130,98,102,96,129,135,129,116,133,156,114,146,163,149,147,161,157,142,168,179,172,159,144,124,112,139],"all":[36,27,36,29,32,45,27,35,31,38,45,30,33,49,52,38,60,59,60,40,57,65,59,63,74,63,67,57,38,46,55],"multi":[5,6,14,6,8,14,2,9,5,18,13,18,12,13,14,8,13,14,11,14,17,10,13,15,19,23,12,16,8,10,10],"one":[44,46,57,72,66,71,69,58,60,73,77,81,71,71,90,68,73,90,78,93,87,82,70,90,86,86,80,71,78,56,74]},"sep":{"label":"Sep 2026","days":30,"tickets":[1255,1263,1312,1280,955,823,1145,1336,1354,1408,1362,1028,990,1446,1351,1308,1267,1304,1129,989,1306,1363,1386,1288,1374,1164,1018,1336,1415,1348],"stuck":[151,138,174,160,143,124,168,179,188,199,209,166,154,204,187,186,175,201,146,166,156,180,188,189,191,155,141,198,175,179],"all":[61,57,70,73,63,52,79,83,85,78,80,73,73,87,82,82,71,84,70,80,55,74,87,89,73,68,60,82,74,81],"multi":[12,16,15,12,11,13,6,17,10,18,23,16,13,17,12,17,16,19,8,11,13,17,18,14,13,13,11,11,13,14],"one":[78,65,89,75,69,59,83,79,93,103,106,77,68,100,93,87,88,98,68,75,88,89,83,86,105,74,70,105,88,84]},"oct":{"label":"Oct 2026","days":30,"tickets":[1275,1273,1057,979,1370,1318,1291,1122,1319,1086,876,1050,1307,1391,1218,1268,1204,1089,1341,1382,1155,1267,1288,1196,899,1311,1429,1303,1325,1278],"stuck":[195,156,181,165,190,158,190,165,163,149,142,161,149,176,179,172,167,182,193,201,158,175,151,158,131,180,164,141,148,148],"all":[92,60,80,76,88,72,86,66,79,68,60,64,74,61,81,81,75,92,79,100,66,88,65,66,57,64,67,60,66,47],"multi":[14,14,13,13,21,13,14,16,8,12,10,11,13,9,5,10,7,8,15,10,14,9,11,18,7,21,14,7,10,12],"one":[89,82,88,76,81,73,90,83,76,69,72,86,62,106,93,81,85,82,99,91,78,78,75,74,67,95,83,74,72,89]}},
  "looker":{"months":["Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025","Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026","Jul 2026","Aug 2026","Sep 2026","Oct 2026"],"one":[3247,3154,3471,3454,3370,3191,3254,2772,2364,2626,2764,2773,2865,2377,2318,2286,2065,2108,2360,2301,2559,2569],"all":[1200,1232,1356,1255,1324,1321,1307,1168,1043,1187,1217,1209,1218,1018,1046,1179,1076,1084,1027,1470,2244,2258],"multi":[434,364,407,430,412,383,405,343,309,377,372,382,391,287,292,319,321,278,325,378,433,378],"total":[4881,4750,5234,5139,5106,4895,4966,4283,3716,4190,4353,4364,4474,3682,3656,3784,3462,3470,3712,4149,5236,5205],"mtdDays":31,"baseline":{"one":2340,"all":1093,"multi":316,"total":3749},"baseline2025":{"one":3037,"all":1235,"multi":385,"total":4656},"baselineLabel":"Jan – Jul 2026 average","source":"TV Looker Ticket Categories tab (Look 2154), Optik TV (Legacy) › STB No Boot › Stuck on Initializing by Category 3; October is the full month (workbook refreshed 2 Nov 2026)."},
  "stbNoBoot":[{"name":"Stuck on Initializing","v":[4084,5170,4988]},{"name":"Reboot Loop","v":[906,1070,922]},{"name":"Quick Client Initialization Error","v":[553,654,562]},{"name":"Stuck on PVR is Starting","v":[460,490,453]},{"name":"Registration Code","v":[417,364,344]},{"name":"Stuck on TELUS Logo","v":[233,309,241]},{"name":"Red X","v":[248,247,302]},{"name":"Stuck on Quit Client Error","v":[189,204,191]}],"stbNoBootTotal":[7097,8514,8005],
  "markers":[{"name":"T3200M gateway named","v":[1644,1527]},{"name":"NH20 gateway named","v":[76,73]},{"name":"VIP5662W (Mediaroom PVR) named","v":[1460,1306]},{"name":"VIP5602W (Mediaroom wSTB) named","v":[1330,1222]},{"name":"Hardwired / Ethernet mentioned","v":[789,767]},{"name":"Sequential reboot in notes","v":[1928,1696]},{"name":"Dispatch flag","v":[495,460]},{"name":"Technician determination","v":[363,312]}],"markersBase":[5170,4988],"t3200ShareOfGatewayNamed":[95.6,95.4],"commentCoverage":{"oct":[20495,36667],"sep":[20401,37303]},
  sideload: SIDELOAD,
  // Root-cause hypotheses as the interlocks left them on 28 Oct 2026. status: leading | contributing | open | ruled out
  causes: [
    { name: "CloudCheck agent side-load upgrade on the T3200M gateway", status: "leading", evidence: `Agent v2.5 to 3.418 rolled out 6 July to 16 August, app customers first and then randomly across the T3200M base; the update lets changes reach the gateway without a reboot. Onset lags two to four weeks, which matches the climb through August into September. About 70% of affected customers are on the T3200M and 95% of Stuck tickets that name a gateway name the T3200M; no correlation to STB model, single versus multi-STB, or fibre versus copper. First device-level test (Chris Tanner, 2 Nov): across ${SLS.n} side-load dates, devices with a No Boot ticket rose from ${SLS.anyNB[0].toFixed(2)}% to ${SLS.anyNB[1].toFixed(2)}% after the side-load, in every cohort.`, next: "Alan Chiu to compile the agent release delta; Chris Tanner and Chris Havlin to analyse the pre/post signature on gateway markers; results due the week of 2 Nov." },
    { name: "Gateway uptime: stale NAT tables and memory or CPU build-up", status: "contributing", evidence: "Ticketed customers skew to gateways with no reboot in more than 30 days; relative risk rises past two weeks of uptime and technician notes point to a 90 to 120 day window. About 12% of ticketed gateways had no reboot even after the ticket. The symptom is middleware sync loss that presents as every STB stuck on Initializing, which is why the rise is almost entirely All STBs Affected.", next: "Sequential gateway-then-STB reboot campaign, small cohort first (Jawad data lead)." },
    { name: "Miscategorised internet tickets", status: "contributing", evidence: `HS Valid IP and No Dataflow tickets for Mediaroom customers are also elevated and are likely the same fault logged under internet categories, so the ticket count here understates the customer impact. The side-load cohorts confirm it: devices with a Valid IP ticket rose from ${SLS.anyVIP[0].toFixed(2)}% to ${SLS.anyVIP[1].toFixed(2)}% after the side-load.`, next: "Include Mediaroom HSIA categories in the campaign measurement." },
    { name: "Seasonal September and October peak", status: "contributing", evidence: "Both months peak every year, but the 2025 baseline was 1,043 to 1,187 All STBs Affected tickets a month against 2,244 in September 2026, so seasonality explains a small part of the rise at most.", next: "None; keep as context." },
    { name: "Cujo disabled on the T3200M from 25 September", status: "ruled out", evidence: "The issue predates the change and the daily series shows no step on or after 25 September.", next: "None." },
    { name: "T3200M firmware", status: "ruled out", evidence: "Unchanged for years; nothing shipped in the window.", next: "None." },
    { name: "Repeat callers as the main driver", status: "ruled out", evidence: `Repeats rose too (devices with two or more No Boot tickets ${SLS.m.twoNB[0].toFixed(2)}% to ${SLS.m.twoNB[1].toFixed(2)}%), but they stay about ${Math.round(SLS.repNB[1])}% of affected devices and ${Math.round(SLS.repAddedNB)}% of the devices added; the growth is more customers hitting the fault once, not the same customers calling back.`, next: "None." },
    { name: "Roll the CloudCheck agent back", status: "ruled out", evidence: "Rejected: the earlier agent carries known security vulnerabilities.", next: "Fix forward through the reboot campaign and the agent release review." }
  ],
  // What is being done. kind: initiative (in the register) | action (interlock commitment)
  actions: [
    { kind: "initiative", name: "Sequential Reboot for Stuck on Initializing", owner: "Z. Sayhebolay", when: "Nov 2026", status: "In flight", detail: "Proactive gateway-then-STB reboot for Mediaroom plus internet two-play households, excluding OPUS and SHS mixed homes. InSight and Sweepr confirmed the sequence waits for the gateway before the STB. A small cohort campaign was agreed on 22 Oct; testing is still needed before scale." },
    { kind: "initiative", name: "InSight TV Hardware Check fix", owner: "Z. Sayhebolay", when: "Oct 2026", status: "Launched", detail: "Fixes the InSight TV Hardware Check used on STB and gateway faults so agents see the gateway state before they swap the box." },
    { kind: "initiative", name: "PSU Replacement Campaign", owner: "D. Culp", when: "Sep 2025", status: "On Hold", detail: "OPUS power-supply swaps, not a Stuck on Initializing fix. On hold since August because the new courier requires a signature; 40k static list, 100k units in stock and 120k free units from Vantiva; list validation under way." },
    { kind: "action", name: "Agent release delta (CloudCheck v2.5 to 3.418)", owner: "Alan Chiu", when: "Week of 2 Nov 2026", status: "Open", detail: "Compile what changed in the side-loaded agent and when each cohort received it." },
    { kind: "action", name: "Pre/post signature on gateway markers", owner: "Chris Tanner, Chris Havlin", when: "Week of 2 Nov 2026", status: "In progress", detail: "Compare gateway uptime, memory and NAT markers before and after the agent rollout for ticketed and non-ticketed T3200M customers. A first cut by side-load date, on ticket rates per device, was shared on 2 Nov (section 5)." },
    { kind: "action", name: "Reboot cohort data and campaign list", owner: "Jawad", when: "Nov 2026", status: "Open", detail: "Build the no-reboot-over-30-days cohort and the two-play exclusion list for the sequential reboot pilot." },
    { kind: "action", name: "October full-month read", owner: "Reliability Strategy", when: "Early Nov 2026", status: "Done", detail: "Re-run on the completed month on 2 Nov: Looker to the full month, agent exports to 30 Oct, TV notes analysis rolled to Aug to Oct." }
  ]
};

// TV October Review: what drove the rise in TV video tickets in October. Aggregates from the Sep and Oct
// agent/technician note exports (Oct 1 - 30; no customer data retained). Notes are keyword-classified, so
// shares are indicative. "Stutter" = Video Issues > Stop/Stuttering/Freezing; "Video quality" adds Pixelization.
const OCT_REVIEW = {
  asOf: "30 Oct 2026", files: 36667, looker: 37942, lookerSep: 37535, lookerAug: 32800, pik: [1286, 1228],
  stutter: {
    sep: [83,62,74,73,64,46,56,86,69,96,78,77,59,78,82,96,93,79,56,65,96,77,95,67,96,75,53,81,87,104],
    oct: [74,88,76,74,118,89,72,83,102,82,68,77,108,111,91,100,92,161,114,89,61,94,86,86,67,89,100,96,102,84]
  },
  outage: { day: 18, area: "Calgary, AB", peak: 161, next: 114, normal: 85, citing: 54, citingNext: 9 },
  categories: [["Video Issues", 7558, 8202], ["Channel Issues", 4559, 4933], ["Recording Issues", 5115, 5264], ["STB No Boot", 8626, 8324], ["Digital Box", 4923, 4776], ["Other categories", 6754, 6443]],
  movers: [
    ["Video Issues › Stop/Stuttering/Freezing", 2307, 2813], ["Channel Issues › Missing Channels", 1926, 2128], ["Video Issues › Pixelization", 299, 444],
    ["Channel Issues › Channel Not Working", 2250, 2355], ["Recording Issues › Cannot Set Recordings", 3403, 3454],
    ["STB No Boot › Stuck on Initializing", 5236, 5205], ["Digital Box › No Boot", 2419, 2253], ["STB No Boot › Reboot Loop", 1077, 959], ["Remote › Programming", 1057, 975]
  ],
  video: { n: [2601, 3160], rca: [360, 425], fixN: [294, 342], stutterN: [2303, 2734] },
  causes: [
    ["Packet loss, discontinuities or multicast drops (xVu / InSight)", 36, 44], ["STB hardware degradation or failing box", 39, 40],
    ["Middleware, provisioning or profile out of sync", 34, 34], ["Wi-Fi to wireless STBs (weak signal, 5 GHz interference, dead spots)", 28, 32],
    ["Long uptime, buffer or cache corruption", 26, 24], ["Line, ONT, fibre or light level", 18, 17], ["Bandwidth or congestion", 12, 15],
    ["Cabling, coax, splitters", 14, 12], ["Active area outage", 1, 3]
  ],
  fixes: [
    ["Replaced the STB (swap kit, self-repair)", 32, 30], ["Sequential reboot (ONT, modem, STB)", 36, 30], ["Technician dispatch or field visit", 17, 21],
    ["Education or setting expectations", 20, 21], ["Wired or moved the STB, booster, WPS, Wi-Fi channel change", 18, 18],
    ["Escalated (Tier 2, outage team, Core)", 11, 16], ["IPD, middleware or stream-profile refresh", 4, 5]
  ],
  missing: {
    n: [1919, 2060], rca: [266, 253], unsubscribed: [910, 1071],
    causes: [["Middleware, provisioning or subscription out of sync", 80, 79], ["TELUS TV+ app cache or data", 18, 14], ["Gateway reboot, uptime or firmware", 9, 12], ["STB hardware", 5, 5]],
    fixes: [["Education or advised the customer", 85, 84], ["Sync or refresh (Fix My Account, subscription, stream profile, guide)", 49, 46], ["Reboot", 44, 44], ["Escalated (Tier 2, Synapse provisioning)", 31, 31], ["STB swap", 8, 8]]
  },
  // Category x platform from the notes (device models in the InSight lines), 62% of tickets identified; Oct export ends 30 Oct.
  platformNotes: [["Video Issues", 2645, 2843, 2400, 2436], ["STB No Boot", 4251, 3787, 490, 477], ["Recording Issues", 3211, 3202, 167, 203], ["Channel Issues", 862, 809, 1945, 2135], ["Digital Box", 158, 124, 3298, 3230]],
  uptime: { cited: [54, 53], d30: [37, 32], d90: [20, 16], median: [54, 36] },
  diag: [["Underruns", 23, 63], ["Discontinuities", 11, 34], ["Multicast", 18, 45]]
};

const LIGHT_COLOR = { HSIA: "#7C53A5", TQ: "#9A6B00", PFE: "#B0447C", TV: "#2B8000", SHS: "#2a78d6", "SH+": "#00838F", FFH: "#eb6834", All: "#4B286D", SWEEPR: "#eb6834", LEGACY: "#2B8000", OPUS: "#eb6834", MIXED: "#7C53A5", FFPS: "#A3268A" };
const DARK_COLOR  = { HSIA: "#7C53A5", TQ: "#E0A93B", PFE: "#E577A8", TV: "#2B8000", SHS: "#3987e5", "SH+": "#26A5B3", FFH: "#d95926", All: "#C9A9E8", SWEEPR: "#d95926", LEGACY: "#2B8000", OPUS: "#d95926", MIXED: "#9B7BC2", FFPS: "#D77BC4" };
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
const TELUS_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABP4AAAGfCAYAAADPkByYAAAACXBIWXMAAC4jAAAuIwF4pT92AAAgAElEQVR4nO3dz2+keX4X8Kcm+yMZhXQv2hxQSMbhAsWBaWQJhKJkvBKIHEoa5xYk0HgPULcar4TEIaBx/wXj8c1cxn3iEnbcyBdE0NqQa2ltCcmARLYdEimwkTJOoiU7SbbQt+fzzD5dZbvrx1NVz/Ot10sq9W6Vu7t+PNNV9X4+Pzqj0agAAAAAAPLyhtcTAAAAAPIj+AMAAACADAn+AAAAACBDgj8AAAAAyJDgDwAAAAAyJPgDAAAAgAwJ/gAAAAAgQ4I/AAAAAMiQ4A8AAAAAMiT4AwAAAIAMCf4AAAAAIEOCPwAAAADIkOAPAAAAADIk+AMAAACADAn+AAAAACBDgj8AAAAAyJDgDwAAAAAyJPgDAAAAgAwJ/gAAAAAgQ4I/AAAAAMiQ4A8AAAAAMiT4AwAAAIAMCf4AAAAAIEOCPwAAAADIkOAPAAAAADIk+AMAAACADAn+AAAAACBDgj8AAAAAyJDgDwAAAAAyJPgDAAAAgAwJ/gAAAAAgQ4I/AAAAAMiQ4A8AAAAAMiT4AwAAAIAMCf4AAAAAIEOCPwAAAADIkOAPAAAAADIk+AMAAACADAn+AAAAACBDgj8AAAAAyJDgDwAAAAAyJPgDAAAAgAwJ/gAAAAAgQ4I/AAAAAMiQ4A8AAAAAMiT4AwAAAIAMCf4AAAAAIEOCPwAAAADIkOAPAAAAADIk+AMAAACADAn+AAAAACBDgj8AAAAAyJDgDwAAAAAyJPgDAAAAgAwJ/gAAAAAgQ4I/AAAAAMiQ4A8AAAAAMiT4AwAAAIAMCf4AAAAAIEOCPwAAAADIkOAPAAAAADIk+AMAAACADAn+AAAAACBDgj8AAAAAyJDgDwAAAAAyJPgDAAAAgAwJ/gAAAAAgQ4I/AAAAAMiQ4A8AAAAAMiT4AwAAAIAMCf4AAAAAIEOCPwAAAADIkOAPAAAAADIk+AMAAACADAn+AAAAACBDgj8AAAAAyJDgDwAAAAAyJPgDAAAAgAwJ/gAAAAAgQ4I/AAAAAMiQ4A8AAAAAMiT4AwAAAIAMCf4AAAAAIEOCPwAAAADIkOAPAAAAADIk+AMAAACADAn+AAAAACBDgj8AAAAAyJDgDwAAAAAyJPgDAAAAgAwJ/gAAAAAgQ4I/AAAAAMiQ4A8AAAAAMiT4AwAAAIAMCf4AAAAAIEOCPwAAAADIkOAPAAAAADIk+AMAAACADAn+AAAAACBDgj8AAAAAyJDgDwAAAAAyJPgDAAAAgAwJ/gAAAAAgQ4I/AAAAAMiQ4A8AAAAAMiT4AwAAAIAMCf4AAAAAIEOCPwAAAADI0Je8qAD56A87j4uieFIUxc7Ygzo/3h6de6kBAAA2R2c0Gnm5AVoswr7duLz7wCO5LYri8Hh7dDBxCwAAANkR/AG0VH/Y2SqKYr8oir2iKB7N8Ciu0u853h5dTtwCAABANgR/AC0TFX6HRVG8t8A9T9V/O8I/AACAfAn+AFoiAr/9uMxS4XefmzQP8Hh79Ok9t7Nhet1BdUbkk7i8VRTFxdn10fjcSAAAoOEs9wBogf6wsxtVfm/VeG/Tn3UQQSIb5oGQ7y7CYQAAaCEVfwANFnP8Dl+ztGNRX1P1l7cZQ75SmgV5mi5n10dawgEAoIVU/AE0VH/Y2Y+KvDraeh+yF+EiGeh1B1uVcK8M+qY5hlLr93mEfedn10fCYAAAaDnBH0DDxCy/FL68s6J7tiP4a6cFQr7SRSXoU9UHAACZEfwBNEjM8jtZQZVf1eOJa2icGkK+Itp3zyPoO524FQAAyIrgD6ABosovVd295/WgppAvuS0r+iLsezHxEwAAQLYEfwBr1h92nkSV39tei81TY8hX0r4LAAC8JPgDWKP+sFMu1lhla+84SxxWZAkhX6F9FwAAuI/gD2ANltTaexF/ZgoT35249X6qwpZgSSFfoX0XAACYluAPYMX6w85WBDd1tfamIGjveHv0storWocFfyu0xJCvpH0XAACYmeAPYIX6w85OBDh1hULPI/SrtuvuTvzUwwRJM1hByFdU2ndPz66PziduBQAAmEJnNBp5ngBWoD/s7BdF8WFNf1Oq8ts/3h6dVK+MasLvTfz0/W6Ot0db99664VYU8iU3ZdAXVX3mLgIAAAtT8QewZEuY55eqwXaPt0d3zXY7mLjmYarJwgpDviKC22rQd9drCQAAsBDBH8ASReh3XuM8v6fH26M7w734u2Zt893ILbC97uBJJeRLl3cmfqh+5vQBAAArJfgDWJJYsnFe4ybXVOX3UIXe/ox/1225ECRnawr5iqjMLIO+h143AACApRD8ASxBf9hJlXcnNYV+FxH63Tv3Lar99idueFh2od8aQ76ispDj3Jw+AACgCQR/ADXrDzt7RVF8XNOfem9r75hZq/2KCCZba80hX1FZyHFuTh8AANBEtvoC1Kg/7JzUtMQjtfbuTdOKG9V+L2YM/lq1zbcBIV9RWcjxcimHoA8AAGg6FX8ANah5c+9DW3vvcjhHtd/hxDUN0ZCQr/S8UtFnIQcAANAqgj+ABdW8ufdZatt9aJ5fVSwQmTVsvG1Km2/DQr4i5imeW8gBAADkQPAHsIAI3k5qCv2+dbw9mrUSb54A73DaYLFODQz5iupCjrPro+w3HAMAAJtF8Acwpwj9zmvY3Hsbrb0zVZj1h539OQPHpVf7NTTkK2zeBQAANongD2AOsbl3ntl642ad5/dSf9hJizmm2fY77tmsf9frNDjkK2zeBQAANpngD2BGEfp9XMPz9jw2985TdXYyR+iYKgv3J66dQa872CmKYquhIV8h6AMAAPgxwR/ADPrDTqrye7+G5+yj4+3RXCFctPjOE7jNNNsvQr5qJV8dcwzrdlsJ+k4FfQAAAD8m+AOYUn/YOZljg+5dvnm8PZprzl7MFZynxfc2WpPv1JKQrxgL+lJF3+XETwAAsPF63cHj+FxbGv//9xmfu31pLjRt1hmNRl5AgAf0h53H0Vr77v0/NZUUWu0cb4/mDqv6w87lnKHcF2Fji0K+QtAHAMB9YtZ0dQxNGe4tOof7PhdxffpM+mn8+sJnVJpM8AfwgAj9zmsIx65int8iod9cbcZ/+f2f+V9/8K33frsFIV/pohL0zbTpGACAPEUF305cmjhrOn3efxFhoM+xNIbgD+AesTn3tKbQb2fOJR4v9Yed3aIoPpm4YQr/9zd+vfjzm59d4O4vnaBvBaLSk/VoVYuQY2UmL3KdLdrrDraiimYdsn1e12XNr2fyaZMqohrw75zW0SlFRd9uXNpwAnvc1Vj3SmNe93huH1euclxmyow/gDvELL3zGtoEnh1vj/Ymrp1B3Je5ZgL+6X98u4mhn6BvPb6ziQ+6Ib5xx7ygJnOsTO/pnHNX2yC9d32wpvuZ8/O6Lut8PYt472/SSYV1/zvXtveFlYqgei8ub7X84bwdl5ddO73u4CIKC9aylK7XHezG83rnCKNed3AT9+/QCZh8CP4AxtQY+s29ubeUWo1H/+8rv9n5qc9mvi9/+Yd/pfiTf//3J65fA0EfAAAPilBqv4EtvHV6Jy4f9rqDqzi5v/QQMKr7TsaqJq9iTmHpSQStKaR8v9cdPD27PnISJgOCP4CKaKk9qSH0m2tz7/jija/1u2+/+cvXEz83jT86/kfFj37w1QUfxlwEfQAATKXXHexFlW/bq/tmlUK4DyMETJ+fT86uj+bq8nlIPL8fx4+kxXmHUdE30dYb30UOIpz8IMLYnbt+lvYQ/AGE/rBTfVOcV3oz3Z8m9Hvddt2f/tXLYt7QL7X4/vD65yauX5LGzi4BAKCZ4rPwyQYGfnd5WQnY6w4OI5g7qaMKcCz0e57afB/6rB4n7Xci8CsrBM/Ta/XQ76PZBH8A9YZ+O3dt7n1dyDfuJ7d/p3j0T//rxPXTWEGLr6APAIC5xAy/w/vmzG24RzGPM1XbPUvVd/MGgPH9o/x+8+zs+mgvPfe97uChUUSp7Tgt+TiN338e31tOYsEKLST4AzZef9jZjzL7RXwR+vW6g18viuIXi6L4m9OEfOO+/Nb3i6/1/9PE9dNaQouvoA8AgIVFBdphDWN1NsF76ZICwBTazfF4yw6kq8rv33rNop8UOF6cXR+lCr/LeL0+SSFtqgJMgeDE76DxBH/ARusPOyfxpjqXtDH3s//51/737b/7pd8effalk14xmCnkG/fGmz8svv4b3y7eePOzidum8Sff/nt1tPgK+gAAqE2vO3gcgd/cn7s32JNZH3oEdmUL9X0Vft+o/O+tqOh7N1qO98+ujw6j8u8iWpEPY+MvLSP4AzbWrKHfX37/Z4o//92vF5+lsO/656oB288XRfFPJn7DjF6Gfv96/tAv3Z8//vZcLb6CPgAAliJCv/NZu2D4wuEcT0XZlntx37K9O64/6XUH5xHy7VT+3rTs4zspSEzbgVMl4MQfRqMJ/oCNNE3o98OX4d5fL/785usvK/vS7Lxl+lr/t4ov/8IfzvU3/OgHXyn+6N/+w4nr73FRCfouBX0AACxDCoriM6fW3vnczrnpt5yfOOvvvYzg73F5RQoIe93BbbyGu/EztIjgD9g4d4V+KdhLAV8K+17+79/9+kqflhT6pYUe80pz/VJF4j0uKtV8d57xAwCAOgn9ajFz6BfPe2nqxSDx+8pZgOO/rwwEZ247Zv0Ef8DG6A87L9sMfvSDr76dWnXLlt0U9KWKuXV59M/+S/HmL1/P/benuX5/Nvwb1asEfQAArE1s7hX6LW6eNt9XqvUmbg3R1lv9PdVW7PG/93y8EpD2EPwB2Uur6N/46T/7B1/e2v1Xf/EHjx8tu2V3Fm/+ynXx0//4au7fH3P9BH0AADRCzPQ7Ffot7PnZ9dHUFXtzeOeO3/I8hX7m+OVF8AdkJUrUy8tOeebqR3/6k8UP/9vPN+qhptDva//ityaun9bosy/9n692f/9vmdEHAECDnFjkUYt5qv1e8ZplHOVW38N4vdIikN2Jn/qcFt8WE/wBrRVnE3cqId+TtpxZXDT0S4N+O1/5i1893h4J/QAAaIRed7BfWSzB/G7m7eSJZRzl/926bxlH+efHa5a29r7T6w52z66PTid++MfBn+6iFhL8Aa2RWnbHQr632vjqfbX7+4uGfsne8fbozjdxAABYtZjrd+CJr8Wi1X5XUcW3G23X94qg8KOiKN5P1Zrpdax2FMXrWn7v8v2jhQR/QCPFG8zOeMtu2335re8Xf/VbZ4s+iqfH26MH38ABAGDFDsz1q8XtPNt8x6Tf/2FRFO+lir4pRgMdREj4Vvze3bHbktt7qgFpOMEfsHbRslsGfK1q2Z1FCv1+9t98+0edn/zsjQX+mGfH2yNnUgEAaIzozHnPK1KL0xpmeJ9UgtjxIG9C+vui5feT1KpdtvzG/PTydV145iDrIfgDVq7SsluGfa1s2Z3STZqF8eavXP/O1/75f/6XRWe0yErhq+Pt0d7EtQAAsF5tPDF9MXHN3ZtuV23h5zKCvIOo+ktB3t7Z9VEKAD+953EXEfR9FN/RdnvdwXml8vBG8Ndegj9gqcZadp805M10mdKb4n8viiIN8fvNtIK/P+w8iUG4C4V+8TwCAEBjxOf9Jn/Gv4nP4unyYtqlGVHt9jgWZGzFd5mtJY8gSpt1X0xcO4ez66PDSsXex2nhR4R/936nOLs+SlV/ZUfWeTzW1Hq8W0MVImsi+ANqsyktu2OuKh8kzsffECuh3yLPw8s3Wxt8AQBooCZW+93GUovDs+ujuRZSPPT7xpYO7tT4nWfR2X6vOLs+2osNv2X4l1p+9x8KF1N1YFT3PYrnceeh54LmE/wBc9uwlt3Sg0FfVY2h387x9ujeN2cAAFijB+fHrUFqVz146HP6oqJq8Lxsf43KuvR9aG+BisCbqMir+76m8C99l/ggtf1G6+9VBKOX0f5bfqfbrXx3ST+zJ/RrP8EfMJUo4X9SqeTLvWW3dFEJ+i6n/QBRU+hXROjnzZY6PF3zs7i3xpMDz1Jrz8S1qyO4n076grHfhjta4bUFNlpUkDWlw2dt1Wnxd6bLYXRB7cbl3Ykfvl/toV/l/h30uoNy4cd7EU7eF1DeRHC6tPvDagn+gAljLbtPai5fb7qLSjXfVPM/xvWHnWp5/CK+KfSjLukD3zqfzKgQXlfwdzLvf8+s1KdeJ4DWaUq1XwqrnjRhDl3chxSanUTxxG6c2Hrd56ClBm3R3rsX23vL73lVn8Z3IN8/MiP4A6ql6WWJ931nf7LyxpufFW/8zA+++xd/8Pg/LBL0VUXo9/HEDbNLoZ+zbAAANNm9iyJWrJHLJyJsO4xKwJ0IAO+qAnz20Ny9mu/Tp9HmezpxI1kS/MGG2eCW3ZdB31e6v1d8tfv7Ly9ffuv7tYZrQj8AADZFdAk1Ycb30zZUqZVzAeP7WNlyW/LZn6UR/EHGNrxlt/iJr/9JCveqQV/15qaGfk+FfgAAtMB4q+i6tOqz81jL7X7MJTTqgqUR/EFGNrVlt5SCvq9WKvp+4mf/eOJnQt2hXyrff3/ihtk9O94erXUOGwAATKkJbb43q2qRrVu03Prsz9IJ/qClKi27Zdi3MS27pRmCvqq6Q7+TsTL9eaXQb6+u+wUAAEv2uAFPsO3q8BqCP2iJGAZbreZrwjyNlfryL/zh5yHf3/694ivd3y/eePOHs/71Qj8AAKhHU1p9gQcI/qCBomW32ra7US27FVdpAO7j9y7+zk/90v/4xhxBX1VtoV9/2ElnN89rel2EfgAAMB/hI7yG4A/WTMvuKy4iUDsvB9xGVd03Jn5yNs+EfgAAkJ1H6ftUW+f8wSoI/mDFtOy+YiLoq4pNuYu20tYWrvWHnSdxf+vYjCz0AwCgzZpSbbdnSQbcT/AHS6Rl9xW3ZchXFMXlXUFfVYR+H0/cMBuhHwAALEcdn4vr8EGvOzg9uz669DrDJMEf1KTXHTyuBHzlr015M1yHatB3PssbcU2h3/MaQ7867k+p1gUjAACwJrcN+r5znjqrhH8wSfAHc4qW3WrIt8ktu8lNWc03a9BXFZV1i4ZsV1Hyv7D+sJPaBj6o488S+gEAkJHLBs0nfxTh38HZ9dHhxK2wwQR/MIVKy24Z9G1yy27pZqyib+GBupV22kWk0G/neHv0aQ3356SGGYMloR8AACxPCv8+7HUH+0VRpPDv5Oz6aOHvBNB2gj8Yo2X3XldlNV9dQV9Vf9jZqmGG3m0doV/Nm3sLoR8AAKxM6sT6MELA50VRnKaLEJBNJfhj42nZvdfVWEXf0t4oI2g7bUjol46Bk5pCv/I+mTUCAEBuzhvU6nufd+Pyca87uIrvHOevWzQIORH8sVG07D5oZUFfVU3VdbUEbP1hZ6eGALLW+wQAAA1VawfQCrwdl7QFOP1tF5WOpsu6O5qgKQR/ZCtadsuAT8vupItKyLfOM16HNQSw+zWEfnVu7k0h6u7x9siHBwAActX2E9zvxOX94vPvjzdjQaCqQLIg+CMblZbdMuzTsvuqpgR9X+gPO4c1LM9YeH5ezUs8alsuAgAATXV2fXTZ6w5uMyqueCsuqTW4UBVILgR/tFKvO9iqVPE9acFsiVW7rbTtNvJsVVTYvT9xw2yeLRL6LWGJx7OoPhT6AczuSa87aNz71dn10c7ElQCUTms8gd5ED1UFpoIKY31oPMEfjadldyq3Y/P5Gv0G1B92dmtoq02h397EtdPfhyfxQaWuytCF7g8AL9/bncgDaJfcg79x41WB5fewcmmIikAaR/BH42jZncpNWc3XtjNNla25i0jttPsL3Ie9mC1YV4C8cLsxAAC0zdn10WlUwW3qd7ZHlc3BRWVz8KlqQJpC8Mdaadmd2s1YRV8rzyRFa+2iW3NvFpmhF3MFF20xLqUzfHvH26PTiVsAAGAzpBPgH3itX6puDr6JYoNTlYCsk+CPlRlr2S1/1bJ7t6uxir7Wv1FU5uktcjbwNrblzhz6VULHusLlm7gvzuQBALDJDqMbx3e7V6XvPR+mS687eJ4C0lQhOfFTsGSCP5aq1x08iTeBJzUuUMjR1VhFX47LIQ5rOAbmCtr6w85ODZWGVTb3AgDA5+2+n/a6g4MIubjby3bgqAI8iCpA3yVYCcEfy7a/YcNep3Uxtg0q63/0+8POQQ3HQZqjN/O2x/i762w9sMQDAAAqzq6PDnvdwZ5ij9d6K5YcpufrID1vDb+/ZEDwx9JEa++uZ/ili0rIN3N41WaxwXfR4O3ZrMszltDam3zreHvkzRkAACbtxXceLb+v9yhagFOhzL4WYJZJ8Mcy7W7wP/obG/RV1bTB92LWCrsltPaWswU39rUEAICHpC22EWR9/MCP8apUAfhJrztI3x/3LAFhGQR/LNOmtEPejs3ns+yh3g2+M1WN1ry1t4h5fin08yYMAAAPOLs+Ook573V+Ht8EqUvpZXCansNNfzKol+CPpeh1B1s1t1g2iaBvOqer3OBbqS6sc67Is1R6b4kHAABM5+z6aD/GPpn1PptUMPFxrzvYObs+MlOc2gj+WJac/qG6qQR9l4K+14uqu0WD371pN/guYYFHYZ4fAADMJwVXve6gEP7N5b2omtyx+Zc6CP5YljYHfzdjFX1aPGfQH3b2aijtf3q8PXrtgNv+sLMVVX51VpemSsOdaUNHAABgUoR/6TP1hxM38jqpi+k8qv+EfyxE8Eft4uzEIi2eq3ZVVvMJ+hYT7baLVsk9P94eHUxcO6Y/7KTBwQc1L5C5mKW9GAAAuN/Z9dFhhH91Lt7bFMI/aiH4Yxn2G/6sXo1V9PlHtAaxzOOkhmUeD1aLVsLFumdIPp0mcAQAAKZ3dn10HjPg03eFdz11M3k7QtOdFt1nGkbwxzLMtIV1BS7Kaj5B31Ituljjtcs8ljTLr/x7zyduAQAAFhbfwXZ73cFunMRvU4fYur3T6w4O09KUzX4amJfgj1r1uoO9BpRwX1RCPmHOCkTb7aJn7/bvm6vXH3Z24gNCnRt7C629AACwOmfXR6l67bTXHRxEp5j23+m83+sOTn2/ZR6CP+q26mq/27FqPv8Qrli03i46sPfZ8fboZPzKaB8+qGFZyF209gIAwBqcXR8dpCq2GPOzrwJwKidpnr4ONmYl+KM2Mbdh2TMbbsfm891ZIcZqRDD32u27r3F1vD2amOsX24EPl3AW8Caq/Bw7AACwJhFgpc/7h9E5treEOd45eStCUsULzETwR52WUe0n6Gu2kwXPzt2OHzf9Yacc/LuMN/1n0VLsLBkAADTE2fXRSVS0bcX3g70ljPnJwX7M+/N9hqkJ/qhTHcNGb8aCvhcTP0Ej1DTXb+94e/TyNY7qwf0lLO8oImBMf9ei1YkAAMCSxPe/sgqwDAF3bAP+wqMIRQ8nboF7CP6oRZo1MGfll6CvhWqa6/dRGcT1h51lbveywAOgHW6i4hsAXgkBi8+/c+5ECJguTzZ4Mci+4I9ZCP6oy8SMtntcVYK+S0Ff+9Q4129/yW29qcrv4Hh75E0RoB1epGHvXisA7hKLHL9Y5hgVgU/isrNB8wHfiiUfxmAxFcEfdbkv+Lsaq+hTddV+i1bmpUAuhX4HS2rrLaLK74s2YgAAIC9RRPKiWpQQnWjVMDDXOYGpY0rwx1QEfyys1x3sVsqsL8pqPkFffqIl970FH9h5DUtB7qPKDwAANlRUwb0SiI21COdSFbhruy/TEvxRhxTufSNKr8lUpS13UcsazKvKDwAAeMUdLcJlCLjb4opAG4+ZmuCPhQn8NsZJQwfoqvIDAACmUgkCDyqbg/faFqalANN3caYh+ANeK+bxNbEs/nmaF6jKDwAAmFV1c3CEgPsRArZhY/DWxDVwhzcmrwL4sf6w82SJSzjmdVMUxa8db492hX4AAMCiUgh4dn20H4Ha0+gsajLBH1MR/AGvU8dcvzp9lLZ0HW+PTlf3VwIAAJsgLag8uz46iGDtIy86bafVF7hXtPg2ZdbFRbT1WlsPAAAsVQoA0/ePXneQCg5OG9j+uzNxDdxBxR9wpwa1+KYS+28eb492hH4AAMAqxQKNnRa0/sKdBH/AfZrQ4ptma2wdb4+a1m4MAMD0mrgkDqZ2dn10Gdt/oXUEf8CEBrT4pm29v3i8PTo43h59OnErAADACkXl3zPPOW1jxh/wijW3+KZtvXvH26PziVsAAADW67Aoive8BrSJij/gpf6w8zgq/b67pmfkaWzrFfoxk/6ws+UZA4Bm63UHjXi/7nUHjyeuhClFy29TmH/OVFT8wYZLgV/aVhWXdWyquogqvxcTt8AD+sPOTpx1fbs/7Dw73h7t3f/TAMCapeCvCZ/3nkxcA7O5WvNYpJKRSExF8AcbrD/s7EVwso7A7zYCv9OJW+ABEVaPt1k4jgCg2VLg1oTODp0C5ELwx1S0+sIGSoFff9hJZ1w/XlPo91Fs6xXWMJP+sLMf1QJl6JfmQv5dxxIAPKgJlXY7E9esRxPuR5adLk1p516BJlT7FVp9mZaKP9ggUeGX5vi9taZHndp694+3R96kmEm09Z6MHbvPo2rU2U4AeJjg78fz/XYnblixs+uj7IK/XneQKjq/2+sO0uezk7ProyxPysbjbArfqZiK4A82QH/Y2Y3WyHUFfrcR+J1M3AIPiMUd6dh91/EEAK32qNcd7J1dH63z/XtdM603QTlrOX1me7fXHdzESduTzILOtQfH4ebs+sjJb6ai1Rcylqqk+sNOmqXyyRpDv6fR1iukYWqVLdOXY6FfGqa843gCgJk0JXg5XNdW3ajU2p+4gbqMB2Lpu8cHRVF8r9cdnPa6g6YEZnOLY7cpx5BqP6am4g8yFG2RKTR5Z42PzrZe5vJAheqzqPRzdhMAZpAqrnrdQROeslRtd97rDnZWWa0Ugc1JQ6r9LiauabkIVR8qMiirAG9jIdvh2fVRG4OrdS1FvIv51kxN8AcZaUjgdxOBXxO2ttEi/b3mV7MAABJtSURBVGHnSXygGj9+tfYCwOKuGrKU4O1Vhn8RSp2+JphapRxPYE5bzfcoFrS9F63Ap9EK3PgQsNcdnFSWyzWB4I+pCf4gAw0J/FI4c3i8PTqYuAUekNp6I/C768NU+pKyq3IUABZ22aBtpOl+pCrE/WXO/Ot1BwcNnOuX48nxedp4UxD7frpUQsDTs+ujRj0/lWrRdyduXJ/n5vsxC8EftFhDAr9CCybz6g87+3EM3/WB/KPj7ZFZPLA5tuJLepucN+1LKjzg/J6TbOuS3vs/Tgs/ouqrlgAwgpq9CPyaUuVXldW/Gb3uYKuGQLkaAt7Gc3Qe/8aupRqwMs+viQthVPsxE8EftFCDAr/k1463R958mEkcwyf3fCC/jXZxxxVslnIQfNsI/ur3Qa87aOOxkFycXR/tTFzbDE09VtPn2Xd63cFhBBpl4DN1tX+08+7EpUmVWeNuWjrb7iF1L+14VM4ELD5/bcsg8LL8dVnVbhH27cZx1KSQvOpmzZuxaSHBH7RILD3Yb0jgl1wIZ5hFf9jZisDvvmPYUhgAWIJY8NGUOX93+WL+W/F5CFNUFmG8GNtMnIK+x3Fp6uO5S46Bzd7ENfWqBoEvTwhEGHgZl08rv346TbAaQXF5/DyJSx2Vi6sg9GNmgj9ogf6wsxcVfndVR63Tst/oycRr5viVnpoRCQBLld6LP27RU/zO2K9tl1VoU1Ob7zwelZWid9ynNdydlbmJ/4ZhJm94uqC5UuDXH3ZexAe0poV+T1VlMY3+sHMQZ+nvC/3Sh5hvCP0AYLmiRfDW07wWz2ZpX26Jutt8ediBpR7MQ8UfNFCDK/xKzjbxWlMex8+jtdeHGABYjcOWztNsuxxPcOr+WZ0Ls/2Yl+APGiJaIZu6OWrcgaCG+0y5fOY2jiMBMgCs0Nn10UFs0n3oxBz1yq7ab41tvpvoVsjKIgR/sGYtC/yKWOjhbBMTYnHHwQMtvaWrqPLLbasdALRFChG+49Vaidv4nJ8bbb6rs5dhmzgrJPiDNamEJLstCfxK5rDxikp4PU3b0EfH26McP/wCQGucXR+d97qDj4qieN+rtnR7mc5lU4G2Gh+dXR+dbsIDZXks94AVS4Fff9hJFXPfi8qoNoV+qdrvfOJaNlZlccfrQr/bWOAh9AOABji7PtqPKnyW52mOoY0235V5Fv+dwkJU/MGKTDn3rOm88fDSjAtoLPAAgGbaiRN4bToR3RYptMm1U0ab7/Kl40dVJbUQ/MGSRUCy1/LAL3lmJhszBtgvZ9qYCQkAzZRaUHvdQXpvPxf+1Sr30EYgtVxCP2ol+IMlmbEiqg2ENxssZlKezBBgp9ah3ePtkUHEANBgZ9dHl8K/WmUd2mjzXTqhH7UT/EGNWrihd1pm+22oGTb1Vj093h5ZAgMALSH8q81HGzCTTZvv8nzz7PpIsQW1E/xBDRq8ofeqpjNyQpwNM+Om3tJVzPLTEg4ALRPh31aEfyq6ZvNyvMmGhDY7E9ewqHT87KZt255JlkHwBwuIeWcpHHm3Yc/jTYR1aZnCJxO3zvhnqfbbHAtUrX6UjjkLPACgvdLMv6IonvS6g8OiKN73Uk7l5YnPFJy24L7WoWnfe9rueRw/PkOzNII/mEPM79tv4NnQmwhfXp5t7A87dZx1VO23IeK4Ppwx8LuJKj/hMABkIrWr9rqD05jvm8u86rqlKq3DjDf33udrsdxj37GxkNsI/E5b/BhoCcEfTKlSCbXXwDe5+7anLjqDI/253owyt8Aimmdx3DlDCQCZibbDrV53cJDh/OpFpc9AB2fXRxu3xCwq09KJ4sNed7Ab3zdmmQVNUTyN0NhnaFZC8Aev0eD5fUV5pjFdxsOXaENe9P6eCnXy1R92duP4mTXwu40qP6EwAGQuVbRF62+OC+xmtbGB312iWu201x3sx3elJnZENYnjh7UQ/ME9Gjy/r3go8KuoY+OWYCdDcWynMPudOR7d8wj97jvuAIDMRGVSNQBsYgfMspQdMAKbe8TxkTqPTmJBzG4cI0LAz4+fk6jwc/ywFoI/qIh23t052x5XYZrAr7Rwm6+KrrwsGPip8gOADVcGgBECluFOrsseruJz96mWzOlFuFW2Apch4M4GLgVx/NAYgj/4cTtvefayie0LswR+5eNZNLgU8GRiwcCvUOUHAIyrtHmWJ87LgKfNrcBXUZ11qjprcdUQMP1hERbvxCXHakDHD40k+GOjNbydt5g18KvYmbhmdoK/lusPO0/i+Jk38FPlR50u1/hsCq1nc9GmO7tmOX+xe+FYmMs6/61bi2qbZ/F5uLNTCXeeNDwIvIrXLH3WOVeZtVxlWFx8fpw8HjtO5v28uk7p+DkvL44fmqozGo28OGyUFrTzFgsEfi/1h530e9+fuGEGx9ujTg2PgzWoLKRZZMOaKj8AYGHR7vmkctlaU7XXRQTaLyKouRTUNEuvOyiPk60IBOvoYqqL44fWEvyxMVrQzlssGviV+sPO5YIfqC6Ot0d1VA2yQjUFfqr8AICli4qvJ/H3pF8fx/+uXj+LF5Uq3E/L6suz66Nzr2a7RSD4uNLVtBWXYsFw8HasSrd6DJXHjYCP1hP8kb3+sFOulm9y+XgtgV+pP+ws+h/20+Pt0cHEtTRSTYFf8lH6c1T5AQAA5MGMP7IU7bxldV9T23mLugO/4sdz3RblzGgL1Bj43USVn9cdAAAgI4I/shLLOvZqCEKWrfbAr2Jr4prZ2ULVYDUf50+XdBwCAACwZoI/Wq+yrGO/BWvhlxn4lRau+DveHgn+GigCv4Oa2tavospv47YPAgAAbArBH60VLa37Efo1dVlHaRWBX+nxxDWzuVjy/WNGNQd+tzHH73DiFgAAALIi+KNVWlbdV8TstJMVt1LWMeOPBqg58Euep/92VHQCAABsBsEfrdCy6r4iAr9UVXUycUvzCYXWrD/s7EXgV9dimpsI/E4nbgEAACBbgj8aq4XVfUXLA7+S4G8NKsd7nYFf8lEck5Z3AAAAbBjBH43Twuq+IpPAjzWIwG8/LnUe7xdR5Wd5BwAAwIYS/NEILa3uKyJcSYHf+cQt8ID+sLMV1X11B9y3EfgJoQEAADac4I+1iuUFaZ7Zey17JXIO/HYmrqE2Sz7mtfUCAADwBcEfKxeVTmV1X52zzFbhWdrSq8KPWcXCjr0aN/RWaesFAABgguCPlekPO7sRfLzbwmf9WVRSbcLii2UEUxspWtj3lhhymy0JAADAvQR/LFUs6igrndqyqKOUZqWlQOWwZYHfi0XDu/S6qR6b3xLn91U9jWNTWy8AAAB3EvxRu0qV017LFnWUUuB32OJQpY6QMs2hE/zNKKpa95dcNfk82no3ofoUAACABQj+qE3LW3mLsm2yKIrTlldR1REI7Ub4yWtE0L0fx/4yZ1ZeReBnviQAAABT6YxGI88Uc2t5K2/pKqr7spiTFq/JdydumN0vqiq73wo3UpvjBwAAwFwEf8ysspW3ra28pYsIVLKroOoPO3X8h/3seHu0N3HtBlvBso6qtrecAwAAsGaCP6YSgcduXNraylt6FmFKtjPs+sPOaU2v0ze0ln7Rxr67guq+0rNo6xX4AQAAMDcz/nhQJfBY5nbSVWjrht55ndcU/B2mltZNDKCisnU/jv1lV/eVLO4AAACgNoI/JmQyt690Uwn8Nim8ShV/H05cO7u3o910I1p+K5Wt+ytuY8+27RwAAID10erLS1HdtLeCzaSrsvELEfrDzmWN4VW28/7W3MYu8AMAAGBpBH8bLKMlHVWClNAfdtLr+vHEDfNLbah7OVRORti3s+K5fVU30dJ7OnELAAAA1ETwt2Eq1U0pFHono0ef/cKOefSHnU9rbte+ivCvdc9zQxbUbHwlKgAAAKsj+NsAmW3krbqN+XMnliHcrT/sHBRF8cGdNy7mowiwGl39V6lq3V1z0C3wAwAAYOUEfxmLVs/cwr6iDFHSAotN3DY7iwh9L5c0t7FxwetYC+9OA+ZVCvwAAABYG8FfpmIz73cze3QX0c5rLtoM+sNOCsE+WfJf8zw2Ca80jI2KvhTwPYlfmzKr0rEKAADA2gn+MtUfdlIl1vuZPDrz+xbUH3ZOV1j5mUKv86g0vKyjGjAq+VK4txWXMuyrc35hHSyXAQAAoDEEf5lawlKHVSvbSA+18y4ugrMXazwmLuLXFAZO83qmUO9xXNqwcVo4DQAAQOMI/jK0otbOZbmKAMVMtJr1h51UJfedrB7UeqVw+iSOV8tlAAAAaJwveUmytNvCB/U8AhQtkkuSntv+sPPNoig+zvIBrs5NZamJalQAAAAaS8VfZqKl849a8qhUTK1BbHsW/s3Owg4AAABaRcVfftpQ7Zcqpg5WvQGWz6U26v6wUwj/piKcBgAAoLVU/GWmP+xcNngZgnbeBonKv8OWL4FZloto5TVrEgAAgNYS/GWkP+xsFUXxvYY9IhVTDdYfdtL23NS6+tamPxdRiXoSgZ9jFQAAgNbT6puX/QY9mquoJtPO22DH26PLCP9S6/X7G/gU3EbweaISFQAAgNyo+MtIf9h50YDKrWdClHbqDzs7EdY2tVW8LmXYd2pRBwAAADkT/GWiP+ykpR6frOnRaJHMSMz+O8is/VfYBwAAwMYR/GWiP+yk4O29FT8aCxAyFgFgurzT0keZ2s3PI+xTgQoAAMDGEfxloD/sPC6K4sWKtrOWlVMHqvs2QyyNSfMjdxteBXgTQd/Li+MTAACATSf4y0BUZn285EdiWQflFuAUAO40oBIwVZxeRtB3KegDAACAVwn+MtAfds6XGMJY1sG9YiHIk7hsLeE4vI1w70VcLoV8AAAAMB3BX8tFG+b3an4UN1Hdd6K6j1lF6/mT+G3p18cz/BFlwPzp8fbocuJWAAAAYGpf8lS13l6ND0B1HwuLsLg8hhxLAAAAsCaCv/ZbNPhT3QcAAACQIcFfi8V8tXm3rKruAwAAAMiY4K/dZq32U90HAAAAsCEEf+22O8W9T1tRT1X3AQAAAGwWwV9L9YedVO336IF7fxXVfaeq+wAAAAA2j+Cvve6q9kvVfSdR3Xc5cSsAAAAAG6MzGo282i3TH3a2iqL4XuVeP4/KvpNNf24AAAAA+JyKv3bajUUdZXXfi01/QgAAAAB4leCvnVJ13+GmPwkAAAAA3E+rLwAAAABk6A0vKgAAAADkR/AHAAAAABkS/AEAAABAhgR/AAAAAJAhwR8AAAAAZEjwBwAAAAAZEvwBAAAAQIYEfwAAAACQIcEfAAAAAGRI8AcAAAAAGRL8AQAAAECGBH8AAAAAkCHBHwAAAABkSPAHAAAAABkS/AEAAABAhgR/AAAAAJAhwR8AAAAAZEjwBwAAAAAZEvwBAAAAQIYEfwAAAACQIcEfAAAAAGRI8AcAAAAAGRL8AQAAAECGBH8AAAAAkCHBHwAAAABkSPAHAAAAABkS/AEAAABAhgR/AAAAAJAhwR8AAAAAZEjwBwAAAAAZEvwBAAAAQIYEfwAAAACQIcEfAAAAAGRI8AcAAAAAGRL8AQAAAECGBH8AAAAAkCHBHwAAAABkSPAHAAAAABkS/AEAAABAhgR/AAAAAJAhwR8AAAAAZEjwBwAAAAAZEvwBAAAAQIYEfwAAAACQIcEfAAAAAGRI8AcAAAAAGRL8AQAAAECGBH8AAAAAkCHBHwAAAABkSPAHAAAAABkS/AEAAABAhgR/AAAAAJAhwR8AAAAAZEjwBwAAAAAZEvwBAAAAQIYEfwAAAACQIcEfAAAAAGRI8AcAAAAAGRL8AQAAAECGBH8AAAAAkCHBHwAAAABkSPAHAAAAABkS/AEAAABAhgR/AAAAAJAhwR8AAAAAZEjwBwAAAAAZEvwBAAAAQIYEfwAAAACQIcEfAAAAAGRI8AcAAAAAGRL8AQAAAECGBH8AAAAAkCHBHwAAAABkSPAHAAAAABkS/AEAAABAhgR/AAAAAJAhwR8AAAAAZEjwBwAAAAAZEvwBAAAAQIYEfwAAAACQIcEfAAAAAGRI8AcAAAAAGRL8AQAAAECGBH8AAAAAkCHBHwAAAABkSPAHAAAAABkS/AEAAABAhgR/AAAAAJAhwR8AAAAAZEjwBwAAAAAZEvwBAAAAQIYEfwAAAACQIcEfAAAAAGRI8AcAAAAAGRL8AQAAAECGBH8AAAAAkCHBHwAAAABkSPAHAAAAABkS/AEAAABAhgR/AAAAAJAhwR8AAAAAZEjwBwAAAAAZEvwBAAAAQIYEfwAAAACQIcEfAAAAAGRI8AcAAAAAGRL8AQAAAEBuiqL4/+He53l3/VbzAAAAAElFTkSuQmCC";

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
  program: "M4 20h16M4 16l5-5 4 3 7-7M15 7h5v5",
  brief: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4",
  archive: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  hexes: "M12 2.5l3.5 2v4l-3.5 2-3.5-2v-4zM7 12.5l3.5 2v4L7 20.5l-3.5-2v-4zM17 12.5l3.5 2v4l-3.5 2-3.5-2v-4z",
  notes: "M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6",
  slides: "M3 5h18v12H3zM8 21h8M12 17v4M7 9h6M7 12h10",
  sentiment: "M4 5h16v11H9l-5 4zM8 10h.01M12 10h.01M16 10h.01",
  cross: "M6 6h.01M18 6h.01M6 18h.01M18 18h.01M12 12h.01M7 7l4 4M17 7l-4 4M7 17l4-4M17 17l-4-4",
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
// Large-number notation for volumes: three significant digits from 10K up (85.3K, 181K,
// 1.16M, 84.0M); smaller counts keep thousands separators (3,451).
function fmtBig(v) {
  if (v == null) return "—";
  const a = Math.abs(v), sign = v < 0 ? "−" : "";
  if (a >= 1e9) return sign + (a / 1e9).toFixed(a >= 1e11 ? 0 : a >= 1e10 ? 1 : 2) + "B";
  if (a >= 1e6) return sign + (a / 1e6).toFixed(a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2) + "M";
  if (a >= 1e4) return sign + (a / 1e3).toFixed(a >= 1e5 ? 0 : 1) + "K";
  return sign + Math.round(a).toLocaleString();
}
function fmtPct(v, d = 2) { return v == null ? "—" : v.toFixed(d) + "%"; }
// Ticket, repair and churn rates are reported per 100 subscribers (same figure as the old % of base)
function fmtRate(v, d = 2) { return v == null ? "—" : v.toFixed(d); }
function lastIdxUpTo(arr, upTo) { for (let i = Math.min(upTo, arr.length - 1); i >= 0; i--) if (arr[i] != null) return i; return -1; }
function shortMonth(m) { const [mo, y] = m.split(" "); return mo.toUpperCase() + "'" + y.slice(2); }

function niceCeil(v) {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const frac = v / base;
  const nice = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => frac <= s);
  return nice * base;
}

// goodWhenDown: reliability metrics improve when they fall; base improves up
function delta(curr, prev, unit, decimals, goodWhenDown = true, withPct = true) {
  if (curr == null || prev == null) return null;
  const diff = curr - prev;
  const flat = Math.abs(diff) < 1e-9;
  const good = goodWhenDown ? diff <= 0 : diff >= 0;
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "▬";
  const mag = decimals === 0 && !unit ? fmtBig(Math.abs(diff)) : Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const pct = prev ? (diff / Math.abs(prev)) * 100 : null;
  const pctText = !withPct || pct == null || flat ? "" : ` (${pct > 0 ? "+" : ""}${pct.toFixed(1)}%)`;
  return { text: `${arrow} ${mag}${unit}${pctText}`, tone: flat ? "flat" : good ? "good" : "bad" };
}

// Percentage-point movements on rate KPIs are reported in basis points (1 pt = 100 bps)
// with no relative % change. `pctDecimals` is the precision the rate itself is shown at:
// a rate shown to 3 decimals (e.g. 0.167%) keeps one decimal of bps so small moves stay visible.
function deltaBps(curr, prev, goodWhenDown = true, pctDecimals = 2) {
  if (curr == null || prev == null) return null;
  return delta(curr * 100, prev * 100, " bps", Math.max(0, pctDecimals - 2), goodWhenDown, false);
}

// Per-100-subscriber rate movements are shown as the absolute change in that unit (e.g. 0.05)
function deltaRate(curr, prev, goodWhenDown = true, decimals = 2) {
  if (curr == null || prev == null) return null;
  return delta(curr, prev, "", decimals, goodWhenDown, false);
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
    // The product call split can lag the KPI tab by a month; leave All calls blank until every part is reported.
    const cOff = [CALLS_SPLIT.HSIA.offered[i], CALLS_SPLIT.TV.offered[i], DATA.callsOffered.SHS[i]], cAns = [CALLS_SPLIT.HSIA.answered[i], CALLS_SPLIT.TV.answered[i], DATA.callsAnswered.SHS[i]];
    callsOffAll.push(cOff.some((x) => x == null) ? null : cOff[0] + cOff[1] + cOff[2]);
    callsAnsAll.push(cAns.some((x) => x == null) ? null : cAns[0] + cAns[1] + cAns[2]);
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
  // Calls offered rate per 100 subscribers: calls offered over the subscriber base, for every scope that has both.
  DATA.callsRate = {};
  [["HSIA", CALLS_SPLIT.HSIA.offered], ["TV", CALLS_SPLIT.TV.offered], ["SHS", DATA.callsOffered.SHS], ["SH+", DATA.callsOffered["SH+"]], ["All", DATA.callsOffered.All]].forEach(([k, off]) => {
    DATA.callsRate[k] = off.map((v, i) => (v != null && DATA.subBase[k] && DATA.subBase[k][i] ? Math.round((v / DATA.subBase[k][i]) * 10000) / 100 : null));
  });
})();

// Calls offered rate per 100 subscribers for the sub-pages that carry their own calls and base (set in deriveAll for the main scopes).
const callsRateOf = (o) => o.callsOffered.map((v, i) => (v != null && o.subBase[i] ? Math.round((v / o.subBase[i]) * 10000) / 100 : null));
const HSIA_WEST_CALLS_RATE = callsRateOf(HSIA_WEST), TQ_CALLS_RATE = callsRateOf(TQ_ILEC), PFE_CALLS_RATE = callsRateOf(PFE);

// ---------------------------------------------------------------------------
// SVG line chart
// ---------------------------------------------------------------------------
const VIEW_W = 800;

const SANKEY_COLORS = ["#4B286D", "#2B8000", "#B86E00", "#0F7C8A", "#B0345B", "#3B6FB6", "#7A5C00", "#6B4FA0", "#2F8F6B", "#C2572B", "#5F6B73", "#8A8F2B", "#8B959C"];
function SankeyChart({ data, T, hover, setHover }) {
  const W = 1040, nodeW = 14, padL = 270, padR = 270, gap = 8, top = 8, minH = 26;
  const L = data.causes, R = data.fixes, total = L.reduce((a, c) => a + c[1], 0) || 1;
  const base = (520 - top * 2 - gap * (Math.max(L.length, R.length) - 1)) / total;
  const stack = (nodes) => {
    let y = top; return nodes.map((n) => { const h = Math.max(minH, n[1] * base); const o = { y, h, scale: h / (n[1] || 1) }; y += h + gap; return o; });
  };
  const ly = stack(L), ry = stack(R);
  const H = Math.max(ly[ly.length - 1].y + ly[ly.length - 1].h, ry[ry.length - 1].y + ry[ry.length - 1].h) + top;
  const lOff = L.map(() => 0), rOff = R.map(() => 0);
  const links = [...data.links].sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([ci, fi, v]) => ({ ci, fi, v }));
  // order link slots on each node by the other end's order
  const byL = {}, byR = {};
  links.forEach((k) => { (byL[k.ci] = byL[k.ci] || []).push(k); (byR[k.fi] = byR[k.fi] || []).push(k); });
  Object.values(byL).forEach((arr) => { arr.sort((a, b) => a.fi - b.fi); arr.forEach((k) => { k.y0 = ly[k.ci].y + lOff[k.ci]; lOff[k.ci] += k.v * ly[k.ci].scale; }); });
  Object.values(byR).forEach((arr) => { arr.sort((a, b) => a.ci - b.ci); arr.forEach((k) => { k.y1 = ry[k.fi].y + rOff[k.fi]; rOff[k.fi] += k.v * ry[k.fi].scale; }); });
  const x0 = padL + nodeW, x1 = W - padR - nodeW, mid = (x0 + x1) / 2;
  const active = (k) => !hover || (hover.side === "L" ? k.ci === hover.i : k.fi === hover.i);
  const col = (i) => SANKEY_COLORS[i % SANKEY_COLORS.length];
  const pctOf = (v) => Math.round((v / total) * 100);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", fontFamily: FONT }} role="img" aria-label="Root causes identified flowing to fixes applied">
      {links.map((k, j) => {
        const h = k.v * ly[k.ci].scale, h1 = k.v * ry[k.fi].scale;
        const d = `M${x0},${k.y0} C${mid},${k.y0} ${mid},${k.y1} ${x1},${k.y1} L${x1},${k.y1 + h1} C${mid},${k.y1 + h1} ${mid},${k.y0 + h} ${x0},${k.y0 + h} Z`;
        return <path key={j} d={d} fill={col(k.ci)} opacity={active(k) ? (hover ? 0.7 : 0.38) : 0.07} style={{ transition: "opacity .15s" }}><title>{`${L[k.ci][0]} → ${R[k.fi][0]}: ${k.v.toLocaleString()} tickets`}</title></path>;
      })}
      {L.map((n, i) => (
        <g key={"l" + i} onMouseEnter={() => setHover({ side: "L", i })} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
          <rect x={padL} y={ly[i].y} width={nodeW} height={ly[i].h} fill={col(i)} rx={2} />
          <text x={padL - 8} y={ly[i].y + ly[i].h / 2 - 1} textAnchor="end" style={{ fontSize: 12, fontWeight: 600, fill: T.text }}>{n[0]}</text>
          <text x={padL - 8} y={ly[i].y + ly[i].h / 2 + 12} textAnchor="end" style={{ fontSize: 11, fill: T.textMuted }}>{n[1].toLocaleString()} · {pctOf(n[1])}%</text>
        </g>
      ))}
      {R.map((n, i) => (
        <g key={"r" + i} onMouseEnter={() => setHover({ side: "R", i })} onMouseLeave={() => setHover(null)} style={{ cursor: "default" }}>
          <rect x={W - padR - nodeW} y={ry[i].y} width={nodeW} height={ry[i].h} fill={T.heading} opacity={0.85} rx={2} />
          <text x={W - padR + 8} y={ry[i].y + ry[i].h / 2 - 1} style={{ fontSize: 12, fontWeight: 600, fill: T.text }}>{n[0]}</text>
          <text x={W - padR + 8} y={ry[i].y + ry[i].h / 2 + 12} style={{ fontSize: 11, fill: T.textMuted }}>{n[1].toLocaleString()} · {pctOf(n[1])}%</text>
        </g>
      ))}
    </svg>
  );
}

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
        {seriesDefs.map((s, si) => {
          const pts = s.data.map((v, i) => (v == null ? null : { x: xScale(i), y: yScale(v), v, i })).filter(Boolean);
          if (!pts.length) return null;
          const d = "M " + pts.map((p) => `${p.x},${p.y}`).join(" L ");
          const col = seriesColor(s);
          // label above the point unless another series sits higher that month (ties: lower index wins)
          const above = (p) => seriesDefs.every((o, oi) => oi === si || o.data[p.i] == null || o.data[p.i] < p.v || (o.data[p.i] === p.v && oi > si));
          return (
            <g key={si}>
              <path d={d} fill="none" stroke={col} strokeWidth="2.5" strokeDasharray={s.dash || undefined} />
              {pts.map((p) => (
                <text key={p.i} x={p.x} y={above(p) ? p.y - 7 : p.y + 13} fontSize="9.5" fontWeight="600" fill={col}
                  textAnchor={p.x <= left + 1 ? "start" : p.x >= VIEW_W - right - 1 ? "end" : "middle"}>{yFmt(p.v)}</text>
              ))}
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

// Bars (volume, left axis) with a line (rate, right axis) on one chart.
// bar/line: { label, data, color, fmt }. sharedAxis plots both on the left axis.
function ComboChart({ labels, bar, line, height = 240, T, tooltipExtra, sharedAxis = false }) {
  const wrapRef = useRef(null);
  const [hoverI, setHoverI] = useState(null);
  const left = 56, right = sharedAxis ? 24 : 64, top = 16, bottom = 22;
  const plotW = VIEW_W - left - right, plotH = height - top - bottom;
  const bVals = bar.data.filter((v) => v != null), lVals = line.data.filter((v) => v != null);
  const bMax0 = bVals.length ? niceCeil(Math.max(...bVals) * 1.15) : 1;
  const lMax0 = lVals.length ? niceCeil(Math.max(...lVals) * 1.15) : 1;
  const bMax = sharedAxis ? Math.max(bMax0, lMax0) : bMax0;
  const lMax = sharedAxis ? bMax : lMax0;
  const n = Math.max(1, labels.length);
  const slot = plotW / n;
  const xCenter = (i) => left + slot * i + slot / 2;
  const yBar = (v) => top + (1 - v / bMax) * plotH;
  const yLine = (v) => top + (1 - v / lMax) * plotH;
  const bw = Math.max(4, Math.min(30, slot * 0.58));

  function handleMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    const i = Math.max(0, Math.min(n - 1, Math.floor((relX - left) / slot)));
    setHoverI(i);
  }
  const xLabelStep = Math.max(1, Math.ceil(n / 6));
  const hoverPct = hoverI != null ? (xCenter(hoverI) / VIEW_W) * 100 : null;
  const tooltipLeft = hoverPct == null ? 0 : Math.min(88, Math.max(2, hoverPct));
  const tooltipAlignRight = hoverPct != null && hoverPct > 62;
  const linePts = line.data.map((v, i) => (v == null ? null : { x: xCenter(i), y: yLine(v), v, i })).filter(Boolean);
  // Data labels: bar label centred inside its bar (clear of the line), line label above its point
  const labelPos = labels.map((_, i) => ({
    barY: bar.data[i] != null ? (yBar(bar.data[i]) + top + plotH) / 2 : null,
    lineY: line.data[i] != null ? yLine(line.data[i]) - 7 : null
  }));

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", aspectRatio: `${VIEW_W} / ${height}` }} onMouseMove={handleMove} onMouseLeave={() => setHoverI(null)}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${height}`}>
        {Array.from({ length: 5 }).map((_, t) => {
          const y = top + plotH - (plotH * t) / 4;
          return (
            <g key={t}>
              <line x1={left} x2={VIEW_W - right} y1={y} y2={y} stroke={T.border} strokeWidth="1" />
              <text x={left - 8} y={y} fontSize="10.5" fill={T.textMuted} textAnchor="end" dominantBaseline="middle">{bar.fmt((bMax * t) / 4)}</text>
              {!sharedAxis && <text x={VIEW_W - right + 8} y={y} fontSize="10.5" fill={T.textMuted} textAnchor="start" dominantBaseline="middle">{line.fmt((lMax * t) / 4)}</text>}
            </g>
          );
        })}
        {labels.map((m, i) =>
          i % xLabelStep === 0 ? (
            <text key={i} x={xCenter(i)} y={height - 6} fontSize="10" fill={T.textMuted} textAnchor="middle">
              {m.replace(/(\d{4})/, (y) => y.slice(2))}
            </text>
          ) : null
        )}
        {bar.data.map((v, i) => v == null ? null : (
          <rect key={i} x={xCenter(i) - bw / 2} y={yBar(v)} width={bw} height={Math.max(0, top + plotH - yBar(v))} rx="3"
            fill={bar.color} opacity={hoverI === i ? 0.75 : 0.38} />
        ))}
        {bar.data.map((v, i) => v == null ? null : (
          <text key={i} x={xCenter(i)} y={labelPos[i].barY} fontSize="9" fontWeight="600" fill={bar.color} textAnchor="middle" dominantBaseline="middle">{bar.fmt(v)}</text>
        ))}
        {linePts.length > 0 && (
          <g>
            <path d={"M " + linePts.map((p) => `${p.x},${p.y}`).join(" L ")} fill="none" stroke={line.color} strokeWidth="2.5" />
            {linePts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hoverI != null && xCenter(hoverI) === p.x ? 4 : 2.5} fill={line.color} stroke={T.surface} strokeWidth="1.5" />)}
            {linePts.map((p) => (
              <text key={p.i} x={p.x} y={labelPos[p.i].lineY} fontSize="9.5" fontWeight="600" fill={line.color} textAnchor="middle">{line.fmt(p.v)}</text>
            ))}
          </g>
        )}
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
          {bar.data[hoverI] != null && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: bar.color, opacity: 0.6, display: "inline-block" }} />{bar.label}: <b>{bar.fmt(bar.data[hoverI])}</b></div>}
          {line.data[hoverI] != null && <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: line.color, display: "inline-block" }} />{line.label}: <b>{line.fmt(line.data[hoverI])}</b></div>}
          {tooltipExtra && tooltipExtra(hoverI)}
        </div>
      )}
    </div>
  );
}

// Stacked bars: stacks = [{ name, data, color }], one segment per series per month
function StackedBarChart({ labels, stacks, height = 240, yFmt, T, unit = "tickets" }) {
  const wrapRef = useRef(null);
  const [hoverI, setHoverI] = useState(null);
  const left = 56, right = 64, top = 16, bottom = 22;
  const plotW = VIEW_W - left - right, plotH = height - top - bottom;
  const n = Math.max(1, labels.length);
  const totals = labels.map((_, i) => stacks.reduce((a, st) => a + (st.data[i] || 0), 0));
  const hasData = labels.map((_, i) => stacks.some((st) => st.data[i] != null));
  const max = niceCeil(Math.max(1, ...totals) * 1.12);
  const slot = plotW / n;
  const xCenter = (i) => left + slot * i + slot / 2;
  const yOf = (v) => top + (1 - v / max) * plotH;
  const bw = Math.max(4, Math.min(34, slot * 0.6));
  function handleMove(e) {
    const rect = wrapRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    setHoverI(Math.max(0, Math.min(n - 1, Math.floor((relX - left) / slot))));
  }
  const xLabelStep = Math.max(1, Math.ceil(n / 6));
  const hoverPct = hoverI != null ? (xCenter(hoverI) / VIEW_W) * 100 : null;
  const tooltipLeft = hoverPct == null ? 0 : Math.min(88, Math.max(2, hoverPct));
  const tooltipAlignRight = hoverPct != null && hoverPct > 62;
  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", aspectRatio: `${VIEW_W} / ${height}` }} onMouseMove={handleMove} onMouseLeave={() => setHoverI(null)}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${height}`}>
        {Array.from({ length: 5 }).map((_, t) => {
          const v = (max * t) / 4, y = yOf(v);
          return (
            <g key={t}>
              <line x1={left} x2={VIEW_W - right} y1={y} y2={y} stroke={T.border} strokeWidth="1" />
              <text x={left - 8} y={y} fontSize="10.5" fill={T.textMuted} textAnchor="end" dominantBaseline="middle">{yFmt(v)}</text>
            </g>
          );
        })}
        {labels.map((m, i) => i % xLabelStep === 0 ? (
          <text key={i} x={xCenter(i)} y={height - 6} fontSize="10" fill={T.textMuted} textAnchor="middle">{m.replace(/(\d{4})/, (y) => y.slice(2))}</text>
        ) : null)}
        {labels.map((_, i) => {
          if (!hasData[i]) return null;
          let acc = 0;
          return (
            <g key={i} opacity={hoverI == null || hoverI === i ? 1 : 0.55}>
              {stacks.map((st, si) => {
                const v = st.data[i] || 0; if (v <= 0) return null;
                const y0 = yOf(acc), y1 = yOf(acc + v); acc += v;
                return <rect key={si} x={xCenter(i) - bw / 2} y={y1} width={bw} height={Math.max(0.5, y0 - y1)} fill={st.color} opacity={st.opacity == null ? 1 : st.opacity} />;
              })}
            </g>
          );
        })}
        {labels.map((_, i) => hasData[i] ? (
          <text key={i} x={xCenter(i)} y={yOf(totals[i]) - 5} fontSize="9" fontWeight="600" fill={T.heading} textAnchor="middle">{yFmt(totals[i])}</text>
        ) : null)}
      </svg>
      {hoverI != null && hasData[hoverI] && (
        <div style={{
          position: "absolute", top: 6, left: `${tooltipLeft}%`, transform: tooltipAlignRight ? "translateX(-100%)" : "none",
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: T.text,
          boxShadow: "0 4px 16px rgba(0,0,0,.14)", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 2
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{labels[hoverI]} · {yFmt(totals[hoverI])}{unit ? ` ${unit}` : ""}</div>
          {stacks.map((st, si) => (st.data[hoverI] || 0) > 0 && (
            <div key={si} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: st.color, opacity: st.opacity == null ? 1 : st.opacity, display: "inline-block" }} />
              {st.name}: <b>{yFmt(st.data[hoverI])}</b><span style={{ color: T.textFaint }}>({(st.data[hoverI] / totals[hoverI] * 100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Eyebrow({ children, T, style }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.heading, ...style }}>{children}</div>;
}

function StatCard({ icon, label, sub, value, deltas, color, T }) {
  // Hover: the card lifts, takes the metric colour on its border and a faint
  // tint of it as background, and the label switches to the metric colour.
  const [hover, setHover] = useState(false);
  const tint = /^#[0-9a-f]{6}$/i.test(color || "") ? `${color}14` : T.band;
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? tint : T.surface, border: `1px solid ${hover ? color : T.border}`, borderRadius: 12, padding: "16px 18px",
        boxShadow: hover ? "0 6px 18px rgba(0,0,0,.10)" : "none", transform: hover ? "translateY(-2px)" : "none",
        transition: "background .15s ease, border-color .15s ease, box-shadow .15s ease, transform .15s ease"
      }}>
      <div style={{ fontSize: 11, color: hover ? color : T.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", display: "flex", alignItems: "center", gap: 7, marginBottom: 8, transition: "color .15s ease" }}>
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
                <td key={si} style={{ padding: "6px 10px", borderBottom: `1px solid ${T.border}`, textAlign: "right", whiteSpace: "nowrap" }}>{(s.fmt || fmt)(s.data[i])}</td>
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
      {note && <Disclosure label="About this chart" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>{note}</p></Disclosure>}
    </div>
  );
}

// Explanatory text (sources, method notes, how-to-read hints) is hidden behind a
// small arrow, matching the product sub-page arrows in the left menu.
// variant "button" renders the toggle as a lavender pill (purple label, chevron that
// turns when open), matching the deacts-report style; the default is the small caps link.
// ---------------------------------------------------------------------------
// HSIA Architecture. The artifact is plain HTML and CSS (no scripts), so it is shown in a sandboxed
// iframe built from site/architecture.html. The slide is 1280px wide, so it is scaled to the space
// available, and "Full screen" opens it larger. The page follows the dashboard's light and dark mode.
const ARCH_W = 1312, ARCH_H = 900;
// Small script injected into the architecture page: chips that have a slide become buttons that tell this
// page which slides to show. The iframe has an opaque origin (sandbox without allow-same-origin).
function archLinkScript() {
  const links = ARCH_LINKS.map(([l, g, sl]) => ({ l, g, s: sl }));
  const data = JSON.stringify(links).replace(/</g, "\\u003c");
  return `<script>(function(){var L=${data};
function box(c){var b=c.closest('.box');var h=b&&b.querySelector('b');return h?h.textContent.trim():'';}
document.querySelectorAll('.box .t').forEach(function(c){var lab=c.textContent.trim(),grp=box(c),m=null;
for(var i=0;i<L.length;i++){if(L[i].l===lab&&(!L[i].g||L[i].g===grp)){m=L[i];break;}}
if(!m)return;var tip=c.getAttribute('data-tip')||'';
var st=c.classList.contains('t-today')?'today':c.classList.contains('t-trial')?'trial':c.classList.contains('t-open')?'open':'spec';
c.classList.add('lnk');c.setAttribute('role','button');
c.setAttribute('data-tip',tip+' Click for the slide'+(m.s.length>1?'s':'')+' that expand on it.');
function go(){parent.postMessage({type:'arch-chip',label:lab,group:grp,slides:m.s,status:st,tip:tip},'*');}
c.addEventListener('click',go);c.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});
var css=document.createElement('style');css.textContent='.t.lnk{cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px}.t.lnk:hover{filter:brightness(.94)}';document.head.appendChild(css);
function size(){parent.postMessage({type:'arch-size',h:Math.ceil(document.body.getBoundingClientRect().height)},'*');}
size();window.addEventListener('load',size);if(window.ResizeObserver)new ResizeObserver(size).observe(document.body);})();<\/script>`;
}
function ArchEmbed({ isDark, maxScale = 1, onChip }) {
  const ref = useRef(null), frame = useRef(null);
  const [w, setW] = useState(960);
  const [ah, setAh] = useState(ARCH_H); // the artifact's height; it is reported by the page itself
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const measure = () => setW(el.clientWidth || 960);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const h = (e) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const d = e.data;
      if (!d) return;
      if (d.type === "arch-size" && Number.isFinite(d.h)) { setAh(Math.min(2400, Math.max(500, Math.round(d.h)))); return; }
      if (!onChip || d.type !== "arch-chip" || !Array.isArray(d.slides)) return;
      const slides = d.slides.filter((n) => ARCH_DECK.slides.some((x) => x.n === n));
      if (slides.length) onChip({ label: String(d.label).slice(0, 120), group: String(d.group || "").slice(0, 120), slides, status: ["today", "trial", "spec", "open"].includes(d.status) ? d.status : "spec", tip: String(d.tip || "").slice(0, 400) });
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [onChip]);
  const sc = Math.min(maxScale, Math.max(0.3, w / ARCH_W));
  const doc = ARCH_HTML.replace("<html>", `<html data-theme="${isDark ? "dark" : "light"}">`).replace("</body>", () => archLinkScript() + "</body>");
  return (
    <div ref={ref} style={{ width: "100%", height: Math.round(ah * sc), overflow: "hidden" }}>
      <iframe ref={frame} title="HSIA Reliability Ecosystem: North Star layered architecture" srcDoc={doc} sandbox="allow-scripts"
        style={{ width: ARCH_W, height: ah, border: 0, transform: `scale(${sc})`, transformOrigin: "0 0", display: "block" }} />
    </div>
  );
}
function ArchView({ T, isDark, col, onOpenDeck }) {
  const [full, setFull] = useState(false);
  const [sel, setSel] = useState(null); // the chip whose slides are open in the side panel
  useEffect(() => {
    if (!full && !sel) return;
    const onKey = (e) => { if (e.key === "Escape") { if (sel) setSel(null); else setFull(false); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [full, sel]);
  const btn = { background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.heading, borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
  return (
    <>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: T.textMuted }}>Click an underlined chip to read the slide that expands on it.</span>
          <button type="button" style={btn} onClick={() => setFull(true)}>Full screen</button>
        </div>
        <ArchEmbed isDark={isDark} onChip={full ? undefined : setSel} />
      </div>
      <p style={{ fontSize: 11.5, color: T.textFaint, margin: "10px 2px 0", lineHeight: 1.5 }}>
        Snapshot of the architecture artifact as of 6 Nov 2026: five layers, each rated and tied to a reliability pillar, with the North Star goals and TELUS enablers on the right.
      </p>
      {full && (
        <div role="dialog" aria-label="HSIA architecture, full screen" onClick={() => { if (sel) setSel(null); else setFull(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 60, overflow: "auto", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1400, margin: "0 auto", background: T.surface, borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.heading }}>HSIA Reliability Ecosystem: North Star Layered Architecture</div>
              <button type="button" style={btn} onClick={() => { setSel(null); setFull(false); }} aria-label="Close">Close</button>
            </div>
            <ArchEmbed isDark={isDark} maxScale={1.1} onChip={setSel} />
          </div>
        </div>
      )}
      {sel && <ArchSlidePanel key={`${sel.group}|${sel.label}`} T={T} sel={sel} onClose={() => setSel(null)} onOpenDeck={onOpenDeck} />}
    </>
  );
}

// One use-case slide of the supporting deck (shared by the deck page and the side panel).
function ArchSlideCard({ T, s }) {
  const list = (items) => (
    <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.55, color: T.text }}>
      {items.map((t, i) => <li key={i} style={{ marginBottom: 6 }}>{t}</li>)}
    </ul>
  );
  return (
    <section aria-label={`Slide ${s.n}: ${s.title}`} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: T.textMuted, textTransform: "uppercase" }}>Slide {s.n}</span>
        <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: T.heading }}>{s.title}</h2>
      </div>
      <div style={{ fontSize: 12.5, fontStyle: "italic", color: T.textMuted, margin: "4px 0 14px" }}>{s.sub}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: T.heading }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.heading, display: "inline-block" }} />Pain points</div>
          {list(s.pain)}
        </div>
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: T.good }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: T.good, display: "inline-block" }} />Northstar goals</div>
          {list(s.goals)}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.heading, margin: "16px 0 10px" }}>{s.journeyTitle}</div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${s.steps.length > 5 ? 140 : 160}px, 1fr))`, gap: 12 }}>
        {s.steps.map((t, i) => (
          <li key={i} style={{ textAlign: "center", fontSize: 12.3, lineHeight: 1.45, color: T.textSecondary }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: "50%", background: T.heading, color: "#fff", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{i + 1}</span>
            <div>{t}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Pop-up opened by clicking a linked chip: the slide(s) that expand on that component.
function ArchSlidePanel({ T, sel, onClose, onOpenDeck }) {
  const slides = sel.slides.map((n) => ARCH_DECK.slides.find((x) => x.n === n)).filter(Boolean);
  const [k, setK] = useState(0);
  const dlg = useRef(null);
  useEffect(() => { if (dlg.current) dlg.current.focus(); }, []); // move focus out of the iframe so Escape reaches this page
  const cur = slides[Math.min(k, slides.length - 1)];
  const status = { today: ["In use today", T.heading], trial: ["Trial / in development", "#8A5A00"], spec: ["Ideation", T.textMuted], open: ["Open question", "#A33A00"] }[sel.status];
  const btn = { background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.heading, borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
  return (
    <div ref={dlg} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Slides for ${sel.label}`} onClick={onClose}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}
      style={{ outline: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 80, overflowY: "auto", padding: "4vh 16px" }}>
    <aside onClick={(e) => e.stopPropagation()}
      style={{ maxWidth: 780, margin: "0 auto", background: T.bg, border: `1px solid ${T.borderStrong}`, borderRadius: 14, boxShadow: "0 14px 40px rgba(0,0,0,.35)", padding: "16px 18px 22px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.textMuted }}>{sel.group || "Architecture"}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.heading, margin: "2px 0 4px" }}>{sel.label}</div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: status[1], border: `1px solid ${status[1]}`, borderRadius: 999, padding: "1px 9px" }}>{status[0]}</span>
        </div>
        <button type="button" style={btn} onClick={onClose} aria-label="Close slide panel">Close</button>
      </div>
      {sel.tip && <p style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5, margin: "10px 0 0" }}>{sel.tip}</p>}
      {slides.length > 1 && (
        <div role="tablist" aria-label="Slides" style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0 2px" }}>
          {slides.map((x, i) => (
            <button key={x.n} type="button" role="tab" aria-selected={i === k} onClick={() => setK(i)}
              style={{ ...btn, background: i === k ? T.heading : T.surface, color: i === k ? "#fff" : T.heading, borderColor: i === k ? T.heading : T.borderStrong }}>
              Slide {x.n}: {x.title.length > 26 ? x.title.slice(0, 25) + "..." : x.title}
            </button>
          ))}
        </div>
      )}
      <div style={{ marginTop: 14 }}><ArchSlideCard T={T} s={cur} /></div>
      <div style={{ marginTop: 14 }}>
        <button type="button" style={btn} onClick={() => onOpenDeck && onOpenDeck(cur.n)}>Open in the supporting deck →</button>
      </div>
    </aside>
    </div>
  );
}

// Supporting deck: slides 5 to 18 as one view, shown all at once or one at a time.
function ArchDeckView({ T, col, onBack, startSlide, onConsumed }) {
  const SL = ARCH_DECK.slides;
  const start = startSlide != null ? SL.findIndex((x) => x.n === startSlide) : -1;
  const [mode, setMode] = useState(start >= 0 ? "one" : "all"); // "all" | "one"
  const [idx, setIdx] = useState(start >= 0 ? start : 0);
  useEffect(() => { if (startSlide != null && onConsumed) onConsumed(); }, []);
  const seg = (on) => ({ background: on ? T.heading : T.surface, color: on ? "#fff" : T.heading, border: `1px solid ${on ? T.heading : T.borderStrong}`, padding: "6px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT });
  const nav = { background: T.surface, border: `1px solid ${T.borderStrong}`, color: T.heading, borderRadius: 8, padding: "6px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT };
  const card = (s) => <ArchSlideCard key={s.n} T={T} s={s} />;
  const cur = SL[idx];
  return (
    <div onKeyDown={(e) => { if (mode !== "one") return; if (e.key === "ArrowRight") setIdx((i) => Math.min(SL.length - 1, i + 1)); if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1)); }} tabIndex={-1} style={{ outline: "none" }}>
      <p style={{ fontSize: 13.5, color: T.textSecondary, lineHeight: 1.6, margin: "0 0 12px", maxWidth: 820 }}>
        The use cases behind the architecture: {SL.length} slides (5 to 18) from the {ARCH_DECK.title} deck, each with the pain points, the Northstar goals and the journey it enables. Slides 1 to 4 and 19 are not shown.
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div role="group" aria-label="View" style={{ display: "inline-flex" }}>
          <button type="button" aria-pressed={mode === "all"} style={{ ...seg(mode === "all"), borderRadius: "8px 0 0 8px" }} onClick={() => setMode("all")}>All slides</button>
          <button type="button" aria-pressed={mode === "one"} style={{ ...seg(mode === "one"), borderRadius: "0 8px 8px 0", borderLeft: "none" }} onClick={() => setMode("one")}>One at a time</button>
        </div>
        {mode === "one" && (
          <>
            <button type="button" style={{ ...nav, opacity: idx === 0 ? 0.5 : 1 }} disabled={idx === 0} onClick={() => setIdx(idx - 1)} aria-label="Previous slide">← Previous</button>
            <select value={idx} onChange={(e) => setIdx(+e.target.value)} aria-label="Slide" style={{ ...nav, fontWeight: 600 }}>
              {SL.map((s, i) => <option key={s.n} value={i}>{s.n}. {s.title}</option>)}
            </select>
            <button type="button" style={{ ...nav, opacity: idx === SL.length - 1 ? 0.5 : 1 }} disabled={idx === SL.length - 1} onClick={() => setIdx(idx + 1)} aria-label="Next slide">Next →</button>
            <span style={{ fontSize: 12, color: T.textFaint }}>{idx + 1} of {SL.length}</span>
          </>
        )}
        <button type="button" onClick={onBack} style={{ ...nav, marginLeft: "auto" }}>← Architecture</button>
      </div>
      {mode === "all"
        ? <div style={{ display: "grid", gap: 16 }}>{SL.map(card)}</div>
        : card(cur)}
      <p style={{ fontSize: 11.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.5 }}>
        Rebuilt from the text of the slides ({ARCH_DECK.title}, Google Slides; <a href={ARCH_DECK.url} target="_blank" rel="noopener noreferrer" style={{ color: T.heading }}>open the deck</a>), snapshot of 5 Nov 2026.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ask the data (Health Read). The page sends the question plus a plain-text digest of the dashboard
// data to /api/ask, which the Gizmos worker answers through its AI binding. The digest is built here
// so it carries exactly the numbers and hand-written commentary the dashboard shows.
function buildAskContext(view, month) {
  const n = MONTHS.length, from = Math.max(0, n - 13);
  const mon = MONTHS.slice(from);
  const num = (v) => (v == null ? "n/a" : typeof v === "number" ? (Math.abs(v) >= 100 ? Math.round(v).toLocaleString("en-CA") : String(+v.toFixed(2))) : String(v));
  const series = (arr) => (arr ? mon.map((m, i) => `${m.slice(0, 3)}${m.slice(-2)} ${num(arr[from + i])}`).join(", ") : null);
  const flat = (x) => String(x == null ? "" : x).replace(/\s+/g, " ").trim();
  const out = [];
  out.push(`DASHBOARD DATA: TELUS Reliability Strategy. Latest reported month ${LATEST}; churn through ${CHURN_THRU}. The user is viewing ${view === "All" ? "the all-products overview" : view} for ${month}.`);
  out.push("Units: ticket, repair and churn rates are per 100 subscribers (not percentages); changes in those rates are absolute differences. Volumes are counts. YoY compares with the same month a year earlier.");
  const metricRows = [["Ticket rate per 100 subs", "ticketRate"], ["Ticket volume", "ticketVolume"], ["Repair rate per 100 subs", "repairRate"], ["Repair volume (dispatches)", "repairVolume"], ["Churn rate per 100 subs", "churnRate"], ["Subscriber base", "subBase"], ["B2B reliability score", "b2bVoC"]];
  for (const sc of ["HSIA", "TV", "SHS", "SH+"]) {
    out.push(`\n== ${sc} KPIs, last 13 months ==`);
    for (const [label, key] of metricRows) { const sr = DATA[key] && series(DATA[key][sc]); if (sr) out.push(`${label}: ${sr}`); }
    const callsKey = sc === "HSIA" ? null : sc;
    if (callsKey && DATA.callsOffered[callsKey]) out.push(`Calls offered: ${series(DATA.callsOffered[callsKey])}`);
    if (DATA.callsRate[sc]) out.push(`Calls offered rate per 100 subs: ${series(DATA.callsRate[sc])}`);
    if (DATA.annualChurn && DATA.annualChurn[sc]) out.push(`Annual churn per 100 subs: 2026 YTD ${num(DATA.annualChurn[sc].y2026)}, 2025 ${num(DATA.annualChurn[sc].y2025)}`);
  }
  out.push("\nCalls offered for the combined fixed-home base (FFH = HSIA plus TV): " + series(DATA.callsOffered.FFH));
  for (const sc of ["HSIA", "TV", "SHS"]) {
    const L = LOOKER[sc]; if (!L) continue;
    out.push(`\n== ${sc} ticket categories (Looker), ${LATEST} vs prior month vs same month last year ==`);
    out.push(`Monthly total tickets: ${series(L.monthlyTotal)}`);
    (L.topIssues || []).slice(0, 10).forEach((t) => out.push(`- ${t.issue}: ${num(t.a26)} (prev month ${num(t.prev)}, last year ${num(t.a25)})`));
    if (L.rising && L.rising.length) out.push("Rising MoM: " + L.rising.slice(0, 5).map((t) => `${t.issue} ${num(t.a26)} (${t.delta > 0 ? "+" : ""}${num(t.delta)})`).join("; "));
    if (L.falling && L.falling.length) out.push("Falling MoM: " + L.falling.slice(0, 5).map((t) => `${t.issue} ${num(t.a26)} (${num(t.delta)})`).join("; "));
    if (L.topCat) out.push(`Largest category ${L.topCat.name}: ${series(L.topCat.series)}`);
  }
  for (const [lab, A] of [["HSIA", HSA], ["TV", TVA]]) {
    if (!A || !A.tickets) continue;
    out.push(`\n== ${lab} agent and technician notes analysis, ${A.months.join(", ")} ==`);
    (A.tickets.rising || []).slice(0, 6).forEach((r) => out.push(`- rising: ${r.name} ${(r.v || []).map(num).join(" > ")} (${r.pct > 0 ? "+" : ""}${num(r.pct)}%)`));
    (A.tickets.falling || []).slice(0, 4).forEach((r) => out.push(`- falling: ${r.name} ${(r.v || []).map(num).join(" > ")} (${num(r.pct)}%)`));
  }
  out.push("\n== Reliability initiatives (register) ==");
  for (const it of INITIATIVES) out.push(`- [${it.p}] ${it.name} | ${it.status} | ${it.timeline} | prime ${it.prime} | issues ${(it.issues || []).join("/")} | ${flat(it.desc)}`);
  for (const sc of ["HSIA", "TV", "SHS", "SH+"]) {
    const items = HEALTH_COMMENTARY[sc] || [];
    if (!items.length) continue;
    out.push(`\n== ${sc} Health Read commentary (${LATEST}) ==`);
    for (const c of items) {
      if (typeof c === "string") { out.push("- " + flat(c.replace(/^@/, ""))); continue; }
      out.push(`- THEME ${c.t} | ${flat(c.share)} | ${flat(c.note)}`);
      (c.causes || []).forEach((x) => out.push(`  cause: ${flat(x)}`));
      (c.next || []).forEach((x) => out.push(`  next: ${flat(x)}`));
    }
  }
  if (typeof TV_REVIEW !== "undefined" && TV_REVIEW.causes) {
    out.push("\n== TV Review: STB No Boot > Stuck on Initializing (as of " + TV_REVIEW.asOf + ") ==");
    TV_REVIEW.causes.forEach((c) => out.push(`- cause [${c.status}] ${c.name}: ${flat(c.evidence)}`));
    TV_REVIEW.actions.forEach((a) => out.push(`- action [${a.status}] ${a.name} | ${a.owner} | ${a.when}: ${flat(a.detail)}`));
  }
  if (typeof OCT_REVIEW !== "undefined") {
    const R = OCT_REVIEW, o = R.outage;
    out.push("\n== TV Oct Review: what drove the rise in TV video tickets in October (notes to " + R.asOf + ") ==");
    { const lg = TV_PLATFORMS.find((x) => x.id === "legacy"), op = TV_PLATFORMS.find((x) => x.id === "opus"), a = MONTHS.indexOf("Sep 2026"), b = MONTHS.indexOf("Oct 2026");
      out.push(`- Mediaroom (Optik TV Legacy) tickets ${lg.tickets[a]} to ${lg.tickets[b]}, rate ${lg.ticketRate[a]} to ${lg.ticketRate[b]} per 100, base ${lg.base[a]} to ${lg.base[b]}; OPUS (TV Evolution) tickets ${op.tickets[a]} to ${op.tickets[b]}, rate ${op.ticketRate[a]} to ${op.ticketRate[b]} per 100, base ${op.base[a]} to ${op.base[b]}. Mediaroom is the October upside, OPUS the downside.`);
      out.push(`- TV KPIs Sep to Oct: calls offered ${CALLS_SPLIT.TV.offered[a]} to ${CALLS_SPLIT.TV.offered[b]}, answered ${CALLS_SPLIT.TV.answered[a]} to ${CALLS_SPLIT.TV.answered[b]}, tickets ${DATA.ticketVolume.TV[a]} to ${DATA.ticketVolume.TV[b]}, dispatches ${DATA.repairVolume.TV[a]} to ${DATA.repairVolume.TV[b]} (platform source: ${lg.repairs[a] + op.repairs[a]} to ${lg.repairs[b] + op.repairs[b]}), churn ${DATA.churnRate.TV[a]} to ${DATA.churnRate.TV[b]} per 100.`); }
    out.push(`- TV tickets ${R.looker} in Oct vs ${R.lookerSep} in Sep; the step-up came in Sep. Video Issues ${R.categories[0][1]} to ${R.categories[0][2]}, Channel Issues ${R.categories[1][1]} to ${R.categories[1][2]}.`);
    R.movers.forEach(([n, a, b]) => out.push(`- mover ${n}: ${a} to ${b}`));
    out.push(`- Calgary Optik TV area outage on ${o.day} Oct: stuttering tickets ${o.peak} that day and ${o.next} next vs about ${o.normal} normally; ${o.citing} and ${o.citingNext} tickets name the outage.`);
    R.causes.forEach(([n, a, b]) => out.push(`- video quality cause cited: ${n}: ${a}% Sep, ${b}% Oct`));
    R.fixes.forEach(([n, a, b]) => out.push(`- video quality fix: ${n}: ${a}% Sep, ${b}% Oct`));
    R.missing.causes.forEach(([n, a, b]) => out.push(`- Missing Channels cause: ${n}: ${a}% Sep, ${b}% Oct`));
  }
  return out.join("\n");
}

// Answer panel on the Health Read. Hidden unless the host serves /api/ask (the Gizmos worker build),
// so the plain static deployment is unaffected.
let ASK_AVAILABLE = null;
function AskPanel({ T, sc, month }) {
  const [avail, setAvail] = useState(ASK_AVAILABLE);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [thread, setThread] = useState([]);
  const url = () => new URL("api/ask", window.location.href.split("#")[0]).toString();
  useEffect(() => {
    if (ASK_AVAILABLE !== null) return;
    let live = true;
    fetch(url(), { headers: { accept: "application/json" } })
      .then((r) => (r.ok && /json/.test(r.headers.get("content-type") || "") ? r.json() : null))
      .then((j) => { ASK_AVAILABLE = !!(j && j.ok); if (live) setAvail(ASK_AVAILABLE); })
      .catch(() => { ASK_AVAILABLE = false; if (live) setAvail(false); });
    return () => { live = false; };
  }, []);
  if (!avail) return null;
  const label = sc === "All" ? "the portfolio" : sc;
  const examples = [
    `Why did the ${label} ticket rate move in ${month}?`,
    `What are the biggest ticket drivers for ${label}?`,
    `Which initiatives address them, and what is their status?`,
    `How does ${month} compare with a year ago?`
  ];
  async function ask(text) {
    const question = (text || q).trim();
    if (!question || busy) return;
    setBusy(true); setQ("");
    const id = Date.now();
    setThread((t) => [{ id, question, answer: null, error: null }, ...t]);
    try {
      const history = thread.filter((x) => x.answer).slice(0, 3).reverse().flatMap((x) => [{ role: "user", content: x.question }, { role: "assistant", content: x.answer }]);
      const res = await fetch(url(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, view: sc, month, context: buildAskContext(sc, month), history }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.answer) throw new Error(j.error || `The assistant could not answer (${res.status}).`);
      setThread((t) => t.map((x) => (x.id === id ? { ...x, answer: j.answer } : x)));
    } catch (e) {
      setThread((t) => t.map((x) => (x.id === id ? { ...x, error: e.message || "Something went wrong." } : x)));
    } finally { setBusy(false); }
  }
  const chip = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: "5px 12px", fontSize: 12, color: T.text, cursor: "pointer", fontFamily: FONT };
  return (
    <Disclosure key={`ask|${sc}|${month}`} label="Ask a question about the data" variant="button" T={T} style={{ marginTop: 14 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {examples.map((x) => <button key={x} type="button" style={chip} disabled={busy} onClick={() => ask(x)}>{x}</button>)}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(); }} style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder={`Ask about ${label}, tickets, repairs, calls, churn or initiatives`}
          aria-label="Question about the dashboard data"
          style={{ flex: 1, minWidth: 0, padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surface, color: T.text, fontFamily: FONT, fontSize: 13 }} />
        <button type="submit" disabled={busy || !q.trim()}
          style={{ background: T.heading, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: busy || !q.trim() ? "default" : "pointer", opacity: busy || !q.trim() ? 0.6 : 1, fontFamily: FONT }}>
          {busy ? "Thinking" : "Ask"}
        </button>
      </form>
      {thread.map((x) => (
        <div key={x.id} style={{ marginTop: 12, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.heading, marginBottom: 6 }}>{x.question}</div>
          {x.error ? <div style={{ fontSize: 13, color: T.bad }}>{x.error}</div>
            : x.answer == null ? <div style={{ fontSize: 13, color: T.textFaint }}>Reading the dashboard data...</div>
            : <div style={{ fontSize: 13, lineHeight: 1.65, color: T.text, whiteSpace: "pre-wrap" }}>{x.answer}</div>}
        </div>
      ))}
      <p style={{ margin: "10px 0 0", fontSize: 11.5, color: T.textFaint, lineHeight: 1.5 }}>
        Answers come from the dashboard data as of {LATEST} and the hand-written commentary, summarised by an AI model, so check key figures against the charts. Questions are sent to the TELUS Fuel iX AI gateway.
      </p>
    </Disclosure>
  );
}

function Disclosure({ label = "Sources & notes", T, children, style, align = "left", defaultOpen = false, variant = "link", count }) {
  const [open, setOpen] = useState(defaultOpen);
  const isBtn = variant === "button";
  return (
    <div style={{ marginTop: 10, textAlign: align, ...style }}>
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        style={isBtn
          ? { background: T.band, border: "none", borderRadius: 10, padding: "9px 16px 9px 12px", cursor: "pointer", fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: T.heading }
          : { background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, color: T.textMuted, letterSpacing: ".05em", textTransform: "uppercase" }}>
        {isBtn
          ? <span style={{ display: "inline-block", fontSize: 11, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
          : <span style={{ display: "inline-block", fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>}
        {label}
        {isBtn && count != null && <span style={{ fontWeight: 500, color: T.textMuted }}>({count})</span>}
      </button>
      {open && <div style={{ marginTop: isBtn ? 14 : 6, textAlign: "left" }}>{children}</div>}
    </div>
  );
}

function Legend({ items, T }) {
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", margin: "8px 2px 2px", fontSize: 12.5, color: T.textSecondary, flexWrap: "wrap" }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {it.bar
            ? <span style={{ width: 12, height: 12, background: it.color, opacity: 0.5, borderRadius: 3, display: "inline-block" }} />
            : <span style={{ width: 16, height: 0, borderTop: `3px ${it.dash ? "dashed" : "solid"} ${it.color}`, borderRadius: 2 }} />}
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
  else if (s.includes("stall") || s.includes("hold")) { bg = T.chipStalled; fg = T.chipStalledText; }
  else if (s.includes("flight")) { bg = T.chipFlight; fg = T.chipFlightText; }
  return <span style={{ background: bg, color: fg, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{status}</span>;
}

// ---------------------------------------------------------------------------
// Deck: Slidev-style presentation mode for a page. A slide is
//   { layout, title, sub, body, notes, clicks }
// layout: cover | section | default | two-cols | fact | statement | end (Slidev's built-in
// layout names). body is JSX or a function (step, C) => JSX, where C(k, node) wraps a node
// so it is revealed on click k (Slidev's v-click); clicks is how many reveal steps the
// slide has. Keys: arrows / space / enter step forward and back, Home / End jump, O toggles
// the overview grid, N the presenter notes, F fullscreen, Esc exits. Slides enter with a
// horizontal slide-and-fade in the direction of travel; revealed nodes rise and fade in.
// ---------------------------------------------------------------------------
const DECK_VW = 1120, DECK_VH = 630;
function Deck({ slides, index, onIndex, onExit, T, color, isDark, title }) {
  const n = slides.length, i = Math.min(Math.max(index || 0, 0), n - 1), s = slides[i];
  const clicks = s.clicks || 0;
  const dirRef = useRef(1);
  const [step, setStep] = useState(0);
  const [scale, setScale] = useState(1);
  const [notes, setNotes] = useState(false);
  const [overview, setOverview] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef(null);
  useEffect(() => { setStep(dirRef.current < 0 ? (slides[i].clicks || 0) : 0); }, [i]);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / DECK_VW, (window.innerHeight - 48) / DECK_VH) * 0.97);
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);
  const go = (d) => {
    if (d > 0) { if (step < clicks) setStep(step + 1); else if (i < n - 1) { dirRef.current = 1; onIndex(i + 1); } }
    else if (step > 0) setStep(step - 1); else if (i > 0) { dirRef.current = -1; onIndex(i - 1); }
  };
  const jump = (k) => { dirRef.current = k >= i ? 1 : -1; onIndex(k); setOverview(false); };
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      const k = e.key;
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); overview ? jump(Math.min(n - 1, i + 1)) : go(1); }
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) { e.preventDefault(); overview ? jump(Math.max(0, i - 1)) : go(-1); }
      else if (k === "Home") jump(0); else if (k === "End") jump(n - 1);
      else if (k === "Escape") { if (overview) setOverview(false); else onExit(); }
      else if (k === "o" || k === "O") setOverview((v) => !v);
      else if (k === "n" || k === "N") setNotes((v) => !v);
      else if (k === "f" || k === "F") { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });
  const poke = () => { setIdle(false); clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => setIdle(true), 2600); };
  useEffect(() => { poke(); return () => clearTimeout(idleTimer.current); }, []);
  const C = (k, node, extra) => <div className={`dk-click${step >= k ? " on" : ""}`} style={extra}>{node}</div>;
  const body = typeof s.body === "function" ? s.body(step, C) : s.body;
  const bg = isDark ? "#0c0b10" : "#15131a", surface = T.surface, ink = T.text, muted = T.textMuted;
  const css = `
.dk{position:fixed;inset:0;z-index:60;background:${bg};color:${ink};font-family:${FONT};display:flex;flex-direction:column;cursor:${idle ? "none" : "default"}}
.dk-top{height:44px;display:flex;align-items:center;gap:8px;padding:0 14px;color:#cfc9d8;font-size:12.5px;transition:opacity .3s;opacity:${idle ? 0 : 1}}
.dk-top .dk-title{font-weight:700;color:#fff;margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dk-top button{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);color:#fff;border-radius:999px;padding:5px 12px;font:600 12px ${FONT};cursor:pointer}
.dk-top button:hover{background:rgba(255,255,255,.18)}
.dk-stage{flex:1;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden}
.dk-slide{--s:${scale};position:absolute;width:${DECK_VW}px;height:${DECK_VH}px;background:${surface};color:${ink};border-radius:6px;box-shadow:0 30px 80px rgba(0,0,0,.55);transform:scale(var(--s));overflow:hidden;display:flex;flex-direction:column;padding:52px 64px 44px}
.dk-in-r{animation:dkInR .55s cubic-bezier(.22,.8,.3,1) both}
.dk-in-l{animation:dkInL .55s cubic-bezier(.22,.8,.3,1) both}
@keyframes dkInR{from{opacity:0;transform:scale(var(--s)) translateX(70px)}to{opacity:1;transform:scale(var(--s)) translateX(0)}}
@keyframes dkInL{from{opacity:0;transform:scale(var(--s)) translateX(-70px)}to{opacity:1;transform:scale(var(--s)) translateX(0)}}
.dk-slide h1{font-size:34px;font-weight:700;letter-spacing:-.01em;line-height:1.15;margin:0;color:${ink};text-wrap:balance}
.dk-slide h1::after{content:"";display:block;width:64px;height:4px;border-radius:2px;background:${color};margin-top:12px}
.dk-slide .dk-sub{font-size:16px;color:${muted};margin:10px 0 0;line-height:1.45}
.dk-body{flex:1;min-height:0;margin-top:22px;font-size:16px;line-height:1.5;display:flex;flex-direction:column;gap:14px}
.dk-foot{display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:${muted};margin-top:14px;letter-spacing:.02em}
.dk-foot b{color:${color}}
.dk-cover,.dk-end,.dk-section{background:linear-gradient(135deg,${color} 0%,${color} 18%,#17141c 140%);color:#fff;justify-content:flex-start}
.dk-cover h1,.dk-end h1,.dk-section .dk-num{margin-top:auto}
.dk-cover .dk-foot,.dk-end .dk-foot,.dk-section .dk-foot{margin-top:auto}
.dk-cover h1,.dk-end h1,.dk-section h1{color:#fff;font-size:44px}
.dk-cover h1::after,.dk-end h1::after,.dk-section h1::after{background:rgba(255,255,255,.7)}
.dk-cover .dk-sub,.dk-end .dk-sub,.dk-section .dk-sub{color:rgba(255,255,255,.85);font-size:19px;max-width:860px}
.dk-cover .dk-foot,.dk-end .dk-foot,.dk-section .dk-foot{color:rgba(255,255,255,.7)}
.dk-cover .dk-foot b,.dk-end .dk-foot b,.dk-section .dk-foot b{color:#fff}
.dk-section .dk-num{font-size:120px;font-weight:800;line-height:1;color:rgba(255,255,255,.18);margin-bottom:-26px}
.dk-fact{justify-content:center;text-align:center}
.dk-fact .dk-big{font-size:112px;font-weight:800;color:${color};line-height:1;letter-spacing:-.03em}
.dk-fact .dk-sub{font-size:22px;color:${ink};max-width:820px;margin:18px auto 0}
.dk-fact h1{display:none}
.dk-statement{justify-content:center}
.dk-statement h1{font-size:40px;line-height:1.25}
.dk-statement h1::after{display:none}
.dk-two{display:grid;grid-template-columns:1fr 1fr;gap:28px;flex:1;min-height:0}
.dk-body svg{max-height:400px}
.dk-raw td,.dk-raw th{text-align:left}
.dk-dense{padding:34px 56px 28px} .dk-dense h1{font-size:25px} .dk-dense h1::after{margin-top:8px;height:3px;width:48px} .dk-dense .dk-sub{font-size:13.5px;margin-top:6px} .dk-dense .dk-body{margin-top:14px;font-size:14px} .dk-dense .dk-foot{margin-top:10px}
.dk-click{opacity:0;transform:translateY(14px);transition:opacity .45s ease,transform .45s ease}
.dk-click.on{opacity:1;transform:none}
.dk-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.dk-stat{background:${T.band};border:1px solid ${T.border};border-radius:10px;padding:14px 16px}
.dk-stat-v{font-size:30px;font-weight:700;color:${T.heading};line-height:1.05}
.dk-stat-l{font-size:12.5px;font-weight:600;color:${T.textSecondary};margin-top:6px}
.dk-stat-s{font-size:11.5px;color:${T.textFaint};margin-top:3px;line-height:1.4}
.dk-body ul{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:9px}
.dk-body li{color:${T.textSecondary}} .dk-body li strong{color:${ink}}
.dk-body table{border-collapse:collapse;width:100%;font-size:13px}
.dk-body th,.dk-body td{padding:6px 10px;text-align:right;border-bottom:1px solid ${T.border};font-variant-numeric:tabular-nums}
.dk-body th:first-child,.dk-body td:first-child{text-align:left}
.dk-body th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:${muted};font-weight:600}
.dk-note{border-left:3px solid ${color};padding:2px 0 2px 14px;font-size:14px;color:${T.textSecondary}}
.dk-note h3{margin:0 0 4px;font-size:14px;color:${ink}}
.dk-note.bad{border-color:${T.bad}} .dk-note.ok{border-color:${T.good}} .dk-note.amber{border-color:${isDark ? "#F0A55B" : "#B86E00"}}
.dk-pill{display:inline-block;font-size:10.5px;font-weight:700;border-radius:999px;padding:2px 8px;background:${T.band};color:${T.heading};margin-left:8px;vertical-align:middle}
.dk-cap{font-size:13px;color:${muted};line-height:1.45}
.dk-banner{margin-top:12px;padding:11px 18px;border-radius:8px;background:${color};color:#fff;font-size:18px;font-weight:700;line-height:1.3;text-align:center}
.dk-zoom{position:relative;transition:transform .18s ease,box-shadow .18s ease;transform-origin:var(--zo,right center);border-radius:8px;background:transparent}
.dk-zoom:hover{transform:scale(1.7);z-index:30;background:${surface};box-shadow:0 12px 40px rgba(0,0,0,.3);padding:6px 8px 4px}
.dk-callout{margin-top:26px;max-width:940px;font-size:21px;line-height:1.4;font-weight:600;border-left:4px solid rgba(255,255,255,.7);padding:4px 0 4px 18px;color:#fff}
.dk-stats.tight{grid-template-columns:repeat(6,1fr);gap:10px} .dk-stats.tight .dk-stat{padding:5px 9px;border-radius:8px} .dk-stats.tight .dk-stat-v{font-size:19px} .dk-stats.tight .dk-stat-l{font-size:11px;margin-top:2px} .dk-stats.tight .dk-stat-s{font-size:10.5px;margin-top:1px}
.dk-inits{display:grid;grid-template-columns:1fr 1fr;gap:12px} .dk-init{background:${T.band};border:1px solid ${T.border};border-left:3px solid ${color};border-radius:8px;padding:8px 12px;font-size:12.5px;line-height:1.4;color:${T.textSecondary}} .dk-init b{color:${ink};font-size:13px} .dk-init .dk-pill{margin-left:8px}
.dk-sm .dk-bl{font-size:11.5px} .dk-sm .dk-brow{padding:3px 0}
.dk-ch{margin:0 0 6px;font-size:14px;font-weight:700;color:${ink}}
.dk-brow{display:grid;grid-template-columns:38% 1fr;gap:10px;align-items:center;padding:4px 0;border-bottom:1px solid ${T.border}}
.dk-bl{font-size:12.5px;color:${T.textSecondary};line-height:1.25}
.dk-bar{display:flex;align-items:center;gap:6px;height:12px;margin:1px 0} .dk-bar i{display:block;height:100%;border-radius:2px;min-width:2px} .dk-bar b{font-size:11px;font-weight:600;color:${muted};font-variant-numeric:tabular-nums}
.dk-dv{position:relative;height:20px} .dk-dv:before{content:"";position:absolute;left:50%;top:0;bottom:0;width:1px;background:${T.border}} .dk-dv i{position:absolute;top:4px;height:12px;border-radius:2px} .dk-dv b{position:absolute;top:2px;font-size:11px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums}
.dk-legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:${muted}} .dk-legend span{display:inline-flex;align-items:center;gap:6px} .dk-legend i{width:11px;height:11px;border-radius:2px;display:inline-block}
.dk-nav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:64px;border:none;border-radius:8px;background:rgba(255,255,255,.07);color:#fff;font-size:26px;cursor:pointer;transition:opacity .3s,background .2s;opacity:${idle ? 0 : 0.85}}
.dk-nav:hover{background:rgba(255,255,255,.18)} .dk-nav:disabled{opacity:0;cursor:default}
.dk-prev{left:10px} .dk-next{right:10px}
.dk-progress{height:3px;background:rgba(255,255,255,.1)} .dk-progress i{display:block;height:100%;background:${color};transition:width .45s cubic-bezier(.22,.8,.3,1)}
.dk-notes{position:absolute;right:16px;bottom:16px;width:380px;max-height:38%;overflow:auto;background:rgba(20,18,26,.94);color:#e8e3ef;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:12px 14px;font-size:13px;line-height:1.5;animation:dkInR .3s ease both}
.dk-notes b{display:block;color:#fff;margin-bottom:6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase}
.dk-grid{position:absolute;inset:44px 0 3px;background:${bg};overflow:auto;padding:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;align-content:start;animation:dkFade .25s ease both}
@keyframes dkFade{from{opacity:0}to{opacity:1}}
.dk-thumb{position:relative;aspect-ratio:16/9;border-radius:6px;overflow:hidden;border:2px solid transparent;cursor:pointer;background:${surface}}
.dk-thumb.cur{border-color:${color}} .dk-thumb:hover{border-color:rgba(255,255,255,.5)}
.dk-thumb .dk-slide{--s:0.2232;transform-origin:top left;transform:scale(var(--s));left:0;top:0;animation:none;box-shadow:none;border-radius:0;pointer-events:none}
.dk-thumb .dk-click{opacity:1;transform:none}
.dk-thumb span{position:absolute;left:8px;bottom:6px;font-size:11px;color:#fff;background:rgba(0,0,0,.55);border-radius:999px;padding:1px 8px}
`;
  const renderSlide = (sl, k, cls, content) => (
    <div className={`dk-slide dk-${sl.layout || "default"}${sl.dense ? " dk-dense" : ""} ${cls || ""}`}>
      {sl.layout === "section" && <div className="dk-num">{sl.num}</div>}
      {sl.layout === "fact" ? <div className="dk-big">{sl.big}</div> : <h1>{sl.title}</h1>}
      {sl.sub && <p className="dk-sub">{sl.sub}</p>}
      {sl.callout && <div className="dk-callout">{sl.callout}</div>}
      {content && <div className={`dk-body${sl.layout === "two-cols" ? " dk-two" : ""}`}>{content}</div>}
      {sl.banner && <div className="dk-banner">{sl.banner}</div>}
      <div className="dk-foot"><span><b>{title}</b> · Reliability Strategy</span><span>{k + 1} / {n}</span></div>
    </div>
  );
  return (
    <div className="dk" onMouseMove={poke} role="dialog" aria-label={`${title} presentation`}>
      <style>{css}</style>
      <div className="dk-top">
        <span className="dk-title">{title}</span>
        <span style={{ opacity: 0.7 }}>{i + 1} / {n}{clicks ? ` · step ${step} / ${clicks}` : ""}</span>
        <button onClick={() => setOverview((v) => !v)} title="O">Overview</button>
        <button onClick={() => setNotes((v) => !v)} title="N">{notes ? "Hide notes" : "Notes"}</button>
        <button onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen && document.documentElement.requestFullscreen())} title="F">Fullscreen</button>
        <button onClick={onExit} title="Esc">Exit ✕</button>
      </div>
      <div className="dk-stage" onClick={(e) => { if (e.target.closest("button, a, table, [contenteditable], [data-deck-noadvance]")) return; go(1); }}>
        <div key={i} className={`dk-slide-wrap`} style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {renderSlide(s, i, dirRef.current < 0 ? "dk-in-l" : "dk-in-r", body)}
        </div>
        <button className="dk-nav dk-prev" onClick={(e) => { e.stopPropagation(); go(-1); }} disabled={i === 0 && step === 0} aria-label="Previous">‹</button>
        <button className="dk-nav dk-next" onClick={(e) => { e.stopPropagation(); go(1); }} disabled={i === n - 1 && step >= clicks} aria-label="Next">›</button>
        {notes && <aside className="dk-notes" onClick={(e) => e.stopPropagation()}><b>Presenter notes · {i + 1} / {n}</b>{s.notes || "No notes for this slide."}</aside>}
        {overview && (
          <div className="dk-grid" onClick={(e) => e.stopPropagation()}>
            {slides.map((sl, k) => (
              <div key={k} className={`dk-thumb${k === i ? " cur" : ""}`} onClick={() => jump(k)}>
                {renderSlide(sl, k, "", typeof sl.body === "function" ? sl.body(sl.clicks || 0, (kk, node, extra) => <div className="dk-click on" style={extra}>{node}</div>) : sl.body)}
                <span>{k + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="dk-progress"><i style={{ width: `${((i + (clicks ? step / (clicks + 1) : 0) + 1) / n) * 100}%` }} /></div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Commentary editor (Health Read). Commentary is an HTML document per product and
// month: the repo's HEALTH_COMMENTARY seeds it for the latest month, and edits made
// in the dashboard are saved in the viewer's own browser (localStorage), keyed by
// product and month. All HTML is passed through sanitizeHtml before it is shown or
// saved, so pasted or stored markup can never run script.
// ---------------------------------------------------------------------------
const CM_LIMIT = 6000;
const CM_TAGS = new Set(["P", "BR", "DIV", "SECTION", "SPAN", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI", "H4", "H5"]);
const CM_DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "TEMPLATE", "NOSCRIPT", "SVG", "MATH", "FORM", "INPUT", "TEXTAREA", "BUTTON", "SELECT", "IMG", "VIDEO", "AUDIO", "HEAD", "TITLE"]);
function cmEsc(t) { return String(t == null ? "" : t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function sanitizeHtml(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}`, "text/html");
  const out = [];
  const walk = (node) => {
    for (const n of Array.from(node.childNodes)) {
      if (n.nodeType === 3) { out.push(cmEsc(n.nodeValue)); continue; }
      if (n.nodeType !== 1) continue;
      const tag = n.tagName;
      if (CM_DROP.has(tag)) continue;
      const st = (n.getAttribute("style") || "").toLowerCase();
      // rich paste: spans carry bold/italic/underline as inline styles; Google Docs wraps everything in a "normal weight" <b>
      if (tag === "SPAN") {
        const wrap = [];
        if (/font-weight:\s*(bold|[6-9]00)/.test(st)) wrap.push("strong");
        if (/font-style:\s*italic/.test(st)) wrap.push("em");
        if (/text-decoration[^;]*underline/.test(st)) wrap.push("u");
        const cls = (n.getAttribute("class") || "").split(/\s+/).filter((c) => /^cm-[a-z0-9-]+$/.test(c)).join(" ");
        if (cls) out.push(`<span class="${cls}">`);
        wrap.forEach((w) => out.push(`<${w}>`)); walk(n); wrap.reverse().forEach((w) => out.push(`</${w}>`));
        if (cls) out.push("</span>");
        continue;
      }
      if ((tag === "B" || tag === "STRONG") && /font-weight:\s*(normal|[1-4]00)/.test(st)) { walk(n); continue; }
      if (!CM_TAGS.has(tag)) { walk(n); continue; }
      const t = tag.toLowerCase();
      if (t === "br") { out.push("<br>"); continue; }
      const cls = (n.getAttribute("class") || "").split(/\s+/).filter((c) => /^cm-[a-z0-9-]+$/.test(c)).join(" ");
      out.push(`<${t}${cls ? ` class="${cls}"` : ""}>`); walk(n); out.push(`</${t}>`);
    }
  };
  walk(doc.body);
  // the browser leaves empty paragraphs around lists and after Enter; they only add stray space
  return out.join("").replace(/<p(?: class="[^"]*")?>(?:<br>)?<\/p>/g, "");
}
// The repo commentary as HTML: lead bullets, then one card per theme (root causes first, then
// actions and the related initiatives with their live register status).
function commentarySeedHtml(sc) {
  const items = HEALTH_COMMENTARY[sc] || [];
  if (!items.length) return "";
  const li = (arr) => arr.map((t) => `<li>${cmEsc(t)}</li>`).join("");
  const lead = items.filter((x) => typeof x === "string").map((x) => x.replace(/^@/, ""));
  const themes = items.filter((x) => typeof x !== "string");
  const stKey = (st) => { const k = String(st).toLowerCase(); return k.includes("launch") ? "launched" : (k.includes("hold") || k.includes("stall")) ? "hold" : k.includes("flight") ? "flight" : "idea"; };
  const initLi = (x) => {
    if (typeof x !== "string") return `<li class="cm-plain">${cmEsc(x.t)}<ul>${li(x.sub)}</ul></li>`;
    const it = INITIATIVES.find((i) => i.p === sc && i.name === x);
    return it
      ? `<li><span class="cm-st cm-st-${stKey(it.status)}">${cmEsc(it.status)}</span><strong>${cmEsc(it.name)}</strong> <span class="cm-meta">${cmEsc(it.timeline)} · ${cmEsc(it.prime)}</span></li>`
      : `<li class="cm-plain">${cmEsc(x)}</li>`;
  };
  let html = lead.length ? `<ul>${li(lead)}</ul>` : "";
  themes.forEach((t, i) => {
    html += `<section class="cm-card"><h4><span class="cm-num">${String(i + 1).padStart(2, "0")}</span> ${cmEsc(t.t)}</h4>`
      + (t.share ? `<p class="cm-sub">${cmEsc(t.share)}</p>` : "")
      + (t.causes && t.causes.length ? `<h5 class="cm-h cm-h-bad">${sc === "TV" ? "Possible root causes" : "Root causes"}</h5><ul class="cm-cause">${li(t.causes)}</ul>` : "")
      + (t.next && t.next.length ? `<h5 class="cm-h">What the team is doing</h5><ul>${li(t.next)}</ul>` : "")
      + (t.inits && t.inits.length ? `<h5 class="cm-h">Related initiatives</h5><ul class="cm-inits">${t.inits.map(initLi).join("")}</ul>` : "")
      + (t.note ? `<p class="cm-note">${cmEsc(t.note)}</p>` : "")
      + `</section>`;
  });
  return html;
}
// Shared text kept by the dashboard worker (/api/commentary). Anyone can read it; only editors of the Gizmos app can write.
// Every call resolves (never throws), so the editor falls back to browser-only saving when the endpoint is unavailable.
const cmShared = {
  async get(key) {
    try {
      const r = await fetch(`/api/commentary?key=${encodeURIComponent(key)}`, { headers: { accept: "application/json" } });
      if (!r.ok) return null;
      const j = await r.json();
      return j && typeof j === "object" && "canEdit" in j ? j : null;
    } catch (e) { return null; }
  },
  async send(method, body) {
    try {
      const r = await fetch("/api/commentary", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, ...j } : { ok: false, error: j.error || "Could not update the shared text" };
    } catch (e) { return { ok: false, error: "Could not reach the server" }; }
  },
  put(key, html) { return cmShared.send("PUT", { key, html }); },
  clear(key) { return cmShared.send("DELETE", { key }); }
};
const cmStore = {
  k: (sc, m) => `relstrat.commentary.v1|${sc}|${m}`,
  get(sc, m) { try { const r = window.localStorage.getItem(cmStore.k(sc, m)); const o = r ? JSON.parse(r) : null; return o && typeof o.html === "string" ? o : null; } catch (e) { return null; } },
  set(sc, m, html) { try { window.localStorage.setItem(cmStore.k(sc, m), JSON.stringify({ html, at: Date.now() })); return true; } catch (e) { return false; } },
  clear(sc, m) { try { window.localStorage.removeItem(cmStore.k(sc, m)); return true; } catch (e) { return false; } }
};
function commentaryCss(T) {
  return `
.cm-doc{font-size:13px;line-height:1.6;color:${T.textSecondary}}
.cm-doc ul,.cm-doc ol{margin:4px 0;padding-left:20px}
.cm-doc li{margin:2px 0}
.cm-doc strong,.cm-doc b{color:${T.text};font-weight:700}
.cm-doc p{margin:4px 0}
.cm-doc.cm-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px;align-items:start}
.cm-doc.cm-cards>*{grid-column:1/-1}
.cm-doc.cm-cards>.cm-card{grid-column:auto}
.cm-card{background:${T.panel};border:1px solid ${T.border};border-left:3px solid ${T.heading};border-radius:10px;padding:12px 14px;margin:8px 0}
.cm-doc.cm-cards .cm-card{margin:0}
.cm-card h4{margin:0;font-size:13.5px;font-weight:700;color:${T.text}}
.cm-num{font-size:11px;font-weight:700;color:${T.textFaint};letter-spacing:.05em;margin-right:6px}
.cm-sub{margin:2px 0 0;font-size:12px;color:${T.textMuted}}
.cm-h{margin:10px 0 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${T.heading}}
.cm-h-bad{color:${T.bad}}
.cm-cause li{font-weight:600;color:${T.text}}
.cm-inits{list-style:none;padding-left:0!important}
.cm-inits>li{display:grid;grid-template-columns:auto 1fr;column-gap:7px;align-items:center;margin:4px 0}
.cm-inits>li>.cm-st{margin-right:0}
.cm-inits>li>.cm-meta{grid-column:2;line-height:1.3}
.cm-inits>li.cm-plain{display:list-item;list-style:disc;margin-left:20px}
.cm-meta{color:${T.textFaint};font-size:11.5px}
.cm-note{margin:8px 0 0!important;font-size:12px;font-style:italic;color:${T.textMuted}}
.cm-st{display:inline-block;border-radius:999px;padding:1px 9px;font-size:11px;font-weight:700;margin-right:7px;white-space:nowrap;background:${T.chipIdea};color:${T.chipIdeaText}}
.cm-st-launched{background:${T.chipLaunched};color:${T.chipLaunchedText}}
.cm-st-flight{background:${T.chipFlight};color:${T.chipFlightText}}
.cm-st-hold{background:${T.chipStalled};color:${T.chipStalledText}}
.cm-edit{outline:none;min-height:150px;max-height:68vh;overflow:auto;padding:12px 14px;background:${T.surface};border:1px solid ${T.borderStrong};border-top:none;border-radius:0 0 10px 10px;box-sizing:border-box}
.cm-edit:focus{box-shadow:inset 0 0 0 2px ${T.heading}}
.cm-edit:empty::before{content:attr(data-ph);color:${T.textFaint};font-style:italic}
`;
}
function CommentaryEditor({ T, sc, month, seedHtml, label, noun = "commentary", docStyle, onSaved, shareKey }) {
  const [saved, setSaved] = useState(() => cmStore.get(sc, month));
  const [mode, setMode] = useState("view");
  const [dirty, setDirty] = useState(false);
  const [count, setCount] = useState(0);
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(null); // "discard" | "reset"
  // With a shareKey the text can be published for everyone: `shared` is the published version, `canPublish` says whether this
  // viewer is an editor of the app. Order of precedence: this browser's own edit, then the published text, then the generated text.
  const [shared, setShared] = useState(null); // { html, at, by }
  const [canPublish, setCanPublish] = useState(false);
  const [role, setRole] = useState("");
  const [sharedState, setSharedState] = useState(shareKey ? "loading" : "off"); // off | loading | ready | unavailable
  const ref = useRef(null);
  useEffect(() => {
    if (!shareKey) return undefined;
    let live = true;
    cmShared.get(shareKey).then((r) => {
      if (!live) return;
      if (!r) { setSharedState("unavailable"); return; }
      setShared(r.html ? { html: r.html, at: r.updated_at, by: r.updated_by } : null);
      setCanPublish(!!r.canEdit); setRole(r.role || ""); setSharedState("ready");
    });
    return () => { live = false; };
  }, [shareKey]);
  const publishing = !!shareKey && canPublish;
  const baseHtml = saved ? saved.html : shared ? shared.html : seedHtml;
  const viewHtml = sanitizeHtml(baseHtml);
  const isEmpty = !viewHtml.replace(/<[^>]*>/g, "").trim();
  const over = count > CM_LIMIT;

  useEffect(() => {
    if (mode !== "edit" || !ref.current) return;
    ref.current.innerHTML = sanitizeHtml(baseHtml);
    // a plain paragraph after the last card, so new text does not inherit the card's note styling
    const last = ref.current.lastElementChild;
    if (!last || last.tagName !== "P" || last.className) ref.current.insertAdjacentHTML("beforeend", "<p><br></p>");
    setCount(ref.current.innerText.trim().length);
    ref.current.focus();
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) { /* older browsers */ }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const touch = () => {
    const el = ref.current; if (!el) return;
    if (!el.innerText.trim() && /^(<br>|<p><br><\/p>|<div><br><\/div>)?$/.test(el.innerHTML)) el.innerHTML = "";
    setCount(el.innerText.trim().length); setDirty(true); setMsg(""); setConfirm(null);
  };
  const exec = (cmd) => { if (ref.current) ref.current.focus(); try { document.execCommand(cmd, false, null); } catch (e) { /* ignore */ } touch(); };
  const onPaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html"), text = e.clipboardData.getData("text/plain");
    try { document.execCommand("insertHTML", false, html ? sanitizeHtml(html) : cmEsc(text).replace(/\r?\n/g, "<br>")); } catch (er) { /* ignore */ }
    touch();
  };
  const save = async () => {
    const el = ref.current; if (!el) return;
    if (el.innerText.trim().length > CM_LIMIT) { setMsg(`Over the ${CM_LIMIT.toLocaleString()} character limit`); return; }
    const html = sanitizeHtml(el.innerHTML);
    if (publishing) {
      setMsg("Publishing for everyone…");
      const r = await cmShared.put(shareKey, html);
      if (!r.ok) { setMsg(r.error); return; }
      cmStore.clear(sc, month); setSaved(null); setShared({ html, at: r.updated_at, by: r.updated_by });
      setMode("view"); setDirty(false); setConfirm(null); setMsg("");
      if (onSaved) onSaved();
      return;
    }
    if (!cmStore.set(sc, month, html)) { setMsg("Could not save: this browser is blocking storage"); return; }
    setSaved({ html, at: Date.now() }); setMode("view"); setDirty(false); setConfirm(null); setMsg("");
    if (onSaved) onSaved();
  };
  const close = () => {
    if (dirty && confirm !== "discard") { setConfirm("discard"); return; }
    setMode("view"); setDirty(false); setConfirm(null); setMsg("");
  };
  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); save(); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
  };
  const resetToOriginal = async () => {
    if (publishing && shared) {
      const r = await cmShared.clear(shareKey);
      if (!r.ok) { setMsg(r.error); setConfirm(null); return; }
      setShared(null);
    }
    cmStore.clear(sc, month); setSaved(null); setConfirm(null); setMsg("");
    if (onSaved) onSaved();
  };

  const btn = (primary) => ({ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: "5px 14px", cursor: "pointer",
    border: `1px solid ${primary ? "transparent" : T.borderStrong}`, background: primary ? T.heading : "transparent", color: primary ? T.surface : T.textSecondary });
  const tool = (cmd, label, title, style) => (
    <button key={cmd} type="button" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd)}
      style={{ minWidth: 28, height: 26, padding: "0 8px", fontFamily: FONT, fontSize: 13, lineHeight: 1, color: T.textSecondary, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, cursor: "pointer", ...style }}>{label}</button>
  );
  const stateText = over ? `${count.toLocaleString()} of ${CM_LIMIT.toLocaleString()}: over the limit` : dirty ? "Unsaved changes" : "No changes yet";

  return (
    <div>
      <style>{commentaryCss(T)}</style>
      {mode === "edit" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: T.band, border: `1px solid ${T.border}`, borderRadius: "10px 10px 0 0", padding: "8px 12px", borderBottom: "none" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.heading, marginRight: "auto" }}>Writing {label || `${sc} commentary for ${month}`}</span>
            <span style={{ fontSize: 12, color: over || msg ? T.bad : T.textMuted }}>{msg || stateText}</span>
            {confirm === "discard"
              ? <><span style={{ fontSize: 12, color: T.bad, fontWeight: 600 }}>Discard unsaved changes?</span>
                  <button type="button" style={btn(false)} onClick={() => setConfirm(null)}>Keep editing</button>
                  <button type="button" style={{ ...btn(false), color: T.bad, borderColor: T.bad }} onClick={close}>Discard</button></>
              : <><button type="button" style={btn(false)} onClick={close}>Close</button>
                  <button type="button" title="Ctrl+Enter" disabled={over} style={{ ...btn(true), opacity: over ? 0.5 : 1, cursor: over ? "not-allowed" : "pointer" }} onClick={save}>Save</button></>}
          </div>
          <div role="toolbar" aria-label="Formatting" style={{ display: "flex", gap: 5, flexWrap: "wrap", padding: "6px 10px", background: T.panel, border: `1px solid ${T.borderStrong}`, borderBottom: `1px solid ${T.border}` }}>
            {tool("bold", <b>B</b>, "Bold (Ctrl+B)")}
            {tool("italic", <i>I</i>, "Italic (Ctrl+I)")}
            {tool("underline", <u>U</u>, "Underline (Ctrl+U)")}
            {tool("insertUnorderedList", "•", "Bullet list")}
            {tool("insertOrderedList", "1.", "Numbered list")}
            {tool("undo", "↶", "Undo (Ctrl+Z)")}
            {tool("redo", "↷", "Redo (Ctrl+Y)")}
          </div>
          <div ref={ref} className="cm-doc cm-edit" contentEditable role="textbox" aria-multiline="true" aria-label={label || `${sc} commentary for ${month}`} style={docStyle}
            data-ph="Write it here" onInput={touch} onPaste={onPaste} onKeyDown={onKeyDown} />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 6, fontSize: 11.5, color: over ? T.bad : T.textFaint }}>
            <span>{count.toLocaleString()} of {CM_LIMIT.toLocaleString()}</span>
            <span>Ctrl+Enter to save · Esc to close · {publishing ? "saving publishes it for everyone" : "saved in this browser"}</span>
          </div>
        </div>
      ) : (
        <div>
          {isEmpty
            ? <p style={{ margin: 0, fontSize: 13, fontStyle: "italic", color: T.textFaint }}>{label ? "Nothing has been added here yet." : `No commentary has been added for ${month} yet.`}</p>
            : <div className="cm-doc cm-cards" style={docStyle} dangerouslySetInnerHTML={{ __html: viewHtml }} />}
          <div className="cm-actions" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" style={btn(false)} onClick={() => { setMode("edit"); setDirty(false); setMsg(""); }}>{isEmpty ? `Add ${noun}` : `Edit ${noun}`}{publishing ? " (for everyone)" : ""}</button>
            {shared && !saved && <span style={{ fontSize: 11.5, color: T.textFaint }}>Published for everyone{shared.at ? ` · ${new Date(shared.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}{shared.by ? ` · ${shared.by}` : ""}</span>}
            {saved && <span style={{ fontSize: 11.5, color: T.textFaint }}>{publishing ? "Edited in this browser, not yet published" : "Edited in this browser"} · {new Date(saved.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}{publishing ? " · edit and save to publish it" : ""}</span>}
            {sharedState === "ready" && !canPublish && <span style={{ fontSize: 11.5, color: T.textFaint }}>Your edits stay in this browser (view only{role ? `, role: ${role}` : ""})</span>}
            {msg && <span style={{ fontSize: 12, color: T.bad, fontWeight: 600 }}>{msg}</span>}
            {(saved || (publishing && shared)) && seedHtml && (confirm === "reset"
              ? <><span style={{ fontSize: 12, color: T.bad, fontWeight: 600 }}>{publishing && shared ? "Replace the published text, for everyone, with the generated text?" : "Replace your edits with the published text?"}</span>
                  <button type="button" style={btn(false)} onClick={() => setConfirm(null)}>Cancel</button>
                  <button type="button" style={{ ...btn(false), color: T.bad, borderColor: T.bad }} onClick={resetToOriginal}>Reset</button></>
              : <button type="button" onClick={() => setConfirm("reset")} style={{ background: "none", border: "none", padding: 0, fontFamily: FONT, fontSize: 11.5, fontWeight: 600, color: T.textMuted, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}>{publishing && shared ? "Reset to generated text" : "Reset to published"}</button>)}
          </div>
        </div>
      )}
    </div>
  );
}

// Numbered section with lavender band header
// Open/closed state is cached per section so it survives the remounts that
// follow any dashboard state change (filters, range, table toggles). The cache
// is cleared on page change so every page still opens in its default state.
const SECTION_OPEN = {};
function Section({ num, eyebrow, title, icon, T, children, collapsible, defaultOpen = true }) {
  const cacheKey = `${eyebrow || ""}|${title}`;
  const [open, setOpen] = useState(SECTION_OPEN[cacheKey] !== undefined ? SECTION_OPEN[cacheKey] : defaultOpen);
  const toggle = () => { SECTION_OPEN[cacheKey] = !open; setOpen(!open); };
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 14, marginTop: 22, overflow: "hidden", background: T.surface }}>
      <div
        onClick={collapsible ? toggle : undefined}
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
    id: "tickets", name: "Ticket rate (per 100 subs)", decimals: 2, fmt: (v) => fmtRate(v, 2), agg2025: "avg",
    rows: [...PRODUCTS, "SH+"].map((p) => ({ key: p, label: p, data: DATA.ticketRate[p] }))
  },
  {
    id: "repairs", name: "Repair / dispatch rate (per 100 subs)", decimals: 2, fmt: (v) => fmtRate(v, 2), agg2025: "avg",
    rows: [...PRODUCTS, "SH+"].map((p) => ({ key: p, label: p, data: DATA.repairRate[p] }))
  },
  {
    id: "churn", name: "Churn rate (per 100 subs)", decimals: 2, fmt: (v) => fmtRate(v, 2), agg2025: "avg",
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

// TV sub-pages (nested under TV in the nav, collapsed by default)
// Sub-menu pages nested under a product in the left nav (collapsed by default)
const CHILD_PAGES = { home: ["execsummary"], HSIA: ["hsiawest", "hsiatq", "hsiapfe", "hsiatickets", "hsiasentiment", "hsiacross", "hsiaoctreview", "hsiaarch"], "SH+": ["shplustickets"], archive: ["hsiabrief", "tvbrief"], hsiaarch: ["hsiaarchdeck"], TV: ["tvplatforms", "tvtickets", "tvsentiment", "tvcross", "tvoctreview"] };
const CHILD_LABEL = {
  execsummary: "Executive Summary",
  shplustickets: "Notes Analysis",
  hsiaoctreview: "Oct Review", hsiatickets: "Notes Analysis", hsiasentiment: "Customer Sentiment Analysis", hsiacross: "Cross Analysis", hsiawest: "HSIA West", hsiatq: "TQ ILEC", hsiapfe: "PFE (PureFibre East)", hsiaarch: "Architecture", hsiaarchdeck: "Supporting deck", hsiabrief: "HSIA Review",
  tvplatforms: "By Platform", tvtickets: "Notes Analysis", tvsentiment: "Customer Sentiment Analysis", tvcross: "Cross Analysis", tvbrief: "TV Review (Sep 2026)", tvoctreview: "Oct Review"
};
const CHILD_PARENT = Object.fromEntries(Object.entries(CHILD_PAGES).flatMap(([parent, ids]) => ids.map((id) => [id, parent])));
const PARENT_LABEL = { home: "Overview", archive: "Archive", hsiaarch: "HSIA · Architecture" };
const ARCHITECTURE_URL = "https://claude.ai/artifact/A1ZcUPDQ119QdFpa36edPX?sk=w28b8ZTHHIB5SiZM_L_SDA";
// Previously completed reviews and miscellaneous pages. Frozen: not refreshed with each month's update.
const ARCHIVE_ITEMS = [
  { id: "hsiabrief", title: "HSIA Review", period: "Q3 2026 (data to Sep 2026)", desc: "Why HSIA tickets rose year over year in Jan to Sep 2026, read against the latest quarter, agent and technician notes, customer sentiment, and the initiatives in flight. Final; not updated after the September data." },
  { id: "tvbrief", title: "TV Review (Stuck on Initializing)", period: "Aug to Oct 2026 (agent exports to 30 Oct 2026)", desc: "STB No Boot › Stuck on Initializing against its baseline with the All STBs / One STB split, root causes and the fixes in flight. Final; superseded by the Oct Review." }
];

// Initiatives covering a recurring-issue group, product-scoped
function initiativesCovering(product, grp) {
  return INITIATIVES.filter((it) => it.p === product && it.issues.includes(grp));
}

// HSIA customer pain points (hsia_ticket_recategorization tab, G4:I6): how the Looker
// Category 1 › 2 ticket types roll up. Anything not listed there is "Not grouped".
const HSIA_PAIN_POINTS = [
  { name: "Connection Instability & Disconnects", types: "Can't connect · No data flow · Losing sync · No IP · No sync · ONT not ranged" },
  { name: "Slow Speeds", types: "Wireless slow speeds · High-speed (wired) slow speeds · Incompatible equipment" },
  { name: "WiFi Coverage Gaps", types: "Wireless disconnects · Wireless can't connect" },
  { name: "Not grouped", types: "Ticket types outside the three groups (Historical Data, Abandon, NWH); the tab reports these as Other or leaves them out" }
];
function hsiaPainPoint(issue) {
  const [c1, c2] = issue.split(" › ").map((x) => x.trim());
  if (/Incompatible/.test(c1) || /Incompatible/.test(c2) || /Slow Speeds/.test(c2)) return "Slow Speeds";
  if (c1 === "Wireless" || c1 === "Wi-Fi connection") return /Disconnects|Can't Connect/.test(c2) ? "WiFi Coverage Gaps" : "Not grouped";
  if (c1 === "Connectivity" && /Can't Connect|No Dataflow|Losing Sync|No IP|No Sync|ONT Not Ranged/.test(c2)) return "Connection Instability & Disconnects";
  return "Not grouped";
}

// Initiative themes each Looker issue maps to, by product. The Ticket issues &
// movers section uses this to show which initiative theme(s) address an issue
// and to count initiative coverage by theme (HSIA and TV initiatives carry a
// theme in the workbook; SHS themes follow the pillar sub-themes in the SHS block).
function issueThemes(product, issue) {
  const [c1, c2 = ""] = issue.split(" › ").map((s) => s.trim());
  if (product === "HSIA") {
    if (c1 === "Wireless" || c1 === "Wi-Fi connection" || c1 === "NWH") return c2 === "Slow Speeds" ? ["Wi-Fi", "Speed & equipment"] : ["Wi-Fi"];
    if (c1.startsWith("Incompatible Equipment") || c2 === "Incompatible Equipment") return ["Speed & equipment"];
    if (c2 === "Slow Speeds") return ["Speed & equipment"];
    if (c2 === "No Sync") return ["Copper strategy", "Outage"];
    if (c2 === "Losing Sync" || c2 === "Historical Data") return ["GPON degraded fibre", "Copper strategy"];
    if (c2 === "No Dataflow" || c2 === "No IP") return ["GPON degraded fibre", "Outage", "No dataflow provisioning"];
    if (c2 === "ONT Not Ranged") return ["GPON degraded fibre"];
    if (c1 === "Abandon") return [];
    return ["GPON degraded fibre"];
  }
  if (product === "TV") {
    if (c1 === "Video Issues" || c1 === "Audio Issues") return ["Video Quality"];
    if (c1 === "Recording Issues" || c1 === "Recordings") return ["Recording Issues"];
    if (c1 === "Channel Issues" || c1 === "VOD" || c1 === "PPV/VOD" || c1 === "PPV" || c1 === "Guide Issues") return ["Channel Issues"];
    if (c1 === "Digital Box" && c2 === "Setup") return ["Onboarding"];
    if (c1 === "Apps" || c1 === "Mobile App" || c1 === "TV Features") return ["Onboarding"];
    if (c1 === "Abandon") return [];
    return ["Hardware"];
  }
  if (product === "SHS") {
    if (c1 === "Legacy Equipment") return ["Proactive Campaigns & outreach enablement", "Agent Tooling, Sweepr & FCR"];
    if (/Camera|Doorbell/.test(c1)) return ["HW/FW & architecture", "Agent Tooling, Sweepr & FCR"];
    if (c1 === "Main Panel") return ["HW/FW & architecture", "Telemetry detection & signal accuracy"];
    if (c1 === "Mobile App Self-Serve" || c1 === "Webpage Portal Self-Serve") return ["HW/FW & architecture", "Agent Tooling, Sweepr & FCR"];
    if (c1 === "CMS inquiry" || c1 === "Repair appointment" || c1 === "Billing" || c1 === "Education") return ["Agent Tooling, Sweepr & FCR"];
    if (c1 === "Abandon") return [];
    if (/Power/.test(c2)) return ["Agent Tooling, Sweepr & FCR", "Proactive Campaigns & outreach enablement"];
    return ["Proactive Campaigns & outreach enablement", "HW/FW & architecture"];
  }
  return [];
}
function initiativesByTheme(product, themes, issue) {
  const pinned = (it) => issue && it.pinFor && it.pinFor.includes(issue);
  return INITIATIVES
    .filter((it) => it.p === product && themes.includes(it.theme) && !(issue && it.notFor && it.notFor.includes(issue)))
    .sort((a, b) => (pinned(b) ? 1 : 0) - (pinned(a) ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Executive summary deck export. Slides are laid out on a 1120 × 630 canvas
// that maps 1:1 onto a 13.33in × 7.5in (16:9) slide. The .pptx is written
// here without any library (stored ZIP + minimal PresentationML) so it opens
// in Google Slides and PowerPoint; the PDF path builds a printable HTML deck
// and hands it to the browser's print dialog (Save as PDF).
// ---------------------------------------------------------------------------
const DECK_W = 1120, DECK_H = 630;
const DECK_LIGHT = { bg: "#FFFFFF", band: "#4B286D", bandText: "#C9A9E8", green: "#66CC02", panel: "#F6F2FA", border: "#E7E3EC", text: "#2C2E30", muted: "#676E73", faint: "#9A93A6", heading: "#4B286D", good: "#2B8000", bad: "#B3261E" };
const DECK_SOURCE = "Source: Churn Measurement 2026 workbook (KPIs, Looker ticket categories, HSIA ticket recategorization, initiatives) · Self Assure metrics (Sweepr) · ticket, repair and churn rates are per 100 subscribers";

function sparkPoints(series, w, h) {
  const idx = series.map((v, i) => [i, v]).filter(([, v]) => v != null);
  if (idx.length < 2) return [];
  const vals = idx.map(([, v]) => v);
  const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
  const n = series.length - 1;
  return idx.map(([i, v]) => [+((i / n) * w).toFixed(1), +((h - ((v - min) / span) * h)).toFixed(1)]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
// Stored (uncompressed) ZIP from [{ name, text }] entries
function zipStore(files, mime) {
  const enc = new TextEncoder();
  const u16 = (v) => [v & 255, (v >>> 8) & 255];
  const u32 = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  files.forEach((f) => {
    const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const head = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    parts.push(head, name, data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dosTime), ...u16(dosDate), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += head.length + name.length + data.length;
  });
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  return new Blob([...parts, ...central, end], { type: mime });
}

const EMU_PER_PX = 12192000 / DECK_W;
const xmlEsc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
let pptxShapeId = 1;
const emu = (px) => Math.round(px * EMU_PER_PX);
const hex6 = (c) => String(c).replace("#", "").toUpperCase();
function pptxXfrm(x, y, w, h) { return `<a:xfrm><a:off x="${emu(x)}" y="${emu(y)}"/><a:ext cx="${Math.max(1, emu(w))}" cy="${Math.max(1, emu(h))}"/></a:xfrm>`; }
function pptxRun(r) {
  const fill = r.color ? `<a:solidFill><a:srgbClr val="${hex6(r.color)}"/></a:solidFill>` : "";
  return `<a:r><a:rPr lang="en-CA" sz="${Math.round((r.sz || 12) * 100)}" b="${r.b ? 1 : 0}" dirty="0">${fill}<a:latin typeface="Arial"/></a:rPr><a:t>${xmlEsc(r.t)}</a:t></a:r>`;
}
function pptxPara(p) {
  const runs = (p.runs || [{ t: p.t, sz: p.sz, b: p.b, color: p.color }]).map(pptxRun).join("");
  const pPr = p.space ? `<a:pPr algn="${p.align || "l"}"><a:spcBef><a:spcPts val="${Math.round(p.space * 100)}"/></a:spcBef></a:pPr>` : `<a:pPr algn="${p.align || "l"}"/>`;
  return `<a:p>${pPr}${runs}</a:p>`;
}
function pptxShape({ x, y, w, h, fill, line, radius, paras, anchor = "t", inset = 8 }) {
  pptxShapeId += 1;
  const geom = radius ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${radius}"/></a:avLst></a:prstGeom>` : `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>`;
  const fillXml = fill ? `<a:solidFill><a:srgbClr val="${hex6(fill)}"/></a:solidFill>` : "<a:noFill/>";
  const lineXml = line ? `<a:ln w="9525"><a:solidFill><a:srgbClr val="${hex6(line)}"/></a:solidFill></a:ln>` : "<a:ln><a:noFill/></a:ln>";
  const ins = emu(inset);
  const body = paras && paras.length
    ? `<p:txBody><a:bodyPr wrap="square" lIns="${ins}" tIns="${ins}" rIns="${ins}" bIns="${ins}" anchor="${anchor}"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paras.map(pptxPara).join("")}</p:txBody>`
    : `<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-CA"/></a:p></p:txBody>`;
  return `<p:sp><p:nvSpPr><p:cNvPr id="${pptxShapeId}" name="Shape ${pptxShapeId}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${pptxXfrm(x, y, w, h)}${geom}${fillXml}${lineXml}</p:spPr>${body}</p:sp>`;
}
// Freeform polyline (sparkline) with points in canvas px relative to (x, y)
function pptxPolyline({ x, y, w, h, points, color, width = 2 }) {
  pptxShapeId += 1;
  const W = Math.max(1, emu(w)), H = Math.max(1, emu(h));
  const path = points.map((p, i) => { const tag = i === 0 ? "moveTo" : "lnTo"; return `<a:${tag}><a:pt x="${emu(p[0])}" y="${emu(p[1])}"/></a:${tag}>`; }).join("");
  return `<p:sp><p:nvSpPr><p:cNvPr id="${pptxShapeId}" name="Line ${pptxShapeId}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${pptxXfrm(x, y, w, h)}<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${W}" h="${H}" fill="none">${path}</a:path></a:pathLst></a:custGeom><a:noFill/><a:ln w="${Math.round(width * 12700)}" cap="rnd"><a:solidFill><a:srgbClr val="${hex6(color)}"/></a:solidFill><a:round/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-CA"/></a:p></p:txBody></p:sp>`;
}
const PPTX_NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const PPTX_EMPTY_TREE = '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>';
const PPTX_THEME = `${XML_HEAD}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Reliability"><a:themeElements><a:clrScheme name="Reliability"><a:dk1><a:srgbClr val="2C2E30"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="4B286D"/></a:dk2><a:lt2><a:srgbClr val="F6F2FA"/></a:lt2><a:accent1><a:srgbClr val="4B286D"/></a:accent1><a:accent2><a:srgbClr val="66CC02"/></a:accent2><a:accent3><a:srgbClr val="7C53A5"/></a:accent3><a:accent4><a:srgbClr val="2B8000"/></a:accent4><a:accent5><a:srgbClr val="2A78D6"/></a:accent5><a:accent6><a:srgbClr val="00838F"/></a:accent6><a:hlink><a:srgbClr val="4B286D"/></a:hlink><a:folHlink><a:srgbClr val="7C53A5"/></a:folHlink></a:clrScheme><a:fontScheme name="Reliability"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Reliability"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

function pptxSlideXml(shapes) {
  return `${XML_HEAD}<p:sld ${PPTX_NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes.join("")}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

// Deck model → per-slide shape lists (mirrors the on-screen slide layout)
function deckToPptxSlides(deck) {
  const C = DECK_LIGHT;
  const toneCol = (t) => (t === "good" ? C.good : t === "bad" ? C.bad : C.muted);
  const chrome = (n, title, shapes) => [
    pptxShape({ x: 0, y: 0, w: DECK_W, h: 78, fill: C.band }),
    pptxShape({ x: 0, y: 78, w: DECK_W, h: 4, fill: C.green }),
    pptxShape({ x: 36, y: 10, w: 900, h: 20, inset: 0, paras: [{ t: `RELIABILITY STRATEGY · EXECUTIVE SUMMARY · ${deck.month.toUpperCase()}`, sz: 8, b: true, color: C.bandText }] }),
    pptxShape({ x: 36, y: 30, w: 940, h: 40, inset: 0, anchor: "ctr", paras: [{ t: title, sz: 20, b: true, color: "#FFFFFF" }] }),
    pptxShape({ x: 980, y: 30, w: 104, h: 40, inset: 0, anchor: "ctr", paras: [{ t: `${n} / 4`, sz: 10, color: C.bandText, align: "r" }] }),
    ...shapes,
    pptxShape({ x: 36, y: 600, w: 1048, h: 20, inset: 0, paras: [{ t: DECK_SOURCE, sz: 7.5, color: C.faint }] })
  ];
  const colW = 338, gap = 17, top = 100, cardH = 488;

  // Slide 1 — KPI cards per product
  const s1 = [];
  deck.kpis.forEach((k, i) => {
    const x = 36 + i * (colW + gap);
    s1.push(pptxShape({ x, y: top, w: colW, h: cardH, fill: C.bg, line: C.border, radius: 4000 }));
    s1.push(pptxShape({ x: x + 14, y: top + 10, w: colW - 28, h: 26, inset: 0, paras: [{ t: k.product, sz: 14, b: true, color: k.color }] }));
    const tw = (colW - 28 - 10) / 2, th = (cardH - 50 - 20) / 3;
    k.tiles.forEach((t, j) => {
      const tx = x + 14 + (j % 2) * (tw + 10), ty = top + 46 + Math.floor(j / 2) * (th + 10);
      s1.push(pptxShape({ x: tx, y: ty, w: tw, h: th, fill: C.panel, radius: 4000 }));
      s1.push(pptxShape({ x: tx + 10, y: ty + 8, w: tw - 20, h: th - 16, inset: 0, paras: [
        { t: t.label.toUpperCase(), sz: 7.5, b: true, color: C.muted },
        { t: t.value, sz: 20, b: true, color: C.heading, space: 4 },
        { t: t.month, sz: 7.5, color: C.faint },
        { t: t.yoy ? `${t.yoy.text} YoY` : "—", sz: 9, b: true, color: t.yoy ? toneCol(t.yoy.tone) : C.faint, space: 4 }
      ] }));
    });
  });

  // Slide 2 — top issue, trend, rising and falling per product
  const s2 = [];
  deck.issues.forEach((k, i) => {
    const x = 36 + i * (colW + gap), ix = x + 14, iw = colW - 28;
    s2.push(pptxShape({ x, y: top, w: colW, h: cardH, fill: C.bg, line: C.border, radius: 4000 }));
    s2.push(pptxShape({ x: ix, y: top + 10, w: iw, h: 66, inset: 0, paras: [
      { t: `${k.product.toUpperCase()} · TOP TICKET ISSUE — ${k.asOf.toUpperCase()}`, sz: 7.5, b: true, color: k.color },
      { t: k.issue, sz: 12, b: true, color: C.text, space: 3 },
      { runs: [{ t: `${k.volume.toLocaleString()} tickets · `, sz: 9.5, color: C.muted }, { t: k.yoy, sz: 9.5, b: true, color: toneCol(k.tone) }], space: 2 }
    ] }));
    const sy = top + 84, sh = 86;
    s2.push(pptxShape({ x: ix, y: sy, w: iw, h: sh + 26, fill: C.panel, radius: 4000 }));
    const pts = sparkPoints(k.trend, iw - 24, sh - 20);
    if (pts.length > 1) s2.push(pptxPolyline({ x: ix + 12, y: sy + 10, w: iw - 24, h: sh - 20, points: pts, color: k.color, width: 2 }));
    s2.push(pptxShape({ x: ix + 12, y: sy + sh - 4, w: iw - 24, h: 26, inset: 0, paras: [{ t: `${k.trendName} tickets · ${k.trendFrom} – ${k.trendTo} (${k.trendSrc})`, sz: 7.5, color: C.faint }] }));
    const list = (title, rows, col, y) => [
      pptxShape({ x: ix, y, w: iw, h: 18, inset: 0, paras: [{ t: title, sz: 8, b: true, color: col }] }),
      ...rows.map((r, j) => pptxShape({ x: ix, y: y + 20 + j * 30, w: iw, h: 30, inset: 0, paras: [{ t: r.name, sz: 8.5, color: C.text }, { t: r.text, sz: 8, b: true, color: col }] }))
    ];
    const listY = sy + sh + 40;
    s2.push(...list(`RISING · ${k.compare.toUpperCase()}`, k.rising, C.bad, listY));
    s2.push(...list(`FALLING · ${k.compare.toUpperCase()}`, k.falling, C.good, listY + 20 + 3 * 30 + 12));
  });

  // Slide 3 — initiative milestones in the month
  const s3 = [];
  const cols = [[36, 96, "PRODUCT"], [140, 400, "INITIATIVE"], [548, 160, "THEME"], [716, 96, "STATUS"], [820, 110, "TIMELINE"], [938, 146, "PRIME"]];
  s3.push(...cols.map(([cx, cw, hd]) => pptxShape({ x: cx, y: top, w: cw, h: 20, inset: 0, paras: [{ t: hd, sz: 7.5, b: true, color: C.muted }] })));
  s3.push(pptxShape({ x: 36, y: top + 22, w: 1048, h: 1, fill: C.border }));
  if (!deck.milestones.length) s3.push(pptxShape({ x: 36, y: top + 40, w: 1048, h: 30, inset: 0, paras: [{ t: `No initiative has a milestone dated ${deck.month}.`, sz: 11, color: C.muted }] }));
  const rowH = Math.min(48, Math.floor(470 / Math.max(1, deck.milestones.length)));
  deck.milestones.forEach((m, j) => {
    const y = top + 30 + j * rowH;
    const vals = [m.product, m.name, m.theme, m.status, m.timeline, m.prime];
    cols.forEach(([cx, cw], ci) => s3.push(pptxShape({ x: cx, y, w: cw, h: rowH - 4, inset: 0, anchor: "ctr", paras: [{ t: vals[ci], sz: ci === 1 ? 10 : 9, b: ci <= 1 || ci === 3, color: ci === 0 ? m.color : ci === 3 ? (m.status === "Launched" ? C.good : m.status === "Stalled" ? C.bad : C.heading) : C.text }] })));
    s3.push(pptxShape({ x: 36, y: y + rowH - 3, w: 1048, h: 1, fill: C.border }));
  });

  // Slide 4 — self-serve cards
  const s4 = [];
  const tw4 = (1048 - 4 * 14) / 5;
  deck.selfServe.forEach((t, i) => {
    const x = 36 + i * (tw4 + 14), y = 120, h = 190;
    s4.push(pptxShape({ x, y, w: tw4, h, fill: C.bg, line: C.border, radius: 4000 }));
    s4.push(pptxShape({ x: x + 12, y: y + 12, w: tw4 - 24, h: h - 24, inset: 0, paras: [
      { t: t.label.toUpperCase(), sz: 7.5, b: true, color: C.muted },
      { t: t.value, sz: 22, b: true, color: C.heading, space: 6 },
      { t: t.sub, sz: 7.5, color: C.faint },
      ...t.deltas.map(([d, suf]) => ({ t: d ? `${d.text} ${suf}` : "—", sz: 9, b: true, color: d ? toneCol(d.tone) : C.faint, space: 4 }))
    ] }));
  });
  s4.push(pptxShape({ x: 36, y: 330, w: 1048, h: 60, inset: 0, paras: [{ t: deck.selfServeNote, sz: 9.5, color: C.muted }] }));

  return [chrome(1, deck.titles[0], s1), chrome(2, deck.titles[1], s2), chrome(3, deck.titles[2], s3), chrome(4, deck.titles[3], s4)];
}

function pptxFromDeck(deck) {
  pptxShapeId = 1;
  const slides = deckToPptxSlides(deck);
  const rels = (items) => `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`).join("")}</Relationships>`;
  const files = [
    { name: "[Content_Types].xml", text: `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", text: `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>` },
    { name: "ppt/presentation.xml", text: `${XML_HEAD}<p:presentation ${PPTX_NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 3}"/>`).join("")}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-CA"/></a:defPPr></p:defaultTextStyle></p:presentation>` },
    { name: "ppt/_rels/presentation.xml.rels", text: rels([["rId1", "slideMaster", "slideMasters/slideMaster1.xml"], ["rId2", "theme", "theme/theme1.xml"], ...slides.map((_, i) => [`rId${i + 3}`, "slide", `slides/slide${i + 1}.xml`])]) },
    { name: "ppt/slideMasters/slideMaster1.xml", text: `${XML_HEAD}<p:sldMaster ${PPTX_NS}>${PPTX_EMPTY_TREE}<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr/></p:titleStyle><p:bodyStyle><a:lvl1pPr/></p:bodyStyle><p:otherStyle><a:lvl1pPr/></p:otherStyle></p:txStyles></p:sldMaster>` },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", text: rels([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"], ["rId2", "theme", "../theme/theme1.xml"]]) },
    { name: "ppt/slideLayouts/slideLayout1.xml", text: `${XML_HEAD}<p:sldLayout ${PPTX_NS} type="blank" preserve="1">${PPTX_EMPTY_TREE}<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>` },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", text: rels([["rId1", "slideMaster", "../slideMasters/slideMaster1.xml"]]) },
    { name: "ppt/theme/theme1.xml", text: PPTX_THEME }
  ];
  slides.forEach((shapes, i) => {
    files.push({ name: `ppt/slides/slide${i + 1}.xml`, text: pptxSlideXml(shapes) });
    files.push({ name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, text: rels([["rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"]]) });
  });
  return zipStore(files, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
}

// Printable HTML deck (one 16:9 page per slide) for the PDF option
function deckToHtml(deck) {
  const C = DECK_LIGHT, e = xmlEsc;
  const tone = (t) => (t === "good" ? C.good : t === "bad" ? C.bad : C.muted);
  const chrome = (n, title, body) => `<section class="slide"><header><div class="eyebrow">Reliability Strategy · Executive summary · ${e(deck.month)}</div><div class="row"><h1>${e(title)}</h1><span class="num">${n} / 4</span></div></header><div class="body">${body}</div><footer>${e(DECK_SOURCE)}</footer></section>`;
  const s1 = `<div class="cols">${deck.kpis.map((k) => `<div class="card"><div class="prod" style="color:${k.color}">${e(k.product)}</div><div class="tiles">${k.tiles.map((t) => `<div class="tile"><div class="lbl">${e(t.label)}</div><div class="val">${e(t.value)}</div><div class="sub">${e(t.month)}</div><div class="d" style="color:${t.yoy ? tone(t.yoy.tone) : C.faint}">${t.yoy ? e(t.yoy.text) + " YoY" : "—"}</div></div>`).join("")}</div></div>`).join("")}</div>`;
  const spark = (k) => { const w = 300, h = 66, pts = sparkPoints(k.trend, w, h); return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${k.color}" stroke-width="2" stroke-linejoin="round" points="${pts.map((p) => p.join(",")).join(" ")}"/></svg>`; };
  const s2 = `<div class="cols">${deck.issues.map((k) => `<div class="card"><div class="lbl" style="color:${k.color}">${e(k.product)} · top ticket issue — ${e(k.asOf)}</div><div class="issue">${e(k.issue)}</div><div class="sub2">${k.volume.toLocaleString()} tickets · <b style="color:${tone(k.tone)}">${e(k.yoy)}</b></div><div class="spark">${spark(k)}<div class="cap">${e(k.trendName)} tickets · ${e(k.trendFrom)} – ${e(k.trendTo)} (${e(k.trendSrc)})</div></div>${[["Rising", k.rising, C.bad], ["Falling", k.falling, C.good]].map(([t, rows, col]) => `<div class="mv"><div class="lbl" style="color:${col}">${t} · ${e(k.compare)}</div>${rows.map((r) => `<div class="mvr"><span>${e(r.name)}</span><b style="color:${col}">${e(r.text)}</b></div>`).join("")}</div>`).join("")}</div>`).join("")}</div>`;
  const s3 = deck.milestones.length
    ? `<table><thead><tr><th>Product</th><th>Initiative</th><th>Theme</th><th>Status</th><th>Timeline</th><th>Prime</th></tr></thead><tbody>${deck.milestones.map((m) => `<tr><td style="color:${m.color};font-weight:700">${e(m.product)}</td><td><b>${e(m.name)}</b></td><td>${e(m.theme)}</td><td style="font-weight:700;color:${m.status === "Launched" ? C.good : m.status === "Stalled" ? C.bad : C.heading}">${e(m.status)}</td><td>${e(m.timeline)}</td><td>${e(m.prime)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="empty">No initiative has a milestone dated ${e(deck.month)}.</p>`;
  const s4 = `<div class="ss">${deck.selfServe.map((t) => `<div class="card"><div class="lbl">${e(t.label)}</div><div class="val big">${e(t.value)}</div><div class="sub">${e(t.sub)}</div>${t.deltas.map(([d, suf]) => `<div class="d" style="color:${d ? tone(d.tone) : C.faint}">${d ? e(d.text) + " " + e(suf) : "—"}</div>`).join("")}</div>`).join("")}</div><p class="note">${e(deck.selfServeNote)}</p>`;
  const css = `@page{size:13.333in 7.5in;margin:0}html,body{margin:0;background:#fff}body{font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;color:${C.text};-webkit-print-color-adjust:exact;print-color-adjust:exact}.slide{width:13.333in;height:7.5in;box-sizing:border-box;display:flex;flex-direction:column;background:#fff;overflow:hidden;page-break-after:always;break-after:page}.slide:last-child{page-break-after:auto;break-after:auto}header{background:${C.band};color:#fff;padding:14px 40px 12px;border-bottom:4px solid ${C.green}}.eyebrow{font-size:9pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${C.bandText}}.row{display:flex;justify-content:space-between;align-items:baseline}h1{margin:4px 0 0;font-size:20pt;font-weight:700}.num{font-size:10pt;color:${C.bandText}}.body{flex:1;padding:20px 40px;min-height:0}footer{padding:6px 40px 12px;font-size:7.5pt;color:${C.faint}}.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;height:100%}.card{border:1px solid ${C.border};border-radius:10px;padding:14px 16px;background:#fff;box-sizing:border-box;display:flex;flex-direction:column}.prod{font-size:13pt;font-weight:800;margin-bottom:8px}.tiles{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:1fr;gap:10px;flex:1}.mv,.spark,.issue,.sub2{flex:none}.tile{background:${C.panel};border-radius:8px;padding:10px 12px}.lbl{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${C.muted}}.val{font-size:18pt;font-weight:700;color:${C.heading};margin-top:4px;line-height:1.1}.val.big{font-size:22pt}.sub{font-size:7.5pt;color:${C.faint};margin-top:3px}.d{font-size:9pt;font-weight:700;margin-top:4px}.issue{font-size:12pt;font-weight:700;margin-top:4px}.sub2{font-size:9.5pt;color:${C.muted};margin-top:2px}.spark{background:${C.panel};border-radius:8px;padding:10px 12px 6px;margin:10px 0}.cap{font-size:7.5pt;color:${C.faint}}.mv{margin-top:10px}.mvr{display:flex;justify-content:space-between;gap:8px;font-size:8.5pt;padding:3px 0;border-bottom:1px solid ${C.border}}table{width:100%;border-collapse:collapse;font-size:9.5pt}th{text-align:left;font-size:7.5pt;text-transform:uppercase;letter-spacing:.05em;color:${C.muted};padding:6px 8px;border-bottom:1px solid ${C.border}}td{padding:8px;border-bottom:1px solid ${C.border};vertical-align:top}.ss{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}.note{font-size:9.5pt;color:${C.muted};margin-top:18px}.empty{color:${C.muted}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Reliability Strategy — Executive summary ${e(deck.month)}</title><style>${css}</style></head><body>${chrome(1, deck.titles[0], s1)}${chrome(2, deck.titles[1], s2)}${chrome(3, deck.titles[2], s3)}${chrome(4, deck.titles[3], s4)}</body></html>`;
}
function printDeck(deck) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:1280px;height:720px;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(frame);
  frame.onload = () => {
    setTimeout(() => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (err) { /* print blocked */ }
      setTimeout(() => frame.remove(), 60000);
    }, 400);
  };
  frame.srcdoc = deckToHtml(deck);
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------
export default function ReliabilityScorecards() {
  // Pages are addressable by URL hash (#HSIA, #hsiabrief, #execsummary ...), so links
  // from the MCP server's list_pages open the right page.
  const PAGE_IDS = ["home", "execsummary", "HSIA", "hsiatickets", "hsiasentiment", "hsiacross", "hsiaoctreview", "hsiawest", "hsiatq", "hsiapfe", "hsiaarch", "hsiaarchdeck", "TV", "tvplatforms", "tvtickets", "tvsentiment", "tvcross", "tvoctreview", "SHS", "SH+", "shplustickets", "selfserve", "ffps", "archive", "hsiabrief", "tvbrief"];
  // A page hash may carry a slide number (#tvbrief/3) to open that page's presentation
  // mode (Deck) on a given slide.
  const parseHash = () => {
    const h = typeof window !== "undefined" ? decodeURIComponent(window.location.hash.replace(/^#/, "")) : "";
    const [id, slide] = h.split("/");
    return { id: PAGE_IDS.includes(id) ? id : "home", slide: slide && /^\d+$/.test(slide) ? +slide : null };
  };
  const hashPage = () => parseHash().id;
  const [page, setPage] = useState(hashPage);
  const [deckSlide, setDeckSlide] = useState(() => parseHash().slide); // 1-based slide while presenting, else null
  const [cmVer, setCmVer] = useState(0); // bumped when an In short edit is saved or reset, so the page and slide editors reload it
  const [zoomChart, setZoomChart] = useState(null); // chart enlarged from a review page: { title, series, opts }
  useEffect(() => { setZoomChart(null); }, [page]);
  useEffect(() => {
    if (!zoomChart) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setZoomChart(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomChart]);
  useEffect(() => {
    const want = page === "home" ? "" : `#${encodeURIComponent(page)}${deckSlide != null ? `/${deckSlide}` : ""}`;
    if (window.location.hash !== want && !(want === "" && window.location.hash === "")) window.history.replaceState(null, "", want || window.location.pathname + window.location.search);
    const onHash = () => { const p = parseHash(); setPage(p.id); setDeckSlide(p.slide); };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [page, deckSlide]);
  const [fromIdx, setFromIdx] = useState(12); // default view: 2026 months
  const [toIdx, setToIdx] = useState(MONTHS.length - 1);
  const [scope, setScope] = useState("All");
  const [themeMode, setThemeMode] = useState("system");
  const [openTables, setOpenTables] = useState({});
  const [skMonth, setSkMonth] = useState({}); // Resolution Analysis month per product (unset = latest)
  const [skHover, setSkHover] = useState(null); // Resolution Analysis hovered Sankey node
  const [issueFilter, setIssueFilter] = useState({});
  const [healthMetric, setHealthMetric] = useState({}); // Health Read metric switcher, per product
  const [archSlide, setArchSlide] = useState(null); // slide the Architecture page asked the Supporting deck to open on
  const [expandedChart, setExpandedChart] = useState(null); // { title, labels, seriesDefs, fmt } shown in an overlay
  const [openPillars, setOpenPillars] = useState({}); // pillar sections default collapsed
  const [navOpen, setNavOpen] = useState({}); // per-product nav subsections, collapsed by default
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

  useEffect(() => { Object.keys(SECTION_OPEN).forEach((k) => { delete SECTION_OPEN[k]; }); }, [page]);
  useEffect(() => {
    document.title = "Reliability Strategy";
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='#4B286D'/><path d='M9 38h10l6-15 8 27 8-19 5 7h9' fill='none' stroke='#66CC02' stroke-width='5.5' stroke-linecap='round' stroke-linejoin='round'/></svg>";
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.type = "image/svg+xml";
    link.href = "data:image/svg+xml," + encodeURIComponent(svg);
  }, []);

  const rangeMonths = MONTHS.slice(fromIdx, toIdx + 1);
  const sliceR = (arr) => arr.slice(fromIdx, toIdx + 1);
  const latestLabel = MONTHS[toIdx];

  function toggleTable(id) { setOpenTables((o) => ({ ...o, [id]: !o[id] })); }

  function rowFigures(data, decimals, goodWhenDown = true, bps = false, upTo = toIdx) {
    const li = lastIdxUpTo(data, upTo);
    if (li < 0) return { latest: null };
    const D = bps === "rate" ? (a, b) => deltaRate(a, b, goodWhenDown, decimals) : bps ? (a, b) => deltaBps(a, b, goodWhenDown, decimals) : (a, b) => delta(a, b, "", decimals, goodWhenDown);
    return {
      latest: data[li], latestMonth: MONTHS[li],
      mom: li >= 1 ? D(data[li], data[li - 1]) : null,
      yoy: li >= 12 ? D(data[li], data[li - 12]) : null
    };
  }

  const rowVisible = (key) => scope === "All" || key === scope;

  const navItems = [
    { id: "home", label: "Overview", icon: "overview", color: T.heading },
    { id: "execsummary", label: "Executive Summary", icon: "slides", color: T.heading, child: true, parent: "home" },
    { id: "HSIA", label: "HSIA", icon: "hsia", color: colors.HSIA },
    { id: "hsiawest", label: "HSIA West", icon: "hsia", color: colors.HSIA, child: true, parent: "HSIA" },
    { id: "hsiatq", label: "TQ ILEC", icon: "hsia", color: colors.TQ, child: true, parent: "HSIA" },
    { id: "hsiapfe", label: "PFE (PureFibre East)", icon: "hsia", color: colors.PFE, child: true, parent: "HSIA" },
    { id: "hsiatickets", label: "Notes Analysis", icon: "notes", color: colors.HSIA, child: true, parent: "HSIA" },
    { id: "hsiasentiment", label: "Customer Sentiment Analysis", icon: "sentiment", color: colors.HSIA, child: true, parent: "HSIA" },
    { id: "hsiacross", label: "Cross Analysis", icon: "cross", color: colors.HSIA, child: true, parent: "HSIA" },
    { id: "hsiaoctreview", label: "Oct Review", icon: "brief", color: colors.HSIA, child: true, parent: "HSIA" },
    { id: "hsiaarch", label: "Architecture", icon: "program", color: colors.HSIA, child: true, parent: "HSIA" },
    { id: "hsiaarchdeck", label: "Supporting deck", icon: "slides", color: colors.HSIA, child: true, grand: true, parent: "hsiaarch" },
    { id: "TV", label: "TV", icon: "tv", color: colors.TV },
    { id: "tvplatforms", label: "By Platform", icon: "tv", color: colors.TV, child: true, parent: "TV" },
    { id: "tvtickets", label: "Notes Analysis", icon: "notes", color: colors.TV, child: true, parent: "TV" },
    { id: "tvsentiment", label: "Customer Sentiment Analysis", icon: "sentiment", color: colors.TV, child: true, parent: "TV" },
    { id: "tvcross", label: "Cross Analysis", icon: "cross", color: colors.TV, child: true, parent: "TV" },
    { id: "tvoctreview", label: "Oct Review", icon: "brief", color: colors.TV, child: true, parent: "TV" },
    { id: "SHS", label: "SHS", icon: "shs", color: colors.SHS },
    { id: "SH+", label: "SH+", icon: "shplus", color: colors["SH+"] },
    { id: "shplustickets", label: "Notes Analysis", icon: "notes", color: colors["SH+"], child: true, parent: "SH+" },
    { id: "selfserve", label: "Self-serve", icon: "selfserve", color: colors.SWEEPR },
    { id: "ffps", label: "Friction Free Program", icon: "program", color: colors.FFPS },
    // Archive is always the last menu option, set off by a divider.
    { id: "archive", label: "Archive", icon: "archive", color: T.textMuted, divider: true },
    { id: "hsiabrief", label: "HSIA Review", icon: "brief", color: colors.HSIA, child: true, parent: "archive" },
    { id: "tvbrief", label: "TV Review (Sep 2026)", icon: "brief", color: colors.TV, child: true, parent: "archive" }
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
        { icon: "calls", label: "Calls offered rate per 100 subs", data: DATA.callsRate["SH+"], fmt: fmtRate, dec: 2, color: colors["SH+"], goodDown: true },
        { icon: "calls", label: "Calls offered (SH+)", data: DATA.callsOffered["SH+"], fmt: fmtBig, dec: 0, color: colors["SH+"], goodDown: true },
        { icon: "tickets", label: "Ticket volume", data: DATA.ticketVolume["SH+"], fmt: fmtBig, dec: 0, color: colors["SH+"], goodDown: true },
        { icon: "tickets", label: "Ticket rate per 100 subs", data: DATA.ticketRate["SH+"], fmt: fmtRate, dec: 2, color: colors["SH+"], goodDown: true },
        { icon: "repairs", label: "Repair volume", data: DATA.repairVolume["SH+"], fmt: fmtBig, dec: 0, color: colors["SH+"], goodDown: true },
        { icon: "repairs", label: "Repair / dispatch rate per 100 subs", data: DATA.repairRate["SH+"], fmt: fmtRate, dec: 2, color: colors["SH+"], goodDown: true },
        { icon: "base", label: "Subscriber base", data: DATA.subBase["SH+"], fmt: fmtBig, dec: 0, color: colors["SH+"], goodDown: false }
      ];
    }
    const callsKey = sc === "All" ? "All" : sc === "SHS" ? "SHS" : "FFH";
    const callsData = CALLS_SPLIT[sc] ? CALLS_SPLIT[sc].offered : DATA.callsOffered[callsKey];
    const callsLabel = sc === "All" ? "Calls offered (all products)" : `Calls offered (${sc})`;
    return [
      { icon: "calls", label: "Calls offered rate per 100 subs", data: DATA.callsRate[sc], fmt: fmtRate, dec: 2, color: colors[sc], goodDown: true },
      { icon: "calls", label: callsLabel, data: callsData, fmt: fmtBig, dec: 0, color: CALLS_SPLIT[sc] ? colors[sc] : colors[callsKey], goodDown: true },
      { icon: "tickets", label: sc === "All" ? "Ticket volume (all products)" : "Ticket volume", data: DATA.ticketVolume[sc], fmt: fmtBig, dec: 0, color: colors[sc], goodDown: true },
      { icon: "tickets", label: "Ticket rate per 100 subs", data: DATA.ticketRate[sc], fmt: fmtRate, dec: 2, color: colors[sc], goodDown: true },
      { icon: "repairs", label: "Repair / dispatch rate per 100 subs", data: DATA.repairRate[sc], fmt: fmtRate, dec: 2, color: colors[sc], goodDown: true },
      { icon: "churn", label: "Churn rate per 100 subs", data: DATA.churnRate[sc], fmt: fmtRate, dec: 2, color: colors[sc], goodDown: true },
      { icon: "base", label: "Subscriber base", data: DATA.subBase[sc], fmt: fmtBig, dec: 0, color: colors[sc], goodDown: false },
      ...(DATA.b2bVoC[sc] ? [{ icon: "sentiment", label: "Voice of Customer (B2B)", data: DATA.b2bVoC[sc], fmt: fmtPct, dec: 1, color: colors[sc], goodDown: true }] : [])
    ];
  }

  function TileRow({ tiles, deltaMode, columns, extras }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {tiles.map((tile, i) => {
          const f = rowFigures(tile.data, tile.dec, tile.goodDown, tile.fmt === fmtPct ? true : tile.fmt === fmtRate ? "rate" : false);
          const deltas = [];
          if (deltaMode === "yoy") {
            deltas.push(<DeltaText key="y" d={f.yoy} T={T} suffix="YoY" />);
          } else {
            deltas.push(<DeltaText key="m" d={f.mom} T={T} suffix="MoM" />);
            deltas.push(<DeltaText key="y" d={f.yoy} T={T} suffix="YoY" />);
          }
          return (
            <StatCard key={i} T={T} color={tile.color} icon={tile.icon}
              label={tile.label} value={tile.fmt(f.latest)} sub={f.latestMonth}
              deltas={deltas} />
          );
        })}
        {extras}
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
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted }}>{p} · top ticket issue — {LOOKER_SHORT}</div>
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
                    // Focus month is coloured by direction vs the prior month.
                    // Every scorecard category improves when it falls, so down = good.
                    let cellColor = T.text;
                    if (isLast && r.data[gi] != null && gi > 0 && r.data[gi - 1] != null) {
                      const diff = r.data[gi] - r.data[gi - 1];
                      cellColor = diff > 0 ? T.bad : diff < 0 ? T.good : T.text;
                    }
                    return (
                      <td key={m} style={{ ...tdBase, textAlign: "right", background: isLast ? T.highlightCol : undefined, fontWeight: isLast ? 700 : 400, color: cellColor }}>
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

  // ------------------------------ health read (monthly narrative) ------------------------------
  // Plain-language read of the month at the end of the selected range: calls,
  // tickets and repairs, with the single biggest reason the trend points the way
  // it does. Churn is left out until the churn model refresh (it runs a month behind).
  const NOTES_ANALYSIS = { HSIA: HSA, TV: TVA };
  function narrativeFacts(sc) {
    const i = toIdx;
    const at = (arr, k) => (arr && k >= 0 && k < arr.length ? arr[k] : null);
    const pick = (arr) => ({ now: at(arr, i), prev: at(arr, i - 1), yoy: at(arr, i - 12) });
    const pct = (a, b) => (a != null && b ? ((a - b) / b) * 100 : null);
    const bps = (o, k) => (o.now != null && o[k] != null ? +(o.now - o[k]).toFixed(2) : null);
    const calls = pick(CALLS_SPLIT[sc] ? CALLS_SPLIT[sc].offered : DATA.callsOffered[sc]);
    const tv = pick(DATA.ticketVolume[sc]), tr = pick(DATA.ticketRate[sc]), rv = pick(DATA.repairVolume[sc]), rr = pick(DATA.repairRate[sc]), base = pick(DATA.subBase[sc]);
    return {
      sc, i, month: MONTHS[i], prevMonth: MONTHS[i - 1], calls, tv, tr, rv, rr, base, basePct: pct(base.now, base.prev),
      trBps: bps(tr, "prev"), rrBps: bps(rr, "prev"), trBpsY: bps(tr, "yoy"), rrBpsY: bps(rr, "yoy"),
      callsPct: calls ? pct(calls.now, calls.prev) : null, callsPctY: calls ? pct(calls.now, calls.yoy) : null,
      tvPct: pct(tv.now, tv.prev), tvPctY: pct(tv.now, tv.yoy), rvPct: pct(rv.now, rv.prev), rvPctY: pct(rv.now, rv.yoy),
      per100: tv.now && rv.now != null ? (rv.now / tv.now) * 100 : null, per100Prev: tv.prev && rv.prev != null ? (rv.prev / tv.prev) * 100 : null,
      perTicket: calls && calls.now != null && tv.now ? calls.now / tv.now : null, perTicketPrev: calls && calls.prev != null && tv.prev ? calls.prev / tv.prev : null
    };
  }
  // Largest month-over-month category move for a product (HSIA: recategorization pain
  // points; TV/SHS: Looker Category 1 groups).
  // `prefer` (+1 / -1) picks the largest move in that direction when one exists, so an
  // improving month is explained by what fell and a deteriorating month by what rose.
  function ticketDriver(product, i, prefer = 0) {
    const L = LOOKER[product];
    if (!L || !L.cats || i < 1) return null;
    let rows = L.cats.filter((c) => !/^Other/.test(c.name))
      .map((c) => ({ name: c.name, now: c.series[i], prev: c.series[i - 1], d: c.series[i] - c.series[i - 1] }))
      .filter((r) => r.now != null && r.prev != null);
    if (!rows.length) return null;
    if (prefer && rows.some((r) => Math.sign(r.d) === prefer)) rows = rows.filter((r) => Math.sign(r.d) === prefer);
    rows.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const total = L.monthlyTotal[i] - L.monthlyTotal[i - 1];
    return { ...rows[0], total, pct: rows[0].prev ? (rows[0].d / rows[0].prev) * 100 : null };
  }
  function verdictOf(f) {
    const t = f.trBps, r = f.rrBps;
    if (t == null && r == null) return { label: "No read yet", tone: "flat" };
    if (t > 0 && (r == null || r >= 0)) return { label: "Deteriorating", tone: "bad" };
    if (t < 0 && (r == null || r <= 0)) return { label: "Improving", tone: "good" };
    if (t === 0 && (r == null || r === 0)) return { label: "Steady", tone: "flat" };
    return { label: "Mixed", tone: "flat" };
  }
  function MonthlyNarrative({ sc }) {
    const f = narrativeFacts(sc);
    if (f.tv.now == null || f.tr.now == null) {
      return <p style={{ fontSize: 13, color: T.textFaint, margin: 0 }}>{sc} has no reported tickets for {f.month}, so there is no narrative for this month.</p>;
    }
    const v = verdictOf(f);
    const toneColor = v.tone === "good" ? T.good : v.tone === "bad" ? T.bad : T.textMuted;
    const sPct = (x, d = 1) => (x == null ? "n/a" : (x > 0 ? "+" : "") + x.toFixed(d) + "%");
    const sBps = (b) => (b == null ? "n/a" : (b > 0 ? "+" : "") + b + " per 100");
    const trDec = 2, rrDec = 2;
    const aPct = (x, d = 1) => (x == null ? "n/a" : Math.abs(x).toFixed(d) + "%");
    const prefer = v.tone === "good" ? -1 : v.tone === "bad" ? 1 : 0;
    // rate and volume pointing in opposite directions means the subscriber base moved the rate
    const baseEffect = f.trBps != null && f.tvPct != null && f.basePct != null && Math.sign(f.trBps) !== 0 && Math.sign(f.tvPct) !== 0 && Math.sign(f.trBps) !== Math.sign(f.tvPct);
    const upDown = (x, up = "rose", down = "fell", flat = "held") => (x == null ? flat : x > 0 ? up : x < 0 ? down : flat);
    const label = sc === "All" ? "Across HSIA, TV and SHS" : `For ${sc}`;

    // ----- main reason -----
    let driverText = null, driverProduct = sc;
    const catText = (d) => `${d.name} ${d.d >= 0 ? "added" : "shed"} ${Math.abs(d.d).toLocaleString()} tickets (${sPct(d.pct)}) versus ${f.prevMonth}`;
    if (baseEffect) {
      // the rate moved against volume: the base did the work
      driverText = `The ticket rate ${upDown(f.trBps)} because the subscriber base ${upDown(f.basePct, "grew", "shrank")} ${aPct(f.basePct)} while ticket volume ${upDown(f.tvPct)} ${aPct(f.tvPct)}; the underlying ticket count is ${f.tvPct > 0 ? "still rising" : "falling"}.`;
    }
    if (sc === "All") {
      const per = PRODUCTS.map((p) => ({ p, f: narrativeFacts(p) })).filter((x) => x.f.tv.now != null && x.f.tv.prev != null);
      per.sort((a, b) => Math.abs(b.f.tv.now - b.f.tv.prev) - Math.abs(a.f.tv.now - a.f.tv.prev));
      if (per.length) {
        const lead = per[0]; driverProduct = lead.p;
        const d = ticketDriver(lead.p, f.i, baseEffect ? 0 : prefer);
        const lt = `${lead.p} was the largest mover: ticket volume ${upDown(lead.f.tv.now - lead.f.tv.prev)} ${Math.abs(lead.f.tv.now - lead.f.tv.prev).toLocaleString()} (${sPct(lead.f.tvPct)}) and its ticket rate ${upDown(lead.f.trBps)} ${Math.abs(lead.f.trBps)} per 100`
          + (d ? `, led by ${d.name} (${d.d > 0 ? "+" : ""}${d.d.toLocaleString()}, ${sPct(d.pct)}).` : ".");
        driverText = driverText ? `${driverText} ${lt}` : lt;
      }
    } else {
      const d = ticketDriver(sc, f.i, baseEffect ? 0 : prefer);
      if (d) {
        const share = d.total && Math.sign(d.d) === Math.sign(d.total) ? `, ${Math.min(100, Math.round((Math.abs(d.d) / Math.abs(d.total)) * 100))}% of the net change` : d.total ? `, against a net ${d.total > 0 ? "rise" : "fall"} of ${Math.abs(d.total).toLocaleString()}` : "";
        const ct = `${catText(d)}, the largest ${baseEffect ? "" : prefer < 0 ? "downward " : prefer > 0 ? "upward " : ""}category move${share}.`;
        driverText = driverText ? `${driverText} ${ct}` : ct;
      } else if (sc === "SH+") {
        const st = `SH+ has no ticket category breakdown yet, so the read rests on the rate and volume movements.`;
        driverText = driverText ? `${driverText} ${st}` : st;
      }
    }
    // notes-analysis colour, only for the month the analysis covers
    let notesText = null, closureText = null;
    const NA = NOTES_ANALYSIS[driverProduct];
    if (NA && f.month === NA.months[NA.months.length - 1]) {
      const r = NA.tickets.rising[0];
      if (r) notesText = `In the ${driverProduct} agent notes the biggest sub-category mover was ${r.name} (${r.v[1].toLocaleString()} → ${r.v[2].toLocaleString()}, ${sPct(r.pct)}).`;
      const c = NA.tickets.closure;
      if (c && c.length >= 2 && c[c.length - 1].field_visit_pct != null) closureText = `Field visits closed ${c[c.length - 1].field_visit_pct}% of ${driverProduct} tickets against ${c[c.length - 2].field_visit_pct}% the month before (notes analysis).`;
    }

    // ----- sentences -----
    const tickets = [
      `Ticket rate ${upDown(f.trBps)} ${f.trBps == null ? "" : Math.abs(f.trBps) + " per 100 subs "}to ${fmtRate(f.tr.now, trDec)} per 100 subs${f.trBpsY != null ? ` (${sBps(f.trBpsY)} year over year)` : ""}.`,
      f.tv.prev != null ? `Volume ${upDown(f.tvPct)} ${aPct(f.tvPct)} to ${fmtNum(f.tv.now)}${f.tvPctY != null ? ` (${sPct(f.tvPctY)} YoY)` : ""}.` : `Volume was ${fmtNum(f.tv.now)}.`,
      f.basePct != null ? `Subscriber base ${upDown(f.basePct, "grew", "shrank")} ${aPct(f.basePct)}.` : null,
      notesText
    ].filter(Boolean).join(" ");
    const repairs = f.rr.now == null ? "Repairs are not reported for this month." : [
      `Repair rate ${upDown(f.rrBps)} ${f.rrBps == null ? "" : Math.abs(f.rrBps) + " per 100 subs "}to ${fmtRate(f.rr.now, rrDec)} per 100 subs${f.rrBpsY != null ? ` (${sBps(f.rrBpsY)} YoY)` : ""}.`,
      f.rv.now != null ? `${fmtNum(f.rv.now)} dispatches${f.rvPct != null ? ` (${sPct(f.rvPct)} MoM${f.rvPctY != null ? `, ${sPct(f.rvPctY)} YoY` : ""})` : ""}.` : null,
      f.per100 != null && f.per100Prev != null
        ? `${f.per100Prev.toFixed(1)} → ${f.per100.toFixed(1)} dispatches per 100 tickets, so ${f.per100 < f.per100Prev - 0.05 ? "a smaller" : f.per100 > f.per100Prev + 0.05 ? "a larger" : "the same"} share of tickets needed a field visit.`
        : null,
      closureText
    ].filter(Boolean).join(" ");
    const calls = !f.calls ? null : f.calls.now == null ? "Calls are not reported for this month." : [
      `Calls offered ${upDown(f.callsPct)} ${aPct(f.callsPct)} to ${fmtNum(f.calls.now)}${f.callsPctY != null ? ` (${sPct(f.callsPctY)} YoY)` : ""}.`,
      f.perTicket != null && f.perTicketPrev != null
        ? `${f.perTicketPrev.toFixed(2)} → ${f.perTicket.toFixed(2)} calls per ticket: ${f.callsPct != null && f.tvPct != null && f.callsPct > f.tvPct + 1
            ? "contacts are growing faster than tickets, which points to repeat and status calls rather than new faults"
            : f.callsPct != null && f.tvPct != null && f.callsPct < f.tvPct - 1
              ? "contacts grew more slowly than tickets, so more of the demand is converting into tickets than into repeat calls"
              : "contacts tracked tickets"}.`
        : null
    ].filter(Boolean).join(" ");

    const baseClause = baseEffect ? ` (volume ${upDown(f.tvPct)} ${aPct(f.tvPct)}; the base ${upDown(f.basePct, "grew", "shrank")} ${aPct(f.basePct)})` : "";
    const headline = v.tone === "bad"
      ? `${label}, reliability deteriorated in ${f.month}: the ticket rate ${upDown(f.trBps)} ${Math.abs(f.trBps || 0)} per 100${baseClause}${f.rrBps != null ? ` and the repair rate ${upDown(f.rrBps)} ${Math.abs(f.rrBps)} per 100` : ""}.`
      : v.tone === "good"
        ? `${label}, reliability improved in ${f.month}: the ticket rate ${upDown(f.trBps)} ${Math.abs(f.trBps || 0)} per 100${baseClause}${f.rrBps != null ? ` and the repair rate ${upDown(f.rrBps)} ${Math.abs(f.rrBps)} per 100` : ""}.`
        : `${label}, the ${f.month} read is mixed: the ticket rate ${upDown(f.trBps)} ${Math.abs(f.trBps || 0)} per 100 while the repair rate ${upDown(f.rrBps)} ${Math.abs(f.rrBps || 0)} per 100.`;

    const topIssuesText = (() => {
      const yoy = (a26, a25) => (a25 ? sPct(((a26 - a25) / a25) * 100) : null);
      if (sc === "All") {
        const all = PRODUCTS.filter((p) => LOOKER[p] && LOOKER[p].topIssues.length)
          .map((p) => ({ ...LOOKER[p].topIssues[0], p }));
        all.sort((a, b) => b.a26 - a.a26);
        if (!all.length) return null;
        return all.slice(0, 3).map((t, idx) => `${idx + 1}. ${t.p} · ${t.issue} — ${t.a26.toLocaleString()} tickets${yoy(t.a26, t.a25) ? ` (${yoy(t.a26, t.a25)} YoY)` : ""}.`).join(" ");
      }
      const L = LOOKER[sc];
      if (!L || !L.topIssues || !L.topIssues.length) return null;
      return L.topIssues.slice(0, 3).map((t, idx) => `${idx + 1}. ${t.issue} — ${t.a26.toLocaleString()} tickets${yoy(t.a26, t.a25) ? ` (${yoy(t.a26, t.a25)} YoY)` : ""}.`).join(" ");
    })();

    const block = (icon, title, text) => text ? (
      <div style={{ flex: 1, minWidth: 240, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, marginBottom: 6 }}>
          <span style={{ color: T.heading, display: "inline-flex" }}><Icon name={icon} size={14} /></span>{title}
        </div>
        <p style={{ margin: 0, fontSize: 12.8, lineHeight: 1.6, color: T.textSecondary }}>{text}</p>
      </div>
    ) : null;

    // ----- metric switcher (hero statement + chart) -----
    const callsSrc = CALLS_SPLIT[sc] ? CALLS_SPLIT[sc].offered : DATA.callsOffered[sc];
    const metricDefs = [
      { key: "callsRate", eyebrow: "Calls", name: "Calls offered rate per 100 subs", data: DATA.callsRate[sc], fmt: (x) => fmtRate(x, 2), rate: true, goodDown: true },
      { key: "callsOffered", eyebrow: "Calls", name: "Calls offered", data: callsSrc, fmt: fmtBig, goodDown: true },
      { key: "ticketRate", eyebrow: "Tickets", name: "Ticket rate per 100 subs", data: DATA.ticketRate[sc], fmt: (x) => fmtRate(x, trDec), rate: true, goodDown: true },
      { key: "ticketVolume", eyebrow: "Tickets", name: "Ticket volume", data: DATA.ticketVolume[sc], fmt: fmtBig, goodDown: true },
      { key: "repairRate", eyebrow: "Repairs", name: "Repair / dispatch rate per 100 subs", data: DATA.repairRate[sc], fmt: (x) => fmtRate(x, rrDec), rate: true, goodDown: true },
      { key: "repairVolume", eyebrow: "Repairs", name: "Dispatches", data: DATA.repairVolume[sc], fmt: fmtBig, goodDown: true },
      { key: "subBase", eyebrow: "Base", name: "Subscriber base", data: DATA.subBase[sc], fmt: fmtBig, goodDown: false },
      { key: "b2bVoC", eyebrow: "B2B VoC", name: "B2B reliability score", data: DATA.b2bVoC[sc], fmt: (x) => (x == null ? "—" : x.toFixed(1)), goodDown: true, pts: true }
    ].filter((m) => m.data && m.data[f.i] != null);
    const metric = metricDefs.find((m) => m.key === healthMetric[sc]) || metricDefs[0];
    const mNow = metric.data[f.i], mPrev = metric.data[f.i - 1], mYoy = metric.data[f.i - 12];
    const mDelta = mPrev == null ? null : metric.rate ? +(mNow - mPrev).toFixed(2) : metric.pts ? +(mNow - mPrev).toFixed(1) : ((mNow - mPrev) / mPrev) * 100;
    const mDeltaY = mYoy == null ? null : metric.rate ? +(mNow - mYoy).toFixed(2) : metric.pts ? +(mNow - mYoy).toFixed(1) : ((mNow - mYoy) / mYoy) * 100;
    const chg = (d) => {
      if (d == null) return null;
      if (d === 0 || (!metric.rate && Math.abs(d) < 0.05)) return "flat";
      const amt = metric.rate ? `${Math.abs(d)} per 100` : metric.pts ? `${Math.abs(d).toFixed(1)} pts` : `${Math.abs(d).toFixed(1)}%`;
      return `${amt} ${d > 0 ? "higher" : "lower"}`;
    };
    const favourable = mDelta == null || mDelta === 0 ? null : (mDelta < 0) === metric.goodDown;
    const favColor = favourable == null ? T.textMuted : favourable ? T.good : T.bad;
    // 2026 run so far: min / max months, against the same months of 2025
    const yearStart = Math.floor(f.i / 12) * 12;
    const run = metric.data.slice(yearStart, f.i + 1).map((x, k) => ({ x, m: MONTHS[yearStart + k] })).filter((r) => r.x != null);
    const runMin = run.length ? run.reduce((a, b) => (b.x < a.x ? b : a)) : null;
    const runMax = run.length ? run.reduce((a, b) => (b.x > a.x ? b : a)) : null;
    const shortM = (m) => m.replace(/ \d{2}(\d{2})$/, "'$1");
    const supporting = [
      run.length > 1 && runMin && runMax ? `${run.length} months of ${MONTHS[f.i].slice(-4)} have run between ${metric.fmt(runMin.x)} in ${shortM(runMin.m)} and ${metric.fmt(runMax.x)} in ${shortM(runMax.m)}.` : null,
      mYoy != null ? `${shortM(f.month)} sits ${chg(mDeltaY)} than ${shortM(MONTHS[f.i - 12])} (${metric.fmt(mYoy)}), which is ${(mDeltaY < 0) === metric.goodDown ? "favourable" : mDeltaY === 0 ? "level" : "unfavourable"} year over year.` : null,
      metric.eyebrow === "Tickets" ? driverText : metric.eyebrow === "Repairs" ? repairs : metric.eyebrow === "Calls" ? calls : null
    ].filter(Boolean).join(" ");
    const chartLabels = rangeMonths;
    const actualSeries = sliceR(metric.data);
    const priorSeries = fromIdx >= 12 ? metric.data.slice(fromIdx - 12, toIdx + 1 - 12) : null;
    const lineColor = colors[sc] || T.heading;
    const seriesDefs = [{ key: "actual", label: "Actual", data: actualSeries, color: lineColor }];
    if (priorSeries && priorSeries.some((x) => x != null)) seriesDefs.push({ key: "prior", label: String(+MONTHS[f.i].slice(-4) - 1), data: priorSeries, color: T.heading, dash: "2 4" });
    const metricNo = String(metricDefs.indexOf(metric) + 1).padStart(2, "0");
    const chip = (on, onClick, children, key) => (
      <button key={key} onClick={onClick}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 999, cursor: "pointer", fontFamily: FONT, fontSize: 12.5, fontWeight: 700,
          border: `1px solid ${on ? "transparent" : T.border}`, background: on ? T.good : T.surface, color: on ? "#fff" : T.text }}>
        {children}
      </button>
    );
    const dot = (c) => <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }} />;
    const metricTone = (m) => {
      const a = m.data[f.i], b = m.data[f.i - 1];
      if (a == null || b == null || a === b) return T.textFaint;
      return (a < b) === m.goodDown ? T.good : T.bad;
    };

    // ----- commentary (editable; seeded from HEALTH_COMMENTARY for the latest month) -----
    const commentary = sc === "All" ? null : (
      <CommentaryEditor key={`${sc}|${f.month}`} T={T} sc={sc} month={f.month} seedHtml={f.month === LATEST ? commentarySeedHtml(sc) : ""} />
    );

    const headlineNode = (
      <>
        {metric.name} was <span style={{ color: favColor, fontWeight: 700 }}>{metric.fmt(mNow)}</span> in {shortM(f.month)}
        {mDelta != null ? <>, {chg(mDelta)} MoM{favourable == null ? "" : favourable ? ", which is favourable." : ", which is unfavourable."}</> : "."}
      </>
    );

    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, 0.85fr)", gap: 28, alignItems: "start" }}>
          <div style={{ display: "flex", gap: 22, minWidth: 0 }}>
            <div style={{ paddingLeft: 4, minWidth: 96, flexShrink: 0 }}>
              <div style={{ fontSize: 42, lineHeight: 1, fontWeight: 300, color: T.heading, opacity: 0.45, letterSpacing: ".02em" }}>{metricNo}</div>
              <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: T.heading, lineHeight: 1.5 }}>{sc === "All" ? "All products" : sc}<br />{metric.eyebrow}</div>
              <span style={{ display: "inline-block", marginTop: 12, background: toneColor + "1a", border: `1px solid ${toneColor}66`, color: toneColor, borderRadius: 999, padding: "2px 9px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>{v.label}</span>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 24, lineHeight: 1.3, fontWeight: 500, color: T.text, letterSpacing: "-.01em" }}>{headlineNode}</h3>
              {supporting && <p style={{ margin: "12px 0 0", fontSize: 13.5, lineHeight: 1.65, color: T.textSecondary }}>{supporting}</p>}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.heading }}>{metric.name}</div>
              <div style={{ fontSize: 11.5, color: T.textFaint }}>{shortM(chartLabels[0])} – {shortM(chartLabels[chartLabels.length - 1])}</div>
            </div>
            <div role="button" title="Click to expand" style={{ cursor: "zoom-in" }}
              onClick={() => setExpandedChart({ title: `${sc === "All" ? "All products" : sc} · ${metric.name}`, sub: `${shortM(chartLabels[0])} – ${shortM(chartLabels[chartLabels.length - 1])}`, labels: chartLabels, seriesDefs, fmt: metric.fmt })}>
              <LineChart labels={chartLabels} seriesDefs={seriesDefs} height={270} yFmt={metric.fmt} colors={colors} T={T} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Legend items={seriesDefs.map((s) => ({ label: s.label, color: s.color, dash: !!s.dash }))} T={T} />
              <span style={{ fontSize: 11, color: T.textFaint, marginTop: 8 }}>Click the chart to expand</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: T.textFaint, paddingTop: 8, minWidth: 96 }}>Switch metric</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
            {metricDefs.map((m) => chip(m.key === metric.key, () => setHealthMetric((s) => ({ ...s, [sc]: m.key })), <>{dot(m.key === metric.key ? "#fff" : metricTone(m))}{m.name}</>, m.key))}
          </div>
        </div>

        {sc !== "All" && (
          <Disclosure key={`commentary|${sc}|${f.month}`} label="Commentary" variant="button" T={T} style={{ marginTop: 22 }}>
            {commentary}
          </Disclosure>
        )}

        <Disclosure label="Additional Monthly Context" variant="button" T={T} style={{ marginTop: 14 }}>
          <p style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.6, color: T.text, fontWeight: 600 }}>{headline}</p>
          {driverText && (
            <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.6, color: T.textSecondary }}>
              <b style={{ color: T.heading }}>Main reason · </b>{driverText}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {block("tickets", "Tickets", tickets)}
            {block("repairs", "Repairs / dispatches", repairs)}
            {block("calls", "Calls", calls)}
            {block("issues", `Top issues — ${LOOKER_SHORT}`, topIssuesText)}
          </div>
        </Disclosure>
        <AskPanel T={T} sc={sc} month={f.month} />
        <p style={{ margin: "12px 0 0", fontSize: 12, color: T.textFaint, lineHeight: 1.5 }}>
          Month-over-month against {f.prevMonth}; rate movements are per 100 subscribers. Churn is excluded from this read until the churn model refresh lands (last reported {CHURN_THRU}).
        </p>
      </div>
    );
  }

  // ------------------------------ overview: recurring issues ------------------------------
  function RecurringIssuesTable() {
    const thBase = { padding: "10px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
    const tdBase = { padding: "9px 12px", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", fontSize: 12.5 };
    const prods = (scope === "All" ? PRODUCTS : [scope]).filter((p) => LOOKER[p] && p !== "SH+");
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
              {prods.map((p) => <th key={p} style={{ ...thBase, textAlign: "right" }}>{p} · {LOOKER_SHORT}</th>)}
              <th style={{ ...thBase, textAlign: "right" }}>Total · {LOOKER_SHORT}</th>
              <th style={{ ...thBase, textAlign: "right" }}>YoY (vs {LOOKER_PRIOR_SHORT})</th>
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
  // filterable: when set, the theme/status/timeline/prime header cells carry the
  // filter dropdowns (one header row serves as both column label and filter).
  function InitiativeRows({ items, filterable = false, allItems }) {
    const tdBase = { padding: "9px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12.5, verticalAlign: "top" };
    const thBase = { padding: "8px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap", verticalAlign: "bottom" };
    const pool = allItems || items;
    const uniq = (k) => Array.from(new Set(pool.map((it) => it[k] || "—"))).sort();
    // Impact is rated in the source for HSIA only, so the column appears on HSIA-only lists
    const showImpact = pool.every((it) => it.p === "HSIA");
    const IMPACT = { H: ["High", T.bad], M: ["Medium", T.heading], L: ["Low", T.textMuted] };
    const filterTh = (k, label) => (
      <th style={thBase}>
        {filterable ? (
          <select value={initFilters[k]} onChange={(e) => setInitFilters((f) => ({ ...f, [k]: e.target.value }))}
            style={{ ...selectStyle, padding: "3px 6px", fontSize: 11.5, fontWeight: initFilters[k] === "All" ? 700 : 600, color: initFilters[k] === "All" ? T.textMuted : T.heading, textTransform: initFilters[k] === "All" ? "uppercase" : "none", letterSpacing: initFilters[k] === "All" ? ".05em" : 0, maxWidth: 180 }}
            aria-label={`Filter by ${label.toLowerCase()}`}>
            <option value="All">{label} · all</option>
            {uniq(k).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        ) : label}
      </th>
    );
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thBase}>Initiative</th>
              <th style={thBase}>Product</th>
              {filterTh("theme", "Theme")}
              {filterTh("status", "Status")}
              {filterTh("timeline", "Timeline")}
              {filterTh("prime", "Prime")}
              {showImpact && <th style={thBase}>Impact</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={showImpact ? 7 : 6} style={{ ...tdBase, color: T.textFaint }}>No initiatives match the selected filters.</td></tr>
            )}
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
                {showImpact && (
                  <td style={{ ...tdBase, whiteSpace: "nowrap" }}>
                    {IMPACT[it.impact]
                      ? <span style={{ display: "inline-block", background: T.panel, border: `1px solid ${T.border}`, color: IMPACT[it.impact][1], borderRadius: 999, padding: "1px 9px", fontSize: 11, fontWeight: 700 }}>{IMPACT[it.impact][0]}</span>
                      : <span style={{ color: T.textFaint }}>—</span>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function PillarInitiatives() {
    const prods = scope === "All" ? ["HSIA", "TV", "SHS"] : scope === "SH+" ? [] : [scope];
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
        {scope === "SH+" && (
          <p style={{ fontSize: 12.5, color: T.textFaint }}>SH+ initiatives have not been added to the source workbook yet.</p>
        )}
      </>
    );
  }

  // ------------------------------ initiative timeline ------------------------------
  // Gantt-style view of the initiatives list. Timelines in the workbook are free text:
  // "Sep 2026", "Sep – Oct 2026", "Q1 2027", "2027 capital", "Jun 2026 pilot"; anything
  // else ("—", "In planning", "Ongoing", "All") is undated and listed under the chart.
  const monAbs = (mon, yr) => yr * 12 + MON3.indexOf(mon);
  function parseTimeline(tl) {
    if (!tl) return null;
    let m;
    if ((m = tl.match(/^([A-Z][a-z]{2}) [–-] ([A-Z][a-z]{2}) (\d{4})$/)) && MON3.includes(m[1]) && MON3.includes(m[2])) return { s: monAbs(m[1], +m[3]), e: monAbs(m[2], +m[3]), kind: "range" };
    if ((m = tl.match(/^([A-Z][a-z]{2}) (\d{4})/)) && MON3.includes(m[1])) { const a = monAbs(m[1], +m[2]); return { s: a, e: a, kind: "month" }; }
    if ((m = tl.match(/^Q([1-4]) (\d{4})$/))) { const s = +m[2] * 12 + (+m[1] - 1) * 3; return { s, e: s + 2, kind: "quarter" }; }
    if ((m = tl.match(/^(\d{4})\b/))) { const s = +m[1] * 12; return { s, e: s + 11, kind: "year" }; }
    return null;
  }
  function InitiativeTimeline({ items, showProduct }) {
    const parsed = items.map((it) => ({ it, t: parseTimeline(it.timeline) }));
    const dated = parsed.filter((x) => x.t), undated = parsed.filter((x) => !x.t);
    if (!dated.length) return <p style={{ fontSize: 12.5, color: T.textFaint, margin: 0 }}>None of the listed initiatives carries a dated timeline.</p>;
    const nowAbs = parseTimeline(MONTHS[MONTHS.length - 1]).s; // latest reported month
    let start = Math.min(nowAbs - 7, ...dated.map((x) => x.t.s)), end = Math.max(nowAbs + 4, ...dated.map((x) => x.t.e));
    start = Math.max(start, 2025 * 12); end = Math.min(end, 2027 * 12 + 11);
    const n = end - start + 1, LW = 250, cell = 100 / n;
    const pctL = (a) => (Math.max(a, start) - start) * cell, pctW = (a, b) => (Math.min(b, end) - Math.max(a, start) + 1) * cell;
    const nowRight = (nowAbs - start + 1) * cell;
    const barStyle = (it, color) => it.status === "Launched" ? { background: color, border: `1px solid ${color}` }
      : it.status === "In flight" ? { background: color + "a6", border: `1px solid ${color}` }
      : (it.status === "Stalled" || it.status === "On Hold") ? { background: T.borderStrong, border: `1px solid ${T.borderStrong}` }
      : { background: color + "1f", border: `1.5px dashed ${color}` };
    const groups = PILLARS.map((pl) => ({ pl, rows: dated.filter((x) => x.it.pillar === pl.n).sort((a, b) => a.t.s - b.t.s || a.t.e - b.t.e || a.it.name.localeCompare(b.it.name)) })).filter((g) => g.rows.length);
    const months = Array.from({ length: n }, (_, k) => start + k);
    const years = []; months.forEach((a) => { const y = Math.floor(a / 12); const last = years[years.length - 1]; if (last && last.y === y) last.n += 1; else years.push({ y, n: 1 }); });
    const track = { flex: 1, position: "relative", height: "100%", backgroundImage: `linear-gradient(to right, ${T.border} 1px, transparent 1px)`, backgroundSize: `${cell}% 100%` };
    const swatch = (style) => <span style={{ display: "inline-block", width: 18, height: 10, borderRadius: 3, boxSizing: "border-box", ...style }} />;
    const legendColor = showProduct ? T.textMuted : colors[items[0].p];
    return (
      <div style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 760 }}>
          <div style={{ display: "flex" }}>
            <div style={{ width: LW, flex: "none" }} />
            <div style={{ flex: 1, display: "flex" }}>
              {years.map((y) => <div key={y.y} style={{ width: `${y.n * cell}%`, fontSize: 11, fontWeight: 700, color: T.textMuted, borderLeft: `1px solid ${T.borderStrong}`, paddingLeft: 6, boxSizing: "border-box" }}>{y.y}</div>)}
            </div>
          </div>
          <div style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ width: LW, flex: "none", fontSize: 10.5, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em", padding: "4px 0" }}>Initiative</div>
            <div style={{ flex: 1, display: "flex" }}>
              {months.map((a) => <div key={a} style={{ width: `${cell}%`, fontSize: 10, textAlign: "center", padding: "4px 0", color: a === nowAbs ? T.heading : T.textFaint, fontWeight: a === nowAbs ? 800 : 500 }}>{MON3[a % 12]}</div>)}
            </div>
          </div>
          {groups.map((g) => (
            <React.Fragment key={g.pl.n}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 0 3px", fontSize: 12, fontWeight: 800, color: T.heading }}>
                <Icon name={"pillar" + g.pl.n} size={13} /> {g.pl.n} · {g.pl.name}
                <span style={{ color: T.textFaint, fontWeight: 600, fontSize: 11 }}>{g.rows.length}</span>
              </div>
              {g.rows.map(({ it, t }) => {
                const color = colors[it.p], labelRoom = t.e < end - 1;
                return (
                  <div key={it.p + it.name} title={`${it.name}\n${it.status} · ${it.timeline} · ${it.prime}\n${it.theme}`} style={{ display: "flex", alignItems: "center", height: 24 }}>
                    <div style={{ width: LW, flex: "none", display: "flex", alignItems: "center", gap: 6, paddingRight: 10, boxSizing: "border-box", fontSize: 12, color: T.textSecondary, minWidth: 0 }}>
                      {showProduct && <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flex: "none" }} />}
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</span>
                    </div>
                    <div style={track}>
                      <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${nowRight}%`, background: T.panel, opacity: 0.55 }} />
                      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${nowRight}%`, borderLeft: `2px solid ${T.heading}`, opacity: 0.5 }} />
                      <div style={{ position: "absolute", top: 5, height: 14, left: `calc(${pctL(t.s)}% + 2px)`, width: `calc(${pctW(t.s, t.e)}% - 4px)`, borderRadius: 4, boxSizing: "border-box", ...barStyle(it, color) }} />
                      {labelRoom
                        ? <span style={{ position: "absolute", left: `calc(${pctL(t.s) + pctW(t.s, t.e)}% + 6px)`, top: 4, fontSize: 10.5, color: T.textFaint, whiteSpace: "nowrap" }}>{it.timeline}</span>
                        : <span style={{ position: "absolute", right: `calc(${100 - pctL(t.s)}% + 6px)`, top: 4, fontSize: 10.5, color: T.textFaint, whiteSpace: "nowrap" }}>{it.timeline}</span>}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginTop: 12, fontSize: 11.5, color: T.textSecondary }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{swatch({ background: legendColor, border: `1px solid ${legendColor}` })}Launched</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{swatch({ background: legendColor + "a6", border: `1px solid ${legendColor}` })}In flight</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{swatch({ background: legendColor + "1f", border: `1.5px dashed ${legendColor}` })}Ideation</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{swatch({ background: T.borderStrong, border: `1px solid ${T.borderStrong}` })}Stalled / On hold</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ display: "inline-block", width: 2, height: 12, background: T.heading, opacity: 0.6 }} />Latest reported month ({MONTHS[MONTHS.length - 1]}); shaded months are in the past</span>
            {showProduct && PRODUCTS.filter((p) => items.some((it) => it.p === p)).map((p) => (
              <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: colors[p], display: "inline-block" }} />{p}</span>
            ))}
          </div>
          {undated.length > 0 && (
            <p style={{ fontSize: 12, color: T.textFaint, margin: "10px 0 0", lineHeight: 1.6 }}>
              <b style={{ color: T.textMuted }}>Not yet dated ({undated.length}) · </b>
              {undated.map((x) => `${x.it.name} (${x.it.timeline})`).join(" · ")}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------ ticket issues (per product) ------------------------------
  function TicketIssuesSection({ product }) {
    const L = LOOKER[product];
    const thBase = { padding: "9px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
    const tdBase = { padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12.5 };
    const lbl = { color: T.textFaint, fontSize: 10, fontWeight: 700, letterSpacing: ".04em" };
    const maxA26 = Math.max(...L.topIssues.map((r) => r.a26));
    // Issue header filter: Looker Category 1 (the part before ›), kept per product in App state
    const cat1 = (issue) => issue.split(" › ")[0].trim();
    const issueCats = Array.from(new Set(L.topIssues.map((r) => cat1(r.issue)))).sort();
    const issueSel = issueFilter[product] || "All";
    // HSIA only: second filter on the customer pain point grouping
    const ppSel = issueFilter[product + "-pp"] || "All";
    const ppOptions = product === "HSIA" ? Array.from(new Set(L.topIssues.map((r) => hsiaPainPoint(r.issue)))).sort() : [];
    const shownIssues = L.topIssues.filter((r) => (issueSel === "All" || cat1(r.issue) === issueSel) && (ppSel === "All" || hsiaPainPoint(r.issue) === ppSel));
    const headerSelect = (value, key, allLabel, options, label) => (
      <select value={value} onChange={(e) => setIssueFilter((f) => ({ ...f, [key]: e.target.value }))} aria-label={label}
        style={{ ...selectStyle, padding: "3px 6px", fontSize: 11.5, fontWeight: value === "All" ? 700 : 600, color: value === "All" ? T.textMuted : T.heading, textTransform: value === "All" ? "uppercase" : "none", letterSpacing: value === "All" ? ".05em" : 0, maxWidth: 260 }}>
        <option value="All">{allLabel} · all</option>
        {options.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    );
    // Volume change with its relative %: MoM is Oct vs Sep 2026, YoY is Oct 2026 vs Oct 2025
    const momYoy = (r) => (
      <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 1, whiteSpace: "nowrap", fontSize: 12 }}>
        <span><span style={lbl}>MoM</span> <DeltaText d={delta(r.a26, r.prev ?? null, "", 0, true)} T={T} /></span>
        <span><span style={lbl}>YoY</span> {r.a25 ? <DeltaText d={delta(r.a26, r.a25, "", 0, true)} T={T} /> : <span style={{ color: T.bad, fontWeight: 600 }}>▲ {r.a26.toLocaleString()} (new in 2026)</span>}</span>
      </span>
    );
    const moverCard = (title, rows, tone) => (
      <div style={{ flex: 1, minWidth: 260, background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${tone === "up" ? T.bad : T.good}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: tone === "up" ? T.bad : T.good, marginBottom: 8 }}>{title}</div>
        {rows.map((r) => (
          <div key={r.issue} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, padding: "3px 0" }}>
            <span style={{ color: T.textSecondary }}>{r.issue}{product === "HSIA" && <span style={{ color: T.textFaint, fontSize: 11 }}> · {hsiaPainPoint(r.issue)}</span>}</span>
            <span style={{ whiteSpace: "nowrap", fontSize: 12 }}><span style={lbl}>MoM</span> <DeltaText d={delta(r.a26, r.prev ?? null, "", 0, true)} T={T} /></span>
          </div>
        ))}
      </div>
    );
    // SH+ only: symptom items per issue (monthly Assure ticket summary reports)
    const shpTop3 = (issue) => {
      const e = SHP_SYMPTOMS[issue];
      return e ? e.items.filter((i) => !/^Other/.test(i.name)).slice().sort((a, b) => b.v[2] - a.v[2]).slice(0, 3) : [];
    };
    const shpTrendColor = (t) => (t === "Rising" || t === "New" ? T.bad : t === "Declining" ? T.good : T.textMuted);
    const shpSymptomMovers = (() => {
      const rows = [];
      Object.entries(SHP_SYMPTOMS).forEach(([issue, e]) => e.items.forEach((i) => {
        if (/^Other/.test(i.name)) return;
        const d = i.v[2] - i.v[1];
        if (d !== 0) rows.push({ name: `${issue.split(" › ")[0].replace("TELUS ", "")} · ${i.name}`, delta: d, pct: i.v[1] ? +((d / i.v[1]) * 100).toFixed(1) : null });
      }));
      return {
        rising: rows.filter((r) => r.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5),
        falling: rows.filter((r) => r.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5)
      };
    })();
    const shpSymptomSection = () => (
      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 6px" }}>Symptom items by issue — {LOOKER_LATEST}</div>
        <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
          Each Assure ticket is given one primary symptom item from its agent notes, so the items under an issue add up to that issue's agent tickets. The tables show what each item covers, the Aug, Sep and Oct counts and the month-over-month move; a rising item is red.
        </p>
        <MoverCards rising={shpSymptomMovers.rising} falling={shpSymptomMovers.falling}
          risingTitle={`Rising symptom items · ${AN_MOM_FULL}`} fallingTitle={`Falling symptom items · ${AN_MOM_FULL}`} />
        {Object.entries(SHP_SYMPTOMS).map(([issue, e]) => (
          <Disclosure key={issue} variant="button" label={issue} count={`${e.tickets} agent tickets`} T={T} style={{ marginTop: 10 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thBase, textAlign: "left" }}>Symptom item</th>
                    <th style={{ ...thBase, textAlign: "left" }}>What it covers</th>
                    {AN_MONTHS.map((m) => <th key={m} style={{ ...thBase, textAlign: "right" }}>{m} '{AN_YR}</th>)}
                    <th style={{ ...thBase, textAlign: "left" }}>Trend</th>
                    <th style={{ ...thBase, textAlign: "right" }}>{AN_MOM}</th>
                    <th style={{ ...thBase, textAlign: "left" }}>Read</th>
                  </tr>
                </thead>
                <tbody>
                  {e.items.map((i) => (
                    <tr key={i.name}>
                      <td style={{ ...tdBase, fontWeight: 600, color: /^Other/.test(i.name) ? T.textFaint : T.textSecondary, whiteSpace: "nowrap" }}>{i.name}</td>
                      <td style={{ ...tdBase, color: T.textMuted, fontSize: 12, lineHeight: 1.5, minWidth: 220 }}>{i.desc}</td>
                      {i.v.map((x, k) => <td key={k} style={{ ...tdBase, textAlign: "right", fontWeight: k === 2 ? 700 : 400, color: T.text }}>{x == null ? "—" : fmtNum(x)}</td>)}
                      <td style={tdBase}><TrendBars v={i.v} color={colors["SH+"]} /></td>
                      <td style={{ ...tdBase, textAlign: "right", whiteSpace: "nowrap" }}><Move v={i.v} /></td>
                      <td style={{ ...tdBase, whiteSpace: "nowrap", fontWeight: 700, fontSize: 11.5, color: shpTrendColor(i.trend) }}>{/^Other/.test(i.name) ? "" : i.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Disclosure>
        ))}
        <Disclosure label="Sources & notes" T={T} style={{ marginTop: 14 }}>
          <p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>
            Source: Top Issue Drivers and Symptom Items tables of the monthly SH+ Assure Ticket Summary reports (October for Sep and Oct, September for Aug). These are Agent tickets only, so an issue's total here is lower than the Agent + Technician count in the table above (for example TELUS Outdoor › Self-install support is 203 agent tickets against 212 in total). Symptom items come from keyword rules on the agent notes and resolution text, one primary item per ticket; "Other / no clear symptom" holds notes too brief to classify. Read: Rising / Declining is a change of at least 3 tickets and 20% against the prior month, New means none the month before, and items with fewer than 3 tickets in both months fold into Other. A dash means the item was not listed that month. Only the nine largest issues of the report month carry symptom items.
          </p>
        </Disclosure>
      </div>
    );
    return (
      <>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>
          {moverCard(`Top rising issues · ${LOOKER_MOM}`, L.rising, "up")}
          {moverCard(`Top falling issues · ${LOOKER_MOM}`, L.falling, "down")}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Top issues by ticket volume — {LOOKER_LATEST}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thBase, textAlign: "left" }}>#</th>
                <th style={{ ...thBase, textAlign: "left" }}>{headerSelect(issueSel, product, "Issue (Category › Sub-category)", issueCats, "Filter issues by category")}</th>
                {product === "HSIA" && <th style={{ ...thBase, textAlign: "left" }}>{headerSelect(ppSel, product + "-pp", "Customer pain point", ppOptions, "Filter issues by customer pain point")}</th>}
                <th style={{ ...thBase, textAlign: "right" }}>{LOOKER_SHORT}</th>
                <th style={{ ...thBase, textAlign: "left", width: 110 }}></th>
                <th style={{ ...thBase, textAlign: "right" }}>MoM / YoY</th>
                {product === "SH+" && <th style={{ ...thBase, textAlign: "left" }}>Top 3 symptom items · {LOOKER_SHORT} (MoM)</th>}
                {product !== "SH+" && <th style={{ ...thBase, textAlign: "left" }}>Initiative theme</th>}
                {product !== "SH+" && <th style={{ ...thBase, textAlign: "left" }}>Initiative coverage</th>}
              </tr>
            </thead>
            <tbody>
              {shownIssues.length === 0 && (
                <tr><td colSpan={product === "HSIA" ? 8 : product === "SH+" ? 6 : 7} style={{ ...tdBase, color: T.textFaint }}>No issues match the selected filters.</td></tr>
              )}
              {shownIssues.map((r, i) => {
                const themes = issueThemes(product, r.issue);
                const cov = initiativesByTheme(product, themes, r.issue);
                return (
                  <tr key={r.issue}>
                    <td style={{ ...tdBase, color: T.textFaint, fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ ...tdBase, fontWeight: 600, color: T.textSecondary, whiteSpace: "nowrap" }}>{r.issue}</td>
                    {product === "HSIA" && (() => { const pp = hsiaPainPoint(r.issue); return (
                      <td style={{ ...tdBase, fontSize: 12, whiteSpace: "nowrap" }}>
                        <span title={(HSIA_PAIN_POINTS.find((x) => x.name === pp) || {}).types} style={{ display: "inline-block", background: pp === "Not grouped" ? "transparent" : colors.HSIA + "1a", border: `1px solid ${pp === "Not grouped" ? T.border : colors.HSIA + "55"}`, color: pp === "Not grouped" ? T.textFaint : T.heading, borderRadius: 999, padding: "0 8px", fontWeight: 600, fontSize: 11.5 }}>{pp}</span>
                      </td>); })()}
                    <td style={{ ...tdBase, textAlign: "right", fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>{r.a26.toLocaleString()}</td>
                    <td style={{ ...tdBase, padding: "8px 6px" }}>
                      <div style={{ width: `${(r.a26 / maxA26) * 100}%`, minWidth: 2, height: 9, background: colors[product], borderRadius: 3, opacity: 0.7 }} />
                    </td>
                    <td style={{ ...tdBase, textAlign: "right", whiteSpace: "nowrap" }}>{momYoy(r)}</td>
                    {product === "SH+" && (
                      <td style={{ ...tdBase, whiteSpace: "normal", minWidth: 250, fontSize: 12, lineHeight: 1.6 }}>
                        {shpTop3(r.issue).length ? shpTop3(r.issue).map((s) => (
                          <div key={s.name} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <span style={{ color: T.textSecondary }}>{s.name}</span>
                            <span style={{ whiteSpace: "nowrap" }}><b style={{ color: T.text }}>{s.v[2]}</b> <DeltaText d={delta(s.v[2], s.v[1] ?? null, "", 0, true)} T={T} /></span>
                          </div>
                        )) : <span style={{ color: T.textFaint }}>No symptom breakdown</span>}
                      </td>
                    )}
                    {product !== "SH+" && <td style={{ ...tdBase, whiteSpace: "normal", maxWidth: 250, fontSize: 12, lineHeight: 1.7 }}>
                      {themes.length
                        ? themes.map((t) => <span key={t} style={{ display: "inline-block", background: T.panel, border: `1px solid ${T.border}`, color: T.textSecondary, borderRadius: 999, padding: "0 8px", marginRight: 4, fontWeight: 600, whiteSpace: "nowrap", fontSize: 11.5 }}>{t}</span>)
                        : <span style={{ color: T.textFaint }}>{r.grp === "SHS Hardware" ? "SHS hardware" : ISSUE_META[r.grp].label.split(",")[0]}</span>}
                    </td>}
                    {product !== "SH+" && <td style={{ ...tdBase, whiteSpace: "normal", minWidth: 190, fontSize: 12 }}>
                      {cov.length ? (
                        <span title={cov.map((c) => c.name).join("\n")} style={{ color: T.textSecondary, cursor: "help", borderBottom: `1px dotted ${T.textFaint}` }}>
                          <b style={{ color: T.heading }}>{cov.length}</b> — {cov.slice(0, 2).map((c) => c.name).join("; ")}{cov.length > 2 ? ` +${cov.length - 2} more` : ""}
                        </span>
                      ) : (
                        <span style={{ color: T.textFaint }}>— no mapped initiative</span>
                      )}
                    </td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {product === "SH+" && shpSymptomSection()}
        {product === "HSIA" && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, marginBottom: 6 }}>Customer pain points · how Looker ticket types are grouped (hsia_ticket_recategorization tab)</div>
            {HSIA_PAIN_POINTS.map((pp) => (
              <div key={pp.name} style={{ display: "flex", gap: 10, fontSize: 12, padding: "2px 0", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: T.textSecondary, minWidth: 250 }}>{pp.name}</span>
                <span style={{ color: T.textMuted }}>{pp.types}</span>
              </div>
            ))}
          </div>
        )}
        <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>
          Looker ticket categories from the Churn Measurement 2026 workbook{" · each issue is mapped to the theme(s) used by the product's initiatives; initiative coverage counts the initiatives carrying those themes"}{product === "SHS" ? " (SHS themes are the pillar sub-themes from the workbook)" : ""}. MoM compares {LATEST} against the prior month; YoY compares {LATEST} against {LATEST_PRIOR}. Rising and falling issues are the largest month-over-month volume movers among issues with 100+ tickets.
        </p></Disclosure>
      </>
    );
  }

  // ------------------------------ TV platform breakout ------------------------------
  // ------------------------------ HSIA › HSIA West ------------------------------
  // Same card row and sections as HSIA › PFE. Repairs and churn are reported for HSIA West and
  // TQ ILEC together on the KPI tab, so the churn card shows "n/a" until the source splits it. Repairs come from the Looker Repairs tab (HS West copper + fibre).
  function HsiaWestPage() {
    const LAST = MONTHS.length - 1, col = colors.HSIA;
    const one = (label, data) => [{ key: "HSIA", label, data }];
    const d = (x, suffix) => (x ? <DeltaText key={suffix} d={x} T={T} suffix={suffix} /> : null);
    const card = (icon, label, data, fmt, dec, goodDown, mode) => {
      const f = rowFigures(data, dec, goodDown, mode, LAST);
      return <StatCard key={label} T={T} color={col} icon={icon} label={label} value={fmt(f.latest)} sub={f.latestMonth} deltas={[d(f.mom, "MoM"), d(f.yoy, "YoY")].filter(Boolean)} />;
    };
    const na = (icon, label) => <StatCard key={label} T={T} color={col} icon={icon} label={label} value="n/a" sub="not split from TQ ILEC in the source" deltas={[]} />;
    let secNo = 0;
    const sec = (title, icon, children) => {
      secNo += 1;
      return (
        <Section key={`hw-${title}`} num={String(secNo).padStart(2, "0")} eyebrow="HSIA · HSIA West" title={title} icon={icon} T={T} collapsible defaultOpen={secNo <= 1}>
          {children}
        </Section>
      );
    };
    const rate2 = (v) => fmtRate(v, 2);
    const simple = (id, title, label, data, yFmt, note, tableFmt) => (
      <ChartCard title={title} T={T} tableOpen={!!openTables[id]} onToggleTable={() => toggleTable(id)} note={note}>
        <LineChart labels={MONTHS} seriesDefs={one(label, data)} yFmt={yFmt} colors={colors} T={T} />
        {openTables[id] && <DataTable labels={MONTHS} seriesDefs={one(label, data)} fmt={tableFmt || yFmt} T={T} />}
      </ChartCard>
    );
    return (
      <>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
            <span style={{ color: col, display: "inline-flex" }}><Icon name="hsia" size={15} /></span>
            <span style={{ fontWeight: 800, color: T.heading, fontSize: 14 }}>HSIA West</span>
            <span style={{ fontSize: 11.5, color: T.textFaint }}>· the HSIA West board on its own, without TQ ILEC and PFE</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
            {card("calls", "Calls offered rate per 100 subs", HSIA_WEST_CALLS_RATE, fmtRate, 2, true, "rate")}
            {card("calls", "Calls offered (HSIA West)", HSIA_WEST.callsOffered, fmtBig, 0, true, false)}
            {card("tickets", "Ticket volume", HSIA_WEST.ticketVolume, fmtBig, 0, true, false)}
            {card("tickets", "Ticket rate per 100 subs", HSIA_WEST.ticketRate, fmtRate, 2, true, "rate")}
            {card("repairs", "Repair volume", HSIA_WEST.repairVolume, fmtBig, 0, true, false)}
            {card("repairs", "Repair rate per 100 subs", HSIA_WEST.repairRate, fmtRate, 2, true, "rate")}
            {na("churn", "Churn rate per 100 subs")}
            {card("base", "Subscriber base", HSIA_WEST.subBase, fmtBig, 0, false, false)}
          </div>
        </div>
        <p style={{ fontSize: 12, color: T.textFaint, margin: "0 2px 0", lineHeight: 1.6 }}>
          HSIA West alone. Calls: TS Calls Offered by Product workbook, Actuals - Calls Offered tab (HSIA West field); subscribers from that workbook's Subscribers block. Tickets: Churn Measurement 2026 workbook, HSIA Recategorization Looker tab, the HSIA West block (Look 2186) Grand Total, which comes from the same Looker source as the HSIA scorecard tickets; the rate is those tickets over the HSIA West base, per 100 subscribers. The HSIA scorecard base is HSIA West plus TQ ILEC. Repairs: Churn Measurement 2026 workbook, Looker Repairs (Kam/Jason's new view) tab, repair jobs by WOID complete month for HS WEST COPPER plus HS WEST FIBRE (Look 2190); the repair rate is those repairs over the HSIA West base, per 100 subscribers. Churn is reported for HSIA West and TQ ILEC together on the KPI tab, so it is not shown here.
        </p>

        {sec("Calls offered", "calls",
          <>
            {simple("hw-callsrate", "Calls offered rate per 100 subs (HSIA West)", "Calls offered per 100 subs", HSIA_WEST_CALLS_RATE, rate2, "Calls offered over the HSIA West subscriber base, per 100 subscribers.")}
            simple("hw-calls", "Calls offered (HSIA West)", "Calls offered", HSIA_WEST.callsOffered, fmtNumK, "Contacts offered for the HSIA West field of the TS Calls Offered by Product workbook.", fmtNum)
          </>
        )}

        {sec("Tickets", "tickets",
          <ChartCard title="Tickets — volume (bars) and rate (line, per 100 subs)" T={T} tableOpen={!!openTables["hw-tr"]} onToggleTable={() => toggleTable("hw-tr")}
            note="HSIA West ticket totals from the HSIA Recategorization Looker tab (HSIA West block, Look 2186) over the HSIA West base. Volume on the left axis, rate on the right.">
            <ComboChart labels={MONTHS} T={T}
              bar={{ label: "Ticket volume", data: HSIA_WEST.ticketVolume, color: col, fmt: fmtBig }}
              line={{ label: "Ticket rate", data: HSIA_WEST.ticketRate, color: col, fmt: rate2 }} />
            <Legend items={[{ label: "Ticket volume (bars, left axis)", color: col, bar: true }, { label: "Ticket rate (line, right axis)", color: col }]} T={T} />
            {openTables["hw-tr"] && <DataTable labels={MONTHS} seriesDefs={[
              { key: "HSIA", label: "Ticket volume", data: HSIA_WEST.ticketVolume, fmt: fmtNum },
              { key: "HSIA", label: "Ticket rate", data: HSIA_WEST.ticketRate, fmt: rate2 }
            ]} fmt={fmtNum} T={T} />}
          </ChartCard>
        )}

        {sec("Repairs / Dispatches", "repairs",
          <ChartCard title="Repairs / dispatches — volume (bars) and rate (line, per 100 subs)" T={T} tableOpen={!!openTables["hw-rr"]} onToggleTable={() => toggleTable("hw-rr")}
            note="HSIA West repairs (HS West copper + HS West fibre) from the Looker Repairs tab, by WOID complete month, over the HSIA West base. Volume on the left axis, rate on the right.">
            <ComboChart labels={MONTHS} T={T}
              bar={{ label: "Repair volume", data: HSIA_WEST.repairVolume, color: col, fmt: fmtBig }}
              line={{ label: "Repair rate", data: HSIA_WEST.repairRate, color: col, fmt: rate2 }} />
            <Legend items={[{ label: "Repair volume (bars, left axis)", color: col, bar: true }, { label: "Repair rate (line, right axis)", color: col }]} T={T} />
            {openTables["hw-rr"] && <DataTable labels={MONTHS} seriesDefs={[
              { key: "HSIA", label: "Repair volume", data: HSIA_WEST.repairVolume, fmt: fmtNum },
              { key: "HSIA", label: "Repair rate", data: HSIA_WEST.repairRate, fmt: rate2 }
            ]} fmt={fmtNum} T={T} />}
          </ChartCard>
        )}

        {sec("Subscriber base", "base",
          simple("hw-bs", "Subscriber base", "Subscriber base", HSIA_WEST.subBase, fmtBig, "Month-end HSIA West subscribers (TS Calls Offered by Product workbook, Subscribers block).", fmtNum)
        )}
      </>
    );
  }

  // ------------------------------ HSIA › TQ ILEC ------------------------------
  // Same card row and sections as HSIA › HSIA West. Churn is reported for HSIA West and TQ ILEC
  // together on the KPI tab, so the churn card shows "n/a" until the source splits it. Repairs come
  // from the Redwood Scorecard (2026 only).
  function HsiaTqPage() {
    const LAST = MONTHS.length - 1, col = colors.TQ;
    const one = (label, data) => [{ key: "TQ", label, data }];
    const d = (x, suffix) => (x ? <DeltaText key={suffix} d={x} T={T} suffix={suffix} /> : null);
    const card = (icon, label, data, fmt, dec, goodDown, mode) => {
      const f = rowFigures(data, dec, goodDown, mode, LAST);
      return <StatCard key={label} T={T} color={col} icon={icon} label={label} value={fmt(f.latest)} sub={f.latestMonth} deltas={[d(f.mom, "MoM"), d(f.yoy, "YoY")].filter(Boolean)} />;
    };
    const na = (icon, label) => <StatCard key={label} T={T} color={col} icon={icon} label={label} value="n/a" sub="not split from TQ ILEC in the source" deltas={[]} />;
    let secNo = 0;
    const sec = (title, icon, children) => {
      secNo += 1;
      return (
        <Section key={`tq-${title}`} num={String(secNo).padStart(2, "0")} eyebrow="HSIA · TQ ILEC" title={title} icon={icon} T={T} collapsible defaultOpen={secNo <= 1}>
          {children}
        </Section>
      );
    };
    const rate2 = (v) => fmtRate(v, 2);
    const simple = (id, title, label, data, yFmt, note, tableFmt) => (
      <ChartCard title={title} T={T} tableOpen={!!openTables[id]} onToggleTable={() => toggleTable(id)} note={note}>
        <LineChart labels={MONTHS} seriesDefs={one(label, data)} yFmt={yFmt} colors={colors} T={T} />
        {openTables[id] && <DataTable labels={MONTHS} seriesDefs={one(label, data)} fmt={tableFmt || yFmt} T={T} />}
      </ChartCard>
    );
    return (
      <>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
            <span style={{ color: col, display: "inline-flex" }}><Icon name="hsia" size={15} /></span>
            <span style={{ fontWeight: 800, color: T.heading, fontSize: 14 }}>TQ ILEC</span>
            <span style={{ fontSize: 11.5, color: T.textFaint }}>· TQ ILEC high speed on its own, without HSIA West and PFE</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
            {card("calls", "Calls offered rate per 100 subs", TQ_CALLS_RATE, fmtRate, 2, true, "rate")}
            {card("calls", "Calls offered (TQ ILEC)", TQ_ILEC.callsOffered, fmtBig, 0, true, false)}
            {card("tickets", "Ticket volume", TQ_ILEC.ticketVolume, fmtBig, 0, true, false)}
            {card("tickets", "Ticket rate per 100 subs", TQ_ILEC.ticketRate, fmtRate, 2, true, "rate")}
            {card("repairs", "Repair volume", TQ_ILEC.repairVolume, fmtBig, 0, true, false)}
            {card("repairs", "Repair rate per 100 subs", TQ_ILEC.repairRate, fmtRate, 2, true, "rate")}
            {na("churn", "Churn rate per 100 subs")}
            {card("base", "Subscriber base", TQ_ILEC.subBase, fmtBig, 0, false, false)}
          </div>
        </div>
        <p style={{ fontSize: 12, color: T.textFaint, margin: "0 2px 0", lineHeight: 1.6 }}>
          TQ ILEC high speed on its own. Calls: TS Calls Offered by Product workbook, Actuals - Calls Offered tab (TQ ILEC - HSIA field); subscribers from that workbook's Subscribers block. Tickets: Churn Measurement 2026 workbook, HSIA Recategorization Looker tab, the HSIA TQ ILEC block Totals row (all TQ ILEC regions, from the same Looker source as the HSIA scorecard tickets); the rate is those tickets over the TQ ILEC HSIA base, per 100 subscribers. Repairs: Churn Measurement 2026 workbook, Looker Repairs (Kam/Jason's new view) tab, HS QC ILEC row, by WOID complete month (Look 2190). The HSIA scorecard base is HSIA West plus TQ ILEC. Churn is reported for HSIA West and TQ ILEC together on the KPI tab, so it is not shown here.
        </p>

        {sec("Calls offered", "calls",
          <>
            {simple("tq-callsrate", "Calls offered rate per 100 subs (TQ ILEC)", "Calls offered per 100 subs", TQ_CALLS_RATE, rate2, "Calls offered over the TQ ILEC subscriber base, per 100 subscribers.")}
            simple("tq-calls", "Calls offered (TQ ILEC)", "Calls offered", TQ_ILEC.callsOffered, fmtBig, "Contacts offered for the TQ ILEC - HSIA field of the TS Calls Offered by Product workbook.", fmtBig)
          </>
        )}

        {sec("Tickets", "tickets",
          <ChartCard title="Tickets — volume (bars) and rate (line, per 100 subs)" T={T} tableOpen={!!openTables["tq-tr"]} onToggleTable={() => toggleTable("tq-tr")}
            note="TQ ILEC ticket totals from the HSIA Recategorization Looker tab (HSIA TQ ILEC block) over the TQ ILEC HSIA base. Volume on the left axis, rate on the right.">
            <ComboChart labels={MONTHS} T={T}
              bar={{ label: "Ticket volume", data: TQ_ILEC.ticketVolume, color: col, fmt: fmtBig }}
              line={{ label: "Ticket rate", data: TQ_ILEC.ticketRate, color: col, fmt: rate2 }} />
            <Legend items={[{ label: "Ticket volume (bars, left axis)", color: col, bar: true }, { label: "Ticket rate (line, right axis)", color: col }]} T={T} />
            {openTables["tq-tr"] && <DataTable labels={MONTHS} seriesDefs={[
              { key: "TQ", label: "Ticket volume", data: TQ_ILEC.ticketVolume, fmt: fmtBig },
              { key: "TQ", label: "Ticket rate", data: TQ_ILEC.ticketRate, fmt: rate2 }
            ]} fmt={fmtBig} T={T} />}
          </ChartCard>
        )}

        {sec("Repairs / Dispatches", "repairs",
          <ChartCard title="Repairs / dispatches — volume (bars) and rate (line, per 100 subs)" T={T} tableOpen={!!openTables["tq-rr"]} onToggleTable={() => toggleTable("tq-rr")}
            note="TQ ILEC repairs (HS QC ILEC) from the Looker Repairs tab, by WOID complete month, over the TQ ILEC HSIA base. Volume on the left axis, rate on the right.">
            <ComboChart labels={MONTHS} T={T}
              bar={{ label: "Repair volume", data: TQ_ILEC.repairVolume, color: col, fmt: fmtBig }}
              line={{ label: "Repair rate", data: TQ_ILEC.repairRate, color: col, fmt: rate2 }} />
            <Legend items={[{ label: "Repair volume (bars, left axis)", color: col, bar: true }, { label: "Repair rate (line, right axis)", color: col }]} T={T} />
            {openTables["tq-rr"] && <DataTable labels={MONTHS} seriesDefs={[
              { key: "TQ", label: "Repair volume", data: TQ_ILEC.repairVolume, fmt: fmtBig },
              { key: "TQ", label: "Repair rate", data: TQ_ILEC.repairRate, fmt: rate2 }
            ]} fmt={fmtBig} T={T} />}
          </ChartCard>
        )}

        {sec("Subscriber base", "base",
          simple("tq-bs", "Subscriber base", "Subscriber base", TQ_ILEC.subBase, fmtBig, "Month-end TQ ILEC HSIA subscribers (TS Calls Offered by Product workbook, Subscribers block).", fmtBig)
        )}
      </>
    );
  }

  // ------------------------------ HSIA › PFE (PureFibre East) ------------------------------
  // Same card row and sections as the product pages: calls, tickets, repairs, churn and base for
  // the PFE customers inside HSIA. No date filter: the full series and the latest month.
  function HsiaPfePage() {
    const LAST = MONTHS.length - 1, col = colors.PFE;
    const one = (label, data) => [{ key: "PFE", label, data }];
    const d = (x, suffix) => (x ? <DeltaText key={suffix} d={x} T={T} suffix={suffix} /> : null);
    const card = (icon, label, data, fmt, dec, goodDown, mode) => {
      const f = rowFigures(data, dec, goodDown, mode, LAST);
      return <StatCard key={label} T={T} color={col} icon={icon} label={label} value={fmt(f.latest)} sub={f.latestMonth} deltas={[d(f.mom, "MoM"), d(f.yoy, "YoY")].filter(Boolean)} />;
    };
    let secNo = 0;
    const sec = (title, icon, children) => {
      secNo += 1;
      return (
        <Section key={`pfe-${title}`} num={String(secNo).padStart(2, "0")} eyebrow="HSIA · PFE" title={title} icon={icon} T={T} collapsible defaultOpen={secNo <= 1}>
          {children}
        </Section>
      );
    };
    const rate2 = (v) => fmtRate(v, 2);
    const simple = (id, title, label, data, yFmt, note, tableFmt) => (
      <ChartCard title={title} T={T} tableOpen={!!openTables[id]} onToggleTable={() => toggleTable(id)} note={note}>
        <LineChart labels={MONTHS} seriesDefs={one(label, data)} yFmt={yFmt} colors={colors} T={T} />
        {openTables[id] && <DataTable labels={MONTHS} seriesDefs={one(label, data)} fmt={tableFmt || yFmt} T={T} />}
      </ChartCard>
    );
    const combo = (id, title, volLabel, vol, rateLabel, rate, note) => (
      <ChartCard title={title} T={T} tableOpen={!!openTables[id]} onToggleTable={() => toggleTable(id)} note={note}>
        <ComboChart labels={MONTHS} T={T}
          bar={{ label: volLabel, data: vol, color: col, fmt: fmtBig }}
          line={{ label: rateLabel, data: rate, color: col, fmt: rate2 }} />
        <Legend items={[{ label: `${volLabel} (bars, left axis)`, color: col, bar: true }, { label: `${rateLabel} (line, right axis)`, color: col }]} T={T} />
        {openTables[id] && <DataTable labels={MONTHS} seriesDefs={[
          { key: "PFE", label: volLabel, data: vol, fmt: fmtBig },
          { key: "PFE", label: rateLabel, data: rate, fmt: rate2 }
        ]} fmt={fmtBig} T={T} />}
      </ChartCard>
    );
    return (
      <>
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
            <span style={{ color: col, display: "inline-flex" }}><Icon name="hsia" size={15} /></span>
            <span style={{ fontWeight: 800, color: T.heading, fontSize: 14 }}>PFE (PureFibre East)</span>
            <span style={{ fontSize: 11.5, color: T.textFaint }}>· HSIA customers on the PureFibre East network</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
            {card("calls", "Calls offered rate per 100 subs", PFE_CALLS_RATE, fmtRate, 2, true, "rate")}
            {card("calls", "Calls offered (PFE)", PFE.callsOffered, fmtBig, 0, true, false)}
            {card("tickets", "Ticket volume", PFE.ticketVolume, fmtBig, 0, true, false)}
            {card("tickets", "Ticket rate per 100 subs", PFE.ticketRate, fmtRate, 2, true, "rate")}
            {card("repairs", "Repair volume", PFE.repairVolume, fmtBig, 0, true, false)}
            {card("repairs", "Repair rate per 100 subs", PFE.repairRate, fmtRate, 2, true, "rate")}
            {card("churn", "Churn rate per 100 subs", PFE.churnRate, fmtRate, 2, true, "rate")}
            {card("base", "Subscriber base", PFE.subBase, fmtBig, 0, false, false)}
          </div>
        </div>
        <p style={{ fontSize: 12, color: T.textFaint, margin: "0 2px 0", lineHeight: 1.6 }}>
          PFE is the PureFibre East (Vulcan) customer group reported separately from HSIA West and TQ ILEC. Calls: TS Calls Offered by Product workbook, Actuals - Calls Offered tab, PFE - HSIA field. Tickets: Churn Measurement 2026 workbook, HSIA Recategorization Looker tab, the HSIA PFE block (Look 2188) Grand Total. Repairs: Churn Measurement 2026 workbook, Looker Repairs (Kam/Jason's new view) tab, HS PFE row, by WOID complete month. Subscribers and churn: Reliability/Deact KPIs tab, PFE columns. Ticket and repair rates are volume over the PFE subscriber base, per 100 subscribers. PFE churn (go/national) is reported from Oct 2025.
        </p>

        {sec("Calls offered", "calls",
          <>
            {simple("pfe-callsrate", "Calls offered rate per 100 subs (PFE)", "Calls offered per 100 subs", PFE_CALLS_RATE, rate2, "Calls offered over the PFE subscriber base, per 100 subscribers.")}
            simple("pfe-calls", "Calls offered (PFE - HSIA)", "Calls offered", PFE.callsOffered, fmtBig, "Contacts offered for the PFE - HSIA field of the TS Calls Offered by Product workbook.", fmtBig)
          </>
        )}

        {sec("Tickets", "tickets",
          combo("pfe-tr", "Tickets — volume (bars) and rate (line, per 100 subs)", "Ticket volume", PFE.ticketVolume, "Ticket rate", PFE.ticketRate, "PFE ticket totals from the HSIA Recategorization Looker tab (HSIA PFE block, Look 2188) over the PFE subscriber base. Volume on the left axis, rate on the right.")
        )}

        {sec("Repairs / Dispatches", "repairs",
          combo("pfe-rr", "Repairs / dispatches — volume (bars) and rate (line, per 100 subs)", "Repair volume", PFE.repairVolume, "Repair rate", PFE.repairRate, "PFE repairs (HS PFE, Looker Repairs tab, by WOID complete month) over the PFE subscriber base. Volume on the left axis, rate on the right.")
        )}

        {sec("Churn", "churn",
          simple("pfe-ch", "Churn rate per 100 subs (go/national RGU)", "Churn rate", PFE.churnRate, rate2, "PFE churn is first reported for Oct 2025.")
        )}

        {sec("Subscriber base", "base",
          simple("pfe-bs", "Subscriber base", "Subscriber base", PFE.subBase, fmtBig, "Month-end PFE subscribers (Reliability/Deact KPIs tab).", fmtBig)
        )}
      </>
    );
  }

  function TvPlatformsPage() {
    // Follows the From / To date filter: cards show the last month of the window, charts the window
    const LAST = toIdx;
    const platKey = (p) => (p.id === "legacy" ? "LEGACY" : "OPUS");
    const platSeries = (field) => TV_PLATFORMS.map((p) => ({ key: platKey(p), label: p.name, data: sliceR(p[field] || []) }));
    const platLegend = <Legend items={TV_PLATFORMS.map((p) => ({ label: p.name, color: colors[platKey(p)] }))} T={T} />;
    const platChart = (id, title, field, fmt, note, tableFmt) => (
      <ChartCard key={id} title={title} T={T} tableOpen={!!openTables[id]} onToggleTable={() => toggleTable(id)} note={note}>
        <LineChart labels={rangeMonths} seriesDefs={platSeries(field)} yFmt={fmt} colors={colors} T={T} />
        {platLegend}
        {openTables[id] && <DataTable labels={rangeMonths} seriesDefs={platSeries(field)} fmt={tableFmt || fmt} T={T} />}
      </ChartCard>
    );
    let secNo = 0;
    const sec = (title, icon, children) => {
      secNo += 1;
      return (
        <Section key={`tvp-${title}`} num={String(secNo).padStart(2, "0")} eyebrow="TV · By Platform" title={title} icon={icon} T={T} collapsible defaultOpen={secNo <= 1}>
          {children}
        </Section>
      );
    };
    const d = (x, suffix) => (x ? <DeltaText key={suffix} d={x} T={T} suffix={suffix} /> : null);
    return (
      <>
        {TV_PLATFORMS.map((p) => {
          const col = colors[platKey(p)];
          const bs = rowFigures(p.base, 0, false, false, LAST);
          const cr = rowFigures(p.callsRate, 2, true, "rate", LAST), co = rowFigures(p.callsOffered, 0, true, false, LAST);
          const tk = rowFigures(p.tickets, 0, true, false, LAST);
          const tr = rowFigures(p.ticketRate, 2, true, "rate", LAST);
          const rp = rowFigures(p.repairs, 0, true, false, LAST);
          const rr = rowFigures(p.repairRate, 2, true, "rate", LAST);
          const sw = rowFigures(p.swaps2026 || [], 0, true, false, LAST);
          const swapTotal = p.swaps2026 == null ? null : p.swaps2026.filter((v) => v != null).reduce((a, b) => a + b, 0);
          return (
            <div key={p.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
                <span style={{ color: col, display: "inline-flex" }}><Icon name="tv" size={15} /></span>
                <span style={{ fontWeight: 800, color: T.heading, fontSize: 14 }}>{p.name}</span>
                <span style={{ fontSize: 11.5, color: T.textFaint }}>· {p.sub}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
                <StatCard T={T} color={col} icon="base" label="Subscriber base" value={fmtBig(bs.latest)} sub={bs.latestMonth} deltas={[d(bs.mom, "MoM"), d(bs.yoy, "YoY")].filter(Boolean)} />
                <StatCard T={T} color={col} icon="calls" label="Calls offered rate per 100 subs" value={fmtRate(cr.latest, 2)} sub={cr.latestMonth} deltas={[d(cr.mom, "MoM"), d(cr.yoy, "YoY")].filter(Boolean)} />
                <StatCard T={T} color={col} icon="calls" label="Calls offered" value={fmtBig(co.latest)} sub={co.latestMonth} deltas={[d(co.mom, "MoM"), d(co.yoy, "YoY")].filter(Boolean)} />
                <StatCard T={T} color={col} icon="tickets" label="Ticket volume" value={fmtBig(tk.latest)} sub={tk.latestMonth} deltas={[d(tk.mom, "MoM"), d(tk.yoy, "YoY")].filter(Boolean)} />
                <StatCard T={T} color={col} icon="tickets" label="Ticket rate per 100 subs" value={fmtRate(tr.latest, 2)} sub={tr.latestMonth} deltas={[d(tr.mom, "MoM"), d(tr.yoy, "YoY")].filter(Boolean)} />
                <StatCard T={T} color={col} icon="repairs" label="Repair volume" value={fmtBig(rp.latest)} sub={rp.latestMonth} deltas={[d(rp.mom, "MoM"), d(rp.yoy, "YoY")].filter(Boolean)} />
                <StatCard T={T} color={col} icon="repairs" label="Repair rate per 100 subs" value={fmtRate(rr.latest, 2)} sub={rr.latestMonth} deltas={[d(rr.mom, "MoM"), d(rr.yoy, "YoY")].filter(Boolean)} />
                <StatCard T={T} color={col} icon="repairs" label="Repair swaps · 2026 total" value={swapTotal == null ? "pending" : fmtBig(swapTotal)} sub={sw.latestMonth ? `latest ${sw.latestMonth}: ${fmtNum(sw.latest)}` : undefined} deltas={[d(sw.mom, "MoM")].filter(Boolean)} />
              </div>
            </div>
          );
        })}
        {(() => {
          const mx = rowFigures(TV_MIXED.base, 0, false, false, LAST);
          return (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
                <span style={{ color: colors.MIXED, display: "inline-flex" }}><Icon name="tv" size={15} /></span>
                <span style={{ fontWeight: 800, color: T.heading, fontSize: 14 }}>{TV_MIXED.name}</span>
                <span style={{ fontSize: 11.5, color: T.textFaint }}>· {TV_MIXED.sub} · subscriber count only</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, maxWidth: 420 }}>
                <StatCard T={T} color={colors.MIXED} icon="base" label="Subscriber base" value={fmtBig(mx.latest)} sub={mx.latestMonth} deltas={[d(mx.mom, "MoM"), d(mx.yoy, "YoY")].filter(Boolean)} />
              </div>
            </div>
          );
        })()}
        {(() => {
          const pk = rowFigures(TV_PIK.tickets, 0, true, false, LAST);
          return (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 2px 8px" }}>
                <span style={{ color: T.textMuted, display: "inline-flex" }}><Icon name="tv" size={15} /></span>
                <span style={{ fontWeight: 800, color: T.heading, fontSize: 14 }}>{TV_PIK.name}</span>
                <span style={{ fontSize: 11.5, color: T.textFaint }}>· minor product line · ticket volume only</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, maxWidth: 420 }}>
                <StatCard T={T} color={T.textMuted} icon="tickets" label="Ticket volume" value={fmtBig(pk.latest)} sub={pk.latestMonth} deltas={[d(pk.mom, "MoM"), d(pk.yoy, "YoY")].filter(Boolean)} />
              </div>
            </div>
          );
        })()}
        <p style={{ fontSize: 12, color: T.textFaint, margin: "0 2px 0", lineHeight: 1.6 }}>
          Tickets: Looker Ticket Categories split by product (Optik TV (Legacy), TV Evolution and Pik TV). The TV ticket volume and rate include Pik TV, a minor product line shown here for volume only; its subscribers are not in the rate base and it is left out of the analysis sections. Subscriber base: TV Customer Base Breakdown workbook, Customer Base - Provisioned tab (month-end provisioned subscribers, all regions except BTV and SPLUS) — Legacy = MediaRoom only, TV Evolution = TTV+ only, Mixed usage = customers on both platforms; the three sum to the TV subscriber base on the TV page. Repairs: 2026 Redwood Scorecard, Repair Tracking Detail — Legacy = IPTV West + TQ ILEC TV; TV Evolution = OPUS + PFE Vulcan - TV; the repair split is 2026 from the 2026 Redwood Scorecard and 2025 from the 2025 Redwood Scorecard, Weekly Repair Projections tab, month-end columns (Mediaroom = IPTV + QC ILEC IPTV, OPUS = OPUS), so platform repair rates can differ from the rolled-up TV repair rate. Swap volumes are repair swap orders from the Tableau Swapped Orders Combined View dashboard, all technologies (Total TV = Legacy; Total OPUS = TV Evolution), Jan – Aug 2026; the September swap pull was not yet available when this update was made.
        </p>

        {sec("Subscriber base", "base",
          <ChartCard title="Subscriber base by platform" T={T} tableOpen={!!openTables["tvp-bs"]} onToggleTable={() => toggleTable("tvp-bs")}
            note="Month-end provisioned subscribers (Customer Base - Provisioned). The migration from Mediaroom to TTV+ is visible in the diverging trends; mixed-usage customers are counted separately from either platform.">
            <LineChart labels={rangeMonths} seriesDefs={[...platSeries("base"), { key: "MIXED", label: TV_MIXED.name, data: sliceR(TV_MIXED.base) }]} yFmt={fmtBig} colors={colors} T={T} />
            <Legend items={[...TV_PLATFORMS.map((p) => ({ label: p.name, color: colors[platKey(p)] })), { label: TV_MIXED.name, color: colors.MIXED }]} T={T} />
            {openTables["tvp-bs"] && <DataTable labels={rangeMonths} seriesDefs={[...platSeries("base"), { key: "MIXED", label: TV_MIXED.name, data: sliceR(TV_MIXED.base) }]} fmt={fmtNum} T={T} />}
          </ChartCard>
        )}

        {sec("Calls offered", "calls",
          <>
            {platChart("tvp-cr", "Calls offered rate by platform (per 100 platform subs)", "callsRate", (v) => fmtRate(v, 2), "Calls offered over the platform's subscribers in the TS Calls Offered by Product workbook. Legacy = IPTV West, TV Evolution = TV+ (OPUS). TQ ILEC IPTV, PIK and PFE IPTV are in the TV total but in neither platform.")}
            {platChart("tvp-co", "Calls offered by platform", "callsOffered", fmtNum, "Contacts offered for the IPTV West and TV+ (OPUS) fields of the TS Calls Offered by Product workbook (Actuals - Calls Offered tab).")}
          </>
        )}

        {sec("Tickets", "tickets",
          <>
            {platChart("tvp-tk", "Ticket volume by platform", "tickets", fmtNum)}
            {platChart("tvp-trt", "Ticket rate by platform (per 100 platform subs)", "ticketRate", (v) => fmtRate(v, 2), "Platform tickets over the platform's provisioned subscriber base (Customer Base - Provisioned).")}
          </>
        )}

        {sec("Repairs / Dispatches", "repairs",
          <>
            {platChart("tvp-rp", "Repair volume by platform", "repairs", fmtNum, "Platform repair split: 2026 from the 2026 Redwood Scorecard (Mediaroom = IPTV West + TQ ILEC TV, OPUS = OPUS + PFE Vulcan - TV); 2025 from the 2025 Redwood Scorecard, Weekly Repair Projections tab, month-end columns (Mediaroom = IPTV + QC ILEC IPTV, OPUS = OPUS).")}
            {platChart("tvp-rr", "Repair rate by platform (per 100 platform subs)", "repairRate", (v) => fmtRate(v, 2), undefined, (v) => fmtRate(v, 2))}
          </>
        )}

        {sec("Repair swaps", "repairs",
          platChart("tvp-sw", "Repair swap volume by platform", "swaps2026", fmtNum, "Repair swap orders across all technologies, Tableau Swapped Orders Combined View. Reported for 2026 only; September and October are not yet pulled.")
        )}

        {sec("Mixed usage", "base",
          <>
            <ChartCard title="Mixed-usage subscribers (MR + TTV+)" T={T} tableOpen={!!openTables["tvp-mx"]} onToggleTable={() => toggleTable("tvp-mx")}
              note="Customers provisioned on both Mediaroom and TTV+ at month end (Customer Base - Provisioned). Subscriber count only; tickets and repairs are not yet split for this group.">
              <LineChart labels={rangeMonths} seriesDefs={[{ key: "MIXED", label: TV_MIXED.name, data: sliceR(TV_MIXED.base) }]} yFmt={fmtNum} colors={colors} T={T} />
              {openTables["tvp-mx"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: "MIXED", label: TV_MIXED.name, data: sliceR(TV_MIXED.base) }]} fmt={fmtNum} T={T} />}
            </ChartCard>
          </>
        )}
      </>
    );
  }

  // ------------------------------ self-serve (Sweepr) ------------------------------
  // goodDown=false: self-serve metrics improve when they rise (churn impact is the exception)
  function sweeprFig(key, dec, goodDown = false, bps = false) {
    const s = SWEEPR[key];
    const li = lastIdxUpTo(s.a, toIdx);
    if (li < 0) return { latest: null };
    const D = bps === "rate" ? (a, b) => deltaRate(a, b, goodDown, dec) : bps ? (a, b) => deltaBps(a, b, goodDown, dec) : (a, b) => delta(a, b, "", dec, goodDown);
    return {
      latest: s.a[li], latestMonth: MONTHS[li], target: s.t[li],
      vsTarget: s.t[li] != null ? D(s.a[li], s.t[li]) : null,
      mom: li >= 1 ? D(s.a[li], s.a[li - 1]) : null,
      yoy: li >= 12 ? D(s.a[li], s.a[li - 12]) : null
    };
  }

  function SelfServePage() {
    const col = colors.SWEEPR;
    const res = sweeprFig("resolved", 0);
    const web = sweeprFig("webAppRate", 1, false, true);
    const easy = sweeprFig("cxEasy", 2);
    const chn = sweeprFig("churn", 2, true, "rate");
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
          <StatCard T={T} color={col} icon="selfserve" label="Resolved sessions" value={fmtBig(res.latest)}
            sub={`${res.latestMonth} · target ${fmtBig(res.target)}`}
            deltas={[<DeltaText key="t" d={res.vsTarget} T={T} suffix="vs target" />, <DeltaText key="y" d={res.yoy} T={T} suffix="YoY" />]} />
          <StatCard T={T} color={col} icon="tickets" label="Web/App resolution rate" value={fmtPct(web.latest, 1)}
            sub={`${web.latestMonth} · target ${fmtPct(web.target, 1)}`}
            deltas={[<DeltaText key="t" d={web.vsTarget} T={T} suffix="vs target" />, <DeltaText key="y" d={web.yoy} T={T} suffix="YoY" />]} />
          <StatCard T={T} color={col} icon="cx" label="CX 'Easy to follow'" value={easy.latest == null ? "—" : easy.latest.toFixed(2)}
            sub={easy.latest == null ? undefined : `${easy.latestMonth} · target ${easy.target == null ? "—" : easy.target.toFixed(2)}`}
            deltas={[<DeltaText key="t" d={easy.vsTarget} T={T} suffix="vs target" />]} />
          <StatCard T={T} color={col} icon="churn" label="Sweepr involved churn per 100 subs" value={fmtRate(chn.latest, 2)}
            sub={chn.latestMonth}
            deltas={[<DeltaText key="m" d={chn.mom} T={T} suffix="MoM" />]} />
          <StatCard T={T} color={col} icon="saved" label="Deacts saved" value={fmtBig(dea.latest)}
            sub={dea.latestMonth}
            deltas={[<DeltaText key="m" d={dea.mom} T={T} suffix="MoM" />]} />
        </div>
        <a href="https://selfserve.telus.gizmos.run/" target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "flex-start", gap: 14, marginTop: 14, padding: "14px 18px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, textDecoration: "none", color: "inherit" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = col; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; }}>
          <span style={{ color: T.heading, display: "inline-flex", marginTop: 2 }}><Icon name="hexes" size={22} /></span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: T.heading }}>Self Assure program</span>
            <span style={{ display: "block", fontSize: 13.5, lineHeight: 1.55, color: T.textSecondary, marginTop: 2 }}>The full overview and strategy for the Self Assure program</span>
            <span style={{ display: "block", fontSize: 12, marginTop: 6, color: T.textFaint, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", wordBreak: "break-all" }}>https://selfserve.telus.gizmos.run/</span>
          </span>
        </a>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          Self-serve customer workflows are powered by the Sweepr platform. Source: Self Assure metrics (current deterministic workflows), latest month October 2026 (Sweepr-involved churn and deacts saved are on the 11 Nov refresh, pending sign-off, and on a reporting-month basis, so October covers September contacts). Targets are set in the source for 2026 only; churn impact and deacts saved carry no target.
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
          <ChartCard title="Sweepr involved churn rate (per 100 subs)" T={T}
            tableOpen={!!openTables["ss-chn"]} onToggleTable={() => toggleTable("ss-chn")}
            note="Churn rate among customers whose journey involved a Sweepr workflow. Reported for 2026 only; no target is set in the source.">
            <LineChart labels={rangeMonths} seriesDefs={[{ key: "SWEEPR", label: "Churn rate", data: sliceR(SWEEPR.churn.a) }]} yFmt={(v) => fmtRate(v, 2)} colors={colors} T={T} />
            {openTables["ss-chn"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: "SWEEPR", label: "Churn rate", data: sliceR(SWEEPR.churn.a) }]} fmt={(v) => fmtRate(v, 2)} T={T} />}
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

  // ------------------------------ Friction Free Product Systems program ------------------------------
  // Static program update transcribed from the monthly FFPS deck (see FFPS). No month range
  // filter applies; figures are as reported for the deck's period.
  function FfpsPage() {
    const col = colors.FFPS;
    const AMBER = isDark ? "#F0B35A" : "#B86E00";
    const F = FFPS, B = F.benefits, FIN = F.finance;
    const money = (v) => v == null ? "—" : Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : Math.abs(v) >= 1000 ? `$${Math.round(v / 1000).toLocaleString()}K` : `$${v.toLocaleString()}`;
    const moneyM = (v) => `$${(v / 1e6).toFixed(2)}M`;
    const kFmt = (k) => k == null ? "TBD" : Math.abs(k) >= 1000 ? `$${(k / 1000).toFixed(k % 1000 === 0 ? 0 : 2)}M` : `$${k}K`;
    const signed = (v, fmt = (x) => x) => v == null ? null : (v > 0 ? "+" : v < 0 ? "−" : "") + fmt(Math.abs(v));
    const card = (children, style) => <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "18px 20px", ...style }}>{children}</div>;
    const cardTitle = (title, sub) => (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 5, height: 22, borderRadius: 3, background: "#66CC02", display: "inline-block" }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: T.heading }}>{title}</span>
        </div>
        {sub && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, marginLeft: 15 }}>{sub}</div>}
      </div>
    );
    const tile = (value, label, sub, valueColor) => (
      <div style={{ flex: 1, minWidth: 120, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: valueColor || T.heading, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11.5, color: valueColor || T.textMuted, marginTop: 4, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color: T.textFaint, marginTop: 3 }}>{sub}</div>}
      </div>
    );
    const sectionLabel = (t) => <div style={{ fontSize: 12.5, fontWeight: 700, color: T.heading, margin: "14px 0 10px", paddingTop: 12, borderTop: `1px solid ${T.border}` }}>{t}</div>;
    // burndown: start → mid → end with the net move under each step
    const flow = (points, { showOpenClosed } = {}) => (
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        {points.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ alignSelf: "center", color: T.textFaint, fontSize: 20, padding: "0 2px", lineHeight: 1 }}>→</div>}
            <div style={{ textAlign: "center", flex: 1, minWidth: 110 }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: T.heading, lineHeight: 1 }}>{p.v.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 6 }}>{p.label}</div>
              {p.net != null && (showOpenClosed
                ? <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>
                    <div style={{ color: p.net > 0 ? T.bad : T.good }}>{signed(p.net)}</div>
                    <div style={{ color: AMBER }}>{p.opened} new</div>
                    <div style={{ color: T.good }}>{p.closed} closed</div>
                  </div>
                : <span style={{ display: "inline-block", marginTop: 8, background: (p.net > 0 ? T.bad : T.good) + "1a", color: p.net > 0 ? T.bad : T.good, borderRadius: 6, padding: "2px 12px", fontSize: 12.5, fontWeight: 700 }}>{signed(p.net)}</span>)}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
    const crStack = [
      { name: "Churn", color: col, data: B.crs.churn },
      { name: "Calls", color: col, opacity: 0.65, data: B.crs.calls },
      { name: "SBC", color: col, opacity: 0.35, data: B.crs.sbc }
    ];
    // Compact stacked bars sized for a card (the dashboard charts assume a full-width viewBox)
    const miniBars = (labels, stacks, fmt) => {
      const W = 360, H = 200, left = 10, right = 10, top = 26, bottom = 24;
      const plotW = W - left - right, plotH = H - top - bottom;
      const totals = labels.map((_, i) => stacks.reduce((a, s) => a + (s.data[i] || 0), 0));
      const max = Math.max(1, ...totals) * 1.08;
      const slot = plotW / labels.length, bw = Math.min(64, slot * 0.55);
      const y = (v) => top + (1 - v / max) * plotH;
      return (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
          <line x1={left} x2={W - right} y1={top + plotH} y2={top + plotH} stroke={T.borderStrong} strokeWidth="1" />
          {labels.map((l, i) => {
            const cx = left + slot * i + slot / 2; let acc = 0;
            return (
              <g key={i}>
                {stacks.map((s, si) => { const v = s.data[i] || 0; if (v <= 0) return null; const y0 = y(acc), y1 = y(acc + v); acc += v;
                  return <rect key={si} x={cx - bw / 2} y={y1} width={bw} height={Math.max(0.5, y0 - y1)} fill={s.color} opacity={s.opacity == null ? 1 : s.opacity} />; })}
                {totals[i] > 0 && <text x={cx} y={y(totals[i]) - 6} fontSize="12" fontWeight="700" fill={T.text} textAnchor="middle">{fmt(totals[i])}</text>}
                <text x={cx} y={H - 7} fontSize="12" fontWeight="600" fill={T.textSecondary} textAnchor="middle">{l}</text>
              </g>
            );
          })}
        </svg>
      );
    };
    const notes = (items) => (
      <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 12.3, lineHeight: 1.6, color: T.textSecondary }}>
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    );
    const th = { padding: "8px 10px", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
    const td = { padding: "8px 10px", fontSize: 12.5, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" };
    // CR timeline (delivered and pipeline share the layout)
    const timeline = (months, { footer }) => (
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${months.length}, minmax(${months.length > 5 ? 126 : 150}px, 1fr))`, gap: months.length > 5 ? 9 : 12, overflowX: "auto", paddingBottom: 4 }}>
        {months.map((mo, i) => (
          <div key={i} style={{ minWidth: 0 }}>
            <div style={{ textAlign: "center", paddingBottom: 10, marginBottom: 10, borderBottom: `2px solid ${col}`, position: "relative" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.heading }}>{mo.m}</div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.good }}>{mo.crs.length} CR{mo.crs.length === 1 ? "" : "s"}</div>
              <span style={{ position: "absolute", left: "50%", bottom: -7, transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", background: "#66CC02", border: `2px solid ${T.surface}` }} />
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {mo.crs.map((c, j) => (
                <div key={j} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 11.8, lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, color: T.good }}>{c.id}{c.name ? <span style={{ color: T.textSecondary, fontWeight: 600 }}> · {c.name}</span> : null}</div>
                  <div style={{ color: T.text, fontStyle: "italic", marginTop: 2 }}>{c.t}</div>
                  {c.tag && <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2, fontWeight: 600 }}>{c.tag}</div>}
                </div>
              ))}
            </div>
            {footer && footer(mo, i)}
          </div>
        ))}
      </div>
    );
    const lastDelivered = F.delivered[F.delivered.length - 1];
    const crsEnd = F.burndown.crs.points[F.burndown.crs.points.length - 1], crsStart = F.burndown.crs.points[0];
    const tkEnd = F.burndown.tickets.points[F.burndown.tickets.points.length - 1], tkStart = F.burndown.tickets.points[0];
    const dl = (v, label, goodDown = true) => <span style={{ color: v === 0 ? T.textMuted : (v < 0) === goodDown ? T.good : T.bad, fontWeight: 600 }}>{signed(v)} {label}</span>;
    const totalBenefit = B.totals.reduce((a, t) => a + t.v, 0);

    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard T={T} color={col} icon="issues" label="Open CRs" value={crsEnd.v} sub={`${crsEnd.label} · ${crsStart.v} at start of year`}
            deltas={[dl(crsEnd.net, "vs end of Sep"), dl(F.burndown.crs.ytd.net, "YTD")]} />
          <StatCard T={T} color={col} icon="tickets" label="Open tickets" value={tkEnd.v} sub={`${tkEnd.label} · billing + non-billing`}
            deltas={[dl(tkEnd.net, "vs end of Sep"), dl(F.burndown.tickets.ytd.net, "YTD")]} />
          <StatCard T={T} color={col} icon="saved" label="Recurring benefit" value={`$${B.recurring.toFixed(1)}M`} sub="End of Q4 · against $5.6M spend"
            deltas={[<span key="b" style={{ color: T.textSecondary }}>{moneyM(totalBenefit)} across CRs, non-billing and billing</span>]} />
          <StatCard T={T} color={col} icon="program" label="CR run-rate benefit" value={`$${lastDelivered.rate}K/mo`} sub={`${lastDelivered.m} · ${F.delivered.reduce((a, m) => a + m.crs.length, 0)} CRs delivered since Feb`}
            deltas={[<span key="c" style={{ color: T.textSecondary }}>{`$${(lastDelivered.cum / 1000).toFixed(2)}M cumulative`}</span>]} />
          <StatCard T={T} color={col} icon="churn" label={`${FIN.month} spend`} value={`$${FIN.monthSpend.toFixed(2)}M`} sub={`vs forecast $${FIN.monthForecast.toFixed(2)}M · YTD $${FIN.spendToDate.ytd.toFixed(1)}M`}
            deltas={[<span key="r" style={{ color: T.textSecondary }}>{`$${FIN.remaining.toFixed(1)}M remaining (${FIN.remainingPct}% of budget)`}</span>]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          Transcribed from the Friction Free Product Systems program update deck ({F.asOf} edition, {F.period}). This page does not follow the month range selector.
        </p>

        <Section key="ffps-01" num="01" eyebrow="Friction Free Program" title="Burndown" icon="issues" T={T} collapsible>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
            {card(<>
              {cardTitle(F.burndown.crs.label, F.burndown.crs.sub)}
              {flow(F.burndown.crs.points, { showOpenClosed: true })}
              {sectionLabel(`Activity, year to date (through ${F.burndown.crs.ytd.through}) · net change ${signed(F.burndown.crs.ytd.net)}`)}
              <div style={{ display: "flex", gap: 10 }}>
                {tile(F.burndown.crs.ytd.opened, "New CRs", null, AMBER)}
                {tile(F.burndown.crs.ytd.closed, "Closed", null, T.good)}
              </div>
            </>)}
            {card(<>
              {cardTitle(F.burndown.tickets.label, F.burndown.tickets.sub)}
              {flow(F.burndown.tickets.points)}
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 12.5, fontWeight: 700, color: T.bad }}>Net change vs start of year: {signed(F.burndown.tickets.ytd.net)}</div>
              {sectionLabel(`Activity, year to date (through ${F.burndown.tickets.ytd.through})`)}
              <div style={{ display: "flex", gap: 10 }}>
                {tile(F.burndown.tickets.ytd.opened.toLocaleString(), "New (total)", `${F.burndown.tickets.ytd.openedTickets} tickets · ${F.burndown.tickets.ytd.openedProactive} proactive`)}
                {tile(F.burndown.tickets.ytd.closed, "Closed")}
                {tile(F.burndown.tickets.ytd.cancelled, "Cancelled")}
              </div>
              <div style={{ fontSize: 11.5, color: T.textFaint, fontStyle: "italic", marginTop: 10 }}>{F.burndown.tickets.note}</div>
            </>)}
          </div>
        </Section>

        <Section key="ffps-02" num="02" eyebrow="Friction Free Program" title="Benefits" icon="saved" T={T} collapsible>
          <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600, lineHeight: 1.5, color: T.text }}>{B.headline}</p>
          <p style={{ margin: "0 0 14px", fontSize: 12.5, color: T.textMuted }}>{B.sub}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {card(<>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.heading, marginBottom: 6 }}>{B.crs.title}</div>
              {miniBars(B.crs.labels, crStack, moneyM)}
              <div style={{ display: "flex", gap: 14, justifyContent: "center", fontSize: 11.5, color: T.textSecondary, marginTop: 4 }}>
                {crStack.map((s) => <span key={s.name} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, opacity: s.opacity == null ? 1 : s.opacity, display: "inline-block" }} />{s.name}</span>)}
              </div>
              {notes(B.crs.notes)}
            </>)}
            {card(<>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.heading, marginBottom: 6 }}>{B.nonBilling.title}</div>
              {miniBars(B.nonBilling.labels, [{ name: "Benefit", color: col, data: B.nonBilling.total }], moneyM)}
              {notes(B.nonBilling.notes)}
            </>)}
            {card(<>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.heading, marginBottom: 6 }}>{B.billing.title}</div>
              {miniBars(B.billing.labels, [{ name: "EBITDA benefit", color: "#66CC02", data: B.billing.ebitda }], moneyM)}
              <div style={{ fontSize: 13, fontWeight: 700, color: T.heading, margin: "12px 0 6px" }}>Billing defects: remediation drivers</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={{ ...th, textAlign: "left" }}>Month</th><th style={{ ...th, textAlign: "right" }}>Calls</th><th style={{ ...th, textAlign: "right" }}>Contra</th></tr></thead>
                <tbody>{B.billing.drivers.map((d) => (
                  <tr key={d.m}><td style={{ ...td, color: T.textSecondary, fontWeight: 600 }}>{d.m}</td><td style={{ ...td, textAlign: "right" }}>{d.calls.toLocaleString()}</td><td style={{ ...td, textAlign: "right" }}>${d.contra.toLocaleString()}</td></tr>
                ))}</tbody>
              </table>
              <div style={{ fontSize: 11.5, color: T.textFaint, fontStyle: "italic", marginTop: 8 }}>{B.billing.note}</div>
            </>)}
          </div>
          <div style={{ marginTop: 16, borderRadius: 12, padding: "14px 20px", background: `linear-gradient(90deg, ${T.heading}, ${col})`, color: "#fff", display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "space-around" }}>
            {B.totals.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700 }}>${t.v.toLocaleString()}</span>
                <span style={{ fontSize: 12.5, opacity: 0.9 }}>{t.label}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section key="ffps-03" num="03" eyebrow="Friction Free Program" title="Billing tickets" icon="tickets" T={T} collapsible defaultOpen={false}>
          {card(<>
            {cardTitle("Billing tickets: executive overview", F.billingTickets.period)}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "stretch" }}>
              {tile(F.billingTickets.start.v, F.billingTickets.start.m.toUpperCase(), "total billing tickets")}
              <div style={{ alignSelf: "center", color: T.textFaint, fontSize: 20 }}>→</div>
              {tile(F.billingTickets.end.v, F.billingTickets.end.m.toUpperCase(), "total billing tickets")}
              {tile(signed(F.billingTickets.delta), "Change", `${F.billingTickets.start.m.slice(0, 3)} → ${F.billingTickets.end.m.slice(0, 3)}`, T.bad)}
              {tile(F.billingTickets.closed, "Closed to date", null, T.good)}
              {tile(F.billingTickets.cancelled, "Cancelled to date")}
            </div>
          </>)}
        </Section>

        <Section key="ffps-04" num="04" eyebrow="Friction Free Program" title="CR delivery timeline (Sep – Dec 2026)" icon="initiatives" T={T} collapsible>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${F.pipeline.length}, minmax(150px, 1fr))`, gap: 12, marginBottom: 14, overflowX: "auto" }}>
            {F.pipeline.map((mo, i) => (
              <div key={i} style={{ textAlign: "center", background: T.band, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 10px", fontSize: 15, fontWeight: 600, color: T.heading }}>~${mo.rate}K/month</div>
            ))}
          </div>
          {timeline(F.pipeline, {})}
          <p style={{ fontSize: 11.5, color: T.textFaint, fontStyle: "italic", margin: "12px 0 0", lineHeight: 1.5 }}>{F.pipelineNote}</p>
        </Section>

        <Section key="ffps-05" num="05" eyebrow="Friction Free Program" title="Finance" icon="churn" T={T} collapsible defaultOpen={false}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {tile(`$${FIN.monthSpend.toFixed(2)}M`, `${FIN.month} spend`, `vs forecast $${FIN.monthForecast.toFixed(2)}M`)}
            {tile(`$${FIN.spendToDate.ytd.toFixed(1)}M`, "Spend to date", `Q1 $${Math.round(FIN.spendToDate.q1 * 1000)}K · Q2 $${FIN.spendToDate.q2.toFixed(2)}M · Q3 $${FIN.spendToDate.q3.toFixed(2)}M · Q4 $${FIN.spendToDate.q4.toFixed(2)}M`)}
            {tile(`$${FIN.h2Forecast.q3.toFixed(1)}M · $${FIN.h2Forecast.q4.toFixed(1)}M`, "H2 forecast", "Q3 · Q4")}
            {tile(`$${FIN.remaining.toFixed(1)}M`, "Remaining budget", `${FIN.remainingPct}% of total`)}
            {tile(`$${FIN.h1.spend.toFixed(2)}M / $${FIN.h1.benefits.toFixed(2)}M`, "H1 spend / benefits")}
            {tile(`$${FIN.h2.spend.toFixed(1)}M / $${FIN.h2.benefits.toFixed(1)}M`, "H2 spend (forecast) / benefits")}
          </div>
          {card(<>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.heading, marginBottom: 8 }}>Project spend summary</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={{ ...th, textAlign: "left" }}>Project</th><th style={{ ...th, textAlign: "right" }}>{FIN.month} spend</th><th style={{ ...th, textAlign: "right" }}>Spend to date</th><th style={{ ...th, textAlign: "right" }}>Allocation</th><th style={{ ...th, textAlign: "right" }}>Remaining to spend</th>
                </tr></thead>
                <tbody>
                  {[...FIN.projects, FIN.projectTotal].map((p, i) => {
                    const total = i === FIN.projects.length;
                    const s = { ...td, textAlign: "right", fontWeight: total ? 700 : 400, color: total ? T.heading : T.text };
                    return (
                      <tr key={p.name} style={total ? { background: T.panel } : undefined}>
                        <td style={{ ...td, color: total ? T.heading : T.textSecondary, fontWeight: total ? 700 : 600 }}>{p.name}</td>
                        <td style={{ ...s, color: p.m < 0 ? T.good : s.color }}>{p.m < 0 ? "−" : ""}{kFmt(Math.abs(p.m))}</td>
                        <td style={s}>{kFmt(p.toDate)}</td><td style={s}>{kFmt(p.alloc)}</td><td style={s}>{kFmt(p.remaining)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>, { marginTop: 16 })}
          {card(<>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.heading, marginBottom: 8 }}>Spend and receipts by quarter</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={{ ...th, textAlign: "left" }}>Project</th>
                  {["Q1", "Q2", "Q3", "Q4 forecast"].flatMap((q) => [<th key={q + "s"} style={{ ...th, textAlign: "right" }}>{q} spend</th>, <th key={q + "r"} style={{ ...th, textAlign: "right" }}>{q} receipts</th>])}
                </tr></thead>
                <tbody>
                  {[...FIN.quarterly, FIN.quarterlyTotal].map((p, i) => {
                    const total = i === FIN.quarterly.length;
                    const s = { ...td, textAlign: "right", fontWeight: total ? 700 : 400, color: total ? T.heading : T.text };
                    return (
                      <tr key={p.name} style={total ? { background: T.panel } : undefined}>
                        <td style={{ ...td, color: total ? T.heading : T.textSecondary, fontWeight: total ? 700 : 600 }}>{p.name}</td>
                        {["q1", "q2", "q3", "q4"].flatMap((q) => [<td key={q + "s"} style={s}>{kFmt(p[q][0])}</td>, <td key={q + "r"} style={{ ...s, color: p[q][1] == null ? T.textFaint : s.color }}>{kFmt(p[q][1])}</td>])}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 8 }}>Receipts marked TBD are not yet reported in the source.</div>
          </>, { marginTop: 16 })}
        </Section>
      </>
    );
  }

  // ------------------------------ pages ------------------------------
  function HomePage() {
    return (
      <>
        <Section num="01" eyebrow="Executive summary" title={scope === "All" ? "All products at a glance" : `${scope} at a glance`} icon="overview" T={T} collapsible>
          {(() => {
            // On the All scope the two self-serve cards join the KPI grid right
            // after the subscriber base card; a fixed 4-column grid keeps both
            // rows equally sized and aligned (4 + 4).
            const res = sweeprFig("resolved", 0);
            const dea = sweeprFig("deacts", 0);
            const selfServeCards = scope === "All" ? [
              <StatCard key="ss-res" T={T} color={colors.SWEEPR} icon="selfserve" label="Self-serve resolved sessions" value={fmtBig(res.latest)}
                sub={`${res.latestMonth} · target ${fmtNum(res.target)} · Sweepr workflows`}
                deltas={[<DeltaText key="t" d={res.vsTarget} T={T} suffix="vs target" />]} />,
              <StatCard key="ss-dea" T={T} color={colors.SWEEPR} icon="saved" label="Self-serve deacts saved" value={fmtBig(dea.latest)}
                sub={`${dea.latestMonth} · Sweepr workflows`}
                deltas={[<DeltaText key="m" d={dea.mom} T={T} suffix="MoM" />]} />
            ] : null;
            return <TileRow tiles={scopeTiles(scope)} deltaMode="both" columns={scope === "All" ? 4 : undefined} extras={selfServeCards} />;
          })()}
          <TopIssueFlags prods={scope === "All" ? PRODUCTS : [scope]} />
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setPage("execsummary")}
              style={{ background: "transparent", border: "none", padding: 0, color: T.heading, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: FONT, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="slides" size={13} /> Executive Summary slides →
            </button>
          </div>
          <Disclosure label="How to read this" T={T} style={{ marginTop: 14 }}><p style={{ fontSize: 12.5, color: T.textFaint, margin: 0, lineHeight: 1.6 }}>
            Comparisons are year-over-year at the end of the selected range. Latest reported month: <b style={{ color: T.textSecondary }}>{MONTHS[MONTHS.length - 1]}</b> for calls, tickets, repairs and base; churn (go/national RGU) is reported through <b style={{ color: T.textSecondary }}>Jun 2026</b>.
            {scope === "All" && " All-product rates are blended: total volume over total subscriber base (churn: base-weighted mean); calls are HSIA + TV + SHS contacts offered. SH+ is reported separately and is not yet included in the All rollup."}
            {" "}Annual churn: HSIA {DATA.annualChurn.HSIA.y2026.toFixed(2)}% 2026 YTD vs {DATA.annualChurn.HSIA.y2025.toFixed(2)}% 2025 · TV {DATA.annualChurn.TV.y2026.toFixed(2)}% vs {DATA.annualChurn.TV.y2025.toFixed(2)}% · SHS {DATA.annualChurn.SHS.y2026.toFixed(2)}% vs {DATA.annualChurn.SHS.y2025.toFixed(2)}%.
          </p></Disclosure>
        </Section>

        <Section num="02" eyebrow="Monthly summary" title={`Health Read — ${latestLabel}`} icon="overview" T={T} collapsible>
          {MonthlyNarrative({ sc: scope })}
        </Section>

        <Section num="03" eyebrow="Monthly scorecard" title="Reliability scorecard" icon="tickets" T={T} collapsible>
          <Disclosure label="About this section" T={T} style={{ margin: "0 0 14px" }}><p style={{ fontSize: 12.5, color: T.textMuted, margin: 0, lineHeight: 1.6 }}>
            The month at the end of the selected range is shaded and marked as under review. The 2025 column is the 2025 average for rates and the 2025 total for call volumes. “—” means the source has not reported that month.
          </p></Disclosure>
          <ScorecardTable />
          <Disclosure label="Sources & notes" T={T} style={{ marginTop: 12 }}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.6 }}>
            Calls are contacts offered. HSIA and TV call series come from the TS Calls Offered by Product workbook (Actuals tabs); SHS calls come from the KPI workbook. Churn rate is first reported for Feb 2025.
          </p></Disclosure>
        </Section>

        <Section num="04" eyebrow="Ticket analysis" title={`Tickets by recurring issue — ${LATEST}`} icon="issues" T={T} collapsible>
          <Disclosure label="About this section" T={T} style={{ margin: "0 0 14px" }}><p style={{ fontSize: 12.5, color: T.textMuted, margin: 0, lineHeight: 1.6 }}>
            Ticket counts grouped by the five recurring issues from the cross-source reliability synthesis (perception study, VOC, onboarding, CCTS, OpenSignal and ticket/repair analysis). HSIA counts are the customer pain points from the workbook's hsia_ticket_recategorization tab (its Other group, abandoned and uncategorised tickets, sits in the Support row); TV and SHS use the Looker ticket categories. SHS device categories sit outside the 5-issue framework, matching the synthesis. A falling count (▼, green) is favourable.
          </p></Disclosure>
          <RecurringIssuesTable />
        </Section>

        <Section num="05" eyebrow="Reliability program" title="Initiatives by pillar" icon="initiatives" T={T} collapsible>
          <Disclosure label="About this section" T={T} style={{ margin: "0 0 14px" }}><p style={{ fontSize: 12.5, color: T.textMuted, margin: 0, lineHeight: 1.6 }}>
            Every initiative from the registers (HSIA from the Product Technical | Churn & VOC Projects Impact sheet; TV and SHS from the Churn Measurement 2026 workbook's Initiatives tab), grouped under the reliability program's four pillars. Click a pillar to expand or collapse its initiatives.
          </p></Disclosure>
          <PillarInitiatives />
        </Section>

        {(() => {
          const prods = scope === "All" ? ["HSIA", "TV", "SHS"] : scope === "SH+" ? [] : [scope];
          const items = INITIATIVES.filter((it) => prods.includes(it.p));
          if (!items.length) return null;
          return (
            <Section num="06" eyebrow="Reliability program" title={`Initiative timeline${scope === "All" ? " — HSIA, TV and SHS" : ` — ${scope}`}`} icon="initiatives" T={T} collapsible defaultOpen={false}>
              {InitiativeTimeline({ items, showProduct: scope === "All" })}
            </Section>
          );
        })()}
      </>
    );
  }

  function ProductPage({ product }) {
    const hasCalls = true;
    const hasLooker = !!LOOKER[product];
    const split = CALLS_SPLIT[product];
    const callsOffered = split ? split.offered : DATA.callsOffered[product];
    const callsAnswered = split ? split.answered : DATA.callsAnswered[product];
    const callsTitle = `Contacts (${product})`;
    const callsNote = product === "SHS"
      ? "SHS contacts, offered vs. answered."
      : product === "SH+"
        ? "SH+ contacts offered vs answered (SH+ reliability KPIs workbook)."
      : product === "HSIA"
        ? "HSIA contacts offered vs answered — TS Calls Offered by Product workbook (Actuals tabs): HSIA West + TQ ILEC - HSIA."
        : "TV contacts offered vs answered, rolled up across platforms — TS Calls Offered by Product workbook (Actuals tabs): IPTV West + TV+ (OPUS) + PIK + PFE - IPTV + TQ ILEC - IPTV.";
    const yoyChurn = DATA.annualChurn[product];
    const L = LOOKER[product];
    const prodInits = INITIATIVES.filter((it) => it.p === product);
    // Header filters drive both the Initiatives list and the Initiative timeline section.
    const filteredInits = prodInits.filter((it) =>
      INIT_FILTER_KEYS.every((k) => initFilters[k] === "All" || (it[k] || "—") === initFilters[k])
    );
    const initFilterActive = INIT_FILTER_KEYS.some((k) => initFilters[k] !== "All");

    // Sections are numbered sequentially per product; all are collapsible and
    // only the health read and the first KPI section start expanded. Keys force a remount on product change
    // so each page opens in its default state.
    let secNo = 0;
    const sec = (title, icon, children) => {
      secNo += 1;
      return (
        <Section key={`${product}-${title}`} num={String(secNo).padStart(2, "0")} eyebrow={product} title={title} icon={icon}
          T={T} collapsible defaultOpen={secNo <= 2}>
          {children}
        </Section>
      );
    };

    return (
      <>
        <TileRow tiles={scopeTiles(product)} deltaMode="both" />
        {yoyChurn && (
          <div style={{ fontSize: 12.5, color: yoyChurn.yoyPts <= 0 ? T.good : T.bad, fontWeight: 600, margin: "10px 2px 0" }}>
            Annual churn (go/national RGU): {yoyChurn.yoyPts <= 0 ? "▼" : "▲"} {Math.abs(yoyChurn.yoyPts).toFixed(2)} per 100 subs YoY — 2026 YTD {yoyChurn.y2026.toFixed(2)} vs 2025 {yoyChurn.y2025.toFixed(2)} per 100 subs
          </div>
        )}
        {CHILD_PAGES[product] && (
          <div style={{ fontSize: 12.5, margin: "10px 2px 0", display: "flex", gap: 18, flexWrap: "wrap" }}>
            {CHILD_PAGES[product].map((id) => (
              <button key={id} onClick={() => { setPage(id); setDeckSlide(null); }}
                style={{ background: "transparent", border: "none", padding: 0, color: T.heading, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: FONT, textDecoration: "underline" }}>
                {CHILD_LABEL[id]} →
              </button>
            ))}
          </div>
        )}
        {product === "SH+" && (
          <p style={{ fontSize: 12.5, color: T.textFaint, margin: "10px 2px 0", lineHeight: 1.6 }}>
            SmartHome+ KPIs come from the SH+ reliability KPIs scorecard: subscriber base, calls and ticket volume from Jan 2025, ticket and repair rates from Jul 2025. Ticket categories and movers come from the monthly SH+ Assure ticket exports (Sep 2025 onward). Churn and improvement initiatives are not yet reported for SH+.
          </p>
        )}

        {sec(`Health Read — ${latestLabel}`, "overview", MonthlyNarrative({ sc: product }))}

        {hasCalls && sec("Calls", "calls",
          <>
          <ChartCard title="Calls offered rate per 100 subs" T={T}
            tableOpen={!!openTables[product + "-callsrate"]} onToggleTable={() => toggleTable(product + "-callsrate")} note="Calls offered over the subscriber base, per 100 subscribers.">
            <LineChart labels={rangeMonths} seriesDefs={[{ key: product, label: "Calls offered per 100 subs", data: sliceR(DATA.callsRate[product]) }]} yFmt={(v) => fmtRate(v, 2)} colors={colors} T={T} />
            {openTables[product + "-callsrate"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: product, label: "Calls offered per 100 subs", data: sliceR(DATA.callsRate[product]) }]} fmt={(v) => fmtRate(v, 2)} T={T} />}
          </ChartCard>
          <ChartCard title={`${callsTitle} — offered (bars) and answered (line)`} T={T}
            tableOpen={!!openTables[product + "-calls"]} onToggleTable={() => toggleTable(product + "-calls")} note={callsNote}>
            <ComboChart labels={rangeMonths} T={T} sharedAxis
              bar={{ label: "Offered", data: sliceR(callsOffered), color: colors[product], fmt: fmtNum }}
              line={{ label: "Answered", data: sliceR(callsAnswered), color: colors[product], fmt: fmtNum }} />
            <Legend items={[
              { label: "Offered (bars)", color: colors[product], bar: true },
              { label: "Answered (line)", color: colors[product] }
            ]} T={T} />
            {openTables[product + "-calls"] && <DataTable labels={rangeMonths} seriesDefs={[
              { key: product, label: "Offered", data: sliceR(callsOffered) },
              { key: product, label: "Answered", data: sliceR(callsAnswered) }
            ]} fmt={fmtNum} T={T} />}
          </ChartCard>
          </>
        )}

        {sec("Tickets", "tickets",
          <>
            <ChartCard title="Tickets — volume (bars) and rate (line, per 100 subs)" T={T}
              tableOpen={!!openTables[product + "-tr"]} onToggleTable={() => toggleTable(product + "-tr")}
              note={product === "SH+" ? "SH+ ticket volume from Jan 2025 and ticket rate from Jul 2025 (SH+ reliability KPIs workbook). Volume on the left axis, rate on the right." : "Ticket volume on the left axis, ticket rate on the right axis (Reliability Deact KPIs tab)."}>
              <ComboChart labels={rangeMonths} T={T}
                bar={{ label: "Ticket volume", data: sliceR(DATA.ticketVolume[product]), color: colors[product], fmt: fmtNumK }}
                line={{ label: "Ticket rate", data: sliceR(DATA.ticketRate[product]), color: colors[product], fmt: (v) => fmtRate(v, 2) }}
                tooltipExtra={hasLooker ? (i) => {
                  // biggest month-over-month % riser among Looker Category 1 › 2 issues (2026 only)
                  const m = rangeMonths[i];
                  if (!m || !m.endsWith("2026")) return null;
                  const r = L.risers[m];
                  return (
                    <div style={{ marginTop: 5, paddingTop: 5, borderTop: `1px solid ${T.border}`, color: T.textMuted, maxWidth: 320, whiteSpace: "normal" }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Biggest riser vs prior month</span><br />
                      {r ? <><b style={{ color: T.text }}>{r.issue}</b> <span style={{ color: T.bad, fontWeight: 700 }}>+{r.pct}%</span> <span style={{ color: T.textFaint }}>({fmtNum(r.from)} → {fmtNum(r.to)})</span></> : <span>No sub-category rose this month</span>}
                    </div>
                  );
                } : undefined} />
              <Legend items={[{ label: "Ticket volume (bars, left axis)", color: colors[product], bar: true }, { label: "Ticket rate (line, right axis)", color: colors[product] }]} T={T} />
              {openTables[product + "-tr"] && <DataTable labels={rangeMonths} seriesDefs={[
                { key: product, label: "Ticket volume", data: sliceR(DATA.ticketVolume[product]), fmt: fmtNum },
                { key: product, label: "Ticket rate", data: sliceR(DATA.ticketRate[product]), fmt: (v) => fmtRate(v, 2) }
              ]} fmt={fmtNum} T={T} />}
            </ChartCard>
            {hasLooker && (
              <ChartCard title={L.catSource === "recategorization" ? `Ticket volume by customer pain point — largest ${L.topCat.name}` : L.catSource === "assure" ? `Assure ticket volume by category — top category ${L.topCat.name}` : `Looker ticket volume by category — top category ${L.topCat.name}`} T={T}
                tableOpen={!!openTables[product + "-tv"]} onToggleTable={() => toggleTable(product + "-tv")}
                note={L.catSource === "recategorization"
                  ? `hsia_ticket_recategorization tab, Churn Measurement 2026 workbook. Looker ticket types rolled up to customer pain points: Connection Instability & Disconnects (can't connect, no data flow, losing sync, no IP, no sync, ONT not ranged), Slow Speeds (wireless and wired slow speeds, incompatible equipment), WiFi Coverage Gaps (wireless disconnects, wireless can't connect) and Other. ${L.topCat.name} sits at the base of each bar.`
                  : L.catSource === "assure"
                  ? `SH+ Assure tickets (Agent + Technician, de-duplicated on ticket ID) from the monthly Assure ticket exports, Sep 2025 onward. Bars stack the five largest Trouble Code 2 groups (by ${LOOKER_LATEST} volume) with the remainder as other categories; the top category (${L.topCat.name}) sits at the base of each bar. Totals differ from the scorecard's Call Tickets.`
                  : `Looker ticket categories, Churn Measurement 2026 workbook. Bars stack the five largest Category 1 groups (by ${LOOKER_LATEST} volume) with the remainder as other categories; the top category (${L.topCat.name}) sits at the base of each bar.`}>
                {(() => {
                  const shades = [1, 0.72, 0.52, 0.38, 0.26];
                  const stacks = L.cats.map((c, ci) => /^Other/.test(c.name)
                    ? { name: c.name, data: sliceR(c.series), color: T.borderStrong, opacity: 0.9 }
                    : { name: c.name, data: sliceR(c.series), color: colors[product], opacity: shades[ci] || 0.2 });
                  return (
                    <>
                      <StackedBarChart labels={rangeMonths} stacks={stacks} yFmt={fmtNumK} T={T} />
                      <div style={{ display: "flex", gap: 14, alignItems: "center", margin: "8px 2px 2px", fontSize: 12.5, color: T.textSecondary, flexWrap: "wrap" }}>
                        {stacks.map((st) => (
                          <div key={st.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 12, height: 12, background: st.color, opacity: st.opacity, borderRadius: 3, display: "inline-block" }} />{st.name}
                          </div>
                        ))}
                      </div>
                      {openTables[product + "-tv"] && <DataTable labels={rangeMonths} seriesDefs={[
                        { key: product, label: "Total", data: sliceR(L.monthlyTotal) },
                        ...stacks.map((st) => ({ key: product, label: st.name, data: st.data }))
                      ]} fmt={fmtNum} T={T} />}
                    </>
                  );
                })()}
              </ChartCard>
            )}
          </>
        )}

        {hasLooker && sec("Ticket issues & movers", "issues", <TicketIssuesSection product={product} />)}

        {sec("Repairs / Dispatches", "repairs",
          <>
            <ChartCard title="Repairs / dispatches — volume (bars) and rate (line, per 100 subs)" T={T}
              tableOpen={!!openTables[product + "-rr"]} onToggleTable={() => toggleTable(product + "-rr")}
              note={product === "SH+" ? "SH+ repairs are reported from Jul 2025 (SH+ reliability KPIs workbook). Volume on the left axis, rate on the right." : "Repair (dispatch) volume on the left axis, repair rate on the right axis."}>
              <ComboChart labels={rangeMonths} T={T}
                bar={{ label: "Repair volume", data: sliceR(DATA.repairVolume[product]), color: colors[product], fmt: fmtNumK }}
                line={{ label: "Repair rate", data: sliceR(DATA.repairRate[product]), color: colors[product], fmt: (v) => fmtRate(v, 2) }} />
              <Legend items={[{ label: "Repair volume (bars, left axis)", color: colors[product], bar: true }, { label: "Repair rate (line, right axis)", color: colors[product] }]} T={T} />
              {openTables[product + "-rr"] && <DataTable labels={rangeMonths} seriesDefs={[
                { key: product, label: "Repair volume", data: sliceR(DATA.repairVolume[product]), fmt: fmtNum },
                { key: product, label: "Repair rate", data: sliceR(DATA.repairRate[product]), fmt: (v) => fmtRate(v, 2) }
              ]} fmt={fmtNum} T={T} />}
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
          <ChartCard title="Churn rate per 100 subs (go/national RGU)" T={T}
            tableOpen={!!openTables[product + "-ch"]} onToggleTable={() => toggleTable(product + "-ch")}
            note={`Churn runs behind the other indicators in the source (reported through ${CHURN_THRU}; Jan 2025 was never reported).`}>
            <LineChart labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.churnRate[product]) }]} yFmt={(v) => fmtRate(v, 2)} colors={colors} T={T} />
            {openTables[product + "-ch"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.churnRate[product]) }]} fmt={(v) => fmtRate(v, 2)} T={T} />}
          </ChartCard>
        )}

        {DATA.b2bVoC[product] && sec("Voice of Customer (B2B)", "sentiment",
          <ChartCard title="Reliability B2B score" T={T}
            tableOpen={!!openTables[product + "-b2b"]} onToggleTable={() => toggleTable(product + "-b2b")}
            note="HSIA West TCS PLT Charter and Toolkit workbook, HSIA West Scorecard tab (Reliability B2B rows). Lower is better.">
            <LineChart labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.b2bVoC[product]) }]} yFmt={(v) => fmtPct(v, 1)} colors={colors} T={T} />
            {openTables[product + "-b2b"] && <DataTable labels={rangeMonths} seriesDefs={[{ key: product, label: product, data: sliceR(DATA.b2bVoC[product]) }]} fmt={(v) => fmtPct(v, 1)} T={T} />}
          </ChartCard>
        )}

        {sec("Initiatives", "initiatives",
          prodInits.length ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0 0 12px" }}>
                <p style={{ fontSize: 12.5, color: T.textMuted, margin: 0, lineHeight: 1.6 }}>
                  {product} initiatives from {product === "HSIA" ? "the Product Technical | Churn & VOC Projects Impact sheet" : "the workbook's Initiatives tab"}. Use the column headers to filter by theme, status, timeline or prime.
                </p>
                <span style={{ fontSize: 12, color: T.textFaint, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 10 }}>
                  {filteredInits.length} of {prodInits.length} initiative{prodInits.length > 1 ? "s" : ""}
                  {initFilterActive && (
                    <button onClick={() => setInitFilters(NO_INIT_FILTERS)}
                      style={{ background: "transparent", border: `1px solid ${T.borderStrong}`, color: T.textSecondary, borderRadius: 999, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                      Clear filters
                    </button>
                  )}
                </span>
              </div>
              {InitiativeRows({ items: filteredInits, filterable: true, allItems: prodInits })}
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: T.textFaint, margin: 0 }}>{product} initiatives have not been added to the source workbook yet — this section will populate once they are.</p>
          )
        )}

        {/* Title stays constant so the section keeps its open/closed state when filters change. */}
        {prodInits.length > 0 && sec("Initiative timeline", "initiatives",
          <>
            {initFilterActive && (
              <div style={{ fontSize: 12, color: T.textMuted, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 999, padding: "2px 10px", fontWeight: 700, fontSize: 11.5, color: T.heading }}>Filtered</span>
                Showing {filteredInits.length} of {prodInits.length} initiatives, matching the filters set in the Initiatives section.
              </div>
            )}
            {InitiativeTimeline({ items: filteredInits, showProduct: false })}
          </>)}
      </>
    );
  }


  // ------------------------------ TV analysis sub-pages (tickets, sentiment, cross) ------------------------------
  // Ticket/agent-notes window (rolls forward each month); the customer-survey
  // pages have their own window below since that pipeline hasn't been rolled
  // forward to the same month yet.
  // Notes-analysis window: the three months carried by TVA / HSA (the two analyses share it).
  const AN_FULL = TVA.months, AN_MONTHS = AN_FULL.map((m) => m.slice(0, 3)), AN_YR = AN_FULL[2].slice(-2);
  const [AN_M0, AN_M1, AN_M2] = AN_MONTHS, AN_LAST = AN_FULL[2], AN_MOM = `${AN_M2} vs ${AN_M1}`, AN_MOM_FULL = `${AN_LAST} vs ${AN_FULL[1]}`;
  const AN_SURVEY_MONTHS = ["Jun", "Jul", "Aug"];
  const anTh = { padding: "9px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", textAlign: "left" };
  const anTd = { padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12.5, verticalAlign: "middle" };
  const anNum = { ...anTd, textAlign: "right", whiteSpace: "nowrap", color: T.text };

  // Sub-menu pages: every section starts collapsed
  // Resolution Analysis: root cause identified -> fix applied Sankey with a month toggle (TV and HSIA notes analysis)
  function resolutionAnalysis(RA, key, noun, methodNote) {
    const mo = skMonth[key] && RA[skMonth[key]] ? skMonth[key] : RA.months[RA.months.length - 1], D = RA[mo];
    const top = [...D.links].sort((a, b) => b[2] - a[2]).slice(0, 3);
    return (
      <>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          {RA.months.map((m) => (
            <button key={m} onClick={() => { setSkMonth({ ...skMonth, [key]: m }); setSkHover(null); }}
              style={{ border: `1px solid ${m === mo ? "transparent" : T.borderStrong}`, background: m === mo ? T.ink : "transparent", color: m === mo ? "#fff" : T.textSecondary, borderRadius: 999, padding: "4px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>{m}</button>
          ))}
          <span style={{ fontSize: 12.5, color: T.textMuted, marginLeft: 6 }}>{fmtNum(D.covered)} of {fmtNum(D.tickets)} {noun} tickets ({Math.round((D.covered / D.tickets) * 100)}%) name both a root cause and a resolution</span>
        </div>
        <ChartCard title="Root cause identified → fix applied" T={T} note="Left: the root cause the agent recorded. Right: the fix they applied. Ribbon width is the number of tickets; hover a node to isolate its flows.">
          <SankeyChart data={D} T={T} hover={skHover} setHover={setSkHover} />
        </ChartCard>
        <p style={{ fontSize: 13, color: T.textSecondary, margin: "12px 2px 0", lineHeight: 1.6 }}>
          Largest flows in {mo}: {top.map((k, i) => <span key={i}>{i ? "; " : ""}<strong>{D.causes[k[0]][0]}</strong> to <strong>{D.fixes[k[1]][0]}</strong> ({fmtNum(k[2])})</span>)}.
        </p>
        <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Tickets from the monthly {noun} agent and technician notes exports whose Agent Notes include the structured "Root cause analysis" and "Resolution" lines the Copilot summary writes into the worklog; tickets without both lines are not in the flow. Each line is keyword-classified to one theme, the one mentioned first, so a ticket appears once. "Other" holds causes or fixes that matched no theme. Shares are indicative and cover about one in {Math.round(D.tickets / D.covered)} tickets. {methodNote}</p></Disclosure>
      </>
    );
  }

  function secFactory(prefix, eyebrow) {
    let n = 0;
    return (title, icon, children) => {
      n += 1;
      return (
        <Section key={`${prefix}-${title}`} num={String(n).padStart(2, "0")} eyebrow={eyebrow} title={title} icon={icon} T={T} collapsible defaultOpen={false}>
          {children}
        </Section>
      );
    };
  }

  function TrendBars({ v, color }) {
    const vals = v.map((x) => x || 0);
    const mx = Math.max(...vals, 1);
    return (
      <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 3, height: 22 }} title={AN_MONTHS.map((m, i) => `${m}: ${v[i]}`).join(" · ")}>
        {vals.map((x, i) => <span key={i} style={{ width: 8, height: Math.max(2, Math.round((x / mx) * 22)), background: color, opacity: i === 2 ? 1 : 0.45, borderRadius: 2 }} />)}
      </span>
    );
  }

  // Latest-vs-prior column movement (index 2 vs 1) with percent
  function Move({ v, goodDown = true, dec = 0, unit = "", bps = false }) {
    if (v[1] == null || v[2] == null) return <span style={{ color: T.textFaint }}>—</span>;
    const d = bps ? deltaBps(v[2], v[1], goodDown, dec) : delta(v[2], v[1], unit, dec, goodDown);
    return <span style={{ whiteSpace: "nowrap" }}><DeltaText d={d} T={T} />{v[1] ? <span style={{ color: T.textFaint, fontSize: 11.5 }}> ({yoyPctText(v[2], v[1])})</span> : null}</span>;
  }

  function MoverCards({ rising, falling, risingTitle = `Rising · ${AN_MOM_FULL}`, fallingTitle = `Falling · ${AN_MOM_FULL}` }) {
    const card = (title, rows, tone) => (
      <div style={{ flex: 1, minWidth: 280, background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${tone === "up" ? T.bad : T.good}`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: tone === "up" ? T.bad : T.good, marginBottom: 8 }}>{title}</div>
        {rows.map((r) => (
          <div key={r.name} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, padding: "3px 0" }}>
            <span style={{ color: T.textSecondary }}>{r.name}</span>
            <span style={{ fontWeight: 700, color: tone === "up" ? T.bad : T.good, whiteSpace: "nowrap" }}>
              {r.delta > 0 ? "▲ +" : "▼ "}{Math.abs(r.delta).toLocaleString()}{r.unit || ""}{r.pct != null && <span style={{ color: T.textFaint, fontWeight: 400 }}> ({r.pct > 0 ? "+" : ""}{r.pct}%)</span>}
            </span>
          </div>
        ))}
      </div>
    );
    return <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 16 }}>{card(risingTitle, rising, "up")}{card(fallingTitle, falling, "down")}</div>;
  }

  function Recs({ items, product = "TV" }) {
    const tagColor = (t) => (t === "Rising" || t === "Emerging" ? T.bad : t === "Falling" ? T.good : T.textMuted);
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((it, i) => (
          <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px", display: "grid", gridTemplateColumns: "64px 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.heading }}>{it.pri}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: tagColor(it.tag) }}>{it.tag}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: T.textSecondary, fontSize: 14 }}>{it.title}</div>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 5, lineHeight: 1.55 }}><b style={{ color: T.textSecondary }}>Evidence:</b> {it.evidence}</div>
              <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 4, lineHeight: 1.55 }}><b style={{ color: T.textSecondary }}>Action:</b> {it.action}</div>
              {it.initiatives && <div style={{ fontSize: 12, color: T.textFaint, marginTop: 5 }}>Linked {product} initiatives: {it.initiatives.join(" · ")}</div>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function MonthHeader({ extra = [] }) {
    return (
      <tr>
        <th style={anTh}>{extra[0] || ""}</th>
        {AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '{AN_YR}</th>)}
        <th style={anTh}>Trend</th>
        <th style={{ ...anTh, textAlign: "right" }}>{AN_MOM}</th>
        {extra.slice(1).map((e) => <th key={e} style={anTh}>{e}</th>)}
      </tr>
    );
  }

  const TV_RECS = [
    { pri: "P1", tag: "Rising", title: "Ethernet-first fix path for legacy STB initialisation failures",
      evidence: "STB No Boot › Stuck on Initializing 3,642 → 4,084 (+12%) is the largest mover of the month and lifted the STB No Boot category 6%; stuck-initialising language in agent comments +11%; VIP5662W mentions +10% and Mediaroom mentions +8% while OPUS mentions are flat (+1%); half of these tickets close as education / no fault and 55% of the dispatches end as STB hardware.",
      action: "Add an InSight auto-check for PVR not reachable with no Ethernet link, publish a self-serve wired-connection flow for VIP5662W, and offer OPUS migration to households with repeat boot tickets.",
      initiatives: ["Revamped OPUS Migration Process", "Equipment Order Fallout Audit"] },
    { pri: "P1", tag: "Rising", title: "OPUS onboarding: Digital Box setup and no-boot",
      evidence: "Digital Box › Setup 1,812 → 2,115 (+17%) and Digital Box › No Boot 1,679 → 1,877 (+12%); Optik Evolution › Setup closures 714 → 811 (+14%) and dispatch-booked language in agent comments +17%; Digital Box carries the highest non-TELUS-caused share of any TV category on field visits (30%), so many of these are setup and shipping problems rather than faults.",
      action: "Put the AI onboarding videos and a guided setup check into the shipment notification and the TV+ app, use shipping telemetry to intercept late or failed deliveries before the customer calls, and audit equipment-order fallout weekly.",
      initiatives: ["AI STB Onboarding Videos", "Shipping Telemetry Automation", "Equipment Order Fallout Audit", "Revamped OPUS Migration Process"] },
    { pri: "P1", tag: "Divergence", title: "Pre-dispatch quality gate to close the agent–technician categorisation gap",
      evidence: "On field visits the divergence between the agent's category and the technician's finding rose 23.1% → 27.0% (+390 bps) and no-fault-found 11.2% → 12.5% (+130 bps), with non-TELUS-caused flat at 14.4%; on all closures divergence is stuck at 65% (52% end as education / no fault) and Education › IPTV closures rose 8%; repeat-issue language appears in 12.8% of agent comments.",
      action: "Gate dispatch on an InSight evidence checklist (RSSI, ONT light level, STB reachability), QA Copilot-assisted notes for a stated diagnosis, and flag repeat contacts for senior-agent handling; target field divergence back under 20%.", initiatives: ["InSight Conviva Video Quality Metrics & Co-pilot Ingestion"] },
    { pri: "P2", tag: "Persistent", title: "Recording: tickets flat, customer voice rising",
      evidence: "Recording Issues tickets are flat (4,663 → 4,669) and Playback Issues fell 24%, but recording is still the #1 theme in agent comments (4,345, +1.5%), recording descriptions in survey verbatims doubled (19 → 38 respondents, 1.06% → 1.77%, +71 bps) and recording fixes fell 79 → 72 while 46% of recording dispatches still end in an STB hardware swap.",
      action: "Keep the PVR defect swarm open, proactively replace VIP5662W PVRs InSight flags as unreachable, and give agents a hardware-vs-software decision tree so recording tickets route to the right fix first time.",
      initiatives: ["Recording Restart Issue Fix", "Recording Deletion Enhancements", "Sports Team Recordings"] },
    { pri: "P2", tag: "Emerging", title: "YouTube app regression (August)",
      evidence: "Apps › YouTube tickets 50 → 235 (+370%) drove the Apps category up 24% and streaming-app language in agent comments up 20%; no matching movement in technician findings, and apps & streaming verbatims fell 80 bps, which points to an app-side release rather than network or hardware.",
      action: "Escalate to the YouTube / TV+ app owner for a hotfix, publish an agent workaround, and watch September volumes before treating it as structural." },
    { pri: "P2", tag: "Rising", title: "Support access and chatbot escalation",
      evidence: "Negative verbatims rose 23.4% → 24.9% (+150 bps) in August; customer service is the largest negative theme (213 → 271 negative mentions, +27%); chatbot verbatims run 25% negative vs 6% positive; customer-wants-a-technician language in agent comments +15%.",
      action: "Add a direct human-escalation path from the chatbot for repeat or unresolved TV issues, tighten hand-off notes between agents, and offer scheduled callbacks for tickets with prior contacts." },
    { pri: "P3", tag: "Falling", title: "Sustain the channel, power-supply and playback fixes",
      evidence: "Recording › Playback Issues −24%, STB No Boot › Red X −16%, Reboot Loop −5%, Video › Pixelization −12%, Manage My Channels −10%; OPUS provisioning closures 443 → 371 (−16%); power-supply field fixes 47 → 33 (−30%). Missing Channels (+7%) and Channel Not Working (+3%) edged back up after June's drop and are worth watching.",
      action: "Keep the channel audit and PSU replacement programs funded through Q4 and move remaining channel verbatims (mostly package and value) to the commercial team.",
      initiatives: ["UUID Auto Sync — Blocking Channels Fix", "Automated Missing TV Channel Audit", "PSU Replacement Campaign"] },
  ];


  function TvTicketAnalysisPage() {
    const K = TVA.tickets;
    const sec = secFactory("tvt", "TV · Notes Analysis");
    const dAll = K.divergence.all, dF = K.divergence.field;
    const catMax = Math.max(...K.agentCat.map((c) => Math.max(...c.v)));
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard T={T} color={colors.TV} icon="tickets" label="TV tickets analysed" value={fmtBig(K.total[2])} sub={`${AN_LAST} · agent + technician notes`}
            deltas={[<Move key="m" v={K.total} />]} />
          <StatCard T={T} color={colors.TV} icon="repairs" label="Field visits" value={fmtPct(K.closure[2].field_visit_pct, 1)} sub={`tickets with a technician determination · ${AN_M2}`}
            deltas={[<span key="a" style={{ color: T.textMuted }}>{AN_M0} {K.closure[0].field_visit_pct}% · {AN_M1} {K.closure[1].field_visit_pct}%</span>]} />
          <StatCard T={T} color={colors.TV} icon="cx" label="Education / no-fault closures" value={fmtPct(dAll[2].nofault, 1)} sub={`share of closed tickets · ${AN_M2}`}
            deltas={[<Move key="m" v={dAll.map((d) => d.nofault)} bps />]} />
          <StatCard T={T} color={colors.TV} icon="issues" label="Categorisation divergence" value={fmtPct(dAll[2].reattribution, 1)} sub="closure domain ≠ agent category · all closures"
            deltas={[<Move key="m" v={dAll.map((d) => d.reattribution)} bps />]} />
          <StatCard T={T} color={colors.TV} icon="issues" label="Field-visit divergence" value={fmtPct(dF[2].reattribution, 1)} sub="technician finding ≠ agent category"
            deltas={[<Move key="m" v={dF.map((d) => d.reattribution)} bps />]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          {fmtNum(K.total[0] + K.total[1] + K.total[2])} TV tickets, {AN_M0} – {AN_LAST} (the October export runs to the 30th); movements compare {AN_LAST} with {AN_FULL[1]}. Agent grouping = Category 1–3 and Agent Notes; closure grouping = Resolution 1–3 and Resolution Text (a technician determination is present on {K.closure[2].field_visit_pct}% of tickets; the rest are agent closures). Text themes are keyword-classified and indicative.
        </p>

        {sec("Top issues by agent categorisation", "tickets",
          <>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Category 1 (agent)", `Share · ${AN_M2}`]} /></thead>
                <tbody>
                  {K.agentCat.map((c) => (
                    <tr key={c.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: Math.max(4, Math.round((c.v[2] / catMax) * 90)), height: 8, background: colors.TV, opacity: 0.7, borderRadius: 3 }} />{c.name}
                        </span>
                      </td>
                      {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                      <td style={anTd}><TrendBars v={c.v} color={colors.TV} /></td>
                      <td style={anNum}><Move v={c.v} /></td>
                      <td style={{ ...anNum, color: T.textMuted }}>{(c.v[2] / K.total[2] * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Sub-category movers (Category 1 › Category 2)</div>
            <MoverCards rising={K.rising} falling={K.falling} />
            <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Movers rank sub-categories with at least 150 tickets in Sep or Oct by absolute change (Oct vs Sep). The September risers have stopped rising: STB No Boot › Stuck on Initializing eased 182 tickets (−3.5%, with the export ending on 30 Oct), Digital Box › No Boot fell 218 (−9.1%) and Reboot Loop 148 (−13.8%). The October risers are picture quality: Video Issues › Stop/Stuttering/Freezing +431 (+18.7%) and Pixelization +128 (+43.0%), with Channel Issues › Missing Channels +141 (+7.3%).</p></Disclosure>
          </>
        )}

        {sec("Agent vs technician categorisation", "issues",
          <>
            <Disclosure label="About this section" T={T} style={{ margin: "0 0 14px" }}><p style={{ fontSize: 12.5, color: T.textMuted, margin: 0, lineHeight: 1.6 }}>
              Each agent Category 1 maps to a symptom domain, each closure (Resolution 1–2) to a cause domain. <b style={{ color: T.textSecondary }}>Alignment</b> means the closure domain is one the symptom would predict (STB No Boot closing as STB hardware or connectivity, for example); <b style={{ color: T.textSecondary }}>divergence</b> is everything else, with <b style={{ color: T.textSecondary }}>education / no fault</b> broken out because it is the single largest cause. The left panel scores every closed ticket; the right panel scores only tickets with a written technician determination, the purest agent-vs-tech comparison.
            </p></Disclosure>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 16 }}>
              {[["All closures (agent or technician)", dAll, false], ["Field visits only (technician determination)", dF, true]].map(([title, D, isField]) => (
                <div key={title} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, marginBottom: 8 }}>{title}</div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={anTh}>Indicator</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m}</th>)}<th style={{ ...anTh, textAlign: "right" }}>Δ</th></tr></thead>
                    <tbody>
                      {[["Divergence score (re-attributed)", "reattribution", true], ["Aligned with agent category", "alignment", false], ["Closed as education / no fault", "nofault", true]]
                        .concat(isField ? [["Determined non-TELUS caused", "nontelus", true]] : [])
                        .map(([label, key, goodDown]) => (
                          <tr key={key}>
                            <td style={{ ...anTd, color: T.textSecondary, fontWeight: key === "reattribution" ? 700 : 500 }}>{label}</td>
                            {D.map((d, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{d[key]}%</td>)}
                            <td style={anNum}><Move v={D.map((d) => d[key])} bps goodDown={goodDown} /></td>
                          </tr>
                        ))}
                      <tr><td style={{ ...anTd, color: T.textFaint, fontSize: 11.5 }}>{isField ? "Field visits" : "Closed tickets"}</td>{D.map((d, i) => <td key={i} style={{ ...anNum, color: T.textFaint, fontSize: 11.5 }}>{fmtNum(isField ? d.visits : d.closed)}</td>)}<td style={anTd} /></tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>By agent category — all closures, {AN_LAST}</div>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Agent category</th><th style={{ ...anTh, textAlign: "right" }}>Tickets</th><th style={{ ...anTh, textAlign: "right" }}>Aligned</th><th style={{ ...anTh, textAlign: "right" }}>Divergence</th><th style={{ ...anTh, textAlign: "right" }}>Education / no fault</th><th style={anTh}>Most common closure domains</th></tr></thead>
                <tbody>
                  {K.divergence.perCat.map((c) => (
                    <tr key={c.cat}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.cat}</td>
                      <td style={anNum}>{fmtNum(c.n)}</td>
                      <td style={anNum}>{c.alignment}%</td>
                      <td style={{ ...anNum, fontWeight: 700, color: 100 - c.alignment >= 70 ? T.bad : T.text }}>{(100 - c.alignment).toFixed(1)}%</td>
                      <td style={anNum}>{c.nofault}%</td>
                      <td style={{ ...anTd, color: T.textMuted }}>{c.techTop.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>By agent category — field visits only, {AN_LAST}</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Agent category</th><th style={{ ...anTh, textAlign: "right" }}>Visits</th><th style={{ ...anTh, textAlign: "right" }}>Aligned</th><th style={{ ...anTh, textAlign: "right" }}>No fault found</th><th style={{ ...anTh, textAlign: "right" }}>Non-TELUS caused</th><th style={anTh}>Technician's top finding</th></tr></thead>
                <tbody>
                  {K.divergence.perCatField.map((c) => (
                    <tr key={c.cat}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.cat}</td>
                      <td style={anNum}>{fmtNum(c.n)}</td>
                      <td style={{ ...anNum, color: c.alignment < 65 ? T.bad : T.text }}>{c.alignment}%</td>
                      <td style={anNum}>{c.nofault}%</td>
                      <td style={{ ...anNum, color: c.nontelus >= 25 ? T.bad : T.text }}>{c.nontelus}%</td>
                      <td style={{ ...anTd, color: T.textMuted }}>{c.techTop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Reading the gap: Channel Issues and Recording Issues carry the widest divergence on all closures (87% and 76%), driven by education closures; on field visits, HS & TV Affected (63% aligned) and Recording Issues (65%, technicians most often find STB hardware) are the weakest matches and Digital Box has the highest non-TELUS-caused share (26%).</p></Disclosure>
          </>
        )}

        {sec("Technician closures and fixes", "repairs",
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 16 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><MonthHeader extra={["Resolution 1 (closure)"]} /></thead>
                  <tbody>
                    {K.techR1.map((c) => (
                      <tr key={c.name}>
                        <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                        {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                        <td style={anTd}><TrendBars v={c.v} color={colors.TV} /></td>
                        <td style={anNum}><Move v={c.v} goodDown={c.name !== "Education" && c.name !== "Customer"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, marginBottom: 8 }}>Technician determination · field visits</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={anTh}>Determination</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m}</th>)}<th style={{ ...anTh, textAlign: "right" }}>{AN_M2} share</th></tr></thead>
                  <tbody>
                    {[["TELUS caused (no fee)", 0], ["Non-TELUS caused (fee applied)", 1]].map(([label, idx]) => (
                      <tr key={label}>
                        <td style={{ ...anTd, color: T.textSecondary, fontWeight: 600 }}>{label}</td>
                        {K.determination.map((d, i) => <td key={i} style={anNum}>{fmtNum(d[idx])}</td>)}
                        <td style={{ ...anNum, fontWeight: 700, color: idx === 1 ? T.bad : T.text }}>{(K.determination[2][idx] / (K.determination[2][0] + K.determination[2][1]) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Non-TELUS-caused visits eased to 16.6% of determinations in October from 17.9% in September, still above August's 14.4%, so about one in six dispatches reaches a home where the fault is customer equipment or setup.</p></Disclosure>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>What technicians fixed (themes in Resolution Text, field visits)</div>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Fix theme"]} /></thead>
                <tbody>
                  {K.fixes.map((c) => (
                    <tr key={c.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                      {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                      <td style={anTd}><TrendBars v={c.v} color={colors.TV} /></td>
                      <td style={anNum}><Move v={c.v} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Closure movers (Resolution 1 › Resolution 2)</div>
            <MoverCards rising={K.techRising} falling={K.techFalling} />
          </>
        )}

        {sec("What agents are writing", "notes",
          <>
            <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
              Themes are keyword-classified from the agent's own comment block (system diagnostic text excluded). A written agent comment was found on {fmtNum(K.commentCoverage[2])} of {fmtNum(K.total[2])} {AN_LAST} tickets; counts are tickets whose comment mentions the theme.
            </p>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Theme in agent comments"]} /></thead>
                <tbody>
                  {K.themes.map((c) => (
                    <tr key={c.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                      {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                      <td style={anTd}><TrendBars v={c.v} color={colors.TV} /></td>
                      <td style={anNum}><Move v={c.v} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
              <div style={{ overflowX: "auto" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Equipment mentioned in notes</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><MonthHeader extra={["Device"]} /></thead>
                  <tbody>
                    {K.devices.map((c) => (
                      <tr key={c.name}>
                        <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                        {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                        <td style={anTd}><TrendBars v={c.v} color={colors.TV} /></td>
                        <td style={anNum}><Move v={c.v} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Platform mentioned in notes</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><MonthHeader extra={["Platform"]} /></thead>
                  <tbody>
                    {K.platform.map((c) => (
                      <tr key={c.name}>
                        <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                        {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                        <td style={anTd}><TrendBars v={c.v} color={c.name.startsWith("OPUS") ? colors.OPUS : colors.LEGACY} /></td>
                        <td style={anNum}><Move v={c.v} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Legacy Mediaroom mentions fell back in October (VIP5662W PVR −9%, VIP5602W wireless STB −2%, Mediaroom −6%) while OPUS mentions edged up (+2%), consistent with the By Platform split where Legacy still carries two thirds of TV tickets on a shrinking base.</p></Disclosure>
              </div>
            </div>
          </>
        )}

        {sec("Resolution Analysis", "repairs", resolutionAnalysis(TV_RESOLUTION, "TV", "TV", "Pik TV is not separated in the exports. Method: analysis/tv/resolution_flows.py."))}

        {sec("Recommendations", "initiatives", <Recs items={TV_RECS.filter((r) => ["P1", "P3"].includes(r.pri) || r.tag === "Emerging")} />)}
      </>
    );
  }

  function TvSentimentPage() {
    const S = TVA.survey;
    const sec = secFactory("tvs", "TV · Customer Sentiment");
    const share = (arr, i) => arr[i];
    const themeMovers = S.themes.map((t) => ({ name: t.name, delta: Math.round((t.pct[2] - t.pct[1]) * 100), pct: t.pct[1] ? +((t.pct[2] - t.pct[1]) / t.pct[1] * 100).toFixed(0) : null, unit: " bps" })).filter((t) => t.name !== "Positive: satisfied / no issues");
    const rising = themeMovers.filter((t) => t.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
    const falling = themeMovers.filter((t) => t.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);
    const issueMovers = S.tvIssues.map((t) => ({ name: t.name, delta: Math.round((t.pct[2] - t.pct[1]) * 100), pct: t.pct[1] ? +((t.pct[2] - t.pct[1]) / t.pct[1] * 100).toFixed(0) : null, unit: " bps" }));
    const iRising = issueMovers.filter((t) => t.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
    const iFalling = issueMovers.filter((t) => t.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);
    const supTot = S.support.positive.map((_, i) => S.support.positive[i] + S.support.neutral[i] + S.support.negative[i]);
    const topIssue = S.tvIssues.filter((t) => !t.name.startsWith("Customer service"))[0];
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard T={T} color={colors.TV} icon="base" label="Survey respondents" value={fmtNum(S.respondents[2])} sub="Optik TV survey · Aug 2026" deltas={[<Move key="m" v={S.respondents} goodDown={false} />]} />
          <StatCard T={T} color={colors.TV} icon="sentiment" label="Negative verbatims" value={fmtPct(S.polarity.negative[2], 1)} sub="share of reason-for-rating verbatims · Aug" deltas={[<Move key="m" v={S.polarity.negative} bps />]} />
          <StatCard T={T} color={colors.TV} icon="sentiment" label="Positive verbatims" value={fmtPct(S.polarity.positive[2], 1)} sub="share · Aug" deltas={[<Move key="m" v={S.polarity.positive} bps goodDown={false} />]} />
          <StatCard T={T} color={colors.TV} icon="tv" label={`Top TV issue: ${topIssue.name.split(" /")[0]}`} value={fmtPct(topIssue.pct[2], 2)} sub="respondents describing it · Aug" deltas={[<Move key="m" v={topIssue.pct} bps />]} />
          <StatCard T={T} color={colors.TV} icon="cx" label="Chatbot verbatims negative" value={fmtPct(S.support.negative[2] / supTot[2] * 100, 1)} sub={`of ${fmtNum(supTot[2])} digital-support comments · Aug`} deltas={[<span key="p" style={{ color: T.textMuted }}>positive {fmtPct(S.support.positive[2] / supTot[2] * 100, 1)}</span>]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          Verbatims only: the general reason-for-rating comments (v1, v2, v3, v6), the TV-specific issue descriptions, and the digital-support comments from the CF&amp;R Optik TV survey, Jun – Aug 2026; movements compare Aug with Jul. Score columns (NPS and ratings) are excluded. Sentiment is a positive/negative lexicon applied to each respondent's combined comments; themes are keyword-classified in English and French.
        </p>

        {sec("Verbatim sentiment", "sentiment",
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={anTh}>Polarity</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th></tr></thead>
                  <tbody>
                    {["positive", "neutral", "negative"].map((p) => (
                      <tr key={p}>
                        <td style={{ ...anTd, fontWeight: 600, color: p === "positive" ? T.good : p === "negative" ? T.bad : T.textSecondary, textTransform: "capitalize" }}>{p}</td>
                        {S.polarity[p].map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{x}% <span style={{ color: T.textFaint, fontSize: 11 }}>({fmtNum(S.polarityN[p][i])})</span></td>)}
                        <td style={anNum}><Move v={S.polarity[p]} bps goodDown={p !== "positive"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                {AN_SURVEY_MONTHS.map((m, i) => (
                  <div key={m} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginBottom: 4 }}>{m} 2026</div>
                    <div style={{ display: "flex", height: 16, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
                      <div style={{ width: `${S.polarity.positive[i]}%`, background: T.good }} title={`positive ${S.polarity.positive[i]}%`} />
                      <div style={{ width: `${S.polarity.neutral[i]}%`, background: T.borderStrong }} title={`neutral ${S.polarity.neutral[i]}%`} />
                      <div style={{ width: `${S.polarity.negative[i]}%`, background: T.bad }} title={`negative ${S.polarity.negative[i]}%`} />
                    </div>
                  </div>
                ))}
                <p style={{ fontSize: 12, color: T.textFaint, marginTop: 8, lineHeight: 1.5 }}>Sentiment moved negative again in August: positive comments fell 110 bps and negative rose 150 bps against July (positive is down 360 bps since June). The shift is concentrated in support-access, price and home-network comments rather than TV reliability itself, which lost 110 bps of share.</p>
              </div>
            </div>
          </>
        )}

        {sec("Themes in customer verbatims", "issues",
          <>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Theme</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} · % of respondents</th>)}<th style={anTh}>Trend</th><th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th><th style={{ ...anTh, textAlign: "right" }}>Negative mentions Jul → Aug</th></tr></thead>
                <tbody>
                  {S.themes.map((t) => {
                    const pos = t.name.startsWith("Positive");
                    return (
                      <tr key={t.name}>
                        <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{t.name}</td>
                        {t.pct.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{x}%</td>)}
                        <td style={anTd}><TrendBars v={t.v} color={pos ? T.good : colors.TV} /></td>
                        <td style={anNum}><Move v={t.pct} bps goodDown={!pos} /></td>
                        <td style={anNum}>{fmtNum(t.neg[1])} → {fmtNum(t.neg[2])} <Move v={t.neg} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <MoverCards rising={rising} falling={falling} risingTitle="Rising share · Aug vs Jul (bps of respondents)" fallingTitle="Falling share · Aug vs Jul (bps of respondents)" />
            <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Customer service and price dominate the reason-for-rating verbatims and carry the most negative mentions; TV reliability sits third and lost share in August. Internet & Wi-Fi (+180 bps), picture and sound (+90 bps), recording (+60 bps) and channels (+60 bps) gained share against July.</p></Disclosure>
          </>
        )}

        {sec("TV-specific issue verbatims", "tv",
          <>
            <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
              Respondents who flagged a TV problem were asked to describe it. Mention rate is the share of all respondents who wrote a description for that issue, so it tracks how many customers experience each problem month to month.
            </p>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>TV issue described</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} · mentions</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug rate</th><th style={anTh}>Trend</th><th style={{ ...anTh, textAlign: "right" }}>Rate Aug vs Jul</th></tr></thead>
                <tbody>
                  {S.tvIssues.map((t) => (
                    <tr key={t.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{t.name}</td>
                      {t.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                      <td style={{ ...anNum, fontWeight: 700 }}>{t.pct[2]}%</td>
                      <td style={anTd}><TrendBars v={t.v} color={colors.TV} /></td>
                      <td style={anNum}><Move v={t.pct} bps /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <MoverCards rising={iRising} falling={iFalling} risingTitle="Rising issue rate · Aug vs Jul (bps)" fallingTitle="Falling issue rate · Aug vs Jul (bps)" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
              {Object.entries(S.quotes).map(([k, qs]) => (
                <div key={k} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, marginBottom: 6 }}>{k} · in their words</div>
                  {qs.map((q, i) => <div key={i} style={{ fontSize: 12.5, color: T.textSecondary, fontStyle: "italic", padding: "3px 0", lineHeight: 1.45 }}>“{q}”</div>)}
                </div>
              ))}
            </div>
          </>
        )}

        {sec("Digital support (chatbot) verbatims", "cx",
          <>
            <table style={{ width: "100%", maxWidth: 640, borderCollapse: "collapse" }}>
              <thead><tr><th style={anTh}>Polarity</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug share</th></tr></thead>
              <tbody>
                {["positive", "neutral", "negative"].map((p) => (
                  <tr key={p}>
                    <td style={{ ...anTd, fontWeight: 600, color: p === "positive" ? T.good : p === "negative" ? T.bad : T.textSecondary, textTransform: "capitalize" }}>{p}</td>
                    {S.support[p].map((x, i) => <td key={i} style={anNum}>{fmtNum(x)}</td>)}
                    <td style={{ ...anNum, fontWeight: 700 }}>{(S.support[p][2] / supTot[2] * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Comments about the chatbot and digital support run roughly four negative for every positive; the recurring complaint is being unable to reach a person for anything beyond a simple question.</p></Disclosure>
          </>
        )}

        {sec("Recommendations", "initiatives",
          <Recs items={[
            TV_RECS[5],
            { pri: "P2", tag: "Rising", title: "Close the loop on recording complaints",
              evidence: "Recording is the fastest-growing TV issue in verbatims: descriptions doubled from 19 to 38 respondents between July and August (1.06% → 1.77%, +71 bps) while recording tickets stayed flat, and customers describe lost second halves of recordings, PVR lists disappearing and shows recording that were never scheduled.",
              action: "Pair the recording defect swarm with proactive outreach to customers who logged recording tickets, and add a recording-health check to the TV+ app.", initiatives: ["Recording Restart Issue Fix", "Recording Deletion Enhancements"] },
            { pri: "P2", tag: "Persistent", title: "Make freezing and interruptions visible before customers call",
              evidence: "Interruptions, freezing and restarts are the most-described TV issue every month (3.87% of respondents in August, 4.06% in July); picture-quality descriptions are steady at 2.7%, and Internet & Wi-Fi is the fastest-growing general theme (+180 bps).",
              action: "Use Conviva video-quality metrics to trigger proactive Wi-Fi and STB checks, and publish a plain-language self-serve guide for wireless STB placement.", initiatives: ["Low RSSI + Low Bitrate Proactive Campaign", "InSight Conviva Video Quality Metrics & Co-pilot Ingestion"] },
            { pri: "P3", tag: "Persistent", title: "Remote control pairing and responsiveness",
              evidence: "Remote descriptions edged up again (0.89% → 0.98% of respondents, +9 bps; almost double June's 0.52%) while Remote tickets were flat (−2%) and technician remote fixes fell 83 → 66.",
              action: "Ship a pairing and responsiveness troubleshooter in the TV+ app and agent Copilot, and review the new TV+ remote's button parity, which customers call out directly." },
          ]} />
        )}
      </>
    );
  }

  function TvCrossPage() {
    const sec = secFactory("tvx", "TV · Cross Analysis");
    const verdictColor = (v) => (v.startsWith("Rising") || v.startsWith("Emerging") ? T.bad : v.startsWith("Falling") ? T.good : T.textMuted);
    const MATRIX = [
      { driver: "Legacy STB initialisation (Mediaroom)", tickets: "Stuck on Initializing 3,642 → 4,084 (+12%); STB No Boot category +6%", notes: "Stuck-initialising theme 1,593 → 1,773 (+11%); VIP5662W mentions +10%, Mediaroom +8%, OPUS +1%", tech: "80% aligned; STB hardware is the finding in 55% of visits; STB replacements 264 → 223 (−16%)", voice: "Interruptions / restarts 4.06% → 3.87% of respondents (−19 bps)", verdict: "Rising · ticket and notes led, ageing hardware" },
      { driver: "OPUS onboarding (Digital Box setup / no boot)", tickets: "Digital Box › Setup 1,812 → 2,115 (+17%); Digital Box › No Boot +12%", notes: "Dispatch-booked theme +17%; swap / replacement-shipped theme +1.5%", tech: "Optik Evolution › Setup closures 714 → 811 (+14%); Digital Box visits 30% non-TELUS caused", voice: "Set-top box / equipment theme 14.3% → 13.7% (−60 bps)", verdict: "Rising · onboarding and shipping, not faults" },
      { driver: "Recording / PVR", tickets: "Recording Issues flat, 4,663 → 4,669; Playback Issues −24%", notes: "Recording is still the #1 agent-comment theme, 4,280 → 4,345 (+1.5%)", tech: "Recording fixes 79 → 72 (−9%); 60% aligned; STB hardware the top finding", voice: "Recording descriptions 1.06% → 1.77% of respondents (+71 bps; 19 → 38 mentions)", verdict: "Persistent · customer voice rising" },
      { driver: "Wi-Fi / home network and wireless STB", tickets: "Connectivity › STB/PVR closures 2,976 → 3,140 (+5.5%)", notes: "Modem / gateway theme +12.5%; Ethernet / cabling +8%; Wi-Fi / wireless STB +2.6%", tech: "WAP and wireless STB placement 189 → 175 (−7%), still the #2 fix", voice: "Internet & Wi-Fi theme 14.9% → 16.7% (+180 bps), the largest verbatim riser; negative mentions 99 → 150", verdict: "Rising · high customer impact" },
      { driver: "Support friction and repeat contacts", tickets: "Repeat-issue language in 12.8% of agent comments; all-closure divergence flat at 65%", notes: "Customer wants tech / refuses troubleshooting 291 → 336 (+15%)", tech: "Field divergence 23.1% → 27.0% (+390 bps); no fault found 11.2% → 12.5%; non-TELUS caused flat at 14.4%", voice: "Negative verbatims 23.4% → 24.9% (+150 bps); customer-service negative mentions 213 → 271 (+27%); chatbot 25% negative", verdict: "Rising · diagnosis gap and sentiment" },
      { driver: "Streaming apps (YouTube)", tickets: "Apps › YouTube 50 → 235 (+370%); Apps +24%", notes: "Streaming-app theme 743 → 892 (+20%)", tech: "No dispatch signal", voice: "Apps & streaming 5.8% → 5.0% (−80 bps)", verdict: "Emerging · August app regression" },
      { driver: "Channel availability", tickets: "Missing Channels +7%; Channel Not Working +3%; Manage My Channels −10%", notes: "Channel-missing theme 2,809 → 2,950 (+5%)", tech: "Optik Evolution › Provisioning closures 443 → 371 (−16%)", voice: "Channels / content 15.9% → 16.5% (+60 bps), mostly package and value, not faults", verdict: "Watch · June fix holding, small rebound" },
      { driver: "Power supply / boot failures", tickets: "STB No Boot › Red X −16%; Reboot Loop −5%", notes: "Power theme 1,052 → 1,095 (+4%)", tech: "Power-supply fixes 47 → 33 (−30%); cabling fixes 22 → 15", voice: "Not raised", verdict: "Falling · PSU campaign effect" },
    ];
    const rising = [
      { name: "Legacy STB initialisation", src: "tickets +12% · notes +11% · Mediaroom mentions +8%" },
      { name: "OPUS onboarding / Digital Box setup", src: "tickets +17% · Optik Evolution › Setup closures +14%" },
      { name: "Wi-Fi / home network", src: "verbatims +180 bps · gateway theme +12.5% · cabling +8%" },
      { name: "Support friction / repeat contacts", src: "field divergence +390 bps · negative verbatims +150 bps" },
      { name: "YouTube app (emerging)", src: "tickets +370% in August" },
    ];
    const falling = [
      { name: "Recording playback issues", src: "tickets −24% · recording fixes −9%" },
      { name: "Boot failures: Red X and Reboot Loop", src: "tickets −16% and −5% · STB replacements −16%" },
      { name: "Power supply", src: "PSU fixes −30%" },
      { name: "OPUS provisioning", src: "closures −16%" },
      { name: "Customer training closures", src: "Customer › Training / Education −9%" },
    ];
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard T={T} color={colors.TV} icon="issues" label="Confirmed rising drivers" value="3" sub="tickets, notes, technician and verbatims agree" deltas={[<span key="a" style={{ color: T.textMuted }}>legacy STB boot, OPUS onboarding, support friction</span>]} />
          <StatCard T={T} color={colors.TV} icon="cross" label="Emerging driver" value="1" sub="ticket-only signal so far" deltas={[<span key="a" style={{ color: T.textMuted }}>YouTube app, August</span>]} />
          <StatCard T={T} color={colors.TV} icon="initiatives" label="Falling drivers" value="2" sub="fixes visible in every source" deltas={[<span key="a" style={{ color: T.textMuted }}>recording playback, power supply</span>]} />
          <StatCard T={T} color={colors.TV} icon="repairs" label="Field-visit divergence" value={fmtPct(TVA.tickets.divergence.field[2].reattribution, 1)} sub={`technician finding ≠ agent category · ${AN_M2}`} deltas={[<Move key="m" v={TVA.tickets.divergence.field.map((d) => d.reattribution)} bps />]} />
          <StatCard T={T} color={colors.TV} icon="sentiment" label="Negative verbatims" value={fmtPct(TVA.survey.polarity.negative[2], 1)} sub="reason-for-rating comments · Aug" deltas={[<Move key="m" v={TVA.survey.polarity.negative} bps />]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          Each driver is read across four lenses, comparing Aug 2026 with Jul 2026: ticket categories (agent), agent comment themes, technician findings on field visits, and customer survey verbatims. A driver is confirmed when the direction agrees across sources; ticket-only movement is flagged as emerging.
        </p>

        {sec("Signal alignment matrix", "cross",
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Driver", "Ticket trend", "Agent notes", "Technician findings", "Customer verbatims", "Verdict"].map((h) => <th key={h} style={{ ...anTh, whiteSpace: "normal" }}>{h}</th>)}</tr></thead>
              <tbody>
                {MATRIX.map((r) => (
                  <tr key={r.driver}>
                    <td style={{ ...anTd, fontWeight: 700, color: T.textSecondary, width: "13%", whiteSpace: "normal", lineHeight: 1.4 }}>{r.driver}</td>
                    <td style={{ ...anTd, color: T.textMuted, width: "18%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.tickets}</td>
                    <td style={{ ...anTd, color: T.textMuted, width: "18%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.notes}</td>
                    <td style={{ ...anTd, color: T.textMuted, width: "18%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.tech}</td>
                    <td style={{ ...anTd, color: T.textMuted, width: "18%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.voice}</td>
                    <td style={{ ...anTd, fontWeight: 700, color: verdictColor(r.verdict), width: "15%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sec("Consolidated rising and falling drivers", "issues",
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[["Rising", rising, T.bad], ["Falling", falling, T.good]].map(([title, items, col]) => (
              <div key={title} style={{ flex: 1, minWidth: 300, background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${col}`, borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: col, marginBottom: 8 }}>{title} · Aug vs Jul 2026</div>
                {items.map((it, i) => (
                  <div key={it.name} style={{ padding: "6px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary }}>{i + 1}. {it.name}</div>
                    <div style={{ fontSize: 12, color: T.textFaint, marginTop: 2 }}>{it.src}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {sec("Prioritised recommendations", "initiatives", <Recs items={TV_RECS} />)}
      </>
    );
  }

  // Recommendations from the CF&R TELUS Internet survey (Jun–Aug 2026).
  const HSIA_SENTIMENT_RECS = [
    { pri: "P1", tag: "Rising", title: "Reach the customers who hit a problem and never call",
      evidence: "Respondents who had an issue but did not contact TELUS rate reliability fair or poor 55.3% of the time in August, against 32.7% for those who did contact and 6.7% for those with no issue. They are also the only group deteriorating materially, up from 46.5% in July, and they are 14.6% of the base (367 respondents).",
      action: "Treat proactive detection as a perception programme, not only a ticket-deflection one: measure the GPONe degradation and Wi-Fi campaigns on reach into this silent cohort, and add a post-detection follow-up for faults that were fixed without the customer ever contacting support.",
      initiatives: ["GPONe Fibre Degradation Proactive Campaign", "Wi-Fi Scaling — Proactive Campaigns", "Fibre Check — Severely Degraded from the OLT"] },
    { pri: "P1", tag: "Rising", title: "Connection loss is the driver to fix first",
      evidence: "Among the 473 respondents rating reliability fair or poor in August, frequent loss of connection is selected by 46.1%, ahead of inconsistent speeds (37.8%), slow speeds (32.1%) and home Wi-Fi (30.7%). This matches the ticket data, where Connection Instability and Disconnects is the largest HSIA pain point at 34,889 tickets.",
      action: "Keep the degraded-fibre and ONT detection work as the top reliability investment, and report it against the survey driver as well as ticket volume so the perception shift is visible.",
      initiatives: ["Fibre Check — Severely Degraded from the OLT", "Fibre Check — Bit Errors & Critical Alarms", "DIY Revamp Live ONT Check"] },
    { pri: "P1", tag: "Gap", title: "Close the Wi-Fi importance-versus-performance gap",
      evidence: "In August 28.9% rate Wi-Fi performance at home fair or poor and 27.4% say the same of Wi-Fi coverage, while the July importance battery puts both above 85%. Connection stability carries the highest importance of any attribute at 89.8% with 25.1% rating it fair or poor.",
      action: "Prioritise the Wi-Fi attributes in the reliability roadmap: these carry the largest product of importance and dissatisfaction, so each point of improvement moves overall perception more than any other attribute. Online gaming scores as badly but only 45.6% call it important, so it should not compete for the same investment.",
      initiatives: ["Cloudcheck Fine Tuning", "Wi-Fi RouteThis RAVA Pilot Proactive Campaign", "Technician WiFi Certification Tool"] },
    { pri: "P2", tag: "Rising", title: "Price and contact friction outweigh network themes in the open comments",
      evidence: "Price and value appears in 34.7% of reason-for-rating verbatims and customer service in 31.6%, both rising since June, against 20.0% for speeds and 13.1% for connection drops. Negative sentiment has risen in each of the three months, from 21.2% to 24.2%.",
      action: "Set expectations with the leadership team that reliability work alone will not lift overall sentiment while pricing and contact friction remain the loudest topics; pair the reliability roadmap with the contact-reduction and pricing-transparency work when reporting perception.",
      initiatives: [] },
    { pri: "P3", tag: "Falling", title: "Keep the chatbot improvement going, then fix escalation",
      evidence: "Negative chatbot comments fell from 28.5% of chatbot verbatims in July to 20.8% in August, the clearest improvement in the survey, even as comment volume grew from 638 to 789. The dominant remaining complaint is the inability to reach a person.",
      action: "Hold the current bot-comprehension gains and shift the next round of work to escalation: a visible, fast path to a human when the bot cannot resolve, which is what the remaining negative comments ask for.",
      initiatives: [] }
  ];

  const HSIA_RECS = [
    { pri: "P1", tag: "Rising", title: "No Dataflow: automate the ONT and outage checks before the ticket exists",
      evidence: "Connectivity › No Dataflow is the largest category and the largest mover, 11,676 → 13,151 (+13%), with All Devices Affected +14%; outage language in agent comments rose 6,537 → 7,478 (+14%) and the outage-tagged sub-categories jumped (No Sync › Outage 303 → 640, ONT Not Ranged › Outage 825 → 1,016, Losing Sync › Outage +41%). 41% of No Dataflow tickets close as education / no fault while field visits find an access-line or ONT fault 52% of the time.",
      action: "Fire the live ONT check and outage lookup from the IVR and self-serve flows so outage-affected and power-off customers are told before an agent is engaged; give agents a one-click ONT reachability, LOS and power verdict; and route confirmed ONT-down cases straight to dispatch.",
      initiatives: ["DIY Revamp Live ONT Check", "Pulse Cluster GUI for Outages", "Service Guarantee: Internet Backup to Cellular"] },
    { pri: "P1", tag: "Rising", title: "Qualify equipment at order time to stop the Incompatible Equipment climb",
      evidence: "Incompatible Equipment › Incompatible 1,656 → 1,994 (+20%) and Connectivity › Incompatible Equipment 1,337 → 1,494 (+12%); combined 2,993 → 3,488 (+17%). 1,185 August field visits carried this code and closed 90% aligned, mostly as an ONT (602) or gateway (406) install, so these are plan-versus-hardware mismatches reaching the truck rather than faults.",
      action: "Run the compatibility check when the speed upgrade is ordered (not when the customer calls), auto-ship the compatible gateway or book the ONT install with the upgrade, and add an InSight banner for plan / ONT / gateway mismatches so agents skip troubleshooting and go straight to fulfilment.",
      initiatives: ["Gigabit Speed Compatibility ICU Intervention", "Improve Provisioning Checks for 3 Gig in InSight", "HSIA Legacy Hardware Upgrades"] },
    { pri: "P1", tag: "Divergence", title: "Evidence gate for Wireless dispatches",
      evidence: "Wireless categories are the weakest match between agent and closure: 33% to 36% aligned on all closures (over half end as education) and only 44% to 46% aligned on field visits, where technicians find an access-line or gateway fault on roughly half the Wi-Fi tickets they attend. Found OK › Not Required closures rose 690 → 965 (+40%) and Avoidable Dispatch +22%; field-visit divergence 13.9% → 15.1% (+120 bps) and non-TELUS-caused 13.2% → 13.8% (+60 bps); Wi-Fi extender closures +19%.",
      action: "Require a RouteThis or Cloudcheck result and a gateway health check before any Wireless ticket is dispatched, route single-device complaints to guided self-serve, and pair the technician Wi-Fi certification with a mandatory KIT test so the visit closes with evidence.",
      initiatives: ["Wi-Fi RouteThis RAVA Pilot Proactive Campaign", "Technician WiFi Certification Tool", "Cloudcheck Fine Tuning", "KIT Test Tool Mandatory Pass on All Jobs"] },
    { pri: "P2", tag: "Rising", title: "Copper No Sync: intercept repeat copper tickets with fibre or WHSIA",
      evidence: "Connectivity › No Sync 3,262 → 3,717 (+14%) with No DSL Light +5% and No Sync › Outage 303 → 640 (+111%); copper / DSL mentions in agent comments +2.6% against fibre mentions +1.2%; legacy Actiontec modem mentions +6%.",
      action: "Trigger the copper-to-fibre repair intercept on the second copper sync ticket in 90 days, offer WHSIA where fibre is not yet built, and prioritise outside-plant pair changes in the clusters driving the outage-tagged tickets.",
      initiatives: ["Copper to Fibre Repair Intercept", "Proactive Intervention C2F Migration", "Copper to WHSIA Technology Change in CSR"] },
    { pri: "P2", tag: "Persistent", title: "Provisioning fallout: stuck orders and profile errors",
      evidence: "NetCracker › Stuck closures 511 → 645 (+26%) while HSIA › Provisioning holds near 1,000 a month (997 → 956); provisioning / profile fixes appear on ~1,100 field visits a month, visits that a back-office correction could have avoided.",
      action: "Auto-retry stuck NetCracker orders and surface the failure to the agent, add a provisioning profile check to InSight for speed-tier tickets, and report fallout by order type weekly.",
      initiatives: ["Improve Provisioning Checks for 3 Gig in InSight"] },
    { pri: "P3", tag: "Falling", title: "Sustain the degraded-fibre, speed and Wi-Fi gains",
      evidence: "Historical Data › Severe Line Issues 2,914 → 2,593 (−11%) and ONT Not Ranged › Alarm Light −6%; Wireless › Slow Speeds −4%, Disconnects −3% and single-device Can't Connect −12%; intermittent-drop language in agent comments −11%, slow-speed language −6.5% and red / alarm-light language −4%; ONT and fibre field fixes −6%.",
      action: "Keep the GPONe degradation and Wi-Fi proactive campaigns funded through Q4, extend Cloudcheck server capacity ahead of the 3 Gig ramp, and track Boost Wi-Fi 7 (BV3) mentions, which rose 39% in a month, for early hardware issues.",
      initiatives: ["GPONe Fibre Degradation Proactive Campaign", "Fibre Check — Severely Degraded from the OLT", "Wi-Fi Scaling — Proactive Campaigns", "Cloudcheck Server Upgrades & Speed Test Improvements"] },
  ];


  function HsiaTicketAnalysisPage() {
    const K = HSA.tickets;
    const sec = secFactory("hst", "HSIA · Notes Analysis");
    const dAll = K.divergence.all, dF = K.divergence.field;
    const catMax = Math.max(...K.agentCat.map((c) => Math.max(...c.v)));
    const mixMax = Math.max(...K.domainMix.flatMap((r) => r.v));
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard T={T} color={colors.HSIA} icon="tickets" label="HSIA tickets analysed" value={fmtBig(K.total[2])} sub={`${AN_LAST} · agent + technician notes`}
            deltas={[<Move key="m" v={K.total} />]} />
          <StatCard T={T} color={colors.HSIA} icon="repairs" label="Field visits" value={fmtPct(K.closure[2].field_visit_pct, 1)} sub={`tickets with a technician determination · ${AN_M2}`}
            deltas={[<span key="a" style={{ color: T.textMuted }}>{AN_M0} {K.closure[0].field_visit_pct}% · {AN_M1} {K.closure[1].field_visit_pct}%</span>]} />
          <StatCard T={T} color={colors.HSIA} icon="cx" label="Education / no-fault closures" value={fmtPct(dAll[2].nofault, 1)} sub={`share of closed tickets · ${AN_M2}`}
            deltas={[<Move key="m" v={dAll.map((d) => d.nofault)} bps />]} />
          <StatCard T={T} color={colors.HSIA} icon="issues" label="Categorisation divergence" value={fmtPct(dAll[2].reattribution, 1)} sub="closure domain ≠ agent category · all closures"
            deltas={[<Move key="m" v={dAll.map((d) => d.reattribution)} bps />]} />
          <StatCard T={T} color={colors.HSIA} icon="issues" label="Field-visit divergence" value={fmtPct(dF[2].reattribution, 1)} sub="technician finding ≠ agent category"
            deltas={[<Move key="m" v={dF.map((d) => d.reattribution)} bps />]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          {fmtNum(K.total[0] + K.total[1] + K.total[2])} HSIA tickets, {AN_M0} – {AN_LAST}, from the weekly notes exports (the October export runs to the 30th); movements compare {AN_LAST} with {AN_FULL[1]}. Agent grouping = Category 1–3 and Agent Notes; closure grouping = Resolution 1–3 and Resolution Text (a technician determination is present on {K.closure[2].field_visit_pct}% of tickets; {K.closure[2].no_closure_code_pct}% carry no closure code). Text themes are keyword-classified and indicative. Customer survey verbatims are not yet available for HSIA, so there is no sentiment page.
        </p>

        {sec("Top issues by agent categorisation", "tickets",
          <>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
              {K.c1.map((c) => (
                <div key={c.name} style={{ flex: 1, minWidth: 150, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted }}>{c.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.heading, marginTop: 2 }}>{fmtNum(c.v[2])} <span style={{ fontSize: 11.5, fontWeight: 500, color: T.textFaint }}>{(c.v[2] / K.total[2] * 100).toFixed(1)}% · {AN_M2}</span></div>
                  <div style={{ fontSize: 12, marginTop: 2 }}><Move v={c.v} /></div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Category 1 › Category 2 (agent)", `Share · ${AN_M2}`]} /></thead>
                <tbody>
                  {K.agentCat.map((c) => (
                    <tr key={c.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: Math.max(4, Math.round((c.v[2] / catMax) * 90)), height: 8, background: colors.HSIA, opacity: 0.7, borderRadius: 3 }} />{c.name}
                        </span>
                      </td>
                      {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                      <td style={anTd}><TrendBars v={c.v} color={colors.HSIA} /></td>
                      <td style={anNum}><Move v={c.v} /></td>
                      <td style={{ ...anNum, color: T.textMuted }}>{(c.v[2] / K.total[2] * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Sub-category movers (Category 1 › 2 › 3)</div>
            <MoverCards rising={K.rising} falling={K.falling} />
            <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Movers rank sub-categories with at least 150 tickets in Sep or Oct by absolute change (Oct vs Sep). October is a broad easing on the access side: Connectivity › No Dataflow › All Devices Affected fell 1,108 tickets (−9.2%), ONT Not Ranged › Alarm Light 443 (−12.0%) and No Sync › No DSL Light 321 (−14.1%). Wi-Fi is the one area still rising: Wireless › Can't Connect › Some Devices Affected is the top riser (+180, +21.4%) and Wireless › Disconnects edged up. Incompatible Equipment and its Connectivity sub-code fell together (3,466 → 3,170, −8.5%).</p></Disclosure>
          </>
        )}

        {sec("Agent vs technician categorisation", "issues",
          <>
            <Disclosure label="About this section" T={T} style={{ margin: "0 0 14px" }}><p style={{ fontSize: 12.5, color: T.textMuted, margin: 0, lineHeight: 1.6 }}>
              Each agent Category 1 › 2 maps to a symptom domain (access line & ONT, gateway / dataflow, speed, Wi-Fi, equipment compatibility); each closure (Resolution 1–2) maps to a cause domain. <b style={{ color: T.textSecondary }}>Alignment</b> means the closure domain is one the symptom would predict (ONT Not Ranged closing as an access-line, ONT or gateway fault, for example); <b style={{ color: T.textSecondary }}>divergence</b> is everything else, with <b style={{ color: T.textSecondary }}>education / no fault</b> broken out because it is the single largest cause. The left panel scores every closed ticket; the right panel scores only tickets with a written technician determination, the purest agent-vs-tech comparison.
            </p></Disclosure>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 16 }}>
              {[["All closures (agent or technician)", dAll, false], ["Field visits only (technician determination)", dF, true]].map(([title, D, isField]) => (
                <div key={title} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, marginBottom: 8 }}>{title}</div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr><th style={anTh}>Indicator</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m}</th>)}<th style={{ ...anTh, textAlign: "right" }}>Δ</th></tr></thead>
                    <tbody>
                      {[["Divergence score (re-attributed)", "reattribution", true], ["Aligned with agent category", "alignment", false], ["Closed as education / no fault", "nofault", true], ["Determined non-TELUS caused", "nontelus", true]]
                        .map(([label, key, goodDown]) => (
                          <tr key={key}>
                            <td style={{ ...anTd, color: T.textSecondary, fontWeight: key === "reattribution" ? 700 : 500 }}>{label}</td>
                            {D.map((d, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{d[key]}%</td>)}
                            <td style={anNum}><Move v={D.map((d) => d[key])} bps goodDown={goodDown} /></td>
                          </tr>
                        ))}
                      <tr><td style={{ ...anTd, color: T.textFaint, fontSize: 11.5 }}>{isField ? "Field visits" : "Closed tickets"}</td>{D.map((d, i) => <td key={i} style={{ ...anNum, color: T.textFaint, fontSize: 11.5 }}>{fmtNum(isField ? d.visits : d.closed)}</td>)}<td style={anTd} /></tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Where closures land — agent symptom domain × closure cause domain, all closures, {AN_LAST}</div>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Agent domain</th><th style={{ ...anTh, textAlign: "right" }}>Closed</th>{K.closureDomains.map((h) => <th key={h} style={{ ...anTh, textAlign: "right", whiteSpace: "normal", fontSize: 10 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {K.domainMix.map((r) => (
                    <tr key={r.agent}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{r.agent}</td>
                      <td style={anNum}>{fmtNum(r.n)}</td>
                      {r.v.map((x, i) => {
                        const share = r.n ? x / r.n : 0;
                        return <td key={i} style={{ ...anNum, background: `rgba(124,83,165,${(0.05 + share * 0.45).toFixed(2)})`, color: T.text, fontWeight: share >= 0.25 ? 700 : 400 }}>{(share * 100).toFixed(0)}%</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>By agent category — all closures, {AN_LAST}</div>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Agent category</th><th style={{ ...anTh, textAlign: "right" }}>Tickets</th><th style={{ ...anTh, textAlign: "right" }}>Aligned</th><th style={{ ...anTh, textAlign: "right" }}>Divergence</th><th style={{ ...anTh, textAlign: "right" }}>Education / no fault</th><th style={anTh}>Most common closure domains</th></tr></thead>
                <tbody>
                  {K.divergence.perCat.map((c) => (
                    <tr key={c.cat}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.cat}</td>
                      <td style={anNum}>{fmtNum(c.n)}</td>
                      <td style={anNum}>{c.alignment}%</td>
                      <td style={{ ...anNum, fontWeight: 700, color: 100 - c.alignment >= 60 ? T.bad : T.text }}>{(100 - c.alignment).toFixed(1)}%</td>
                      <td style={anNum}>{c.nofault}%</td>
                      <td style={{ ...anTd, color: T.textMuted }}>{c.techTop.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>By agent category — field visits only, {AN_LAST}</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Agent category</th><th style={{ ...anTh, textAlign: "right" }}>Visits</th><th style={{ ...anTh, textAlign: "right" }}>Aligned</th><th style={{ ...anTh, textAlign: "right" }}>No fault found</th><th style={{ ...anTh, textAlign: "right" }}>Non-TELUS caused</th><th style={anTh}>Technician's top finding</th></tr></thead>
                <tbody>
                  {K.divergence.perCatField.map((c) => (
                    <tr key={c.cat}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.cat}</td>
                      <td style={anNum}>{fmtNum(c.n)}</td>
                      <td style={{ ...anNum, color: c.alignment < 65 ? T.bad : T.text }}>{c.alignment}%</td>
                      <td style={anNum}>{c.nofault}%</td>
                      <td style={{ ...anNum, color: c.nontelus >= 18 ? T.bad : T.text }}>{c.nontelus}%</td>
                      <td style={{ ...anTd, color: T.textMuted }}>{c.techTop}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Reading the gap: on all closures the Wireless categories diverge most (66% to 67%), driven by education closures; on field visits they are still the weakest match (46% to 51% aligned) because technicians find an access-line or gateway fault on about half of the Wi-Fi tickets they attend. ONT Not Ranged and Historical Data are the best-matched categories (91% to 93% aligned on visits) but ONT Not Ranged carries the highest non-TELUS-caused share (21%).</p></Disclosure>
          </>
        )}

        {sec("Technician closures and fixes", "repairs",
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 16 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><MonthHeader extra={["Resolution 1 (closure)"]} /></thead>
                  <tbody>
                    {K.techR1.map((c) => (
                      <tr key={c.name}>
                        <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                        {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                        <td style={anTd}><TrendBars v={c.v} color={colors.HSIA} /></td>
                        <td style={anNum}><Move v={c.v} goodDown={c.name !== "Education" && c.name !== "Customer"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, marginBottom: 8 }}>Technician determination · field visits</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={anTh}>Determination</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m}</th>)}<th style={{ ...anTh, textAlign: "right" }}>{AN_M2} share</th></tr></thead>
                  <tbody>
                    {[["TELUS caused (no fee)", 0], ["Non-TELUS caused (fee applied)", 1]].map(([label, idx]) => (
                      <tr key={label}>
                        <td style={{ ...anTd, color: T.textSecondary, fontWeight: 600 }}>{label}</td>
                        {K.determination.map((d, i) => <td key={i} style={anNum}>{fmtNum(d[idx])}</td>)}
                        <td style={{ ...anNum, fontWeight: 700, color: idx === 1 ? T.bad : T.text }}>{(K.determination[2][idx] / (K.determination[2][0] + K.determination[2][1]) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Non-TELUS-caused determinations eased again to 12.8% of visits in October (1,608 of 12,585) from 13.4% in September (1,969 of 14,673) and 13.8% in August, while determined visits fell 14.2% with the export ending on 30 Oct. Found OK › Not Required closures kept falling (705 → 452, −35.9%), although Found OK › Avoidable Dispatch rose 27.1% (214 → 272).</p></Disclosure>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>What technicians fixed (themes in Resolution Text, field visits)</div>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Fix theme", `Share of visits · ${AN_M2}`]} /></thead>
                <tbody>
                  {K.fixes.map((c) => (
                    <tr key={c.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                      {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                      <td style={anTd}><TrendBars v={c.v} color={colors.HSIA} /></td>
                      <td style={anNum}><Move v={c.v} /></td>
                      <td style={{ ...anNum, color: T.textMuted }}>{(c.v[2] / dF[2].visits * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Closure movers (Resolution 1 › Resolution 2)</div>
            <MoverCards rising={K.techRising} falling={K.techFalling} />
            <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Fibre work (ONT, light level, splice) is still the largest field fix at 33% of visits and Wi-Fi / Boost placement the second at 29%; both fell about 11% in volume with the smaller October export, and modem replacements fell 19%. Closures moved the same way: Education › HSIA −6.5%, HSIA › Modem/Gateway −14.7%, GPON › Inside Premise Equipment −8.8%, GPON › Outside Plant −12.8% and Found OK › Not Required −35.9%. The few risers are hardware-specific or back-office: Boost Wi-Fi 6 (+28.5%), Found OK › Avoidable Dispatch (+27.1%), NetCracker › Stuck (+10.0%) and Connectivity › Modem/Gateway (+1.6%).</p></Disclosure>
          </>
        )}

        {sec("What agents are writing", "notes",
          <>
            <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
              Themes are keyword-classified from the agent's own comment block (InSight diagnostic text excluded). A written agent comment was found on {fmtNum(K.commentCoverage[2])} of {fmtNum(K.total[2])} {AN_LAST} tickets; counts are tickets whose comment mentions the theme.
            </p>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Theme in agent comments"]} /></thead>
                <tbody>
                  {K.themes.map((c) => (
                    <tr key={c.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                      {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                      <td style={anTd}><TrendBars v={c.v} color={colors.HSIA} /></td>
                      <td style={anNum}><Move v={c.v} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
              <div style={{ overflowX: "auto" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Equipment mentioned in notes</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><MonthHeader extra={["Device"]} /></thead>
                  <tbody>
                    {K.devices.map((c) => (
                      <tr key={c.name}>
                        <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                        {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                        <td style={anTd}><TrendBars v={c.v} color={colors.HSIA} /></td>
                        <td style={anNum}><Move v={c.v} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Access technology mentioned in notes</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><MonthHeader extra={["Access"]} /></thead>
                  <tbody>
                    {K.access.map((c) => (
                      <tr key={c.name}>
                        <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                        {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                        <td style={anTd}><TrendBars v={c.v} color={c.name.startsWith("Copper") ? colors.FFH : colors.HSIA} /></td>
                        <td style={anNum}><Move v={c.v} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Fibre-related mentions (ONT, PureFibre, GPON) fell 2.3% and copper / DSL mentions fell 7.7% in October, tracking the drop in No Sync › No DSL Light tickets (−14.1%). Among Wi-Fi hardware, Boost Wi-Fi 7 (BV3) mentions kept rising (+5.0%) while Boost Wi-Fi 6 (−9.5%) and the older Wi-Fi Hub (−14.0%) both fell back; legacy Actiontec modem mentions fell 10.7%.</p></Disclosure>
              </div>
            </div>
          </>
        )}

        {sec("Resolution Analysis", "repairs", resolutionAnalysis(HSIA_RESOLUTION, "HSIA", "HSIA", "Method: analysis/hsia/resolution_flows.py."))}

        {sec("Recommendations", "initiatives", <Recs items={HSIA_RECS.filter((r) => ["P1", "P3"].includes(r.pri))} product="HSIA" />)}
      </>
    );
  }

  // ------------------------------ SH+ notes analysis ------------------------------
  // Same layout as the HSIA Notes Analysis page, built from the SH+ Assure ticket exports (SHPA).
  const SHPLUS_RECS = [
    { pri: "P1", tag: "Rising", title: "Fix the self-install pairing path",
      evidence: "Self-install support is the largest issue family: TELUS Outdoor 212, Doorbell 138 and Indoor 45 tickets in October (395, about a third of all Assure tickets). Pairing / setup failures are mentioned on 122 tickets, and 61 of the 120 warranty swaps are pairing or setup failures, mostly doorbells that are not discoverable over Bluetooth even after a factory reset.",
      action: "Add a Bluetooth discoverability and Wi-Fi band check to the in-app pairing flow, give mounted-camera customers onboarding guidance, and hand repeat pairing failures to a pro-install booking instead of a second replacement unit." },
    { pri: "P2", tag: "Rising", title: "Stop non-SH+ calls reaching the SH+ queue",
      evidence: "Education › General more than doubled from 43 to 95 tickets and Education › Wi-Fi Settings rose from 10 to 18; about half of Education-coded tickets (50 of 111) are about internet, Wi-Fi or TV rather than SH+.",
      action: "Review IVR and agent routing for internet and TV plan questions, and add a transfer reason code so misrouted calls are not logged as SH+ education tickets." },
    { pri: "P2", tag: "Rising", title: "Login, CASA profile mismatches and TELUS Connect migration",
      evidence: "Login / Access › User Credentials rose from 23 to 54 tickets (28 login / password problems, mostly a customer profile not found or mismatched in CASA); TELUS Connect mentions in agent notes doubled from 16 to 32.",
      action: "Fix the CASA profile match for SH+ sign-in, and publish a migration checklist so customers moving from the TELUS Connect app keep their devices." },
    { pri: "P3", tag: "Falling", title: "Sustain the camera recording gains",
      evidence: "Camera Not Recording fell on both products (Doorbell 72 → 50, Outdoor 81 → 66) and warranty swaps held at 9.9% of tickets, the lowest rate since March.",
      action: "Keep tracking Camera Not Recording and the swap rate monthly; a rebound in either would point back to firmware or hardware changes." }
  ];

  function ShPlusTicketAnalysisPage() {
    const K = SHPA.tickets;
    const sec = secFactory("shpa", "SH+ · Notes Analysis");
    const col = colors["SH+"];
    const catMax = Math.max(...K.agentCat.map((c) => Math.max(...c.v)));
    const pct = (a, b) => (b ? +((a / b) * 100).toFixed(1) : 0);
    const swapRate = K.swaps.map((s, i) => pct(s, K.total[i]));
    const techShare = K.technician.map((s, i) => pct(s, K.total[i]));
    const edu = (K.resolution2.find((r) => r.name === "Education") || { v: [0, 0, 0] }).v;
    const eduShare = edu.map((s, i) => pct(s, K.total[i]));
    const simpleTable = (rows, head, goodDownFor = () => true, shareBase) => (
      <div style={{ overflowX: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><MonthHeader extra={shareBase ? [head, `Share · ${AN_M2}`] : [head]} /></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.name}>
                <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                <td style={anTd}><TrendBars v={c.v} color={col} /></td>
                <td style={anNum}><Move v={c.v} goodDown={goodDownFor(c.name)} /></td>
                {shareBase && <td style={{ ...anNum, color: T.textMuted }}>{(c.v[2] / shareBase[2] * 100).toFixed(1)}%</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard T={T} color={col} icon="tickets" label="SH+ Assure tickets analysed" value={fmtBig(K.total[2])} sub={`${AN_LAST} · agent + technician`}
            deltas={[<Move key="m" v={K.total} />]} />
          <StatCard T={T} color={col} icon="repairs" label="Technician tickets" value={fmtPct(techShare[2], 1)} sub={`${fmtNum(K.technician[2])} tickets with a work order · ${AN_M2}`}
            deltas={[<span key="a" style={{ color: T.textMuted }}>{AN_M0} {techShare[0]}% · {AN_M1} {techShare[1]}%</span>]} />
          <StatCard T={T} color={col} icon="repairs" label="Warranty swaps" value={fmtPct(swapRate[2], 1)} sub={`${fmtNum(K.swaps[2])} tickets resolved by a swap · ${AN_M2}`}
            deltas={[<Move key="m" v={swapRate} bps />]} />
          <StatCard T={T} color={col} icon="cx" label="Education closures" value={fmtPct(eduShare[2], 1)} sub={`Resolution Code 2 = Education · share of tickets · ${AN_M2}`}
            deltas={[<Move key="m" v={eduShare} bps goodDown={false} />]} />
          <StatCard T={T} color={col} icon="notes" label="Tickets with agent notes" value={fmtPct(pct(K.commentCoverage[2], K.total[2]), 1)} sub={`${fmtNum(K.commentCoverage[2])} of ${fmtNum(K.total[2])} tickets · ${AN_M2}`}
            deltas={[<span key="a" style={{ color: T.textMuted }}>{AN_M0} {pct(K.commentCoverage[0], K.total[0])}% · {AN_M1} {pct(K.commentCoverage[1], K.total[1])}%</span>]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          {fmtNum(K.total[0] + K.total[1] + K.total[2])} SH+ Assure tickets, {AN_M0} – {AN_LAST}, from the monthly Assure ticket exports (de-duplicated on ticket ID, so totals differ from the scorecard's Call Tickets); movements compare {AN_LAST} with {AN_FULL[1]}. Agent grouping = Trouble Code 1–3; closure grouping = Resolution Code 1–3, and a warranty swap is Resolution Code 3 = Warranty Swap. Technician tickets are those carrying a work order. Text themes are keyword-classified on the first entry of the agent notes and are indicative. There is no technician fault determination or customer survey for SH+, so this page has no divergence or sentiment sections.
        </p>

        {sec("Top issues by agent categorisation", "tickets",
          <>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
              {K.c1.slice(0, 5).map((c) => (
                <div key={c.name} style={{ flex: 1, minWidth: 150, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted }}>{c.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.heading, marginTop: 2 }}>{fmtNum(c.v[2])} <span style={{ fontSize: 11.5, fontWeight: 500, color: T.textFaint }}>{(c.v[2] / K.total[2] * 100).toFixed(1)}% · {AN_M2}</span></div>
                  <div style={{ fontSize: 12, marginTop: 2 }}><Move v={c.v} /></div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Trouble Code 2 › 3 (agent)", `Share · ${AN_M2}`]} /></thead>
                <tbody>
                  {K.agentCat.map((c) => (
                    <tr key={c.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: Math.max(4, Math.round((c.v[2] / catMax) * 90)), height: 8, background: col, opacity: 0.7, borderRadius: 3 }} />{c.name}
                        </span>
                      </td>
                      {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                      <td style={anTd}><TrendBars v={c.v} color={col} /></td>
                      <td style={anNum}><Move v={c.v} /></td>
                      <td style={{ ...anNum, color: T.textMuted }}>{(c.v[2] / K.total[2] * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Sub-category movers (Trouble Code 2 › 3)</div>
            <MoverCards rising={K.rising} falling={K.falling} />
            <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Movers rank issues with at least 30 tickets in Sep or Oct by absolute change (Oct vs Sep). Education › General more than doubled (43 → 95) and Login / Access › User Credentials rose from 23 to 54, while Camera Not Recording eased on both Doorbell (72 → 50) and Outdoor (81 → 66). Only three issues rose by 10 or more, so the falling list includes small moves. Education was first used as a code in July 2026, so it has no October 2025 comparison.</p></Disclosure>
          </>
        )}

        {sec("Resolutions and warranty swaps", "repairs",
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 16 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><MonthHeader extra={["Resolution Code 2 (closure)"]} /></thead>
                  <tbody>
                    {K.resolution2.map((c) => (
                      <tr key={c.name}>
                        <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{c.name}</td>
                        {c.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                        <td style={anTd}><TrendBars v={c.v} color={col} /></td>
                        <td style={anNum}><Move v={c.v} goodDown={c.name !== "Education"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, marginBottom: 8 }}>Warranty swaps</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={anTh}>Indicator</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m}</th>)}<th style={{ ...anTh, textAlign: "right" }}>Δ</th></tr></thead>
                  <tbody>
                    <tr>
                      <td style={{ ...anTd, color: T.textSecondary, fontWeight: 700 }}>Tickets resolved by a swap</td>
                      {K.swaps.map((d, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(d)}</td>)}
                      <td style={anNum}><Move v={K.swaps} /></td>
                    </tr>
                    <tr>
                      <td style={{ ...anTd, color: T.textSecondary, fontWeight: 500 }}>Swap rate (% of tickets)</td>
                      {swapRate.map((d, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{d}%</td>)}
                      <td style={anNum}><Move v={swapRate} bps /></td>
                    </tr>
                    <tr><td style={{ ...anTd, color: T.textFaint, fontSize: 11.5 }}>All tickets</td>{K.total.map((d, i) => <td key={i} style={{ ...anNum, color: T.textFaint, fontSize: 11.5 }}>{fmtNum(d)}</td>)}<td style={anTd} /></tr>
                  </tbody>
                </table>
                <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Swaps fell from 177 in August (13.4% of tickets, the 12-month peak) to 114 in September and 120 in October (9.9%), the lowest rate since March. A swap is a ticket with Resolution Code 3 = Warranty Swap; all swaps are agent tickets.</p></Disclosure>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Where swaps come from (Trouble Code 2 › 3, tickets resolved by a swap)</div>
            {simpleTable(K.swapIssues, "Trouble Code 2 › 3 (swapped tickets)", () => true, K.swaps)}
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Resolution Code 3 (what the closure was about)</div>
            {simpleTable(K.resolution3, "Resolution Code 3", (n) => n !== "Self-Install Support", K.total)}
          </>
        )}

        {sec("What agents are writing", "notes",
          <>
            <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
              Themes are keyword-classified from the first entry of the agent's own notes (the duplicated resolution entry and links are excluded). A written agent note was found on {fmtNum(K.commentCoverage[2])} of {fmtNum(K.total[2])} {AN_LAST} tickets; counts are tickets whose notes mention the theme, and one ticket can mention several.
            </p>
            {simpleTable(K.themes, "Theme in agent notes")}
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Devices mentioned in notes</div>
            {simpleTable(K.devices, "Device")}
            <Disclosure label="Sources & notes" T={T}><p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>TELUS Connect app migration mentions doubled in October (16 → 32), login / password / access mentions rose from 120 to 157, and offline / disconnect mentions came back to 172 after a low September (138). Pairing / setup failures were steady at 122 against 119. Doorbell (258) and Outdoor camera (218) are the devices named most often. The classification is keyword-based, so treat counts as direction rather than precise measurement.</p></Disclosure>
          </>
        )}

        {sec("Recommendations", "initiatives", <Recs items={SHPLUS_RECS} product="SH+" />)}
      </>
    );
  }

  // ------------------------------ HSIA customer sentiment ------------------------------
  function HsiaSentimentPage() {
    const S = HSS;
    const sec = secFactory("hss", "HSIA · Customer Sentiment");
    const A = S.attributes;
    const chatTot = S.chatbot.positive.map((_, i) => S.chatbot.positive[i] + S.chatbot.neutral[i] + S.chatbot.negative[i]);
    const chatNegPct = chatTot.map((t, i) => (t ? +(S.chatbot.negative[i] / t * 100).toFixed(1) : 0));
    const topDriver = S.drivers[0];
    const bar = (pct, color, max = 100) => (
      <div style={{ background: T.panel, borderRadius: 4, height: 9, width: 90, display: "inline-block", verticalAlign: "middle", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, (pct / max) * 100)}%`, height: "100%", background: color, opacity: 0.75 }} />
      </div>
    );
    // the mover cards are framed as problems, so the "positive / no issues" theme
    // is left out: a rise there is good news and would read as a red flag.
    const themeMovers = S.themes
      .filter((t) => !t.name.startsWith("Positive"))
      .map((t) => ({ name: t.name, delta: Math.round((t.pct[2] - t.pct[1]) * 100) }))
      .filter((t) => t.delta !== 0);
    const rising = themeMovers.filter((t) => t.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);
    const falling = themeMovers.filter((t) => t.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);

    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard T={T} color={colors.HSIA} icon="base" label="Survey respondents" value={fmtNum(S.respondents[2])} sub="CF&R TELUS Internet · Aug 2026" deltas={[<Move key="m" v={S.respondents} goodDown={false} />]} />
          <StatCard T={T} color={colors.HSIA} icon="sentiment" label="Reliability rated fair or poor" value={fmtPct(S.reliability.bottom2[2], 1)} sub={`${fmtNum(S.reliability.bottom2N[2])} of ${fmtNum(S.respondents[2])} respondents · Aug`} deltas={[<Move key="m" v={S.reliability.bottom2} bps />]} />
          <StatCard T={T} color={colors.HSIA} icon="sentiment" label="Negative verbatims" value={fmtPct(S.polarity.negative[2], 1)} sub={`of ${fmtNum(S.verbatimBase[2])} reason-for-rating comments · Aug`} deltas={[<Move key="m" v={S.polarity.negative} bps />]} />
          <StatCard T={T} color={colors.HSIA} icon="tickets" label={`Top driver: ${topDriver.name.toLowerCase()}`} value={fmtPct(topDriver.pct[2], 1)} sub={`of the ${fmtNum(S.driverBase[2])} rating reliability fair or poor · Aug`} deltas={[<Move key="m" v={topDriver.pct} bps />]} />
          <StatCard T={T} color={colors.HSIA} icon="churn" label="Considering switching or cancelling" value={fmtPct(S.churn.at_risk[2], 1)} sub={`${fmtNum(S.churn.at_riskN[2])} respondents · Aug`} deltas={[<Move key="m" v={S.churn.at_risk} bps />]} />
        </div>
        <Disclosure label="About this page" T={T} style={{ marginTop: 12 }}>
          <p style={{ fontSize: 12.5, color: T.textFaint, margin: 0, lineHeight: 1.6 }}>
            CF&R TELUS Internet survey, Jun to Aug 2026, {fmtNum(S.respondents[0])} / {fmtNum(S.respondents[1])} / {fmtNum(S.respondents[2])} respondents. Unweighted counts: the export carries a survey weight which is not applied, so figures match the raw base. Comparisons are Aug against Jul. Rating questions use the five-point Excellent to Poor scale and "fair or poor" is the bottom two boxes. The performance and importance batteries rotate month to month, so they are shown as single-month readings rather than a trend. Verbatim themes and sentiment are keyword-classified, so treat them as direction rather than precise measurement.
          </p>
        </Disclosure>

        {sec("Perceived reliability", "sentiment",
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 18 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Rating of HSIA reliability</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th></tr></thead>
                <tbody>
                  {/* the middle box is not directionally good or bad: customers can leave
                      "Good" in either direction, so its movement is shown untoned. */}
                  {[["Excellent or very good", S.reliability.top2, "good"], ["Good", S.reliability.good, "neutral"], ["Fair or poor", S.reliability.bottom2, "bad"]].map(([lbl, arr, tone]) => (
                    <tr key={lbl}>
                      <td style={{ ...anTd, fontWeight: 600, color: tone === "bad" ? T.bad : T.textSecondary }}>{lbl}</td>
                      {arr.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{x}%</td>)}
                      <td style={anNum}>
                        {tone === "neutral"
                          ? <span style={{ color: T.textMuted, whiteSpace: "nowrap" }}>{arr[2] > arr[1] ? "+" : ""}{Math.round((arr[2] - arr[1]) * 100)} bps</span>
                          : <Move v={arr} bps goodDown={tone === "bad"} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
                Reliability perception is broadly flat but drifting the wrong way: the fair-or-poor share has risen in each of the three months and the top-two-box share sits below its June level.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary, marginBottom: 8 }}>Fair-or-poor reliability by contact behaviour — Aug 2026</div>
              {[["issue_no_contact", "Had an issue, did not contact"], ["contacted", "Contacted TELUS about an issue"], ["no_issue", "No issue in the past month"]].map(([k, lbl]) => {
                const r = S.reliabilityByContact[k];
                return (
                  <div key={k} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, color: T.textSecondary, marginBottom: 4 }}>
                      <span>{lbl} <span style={{ color: T.textFaint }}>(n={fmtNum(r.base[2])})</span></span>
                      <span style={{ fontWeight: 700, color: T.text, whiteSpace: "nowrap" }}>{r.pct[2]}% <Move v={r.pct} bps /></span>
                    </div>
                    <div style={{ background: T.panel, borderRadius: 5, height: 12, overflow: "hidden" }}>
                      <div style={{ width: `${r.pct[2]}%`, height: "100%", background: k === "no_issue" ? T.good : T.bad, opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
              <p style={{ fontSize: 12, color: T.textFaint, marginTop: 8, lineHeight: 1.5 }}>
                Customers who hit a problem and never called are the most negative group and the only one getting materially worse. They rate reliability fair or poor more often than customers who did contact support, so the ticket queue understates the reliability problem.
              </p>
            </div>
          </div>
        )}

        {sec("What drives a poor reliability rating", "issues",
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Driver selected</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th><th style={anTh}></th></tr></thead>
                <tbody>
                  {S.drivers.filter((d) => d.name !== "Other").map((d) => (
                    <tr key={d.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{d.name}</td>
                      {d.pct.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{x}% <span style={{ color: T.textFaint, fontSize: 11 }}>({d.v[i]})</span></td>)}
                      <td style={anNum}><Move v={d.pct} bps /></td>
                      <td style={anTd}>{bar(d.pct[2], colors.HSIA, 50)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
              Asked only of respondents who rated reliability fair or poor ({fmtNum(S.driverBase[0])} / {fmtNum(S.driverBase[1])} / {fmtNum(S.driverBase[2])} in Jun / Jul / Aug). Multi-select, so shares sum above 100%. Connection loss is the single biggest driver, and the connection and speed drivers together dominate, which lines up with Connection Instability and Disconnects being the largest pain point in the ticket data.
            </p>
          </>
        )}

        {sec("Performance against importance", "tickets",
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={anTh}>Service attribute</th>
                  <th style={{ ...anTh, textAlign: "right" }}>Fair or poor · {A.perfMonth}</th>
                  <th style={anTh}></th>
                  <th style={{ ...anTh, textAlign: "right" }}>Important · {A.impMonth}</th>
                  <th style={anTh}>Priority</th>
                </tr></thead>
                <tbody>
                  {A.rows.map((r) => (
                    <tr key={r.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{r.name}</td>
                      <td style={{ ...anNum, fontWeight: 700 }}>{r.pct}% <span style={{ color: T.textFaint, fontSize: 11, fontWeight: 400 }}>(n={fmtNum(r.base)})</span></td>
                      <td style={anTd}>{bar(r.pct, T.bad, 35)}</td>
                      <td style={anNum}>{r.imp == null ? "—" : `${r.imp}%`}</td>
                      <td style={anTd}>
                        {r.imp != null && r.imp >= 75 && r.pct >= 25 && (
                          <span style={{ background: T.bad + "1a", border: `1px solid ${T.bad}55`, color: T.bad, borderRadius: 999, padding: "1px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>Close the gap</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
              Performance is the share rating each attribute fair or poor in {A.perfMonth}; importance is the share calling it important in {A.impMonth}. The two batteries rotate, so they come from different months and are read side by side rather than as a trend. "Close the gap" marks attributes that at least 75% call important and at least 25% rate fair or poor. Online gaming scores badly but only 45.6% call it important, so it ranks lower as a priority.
            </p>
          </>
        )}

        {sec("Verbatim sentiment and themes", "sentiment",
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={anTh}>Polarity</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th></tr></thead>
                  <tbody>
                    {["positive", "neutral", "negative"].map((pl) => (
                      <tr key={pl}>
                        <td style={{ ...anTd, fontWeight: 600, textTransform: "capitalize", color: pl === "positive" ? T.good : pl === "negative" ? T.bad : T.textSecondary }}>{pl}</td>
                        {S.polarity[pl].map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{x}% <span style={{ color: T.textFaint, fontSize: 11 }}>({fmtNum(S.polarityN[pl][i])})</span></td>)}
                        <td style={anNum}><Move v={S.polarity[pl]} bps goodDown={pl !== "positive"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
                  One classification per respondent across the four reason-for-rating verbatims. Sentiment has worsened in each month: negative comments are up 300 bps since June and positive comments down 290 bps.
                </p>
              </div>
              <div>
                {AN_SURVEY_MONTHS.map((m, i) => (
                  <div key={m} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 700, marginBottom: 4 }}>{m} 2026</div>
                    <div style={{ display: "flex", height: 16, borderRadius: 6, overflow: "hidden", border: `1px solid ${T.border}` }}>
                      <div style={{ width: `${S.polarity.positive[i]}%`, background: T.good }} title={`positive ${S.polarity.positive[i]}%`} />
                      <div style={{ width: `${S.polarity.neutral[i]}%`, background: T.borderStrong }} title={`neutral ${S.polarity.neutral[i]}%`} />
                      <div style={{ width: `${S.polarity.negative[i]}%`, background: T.bad }} title={`negative ${S.polarity.negative[i]}%`} />
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: T.textSecondary, marginTop: 4, flexWrap: "wrap" }}>
                  {[["Positive", T.good], ["Neutral", T.borderStrong], ["Negative", T.bad]].map(([l, c]) => (
                    <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 12, height: 10, background: c, borderRadius: 3, display: "inline-block" }} />{l}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", margin: "18px 0 4px" }}>
              {[["Rising themes · Aug vs Jul", rising, "up"], ["Falling themes · Aug vs Jul", falling, "down"]].map(([title, rows, tone]) => (
                <div key={title} style={{ flex: 1, minWidth: 260, background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${tone === "up" ? T.bad : T.good}`, borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: tone === "up" ? T.bad : T.good, marginBottom: 8 }}>{title}</div>
                  {rows.length ? rows.map((r) => (
                    <div key={r.name} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, padding: "3px 0" }}>
                      <span style={{ color: T.textSecondary }}>{r.name}</span>
                      <span style={{ fontWeight: 700, color: tone === "up" ? T.bad : T.good, whiteSpace: "nowrap" }}>{r.delta > 0 ? "▲ +" : "▼ "}{Math.abs(r.delta)} bps</span>
                    </div>
                  )) : <span style={{ fontSize: 12.5, color: T.textFaint }}>No material movement</span>}
                </div>
              ))}
            </div>

            <div style={{ overflowX: "auto", marginTop: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Theme mentioned</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th><th style={{ ...anTh, textAlign: "right" }}>Negative in Aug</th></tr></thead>
                <tbody>
                  {S.themes.map((t) => (
                    <tr key={t.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{t.name}</td>
                      {t.pct.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{x}%</td>)}
                      <td style={anNum}><Move v={t.pct} bps goodDown={!t.name.startsWith("Positive")} /></td>
                      <td style={anNum}>{fmtNum(t.neg[2])} <span style={{ color: T.textFaint, fontSize: 11 }}>({t.v[2] ? Math.round(t.neg[2] / t.v[2] * 100) : 0}%)</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
              Share of respondents whose reason-for-rating comments mention each theme; a comment can carry several themes, so shares sum above 100%. Price and customer service dominate the open comments and both are still rising, while the network themes are steadier. The last column is how often the theme appears in a comment scored negative overall.
            </p>
          </>
        )}

        {sec("Issue descriptions and digital support", "cx",
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary, marginBottom: 8 }}>Themes in the issue descriptions</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Theme</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th></tr></thead>
                <tbody>
                  {S.issueThemes.map((t) => (
                    <tr key={t.name}>
                      <td style={{ ...anTd, fontWeight: 600, color: T.textSecondary }}>{t.name}</td>
                      {t.v.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                      <td style={anNum}><Move v={t.v} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
                Issue-description verbatims mentioning each theme, across the contact, Wi-Fi, connection, streaming, support and Wi-Fi Plus deep-dive questions. Speed and connection complaints lead and both grew in August.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary, marginBottom: 8 }}>Chatbot and digital support comments</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>Polarity</th>{AN_SURVEY_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}</tr></thead>
                <tbody>
                  {["positive", "neutral", "negative"].map((pl) => (
                    <tr key={pl}>
                      <td style={{ ...anTd, fontWeight: 600, textTransform: "capitalize", color: pl === "positive" ? T.good : pl === "negative" ? T.bad : T.textSecondary }}>{pl}</td>
                      {S.chatbot[pl].map((x, i) => <td key={i} style={{ ...anNum, fontWeight: i === 2 ? 700 : 400 }}>{fmtNum(x)}</td>)}
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...anTd, fontWeight: 700, color: T.heading }}>Negative share</td>
                    {chatNegPct.map((x, i) => <td key={i} style={{ ...anNum, fontWeight: 700, color: i === 2 ? T.good : T.text }}>{x}%</td>)}
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>
                Chatbot comments grew with the sample but turned less negative: the negative share fell from {chatNegPct[1]}% in July to {chatNegPct[2]}% in August, the clearest improvement on this page. Needing to reach a person remains the dominant complaint.
              </p>
            </div>
          </div>
        )}

        {sec("What customers said", "sentiment",
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
              {Object.entries(S.quotes).map(([theme, qs]) => (
                <div key={theme} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, marginBottom: 8 }}>{theme}</div>
                  {qs.map((q, i) => (
                    <p key={i} style={{ margin: "0 0 8px", fontSize: 12.5, lineHeight: 1.55, color: T.textSecondary, borderLeft: `2px solid ${T.borderStrong}`, paddingLeft: 10 }}>{q}</p>
                  ))}
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: T.textFaint, marginTop: 12, lineHeight: 1.5 }}>
              August 2026 verbatims that scored clearly negative and match the theme shown, quoted as written including typing errors. No customer identifiers are held in this dashboard.
            </p>
          </>
        )}

        {sec("Recommendations", "initiatives", <Recs items={HSIA_SENTIMENT_RECS} product="HSIA" />)}
      </>
    );
  }

  function HsiaCrossPage() {
    const sec = secFactory("hsx", "HSIA · Cross Analysis");
    const K = HSA.tickets;
    const verdictColor = (v) => (v.startsWith("Rising") || v.startsWith("Emerging") ? T.bad : v.startsWith("Falling") ? T.good : T.textMuted);
    const MATRIX = [
      { driver: "No Dataflow / all devices down", tickets: "No Dataflow 11,676 → 13,151 (+13%); All Devices Affected +14%", looker: "13,340 in Aug 2026 vs 10,305 in Aug 2025 (+29% YoY)", notes: "No-internet theme 10,606 → 11,426 (+8%); outage theme 6,537 → 7,478 (+14%)", tech: "1,813 visits, 85% aligned; access line / ONT is the finding on 52%, gateway on 22%; 12% non-TELUS", verdict: "Rising · confirmed across all three lenses" },
      { driver: "Incompatible equipment (plan vs hardware)", tickets: "Incompatible Equipment › Incompatible 1,656 → 1,994 (+20%); combined with the Connectivity sub-code 2,993 → 3,488 (+17%)", looker: "New category: 2,037 tickets in Aug 2026, none in Aug 2025", notes: "Boost Wi-Fi 7 (BV3) mentions +39%; Boost Wi-Fi 6 +10%; gateway swap-shipped theme +5%", tech: "1,185 visits in Aug, 90% aligned; closed as ONT install (602) or gateway (406); 6% non-TELUS", verdict: "Rising · confirmed, fulfilment not fault" },
      { driver: "Copper No Sync and outage-tagged tickets", tickets: "No Sync 3,262 → 3,717 (+14%); No DSL Light +5%; No Sync › Outage 303 → 640 (+111%); ONT Not Ranged › Outage +23%", looker: "No Sync 4,522 vs 4,104 in Aug 2025 (+10% YoY)", notes: "Copper / DSL mentions +2.6% vs fibre +1.2%; outage theme +14%; Actiontec legacy modem +6%", tech: "1,303 No Sync visits, 90% aligned; access line 58%, provisioning 11%", verdict: "Rising · copper and outage led" },
      { driver: "Wi-Fi misdiagnosis and unfound faults", tickets: "Wireless tickets −1% to −4%, but Found OK › Not Required closures 690 → 965 (+40%) and Avoidable Dispatch +22%", looker: "Wireless › Can't Connect +8% YoY; Disconnects +16% YoY (Aug vs Aug)", notes: "Wi-Fi cannot-connect theme 2,821 → 3,058 (+8%); Boost / extender theme +2.5%", tech: "Wireless visits 44% to 46% aligned; Wi-Fi extender closures +19%; non-TELUS caused 13.2% → 13.8% (+60 bps)", verdict: "Divergence · diagnosis gap, not volume" },
      { driver: "Intermittent connectivity (Losing Sync)", tickets: "Losing Sync 6,269 → 6,391 (+2%); Losing Sync › Outage 203 → 286 (+41%)", looker: "6,707 vs 6,525 in Aug 2025 (+3% YoY)", notes: "Intermittent-drop theme 9,323 → 8,267 (−11%)", tech: "1,974 visits, 82% aligned; access line / ONT 53%, gateway 22%", verdict: "Persistent · tickets flat, agent language down" },
      { driver: "Provisioning fallout", tickets: "Connectivity › Incompatible Equipment › Not Required 850 → 951 (+12%) as codes migrate", looker: "Not separately reported", notes: "Firmware / settings theme −2%", tech: "NetCracker › Stuck 511 → 645 (+26%); HSIA › Provisioning 997 → 956; provisioning fixes flat at ~1,100 visits", verdict: "Rising · back-office signal only" },
      { driver: "Speed complaints", tickets: "Connectivity › Slow Speeds −1%; Wireless › Slow Speeds −4%", looker: "Slow Speeds +10% YoY; Wireless Slow Speeds +11% YoY (Aug 2026 still above Aug 2025)", notes: "Slow-speed / buffering theme 12,547 → 11,736 (−6.5%)", tech: "1,059 visits, 84% aligned; Wi-Fi / Boost fixes +1%", verdict: "Falling · slow improvement on a higher 2026 base" },
      { driver: "Degraded fibre (severe line issues)", tickets: "Historical Data › Severe Line Issues 2,914 → 2,593 (−11%); ONT Not Ranged › Alarm Light −6%", looker: "ONT Not Ranged 7,216 vs 8,536 in Aug 2025 (−15% YoY)", notes: "ONT / fibre / light-level theme −2.6%; red / alarm light theme −4%", tech: "Historical Data visits 93% aligned, 85% access line / ONT; fibre fixes 4,941 → 4,631 (−6%)", verdict: "Falling · proactive fibre programs landing" },
    ];
    const rising = [
      { name: "No Dataflow / all devices down", src: "tickets +13% · notes +8% · outage language +14% · Looker +29% YoY" },
      { name: "Incompatible equipment (plan vs hardware)", src: "tickets +20% · 1,185 visits closing as ONT / gateway installs" },
      { name: "Copper No Sync and outage-tagged tickets", src: "tickets +14% · outage-tagged +111% · copper mentions +2.6%" },
      { name: "Unfound faults and non-TELUS-caused visits", src: "Found OK +40% · non-TELUS caused +60 bps · Wireless visits under 50% aligned" },
      { name: "Provisioning fallout", src: "NetCracker stuck +26%" },
    ];
    const falling = [
      { name: "Degraded fibre / severe line issues", src: "tickets −11% · fibre fixes −6% · ONT Not Ranged −15% YoY" },
      { name: "Intermittent-drop language", src: "agent theme −11% · repeat-issue language −2.5%" },
      { name: "Speed complaints", src: "tickets −1% / −4% · slow-speed notes −6.5%" },
      { name: "Customer training closures", src: "Customer › Training / Education −8%" },
    ];
    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
          <StatCard T={T} color={colors.HSIA} icon="issues" label="Confirmed rising drivers" value="3" sub="tickets, agent notes and technician findings agree" deltas={[<span key="a" style={{ color: T.textMuted }}>no dataflow, incompatible equipment, copper no sync</span>]} />
          <StatCard T={T} color={colors.HSIA} icon="cross" label="Diagnosis gap" value="1" sub="volume flat, closures diverging" deltas={[<span key="a" style={{ color: T.textMuted }}>Wireless dispatches</span>]} />
          <StatCard T={T} color={colors.HSIA} icon="initiatives" label="Falling drivers" value="2" sub="improvement visible in every lens" deltas={[<span key="a" style={{ color: T.textMuted }}>degraded fibre, speed</span>]} />
          <StatCard T={T} color={colors.HSIA} icon="repairs" label="Field-visit divergence" value={fmtPct(K.divergence.field[2].reattribution, 1)} sub={`technician finding ≠ agent category · ${AN_M2}`} deltas={[<Move key="m" v={K.divergence.field.map((d) => d.reattribution)} bps />]} />
          <StatCard T={T} color={colors.HSIA} icon="cx" label="Non-TELUS-caused visits" value={fmtPct(K.divergence.field[2].nontelus, 1)} sub={`share of technician determinations · ${AN_M2}`} deltas={[<Move key="m" v={K.divergence.field.map((d) => d.nontelus)} bps />]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          Each driver is read across the available lenses, comparing Aug 2026 with Jul 2026: ticket categories from the notes export (agent), Looker ticket volumes year over year (Aug 2026 vs Aug 2025), agent comment themes, and technician findings on field visits. A driver is confirmed when the direction agrees across sources. Customer survey verbatims are not yet available for HSIA and will be added as a fifth lens when they are.
        </p>

        {sec("Signal alignment matrix", "cross",
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Driver", "Ticket trend (notes, Aug vs Jul)", "Looker volume (Aug 2026 vs Aug 2025)", "Agent notes", "Technician findings", "Verdict"].map((h) => <th key={h} style={{ ...anTh, whiteSpace: "normal" }}>{h}</th>)}</tr></thead>
              <tbody>
                {MATRIX.map((r) => (
                  <tr key={r.driver}>
                    <td style={{ ...anTd, fontWeight: 700, color: T.textSecondary, width: "13%", whiteSpace: "normal", lineHeight: 1.4 }}>{r.driver}</td>
                    <td style={{ ...anTd, color: T.textMuted, width: "18%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.tickets}</td>
                    <td style={{ ...anTd, color: T.textMuted, width: "15%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.looker}</td>
                    <td style={{ ...anTd, color: T.textMuted, width: "18%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.notes}</td>
                    <td style={{ ...anTd, color: T.textMuted, width: "20%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.tech}</td>
                    <td style={{ ...anTd, fontWeight: 700, color: verdictColor(r.verdict), width: "16%", whiteSpace: "normal", lineHeight: 1.45, fontSize: 12 }}>{r.verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {sec("Consolidated rising and falling drivers", "issues",
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {[["Rising", rising, T.bad], ["Falling", falling, T.good]].map(([title, items, col]) => (
              <div key={title} style={{ flex: 1, minWidth: 300, background: T.surface, border: `1px solid ${T.border}`, borderLeft: `3px solid ${col}`, borderRadius: 10, padding: "12px 16px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: col, marginBottom: 8 }}>{title} · Aug vs Jul 2026</div>
                {items.map((it, i) => (
                  <div key={it.name} style={{ padding: "6px 0", borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary }}>{i + 1}. {it.name}</div>
                    <div style={{ fontSize: 12, color: T.textFaint, marginTop: 2 }}>{it.src}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {sec("Prioritised recommendations", "initiatives", <Recs items={HSIA_RECS} product="HSIA" />)}
      </>
    );
  }

  // ------------------------------ HSIA review (brief) ------------------------------
  // A reading-column brief framed around the "why tickets rose year over year" analysis
  // (HSIA_YOY): the answer first, the driver waterfall, orders, the reactive bucket, the No
  // Dataflow caller profile, then the dashboard's own corroborating evidence (KPIs, technician
  // findings, survey) and the initiatives mapped to the analysis's driver groups.
  // Shared stylesheet for the Review pages (HSIA and TV); `col` is the product colour.
  function briefCss(col, AMBER) {
    const H = T.heading, MUTED = T.textMuted, RULE = T.border;
    return `
.hb{width:100%;display:flex;flex-direction:column;gap:40px;font-family:${FONT};font-size:16px;line-height:1.55;color:${T.text}}
.hb .hb-head{display:flex;flex-direction:column;gap:10px;border-bottom:2px solid ${H};padding-bottom:22px}
.hb .hb-eyebrow{font-family:${FONT};font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${H}}
.hb h1{font-family:${FONT};font-weight:700;font-size:clamp(26px,4vw,36px);letter-spacing:-.01em;line-height:1.12;margin:0;text-wrap:balance;color:${T.text}}
.hb .hb-sub{color:${MUTED};margin:0}
.hb .hb-meta{font-family:${FONT};font-size:12.5px;color:${MUTED};display:flex;flex-wrap:wrap;gap:6px 18px}
.hb h2{font-family:${FONT};font-weight:700;font-size:21px;line-height:1.2;margin:0 0 4px;text-wrap:balance;color:${T.text}}
.hb h3{font-size:14.5px;font-weight:700;margin:0;letter-spacing:.01em}
.hb p{margin:0}
.hb .hb-prose{color:${T.textSecondary}}
.hb section{display:flex;flex-direction:column;gap:14px}
.hb .hb-answer{background:${T.band};border-radius:10px;padding:22px 24px;display:flex;flex-direction:column;gap:12px}
.hb .hb-answer ol{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:10px}
.hb .hb-answer li{padding-left:4px;color:${T.textSecondary}}
.hb .hb-answer strong{color:${H}}
.hb .hb-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.hb .hb-stat{background:${T.surface};border:1px solid ${RULE};border-radius:10px;padding:14px 16px;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,transform .15s ease}
.hb .hb-stat:hover{background:${col}14;border-color:${col};box-shadow:0 6px 18px rgba(0,0,0,.10);transform:translateY(-2px)}
.hb .hb-stat .hb-stat-l{transition:color .15s ease}
.hb .hb-stat:hover .hb-stat-l{color:${col}}
.hb details.hb-sec{display:block;background:${T.surface};border:1px solid ${RULE};border-radius:12px;transition:border-color .15s ease,box-shadow .15s ease}
.hb details.hb-sec:hover{border-color:${col};box-shadow:0 6px 18px rgba(0,0,0,.08)}
.hb details.hb-sec summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:18px 22px;border-radius:12px;user-select:none}
.hb details.hb-sec summary::-webkit-details-marker{display:none}
.hb details.hb-sec summary::before{content:"";flex:none;width:9px;height:9px;border-right:2px solid ${col};border-bottom:2px solid ${col};transform:rotate(-45deg);transition:transform .15s ease;margin-left:4px}
.hb details.hb-sec[open] summary::before{transform:rotate(45deg)}
.hb details.hb-sec[open] summary{border-bottom:1px solid ${RULE};border-radius:12px 12px 0 0}
.hb details.hb-sec summary h2{margin:0;font-size:19px}
.hb details.hb-sec summary:hover h2{color:${col}}
.hb .hb-body{display:flex;flex-direction:column;gap:14px;padding:18px 22px 22px}
.hb .hb-stat-v{font-size:26px;font-weight:700;color:${H};line-height:1.1}
.hb .hb-stat-l{font-size:12.5px;font-weight:600;color:${T.textSecondary};margin-top:5px}
.hb .hb-stat-s{font-size:11.5px;color:${T.textFaint};margin-top:3px;line-height:1.4}
.hb figure{margin:0;background:${T.surface};border:1px solid ${RULE};border-radius:10px;padding:18px 18px 14px;display:flex;flex-direction:column;gap:10px;min-width:0}
.hb figcaption{font-size:14px;color:${MUTED};line-height:1.5}
.hb .hb-figtitle{font-weight:700;font-size:15px;color:${T.text}}
.hb .hb-chart{width:100%;overflow-x:auto}
.hb .hb-legend{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:13px;color:${MUTED}}
.hb .hb-legend span{display:inline-flex;align-items:center;gap:7px}
.hb .hb-sw{width:12px;height:12px;border-radius:2px;display:inline-block}
.hb .hb-tw{overflow-x:auto;border:1px solid ${RULE};border-radius:10px;background:${T.surface}}
.hb table{border-collapse:collapse;width:100%;min-width:560px;font-size:14px}
.hb th,.hb td{padding:9px 12px;text-align:right;border-bottom:1px solid ${RULE};font-variant-numeric:tabular-nums}
.hb th:first-child,.hb td:first-child{text-align:left}
.hb th{font-size:11.5px;text-transform:uppercase;letter-spacing:.06em;color:${MUTED};font-weight:600}
.hb tbody tr:last-child td{border-bottom:0}
.hb td.n{font-family:${FONT};font-size:13.5px;font-variant-numeric:tabular-nums}
.hb td.heat{font-size:12.5px;text-align:center;border-radius:4px}
.hb .hb-flag{font-family:${FONT};font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;border:1px solid currentColor;white-space:nowrap}
.hb .hb-warn{color:${T.bad}} .hb .hb-ok{color:${T.good}} .hb .hb-flat{color:${MUTED}}
.hb .hb-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.hb .hb-note{border-left:3px solid ${AMBER};padding:4px 0 4px 16px;display:flex;flex-direction:column;gap:6px;font-size:14.5px;color:${T.textSecondary}}
.hb .hb-note h3{color:${AMBER}}
.hb .hb-note.ok{border-color:${T.good}} .hb .hb-note.ok h3{color:${T.good}}
.hb .hb-note.purple{border-color:${H}} .hb .hb-note.purple h3{color:${H}}
.hb .hb-note.bad{border-color:${T.bad}} .hb .hb-note.bad h3{color:${T.bad}}
.hb ul.hb-plain{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;color:${T.textSecondary}}
.hb .hb-init{display:grid;grid-template-columns:auto 1fr auto;gap:6px 10px;align-items:center;padding:7px 0;border-bottom:1px solid ${RULE};font-size:14px}
.hb .hb-init:last-child{border-bottom:0}
.hb .hb-init .hb-m{color:${MUTED};font-size:12.5px;grid-column:2}
.hb .hb-imp{font-family:${FONT};font-size:11px;color:${MUTED};white-space:nowrap}
.hb .hb-pill{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px;background:${T.band};color:${H};margin-left:8px;vertical-align:middle}
.hb footer{font-size:13.5px;color:${MUTED};border-top:1px solid ${RULE};padding-top:18px;display:flex;flex-direction:column;gap:6px}
`;
  }

  // HSIA Architecture: the Northstar layered-architecture page, embedded in full (a snapshot of the
  // Claude artifact, kept in site/architecture.html), with the supporting deck one click away.
  function ArchitecturePage() {
    const col = colors.HSIA;
    const link = { color: T.heading, fontWeight: 700, fontSize: 12.5, textDecoration: "underline", background: "transparent", border: "none", padding: 0, cursor: "pointer", fontFamily: FONT };
    return (
      <div style={{ marginTop: 18 }}>
        <p style={{ fontSize: 13.5, color: T.textSecondary, lineHeight: 1.6, margin: "0 0 12px", maxWidth: 820 }}>
          How the HSIA reliability tools should connect, from telemetry in the home up to the customer, agent and technician channels. Each chip is tagged as in use today, in trial or development, ideation, or an open question; hover or focus a chip for detail. Underlined chips open the slide of the supporting deck that expands on them.
        </p>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "0 0 14px" }}>
          <button type="button" style={link} onClick={() => { setPage("hsiaarchdeck"); setDeckSlide(null); }}>Supporting deck: the use cases behind it →</button>
          <a href={ARCHITECTURE_URL} target="_blank" rel="noopener noreferrer" style={link}>Open the original artifact (needs access) →</a>
        </div>
        <ArchView T={T} isDark={isDark} col={col} onOpenDeck={(n) => { setArchSlide(n); setPage("hsiaarchdeck"); setDeckSlide(null); }} />
      </div>
    );
  }

  // HSIA Architecture › Supporting deck: slides 5 to 18 of the Tools Ecosystem deck as one view.
  function ArchitectureDeckPage() {
    return (
      <div style={{ marginTop: 18 }}>
        <ArchDeckView T={T} col={colors.HSIA} startSlide={archSlide} onConsumed={() => setArchSlide(null)} onBack={() => { setPage("hsiaarch"); setDeckSlide(null); }} />
      </div>
    );
  }

  function ArchivePage() {
    return (
      <div style={{ marginTop: 18 }}>
        <p style={{ fontSize: 13.5, color: T.textSecondary, lineHeight: 1.6, margin: "0 0 16px", maxWidth: 760 }}>
          Previously completed reviews and other pages. Archived pages are kept as they were written: they are not refreshed with the monthly update.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
          {ARCHIVE_ITEMS.map((it) => (
            <button key={it.id} onClick={() => { setPage(it.id); setDeckSlide(null); }}
              style={{ textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px", cursor: "pointer", fontFamily: FONT, color: T.text }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>{it.period}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.heading, margin: "4px 0 6px" }}>{it.title} →</div>
              <div style={{ fontSize: 12.5, color: T.textSecondary, lineHeight: 1.55 }}>{it.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function HsiaBriefPage() {
    const col = colors.HSIA, Y = HSIA_YOY;
    const i2 = MONTHS.indexOf(HSIA_REVIEW_LATEST), mi = [i2 - 2, i2 - 1, i2], yi = mi.map((i) => i - 12);
    const mons = mi.map((i) => MONTHS[i]), shortMon = (m) => m.slice(0, 3);
    const range = `${shortMon(mons[0])} – ${shortMon(mons[2])} ${mons[2].slice(-4)}`, prevRange = `${shortMon(mons[0])} – ${shortMon(mons[2])} ${MONTHS[yi[2]].slice(-4)}`;
    const S = { calls: CALLS_SPLIT.HSIA.offered, tv: DATA.ticketVolume.HSIA, tr: DATA.ticketRate.HSIA, rv: DATA.repairVolume.HSIA, rr: DATA.repairRate.HSIA, base: DATA.subBase.HSIA };
    const sum = (arr, idx) => idx.reduce((a, i) => a + (arr[i] || 0), 0), avg = (arr, idx) => sum(arr, idx) / idx.length;
    const pct = (a, b) => (b ? ((a - b) / b) * 100 : null);
    const sp = (x, d = 1) => (x == null ? "n/a" : (x > 0 ? "+" : "") + x.toFixed(d) + "%");
    const sd = (x, d = 2) => (x == null ? "n/a" : (x > 0 ? "+" : "") + x.toFixed(d));
    const ap = (x, d = 1) => (x == null ? "n/a" : Math.abs(x).toFixed(d) + "%");
    const num = (v, d = 0) => (v == null ? "—" : d ? v.toFixed(d) : Math.round(v).toLocaleString());
    const big = fmtBig, sbig = (v) => (v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + fmtBig(Math.abs(v)));
    const sn = (v) => (v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v)).toLocaleString());
    const q = { calls: sum(S.calls, mi), tv: sum(S.tv, mi), rv: sum(S.rv, mi), tr: avg(S.tr, mi), rr: avg(S.rr, mi) };
    const qy = { calls: sum(S.calls, yi), tv: sum(S.tv, yi), rv: sum(S.rv, yi), tr: avg(S.tr, yi), rr: avg(S.rr, yi) };
    const per100 = mi.map((i) => (S.rv[i] / S.tv[i]) * 100);
    const K = HSA.tickets, sv = HSS, svM = sv.months.map((m) => m.slice(0, 3));
    const fibreIdx = DATA.hsiaFibreMonths.indexOf("Sep 2026"), fibre = [2, 1, 0].map((k) => DATA.hsiaFibrePct[fibreIdx - k]);
    const flag = (v, goodDown = true, thr = 3) => {
      if (v == null) return null;
      const tone = Math.abs(v) < thr ? "flat" : (v < 0) === goodDown ? "ok" : "warn";
      return <span className={`hb-flag hb-${tone}`}>{tone === "flat" ? "flat" : v > 0 ? "up" : "down"}</span>;
    };
    const H = T.heading, MUTED = T.textMuted, RULE = T.border;
    const barB = col, barC = T.borderStrong, barA = T.good, AMBER = isDark ? "#F0A55B" : "#B86E00";
    const GROUP_COLOR = { "Base growth": barC, "Network: GPON": col, "In-home telemetry": isDark ? "#D37AC0" : "#A3268A", "Provisioning": AMBER, "Plan change": isDark ? "#E8C56B" : "#8F6A00", "Adjustment": T.textFaint };

    // ---- brief-style SVG figures ----
    const svgText = { fontFamily: FONT, fontSize: 13, fill: T.text };
    const hbars = (groups, { max, ref, refLabel, fmt, keys, step, labelW = 228 }) => {
      const W = 700, L = labelW, R = 56, top = 22, bh = 16, gap = 4, gh = keys.length * (bh + gap) + 16;
      const Hh = top + groups.length * gh + 26, x = (v) => L + ((W - L - R) * v) / max;
      const st = step || (max <= 2 ? 0.5 : max <= 10 ? 2 : max <= 100 ? 10 : Math.pow(10, Math.floor(Math.log10(max))) / 2);
      const ticks = []; for (let g = 0; g <= max + 1e-9; g += st) ticks.push(+g.toFixed(2));
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block", minWidth: 520 }}>
          {ticks.map((g) => <g key={g}><line x1={x(g)} x2={x(g)} y1={top - 6} y2={Hh - 22} stroke={RULE} /><text x={x(g)} y={Hh - 6} textAnchor="middle" style={{ ...svgText, fontSize: 12, fill: MUTED }}>{fmt(g)}</text></g>)}
          {groups.map((d, i) => {
            const y = top + i * gh;
            return (
              <g key={i}>
                <text x={0} y={y + bh + 2} style={svgText}>{d.label}</text>
                {keys.map((k, j) => { const yy = y + j * (bh + gap), v = d[k.key]; if (v == null) return null;
                  return <g key={k.key}><rect x={L} y={yy} width={Math.max(0, x(Math.min(v, max)) - L)} height={bh} rx={2} fill={d.color || k.color} opacity={k.opacity == null ? 1 : k.opacity} />
                    <text x={x(Math.min(v, max)) + 6} y={yy + bh - 3} style={{ ...svgText, fontSize: 12 }}>{fmt(v)}</text></g>; })}
              </g>
            );
          })}
          {ref != null && <><line x1={x(ref)} x2={x(ref)} y1={top - 10} y2={Hh - 22} stroke={AMBER} strokeWidth={1.5} strokeDasharray="4 3" /><text x={x(ref) + 5} y={top - 10} style={{ ...svgText, fontSize: 12, fill: AMBER }}>{refLabel}</text></>}
        </svg>
      );
    };
    // waterfall-as-bars: each driver's contribution, coloured by root-cause group, with its share
    const contribChart = (rows) => {
      const W = 700, L = 250, R = 110, top = 10, rh = 30, bh = 18, max = Math.max(...rows.map((r) => Math.abs(r.v)));
      const Hh = top + rows.length * rh + 6, x = (v) => L + ((W - L - R) * Math.abs(v)) / max;
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block", minWidth: 520 }}>
          {rows.map((r, i) => { const y = top + i * rh; const c = GROUP_COLOR[r.group] || barB;
            return <g key={i}>
              <text x={0} y={y + bh - 4} style={{ ...svgText, fontSize: 12.5 }}>{r.name.length > 36 ? r.name.slice(0, 35) + "…" : r.name}</text>
              <rect x={L} y={y} width={Math.max(1, x(r.v) - L)} height={bh} rx={2} fill={c} opacity={r.v < 0 ? 0.55 : 1} />
              <text x={x(r.v) + 6} y={y + bh - 4} style={{ ...svgText, fontSize: 12, fontWeight: 700 }}>{sn(r.v)}</text>
              <text x={W} y={y + bh - 4} textAnchor="end" style={{ ...svgText, fontSize: 12, fill: MUTED }}>{(r.share > 0 ? "" : "−") + Math.abs(r.share).toFixed(1)}%</text>
            </g>; })}
        </svg>
      );
    };
    const stacked = (rows, segs) => {
      const W = 700, L = 232, R = 10, top = 8, rh = 42, bh = 24, Hh = top + rows.length * rh + 24, span = W - L - R;
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block", minWidth: 520 }}>
          {[0, 25, 50, 75, 100].map((g) => <g key={g}><line x1={L + (span * g) / 100} x2={L + (span * g) / 100} y1={top} y2={Hh - 22} stroke={RULE} /><text x={L + (span * g) / 100} y={Hh - 6} textAnchor="middle" style={{ ...svgText, fontSize: 12, fill: MUTED }}>{g}%</text></g>)}
          {rows.map((r, i) => { const y = top + i * rh; let acc = L;
            return <g key={i}><text x={0} y={y + bh / 2 + 5} style={svgText}>{r.label}</text>
              {r.p.map((v, k) => { const w = (span * v) / 100, xx = acc; acc += w;
                return <g key={k}><rect x={xx} y={y} width={w} height={bh} fill={segs[k].color} opacity={segs[k].opacity == null ? 1 : segs[k].opacity} />
                  {w > 36 && <text x={xx + w / 2} y={y + bh / 2 + 4} textAnchor="middle" style={{ ...svgText, fontSize: 12, fill: segs[k].dark ? T.bg : T.text }}>{v.toFixed(0)}</text>}</g>; })}
            </g>; })}
        </svg>
      );
    };
    const legend = (items) => <div className="hb-legend">{items.map((it) => <span key={it.label}><i className="hb-sw" style={{ background: it.color, opacity: it.opacity == null ? 1 : it.opacity }} />{it.label}</span>)}</div>;
    const stat = (v, label, sub) => (
      <div className="hb-stat"><div className="hb-stat-v">{v}</div><div className="hb-stat-l">{label}</div>{sub && <div className="hb-stat-s">{sub}</div>}</div>
    );
    // Quarter-on-same-quarter summary: the dashboard's latest three months against the same three a year earlier.
    const qName = `Q${Math.floor((i2 % 12) / 3) + 1}`, qNow = `${qName} ${MONTHS[i2].slice(-4)}`, qPrev = `${qName} ${MONTHS[yi[2]].slice(-4)}`;
    const churnQ = (idx) => (idx.every((i) => DATA.churnRate.HSIA[i] != null) ? avg(DATA.churnRate.HSIA, idx) : null);
    const cq = { now: churnQ(mi), prev: churnQ(yi) };
    const kpiCard = (value, label, prev, change, tone) => (
      <div className="hb-stat"><div className="hb-stat-v">{value}</div><div className="hb-stat-l">{label}</div>
        <div className="hb-stat-s">{qPrev}: {prev}{change != null && <> · <span className={`hb-${tone}`} style={{ fontWeight: 700 }}>{change}</span></>}</div></div>
    );
    const volTone = (v) => (v == null ? "flat" : Math.abs(v) < 1 ? "flat" : v > 0 ? "warn" : "ok");
    const rateTone = (v) => (v == null ? "flat" : Math.abs(v) < 0.005 ? "flat" : v > 0 ? "warn" : "ok");
    const heat = (v, maxV) => ({ background: `${col}${Math.round(Math.min(1, v / maxV) * 0.75 * 255).toString(16).padStart(2, "0")}`, color: v / maxV > 0.45 ? "#fff" : T.text });

    // ---- derived from the analysis ----
    const drivers = Y.drivers, growth = drivers[0], adj = drivers[drivers.length - 1];
    const condTotal = drivers.filter((d) => d.group !== "Base growth" && d.group !== "Adjustment").reduce((a, d) => a + d.v, 0);
    const groupTotals = ["Network: GPON", "Provisioning", "In-home telemetry", "Plan change"].map((g) => ({ g, v: drivers.filter((d) => d.group === g).reduce((a, d) => a + d.v, 0) })).sort((a, b) => b.v - a.v);
    const gshare = (g) => ((g.v / Y.tickets.delta) * 100).toFixed(0);
    const O = Y.orders, B = Y.bucket, ND = Y.noDataflow;
    const nd = B.rows[0];
    const wifiAlign = K.divergence.perCat.filter((r) => r.cat.startsWith("Wireless")).map((r) => r.alignment);
    const align = K.divergence.perCat.slice(0, 7).map((r) => ({ label: r.cat.replace("Connectivity › ", "").replace("Wireless › ", "Wi-Fi: "), p: [r.alignment, r.nofault, Math.max(0, 100 - r.alignment - r.nofault)] }));
    const svDrivers = sv.drivers.slice(0, 5);
    const perDay = (a) => sp(pct(a[1], a[0]), 1);

    // ---- initiatives mapped to the analysis's driver groups ----
    const byName = (names) => names.map((n) => INITIATIVES.find((it) => it.p === "HSIA" && it.name === n)).filter(Boolean);
    const initGroups = [
      { g: "Network: GPON", title: "Network: degraded fibre and outages", share: gshare(groupTotals.find((x) => x.g === "Network: GPON")), why: "GPON severely degraded, outage and unknown states add about " + num(groupTotals.find((x) => x.g === "Network: GPON").v) + " tickets; ONT Not Ranged and Historical Data are the call categories most tied to them.",
        items: byName(["GPONe Fibre Degradation Proactive Campaign", "Fibre Check — Severely Degraded from the OLT", "GPONe Geographic Analysis & Infrastructure Optimization", "Service Guarantee: Internet Backup to Cellular", "Fibre Check — Bit Errors & Critical Alarms", "XGSPON Light Requirements Enhancement"]) },
      { g: "Provisioning", title: "Provisioning, orders and plan changes", share: (((groupTotals.find((x) => x.g === "Provisioning").v + groupTotals.find((x) => x.g === "Plan change").v) / Y.tickets.delta) * 100).toFixed(0), why: `Orders rose ${O.pct}% and a customer who has just had an order calls 3 to 4 times as often for 30 days; deliveries, plan changes, failing speed tests, early tenure and ONT capping add about ${num(groupTotals.find((x) => x.g === "Provisioning").v + groupTotals.find((x) => x.g === "Plan change").v)} tickets.`,
        items: byName(["DIY Revamp Live ONT Check", "Gigabit Speed Compatibility ICU Intervention", "Gigabit Speed & Equipment Compatibility Proactive Campaign", "3 Gig Upgrade on TELUS.com", "Copper to WHSIA Technology Change in CSR", "Copper to Fibre Repair Intercept", "Cloudcheck Server Upgrades & Speed Test Improvements", "GPON/XGSPON Mis-tagging", "No Internet after Release Activation", "Restore Orders Profile Rebuild (after Suspend and Resume Order Fails)"]) },
      { g: "In-home telemetry", title: "In-home: gateway reboots and poor Wi-Fi", share: gshare(groupTotals.find((x) => x.g === "In-home telemetry")), why: `Lines with 3+ gateway reboots a week grew 37% and poor-Wi-Fi lines 27%, adding about ${num(groupTotals.find((x) => x.g === "In-home telemetry").v)} tickets; technicians close only ${Math.round(Math.min(...wifiAlign))}% to ${Math.round(Math.max(...wifiAlign))}% of Wi-Fi visits aligned with the agent's diagnosis.`,
        items: byName(["Wi-Fi Scaling — Proactive Campaigns", "Wi-Fi RouteThis RAVA Pilot Proactive Campaign", "Cloudcheck Fine Tuning", "Technician WiFi Certification Tool", "Fix Auto Channel Disabled — Firmware", "HSIA Legacy Hardware Upgrades"]) }
    ];
    const IMPACT_LABEL = { H: "High", M: "Medium", L: "Low" };

    const css = briefCss(col, AMBER);
    // ---- presentation mode (Deck): the review as Slidev-style slides ----
    const dstat = (v, label, sub) => <div className="dk-stat"><div className="dk-stat-v">{v}</div><div className="dk-stat-l">{label}</div>{sub && <div className="dk-stat-s">{sub}</div>}</div>;
    const dlegend = (items) => <div className="dk-legend">{items.map((it) => <span key={it.label}><i style={{ background: it.color, opacity: it.opacity == null ? 1 : it.opacity }} />{it.label}</span>)}</div>;
    const dmove = (change, tone) => <span className={`hb-${tone}`} style={{ fontWeight: 700, color: tone === "warn" ? T.bad : tone === "ok" ? T.good : MUTED }}>{change}</span>;
    const noSyncRow = K.divergence.perCat.find((r) => r.cat.endsWith("No Sync"));
    const slides = [
      { layout: "cover", title: `HSIA review · ${Y.period} ${Y.y1} vs ${Y.y0}`, sub: "Why tickets rose, what drives No Dataflow, and whether the fixes are aimed at it. The year-over-year ticket analysis read against the dashboard's own quarter, the agent and technician notes, the customer survey and the initiative register.",
        notes: `Analysis data to ${Y.dataThrough}; dashboard data to ${HSIA_REVIEW_LATEST}; survey to ${sv.months[sv.months.length - 1]}.` },
      { layout: "statement", title: `HSIA tickets are up ${Y.tickets.pct}% on last year. A quarter of that is a bigger base; the rest is degraded fibre, orders and provisioning, and unstable gateways.`, notes: "The one-sentence answer." },
      { layout: "default", title: `${qPrev} to ${qNow} at a glance`, sub: `${qNow} is ${range}, against ${prevRange}; calls, tickets and repairs are quarter totals, rates are quarter averages per 100 subscribers`, clicks: 6 + (cq.now != null && cq.prev != null ? 1 : 0),
        body: (step, C) => <div className="dk-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {C(1, dstat(big(q.calls), "Calls offered", <>{qPrev}: {big(qy.calls)} · {dmove(sp(pct(q.calls, qy.calls)), volTone(pct(q.calls, qy.calls)))}</>))}
          {C(2, dstat(big(q.tv), "Tickets", <>{qPrev}: {big(qy.tv)} · {dmove(sp(pct(q.tv, qy.tv)), volTone(pct(q.tv, qy.tv)))}</>))}
          {C(3, dstat(fmtRate(q.tr, 2), "Ticket rate per 100 subs", <>{qPrev}: {fmtRate(qy.tr, 2)} · {dmove(`${sd(q.tr - qy.tr)} per 100`, rateTone(q.tr - qy.tr))}</>))}
          {C(4, dstat(big(q.rv), "Repairs / dispatches", <>{qPrev}: {big(qy.rv)} · {dmove(sp(pct(q.rv, qy.rv)), volTone(pct(q.rv, qy.rv)))}</>))}
          {C(5, dstat(fmtRate(q.rr, 2), "Repair rate per 100 subs", <>{qPrev}: {fmtRate(qy.rr, 2)} · {dmove(`${sd(q.rr - qy.rr)} per 100`, rateTone(q.rr - qy.rr))}</>))}
          {C(6, dstat(big(avg(S.base, mi)), "Subscriber base (avg)", <>{qPrev}: {big(avg(S.base, yi))} · {sp(pct(avg(S.base, mi), avg(S.base, yi)))}</>))}
          {cq.now != null && cq.prev != null && C(7, dstat(fmtRate(cq.now, 2), "Churn rate per 100 subs", <>{qPrev}: {fmtRate(cq.prev, 2)} · {dmove(`${sd(cq.now - cq.prev)} per 100`, rateTone(cq.now - cq.prev))}</>))}
        </div>,
        notes: "One click per card. Red is worse, green is better. The dashboard quarter and the analysis measure different populations and are shown side by side, not reconciled." },
      { layout: "default", title: "In short", clicks: 6,
        body: (step, C) => <ul style={{ fontSize: 15 }}>
          <li>{C(1, <><strong>Tickets rose {num(Y.tickets.delta)} ({sp(Y.tickets.pct)}) in {Y.period} {Y.y1}.</strong> {num(Y.tickets.y0)} to {num(Y.tickets.y1)}, steady in every month. Our own quarter agrees: {range} tickets are {ap(pct(q.tv, qy.tv), 0)} above {prevRange}.</>)}</li>
          <li>{C(2, <><strong>{growth.share.toFixed(0)}% is simply a larger base.</strong> {num(Y.lines.delta)} more lines (+{Y.lines.pct}%) at the {Y.y0} ticket rate account for {num(growth.v)} of the extra tickets.</>)}</li>
          <li>{C(3, <><strong>Four root-cause groups explain the rest.</strong> {groupTotals.map((g) => `${g.g.replace("Network: ", "")} ${gshare(g)}%`).join(", ")} of the increase, before removing {num(Math.abs(adj.v))} of double counting.</>)}</li>
          <li>{C(4, <><strong>Orders are the biggest lever we control.</strong> Orders rose {O.pct}%, a customer calls 3 to 4 times as often in the 30 days after one, and tickets within 90 days of an order added about {num(O.after90.extra)}, roughly {O.after90.shareOfIncrease}% of the increase.</>)}</li>
          <li>{C(5, <><strong>No Dataflow is the category to shrink.</strong> {B.noDataflowPct}% of reactive tickets, up {B.noDataflowGrowthPct}% January to September; {nd.noFault}% of its callers showed no line fault in telemetry at ticket time.</>)}</li>
          <li>{C(6, <><strong>The register covers network and provisioning; the gaps are orders, offnet East and the NH20A gateway.</strong> {initGroups.reduce((a, g) => a + g.items.length, 0)} initiatives map to the driver groups, {initGroups.reduce((a, g) => a + g.items.filter((it) => /launch/i.test(it.status)).length, 0)} launched.</>)}</li>
        </ul>, notes: "Six points, one per click." },
      { layout: "section", num: "01", title: "The rise is steady, and a quarter of it is a bigger base" },
      { layout: "default", title: "The rise is steady, and a quarter of it is a bigger base", clicks: 5,
        body: (step, C) => <div className="dk-stats">
          {C(1, dstat(big(Y.tickets.y0), `Tickets · ${Y.period} ${Y.y0}`))}
          {C(2, dstat(big(Y.tickets.y1), `Tickets · ${Y.period} ${Y.y1}`))}
          {C(3, dstat(sbig(Y.tickets.delta), `Increase (${sp(Y.tickets.pct)})`))}
          {C(4, dstat(sbig(Y.lines.delta), `Average active lines (+${Y.lines.pct}%)`, `${big(Y.lines.y0)} to ${big(Y.lines.y1)}`))}
          {C(5, dstat(sbig(growth.v), "Expected from base growth", `${big(Y.lines.delta)} × ${Y.lines.ratePerLine9mo} tickets per line · ${growth.share}% of the increase`))}
        </div>, notes: Y.monthly.note },
      { layout: "section", num: "02", title: `What the ${sn(Y.tickets.delta)} breaks down into`, sub: `Each driver credited by volume alone: growth in the population × its ${Y.y0} rate` },
      { layout: "default", title: `Contribution to the ${sn(Y.tickets.delta)} increase, ${Y.period}, volume only`, clicks: 1,
        body: (step, C) => <>
          <div style={{ width: "100%" }}>{contribChart(drivers)}</div>
          {dlegend(Object.entries(GROUP_COLOR).map(([g, c]) => ({ label: g, color: c })))}
          {C(1, <p className="dk-cap" style={{ margin: 0 }}>Condition drivers add {sn(condTotal)} before adjustment; the overlap removed is {sn(adj.v)}. GPON outage and the 3 to 5 reboot band are capped at their actual change because their per-line rates fell. GPON figures are August × 9 and are directional.</p>)}
        </>, notes: "Customer growth first, then each condition's volume-only contribution, then the adjustment for overlap. Colours group drivers by root cause." },
      { layout: "two-cols", title: "Campaigns shaped the contact volume; copper is not a driver", clicks: 2,
        body: (step, C) => <>
          {C(1, <div className="dk-note"><h3>Proactive campaigns shaped the contact volume</h3>Internet proactive campaigns with a callback option reached {(Y.campaigns.reach[1] / Y.campaigns.reach[0]).toFixed(1)}× more customers than a year ago ({num(Y.campaigns.reach[0])} to {num(Y.campaigns.reach[1])} touches). Completed callbacks rose {num(Y.campaigns.callbacks[0])} to {num(Y.campaigns.callbacks[1])}. These are contacts we generated and they sit inside the {sn(Y.tickets.delta)}.</div>)}
          {C(2, <div className="dk-note amber"><h3>Copper is not a driver</h3>Per surviving copper line it got worse ({Y.copper.ratePct[0]}% to {Y.copper.ratePct[1]}% per month), but the base shrank {ap(pct(Y.copper.lines[1], Y.copper.lines[0]), 0)} ({num(Y.copper.lines[0])} to {num(Y.copper.lines[1])} lines), so copper tickets fell {num(Y.copper.tickets[0])} to {num(Y.copper.tickets[1])}.</div>)}
        </>, notes: "There is no campaign tag in the ticket data to net the campaign contacts out." },
      { layout: "section", num: "03", title: "Orders are one of the biggest drivers, and the one we control" },
      { layout: "two-cols", title: "Orders are one of the biggest drivers, and the one we control", clicks: 4,
        body: (step, C) => <>
          <div className="dk-stats" style={{ gridTemplateColumns: "1fr 1fr", alignContent: "start" }}>
            {C(1, dstat(sp(O.pct, 0), `PureFibre orders, ${Y.period}`, `${big(O.total[0])} to ${big(O.total[1])}`))}
            {C(2, dstat(sp(O.backendPct, 0), "BackEnd (automated) orders", `${big(O.backend[0])} to ${big(O.backend[1])}`))}
            {C(3, dstat(`${O.rate30[1]}%`, "Ticket rate in the 30 days after an order", `against a ${O.baseRate[1]}% monthly base rate: 3 to 4×`))}
            {C(4, dstat(sbig(O.after90.extra), "Extra tickets within 90 days of an order", `about ${O.after90.shareOfIncrease}% of the ${sbig(O.after90.hsicIncrease)} HSIC increase`))}
          </div>
          <div>
            <table>
              <thead><tr><th>Channel</th><th>Orders {Y.y0}</th><th>Orders {Y.y1}</th><th>YoY</th><th>30-day rate {Y.y1}</th></tr></thead>
              <tbody>{O.channels.map((c) => <tr key={c.name}><td>{c.name}</td><td>{num(c.o[0])}</td><td>{num(c.o[1])}</td><td style={{ color: c.pct > 20 ? T.bad : c.pct < 0 ? T.good : T.text, fontWeight: 600 }}>{sp(c.pct, 0)}</td><td>{c.rate[1]}%</td></tr>)}</tbody>
            </table>
            <p className="dk-cap" style={{ marginTop: 10 }}>The surge is led by automated BackEnd orders, which carry a low call rate (about 2.5%), so the overall post-order rate eased from {O.rate30[0]}% to {O.rate30[1]}%. By about 120 days after an order, customers call at their normal rate again.</p>
          </div>
        </>, notes: `August to September: orders per day ${num(O.augSep.ordersPerDay[0])} to ${num(O.augSep.ordersPerDay[1])} and No Dataflow tickets per day ${O.augSep.noDataflowPerDay[0]} to ${O.augSep.noDataflowPerDay[1]}, while all tickets per day were flat. The fibre network was calmer in September.` },
      { layout: "section", num: "04", title: "The fixes in flight, mapped to the analysis's driver groups" },
      { layout: "default", title: "The fixes in flight, mapped to the driver groups", sub: `Register initiatives that act on each root-cause group; the share is each group's part of the ${sn(Y.tickets.delta)} increase`, clicks: initGroups.length,
        body: (step, C) => <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
          {initGroups.map((g, k) => C(k + 1, <div className="dk-note" style={{ borderColor: GROUP_COLOR[g.g], fontSize: 12.5, height: "100%" }}>
            <h3>{g.title}<span className="dk-pill">{g.share}% of the rise</span></h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {g.items.map((it) => <div key={it.name} style={{ display: "flex", gap: 8, alignItems: "baseline" }}><StatusChip status={it.status} T={T} /><span style={{ fontWeight: 600, color: T.text }}>{it.name}</span><span style={{ color: MUTED, fontSize: 11, marginLeft: "auto", whiteSpace: "nowrap" }}>{it.timeline}</span></div>)}
            </div>
          </div>, { height: "100%" }))}
        </div>, notes: initGroups.map((g) => `${g.title}: ${g.why}`).join(" ") },
      { layout: "two-cols", title: "Gaps, and what is working", clicks: 2,
        body: (step, C) => <>
          {C(1, <div className="dk-note bad"><h3>Gaps the analysis exposes</h3><ul style={{ paddingLeft: 18 }}>
            <li>Nothing in the register targets post-order contact, although orders explain about {O.after90.shareOfIncrease}% of the increase.</li>
            <li>Nothing targets the offnet (Bell) East and SalesOne group, about {ND.offnetSharePct}% of No Dataflow caller growth from under {ND.offnetBasePct}% of customers.</li>
            <li>Gateway reboots (3+ a week, {sn(drivers[2].v)} tickets) have no HSIA initiative; the sequential reboot work exists only for TV set-top boxes.</li>
            <li>The NH20A v1.18.07 firmware (1.7× lift) and Boost Wi-Fi 7 (1.8×) need a device-team review.</li></ul></div>)}
          {C(2, <div className="dk-note ok"><h3>Working</h3><ul style={{ paddingLeft: 18 }}>
            <li>Severely degraded fibre fell from {fibre[0].toFixed(1)}% to {fibre[2].toFixed(1)}% of repairs and GPON severely degraded lines fell {ap(O.gponAugSep[2].pct)} from August to September.</li>
            <li>ONT Not Ranged tickets fell {ap(pct(LOOKER.HSIA.topIssues[3].a26, LOOKER.HSIA.topIssues[3].a25), 0)} year over year and {ap(K.agentCat.find((c) => c.name === "Connectivity › ONT Not Ranged").pct)} month over month.</li>
            <li>The post-order ticket rate eased from {O.rate30[0]}% to {O.rate30[1]}%.</li>
            <li>A smaller share of tickets reaches a truck: {((q.rv / q.tv) * 100).toFixed(1)} dispatches per 100 tickets against {((qy.rv / qy.tv) * 100).toFixed(1)} in {prevRange}.</li></ul></div>)}
        </>, notes: "Close on the ask: a post-order check-in, an owner for offnet East, and a device-team review of the NH20A firmware." },
      { layout: "section", num: "05", title: "The reactive bucket is line-side, and No Dataflow is the piece to shrink" },
      { layout: "default", title: "Telemetry signals by call category", sub: "Share of callers whose line showed each signal at ticket time; darker is higher within the column", clicks: 1,
        body: (step, C) => <>
          <table style={{ fontSize: 12 }}>
            <thead><tr><th>Call category</th><th>Callers</th><th>GPON sev.</th><th>GPON outage</th><th>Downtime</th><th>Speed &lt;50%</th><th>ONT capped</th><th>Reboots 3+</th><th>Poor Wi-Fi</th><th>Plan change</th><th>Early tenure</th><th>No line fault</th></tr></thead>
            <tbody>{B.rows.map((r) => <tr key={r.cat}><td style={{ fontWeight: 600 }}>{r.cat}</td><td>{num(r.n)}</td>
              {[["gponSev", 12.1], ["outage", 25], ["downtime", 15.1], ["speed", 14.2], ["ontCap", 24.9], ["reboots", 10.6], ["wifi", 10.3], ["planChg", 12.7], ["tenure", 22.2]].map(([k, mx]) => <td key={k} style={{ ...heat(r[k], mx), textAlign: "center", borderRadius: 4, padding: "4px 6px" }}>{r[k].toFixed(1)}%</td>)}
              <td style={{ color: AMBER, fontWeight: 700 }}>{r.noFault}%</td></tr>)}</tbody>
          </table>
          {C(1, <p className="dk-cap" style={{ margin: 0 }}>Speed test peaks on Slow Speeds; plan change and ONT capping drive Incompatible Equipment; downtime and GPON drive ONT Not Ranged and Historical Data. No Dataflow callers are {nd.noFault}% fault-free in telemetry and {nd.tenure}% are in early tenure, which is why proactive detection and the order path matter more than any one network fix.</p>)}
        </>, notes: `${B.tickets.toLocaleString()} reactive tickets with telemetry, ${B.lineSidePct}% line-side, No Dataflow ${B.noDataflowPct}% and the largest symptom.` },
      { layout: "section", num: "06", title: "No Dataflow callers: the same kinds of customers, just more of them" },
      { layout: "default", title: `Lift of selected traits among No Dataflow callers, ${Y.y0} and ${Y.y1}`, sub: "Lift is the share of callers with a trait divided by the share of the base with it; 1× means no more common among callers than among everyone", clicks: 1,
        body: (step, C) => <>
          <div style={{ width: "100%" }}>{hbars(ND.lifts.map((l) => ({ label: l.t, a: l.lift[1], b: l.lift[0] })), { max: 12, step: 2, ref: 1, refLabel: "no lift = 1×", fmt: (v) => v.toFixed(1) + "×", labelW: 268, keys: [{ key: "a", color: barB }, { key: "b", color: barC }] })}</div>
          {dlegend([{ label: String(Y.y1), color: barB }, { label: String(Y.y0), color: barC }])}
          {C(1, <p className="dk-cap" style={{ margin: 0 }}>Line faults and GPON problems run 5 to 10× in both years, 3+ reboots about 4×, the first 30 days of service about 8×. No new telemetry signal appeared in {Y.y1}; the growth is more customers in the same states. The Arcadyan NH20A gateway runs at 1.4× and its v1.18.07 build at 1.7×; the offnet East group tripled and no initiative targets it.</p>)}
        </>, notes: `No Dataflow callers ${sp(ND.pct, 0)} Jul to Sep; ${ND.tenuredSharePct}% of the growth is customers with a year or more of tenure; about ${ND.offnetSharePct}% is the offnet (Bell) East group.` },
      { layout: "section", num: "07", title: "Field and customer evidence point the same way" },
      { layout: "two-cols", title: "Field and customer evidence point the same way", clicks: 2,
        body: (step, C) => <>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>How {shortMon(mons[2])} field visits closed, by what the agent diagnosed</div>
            {stacked(align, [{ color: barA, dark: true }, { color: barC, opacity: 0.85 }, { color: barB }])}
            {dlegend([{ label: "Aligned with the agent", color: barA }, { label: "No fault found", color: barC, opacity: 0.85 }, { label: "Re-attributed elsewhere", color: barB }])}
            {C(1, <p className="dk-cap" style={{ marginTop: 8 }}>Technicians confirm the line-side categories (ONT Not Ranged {K.divergence.perCat[2].alignment.toFixed(0)}% aligned, No Sync {noSyncRow ? noSyncRow.alignment.toFixed(0) : "—"}%) and not the Wi-Fi ones ({Math.round(Math.min(...wifiAlign))}% to {Math.round(Math.max(...wifiAlign))}% aligned).</p>)}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Why customers rated reliability fair or poor, {svM[0]} and {svM[2]}</div>
            {hbars(svDrivers.map((d) => ({ label: d.name, a: d.pct[2], b: d.pct[0] })), { max: 50, step: 10, fmt: (v) => v.toFixed(0) + "%", labelW: 200, keys: [{ key: "a", color: barB }, { key: "b", color: barC }] })}
            {dlegend([{ label: svM[2], color: barB }, { label: svM[0], color: barC }])}
            {C(2, <p className="dk-cap" style={{ marginTop: 8 }}>Frequent loss of connection is the top reason at {sv.drivers[0].pct[2].toFixed(0)}% and grew {sd(sv.drivers[0].pct[2] - sv.drivers[0].pct[0], 1)} points over the summer. Negative verbatims rose {sd(sv.polarity.negative[2] - sv.polarity.negative[0], 1)} points to {sv.polarity.negative[2].toFixed(1)}%.</p>)}
          </div>
        </>, notes: `The survey runs to ${sv.months[sv.months.length - 1]}, one month behind the operational data.` },
      { layout: "end", title: "Sources and method", sub: `"TELUS Internet: why support tickets rose year over year" (${Y.period} ${Y.y1} vs ${Y.y0}, data through ${Y.dataThrough}) · Churn Measurement 2026 workbook · TS Calls Offered by Product · HSIA agent and technician notes (${HSA.months[0]} to ${HSA.months[2]}) · CF&R TELUS Internet survey (${sv.months[0]} to ${sv.months[2]}) · Initiatives register. Quarter totals sum three months and rates average the monthly rates per 100 subscribers; analysis figures are transcribed, not recomputed.`,
        notes: `Caveats carried from the analysis: ${Y.caveats.join(" ")}` }
    ];

    return (
      <>
        {deckSlide != null && <Deck slides={slides} index={deckSlide - 1} onIndex={(k) => setDeckSlide(k + 1)} onExit={() => setDeckSlide(null)} T={T} color={col} isDark={isDark} title={`HSIA review · ${Y.period} ${Y.y1} vs ${Y.y0}`} />}
        <div className="hb">
        <style>{css}</style>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -26 }}>
          <button onClick={() => setDeckSlide(1)} title="Open this review as slides (arrow keys to navigate, Esc to exit)"
            style={{ background: col, color: "#fff", border: "none", borderRadius: 999, padding: "7px 16px", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(0,0,0,.14)" }}>
            <span style={{ fontSize: 10 }}>▶</span> Present · {slides.length} slides
          </button>
        </div>
        <section aria-labelledby="hb-kpis">
          <h2 id="hb-kpis">{qPrev} to {qNow} at a glance</h2>
          <div className="hb-stats">
            {kpiCard(big(q.calls), `Calls offered · ${qNow}`, big(qy.calls), sp(pct(q.calls, qy.calls)), volTone(pct(q.calls, qy.calls)))}
            {kpiCard(big(q.tv), `Tickets · ${qNow}`, big(qy.tv), sp(pct(q.tv, qy.tv)), volTone(pct(q.tv, qy.tv)))}
            {kpiCard(fmtRate(q.tr, 2), `Ticket rate per 100 subs · ${qNow}`, fmtRate(qy.tr, 2), `${sd(q.tr - qy.tr)} per 100`, rateTone(q.tr - qy.tr))}
            {kpiCard(big(q.rv), `Repairs / dispatches · ${qNow}`, big(qy.rv), sp(pct(q.rv, qy.rv)), volTone(pct(q.rv, qy.rv)))}
            {kpiCard(fmtRate(q.rr, 2), `Repair rate per 100 subs · ${qNow}`, fmtRate(qy.rr, 2), `${sd(q.rr - qy.rr)} per 100`, rateTone(q.rr - qy.rr))}
            {kpiCard(big(avg(S.base, mi)), `Subscriber base (avg) · ${qNow}`, big(avg(S.base, yi)), sp(pct(avg(S.base, mi), avg(S.base, yi))), "flat")}
            {cq.now != null && cq.prev != null && kpiCard(fmtRate(cq.now, 2), `Churn rate per 100 subs · ${qNow}`, fmtRate(cq.prev, 2), `${sd(cq.now - cq.prev)} per 100`, rateTone(cq.now - cq.prev))}
          </div>
          <p className="hb-prose" style={{ marginTop: 10 }}>{qNow} is {shortMon(mons[0])} – {shortMon(mons[2])} {mons[2].slice(-4)}, against {shortMon(mons[0])} – {shortMon(mons[2])} {MONTHS[yi[2]].slice(-4)}. Calls, tickets and repairs are quarter totals; rates and the subscriber base are quarter averages of the monthly figures, with rates per 100 subscribers. Red is worse, green is better.</p>
          <div className="hb-tw">
            <table>
              <thead><tr><th>Dashboard measure</th>{mons.map((m) => <th key={m}>{shortMon(m)}</th>)}<th>{range}</th><th>{prevRange}</th><th>Change</th><th></th></tr></thead>
              <tbody>
                <tr><td>Tickets (Looker Assure)</td>{mi.map((i) => <td key={i} className="n">{num(S.tv[i])}</td>)}<td className="n">{num(q.tv)}</td><td className="n">{num(qy.tv)}</td><td className="n">{sp(pct(q.tv, qy.tv))}</td><td>{flag(pct(q.tv, qy.tv))}</td></tr>
                <tr><td>Ticket rate per 100 subs</td>{mi.map((i) => <td key={i} className="n">{num(S.tr[i], 2)}</td>)}<td className="n">{q.tr.toFixed(2)}</td><td className="n">{qy.tr.toFixed(2)}</td><td className="n">{sd(q.tr - qy.tr)}</td><td>{flag(pct(q.tr, qy.tr))}</td></tr>
                <tr><td>Calls offered</td>{mi.map((i) => <td key={i} className="n">{num(S.calls[i])}</td>)}<td className="n">{num(q.calls)}</td><td className="n">{num(qy.calls)}</td><td className="n">{sp(pct(q.calls, qy.calls))}</td><td>{flag(pct(q.calls, qy.calls))}</td></tr>
                <tr><td>Repairs / dispatches</td>{mi.map((i) => <td key={i} className="n">{num(S.rv[i])}</td>)}<td className="n">{num(q.rv)}</td><td className="n">{num(qy.rv)}</td><td className="n">{sp(pct(q.rv, qy.rv))}</td><td>{flag(pct(q.rv, qy.rv))}</td></tr>
                <tr><td>Dispatches per 100 tickets</td>{per100.map((v, k) => <td key={k} className="n">{v.toFixed(1)}</td>)}<td className="n">{((q.rv / q.tv) * 100).toFixed(1)}</td><td className="n">{((qy.rv / qy.tv) * 100).toFixed(1)}</td><td className="n">{sd((q.rv / q.tv - qy.rv / qy.tv) * 100, 1)}</td><td>{flag(pct(q.rv / q.tv, qy.rv / qy.tv))}</td></tr>
                <tr><td>Severely degraded fibre, % of repairs</td>{fibre.map((v, k) => <td key={k} className="n">{v == null ? "—" : v.toFixed(1) + "%"}</td>)}<td className="n">{(fibre.reduce((a, b) => a + (b || 0), 0) / 3).toFixed(1)}%</td><td className="n">—</td><td className="n">{sd(fibre[2] - fibre[0], 1)} pts</td><td>{flag(fibre[2] - fibre[0], true, 1)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="hb-prose" style={{ fontSize: 13.5 }}>The dashboard's quarter and the analysis measure different populations (HSIA West plus TQ ILEC on Looker Assure tickets, against all TELUS internet excluding Koodo on internet_daily), so the two are shown side by side and not reconciled. They tell the same story: demand up by a sixth, dispatches up far less.</p>
        </section>

        <header className="hb-head">
          <div className="hb-eyebrow">HSIA · {Y.period} {Y.y1} vs {Y.y0} · why tickets rose, what drives No Dataflow, and whether the fixes are aimed at it</div>
          <h1>HSIA tickets are up {Y.tickets.pct}% on last year. A quarter of that is a bigger base; the rest is degraded fibre, orders and provisioning, and unstable gateways.</h1>
          <p className="hb-sub">The year-over-year ticket analysis for all TELUS internet (excluding Koodo), read against the dashboard's own quarter: KPIs for {range}, agent and technician notes, the customer survey and the initiative register.</p>
          <div className="hb-meta"><span>Reliability Strategy</span><span>Analysis data to {Y.dataThrough}</span><span>Dashboard data to {HSIA_REVIEW_LATEST}</span><span>Survey to {sv.months[sv.months.length - 1]}</span></div>
        </header>

        <section aria-labelledby="hb-short">
          <div className="hb-answer">
            <h3 id="hb-short" style={{ color: H }}>In short</h3>
            <ol>
              <li><strong>Tickets rose {num(Y.tickets.delta)} ({sp(Y.tickets.pct)}) in {Y.period} {Y.y1}.</strong> {num(Y.tickets.y0)} to {num(Y.tickets.y1)}, and the rise is steady in every month. Our own quarter agrees: {range} tickets are {ap(pct(q.tv, qy.tv), 0)} above {prevRange} and the ticket rate is {sd(q.tr - qy.tr)} per 100 subscribers higher.</li>
              <li><strong>{growth.share.toFixed(0)}% is simply a larger base.</strong> {num(Y.lines.delta)} more lines (+{Y.lines.pct}%) at the {Y.y0} ticket rate account for {num(growth.v)} of the extra tickets. Everything else is a higher rate of trouble per line.</li>
              <li><strong>Four root-cause groups explain the rest.</strong> {groupTotals.map((g, i) => `${g.g.replace("Network: ", "")} ${gshare(g)}%`).join(", ")} of the increase, before removing {num(Math.abs(adj.v))} of double counting. GPON severely degraded is the single largest condition at {num(drivers[1].v)}, with the caveat that GPON figures are August scaled to nine months.</li>
              <li><strong>Orders are the biggest lever we control.</strong> Orders rose {O.pct}% (automated BackEnd orders {sp(O.backendPct, 0)}), a customer calls 3 to 4 times as often in the 30 days after one, and tickets within 90 days of an order added about {num(O.after90.extra)}, roughly {O.after90.shareOfIncrease}% of the year-over-year increase.</li>
              <li><strong>No Dataflow is the category to shrink.</strong> It is {B.noDataflowPct}% of the {num(B.tickets)} reactive tickets and grew {B.noDataflowGrowthPct}% from January to September. Its callers are up {ND.pct}%, {ND.tenuredSharePct}% of that growth is customers with a year or more of tenure, and about {ND.offnetSharePct}% is the offnet (Bell) East group that is under {ND.offnetBasePct}% of customers. {nd.noFault}% of No Dataflow callers showed no line fault in telemetry at ticket time.</li>
              <li><strong>The register covers the network and provisioning drivers; the gaps are orders, offnet East and the NH20A gateway.</strong> {initGroups.reduce((a, g) => a + g.items.length, 0)} initiatives map to the three driver groups, {initGroups.reduce((a, g) => a + g.items.filter((it) => /launch/i.test(it.status)).length, 0)} launched. None targets post-order contact, the offnet East provisioning stack, or the NH20A firmware build running at 1.7× lift.</li>
            </ol>
          </div>
        </section>

        <details className="hb-sec" aria-labelledby="hb-s1">
          <summary><h2 id="hb-s1">1. The rise is steady, and a quarter of it is a bigger base</h2></summary>
          <div className="hb-body">
          <div className="hb-stats">
            {stat(big(Y.tickets.y0), `Tickets · ${Y.period} ${Y.y0}`)}
            {stat(big(Y.tickets.y1), `Tickets · ${Y.period} ${Y.y1}`)}
            {stat(sbig(Y.tickets.delta), `Increase (${sp(Y.tickets.pct)})`)}
            {stat(sbig(Y.lines.delta), `Average active lines (+${Y.lines.pct}%)`, `${big(Y.lines.y0)} to ${big(Y.lines.y1)}`)}
            {stat(sbig(growth.v), "Expected from base growth", `${big(Y.lines.delta)} × ${Y.lines.ratePerLine9mo} tickets per line · ${growth.share}% of the increase`)}
          </div>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="hb-s2">
          <summary><h2 id="hb-s2">2. What the {sn(Y.tickets.delta)} breaks down into</h2></summary>
          <div className="hb-body">
          <p className="hb-prose">Each driver is credited by volume alone: how many more customers entered the state, times what that state cost in tickets in {Y.y0}. Holding the rate at its {Y.y0} level stops a group looking worse just because more of the kind of customers who call joined it. A customer can sit in several states at once, so an adjustment removes the double counting and the drivers reconcile to the total.</p>
          <p className="hb-prose">Customer growth first, then each condition's volume-only contribution, then the adjustment for overlap. Colours group drivers by root cause.</p>
          <figure>
            <div className="hb-figtitle">Contribution to the {sn(Y.tickets.delta)} increase, {Y.period}, volume only (growth in the population × {Y.y0} rate)</div>
            <div className="hb-chart">{contribChart(drivers)}</div>
            {legend(Object.entries(GROUP_COLOR).map(([g, c]) => ({ label: g, color: c })))}
            <figcaption>Condition drivers add {sn(condTotal)} before adjustment; the overlap removed is {sn(adj.v)}. GPON outage and the 3 to 5 reboot band are capped at their actual change because their per-line rates fell. GPON figures are August × 9 because telemetry covered only about half of fibre lines in Jan to Jul {Y.y0}, so they are directional.</figcaption>
          </figure>
          <div className="hb-tw">
            <table>
              <thead><tr><th>Driver</th><th>Group</th><th>Growth in the population</th><th>{Y.y0} rate</th><th>Volume tickets</th><th>Actual change</th><th>Share</th></tr></thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.name}>
                    <td>{d.name}{d.capped && <span className="hb-pill">capped</span>}{d.caveat && <span className="hb-pill" style={{ color: AMBER }}>Aug × 9</span>}</td>
                    <td style={{ textAlign: "left", color: GROUP_COLOR[d.group], fontWeight: 600, fontSize: 12.5 }}>{d.group}</td>
                    <td className="n">{d.delta || "—"}</td><td className="n">{d.rate || "—"}</td>
                    <td className="n" style={{ fontWeight: 700 }}>{sn(d.v)}</td><td className="n">{d.actual != null ? sn(d.actual) : "—"}</td><td className="n">{d.share.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="hb-two">
            <div className="hb-note purple">
              <h3>Proactive campaigns shaped the contact volume</h3>
              <p>Internet proactive campaigns with a callback option reached {(Y.campaigns.reach[1] / Y.campaigns.reach[0]).toFixed(1)}× more customers than a year ago ({num(Y.campaigns.reach[0])} to {num(Y.campaigns.reach[1])} touches). Completed callbacks rose {num(Y.campaigns.callbacks[0])} to {num(Y.campaigns.callbacks[1])} ({sn(Y.campaigns.callbacks[1] - Y.campaigns.callbacks[0])}). These are contacts we generated and they sit inside the {sn(Y.tickets.delta)}; there is no campaign tag in the ticket data to net them out.</p>
            </div>
            <div className="hb-note">
              <h3>Copper is not a driver</h3>
              <p>Per surviving copper line it got worse ({Y.copper.ratePct[0]}% to {Y.copper.ratePct[1]}% per month), but the base shrank {ap(pct(Y.copper.lines[1], Y.copper.lines[0]), 0)} ({num(Y.copper.lines[0])} to {num(Y.copper.lines[1])} lines), so copper tickets fell {num(Y.copper.tickets[0])} to {num(Y.copper.tickets[1])} and removed volume rather than adding it.</p>
            </div>
          </div>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="hb-s3">
          <summary><h2 id="hb-s3">3. Orders are one of the biggest drivers, and the one we control</h2></summary>
          <div className="hb-body">
          <div className="hb-stats">
            {stat(sp(O.pct, 0), `PureFibre orders, ${Y.period}`, `${big(O.total[0])} to ${big(O.total[1])}`)}
            {stat(sp(O.backendPct, 0), "BackEnd (automated) orders", `${big(O.backend[0])} to ${big(O.backend[1])}`)}
            {stat(`${O.rate30[1]}%`, "Ticket rate in the 30 days after an order", `against a ${O.baseRate[1]}% monthly base rate: 3 to 4×`)}
            {stat(sbig(O.after90.extra), "Extra tickets within 90 days of an order", `about ${O.after90.shareOfIncrease}% of the ${sbig(O.after90.hsicIncrease)} HSIC increase`)}
          </div>
          <div className="hb-tw">
            <table>
              <thead><tr><th>Channel</th><th>Orders {Y.y0}</th><th>Orders {Y.y1}</th><th>YoY</th><th>30-day ticket rate {Y.y0}</th><th>{Y.y1}</th></tr></thead>
              <tbody>
                {O.channels.map((c) => <tr key={c.name}><td>{c.name}</td><td className="n">{num(c.o[0])}</td><td className="n">{num(c.o[1])}</td><td className="n" style={{ color: c.pct > 20 ? T.bad : c.pct < 0 ? T.good : T.text, fontWeight: 600 }}>{sp(c.pct, 0)}</td><td className="n">{c.rate[0]}%</td><td className="n">{c.rate[1]}%</td></tr>)}
              </tbody>
            </table>
          </div>
          <p className="hb-prose">Account activity rose across every order type. The surge is led by automated BackEnd orders, which carry a low call rate (about 2.5%), so the overall post-order rate eased from {O.rate30[0]}% to {O.rate30[1]}%. Had the rate stayed at {Y.y0} levels, order growth would have added about {num(O.after90.expectedExtra)} tickets; the actual was {num(O.after90.extra)}. By about 120 days after an order, customers call at their normal rate again.</p>
          <div className="hb-two">
            <div className="hb-note">
              <h3>August to September: orders still rising</h3>
              <p>Orders per day {num(O.augSep.ordersPerDay[0])} to {num(O.augSep.ordersPerDay[1])} ({perDay(O.augSep.ordersPerDay)}) and No Dataflow tickets per day {O.augSep.noDataflowPerDay[0]} to {O.augSep.noDataflowPerDay[1]} ({perDay(O.augSep.noDataflowPerDay)}), while all tickets per day were flat ({num(O.augSep.ticketsPerDay[0])} to {num(O.augSep.ticketsPerDay[1])}, {perDay(O.augSep.ticketsPerDay)}). September's lower monthly total is the calendar, not fewer calls. CSR orders, the 9.8% call-rate channel, rose 14% in September while low-rate automated orders fell, so order-driven tickets were expected to grow faster than orders.</p>
            </div>
            <div className="hb-note ok">
              <h3>The fibre network was calmer in September</h3>
              <ul className="hb-plain" style={{ fontSize: 13.5 }}>
                {O.gponAugSep.map((r) => <li key={r.m}>{r.m}: {num(r.v[0])} to {num(r.v[1])} ({sp(r.pct)})</li>)}
              </ul>
              <p style={{ fontSize: 13.5 }}>That matches the fall in ONT Not Ranged ({ap(K.agentCat.find((c) => c.name === "Connectivity › ONT Not Ranged").pct)} MoM in our notes data), No Sync and No IP, and offset the extra order-driven calls.</p>
            </div>
          </div>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="hb-s4">
          <summary><h2 id="hb-s4">4. The fixes in flight, mapped to the analysis's driver groups</h2></summary>
          <div className="hb-body">
          <p className="hb-prose">Register initiatives that act on each root-cause group, with live status, timeline, prime and HSIA impact rating. The share is each group's part of the {sn(Y.tickets.delta)} increase.</p>
          <div className="hb-two" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            {initGroups.map((g) => (
              <figure key={g.g}>
                <div className="hb-figtitle" style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: GROUP_COLOR[g.g], display: "inline-block" }} />{g.title}<span className="hb-pill">{g.share}% of the rise</span></div>
                <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>{g.why}</p>
                <div>
                  {g.items.map((it) => (
                    <div key={it.name} className="hb-init">
                      <StatusChip status={it.status} T={T} />
                      <span style={{ fontWeight: 600, color: T.text, fontSize: 13.5 }}>{it.name}</span>
                      <span className="hb-imp">{it.impact ? `${IMPACT_LABEL[it.impact]} impact` : ""}</span>
                      <span className="hb-m">{it.timeline} · {it.prime}</span>
                    </div>
                  ))}
                </div>
              </figure>
            ))}
          </div>
          <div className="hb-two">
            <div className="hb-note bad">
              <h3>Gaps the analysis exposes</h3>
              <ul className="hb-plain">
                <li>Nothing in the register targets post-order contact, although orders explain about {O.after90.shareOfIncrease}% of the increase. A post-order check-in or a fix for avoidable orders would be the largest single lever.</li>
                <li>Nothing targets the offnet (Bell) East and SalesOne group, about {ND.offnetSharePct}% of No Dataflow caller growth from under {ND.offnetBasePct}% of customers.</li>
                <li>Gateway reboots (3+ a week, {sn(drivers[2].v)} tickets) have no HSIA initiative; the sequential reboot work exists only for TV set-top boxes.</li>
                <li>The NH20A v1.18.07 firmware (1.7× lift) and Boost Wi-Fi 7 (1.8×) need a device-team review.</li>
              </ul>
            </div>
            <div className="hb-note ok">
              <h3>Working</h3>
              <ul className="hb-plain">
                <li>Severely degraded fibre fell from {fibre[0].toFixed(1)}% to {fibre[2].toFixed(1)}% of repairs and GPON severely degraded lines fell {ap(O.gponAugSep[2].pct)} from August to September, in line with the GPON campaigns.</li>
                <li>ONT Not Ranged tickets fell {ap(pct(LOOKER.HSIA.topIssues[3].a26, LOOKER.HSIA.topIssues[3].a25), 0)} year over year and {ap(K.agentCat.find((c) => c.name === "Connectivity › ONT Not Ranged").pct)} month over month.</li>
                <li>The post-order ticket rate eased from {O.rate30[0]}% to {O.rate30[1]}%, so the order effect per order is not getting worse even as volume grows.</li>
                <li>A smaller share of tickets reaches a truck: {((q.rv / q.tv) * 100).toFixed(1)} dispatches per 100 tickets against {((qy.rv / qy.tv) * 100).toFixed(1)} in {prevRange}.</li>
              </ul>
            </div>
          </div>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="hb-s5">
          <summary><h2 id="hb-s5">5. The reactive bucket is line-side, and No Dataflow is the piece to shrink</h2></summary>
          <div className="hb-body">
          <div className="hb-stats">
            {stat(big(B.tickets), `Reactive tickets with telemetry, ${Y.period} ${Y.y1}`, "Remedy High Speed, matched to a monitored line")}
            {stat(`${B.lineSidePct}%`, "Line-side (Connectivity)", `about ${B.wifiPct}% is in-home Wi-Fi`)}
            {stat(`${B.noDataflowPct}%`, "No Dataflow, the largest symptom", `${sp(B.noDataflowGrowthPct, 0)} January to September`)}
            {stat(`${B.noLineFaultPct}%`, "Callers with no line fault in telemetry", "none of the six line-health signals at ticket time")}
          </div>
          <p className="hb-prose">For each call category, the share of callers whose line showed each telemetry signal at ticket time. Darker cells are higher within the column. The last column is the share of callers whose line showed none of the six line-health faults.</p>
          <div className="hb-tw">
            <table style={{ minWidth: 760 }}>
              <thead><tr><th>Call category</th><th>Callers</th><th>GPON sev.</th><th>GPON outage</th><th>Downtime</th><th>Speed test &lt;50%</th><th>ONT capped</th><th>Reboots 3+</th><th>Poor Wi-Fi</th><th>Plan change</th><th>Early tenure</th><th>No line fault</th></tr></thead>
              <tbody>
                {B.rows.map((r) => (
                  <tr key={r.cat}>
                    <td style={{ fontWeight: 600 }}>{r.cat}</td><td className="n">{num(r.n)}</td>
                    {[["gponSev", 12.1], ["outage", 25], ["downtime", 15.1], ["speed", 14.2], ["ontCap", 24.9], ["reboots", 10.6], ["wifi", 10.3], ["planChg", 12.7], ["tenure", 22.2]].map(([k, mx]) => <td key={k} className="heat" style={heat(r[k], mx)}>{r[k].toFixed(1)}%</td>)}
                    <td className="n" style={{ color: AMBER, fontWeight: 700 }}>{r.noFault}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figcaption style={{ fontSize: 14, color: MUTED, lineHeight: 1.5 }}>Speed test validates the mapping: it peaks on Slow Speeds. Plan change and ONT capping drive Incompatible Equipment; downtime and GPON drive ONT Not Ranged and Historical Data. No Dataflow callers are {nd.noFault}% fault-free in telemetry and {nd.tenure}% are in early tenure, which is why proactive detection and the onboarding and order path matter more than any one network fix.</figcaption>
          <figure>
            <div className="hb-figtitle">Our agent categories agree: {shortMon(mons[2])} tickets by agent category (notes export)</div>
            <div className="hb-chart">{hbars(K.agentCat.slice(0, 8).map((c) => ({ label: c.name.replace(" › ", ": "), v: c.v[2] })), { max: Math.ceil(Math.max(...K.agentCat.slice(0, 8).map((c) => c.v[2])) / 2000) * 2000, fmt: (v) => (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "K" : String(v)), step: 2000, keys: [{ key: "v", color: barB }] })}</div>
            <figcaption>No Dataflow was {num(K.agentCat[0].v[0])} in {shortMon(mons[0])} and {num(K.agentCat[0].v[2])} in {shortMon(mons[2])}, {((K.agentCat[0].v[2] / K.total[2]) * 100).toFixed(0)}% of our HSIA tickets and {sp(pct(LOOKER.HSIA.topIssues[0].a26, LOOKER.HSIA.topIssues[0].a25), 0)} on {shortMon(mons[2])} last year in Looker. Slow Speeds ({sp(K.agentCat[2].pct)}) and Incompatible Equipment ({sp(K.agentCat[9].pct)}) are the categories still rising month over month.</figcaption>
          </figure>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="hb-s6">
          <summary><h2 id="hb-s6">6. No Dataflow callers: the same kinds of customers, just more of them</h2></summary>
          <div className="hb-body">
          <div className="hb-stats">
            {stat(sp(ND.pct, 0), "No Dataflow callers, Jul to Sep", `${big(ND.callers[0])} to ${big(ND.callers[1])} customer-days`)}
            {stat(`${ND.tenuredSharePct}%`, "of the growth is customers with 1+ year tenure", `${big(ND.tenure.oneYearPlus[0])} to ${big(ND.tenure.oneYearPlus[1])}; first 30 days ${big(ND.tenure.first30[0])} to ${big(ND.tenure.first30[1])}`)}
            {stat(`~${ND.offnetSharePct}%`, "of the growth is the offnet (Bell) East group", `under ${ND.offnetBasePct}% of customers; the group tripled in size`)}
          </div>
          <p className="hb-prose">Every No Dataflow caller from 1 July to 27 September in each year, compared with all internet customers. Lift is the share of callers with a trait divided by the share of the base with it: 1× means no more common among callers than among everyone.</p>
          <figure>
            <div className="hb-figtitle">Lift of selected traits among No Dataflow callers, {Y.y0} and {Y.y1}</div>
            <div className="hb-chart">{hbars(ND.lifts.map((l) => ({ label: l.t, a: l.lift[1], b: l.lift[0] })), { max: 12, step: 2, ref: 1, refLabel: "no lift = 1×", fmt: (v) => v.toFixed(1) + "×", labelW: 268, keys: [{ key: "a", color: barB }, { key: "b", color: barC }] })}</div>
            {legend([{ label: String(Y.y1), color: barB }, { label: String(Y.y0), color: barC }])}
            <figcaption>Line faults and GPON problems run 5 to 10× in both years, 3+ reboots about 4×, the first 30 days of service about 8×, and recent deliveries or plan changes about 3×. No new telemetry signal appeared in {Y.y1}; the growth is more customers in the same states. Not factors: {ND.notFactors}.</figcaption>
          </figure>
          <div className="hb-two">
            <div className="hb-note bad">
              <h3>Two device findings to review</h3>
              <p>The Arcadyan NH20A gateway runs at 1.4× in both years, and in {Y.y1} its main firmware build v1.18.07-build02 runs at 1.7× while v1.18.06-build02 runs at 0.7×. The new TELUS Boost Wi-Fi 7 extender runs at 1.8×. Traits overlap with new installs, so a check within one tenure group and region would separate them.</p>
            </div>
            <div className="hb-note">
              <h3>The offnet East group</h3>
              <p>Offnet (Bell network), PureFibre East, the 1.5GB XT plans and the SalesOne provisioning stack are the same customers. The group tripled and its No Dataflow callers rose {num(ND.lifts[6].n[0])} to {num(ND.lifts[6].n[1])}. SalesOne did not exist in {Y.y0}. No initiative in the register targets this group.</p>
            </div>
          </div>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="hb-s7">
          <summary><h2 id="hb-s7">7. Field and customer evidence point the same way</h2></summary>
          <div className="hb-body">
          <figure>
            <div className="hb-figtitle">How {shortMon(mons[2])} field visits closed, by what the agent diagnosed</div>
            <div className="hb-chart">{stacked(align, [{ color: barA, dark: true }, { color: barC, opacity: 0.85 }, { color: barB }])}</div>
            {legend([{ label: "Aligned with the agent", color: barA }, { label: "No fault found", color: barC, opacity: 0.85 }, { label: "Re-attributed elsewhere", color: barB }])}
            <figcaption>Technicians confirm the line-side categories (ONT Not Ranged {K.divergence.perCat[2].alignment.toFixed(0)}% aligned, No Sync {K.divergence.perCat.find((r) => r.cat.endsWith("No Sync")) ? K.divergence.perCat.find((r) => r.cat.endsWith("No Sync")).alignment.toFixed(0) : "—"}%) and not the Wi-Fi ones ({Math.round(Math.min(...wifiAlign))}% to {Math.round(Math.max(...wifiAlign))}% aligned, most closing as no fault). That mirrors the telemetry: the in-home drivers are real but are the hardest to diagnose remotely, which is where the Wi-Fi certification and CloudCheck work earns its place.</figcaption>
          </figure>
          <figure>
            <div className="hb-figtitle">Why customers rated reliability fair or poor, {svM[0]} and {svM[2]} (share of detractors citing each)</div>
            <div className="hb-chart">{hbars(svDrivers.map((d) => ({ label: d.name, a: d.pct[2], b: d.pct[0] })), { max: 50, step: 10, fmt: (v) => v.toFixed(0) + "%", keys: [{ key: "a", color: barB }, { key: "b", color: barC }] })}</div>
            {legend([{ label: svM[2], color: barB }, { label: svM[0], color: barC }])}
            <figcaption>Frequent loss of connection is the top reason at {sv.drivers[0].pct[2].toFixed(0)}% and grew {sd(sv.drivers[0].pct[2] - sv.drivers[0].pct[0], 1)} points over the summer, the customer's words for No Dataflow and outage-tagged tickets. Negative verbatims rose {sd(sv.polarity.negative[2] - sv.polarity.negative[0], 1)} points to {sv.polarity.negative[2].toFixed(1)}%. The survey runs to {sv.months[sv.months.length - 1]}, one month behind the operational data.</figcaption>
          </figure>
          </div>
        </details>

        <footer>
          <p>Sources: "TELUS Internet: why support tickets rose year over year" (support ticket analysis, {Y.period} {Y.y1} vs {Y.y0}, all TELUS-branded internet excluding Koodo, data through {Y.dataThrough}; internet_daily, Remedy, HSIC orders and tickets, CloudCheck and GPON telemetry); Churn Measurement 2026 workbook (KPIs, Looker ticket categories); TS Calls Offered by Product (calls); HSIA agent and technician notes analysis ({HSA.months[0]} to {HSA.months[2]}); CF&R TELUS Internet survey ({sv.months[0]} to {sv.months[2]}); Initiatives register.</p>
          <p>Caveats carried from the analysis: {Y.caveats.join(" ")}</p>
          <p>Method notes: dashboard quarter totals sum the three months and rates are the simple average of the monthly rates per 100 subscribers; technician alignment is the share of field-visit closures whose domain matches the agent's category. Analysis figures are transcribed, not recomputed, and are refreshed when a new edition of the analysis is supplied.</p>
        </footer>
        </div>
      </>
    );
  }

  // ------------------------------ TV review (STB Stuck on Initializing) ------------------------------
  function TvBriefPage() {
    const col = colors.TV, R = TV_REVIEW, D = R.daily, L = R.looker;
    const H = T.heading, MUTED = T.textMuted, RULE = T.border;
    const AMBER = isDark ? "#F0A55B" : "#B86E00", ONE = isDark ? "#9B7BC2" : "#7C53A5", MULTI = T.textFaint;
    const css = briefCss(col, AMBER);
    const sum = (arr) => arr.reduce((a, b) => a + (b || 0), 0);
    const num = (v, d = 0) => (v == null ? "—" : d ? v.toFixed(d) : Math.round(v).toLocaleString());
    const pct = (a, b) => (b ? ((a - b) / b) * 100 : null);
    const sp = (x, d = 0) => (x == null ? "n/a" : (x > 0 ? "+" : "") + x.toFixed(d) + "%");
    const sd = (x, d = 2) => (x == null ? "n/a" : (x > 0 ? "+" : "") + x.toFixed(d));
    const sn = (v) => (v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v)).toLocaleString());
    const big = fmtBig;
    const flag = (v, goodDown = true, thr = 3) => {
      if (v == null) return null;
      const tone = Math.abs(v) < thr ? "flat" : (v < 0) === goodDown ? "ok" : "warn";
      return <span className={`hb-flag hb-${tone}`}>{tone === "flat" ? "flat" : v > 0 ? "up" : "down"}</span>;
    };
    const stat = (v, label, sub) => (
      <div className="hb-stat"><div className="hb-stat-v">{v}</div><div className="hb-stat-l">{label}</div>{sub && <div className="hb-stat-s">{sub}</div>}</div>
    );
    const legend = (items) => <div className="hb-legend">{items.map((it) => <span key={it.label}><i className="hb-sw" style={{ background: it.color, opacity: it.opacity == null ? 1 : it.opacity }} />{it.label}</span>)}</div>;

    // ---- month totals from the daily exports ----
    const KEYS = ["aug", "sep", "oct"];
    const M = KEYS.map((k) => { const d = D[k]; return { key: k, label: d.label, short: d.label.slice(0, 3), days: d.days, tickets: sum(d.tickets), stuck: sum(d.stuck), all: sum(d.all), multi: sum(d.multi), one: sum(d.one) }; });
    const perDay = (m, f) => m[f] / m.days;
    const [A, S, O] = M;
    const octNote = `Oct 1 – ${R.octDays}`;
    // dashboard KPI months (Looker Assure / Reliability Deact KPIs); October is not yet reported there
    const iAug = MONTHS.indexOf("Aug 2026"), iSep = MONTHS.indexOf("Sep 2026");
    const K = { tv: TV_REVIEW_FROZEN.tv, tr: TV_REVIEW_FROZEN.tr, calls: TV_REVIEW_FROZEN.calls, rv: DATA.repairVolume.TV, rr: DATA.repairRate.TV, ch: DATA.churnRate.TV, base: DATA.subBase.TV };
    const legacy = TV_PLATFORMS.find((p) => p.id === "legacy"), opus = TV_PLATFORMS.find((p) => p.id === "opus");
    // Looker history
    const li = (m) => L.months.indexOf(m);
    const lSep = li("Sep 2026"), lOct = li("Oct 2026"), lAug = li("Aug 2026"), lJul = li("Jul 2026");
    const yr26 = L.months.map((m, i) => i).filter((i) => L.months[i].endsWith("2026"));
    // weekly blocks (Monday to Sunday) across Aug 1 – Oct 28
    const dayList = [];
    KEYS.forEach((k) => { const d = D[k]; const mon = { aug: 7, sep: 8, oct: 9 }[k]; for (let i = 0; i < d.days; i++) dayList.push({ date: new Date(Date.UTC(2026, mon, i + 1)), tickets: d.tickets[i], stuck: d.stuck[i], all: d.all[i], multi: d.multi[i], one: d.one[i] }); });
    const weeks = [];
    dayList.forEach((d) => {
      const dow = (d.date.getUTCDay() + 6) % 7; // Monday = 0
      const start = new Date(d.date); start.setUTCDate(d.date.getUTCDate() - dow);
      let w = weeks.find((x) => x.start.getTime() === start.getTime());
      if (!w) { w = { start, days: 0, tickets: 0, stuck: 0, all: 0, multi: 0, one: 0 }; weeks.push(w); }
      w.days += 1; w.tickets += d.tickets; w.stuck += d.stuck; w.all += d.all; w.multi += d.multi; w.one += d.one;
    });
    const fmtDay = (dt) => `${dt.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dt.getUTCMonth()]}`;
    const roll = (arr, n = 7) => arr.map((_, i) => (i < n - 1 ? null : +(sum(arr.slice(i - n + 1, i + 1)) / n).toFixed(1)));
    const dAll = dayList.map((d) => d.all), dOne = dayList.map((d) => d.one), dMulti = dayList.map((d) => d.multi), dStuck = dayList.map((d) => d.stuck);
    const rAll = roll(dAll), rOne = roll(dOne), rMulti = roll(dMulti), rStuck = roll(dStuck);

    // ---- daily line figure (own SVG: no per-point labels, month separators, 7-day averages) ----
    const svgText = { fontFamily: FONT, fontSize: 12, fill: MUTED };
    const dailyChart = () => {
      const W = 800, Hh = 260, left = 44, right = 16, top = 16, bottom = 28, n = dayList.length;
      const pw = W - left - right, ph = Hh - top - bottom, max = 220;
      const x = (i) => left + (i * pw) / (n - 1), y = (v) => top + ph - (v / max) * ph;
      const path = (arr) => { let d = "", pen = false; arr.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? " L" : " M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`; pen = true; }); return d; };
      const dots = (arr, c) => arr.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={1.6} fill={c} opacity={0.35} />);
      const monthStarts = dayList.map((d, i) => (d.date.getUTCDate() === 1 ? i : null)).filter((i) => i != null);
      const sepIdx = dayList.findIndex((d) => d.date.getUTCMonth() === 8 && d.date.getUTCDate() === 25);
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block", minWidth: 560 }}>
          {[0, 50, 100, 150, 200].map((g) => <g key={g}><line x1={left} x2={W - right} y1={y(g)} y2={y(g)} stroke={RULE} /><text x={left - 8} y={y(g) + 4} textAnchor="end" style={svgText}>{g}</text></g>)}
          {monthStarts.map((i) => <g key={i}><line x1={x(i)} x2={x(i)} y1={top} y2={top + ph} stroke={T.borderStrong} strokeDasharray="3 3" /><text x={x(i) + 5} y={Hh - 8} style={{ ...svgText, fontWeight: 700 }}>{dayList[i].date.toLocaleString("en-CA", { month: "short", timeZone: "UTC" })} 2026</text></g>)}
          {sepIdx > 0 && <g><line x1={x(sepIdx)} x2={x(sepIdx)} y1={top} y2={top + ph} stroke={AMBER} strokeDasharray="2 3" /><text x={x(sepIdx) + 4} y={top + 10} style={{ ...svgText, fill: AMBER, fontSize: 11 }}>Cujo off (25 Sep)</text></g>}
          <line x1={left} x2={W - right} y1={y(L.baseline.all / 30.4)} y2={y(L.baseline.all / 30.4)} stroke={col} strokeDasharray="6 4" opacity={0.7} />
          <text x={W - right} y={y(L.baseline.all / 30.4) - 5} textAnchor="end" style={{ ...svgText, fill: col, fontSize: 11 }}>All STBs baseline {Math.round(L.baseline.all / 30.4)}/day (Jan – Jul 2026)</text>
          {dots(dAll, col)}{dots(dOne, ONE)}
          <path d={path(rAll)} fill="none" stroke={col} strokeWidth={2.6} />
          <path d={path(rOne)} fill="none" stroke={ONE} strokeWidth={2.6} />
          <path d={path(rMulti)} fill="none" stroke={MULTI} strokeWidth={1.8} />
        </svg>
      );
    };
    // horizontal bars for the sub-categories (per day, three months)
    const hbars3 = (rows, { max, fmt, labelW = 250 }) => {
      const W = 700, Lw = labelW, Rw = 56, top = 22, bh = 12, gap = 3, gh = 3 * (bh + gap) + 14, Hh = top + rows.length * gh + 26, x = (v) => Lw + ((W - Lw - Rw) * v) / max;
      const cols3 = [T.borderStrong, ONE, col];
      const step = max <= 20 ? 5 : max <= 100 ? 20 : 50, ticks = []; for (let g = 0; g <= max + 1e-9; g += step) ticks.push(g);
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block", minWidth: 520 }}>
          {ticks.map((g) => <g key={g}><line x1={x(g)} x2={x(g)} y1={top - 6} y2={Hh - 22} stroke={RULE} /><text x={x(g)} y={Hh - 6} textAnchor="middle" style={svgText}>{fmt(g)}</text></g>)}
          {rows.map((r, i) => { const yy = top + i * gh; return (
            <g key={r.name}>
              <text x={0} y={yy + bh + 4} style={{ ...svgText, fill: T.text, fontSize: 12.5 }}>{r.name}</text>
              {r.v.map((v, k) => <g key={k}><rect x={Lw} y={yy + k * (bh + gap)} width={Math.max(0, x(Math.min(v, max)) - Lw)} height={bh} rx={2} fill={cols3[k]} /><text x={x(Math.min(v, max)) + 5} y={yy + k * (bh + gap) + bh - 2} style={{ ...svgText, fontSize: 11 }}>{fmt(v)}</text></g>)}
            </g>); })}
        </svg>
      );
    };
    const stackedPct = (rows, segs) => {
      const W = 700, Lw = 150, Rw = 10, top = 8, rh = 40, bh = 22, Hh = top + rows.length * rh + 24, span = W - Lw - Rw;
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block", minWidth: 520 }}>
          {[0, 25, 50, 75, 100].map((g) => <g key={g}><line x1={Lw + (span * g) / 100} x2={Lw + (span * g) / 100} y1={top} y2={Hh - 22} stroke={RULE} /><text x={Lw + (span * g) / 100} y={Hh - 6} textAnchor="middle" style={svgText}>{g}%</text></g>)}
          {rows.map((r, i) => { const yy = top + i * rh; let acc = Lw; return (
            <g key={r.label}><text x={0} y={yy + bh / 2 + 5} style={{ ...svgText, fill: T.text, fontSize: 13 }}>{r.label}</text>
              {r.p.map((v, k) => { const w = (span * v) / 100, xx = acc; acc += w; return <g key={k}><rect x={xx} y={yy} width={w} height={bh} fill={segs[k].color} /><text x={xx + w / 2} y={yy + bh / 2 + 4} textAnchor="middle" style={{ ...svgText, fontSize: 12, fill: segs[k].dark ? T.bg : T.text }}>{w > 34 ? v.toFixed(0) + "%" : ""}</text></g>; })}
            </g>); })}
        </svg>
      );
    };

    // ---- side-load cohorts: before / after bars by side-load date ----
    const SL = SLS, f2 = (v) => v.toFixed(2);
    const cohortChart = (key, { max, W = 800, Hh = 280, fs = 11 }) => {
      const left = 38, right = 6, top = 18, bottom = 36, n = SL.rows.length;
      const pw = W - left - right, ph = Hh - top - bottom, gw = pw / n, bw = Math.min(20, gw * 0.36);
      const y = (v) => top + ph - (v / max) * ph;
      const step = max > 2 ? 1 : 0.5, ticks = []; for (let g = 0; g <= max + 1e-9; g += step) ticks.push(g);
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block" }}>
          {ticks.map((g) => <g key={g}><line x1={left} x2={W - right} y1={y(g)} y2={y(g)} stroke={RULE} /><text x={left - 5} y={y(g) + 4} textAnchor="end" style={{ ...svgText, fontSize: fs }}>{g}%</text></g>)}
          {SL.rows.map((r, i) => { const cx = left + gw * i + gw / 2; return (
            <g key={r.date}>
              <rect x={cx - bw - 1} y={y(r[key][0])} width={bw} height={Math.max(0, top + ph - y(r[key][0]))} fill={T.borderStrong} rx={1.5} />
              <rect x={cx + 1} y={y(r[key][1])} width={bw} height={Math.max(0, top + ph - y(r[key][1]))} fill={col} rx={1.5} />
              <text x={cx - bw / 2 - 1} y={y(r[key][0]) - 3} textAnchor="middle" style={{ ...svgText, fontSize: fs - 2 }}>{f2(r[key][0])}</text>
              <text x={cx + 1 + bw / 2} y={y(r[key][1]) - 3} textAnchor="middle" style={{ ...svgText, fontSize: fs - 2, fill: T.text }}>{f2(r[key][1])}</text>
              <text x={cx} y={Hh - 20} textAnchor="middle" style={{ ...svgText, fontSize: fs }}>{r.short}</text>
              <text x={cx} y={Hh - 7} textAnchor="middle" style={{ ...svgText, fontSize: fs - 1.5 }}>{big(r.devices)}</text>
            </g>); })}
        </svg>
      );
    };
    const nbS = LOOKER.TV.topCat.series; // STB No Boot (Looker, TV) by LOOKER_MONTHS
    const nbBase = sum(nbS.slice(12, 19)) / 7, nbOctExcess = nbS[21] - nbBase, stuckOctExcess = L.total[lOct] - L.baseline.total;
    const nbJulVsJun = pct(nbS[18], nbS[17]);
    const num10 = (v) => num(Math.round(v / 10) * 10);

    // ---- derived numbers for the prose ----
    const allUpVsAug = pct(perDay(O, "all"), perDay(A, "all")), oneUpVsAug = pct(perDay(O, "one"), perDay(A, "one"));
    const stuckSepVsAug = pct(S.stuck, A.stuck), stuckOctVsSep = pct(perDay(O, "stuck"), perDay(S, "stuck"));
    const allShare = (m) => (m.all / m.stuck) * 100;
    const allVsBase = pct(L.all[lSep], L.baseline.all), oneVsBase = pct(L.one[lSep], L.baseline.one), totVsBase = pct(L.total[lSep], L.baseline.total);
    const risePts = (L.total[lSep] - L.baseline.total), riseAll = L.all[lSep] - L.baseline.all;
    const cujoIdx = dayList.findIndex((d) => d.date.getUTCMonth() === 8 && d.date.getUTCDate() === 25);
    const beforeCujo = sum(dStuck.slice(cujoIdx - 14, cujoIdx)) / 14, afterCujo = sum(dStuck.slice(cujoIdx, cujoIdx + 14)) / 14;
    const restOct = (R.stbNoBootTotal[2] - O.stuck) / O.days, restSep = (R.stbNoBootTotal[1] - S.stuck) / S.days;
    const inits = INITIATIVES.filter((it) => it.p === "TV" && R.actions.some((a) => a.kind === "initiative" && a.name === it.name));
    const T3 = R.markers[0], SEQ = R.markers[5], DISP = R.markers[6], TECH = R.markers[7];
    const mshare = (m, i) => ((m.v[i] / R.markersBase[i]) * 100).toFixed(1) + "%";
    const STATUS_TONE = { leading: "bad", contributing: "", open: "purple", "ruled out": "ok" };
    const STATUS_LABEL = { leading: "Leading hypothesis", contributing: "Contributing factor", open: "Open question", "ruled out": "Ruled out" };

    // ---- presentation mode (Deck): the page as Slidev-style slides ----
    const dstat = (v, label, sub) => <div className="dk-stat"><div className="dk-stat-v">{v}</div><div className="dk-stat-l">{label}</div>{sub && <div className="dk-stat-s">{sub}</div>}</div>;
    const dlegend = (items) => <div className="dk-legend">{items.map((it) => <span key={it.label}><i style={{ background: it.color, opacity: it.opacity == null ? 1 : it.opacity }} />{it.label}</span>)}</div>;
    const fullWeeks = weeks.filter((w) => w.days === 7);
    const causesBy = (statuses) => R.causes.filter((c) => statuses.includes(c.status));
    const slides = [
      { layout: "cover", title: "STB Stuck on Initializing", sub: `TV review · ${R.period} (agent exports to Oct ${R.octDays}) · TV performance, the trend against its baseline with the All STBs / One STB split, possible root causes and what is being done`,
        notes: `Agent exports to ${R.asOf}; Looker to October (full month); dashboard KPIs to ${TV_REVIEW_LATEST}; interlocks of 21, 22, 27 and 28 Oct 2026.` },
      { layout: "statement", title: `Stuck on Initializing jumped ${sp(stuckSepVsAug)} in September and has held there through October. The whole rise is households where every STB is stuck, which points at the gateway, not the box.`,
        notes: "The one-line answer to the two questions asked: is October trending like September, and what is causing it." },
      { layout: "default", title: "August to October at a glance", sub: `Daily figures from the TV agent ticket exports (Aug 1 to Oct ${R.octDays}); dashboard KPIs to ${TV_REVIEW_LATEST}; rates per 100 subscribers`, clicks: 6,
        body: (step, C) => <div className="dk-stats">
          {C(1, dstat(num(perDay(O, "stuck")), `Stuck on Initializing per day · ${octNote}`, `Aug ${num(perDay(A, "stuck"))} · Sep ${num(perDay(S, "stuck"))} · ${sp(stuckOctVsSep)} vs Sep`))}
          {C(2, dstat(num(perDay(O, "all")), `All STBs Affected per day · ${octNote}`, `Aug ${num(perDay(A, "all"))} · Sep ${num(perDay(S, "all"))} · ${sp(allUpVsAug)} vs Aug`))}
          {C(3, dstat(num(perDay(O, "one")), `One STB Affected per day · ${octNote}`, `Aug ${num(perDay(A, "one"))} · Sep ${num(perDay(S, "one"))} · ${sp(oneUpVsAug)} vs Aug`))}
          {C(4, dstat(allShare(O).toFixed(0) + "%", "All STBs share of Stuck tickets · Oct", `Aug ${allShare(A).toFixed(0)}% · Sep ${allShare(S).toFixed(0)}%`))}
          {C(5, dstat(((O.stuck / O.tickets) * 100).toFixed(1) + "%", "Stuck share of all TV tickets · Oct", `Aug ${((A.stuck / A.tickets) * 100).toFixed(1)}% · Sep ${((S.stuck / S.tickets) * 100).toFixed(1)}%`))}
          {C(6, dstat(fmtRate(K.tr[iSep]), "TV ticket rate per 100 subs · Sep", `Aug ${fmtRate(K.tr[iAug])} · ${sd(K.tr[iSep] - K.tr[iAug])} per 100 · October not yet reported`))}
        </div>,
        notes: "Each click reveals one card. The first three are the daily run rates; the fourth is the share of Stuck tickets where every STB is affected; the last is the dashboard ticket rate, which only runs to September." },
      { layout: "default", title: "In short", clicks: 7,
        body: (step, C) => <ul>
          <li>{C(1, <><strong>September was a step change, and October is the new level, not a further climb.</strong> {num(A.stuck)} tickets in August, {num(S.stuck)} in September ({sp(stuckSepVsAug)}); October runs at {num(perDay(O, "stuck"))} a day against {num(perDay(S, "stuck"))} ({sp(stuckOctVsSep)}); {num(O.stuck)} tickets in the 30 days exported.</>)}</li>
          <li>{C(2, <><strong>The rise is almost entirely All STBs Affected.</strong> {num(L.baseline.all)} a month from January to July, {num(L.all[lSep])} in September ({sp(allVsBase)}); One STB Affected {sp(oneVsBase)}. {((riseAll / risePts) * 100).toFixed(0)}% of the September excess over baseline is All STBs Affected.</>)}</li>
          <li>{C(3, <><strong>Every box in the home failing at once is a gateway symptom.</strong> The T3200M is named in {mshare(T3, 1)} of October Stuck tickets and is {R.t3200ShareOfGatewayNamed[1]}% of gateways named; about 70% of affected customers are on it.</>)}</li>
          <li>{C(4, <><strong>Leading hypothesis: the CloudCheck agent side-load upgrade on T3200M gateways, aggravated by long uptime.</strong> Onset lags two to four weeks; the fault clears with a gateway-then-STB reboot; rollback rejected on security grounds; Cujo off on 25 Sep did not move the series.</>)}</li>
          <li>{C(5, <><strong>The first device-level test points the same way.</strong> Across {SL.n} side-load dates ({num(SL.devices)} devices), devices with a No Boot ticket rose from {f2(SL.anyNB[0])}% to {f2(SL.anyNB[1])}% after the side-load and with a Valid IP ticket from {f2(SL.anyVIP[0])}% to {f2(SL.anyVIP[1])}%, in every cohort. No control group yet.</>)}</li>
          <li>{C(6, <><strong>The fixes have not reached customers yet.</strong> Sequential Reboot (In flight, Nov 2026) is the only initiative aimed at the mechanism; the agent release delta and gateway-marker analysis are due the week of 2 November.</>)}</li>
          <li>{C(7, <><strong>Wider TV performance moved with it.</strong> TV tickets {sp(pct(K.tv[iSep], K.tv[iAug]), 0)} and the ticket rate {sd(K.tr[iSep] - K.tr[iAug])} per 100 from August to September; the rest of STB No Boot is down {Math.abs(pct(restOct, restSep)).toFixed(0)}% per day in October.</>)}</li>
        </ul>,
        notes: "Six points, one per click. Point two is the key finding for the audience: the split by Category 3 isolates the rise to All STBs Affected." },
      { layout: "section", num: "01", title: "TV performance, August to October", sub: "The dashboard quarter, and what the agent exports say about October" },
      { layout: "two-cols", title: "TV performance, August to October", clicks: 2,
        body: (step, C) => <>
          <div className="dk-stats" style={{ gridTemplateColumns: "1fr 1fr", alignContent: "start" }}>
            {dstat(big(K.tv[iSep]), "TV tickets · Sep", `${big(K.tv[iAug])} in Aug · ${sp(pct(K.tv[iSep], K.tv[iAug]), 1)}`)}
            {dstat(fmtRate(K.tr[iSep]), "Ticket rate per 100 · Sep", `${fmtRate(K.tr[iAug])} in Aug · ${sd(K.tr[iSep] - K.tr[iAug])}`)}
            {dstat(big(K.calls[iSep]), "Calls offered · Sep", `${big(K.calls[iAug])} in Aug · ${sp(pct(K.calls[iSep], K.calls[iAug]), 1)}`)}
            {dstat(fmtRate(K.rr[iSep]), "Repair rate per 100 · Sep", `${fmtRate(K.rr[iAug])} in Aug · ${sd(K.rr[iSep] - K.rr[iAug])}`)}
            {dstat(fmtRate(K.ch[iSep]), "Churn rate per 100 · Sep", `${fmtRate(K.ch[iAug])} in Aug · ${sd(K.ch[iSep] - K.ch[iAug])}`)}
            {dstat(big(legacy.base[iSep]), "Optik TV Legacy base · Sep", `${big(legacy.base[iAug])} in Aug · ${sp(pct(legacy.base[iSep], legacy.base[iAug]), 1)}`)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 15 }}>
            {C(1, <p style={{ margin: 0 }}>September is the seasonal peak and 2026 followed the pattern, but harder: tickets rose {sp(pct(K.tv[iSep], K.tv[iAug]), 0)} on August against {sp(pct(K.tv[iSep - 12], K.tv[iAug - 12]), 0)} over the same months of 2025. Stuck on Initializing alone added {sn(S.stuck - A.stuck)} tickets, about {((S.stuck - A.stuck) / (S.tickets - A.tickets) * 100).toFixed(0)}% of the whole TV increase in the agent exports.</p>)}
            {C(2, <p style={{ margin: 0 }}>Repairs and churn did not follow: the repair rate stayed at {fmtRate(K.rr[iSep])} and churn at {fmtRate(K.ch[iSep])} per 100, because the fault is cleared by a reboot rather than a truck or a swap. October demand overall eased about {Math.abs(pct(perDay(O, "tickets"), perDay(S, "tickets"))).toFixed(0)}% per day and Stuck on Initializing {sp(stuckOctVsSep)}, so the category is holding at its September level rather than climbing further.</p>)}
          </div>
        </>,
        notes: "Left: the dashboard's September KPIs with August for comparison. Right, two clicks: the seasonal comparison and the repairs and churn read." },
      { layout: "section", num: "02", title: "Stuck on Initializing against its baseline", sub: "Looker, Optik TV Legacy, by Category 3, Jan 2025 to Oct 2026" },
      { layout: "default", title: "Monthly history by Category 3", sub: "Jan 2025 to Oct 2026, full months", clicks: 1,
        body: (step, C) => <>
          <StackedBarChart labels={L.months} stacks={[{ name: "One STB Affected", data: L.one, color: ONE }, { name: "Multiple STBs Affected", data: L.multi, color: MULTI }, { name: "All STBs Affected", data: L.all, color: col }]} height={230} yFmt={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + "K" : String(Math.round(v)))} T={T} />
          {dlegend([{ label: "All STBs Affected", color: col }, { label: "Multiple STBs Affected", color: MULTI }, { label: "One STB Affected", color: ONE }])}
          {C(1, <p className="dk-cap" style={{ margin: 0 }}>Through 2025 and the first seven months of 2026 the category drifted down with the Legacy base while All STBs Affected held near {num(L.baseline.all)} a month. From August it broke out: {num(L.all[lJul])} in July, {num(L.all[lAug])} in August, {num(L.all[lSep])} in September and {num(L.all[lOct])} in October. One STB Affected rose with the season and is back near its baseline.</p>)}
        </>,
        notes: "The green segment is All STBs Affected. Point at July to October: the green doubles while purple (One STB) barely moves." },
      { layout: "fact", big: sp(allVsBase), sub: `All STBs Affected in September 2026 against its Jan to Jul 2026 average: ${num(L.baseline.all)} to ${num(L.all[lSep])} a month. One STB Affected over the same period: ${sp(oneVsBase)}. The whole category: ${sp(totVsBase)}.`,
        notes: `Of the ${sn(risePts)} September tickets above baseline, ${sn(riseAll)} are All STBs Affected.` },
      { layout: "section", num: "03", title: "Day by day", sub: "The rise is All STBs Affected, and October has plateaued" },
      { layout: "default", title: `Stuck tickets per day by Category 3, 1 Aug to ${R.octDays} Oct`, sub: "Lines are 7-day averages, dots are daily values", clicks: 1,
        body: (step, C) => <>
          <div style={{ width: "100%" }}>{dailyChart()}</div>
          {dlegend([{ label: "All STBs Affected", color: col }, { label: "One STB Affected", color: ONE }, { label: "Multiple STBs Affected", color: MULTI }, { label: "Jan – Jul 2026 All STBs baseline", color: col, opacity: 0.5 }])}
          {C(1, <p className="dk-cap" style={{ margin: 0 }}>All STBs Affected climbed through August from about {num(sum(dAll.slice(0, 7)) / 7)} a day to {num(sum(dAll.slice(24, 31)) / 7)}, reached its September level in the second week of September and has stayed between {num(Math.min(...fullWeeks.filter((w) => w.start.getUTCMonth() >= 8).map((w) => w.all / w.days)))} and {num(Math.max(...fullWeeks.filter((w) => w.start.getUTCMonth() >= 8).map((w) => w.all / w.days)))} a day since. The climb starts about three weeks after the CloudCheck agent rollout began on 6 July. Cujo being disabled on 25 September did not move the series ({num(beforeCujo)} a day before, {num(afterCujo)} after).</p>)}
        </>,
        notes: "The dashed green line is the Jan to Jul baseline for All STBs Affected, about 36 a day. The amber marker is 25 September, when Cujo was disabled on the T3200M." },
      { layout: "two-cols", title: "Weekly run rate and the split", clicks: 1,
        body: (step, C) => <>
          <div style={{ overflow: "hidden" }}>
            <table>
              <thead><tr><th>Week starting</th><th>Stuck / day</th><th>All STBs / day</th><th>One STB / day</th><th>All share</th></tr></thead>
              <tbody>{fullWeeks.map((w) => <tr key={w.start.getTime()}><td>{fmtDay(w.start)}</td><td style={{ fontWeight: 700 }}>{num(w.stuck / w.days)}</td><td style={{ color: w.all / w.days > L.baseline.all / 30.4 * 1.3 ? T.bad : T.text, fontWeight: 600 }}>{num(w.all / w.days)}</td><td>{num(w.one / w.days)}</td><td>{((w.all / w.stuck) * 100).toFixed(0)}%</td></tr>)}</tbody>
            </table>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Share of Stuck on Initializing tickets by Category 3</div>
            {stackedPct(M.map((m) => ({ label: m.key === "oct" ? `${m.short} (to ${R.octDays}th)` : m.label, p: [allShare(m), (m.multi / m.stuck) * 100, (m.one / m.stuck) * 100] })), [{ color: col, dark: true }, { color: MULTI }, { color: ONE, dark: true }])}
            {dlegend([{ label: "All STBs Affected", color: col }, { label: "Multiple STBs Affected", color: MULTI }, { label: "One STB Affected", color: ONE }])}
            {C(1, <p className="dk-cap" style={{ margin: 0 }}>All STBs Affected was {allShare(A).toFixed(0)}% of Stuck tickets in August and {allShare(O).toFixed(0)}% in October. A single box failing to initialise is usually that box; every box failing at once is the gateway or the middleware session behind it.</p>)}
          </div>
        </>,
        notes: "Full Monday-to-Sunday weeks only. Red figures are more than 30% above the All STBs baseline." },
      { layout: "section", num: "04", title: "The rest of STB No Boot, and what the notes say" },
      { layout: "two-cols", title: "Sub-categories per day, and markers in the ticket notes", clicks: 1,
        body: (step, C) => <>
          <div>
            {hbars3(R.stbNoBoot.map((r) => ({ name: r.name, v: [r.v[0] / A.days, r.v[1] / S.days, r.v[2] / O.days] })), { max: 200, fmt: (v) => num(v), labelW: 190 })}
            {dlegend([{ label: "Aug", color: T.borderStrong }, { label: "Sep", color: ONE }, { label: `Oct (to the ${R.octDays}th)`, color: col }])}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <table>
              <thead><tr><th>Marker in Stuck ticket notes</th><th>Sep</th><th>Oct</th></tr></thead>
              <tbody>{R.markers.map((m) => <tr key={m.name}><td>{m.name}</td><td>{mshare(m, 0)}</td><td>{mshare(m, 1)}</td></tr>)}</tbody>
            </table>
            {C(1, <p className="dk-cap" style={{ margin: 0 }}>Stuck on Initializing and Red X are the only sub-categories more than 10% above their August run rate; the rest sit within a few percent of August and below their September peak. The profile of a Stuck ticket did not change: the T3200M is {R.t3200ShareOfGatewayNamed[1]}% of gateways named, a sequential reboot is recorded in {mshare(SEQ, 1)} of tickets, a dispatch in {mshare(DISP, 1)}. The fix is still an agent-led reboot in the great majority of cases.</p>)}
          </div>
        </>,
        notes: "Left: STB No Boot sub-categories per day for the three months. Right: shares of Stuck tickets whose notes mention each marker, same regular expressions in both months." },
      { layout: "section", num: "05", title: "Possible root causes", sub: "As the STB No Boot interlocks left them on 28 October" },
      { layout: "default", title: "Leading hypothesis and contributing factors", clicks: causesBy(["leading", "contributing"]).length,
        body: (step, C) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px" }}>
          {causesBy(["leading", "contributing"]).map((c, k) => C(k + 1, <div className={`dk-note ${c.status === "leading" ? "bad" : "amber"}`} style={{ fontSize: 13 }}><h3>{c.name}<span className="dk-pill">{STATUS_LABEL[c.status]}</span></h3>{c.evidence}</div>))}
        </div>,
        notes: "The working picture: a change on the T3200M gateway in July and August made gateways with long uptime lose the middleware session for every attached Mediaroom STB, and it clears when the gateway is rebooted before the boxes." },
      { layout: "default", title: "Testing it: the same devices before and after the side-load", sub: `${SL.n} side-load dates with 10,000+ devices each (${num(SL.devices)} devices) · about ${Math.round(SL.preDays)} days before and ${Math.round(SL.postDays)} after each device's own side-load date`, clicks: 6,
        body: (step, C) => <div className="dk-stats">
          {C(1, dstat(`${f2(SL.anyNB[0])}% → ${f2(SL.anyNB[1])}%`, "Devices with a No Boot ticket", `${sp(SL.upAnyNB, 0)} after the side-load`))}
          {C(2, dstat(`${f2(SL.anyVIP[0])}% → ${f2(SL.anyVIP[1])}%`, "Devices with a Valid IP ticket", `${sp(SL.upAnyVIP, 0)} after the side-load`))}
          {C(3, dstat(`${f2(SL.m.twoNB[0])}% → ${f2(SL.m.twoNB[1])}%`, "Two or more No Boot tickets", `${sp(SL.upTwoNB, 0)} · ${Math.round(SL.repNB[1])}% of affected devices (${Math.round(SL.repNB[0])}% before)`))}
          {C(4, dstat(`${SL.worse} of ${SL.pairs}`, "Cohort and measure pairs worse after", `all ${SL.n} cohorts, all four measures`))}
          {C(5, dstat(`+${num10(SL.extra.nb)}`, "More devices a month with a No Boot ticket", `these cohorts only · Looker Stuck ${sn(stuckOctExcess)} on baseline in Oct`))}
          {C(6, dstat(`+${num10(SL.extra.vip)}`, "More devices a month with a Valid IP ticket", "same cohorts · not in the Stuck count"))}
        </div>,
        notes: `Chris Tanner's pre/post cut by deployment date, 2 Nov. The windows are close to the same length, and the post window is the shorter one in ${SL.postNotLonger} of ${SL.n} cohorts, so the comparison is conservative. One ticket and two or more are separate groups; the two-or-more Valid IP figure is rounded to two decimals in the source, so treat its relative change as indicative.` },
      { layout: "two-cols", title: "Every cohort moved the same way", sub: "Devices with one ticket in the window, before and after the side-load, by side-load date (device count under each date)", clicks: 1,
        body: (step, C) => <>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>No Boot, % of devices</div>
            {cohortChart("oneNB", { max: 3.5, W: 520, Hh: 300, fs: 10 })}
            {dlegend([{ label: "Before", color: T.borderStrong }, { label: "After", color: col }])}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Valid IP, % of devices</div>
            {cohortChart("oneVIP", { max: 1.6, W: 520, Hh: 300, fs: 10 })}
            {C(1, <p className="dk-cap" style={{ margin: "8px 0 0" }}>One-ticket No Boot is up {sp(SL.upMin, 0)} to {sp(SL.upMax, 0)} by cohort and Valid IP {sp(SL.upOneVIP, 0)} overall. The two May cohorts rose {sp(SL.may.upOneNB, 0)}, the July and August cohorts {sp(SL.julAug.upOneNB, 0)}.</p>)}
          </div>
        </>,
        notes: "Left: No Boot. Right: Valid IP. The May cohorts closed their post window in early August, before the fleet-wide climb, and still rose, so the effect follows the device's own side-load date rather than the calendar." },
      { layout: "two-cols", title: "What the cohorts add, and what they leave open", clicks: 2, dense: true,
        body: (step, C) => <>
          {C(1, <div className="dk-note ok"><h3>Adds</h3><ul style={{ paddingLeft: 18, fontSize: 13.5 }}>
            <li><strong>Devices, not timing.</strong> The same devices compared with themselves, {SL.worse} of {SL.pairs} pairs worse.</li>
            <li><strong>The device's own date.</strong> May cohorts rose {sp(SL.may.upOneNB, 0)} before the fleet climb; Looker STB No Boot was {sp(nbJulVsJun, 0)} June to July.</li>
            <li><strong>Valid IP is the same event.</strong> About {num10(SL.extra.vip)} more devices a month that the Stuck count misses.</li>
            <li><strong>Big enough.</strong> About {num10(SL.extra.nb)} more devices a month with a No Boot ticket, against {sn(nbOctExcess)} STB No Boot tickets in Looker in Oct.</li>
            <li><strong>Repeats follow, not lead.</strong> About {Math.round(SL.repNB[1])}% of affected devices, as before.</li></ul></div>)}
          {C(2, <div className="dk-note amber"><h3>Leaves open</h3><ul style={{ paddingLeft: 18, fontSize: 13.5 }}>
            <li><strong>No control group.</strong> Not-yet-side-loaded devices on the same days would test calendar effects.</li>
            <li><strong>No time profile.</strong> A days-since-side-load curve would separate an immediate step from a two to four week build-up.</li>
            <li><strong>No split.</strong> Not by sub-category, All STBs / One STB or gateway uptime, so the mechanism is not yet tied.</li>
            <li><strong>May.</strong> The 11 and 12 May dates sit outside the 6 July to 16 August rollout window; what was deployed needs confirming.</li></ul></div>)}
        </>,
        notes: "Supports the leading hypothesis without proving the mechanism. The follow-ups are suggestions for Chris Tanner and Chris Havlin, not agreed commitments." },
      { layout: "default", title: "Ruled out", clicks: causesBy(["ruled out"]).length,
        body: (step, C) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 24px" }}>
          {causesBy(["ruled out"]).map((c, k) => C(k + 1, <div className="dk-note ok" style={{ fontSize: 13.5 }}><h3>{c.name}<span className="dk-pill">{STATUS_LABEL[c.status]}</span></h3>{c.evidence}{c.next && c.next !== "None." ? ` Next: ${c.next}` : ""}</div>))}
        </div>,
        notes: "Cujo and firmware are ruled out by the data; repeat callers by the repeat rate; the agent rollback by security." },
      { layout: "section", num: "06", title: "What is being done" },
      { layout: "two-cols", title: "Initiatives and interlock commitments",
        body: <>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {inits.map((it) => { const a = R.actions.find((x) => x.name === it.name); return <div key={it.name} className="dk-note" style={{ fontSize: 13 }}><h3><StatusChip status={it.status} T={T} /> <span style={{ marginLeft: 6 }}>{it.name}</span></h3><div style={{ color: MUTED, fontSize: 12 }}>{it.timeline} · {it.prime}</div>{a ? a.detail : it.desc}</div>; })}
          </div>
          <table style={{ alignSelf: "start" }}>
            <thead><tr><th>Interlock commitment</th><th style={{ textAlign: "left" }}>Owner</th><th style={{ textAlign: "left" }}>Due</th></tr></thead>
            <tbody>{R.actions.filter((a) => a.kind === "action").map((a) => <tr key={a.name}><td><div style={{ fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 11.5, color: MUTED }}>{a.detail}</div></td><td style={{ textAlign: "left" }}>{a.owner}</td><td style={{ textAlign: "left", whiteSpace: "nowrap" }}>{a.when}</td></tr>)}</tbody>
          </table>
        </>,
        notes: "Sequential Reboot is the only item aimed at the mechanism; the others improve diagnosis or confirm the cause. Only the InSight diagnosis fix has launched; nothing aimed at the mechanism has reached customers yet." },
      { layout: "two-cols", title: "Gaps, and what is working", clicks: 2,
        body: (step, C) => <>
          {C(1, <div className="dk-note bad"><h3>Gaps</h3><ul style={{ paddingLeft: 18 }}>
            <li>No customer-facing fix is live; the reboot pilot has a cohort but no start date and excludes mixed OPUS and SHS homes.</li>
            <li>About {num(((R.markersBase[1] - R.markers[6].v[1]) / R.markersBase[1]) * 100)}% of Stuck tickets close without a dispatch on an agent-led reboot, so the same gateways will fault again until uptime is addressed proactively.</li>
            <li>Miscategorised internet tickets (HS Valid IP, No Dataflow on Mediaroom homes) are not yet counted in the impact or the campaign measurement; the side-load cohorts alone show about {num10(SL.extra.vip)} extra devices a month with a Valid IP ticket.</li></ul></div>)}
          {C(2, <div className="dk-note ok"><h3>Working</h3><ul style={{ paddingLeft: 18 }}>
            <li>The rise has stopped: October is {sp(stuckOctVsSep)} per day on September and the All STBs weekly run rate has been flat since mid-September.</li>
            <li>The agent-led gateway-then-STB reboot clears the fault, so repairs and swaps have not followed tickets; the TV repair rate is {fmtRate(K.rr[iSep])} per 100.</li>
            <li>The cause is narrowed to one gateway model and one change window, with the first device-level test supporting it and the gateway-marker analysis due the week of 2 November.</li></ul></div>)}
        </>,
        notes: "Close on the ask: a start date for the reboot pilot and the agent release review." },
      { layout: "end", title: "Sources and method", sub: `TV agent ticket exports (Aug 1 to Oct ${R.octDays}, counts per day, no customer data retained) · Churn Measurement 2026 workbook (Reliability/Deact KPIs; TV Looker Ticket Categories by Category 3) · TS Calls Offered by Product · TV Customer Base Breakdown · STB No Boot interlocks of 21, 22, 27 and 28 Oct 2026 · Sideload Pre/Post Dashboard (Chris Tanner, 2 Nov 2026) · Initiatives register. Per-day figures divide month totals by days in the month; 7-day averages are trailing; baselines are simple monthly averages; note markers are regular-expression matches and count mentions, not confirmed causes.`,
        notes: "The full write-up with every table is the TV › Review page on the dashboard." }
    ];

    return (
      <>
        {deckSlide != null && <Deck slides={slides} index={deckSlide - 1} onIndex={(k) => setDeckSlide(k + 1)} onExit={() => setDeckSlide(null)} T={T} color={col} isDark={isDark} title="TV review · STB Stuck on Initializing" />}
        <div className="hb">
        <style>{css}</style>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -26 }}>
          <button onClick={() => setDeckSlide(1)} title="Open this review as slides (arrow keys to navigate, Esc to exit)"
            style={{ background: col, color: "#fff", border: "none", borderRadius: 999, padding: "7px 16px", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(0,0,0,.14)" }}>
            <span style={{ fontSize: 10 }}>▶</span> Present · {slides.length} slides
          </button>
        </div>
        <section aria-labelledby="tb-kpis">
          <h2 id="tb-kpis">August to October at a glance</h2>
          <div className="hb-stats">
            {stat(num(perDay(O, "stuck")), `Stuck on Initializing per day · ${octNote}`, `Aug ${num(perDay(A, "stuck"))} · Sep ${num(perDay(S, "stuck"))} · ${sp(stuckOctVsSep)} vs Sep`)}
            {stat(num(perDay(O, "all")), `All STBs Affected per day · ${octNote}`, <>Aug {num(perDay(A, "all"))} · Sep {num(perDay(S, "all"))} · <span className="hb-warn" style={{ fontWeight: 700 }}>{sp(allUpVsAug)} vs Aug</span></>)}
            {stat(num(perDay(O, "one")), `One STB Affected per day · ${octNote}`, `Aug ${num(perDay(A, "one"))} · Sep ${num(perDay(S, "one"))} · ${sp(oneUpVsAug)} vs Aug`)}
            {stat(allShare(O).toFixed(0) + "%", "All STBs share of Stuck tickets · Oct", `Aug ${allShare(A).toFixed(0)}% · Sep ${allShare(S).toFixed(0)}%`)}
            {stat(((O.stuck / O.tickets) * 100).toFixed(1) + "%", "Stuck on Initializing share of TV tickets · Oct", `Aug ${((A.stuck / A.tickets) * 100).toFixed(1)}% · Sep ${((S.stuck / S.tickets) * 100).toFixed(1)}%`)}
            {stat(fmtRate(K.tr[iSep]), "TV ticket rate per 100 subs · Sep", <>Aug {fmtRate(K.tr[iAug])} · <span className={K.tr[iSep] > K.tr[iAug] ? "hb-warn" : "hb-ok"} style={{ fontWeight: 700 }}>{sd(K.tr[iSep] - K.tr[iAug])} per 100</span> · October not yet reported</>)}
          </div>
          <p className="hb-prose" style={{ marginTop: 10 }}>Daily figures come from the TV agent ticket exports (Aug 1 to Oct {R.octDays}); the dashboard's own KPIs run to {TV_REVIEW_LATEST}. Rates are per 100 subscribers. Red is worse, green is better.</p>
          <div className="hb-tw">
            <table>
              <thead><tr><th>Dashboard measure</th><th>Aug</th><th>Sep</th><th>Oct (to {R.octDays}th)</th><th>Sep vs Aug</th><th></th></tr></thead>
              <tbody>
                <tr><td>TV tickets (Looker Assure)</td><td className="n">{num(K.tv[iAug])}</td><td className="n">{num(K.tv[iSep])}</td><td className="n">—</td><td className="n">{sp(pct(K.tv[iSep], K.tv[iAug]), 1)}</td><td>{flag(pct(K.tv[iSep], K.tv[iAug]))}</td></tr>
                <tr><td>TV tickets in the agent exports</td><td className="n">{num(A.tickets)}</td><td className="n">{num(S.tickets)}</td><td className="n">{num(O.tickets)} <span style={{ color: MUTED }}>({num(perDay(O, "tickets"))}/day)</span></td><td className="n">{sp(pct(S.tickets, A.tickets), 1)}</td><td>{flag(pct(S.tickets, A.tickets))}</td></tr>
                <tr><td>Ticket rate per 100 subs</td><td className="n">{fmtRate(K.tr[iAug])}</td><td className="n">{fmtRate(K.tr[iSep])}</td><td className="n">—</td><td className="n">{sd(K.tr[iSep] - K.tr[iAug])}</td><td>{flag(pct(K.tr[iSep], K.tr[iAug]))}</td></tr>
                <tr><td>Calls offered</td><td className="n">{num(K.calls[iAug])}</td><td className="n">{num(K.calls[iSep])}</td><td className="n">—</td><td className="n">{sp(pct(K.calls[iSep], K.calls[iAug]), 1)}</td><td>{flag(pct(K.calls[iSep], K.calls[iAug]))}</td></tr>
                <tr><td>Repairs / dispatches</td><td className="n">{num(K.rv[iAug])}</td><td className="n">{num(K.rv[iSep])}</td><td className="n">—</td><td className="n">{sp(pct(K.rv[iSep], K.rv[iAug]), 1)}</td><td>{flag(pct(K.rv[iSep], K.rv[iAug]))}</td></tr>
                <tr><td>Repair rate per 100 subs</td><td className="n">{fmtRate(K.rr[iAug])}</td><td className="n">{fmtRate(K.rr[iSep])}</td><td className="n">—</td><td className="n">{sd(K.rr[iSep] - K.rr[iAug])}</td><td>{flag(pct(K.rr[iSep], K.rr[iAug]))}</td></tr>
                <tr><td>Churn rate per 100 subs</td><td className="n">{fmtRate(K.ch[iAug])}</td><td className="n">{fmtRate(K.ch[iSep])}</td><td className="n">—</td><td className="n">{sd(K.ch[iSep] - K.ch[iAug])}</td><td>{flag(pct(K.ch[iSep], K.ch[iAug]))}</td></tr>
                <tr><td>Optik TV Legacy tickets (Looker)</td><td className="n">{num(legacy.tickets[iAug])}</td><td className="n">{num(legacy.tickets[iSep])}</td><td className="n">—</td><td className="n">{sp(pct(legacy.tickets[iSep], legacy.tickets[iAug]), 1)}</td><td>{flag(pct(legacy.tickets[iSep], legacy.tickets[iAug]))}</td></tr>
                <tr><td>Optik TV Legacy ticket rate per 100 subs</td><td className="n">{fmtRate(legacy.ticketRate[iAug])}</td><td className="n">{fmtRate(legacy.ticketRate[iSep])}</td><td className="n">—</td><td className="n">{sd(legacy.ticketRate[iSep] - legacy.ticketRate[iAug])}</td><td>{flag(pct(legacy.ticketRate[iSep], legacy.ticketRate[iAug]))}</td></tr>
                <tr><td>TV Evolution tickets (Looker)</td><td className="n">{num(opus.tickets[iAug])}</td><td className="n">{num(opus.tickets[iSep])}</td><td className="n">—</td><td className="n">{sp(pct(opus.tickets[iSep], opus.tickets[iAug]), 1)}</td><td>{flag(pct(opus.tickets[iSep], opus.tickets[iAug]))}</td></tr>
                <tr><td>Stuck on Initializing (Looker, Legacy)</td><td className="n">{num(L.total[lAug])}</td><td className="n">{num(L.total[lSep])}</td><td className="n">{num(L.total[lOct])}</td><td className="n">{sp(pct(L.total[lSep], L.total[lAug]), 1)}</td><td>{flag(pct(L.total[lSep], L.total[lAug]))}</td></tr>
                <tr><td>Stuck on Initializing (agent exports)</td><td className="n">{num(A.stuck)}</td><td className="n">{num(S.stuck)}</td><td className="n">{num(O.stuck)} <span style={{ color: MUTED }}>({num(perDay(O, "stuck"))}/day)</span></td><td className="n">{sp(stuckSepVsAug, 1)}</td><td>{flag(stuckSepVsAug)}</td></tr>
              </tbody>
            </table>
          </div>
          <p className="hb-prose" style={{ fontSize: 13.5 }}>The Looker and agent-export counts differ by about 1% because the export is pulled a few days after month end and Looker is re-pulled later (the October export ends on the 30th, so it sits about 4% under Looker); both are shown so the trend can be read against either source. October dashboard KPIs (ticket rate, calls, repairs, churn) arrive with the November scorecard.</p>
        </section>

        <header className="hb-head">
          <div className="hb-eyebrow">TV · {R.period} · STB No Boot › Stuck on Initializing: what happened in September, is October the same, and what is being done</div>
          <h1>Stuck on Initializing jumped {sp(stuckSepVsAug)} in September and has held there through October. The whole rise is households where every STB is stuck, which points at the gateway, not the box.</h1>
          <p className="hb-sub">TV performance for August to October {TV_REVIEW_LATEST.slice(-4)} (agent exports to Oct {R.octDays}), the Stuck on Initializing trend against its 2025 and Jan to Jul 2026 baselines with the All STBs Affected / One STB Affected split, the root-cause hypotheses as the STB No Boot interlocks left them, the first device-level test of the leading one, and the fixes in flight.</p>
          <div className="hb-meta"><span>Reliability Strategy</span><span>Agent exports to {R.asOf}</span><span>Looker to Oct 2026 (full month)</span><span>Dashboard KPIs to {TV_REVIEW_LATEST}</span><span>Interlocks 21, 22, 27 and 28 Oct 2026</span><span>Side-load cohorts shared 2 Nov</span></div>
        </header>

        <section aria-labelledby="tb-short">
          <div className="hb-answer">
            <h3 id="tb-short" style={{ color: H }}>In short</h3>
            <ol>
              <li><strong>September was a step change, and October is the new level, not a further climb.</strong> Stuck on Initializing went from {num(A.stuck)} tickets in August to {num(S.stuck)} in September ({sp(stuckSepVsAug)}); October is running at {num(perDay(O, "stuck"))} a day against {num(perDay(S, "stuck"))} in September ({sp(stuckOctVsSep)}); {num(O.stuck)} tickets in the 30 days exported against {num(L.total[lOct])} in Looker for the full month. Every October week sits between {num(Math.min(...weeks.filter((w) => w.start.getUTCMonth() === 9 && w.days >= 5).map((w) => w.stuck / w.days)))} and {num(Math.max(...weeks.filter((w) => w.start.getUTCMonth() === 9 && w.days >= 5).map((w) => w.stuck / w.days)))} a day.</li>
              <li><strong>The rise is almost entirely All STBs Affected.</strong> In Looker, All STBs Affected ran at {num(L.baseline.all)} a month from January to July, {num(L.all[lAug])} in August and {num(L.all[lSep])} in September ({sp(allVsBase)} on the baseline); One STB Affected moved from {num(L.baseline.one)} to {num(L.one[lSep])} ({sp(oneVsBase)}). Of the {sn(risePts)} September tickets above baseline, {sn(riseAll)} ({((riseAll / risePts) * 100).toFixed(0)}%) are All STBs Affected. The agent exports agree: All STBs Affected is {sp(allUpVsAug)} per day on August in October, One STB Affected {sp(oneUpVsAug)}.</li>
              <li><strong>Every box in the home failing at once is a gateway symptom.</strong> {mshare(T3, 1)} of October Stuck tickets name the T3200M gateway and it is {R.t3200ShareOfGatewayNamed[1]}% of the gateways named; the interlock data puts about 70% of affected customers on the T3200M. There is no correlation to STB model, number of STBs, or fibre versus copper, and repeat callers are not the driver: repeats are up in step but stay about {Math.round(SL.repNB[1])}% of affected devices.</li>
              <li><strong>Leading hypothesis: the CloudCheck agent side-load upgrade (v2.5 to 3.418, 6 Jul to 16 Aug) on T3200M gateways, aggravated by long gateway uptime.</strong> Onset lags two to four weeks, ticketed gateways skew to no reboot in more than 30 days, and the fault clears with a gateway-then-STB reboot. Rolling the agent back was rejected on security grounds. Cujo being disabled on 25 September did not move the series ({num(beforeCujo)} a day in the fortnight before, {num(afterCujo)} after).</li>
              <li><strong>The first device-level test points the same way.</strong> Across {SL.n} side-load dates with more than 10,000 devices each ({num(SL.devices)} devices), the share of devices with a No Boot ticket rose from {f2(SL.anyNB[0])}% to {f2(SL.anyNB[1])}% after the side-load and with a Valid IP ticket from {f2(SL.anyVIP[0])}% to {f2(SL.anyVIP[1])}%, in every cohort and over windows of about {Math.round(SL.postDays)} to {Math.round(SL.preDays)} days either side. It is a before and after cut with no control group and no All STBs / One STB split, so it supports the hypothesis without yet proving the mechanism.</li>
              <li><strong>The fixes have not reached customers yet.</strong> The Sequential Reboot campaign (In flight, Nov 2026) is the only initiative aimed at the mechanism and its pilot cohort was agreed on 22 October; the InSight TV Hardware Check fix (Launched, Oct 2026) improves diagnosis; the agent release delta and gateway-marker analysis are due the week of 2 November. The full October month landed flat on September in Looker (5,205 tickets against 5,236).</li>
              <li><strong>Wider TV performance moved with it.</strong> TV tickets rose {sp(pct(K.tv[iSep], K.tv[iAug]), 0)} and the ticket rate {sd(K.tr[iSep] - K.tr[iAug])} per 100 subscribers from August to September; Optik TV Legacy tickets rose {sp(pct(legacy.tickets[iSep], legacy.tickets[iAug]), 0)} on a base that shrank {Math.abs(pct(legacy.base[iSep], legacy.base[iAug])).toFixed(1)}%. The rest of STB No Boot (reboot loop, client errors, TELUS logo) is down {Math.abs(pct(restOct, restSep)).toFixed(0)}% per day in October on September, so the elevated plateau is now this one symptom.</li>
            </ol>
          </div>
        </section>

        <details className="hb-sec" aria-labelledby="tb-s1">
          <summary><h2 id="tb-s1">1. TV performance, August to October</h2></summary>
          <div className="hb-body">
            <div className="hb-stats">
              {stat(big(K.tv[iSep]), `TV tickets · Sep`, `${big(K.tv[iAug])} in Aug · ${sp(pct(K.tv[iSep], K.tv[iAug]), 1)}`)}
              {stat(fmtRate(K.tr[iSep]), "Ticket rate per 100 subs · Sep", `${fmtRate(K.tr[iAug])} in Aug · ${sd(K.tr[iSep] - K.tr[iAug])}`)}
              {stat(big(K.calls[iSep]), "Calls offered · Sep", `${big(K.calls[iAug])} in Aug · ${sp(pct(K.calls[iSep], K.calls[iAug]), 1)}`)}
              {stat(fmtRate(K.rr[iSep]), "Repair rate per 100 subs · Sep", `${fmtRate(K.rr[iAug])} in Aug · ${sd(K.rr[iSep] - K.rr[iAug])}`)}
              {stat(fmtRate(K.ch[iSep]), "Churn rate per 100 subs · Sep", `${fmtRate(K.ch[iAug])} in Aug · ${sd(K.ch[iSep] - K.ch[iAug])}`)}
              {stat(big(legacy.base[iSep]), "Optik TV Legacy base · Sep", `${big(legacy.base[iAug])} in Aug · ${sp(pct(legacy.base[iSep], legacy.base[iAug]), 1)}`)}
            </div>
            <p className="hb-prose">September is the seasonal peak for TV and 2026 followed the pattern, but harder: tickets rose {sp(pct(K.tv[iSep], K.tv[iAug]), 0)} on August against {sp(pct(K.tv[iSep - 12], K.tv[iAug - 12]), 0)} over the same two months of 2025, and the ticket rate reached {fmtRate(K.tr[iSep])} per 100 subscribers, the highest since {MONTHS[K.tr.findIndex((v, i) => i < iSep && v >= K.tr[iSep])] || "Jan 2025"}. STB No Boot is the largest TV category and added {sn(TVA.tickets.agentCat[0].v[2] - TVA.tickets.agentCat[0].v[1])} tickets in September; Stuck on Initializing alone added {sn(S.stuck - A.stuck)}, about {((S.stuck - A.stuck) / (S.tickets - A.tickets) * 100).toFixed(0)}% of the whole TV increase in the agent exports. Repairs and churn did not follow: the repair rate stayed at {fmtRate(K.rr[iSep])} and churn at {fmtRate(K.ch[iSep])} per 100, because the fault is cleared by a reboot rather than a truck or a swap.</p>
            <p className="hb-prose" style={{ fontSize: 13.5 }}>October in the agent exports is {num(perDay(O, "tickets"))} TV tickets a day against {num(perDay(S, "tickets"))} in September, so total TV demand eased about {Math.abs(pct(perDay(O, "tickets"), perDay(S, "tickets"))).toFixed(0)}% and Stuck on Initializing {sp(stuckOctVsSep)}: the category is holding at its September level rather than climbing further. Video freezing and pixelization are the October risers; Digital Box No Boot, Reboot Loop and remote programming are down.</p>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="tb-s2">
          <summary><h2 id="tb-s2">2. Stuck on Initializing against its baseline</h2></summary>
          <div className="hb-body">
            <div className="hb-stats">
              {stat(num(L.baseline2025.total), "2025 monthly average", `All STBs ${num(L.baseline2025.all)} · One STB ${num(L.baseline2025.one)}`)}
              {stat(num(L.baseline.total), `${L.baselineLabel}`, `All STBs ${num(L.baseline.all)} · One STB ${num(L.baseline.one)}`)}
              {stat(num(L.total[lSep]), "September 2026", <><span className="hb-warn" style={{ fontWeight: 700 }}>{sp(totVsBase)}</span> on the Jan – Jul average · {sp(pct(L.total[lSep], L.total[lSep - 12]))} YoY</>)}
              {stat(num(L.total[lOct]), "October (Looker, full month)", `${sp(pct(L.total[lOct], L.total[lSep]), 1)} vs Sep · All STBs ${num(L.all[lOct])} · One STB ${num(L.one[lOct])}`)}
            </div>
            <figure>
              <div className="hb-figtitle">Optik TV Legacy › STB No Boot › Stuck on Initializing by Category 3, monthly, Jan 2025 to Oct 2026</div>
              <div className="hb-chart"><StackedBarChart labels={L.months} stacks={[{ name: "One STB Affected", data: L.one, color: ONE }, { name: "Multiple STBs Affected", data: L.multi, color: MULTI }, { name: "All STBs Affected", data: L.all, color: col }]} height={260} yFmt={(v) => (v >= 1000 ? (v / 1000).toFixed(1) + "K" : String(Math.round(v)))} T={T} /></div>
              {legend([{ label: "All STBs Affected", color: col }, { label: "Multiple STBs Affected", color: MULTI }, { label: "One STB Affected", color: ONE }])}
              <figcaption>Through 2025 and the first seven months of 2026 the category drifted down with the Legacy base (One STB Affected fell from about {num(L.one[0])} to {num(L.one[lJul])} a month) while All STBs Affected held near {num(L.baseline.all)}. From August All STBs Affected broke out: {num(L.all[lJul])} in July, {num(L.all[lAug])} in August, {num(L.all[lSep])} in September and {num(L.all[lOct])} in October. One STB Affected rose with the season and is back near its baseline in October.</figcaption>
            </figure>
            <div className="hb-tw">
              <table>
                <thead><tr><th>2026</th>{yr26.map((i) => <th key={i}>{L.months[i].slice(0, 3)}{i === lOct ? "*" : ""}</th>)}</tr></thead>
                <tbody>
                  <tr><td>All STBs Affected</td>{yr26.map((i) => <td key={i} className="n" style={{ fontWeight: L.all[i] > L.baseline.all * 1.3 ? 700 : 400, color: L.all[i] > L.baseline.all * 1.3 ? T.bad : T.text }}>{num(L.all[i])}</td>)}</tr>
                  <tr><td>Multiple STBs Affected</td>{yr26.map((i) => <td key={i} className="n">{num(L.multi[i])}</td>)}</tr>
                  <tr><td>One STB Affected</td>{yr26.map((i) => <td key={i} className="n">{num(L.one[i])}</td>)}</tr>
                  <tr><td style={{ fontWeight: 700 }}>Total</td>{yr26.map((i) => <td key={i} className="n" style={{ fontWeight: 700 }}>{num(L.total[i])}</td>)}</tr>
                  <tr><td>All STBs share</td>{yr26.map((i) => <td key={i} className="n">{((L.all[i] / L.total[i]) * 100).toFixed(0)}%</td>)}</tr>
                </tbody>
              </table>
            </div>
            <p className="hb-prose" style={{ fontSize: 13.5 }}>Source: {L.source}</p>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="tb-s3">
          <summary><h2 id="tb-s3">3. Day by day: the rise is All STBs Affected, and October has plateaued</h2></summary>
          <div className="hb-body">
            <div className="hb-stats">
              {stat(num(perDay(A, "all")) + " → " + num(perDay(S, "all")) + " → " + num(perDay(O, "all")), "All STBs Affected per day, Aug → Sep → Oct", <><span className="hb-warn" style={{ fontWeight: 700 }}>{sp(allUpVsAug)}</span> October on August</>)}
              {stat(num(perDay(A, "one")) + " → " + num(perDay(S, "one")) + " → " + num(perDay(O, "one")), "One STB Affected per day, Aug → Sep → Oct", `${sp(oneUpVsAug)} October on August`)}
              {stat(num(perDay(A, "multi"), 1) + " → " + num(perDay(S, "multi"), 1) + " → " + num(perDay(O, "multi"), 1), "Multiple STBs Affected per day, Aug → Sep → Oct", `${sp(pct(perDay(O, "multi"), perDay(A, "multi")))} October on August`)}
              {stat(num(afterCujo) + " vs " + num(beforeCujo), "Stuck per day, 14 days after vs before Cujo was disabled (25 Sep)", "no step change either way")}
            </div>
            <figure>
              <div className="hb-figtitle">Stuck on Initializing tickets per day by Category 3, Aug 1 to Oct {R.octDays} 2026 (lines are 7-day averages, dots are daily values)</div>
              <div className="hb-chart">{dailyChart()}</div>
              {legend([{ label: "All STBs Affected", color: col }, { label: "One STB Affected", color: ONE }, { label: "Multiple STBs Affected", color: MULTI }, { label: "Jan – Jul 2026 All STBs baseline", color: col, opacity: 0.5 }])}
              <figcaption>All STBs Affected climbed through August from about {num(sum(dAll.slice(0, 7)) / 7)} a day in the first week to {num(sum(dAll.slice(24, 31)) / 7)} in the last, reached its September level in the second week of September and has stayed between {num(Math.min(...weeks.filter((w) => w.start.getUTCMonth() >= 8 && w.days >= 5).map((w) => w.all / w.days)))} and {num(Math.max(...weeks.filter((w) => w.start.getUTCMonth() >= 8 && w.days >= 5).map((w) => w.all / w.days)))} a day since. One STB Affected moved far less and is seasonal. The August climb starts about three weeks after the CloudCheck agent rollout began on 6 July and runs through the rollout's end on 16 August, consistent with the two to four week onset the interlock expects.</figcaption>
            </figure>
            <div className="hb-two">
              <div className="hb-tw">
                <table style={{ minWidth: 420 }}>
                  <thead><tr><th>Week starting</th><th>Days</th><th>Stuck / day</th><th>All STBs / day</th><th>One STB / day</th><th>All share</th></tr></thead>
                  <tbody>
                    {weeks.map((w) => <tr key={w.start.getTime()}><td>{fmtDay(w.start)}</td><td className="n">{w.days}</td><td className="n" style={{ fontWeight: 700 }}>{num(w.stuck / w.days)}</td><td className="n" style={{ color: w.all / w.days > L.baseline.all / 30.4 * 1.3 ? T.bad : T.text, fontWeight: 600 }}>{num(w.all / w.days)}</td><td className="n">{num(w.one / w.days)}</td><td className="n">{((w.all / w.stuck) * 100).toFixed(0)}%</td></tr>)}
                  </tbody>
                </table>
              </div>
              <figure>
                <div className="hb-figtitle">Share of Stuck on Initializing tickets by Category 3</div>
                <div className="hb-chart">{stackedPct(M.map((m) => ({ label: m.key === "oct" ? `${m.short} (to ${R.octDays}th)` : m.label, p: [allShare(m), (m.multi / m.stuck) * 100, (m.one / m.stuck) * 100] })), [{ color: col, dark: true }, { color: MULTI }, { color: ONE, dark: true }])}</div>
                {legend([{ label: "All STBs Affected", color: col }, { label: "Multiple STBs Affected", color: MULTI }, { label: "One STB Affected", color: ONE }])}
                <figcaption>All STBs Affected was {allShare(A).toFixed(0)}% of Stuck tickets in August and {allShare(O).toFixed(0)}% in October. A single box failing to initialise is usually that box; every box failing at once is the gateway or the middleware session behind it.</figcaption>
              </figure>
            </div>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="tb-s4">
          <summary><h2 id="tb-s4">4. The rest of STB No Boot, and what the notes say</h2></summary>
          <div className="hb-body">
            <p className="hb-prose">STB No Boot sub-categories from the agent exports, tickets per day in each month. Stuck on Initializing and Red X are the only sub-categories more than 10% above their August run rate; the other boot symptoms are back within a few percent of August and below their September peak, so the category's plateau is one symptom.</p>
            <figure>
              <div className="hb-figtitle">STB No Boot sub-categories, tickets per day · Aug, Sep, Oct (to {R.octDays}th)</div>
              <div className="hb-chart">{hbars3(R.stbNoBoot.map((r) => ({ name: r.name, v: [r.v[0] / A.days, r.v[1] / S.days, r.v[2] / O.days] })), { max: 200, fmt: (v) => num(v) })}</div>
              {legend([{ label: "Aug", color: T.borderStrong }, { label: "Sep", color: ONE }, { label: `Oct (to the ${R.octDays}th)`, color: col }])}
              <figcaption>STB No Boot in total: {num(R.stbNoBootTotal[0] / A.days)}, {num(R.stbNoBootTotal[1] / S.days)} and {num(R.stbNoBootTotal[2] / O.days)} tickets a day. Stuck on Initializing is {((O.stuck / R.stbNoBootTotal[2]) * 100).toFixed(0)}% of the category in October against {((A.stuck / R.stbNoBootTotal[0]) * 100).toFixed(0)}% in August.</figcaption>
            </figure>
            <div className="hb-tw">
              <table>
                <thead><tr><th>Marker in the Stuck on Initializing ticket notes</th><th>Sep tickets</th><th>Sep share</th><th>Oct tickets (to {R.octDays}th)</th><th>Oct share</th></tr></thead>
                <tbody>
                  {R.markers.map((m) => <tr key={m.name}><td>{m.name}</td><td className="n">{num(m.v[0])}</td><td className="n">{mshare(m, 0)}</td><td className="n">{num(m.v[1])}</td><td className="n">{mshare(m, 1)}</td></tr>)}
                </tbody>
              </table>
            </div>
            <p className="hb-prose" style={{ fontSize: 13.5 }}>The profile of a Stuck ticket did not change between September and October: the T3200M is named in {mshare(T3, 0)} then {mshare(T3, 1)} of tickets and is {R.t3200ShareOfGatewayNamed[0]}% then {R.t3200ShareOfGatewayNamed[1]}% of the gateways named (the NH20 is the other). A sequential reboot is recorded in {mshare(SEQ, 0)} then {mshare(SEQ, 1)}, a dispatch in {mshare(DISP, 0)} then {mshare(DISP, 1)}, and a technician determination in {mshare(TECH, 0)} then {mshare(TECH, 1)}. The fix is still an agent-led reboot in the great majority of cases, which is why repairs and swaps have not moved with the tickets. Written agent comments cover {((R.commentCoverage.oct[0] / R.commentCoverage.oct[1]) * 100).toFixed(0)}% of October tickets.</p>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="tb-s5">
          <summary><h2 id="tb-s5">5. Possible root causes</h2></summary>
          <div className="hb-body">
            <p className="hb-prose">As the STB No Boot interlocks left them on 28 October. The working picture: a change on the T3200M gateway in July and August made gateways with long uptime lose the middleware session for every attached Mediaroom STB, and it clears when the gateway is rebooted before the boxes.</p>
            <div className="hb-two" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
              {R.causes.map((c) => (
                <div key={c.name} className={`hb-note ${STATUS_TONE[c.status]}`}>
                  <h3>{c.name}<span className="hb-pill">{STATUS_LABEL[c.status]}</span></h3>
                  <p>{c.evidence}</p>
                  {c.next && c.next !== "None." && <p style={{ fontSize: 13, color: MUTED }}>Next: {c.next}</p>}
                </div>
              ))}
            </div>
            <p className="hb-prose" style={{ marginTop: 26 }}><strong>First device-level test of the leading hypothesis.</strong> Chris Tanner compared the same devices before and after their own side-load date for the {SL.n} deployment dates with more than 10,000 devices ({num(SL.devices)} devices: 11 and 12 May, then 15 July to 11 August), measuring the share of devices with a No Boot ticket and with a Valid IP ticket in each window. The windows are close to the same length (about {Math.round(SL.preDays)} days before and {Math.round(SL.postDays)} after, with the post window the shorter one in {SL.postNotLonger} of {SL.n} cohorts), so the shares are comparable and, if anything, understate the rise.</p>
            <div className="hb-stats">
              {stat(`${f2(SL.anyNB[0])}% → ${f2(SL.anyNB[1])}%`, "Devices with a No Boot ticket", `${sp(SL.upAnyNB, 0)} after the side-load · one ticket ${f2(SL.m.oneNB[0])}% → ${f2(SL.m.oneNB[1])}%`)}
              {stat(`${f2(SL.anyVIP[0])}% → ${f2(SL.anyVIP[1])}%`, "Devices with a Valid IP ticket", `${sp(SL.upAnyVIP, 0)} after the side-load · one ticket ${f2(SL.m.oneVIP[0])}% → ${f2(SL.m.oneVIP[1])}%`)}
              {stat(`${f2(SL.m.twoNB[0])}% → ${f2(SL.m.twoNB[1])}%`, "Devices with two or more No Boot tickets", `${sp(SL.upTwoNB, 0)} · ${Math.round(SL.repNB[1])}% of affected devices, ${Math.round(SL.repNB[0])}% before`)}
              {stat(`${SL.worse} of ${SL.pairs}`, "Cohort and measure pairs worse after", `all ${SL.n} cohorts on all four measures`)}
              {stat(`+${num10(SL.extra.nb)}`, "More devices a month with a No Boot ticket", `these ${SL.n} cohorts only · Looker Stuck on Initializing ${sn(stuckOctExcess)} on its baseline in October`)}
              {stat(`+${num10(SL.extra.vip)}`, "More devices a month with a Valid IP ticket", "same cohorts · not in the Stuck on Initializing count")}
            </div>
            <figure>
              <div className="hb-figtitle">Devices with one No Boot ticket, % of devices in the window, by side-load date</div>
              <div className="hb-chart">{cohortChart("oneNB", { max: 3.5 })}</div>
              {legend([{ label: "Before the side-load", color: T.borderStrong }, { label: "After the side-load", color: col }])}
              <figcaption>Every cohort is up, by {sp(SL.upMin, 0)} to {sp(SL.upMax, 0)}. The rate before the side-load is steady across cohorts ({f2(Math.min(...SL.rows.map((r) => r.oneNB[0])))}% to {f2(Math.max(...SL.rows.map((r) => r.oneNB[0])))}%) and so is the rate after ({f2(Math.min(...SL.rows.map((r) => r.oneNB[1])))}% to {f2(Math.max(...SL.rows.map((r) => r.oneNB[1])))}%). The labels under each date are the cohort's device count.</figcaption>
            </figure>
            <figure>
              <div className="hb-figtitle">Devices with one Valid IP ticket, % of devices in the window, by side-load date</div>
              <div className="hb-chart">{cohortChart("oneVIP", { max: 1.6 })}</div>
              {legend([{ label: "Before the side-load", color: T.borderStrong }, { label: "After the side-load", color: col }])}
              <figcaption>Valid IP tickets rise {sp(SL.upOneVIP, 0)} on one ticket per device, a bigger relative move than No Boot, in every cohort.</figcaption>
            </figure>
            <div className="hb-tw">
              <table>
                <thead><tr><th>Side-load date</th><th>Devices</th><th>Days before / after</th><th>One No Boot</th><th>Two or more No Boot</th><th>One Valid IP</th><th>Two or more Valid IP</th></tr></thead>
                <tbody>
                  {SL.rows.map((r) => (
                    <tr key={r.date}><td>{r.short}</td><td className="n">{num(r.devices)}</td><td className="n">{r.preDays} / {r.postDays}</td>
                      {["oneNB", "twoNB", "oneVIP", "twoVIP"].map((k) => <td key={k} className="n">{f2(r[k][0])} → {f2(r[k][1])}{k.startsWith("one") && r.up[k] != null && <span style={{ color: T.bad, fontWeight: 600 }}> {sp(r.up[k], 0)}</span>}</td>)}</tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}><td>All cohorts</td><td className="n">{num(SL.devices)}</td><td className="n">{Math.round(SL.preDays)} / {Math.round(SL.postDays)}</td>
                    {["oneNB", "twoNB", "oneVIP", "twoVIP"].map((k) => <td key={k} className="n">{f2(SL.m[k][0])} → {f2(SL.m[k][1])}{k.startsWith("one") && <span style={{ color: T.bad }}> {sp(SL["up" + k[0].toUpperCase() + k.slice(1)], 0)}</span>}</td>)}</tr>
                </tbody>
              </table>
            </div>
            <p className="hb-prose" style={{ fontSize: 13.5 }}>Percentages are the share of devices in the window with one ticket, or with two or more tickets; weights are device counts and the relative change is after over before. The source rounds to two decimals, so the two-or-more Valid IP figures ({f2(SL.twoVIPRange[0])}% to {f2(SL.twoVIPRange[1])}%) are only indicative. The cut is by ticket group, not by sub-category.</p>
            <div className="hb-two">
              <div className="hb-note ok">
                <h3>What it adds</h3>
                <ul className="hb-plain">
                  <li><strong>It moves the leading hypothesis from timing to devices.</strong> The case so far rested on the rollout dates and the gateway model. Here the same devices are compared with themselves, and all {SL.pairs} cohort and measure pairs worsened after the side-load.</li>
                  <li><strong>The effect follows each device's own side-load date, not the calendar.</strong> The two May cohorts ({num(SL.may.devices)} devices) closed their post window in early August, when Looker STB No Boot tickets had moved only {sp(nbJulVsJun, 0)} from June to July, and still rose {sp(SL.may.upOneNB, 0)} on one-ticket No Boot, against {sp(SL.julAug.upOneNB, 0)} for the July and August cohorts. A fleet-wide or seasonal change starting in August cannot do that.</li>
                  <li><strong>It ties the Valid IP rise to the same event.</strong> One-ticket Valid IP went from {f2(SL.m.oneVIP[0])}% to {f2(SL.m.oneVIP[1])}% of devices, about {num10(SL.extra.vip)} more devices a month across these cohorts alone. That is the first direct evidence that the miscategorised internet tickets belong to the same event, and they are not in the Stuck on Initializing count.</li>
                  <li><strong>It is big enough to account for the rise.</strong> About {num10(SL.extra.nb)} more devices a month with a No Boot ticket from these cohorts alone, against {sn(nbOctExcess)} STB No Boot tickets a month in Looker over its January to July average in October ({sn(stuckOctExcess)} for Stuck on Initializing alone). Smaller deployment dates are not in the file.</li>
                  <li><strong>Repeats rose in step but are not the driver.</strong> Devices with two or more No Boot tickets went from {f2(SL.m.twoNB[0])}% to {f2(SL.m.twoNB[1])}%, about {Math.round(SL.repNB[0])}% of affected devices before and {Math.round(SL.repNB[1])}% after, and {Math.round(SL.repAddedNB)}% of the devices added.</li>
                </ul>
              </div>
              <div className="hb-note">
                <h3>What it does not settle</h3>
                <ul className="hb-plain">
                  <li><strong>No control group.</strong> The after figures include anything that changed for every device between August and October. The staggered dates allow a cleaner test: side-loaded devices against not-yet-side-loaded devices on the same calendar days.</li>
                  <li><strong>No time profile.</strong> Windows of about {Math.round(SL.postDays)} to {Math.round(SL.preDays)} days cannot show whether the rise starts straight after the side-load or builds over two to four weeks, as the uptime hypothesis predicts. A weekly days-since-side-load curve would separate the two.</li>
                  <li><strong>No sub-category, All STBs / One STB split or gateway uptime.</strong> The cut cannot show that the extra tickets are Stuck on Initializing and All STBs Affected, or that they sit on long-uptime gateways, which is what would tie it to the mechanism.</li>
                  <li><strong>May.</strong> The 11 and 12 May cohorts sit outside the 6 July to 16 August rollout window in the interlock notes. What was deployed on those dates, and whether it was the same agent, needs confirming.</li>
                </ul>
              </div>
            </div>
          </div>
        </details>

        <details className="hb-sec" aria-labelledby="tb-s6">
          <summary><h2 id="tb-s6">6. What is being done</h2></summary>
          <div className="hb-body">
            <p className="hb-prose">Register initiatives with live status, then the commitments from the October interlocks. The Sequential Reboot campaign is the only item aimed at the mechanism itself; the others improve diagnosis or confirm the cause. Only the diagnosis fix has launched and nothing aimed at the mechanism has reached customers yet, so the October full-month figure should be read as the pre-fix baseline.</p>
            <figure>
              <div className="hb-figtitle">Initiatives in the register</div>
              <div>
                {inits.map((it) => { const a = R.actions.find((x) => x.name === it.name); return (
                  <div key={it.name} className="hb-init" style={{ gridTemplateColumns: "auto 1fr" }}>
                    <StatusChip status={it.status} T={T} />
                    <span style={{ fontWeight: 600, color: T.text, fontSize: 13.5 }}>{it.name}</span>
                    <span className="hb-m">{it.timeline} · {it.prime}{it.theme ? ` · ${it.theme}` : ""}</span>
                    <span className="hb-m" style={{ color: T.textSecondary }}>{a ? a.detail : it.desc}</span>
                  </div>); })}
              </div>
            </figure>
            <div className="hb-tw">
              <table>
                <thead><tr><th>Interlock commitment</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
                <tbody>
                  {R.actions.filter((a) => a.kind === "action").map((a) => <tr key={a.name}><td><div style={{ fontWeight: 600 }}>{a.name}</div><div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{a.detail}</div></td><td style={{ textAlign: "left" }}>{a.owner}</td><td style={{ textAlign: "left", whiteSpace: "nowrap" }}>{a.when}</td><td style={{ textAlign: "left" }}>{a.status}</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="hb-two">
              <div className="hb-note bad">
                <h3>Gaps</h3>
                <ul className="hb-plain">
                  <li>No customer-facing fix is live. The reboot pilot has a cohort but no start date, and the campaign excludes mixed OPUS and SHS homes, so part of the base stays uncovered.</li>
                  <li>About {num(((R.markersBase[1] - R.markers[6].v[1]) / R.markersBase[1]) * 100)}% of Stuck tickets close without a dispatch, mostly on an agent-led reboot, so the same gateways will fault again until the uptime driver is addressed proactively.</li>
                  <li>Miscategorised internet tickets (HS Valid IP, No Dataflow on Mediaroom homes) are not yet counted in the impact or the campaign measurement; the side-load cohorts alone show about {num10(SL.extra.vip)} extra devices a month with a Valid IP ticket.</li>
                </ul>
              </div>
              <div className="hb-note ok">
                <h3>Working</h3>
                <ul className="hb-plain">
                  <li>The rise has stopped: October is {sp(stuckOctVsSep)} per day on September, and the All STBs Affected weekly run rate has been flat since mid-September.</li>
                  <li>The agent-led gateway-then-STB reboot clears the fault, so repairs and swaps have not followed tickets: the TV repair rate is {fmtRate(K.rr[iSep])} per 100 and STB replacements are flat.</li>
                  <li>The cause has been narrowed to one gateway model and one change window, with the first device-level test supporting it and the gateway-marker analysis due the week of 2 November.</li>
                </ul>
              </div>
            </div>
          </div>
        </details>

        <footer>
          <p>Sources: TV agent ticket exports, Aug 1 to Oct {R.octDays} 2026 (Category 1 to 3, agent notes and resolution text; counts per day, no customer data retained); Churn Measurement 2026 workbook (Reliability/Deact KPIs; TV Looker Ticket Categories, Look 2154, Optik TV (Legacy) › STB No Boot › Stuck on Initializing by Category 3, Jan 2025 to Oct 2026); TS Calls Offered by Product; TV Customer Base Breakdown (platform base); STB No Boot interlock notes of 21, 22, 27 and 28 Oct 2026; Sideload Pre/Post Dashboard (Chris Tanner, 2 Nov 2026; aggregates by deployment date, no customer data); Initiatives register.</p>
          <p>Method notes: per-day figures divide month totals by days in the month (October by {R.octDays}); the 7-day averages are trailing; weeks run Monday to Sunday and partial weeks are shown with their day count. Baselines are simple monthly averages of the Looker series (2025, and January to July 2026). Note markers are regular-expression matches over the agent notes and resolution text of Stuck on Initializing tickets with the same patterns in both months; they count tickets that mention a thing, not confirmed causes. Side-load cohorts: the deployment dates with more than 10,000 devices from the Sideload Pre/Post Dashboard, each device compared over the days before and after its own side-load date (84 to 87 days before, 73 to 85 after); one ticket means exactly one ticket in the window and two or more means repeats, which I read as separate groups as the source adds them; weights are device counts. The cut is by ticket group, with no control group. Interlock content is transcribed from the meeting notes and will be refreshed as the analyses land.</p>
        </footer>
        </div>
      </>
    );
  }

  // ------------------------------ executive summary deck ------------------------------
  // "Sep – Oct 2026" style ranges (SHS workbook rows) count for every month they span.
  const MON3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // ------------------------------ HSIA October review ------------------------------
  // Same shape as the TV October Review: a headline, an "In short", then numbered sections. HSIA as a
  // whole (calls, tickets, repairs, deacts), HSIA West, TQ ILEC and PFE separately, then slow speeds.
  // Deacts are estimated as churn rate x subscriber base (no deact volume series exists on the KPI tab).
  function HsiaOctReviewPage() {
    const col = colors.HSIA, S = HSIA_OCT_REVIEW;
    const H = T.heading, MUTED = T.textMuted, RULE = T.border;
    const AMBER = isDark ? "#F0A55B" : "#B86E00";
    // more room between the In short bullets (page and slide); the editor's default is 2px
    const css = briefCss(col, AMBER) + ".hb .hb-answer .cm-doc li{margin:0 0 14px;line-height:1.6} .hb .hb-answer .cm-doc li:last-child{margin-bottom:0}";
    const num = (v) => fmtBig(v); // large-number notation: 53.4K, 2.08M; counts under 10,000 keep their separators
    const pct = (a, b) => (a != null && b ? ((a - b) / b) * 100 : null);
    const sp = (x, d = 1) => (x == null ? "n/a" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(d) + "%");
    const sn = (v) => (v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + fmtBig(Math.abs(v)));
    const iOct = MONTHS.indexOf("Oct 2026"), iSep = iOct - 1, iYoY = iOct - 12;
    const base = DATA.subBase.HSIA, churn = DATA.churnRate.HSIA;
    const overall = [
      { key: "calls", label: "Calls offered", vals: CALLS_SPLIT.HSIA.offered },
      { key: "tickets", label: "Tickets", vals: DATA.ticketVolume.HSIA },
      { key: "repairs", label: "Repairs / dispatches", vals: DATA.repairVolume.HSIA },
      { key: "deactRate", label: "Deact rate per 100 subs (go/national churn %)", vals: churn, rate: true }
    ];
    const groups = [
      { name: "HSIA West", color: colors.HSIA, calls: HSIA_WEST.callsOffered, tickets: HSIA_WEST.ticketVolume, repairs: HSIA_WEST.repairVolume, deactRate: null, slow: S.slow.west },
      { name: "TQ ILEC", color: colors.TQ, calls: TQ_ILEC.callsOffered, tickets: TQ_ILEC.ticketVolume, repairs: TQ_ILEC.repairVolume, deactRate: null, slow: S.slow.tq },
      { name: "PFE", color: colors.PFE, calls: PFE.callsOffered, tickets: PFE.ticketVolume, repairs: PFE.repairVolume, deactRate: PFE.churnRate, slow: S.slow.pfe }
    ];
    const metricKeys = [["calls", "Calls offered"], ["tickets", "Tickets"], ["repairs", "Repairs / dispatches"], ["deactRate", "Deact rate per 100 subs (churn %)"]];
    const svgText = { fontFamily: FONT, fontSize: 11.5, fill: MUTED };
    // one chart for every trend: a list of series, optionally indexed to a base month (= 100)
    const plot = (series, o = {}) => {
      const start = o.start || 0, W = o.w || 520, Hh = o.h || 210, l = 42, r = 58, t = 14, b = 26;
      const ks = []; for (let k = o.years ? 0 : start; k <= (o.years ? 11 : iOct); k++) ks.push(k);
      const M3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const prep = o.years ? [
        { name: "2025", color: o.c25, v: ks.map((k) => series[0].vals[k]) },
        { name: "2026", color: series[0].color, v: ks.map((k) => series[0].vals[12 + k]) }
      ] : series.map((sr) => ({ ...sr, v: ks.map((k) => {
        const x = sr.vals[k]; if (x == null) return null;
        if (o.index != null) { const bs = sr.vals[o.index]; return bs ? (x / bs) * 100 : null; }
        return x;
      }) }));
      const all = prep.flatMap((sr) => sr.v).filter((x) => x != null);
      if (!all.length) return <div className="hb-prose">No data</div>;
      const mn = Math.min(...all), mx = Math.max(...all), pad = (mx - mn) * 0.15 || 1, lo = mn - pad, hi = mx + pad;
      const pw = W - l - r, ph = Hh - t - b, f = o.fmt || fmtBig;
      const x = (j) => l + (j * pw) / (ks.length - 1), y = (v) => t + ph - ((v - lo) / (hi - lo)) * ph;
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block" }} role="img">
          {Array.from({ length: (o.big ? 4 : 2) + 1 }, (_, q) => q).map((q) => { const g = lo + ((hi - lo) * q) / (o.big ? 4 : 2); return <g key={q}><line x1={l} x2={W - r} y1={y(g)} y2={y(g)} stroke={RULE} /><text x={l - 6} y={y(g) + 4} textAnchor="end" style={svgText}>{f(g)}</text></g>; })}
          {ks.map((k, j) => (o.big || o.years || j % 3 === 0 || j === ks.length - 1 ? <text key={k} x={x(j)} y={Hh - 8} textAnchor="middle" style={{ ...svgText, fontSize: o.big ? 11 : 10.5 }}>{o.years ? M3[k] : o.big ? `${MONTHS[k].slice(0, 3)} ${MONTHS[k].slice(-2)}` : MONTHS[k].slice(0, 3)}</text> : null))}
          {(o.marks || []).map((mk) => {
            const j = ks.indexOf(mk.k); if (j < 0) return null;
            const left = j > ks.length / 3;
            return (
              <g key={mk.k}>
                <line x1={x(j)} x2={x(j)} y1={t - 4} y2={Hh - b} stroke={AMBER} strokeWidth={1.6} strokeDasharray="4 4" />
                <text x={x(j) + (left ? -6 : 6)} y={t + 6} textAnchor={left ? "end" : "start"} style={{ ...svgText, fontSize: o.big ? 12 : 10.5, fontWeight: 700, fill: AMBER }}>{mk.label}</text>
              </g>
            );
          })}
          {o.index != null && lo < 100 && hi > 100 && <line x1={l} x2={W - r} y1={y(100)} y2={y(100)} stroke={MUTED} strokeDasharray="4 4" />}
          {prep.map((sr) => {
            let d = "", pen = false;
            sr.v.forEach((v, j) => { if (v == null) { pen = false; return; } d += `${pen ? "L" : "M"}${x(j).toFixed(1)},${y(v).toFixed(1)}`; pen = true; });
            const lj = sr.v.map((v) => v != null).lastIndexOf(true);
            return (
              <g key={sr.name}>
                <path d={d} fill="none" stroke={sr.color} strokeWidth={o.big ? 3 : 2.4} />
                {o.big && sr.v.map((v, j) => (v == null ? null : <g key={j}><circle cx={x(j)} cy={y(v)} r={3.2} fill={sr.color} />{(series.length === 1 || o.years) && j !== lj && <text x={x(j)} y={y(v) + (o.years && sr.name === "2025" ? 17 : -9)} textAnchor="middle" style={{ ...svgText, fontSize: 10.5, fill: sr.color }}>{f(v)}</text>}</g>))}
                {lj >= 0 && <><circle cx={x(lj)} cy={y(sr.v[lj])} r={4} fill={sr.color} /><text x={x(lj) + 8} y={y(sr.v[lj]) + 4} style={{ ...svgText, fontWeight: 700, fill: sr.color }}>{f(sr.v[lj])}</text></>}
              </g>
            );
          })}
        </svg>
      );
    };
    const zplot = (title, series, opts, note) => {
      const open = () => setZoomChart({ title, series, opts: opts || {}, note });
      return (
        <div role="button" tabIndex={0} title="Click to enlarge" aria-label={`Enlarge chart: ${title}`} onClick={open}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }} style={{ cursor: "zoom-in", position: "relative" }}>
          {plot(series, opts)}
          <span style={{ position: "absolute", top: 0, right: 0, fontSize: 11, color: MUTED, background: T.band, borderRadius: 999, padding: "1px 9px", pointerEvents: "none" }}>⤢ Enlarge</span>
        </div>
      );
    };
    const C25 = isDark ? "#8FB4E8" : "#2A78D6", YEARS = [{ name: "2025", color: C25 }, { name: "2026", color: col }];
    const legend = (items) => <div className="hb-legend">{items.map((it) => <span key={it.name}><i className="hb-sw" style={{ background: it.color }} />{it.name}</span>)}</div>;
    const stat = (v, label, sub) => (
      <div className="hb-stat"><div className="hb-stat-v">{v}</div><div className="hb-stat-l">{label}</div>{sub && <div className="hb-stat-s">{sub}</div>}</div>
    );
    const mom = (a) => pct(a[iOct], a[iSep]), yoy = (a) => pct(a[iOct], a[iYoY]);
    // rates (deact rate, per 100 subscribers) show absolute changes, volumes show % changes
    const rateF = (v) => (v == null ? "—" : fmtRate(v, 2));
    const dRate = (a, b) => (a == null || b == null ? "n/a" : `${a - b > 0.0049 ? "+" : a - b < -0.0049 ? "−" : ""}${Math.abs(a - b).toFixed(2)}`);
    const fv = (m, v) => (m.rate ? rateF(v) : num(v));
    const chgm = (m, i, j) => (m.rate ? `${dRate(m.vals[i], m.vals[j])} per 100` : sp(pct(m.vals[i], m.vals[j])));
    const row = (name, a, rate) => (
      <tr key={name}><td>{name}</td><td className="n">{rate ? rateF(a[iSep]) : num(a[iSep])}</td><td className="n">{rate ? rateF(a[iOct]) : num(a[iOct])}</td><td className="n">{rate ? dRate(a[iOct], a[iSep]) : sp(mom(a))}</td><td className="n">{rate ? rateF(a[iYoY]) : num(a[iYoY])}</td><td className="n">{rate ? dRate(a[iOct], a[iYoY]) : sp(yoy(a))}</td></tr>
    );
    const head = (first) => <thead><tr><th>{first}</th><th>Sep</th><th>Oct</th><th>MoM</th><th>Oct 2025</th><th>YoY</th></tr></thead>;
    // ---- slow speeds ----
    const slowAll = S.slow.all, tot = DATA.ticketVolume.HSIA;
    // Nov 2025 stage on the slow-speed ticket chart
    const slowMarks = [{ k: MONTHS.indexOf("Nov 2025"), label: "Nov 25: process change" }];
    const slowNote = "Process change & Ticket Code Introduced for Incompatible equipment";
    const share = (k) => (slowAll[k] / tot[k]) * 100;
    const slowYoY = slowAll[iOct] - slowAll[iYoY], totYoY = tot[iOct] - tot[iYoY], growthShare = totYoY > 0 ? (slowYoY / totYoY) * 100 : null;
    const slowJan = slowAll[iOct] - slowAll[0], totJan = tot[iOct] - tot[0];
    const statusOrder = (st) => (/launch/i.test(st) ? 0 : /flight/i.test(st) ? 1 : /idea/i.test(st) ? 2 : 3); // Launched, In flight, Ideation, then anything else
    const slowInit = INITIATIVES.filter((it) => it.p === "HSIA" && it.issues && it.issues.includes("Speed")).sort((x, y) => statusOrder(x.status) - statusOrder(y.status));
    const boldInit = new Set(["DIY Revamp Live ONT Check", "How Speed Works Campaign"]); // called out in bold
    const fastest = groups.map((g) => ({ name: g.name, g: pct(g.slow[iOct], g.slow[iYoY]) })).sort((a, b) => b.g - a.g)[0];
    const bigTickets = [...groups].sort((a, b) => Math.abs(b.tickets[iOct] - b.tickets[iYoY]) - Math.abs(a.tickets[iOct] - a.tickets[iYoY]))[0];
    const O = overall.reduce((m, x) => ({ ...m, [x.key]: x.vals }), {});
    // headline: the calls offered change in volume (1.5K style) and %, and the group that moved it most
    const k1 = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${Math.round(v)}`);
    const callsDelta = O.calls[iOct] - O.calls[iSep], callsDir = callsDelta >= 0 ? "up" : "down";
    const callsDriver = [...groups].sort((x, y) => Math.abs(y.calls[iOct] - y.calls[iSep]) - Math.abs(x.calls[iOct] - x.calls[iSep]))[0].name;
    // In short: the text below is the published version; the editor on the page lets a viewer change it
    // (saved in the viewer's browser, with a reset back to this text).
    const shortItems = [
      ["Calls offered rose while tickets and repairs eased.", `Calls offered ${num(O.calls[iOct])} (${sp(mom(O.calls))} MoM, ${sp(yoy(O.calls))} YoY), tickets ${num(O.tickets[iOct])} (${sp(mom(O.tickets))}, ${sp(yoy(O.tickets))}) and repairs ${num(O.repairs[iOct])} (${sp(mom(O.repairs))}, ${sp(yoy(O.repairs))}). The deact rate (go/national churn) is ${rateF(churn[iOct])} per 100, ${dRate(churn[iOct], churn[iSep])} on September and ${dRate(churn[iOct], churn[iYoY])} on October 2025.`],
      ["HSIA West carries the volume, TQ ILEC and PFE carry the growth rate.", `West has ${num(groups[0].tickets[iOct])} tickets, ${sp(yoy(groups[0].tickets))} YoY; TQ ILEC ${sp(yoy(groups[1].tickets))} and PFE ${sp(yoy(groups[2].tickets))} on much smaller bases. The biggest absolute mover is ${bigTickets.name}.`],
      ["Slow speeds are the root cause that keeps growing.", `${num(slowAll[iOct])} slow-speed tickets in October, ${sp(pct(slowAll[iOct], slowAll[iYoY]), 0)} on October 2025 and ${sp(pct(slowAll[iOct], slowAll[0]), 0)} on January 2025. They were ${share(0).toFixed(0)}% of tickets in January 2025 and are ${share(iOct).toFixed(0)}% now.`],
      ["Slow speeds explain most of the ticket growth.", `Of the ${sn(totYoY)} rise in tickets on October 2025, slow speeds are ${sn(slowYoY)}${growthShare == null ? "" : ` (${growthShare.toFixed(0)}%)`}; since January 2025 they are ${sn(slowJan)} of ${sn(totJan)}. ${fastest.name} has grown fastest (${sp(fastest.g, 0)} YoY).`],
      ["Calls and repairs for slow speeds are not split yet.", "The workbook carries slow speeds for tickets only; the calls and repairs views are marked as needing a source."]
    ];
    const shortSeed = `<ol>${shortItems.map(([h, t]) => `<li><strong>${cmEsc(h)}</strong> ${cmEsc(t)}</li>`).join("")}</ol>`;
    // ---- presentation mode (Deck) ----
    const dstat = (v, label, sub) => <div className="dk-stat"><div className="dk-stat-v">{v}</div><div className="dk-stat-l">{label}</div>{sub && <div className="dk-stat-s">{sub}</div>}</div>;
    const mstat = (m) => dstat(fv(m, m.vals[iOct]), `${m.label} · Oct`, `Sep ${fv(m, m.vals[iSep])} · ${chgm(m, iOct, iSep)} MoM · ${chgm(m, iOct, iYoY)} YoY`);
    const cstat = (m) => (
      <div className="dk-stat" style={{ padding: "6px 11px" }}>
        <div className="dk-stat-v" style={{ fontSize: 20 }}>{fv(m, m.vals[iOct])}</div>
        <div className="dk-stat-l" style={{ fontSize: 11, marginTop: 2, lineHeight: 1.25 }}>{m.label} · Oct</div>
        <div className="dk-stat-s" style={{ fontSize: 10, marginTop: 1, lineHeight: 1.3 }}>{`Sep ${fv(m, m.vals[iSep])} · ${chgm(m, iOct, iSep)} MoM · ${chgm(m, iOct, iYoY)} YoY`}</div>
      </div>
    );
    const cell = (v, extra) => <td className="n" style={extra}>{v}</td>;
    const dkTable = (first, rows) => (
      <table>
        <thead><tr><th>{first}</th><th>Sep</th><th>Oct</th><th>MoM</th><th>Oct 2025</th><th>YoY</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    );
    const chartCell = (title, node, color) => (
      <div><div className="dk-ch">{color ? <span style={{ color }}>{title}</span> : title}</div>{node}</div>
    );
    const groupSlide = (g) => {
      const ms = metricKeys.filter(([k]) => g[k]);
      const hasObs = g.name === "TQ ILEC"; // the TQ ILEC slide carries a Key Observations section under the charts
      return {
        layout: "default", dense: true, title: `${g.name}: calls, tickets, repairs${g.deactRate ? " and deact rate" : ""}`,
        sub: g.deactRate ? "2025 and 2026 by month" : "2025 and 2026 by month. The deact rate is not split from HSIA West + TQ ILEC in the source.",
        body: <>
          <div style={{ display: "grid", gridTemplateColumns: ms.length >= 5 ? "1fr 1fr 1fr" : ms.length === 4 ? "1fr 1fr" : `repeat(${ms.length},1fr)`, gap: 18 }}>
            {ms.map(([k, lbl]) => chartCell(`${lbl} · Oct ${k === "deactRate" ? rateF(g[k][iOct]) : num(g[k][iOct])} (${k === "deactRate" ? dRate(g[k][iOct], g[k][iYoY]) : sp(yoy(g[k]), 0)} YoY)`, plot([{ name: g.name, color: g.color, vals: g[k] }], { h: ms.length >= 4 || hasObs ? 150 : 210, w: ms.length >= 5 ? 400 : ms.length === 4 ? 520 : 380, years: true, c25: C25, fmt: k === "deactRate" ? rateF : undefined }), g.color))}
          </div>
          <div className="dk-legend"><span><i style={{ background: C25 }} />2025</span><span><i style={{ background: g.color }} />2026</span></div>
          {hasObs && (
            <div className="dk-note amber">
              <h3>Key Observations and Areas to further explore</h3>
              <ul style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                <li>Volumes of TQ ILEC customers from Jan 2025 to Oct 2026 by month we have moved from Legacy Copper Voice (Atrium) to Fibre</li>
                <li>Understand abandon rate in TQ tech support queues over 2026</li>
                <li>In department repeat rate base in tech support ~12%, TQ tech support repeat rate in 19%</li>
                <li>Comparison of 2025 resolution on tickets to 2026 to look for TQ, Product, equipment specific changes</li>
              </ul>
            </div>
          )}
        </>,
        notes: `${g.name}: October against September and October 2025 for each measure.`
      };
    };
    const slides = [
      { layout: "cover", title: "HSIA in October and trends",
        body: <>
          <style>{commentaryCss(T)}{`.dk-cover .cm-doc:not(.cm-edit),.dk-cover .cm-doc:not(.cm-edit) li,.dk-cover .cm-doc:not(.cm-edit) strong,.dk-cover .cm-doc:not(.cm-edit) b{color:#fff}.dk-cover .cm-actions button,.dk-cover .cm-actions span{color:#fff !important;border-color:rgba(255,255,255,.7) !important}.dk-cover .cm-doc li{margin:0 0 12px}.dk-cover .cm-doc li:last-child{margin-bottom:0}`}</style>
          <div data-deck-noadvance="1" style={{ maxWidth: 1000 }}>
            <CommentaryEditor key={`slide${cmVer}`} T={T} sc="HSIA Oct Review: In short" month="Oct 2026" shareKey="hsia-oct-review-in-short|Oct 2026" label="the In short summary" noun="summary" seedHtml={shortSeed} docStyle={{ fontSize: 17, lineHeight: 1.5 }} onSaved={() => setCmVer((v) => v + 1)} />
          </div>
        </>,
        notes: "The In short section of the page, editable here: use Edit summary, then Save. Edits are kept in this browser and also show on the page." },
      { layout: "default", dense: true, title: "October at a glance",
        body: <>
          <div style={{ background: col, color: "#fff", borderRadius: 6, padding: "6px 12px", fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{`Calls offered are ${callsDir} ${k1(Math.abs(callsDelta))} in volume and ${sp(mom(O.calls))}, primarily driven by ${callsDriver}. HSIA West is showing stable volume and rate. Slow speeds tickets are ${share(iOct).toFixed(0)}% of ticket volume.`}</div>
          <div className="dk-stats" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>{overall.map((m) => cstat(m))}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {overall.map((m) => chartCell(m.label, plot([{ name: m.label, color: col, vals: m.vals }], { h: 135, w: 520, years: true, c25: C25, fmt: m.rate ? rateF : undefined })))}
            <div className="dk-legend" style={{ gridColumn: "1 / -1" }}>{YEARS.map((y) => <span key={y.name}><i style={{ background: y.color }} />{y.name}</span>)}</div>
          </div>
        </>,
        notes: "Calls offered, tickets, repairs and the deact rate for HSIA West + TQ ILEC, 2025 against 2026 by month. Deact rate is the go/national Churn % from the KPI tab, per 100 subscribers." },
      groupSlide(groups[0]), groupSlide(groups[1]),
      { layout: "default", dense: true, title: "Slow speeds: the root cause that keeps growing", sub: "Slow-speed tickets, HSIA",
        body: <>
          <div className="dk-stats tight" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
            {dstat(num(slowAll[iOct]), "Slow-speed tickets · Oct", `${sp(pct(slowAll[iOct], slowAll[iSep]))} MoM`)}
            {dstat(`${share(iOct).toFixed(1)}%`, "Share of tickets", `${share(0).toFixed(1)}% in Jan 2025`)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {chartCell("Slow-speed tickets", plot([{ name: "Slow speeds", color: col, vals: slowAll }], { h: 130, w: 520, marks: slowMarks }))}
            {chartCell("Share of HSIA tickets (%)", plot([{ name: "Share", color: AMBER, vals: slowAll.map((v, k) => (tot[k] ? (v / tot[k]) * 100 : null)) }], { h: 130, w: 520, fmt: (v) => v.toFixed(1), marks: slowMarks }))}
          </div>
          <div className="dk-note amber"><h3>Nov 2025</h3>{slowNote}</div>
          <div className="dk-note" style={{ marginTop: 2 }}>
            <h3>Slow speeds are the root cause that keeps growing.</h3>
            <p style={{ margin: "0 0 4px", fontSize: 13.5 }}>Slow speeds are {share(iOct).toFixed(0)}% of tickets in October and have been trending up.</p>
            <ul style={{ fontSize: 13, lineHeight: 1.4, gap: 4 }}>
              <li>There is a portion of slow speeds root cause we know and a portion we don't</li>
              <li>60% of slow speeds tickets don't show poor telemetry so we know we have an education route to go.</li>
              <li>The portion we do know about is that approximately 20% of slow speeds growth in tickets is due to reactive (1.7K) and proactive (0.3K) Speed Plan &amp; Equipment Remediation activities. Remedy codes for this started in November 2025, making YoY growth difficult to leverage.</li>
            </ul>
          </div>
        </>,
        notes: `Slow speeds are the wired and wireless slow-speed tickets plus incompatible equipment, from the HSIA Recategorization Looker tab. Nov 2025: ${slowNote}.` },
      { layout: "default", dense: true, title: "Initiatives aimed at speed",
        body: <table>
          <thead><tr><th>Initiative</th><th>Status</th><th>Timeline</th><th>Prime</th><th>Impact</th></tr></thead>
          <tbody>{slowInit.map((it) => <tr key={it.name} style={boldInit.has(it.name) ? { fontWeight: 700 } : undefined}><td>{it.name}</td><td className="n">{it.status}</td><td className="n">{it.timeline}</td><td className="n">{it.prime}</td><td className="n">{it.impact || "—"}</td></tr>)}</tbody>
        </table>,
        notes: "From the HSIA initiatives register." },
      { layout: "end", title: "Sources and method",
        sub: "Calls: TS Calls Offered by Product (HSIA West + TQ ILEC). Tickets, repairs, churn: Churn Measurement 2026 KPI tab, and the HSIA Recategorization Looker and Looker Repairs tabs for the three groups. Deact rate is the go/national Churn % from the KPI tab. Slow speeds are the Recategorization Looker Slow Speeds pain point." }
    ];
    return (
      <>
        {deckSlide != null && <Deck slides={slides} index={deckSlide - 1} onIndex={(k) => setDeckSlide(k + 1)} onExit={() => setDeckSlide(null)} T={T} color={col} isDark={isDark} title="HSIA October review" />}
        {zoomChart && zoomChart.series && (
          <div role="dialog" aria-modal="true" aria-label={zoomChart.title} onClick={() => setZoomChart(null)}
            style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(10,8,14,.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, color: T.text, borderRadius: 12, padding: "18px 22px 14px", width: "min(1200px, 100%)", maxHeight: "92vh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,.5)", fontFamily: FONT }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 17, color: T.heading, marginRight: "auto" }}>{zoomChart.title}</div>
                <button type="button" onClick={() => setZoomChart(null)} style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: "5px 14px", cursor: "pointer", border: `1px solid ${T.borderStrong}`, background: "transparent", color: T.textSecondary }}>Close ✕</button>
              </div>
              {plot(zoomChart.series, { ...zoomChart.opts, w: 1100, h: 480, big: true })}
              {(zoomChart.series.length > 1 || zoomChart.opts.years) && legend(zoomChart.opts.years ? [{ name: "2025", color: zoomChart.opts.c25 }, { name: "2026", color: zoomChart.series[0].color }] : zoomChart.series)}
              {zoomChart.note && <div style={{ fontSize: 13.5, marginTop: 8 }}>{zoomChart.note}</div>}
              <div style={{ fontSize: 12, color: MUTED, marginTop: 8 }}>Click outside the chart or press Esc to close</div>
            </div>
          </div>
        )}
      <div className="hb">
        <style>{css}</style>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -26 }}>
          <button onClick={() => setDeckSlide(1)} title="Open this review as slides (arrow keys to navigate, Esc to exit)"
            style={{ background: col, color: "#fff", border: "none", borderRadius: 999, padding: "7px 16px", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(0,0,0,.14)" }}>
            <span style={{ fontSize: 10 }}>▶</span> Present · {slides.length} slides
          </button>
        </div>
        <header className="hb-head">
          <div className="hb-eyebrow">HSIA · October 2026 · HSIA as a whole, HSIA West, TQ ILEC and PFE separately, and the growth of slow speeds</div>
          <h1>HSIA In October: Calls offered are {callsDir} {k1(Math.abs(callsDelta))} in volume and {sp(mom(O.calls))}, Primarily driven by {callsDriver}. HSIA West is showing stable volume and rate. Slow speeds tickets are {share(iOct).toFixed(0)}% of ticket volume</h1>
          <p className="hb-sub">Calls offered, tickets, repairs and the deact rate for HSIA overall, then for HSIA West, TQ ILEC and PFE on their own, then a view of slow speeds as a root cause. Slow speeds are shown for tickets; the workbook has no slow-speed split for calls or repairs yet.</p>
          <div className="hb-meta"><span>Reliability Strategy</span><span>KPIs to Oct 2026</span><span>Rates per 100 subscribers</span></div>
        </header>

        <section aria-labelledby="ho-short">
          <div className="hb-answer">
            <h3 id="ho-short" style={{ color: H }}>In short</h3>
            <CommentaryEditor key={cmVer} T={T} sc="HSIA Oct Review: In short" month="Oct 2026" shareKey="hsia-oct-review-in-short|Oct 2026" label="the In short summary" noun="summary" seedHtml={shortSeed} docStyle={{ fontSize: 15.5, lineHeight: 1.55 }} onSaved={() => setCmVer((v) => v + 1)} />
          </div>
        </section>

        <section aria-labelledby="ho-all">
          <h2 id="ho-all">HSIA as a whole: calls, tickets, repairs and deact rate</h2>
          <div className="hb-stats">
            {overall.map((m) => stat(fv(m, m.vals[iOct]), `${m.label} · Oct`, `Sep ${fv(m, m.vals[iSep])} · ${chgm(m, iOct, iSep)} MoM · ${chgm(m, iOct, iYoY)} YoY`))}
          </div>
          <div className="hb-tw"><table>
            {head("Measure")}
            <tbody>{overall.map((m) => row(m.label, m.vals, m.rate))}</tbody>
          </table></div>
          <div className="hb-two">
            {overall.map((m) => (
              <figure key={m.key}>
                <div className="hb-figtitle">{m.label}: 2025 against 2026, by month</div>
                <div className="hb-chart">{zplot(`${m.label}: 2025 against 2026, by month`, [{ name: m.label, color: col, vals: m.vals }], { years: true, c25: C25, fmt: m.rate ? rateF : undefined })}</div>
                {legend(YEARS)}
              </figure>
            ))}
          </div>
          <p className="hb-prose" style={{ fontSize: 13.5 }}>Calls offered are HSIA West + TQ ILEC - HSIA (TS Calls Offered by Product). Tickets, repairs and churn are the KPI-tab HSIA series. Churn starts in February 2025, so the deact rate does. The deact rate is the go/national Churn % from the Reliability/Deact KPIs tab, per 100 subscribers; its changes are absolute differences (for example −0.04), not percentages.</p>
        </section>

        <details className="hb-sec">
          <summary><h2 id="ho-groups">HSIA West, TQ ILEC and PFE separately</h2></summary>
          <div className="hb-body">
          <p className="hb-prose">The three groups, each against its own history. Each line is on its own scale, so read the shape and the change columns, not the heights. TQ ILEC and PFE are small, so a few hundred tickets move their percentages a lot.</p>
          <div className="hb-tw"><table>
            {head("Group · measure")}
            <tbody>{groups.flatMap((g) => metricKeys.map(([k, lbl]) => (g[k] ? row(`${g.name} · ${lbl}`, g[k], k === "deactRate") : <tr key={g.name + k}><td>{g.name} · {lbl}</td><td className="n" colSpan={5} style={{ textAlign: "center", color: MUTED }}>not split from HSIA West + TQ ILEC in the source</td></tr>)))}</tbody>
          </table></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
            {groups.flatMap((g) => metricKeys.filter(([k]) => g[k]).map(([k, lbl]) => (
              <figure key={g.name + k}>
                <div className="hb-figtitle"><span style={{ color: g.color }}>{g.name}</span> · {lbl}</div>
                <div className="hb-chart">{zplot(`${g.name} · ${lbl}: 2025 against 2026, by month`, [{ name: g.name, color: g.color, vals: g[k] }], { h: 170, w: 360, years: true, c25: C25, fmt: k === "deactRate" ? rateF : undefined })}</div>
                {legend([{ name: "2025", color: C25 }, { name: "2026", color: g.color }])}
              </figure>
            )))}
          </div>
          <h3 style={{ color: H, marginTop: 8 }}>Growth since October 2025 (October 2025 = 100)</h3>
          <div className="hb-two">
            {[["calls", "Calls offered"], ["tickets", "Tickets"], ["repairs", "Repairs / dispatches"]].map(([k, lbl]) => (
              <figure key={k}>
                <div className="hb-figtitle">{lbl}</div>
                <div className="hb-chart">{zplot(`${lbl}: growth since October 2025 (October 2025 = 100)`, groups.map((g) => ({ name: g.name, color: g.color, vals: g[k] })), { start: iYoY, index: iYoY, fmt: (v) => Math.round(v), h: 200 })}</div>
                {legend(groups)}
              </figure>
            ))}
          </div>
        </div>
        </details>

        <section aria-labelledby="ho-slow">
          <h2 id="ho-slow">Slow speeds: the root cause that keeps growing</h2>
          <div className="hb-stats">
            {stat(num(slowAll[iOct]), "Slow-speed tickets · Oct", `Sep ${num(slowAll[iSep])} · ${sp(pct(slowAll[iOct], slowAll[iSep]))} MoM`)}
            {stat(`${share(iOct).toFixed(1)}%`, "Share of HSIA tickets · Oct", `${share(iYoY).toFixed(1)}% in Oct 2025 · ${share(0).toFixed(1)}% in Jan 2025`)}
          </div>
          <div className="hb-two">
            <figure>
              <div className="hb-figtitle">Slow-speed tickets, HSIA, Jan 2025 to Oct 2026</div>
              <div className="hb-chart">{zplot("Slow-speed tickets, HSIA, Jan 2025 to Oct 2026", [{ name: "Slow speeds", color: col, vals: slowAll }], { marks: slowMarks }, `Nov 2025: ${slowNote}`)}</div>
              <figcaption><strong style={{ color: AMBER }}>Nov 2025:</strong> {slowNote}</figcaption>
            </figure>
            <figure>
              <div className="hb-figtitle">Slow speeds as a share of HSIA tickets (%)</div>
              <div className="hb-chart">{zplot("Slow speeds as a share of HSIA tickets (%)", [{ name: "Share", color: AMBER, vals: slowAll.map((v, k) => (tot[k] ? (v / tot[k]) * 100 : null)) }], { fmt: (v) => v.toFixed(1), marks: slowMarks }, `Nov 2025: ${slowNote}`)}</div>
            </figure>
          </div>
          <div className="hb-two">
            <figure>
              <div className="hb-figtitle">Growth by group (Jan 2025 = 100)</div>
              <div className="hb-chart">{zplot("Slow-speed tickets by group, growth since January 2025 (Jan 2025 = 100)", groups.map((g) => ({ name: g.name, color: g.color, vals: g.slow })), { index: 0, fmt: (v) => Math.round(v), h: 220 })}</div>
              {legend(groups)}
            </figure>
            <figure>
              <div className="hb-figtitle">Slow-speed tickets by group</div>
              <div className="hb-tw"><table>
                <thead><tr><th>Group</th><th>Jan 2025</th><th>Oct 2025</th><th>Oct 2026</th><th>YoY</th><th>Share of its tickets</th></tr></thead>
                <tbody>{groups.map((g) => <tr key={g.name}><td>{g.name}</td><td className="n">{num(g.slow[0])}</td><td className="n">{num(g.slow[iYoY])}</td><td className="n">{num(g.slow[iOct])}</td><td className="n">{sp(pct(g.slow[iOct], g.slow[iYoY]), 0)}</td><td className="n">{((g.slow[iYoY] / g.tickets[iYoY]) * 100).toFixed(0)}% → {((g.slow[iOct] / g.tickets[iOct]) * 100).toFixed(0)}%</td></tr>)}</tbody>
              </table></div>
            </figure>
          </div>
          <div className="hb-note">
            <h3>Calls and repairs for slow speeds: source needed</h3>
            <p>The workbook reports slow speeds by month for tickets only. Calls are split Connectivity and Wireless (no slow-speed reason) and repairs have no reason split, so the slow-speed growth for calls and repairs cannot be shown yet. Send a Looker look or tab that carries calls and repairs by reason and these two views are added alongside the tickets view.</p>
          </div>
          <h3 style={{ color: H, marginTop: 8 }}>Initiatives aimed at speed</h3>
          <div className="hb-tw"><table>
            <thead><tr><th>Initiative</th><th>Status</th><th>Timeline</th><th>Prime</th><th>Impact</th></tr></thead>
            <tbody>{slowInit.map((it) => <tr key={it.name} style={boldInit.has(it.name) ? { fontWeight: 700 } : undefined}><td>{it.name}</td><td style={{ textAlign: "right" }}><StatusChip status={it.status} T={T} /></td><td className="n">{it.timeline}</td><td className="n">{it.prime}</td><td className="n">{it.impact || "—"}</td></tr>)}</tbody>
          </table></div>
        </section>

        <section aria-labelledby="ho-method">
          <h2 id="ho-method">Sources and method</h2>
          <ul className="hb-plain">
            <li>HSIA overall: calls offered from the TS Calls Offered by Product workbook (HSIA West + TQ ILEC - HSIA); tickets, repairs and churn from the Reliability/Deact KPIs tab of the Churn Measurement 2026 workbook.</li>
            <li>HSIA West, TQ ILEC and PFE: the same series as their pages under HSIA (calls and base from the TS Calls workbook; tickets from the HSIA Recategorization Looker blocks; repairs from the Looker Repairs tab; PFE churn from the KPI tab).</li>
            <li>Slow speeds: the "Slow Speeds" customer pain point (wired and wireless slow speeds plus incompatible equipment) on the HSIA Recategorization Looker tab, for HSIA All, HSIA West, HSIA TQ ILEC and HSIA PFE. The three groups do not add up exactly to HSIA All.</li>
            <li>Deact rate: the HSIA and PFE go/national Churn % from the Reliability/Deact KPIs tab of the Churn Measurement 2026 workbook, per 100 subscribers; PFE is reported from Oct 2025, and HSIA West and TQ ILEC are not split in the source.</li>
          </ul>
        </section>
      </div>
      </>
    );
  }

  function TvOctReviewPage() {
    const col = colors.TV, R = OCT_REVIEW;
    const H = T.heading, MUTED = T.textMuted, RULE = T.border;
    const AMBER = isDark ? "#F0A55B" : "#B86E00";
    const css = briefCss(col, AMBER);
    const sum = (arr) => arr.reduce((a, b) => a + (b || 0), 0);
    const num = (v) => (v == null ? "—" : Math.round(v).toLocaleString());
    const pct = (a, b) => (b ? ((a - b) / b) * 100 : null);
    const sp = (x, d = 0) => (x == null ? "n/a" : (x > 0 ? "+" : "") + x.toFixed(d) + "%");
    const sn = (v) => (v == null ? "—" : (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(Math.round(v)).toLocaleString());
    const pp = (a, b) => { const d = b - a; return (d > 0 ? "+" : d < 0 ? "−" : "") + Math.abs(d) + " pts"; };
    const iSep = MONTHS.indexOf("Sep 2026"), iOct = MONTHS.indexOf("Oct 2026");
    const legacy = TV_PLATFORMS.find((x) => x.id === "legacy"), opus = TV_PLATFORMS.find((x) => x.id === "opus");
    const totSep = R.lookerSep, totOct = R.looker;
    const stSep = sum(R.stutter.sep), stOct = sum(R.stutter.oct);
    const O = R.outage, excess = (O.peak - O.normal) + (O.next - O.normal);
    const catRise = R.categories.map(([n, a, b]) => [n, a, b, b - a]);
    // ---- whole-TV measures (dashboard KPI tab, TS calls workbook) ----
    const callsOff = CALLS_SPLIT.TV.offered, callsAns = CALLS_SPLIT.TV.answered;
    const base = DATA.subBase.TV, tk = DATA.ticketVolume.TV, tr = DATA.ticketRate.TV, rv = DATA.repairVolume.TV, rr = DATA.repairRate.TV, ch = DATA.churnRate.TV;
    const ansRate = (i) => (callsAns[i] / callsOff[i]) * 100, callsPer100 = (i) => (callsOff[i] / base[i]) * 100;
    const sd = (x, d = 2) => (x == null ? "n/a" : (x > 0 ? "+" : x < 0 ? "−" : "") + Math.abs(x).toFixed(d));
    const iYoY = iOct - 12;
    const kpiRows = [
      ["Calls offered", callsOff, num, "n", true], ["Calls answered", callsAns, num, "n", false], ["Answer rate", callsAns.map((v, i) => (callsOff[i] ? (v / callsOff[i]) * 100 : null)), (v) => v.toFixed(1) + "%", "r", false],
      ["Calls offered per 100 subs", callsOff.map((v, i) => (v / base[i]) * 100), (v) => v.toFixed(2), "r", true],
      ["Tickets (incl. Pik TV)", tk, num, "n", true], ["Ticket rate per 100 subs (incl. Pik TV)", tr, (v) => fmtRate(v), "r", true],
      ["Repairs / dispatches", rv, num, "n", true], ["Repair rate per 100 subs", rr, (v) => fmtRate(v), "r", true],
      ["Churn rate per 100 subs", ch, (v) => fmtRate(v), "r", true], ["Subscriber base", base, num, "n", false]
    ];
    // context of the year (Tyler and Faraz, 12 Nov review): where October sits against the rest of 2026
    const iAug0 = MONTHS.indexOf("Aug 2026"), iJan = MONTHS.indexOf("Jan 2026"), mon = (k) => MONTHS[k].slice(0, 3), seg = (arr, a, b) => arr.slice(a, b + 1);
    const crT = DATA.callsRate.TV, crYtd = seg(crT, iJan, iOct), crLowK = iJan + crYtd.indexOf(Math.min(...seg(crT, iJan, iAug0)));
    const crMid = seg(crT, crLowK + 1, iAug0), crHigh = crYtd[crYtd.length - 1] >= Math.max(...crYtd);
    const mrT = legacy.tickets, mrYtd = seg(mrT, iJan, iOct), mrAvg = mrYtd.reduce((a, b) => a + b, 0) / mrYtd.length, mrLowK = iJan + mrYtd.indexOf(Math.min(...mrYtd));
    let mrSince = null; for (let k = iOct - 1; k >= iJan; k--) if (mrT[k] >= mrT[iOct]) { mrSince = k; break; }
    const ctxCalls = `Calls offered rate fell to a ${crT[crLowK].toFixed(2)} low in ${mon(crLowK)}, held ${Math.min(...crMid).toFixed(1)} to ${Math.max(...crMid).toFixed(1)} through ${mon(iAug0)}, then stepped up to ${crT[iSep].toFixed(2)} in ${mon(iSep)} and ${crT[iOct].toFixed(2)} in ${mon(iOct)}${crHigh ? ", the highest of 2026" : ""}.`;
    const ctxMr = `Mediaroom tickets of ${num(mrT[iOct])} are ${mrSince != null ? `the highest since ${mon(mrSince)} (${num(mrT[mrSince])}) and ` : ""}${sp(pct(mrT[iOct], mrAvg), 1)} against the 2026 average of ${num(mrAvg)}; the ${sn(mrT[iOct] - mrT[iSep])} follows ${sn(mrT[iSep] - mrT[iAug0])} in ${mon(iSep)}, off a ${num(mrT[mrLowK])} low in ${mon(mrLowK)}.`;
    // headline: calls offered in volume and rate, what drove them, then the ticket and dispatch rate
    const mrCO = legacy.callsOffered, mrCR = legacy.callsRate, mrCoD = mrCO[iOct] - mrCO[iSep];
    const callsVol = callsOff[iOct] - callsOff[iSep], callsRateNow = DATA.callsRate.TV[iOct], callsRatePrev = DATA.callsRate.TV[iSep];
    const mrTk = legacy.tickets[iOct], mrTkD = legacy.tickets[iOct] - legacy.tickets[iSep];
    const callsHeadline = `Calls offered are up by ${num(callsVol)} (${sp(pct(callsOff[iOct], callsOff[iSep]), 1)}) in volume and ${Math.abs(callsRateNow - callsRatePrev).toFixed(2)} per 100 subs (${callsRatePrev.toFixed(2)} to ${callsRateNow.toFixed(2)}) in rate, driven primarily by Mediaroom, where calls offered rose ${num(mrCoD)} (${sp(pct(mrCO[iOct], mrCO[iSep]), 1)}) to ${num(mrCO[iOct])}, ${mrCR[iSep].toFixed(2)} to ${mrCR[iOct].toFixed(2)} per 100 subs.`;
    const rateHeadline = `Ticket rate ${tr[iOct] > tr[iSep] ? "rose" : "fell"} ${Math.abs(tr[iOct] - tr[iSep]).toFixed(2)} to ${fmtRate(tr[iOct])} per 100 and dispatch rate ${rr[iOct] > rr[iSep] ? "rose" : "fell"} ${Math.abs(rr[iOct] - rr[iSep]).toFixed(2)} to ${fmtRate(rr[iOct])} per 100, with Mediaroom ticket volume at ${num(mrTk)}, ${mrTkD >= 0 ? "up" : "down"} ${num(Math.abs(mrTkD))} (${sp(pct(mrTk, legacy.tickets[iSep]), 1)}).`;
    const headline = `${callsHeadline} ${rateHeadline}`;
    const mp = (kind, ser, i, j) => (kind === "n" ? sp(pct(ser[i], ser[j]), 1) : sd(ser[i] - ser[j]));
    const dRepSep = rv[iSep], dRepOct = rv[iOct], platRepSep = legacy.repairs[iSep] + opus.repairs[iSep], platRepOct = legacy.repairs[iOct] + opus.repairs[iOct];
    const platTotSep = legacy.tickets[iSep] + opus.tickets[iSep], platTotOct = legacy.tickets[iOct] + opus.tickets[iOct];
    const pikSep = TV_PIK.tickets[iSep], pikOct = TV_PIK.tickets[iOct];
    const Dl = TV_REVIEW.daily, dsum = (k, f) => sum(Dl[k][f]);
    const nbRows = TV_REVIEW.stbNoBoot.map((x) => [x.name, x.v[1], x.v[2]]);
    const nbTot = TV_REVIEW.stbNoBootTotal;
    const flag = (v, goodDown = true, thr = 3) => {
      if (v == null) return null;
      const tone = Math.abs(v) < thr ? "flat" : (v < 0) === goodDown ? "ok" : "warn";
      return <span className={`hb-flag hb-${tone}`}>{tone === "flat" ? "flat" : v > 0 ? "up" : "down"}</span>;
    };
    const stat = (v, label, sub) => (
      <div className="hb-stat"><div className="hb-stat-v">{v}</div><div className="hb-stat-l">{label}</div>{sub && <div className="hb-stat-s">{sub}</div>}</div>
    );
    const shareTable = (head, rows) => (
      <div className="hb-tw"><table>
        <thead><tr><th>{head}</th><th>Sep</th><th>Oct</th><th>Change</th></tr></thead>
        <tbody>{rows.map(([n, a, b]) => <tr key={n}><td>{n}</td><td className="n">{a}%</td><td className="n">{b}%</td><td className="n">{pp(a, b)}</td></tr>)}</tbody>
      </table></div>
    );

    // ---- daily chart: stuttering tickets per day, Sep vs Oct ----
    const svgText = { fontFamily: FONT, fontSize: 12, fill: MUTED };
    const dailyChart = () => {
      const W = 800, Hh = 276, left = 58, right = 16, top = 16, bottom = 46, n = 30, max = 180;
      const pw = W - left - right, ph = Hh - top - bottom;
      const x = (i) => left + (i * pw) / (n - 1), y = (v) => top + ph - (v / max) * ph;
      const path = (arr) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      const oi = O.day - 1;
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block", minWidth: 520 }} role="img" aria-label="Stop/Stuttering/Freezing tickets per day, September and October 2026">
          {[0, 50, 100, 150].map((g) => <g key={g}><line x1={left} x2={W - right} y1={y(g)} y2={y(g)} stroke={RULE} /><text x={left - 8} y={y(g) + 4} textAnchor="end" style={svgText}>{g}</text></g>)}
          {[1, 5, 10, 15, 20, 25, 30].map((d) => <text key={d} x={x(d - 1)} y={Hh - 26} textAnchor="middle" style={svgText}>{d}</text>)}
          <text x={left + pw / 2} y={Hh - 6} textAnchor="middle" style={{ ...svgText, fontWeight: 600 }}>Day of month</text>
          <text transform={`rotate(-90 13 ${top + ph / 2})`} x={13} y={top + ph / 2} textAnchor="middle" style={{ ...svgText, fontWeight: 600 }}>Stop/Stuttering/Freezing tickets per day</text>
          <path d={path(R.stutter.sep)} fill="none" stroke={MUTED} strokeWidth={2} opacity={0.8} />
          <path d={path(R.stutter.oct)} fill="none" stroke={col} strokeWidth={2.8} />
          <circle cx={x(oi)} cy={y(O.peak)} r={4.5} fill={AMBER} />
          <text x={x(oi) - 8} y={y(O.peak) + 4} textAnchor="end" style={{ ...svgText, fill: AMBER, fontWeight: 700 }}>{O.day} Oct: {O.peak}, Calgary outage</text>
        </svg>
      );
    };


    // ---- presentation mode (Deck) ----
    const dstat = (v, label, sub) => <div className="dk-stat"><div className="dk-stat-v">{v}</div><div className="dk-stat-l">{label}</div>{sub && <div className="dk-stat-s">{sub}</div>}</div>;
    // MoM change coloured red for an increase and green for a decrease
    const chg = (text, delta, invert) => <span style={{ fontWeight: 700, color: !delta ? MUTED : (delta > 0) !== !!invert ? T.bad : T.good }}>{text}</span>;
    const mstat = (v, label, sepTxt, text, delta, invert) => dstat(v, label, <>{sepTxt} · {chg(text, delta, invert)}</>);
    const pairLegend = <div className="dk-legend"><span><i style={{ background: MUTED, opacity: 0.55 }} />September</span><span><i style={{ background: col }} />October</span></div>;
    // paired horizontal bars, September against October
    const dpair = (rows, fmt = num) => {
      const mx = Math.max(...rows.flatMap((r) => [r[1], r[2]])) || 1;
      return <div>{rows.map(([n, a, b]) => (
        <div key={n} className="dk-brow"><div className="dk-bl">{n}</div><div>
          <div className="dk-bar"><i style={{ width: `${(a / mx) * 80}%`, background: MUTED, opacity: 0.55 }} /><b>{fmt(a)}</b></div>
          <div className="dk-bar"><i style={{ width: `${(b / mx) * 80}%`, background: col }} /><b>{fmt(b)}</b></div>
        </div></div>))}</div>;
    };
    // diverging bars of the change: increase red, decrease green
    const ddelta = (rows) => {
      const mx = Math.max(...rows.map((r) => Math.abs(r[2] - r[1]))) || 1;
      return <div>{rows.map(([n, a, b]) => {
        const d = b - a, w = (Math.abs(d) / mx) * 28, up = d >= 0, tone = up ? T.bad : T.good;
        return <div key={n} className="dk-brow"><div className="dk-bl">{n}</div>
          <div className="dk-dv"><i style={{ background: tone, width: `${w}%`, left: up ? "50%" : `${50 - w}%` }} />
            <b style={{ color: tone, ...(up ? { left: `calc(${50 + w}% + 5px)` } : { right: `calc(${50 + w}% + 5px)` }) }}>{sn(d)} ({sp(pct(b, a), 1)})</b></div></div>;
      })}</div>;
    };
    // monthly lines, October 2025 to October 2026
    const dline = (series, fmt, startK = iYoY, opts = {}) => {
      const lineMonths = []; for (let k = startK; k <= iOct; k++) lineMonths.push(k);
      const W = opts.w || 520, Hh = opts.h || 270, l = 44, r = opts.hline ? 100 : 54, t = opts.title ? 36 : opts.mark != null ? 24 : 14, b = 28;
      const all = series.flatMap((x) => lineMonths.map((k) => x.vals[k])).concat(opts.hline ? [opts.hline.value] : []);
      const mn = Math.min(...all), mx = Math.max(...all), pad = (mx - mn) * 0.18 || 0.1, lo = mn - pad, hi = mx + pad;
      const pw = W - l - r, ph = Hh - t - b;
      const x = (j) => l + (j * pw) / (lineMonths.length - 1), y = (v) => t + ph - ((v - lo) / (hi - lo)) * ph;
      const ticks = [0, 1, 2, 3].map((q) => lo + ((hi - lo) * q) / 3);
      return (
        <svg viewBox={`0 0 ${W} ${Hh}`} width="100%" style={{ display: "block" }} role="img">
          {ticks.map((g, q) => <g key={q}><line x1={l} x2={W - r} y1={y(g)} y2={y(g)} stroke={RULE} /><text x={l - 6} y={y(g) + 4} textAnchor="end" style={{ ...svgText, fontSize: 11 }}>{fmt(g)}</text></g>)}
          {lineMonths.map((k, j) => <text key={k} x={x(j)} y={Hh - 8} textAnchor="middle" style={{ ...svgText, fontSize: 10.5 }}>{MONTHS[k].slice(0, 3)}</text>)}
          {opts.title && <text x={l} y={12} style={{ ...svgText, fontSize: 12, fontWeight: 700, fill: T.text }}>{opts.title}</text>}
          {opts.hline && <g><line x1={l} x2={W - r} y1={y(opts.hline.value)} y2={y(opts.hline.value)} stroke={MUTED} strokeWidth={1.4} strokeDasharray="2 4" /><text x={W - r + 8} y={y(opts.hline.value) + 4} textAnchor="start" style={{ ...svgText, fontSize: 11, fontWeight: 700 }}>{opts.hline.label}</text></g>}
          {opts.mark != null && <g><line x1={x(opts.mark - startK)} x2={x(opts.mark - startK)} y1={t - 6} y2={Hh - b} stroke={MUTED} strokeWidth={1.6} strokeDasharray="4 4" /><text x={x(opts.mark - startK) - 5} y={t - 10} textAnchor="end" style={{ ...svgText, fontSize: 11, fontWeight: 700 }}>{opts.markLabel}</text></g>}
          {series.map((sr) => {
            const pts = lineMonths.map((k, j) => `${j ? "L" : "M"}${x(j).toFixed(1)},${y(sr.vals[k]).toFixed(1)}`).join(" ");
            const lastJ = lineMonths.length - 1, lv = sr.vals[iOct];
            const othersY = series.filter((o) => o !== sr).map((o) => y(o.vals[iOct]));
            const myY = y(lv), close = othersY.some((oy) => Math.abs(oy - myY) < 15), nudge = close ? (othersY.every((oy) => oy >= myY) ? -6 : 8) : 0;
            return <g key={sr.name}><path d={pts} fill="none" stroke={sr.color} strokeWidth={2.8} />
              {lineMonths.map((k, j) => <circle key={k} cx={x(j)} cy={y(sr.vals[k])} r={j === lastJ ? 4.5 : 2.2} fill={sr.color} />)}
              <text x={x(lastJ) + 8} y={y(lv) + 4 + nudge} style={{ ...svgText, fontSize: 12, fontWeight: 700, fill: sr.color }}>{fmt(lv)}</text>
              {opts.allLabels && lineMonths.slice(0, -1).filter((k) => !opts.labelKs || opts.labelKs.includes(k)).map((k) => { const j = lineMonths.indexOf(k); return <text key={"al" + k} x={x(j)} y={y(sr.vals[k]) + (j > 0 && sr.vals[k] < sr.vals[lineMonths[j - 1]] && sr.vals[k] < sr.vals[lineMonths[j + 1]] ? 17 : -8)} textAnchor="middle" style={{ ...svgText, fontSize: 10.5, fontWeight: 700, fill: sr.color }}>{fmt(sr.vals[k])}</text>; })}
              {opts.startLabel && <text x={x(0) + 2} y={y(sr.vals[startK]) - 8} textAnchor="start" style={{ ...svgText, fontSize: 12, fontWeight: 700, fill: sr.color }}>{fmt(sr.vals[startK])}</text>}</g>;
          })}
        </svg>
      );
    };
    const platLegend = <div className="dk-legend"><span><i style={{ background: col }} />Mediaroom (Optik TV Legacy)</span><span><i style={{ background: AMBER }} />OPUS (TV Evolution)</span></div>;
    const vid = R.categories[0], mv = R.movers;
    const iAug = iOct - 2;
    const catAug = LOOKER_EXTRA.TV.cats.map((c) => [c.name, c.series[iAug], c.series[iSep], c.series[iOct]]);
    const catD = (n) => { const c = catAug.find((x) => x[0] === n); return { sep: c[2] - c[1], oct: c[3] - c[2], all: c[3] - c[1] }; };
    const cVid = catD("Video Issues"), cChn = catD("Channel Issues"), cStb = catD("STB No Boot");
    const risePool = catAug.reduce((a, c) => a + (c[3] - c[1]), 0), top3 = cVid.all + cChn.all + cStb.all;
    const legAug = legacy.tickets[iOct] - legacy.tickets[iAug], opAug = opus.tickets[iOct] - opus.tickets[iAug];
    const dinit = (name) => {
      const it = INITIATIVES.find((x) => x.p === "TV" && x.name === name);
      if (!it) return null;
      return <div key={name} className="dk-init"><b>{it.name}</b><span className="dk-pill">{it.status}</span><div>{it.timeline} · {it.prime}</div></div>;
    };
    const slides = [
      { layout: "cover", title: "TV in October",
        callout: <span style={{ fontWeight: 400 }}>Calls offered rate is {callsRateNow > callsRatePrev ? "up to" : "down to"} <strong style={{ fontWeight: 700 }}>{callsRateNow.toFixed(2)} per 100 subs</strong> and ticket rate is {tr[iOct] > tr[iSep] ? "up to" : "down to"} <strong style={{ fontWeight: 700 }}>{fmtRate(tr[iOct])} per 100</strong>, driven by Mediaroom, mainly video quality issues.</span>,
        notes: "The one-line answer to what is driving the rise." },
      { layout: "default", dense: true, title: "October Performance",
        banner: "Call rate has stabilized YoY, tickets increase on Mediaroom",
        body: () => {
          const zc = (origin, node) => <div className="dk-zoom" style={{ "--zo": origin }}>{node}</div>;
          const chart = (name, key, origin) => zc(origin, dline([{ name: "Mediaroom", color: col, vals: legacy[key] }, { name: "OPUS", color: AMBER, vals: opus[key] }], (v) => fmtRate(v), iYoY,
            { w: 420, h: 138, startLabel: true, title: name }));
          const ms = (i, ...args) => zc(i === 0 ? "left top" : i === 6 ? "right top" : "center top", mstat(...args));
          return <>
            <div className="dk-stats tight" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {ms(0, callsRateNow.toFixed(2), "Calls offered rate", `Sep ${callsRatePrev.toFixed(2)}`, sd(callsRateNow - callsRatePrev), callsRateNow - callsRatePrev)}
              {ms(1, num(callsOff[iOct]), "Calls offered", `Sep ${num(callsOff[iSep])}`, sp(pct(callsOff[iOct], callsOff[iSep]), 1), callsOff[iOct] - callsOff[iSep])}
              {ms(2, ansRate(iOct).toFixed(1) + "%", "Calls answered share", `Sep ${ansRate(iSep).toFixed(1)}%`, sd(ansRate(iOct) - ansRate(iSep), 1) + " pts", ansRate(iOct) - ansRate(iSep), true)}
              {ms(3, num(tk[iOct]), "Tickets", `Sep ${num(tk[iSep])}`, sp(pct(tk[iOct], tk[iSep]), 1), tk[iOct] - tk[iSep])}
              {ms(4, fmtRate(tr[iOct]), "Ticket rate per 100", `Sep ${fmtRate(tr[iSep])}`, sd(tr[iOct] - tr[iSep]), tr[iOct] - tr[iSep])}
              {ms(5, num(rv[iOct]), "Dispatches", `Sep ${num(rv[iSep])}`, sp(pct(rv[iOct], rv[iSep]), 1), rv[iOct] - rv[iSep])}
              {ms(6, fmtRate(rr[iOct]), "Dispatch rate per 100", `Sep ${fmtRate(rr[iSep])}`, sd(rr[iOct] - rr[iSep]), rr[iOct] - rr[iSep])}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 0.46fr", gap: 28, flex: 1, minHeight: 0 }}>
              <ul style={{ fontSize: 14, gap: 12, margin: 0 }}>
                <li><strong>Demand rose a little, cost to serve more.</strong> Calls offered rate {callsRatePrev.toFixed(2)} to {callsRateNow.toFixed(2)}, ticket rate {fmtRate(tr[iSep])} to {fmtRate(tr[iOct])}, dispatch rate {fmtRate(rr[iSep])} to {fmtRate(rr[iOct])}.</li>
                <li><strong>Mediaroom is the upside.</strong> Tickets {sn(legacy.tickets[iOct] - legacy.tickets[iSep])}, rate {fmtRate(legacy.ticketRate[iSep])} to {fmtRate(legacy.ticketRate[iOct])} on a shrinking base. OPUS eased: tickets {sn(opus.tickets[iOct] - opus.tickets[iSep])}, rate {fmtRate(opus.ticketRate[iOct])}.</li>
                <li><strong>Video quality moved Mediaroom.</strong> Video Issues {sn(vid[2] - vid[1])}; the {O.area} outage is about a fifth, the rest a higher everyday level.</li>
                <li><strong>STB No Boot eased</strong> ({num(R.categories[3][1])} to {num(R.categories[3][2])}); <strong>Missing Channels rose</strong> {sn(mv[1][2] - mv[1][1])}, a provisioning problem on OPUS boxes.</li>
                <li><strong>Since August,</strong> tickets {sn(tk[iOct] - tk[iAug])} ({sp(pct(tk[iOct], tk[iAug]), 1)}), {Math.round((legAug / (legAug + opAug)) * 100)}% on Mediaroom; Video, Channel and STB No Boot issues are {Math.round((top3 / risePool) * 100)}% of the rise.</li>
              </ul>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {chart("Calls offered rate per 100 subs", "callsRate", "right top")}
                {chart("Ticket rate per 100 subs", "ticketRate", "right center")}
                {chart("Dispatch rate per 100 subs", "repairRate", "right bottom")}
                {platLegend}
              </div>
            </div>
          </>;
        },
        notes: "Calls cards sit together, then tickets, then dispatches. Charts run October 2025 to October 2026, Mediaroom against OPUS; hover a chart to zoom it. Churn is not shown on this slide." },
      { layout: "two-cols", title: "October Tickets", clicks: 1, banner: "Video issues have increased MoM, while STB No Boot has eased",
        body: (step, C) => <>
          <div><h3 className="dk-ch">By category, tickets</h3>{dpair(R.categories)}{pairLegend}</div>
          {C(1, <div><h3 className="dk-ch">Largest movers, Oct vs Sep (red up, green down)</h3>{ddelta(R.movers)}</div>)}
        </>,
        notes: "Left: the six categories. Right (one click): the nine largest movers." },
      { layout: "default", dense: true, title: "Stop/Stuttering/Freezing tickets per day", clicks: 2,
        body: (step, C) => <>
          <div style={{ width: "100%" }}>{dailyChart()}</div>
          <div className="dk-legend" style={{ justifyContent: "center" }}><span><i style={{ background: col }} />October ({num(stOct)})</span><span><i style={{ background: MUTED }} />September ({num(stSep)})</span></div>
          <div className="dk-two" style={{ flex: "none", fontSize: 12 }}>
            {C(1, <div className="dk-note amber" style={{ fontSize: 12 }}><h3 style={{ fontSize: 12.5 }}>The {O.day} October outage</h3>{O.area}. Agents found an active area outage (Stop/Stuttering/Freezing, under investigation, no restoration time). Stuttering tickets hit {O.peak} that day and {O.next} the next, against about {O.normal} normally; {O.citing} and {O.citingNext} tickets name the outage. Agents educated customers and subscribed them to the outage portal; no field visit.</div>)}
            {C(2, <div className="dk-note" style={{ fontSize: 12 }}><h3 style={{ fontSize: 12.5 }}>Everything else</h3>Excluding {O.day} and {O.day + 1} October, stuttering still averaged about {Math.round((stOct - O.peak - O.next) / 28)} a day against {Math.round(stSep / 30)} in September. Device models and provinces in the notes barely changed, so the lift is spread across the Legacy base.</div>)}
          </div>
        </>,
        notes: "About 100 of the roughly 430 extra stuttering tickets are the outage. The orange marker is the Calgary outage day." },
      { layout: "default", dense: true, title: "Video quality: root causes cited and fixes applied", clicks: 1, banner: "Video issues driven by increased packet loss/discontinuities/multicast drops on Mediaroom",
        body: (step, C) => <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div className="dk-sm"><h3 className="dk-ch">Root causes cited (% of tickets with a root-cause line)</h3>{dpair(R.causes, (v) => v + "%")}</div>
            <div className="dk-sm"><h3 className="dk-ch">Fixes applied (% of tickets with a resolution line)</h3>{dpair(R.fixes, (v) => v + "%")}</div>
          </div>
          {pairLegend}
          {C(1, <div><h3 className="dk-ch">Initiatives</h3><div className="dk-inits">{dinit("Mediaroom OVQ Campaign Restart")}{dinit("IPv4 over Wi-Fi Slow Video Start Investigation")}</div></div>)}
        </>,
        notes: "Packet loss and discontinuities lead and are quoted more than in September. A box swap and a sequential reboot are each about 30% of fixes. Shares are keyword matches on free text." },
      { layout: "two-cols", dense: true, title: "STB No Boot", clicks: 1, banner: "STB No Boot issues have slightly eased from September to October and will continue to be monitored",
        body: (step, C) => <>
          <div>{dpair(nbRows)}{pairLegend}</div>
          {C(1, <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="dk-note"><h3>Findings</h3>Stuck on Initializing held its September level and is still above last year. All STBs Affected is {Math.round((dsum("oct", "all") / dsum("oct", "stuck")) * 100)}% of Stuck tickets, which points at the gateway. The rest of the family eased.</div>
            <div><h3 className="dk-ch">Investigating remediation</h3><div className="dk-inits" style={{ gridTemplateColumns: "1fr" }}>{dinit("Sequential Reboot for Stuck on Initializing")}</div>
              <div className="dk-note" style={{ marginTop: 8, fontSize: 12.5 }}><h3 style={{ fontSize: 12.5 }}>Proactive reboot, two streams</h3><ul style={{ margin: "2px 0 0", gap: 4 }}>
                <li>The Q4 security firmware rollout reboots every gateway, so it is a first read on whether Stuck on Initializing improves (not a clean test, other firmware changes land with it).</li>
                <li>A longer-term, potentially recurring proactive reboot campaign from 2027, to check devices do not fall back.</li>
              </ul></div></div>
            <div className="dk-note amber" style={{ fontSize: 12.5 }}><h3>Root cause work</h3><ul style={{ margin: "2px 0 0", fontSize: 12.5, gap: 4 }}>
              <li>Tech Strat is working with AXON to recreate the issue in the lab to identify the root cause.</li>
              <li>A rollback on 10% of the base is being looked at to assess whether the new version is the culprit.</li>
            </ul></div>
          </div>)}
        </>,
        notes: "The reboot initiative is On Hold until January 2027 on the register." },
      { layout: "default", dense: true, title: "Missing Channels", clicks: 1, banner: "Missing channels continues to be an issue on TV+, driven by impacting defects/errors",
        body: (step, C) => <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div className="dk-sm"><h3 className="dk-ch">Root cause cited</h3>{dpair(R.missing.causes, (v) => v + "%")}</div>
            <div className="dk-sm"><h3 className="dk-ch">Fix in the notes</h3>{dpair(R.missing.fixes, (v) => v + "%")}</div>
          </div>
          {pairLegend}
          {C(1, <div><h3 className="dk-ch">Initiatives</h3><div className="dk-inits">{dinit("Subscribed Channel Access Defect Fix")}{dinit("P001 Playback Error Monitoring")}</div></div>)}
        </>,
        notes: `${num(R.missing.n[1])} October tickets (${num(R.missing.n[0])} in September). A subscription that exists but has not reached the box: fixed by a sync, Fix My Account, a stream-profile sync or a Tier 2 provisioning escalation.` }
    ];

    return (
      <>
        {deckSlide != null && <Deck slides={slides} index={deckSlide - 1} onIndex={(k) => setDeckSlide(k + 1)} onExit={() => setDeckSlide(null)} T={T} color={col} isDark={isDark} title="TV October review" />}
      <div className="hb">
        <style>{css}</style>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -26 }}>
          <button onClick={() => setDeckSlide(1)} title="Open this review as slides (arrow keys to navigate, Esc to exit)"
            style={{ background: col, color: "#fff", border: "none", borderRadius: 999, padding: "7px 16px", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(0,0,0,.14)" }}>
            <span style={{ fontSize: 10 }}>▶</span> Present · {slides.length} slides
          </button>
        </div>
        <header className="hb-head">
          <div className="hb-eyebrow">TV · October 2026 · TV as a whole: calls, tickets, dispatches, churn, and what is driving it, Mediaroom or OPUS</div>
          <h1>{headline}</h1>
          <p className="hb-sub">Dashboard KPIs for September and October, the Optik TV Legacy (Mediaroom) and TV Evolution (OPUS) platform split, then two focus sections: video quality and STB No Boot, from the Looker categories and the agent and technician notes ({num(R.files)} October tickets, 1 to 30 October, about {Math.round((R.files / totOct) * 100)}% of the month).</p>
          <div className="hb-meta"><span>Reliability Strategy</span><span>KPIs to Oct 2026</span><span>Notes to {R.asOf}</span><span>Rates per 100 subscribers</span></div>
        </header>

        <section aria-labelledby="oc-short">
          <div className="hb-answer">
            <h3 id="oc-short" style={{ color: H }}>In short</h3>
            <ol>
              <li><strong>Demand rose a little, cost to serve rose more.</strong> Tickets {num(tk[iOct])} ({sp(pct(tk[iOct], tk[iSep]), 1)}, {sp(pct(tk[iOct], tk[iYoY]), 1)} on Oct 2025), calls offered {num(callsOff[iOct])} ({sp(pct(callsOff[iOct], callsOff[iSep]), 1)}, {sp(pct(callsOff[iOct], callsOff[iYoY]), 1)} on Oct 2025) and dispatches {num(rv[iOct])} ({sp(pct(rv[iOct], rv[iSep]), 1)}, partly a source difference). Churn fell to {fmtRate(ch[iOct])} per 100 ({sd(ch[iOct] - ch[iSep])}) and the base shrank {num(base[iSep] - base[iOct])}.</li>
              <li><strong>In context of the year.</strong> {ctxCalls} {ctxMr}</li>
              <li><strong>Mediaroom is the upside.</strong> Optik TV Legacy tickets {sn(legacy.tickets[iOct] - legacy.tickets[iSep])} ({sp(pct(legacy.tickets[iOct], legacy.tickets[iSep]), 1)}) and its rate rose from {fmtRate(legacy.ticketRate[iSep])} to {fmtRate(legacy.ticketRate[iOct])} per 100, on a base that shrank {num(legacy.base[iSep] - legacy.base[iOct])}.</li>
              <li><strong>OPUS is the downside, which is good news.</strong> TV Evolution tickets {sn(opus.tickets[iOct] - opus.tickets[iSep])} ({sp(pct(opus.tickets[iOct], opus.tickets[iSep]), 1)}) and its rate fell to {fmtRate(opus.ticketRate[iOct])} per 100 while its base grew {num(opus.base[iOct] - opus.base[iSep])}. Against October 2025 it is the platform behind the improvement ({sp(pct(opus.tickets[iOct], opus.tickets[iYoY]), 0)} tickets against {sp(pct(legacy.tickets[iOct], legacy.tickets[iYoY]), 0)} for Legacy).</li>
              <li><strong>Video quality is what moved Mediaroom.</strong> Video Issues {sn(R.categories[0][2] - R.categories[0][1])}; stuttering {sn(R.movers[0][2] - R.movers[0][1])} and pixelization {sn(R.movers[2][2] - R.movers[2][1])}, mostly on Mediaroom boxes. One {O.area} outage on {O.day} Oct explains about a fifth; the rest is a higher everyday level.</li>
              <li><strong>STB No Boot eased.</strong> {num(R.categories[3][1])} to {num(R.categories[3][2])} ({sp(pct(R.categories[3][2], R.categories[3][1]), 1)}). Stuck on Initializing held at its September level, {num(R.movers[5][2])} against {num(R.movers[5][1])}, still above last year.</li>
              <li><strong>Channels moved the other way.</strong> Missing Channels {sn(R.movers[1][2] - R.movers[1][1])}, a provisioning problem that sits mostly on Evolution boxes, not a box fault.</li>
            </ol>
          </div>
        </section>

        <section aria-labelledby="oc-kpis">
          <h2 id="oc-kpis">TV as a whole: calls, tickets, dispatches, churn</h2>
          <div className="hb-stats">
            {stat(num(callsOff[iOct]), "Calls offered · Oct", `Sep ${num(callsOff[iSep])} · ${sp(pct(callsOff[iOct], callsOff[iSep]), 1)}`)}
            {stat(num(tk[iOct]), "Tickets · Oct", `Sep ${num(tk[iSep])} · ${sp(pct(tk[iOct], tk[iSep]), 1)}`)}
            {stat(num(rv[iOct]), "Repairs / dispatches · Oct", `Sep ${num(rv[iSep])} · ${sp(pct(rv[iOct], rv[iSep]), 1)}`)}
            {stat(fmtRate(tr[iOct]), "Ticket rate per 100 subs · Oct", `Sep ${fmtRate(tr[iSep])} · ${sd(tr[iOct] - tr[iSep])} per 100`)}
            {stat(fmtRate(ch[iOct]), "Churn rate per 100 subs · Oct", `Sep ${fmtRate(ch[iSep])} · ${sd(ch[iOct] - ch[iSep])} per 100`)}
            {stat(ansRate(iOct).toFixed(1) + "%", "Calls answered share · Oct", `Sep ${ansRate(iSep).toFixed(1)}% · ${num(callsAns[iOct])} answered`)}
          </div>
          <div className="hb-tw" style={{ marginTop: 14 }}><table>
            <thead><tr><th>Measure</th><th>Sep</th><th>Oct</th><th>Change</th><th>Oct 2025</th><th>vs Oct 2025</th><th></th></tr></thead>
            <tbody>{kpiRows.map(([n, ser, f, kind, goodDown]) => <tr key={n}><td>{n}</td><td className="n">{f(ser[iSep])}</td><td className="n">{f(ser[iOct])}</td><td className="n">{mp(kind, ser, iOct, iSep)}</td><td className="n">{f(ser[iYoY])}</td><td className="n">{mp(kind, ser, iOct, iYoY)}</td><td>{flag(pct(ser[iOct], ser[iSep]), goodDown)}</td></tr>)}</tbody>
          </table></div>
          <ul className="hb-prose">
            <li><strong>Calls rose faster than tickets.</strong> Calls offered {sp(pct(callsOff[iOct], callsOff[iSep]), 1)} against tickets {sp(pct(tk[iOct], tk[iSep]), 1)}, so calls per 100 subscribers went from {callsPer100(iSep).toFixed(2)} to {callsPer100(iOct).toFixed(2)}. The answer rate slipped from {ansRate(iSep).toFixed(1)}% to {ansRate(iOct).toFixed(1)}%. Year over year offered calls are down {Math.abs(pct(callsOff[iOct], callsOff[iYoY])).toFixed(0)}% but answered calls are up {pct(callsAns[iOct], callsAns[iYoY]).toFixed(0)}%, so agents handled more of a smaller queue. Calls are not split by platform in the source.</li>
            <li><strong>Dispatches: read the {sn(rv[iOct] - rv[iSep])} with care.</strong> The KPI tab shows {num(rv[iSep])} in September and {num(rv[iOct])} in October, but the platform source gives {num(platRepSep)} and {num(platRepOct)} (Legacy {num(legacy.repairs[iSep])} to {num(legacy.repairs[iOct])}, OPUS {num(opus.repairs[iSep])} to {num(opus.repairs[iOct])}), which is {sp(pct(platRepOct, platRepSep), 1)}. October matches the platform total, September does not, so part of the apparent rise is a source difference. The KPI-tab repair rate went from {fmtRate(rr[iSep])} to {fmtRate(rr[iOct])} per 100, level with a year ago ({fmtRate(rr[iYoY])}).</li>
            <li><strong>Churn improved.</strong> {fmtRate(ch[iOct])} per 100, {sd(ch[iOct] - ch[iSep])} on September and {sd(ch[iOct] - ch[iYoY])} on October 2025, even though tickets and calls rose.</li>
          </ul>
        </section>

        <section aria-labelledby="oc-plat">
          <h2 id="oc-plat">What is driving it: Mediaroom or OPUS</h2>
          <p className="hb-prose">Optik TV Legacy runs on Mediaroom boxes; TV Evolution runs on OPUS. Mediaroom and OPUS tickets total {num(platTotOct)} in October against {num(platTotSep)} in September ({sn(platTotOct - platTotSep)}): Mediaroom {sn(legacy.tickets[iOct] - legacy.tickets[iSep])}, OPUS {sn(opus.tickets[iOct] - opus.tickets[iSep])}. The TV ticket volume above also includes Pik TV, a minor product line ({num(pikOct)} in October against {num(pikSep)}) that is counted in the TV totals and rates and left out of every analysis section here, which is why the TV total is {num(tk[iOct])}.</p>
          <div className="hb-tw"><table>
            <thead><tr><th>Measure</th><th>Mediaroom Sep</th><th>Oct</th><th>Change</th><th>OPUS Sep</th><th>Oct</th><th>Change</th></tr></thead>
            <tbody>
              <tr><td>Tickets</td><td className="n">{num(legacy.tickets[iSep])}</td><td className="n">{num(legacy.tickets[iOct])}</td><td className="n">{sn(legacy.tickets[iOct] - legacy.tickets[iSep])}</td><td className="n">{num(opus.tickets[iSep])}</td><td className="n">{num(opus.tickets[iOct])}</td><td className="n">{sn(opus.tickets[iOct] - opus.tickets[iSep])}</td></tr>
              <tr><td>Calls offered</td><td className="n">{num(legacy.callsOffered[iSep])}</td><td className="n">{num(legacy.callsOffered[iOct])}</td><td className="n">{sn(legacy.callsOffered[iOct] - legacy.callsOffered[iSep])}</td><td className="n">{num(opus.callsOffered[iSep])}</td><td className="n">{num(opus.callsOffered[iOct])}</td><td className="n">{sn(opus.callsOffered[iOct] - opus.callsOffered[iSep])}</td></tr>
              <tr><td>Calls offered rate per 100 subs</td><td className="n">{fmtRate(legacy.callsRate[iSep])}</td><td className="n">{fmtRate(legacy.callsRate[iOct])}</td><td className="n">{sd(legacy.callsRate[iOct] - legacy.callsRate[iSep])}</td><td className="n">{fmtRate(opus.callsRate[iSep])}</td><td className="n">{fmtRate(opus.callsRate[iOct])}</td><td className="n">{sd(opus.callsRate[iOct] - opus.callsRate[iSep])}</td></tr>
              <tr><td>Ticket rate per 100 subs</td><td className="n">{fmtRate(legacy.ticketRate[iSep])}</td><td className="n">{fmtRate(legacy.ticketRate[iOct])}</td><td className="n">{sd(legacy.ticketRate[iOct] - legacy.ticketRate[iSep])}</td><td className="n">{fmtRate(opus.ticketRate[iSep])}</td><td className="n">{fmtRate(opus.ticketRate[iOct])}</td><td className="n">{sd(opus.ticketRate[iOct] - opus.ticketRate[iSep])}</td></tr>
              <tr><td>Subscriber base</td><td className="n">{num(legacy.base[iSep])}</td><td className="n">{num(legacy.base[iOct])}</td><td className="n">{sn(legacy.base[iOct] - legacy.base[iSep])}</td><td className="n">{num(opus.base[iSep])}</td><td className="n">{num(opus.base[iOct])}</td><td className="n">{sn(opus.base[iOct] - opus.base[iSep])}</td></tr>
              <tr><td>Repairs / dispatches</td><td className="n">{num(legacy.repairs[iSep])}</td><td className="n">{num(legacy.repairs[iOct])}</td><td className="n">{sn(legacy.repairs[iOct] - legacy.repairs[iSep])}</td><td className="n">{num(opus.repairs[iSep])}</td><td className="n">{num(opus.repairs[iOct])}</td><td className="n">{sn(opus.repairs[iOct] - opus.repairs[iSep])}</td></tr>
              <tr><td>Repair rate per 100 subs</td><td className="n">{fmtRate(legacy.repairRate[iSep])}</td><td className="n">{fmtRate(legacy.repairRate[iOct])}</td><td className="n">{sd(legacy.repairRate[iOct] - legacy.repairRate[iSep], 3)}</td><td className="n">{fmtRate(opus.repairRate[iSep])}</td><td className="n">{fmtRate(opus.repairRate[iOct])}</td><td className="n">{sd(opus.repairRate[iOct] - opus.repairRate[iSep], 3)}</td></tr>
              <tr><td>Tickets vs Oct 2025</td><td className="n">{num(legacy.tickets[iYoY])}</td><td className="n">{num(legacy.tickets[iOct])}</td><td className="n">{sp(pct(legacy.tickets[iOct], legacy.tickets[iYoY]), 1)}</td><td className="n">{num(opus.tickets[iYoY])}</td><td className="n">{num(opus.tickets[iOct])}</td><td className="n">{sp(pct(opus.tickets[iOct], opus.tickets[iYoY]), 1)}</td></tr>
              <tr><td>Ticket rate vs Oct 2025</td><td className="n">{fmtRate(legacy.ticketRate[iYoY])}</td><td className="n">{fmtRate(legacy.ticketRate[iOct])}</td><td className="n">{sd(legacy.ticketRate[iOct] - legacy.ticketRate[iYoY])}</td><td className="n">{fmtRate(opus.ticketRate[iYoY])}</td><td className="n">{fmtRate(opus.ticketRate[iOct])}</td><td className="n">{sd(opus.ticketRate[iOct] - opus.ticketRate[iYoY])}</td></tr>
            </tbody>
          </table></div>
          <ul className="hb-prose">
            <li><strong>Mediaroom is the month's upside.</strong> It gained {num(legacy.tickets[iOct] - legacy.tickets[iSep])} tickets while losing {num(legacy.base[iSep] - legacy.base[iOct])} subscribers, so the rate worsened by {Math.abs(legacy.ticketRate[iOct] - legacy.ticketRate[iSep]).toFixed(2)} per 100. September's step-up was shared (Legacy {sn(legacy.tickets[iSep] - legacy.tickets[iSep - 1])}, OPUS {sn(opus.tickets[iSep] - opus.tickets[iSep - 1])} on August); in October only Mediaroom kept rising.</li>
            <li><strong>OPUS is the month's downside.</strong> Tickets fell {num(opus.tickets[iSep] - opus.tickets[iOct])} on a base that grew {num(opus.base[iOct] - opus.base[iSep])}, so its rate fell by {Math.abs(opus.ticketRate[iOct] - opus.ticketRate[iSep]).toFixed(2)} per 100, to {fmtRate(opus.ticketRate[iOct])}, against {fmtRate(opus.ticketRate[iYoY])} a year ago.</li>
            <li><strong>Year over year the two platforms point opposite ways on rate.</strong> OPUS has cut tickets {Math.abs(pct(opus.tickets[iOct], opus.tickets[iYoY])).toFixed(0)}% and its rate by {Math.abs(opus.ticketRate[iOct] - opus.ticketRate[iYoY]).toFixed(2)}. Legacy tickets are only {Math.abs(pct(legacy.tickets[iOct], legacy.tickets[iYoY])).toFixed(0)}% lower and, because its base is {Math.abs(pct(legacy.base[iOct], legacy.base[iYoY])).toFixed(0)}% smaller, its rate is {Math.abs(legacy.ticketRate[iOct] - legacy.ticketRate[iYoY]).toFixed(2)} higher.</li>
            <li><strong>Mixed-usage households</strong> (on both Mediaroom and TTV+) fell from {num(TV_MIXED.base[iSep])} to {num(TV_MIXED.base[iOct])} as customers finished moving over; they sit in both platform counts.</li>
          </ul>
          <h3 style={{ color: H, marginTop: 18 }}>Which platform each category sits on (from the notes)</h3>
          <div className="hb-tw"><table>
            <thead><tr><th>Category</th><th>Mediaroom Sep</th><th>Oct</th><th>Change</th><th>OPUS Sep</th><th>Oct</th><th>Change</th></tr></thead>
            <tbody>{R.platformNotes.map(([n, a, b, c, d]) => <tr key={n}><td>{n}</td><td className="n">{num(a)}</td><td className="n">{num(b)}</td><td className="n">{sn(b - a)}</td><td className="n">{num(c)}</td><td className="n">{num(d)}</td><td className="n">{sn(d - c)}</td></tr>)}</tbody>
          </table></div>
          <p className="hb-prose" style={{ fontSize: 13.5 }}>Platform comes from device models in the notes, so only about 62% of tickets are identified, and the October export ends on the 30th (about 3% short), which lowers every October figure a little. Treat this as direction, not totals: the platform table above is the authority for totals. It shows video quality as the Mediaroom upside (Video Issues is the one category that rises on Mediaroom boxes), STB No Boot easing on Mediaroom, Digital Box easing on OPUS, and Channel Issues rising on OPUS (missing channels).</p>
        </section>

        <section aria-labelledby="oc-daily">
          <h2 id="oc-daily">Focus: video quality, stuttering and freezing day by day</h2>
          <div className="hb-tw" style={{ padding: 12 }}>{dailyChart()}</div>
          <p className="hb-prose" style={{ marginTop: 10 }}><span style={{ color: col, fontWeight: 700 }}>October</span> against <span style={{ color: MUTED, fontWeight: 700 }}>September</span>, by day of month (note exports: {num(stSep)} in September, {num(stOct)} in October, {sn(stOct - stSep)}). The one clear spike is {O.day} October. Outside it, October sits above September on most days, which is the broader lift.</p>
          <div className="hb-two">
            <div className="hb-answer"><h3 style={{ color: H }}>The {O.day} October outage</h3>
              <p style={{ margin: 0 }}>{O.area}. Agents found an active area outage in the issue tool (Stop/Stuttering/Freezing, under investigation, no restoration time) and a ticket to code against. Their notes record educating the customer, subscribing them to the outage portal for updates, and no field visit. {O.citing} tickets on the day and {O.citingNext} the next name it.</p></div>
            <div className="hb-answer"><h3 style={{ color: H }}>Everything else</h3>
              <p style={{ margin: 0 }}>Excluding {O.day} and {O.day + 1} October, stuttering still averaged about {Math.round((stOct - O.peak - O.next) / 28)} a day against {Math.round(stSep / 30)} in September. Device models and provinces in the notes barely changed, so the lift is spread across the Legacy base rather than one box or region.</p></div>
          </div>
        </section>

        <section aria-labelledby="oc-causes">
          <h2 id="oc-causes">Video quality: root causes in the notes (stuttering and pixelization)</h2>
          <p className="hb-prose">{num(R.video.n[1])} October tickets ({num(R.video.n[0])} in September). Only about {Math.round((R.video.rca[1] / R.video.n[1]) * 100)}% ({num(R.video.rca[1])}) carry an explicit root-cause line, so the shares below are the share of those, and a ticket can cite more than one cause.</p>
          {shareTable("Root cause cited", R.causes)}
          <ul className="hb-prose">
            <li><strong>Packet loss and discontinuities lead.</strong> They are quoted more in October ({R.causes[0][2]}% against {R.causes[0][1]}%), and mentions of underruns, discontinuities and multicast roughly doubled to tripled ({R.diag.map(([n, a, b]) => `${n.toLowerCase()} ${a} to ${b}`).join(", ")} tickets). That may reflect agents pasting more xVu output rather than a new fault.</li>
            <li><strong>Hardware and Wi-Fi follow.</strong> About four in ten point at a failing or degrading STB, and a third at the wireless link to a wireless STB (weak signal, 5 GHz interference, dead spots).</li>
            <li><strong>Long uptime is not the story here.</strong> Gateway or modem uptime is quoted in only {R.uptime.cited[1]} of {num(R.video.n[1])} tickets ({R.uptime.d30[1]} at 30 days or more, {R.uptime.d90[1]} at 90 or more, median {R.uptime.median[1]} days against {R.uptime.median[0]} in September). Buffer or cache corruption after long uptime is cited in {R.causes[4][2]}% of the tickets with a cause.</li>
            <li><strong>Active outages are small by count but real.</strong> {R.causes[8][2]}% of the tickets with a cause against {R.causes[8][1]}% in September, almost all from {O.day} October.</li>
          </ul>
        </section>

        <section aria-labelledby="oc-fixes">
          <h2 id="oc-fixes">Video quality: fixes applied</h2>
          <p className="hb-prose">Share of the {num(R.video.fixN[1])} October tickets whose notes include a resolution line ({num(R.video.fixN[0])} in September). Several fixes are often combined.</p>
          {shareTable("Fix in the notes", R.fixes)}
          <ul className="hb-prose">
            <li><strong>Swap or reboot, then escalate.</strong> A box swap and a sequential reboot are each about 30%. The reboot fix is used less than in September (36% to 30%) while dispatch (17% to 21%) and escalation (11% to 16%) are used more, which suggests more cases were not cleared remotely.</li>
            <li><strong>Remote Wi-Fi fixes are steady.</strong> Wiring or moving the STB, adding a booster, WPS or a Wi-Fi channel change stayed near 18%.</li>
          </ul>
        </section>

        <section aria-labelledby="oc-nb">
          <h2 id="oc-nb">Focus: STB No Boot</h2>
          <p className="hb-prose">STB No Boot is the Mediaroom start-up family (Stuck on Initializing, Reboot Loop, Quick Client Initialization Error and others). It fell from {num(R.categories[3][1])} to {num(R.categories[3][2])} tickets in Looker ({sn(R.categories[3][2] - R.categories[3][1])}, {sp(pct(R.categories[3][2], R.categories[3][1]), 1)}), the largest decrease among the named categories. It is down against September but its biggest member is still above last year.</p>
          <div className="hb-tw"><table>
            <thead><tr><th>STB No Boot sub-category (notes export)</th><th>Sep</th><th>Oct (to 30th)</th><th>Change</th><th>%</th><th></th></tr></thead>
            <tbody>{nbRows.map(([n, a, b]) => <tr key={n}><td>{n}</td><td className="n">{num(a)}</td><td className="n">{num(b)}</td><td className="n">{sn(b - a)}</td><td className="n">{sp(pct(b, a), 1)}</td><td>{flag(pct(b, a))}</td></tr>)}
              <tr><td><strong>STB No Boot total</strong></td><td className="n">{num(nbTot[1])}</td><td className="n">{num(nbTot[2])}</td><td className="n">{sn(nbTot[2] - nbTot[1])}</td><td className="n">{sp(pct(nbTot[2], nbTot[1]), 1)}</td><td>{flag(pct(nbTot[2], nbTot[1]))}</td></tr></tbody>
          </table></div>
          <p className="hb-prose" style={{ fontSize: 13.5 }}>Sub-categories come from the ticket exports, so October runs to 30 October and is about 3% lighter than a full month; Looker, which has the full month, gives Stuck on Initializing {num(R.movers[5][1])} to {num(R.movers[5][2])} ({sp(pct(R.movers[5][2], R.movers[5][1]), 1)}) and Reboot Loop {num(R.movers[7][1])} to {num(R.movers[7][2])} ({sp(pct(R.movers[7][2], R.movers[7][1]), 1)}).</p>
          <ul className="hb-prose">
            <li><strong>Stuck on Initializing held its September level.</strong> About {(dsum("oct", "stuck") / 30).toFixed(0)} tickets a day in October against {(dsum("sep", "stuck") / 30).toFixed(0)} in September ({sp(pct(dsum("oct", "stuck") / 30, dsum("sep", "stuck") / 30), 1)}), so the September step-up has not reversed. Looker has it {sp(pct(R.movers[5][2], 4190), 0)} on October 2025 ({num(4190)} to {num(R.movers[5][2])}).</li>
            <li><strong>The rise is still the whole-home form.</strong> All STBs Affected ran at {(dsum("oct", "all") / 30).toFixed(0)} a day in October against {(dsum("sep", "all") / 30).toFixed(0)} in September; One STB Affected {(dsum("oct", "one") / 30).toFixed(0)} against {(dsum("sep", "one") / 30).toFixed(0)}. All STBs Affected is {Math.round((dsum("oct", "all") / dsum("oct", "stuck")) * 100)}% of Stuck tickets, which points at the gateway rather than the box.</li>
            <li><strong>The rest of the family is easing.</strong> Reboot Loop {sp(pct(R.movers[7][2], R.movers[7][1]), 0)}, Quick Client Initialization Error {sp(pct(nbRows[2][2], nbRows[2][1]), 0)}, Stuck on PVR is Starting {sp(pct(nbRows[3][2], nbRows[3][1]), 0)}; only Red X rose ({sn(nbRows[6][2] - nbRows[6][1])}).</li>
            <li><strong>It sits on Mediaroom.</strong> The notes place about nine in ten identifiable STB No Boot tickets on Mediaroom boxes, so this category is a Mediaroom improvement that partly offset the video quality rise.</li>
          </ul>
          <ul className="hb-prose">
            <li><strong>Investigating remediation.</strong> The Sequential Reboot for Stuck on Initializing (proactive gateway reboot) is On Hold until Jan 2027 because of the Q4 firmware rollout targeting security vulnerabilities. Tech Strat is working with AXON to recreate the issue in the lab to identify the root cause, and a rollback on 10% of the base is being looked at to assess whether the new version is the culprit.</li>
            <li><strong>Proactive reboot runs in two streams.</strong> First, the Q4 security firmware rollout reboots every gateway, so it gives an early read on whether Stuck on Initializing improves (not a clean test, because other firmware changes land with it). Second, a longer-term, potentially recurring proactive reboot campaign from 2027 will check that devices do not fall back.</li>
          </ul>
          <p className="hb-prose" style={{ fontSize: 13.5 }}>The root-cause work, the CloudCheck side-load hypothesis and the fixes in flight for Stuck on Initializing are in the archived <button onClick={() => setPage("tvbrief")} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: col, textDecoration: "underline", cursor: "pointer" }}>TV Review (Stuck on Initializing)</button>; they have not been refreshed for October.</p>
        </section>

        <section aria-labelledby="oc-missing">
          <h2 id="oc-missing">Focus: channel issues, Missing Channels</h2>
          <p className="hb-prose">{num(R.missing.n[1])} October tickets ({num(R.missing.n[0])} in September); {num(R.missing.rca[1])} with an explicit root-cause line. Unsubscribed-type tickets rose from {num(R.missing.unsubscribed[0])} to {num(R.missing.unsubscribed[1])}.</p>
          {shareTable("Root cause cited", R.missing.causes)}
          {shareTable("Fix in the notes (share of all tickets)", R.missing.fixes)}
          <ul className="hb-prose">
            <li><strong>The pattern is a subscription that exists but has not reached the box.</strong> Typical notes: a new package or channel provisioned to billing and middleware but not showing on the STB, or Evolution boxes after a hardware migration, fixed by a sync, Fix My Account, a stream-profile sync or a Tier 2 provisioning escalation.</li>
            <li><strong>Evolution boxes are over-represented.</strong> About 29% of Missing Channels tickets name a TELUS TV+ box, against roughly a tenth of the Stuttering tickets, and clearing the TV+ app data fixes some cases.</li>
            <li><strong>Provider-side changes also appear.</strong> A programming change from a channel provider, or a provider outage, shows up as a handful of tickets that need no TELUS fix.</li>
          </ul>
        </section>

        <section aria-labelledby="oc-method">
          <h2 id="oc-method">Sources and method</h2>
          <p className="hb-prose" style={{ fontSize: 13.5 }}>Looker ticket categories (Churn Measurement 2026 workbook), TV platform data (TV Customer Base Breakdown workbook and Looker), and the September and October TV ticket exports with agent notes and resolution text ({num(R.files)} October tickets to 30 October against {num(totOct)} in Looker for the month; the September export is complete). Only aggregates are kept; no customer details are retained. Root causes and fixes come from keyword matching on the free text, mostly the structured Copilot summaries, so shares are indicative. About 58% of tickets do not name the platform in the notes, so the Mediaroom and Evolution split uses the platform data above for totals and the notes only for direction. The archived <button onClick={() => setPage("tvbrief")} style={{ background: "none", border: "none", padding: 0, font: "inherit", color: col, textDecoration: "underline", cursor: "pointer" }}>TV Review (Stuck on Initializing)</button> covers the September step-up in that category.</p>
        </section>
      </div>
      </>
    );
  }

  function timelineHasMonth(tl, month) {
    if (tl.includes(month)) return true;
    const m = tl.match(/^([A-Z][a-z]{2}) [–-] ([A-Z][a-z]{2}) (\d{4})$/), [mon, yr] = month.split(" ");
    if (!m || m[3] !== yr) return false;
    const a = MON3.indexOf(m[1]), b = MON3.indexOf(m[2]), i = MON3.indexOf(mon);
    return a >= 0 && b >= 0 && i >= a && i <= b;
  }
  // One data model drives the on-screen slides, the .pptx and the printable PDF.
  function buildDeck() {
    const month = latestLabel;
    const D = (d) => (d ? { text: d.text, tone: d.tone } : null);
    const kpis = PRODUCTS.map((p) => ({
      product: p, color: colors[p],
      tiles: scopeTiles(p).map((t) => {
        const f = rowFigures(t.data, t.dec, t.goodDown, t.fmt === fmtPct ? true : t.fmt === fmtRate ? "rate" : false);
        return { label: t.label.replace(/\s*\(.*\)$/, ""), value: t.fmt(f.latest), month: f.latestMonth ? shortMonth(f.latestMonth) : "", yoy: D(f.yoy) };
      })
    }));
    const asOf = LOOKER_SHORT, compare = LOOKER_MOM;
    const issues = PRODUCTS.filter((p) => LOOKER[p]).map((p) => {
      const L = LOOKER[p], t = L.topIssues[0], worse = t.a25 != null && t.a26 > t.a25;
      const mv = (r) => ({ name: r.issue, text: `${r.delta > 0 ? "+" : ""}${r.delta.toLocaleString()} (${yoyPctText(r.a26, r.prev)})` });
      return {
        product: p, color: colors[p], asOf, compare, issue: t.issue, volume: t.a26,
        yoy: t.a25 != null ? `${worse ? "▲" : "▼"} ${yoyPctText(t.a26, t.a25)} YoY` : "new in 2026", tone: worse ? "bad" : "good",
        trendName: L.topCat.name, trend: L.topCat.series, trendFrom: LOOKER_MONTHS[0], trendTo: LOOKER_MONTHS[LOOKER_MONTHS.length - 1], trendSrc: L.catSource === "recategorization" ? "recategorized" : "Looker",
        rising: L.rising.slice(0, 3).map(mv), falling: L.falling.slice(0, 3).map(mv)
      };
    });
    const milestones = INITIATIVES.filter((it) => timelineHasMonth(it.timeline, month)).map((it) => ({
      product: it.p, color: colors[it.p], name: it.name, theme: it.theme, status: it.status, timeline: it.timeline, prime: it.prime,
      pillar: (PILLARS.find((pl) => pl.n === it.pillar) || {}).name
    }));
    const res = sweeprFig("resolved", 0), web = sweeprFig("webAppRate", 1, false, true), easy = sweeprFig("cxEasy", 2), chn = sweeprFig("churn", 2, true, "rate"), dea = sweeprFig("deacts", 0);
    const selfServe = [
      { icon: "selfserve", label: "Resolved sessions", value: fmtBig(res.latest), sub: `${res.latestMonth || ""} · target ${fmtBig(res.target)}`, deltas: [[D(res.vsTarget), "vs target"], [D(res.yoy), "YoY"]] },
      { icon: "tickets", label: "Web/App resolution rate", value: fmtPct(web.latest, 1), sub: `${web.latestMonth || ""} · target ${fmtPct(web.target, 1)}`, deltas: [[D(web.vsTarget), "vs target"], [D(web.yoy), "YoY"]] },
      { icon: "cx", label: "CX 'Easy to follow'", value: easy.latest == null ? "—" : easy.latest.toFixed(2), sub: easy.latest == null ? "" : `${easy.latestMonth} · target ${easy.target == null ? "—" : easy.target.toFixed(2)}`, deltas: [[D(easy.vsTarget), "vs target"]] },
      { icon: "churn", label: "Sweepr involved churn per 100 subs", value: fmtRate(chn.latest, 2), sub: chn.latestMonth || "", deltas: [[D(chn.mom), "MoM"]] },
      { icon: "saved", label: "Deacts saved", value: fmtBig(dea.latest), sub: dea.latestMonth || "", deltas: [[D(dea.mom), "MoM"]] }
    ];
    return {
      month, kpis, issues, milestones, selfServe,
      selfServeNote: "Self-serve customer workflows are powered by the Sweepr platform. Targets are set in the source for 2026 only; churn impact and deacts saved carry no target.",
      titles: [`KPI scorecard · ${month}`, `Top ticket issues and movers · ${asOf}`, `Initiative milestones · ${month}`, `Self-serve workflows (Sweepr) · ${month}`]
    };
  }

  function ExecSummaryPage() {
    const deck = buildDeck();
    const scrollRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [cur, setCur] = useState(0);
    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return undefined;
      const measure = () => setScale(Math.max(0.25, el.clientWidth / DECK_W));
      measure();
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
      if (ro) ro.observe(el); else window.addEventListener("resize", measure);
      return () => { if (ro) ro.disconnect(); else window.removeEventListener("resize", measure); };
    }, []);
    const goTo = (i) => {
      const el = scrollRef.current;
      const n = Math.max(0, Math.min(3, i));
      if (el) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
      setCur(n);
    };
    useEffect(() => {
      const onKey = (e) => { if (deckSlide != null) return; if (e.key === "ArrowRight") goTo(cur + 1); else if (e.key === "ArrowLeft") goTo(cur - 1); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [cur, deckSlide]);
    const onScroll = () => { const el = scrollRef.current; if (el && el.clientWidth) setCur(Math.max(0, Math.min(3, Math.round(el.scrollLeft / el.clientWidth)))); };
    const toneCol = (t) => (t === "good" ? T.good : t === "bad" ? T.bad : T.textMuted);
    const fileStem = `Reliability-Strategy-Executive-Summary-${deck.month.replace(/\s+/g, "-")}`;
    const btn = (primary) => ({
      border: `1px solid ${primary ? "transparent" : T.borderStrong}`, background: primary ? T.ink : "transparent", color: primary ? "#fff" : T.textSecondary,
      borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT, display: "inline-flex", alignItems: "center", gap: 7
    });
    const lbl = { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted };

    const Chrome = ({ n, title, children }) => (
      <div style={{ width: DECK_W, height: DECK_H, background: T.surface, display: "flex", flexDirection: "column", fontFamily: FONT, color: T.text, boxSizing: "border-box" }}>
        <div style={{ background: "#4B286D", color: "#fff", padding: "12px 36px 10px", borderBottom: "4px solid #66CC02" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#C9A9E8" }}>Reliability Strategy · Executive summary · {deck.month}</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>{title}</div>
            <div style={{ fontSize: 12, color: "#C9A9E8" }}>{n} / 4</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: "18px 36px 0", minHeight: 0 }}>{children}</div>
        <div style={{ padding: "6px 36px 10px", fontSize: 9.5, color: T.textFaint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{DECK_SOURCE}</div>
      </div>
    );
    const card = { background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", boxSizing: "border-box", minWidth: 0 };

    // Slides take an optional reveal wrapper C(step, node, style) so the same JSX serves the
    // in-page strip (no reveals) and the Deck presentation (one product or card per click).
    const noC = (k, node) => node;
    const slide1 = (C = noC) => (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, height: "100%" }}>
        {deck.kpis.map((k, ki) => (
          <React.Fragment key={k.product}>{C(ki + 1, <div style={{ ...card, display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ color: k.color, display: "inline-flex" }}><Icon name={PRODUCT_ICON[k.product]} size={16} /></span>
              <span style={{ fontSize: 16, fontWeight: 800, color: k.color }}>{k.product}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridAutoRows: "1fr", gap: 10, flex: 1 }}>
              {k.tiles.map((t) => (
                <div key={t.label} style={{ background: T.panel, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={lbl}>{t.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: T.heading, lineHeight: 1.1, marginTop: 4 }}>{t.value}</div>
                  <div style={{ fontSize: 10, color: T.textFaint, marginTop: 2 }}>{t.month}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 4, color: t.yoy ? toneCol(t.yoy.tone) : T.textFaint }}>{t.yoy ? `${t.yoy.text} YoY` : "—"}</div>
                </div>
              ))}
            </div>
          </div>, { height: "100%" })}</React.Fragment>
        ))}
      </div>
    );

    const Spark = ({ series, color }) => {
      const w = 300, h = 66, pts = sparkPoints(series, w, h);
      return (
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
          <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" points={pts.map((p) => p.join(",")).join(" ")} />
        </svg>
      );
    };
    const slide2 = (C = noC) => (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, height: "100%" }}>
        {deck.issues.map((k, ki) => (
          <React.Fragment key={k.product}>{C(ki + 1, <div style={{ ...card, height: "100%" }}>
            <div style={{ ...lbl, color: k.color }}>{k.product} · top ticket issue — {k.asOf}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textSecondary, marginTop: 4 }}>{k.issue}</div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 2 }}>{k.volume.toLocaleString()} tickets · <b style={{ color: toneCol(k.tone) }}>{k.yoy}</b></div>
            <div style={{ background: T.panel, borderRadius: 8, padding: "10px 12px 6px", margin: "10px 0" }}>
              <Spark series={k.trend} color={k.color} />
              <div style={{ fontSize: 10, color: T.textFaint, marginTop: 4 }}>{k.trendName} tickets · {k.trendFrom} – {k.trendTo} ({k.trendSrc})</div>
            </div>
            {[["Rising", k.rising, T.bad], ["Falling", k.falling, T.good]].map(([title, rows, col]) => (
              <div key={title} style={{ marginTop: 10 }}>
                <div style={{ ...lbl, color: col }}>{title} · {k.compare}</div>
                {rows.map((r) => (
                  <div key={r.name} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, padding: "3px 0", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ color: T.textSecondary }}>{r.name}</span><b style={{ color: col, whiteSpace: "nowrap" }}>{r.text}</b>
                  </div>
                ))}
              </div>
            ))}
          </div>, { height: "100%" })}</React.Fragment>
        ))}
      </div>
    );

    const chip = (status) => {
      const bg = status === "Launched" ? T.chipLaunched : (status === "Stalled" || status === "On Hold") ? T.chipStalled : status === "Ideation" ? T.chipIdea : T.chipFlight;
      const fg = status === "Launched" ? T.chipLaunchedText : (status === "Stalled" || status === "On Hold") ? T.chipStalledText : status === "Ideation" ? T.chipIdeaText : T.chipFlightText;
      return <span style={{ background: bg, color: fg, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{status}</span>;
    };
    const th = { textAlign: "left", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted, padding: "6px 8px", borderBottom: `1px solid ${T.border}` };
    const td = { padding: "9px 8px", borderBottom: `1px solid ${T.border}`, fontSize: 12.5, verticalAlign: "top" };
    const slide3 = deck.milestones.length ? (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Product", "Initiative", "Theme", "Status", "Timeline", "Prime"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {deck.milestones.map((m) => (
            <tr key={m.name}>
              <td style={{ ...td, color: m.color, fontWeight: 700 }}>{m.product}</td>
              <td style={{ ...td, fontWeight: 700, color: T.textSecondary }}>{m.name}<div style={{ fontSize: 10.5, color: T.textFaint, fontWeight: 400, marginTop: 2 }}>{m.pillar}</div></td>
              <td style={{ ...td, color: T.textMuted }}>{m.theme}</td>
              <td style={td}>{chip(m.status)}</td>
              <td style={{ ...td, color: T.textMuted }}>{m.timeline}</td>
              <td style={{ ...td, color: T.textMuted }}>{m.prime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : <p style={{ color: T.textMuted, fontSize: 14 }}>No initiative has a milestone dated {deck.month}.</p>;

    const slide4 = (C = noC) => (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {deck.selfServe.map((t, ti) => (
            <React.Fragment key={t.label}>{C(ti + 1, <div style={{ ...card, height: "100%" }}>
              <div style={{ ...lbl, display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: colors.SWEEPR, display: "inline-flex" }}><Icon name={t.icon} size={13} /></span>{t.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: T.heading, lineHeight: 1.1, marginTop: 8 }}>{t.value}</div>
              <div style={{ fontSize: 10.5, color: T.textFaint, marginTop: 3 }}>{t.sub}</div>
              {t.deltas.map(([d, suf], i) => <div key={i} style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: d ? toneCol(d.tone) : T.textFaint }}>{d ? `${d.text} ${suf}` : "—"}</div>)}
            </div>, { height: "100%" })}</React.Fragment>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 18, lineHeight: 1.6 }}>{deck.selfServeNote}</p>
      </>
    );

    const slides = [slide1(), slide2(), slide3, slide4()];
    // Presentation mode: the same four slides on the Deck component, with a cover and a close.
    // fill: the slide body takes the remaining height; k < 1 scales the strip's slide down to fit.
    const fill = (node, k = 1) => <div className="dk-raw" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", ...(k < 1 ? { transform: `scale(${k})`, transformOrigin: "top left", width: `${100 / k}%`, height: `${100 / k}%`, flex: "none" } : {}) }}>{node}</div>;
    const deckSlides = [
      { layout: "cover", title: `Executive summary · ${deck.month}`, sub: `Reliability Strategy · KPI scorecard, top ticket issues and movers, initiative milestones and self-serve workflows for ${deck.month}`, notes: `Slides follow the end of the selected date range (${deck.month}); the top-issue slide uses the Looker ticket categories as of ${LATEST}.` },
      { layout: "default", dense: true, title: deck.titles[0], sub: "Latest reported month with the year-over-year move; rates per 100 subscribers", clicks: deck.kpis.length, body: (step, C) => fill(slide1(C), 0.86), notes: "One click per product. Green is better, red is worse, year over year." },
      { layout: "default", dense: true, title: deck.titles[1], sub: `Top ticket issue per product with its trend, and the biggest movers ${deck.issues[0] ? deck.issues[0].compare : ""}`, clicks: deck.issues.length, body: (step, C) => fill(slide2(C), 0.9), notes: "One click per product. The sparkline is the top category's monthly ticket volume since January 2025." },
      { layout: "default", dense: true, title: deck.titles[2], sub: `Register initiatives with a milestone in ${deck.month}`, body: fill(slide3), notes: deck.milestones.length ? `${deck.milestones.length} initiatives carry a ${deck.month} milestone.` : `No initiative has a milestone dated ${deck.month}.` },
      { layout: "default", dense: true, title: deck.titles[3], sub: "Self-serve customer workflows are powered by the Sweepr platform", clicks: deck.selfServe.length, body: (step, C) => fill(slide4(C)), notes: deck.selfServeNote },
      { layout: "end", title: "Sources", sub: DECK_SOURCE, notes: "Full detail is on the Overview and product pages of the dashboard." }
    ];
    return (
      <>
        {deckSlide != null && <Deck slides={deckSlides} index={deckSlide - 1} onIndex={(k) => setDeckSlide(k + 1)} onExit={() => setDeckSlide(null)} T={T} color={T.heading} isDark={isDark} title={`Executive summary · ${deck.month}`} />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", margin: "6px 0 12px" }}>
          <div>
            <div style={lbl}>Slide {cur + 1} of 4</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textSecondary }}>{deck.titles[cur]}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => goTo(cur - 1)} disabled={cur === 0} style={{ ...btn(false), opacity: cur === 0 ? 0.4 : 1 }} aria-label="Previous slide">‹ Prev</button>
            <button onClick={() => goTo(cur + 1)} disabled={cur === 3} style={{ ...btn(false), opacity: cur === 3 ? 0.4 : 1 }} aria-label="Next slide">Next ›</button>
            <span style={{ width: 1, height: 22, background: T.border, margin: "0 4px" }} />
            <button onClick={() => setDeckSlide(1)} style={{ ...btn(true), background: T.heading }} title="Present full screen (arrow keys to navigate, Esc to exit)"><span style={{ fontSize: 10 }}>▶</span> Present</button>
            <button onClick={() => downloadBlob(pptxFromDeck(deck), `${fileStem}.pptx`)} style={btn(true)} title="Downloads a .pptx that opens in Google Slides">
              <Icon name="slides" size={13} /> Google Slides (.pptx)
            </button>
            <button onClick={() => printDeck(deck)} style={btn(false)} title="Opens the print dialog; choose Save as PDF">
              <Icon name="notes" size={13} /> PDF
            </button>
          </div>
        </div>
        <div ref={scrollRef} onScroll={onScroll}
          style={{ display: "flex", overflowX: "auto", overflowY: "hidden", scrollSnapType: "x mandatory", borderRadius: 14, border: `1px solid ${T.border}`, background: T.band, scrollbarWidth: "none" }}>
          {slides.map((s, i) => (
            <div key={i} style={{ flex: "0 0 100%", scrollSnapAlign: "start", aspectRatio: `${DECK_W} / ${DECK_H}`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <Chrome n={i + 1} title={deck.titles[i]}>{s}</Chrome>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} aria-label={`Go to slide ${i + 1}`}
              style={{ width: i === cur ? 22 : 8, height: 8, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === cur ? T.heading : T.borderStrong, transition: "width .15s" }} />
          ))}
        </div>
        <Disclosure label="How to use these slides" T={T}><p style={{ fontSize: 12.5, color: T.textFaint, margin: "14px 2px 0", lineHeight: 1.6 }}>
          Scroll sideways, use the arrows or the ← → keys to move between slides. Slides follow the end of the selected date range ({deck.month}); the top-issue slide uses the Looker ticket categories as of {LATEST} (the HSIA trend line uses the recategorized customer pain points). The .pptx opens in Google Slides (upload it to Drive and open, or use File › Import slides) and in PowerPoint; the PDF option uses the browser print dialog, where you choose Save as PDF.
        </p></Disclosure>
      </>
    );
  }

  const ARCH_PAGE = page === "hsiaarch" || page === "hsiaarchdeck"; // static pages: no month context
  const pageTitle = page === "home"
    ? "Reliability monthly performance scorecard"
    : page === "selfserve"
      ? "Self-serve workflows scorecard"
    : page === "ffps"
      ? "Friction Free Product Systems program"
      : page === "execsummary"
      ? "Executive summary"
      : page === "archive"
      ? "Previously completed reviews and other pages"
      : page === "hsiabrief"
      ? `Q${Math.floor((MONTHS.indexOf(HSIA_REVIEW_LATEST) % 12) / 3) + 1} ${HSIA_REVIEW_LATEST.slice(-4)} and why tickets rose and what is being done`
    : page === "shplustickets"
      ? "SH+ notes analysis"
    : page === "hsiatickets"
      ? "HSIA notes analysis"
      : page === "hsiasentiment"
      ? "HSIA customer sentiment analysis"
      : page === "hsiacross"
      ? "HSIA cross analysis"
      : page === "hsiaoctreview"
      ? "HSIA in October: calls, tickets, repairs and deacts, HSIA West, TQ ILEC and PFE, and slow speeds"
      : page === "hsiawest"
      ? "HSIA · HSIA West"
      : page === "hsiatq"
      ? "HSIA · TQ ILEC"
      : page === "hsiapfe"
      ? "HSIA · PFE (PureFibre East)"
      : page === "hsiaarch"
      ? "HSIA reliability architecture"
      : page === "hsiaarchdeck"
      ? "HSIA architecture: supporting use cases"
      : page === "tvplatforms"
        ? "TV by platform"
        : page === "tvtickets"
          ? "TV notes analysis"
          : page === "tvsentiment"
            ? "TV customer sentiment analysis"
            : page === "tvcross"
              ? "TV cross analysis"
              : page === "tvoctreview"
                ? "TV in October: calls, tickets, dispatches and churn, Mediaroom or OPUS, video quality and STB No Boot"
              : page === "tvbrief"
                ? "STB Stuck on Initializing: trend against baseline, root causes and what is being done"
              : `${page} reliability scorecard`;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.text, fontFamily: FONT }}>
      {expandedChart && (
        <div onClick={() => setExpandedChart(null)} role="dialog" aria-label={`${expandedChart.title} expanded`}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(20,16,26,.62)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(1200px, 100%)", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 22px 14px", boxShadow: "0 24px 64px rgba(0,0,0,.35)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.heading }}>{expandedChart.title}</div>
                <div style={{ fontSize: 12, color: T.textFaint }}>{expandedChart.sub}</div>
              </div>
              <button onClick={() => setExpandedChart(null)} aria-label="Close"
                style={{ background: "transparent", border: `1px solid ${T.borderStrong}`, borderRadius: 8, color: T.textSecondary, fontFamily: FONT, fontSize: 12.5, fontWeight: 600, padding: "5px 12px", cursor: "pointer" }}>Close ✕</button>
            </div>
            <LineChart labels={expandedChart.labels} seriesDefs={expandedChart.seriesDefs} height={420} yFmt={expandedChart.fmt} colors={colors} T={T} />
            <Legend items={expandedChart.seriesDefs.map((s) => ({ label: s.label, color: s.color, dash: !!s.dash }))} T={T} />
          </div>
        </div>
      )}
      {/* Sidebar */}
      <aside style={{ width: 224, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: `1px solid ${T.border}` }}>
          <img src={TELUS_LOGO} alt="TELUS" style={{ height: 28, width: "auto", display: "block", background: isDark ? "#FFFFFF" : "transparent", borderRadius: 6, padding: isDark ? "4px 7px" : 0, boxSizing: "content-box" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textSecondary, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 10 }}>Reliability Strategy</div>
        </div>
        <nav style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 3 }}>
          {navItems.map((item) => {
            const active = page === item.id;
            // Sub-pages stay hidden until their product is expanded (or one of
            // them is open, so the active state is always visible).
            if (item.child) {
              const gp = CHILD_PARENT[item.parent]; // grandparent (HSIA) for the third-level item
              const show = item.grand
                ? (navOpen[item.parent] || CHILD_PARENT[page] === item.parent || page === item.parent) && (navOpen[gp] || CHILD_PARENT[page] === gp || CHILD_PARENT[CHILD_PARENT[page]] === gp)
                : navOpen[item.parent] || CHILD_PARENT[page] === item.parent || CHILD_PARENT[CHILD_PARENT[page]] === item.parent || (item.parent === "archive" && page === "archive");
              if (!show) return null;
            }
            const hasKids = !!CHILD_PAGES[item.id];
            const kidsOpen = hasKids && (navOpen[item.id] || CHILD_PARENT[page] === item.id || (item.id === "archive" && page === "archive"));
            return (
              <React.Fragment key={item.id}>
              {item.divider && <div role="separator" style={{ height: 1, background: T.border, margin: "8px 4px" }} />}
              <button onClick={() => { setPage(item.id); setDeckSlide(null); setInitFilters(NO_INIT_FILTERS); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                  background: active ? T.navActiveBg : "transparent", color: active ? T.navActiveText : T.textSecondary,
                  border: "none", borderLeft: `3px solid ${active ? T.heading : "transparent"}`,
                  borderRadius: 8, padding: item.grand ? "6px 12px 6px 48px" : item.child ? "6px 12px 6px 32px" : "9px 12px",
                  fontSize: item.child ? 12.5 : 13.5, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: FONT
                }}>
                <span style={{ color: item.color, display: "inline-flex" }}><Icon name={item.icon} size={item.child ? 13 : 15} /></span>
                {item.label}
                {hasKids && (
                  <span onClick={(e) => { e.stopPropagation(); setNavOpen((o) => ({ ...o, [item.id]: !o[item.id] })); }}
                    style={{ marginLeft: "auto", color: T.textMuted, fontSize: 12, padding: "0 4px", transform: kidsOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
                )}
              </button>
              </React.Fragment>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", padding: "14px 16px", borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => setThemeMode(isDark ? "light" : "dark")}
            style={{ width: "100%", background: "transparent", border: `1px solid ${T.borderStrong}`, color: T.textSecondary, borderRadius: 999, padding: "7px 12px", fontSize: 12.5, cursor: "pointer", fontFamily: FONT }}>
            {isDark ? "☀️ Light mode" : "🌙 Dark mode"}
          </button>
          <Disclosure label="Sources" T={T}><div style={{ fontSize: 10.5, color: T.textFaint, lineHeight: 1.5 }}>
            Source: Churn Measurement 2026 workbook (KPIs, Looker ticket categories, HSIA ticket recategorization, initiatives) · Self-serve: Self Assure metrics (Sweepr) · SH+: SH+ reliability KPIs workbook · HSIA and TV notes analysis: agent/technician ticket notes (Jul – Sep 2026, Sep vs Aug); Optik TV and HSIA survey verbatims (Jun – Aug 2026, Aug vs Jul, not yet rolled forward) · Jan 2025 – {MONTHS[MONTHS.length - 1]}
          </div></Disclosure>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 32px 64px" }}>
          <Eyebrow T={T}>Product Health · Reliability{page !== "home" ? ` · ${CHILD_LABEL[page] ? `${PARENT_LABEL[CHILD_PARENT[page]] || CHILD_PARENT[page]} · ${CHILD_LABEL[page]}` : page === "ffps" ? "Friction Free Program" : page}` : ""}</Eyebrow>
          <h1 style={{ fontSize: 27, fontWeight: 700, margin: "8px 0 0", color: T.heading, letterSpacing: "-.01em" }}>{pageTitle}</h1>
          <div style={{ height: 3, width: 96, background: `linear-gradient(90deg, ${T.heading}, #66CC02)`, borderRadius: 2, margin: "12px 0 14px" }} />
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12.5, color: T.textMuted, borderBottom: `1px solid ${T.border}`, paddingBottom: 16, marginBottom: 6 }}>
            <span><b style={{ color: T.textSecondary }}>Scope</b> · {page === "selfserve"
              ? "Self-serve workflows (Sweepr): resolved sessions, resolution rates, CX, churn impact"
              : page === "ffps"
              ? `Friction Free Product Systems (FFPS) · ${FFPS.period} · CR and ticket burndown, benefits, billing tickets, CR delivery, finance`
              : page === "execsummary"
              ? `Executive summary · slide view of the overview for ${latestLabel}: KPIs, top ticket issues, initiative milestones, self-serve`
              : page === "archive"
              ? "Archive · completed reviews and other pages; frozen at the month they were written for"
              : page === "hsiabrief"
              ? "HSIA review (archived) · year-over-year ticket drivers (Jan – Sep 2026 vs 2025) read against the latest quarter, agent and technician notes, customer sentiment, and the initiatives in flight"
              : page === "shplustickets"
              ? `SH+ notes analysis · ${SHPA.months[2]} vs ${SHPA.months[1]} · Assure ticket notes: top issues, movers, resolutions and warranty swaps, agent note themes, recommendations`
              : page === "hsiatickets"
              ? `HSIA notes analysis ·${HSA.months[2]} vs ${HSA.months[1]} · agent and technician notes: top issues, movers, categorisation divergence, recommendations`
              : page === "hsiasentiment"
              ? "CF&R TELUS Internet survey · Aug vs Jul 2026 · reliability perception, drivers, verbatim themes and sentiment"
              : page === "hsiaarchdeck"
              ? "HSIA Reliability Tools Ecosystem deck, slides 5 to 18 · one use case per slide: pain points, Northstar goals and the journey it enables"
              : page === "hsiaarch"
              ? "HSIA reliability ecosystem · North Star layered architecture of the tools that connect telemetry, orchestration and the customer, agent and technician channels"
              : page === "hsiacross"
              ? "HSIA cross analysis · Aug vs Jul 2026 · ticket trends × Looker volumes × agent/technician notes"
              : page === "hsiaoctreview"
              ? "HSIA October review · KPIs to Oct 2026 · HSIA as a whole, HSIA West, TQ ILEC and PFE separately, and the growth of slow speeds in tickets"
              : page === "hsiawest"
              ? "HSIA · HSIA West · calls offered, tickets, repairs and subscriber base for HSIA West on its own; churn is not split from TQ ILEC in the source"
              : page === "hsiatq"
              ? "HSIA · TQ ILEC · calls offered, tickets, repairs and subscriber base for TQ ILEC HSIA on its own; churn is not split from HSIA West in the source"
              : page === "hsiapfe"
              ? "HSIA · PFE (PureFibre East) · calls offered, tickets, repairs, churn and subscriber base for PureFibre East customers"
              : page === "tvplatforms"
                ? "TV platforms · Optik TV Legacy vs TV Evolution vs Mixed usage: base, tickets, repairs, swaps"
                : page === "tvtickets"
                  ? `TV notes analysis · ${TVA.months[2]} vs ${TVA.months[1]} · agent and technician notes: top issues, movers, categorisation divergence, recommendations`
                  : page === "tvsentiment"
                    ? "Optik TV survey verbatims · Aug vs Jul 2026 · themes, TV issue mentions, text sentiment (scores excluded)"
                    : page === "tvcross"
                      ? "TV cross analysis · Aug vs Jul 2026 · ticket trends × agent/technician notes × customer verbatims"
                      : page === "tvoctreview"
                      ? `TV October review · dashboard KPIs to Oct 2026, agent and technician notes to ${OCT_REVIEW.asOf} · TV as a whole, Mediaroom vs OPUS, focus on video quality and STB No Boot`
                      : page === "tvbrief"
                      ? `TV review · Aug – Oct 2026 (agent exports to ${TV_REVIEW.asOf}) · TV performance, STB No Boot › Stuck on Initializing against its baseline with the All STBs / One STB split, root causes and the fixes in flight`
                      : page === "SH+" || (page === "home" && scope === "SH+")
                  ? "SH+: calls, tickets, repairs/dispatches, base"
                  : `${page === "home" ? (scope === "All" ? "All products" : scope) : page}: calls, tickets, repairs/dispatches, churn, base, initiatives${page === "HSIA" || (page === "home" && scope === "HSIA") ? " · Includes HSIA West & TQ ILEC - HSIA" : ""}`}</span>
            {!ARCH_PAGE && <span><b style={{ color: T.textSecondary }}>{CHILD_PARENT[page] === "archive" || page === "archive" ? "Archived" : "Reviewing"}</b> · {page === "hsiabrief" ? `final, data to ${HSIA_REVIEW_LATEST}` : page === "tvbrief" ? `final, dashboard KPIs to ${TV_REVIEW_LATEST}` : page === "archive" ? "not refreshed monthly" : latestLabel}</span>}
            {page !== "archive" && CHILD_PARENT[page] !== "archive" && !ARCH_PAGE && <span><b style={{ color: T.textSecondary }}>Operational thru</b> · {MONTHS[MONTHS.length - 1]} (churn: {CHURN_THRU})</span>}
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
            {(page === "tvplatforms" || (!PRODUCTS.includes(CHILD_PARENT[page]) && CHILD_PARENT[page] !== "SH+" && CHILD_PARENT[page] !== "archive" && CHILD_PARENT[page] !== "hsiaarch" && page !== "archive" && page !== "ffps")) && <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>From</span>
              <select value={fromIdx} onChange={(e) => { const v = +e.target.value; setFromIdx(v); if (v > toIdx) setToIdx(v); }} style={selectStyle}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>To</span>
              <select value={toIdx} onChange={(e) => { const v = +e.target.value; setToIdx(v); if (v < fromIdx) setFromIdx(v); }} style={selectStyle}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>}
          </div>

          {/* Page renderers are plain functions (no hooks) called inline, so a
              state change re-renders the existing DOM instead of remounting the
              page; the Executive Summary keeps its own state and stays a component. */}
          {page === "home" ? HomePage()
            : page === "selfserve" ? SelfServePage()
            : page === "ffps" ? FfpsPage()
            : page === "execsummary" ? <ExecSummaryPage />
            : page === "archive" ? ArchivePage()
            : page === "hsiabrief" ? HsiaBriefPage()
            : page === "shplustickets" ? ShPlusTicketAnalysisPage()
            : page === "hsiatickets" ? HsiaTicketAnalysisPage()
            : page === "hsiasentiment" ? HsiaSentimentPage()
            : page === "hsiacross" ? HsiaCrossPage()
            : page === "hsiaoctreview" ? HsiaOctReviewPage()
            : page === "hsiawest" ? HsiaWestPage()
            : page === "hsiatq" ? HsiaTqPage()
            : page === "hsiapfe" ? HsiaPfePage()
            : page === "hsiaarch" ? ArchitecturePage()
            : page === "hsiaarchdeck" ? ArchitectureDeckPage()
            : page === "tvplatforms" ? TvPlatformsPage()
            : page === "tvtickets" ? TvTicketAnalysisPage()
            : page === "tvsentiment" ? TvSentimentPage()
            : page === "tvcross" ? TvCrossPage()
            : page === "tvoctreview" ? TvOctReviewPage()
            : page === "tvbrief" ? TvBriefPage()
            : ProductPage({ product: page })}
        </div>
        <footer style={{ textAlign: "center", fontSize: 12, color: T.textFaint, padding: "0 0 24px" }}>
          <Disclosure label="Source" T={T} align="center" style={{ marginTop: 0 }}>
            Built from the Churn Measurement 2026 workbook · figures reflect the source snapshot, not a live feed
          </Disclosure>
        </footer>
      </main>
    </div>
  );
}
