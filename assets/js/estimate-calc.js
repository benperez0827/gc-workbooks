/* Estimate model: build from template, calculate, summarize. Shared by the Estimating and Admin workbooks. */
(function () {
  "use strict";
  const D = window.GCW_DATA;
  const { uid, clone, num } = window.GCW;

  function pick(v, product) {
    if (v && typeof v === "object") return v[product] ?? 0;
    return v ?? 0;
  }

  function newEstimate(product = "btr") {
    const p = D.PRODUCTS[product];
    const lines = [];
    D.SCOPES.forEach((s) => {
      const rate = pick(s.rate, product);
      if (s.method === "sub" && !rate) return; // scope not used for this product
      lines.push({
        id: uid(),
        code: s.code,
        div: D.DIVISIONS[s.div],
        name: s.name,
        uom: s.uom,
        driver: s.driver,
        factor: pick(s.factor ?? 1, product),
        qtyOverride: null,
        method: s.method,
        rate: rate,
        trade: s.trade || "lab",
        prod: pick(s.prod ?? 10, product),
        mat: pick(s.mat ?? 0, product),
        waste: pick(s.waste ?? 0, product),
        equip: pick(s.equip ?? 0, product),
        vendor: "",
        notes: s.notes || "",
      });
    });
    const est = {
      version: 1,
      project: {
        name: product === "btr" ? "Desert Willow BTR (demo)" : `Demo ${p.label} project`,
        client: "Sample Developer LLC",
        location: "Phoenix, AZ",
        product,
        units: p.units,
        sf: p.sf,
        bldgs: p.bldgs,
        acres: p.acres,
        months: p.months,
        start: "2027-02-01",
        notes: "",
      },
      trades: clone(D.TRADES),
      burden: clone(D.BURDEN),
      divisions: clone(D.DIVISIONS),
      lines,
      gc: D.GC_ITEMS.map((g) => Object.assign({ id: uid() }, g)),
      markups: clone(D.MARKUPS),
      proforma: Object.assign(clone(D.PROFORMA), { value: p.value, land: p.land, rent: p.rent || 0 }),
      bids: [],
    };
    addDemoBids(est);
    return est;
  }

  // Sample bids so the leveling sheet has something to show. Bidder names are fictional.
  function addDemoBids(est) {
    const r500 = (v) => Math.round(v / 500) * 500;
    const plan = [
      ["08-100", [["Demo Stucco & Windows LLC", 0.963, 0, "Includes color coat and foam trim"], ["Sample Plaster Co.", 0.919, 0.063, "Excludes foam trim and window wraps. Added back at budget"], ["Example Exteriors Inc.", 1.037, 0, "Full scope. Two-week mobilization"]], -1],
      ["09-100", [["Demo Plumbing Inc.", 0.979, 0, "Full scope incl. fixtures"], ["Sample Pipe & Drain", 1.02, 0, "Full scope"], ["Example Plumbing LLC", 0.95, 0.06, "Excludes water heaters' venting and gas line. Added back"]], 0],
    ];
    plan.forEach(([code, bidders, awardIdx]) => {
      const line = est.lines.find((l) => l.code === code);
      if (!line) return;
      const lc = calcLine(est, line);
      bidders.forEach(([bidder, f, adj, notes], i) => {
        est.bids.push({ id: uid(), lineId: line.id, bidder, base: r500(lc.total * f), adj: r500(lc.total * adj), notes, awarded: false });
      });
      if (awardIdx >= 0) {
        const b = est.bids.filter((x) => x.lineId === line.id)[awardIdx];
        b.awarded = true;
        b.budgetAtAward = lc.total;
        line.rate = lc.qty ? (b.base + b.adj) / lc.qty : b.base + b.adj;
        line.vendor = b.bidder;
      }
    });
  }

  function loadedRate(est, tradeId) {
    const t = est.trades.find((x) => x.id === tradeId);
    if (!t) return 0;
    const b = est.burden;
    return num(t.wage) * (1 + num(b.payrollTaxPct) / 100 + num(t.wc) / 100 + num(b.ptoPct) / 100) + num(b.benefitsPerHr);
  }

  function driverValue(project, driver) {
    switch (driver) {
      case "units": return num(project.units);
      case "sf": return num(project.units) * num(project.sf);
      case "acres": return num(project.acres);
      case "bldgs": return num(project.bldgs);
      default: return 1;
    }
  }

  function calcLine(est, l) {
    const autoQty = num(l.factor) * driverValue(est.project, l.driver);
    const qty = l.qtyOverride === null || l.qtyOverride === "" || l.qtyOverride === undefined ? autoQty : num(l.qtyOverride);
    const r = { qty, autoQty, hours: 0, labor: 0, mat: 0, equip: 0, sub: 0, total: 0, unitCost: 0, rate: 0 };
    if (l.method === "self") {
      r.rate = loadedRate(est, l.trade);
      r.hours = num(l.prod) > 0 ? qty / num(l.prod) : 0;
      r.labor = r.hours * r.rate;
      r.mat = qty * num(l.mat) * (1 + num(l.waste) / 100);
      r.equip = qty * num(l.equip);
    } else {
      r.sub = qty * num(l.rate);
    }
    r.total = r.labor + r.mat + r.equip + r.sub;
    r.unitCost = qty ? r.total / qty : 0;
    return r;
  }

  function calc(est) {
    const p = est.project;
    const units = num(p.units);
    const totalSF = units * num(p.sf);
    const lineCalcs = {};
    const byDiv = {};
    let direct = 0, labor = 0, mat = 0, equip = 0, sub = 0, hours = 0;
    est.lines.forEach((l) => {
      const c = calcLine(est, l);
      lineCalcs[l.id] = c;
      direct += c.total; labor += c.labor; mat += c.mat; equip += c.equip; sub += c.sub; hours += c.hours;
      byDiv[l.div] = (byDiv[l.div] || 0) + c.total;
    });
    let gcTotal = 0;
    const gcCalcs = {};
    est.gc.forEach((g) => {
      const qty = g.basis === "month" ? (g.months === undefined || g.months === "" || g.months === null ? num(p.months) : num(g.months)) : 1;
      const t = qty * num(g.rate);
      gcCalcs[g.id] = { qty, total: t };
      gcTotal += t;
    });
    const m = est.markups;
    const contingency = direct * num(m.contingencyPct) / 100;
    const cost = direct + gcTotal + contingency;
    const fee = cost * num(m.feePct) / 100;
    const subtotal = cost + fee;
    const insPct = (num(m.glPct) + num(m.brPct) + num(m.bondPct)) / 100;
    const insurance = subtotal * insPct;
    const beforeTax = subtotal + insurance;
    const tpt = m.tptOn ? beforeTax * (num(m.tptRatePct) / 100) * (num(m.tptBasePct) / 100) : 0;
    const contract = beforeTax + tpt;

    const pf = est.proforma;
    const revenue = units * num(pf.value);
    const land = units * num(pf.land);
    const soft = contract * num(pf.softPct) / 100;
    const finance = revenue * num(pf.financePct) / 100;
    const overhead = revenue * num(pf.overheadPct) / 100;
    const marketing = revenue * num(pf.marketingPct) / 100;
    const commission = revenue * num(pf.commissionPct) / 100;
    const devCost = land + contract + soft + finance + overhead + marketing + commission;
    const profit = revenue - devCost;
    const annualRent = units * num(pf.rent) * 12;

    return {
      lineCalcs, gcCalcs, byDiv, units, totalSF,
      direct, labor, mat, equip, sub, hours,
      gcTotal, contingency, cost, fee, insurance, beforeTax, tpt, contract,
      perUnit: units ? contract / units : 0,
      perSF: totalSF ? contract / totalSF : 0,
      feeMargin: contract ? fee / contract : 0,
      dev: { revenue, land, hard: contract, soft, finance, overhead, marketing, commission, devCost, profit, margin: revenue ? profit / revenue : 0, perUnitProfit: units ? profit / units : 0, perUnitCost: units ? devCost / units : 0, annualRent, rentYield: devCost && annualRent ? annualRent / devCost : 0 },
    };
  }

  // NAHB 2024 stage shares (national, single-family) mapped to our divisions.
  const NAHB_STAGES = [
    { name: "Site work & utilities", share: 0.076, divs: ["02", "03"] },
    { name: "Foundations", share: 0.105, divs: ["05"] },
    { name: "Framing", share: 0.166, divs: ["06"] },
    { name: "Exterior finishes", share: 0.134, divs: ["07", "08"] },
    { name: "Major systems rough-ins", share: 0.192, divs: ["09", "10", "11", "12"] },
    { name: "Interior finishes", share: 0.241, divs: ["13", "14", "15"] },
    { name: "Final steps (paving, landscape, amenities)", share: 0.065, divs: ["04", "16"] },
  ];
  function benchmark(est, c) {
    const rows = NAHB_STAGES.map((s) => {
      const amt = Object.entries(c.byDiv).filter(([d]) => s.divs.includes(d.slice(0, 2))).reduce((a, [, v]) => a + v, 0);
      return { name: s.name, nahb: s.share, amt };
    });
    const mapped = rows.reduce((a, r) => a + r.amt, 0);
    rows.forEach((r) => (r.share = mapped ? r.amt / mapped : 0));
    return rows;
  }

  // Build a schedule of values from an estimate. Totals tie to the contract to the dollar.
  function buildSOV(est, mode = "division", gcSeparate = true) {
    const c = calc(est);
    const raw = [];
    if (mode === "line") {
      est.lines.forEach((l) => raw.push({ desc: `${l.code} ${l.name}`, value: c.lineCalcs[l.id].total, source: l.id }));
    } else {
      est.divisions.forEach((d) => { if (c.byDiv[d]) raw.push({ desc: d, value: c.byDiv[d], source: d }); });
    }
    const extras = [
      { desc: "General conditions", value: c.gcTotal, source: "gc" },
      { desc: "Contractor contingency", value: c.contingency, source: "contingency" },
      { desc: "Insurance & bonds", value: c.insurance, source: "insurance" },
      { desc: "Contractor fee", value: c.fee, source: "fee" },
      { desc: "Prime contracting TPT", value: c.tpt, source: "tpt" },
    ].filter((x) => x.value > 0);
    let lines;
    if (gcSeparate) {
      lines = raw.concat(extras);
    } else {
      const base = raw.reduce((a, r) => a + r.value, 0);
      const add = extras.reduce((a, r) => a + r.value, 0);
      lines = raw.map((r) => Object.assign({}, r, { value: base ? r.value + (add * r.value) / base : r.value }));
    }
    const target = Math.round(c.contract);
    lines.forEach((l) => (l.value = Math.round(l.value)));
    const diff = target - lines.reduce((a, l) => a + l.value, 0);
    if (lines.length) lines[lines.length - 1].value += diff;
    return lines.map((l, i) => ({ id: uid(), item: String(i + 1), desc: l.desc, value: l.value, source: l.source }));
  }

  window.GCW_EST = { newEstimate, calc, calcLine, loadedRate, driverValue, buildSOV, benchmark, pick };
})();
