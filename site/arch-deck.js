// Slides 5 to 18 of the "HSIA Reliability Tools Ecosystem" deck (Google Slides), rebuilt as text.
// Each slide is one use case: pain points, Northstar goals and the journey it enables. Slides 1 to 4
// (overview, consultation, gaps, user-journey owners) and 19 (closing) are left out on purpose.
export const ARCH_DECK = {
  title: "HSIA Reliability Tools Ecosystem",
  url: "https://docs.google.com/presentation/d/15EIGzu_AOdEFw7tQh1ed8rr8tZ9yFnA7FVAs9wlcWaA/edit",
  slides: [
  {
    "n": 5,
    "title": "Pulse",
    "sub": "Errol Barrie & Gabriel Bergeron-Legros' use case – Power Outage Detection, Sep 8, 2026",
    "pain": [
      "Historically, outage patterns were only identified when customers called in — a slow, inconsistent signal that took hours to surface",
      "Every cluster still needs manual review — no way yet to classify a cluster as a real outage with enough confidence to auto-ticket it",
      "Clusters aren't sorted by size, so the biggest customer-impacting outages don't automatically surface first",
      "The dashboard only tracks up/down status — no visibility yet into chronic degradation (congestion, redundant-site failures) building up over time",
      "Event data is noisy (double alarms/clears, missing heartbeat detail), making it hard to pin down exact outage start/end times"
    ],
    "goals": [
      "Detect and cluster outages automatically from geospatial + temporal data — no longer dependent on customers calling in",
      "Reach enough classification confidence to auto-generate tickets, removing the manual review step entirely",
      "Sort clusters by size so the biggest customer-impacting events surface first",
      "Extend from acute up/down detection to chronic degradation clustering (via hourly performance data) to catch congestion before it becomes an outage",
      "Richer event metadata (heartbeat sequence detail, clean up/down timestamps) so issues can be pinpointed and even proactively mitigated (e.g. reboot flaky equipment before failure)"
    ],
    "journeyTitle": "Outage Prime Journey",
    "steps": [
      "Pulse detects a cluster from geospatial + temporal data (RT-GOD / network alarms) — no customer call needed",
      "Dashboard flags customers green (back), red (down), or yellow (unsure)",
      "Outage prime opens the map, checks for an MDU pattern, and pulls individual customer IDs to validate",
      "Prime determines inside-wire vs. outside-wire and routes to the right team",
      "Confirmed issue is escalated and resolved in minutes instead of hours",
      "Future: classification confidence is high enough to auto-generate the ticket — no manual review needed"
    ]
  },
  {
    "n": 6,
    "title": "Proactive AI-Driven Support",
    "sub": "Adam Jamieson, Deanna Culp & Joan Silva's use case – Proactive North Star Journey, Aug 31, 2026",
    "pain": [
      "Many proactive alerts reach customers who aren't actually experiencing an issue (60–70% \"no issue\" responses)",
      "Customers must pick a flow themselves instead of just describing the problem",
      "No visibility once a customer clicks a self-serve link — completion is a black box",
      "Agents re-authenticate and restart troubleshooting customers already completed"
    ],
    "goals": [
      "Resolve proactively via push notification and voice AI before the customer notices",
      "Validate signals tightly so outreach only reaches genuinely affected customers",
      "One-stop, AI-guided self-serve that resolves ~95% of issues without a human",
      "Seamless handoff — no repeated authentication or re-explaining the issue"
    ],
    "journeyTitle": "Customer Journey",
    "steps": [
      "System detects an issue and sends a push notification (app-first, SMS fallback)",
      "Voice / chat AI opens with full account + telemetry context",
      "AI walks customer through diagnosis and fixes (reboot, speed profile, swap)",
      "Customer can step away and return; visual progress keeps them informed",
      "Validated cases allow self-serve equipment swap or dispatch",
      "Unresolved cases hand off to an agent with full context — no restart"
    ]
  },
  {
    "n": 7,
    "title": "Self-Serve Troubleshooting",
    "sub": "Kenneth Pun's use case – Self-Serve North Star Journey, Aug 31, 2026",
    "pain": [
      "Customers struggle to find the right entry point and navigate to the preferred tool (currently Sweepr), Mobile app requires repetitive logins and isn't optimized for the workflow, and no voice workflows",
      "Workflows don't build confidence that the underlying issue is actually resolved - as we know most troubleshooting calls are remotely resolvable with the capabilities included in current workflows",
      "Customers are limited to phone callbacks, with no flexible channel choice"
    ],
    "goals": [
      "Proactive resolution without requiring customer intervention when possible. Make reactive help frictionless with customer-preferred channels",
      "Customers feel confident in the resolution, whether system-detected or perception-based",
      "Unify the journey across all channels: web, app, and voice",
      "Trigger a truck roll automatically when remote resolution fails — no call or chat agent required"
    ],
    "journeyTitle": "Customer Journey",
    "steps": [
      "Customer perceives an issue or gets a proactive alert",
      "Engages via their channel of choice: app, web, or voice",
      "Self Serve TS tool (Sweepr / Cerebro) gathers the concern and guides troubleshooting",
      "Issue resolved remotely — customer confirms confidently",
      "If unresolved: auto truck roll (non-remote issue) or handoff to an agent via chat/callback"
    ]
  },
  {
    "n": 8,
    "title": "RouteThis Wi-Fi Certification",
    "sub": "Jacob Black-Lock's use case – Reliability Ecosystem Consolidation, Oct 1, 2026",
    "pain": [
      "RouteThis exists purely as a standalone certification tool, disconnected from the Smart Home Plus app and the rest of the reliability ecosystem",
      "Wi-Fi certification results aren't currently visible to customers, agents, or technicians in any unified workflow",
      "It was missing from the reliability tools ecosystem map entirely — an acknowledged gap, not a deliberate scoping decision"
    ],
    "goals": [
      "Bring RouteThis's Wi-Fi certification capability into the Smart Home Plus app rather than leaving it a disconnected, standalone tool",
      "Consolidate certification results with the rest of the reliability ecosystem so they're available wherever troubleshooting happens",
      "Formally add RouteThis to the reliability tools ecosystem map so it's accounted for in the end-to-end architecture"
    ],
    "journeyTitle": "Certification Journey",
    "steps": [
      "RouteThis certifies Wi-Fi capability within the network infrastructure today, as a standalone tool",
      "Certification results get integrated into the Smart Home Plus app instead of staying siloed",
      "Results are consolidated into the broader reliability ecosystem, visible wherever customers, agents, or technicians troubleshoot"
    ]
  },
  {
    "n": 9,
    "title": "Internet Backup & Troubleshooting Integration",
    "sub": "Jacob Black-Lock's use case – Internet Reliability Ecosystem, Oct 1, 2026",
    "pain": [
      "When a customer's wireline is cut, they lose connectivity entirely with no fallback to stay online",
      "Firmware agents and CloudCheck can't quickly tell whether an issue is inside the home (routing devices, boosters) or an outside-network problem, slowing troubleshooting",
      "Internet backup exists today only as a standalone feature idea — not yet wired into diagnostics or the troubleshooting workflow",
      "No clear entry point was chosen for where backup and similar features should live (telus.com vs. a new app vs. an existing app), creating repeated decision paralysis"
    ],
    "goals": [
      "Give customers automatic cellular backup connectivity when their landline is cut, so they stay connected",
      "Feed backup/firmware status into CloudCheck so agents can isolate home-side vs. outside-network issues faster",
      "House the feature in the Smart Home Plus app — already established as the central app for troubleshooting and feature delivery",
      "Treat backup as one plug-in piece of the broader end-to-end reliability ecosystem (detection → in-app notification → resolution), not a standalone feature"
    ],
    "journeyTitle": "Customer & Agent Journey",
    "steps": [
      "Customer's wireline connection is cut",
      "Device's cellular backup capability keeps them online automatically",
      "Firmware agent reports routing device/booster status to CloudCheck in the background",
      "CloudCheck isolates the issue as outside-network, not home equipment, using that status",
      "Customer is notified in the Smart Home Plus app, with agents/technicians already informed of the diagnosis"
    ]
  },
  {
    "n": 10,
    "title": "CUJO Quality of Outcome & Network Intelligence",
    "sub": "Jacob Black-Lock's use case – Device-Level Reliability Evaluation, Oct 1, 2026",
    "pain": [
      "Existing tools (Axon / CloudCheck QoE) measure Wi-Fi access point performance, not what the customer is actually experiencing — proactive teams still struggle to identify customers who are genuinely struggling",
      "Troubleshooting recommendations today are often vague (e.g. \"optimize your booster placement\") with no actual, specific steps",
      "No device-level view of what each device is trying to do on the network (streaming, video call, gaming) or whether it's succeeding at that task",
      "Troubleshooting is request/feedback-based today rather than grounded in measured, probability-based evidence of what would actually help"
    ],
    "goals": [
      "Identify what each device is trying to do on the network (via server-ping pattern: Netflix, Google Meet, gaming, etc.) and define \"quality of outcome\" for that specific task",
      "Use probability-based root cause analysis to find the most likely fix, with a \"proof of enhancement\" estimate of before/after impact — grounded in data, not guesswork",
      "Surface clear, specific, actionable troubleshooting guidance to customers and agents — not generic \"optimize settings\" advice"
    ],
    "journeyTitle": "Device Troubleshooting Journey",
    "steps": [
      "CUJO identifies what each device on the network is trying to do (streaming, video call, gaming) via server-ping pattern",
      "It defines \"quality of outcome\" — the probability the device is getting the performance that task needs",
      "Root cause analysis flags the most likely fix, with a \"proof of enhancement\" estimate of the improvement",
      "Customer sees device-specific, actionable guidance in the Smart Home Plus app; agent sees a full device overview with recommended fixes"
    ]
  },
  {
    "n": 11,
    "title": "Contact Routing & Agent Context",
    "sub": "Carey Duncan's use case – Genesys Cloud & Casa, Aug 31, 2026",
    "pain": [
      "Customers repeat themselves after every transfer between agents",
      "IVR bot experience is frustrating — 700+ intents caused long back-and-forth",
      "Agents lacked visibility into wait times and callback options when transferring — ✓ Resolved via the Transfer Widget (Jul 2026)"
    ],
    "goals": [
      "Route customers accurately on the first try, based on verified intent and product data",
      "Continue reducing IVR turns and friction: Ralph Maffolini’s CCAI Intent routing",
      "Carry AI-generated conversation summaries through every agent transfer (targeted before EOY 2026)"
    ],
    "journeyTitle": "Customer Journey",
    "steps": [
      "Customer calls in; bot identifies account and intent",
      "Bot routes to the correct queue (care, retention, specialized flow)",
      "Agent's screen auto-populates with account info",
      "Genesys transcribes and summarizes the interaction in real time",
      "Summary is automatically posted to Casa and carries over on an agent-to-agent transfer"
    ]
  },
  {
    "n": 12,
    "title": "Ontology Layer",
    "sub": "Jason Thompson's use case – Cross-Channel Data Unification, Sep 4, 2026",
    "pain": [
      "Customer data is fragmented across billing, provisioning, CSM, network, and field trouble-ticket systems — no single view of the customer",
      "Customers make 4-5 separate calls for issues (outage, billing renewal, expiring credit card) that could all be resolved in one interaction",
      "Tools like Insight require dozens of slow, sequential API calls (EC ID → Netcracker ID → provisioning → network component) just to assemble a view",
      "Customer identity itself is fragmented — SOD vs. Enterprise IDs, and separate mobility/home/smart-home platforms don't recognize the same person",
      "Many legacy systems are too dated to integrate directly with modern AI, blocking automation at the source"
    ],
    "goals": [
      "One orchestration layer that pulls real-time data from billing, network, provisioning, and legacy systems — without replicating it into a new data lake",
      "A single unified customer view exposed to agents, AI/IVR, and field technicians in one interaction",
      "Resolve identity across systems (SOD, Enterprise ID, mobility, home) by stitching records via email or phone",
      "Bridge legacy infrastructure to modern LLMs/MCP connectors — the layer stays rule-agnostic, business logic stays in the applications",
      "Build iteratively as one unified domain, expanding module-by-module rather than many disconnected point tools"
    ],
    "journeyTitle": "Customer & Agent Journey",
    "steps": [
      "Customer calls in about one issue (e.g. \"my internet's down\") — no need to describe every problem separately",
      "Ontology layer orchestrates real-time calls across billing, network, provisioning, and ticketing systems into one unified view",
      "Agent or AI instantly sees the full picture — outage cause, an expiring credit card, a renewal due, a mobility backup option",
      "Agent resolves all of it in the same interaction — no transfers, no repeat calls, no manual cross-system lookups",
      "Same orchestration model extends to field technicians and IVR, pulling diagnostics to guide root-cause fixes before a truck rolls"
    ]
  },
  {
    "n": 13,
    "title": "Support Hub: Automated Intake System",
    "sub": "Moiz Adamji's use case – HSIA Reliability Tools Ecosystem, Aug 19, 2026",
    "pain": [
      "Customers wait on hold while agents have zero context, forcing them to re-explain the issue every time",
      "30% of calls never capture the customer ID, breaking the end-to-end journey"
    ],
    "goals": [
      "Shift from inbound call center to self-serve intake (My Telus app / IVR)",
      "Auto-diagnose before a human is ever involved",
      "Guarantee ID + context capture on every contact",
      "Offload volume; equip agents with co-pilot context instead of raw data"
    ],
    "journeyTitle": "Customer Journey",
    "steps": [
      "Contact via My Telus app / IVR",
      "Auto-triage & hardware diagnostics",
      "Support Hub creates ticket, pre-filled with context",
      "Co-pilot generates early recommendation",
      "Customer released — no hold time",
      "Agent resolves remotely or calls back"
    ]
  },
  {
    "n": 14,
    "title": "Casa + Horizon (HRAIZN)",
    "sub": "Amandeep Sidhu's use case – Service Assurance Ecosystem, Sep 4, 2026",
    "pain": [
      "New agents can't interpret Insight's complex telemetry, diagnostics, and data tables — high agent churn means this knowledge gap keeps recurring",
      "Agents copy-paste data between Insight and other co-pilots, inflating average handle time",
      "No seamless handoff — info gathered in the Casa CX Co-pilot doesn't carry into the Horizon/Help Desk session, so customers repeat themselves",
      "Avoidable truck rolls: agents can't diagnose confidently, lack experience, or the customer has called in so many times they just want someone dispatched",
      "Mass-impact issues (fiber cuts, firmware updates, outages) aren't flagged up front, so agents burn 10–15 minutes troubleshooting something no phone fix can solve"
    ],
    "goals": [
      "TS Co-pilot embedded directly in Horizon so common fixes (modem/TV box restarts) run in-tool — no copy-paste, lower average handle time",
      "Seamless handoff: data captured in the Casa CX Co-pilot carries straight into the Horizon/Help Desk session",
      "Patterning flags mass-impact issues (fiber cuts, firmware rollouts) automatically, so agents skip futile troubleshooting and go straight to the right action",
      "Guardrails (targeted Q1/Q2 2027) block a truck roll outright when a known phone-resolvable fix exists, regardless of agent input",
      "Longer-term: proactively flag affected customer accounts before they call, enabling preemptive outreach instead of reactive troubleshooting"
    ],
    "journeyTitle": "Agent Journey",
    "steps": [
      "Customer calls or chats in Genesys Cloud — their info auto-populates in Casa",
      "Agent works the issue with the Casa CX Co-pilot",
      "If unresolved, agent transfers to a more experienced troubleshooting agent",
      "That agent opens Help Desk (Horizon/Insight) for advanced diagnostics",
      "Issue patterning flags known mass issues — agent avoids a dispatch or resolves faster, cutting handle time"
    ]
  },
  {
    "n": 15,
    "title": "TechHub Auto Test Tool",
    "sub": "Ziyaad Sayhebolay's use case – TechHub Auto Test Tool, Aug 31, 2026",
    "pain": [
      "Test tools were pulled from technician scorecards, so usage is inconsistent",
      "Technicians must switch between TechHub and Insight to see diagnostic results",
      "High technician / agent attrition means institutional troubleshooting knowledge is lost"
    ],
    "goals": [
      "Auto-trigger all applicable tests the moment a technician accepts a job",
      "Surface only failures + AI recommendations — no manual tool-hopping",
      "Layer AI-driven institutional knowledge over static thresholds for better calls",
      "Build one consistent diagnostic record shared by techs, agents, and eventually customers"
    ],
    "journeyTitle": "Technician Journey",
    "steps": [
      "Technician accepts a job in TechHub",
      "TechHub calls Insight, which auto-runs all applicable tests concurrently",
      "Results return as pass/fail flags with AI-driven recommendations",
      "Technician acts only on flagged failures — no manual test navigation",
      "Diagnostic record is stamped and retained after the technician leaves",
      "Record rolls up to agents (and eventually customers) for consistent context"
    ]
  },
  {
    "n": 16,
    "title": "SignalStream & FieldFrame",
    "sub": "Paul Jackanich & Timothy Miron's use case – AI-Driven Technician Insight Surface, Sep 3, 2026",
    "pain": [
      "Technicians face \"death by a thousand cuts\" — hundreds of small, fragmented issues scattered across Casa, Netcracker, call transcripts, and GIS",
      "No single view of what's remarkable about a job before a technician arrives, driving unnecessary back-office calls",
      "Signals like a hot sales lead buried in a 15-page call transcript go unnoticed and unactioned",
      "Adding one new data field today means updating both the front-end UI and the API payload — slow and costly to extend"
    ],
    "goals": [
      "SignalStream (backend): continuously aggregate observations — calls, alarms, FDH events, provisioning — into one Observation Store per customer",
      "SignalStream (backend): an offline reasoning harness evaluates the whole customer history holistically, not just the current ticket",
      "FieldFrame (frontend): zero-noise by design — surface at most 5 insights (or 0) — quality over quantity, no template filler",
      "FieldFrame (frontend): modular, config-driven building blocks so new insight types ship without rebuilding the UI or API"
    ],
    "journeyTitle": "Technician Journey",
    "steps": [
      "SignalStream aggregates calls, alarms, and FDH/provisioning events into the Observation Store",
      "An interaction of interest triggers the reasoning harness to evaluate the full customer history",
      "SignalStream generates up to 5 pertinent insights (or none, if nothing's remarkable)",
      "FieldFrame's modular canvas renders those insights as dynamic building blocks in TechHub / Go",
      "Technician sees a lightweight alert in TechHub and deep-links into FieldFrame for the full insight",
      "Technician acts on it (e.g. hot lead, repeat issue); future: write corrections back to fix bad records"
    ]
  },
  {
    "n": 17,
    "title": "Field Technician Diagnostics",
    "sub": "Jordan Jenkins's use case – Project Flickr & FieldFrame, Aug 31, 2026",
    "pain": [
      "Confirming a pulled jumper requires a 30–60 minute manual back-office call",
      "~600 GPON incidents a month send trucks to accounts mistakenly pulled out of service",
      "Technicians juggle multiple disconnected tools with no single view",
      "No live way to verify line health or catch alarms triggered by their own work"
    ],
    "goals": [
      "Give technicians one consolidated view of line health and live alarm events",
      "Cut diagnostic tasks that took 30–60 minutes down to seconds",
      "Build an end-to-end health check: provisioning → line → CPE, \"start here\" guidance",
      "Evergreen, in-tool tutorials so training updates itself as the UI changes"
    ],
    "journeyTitle": "Technician Journey",
    "steps": [
      "Technician works an FDH / jumper and opens FieldFrame in TechHub",
      "Pulls jumper, runs a live test to confirm the correct line",
      "System flags any other line inadvertently affected in real time",
      "Insight identified — deep link into FieldFrame for detail if needed",
      "End-to-end health check clears provisioning, line, and CPE in sequence",
      "Technician resolves on the spot — no back-office call, no repeat truck roll"
    ]
  },
  {
    "n": 18,
    "title": "Visual AI Install Verification",
    "sub": "Rick Jellema's use case – Visual AI Tool, Aug 31, 2026",
    "pain": [
      "No reliable way to verify NIB box installation quality in the field",
      "Poor installs (exposed or pinched cables, missing connectors) go undetected until they fail",
      "Install-quality data is siloed and never reaches agents or customers"
    ],
    "goals": [
      "Certify every install against Telus standards with real-time technician feedback",
      "Build a \"digital certificate\" / blueprint of the home customers can trust",
      "Extend the same visual verification to DIY customers and build vendors"
    ],
    "journeyTitle": "Technician Journey",
    "steps": [
      "Technician completes work and photographs the install (NIB, modem, etc.)",
      "Visual AI scores it against 5 standards and returns real-time feedback",
      "Technician corrects issues on the spot, or overrides with a logged reason",
      "Result and image are geotagged and stored against the customer's address",
      "Verified installs build a certified \"digital home\" record over time",
      "Future dispatches or agent calls reuse the record — no redundant re-checks"
    ]
  }
]
};

// Architecture chips that expand into one or more slides of the deck above: [chip label, box it sits in
// (null = any box), deck slide numbers in order of relevance]. Chips that no slide covers are left unlinked.
export const ARCH_LINKS = [
 [
  "Internet Backup",
  "Proactive",
  [
   9
  ]
 ],
 [
  "Proactive Campaigns",
  "Proactive",
  [
   6
  ]
 ],
 [
  "Fix in provisioning, no customer contact",
  "Proactive",
  [
   6
  ]
 ],
 [
  "Automatic remediation",
  "Proactive",
  [
   6
  ]
 ],
 [
  "telus.com",
  "Customer self-serve",
  [
   7
  ]
 ],
 [
  "SmartHome+ app",
  "Customer self-serve",
  [
   9,
   8,
   10
  ]
 ],
 [
  "My Telus",
  "Customer self-serve",
  [
   13
  ]
 ],
 [
  "IVR / voice",
  "Customer self-serve",
  [
   11,
   7
  ]
 ],
 [
  "Proactive push / SMS",
  "Customer self-serve",
  [
   6
  ]
 ],
 [
  "Sweepr self-serve",
  "Customer self-serve",
  [
   7
  ]
 ],
 [
  "CCAI intent bot",
  "Customer self-serve",
  [
   11
  ]
 ],
 [
  "RouteThis Rava",
  "Customer self-serve",
  [
   8
  ]
 ],
 [
  "E2E health check",
  null,
  [
   17
  ]
 ],
 [
  "Support Hub intake",
  "Customer self-serve",
  [
   13
  ]
 ],
 [
  "RouteThis cert in SH+ app",
  "Customer self-serve",
  [
   8
  ]
 ],
 [
  "Casa",
  "Call center",
  [
   11,
   14
  ]
 ],
 [
  "Genesys Cloud",
  "Call center",
  [
   11
  ]
 ],
 [
  "Transfer widget",
  "Call center",
  [
   11
  ]
 ],
 [
  "RouteThis Certify & Resolve",
  null,
  [
   8
  ]
 ],
 [
  "Solvatio HRAIZN help desk",
  "Call center",
  [
   14
  ]
 ],
 [
  "CloudCheck T1 GUI",
  "Call center",
  [
   9
  ]
 ],
 [
  "Casa CX co-pilot",
  "Call center",
  [
   14
  ]
 ],
 [
  "FieldFrame for agents",
  "Call center",
  [
   16,
   17
  ]
 ],
 [
  "CUJO per-device overview",
  "Call center",
  [
   10
  ]
 ],
 [
  "TechHub",
  "Technician",
  [
   15,
   16,
   17
  ]
 ],
 [
  "SignalStream insights",
  "Technician",
  [
   16
  ]
 ],
 [
  "Project Flickr",
  "Technician",
  [
   17
  ]
 ],
 [
  "Visual AI install scoring",
  "Technician",
  [
   18
  ]
 ],
 [
  "TechHub auto test tool",
  "Technician",
  [
   15
  ]
 ],
 [
  "Solvatio HRAIZN",
  "Care orchestration & AI co-pilot",
  [
   14
  ]
 ],
 [
  "Jarvis (central troubleshooting AI)",
  "Care orchestration & AI co-pilot",
  [
   6,
   7
  ]
 ],
 [
  "FieldFrame",
  "Care orchestration & AI co-pilot",
  [
   17,
   16
  ]
 ],
 [
  "Automated Dispatch Guardrails",
  "Care orchestration & AI co-pilot",
  [
   14
  ]
 ],
 [
  "Cerebro",
  "Care orchestration & AI co-pilot",
  [
   7
  ]
 ],
 [
  "Fabric (Sweepr)",
  "Care orchestration & AI co-pilot",
  [
   7
  ]
 ],
 [
  "AI summaries across transfers",
  "Care orchestration & AI co-pilot",
  [
   11
  ]
 ],
 [
  "Auto truck roll",
  "Care orchestration & AI co-pilot",
  [
   7
  ]
 ],
 [
  "Can Solvatio HRAIZN be the orchestration layer in its future state?",
  "Care orchestration & AI co-pilot",
  [
   14
  ]
 ],
 [
  "SignalStream Observation Store",
  "Customer, device & diagnostic context",
  [
   16
  ]
 ],
 [
  "Solvatio HRAIZN as ontology store?",
  "Customer, device & diagnostic context",
  [
   14,
   12
  ]
 ],
 [
  "Netcracker",
  "Customer, device & diagnostic context",
  [
   12
  ]
 ],
 [
  "FIFA",
  "Customer, device & diagnostic context",
  [
   12
  ]
 ],
 [
  "Wiser (WSIR)",
  "Customer, device & diagnostic context",
  [
   12
  ]
 ],
 [
  "Remedy Trouble Tickets",
  "Customer, device & diagnostic context",
  [
   12
  ]
 ],
 [
  "Ontology Layer",
  "Customer, device & diagnostic context",
  [
   12
  ]
 ],
 [
  "Identity stitching",
  "Customer, device & diagnostic context",
  [
   12
  ]
 ],
 [
  "One record of service",
  "Customer, device & diagnostic context",
  [
   15,
   12
  ]
 ],
 [
  "Visual AI \"digital home\"",
  "Customer, device & diagnostic context",
  [
   18
  ]
 ],
 [
  "GPONe",
  "Line & outside the home",
  [
   17
  ]
 ],
 [
  "AMS network alarms",
  "Line & outside the home",
  [
   5
  ]
 ],
 [
  "CloudCheck",
  "CPE & firmware",
  [
   9,
   10
  ]
 ],
 [
  "Remote reboot & speed profile",
  "CPE & firmware",
  [
   6
  ]
 ],
 [
  "Internet backup (cellular)",
  "CPE & firmware",
  [
   9
  ]
 ],
 [
  "CloudCheck Wi-Fi QoE",
  "In-home diagnostics",
  [
   10,
   9
  ]
 ],
 [
  "RouteThis Certify",
  "In-home diagnostics",
  [
   8
  ]
 ],
 [
  "RouteThis RAVA",
  "In-home diagnostics",
  [
   8
  ]
 ],
 [
  "CUJO quality of outcome & RCA",
  "In-home diagnostics",
  [
   10
  ]
 ],
 [
  "Pulse clustering",
  "Telemetry returns to CPE, firmware & network engineering",
  [
   5
  ]
 ],
 [
  "Solvatio HRAIZN issue patterning",
  "Telemetry returns to CPE, firmware & network engineering",
  [
   14,
   5
  ]
 ],
 [
  "Chronic degradation clustering",
  "Telemetry returns to CPE, firmware & network engineering",
  [
   5
  ]
 ],
 [
  "Flaky equipment → network integrity",
  "Telemetry returns to CPE, firmware & network engineering",
  [
   5
  ]
 ],
 [
  "Richer CloudCheck event data",
  "Telemetry returns to CPE, firmware & network engineering",
  [
   5
  ]
 ],
 [
  "Auto-ticketing",
  "Telemetry returns to CPE, firmware & network engineering",
  [
   5
  ]
 ]
];
