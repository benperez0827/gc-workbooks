/* Sample data and reference tables. Every figure is editable in the tools.
   Sources are listed in SOURCES and shown next to the numbers they back. */
(function () {
  "use strict";

  const SOURCES = {
    bls: { label: "BLS OEWS May 2025, Phoenix-Mesa-Chandler MSA median", url: "https://www.bls.gov/regions/west/news-release/occupationalemploymentandwages_phoenix.htm" },
    blsAZ: { label: "BLS OEWS May 2025, Arizona statewide median (Phoenix figure not published)", url: "https://tradecareerpath.com/trades/roofer/arizona/salary/" },
    blsNat: { label: "BLS OEWS May 2025, national median (Phoenix figure not found)", url: "https://wagedex.com/jobs/drywall-and-ceiling-tile-installers" },
    nahb: { label: "NAHB Cost of Constructing a Home, 2024 survey (national)", url: "https://nahb.org/-/media/AB4EFC742624475A97A0A62189986FF8.ashx" },
    nmBTR: { label: "Northmarq Phoenix BTR Market Insights, Q2 2026", url: "https://www.northmarq.com/sites/default/files/docs/BTRMarketInsights-Q22026-Phoenix.pdf" },
    nmBTRrent: { label: "Northmarq Phoenix BTR Market Insights, Q3 2025", url: "https://www.northmarq.com/sites/default/files/docs/BTRMarketInsights-Q32025-Phoenix.pdf" },
    yardi: { label: "Yardi Matrix Phoenix Multifamily Report, Sept 2026", url: "https://www.multihousingnews.com/?p=1005104123" },
    phxTimes: { label: "City of Phoenix PDD plan review time frames report, Sept 2026", url: "https://www.phoenix.gov/content/dam/phoenix/pddsite/documents/about-us/turnaround-times-report.pdf.pdf" },
    phx9835: { label: "City of Phoenix License Time Frames, A.R.S. 9-835 policy", url: "https://web-prod.phoenix.gov/content/dam/phoenix/pddsite/documents/trt/external/dsd_trt_pdf_00607.pdf" },
    adorTPT: { label: "Arizona DOR: prime contracting tax base is 65% of gross receipts", url: "https://azdor.gov/transaction-privilege-tax/contracting-guidelines/contracting-faqs" },
    azWaiver: { label: "A.R.S. 33-1008, waiver of lien (statutory forms)", url: "https://azleg.gov/ars/33/01008.htm" },
    azWC: { label: "Published AZ workers comp ranges (e.g. class 5645: $4.69 to $9.34 per $100, 2024)", url: "https://workerscompensationshop.com/az-workers-comp-rates.html" },
    sample: { label: "Sample planning figure. Replace with your own job history or bids.", url: "" },
  };

  // Hourly base wages. wc = workers comp $ per $100 payroll (placeholder within published AZ ranges).
  const TRADES = [
    { id: "lab", name: "Construction laborer", soc: "47-2061", wage: 22.56, src: "bls", wc: 5.0 },
    { id: "carp", name: "Carpenter / framer", soc: "47-2031", wage: 29.0, src: "bls", wc: 6.0 },
    { id: "cem", name: "Cement mason / finisher", soc: "47-2051", wage: 28.5, src: "bls", wc: 4.5, note: "About 4% above the $57,020 national median" },
    { id: "dry", name: "Drywall installer / taper", soc: "47-2081", wage: 28.33, src: "blsNat", wc: 4.0 },
    { id: "pnt", name: "Painter", soc: "47-2141", wage: 25.49, src: "bls", wc: 3.5 },
    { id: "elec", name: "Electrician", soc: "47-2111", wage: 29.43, src: "bls", wc: 2.85 },
    { id: "plmb", name: "Plumber", soc: "47-2152", wage: 30.65, src: "bls", wc: 3.4 },
    { id: "hvac", name: "HVAC mechanic / installer", soc: "49-9021", wage: 29.41, src: "bls", wc: 3.25 },
    { id: "roof", name: "Roofer", soc: "47-2181", wage: 22.76, src: "blsAZ", wc: 8.0 },
    { id: "tile", name: "Tile setter", soc: "47-2044", wage: 25.72, src: "bls", wc: 3.5 },
    { id: "insl", name: "Insulation worker", soc: "47-2131", wage: 20.35, src: "bls", wc: 4.0 },
    { id: "glaz", name: "Glazier", soc: "47-2121", wage: 27.49, src: "bls", wc: 4.0 },
    { id: "opr", name: "Equipment operator (paving)", soc: "47-2071", wage: 26.77, src: "bls", wc: 4.5 },
    { id: "fore", name: "Foreman / first-line supervisor", soc: "47-1011", wage: 38.38, src: "bls", wc: 4.0 },
  ];

  const BURDEN = {
    payrollTaxPct: 8.5, // FICA 7.65% plus effective FUTA and AZ SUTA
    ptoPct: 3.0,
    benefitsPerHr: 3.0,
  };

  const PRODUCTS = {
    sfr: { label: "Single-family for-sale", units: 30, sf: 2100, bldgs: 30, acres: 7.5, months: 12, value: 477700, valueLabel: "Sales price per home", valueSrc: "nmBTR", valueNote: "Phoenix median single-family home price, Q2 2026", land: 65000, landNote: "NAHB: finished lot averages 13.7% of sales price" },
    btr: { label: "Build-to-rent", units: 40, sf: 1150, bldgs: 40, acres: 6, months: 12, value: 430000, valueLabel: "Exit value per unit", valueSrc: "nmBTR", valueNote: "Phoenix BTR median sale price per unit, H1 2026", land: 45000, landNote: "Placeholder. Use your land basis.", rent: 1969, rentSrc: "nmBTRrent" },
    th: { label: "Townhomes / duplexes", units: 48, sf: 1550, bldgs: 8, acres: 4.5, months: 14, value: 395000, valueLabel: "Sales price per home", valueSrc: "sample", valueNote: "Placeholder. Use your comps.", land: 48000, landNote: "Placeholder. Use your land basis." },
    mf: { label: "Small multifamily (garden)", units: 96, sf: 920, bldgs: 4, acres: 4, months: 18, value: 264952, valueLabel: "Exit value per unit", valueSrc: "yardi", valueNote: "Phoenix average multifamily price per unit, Sept 2026", land: 25000, landNote: "Placeholder. Use your land basis.", rent: 1509, rentSrc: "sample" },
  };

  // Product-dependent factors (multipliers on living SF)
  const SLAB = { sfr: 0.9, btr: 1.0, th: 0.55, mf: 0.36 };
  const ROOF = { sfr: 0.95, btr: 1.35, th: 0.6, mf: 0.4 };
  const WALL = { sfr: 1.25, btr: 1.4, th: 1.0, mf: 0.85 };
  const BOARD = { sfr: 3.3, btr: 3.2, th: 3.6, mf: 3.8 };

  const DIVISIONS = [
    "02 Sitework & earthwork",
    "03 Site utilities",
    "04 Paving, walls & amenities",
    "05 Concrete & foundations",
    "06 Framing & rough carpentry",
    "07 Roofing",
    "08 Exterior envelope",
    "09 Plumbing",
    "10 Electrical & low voltage",
    "11 HVAC",
    "12 Fire protection",
    "13 Insulation & drywall",
    "14 Interior finishes",
    "15 Cabinets, appliances & specialties",
    "16 Landscape & final",
  ];

  // driver: units | sf | acres | bldgs | ls. qty = factor x driver. Any number can be a per-product map.
  const SCOPES = [
    { code: "02-100", div: 0, name: "Clearing & grubbing", uom: "acre", driver: "acres", method: "sub", rate: 4500 },
    { code: "02-200", div: 0, name: "Mass grading & pad certification", uom: "acre", driver: "acres", method: "sub", rate: 18000 },
    { code: "02-300", div: 0, name: "SWPPP, dust control & erosion BMPs", uom: "LS", driver: "ls", method: "sub", rate: { sfr: 40000, btr: 35000, th: 32000, mf: 45000 } },
    { code: "02-400", div: 0, name: "Construction staking & surveying", uom: "unit", driver: "units", method: "sub", rate: { sfr: 900, btr: 650, th: 500, mf: 300 } },

    { code: "03-100", div: 1, name: "Water distribution & services", uom: "unit", driver: "units", method: "sub", rate: { sfr: 7200, btr: 6500, th: 5200, mf: 3600 } },
    { code: "03-200", div: 1, name: "Sanitary sewer & services", uom: "unit", driver: "units", method: "sub", rate: { sfr: 7400, btr: 6800, th: 5400, mf: 3700 } },
    { code: "03-300", div: 1, name: "Storm drain & retention", uom: "acre", driver: "acres", method: "sub", rate: 22000 },
    { code: "03-400", div: 1, name: "Dry utility trenching & conduit", uom: "unit", driver: "units", method: "sub", rate: { sfr: 2600, btr: 2200, th: 1800, mf: 1200 } },

    { code: "04-100", div: 2, name: "Asphalt paving (streets, drives, parking)", uom: "unit", driver: "units", method: "sub", rate: { sfr: 6200, btr: 4800, th: 3900, mf: 3400 } },
    { code: "04-200", div: 2, name: "Concrete curb, gutter & sidewalk", uom: "unit", driver: "units", method: "sub", rate: { sfr: 4400, btr: 3200, th: 2600, mf: 1600 } },
    { code: "04-300", div: 2, name: "Perimeter & theme walls (CMU)", uom: "LS", driver: "ls", method: "sub", rate: { sfr: 240000, btr: 210000, th: 160000, mf: 150000 } },
    { code: "04-400", div: 2, name: "Amenities (pool, ramada, clubhouse, park)", uom: "LS", driver: "ls", method: "sub", rate: { sfr: 150000, btr: 280000, th: 220000, mf: 1200000 } },

    { code: "05-100", div: 3, name: "Building pad prep & footing excavation", uom: "SF slab", driver: "sf", factor: SLAB, method: "sub", rate: 1.5 },
    { code: "05-200", div: 3, name: "Post-tension slab on grade", uom: "SF slab", driver: "sf", factor: SLAB, method: "self", trade: "cem", prod: 22, mat: 5.25, waste: 3, equip: 0.6, notes: "Material covers concrete, PT cable, vapor barrier, rebar at thickened edges" },
    { code: "05-300", div: 3, name: "Garage, patio & walk flatwork", uom: "unit", driver: "units", method: "sub", rate: { sfr: 5800, btr: 1400, th: 2200, mf: 0 } },

    { code: "06-100", div: 4, name: "Framing: labor & lumber package", uom: "SF", driver: "sf", method: "self", trade: "carp", prod: 5.5, mat: { sfr: 13.5, btr: 13, th: 14, mf: 15 }, waste: 5, equip: 0.35, notes: "Walls, floors and roof. Lumber and sheathing in material" },
    { code: "06-200", div: 4, name: "Roof trusses (supply & set)", uom: "SF roof", driver: "sf", factor: ROOF, method: "sub", rate: 5.5 },
    { code: "06-300", div: 4, name: "Hardware, hold-downs & fasteners", uom: "SF", driver: "sf", method: "sub", rate: 0.8 },

    { code: "07-100", div: 5, name: "Concrete tile roofing & underlayment", uom: "SF roof", driver: "sf", factor: ROOF, method: "sub", rate: 7.25 },
    { code: "07-200", div: 5, name: "Gutters, flashing & roof penetrations", uom: "unit", driver: "units", method: "sub", rate: { sfr: 1400, btr: 900, th: 800, mf: 500 } },

    { code: "08-100", div: 6, name: "Stucco (lath, scratch & color coat)", uom: "SF wall", driver: "sf", factor: WALL, method: "sub", rate: 9.5 },
    { code: "08-200", div: 6, name: "Windows & sliding doors", uom: "unit", driver: "units", method: "sub", rate: { sfr: 11500, btr: 7200, th: 8200, mf: 5600 } },
    { code: "08-300", div: 6, name: "Exterior doors & garage doors", uom: "unit", driver: "units", method: "sub", rate: { sfr: 4200, btr: 1300, th: 3200, mf: 900 } },
    { code: "08-400", div: 6, name: "Exterior paint & sealants", uom: "SF wall", driver: "sf", factor: WALL, method: "self", trade: "pnt", prod: 60, mat: 0.35, waste: 5, equip: 0.05 },
    { code: "08-500", div: 6, name: "Stairs, railings & breezeways", uom: "bldg", driver: "bldgs", method: "sub", rate: { sfr: 0, btr: 0, th: 0, mf: 85000 } },

    { code: "09-100", div: 7, name: "Plumbing (underground, rough, trim, fixtures)", uom: "unit", driver: "units", method: "sub", rate: { sfr: 18500, btr: 14500, th: 15200, mf: 11800 } },
    { code: "09-200", div: 7, name: "Water heaters", uom: "unit", driver: "units", method: "sub", rate: { sfr: 2400, btr: 2100, th: 2100, mf: 1900 } },

    { code: "10-100", div: 8, name: "Electrical (service, rough, trim, fixtures)", uom: "unit", driver: "units", method: "sub", rate: { sfr: 17500, btr: 13800, th: 14200, mf: 10600 } },
    { code: "10-200", div: 8, name: "Low voltage, security & fire alarm", uom: "unit", driver: "units", method: "sub", rate: { sfr: 900, btr: 850, th: 1400, mf: 1900 } },

    { code: "11-100", div: 9, name: "HVAC (equipment, ductwork, controls)", uom: "unit", driver: "units", method: "sub", rate: { sfr: 16500, btr: 11500, th: 12500, mf: 9200 } },

    { code: "12-100", div: 10, name: "Fire sprinklers (NFPA 13D / 13R)", uom: "SF", driver: "sf", method: "sub", rate: { sfr: 0, btr: 0, th: 3.25, mf: 4.25 } },

    { code: "13-100", div: 11, name: "Insulation (batt, blown, sound)", uom: "SF", driver: "sf", method: "sub", rate: { sfr: 2.1, btr: 2.1, th: 2.6, mf: 2.9 } },
    { code: "13-200", div: 11, name: "Drywall: hang, tape & texture", uom: "SF board", driver: "sf", factor: BOARD, method: "self", trade: "dry", prod: 32, mat: 0.62, waste: 8, equip: 0.03 },
    { code: "13-300", div: 11, name: "Fire-rated separations (party walls, floor/ceiling)", uom: "unit", driver: "units", method: "sub", rate: { sfr: 0, btr: 0, th: 3800, mf: 5200 } },

    { code: "14-100", div: 12, name: "Interior paint", uom: "SF", driver: "sf", method: "self", trade: "pnt", prod: 20, mat: 0.7, waste: 5, equip: 0.03 },
    { code: "14-200", div: 12, name: "Flooring (LVP & carpet)", uom: "SF", driver: "sf", factor: 0.92, method: "sub", rate: 4.75 },
    { code: "14-300", div: 12, name: "Tile (wet areas & backsplash)", uom: "unit", driver: "units", method: "sub", rate: { sfr: 6200, btr: 3400, th: 4200, mf: 2600 } },
    { code: "14-400", div: 12, name: "Interior doors, trim & millwork", uom: "SF", driver: "sf", method: "sub", rate: 3.25 },
    { code: "14-500", div: 12, name: "Mirrors, shower glass & bath accessories", uom: "unit", driver: "units", method: "sub", rate: { sfr: 2400, btr: 1500, th: 1700, mf: 1100 } },

    { code: "15-100", div: 13, name: "Cabinets & countertops", uom: "unit", driver: "units", method: "sub", rate: { sfr: 16500, btr: 9800, th: 11500, mf: 7800 } },
    { code: "15-200", div: 13, name: "Appliance package", uom: "unit", driver: "units", method: "sub", rate: { sfr: 6200, btr: 4200, th: 4800, mf: 3900 } },
    { code: "15-300", div: 13, name: "Window coverings", uom: "unit", driver: "units", method: "sub", rate: { sfr: 0, btr: 650, th: 0, mf: 550 } },
    { code: "15-400", div: 13, name: "Mailboxes, signage & specialties", uom: "LS", driver: "ls", method: "sub", rate: { sfr: 35000, btr: 40000, th: 38000, mf: 65000 } },

    { code: "16-100", div: 14, name: "Landscape & irrigation", uom: "unit", driver: "units", method: "sub", rate: { sfr: 4500, btr: 3800, th: 2800, mf: 2600 } },
    { code: "16-200", div: 14, name: "Yard walls, fencing & gates", uom: "unit", driver: "units", method: "sub", rate: { sfr: 5200, btr: 2600, th: 1500, mf: 300 } },
    { code: "16-300", div: 14, name: "Final clean", uom: "SF", driver: "sf", method: "self", trade: "lab", prod: 120, mat: 0.04, waste: 0, equip: 0 },
  ];

  const GC_ITEMS = [
    { name: "Superintendent", basis: "month", rate: 14500 },
    { name: "Project manager (allocated share)", basis: "month", rate: 8000 },
    { name: "Assistant PM / project engineer (share)", basis: "month", rate: 4500 },
    { name: "Field office trailer & furnishings", basis: "month", rate: 1200 },
    { name: "Temporary power & water", basis: "month", rate: 1800 },
    { name: "Portable toilets & hand wash", basis: "month", rate: 900 },
    { name: "Dumpsters & haul-off", basis: "month", rate: 4500 },
    { name: "Temporary fencing & screening", basis: "month", rate: 800 },
    { name: "Site security & cameras", basis: "month", rate: 2500 },
    { name: "Vehicles & fuel", basis: "month", rate: 1200 },
    { name: "Small tools & consumables", basis: "month", rate: 1500 },
    { name: "Project software & document control", basis: "month", rate: 600 },
    { name: "Mobilization & demobilization", basis: "ls", rate: 15000 },
    { name: "Testing & special inspections", basis: "ls", rate: 45000 },
    { name: "Punch list & warranty reserve", basis: "ls", rate: 25000 },
  ];

  const MARKUPS = {
    contingencyPct: 3.0, // of direct cost
    glPct: 1.1, // of contract before tax
    brPct: 0.35, // builder's risk
    bondPct: 0.0, // private work. Enter if the lender requires P&P bonds.
    feePct: 6.0, // of cost
    tptOn: true,
    tptRatePct: 9.1, // Phoenix combined rate. Confirm ADOR business code 015.
    tptBasePct: 65, // prime contracting base, 65% of gross
  };

  const PROFORMA = {
    softPct: 6.3, // NAHB: permits, A/E, impact, water & sewer fees as share of construction cost
    financePct: 1.5,
    overheadPct: 5.7,
    marketingPct: 0.8,
    commissionPct: 2.8,
  };

  const CLIENT_DATA_NEEDED = {
    estimating: [
      ["Crew wages by trade", "What you actually pay each classification, plus overtime patterns."],
      ["Real labor burden", "Payroll tax rates, workers comp rates by class code, your EMR, benefits per hour."],
      ["Production rates from closed jobs", "Labor hours per unit of work for every self-performed scope."],
      ["Current supplier quotes", "Lumber package, concrete per CY, trusses, drywall, windows, tile roof."],
      ["Recent sub bids by scope", "Two or three recent bids per scope to level and benchmark."],
      ["Plans and specs", "Unit mix, square footage, finish level, elevations, and options."],
      ["Site data", "Acreage, geotech report, utility locations, offsite improvements."],
      ["General conditions history", "Staff costs, owned vs rented equipment, typical durations."],
      ["Markup policy", "Fee, contingency, insurance rates, bonding requirements, TPT handling."],
      ["Developer assumptions", "Land basis, soft cost budget, loan terms, sales or exit values."],
    ],
    admin: [
      ["Lender draw requirements", "Required forms, retainage terms, inspection schedule, title requirements."],
      ["Sub and supplier list", "Contract values, contacts, and payment history."],
      ["Change order history", "Approved and pending COs with backup."],
      ["Cost codes", "Your accounting cost codes, so the SOV maps to job cost."],
      ["Closeout requirements", "What the owner, lender, and city require to close the job."],
    ],
  };

  const DRAW_CHECKLIST = [
    "Pay application: summary sheet and continuation sheet, signed",
    "Change order log, updated",
    "Conditional waivers from subs and suppliers for this period",
    "Unconditional waivers from subs and suppliers for last period's payments",
    "GC conditional waiver for this draw",
    "GC unconditional waiver for the last draw received",
    "Stored materials backup (invoices, bill of sale, insurance, photos)",
    "Sub and supplier invoices for this period",
    "Updated schedule",
    "Lender inspector site visit",
    "Title date-down endorsement",
    "Project-specific affidavits or certifications",
    "Insurance certificates current",
  ];

  const CLOSEOUT = [
    ["Inspections & approvals", "Final building inspections, all buildings", "Superintendent"],
    ["Inspections & approvals", "Certificate of Occupancy issued", "Project manager"],
    ["Inspections & approvals", "Fire marshal final (sprinklers, alarm, access)", "Superintendent"],
    ["Inspections & approvals", "Civil acceptance: paving, water, sewer, storm", "Project manager"],
    ["Inspections & approvals", "Grading & drainage as-built certification", "Civil engineer"],
    ["Punch list", "Owner punch walk completed", "Superintendent"],
    ["Punch list", "Punch list items closed and signed off", "Superintendent"],
    ["Punch list", "Final clean complete", "Superintendent"],
    ["Documents to owner", "As-built drawings", "Project manager"],
    ["Documents to owner", "O&M manuals and equipment data", "Project manager"],
    ["Documents to owner", "Warranties: GC one-year, roofing, windows, HVAC, appliances, water heaters", "Project manager"],
    ["Documents to owner", "Attic stock and extra materials turned over", "Superintendent"],
    ["Documents to owner", "Keys, access codes, and gate remotes turned over", "Superintendent"],
    ["Documents to owner", "Owner staff training on building systems", "Project manager"],
    ["Financial", "Final change order reconciliation", "Project accountant"],
    ["Financial", "Unconditional final waivers from every sub and supplier", "Project accountant"],
    ["Financial", "GC conditional final waiver to owner", "Project accountant"],
    ["Financial", "Final pay application and retainage release", "Project accountant"],
    ["Financial", "Consent of surety (if bonded)", "Project accountant"],
    ["Financial", "Notice of Completion recorded by owner (A.R.S. 33-993)", "Owner"],
    ["Environmental & permits", "AZPDES stormwater Notice of Termination filed with ADEQ", "Project manager"],
    ["Environmental & permits", "Maricopa County dust control permit closed", "Project manager"],
    ["Environmental & permits", "Subdivision assurances or bonds released", "Project manager"],
    ["Turnover", "Utilities transferred to owner (water, electric, gas)", "Project manager"],
    ["Turnover", "Builder's risk ended and owner property coverage in place", "Project accountant"],
    ["Turnover", "Eleven-month warranty walk scheduled", "Project manager"],
  ];

  // City of Phoenix review goals (initial review, calendar days) and last-month averages, Sept 2026 report.
  const PHX_REVIEWS = [
    { id: "cb-major", group: "Commercial building plans", name: "Major (over 50,000 SF and over $5M)", goal: 45, avg: 30, admin: 10, subst: 90 },
    { id: "cb-med", group: "Commercial building plans", name: "Medium (5,000 to 50,000 SF, $350K to $5M)", goal: 35, avg: 33, admin: 10, subst: 70 },
    { id: "cb-minor", group: "Commercial building plans", name: "Minor (under 5,000 SF or under $350K)", goal: 25, avg: 25 },
    { id: "rb-std", group: "Residential building plans", name: "Custom & standard plans", goal: 30, avg: 32 },
    { id: "rb-major", group: "Residential building plans", name: "Major remodel & addition", goal: 30, avg: 34 },
    { id: "rb-minor", group: "Residential building plans", name: "Minor remodel & addition", goal: 20, avg: 22 },
    { id: "rb-plot", group: "Residential building plans", name: "Plot plan (standard-plan homes, pools)", goal: 5, avg: 4 },
    { id: "cv-major", group: "Civil plans", name: "Major (16+ sheets, over 20 acres, or 50 lots)", goal: 30, avg: 46, admin: 10, subst: 60 },
    { id: "cv-med", group: "Civil plans", name: "Medium (7 to 15 sheets, 3 to 20 acres, or 15 to 50 lots)", goal: 25, avg: 34 },
    { id: "cv-minor", group: "Civil plans", name: "Minor (6 sheets or fewer, or under 15 lots)", goal: 20, avg: 43 },
    { id: "cv-land", group: "Civil plans", name: "Landscape", goal: 30, avg: 18 },
    { id: "sp-pre", group: "Site plans", name: "Major pre-application", goal: 28, avg: 45 },
    { id: "sp-prelim", group: "Site plans", name: "Major preliminary", goal: 30, avg: 44 },
    { id: "sp-major", group: "Site plans", name: "Major site plan (final review)", goal: 30, avg: 41 },
    { id: "sp-minor", group: "Site plans", name: "Minor site plan (final review)", goal: 20, avg: 41 },
  ];

  const PHX_DESKS = [
    "Intake / administrative review",
    "Site planning",
    "Civil: grading & drainage",
    "Civil: water & sewer",
    "Civil: paving & streets",
    "Landscape review",
    "Zoning",
    "Building: structural",
    "Building: MEP",
    "Fire plan review",
    "Water Services: capacity",
    "Street Transportation",
    "Addressing",
    "Applicant: design team corrections",
    "Applicant: owner sign-off",
    "Permit issuance / fees",
  ];

  window.GCW_DATA = { SOURCES, TRADES, BURDEN, PRODUCTS, DIVISIONS, SCOPES, GC_ITEMS, MARKUPS, PROFORMA, CLIENT_DATA_NEEDED, DRAW_CHECKLIST, CLOSEOUT, PHX_REVIEWS, PHX_DESKS };
})();
