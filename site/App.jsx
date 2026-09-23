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
    monthlyTotal: [42489,41047,47251,48475,49389,48900,52579,52722,50457,51979,53130,53539,53989,46972,49550,54149,56084,59165,59145,60572],
    topCat: { name: "Connectivity", series: [32131,30626,35029,36273,37702,37343,40270,40370,38782,39606,39618,39896,38899,33705,36185,40138,41961,42848,42887,44386] },
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
      { issue: "Incompatible Equipment › Incompatible", grp: "Speed", a26: 2037, a25: 0, delta: 2037 },
      { issue: "Connectivity › Incompatible Equipment", grp: "Speed", a26: 1522, a25: 0, delta: 1522 }
    ],
    falling: [
      { issue: "Connectivity › ONT Not Ranged", grp: "Connectivity", a26: 7216, a25: 8536, delta: -1320 },
      { issue: "Connectivity › Historical Data", grp: "Connectivity", a26: 2611, a25: 3020, delta: -409 },
      { issue: "Connectivity › No IP", grp: "Connectivity", a26: 1946, a25: 1949, delta: -3 }
    ]
  },
  TV: {
    monthlyTotal: [38203,37850,41374,41718,41538,36431,36644,35205,34178,41446,41064,38433,38961,33097,32600,34609,30737,32173,31355,32801],
    topCat: { name: "STB No Boot", series: [8480,7806,8505,8568,8455,8005,8240,7379,6318,7336,7429,7366,7689,6716,6643,6938,6251,6342,6831,7203] },
    topIssues: [
      { issue: "Video Issues › No Video", grp: "TV", a26: 4250, a25: 5920 },
      { issue: "STB No Boot › Stuck on Initializing", grp: "TV", a26: 4149, a25: 4283 },
      { issue: "Recording Issues › Cannot Set Recordings", grp: "TV", a26: 3119, a25: 3505 },
      { issue: "Digital Box › Setup", grp: "TV", a26: 2121, a25: 1238 },
      { issue: "Video Issues › Stop/Stuttering/Freezing", grp: "TV", a26: 2077, a25: 2310 },
      { issue: "Digital Box › No Boot", grp: "TV", a26: 1887, a25: 3738 },
      { issue: "Channel Issues › Channel Not Working", grp: "TV", a26: 1667, a25: 1186 },
      { issue: "Channel Issues › Missing Channels", grp: "TV", a26: 1477, a25: 1283 }
    ],
    rising: [
      { issue: "Digital Box › Setup", grp: "TV", a26: 2121, a25: 1238, delta: 883 },
      { issue: "Channel Issues › Channel Not Working", grp: "TV", a26: 1667, a25: 1186, delta: 481 },
      { issue: "Recordings › Functionality", grp: "TV", a26: 516, a25: 280, delta: 236 }
    ],
    falling: [
      { issue: "Digital Box › No Boot", grp: "TV", a26: 1887, a25: 3738, delta: -1851 },
      { issue: "Video Issues › No Video", grp: "TV", a26: 4250, a25: 5920, delta: -1670 },
      { issue: "Recording Issues › Cannot Set Recordings", grp: "TV", a26: 3119, a25: 3505, delta: -386 }
    ]
  },
  SHS: {
    monthlyTotal: [35888,35833,43965,46504,45961,44223,50684,50121,48962,48838,44322,45432,43986,36977,34961,36722,34900,38993,40749,38702],
    topCat: { name: "Main Panel", series: [6940,6526,8168,8443,8119,7973,9412,9359,8674,8338,8310,8700,7936,7092,6800,7132,6765,7727,7905,7273] },
    topIssues: [
      { issue: "Main Panel › Education", grp: "SHS Hardware", a26: 2155, a25: 2985 },
      { issue: "Door/Window Sensor › Troubleshoot", grp: "SHS Hardware", a26: 2126, a25: 2305 },
      { issue: "Smoke Detector › Troubleshoot", grp: "SHS Hardware", a26: 2040, a25: 2217 },
      { issue: "Mobile App Self-Serve › Troubleshoot", grp: "Support", a26: 1807, a25: 2091 },
      { issue: "Main Panel › Panel status", grp: "SHS Hardware", a26: 1590, a25: 2280 },
      { issue: "Legacy Equipment › Legacy equipment support", grp: "SHS Hardware", a26: 1432, a25: 3610 },
      { issue: "Outdoor Camera › Wi-Fi connection", grp: "SHS Hardware", a26: 1110, a25: 1396 },
      { issue: "Smoke Detector › Power issues", grp: "SHS Hardware", a26: 1103, a25: 672 }
    ],
    rising: [
      { issue: "Smoke Detector › Power issues", grp: "SHS Hardware", a26: 1103, a25: 672, delta: 431 },
      { issue: "Door/Window Sensor › Power issues", grp: "SHS Hardware", a26: 860, a25: 616, delta: 244 },
      { issue: "Smoke Detector › Education", grp: "SHS Hardware", a26: 967, a25: 728, delta: 239 }
    ],
    falling: [
      { issue: "Legacy Equipment › Legacy equipment support", grp: "SHS Hardware", a26: 1432, a25: 3610, delta: -2178 },
      { issue: "CMS inquiry › Event history", grp: "Support", a26: 829, a25: 1666, delta: -837 },
      { issue: "Main Panel › Education", grp: "SHS Hardware", a26: 2155, a25: 2985, delta: -830 }
    ]
  }
};
const OVERVIEW_ISSUES = [
  { grp: "Connectivity", HSIA: [36342, 34439], TV: null, SHS: null },
  { grp: "TV", HSIA: null, TV: [30980, 33224], SHS: null },
  { grp: "Speed", HSIA: [13364, 8879], TV: null, SHS: null },
  { grp: "WiFi", HSIA: [10011, 8925], TV: null, SHS: null },
  { grp: "Support", HSIA: [855, 479], TV: [1821, 1981], SHS: [6108, 9715] },
  { grp: "SHS Hardware", HSIA: null, TV: null, SHS: [32594, 40406] }
];
// Looker Category 1 stacks (top 5 by Aug 2026 + other) and the biggest month-over-month
// percentage riser among Category 1 › 2 issues with at least 100 tickets in the prior month (2026).
const LOOKER_EXTRA = {"HSIA":{"cats":[{"name":"Connectivity","series":[32131,30626,35029,36273,37702,37343,40270,40370,38782,39606,39618,39896,38899,33705,36185,40138,41961,42848,42887,44386]},{"name":"Wireless","series":[9421,9206,10947,10721,10541,10834,11716,11873,11156,11854,12999,13142,14457,12715,12699,13335,13313,14476,13523,13216]},{"name":"Incompatible Equipment","series":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,909,1690,2037]},{"name":"Abandon","series":[936,1213,1273,1480,1146,723,593,479,487,476,489,462,601,522,630,663,790,815,949,855]},{"name":"NWH","series":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,89,93,75]},{"name":"Other categories","series":[1,2,2,1,0,0,0,0,32,43,24,39,32,30,36,13,19,28,3,3]}],"risers":{"Jan 2026":{"issue":"Connectivity › Incompatible Equipment","pct":64.0,"from":1400,"to":2296},"Mar 2026":{"issue":"Abandon › Abandon","pct":20.7,"from":522,"to":630},"Apr 2026":{"issue":"Connectivity › Losing Sync","pct":20.0,"from":5362,"to":6435},"May 2026":{"issue":"Abandon › Abandon","pct":19.2,"from":663,"to":790},"Jun 2026":{"issue":"Wireless › Slow Speeds","pct":12.7,"from":3394,"to":3825},"Jul 2026":{"issue":"Incompatible Equipment › Incompatible","pct":85.9,"from":909,"to":1690},"Aug 2026":{"issue":"Incompatible Equipment › Incompatible","pct":20.5,"from":1690,"to":2037}}},"TV":{"cats":[{"name":"STB No Boot","series":[8480,7806,8505,8568,8455,8005,8240,7379,6318,7336,7429,7366,7689,6716,6643,6938,6251,6342,6831,7203]},{"name":"Video Issues","series":[9774,9626,10568,10598,9887,9110,8974,8752,8272,9625,8959,7956,8548,7190,6984,7010,6831,6961,6823,6740]},{"name":"Recording Issues","series":[6674,6508,7897,7251,6668,5351,5449,5034,5014,5998,5978,5236,6260,5393,5360,5394,4255,4074,4673,4676]},{"name":"Digital Box","series":[4238,4327,4596,4613,4476,4723,4647,5286,6400,7885,7189,6630,5494,4293,3903,3950,3699,4335,3806,4373]},{"name":"Channel Issues","series":[2761,3003,2667,3543,4656,3169,3075,2970,2966,4354,3214,3757,3398,3136,3574,5031,4155,4701,3409,3504]},{"name":"Other categories","series":[6276,6580,7141,7145,7396,6073,6259,5784,5208,6248,8295,7488,7572,6369,6136,6286,5546,5760,5813,6305]}],"risers":{"Jan 2026":{"issue":"Audio Issues › Distorted Audio","pct":45.3,"from":161,"to":234},"Feb 2026":{"issue":"TV Features › Restart TV","pct":65.0,"from":117,"to":193},"Mar 2026":{"issue":"Abandon › Abandon","pct":45.2,"from":188,"to":273},"Apr 2026":{"issue":"Channel Issues › Channel Not Working","pct":58.2,"from":1735,"to":2744},"May 2026":{"issue":"STB No Boot › Stuck on PVR is Starting","pct":23.3,"from":318,"to":392},"Jun 2026":{"issue":"Channel Issues › Manage My Channels","pct":33.7,"from":460,"to":615},"Jul 2026":{"issue":"STB No Boot › Registration Code","pct":27.3,"from":297,"to":378},"Aug 2026":{"issue":"TV Features › Restart TV","pct":40.7,"from":113,"to":159}}},"SHS":{"cats":[{"name":"Main Panel","series":[6940,6526,8168,8443,8119,7973,9412,9359,8674,8338,8310,8700,7936,7092,6800,7132,6765,7727,7905,7273]},{"name":"Outdoor Camera","series":[4464,3952,5485,6147,6572,6461,6808,6109,5672,6116,5652,5056,5301,4213,4085,4838,4765,5294,5674,5034]},{"name":"Smoke Detector","series":[2576,2787,3356,3357,3282,3295,3986,4066,3967,4144,3630,3757,3672,3228,3064,3359,3047,3581,3956,4588]},{"name":"Door/Window Sensor","series":[4565,4521,4617,4364,4092,3757,4144,4123,4345,4586,4596,5765,5556,4468,4000,4224,4194,4183,4501,4324]},{"name":"Doorbell Camera","series":[4136,4141,4667,5012,4857,4626,5125,4683,4437,4315,3998,4133,4002,3241,3304,3610,3457,3883,4013,3643]},{"name":"Other categories","series":[13207,13906,17672,19181,19039,18111,21209,21781,21867,21339,18136,18021,17519,14735,13708,13559,12672,14325,14700,13840]}],"risers":{"Jan 2026":{"issue":"CO Detector › Education","pct":36.1,"from":155,"to":211},"Feb 2026":{"issue":"Motion Sensor › Education","pct":11.1,"from":198,"to":220},"Mar 2026":{"issue":"Webpage Portal Self-Serve › Education","pct":46.5,"from":310,"to":454},"Apr 2026":{"issue":"Main Panel › Customer unwilling to troubleshoot","pct":43.7,"from":103,"to":148},"May 2026":{"issue":"Smart thermostat › Troubleshoot","pct":45.0,"from":220,"to":319},"Jun 2026":{"issue":"Doorlock › Power issues","pct":49.0,"from":102,"to":152},"Jul 2026":{"issue":"Repair appointment › Repair appointment","pct":84.8,"from":461,"to":852},"Aug 2026":{"issue":"Smoke Detector › Power issues","pct":33.5,"from":826,"to":1103}}}};
Object.entries(LOOKER_EXTRA).forEach(([prod, x]) => Object.assign(LOOKER[prod], x));

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
    id: "legacy", name: "Optik TV Legacy", sub: "Mediaroom",
    tickets: [28724, 28040, 30652, 30984, 31535, 26335, 26637, 24474, 22010, 26283, 25560, 24547, 26833, 23176, 23159, 23715, 20858, 20917, 21489, 22123],
    repairs: [null, null, null, null, null, null, null, null, null, null, null, null, 1581, 1418, 1590, 1663, 1605, 1105, 1263, 1240],
    base: [null, null, null, null, null, null, null, null, null, null, null, null, 821723, 816290, 811279, 798308, 788806, 784491, 761917, 744256],
    swaps2026: [null, null, null, null, null, null, null, null, null, null, null, null, 2003, 1686, 1764, 1443, 1178, 977, 698, 596]
  },
  {
    id: "opus", name: "TV Evolution", sub: "OPUS",
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

// ---------------------------------------------------------------------------
// TV ticket, sentiment and cross analysis — Jun–Aug 2026.
// Source: TV agent/technician ticket notes (95,739 tickets; Category 1-3 + Agent
// Notes = agent grouping, Resolution 1-3 + Resolution Text = closure grouping,
// with ~4% carrying a structured technician determination) and the Optik TV
// customer survey verbatims (1,728 / 1,800 / 2,146 respondents; scoring columns
// ignored). Theme counts come from keyword classification of free text and are
// indicative, not exact. Values are [Jun, Jul, Aug]; movements compare Aug with Jul.
// ---------------------------------------------------------------------------
const TVA = {"months":["Jun 2026","Jul 2026","Aug 2026"],"tickets":{"total":[31968,31156,32614],"agentCat":[{"name":"Video Issues","v":[6930,6796,6715],"pct":-1.2},{"name":"STB No Boot","v":[6242,6711,7097],"pct":5.8},{"name":"Recording Issues","v":[4066,4663,4669],"pct":0.1},{"name":"Digital Box","v":[4323,3800,4357],"pct":14.7},{"name":"Channel Issues","v":[4693,3397,3493],"pct":2.8},{"name":"Remote","v":[1594,1744,1707],"pct":-2.1},{"name":"Apps","v":[952,955,1185],"pct":24.1},{"name":"Audio Issues","v":[701,689,765],"pct":11.0},{"name":"Recordings","v":[536,548,577],"pct":5.3},{"name":"TV Features","v":[524,441,515],"pct":16.8},{"name":"HS & TV Affected","v":[415,410,447],"pct":9.0},{"name":"Mobile App","v":[299,282,311],"pct":10.3},{"name":"VOD","v":[186,234,216],"pct":-7.7},{"name":"Guide Issues","v":[107,79,111],"pct":40.5},{"name":"PPV/VOD","v":[61,42,80],"pct":90.5}],"rising":[{"name":"STB No Boot \u203a Stuck on Initializing","v":[3409,3642,4084],"delta":442,"pct":12.1},{"name":"Digital Box \u203a Setup","v":[1830,1812,2115],"delta":303,"pct":16.7},{"name":"Digital Box \u203a No Boot","v":[2146,1679,1877],"delta":198,"pct":11.8},{"name":"Apps \u203a Youtube","v":[42,50,235],"delta":185,"pct":370.0},{"name":"Channel Issues \u203a Missing Channels","v":[1831,1380,1471],"delta":91,"pct":6.6},{"name":"Audio Issues \u203a No Audio","v":[341,344,398],"delta":54,"pct":15.7},{"name":"TV Features \u203a Restart TV","v":[166,113,159],"delta":46,"pct":40.7},{"name":"Channel Issues \u203a Channel Not Working","v":[2247,1617,1662],"delta":45,"pct":2.8}],"falling":[{"name":"Recording Issues \u203a Playback Issues","v":[252,298,228],"delta":-70,"pct":-23.5},{"name":"STB No Boot \u203a Reboot Loop","v":[928,956,906],"delta":-50,"pct":-5.2},{"name":"STB No Boot \u203a Red X","v":[299,296,248],"delta":-48,"pct":-16.2},{"name":"Video Issues \u203a Pixelization","v":[285,343,302],"delta":-41,"pct":-12.0},{"name":"Channel Issues \u203a Manage My Channels","v":[615,400,359],"delta":-41,"pct":-10.2},{"name":"Video Issues \u203a No Video","v":[4388,4267,4229],"delta":-38,"pct":-0.9},{"name":"Apps \u203a TELUS TV + App","v":[182,204,175],"delta":-29,"pct":-14.2},{"name":"STB No Boot \u203a Stuck on PVR is Starting","v":[453,484,460],"delta":-24,"pct":-5.0}],"techR1":[{"name":"Education","v":[9824,9766,10646]},{"name":"Connectivity","v":[4628,4434,4705]},{"name":"Customer","v":[4557,4132,3802]},{"name":"IPTV","v":[3705,3975,4216]},{"name":"(no technician closure)","v":[3819,3829,3999]},{"name":"Optik Evolution","v":[3116,2839,2802]},{"name":"Optik TV Self-Install","v":[589,547,619]},{"name":"HSIA","v":[380,344,342]},{"name":"Pik TV","v":[261,278,302]}],"techRising":[{"name":"Education \u203a IPTV","v":[7577,7555,8183],"delta":628,"pct":8.3},{"name":"Connectivity \u203a STB/PVR","v":[3168,2976,3140],"delta":164,"pct":5.5},{"name":"Education \u203a HSIA","v":[1214,1214,1352],"delta":138,"pct":11.4},{"name":"IPTV \u203a Set Top Box","v":[1771,1801,1927],"delta":126,"pct":7.0},{"name":"Education \u203a Pik TV","v":[782,747,850],"delta":103,"pct":13.8}],"techFalling":[{"name":"Customer \u203a Customer Training/Education/Inquiry Only","v":[4356,3927,3576],"delta":-351,"pct":-8.9},{"name":"Optik Evolution \u203a Provisioning","v":[580,443,371],"delta":-72,"pct":-16.3},{"name":"IPTV \u203a Audio/Video Cables","v":[111,156,136],"delta":-20,"pct":-12.8},{"name":"Optik Evolution \u203a Remote Control","v":[219,237,219],"delta":-18,"pct":-7.6},{"name":"Optik Evolution \u203a Digital Box","v":[1111,984,974],"delta":-10,"pct":-1.0}],"divergence":{"all":[{"alignment":34.3,"nofault":52.7,"reattribution":65.7,"closed":27876},{"alignment":34.7,"nofault":52.4,"reattribution":65.3,"closed":27038},{"alignment":34.9,"nofault":52.5,"reattribution":65.1,"closed":28320}],"field":[{"alignment":79.6,"nofault":7.9,"nontelus":9.5,"reattribution":20.4,"visits":1316},{"alignment":76.9,"nofault":11.2,"nontelus":14.6,"reattribution":23.1,"visits":1426},{"alignment":73.0,"nofault":12.5,"nontelus":14.4,"reattribution":27.0,"visits":1409}],"perCat":[{"cat":"STB No Boot","n":7097,"alignment":46.7,"nofault":49.9,"techTop":["Education / no fault","STB hardware"]},{"cat":"Video Issues","n":6715,"alignment":43.5,"nofault":53.5,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Recording Issues","n":4669,"alignment":25.4,"nofault":52.0,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Digital Box","n":4357,"alignment":44.8,"nofault":52.1,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Channel Issues","n":3493,"alignment":13.1,"nofault":54.7,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Remote","n":1707,"alignment":28.4,"nofault":55.5,"techTop":["Education / no fault","Remote control"]},{"cat":"Apps","n":1185,"alignment":21.5,"nofault":62.2,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Audio Issues","n":765,"alignment":13.9,"nofault":51.4,"techTop":["Education / no fault","Network / connectivity"]},{"cat":"Recordings","n":577,"alignment":29.1,"nofault":49.8,"techTop":["Education / no fault","Recording / PVR"]},{"cat":"TV Features","n":515,"alignment":17.9,"nofault":47.2,"techTop":["Education / no fault","Network / connectivity"]}],"perCatField":[{"cat":"STB No Boot","n":681,"alignment":80.2,"nofault":11.3,"nontelus":12.0,"techTop":"STB hardware"},{"cat":"Video Issues","n":329,"alignment":77.5,"nofault":14.6,"nontelus":15.2,"techTop":"STB hardware"},{"cat":"Recording Issues","n":124,"alignment":59.7,"nofault":8.9,"nontelus":10.5,"techTop":"STB hardware"},{"cat":"HS & TV Affected","n":106,"alignment":62.3,"nofault":7.5,"nontelus":13.2,"techTop":"Network / connectivity"},{"cat":"Digital Box","n":83,"alignment":77.1,"nofault":15.7,"nontelus":30.1,"techTop":"STB hardware"}]},"closure":[{"tickets":31968,"field_visit_pct":4.1,"agent_education_closure_pct":44.8},{"tickets":31156,"field_visit_pct":4.6,"agent_education_closure_pct":44.4},{"tickets":32614,"field_visit_pct":4.3,"agent_education_closure_pct":44.1}],"determination":[[1194,125],[1219,209],[1211,205]],"fixes":[{"name":"Replaced STB / PVR / OPUS box","v":[234,264,223],"pct":-15.5},{"name":"Wi-Fi / WAP / wireless STB placement","v":[175,189,175],"pct":-7.4},{"name":"Education / no fault found / working on arrival","v":[61,98,107],"pct":9.2},{"name":"Recording / PVR settings","v":[57,79,72],"pct":-8.9},{"name":"ONT / light level / fibre","v":[53,77,74],"pct":-3.9},{"name":"Remote control","v":[49,83,66],"pct":-20.5},{"name":"Firmware / software / reboot fix","v":[47,63,60],"pct":-4.8},{"name":"Power supply / power cable","v":[60,47,33],"pct":-29.8},{"name":"Modem / gateway replaced or reset","v":[41,44,41],"pct":-6.8},{"name":"Re-terminated / replaced cabling","v":[26,22,15],"pct":-31.8}],"commentCoverage":[20183,18888,19221],"themes":[{"name":"Recording / PVR","v":[3790,4280,4345],"pct":1.5},{"name":"Swap / replacement shipped","v":[3811,3415,3466],"pct":1.5},{"name":"Modem / gateway","v":[3351,3101,3490],"pct":12.5},{"name":"Ethernet / HDMI / cabling","v":[3180,3080,3315],"pct":7.6},{"name":"Wi-Fi / wireless STB signal","v":[3112,3067,3146],"pct":2.6},{"name":"Channel missing / not authorized","v":[3546,2809,2950],"pct":5.0},{"name":"Repeat / recurring issue","v":[2622,2415,2466],"pct":2.1},{"name":"Remote control","v":[2249,2290,2274],"pct":-0.7},{"name":"Fibre / ONT / light level","v":[2189,2056,2225],"pct":8.2},{"name":"Stuck initializing / reboot loop","v":[1635,1593,1773],"pct":11.3},{"name":"No signal / black screen","v":[1793,1477,1470],"pct":-0.5},{"name":"Outage / active network event","v":[1540,1236,1364],"pct":10.4},{"name":"Dispatch / technician booked","v":[1193,1126,1313],"pct":16.6},{"name":"Power / power supply","v":[1177,1052,1095],"pct":4.1},{"name":"Freezing / pixelation / glitching","v":[1017,966,969],"pct":0.3},{"name":"Firmware / software update","v":[944,801,760],"pct":-5.1},{"name":"Streaming apps (Netflix, Prime, YouTube, TV+ app)","v":[867,743,892],"pct":20.1},{"name":"Audio / sound","v":[741,768,808],"pct":5.2},{"name":"Customer wants tech / refuses troubleshooting","v":[353,291,336],"pct":15.5}],"devices":[{"name":"4K STB","v":[21558,20749,21265],"pct":2.5},{"name":"OPUS / TV+ box (TV Evolution)","v":[9241,8304,8482],"pct":2.1},{"name":"VIP5662W (Mediaroom PVR)","v":[6215,6665,7321],"pct":9.8},{"name":"VIP5602W (Mediaroom wSTB)","v":[4986,5318,5578],"pct":4.9},{"name":"T3200M gateway","v":[4099,4116,4363],"pct":6.0},{"name":"Pik TV","v":[1111,1065,1187],"pct":11.5},{"name":"NH20T gateway","v":[776,736,427],"pct":-42.0}],"platform":[{"name":"Mediaroom (legacy)","v":[9270,9667,10483],"pct":8.4},{"name":"OPUS / TV Evolution","v":[8658,7844,7944],"pct":1.3}]},"survey":{"respondents":[1728,1800,2146],"polarity":{"positive":[40.8,38.3,37.2],"neutral":[35.8,38.3,37.9],"negative":[23.3,23.4,24.9]},"polarityN":{"positive":[695,679,782],"neutral":[610,678,797],"negative":[397,415,524]},"themes":[{"name":"Positive: satisfied / no issues","v":[791,786,898],"pct":[45.8,43.7,41.8],"neg":[68,68,80]},{"name":"Customer service & support access","v":[636,657,781],"pct":[36.8,36.5,36.4],"neg":[208,213,271]},{"name":"Price, value & contract increases","v":[561,574,678],"pct":[32.5,31.9,31.6],"neg":[198,189,250]},{"name":"Reliability: freezing, outages & drop-outs","v":[402,426,485],"pct":[23.3,23.7,22.6],"neg":[122,140,150]},{"name":"Billing & account","v":[287,308,371],"pct":[16.6,17.1,17.3],"neg":[121,126,156]},{"name":"Channels, packages & content","v":[273,287,354],"pct":[15.8,15.9,16.5],"neg":[87,89,128]},{"name":"Internet & Wi-Fi","v":[265,268,359],"pct":[15.3,14.9,16.7],"neg":[103,99,150]},{"name":"Set-top box / equipment","v":[231,257,294],"pct":[13.4,14.3,13.7],"neg":[92,93,122]},{"name":"Installation & technicians","v":[130,118,139],"pct":[7.5,6.6,6.5],"neg":[48,41,54]},{"name":"Picture & sound quality","v":[106,100,139],"pct":[6.1,5.6,6.5],"neg":[29,37,41]},{"name":"Recording / PVR","v":[91,104,138],"pct":[5.3,5.8,6.4],"neg":[29,32,47]},{"name":"Apps & streaming","v":[79,104,108],"pct":[4.6,5.8,5.0],"neg":[25,41,48]},{"name":"Remote, guide & navigation","v":[91,89,104],"pct":[5.3,4.9,4.8],"neg":[35,29,42]}],"tvIssues":[{"name":"Customer service experience","v":[70,91,75],"pct":[4.05,5.06,3.49]},{"name":"Interruptions / freezing / restarts","v":[66,73,83],"pct":[3.82,4.06,3.87]},{"name":"Picture quality","v":[44,48,58],"pct":[2.55,2.67,2.7]},{"name":"Recording / PVR","v":[19,19,38],"pct":[1.1,1.06,1.77]},{"name":"Outages / service loss","v":[23,18,27],"pct":[1.33,1.0,1.26]},{"name":"TV features","v":[17,22,20],"pct":[0.98,1.22,0.93]},{"name":"Sound quality","v":[13,21,14],"pct":[0.75,1.17,0.65]},{"name":"Remote control","v":[9,16,21],"pct":[0.52,0.89,0.98]},{"name":"Channel guide / navigation","v":[15,11,18],"pct":[0.87,0.61,0.84]},{"name":"Apps / streaming","v":[12,10,16],"pct":[0.69,0.56,0.75]},{"name":"On-demand / VOD","v":[4,7,5],"pct":[0.23,0.39,0.23]}],"support":{"positive":[34,32,42],"neutral":[408,394,505],"negative":[148,150,186]},"quotes":{"Picture quality":["Seems to stutter and freeze sometimes","Weak signal   and sound  quality","My picture os constantly pixelating. It is a poor watch","Always freezes or is buffering ?"],"Customer service experience":["Not speaking English not communicating with each other so every service call back to square 1","Plusieurs appels avant d'\u00eatre en mesure de r\u00e9gler le probl\u00e8me.  Les agents se lance la balle l'un l'autre en accusant leur coll\u00e8gue de ne pas avoir compris et su r\u00e9gler le probl\u00e8me","My issues tend to go unresolved. I sometimes cases i get some resolution and so get great phone reps who really try. I think you are way overpriced for the glitchy services","Absolutely no one knows anything to help you."],"Interruptions / freezing / restarts":["Home page doesn\u2019t initially load properly or freezes and is unresponsive to the remote","Half the time I can't access cable channels or streaming services","As stated within the questions provided.","Neither of my tvs are working."],"Recording / PVR":["This whole thing was like stepping on a landmine. Picture freezes.","Broken voice and picture frozen in the beginning of recording","Losing last half of recorded programs. Failing to play recorded programs. and some pixelizing on some stations at times.","The PVR listing disappears occasionally"],"Remote control":["Unable to sync Telus remote with tv remote","Not responding when pressing buttons","For some reason I only have one remote for two boxes.","Always having to unplug modem and router screen freezes or says check internet"]}}};

// HSIA agent/technician ticket-notes analysis, Jun – Aug 2026 (generated by
// analysis/hsia/analyze_hsia_notes.py; aggregates only, no customer data)
const HSA = {"months":["Jun 2026","Jul 2026","Aug 2026"],"tickets":{"total":[57270,57173,58787],"c1":[{"name":"Connectivity","v":[41091,41039,42732],"pct":4.1},{"name":"Wireless","v":[14380,13445,13135],"pct":-2.3},{"name":"Incompatible Equipment","v":[876,1656,1994],"pct":20.4},{"name":"Abandon","v":[806,937,848],"pct":-9.5},{"name":"NWH","v":[89,93,75],"pct":-19.4}],"agentCat":[{"name":"Connectivity › No Dataflow","v":[11566,11676,13151],"pct":12.6},{"name":"Connectivity › ONT Not Ranged","v":[7269,7205,7117],"pct":-1.2},{"name":"Connectivity › Slow Speeds","v":[6802,6433,6348],"pct":-1.3},{"name":"Connectivity › Losing Sync","v":[5927,6269,6391],"pct":1.9},{"name":"Wireless › Can't Connect","v":[6136,5788,5728],"pct":-1.0},{"name":"Wireless › Disconnects","v":[4441,4270,4149],"pct":-2.8},{"name":"Wireless › Slow Speeds","v":[3802,3387,3258],"pct":-3.8},{"name":"Connectivity › No Sync","v":[2924,3262,3717],"pct":13.9},{"name":"Connectivity › Historical Data","v":[2918,2917,2593],"pct":-11.1},{"name":"Connectivity › No IP","v":[1866,1939,1920],"pct":-1.0},{"name":"Connectivity › Incompatible Equipment","v":[1817,1337,1494],"pct":11.7},{"name":"Incompatible Equipment › Incompatible","v":[876,1656,1994],"pct":20.4},{"name":"Abandon › Abandon","v":[806,937,848],"pct":-9.5}],"rising":[{"name":"Connectivity › No Dataflow › All Devices Affected","v":[10356,10420,11925],"delta":1505,"pct":14.4},{"name":"Connectivity › No Sync › Outage","v":[314,303,640],"delta":337,"pct":111.2},{"name":"Incompatible Equipment › Incompatible › Not Applicable","v":[872,1651,1983],"delta":332,"pct":20.1},{"name":"Connectivity › ONT Not Ranged › Outage","v":[1017,825,1016],"delta":191,"pct":23.2},{"name":"Wireless › Can't Connect › All Devices Affected","v":[3560,3332,3521],"delta":189,"pct":5.7},{"name":"Connectivity › No Sync › No DSL Light","v":[2196,2461,2595],"delta":134,"pct":5.4},{"name":"Connectivity › Incompatible Equipment › Not Required","v":[1354,850,951],"delta":101,"pct":11.9},{"name":"Connectivity › Losing Sync › Outage","v":[240,203,286],"delta":83,"pct":40.9}],"falling":[{"name":"Connectivity › Historical Data › Severe Line Issues","v":[2917,2914,2593],"delta":-321,"pct":-11.0},{"name":"Connectivity › ONT Not Ranged › Alarm Light","v":[4168,4238,3988],"delta":-250,"pct":-5.9},{"name":"Wireless › Can't Connect › Single Device Affected","v":[1577,1516,1338],"delta":-178,"pct":-11.7},{"name":"Wireless › Slow Speeds › All Devices Affected","v":[2553,2248,2135],"delta":-113,"pct":-5.0},{"name":"Wireless › Disconnects › Some Devices Affected","v":[871,973,870],"delta":-103,"pct":-10.6},{"name":"Connectivity › No IP › No Internet Light","v":[1735,1792,1691],"delta":-101,"pct":-5.6},{"name":"Connectivity › Slow Speeds › All Devices Affected","v":[5341,5133,5038],"delta":-95,"pct":-1.9},{"name":"Abandon › Abandon › Abandon","v":[805,936,845],"delta":-91,"pct":-9.7}],"techR1":[{"name":"Education","v":[12052,11813,12410],"pct":5.1},{"name":"Connectivity","v":[9892,10346,10663],"pct":3.1},{"name":"HSIA","v":[7393,7723,7490],"pct":-3.0},{"name":"GPON","v":[7371,7555,7544],"pct":-0.1},{"name":"(no closure code)","v":[7366,7099,7843],"pct":10.5},{"name":"Customer","v":[6256,5336,4986],"pct":-6.6},{"name":"Cancel Ticket","v":[1381,1378,1370],"pct":-0.6},{"name":"Outside Plant","v":[1409,1299,1243],"pct":-4.3},{"name":"Found OK","v":[845,1119,1451],"pct":29.7},{"name":"IPTV","v":[708,789,753],"pct":-4.6},{"name":"Network Service Wire","v":[652,756,689],"pct":-8.9},{"name":"NetCracker","v":[505,552,702],"pct":27.2}],"techRising":[{"name":"Education › HSIA","v":[11339,11054,11583],"delta":529,"pct":4.8},{"name":"Found OK › Not Required","v":[472,690,965],"delta":275,"pct":39.9},{"name":"Connectivity › Wifi Network Extender","v":[926,918,1096],"delta":178,"pct":19.4},{"name":"NetCracker › Stuck","v":[453,511,645],"delta":134,"pct":26.2},{"name":"Connectivity › Cable","v":[253,247,381],"delta":134,"pct":54.3},{"name":"GPON › Inside Premise Equipment","v":[4809,5006,5130],"delta":124,"pct":2.5}],"techFalling":[{"name":"Customer › Customer Training/Education/Inquiry Only","v":[5630,4681,4311],"delta":-370,"pct":-7.9},{"name":"GPON › Outside Plant","v":[2181,2178,2010],"delta":-168,"pct":-7.7},{"name":"HSIA › Modem/Gateway","v":[4389,4565,4410],"delta":-155,"pct":-3.4},{"name":"Network Service Wire › Drop/Serv Wire (Incl Bonding)","v":[553,621,564],"delta":-57,"pct":-9.2},{"name":"Outside Plant › Not Jumpered","v":[289,300,255],"delta":-45,"pct":-15.0},{"name":"HSIA › Provisioning","v":[927,997,956],"delta":-41,"pct":-4.1}],"divergence":{"all":[{"alignment":53.3,"nofault":41.3,"nontelus":2.8,"reattribution":46.7,"closed":49087},{"alignment":55.3,"nofault":39.2,"nontelus":4.0,"reattribution":44.7,"closed":49133},{"alignment":54.5,"nofault":39.6,"nontelus":4.0,"reattribution":45.5,"closed":50118}],"field":[{"alignment":86.3,"nofault":5.5,"nontelus":9.5,"reattribution":13.7,"visits":14206},{"alignment":86.1,"nofault":6.1,"nontelus":13.2,"reattribution":13.9,"visits":14937},{"alignment":84.9,"nofault":6.4,"nontelus":13.8,"reattribution":15.1,"visits":14452}],"perCat":[{"cat":"Connectivity › No Dataflow","n":13151,"alignment":52.8,"nofault":40.8,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Connectivity › ONT Not Ranged","n":7117,"alignment":69.2,"nofault":28.1,"techTop":["Access line / fibre / ONT","Education / no fault"]},{"cat":"Connectivity › Losing Sync","n":6391,"alignment":60.1,"nofault":33.8,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Connectivity › Slow Speeds","n":6348,"alignment":54.0,"nofault":44.2,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Wireless › Can't Connect","n":5728,"alignment":34.8,"nofault":56.4,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Wireless › Disconnects","n":4149,"alignment":36.4,"nofault":50.6,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Connectivity › No Sync","n":3717,"alignment":66.5,"nofault":30.1,"techTop":["Education / no fault","Access line / fibre / ONT"]},{"cat":"Wireless › Slow Speeds","n":3258,"alignment":33.0,"nofault":55.6,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Connectivity › Historical Data","n":2593,"alignment":79.2,"nofault":16.4,"techTop":["Access line / fibre / ONT","Education / no fault"]},{"cat":"Incompatible Equipment › Incompatible","n":1994,"alignment":72.5,"nofault":23.8,"techTop":["Access line / fibre / ONT","Modem / gateway"]},{"cat":"Connectivity › No IP","n":1920,"alignment":52.9,"nofault":41.8,"techTop":["Education / no fault","Modem / gateway"]},{"cat":"Connectivity › Incompatible Equipment","n":1494,"alignment":53.3,"nofault":42.4,"techTop":["Education / no fault","Modem / gateway"]}],"perCatField":[{"cat":"Connectivity › ONT Not Ranged","n":3454,"alignment":92.5,"nofault":4.4,"nontelus":20.6,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › Losing Sync","n":1975,"alignment":82.3,"nofault":7.4,"nontelus":9.0,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › No Dataflow","n":1819,"alignment":85.4,"nofault":7.6,"nontelus":12.0,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › Historical Data","n":1662,"alignment":92.6,"nofault":2.7,"nontelus":16.3,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › No Sync","n":1304,"alignment":89.9,"nofault":5.5,"nontelus":10.1,"techTop":"Access line / fibre / ONT"},{"cat":"Incompatible Equipment › Incompatible","n":1185,"alignment":90.5,"nofault":5.6,"nontelus":6.3,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › Slow Speeds","n":1059,"alignment":84.3,"nofault":11.2,"nontelus":13.6,"techTop":"Access line / fibre / ONT"},{"cat":"Wireless › Disconnects","n":566,"alignment":46.3,"nofault":8.5,"nontelus":12.9,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › Incompatible Equipment","n":437,"alignment":86.3,"nofault":8.0,"nontelus":10.5,"techTop":"Access line / fibre / ONT"},{"cat":"Connectivity › No IP","n":380,"alignment":84.2,"nofault":8.2,"nontelus":15.3,"techTop":"Access line / fibre / ONT"},{"cat":"Wireless › Can't Connect","n":356,"alignment":45.5,"nofault":12.1,"nontelus":18.3,"techTop":"Access line / fibre / ONT"},{"cat":"Wireless › Slow Speeds","n":284,"alignment":44.4,"nofault":10.2,"nontelus":10.2,"techTop":"Access line / fibre / ONT"}]},"closure":[{"tickets":57270,"field_visit_pct":24.9,"agent_education_closure_pct":31.3,"no_closure_code_pct":12.9},{"tickets":57173,"field_visit_pct":26.3,"agent_education_closure_pct":29.3,"no_closure_code_pct":12.4},{"tickets":58787,"field_visit_pct":24.7,"agent_education_closure_pct":28.8,"no_closure_code_pct":13.3}],"determination":[[12901,1357],[13021,1974],[12490,2000]],"fixes":[{"name":"ONT replaced / light level / fibre splice","v":[4639,4941,4631],"pct":-6.3},{"name":"Wi-Fi / Boost extender placement or replaced","v":[3649,3846,3887],"pct":1.1},{"name":"Drop / service wire / outside plant","v":[1866,1882,1733],"pct":-7.9},{"name":"Inside wiring / jack / ethernet","v":[1194,1318,1352],"pct":2.6},{"name":"Modem / gateway replaced","v":[1112,1337,1160],"pct":-13.2},{"name":"Provisioning / profile / port fix","v":[1079,1119,1114],"pct":-0.4},{"name":"Education / no fault found / working on arrival","v":[744,836,799],"pct":-4.4},{"name":"Power cycle / factory reset / firmware","v":[661,684,675],"pct":-1.3},{"name":"Power supply / power","v":[164,201,157],"pct":-21.9},{"name":"Customer-owned equipment / third-party router","v":[69,66,74],"pct":12.1}],"commentCoverage":[46090,45159,45489],"themes":[{"name":"ONT / fibre / light level","v":[15920,15729,15321],"pct":-2.6},{"name":"Slow speed / buffering","v":[12851,12547,11736],"pct":-6.5},{"name":"No internet / all devices down","v":[10834,10606,11426],"pct":7.7},{"name":"Dispatch / technician booked","v":[10161,9812,9936],"pct":1.3},{"name":"Boost / Wi-Fi extender","v":[9031,8990,9214],"pct":2.5},{"name":"Intermittent drops / disconnects","v":[9444,9323,8267],"pct":-11.3},{"name":"Firmware / settings / factory reset","v":[8162,7990,7861],"pct":-1.6},{"name":"Work from home / streaming / gaming impact","v":[7120,6691,7098],"pct":6.1},{"name":"Outage / active network event","v":[6892,6537,7478],"pct":14.4},{"name":"DSL / copper line","v":[6599,6471,6582],"pct":1.7},{"name":"Red / alarm light / LOS on ONT or modem","v":[6072,6123,5862],"pct":-4.3},{"name":"Repeat / recurring issue","v":[5874,5539,5399],"pct":-2.5},{"name":"Wi-Fi: cannot connect / single device","v":[3042,2821,3058],"pct":8.4},{"name":"No power / dead equipment","v":[2915,3046,2837],"pct":-6.9},{"name":"Modem / gateway swap shipped","v":[1260,1088,1141],"pct":4.9},{"name":"Customer wants tech / refuses troubleshooting","v":[1053,893,846],"pct":-5.3},{"name":"Third-party / customer-owned router","v":[381,399,399],"pct":0.0}],"devices":[{"name":"ONT (Nokia / Huawei / Calix)","v":[37772,37386,37555],"pct":0.5},{"name":"NH20 / NAH (Network Access Hub)","v":[15236,15541,15519],"pct":-0.1},{"name":"T3200M gateway","v":[10210,10477,10778],"pct":2.9},{"name":"Actiontec / legacy modem","v":[5032,5084,5395],"pct":6.1},{"name":"Boost Wi-Fi 6","v":[2914,3019,3313],"pct":9.7},{"name":"Wi-Fi Hub / WFH","v":[2247,2203,1852],"pct":-15.9},{"name":"Boost Wi-Fi 7 (BV3)","v":[971,1113,1551],"pct":39.4},{"name":"Boost Lite (BLite)","v":[591,551,610],"pct":10.7}],"access":[{"name":"Fibre (PureFibre / ONT)","v":[42267,41813,42320],"pct":1.2},{"name":"Copper (DSL / bonded)","v":[26409,27079,27785],"pct":2.6}],"domainMix":[{"agent":"Gateway / dataflow","n":13390,"v":[2191,3771,720,933,67,98,5476,127]},{"agent":"Access line & ONT","n":17003,"v":[6955,3160,290,1141,157,217,4884,196]},{"agent":"Speed","n":5406,"v":[675,1696,299,247,2,43,2388,56]},{"agent":"Wi-Fi","n":11228,"v":[839,3092,725,165,4,96,6106,197]},{"agent":"Equipment compatibility","n":3091,"v":[951,861,97,75,0,40,984,82]}],"closureDomains":["Access line / fibre / ONT","Modem / gateway","Wi-Fi / extenders","Provisioning / back office","Outage","Customer / non-TELUS equipment","Education / no fault","Other product"]}};

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

// Percentage-point movements on rate KPIs are reported in basis points (1 pt = 100 bps)
// `pctDecimals` is the precision the rate itself is shown at: a rate shown to
// 3 decimals (e.g. 0.167%) keeps one decimal of bps so small moves stay visible.
function deltaBps(curr, prev, goodWhenDown = true, pctDecimals = 2) {
  if (curr == null || prev == null) return null;
  return delta(curr * 100, prev * 100, " bps", Math.max(0, pctDecimals - 2), goodWhenDown);
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

// Bars (volume, left axis) with a line (rate, right axis) on one chart.
// bar/line: { label, data, color, fmt }
function ComboChart({ labels, bar, line, height = 240, T, tooltipExtra }) {
  const wrapRef = useRef(null);
  const [hoverI, setHoverI] = useState(null);
  const left = 56, right = 64, top = 16, bottom = 22;
  const plotW = VIEW_W - left - right, plotH = height - top - bottom;
  const bVals = bar.data.filter((v) => v != null), lVals = line.data.filter((v) => v != null);
  const bMax = bVals.length ? niceCeil(Math.max(...bVals) * 1.15) : 1;
  const lMax = lVals.length ? niceCeil(Math.max(...lVals) * 1.15) : 1;
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
  const linePts = line.data.map((v, i) => (v == null ? null : { x: xCenter(i), y: yLine(v), v })).filter(Boolean);
  const lastBarI = bar.data.reduce((a, v, i) => (v == null ? a : i), -1);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", aspectRatio: `${VIEW_W} / ${height}` }} onMouseMove={handleMove} onMouseLeave={() => setHoverI(null)}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${height}`}>
        {Array.from({ length: 5 }).map((_, t) => {
          const y = top + plotH - (plotH * t) / 4;
          return (
            <g key={t}>
              <line x1={left} x2={VIEW_W - right} y1={y} y2={y} stroke={T.border} strokeWidth="1" />
              <text x={left - 8} y={y} fontSize="10.5" fill={T.textMuted} textAnchor="end" dominantBaseline="middle">{bar.fmt((bMax * t) / 4)}</text>
              <text x={VIEW_W - right + 8} y={y} fontSize="10.5" fill={T.textMuted} textAnchor="start" dominantBaseline="middle">{line.fmt((lMax * t) / 4)}</text>
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
        {lastBarI >= 0 && (() => {
          // keep the bar label clear of the line's end label when the two meet
          const by = yBar(bar.data[lastBarI]) - 6;
          const ly = line.data[lastBarI] != null ? yLine(line.data[lastBarI]) : null;
          const clash = ly != null && Math.abs(ly - by) < 14;
          return clash
            ? <text x={xCenter(lastBarI) - bw / 2 - 6} y={by} fontSize="11" fontWeight="600" fill={bar.color} textAnchor="end">{bar.fmt(bar.data[lastBarI])}</text>
            : <text x={xCenter(lastBarI)} y={by} fontSize="11" fontWeight="600" fill={bar.color} textAnchor="middle">{bar.fmt(bar.data[lastBarI])}</text>;
        })()}
        {linePts.length > 0 && (
          <g>
            <path d={"M " + linePts.map((p) => `${p.x},${p.y}`).join(" L ")} fill="none" stroke={line.color} strokeWidth="2.5" />
            {linePts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={hoverI != null && xCenter(hoverI) === p.x ? 4 : 2.5} fill={line.color} stroke={T.surface} strokeWidth="1.5" />)}
            <text x={linePts[linePts.length - 1].x + 8} y={linePts[linePts.length - 1].y} fontSize="11.5" fontWeight="600" fill={line.color} dominantBaseline="middle"
              textAnchor={linePts[linePts.length - 1].x > VIEW_W - right - 40 ? "start" : "start"}>{line.fmt(linePts[linePts.length - 1].v)}</text>
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
function StackedBarChart({ labels, stacks, height = 240, yFmt, T }) {
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
  const lastI = hasData.reduce((a, h, i) => (h ? i : a), -1);
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
        {lastI >= 0 && <text x={xCenter(lastI)} y={yOf(totals[lastI]) - 6} fontSize="11" fontWeight="600" fill={T.heading} textAnchor="middle">{yFmt(totals[lastI])}</text>}
      </svg>
      {hoverI != null && hasData[hoverI] && (
        <div style={{
          position: "absolute", top: 6, left: `${tooltipLeft}%`, transform: tooltipAlignRight ? "translateX(-100%)" : "none",
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: T.text,
          boxShadow: "0 4px 16px rgba(0,0,0,.14)", pointerEvents: "none", whiteSpace: "nowrap", zIndex: 2
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{labels[hoverI]} · {yFmt(totals[hoverI])} tickets</div>
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
      {note && <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>{note}</p>}
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
  else if (s.includes("stall")) { bg = T.chipStalled; fg = T.chipStalledText; }
  else if (s.includes("flight")) { bg = T.chipFlight; fg = T.chipFlightText; }
  return <span style={{ background: bg, color: fg, borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{status}</span>;
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

// TV sub-pages (nested under TV in the nav, collapsed by default)
// Sub-menu pages nested under a product in the left nav (collapsed by default)
const CHILD_PAGES = { home: ["execsummary"], HSIA: ["hsiatickets", "hsiacross"], TV: ["tvplatforms", "tvtickets", "tvsentiment", "tvcross"] };
const CHILD_LABEL = {
  execsummary: "Executive Summary",
  hsiatickets: "Notes Analysis", hsiacross: "Cross Analysis",
  tvplatforms: "By Platform", tvtickets: "Notes Analysis", tvsentiment: "Customer Sentiment Analysis", tvcross: "Cross Analysis"
};
const CHILD_PARENT = Object.fromEntries(Object.entries(CHILD_PAGES).flatMap(([parent, ids]) => ids.map((id) => [id, parent])));
const PARENT_LABEL = { home: "Overview" };

// Initiatives covering a recurring-issue group, product-scoped
function initiativesCovering(product, grp) {
  return INITIATIVES.filter((it) => it.p === product && it.issues.includes(grp));
}

// Initiative themes each Looker issue maps to, by product. The Ticket issues &
// movers section uses this to show which initiative theme(s) address an issue
// and to count initiative coverage by theme (HSIA and TV initiatives carry a
// theme in the workbook; SHS initiatives are not yet in the source).
function issueThemes(product, issue) {
  const [c1, c2 = ""] = issue.split(" › ").map((s) => s.trim());
  if (product === "HSIA") {
    if (c1 === "Wireless" || c1 === "Wi-Fi connection" || c1 === "NWH") return c2 === "Slow Speeds" ? ["Wi-Fi", "Speed & equipment"] : ["Wi-Fi"];
    if (c1.startsWith("Incompatible Equipment") || c2 === "Incompatible Equipment") return ["Speed & equipment"];
    if (c2 === "Slow Speeds") return ["Speed & equipment"];
    if (c2 === "No Sync") return ["Copper strategy", "Outage"];
    if (c2 === "Losing Sync" || c2 === "Historical Data") return ["GPON degraded fibre", "Copper strategy"];
    if (c2 === "No Dataflow" || c2 === "No IP") return ["GPON degraded fibre", "Outage"];
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
  return [];
}
function initiativesByTheme(product, themes) {
  return INITIATIVES.filter((it) => it.p === product && themes.includes(it.theme));
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
const DECK_SOURCE = "Source: Churn Measurement 2026 workbook (KPIs, Looker ticket categories, initiatives) · TCS PLT Charter scorecard (Sweepr) · movements on rates are in bps";

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
        { t: t.yoy ? `${t.yoy.text} vs prior yr.` : "—", sz: 9, b: true, color: t.yoy ? toneCol(t.yoy.tone) : C.faint, space: 4 }
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
    s2.push(pptxShape({ x: ix + 12, y: sy + sh - 4, w: iw - 24, h: 26, inset: 0, paras: [{ t: `${k.trendName} tickets · ${k.trendFrom} – ${k.trendTo} (Looker)`, sz: 7.5, color: C.faint }] }));
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
  const s1 = `<div class="cols">${deck.kpis.map((k) => `<div class="card"><div class="prod" style="color:${k.color}">${e(k.product)}</div><div class="tiles">${k.tiles.map((t) => `<div class="tile"><div class="lbl">${e(t.label)}</div><div class="val">${e(t.value)}</div><div class="sub">${e(t.month)}</div><div class="d" style="color:${t.yoy ? tone(t.yoy.tone) : C.faint}">${t.yoy ? e(t.yoy.text) + " vs prior yr." : "—"}</div></div>`).join("")}</div></div>`).join("")}</div>`;
  const spark = (k) => { const w = 300, h = 66, pts = sparkPoints(k.trend, w, h); return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline fill="none" stroke="${k.color}" stroke-width="2" stroke-linejoin="round" points="${pts.map((p) => p.join(",")).join(" ")}"/></svg>`; };
  const s2 = `<div class="cols">${deck.issues.map((k) => `<div class="card"><div class="lbl" style="color:${k.color}">${e(k.product)} · top ticket issue — ${e(k.asOf)}</div><div class="issue">${e(k.issue)}</div><div class="sub2">${k.volume.toLocaleString()} tickets · <b style="color:${tone(k.tone)}">${e(k.yoy)}</b></div><div class="spark">${spark(k)}<div class="cap">${e(k.trendName)} tickets · ${e(k.trendFrom)} – ${e(k.trendTo)} (Looker)</div></div>${[["Rising", k.rising, C.bad], ["Falling", k.falling, C.good]].map(([t, rows, col]) => `<div class="mv"><div class="lbl" style="color:${col}">${t} · ${e(k.compare)}</div>${rows.map((r) => `<div class="mvr"><span>${e(r.name)}</span><b style="color:${col}">${e(r.text)}</b></div>`).join("")}</div>`).join("")}</div>`).join("")}</div>`;
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
  const [page, setPage] = useState("home");
  const [fromIdx, setFromIdx] = useState(12); // default view: 2026 months
  const [toIdx, setToIdx] = useState(MONTHS.length - 1);
  const [scope, setScope] = useState("All");
  const [themeMode, setThemeMode] = useState("system");
  const [openTables, setOpenTables] = useState({});
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
    const D = bps ? (a, b) => deltaBps(a, b, goodWhenDown, decimals) : (a, b) => delta(a, b, "", decimals, goodWhenDown);
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
    { id: "hsiatickets", label: "Notes Analysis", icon: "notes", color: colors.HSIA, child: true, parent: "HSIA" },
    { id: "hsiacross", label: "Cross Analysis", icon: "cross", color: colors.HSIA, child: true, parent: "HSIA" },
    { id: "TV", label: "TV", icon: "tv", color: colors.TV },
    { id: "tvplatforms", label: "By Platform", icon: "tv", color: colors.TV, child: true, parent: "TV" },
    { id: "tvtickets", label: "Notes Analysis", icon: "notes", color: colors.TV, child: true, parent: "TV" },
    { id: "tvsentiment", label: "Customer Sentiment Analysis", icon: "sentiment", color: colors.TV, child: true, parent: "TV" },
    { id: "tvcross", label: "Cross Analysis", icon: "cross", color: colors.TV, child: true, parent: "TV" },
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
      { icon: "tickets", label: sc === "All" ? "Ticket volume (all products)" : "Ticket volume", data: DATA.ticketVolume[sc], fmt: fmtNum, dec: 0, color: colors[sc], goodDown: true },
      { icon: "tickets", label: "Ticket rate", data: DATA.ticketRate[sc], fmt: fmtPct, dec: 2, color: colors[sc], goodDown: true },
      { icon: "repairs", label: "Repair / dispatch rate", data: DATA.repairRate[sc], fmt: fmtPct, dec: 2, color: colors[sc], goodDown: true },
      { icon: "churn", label: "Churn rate", data: DATA.churnRate[sc], fmt: fmtPct, dec: 2, color: colors[sc], goodDown: true },
      { icon: "base", label: "Subscriber base", data: DATA.subBase[sc], fmt: fmtBig, dec: 0, color: colors[sc], goodDown: false }
    ];
  }

  function TileRow({ tiles, deltaMode, columns, extras }) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: columns ? `repeat(${columns}, 1fr)` : "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
        {tiles.map((tile, i) => {
          const f = rowFigures(tile.data, tile.dec, tile.goodDown, tile.fmt === fmtPct);
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
  // filterable: when set, the theme/status/timeline/prime header cells carry the
  // filter dropdowns (one header row serves as both column label and filter).
  function InitiativeRows({ items, filterable = false, allItems }) {
    const tdBase = { padding: "9px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12.5, verticalAlign: "top" };
    const thBase = { padding: "8px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap", verticalAlign: "bottom" };
    const pool = allItems || items;
    const uniq = (k) => Array.from(new Set(pool.map((it) => it[k] || "—"))).sort();
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
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdBase, color: T.textFaint }}>No initiatives match the selected filters.</td></tr>
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
              </tr>
            ))}
          </tbody>
        </table>
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
                <th style={{ ...thBase, textAlign: "left" }}>Initiative theme</th>
                <th style={{ ...thBase, textAlign: "left" }}>Initiative coverage</th>
              </tr>
            </thead>
            <tbody>
              {L.topIssues.map((r, i) => {
                const themes = issueThemes(product, r.issue);
                const cov = initiativesByTheme(product, themes);
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
                    <td style={{ ...tdBase, whiteSpace: "nowrap", fontSize: 12 }}>
                      {themes.length
                        ? themes.map((t) => <span key={t} style={{ display: "inline-block", background: T.panel, border: `1px solid ${T.border}`, color: T.textSecondary, borderRadius: 999, padding: "1px 9px", marginRight: 4, fontWeight: 600 }}>{t}</span>)
                        : <span style={{ color: T.textFaint }}>{r.grp === "SHS Hardware" ? "SHS hardware (no initiative themes yet)" : ISSUE_META[r.grp].label.split(",")[0]}</span>}
                    </td>
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
          Looker ticket categories from the Churn Measurement 2026 workbook{product !== "SHS" ? " · each issue is mapped to the theme(s) used by the product's initiatives; initiative coverage counts the initiatives carrying those themes" : " · SHS initiatives (and their themes) are not yet in the source"}. YoY compares Aug 2026 against Aug 2025.
        </p>
      </>
    );
  }

  // ------------------------------ TV platform breakout ------------------------------
  function TvPlatformBreakout() {
    // Sub-pages carry no date filter: always the full 2026 window and the latest month
    const LAST = MONTHS.length - 1;
    const rangeMonths = MONTHS.slice(12);
    const sliceR = (arr) => arr.slice(12);
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
            const tk = rowFigures(p.tickets, 0, true, false, LAST);
            const tr = rowFigures(p.ticketRate, 2, true, true, LAST);
            const rp = rowFigures(p.repairs, 0, true, false, LAST);
            const rr = rowFigures(p.repairRate, 3, true, true, LAST);
            const bs = rowFigures(p.base, 0, false, false, LAST);
            const sw = rowFigures(p.swaps2026 || [], 0, true, false, LAST);
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
                {statRow("Ticket rate (% of platform base)", fmtPct(tr.latest, 2), <DeltaText d={tr.mom} T={T} suffix="MoM" />)}
                {statRow(`Repairs · ${rp.latestMonth ? shortMonth(rp.latestMonth) : ""}`, fmtNum(rp.latest), <DeltaText d={rp.mom} T={T} suffix="MoM" />)}
                {statRow("Repair rate (% of platform base)", fmtPct(rr.latest, 3), <DeltaText d={rr.mom} T={T} suffix="MoM" />)}
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
  function sweeprFig(key, dec, goodDown = false, bps = false) {
    const s = SWEEPR[key];
    const li = lastIdxUpTo(s.a, toIdx);
    if (li < 0) return { latest: null };
    const D = bps ? (a, b) => deltaBps(a, b, goodDown, dec) : (a, b) => delta(a, b, "", dec, goodDown);
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
    const chn = sweeprFig("churn", 2, true, true);
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
            deltas={[<DeltaText key="t" d={web.vsTarget} T={T} suffix="vs target" />, <DeltaText key="y" d={web.yoy} T={T} suffix="vs prior yr." />]} />
          <StatCard T={T} color={col} icon="cx" label="CX 'Easy to follow'" value={easy.latest == null ? "—" : easy.latest.toFixed(2)}
            sub={easy.latest == null ? undefined : `${easy.latestMonth} · target ${easy.target == null ? "—" : easy.target.toFixed(2)}`}
            deltas={[<DeltaText key="t" d={easy.vsTarget} T={T} suffix="vs target" />]} />
          <StatCard T={T} color={col} icon="churn" label="Sweepr involved churn" value={fmtPct(chn.latest, 2)}
            sub={chn.latestMonth}
            deltas={[<DeltaText key="m" d={chn.mom} T={T} suffix="vs prior mo." />]} />
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
          {(() => {
            // On the All scope the two self-serve cards join the KPI grid right
            // after the subscriber base card; a fixed 4-column grid keeps both
            // rows equally sized and aligned (4 + 4).
            const res = sweeprFig("resolved", 0);
            const dea = sweeprFig("deacts", 0);
            const selfServeCards = scope === "All" ? [
              <StatCard key="ss-res" T={T} color={colors.SWEEPR} icon="selfserve" label="Self-serve resolved sessions" value={fmtNum(res.latest)}
                sub={`${res.latestMonth} · target ${fmtNum(res.target)} · Sweepr workflows`}
                deltas={[<DeltaText key="t" d={res.vsTarget} T={T} suffix="vs target" />]} />,
              <StatCard key="ss-dea" T={T} color={colors.SWEEPR} icon="saved" label="Self-serve deacts saved" value={fmtNum(dea.latest)}
                sub={`${dea.latestMonth} · Sweepr workflows`}
                deltas={[<DeltaText key="m" d={dea.mom} T={T} suffix="vs prior mo." />]} />
            ] : null;
            return <TileRow tiles={scopeTiles(scope)} deltaMode="yoy" columns={scope === "All" ? 4 : undefined} extras={selfServeCards} />;
          })()}
          <TopIssueFlags prods={scope === "All" ? PRODUCTS : [scope]} />
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setPage("execsummary")}
              style={{ background: "transparent", border: "none", padding: 0, color: T.heading, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: FONT, textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="slides" size={13} /> Executive Summary slides →
            </button>
          </div>
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
            Annual churn (go/national RGU): {yoyChurn.yoyPts <= 0 ? "▼" : "▲"} {Math.round(Math.abs(yoyChurn.yoyPts) * 100)} bps YoY — 2026 YTD {yoyChurn.y2026.toFixed(2)}% vs 2025 {yoyChurn.y2025.toFixed(2)}%
          </div>
        )}
        {CHILD_PAGES[product] && (
          <div style={{ fontSize: 12.5, margin: "10px 2px 0", display: "flex", gap: 18, flexWrap: "wrap" }}>
            {CHILD_PAGES[product].map((id) => (
              <button key={id} onClick={() => setPage(id)}
                style={{ background: "transparent", border: "none", padding: 0, color: T.heading, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: FONT, textDecoration: "underline" }}>
                {CHILD_LABEL[id]} →
              </button>
            ))}
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
            <ChartCard title="Tickets — volume (bars) and rate (line, % of sub base)" T={T}
              tableOpen={!!openTables[product + "-tr"]} onToggleTable={() => toggleTable(product + "-tr")}
              note={product === "SH+" ? "SH+ tickets are reported from Jul 2025 (SH+ reliability KPIs workbook). Volume on the left axis, rate on the right." : "Ticket volume on the left axis, ticket rate on the right axis (Reliability Deact KPIs tab)."}>
              <ComboChart labels={rangeMonths} T={T}
                bar={{ label: "Ticket volume", data: sliceR(DATA.ticketVolume[product]), color: colors[product], fmt: fmtNumK }}
                line={{ label: "Ticket rate", data: sliceR(DATA.ticketRate[product]), color: colors[product], fmt: (v) => fmtPct(v, 2) }}
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
                { key: product, label: "Ticket rate", data: sliceR(DATA.ticketRate[product]), fmt: (v) => fmtPct(v, 2) }
              ]} fmt={fmtNum} T={T} />}
            </ChartCard>
            {hasLooker && (
              <ChartCard title={`Looker ticket volume by category — top category ${L.topCat.name}`} T={T}
                tableOpen={!!openTables[product + "-tv"]} onToggleTable={() => toggleTable(product + "-tv")}
                note={`Looker ticket categories, Churn Measurement 2026 workbook. Bars stack the five largest Category 1 groups (by Aug 2026 volume) with the remainder as other categories; the top category (${L.topCat.name}) sits at the base of each bar.`}>
                {(() => {
                  const shades = [1, 0.72, 0.52, 0.38, 0.26];
                  const stacks = L.cats.map((c, ci) => c.name === "Other categories"
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
            <ChartCard title="Repairs / dispatches — volume (bars) and rate (line, % of sub base)" T={T}
              tableOpen={!!openTables[product + "-rr"]} onToggleTable={() => toggleTable(product + "-rr")}
              note={product === "SH+" ? "SH+ repairs are reported from Jul 2025 (SH+ reliability KPIs workbook). Volume on the left axis, rate on the right." : "Repair (dispatch) volume on the left axis, repair rate on the right axis."}>
              <ComboChart labels={rangeMonths} T={T}
                bar={{ label: "Repair volume", data: sliceR(DATA.repairVolume[product]), color: colors[product], fmt: fmtNumK }}
                line={{ label: "Repair rate", data: sliceR(DATA.repairRate[product]), color: colors[product], fmt: (v) => fmtPct(v, 2) }} />
              <Legend items={[{ label: "Repair volume (bars, left axis)", color: colors[product], bar: true }, { label: "Repair rate (line, right axis)", color: colors[product] }]} T={T} />
              {openTables[product + "-rr"] && <DataTable labels={rangeMonths} seriesDefs={[
                { key: product, label: "Repair volume", data: sliceR(DATA.repairVolume[product]), fmt: fmtNum },
                { key: product, label: "Repair rate", data: sliceR(DATA.repairRate[product]), fmt: (v) => fmtPct(v, 2) }
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
              {(() => {
                const filtered = prodInits.filter((it) =>
                  INIT_FILTER_KEYS.every((k) => initFilters[k] === "All" || (it[k] || "—") === initFilters[k])
                );
                const active = INIT_FILTER_KEYS.some((k) => initFilters[k] !== "All");
                return (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "0 0 12px" }}>
                      <p style={{ fontSize: 12.5, color: T.textMuted, margin: 0, lineHeight: 1.6 }}>
                        {product} initiatives from the workbook's Initiatives tab. Use the column headers to filter by theme, status, timeline or prime.
                      </p>
                      <span style={{ fontSize: 12, color: T.textFaint, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 10 }}>
                        {filtered.length} of {prodInits.length} initiative{prodInits.length > 1 ? "s" : ""}
                        {active && (
                          <button onClick={() => setInitFilters(NO_INIT_FILTERS)}
                            style={{ background: "transparent", border: `1px solid ${T.borderStrong}`, color: T.textSecondary, borderRadius: 999, padding: "4px 12px", fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                            Clear filters
                          </button>
                        )}
                      </span>
                    </div>
                    {InitiativeRows({ items: filtered, filterable: true, allItems: prodInits })}
                  </>
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
      <Section key="tvplatforms" num="01" eyebrow="TV · By Platform" title="Optik TV Legacy vs TV Evolution" icon="tv" T={T} collapsible defaultOpen={false}>
        {TvPlatformBreakout()}
      </Section>
    );
  }

  // ------------------------------ TV analysis sub-pages (tickets, sentiment, cross) ------------------------------
  const AN_MONTHS = ["Jun", "Jul", "Aug"];
  const anTh = { padding: "9px 12px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".05em", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", textAlign: "left" };
  const anTd = { padding: "8px 12px", borderBottom: `1px solid ${T.border}`, fontSize: 12.5, verticalAlign: "middle" };
  const anNum = { ...anTd, textAlign: "right", whiteSpace: "nowrap", color: T.text };

  // Sub-menu pages: every section starts collapsed
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

  // Aug vs Jul movement (latest month vs prior month) with percent
  function Move({ v, goodDown = true, dec = 0, unit = "", bps = false }) {
    if (v[1] == null || v[2] == null) return <span style={{ color: T.textFaint }}>—</span>;
    const d = bps ? deltaBps(v[2], v[1], goodDown, dec) : delta(v[2], v[1], unit, dec, goodDown);
    return <span style={{ whiteSpace: "nowrap" }}><DeltaText d={d} T={T} />{v[1] ? <span style={{ color: T.textFaint, fontSize: 11.5 }}> ({yoyPctText(v[2], v[1])})</span> : null}</span>;
  }

  function MoverCards({ rising, falling, risingTitle = "Rising · Aug vs Jul 2026", fallingTitle = "Falling · Aug vs Jul 2026" }) {
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
        {AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}
        <th style={anTh}>Trend</th>
        <th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th>
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
          <StatCard T={T} color={colors.TV} icon="tickets" label="TV tickets analysed" value={fmtNum(K.total[2])} sub="Aug 2026 · agent + technician notes"
            deltas={[<Move key="m" v={K.total} />]} />
          <StatCard T={T} color={colors.TV} icon="repairs" label="Field visits" value={fmtPct(K.closure[2].field_visit_pct, 1)} sub="tickets with a technician determination · Aug"
            deltas={[<span key="a" style={{ color: T.textMuted }}>Jun {K.closure[0].field_visit_pct}% · Jul {K.closure[1].field_visit_pct}%</span>]} />
          <StatCard T={T} color={colors.TV} icon="cx" label="Education / no-fault closures" value={fmtPct(dAll[2].nofault, 1)} sub="share of closed tickets · Aug"
            deltas={[<Move key="m" v={dAll.map((d) => d.nofault)} bps />]} />
          <StatCard T={T} color={colors.TV} icon="issues" label="Categorisation divergence" value={fmtPct(dAll[2].reattribution, 1)} sub="closure domain ≠ agent category · all closures"
            deltas={[<Move key="m" v={dAll.map((d) => d.reattribution)} bps />]} />
          <StatCard T={T} color={colors.TV} icon="issues" label="Field-visit divergence" value={fmtPct(dF[2].reattribution, 1)} sub="technician finding ≠ agent category"
            deltas={[<Move key="m" v={dF.map((d) => d.reattribution)} bps />]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          {fmtNum(K.total[0] + K.total[1] + K.total[2])} TV tickets, Jun – Aug 2026; movements compare Aug 2026 with Jul 2026. Agent grouping = Category 1–3 and Agent Notes; closure grouping = Resolution 1–3 and Resolution Text (a technician determination is present on {K.closure[2].field_visit_pct}% of tickets; the rest are agent closures). Text themes are keyword-classified and indicative.
        </p>

        {sec("Top issues by agent categorisation", "tickets",
          <>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Category 1 (agent)", "Share · Aug"]} /></thead>
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
            <p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Movers rank sub-categories with at least 150 tickets in Jul or Aug by absolute change (Aug vs Jul). The YouTube app jump (50 → 235) is the only new driver; the rest are shifts inside established categories.</p>
          </>
        )}

        {sec("Agent vs technician categorisation", "issues",
          <>
            <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
              Each agent Category 1 maps to a symptom domain, each closure (Resolution 1–2) to a cause domain. <b style={{ color: T.textSecondary }}>Alignment</b> means the closure domain is one the symptom would predict (STB No Boot closing as STB hardware or connectivity, for example); <b style={{ color: T.textSecondary }}>divergence</b> is everything else, with <b style={{ color: T.textSecondary }}>education / no fault</b> broken out because it is the single largest cause. The left panel scores every closed ticket; the right panel scores only tickets with a written technician determination, the purest agent-vs-tech comparison.
            </p>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>By agent category — all closures, Aug 2026</div>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>By agent category — field visits only, Aug 2026</div>
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
            <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>Reading the gap: Channel Issues and Recording Issues carry the widest divergence on all closures (87% and 75%), driven by education closures; on field visits, Recording Issues is the weakest match (60% aligned, technicians most often find STB hardware) and Digital Box has the highest non-TELUS-caused share (30%).</p>
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
                  <thead><tr><th style={anTh}>Determination</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m}</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug share</th></tr></thead>
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
                <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>Non-TELUS-caused visits held at 14.4% of determinations in August (14.6% in July), well above June's 9.5%, so a steady one in seven dispatches reaches a home where the fault is customer equipment or setup.</p>
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
              Themes are keyword-classified from the agent's own comment block (system diagnostic text excluded). A written agent comment was found on {fmtNum(K.commentCoverage[2])} of {fmtNum(K.total[2])} August tickets; counts are tickets whose comment mentions the theme.
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
                <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>Legacy Mediaroom equipment (VIP5662W PVR +10%, VIP5602W wireless STB +5%) is mentioned more each month while OPUS mentions are flat (+1%), consistent with the By Platform split where Legacy carries two thirds of TV tickets on a shrinking base.</p>
              </div>
            </div>
          </>
        )}

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
                  <thead><tr><th style={anTh}>Polarity</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th></tr></thead>
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
                {AN_MONTHS.map((m, i) => (
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
                <thead><tr><th style={anTh}>Theme</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} · % of respondents</th>)}<th style={anTh}>Trend</th><th style={{ ...anTh, textAlign: "right" }}>Aug vs Jul</th><th style={{ ...anTh, textAlign: "right" }}>Negative mentions Jul → Aug</th></tr></thead>
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
            <p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Customer service and price dominate the reason-for-rating verbatims and carry the most negative mentions; TV reliability sits third and lost share in August. Internet & Wi-Fi (+180 bps), picture and sound (+90 bps), recording (+60 bps) and channels (+60 bps) gained share against July.</p>
          </>
        )}

        {sec("TV-specific issue verbatims", "tv",
          <>
            <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
              Respondents who flagged a TV problem were asked to describe it. Mention rate is the share of all respondents who wrote a description for that issue, so it tracks how many customers experience each problem month to month.
            </p>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={anTh}>TV issue described</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} · mentions</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug rate</th><th style={anTh}>Trend</th><th style={{ ...anTh, textAlign: "right" }}>Rate Aug vs Jul</th></tr></thead>
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
              <thead><tr><th style={anTh}>Polarity</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m} '26</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug share</th></tr></thead>
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
            <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>Comments about the chatbot and digital support run roughly four negative for every positive; the recurring complaint is being unable to reach a person for anything beyond a simple question.</p>
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
          <StatCard T={T} color={colors.TV} icon="repairs" label="Field-visit divergence" value={fmtPct(TVA.tickets.divergence.field[2].reattribution, 1)} sub="technician finding ≠ agent category · Aug" deltas={[<Move key="m" v={TVA.tickets.divergence.field.map((d) => d.reattribution)} bps />]} />
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
          <StatCard T={T} color={colors.HSIA} icon="tickets" label="HSIA tickets analysed" value={fmtNum(K.total[2])} sub="Aug 2026 · agent + technician notes"
            deltas={[<Move key="m" v={K.total} />]} />
          <StatCard T={T} color={colors.HSIA} icon="repairs" label="Field visits" value={fmtPct(K.closure[2].field_visit_pct, 1)} sub="tickets with a technician determination · Aug"
            deltas={[<span key="a" style={{ color: T.textMuted }}>Jun {K.closure[0].field_visit_pct}% · Jul {K.closure[1].field_visit_pct}%</span>]} />
          <StatCard T={T} color={colors.HSIA} icon="cx" label="Education / no-fault closures" value={fmtPct(dAll[2].nofault, 1)} sub="share of closed tickets · Aug"
            deltas={[<Move key="m" v={dAll.map((d) => d.nofault)} bps />]} />
          <StatCard T={T} color={colors.HSIA} icon="issues" label="Categorisation divergence" value={fmtPct(dAll[2].reattribution, 1)} sub="closure domain ≠ agent category · all closures"
            deltas={[<Move key="m" v={dAll.map((d) => d.reattribution)} bps />]} />
          <StatCard T={T} color={colors.HSIA} icon="issues" label="Field-visit divergence" value={fmtPct(dF[2].reattribution, 1)} sub="technician finding ≠ agent category"
            deltas={[<Move key="m" v={dF.map((d) => d.reattribution)} bps />]} />
        </div>
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "12px 2px 0", lineHeight: 1.6 }}>
          {fmtNum(K.total[0] + K.total[1] + K.total[2])} HSIA tickets, Jun – Aug 2026, from the weekly notes exports; movements compare Aug 2026 with Jul 2026. Agent grouping = Category 1–3 and Agent Notes; closure grouping = Resolution 1–3 and Resolution Text (a technician determination is present on {K.closure[2].field_visit_pct}% of tickets; {K.closure[2].no_closure_code_pct}% carry no closure code). Text themes are keyword-classified and indicative. Customer survey verbatims are not yet available for HSIA, so there is no sentiment page.
        </p>

        {sec("Top issues by agent categorisation", "tickets",
          <>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
              {K.c1.map((c) => (
                <div key={c.name} style={{ flex: 1, minWidth: 150, background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.textMuted }}>{c.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: T.heading, marginTop: 2 }}>{fmtNum(c.v[2])} <span style={{ fontSize: 11.5, fontWeight: 500, color: T.textFaint }}>{(c.v[2] / K.total[2] * 100).toFixed(1)}% · Aug</span></div>
                  <div style={{ fontSize: 12, marginTop: 2 }}><Move v={c.v} /></div>
                </div>
              ))}
            </div>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Category 1 › Category 2 (agent)", "Share · Aug"]} /></thead>
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
            <p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Movers rank sub-categories with at least 150 tickets in Jul or Aug by absolute change (Aug vs Jul). Incompatible Equipment is being re-coded from the Connectivity sub-category to its own Category 1, so the two lines should be read together (2,993 → 3,488 combined, +17%). No Dataflow › All Devices Affected is the single largest movement in either direction; the outage-tagged sub-categories more than doubled.</p>
          </>
        )}

        {sec("Agent vs technician categorisation", "issues",
          <>
            <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 14px", lineHeight: 1.6 }}>
              Each agent Category 1 › 2 maps to a symptom domain (access line & ONT, gateway / dataflow, speed, Wi-Fi, equipment compatibility); each closure (Resolution 1–2) maps to a cause domain. <b style={{ color: T.textSecondary }}>Alignment</b> means the closure domain is one the symptom would predict (ONT Not Ranged closing as an access-line, ONT or gateway fault, for example); <b style={{ color: T.textSecondary }}>divergence</b> is everything else, with <b style={{ color: T.textSecondary }}>education / no fault</b> broken out because it is the single largest cause. The left panel scores every closed ticket; the right panel scores only tickets with a written technician determination, the purest agent-vs-tech comparison.
            </p>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>Where closures land — agent symptom domain × closure cause domain, all closures, Aug 2026</div>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>By agent category — all closures, Aug 2026</div>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>By agent category — field visits only, Aug 2026</div>
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
            <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>Reading the gap: on all closures the Wireless categories diverge most (64% to 67%), driven by education closures; on field visits they are still the weakest match (44% to 46% aligned) because technicians find an access-line or gateway fault on about half of the Wi-Fi tickets they attend. ONT Not Ranged and Historical Data are the best-matched categories (92% to 93% aligned on visits) but ONT Not Ranged carries the highest non-TELUS-caused share (21%).</p>
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
                  <thead><tr><th style={anTh}>Determination</th>{AN_MONTHS.map((m) => <th key={m} style={{ ...anTh, textAlign: "right" }}>{m}</th>)}<th style={{ ...anTh, textAlign: "right" }}>Aug share</th></tr></thead>
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
                <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>Non-TELUS-caused determinations rose from 13.2% to 13.8% of visits (1,974 → 2,000) while total visits fell 3%, so a growing share of dispatches reach homes where the fault is customer equipment, wiring or setup. Found OK › Not Required closures rose 40% in the same month.</p>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.textSecondary, margin: "4px 0 8px" }}>What technicians fixed (themes in Resolution Text, field visits)</div>
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><MonthHeader extra={["Fix theme", "Share of visits · Aug"]} /></thead>
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
            <p style={{ fontSize: 12, color: T.textFaint, margin: 0, lineHeight: 1.5 }}>Fibre work (ONT, light level, splice) is the largest field fix at about a third of visits (−6% on the month) and Wi-Fi / Boost placement the second at 27%; modem replacements fell 13%. Customer training closures fell 8% while Found OK (+40%) and NetCracker stuck-order closures (+26%) rose, so more tickets are reaching a truck or a back-office queue without a fault being found.</p>
          </>
        )}

        {sec("What agents are writing", "notes",
          <>
            <p style={{ fontSize: 12.5, color: T.textMuted, margin: "0 0 12px", lineHeight: 1.6 }}>
              Themes are keyword-classified from the agent's own comment block (InSight diagnostic text excluded). A written agent comment was found on {fmtNum(K.commentCoverage[2])} of {fmtNum(K.total[2])} August tickets; counts are tickets whose comment mentions the theme.
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
                <p style={{ fontSize: 12, color: T.textFaint, marginTop: 10, lineHeight: 1.5 }}>Fibre-related mentions (ONT, PureFibre, GPON) rose 1% while copper / DSL mentions rose 2.6%, matching the No Sync › No DSL Light growth (+5%). Among Wi-Fi hardware, Boost Wi-Fi 7 (BV3) mentions rose 39% and Boost Wi-Fi 6 10% in a month as the older Wi-Fi Hub fell 16%; legacy Actiontec modem mentions are still rising (+6%).</p>
              </div>
            </div>
          </>
        )}

        {sec("Recommendations", "initiatives", <Recs items={HSIA_RECS.filter((r) => ["P1", "P3"].includes(r.pri))} product="HSIA" />)}
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
          <StatCard T={T} color={colors.HSIA} icon="repairs" label="Field-visit divergence" value={fmtPct(K.divergence.field[2].reattribution, 1)} sub="technician finding ≠ agent category · Aug" deltas={[<Move key="m" v={K.divergence.field.map((d) => d.reattribution)} bps />]} />
          <StatCard T={T} color={colors.HSIA} icon="cx" label="Non-TELUS-caused visits" value={fmtPct(K.divergence.field[2].nontelus, 1)} sub="share of technician determinations · Aug" deltas={[<Move key="m" v={K.divergence.field.map((d) => d.nontelus)} bps />]} />
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

  // ------------------------------ executive summary deck ------------------------------
  // One data model drives the on-screen slides, the .pptx and the printable PDF.
  function buildDeck() {
    const month = latestLabel;
    const D = (d) => (d ? { text: d.text, tone: d.tone } : null);
    const kpis = PRODUCTS.map((p) => ({
      product: p, color: colors[p],
      tiles: scopeTiles(p).map((t) => {
        const f = rowFigures(t.data, t.dec, t.goodDown, t.fmt === fmtPct);
        return { label: t.label.replace(/\s*\(.*\)$/, ""), value: t.fmt(f.latest), month: f.latestMonth ? shortMonth(f.latestMonth) : "", yoy: D(f.yoy) };
      })
    }));
    const asOf = "Aug'26", compare = "Aug'26 vs Aug'25";
    const issues = PRODUCTS.filter((p) => LOOKER[p]).map((p) => {
      const L = LOOKER[p], t = L.topIssues[0], worse = t.a25 != null && t.a26 > t.a25;
      const mv = (r) => ({ name: r.issue, text: `${r.delta > 0 ? "+" : ""}${r.delta.toLocaleString()} (${yoyPctText(r.a26, r.a25)})` });
      return {
        product: p, color: colors[p], asOf, compare, issue: t.issue, volume: t.a26,
        yoy: t.a25 != null ? `${worse ? "▲" : "▼"} ${yoyPctText(t.a26, t.a25)} YoY` : "new in 2026", tone: worse ? "bad" : "good",
        trendName: L.topCat.name, trend: L.topCat.series, trendFrom: MONTHS[0], trendTo: MONTHS[MONTHS.length - 1],
        rising: L.rising.slice(0, 3).map(mv), falling: L.falling.slice(0, 3).map(mv)
      };
    });
    const milestones = INITIATIVES.filter((it) => it.timeline.includes(month)).map((it) => ({
      product: it.p, color: colors[it.p], name: it.name, theme: it.theme, status: it.status, timeline: it.timeline, prime: it.prime,
      pillar: (PILLARS.find((pl) => pl.n === it.pillar) || {}).name
    }));
    const res = sweeprFig("resolved", 0), web = sweeprFig("webAppRate", 1, false, true), easy = sweeprFig("cxEasy", 2), chn = sweeprFig("churn", 2, true, true), dea = sweeprFig("deacts", 0);
    const selfServe = [
      { icon: "selfserve", label: "Resolved sessions", value: fmtNum(res.latest), sub: `${res.latestMonth || ""} · target ${fmtNum(res.target)}`, deltas: [[D(res.vsTarget), "vs target"], [D(res.yoy), "vs prior yr."]] },
      { icon: "tickets", label: "Web/App resolution rate", value: fmtPct(web.latest, 1), sub: `${web.latestMonth || ""} · target ${fmtPct(web.target, 1)}`, deltas: [[D(web.vsTarget), "vs target"], [D(web.yoy), "vs prior yr."]] },
      { icon: "cx", label: "CX 'Easy to follow'", value: easy.latest == null ? "—" : easy.latest.toFixed(2), sub: easy.latest == null ? "" : `${easy.latestMonth} · target ${easy.target == null ? "—" : easy.target.toFixed(2)}`, deltas: [[D(easy.vsTarget), "vs target"]] },
      { icon: "churn", label: "Sweepr involved churn", value: fmtPct(chn.latest, 2), sub: chn.latestMonth || "", deltas: [[D(chn.mom), "vs prior mo."]] },
      { icon: "saved", label: "Deacts saved", value: fmtNum(dea.latest), sub: dea.latestMonth || "", deltas: [[D(dea.mom), "vs prior mo."]] }
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
      const onKey = (e) => { if (e.key === "ArrowRight") goTo(cur + 1); else if (e.key === "ArrowLeft") goTo(cur - 1); };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [cur]);
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

    const slide1 = (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, height: "100%" }}>
        {deck.kpis.map((k) => (
          <div key={k.product} style={{ ...card, display: "flex", flexDirection: "column" }}>
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
                  <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 4, color: t.yoy ? toneCol(t.yoy.tone) : T.textFaint }}>{t.yoy ? `${t.yoy.text} vs prior yr.` : "—"}</div>
                </div>
              ))}
            </div>
          </div>
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
    const slide2 = (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, height: "100%" }}>
        {deck.issues.map((k) => (
          <div key={k.product} style={card}>
            <div style={{ ...lbl, color: k.color }}>{k.product} · top ticket issue — {k.asOf}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textSecondary, marginTop: 4 }}>{k.issue}</div>
            <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 2 }}>{k.volume.toLocaleString()} tickets · <b style={{ color: toneCol(k.tone) }}>{k.yoy}</b></div>
            <div style={{ background: T.panel, borderRadius: 8, padding: "10px 12px 6px", margin: "10px 0" }}>
              <Spark series={k.trend} color={k.color} />
              <div style={{ fontSize: 10, color: T.textFaint, marginTop: 4 }}>{k.trendName} tickets · {k.trendFrom} – {k.trendTo} (Looker)</div>
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
          </div>
        ))}
      </div>
    );

    const chip = (status) => {
      const bg = status === "Launched" ? T.chipLaunched : status === "Stalled" ? T.chipStalled : status === "Ideation" ? T.chipIdea : T.chipFlight;
      const fg = status === "Launched" ? T.chipLaunchedText : status === "Stalled" ? T.chipStalledText : status === "Ideation" ? T.chipIdeaText : T.chipFlightText;
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

    const slide4 = (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {deck.selfServe.map((t) => (
            <div key={t.label} style={card}>
              <div style={{ ...lbl, display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: colors.SWEEPR, display: "inline-flex" }}><Icon name={t.icon} size={13} /></span>{t.label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: T.heading, lineHeight: 1.1, marginTop: 8 }}>{t.value}</div>
              <div style={{ fontSize: 10.5, color: T.textFaint, marginTop: 3 }}>{t.sub}</div>
              {t.deltas.map(([d, suf], i) => <div key={i} style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: d ? toneCol(d.tone) : T.textFaint }}>{d ? `${d.text} ${suf}` : "—"}</div>)}
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 18, lineHeight: 1.6 }}>{deck.selfServeNote}</p>
      </>
    );

    const slides = [slide1, slide2, slide3, slide4];
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", margin: "6px 0 12px" }}>
          <div>
            <div style={lbl}>Slide {cur + 1} of 4</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.textSecondary }}>{deck.titles[cur]}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => goTo(cur - 1)} disabled={cur === 0} style={{ ...btn(false), opacity: cur === 0 ? 0.4 : 1 }} aria-label="Previous slide">‹ Prev</button>
            <button onClick={() => goTo(cur + 1)} disabled={cur === 3} style={{ ...btn(false), opacity: cur === 3 ? 0.4 : 1 }} aria-label="Next slide">Next ›</button>
            <span style={{ width: 1, height: 22, background: T.border, margin: "0 4px" }} />
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
        <p style={{ fontSize: 12.5, color: T.textFaint, margin: "14px 2px 0", lineHeight: 1.6 }}>
          Scroll sideways, use the arrows or the ← → keys to move between slides. Slides follow the end of the selected date range ({deck.month}); the top-issue slide uses the Looker ticket categories as of Aug 2026. The .pptx opens in Google Slides (upload it to Drive and open, or use File › Import slides) and in PowerPoint; the PDF option uses the browser print dialog, where you choose Save as PDF.
        </p>
      </>
    );
  }

  const pageTitle = page === "home"
    ? "Reliability monthly performance scorecard"
    : page === "selfserve"
      ? "Self-serve workflows scorecard"
      : page === "execsummary"
      ? "Executive summary"
      : page === "hsiatickets"
      ? "HSIA notes analysis"
      : page === "hsiacross"
      ? "HSIA cross analysis"
      : page === "tvplatforms"
        ? "TV by platform"
        : page === "tvtickets"
          ? "TV notes analysis"
          : page === "tvsentiment"
            ? "TV customer sentiment analysis"
            : page === "tvcross"
              ? "TV cross analysis"
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
            // Sub-pages stay hidden until their product is expanded (or one of
            // them is open, so the active state is always visible).
            if (item.child && !navOpen[item.parent] && CHILD_PARENT[page] !== item.parent) return null;
            const hasKids = !!CHILD_PAGES[item.id];
            const kidsOpen = hasKids && (navOpen[item.id] || CHILD_PARENT[page] === item.id);
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
                {hasKids && (
                  <span onClick={(e) => { e.stopPropagation(); setNavOpen((o) => ({ ...o, [item.id]: !o[item.id] })); }}
                    style={{ marginLeft: "auto", color: T.textMuted, fontSize: 12, padding: "0 4px", transform: kidsOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
                )}
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
            Source: Churn Measurement 2026 workbook (KPIs, Looker ticket categories, initiatives) · Self-serve: TCS PLT Charter scorecard (Sweepr) · SH+: SH+ reliability KPIs workbook · HSIA and TV notes analysis: agent/technician ticket notes, Optik TV survey verbatims (Jun – Aug 2026, Aug vs Jul) · Jan 2025 – {MONTHS[MONTHS.length - 1]}
          </div>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 32px 64px" }}>
          <Eyebrow T={T}>Product Health · Reliability{page !== "home" ? ` · ${CHILD_LABEL[page] ? `${PARENT_LABEL[CHILD_PARENT[page]] || CHILD_PARENT[page]} · ${CHILD_LABEL[page]}` : page}` : ""}</Eyebrow>
          <h1 style={{ fontSize: 27, fontWeight: 700, margin: "8px 0 0", color: T.heading, letterSpacing: "-.01em" }}>{pageTitle}</h1>
          <div style={{ height: 3, width: 96, background: `linear-gradient(90deg, ${T.heading}, #66CC02)`, borderRadius: 2, margin: "12px 0 14px" }} />
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap", fontSize: 12.5, color: T.textMuted, borderBottom: `1px solid ${T.border}`, paddingBottom: 16, marginBottom: 6 }}>
            <span><b style={{ color: T.textSecondary }}>Scope</b> · {page === "selfserve"
              ? "Self-serve workflows (Sweepr): resolved sessions, resolution rates, CX, churn impact"
              : page === "execsummary"
              ? `Executive summary · slide view of the overview for ${latestLabel}: KPIs, top ticket issues, initiative milestones, self-serve`
              : page === "hsiatickets"
              ? "HSIA notes analysis · Aug vs Jul 2026 · agent and technician notes: top issues, movers, categorisation divergence, recommendations"
              : page === "hsiacross"
              ? "HSIA cross analysis · Aug vs Jul 2026 · ticket trends × Looker volumes × agent/technician notes"
              : page === "tvplatforms"
                ? "TV platforms · Optik TV Legacy vs TV Evolution: base, tickets, repairs, swaps"
                : page === "tvtickets"
                  ? "TV notes analysis · Aug vs Jul 2026 · agent and technician notes: top issues, movers, categorisation divergence, recommendations"
                  : page === "tvsentiment"
                    ? "Optik TV survey verbatims · Aug vs Jul 2026 · themes, TV issue mentions, text sentiment (scores excluded)"
                    : page === "tvcross"
                      ? "TV cross analysis · Aug vs Jul 2026 · ticket trends × agent/technician notes × customer verbatims"
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
            {!PRODUCTS.includes(CHILD_PARENT[page]) && <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
            : page === "execsummary" ? <ExecSummaryPage />
            : page === "hsiatickets" ? HsiaTicketAnalysisPage()
            : page === "hsiacross" ? HsiaCrossPage()
            : page === "tvplatforms" ? TvPlatformsPage()
            : page === "tvtickets" ? TvTicketAnalysisPage()
            : page === "tvsentiment" ? TvSentimentPage()
            : page === "tvcross" ? TvCrossPage()
            : ProductPage({ product: page })}
        </div>
        <footer style={{ textAlign: "center", fontSize: 12, color: T.textFaint, padding: "0 0 24px" }}>
          Built from the Churn Measurement 2026 workbook · figures reflect the source snapshot, not a live feed
        </footer>
      </main>
    </div>
  );
}
