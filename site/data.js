/*
  Source: "Reliability / Deact KPIs" tab, Reliability & Deacts workbook
  (docs.google.com/spreadsheets/d/1_1DUqmb9meLI_9GRIhxmuelBI1p2uQOC122TwntJfVo, gid=436997965)
  Transcribed verbatim from the sheet's stacked KPI tables. Gaps in the source
  (months not yet reported) are left as null rather than interpolated.
*/
window.DASHBOARD_DATA = {
  months: [
    "Apr 2024","May 2024","Jun 2024","Jul 2024","Aug 2024","Sep 2024","Oct 2024","Nov 2024","Dec 2024",
    "Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025",
    "Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026","Jun 2026"
  ],

  // % of subscriber base opening a trouble ticket, monthly
  ticketRate: {
    HSIA: [1.93,1.96,1.93,1.92,2.01,1.98,2.07,1.97,2.03,2.10,1.77,1.95,1.88,1.87,1.90,2.09,2.08,1.95,1.75,1.90,1.85,1.89,1.64,2.04,2.03,2.23,2.29],
    TV:   [3.19,2.98,2.43,2.49,2.50,2.55,3.04,2.90,2.94,3.53,3.02,3.17,3.01,3.05,2.76,2.86,2.81,2.68,3.00,3.12,2.92,2.90,2.41,2.79,2.71,2.47,2.56],
    SHS:  [4.59,4.20,3.85,3.80,3.97,3.94,4.58,4.40,4.48,4.97,4.06,4.39,4.41,4.40,4.27,4.89,4.93,4.77,4.61,4.27,4.47,4.37,4.21,4.23,3.89,3.81,4.15]
  },

  // % of subscriber base requiring a truck-roll / field repair, monthly
  repairRate: {
    HSIA: [0.49,0.55,0.51,0.53,0.59,0.60,0.62,0.56,0.55,0.59,0.54,0.58,0.58,0.65,0.66,0.74,0.76,0.76,0.84,0.76,0.76,0.77,0.68,0.78,0.81,0.84,0.74],
    TV:   [0.21,0.23,0.21,0.21,0.23,0.25,0.26,0.18,0.16,0.18,0.15,0.19,0.17,0.17,0.15,0.14,0.13,0.13,0.16,0.15,0.14,0.16,0.15,0.16,0.17,0.17,0.12],
    SHS:  [0.47,0.48,0.44,0.43,0.43,0.43,0.54,0.48,0.40,0.50,0.43,0.46,0.46,0.46,0.45,0.50,0.46,0.47,0.54,0.49,0.50,0.54,0.49,0.51,0.53,0.54,0.41]
  },

  // Monthly churn rate (% of subscriber base deactivating), reported from Feb 2025 onward
  churnRate: {
    HSIA: [null,null,null,null,null,null,null,null,null,null,0.88,0.89,1.13,1.16,1.13,1.27,1.20,1.16,1.23,1.07,0.97,0.98,0.81,0.98,1.10,1.08,1.05],
    TV:   [null,null,null,null,null,null,null,null,null,null,1.12,1.13,1.33,1.36,1.31,1.50,1.41,1.37,1.46,1.35,1.19,1.28,1.05,1.24,1.33,1.29,1.30],
    SHS:  [null,null,null,null,null,null,null,null,null,null,1.14,1.27,1.52,1.53,1.34,1.53,1.47,1.29,1.60,1.39,1.00,1.60,1.04,1.25,1.40,1.26,1.51]
  },

  // Latest 3-month actuals from the Assure/CCAI call & ticket-volume tables (Dec 2025-Feb 2026)
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

  // Field-repair (dispatch) volumes, Dec 2025-Mar 2026
  fieldRepairMonths: ["Dec 2025","Jan 2026","Feb 2026","Mar 2026"],
  fieldRepairVolume: {
    HSIA: [528,516,493,512],
    TV:   [445,482,422,415],
    SHS:  [222,254,204,219]
  },

  // Product/Technical Deact volume (churn count, thousands), Jan 2025-Feb 2026
  deactMonths: ["Jan 2025","Feb 2025","Mar 2025","Apr 2025","May 2025","Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025","Jan 2026","Feb 2026"],
  productTechnicalDeactsK: {
    HSIA: [2.0,1.8,2.0,2.2,2.2,2.2,2.6,2.7,2.6,2.6,2.4,2.0,2.0,1.8],
    TV:   [2.00,1.77,1.87,1.98,1.99,1.94,2.30,2.27,2.14,2.21,2.15,1.79,1.8,1.6],
    SHS:  [1.5,1.5,1.7,1.9,1.9,1.7,2.1,2.3,2.1,2.1,1.9,1.6,1.5,1.4]
  },

  // Annualized churn snapshot (go/national RGU), 2026 YTD vs 2025
  annualChurn: {
    HSIA: { y2026: 0.95, y2025: 1.13, yoyPts: -0.18 },
    TV:   { y2026: 1.17, y2025: 1.36, yoyPts: -0.19 },
    SHS:  { y2026: 1.37, y2025: 1.67, yoyPts: -0.30 }
  },

  // HSIA-only spotlight: repairs coded as severely degraded fibre line (no TV equivalent in source)
  hsiaFibreMonths: ["Jun 2025","Jul 2025","Aug 2025","Sep 2025","Oct 2025","Nov 2025","Dec 2025","Jan 2026","Feb 2026","Mar 2026","Apr 2026","May 2026"],
  hsiaFibreDegraded: {
    volume: [624,952,2076,2451,3374,2505,2641,2541,2197,2358,2524,2467],
    pctOfHsiaRepairs: [4.51,6.13,12.92,15.12,18.85,15.42,16.19,15.50,15.07,14.11,14.56,13.31],
    hsiaJobs: [13826,15529,16073,16207,17901,16242,16317,16392,14574,16717,17332,18530]
  }
};
