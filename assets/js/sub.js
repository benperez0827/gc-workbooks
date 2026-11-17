/* Subcontractor workbook: multi-job billing hub, sub pay apps to the GC, change order requests and T&M tickets,
   lien waivers, and Arizona preliminary 20-day notice tracking. */
(function () {
  "use strict";
  const G = window.GCW;
  const { fmt, num, esc, uid, save, load, toast, tabs, stamp, daysBetween, addDays } = G;
  const W = window.GCW_WAIVERS;
  const $ = (s) => document.querySelector(s);

  // ---------- demo data ----------
  function line(type, desc, qty, unit, cost) { return { id: uid(), type, desc, qty, unit, cost }; }
  function sov(items) { return items.map(([desc, value], i) => ({ id: uid(), item: String(i + 1), desc, value })); }
  function apps(sovList, plan, meta) {
    // plan: array of cumulative % per SOV index, per app. meta: [{periodTo, appDate, status, paidDate, stored:{idx:amt}}]
    return plan.map((cum, k) => {
      const lines = {};
      sovList.forEach((s, i) => {
        const prev = k ? plan[k - 1][i] || 0 : 0;
        const w = Math.round(((cum[i] || 0) - prev) * s.value);
        const st = (meta[k].stored || {})[i] || 0;
        if (w || st) lines[s.id] = { work: w, stored: st };
      });
      return { id: uid(), no: k + 1, periodTo: meta[k].periodTo, appDate: meta[k].appDate, status: meta[k].status, paidDate: meta[k].paidDate || "", retPct: 5, sretPct: 5, lines };
    });
  }

  function demo() {
    const company = {
      name: "Demo Plumbing Inc.", address: "300 Sample Rd, Tempe, AZ 85281", roc: "ROC 000000 (sample)", contact: "office@demoplumbing.example",
      signer: "", signerTitle: "Owner", matMarkup: 15, ohpPct: 15, subMarkup: 10,
      rates: [{ id: "fm", cls: "Foreman", rate: 98 }, { id: "jp", cls: "Journeyman plumber", rate: 86 }, { id: "ap", cls: "Apprentice", rate: 58 }, { id: "lb", cls: "Laborer", rate: 52 }],
    };

    // Job 1: the GC demo project
    const s1 = sov([["Mobilization & submittals", 12000], ["Underground plumbing", 148000], ["Rough-in / top-out", 176000], ["Water heaters", 84000], ["Fixtures & trim", 118000], ["Gas piping", 18000], ["Testing, permits & closeout", 12000]]);
    const a1 = apps(s1, [[0.5], [1, 0.4], [1, 0.85, 0.1]], [
      { periodTo: "2027-02-28", appDate: "2027-02-20", status: "Paid", paidDate: "2027-03-27" },
      { periodTo: "2027-03-31", appDate: "2027-03-20", status: "Paid", paidDate: "2027-04-28" },
      { periodTo: "2027-04-30", appDate: "2027-04-20", status: "Submitted", stored: { 3: 42000 } },
    ]);
    const t1 = { id: uid(), no: "T-001", date: "2027-04-02", desc: "Relocate sewer stub at Bldg 12. Conflict with dry utility trench.", signedBy: "GC superintendent (sample)", status: "On COR", lines: [line("Labor", "Foreman", 4, "hr", 98), line("Labor", "Journeyman plumber", 8, "hr", 86), line("Labor", "Apprentice", 8, "hr", 58), line("Material", "4-inch PVC, fittings, cleanout", 1, "LS", 640)] };
    const t2 = { id: uid(), no: "T-002", date: "2027-05-04", desc: "Re-cut and re-set cleanouts damaged by grading sub at Bldgs 3 to 6.", signedBy: "GC superintendent (sample)", status: "Open", lines: [line("Labor", "Journeyman plumber", 6, "hr", 86), line("Labor", "Apprentice", 6, "hr", 58), line("Material", "Cleanout fittings & covers", 1, "LS", 180)] };
    const cor1 = { id: uid(), no: "COR-001", title: "Relocate sewer stub at Bldg 12", desc: "Field conflict with the dry utility trench. Work performed on T&M ticket T-001 at the superintendent's direction.", date: "2027-04-05", status: "Approved", approvedDate: "2027-04-12", days: 0, gcRef: "PCO-007", lines: t1.lines.map((l) => Object.assign({}, l, { id: uid() })).concat([line("Equipment", "Mini excavator, 1 day", 1, "day", 450)]) };
    t1.corId = cor1.id;
    const cor2 = { id: uid(), no: "COR-002", title: "Add hose bibbs at 20 units (owner request)", desc: "Add one rear-yard hose bibb with vacuum breaker at units 1 to 20, including stub-out and patch by others.", date: "2027-04-28", status: "Submitted", approvedDate: "", days: 2, gcRef: "", lines: [line("Material", "Hose bibbs, valves, copper", 20, "ea", 68), line("Labor", "Journeyman plumber", 40, "hr", 86), line("Labor", "Apprentice", 40, "hr", 58)] };
    const job1 = {
      id: uid(), name: "Desert Willow BTR (demo)", address: "Sample site, Phoenix, AZ", gc: "Sample Builders, Inc.", gcAddress: "100 Sample Way, Phoenix, AZ 85004", owner: "Sample Developer LLC", lender: "Sample Construction Lender, N.A.",
      jobNo: "DP-2701", gcContractNo: "SC-2701-09", contractDate: "2027-01-28", billingDay: 20, payDays: 30, scope: "Plumbing, 40-unit build-to-rent community",
      sov: s1, apps: a1, cors: [cor1, cor2], tickets: [t1, t2],
      prelim: { firstFurnish: "2027-02-08", served: "2027-02-15", estPrice: 568000, owner: true, gc: true, lender: true, hiring: true, method: "Certified mail" },
      finalInspection: "", nocRecorded: "",
      suppliers: [{ id: uid(), name: "Demo Plumbing Supply Co.", thisPeriod: 61500, paidLast: 22000 }, { id: uid(), name: "Demo Water Heater Distributor", thisPeriod: 42000, paidLast: 0 }],
    };

    // Job 2: slow-paying GC, late prelim, amended notice needed
    const s2 = sov([["Underground plumbing", 95000], ["Rough-in / top-out", 135000], ["Water heaters", 48000], ["Fixtures & trim", 112000], ["Testing & closeout", 20000]]);
    const a2 = apps(s2, [[0.6], [1, 0.2], [1, 0.55], [1, 0.85, 0.5], [1, 1, 1, 0.25], [1, 1, 1, 0.6]], [
      { periodTo: "2026-11-30", appDate: "2026-11-20", status: "Paid", paidDate: "2027-01-02" },
      { periodTo: "2026-12-31", appDate: "2026-12-20", status: "Paid", paidDate: "2027-02-03" },
      { periodTo: "2027-01-31", appDate: "2027-01-20", status: "Paid", paidDate: "2027-03-01" },
      { periodTo: "2027-02-28", appDate: "2027-02-20", status: "Paid", paidDate: "2027-04-02" },
      { periodTo: "2027-03-31", appDate: "2027-03-20", status: "Submitted" },
      { periodTo: "2027-04-30", appDate: "2027-04-20", status: "Submitted" },
    ]);
    const cor3 = { id: uid(), no: "COR-001", title: "Upsize water service to 2-inch", desc: "Revised civil plans upsized the domestic water service at Bldgs A to D.", date: "2027-01-25", status: "Approved", approvedDate: "2027-02-10", days: 3, gcRef: "CO-04", lines: [line("Material", "Copper pipe & fittings", 1, "LS", 14200), line("Labor", "Journeyman plumber", 140, "hr", 86), line("Labor", "Apprentice", 80, "hr", 58), line("Equipment", "Trencher", 3, "day", 350)] };
    const job2 = {
      id: uid(), name: "Saguaro Ridge Townhomes (demo)", address: "Sample site, Mesa, AZ", gc: "Sample Homes LLC", gcAddress: "50 Sample Blvd, Mesa, AZ 85201", owner: "Sample Townhome Partners LP", lender: "Sample Bank",
      jobNo: "DP-2614", gcContractNo: "", contractDate: "2026-10-01", billingDay: 20, payDays: 30, scope: "Plumbing, 48 townhomes",
      sov: s2, apps: a2, cors: [cor3], tickets: [],
      prelim: { firstFurnish: "2026-10-12", served: "2026-11-09", estPrice: 340000, owner: true, gc: true, lender: true, hiring: true, method: "Certified mail" },
      finalInspection: "", nocRecorded: "", suppliers: [{ id: uid(), name: "Demo Plumbing Supply Co.", thisPeriod: 38000, paidLast: 0 }],
    };

    // Job 3: finished, retainage still owed, lien clock running
    const s3 = sov([["Rough-in", 41000], ["Fixtures & trim", 38500], ["Water heater & recirculation", 9000], ["Testing & closeout", 8000]]);
    const a3 = apps(s3, [[0.6], [1, 0.3, 1], [1, 0.9, 1, 0.5], [1, 1, 1, 1]], [
      { periodTo: "2026-10-31", appDate: "2026-10-20", status: "Paid", paidDate: "2026-11-24" },
      { periodTo: "2026-11-30", appDate: "2026-11-20", status: "Paid", paidDate: "2026-12-22" },
      { periodTo: "2026-12-31", appDate: "2026-12-20", status: "Paid", paidDate: "2027-01-25" },
      { periodTo: "2027-01-31", appDate: "2027-01-20", status: "Paid", paidDate: "2027-02-26" },
    ]);
    const job3 = {
      id: uid(), name: "Mesa Clinic TI (demo)", address: "Sample suite, Mesa, AZ", gc: "Example Commercial Builders", gcAddress: "75 Sample Pkwy, Phoenix, AZ 85016", owner: "Sample Medical Properties LLC", lender: "",
      jobNo: "DP-2608", gcContractNo: "", contractDate: "2026-09-01", billingDay: 25, payDays: 30, scope: "Plumbing, medical office tenant improvement",
      sov: s3, apps: a3, cors: [], tickets: [],
      prelim: { firstFurnish: "2026-09-14", served: "2026-09-21", estPrice: 96500, owner: true, gc: true, lender: false, hiring: true, method: "Certified mail" },
      finalInspection: "2027-02-15", nocRecorded: "", suppliers: [],
    };

    return { asOf: "2027-05-10", company, jobs: [job1, job2, job3] };
  }

  let S = load("sub");
  if (!S || !S.jobs) { S = demo(); save("sub", S); }
  const ui = { job: 0, app: null, cor: null, ticket: null };
  const asOf = () => S.asOf || G.today();
  const job = () => S.jobs[Math.min(ui.job, S.jobs.length - 1)];

  // ---------- math ----------
  function corCalc(c) {
    const by = { Labor: 0, Material: 0, Equipment: 0, "Sub-tier": 0 };
    (c.lines || []).forEach((l) => (by[l.type] = (by[l.type] || 0) + num(l.qty) * num(l.cost)));
    const co = S.company;
    const mm = by.Material * num(co.matMarkup) / 100;
    const ohp = (by.Labor + by.Equipment) * num(co.ohpPct) / 100;
    const sm = by["Sub-tier"] * num(co.subMarkup) / 100;
    const total = by.Labor + by.Material + by.Equipment + by["Sub-tier"] + mm + ohp + sm;
    return { by, mm, ohp, sm, total: Math.round(total * 100) / 100 };
  }
  // Same billing math as the GC admin workbook, for one job.
  function calcApp(j, idx) {
    const app = j.apps[idx];
    const ret = num(app.retPct) / 100, sret = num(app.sretPct) / 100;
    const cos = j.cors.filter((c) => c.status === "Approved" && (!c.approvedDate || c.approvedDate <= app.periodTo));
    const rows = j.sov.map((s) => ({ key: s.id, item: s.item, desc: s.desc, C: num(s.value), isCO: false }))
      .concat(cos.map((c, i) => ({ key: c.id, item: String(j.sov.length + i + 1), desc: `${c.no} ${c.title}`, C: corCalc(c).total, isCO: true })));
    const t = { C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, DE: 0 };
    rows.forEach((r) => {
      r.D = 0;
      for (let k = 0; k < idx; k++) r.D += num(j.apps[k].lines[r.key]?.work);
      r.E = num(app.lines[r.key]?.work);
      r.F = num(app.lines[r.key]?.stored);
      r.G = r.D + r.E + r.F; r.pct = r.C ? r.G / r.C : 0; r.H = r.C - r.G; r.I = (r.D + r.E) * ret + r.F * sret;
      ["C", "D", "E", "F", "G", "H", "I"].forEach((k) => (t[k] += r[k])); t.DE += r.D + r.E;
    });
    const l1 = j.sov.reduce((a, s) => a + num(s.value), 0);
    const l2 = cos.reduce((a, c) => a + corCalc(c).total, 0);
    const l3 = l1 + l2, l4 = t.G, l5a = t.DE * ret, l5b = t.F * sret, l5 = l5a + l5b, l6 = l4 - l5;
    const l7 = idx > 0 ? calcApp(j, idx - 1).g.l6 : 0;
    const prev = idx > 0 ? j.apps[idx - 1].periodTo : "";
    const coPrev = cos.filter((c) => prev && c.approvedDate && c.approvedDate <= prev);
    const coThis = cos.filter((c) => !coPrev.includes(c));
    const add = (arr) => arr.reduce((a, c) => a + Math.max(0, corCalc(c).total), 0);
    const ded = (arr) => arr.reduce((a, c) => a + Math.min(0, corCalc(c).total), 0);
    return { rows, t, g: { l1, l2, l3, l4, l5a, l5b, l5, l6, l7, l8: l6 - l7, l9: l3 - l6, ret, sret, coPrevAdd: add(coPrev), coPrevDed: ded(coPrev), coThisAdd: add(coThis), coThisDed: ded(coThis) } };
  }
  function jobSummary(j) {
    const n = j.apps.length;
    const g = n ? calcApp(j, n - 1).g : null;
    const revised = j.sov.reduce((a, s) => a + num(s.value), 0) + j.cors.filter((c) => c.status === "Approved").reduce((a, c) => a + corCalc(c).total, 0);
    const open = j.apps.map((a, i) => ({ a, due: calcApp(j, i).g.l8 })).filter((x) => x.a.status === "Submitted" && x.due > 0);
    const openAR = open.reduce((s, x) => s + x.due, 0);
    const ages = open.map((x) => daysBetween(x.a.appDate, asOf()));
    const pendingCOR = j.cors.filter((c) => c.status === "Submitted").reduce((a, c) => a + corCalc(c).total, 0);
    const openTM = j.tickets.filter((t) => t.status === "Open").reduce((a, t) => a + corCalc(t).total, 0);
    return { revised, billed: g ? g.l4 : 0, ret: g ? g.l5 : 0, openAR, oldest: ages.length ? Math.max(...ages) : 0, open, pendingCOR, openTM, pct: revised ? (g ? g.l4 : 0) / revised : 0 };
  }
  function nextBilling(j) {
    const d = new Date(asOf() + "T12:00:00");
    const day = Math.min(28, num(j.billingDay) || 20);
    let target = new Date(d.getFullYear(), d.getMonth(), day, 12);
    if (target < d) target = new Date(d.getFullYear(), d.getMonth() + 1, day, 12);
    return target.toISOString().slice(0, 10);
  }
  function prelimStatus(j) {
    const p = j.prelim || {};
    if (!p.firstFurnish) return { label: "Not started", color: "gray", notes: [] };
    const deadline = addDays(p.firstFurnish, 20);
    const notes = [];
    let label, color;
    if (!p.served) {
      const left = daysBetween(asOf(), deadline);
      label = left >= 0 ? `Serve in ${left} days` : "Not served"; color = left >= 0 ? "amber" : "red";
      notes.push(left >= 0 ? `Due ${fmt.date(deadline)}.` : `Past due since ${fmt.date(deadline)}. Serve now. It reaches back only 20 days from service.`);
    } else if (p.served > deadline) {
      label = "Served late"; color = "amber";
      notes.push(`Served ${daysBetween(p.firstFurnish, p.served)} days after first furnishing. Coverage starts ${fmt.date(addDays(p.served, -20))}.`);
    } else { label = "Served on time"; color = "green"; }
    const missing = [["owner", "owner"], ["gc", "GC"], ["lender", "lender"], ["hiring", "hiring party"]].filter(([k]) => !p[k] && !(k === "lender" && !j.lender) && !(k === "hiring")).map(([, l]) => l);
    if (p.served && missing.length) { notes.push(`Not marked served on: ${missing.join(", ")}.`); color = "red"; }
    const revised = jobSummary(j).revised;
    if (p.served && num(p.estPrice) && revised >= num(p.estPrice) * 1.3) {
      notes.push(`Contract is now ${fmt.money(revised)}, ${fmt.pct(revised / num(p.estPrice) - 1, 0)} over the ${fmt.money(p.estPrice)} in the notice. Amended notice needed.`);
      label = "Amended notice due"; color = "red";
    }
    return { label, color, notes, deadline };
  }
  function lienDeadline(j) {
    if (j.nocRecorded) return { date: addDays(j.nocRecorded, 60), basis: "60 days after recorded notice of completion" };
    if (j.finalInspection) { const comp = addDays(j.finalInspection, 30); return { date: addDays(comp, 120), basis: `120 days after completion (${fmt.date(comp)}, 30 days after final inspection)` }; }
    return null;
  }

  // ---------- inputs ----------
  function inp(key, value, o = {}) {
    const type = o.type || "text";
    return `<input type="${type}" ${type === "number" ? 'step="any"' : ""} data-key="${key}" value="${esc(value ?? "")}" aria-label="${esc(o.label || key)}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""} ${o.cls ? `class="${o.cls}"` : ""} ${o.w ? `style="width:${o.w}"` : ""}>`;
  }
  function sel(key, value, options, label) {
    return `<select data-key="${key}" aria-label="${esc(label)}">${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`;
  }
  const field = (label, html, hint) => `<div class="field"><label>${label}</label>${html}${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  const jobPicker = () => `<div class="field" style="max-width:360px"><label>Job</label>${sel("ui:job", ui.job, S.jobs.map((j, i) => [i, `${j.name}  (${j.gc})`]), "Job")}</div>`;

  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-key]");
    if (!el) return;
    const k = el.dataset.key.split(":");
    const isNum = el.type === "number";
    const v = el.type === "checkbox" ? el.checked : isNum ? (el.value === "" ? 0 : num(el.value)) : el.value;
    const j = job();
    const findLine = (holder, id) => holder.lines.find((l) => l.id === id);
    switch (k[0]) {
      case "s": S[k[1]] = v; break;
      case "ui": ui[k[1]] = /^\d+$/.test(el.value) ? +el.value : el.value; if (k[1] === "job") { ui.app = null; ui.cor = null; ui.ticket = null; } break;
      case "co": S.company[k[1]] = v; break;
      case "rate": { const r = S.company.rates.find((x) => x.id === k[1]); if (r) r[k[2]] = v; break; }
      case "j": j[k[1]] = v; break;
      case "pre": j.prelim[k[1]] = v; break;
      case "pj": { const jj = S.jobs[+k[1]]; if (k[2] === "fi" || k[2] === "noc") jj[k[2] === "fi" ? "finalInspection" : "nocRecorded"] = v; else jj.prelim[k[2]] = v; break; }
      case "sov": { const s = j.sov.find((x) => x.id === k[1]); if (s) s[k[2]] = v; break; }
      case "app": { const a = j.apps[ui.app]; a[k[1]] = v; if (k[1] === "status" && v === "Paid" && !a.paidDate) a.paidDate = asOf(); break; }
      case "ln": {
        const a = j.apps[ui.app];
        a.lines[k[1]] = a.lines[k[1]] || { work: 0, stored: 0 };
        if (k[2] === "pct") { const r = calcApp(j, ui.app).rows.find((x) => x.key === k[1]); a.lines[k[1]].work = Math.round((num(el.value) / 100) * r.C - r.D - r.F); }
        else a.lines[k[1]][k[2]] = v;
        break;
      }
      case "cor": { const c = j.cors.find((x) => x.id === k[1]); if (c) { c[k[2]] = v; if (k[2] === "status" && v === "Approved" && !c.approvedDate) c.approvedDate = asOf(); } break; }
      case "tk": { const t = j.tickets.find((x) => x.id === k[1]); if (t) t[k[2]] = v; break; }
      case "cl": { const c = j.cors.find((x) => x.id === k[1]); const l = c && findLine(c, k[2]); if (l) { l[k[3]] = v; if (k[3] === "desc" && l.type === "Labor") { const r = S.company.rates.find((x) => x.cls === v); if (r) l.cost = r.rate; } } break; }
      case "tl": { const t = j.tickets.find((x) => x.id === k[1]); const l = t && findLine(t, k[2]); if (l) { l[k[3]] = v; if (k[3] === "desc" && l.type === "Labor") { const r = S.company.rates.find((x) => x.cls === v); if (r) l.cost = r.rate; } } break; }
      case "sup": { const s = j.suppliers.find((x) => x.id === k[1]); if (s) s[k[2]] = v; break; }
    }
    commit();
  });

  function commit() {
    const fk = document.activeElement?.dataset?.key;
    save("sub", S);
    renderAll();
    if (fk) { const f = document.querySelector(`[data-key="${CSS.escape(fk)}"]`); if (f) f.focus(); }
  }

  // ---------- renderers ----------
  function renderHead() {
    $("#sub-title").textContent = S.company.name || "Subcontractor workbook";
    const sums = S.jobs.map(jobSummary);
    $("#sub-sub").textContent = `${S.jobs.length} jobs for ${new Set(S.jobs.map((j) => j.gc)).size} GCs. Open receivables ${fmt.money(sums.reduce((a, s) => a + s.openAR, 0))}. Retainage owed ${fmt.money(sums.reduce((a, s) => a + s.ret, 0))}.`;
    $("#as-of").value = S.asOf || "";
  }

  function renderHub() {
    const rows = S.jobs.map((j, i) => ({ j, i, s: jobSummary(j), p: prelimStatus(j), l: lienDeadline(j) }));
    const tot = (k) => rows.reduce((a, r) => a + r.s[k], 0);
    const buckets = [[0, 30, "Current (0 to 30)"], [31, 60, "31 to 60"], [61, 90, "61 to 90"], [91, 1e9, "Over 90"]];
    const aging = rows.map((r) => {
      const b = buckets.map(([lo, hi]) => r.s.open.filter((x) => { const d = daysBetween(x.a.appDate, asOf()); return d >= lo && d <= hi; }).reduce((a, x) => a + x.due, 0));
      return { r, b };
    });
    const over60 = aging.reduce((a, x) => a + x.b[2] + x.b[3], 0);
    const dueSoon = rows.filter((r) => daysBetween(asOf(), nextBilling(r.j)) <= 10 && !r.l);
    const jobRows = rows.map(({ j, i, s, p, l }) => {
      const lienLeft = l ? daysBetween(asOf(), l.date) : null;
      return `<tr>
        <td><button class="btn-ghost" data-act="open-job" data-i="${i}" style="padding:0;text-align:left;white-space:normal">${esc(j.name)}</button><div class="muted">${esc(j.gc)}</div></td>
        <td class="num">${fmt.money(s.revised)}</td>
        <td><div class="bar-cell"><div class="bar" style="flex:1"><span style="width:${Math.min(100, s.pct * 100).toFixed(0)}%"></span></div><span class="muted">${fmt.pct(s.pct, 0)}</span></div></td>
        <td class="num">${fmt.money(s.openAR)}${s.oldest > 45 ? `<div>${stamp(`${s.oldest} days`, "red")}</div>` : s.oldest ? `<div class="muted">${s.oldest} days</div>` : ""}</td>
        <td class="num">${fmt.money(s.ret)}</td>
        <td class="num">${fmt.money(s.pendingCOR + s.openTM)}${s.openTM ? `<div class="muted">${fmt.money(s.openTM)} on open T&M</div>` : ""}</td>
        <td>${l ? `<span class="muted">Billing done</span>` : fmt.date(nextBilling(j))}</td>
        <td>${stamp(p.label, p.color)}</td>
        <td>${l ? `${fmt.date(l.date)}<div>${stamp(lienLeft < 0 ? "Passed" : `${lienLeft} days left`, lienLeft < 30 ? "red" : "amber")}</div>` : '<span class="muted">Job open</span>'}</td>
      </tr>`;
    }).join("");
    const agingRows = aging.map(({ r, b }) => `<tr><td>${esc(r.j.name)}<div class="muted">${esc(r.j.gc)}</div></td>${b.map((v, k) => `<td class="num" style="${k >= 2 && v ? "color:var(--redline);font-weight:600" : ""}">${v ? fmt.money(v) : "-"}</td>`).join("")}<td class="num"><strong>${fmt.money(b.reduce((a, x) => a + x, 0))}</strong></td></tr>`).join("");
    const bt = buckets.map((_, k) => aging.reduce((a, x) => a + x.b[k], 0));
    $("#t-hub").innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${fmt.money(tot("openAR"))}</div><div class="l">Billed, not yet paid</div></div>
        <div class="stat"><div class="v" style="color:${over60 ? "var(--redline)" : "inherit"}">${fmt.money(over60)}</div><div class="l">Over 60 days</div></div>
        <div class="stat"><div class="v">${fmt.money(tot("ret"))}</div><div class="l">Retainage owed to you</div></div>
        <div class="stat"><div class="v">${fmt.money(tot("pendingCOR") + tot("openTM"))}</div><div class="l">Extra work not yet approved</div></div>
        <div class="stat"><div class="v">${dueSoon.length}</div><div class="l">Pay apps due in 10 days</div></div>
      </div>
      <div class="sheet">
        <div class="sheet-head"><h3>All jobs</h3><div class="actions"><button data-act="add-job">Add job</button><button class="btn-primary" data-act="xlsx-ar">Download AR report</button></div>
          <p>One line per job. Extra work counts submitted change order requests plus T&M tickets not yet on a request. The lien deadline appears once a job has a final inspection date.</p></div>
        <div class="table-wrap"><table class="grid">
          <thead><tr><th>Job / GC</th><th class="num">Contract with changes</th><th style="min-width:130px">Billed</th><th class="num">Open receivable</th><th class="num">Retainage held</th><th class="num">Extra work pending</th><th>Next pay app due</th><th>20-day notice</th><th>Lien deadline</th></tr></thead>
          <tbody>${jobRows}</tbody>
        </table></div>
      </div>
      <div class="sheet">
        <div class="sheet-head"><h3>Receivables aging</h3><p>Unpaid pay apps by days since submitted, as of ${fmt.date(asOf())}. Retainage is tracked separately above.</p></div>
        <div class="table-wrap"><table class="grid">
          <thead><tr><th>Job / GC</th>${buckets.map((b) => `<th class="num">${b[2]}</th>`).join("")}<th class="num">Total</th></tr></thead>
          <tbody>${agingRows}<tr class="total"><td>Total</td>${bt.map((v) => `<td class="num">${fmt.money(v)}</td>`).join("")}<td class="num">${fmt.money(bt.reduce((a, x) => a + x, 0))}</td></tr></tbody>
        </table></div>
      </div>`;
  }

  function g702(g, app) {
    return `<table class="grid"><tbody>
      <tr><td>1. Original contract sum</td><td class="num">${fmt.money2(g.l1)}</td></tr>
      <tr><td>2. Net change by change orders</td><td class="num">${fmt.money2(g.l2)}</td></tr>
      <tr class="subtotal"><td>3. Contract sum to date</td><td class="num">${fmt.money2(g.l3)}</td></tr>
      <tr><td>4. Total completed & stored to date</td><td class="num">${fmt.money2(g.l4)}</td></tr>
      <tr><td>5. Retainage (${fmt.num2(app.retPct)}% work, ${fmt.num2(app.sretPct)}% stored)</td><td class="num">${fmt.money2(g.l5)}</td></tr>
      <tr><td>6. Total earned less retainage</td><td class="num">${fmt.money2(g.l6)}</td></tr>
      <tr><td>7. Less previous payment requests</td><td class="num">${fmt.money2(g.l7)}</td></tr>
      <tr class="total"><td>8. Current payment due</td><td class="num">${fmt.money2(g.l8)}</td></tr>
      <tr><td>9. Balance to finish, including retainage</td><td class="num">${fmt.money2(g.l9)}</td></tr>
    </tbody></table>`;
  }

  function renderJob() {
    const j = job();
    if (ui.app === null || ui.app >= j.apps.length) ui.app = j.apps.length - 1;
    const sovTotal = j.sov.reduce((a, s) => a + num(s.value), 0);
    const sovRows = j.sov.map((s) => `<tr><td style="width:60px">${inp(`sov:${s.id}:item`, s.item)}</td><td>${inp(`sov:${s.id}:desc`, s.desc)}</td><td style="width:140px">${inp(`sov:${s.id}:value`, s.value, { type: "number" })}</td><td><button class="btn-x" data-act="del-sov" data-id="${s.id}" aria-label="Delete line">&times;</button></td></tr>`).join("");
    let appHtml = `<p>No pay apps yet on this job.</p>`;
    if (j.apps.length) {
      const app = j.apps[ui.app];
      const { rows, t, g } = calcApp(j, ui.app);
      const st = { Paid: "green", Submitted: "blue", Draft: "amber" };
      appHtml = `
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">${j.apps.map((a, i) => `<button data-act="pick-app" data-i="${i}" ${i === ui.app ? 'class="btn-primary"' : ""}>Pay app ${a.no} ${stamp(a.status, i === ui.app ? "gray" : st[a.status] || "gray")}</button>`).join("")}<button class="btn-ghost" data-act="new-app">New pay app</button></div>
        <div class="two-col" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)">
          <div class="sheet"><div class="sheet-head"><h3>Pay app ${app.no} to ${esc(j.gc)}</h3><div class="actions"><button class="btn-primary" data-act="xlsx-app">Download Pay App</button></div></div>${g702(g, app)}</div>
          <div class="sheet"><div class="grid-form" style="grid-template-columns:1fr 1fr">
            ${field("Period to", inp("app:periodTo", app.periodTo, { type: "date" }))}
            ${field("Submitted to GC", inp("app:appDate", app.appDate, { type: "date" }))}
            ${field("Retainage, work %", inp("app:retPct", app.retPct, { type: "number" }))}
            ${field("Retainage, stored %", inp("app:sretPct", app.sretPct, { type: "number" }))}
            ${field("Status", sel("app:status", app.status, ["Draft", "Submitted", "Paid"], "Status"))}
            ${field("Paid on", inp("app:paidDate", app.paidDate, { type: "date" }))}
          </div><p class="muted" style="margin-top:.75rem">Set retainage to 0% on the final pay app to bill the retainage release.</p></div>
        </div>
        <div class="sheet"><div class="sheet-head"><h3>Continuation sheet</h3><p>Enter this period in dollars or as percent complete to date. Approved change order requests appear as their own lines.</p></div>
          <div class="table-wrap"><table class="grid">
            <thead><tr><th>Item</th><th>Description</th><th class="num">Scheduled value</th><th class="num">From previous</th><th class="num">This period</th><th class="num">% to date</th><th class="num">Stored now</th><th class="num">Completed & stored</th><th class="num">Balance</th><th class="num">Retainage</th></tr></thead>
            <tbody>${rows.map((r) => `<tr ${r.isCO ? 'style="background:#fbf8f2"' : ""}><td>${esc(r.item)}</td><td>${esc(r.desc)}</td><td class="num">${fmt.money(r.C)}</td><td class="num">${fmt.money(r.D)}</td>
              <td><input type="number" step="any" class="w-qty" data-key="ln:${r.key}:work" value="${num(app.lines[r.key]?.work)}" aria-label="This period"></td>
              <td>${inp(`ln:${r.key}:pct`, r.C ? Math.round(((r.D + r.E + r.F) / r.C) * 1000) / 10 : 0, { type: "number", w: "76px", label: "Percent complete" })}</td>
              <td><input type="number" step="any" class="w-qty" data-key="ln:${r.key}:stored" value="${num(app.lines[r.key]?.stored)}" aria-label="Stored"></td>
              <td class="num">${fmt.money(r.G)}</td><td class="num">${fmt.money(r.H)}</td><td class="num">${fmt.money(r.I)}</td></tr>`).join("")}
            <tr class="total"><td colspan="2">Totals</td><td class="num">${fmt.money(t.C)}</td><td class="num">${fmt.money(t.D)}</td><td class="num">${fmt.money(t.E)}</td><td></td><td class="num">${fmt.money(t.F)}</td><td class="num">${fmt.money(t.G)}</td><td class="num">${fmt.money(t.H)}</td><td class="num">${fmt.money(t.I)}</td></tr></tbody>
          </table></div></div>`;
    }
    $("#t-job").innerHTML = `
      <div class="sheet-head">${jobPicker()}</div>
      <div class="two-col">
        <div>${appHtml}</div>
        <div>
          <div class="sheet"><h3>Job</h3><div class="grid-form" style="grid-template-columns:1fr">
            ${field("Job name", inp("j:name", j.name))}
            ${field("Job address", inp("j:address", j.address))}
            ${field("GC (bill to)", inp("j:gc", j.gc))}
            ${field("GC address", inp("j:gcAddress", j.gcAddress))}
            ${field("Owner", inp("j:owner", j.owner))}
            ${field("Construction lender", inp("j:lender", j.lender), "Leave blank if none.")}
            ${field("Your job no.", inp("j:jobNo", j.jobNo))}
            ${field("GC subcontract no.", inp("j:gcContractNo", j.gcContractNo))}
            ${field("Subcontract date", inp("j:contractDate", j.contractDate, { type: "date" }))}
            ${field("Scope", inp("j:scope", j.scope))}
            ${field("Pay app due day of month", inp("j:billingDay", j.billingDay, { type: "number" }), "Most GCs want sub pay apps by the 20th or 25th.")}
          </div></div>
          <div class="sheet"><div class="sheet-head"><h3>Schedule of values</h3><div class="actions"><button data-act="add-sov">Add line</button></div></div>
            <table class="grid"><tbody>${sovRows}<tr class="total"><td colspan="2">Subcontract sum</td><td class="num">${fmt.money(sovTotal)}</td><td></td></tr></tbody></table></div>
        </div>
      </div>`;
  }

  function lineEditor(kind, holder) {
    const pre = kind === "cor" ? "cl" : "tl";
    const classes = S.company.rates.map((r) => r.cls);
    const rows = holder.lines.map((l) => `<tr>
      <td style="width:120px">${sel(`${pre}:${holder.id}:${l.id}:type`, l.type, ["Labor", "Material", "Equipment", "Sub-tier"], "Type")}</td>
      <td style="min-width:220px">${l.type === "Labor" ? sel(`${pre}:${holder.id}:${l.id}:desc`, l.desc, classes.includes(l.desc) ? classes : classes.concat([l.desc]), "Worker class") : inp(`${pre}:${holder.id}:${l.id}:desc`, l.desc, { label: "Description" })}</td>
      <td style="width:90px">${inp(`${pre}:${holder.id}:${l.id}:qty`, l.qty, { type: "number", label: "Quantity" })}</td>
      <td style="width:80px">${inp(`${pre}:${holder.id}:${l.id}:unit`, l.unit, { label: "Unit" })}</td>
      <td style="width:110px">${inp(`${pre}:${holder.id}:${l.id}:cost`, l.cost, { type: "number", label: "Unit cost" })}</td>
      <td class="num">${fmt.money2(num(l.qty) * num(l.cost))}</td>
      <td><button class="btn-x" data-act="del-line" data-kind="${kind}" data-id="${holder.id}" data-l="${l.id}" aria-label="Delete line">&times;</button></td>
    </tr>`).join("");
    const c = corCalc(holder);
    const co = S.company;
    return `<div class="table-wrap"><table class="grid">
      <thead><tr><th>Type</th><th>Description / worker class</th><th class="num">Qty</th><th>Unit</th><th class="num">Unit cost</th><th class="num">Amount</th><th></th></tr></thead>
      <tbody>${rows}
        <tr><td colspan="7"><button class="btn-ghost" data-act="add-line" data-kind="${kind}" data-id="${holder.id}" data-type="Labor">Add labor</button> <button class="btn-ghost" data-act="add-line" data-kind="${kind}" data-id="${holder.id}" data-type="Material">Add material</button> <button class="btn-ghost" data-act="add-line" data-kind="${kind}" data-id="${holder.id}" data-type="Equipment">Add equipment</button> <button class="btn-ghost" data-act="add-line" data-kind="${kind}" data-id="${holder.id}" data-type="Sub-tier">Add sub-tier</button></td></tr>
        <tr class="subtotal"><td colspan="5">Labor ${fmt.money2(c.by.Labor)}, material ${fmt.money2(c.by.Material)}, equipment ${fmt.money2(c.by.Equipment)}, sub-tier ${fmt.money2(c.by["Sub-tier"])}</td><td class="num">${fmt.money2(c.by.Labor + c.by.Material + c.by.Equipment + c.by["Sub-tier"])}</td><td></td></tr>
        <tr><td colspan="5">Material markup ${fmt.num2(co.matMarkup)}%, overhead & profit on labor and equipment ${fmt.num2(co.ohpPct)}%, sub-tier markup ${fmt.num2(co.subMarkup)}%</td><td class="num">${fmt.money2(c.mm + c.ohp + c.sm)}</td><td></td></tr>
        <tr class="total"><td colspan="5">Total</td><td class="num">${fmt.money2(c.total)}</td><td></td></tr>
      </tbody></table></div>`;
  }

  function renderCOR() {
    const j = job();
    if (!j.cors.find((c) => c.id === ui.cor)) ui.cor = j.cors[0]?.id || null;
    if (!j.tickets.find((t) => t.id === ui.ticket)) ui.ticket = j.tickets[0]?.id || null;
    const st = { Approved: "green", Submitted: "blue", Draft: "amber", Rejected: "red", Open: "amber", "On COR": "green" };
    const corRows = j.cors.map((c) => `<tr ${c.id === ui.cor ? 'style="background:var(--survey-tint)"' : ""}><td><button class="btn-ghost" data-act="pick-cor" data-id="${c.id}">${esc(c.no)}</button></td><td>${esc(c.title)}</td><td>${stamp(c.status, st[c.status])}</td><td class="num">${fmt.money2(corCalc(c).total)}</td><td class="num">${num(c.days)}</td></tr>`).join("");
    const tkRows = j.tickets.map((t) => `<tr ${t.id === ui.ticket ? 'style="background:var(--survey-tint)"' : ""}><td><button class="btn-ghost" data-act="pick-tk" data-id="${t.id}">${esc(t.no)}</button></td><td>${fmt.date(t.date)}</td><td>${esc(t.desc)}</td><td>${stamp(t.status, st[t.status])}</td><td class="num">${fmt.money2(corCalc(t).total)}</td></tr>`).join("");
    const c = j.cors.find((x) => x.id === ui.cor);
    const t = j.tickets.find((x) => x.id === ui.ticket);
    const openTk = j.tickets.filter((x) => x.status === "Open");
    $("#t-cor").innerHTML = `
      <div class="sheet-head">${jobPicker()}</div>
      <div class="two-col" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
        <div class="sheet"><div class="sheet-head"><h3>Change order requests</h3><div class="actions"><button data-act="add-cor">New request</button></div><p>Approved requests flow onto the next pay app as their own lines.</p></div>
          <div class="table-wrap"><table class="grid"><thead><tr><th>No.</th><th>Title</th><th>Status</th><th class="num">Total</th><th class="num">Days</th></tr></thead><tbody>${corRows || `<tr><td colspan="5" class="muted" style="padding:1rem">No requests on this job yet.</td></tr>`}</tbody></table></div></div>
        <div class="sheet"><div class="sheet-head"><h3>T&M tickets</h3><div class="actions"><button data-act="add-tk">New ticket</button>${openTk.length ? `<button class="btn-primary" data-act="tk-to-cor">Roll ${openTk.length} open ticket${openTk.length > 1 ? "s" : ""} into a request</button>` : ""}</div><p>Log extra work the day it happens and get the GC's signature. Open tickets roll into a change order request.</p></div>
          <div class="table-wrap"><table class="grid"><thead><tr><th>No.</th><th>Date</th><th>Work</th><th>Status</th><th class="num">Value</th></tr></thead><tbody>${tkRows || `<tr><td colspan="5" class="muted" style="padding:1rem">No tickets on this job yet.</td></tr>`}</tbody></table></div></div>
      </div>
      ${c ? `<div class="sheet">
        <div class="sheet-head"><h3>${esc(c.no)}: ${esc(c.title)}</h3> ${stamp(c.status, st[c.status])}<div class="actions"><button class="btn-primary" data-act="xlsx-cor">Download Change Order Request</button><button class="btn-x" data-act="del-cor" data-id="${c.id}" aria-label="Delete request">&times;</button></div></div>
        <div class="grid-form" style="margin-bottom:1rem">
          ${field("Request no.", inp(`cor:${c.id}:no`, c.no))}
          ${field("Title", inp(`cor:${c.id}:title`, c.title))}
          ${field("Date", inp(`cor:${c.id}:date`, c.date, { type: "date" }))}
          ${field("GC reference", inp(`cor:${c.id}:gcRef`, c.gcRef, { ph: "PCO or RFI no." }))}
          ${field("Status", sel(`cor:${c.id}:status`, c.status, ["Draft", "Submitted", "Approved", "Rejected"], "Status"))}
          ${field("Approved on", inp(`cor:${c.id}:approvedDate`, c.approvedDate, { type: "date" }))}
          ${field("Schedule days", inp(`cor:${c.id}:days`, c.days, { type: "number" }))}
        </div>
        ${field("Description of the change", `<textarea data-key="cor:${c.id}:desc" rows="2">${esc(c.desc)}</textarea>`)}
        <div style="margin-top:1rem">${lineEditor("cor", c)}</div>
      </div>` : ""}
      ${t ? `<div class="sheet">
        <div class="sheet-head"><h3>Ticket ${esc(t.no)}</h3> ${stamp(t.status, st[t.status])}<div class="actions"><button data-act="print-tk">Print ticket</button><button class="btn-x" data-act="del-tk" data-id="${t.id}" aria-label="Delete ticket">&times;</button></div></div>
        <div class="grid-form" style="margin-bottom:1rem">
          ${field("Ticket no.", inp(`tk:${t.id}:no`, t.no))}
          ${field("Date", inp(`tk:${t.id}:date`, t.date, { type: "date" }))}
          ${field("Signed by (GC)", inp(`tk:${t.id}:signedBy`, t.signedBy))}
          ${field("Status", sel(`tk:${t.id}:status`, t.status, ["Open", "On COR"], "Status"))}
        </div>
        ${field("Work performed", `<textarea data-key="tk:${t.id}:desc" rows="2">${esc(t.desc)}</textarea>`)}
        <div style="margin-top:1rem">${lineEditor("tk", t)}</div>
      </div>` : ""}`;
  }

  function waiverSet(j) {
    if (!j.apps.length) return [];
    const i = j.apps.length - 1;
    const app = j.apps[i];
    const paidPrev = [...j.apps.slice(0, i)].reverse().find((a) => a.status === "Paid");
    const co = S.company;
    const base = { project: j.name, jobNo: j.gcContractNo || j.jobNo, owner: j.owner, jobDesc: `${j.name}, ${j.address}`, date: "" };
    const list = [];
    const due = calcApp(j, i).g.l8;
    if (app.status !== "Paid" && due > 0) list.push({ who: `${co.name} to ${j.gc}`, type: "az-cp", amount: due, through: app.periodTo, f: Object.assign({}, base, { maker: j.gc, payee: co.name, amount: due, contractedWith: j.gc, through: app.periodTo, company: co.name, title: co.signerTitle }) });
    if (paidPrev) {
      const pi = j.apps.indexOf(paidPrev);
      const amt = calcApp(j, pi).g.l8;
      list.push({ who: `${co.name} to ${j.gc}`, type: "az-up", amount: amt, through: paidPrev.periodTo, f: Object.assign({}, base, { maker: j.gc, payee: co.name, amount: amt, contractedWith: j.gc, through: paidPrev.periodTo, company: co.name, title: co.signerTitle }) });
    }
    j.suppliers.forEach((s) => {
      if (num(s.thisPeriod) > 0) list.push({ who: `${s.name} to ${co.name}`, type: "az-cp", amount: num(s.thisPeriod), through: app.periodTo, f: Object.assign({}, base, { maker: co.name, payee: s.name, amount: num(s.thisPeriod), contractedWith: co.name, through: app.periodTo, company: s.name }) });
      if (num(s.paidLast) > 0 && paidPrev) list.push({ who: `${s.name} to ${co.name}`, type: "az-up", amount: num(s.paidLast), through: paidPrev.periodTo, f: Object.assign({}, base, { maker: co.name, payee: s.name, amount: num(s.paidLast), contractedWith: co.name, through: paidPrev.periodTo, company: s.name }) });
    });
    return list;
  }

  function renderLien() {
    const j = job();
    const prelimRows = S.jobs.map((jj, i) => {
      const p = jj.prelim, ps = prelimStatus(jj), l = lienDeadline(jj);
      return `<tr>
        <td style="min-width:170px">${esc(jj.name)}<div class="muted">${esc(jj.gc)}</div></td>
        <td style="width:145px">${inp(`pj:${i}:firstFurnish`, p.firstFurnish, { type: "date", label: "First furnished" })}</td>
        <td style="width:145px">${inp(`pj:${i}:served`, p.served, { type: "date", label: "Served" })}</td>
        <td style="width:120px">${inp(`pj:${i}:estPrice`, p.estPrice, { type: "number", label: "Price in notice" })}</td>
        <td style="white-space:nowrap">${["owner", "gc", "lender", "hiring"].map((k) => `<label style="display:inline-flex;gap:.25rem;align-items:center;margin-right:.5rem"><input type="checkbox" data-key="pj:${i}:${k}" ${p[k] ? "checked" : ""}>${{ owner: "Owner", gc: "GC", lender: "Lender", hiring: "Hiring party" }[k]}</label>`).join("")}</td>
        <td>${stamp(ps.label, ps.color)}${ps.notes.length ? `<div class="muted" style="max-width:280px;margin-top:.3rem">${ps.notes.map(esc).join(" ")}</div>` : ""}</td>
        <td style="width:145px">${inp(`pj:${i}:fi`, jj.finalInspection, { type: "date", label: "Final inspection" })}</td>
        <td style="width:145px">${inp(`pj:${i}:noc`, jj.nocRecorded, { type: "date", label: "Notice of completion recorded" })}</td>
        <td>${l ? `<strong>${fmt.date(l.date)}</strong><div class="muted" style="max-width:200px">${esc(l.basis)}</div>` : '<span class="muted">Enter final inspection</span>'}</td>
      </tr>`;
    }).join("");
    const ws = waiverSet(j);
    const supRows = j.suppliers.map((s) => `<tr><td>${inp(`sup:${s.id}:name`, s.name)}</td><td style="width:140px">${inp(`sup:${s.id}:thisPeriod`, s.thisPeriod, { type: "number" })}</td><td style="width:140px">${inp(`sup:${s.id}:paidLast`, s.paidLast, { type: "number" })}</td><td><button class="btn-x" data-act="del-sup" data-id="${s.id}" aria-label="Delete supplier">&times;</button></td></tr>`).join("");
    $("#t-lien").innerHTML = `
      <div class="sheet">
        <div class="sheet-head"><h3>Preliminary 20-day notices and lien deadlines, all jobs</h3><p>Arizona requires subs and suppliers to serve the notice on the owner, the GC, the construction lender, and the party they contracted with, within 20 days of first furnishing. A late notice reaches back only 20 days. Serve an amended notice when the price grows 30% or more past the notice. Liens record within 120 days of completion, or 60 days after a recorded notice of completion. Planning tool, not legal advice.</p></div>
        <div class="table-wrap"><table class="grid">
          <thead><tr><th>Job</th><th>First furnished</th><th>Notice served</th><th class="num">Price in notice</th><th>Served on</th><th>Status</th><th>Final inspection</th><th>Notice of completion</th><th>Record lien by</th></tr></thead>
          <tbody>${prelimRows}</tbody>
        </table></div>
        <p class="muted" style="margin-top:.6rem">Sources: <a href="https://www.azleg.gov/ars/33/00992-01.htm" target="_blank" rel="noopener">A.R.S. 33-992.01</a>, <a href="https://www.azleg.gov/ars/33/00993.htm" target="_blank" rel="noopener">A.R.S. 33-993</a>.</p>
      </div>
      <div class="sheet-head">${jobPicker()}</div>
      <div class="two-col" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
        <div class="sheet"><div class="sheet-head"><h3>Waivers for the current pay app</h3><div class="actions"><button class="btn-primary" data-act="print-waivers" ${ws.length ? "" : "disabled"}>Print all waivers</button></div>
          <p>Yours to the GC, plus the ones you collect from your suppliers. Conditionals cover this period. Unconditionals cover the last payment received.</p></div>
          <div class="table-wrap"><table class="grid"><thead><tr><th>From / to</th><th>Form</th><th class="num">Amount</th><th>Through</th></tr></thead>
          <tbody>${ws.map((w) => `<tr><td>${esc(w.who)}</td><td>${esc(W.TYPES[w.type].short)}</td><td class="num">${fmt.money2(w.amount)}</td><td>${fmt.date(w.through)}</td></tr>`).join("") || `<tr><td colspan="4" class="muted" style="padding:1rem">Nothing due. The current pay app is paid.</td></tr>`}</tbody></table></div></div>
        <div class="sheet"><div class="sheet-head"><h3>Your suppliers on this job</h3><div class="actions"><button data-act="add-sup">Add supplier</button></div><p>Billed this period drives their conditional waiver. Paid last period drives their unconditional.</p></div>
          <table class="grid"><thead><tr><th>Supplier</th><th class="num">Billed this period</th><th class="num">Paid last period</th><th></th></tr></thead><tbody>${supRows || `<tr><td colspan="4" class="muted" style="padding:1rem">No suppliers listed.</td></tr>`}</tbody></table></div>
      </div>`;
  }

  function renderCompany() {
    const co = S.company;
    $("#t-co").innerHTML = `
      <div class="two-col" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
        <div class="sheet"><h3>Company</h3><div class="grid-form" style="grid-template-columns:1fr 1fr">
          ${field("Company name", inp("co:name", co.name))}
          ${field("Address", inp("co:address", co.address))}
          ${field("ROC license no.", inp("co:roc", co.roc))}
          ${field("Billing contact", inp("co:contact", co.contact))}
          ${field("Signer name", inp("co:signer", co.signer))}
          ${field("Signer title", inp("co:signerTitle", co.signerTitle))}
        </div></div>
        <div class="sheet"><h3>Change order pricing</h3><div class="grid-form" style="grid-template-columns:1fr 1fr 1fr">
          ${field("Material markup %", inp("co:matMarkup", co.matMarkup, { type: "number" }))}
          ${field("OH&P on labor & equipment %", inp("co:ohpPct", co.ohpPct, { type: "number" }))}
          ${field("Sub-tier markup %", inp("co:subMarkup", co.subMarkup, { type: "number" }))}
        </div><p class="muted" style="margin-top:.75rem">Check each subcontract. Many cap markups on change work.</p>
          <div class="sheet-head" style="margin-top:1rem"><h3>T&M billing rates</h3><div class="actions"><button data-act="add-rate">Add class</button></div><p>Billed hourly rates, burden included. Sample figures.</p></div>
          <table class="grid"><tbody>${co.rates.map((r) => `<tr><td>${inp(`rate:${r.id}:cls`, r.cls)}</td><td style="width:130px">${inp(`rate:${r.id}:rate`, r.rate, { type: "number" })}</td></tr>`).join("")}</tbody></table>
        </div>
      </div>`;
  }

  function renderAll() { renderHead(); renderHub(); renderJob(); renderCOR(); renderLien(); renderCompany(); G.rewriteLinks(); }

  // ---------- downloads ----------
  async function downloadPayApp() {
    const j = job();
    const co = S.company;
    const state = {
      contract: { contractor: co.name, contractorAddress: co.address, owner: j.gc, ownerAddress: j.gcAddress, lender: j.owner, architect: j.lender || "", projectName: j.name, projectAddress: j.address, jobNo: j.gcContractNo || j.jobNo, contractDate: j.contractDate, contractFor: j.scope, signer: co.signer, signerTitle: co.signerTitle },
      sov: j.sov, apps: j.apps,
    };
    const labels = { from: "SUBCONTRACTOR:", to: "TO CONTRACTOR:", via: "OWNER:", via2: "LENDER:", who: "subcontractor", whoCap: "SUBCONTRACTOR", dist: ["Contractor", "Owner", "Lender", "Subcontractor"], distChecked: 3, sign1: "CONTRACTOR:", sign2: "OWNER / LENDER (IF REQUIRED):", reviewer: "contractor" };
    try {
      const buf = await window.GCW_PAYAPP.build(state, ui.app, (i) => calcApp(j, i), { labels });
      const ok = await G.saveFile(`${G.slug(co.name)}-${G.slug(j.name)}-pay-app-${j.apps[ui.app].no}.xlsx`, buf);
      if (ok) toast("Pay app saved. Two sheets, ready to send to the GC.");
    } catch (e) { console.error(e); toast("The pay app couldn't be built. Check the entries and try again."); }
  }

  async function downloadCOR() {
    const j = job(), co = S.company;
    const c = j.cors.find((x) => x.id === ui.cor);
    if (!c) return;
    const h = window.GCW_PAYAPP.helpers;
    const cc = corCalc(c);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Change Order Request", { views: [{ showGridLines: false }], pageSetup: { paperSize: 1, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } } });
    ws.columns = [{ width: 14 }, { width: 40 }, { width: 10 }, { width: 8 }, { width: 14 }, { width: 16 }];
    h.merge(ws, "A1:D1", "CHANGE ORDER REQUEST", { sans: true, size: 17, bold: true });
    h.set(ws, "E1", "No.", { h: "right" }); h.set(ws, "F1", c.no, { bold: true, size: 13 });
    ws.getRow(1).height = 24;
    h.underline(ws, "A2:F2", h.medium);
    const info = [
      ["From:", co.name, "Date:", c.date ? new Date(c.date + "T12:00:00") : ""],
      ["", co.address, "GC reference:", c.gcRef || ""],
      ["", co.roc, "Schedule impact:", `${num(c.days)} working days`],
      ["To:", j.gc, "Subcontract no.:", j.gcContractNo || ""],
      ["", j.gcAddress, "Our job no.:", j.jobNo],
      ["Project:", j.name, "", ""],
      ["", j.address, "", ""],
    ];
    info.forEach(([a, b, e, f], i) => {
      const r = 4 + i;
      h.set(ws, `A${r}`, a, { bold: true }); h.merge(ws, `B${r}:D${r}`, b, { bold: i === 0 || i === 3 || i === 5 });
      h.set(ws, `E${r}`, e, { h: "right" }); h.set(ws, `F${r}`, f, { bold: true, fmt: f instanceof Date ? "mm/dd/yy" : undefined });
    });
    h.set(ws, "A12", "Title:", { bold: true }); h.merge(ws, "B12:F12", c.title, { bold: true, size: 12 });
    h.set(ws, "A13", "Description:", { bold: true, v: "top" }); h.merge(ws, "B13:F15", c.desc, { wrap: true, v: "top" });
    ws.getRow(13).height = 18;
    const hr = 17;
    ["Type", "Description", "Qty", "Unit", "Unit cost", "Amount"].forEach((t, i) => h.set(ws, `${String.fromCharCode(65 + i)}${hr}`, t, { sans: true, bold: true, h: i >= 2 ? "center" : "left", fill: "FFE8EAE6" }));
    let r = hr + 1;
    const order = ["Labor", "Material", "Equipment", "Sub-tier"];
    const sub = {};
    order.forEach((type) => {
      const ls = c.lines.filter((l) => l.type === type);
      if (!ls.length) return;
      const first = r;
      ls.forEach((l) => {
        h.set(ws, `A${r}`, type); h.set(ws, `B${r}`, l.desc, { wrap: true }); h.set(ws, `C${r}`, num(l.qty), { h: "right", fmt: "#,##0.00" }); h.set(ws, `D${r}`, l.unit, { h: "center" });
        h.set(ws, `E${r}`, num(l.cost), { h: "right", fmt: h.MONEY, fill: h.CYAN }); h.set(ws, `F${r}`, { formula: `C${r}*E${r}`, result: num(l.qty) * num(l.cost) }, { h: "right", fmt: h.MONEY });
        r++;
      });
      h.merge(ws, `A${r}:E${r}`, `${type} subtotal`, { bold: true, h: "right" });
      h.set(ws, `F${r}`, { formula: `SUM(F${first}:F${r - 1})`, result: cc.by[type] }, { h: "right", fmt: h.MONEY, bold: true });
      sub[type] = `F${r}`;
      r++;
    });
    h.gridRange(ws, `A${hr}:F${r - 1}`);
    r++;
    const ref = (t) => sub[t] || "0";
    const rows = [
      [`Material markup (${num(co.matMarkup)}%)`, `${ref("Material")}*${num(co.matMarkup) / 100}`, cc.mm],
      [`Overhead & profit on labor and equipment (${num(co.ohpPct)}%)`, `(${ref("Labor")}+${ref("Equipment")})*${num(co.ohpPct) / 100}`, cc.ohp],
      [`Sub-tier markup (${num(co.subMarkup)}%)`, `${ref("Sub-tier")}*${num(co.subMarkup) / 100}`, cc.sm],
    ];
    const mFirst = r;
    rows.forEach(([lab, f, res]) => { h.merge(ws, `A${r}:E${r}`, lab, { h: "right" }); h.set(ws, `F${r}`, { formula: f, result: res }, { h: "right", fmt: h.MONEY }); r++; });
    h.merge(ws, `A${r}:E${r}`, "TOTAL REQUESTED", { sans: true, bold: true, h: "right", size: 12 });
    const subs = order.filter((t) => sub[t]).map((t) => sub[t]).join("+") || "0";
    h.set(ws, `F${r}`, { formula: `${subs}+SUM(F${mFirst}:F${r - 1})`, result: cc.total }, { h: "right", fmt: h.MONEY, bold: true, size: 12, fill: "FFF6E3E1" });
    ws.getCell(`F${r}`).border = { top: h.medium, bottom: h.medium, left: h.medium, right: h.medium };
    r += 2;
    const tks = j.tickets.filter((t) => t.corId === c.id).map((t) => `${t.no} (${fmt.date(t.date)}, signed by ${t.signedBy || "GC"})`);
    h.merge(ws, `A${r}:F${r}`, tks.length ? `Backup attached: T&M ticket ${tks.join("; ")}.` : "Backup: quotes and labor detail available on request.", { italic: true, wrap: true, size: 9 }); r++;
    h.merge(ws, `A${r}:F${r + 1}`, "Pricing is good for 30 days. This request covers only the work described. It does not waive the right to request more time or cost for impacts not yet known. Work starts on written approval unless the GC directs otherwise in writing.", { wrap: true, v: "top", size: 9 });
    r += 3;
    h.set(ws, `A${r}`, "Submitted by:", { bold: true }); h.underline(ws, `B${r}:B${r}`); h.set(ws, `E${r}`, "Date:", { h: "right" }); h.underline(ws, `F${r}:F${r}`);
    h.set(ws, `B${r + 1}`, `${co.name}${co.signer ? ", " + co.signer : ""}${co.signerTitle ? ", " + co.signerTitle : ""}`, { size: 9 });
    r += 3;
    h.set(ws, `A${r}`, "Approved by:", { bold: true }); h.underline(ws, `B${r}:B${r}`); h.set(ws, `E${r}`, "Date:", { h: "right" }); h.underline(ws, `F${r}:F${r}`);
    h.set(ws, `B${r + 1}`, `${j.gc}`, { size: 9 });
    h.set(ws, `C${r + 1}`, "Approved amount:", { size: 9 }); h.underline(ws, `E${r + 1}:F${r + 1}`);
    try {
      const buf = await wb.xlsx.writeBuffer();
      const ok = await G.saveFile(`${G.slug(co.name)}-${G.slug(c.no)}-${G.slug(c.title)}.xlsx`, buf);
      if (ok) toast("Change order request saved.");
    } catch (e) { console.error(e); toast("The request couldn't be built. Check the entries and try again."); }
  }

  async function downloadAR() {
    const h = window.GCW_PAYAPP.helpers;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("AR Aging", { views: [{ showGridLines: false }], pageSetup: { paperSize: 1, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.columns = [{ width: 32 }, { width: 28 }, { width: 10 }, { width: 13 }, { width: 13 }, { width: 15 }, { width: 15 }, { width: 15 }];
    h.merge(ws, "A1:H1", `${S.company.name}: receivables as of ${fmt.date(asOf())}`, { sans: true, size: 15, bold: true });
    ["Job", "GC", "Pay app", "Submitted", "Days out", "Amount due", "Retainage held", "Status"].forEach((t, i) => h.set(ws, `${String.fromCharCode(65 + i)}3`, t, { sans: true, bold: true, fill: "FFE8EAE6", h: "center" }));
    let r = 4;
    S.jobs.forEach((j) => {
      const s = jobSummary(j);
      s.open.forEach((x) => {
        const d = daysBetween(x.a.appDate, asOf());
        h.set(ws, `A${r}`, j.name); h.set(ws, `B${r}`, j.gc); h.set(ws, `C${r}`, x.a.no, { h: "center" }); h.set(ws, `D${r}`, new Date(x.a.appDate + "T12:00:00"), { fmt: "mm/dd/yy", h: "center" });
        h.set(ws, `E${r}`, d, { h: "center", bold: d > 60 }); h.set(ws, `F${r}`, x.due, { fmt: h.MONEY, h: "right" }); h.set(ws, `G${r}`, null); h.set(ws, `H${r}`, d > 60 ? "Over 60 days" : d > 30 ? "31 to 60" : "Current");
        r++;
      });
      if (s.ret > 0) { h.set(ws, `A${r}`, j.name); h.set(ws, `B${r}`, j.gc); h.set(ws, `C${r}`, "Retainage", { h: "center" }); h.set(ws, `G${r}`, s.ret, { fmt: h.MONEY, h: "right" }); const l = lienDeadline(j); h.set(ws, `H${r}`, l ? `Record lien by ${fmt.date(l.date)}` : "Job open"); r++; }
    });
    h.gridRange(ws, `A3:H${r - 1}`);
    h.merge(ws, `A${r}:E${r}`, "Totals", { bold: true, h: "right" });
    h.set(ws, `F${r}`, { formula: `SUM(F4:F${r - 1})` }, { fmt: h.MONEY, bold: true, h: "right" });
    h.set(ws, `G${r}`, { formula: `SUM(G4:G${r - 1})` }, { fmt: h.MONEY, bold: true, h: "right" });
    try { const buf = await wb.xlsx.writeBuffer(); const ok = await G.saveFile(`${G.slug(S.company.name)}-ar-aging.xlsx`, buf); if (ok) toast("AR report saved."); } catch (e) { toast("The report couldn't be built."); }
  }

  function ticketDoc(t, j) {
    const c = corCalc(t);
    return `<div class="doc" style="max-width:8.5in">
      <h2>Time & Material Ticket ${esc(t.no)}</h2>
      <table class="noborder" style="margin-bottom:10px"><tr><td><strong>${esc(S.company.name)}</strong><br>${esc(S.company.address)}<br>${esc(S.company.roc)}</td><td><strong>Job:</strong> ${esc(j.name)}<br><strong>GC:</strong> ${esc(j.gc)}<br><strong>Date:</strong> ${fmt.date(t.date)}</td></tr></table>
      <p><strong>Work performed:</strong> ${esc(t.desc)}</p>
      <table><tr><th>Type</th><th>Description</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Amount</th></tr>
      ${t.lines.map((l) => `<tr><td>${esc(l.type)}</td><td>${esc(l.desc)}</td><td class="num">${fmt.num2(l.qty)}</td><td>${esc(l.unit)}</td><td class="num">${fmt.money2(l.cost)}</td><td class="num">${fmt.money2(num(l.qty) * num(l.cost))}</td></tr>`).join("")}
      <tr><td colspan="5" class="num">Markups per subcontract</td><td class="num">${fmt.money2(c.mm + c.ohp + c.sm)}</td></tr>
      <tr><td colspan="5" class="num"><strong>Total</strong></td><td class="num"><strong>${fmt.money2(c.total)}</strong></td></tr></table>
      <p style="margin-top:14px">Signing confirms the hours and materials above were used on this work. It is not approval of price.</p>
      <table class="noborder" style="margin-top:18px"><tr><td style="width:50%">GC representative: ______________________<br><span style="font-size:10px">${esc(t.signedBy || "")}</span></td><td>Sub foreman: ______________________</td></tr></table>
    </div>`;
  }

  // ---------- actions ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const j = job();
    const act = b.dataset.act, id = b.dataset.id;
    const holder = (kind) => (kind === "cor" ? j.cors : j.tickets).find((x) => x.id === id);
    switch (act) {
      case "open-job": ui.job = +b.dataset.i; ui.app = null; G.tabs(document)("t-job"); break;
      case "pick-app": ui.app = +b.dataset.i; break;
      case "new-app": {
        const last = j.apps[j.apps.length - 1];
        const base = last ? new Date(last.periodTo + "T12:00:00") : new Date(asOf() + "T12:00:00");
        const end = new Date(base.getFullYear(), base.getMonth() + (last ? 2 : 1), 0, 12);
        const periodTo = end.toISOString().slice(0, 10);
        const appDate = new Date(end.getFullYear(), end.getMonth(), Math.min(28, num(j.billingDay) || 20), 12).toISOString().slice(0, 10);
        const a = { id: uid(), no: (last?.no || 0) + 1, periodTo, appDate, status: "Draft", paidDate: "", retPct: last ? last.retPct : 5, sretPct: last ? last.sretPct : 5, lines: {} };
        if (last) Object.entries(last.lines).forEach(([k, v]) => { if (num(v.stored)) a.lines[k] = { work: 0, stored: num(v.stored) }; });
        j.apps.push(a); ui.app = j.apps.length - 1;
        toast(`Pay app ${a.no} started. Enter this period's work.`);
        break;
      }
      case "xlsx-app": downloadPayApp(); return;
      case "xlsx-cor": downloadCOR(); return;
      case "xlsx-ar": downloadAR(); return;
      case "add-sov": j.sov.push({ id: uid(), item: String(j.sov.length + 1), desc: "New line", value: 0 }); break;
      case "del-sov": G.ask("Delete this SOV line? Billing on it will be lost.", "Delete line", true).then((go) => { if (go) { j.sov = j.sov.filter((s) => s.id !== id); commit(); } }); return;
      case "add-job": {
        const nj = { id: uid(), name: "New job", address: "", gc: "", gcAddress: "", owner: "", lender: "", jobNo: "", gcContractNo: "", contractDate: asOf(), billingDay: 20, payDays: 30, scope: "", sov: [{ id: uid(), item: "1", desc: "Base contract", value: 0 }], apps: [], cors: [], tickets: [], prelim: { firstFurnish: "", served: "", estPrice: 0, owner: false, gc: false, lender: false, hiring: false, method: "" }, finalInspection: "", nocRecorded: "", suppliers: [] };
        S.jobs.push(nj); ui.job = S.jobs.length - 1; ui.app = null; G.tabs(document)("t-job");
        break;
      }
      case "pick-cor": ui.cor = id; break;
      case "pick-tk": ui.ticket = id; break;
      case "add-cor": { const n = `COR-${String(j.cors.length + 1).padStart(3, "0")}`; const c = { id: uid(), no: n, title: "New request", desc: "", date: asOf(), status: "Draft", approvedDate: "", days: 0, gcRef: "", lines: [] }; j.cors.push(c); ui.cor = c.id; break; }
      case "del-cor": G.ask("Delete this change order request?", "Delete", true).then((go) => { if (go) { j.cors = j.cors.filter((c) => c.id !== id); j.tickets.forEach((t) => { if (t.corId === id) { t.corId = null; t.status = "Open"; } }); commit(); } }); return;
      case "add-tk": { const t = { id: uid(), no: `T-${String(j.tickets.length + 1).padStart(3, "0")}`, date: asOf(), desc: "", signedBy: "", status: "Open", lines: [] }; j.tickets.push(t); ui.ticket = t.id; break; }
      case "del-tk": j.tickets = j.tickets.filter((t) => t.id !== id); break;
      case "tk-to-cor": {
        const open = j.tickets.filter((t) => t.status === "Open");
        const c = { id: uid(), no: `COR-${String(j.cors.length + 1).padStart(3, "0")}`, title: `T&M work: ${open.map((t) => t.no).join(", ")}`, desc: open.map((t) => `${t.no} (${fmt.date(t.date)}): ${t.desc}`).join(" "), date: asOf(), status: "Draft", approvedDate: "", days: 0, gcRef: "", lines: [] };
        open.forEach((t) => { t.lines.forEach((l) => c.lines.push(Object.assign({}, l, { id: uid(), desc: l.type === "Labor" ? l.desc : `${t.no}: ${l.desc}` }))); t.status = "On COR"; t.corId = c.id; });
        j.cors.push(c); ui.cor = c.id;
        toast(`${c.no} drafted from ${open.length} ticket${open.length > 1 ? "s" : ""}. Review and submit it.`);
        break;
      }
      case "add-line": { const h = holder(b.dataset.kind); const t = b.dataset.type; const r = S.company.rates[1] || S.company.rates[0]; h.lines.push(line(t, t === "Labor" ? r?.cls || "Labor" : "", t === "Labor" ? 8 : 1, t === "Labor" ? "hr" : t === "Equipment" ? "day" : "LS", t === "Labor" ? r?.rate || 0 : 0)); break; }
      case "del-line": { const h = holder(b.dataset.kind); h.lines = h.lines.filter((l) => l.id !== b.dataset.l); break; }
      case "print-tk": { const t = j.tickets.find((x) => x.id === ui.ticket); if (t) G.printDocs(ticketDoc(t, j), `${j.name} ticket ${t.no}`); return; }
      case "print-waivers": G.printDocs(waiverSet(j).map((w) => W.render(w.type, w.f)).join(""), `${j.name} lien waivers`); return;
      case "add-sup": j.suppliers.push({ id: uid(), name: "New supplier", thisPeriod: 0, paidLast: 0 }); break;
      case "del-sup": j.suppliers = j.suppliers.filter((s) => s.id !== id); break;
      case "add-rate": S.company.rates.push({ id: uid(), cls: "New class", rate: 0 }); break;
      default: return;
    }
    commit();
  });

  document.addEventListener("DOMContentLoaded", () => {
    $("#btn-reset").onclick = () => G.ask("Reset the subcontractor workbook to the demo jobs? Your entries in this browser will be replaced.", "Reset to demo", true).then((go) => { if (go) { S = demo(); ui.job = 0; ui.app = null; commit(); } });
    renderAll();
    tabs(document);
  });
})();
