/* Admin workbook: contract & SOV, change orders, pay applications, lender draws, lien waivers, closeout */
(function () {
  "use strict";
  const { fmt, num, esc, uid, save, load, toast, tabs, stamp, clone, addDays } = window.GCW;
  const D = window.GCW_DATA;
  const E = window.GCW_EST;
  const W = window.GCW_WAIVERS;
  const $ = (s, r = document) => r.querySelector(s);

  // ---------- state ----------
  function getEstimate() {
    let est = load("estimate");
    if (!est || !est.lines) { est = E.newEstimate("btr"); save("estimate", est); }
    return est;
  }

  const DEMO_VENDORS = [
    ["02", "Demo Grading Co.", "Sitework", 1],
    ["03", "Demo Underground LLC", "Site utilities", 1],
    ["04", "Demo Paving Co.", "Paving & walls", 1],
    ["05", "Demo Concrete Supply", "Concrete material", 0.55],
    ["06", "Demo Lumber Yard", "Lumber & trusses", 0.6],
    ["07", "Demo Roofing Co.", "Roofing", 1],
    ["08", "Demo Stucco & Windows LLC", "Exterior envelope", 0.75],
    ["09", "Demo Plumbing Inc.", "Plumbing", 1],
    ["10", "Demo Electric LLC", "Electrical", 1],
    ["11", "Demo Mechanical Inc.", "HVAC", 1],
  ];
  const DEMO_PROGRESS = { "02": [0.55, 0.9, 1], "03": [0.2, 0.6, 0.85], "04": [0, 0, 0.1], "05": [0, 0.25, 0.55], "06": [0, 0.1, 0.35], "07": [0, 0, 0.1], "08": [0, 0, 0.05], "09": [0, 0.1, 0.25], "10": [0, 0.03, 0.12], "11": [0, 0, 0.05] };

  function newApp(no, periodTo, retPct, sretPct) {
    return { id: uid(), no, periodTo, appDate: addDays(periodTo, 1), retPct, sretPct, status: "Draft", paidDate: "", lines: {}, checklist: D.DRAW_CHECKLIST.map((item) => ({ item, status: "Not started", notes: "" })), vendorBills: {} };
  }

  function demoAdmin(est) {
    const sov = E.buildSOV(est, "division", true);
    const contract = {
      projectName: est.project.name,
      projectAddress: "Sample site, Phoenix, AZ",
      jobNo: "2701",
      owner: est.project.client,
      ownerAddress: "200 Sample Ave, Phoenix, AZ 85004",
      lender: "Sample Construction Lender, N.A.",
      contractor: "Sample Builders, Inc.",
      contractorAddress: "100 Sample Way, Phoenix, AZ 85004",
      architect: "",
      contractFor: "General construction, 40-unit build-to-rent community",
      contractDate: "2027-01-15",
      retainagePct: 5,
      storedRetainagePct: 5,
      signer: "",
      signerTitle: "Project Accountant",
      sovMode: "division",
      gcSeparate: true,
    };
    const cos = [
      { id: uid(), no: "CO-001", desc: "Upgrade flooring to wood-look LVP in all living areas", reason: "Owner request", submitted: "2027-03-02", status: "Approved", requested: 48200, approved: 46800, approvedDate: "2027-03-15", days: 0 },
      { id: uid(), no: "CO-002", desc: "Relocate offsite 8-inch water main per city civil comments", reason: "Plan review comment", submitted: "2027-04-10", status: "Pending", requested: 38500, approved: 0, approvedDate: "", days: 10 },
      { id: uid(), no: "CO-003", desc: "Add EV-ready conduit at 20 units", reason: "Owner request", submitted: "2027-04-18", status: "Draft", requested: 22400, approved: 0, approvedDate: "", days: 0 },
    ];
    const vendors = [];
    DEMO_VENDORS.forEach(([pre, name, trade, share]) => {
      const line = sov.find((s) => String(s.source).startsWith(pre));
      if (line) vendors.push({ id: uid(), name, trade, sovId: line.id, share, contact: "" });
    });
    const periods = ["2027-02-28", "2027-03-31", "2027-04-30"];
    const apps = periods.map((p, i) => newApp(i + 1, p, 5, 5));
    const months = num(est.project.months) || 12;
    const cum = (line, i) => {
      const pre = String(line.source).slice(0, 2);
      if (DEMO_PROGRESS[pre]) return DEMO_PROGRESS[pre][i];
      if (line.source === "gc") return Math.min(1, (i + 1) / months);
      if (line.source === "insurance") return [0.4, 0.5, 0.6][i];
      return null; // fee, tpt, contingency handled after
    };
    apps.forEach((app, i) => {
      let doneDirect = 0, directTotal = 0;
      sov.forEach((s) => {
        const c = cum(s, i);
        const prev = i ? cum(s, i - 1) : 0;
        if (c === null) return;
        app.lines[s.id] = { work: Math.round((c - (prev || 0)) * s.value), stored: 0 };
        if (DEMO_PROGRESS[String(s.source).slice(0, 2)]) { doneDirect += c * s.value; directTotal += s.value; }
      });
      const overall = directTotal ? doneDirect / directTotal : 0;
      app._overall = overall;
      sov.forEach((s) => {
        if (s.source === "fee" || s.source === "tpt") {
          const prevOverall = i ? apps[i - 1]._overall : 0;
          app.lines[s.id] = { work: Math.round((overall - prevOverall) * s.value), stored: 0 };
        }
      });
    });
    const framing = sov.find((s) => String(s.source).startsWith("06"));
    const ext = sov.find((s) => String(s.source).startsWith("08"));
    if (framing) { apps[1].lines[framing.id].stored = 120000; apps[2].lines[framing.id].stored = 60000; }
    if (ext) apps[2].lines[ext.id].stored = 85000;
    apps.forEach((a) => delete a._overall);
    apps[0].status = "Paid"; apps[0].paidDate = "2027-03-20";
    apps[1].status = "Paid"; apps[1].paidDate = "2027-04-22";
    apps[0].checklist.forEach((c) => (c.status = "Received"));
    apps[1].checklist.forEach((c) => (c.status = "Received"));
    apps[2].checklist.forEach((c, j) => (c.status = j < 4 ? "Received" : j < 8 ? "Requested" : "Not started"));
    const A = { contract, sov, cos, apps, vendors, closeout: D.CLOSEOUT.map(([cat, item, resp]) => ({ id: uid(), cat, item, resp, due: "", status: "Open", notes: "" })), waiver: null, estimateContract: Math.round(E.calc(est).contract) };
    apps.forEach((a, i) => fillVendorBills(A, i));
    return A;
  }

  let A = load("admin");
  if (!A || !A.sov) { A = demoAdmin(getEstimate()); save("admin", A); }
  const ui = { app: A.apps.length - 1 };

  // ---------- billing math ----------
  function approvedCOs(periodTo) {
    return A.cos.filter((c) => c.status === "Approved" && (!periodTo || !c.approvedDate || c.approvedDate <= periodTo));
  }

  function calcApp(idx) {
    const app = A.apps[idx];
    const ret = num(app.retPct) / 100, sret = num(app.sretPct) / 100;
    const cos = approvedCOs(app.periodTo);
    const rows = A.sov.map((s) => ({ key: s.id, item: s.item, desc: s.desc, C: num(s.value), isCO: false }))
      .concat(cos.map((c, i) => ({ key: c.id, item: String(A.sov.length + i + 1), desc: `${c.no} ${c.desc}`, C: num(c.approved), isCO: true })));
    const t = { C: 0, D: 0, E: 0, F: 0, G: 0, H: 0, I: 0, DE: 0 };
    rows.forEach((r) => {
      r.D = 0;
      for (let k = 0; k < idx; k++) r.D += num(A.apps[k].lines[r.key]?.work);
      r.E = num(app.lines[r.key]?.work);
      r.F = num(app.lines[r.key]?.stored);
      r.G = r.D + r.E + r.F;
      r.pct = r.C ? r.G / r.C : 0;
      r.H = r.C - r.G;
      r.I = (r.D + r.E) * ret + r.F * sret;
      ["C", "D", "E", "F", "G", "H", "I"].forEach((k) => (t[k] += r[k]));
      t.DE += r.D + r.E;
    });
    const l1 = A.sov.reduce((a, s) => a + num(s.value), 0);
    const l2 = cos.reduce((a, c) => a + num(c.approved), 0);
    const l3 = l1 + l2;
    const l4 = t.G;
    const l5a = t.DE * ret, l5b = t.F * sret, l5 = l5a + l5b;
    const l6 = l4 - l5;
    const l7 = idx > 0 ? calcApp(idx - 1).g.l6 : 0;
    const l8 = l6 - l7;
    const l9 = l3 - l6;
    const prevPeriod = idx > 0 ? A.apps[idx - 1].periodTo : "";
    const coPrev = cos.filter((c) => prevPeriod && c.approvedDate && c.approvedDate <= prevPeriod);
    const coThis = cos.filter((c) => !coPrev.includes(c));
    const sumSign = (arr, pos) => arr.reduce((a, c) => a + (pos ? Math.max(0, num(c.approved)) : Math.min(0, num(c.approved))), 0);
    return {
      rows, t,
      g: { l1, l2, l3, l4, l5a, l5b, l5, l6, l7, l8, l9, ret, sret, coPrevAdd: sumSign(coPrev, true), coPrevDed: sumSign(coPrev, false), coThisAdd: sumSign(coThis, true), coThisDed: sumSign(coThis, false) },
    };
  }

  function fillVendorBills(state, idx) {
    const AA = state || A;
    const app = AA.apps[idx];
    const prev = idx > 0 ? AA.apps[idx - 1] : null;
    app.vendorBills = app.vendorBills || {};
    AA.vendors.forEach((v) => {
      const work = num(app.lines[v.sovId]?.work) + num(app.lines[v.sovId]?.stored) - (prev ? num(prev.lines[v.sovId]?.stored) : 0);
      const thisP = Math.max(0, Math.round(work * num(v.share)));
      const lastP = prev ? num(prev.vendorBills?.[v.id]?.thisPeriod) : 0;
      app.vendorBills[v.id] = { thisPeriod: thisP, paidLast: prev && prev.status === "Paid" ? lastP : 0 };
    });
  }

  // ---------- inputs ----------
  function inp(key, value, opts = {}) {
    const type = opts.type || "number";
    const v = value === null || value === undefined ? "" : value;
    return `<input type="${type}" ${type === "number" ? 'step="any"' : ""} data-key="${key}" value="${esc(v)}" ${opts.ph !== undefined ? `placeholder="${esc(opts.ph)}"` : ""} ${opts.w ? `style="width:${opts.w}"` : ""} aria-label="${esc(opts.label || key)}" ${opts.disabled ? "disabled" : ""}>`;
  }
  function sel(key, value, options, label) {
    return `<select data-key="${key}" aria-label="${esc(label || key)}">${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`;
  }

  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-key]");
    if (!el) return;
    const k = el.dataset.key.split(":");
    const isNum = el.type === "number";
    const v = el.type === "checkbox" ? el.checked : isNum ? (el.value === "" ? 0 : num(el.value)) : el.value;
    const app = A.apps[ui.app];
    switch (k[0]) {
      case "c": A.contract[k[1]] = v; break;
      case "sov": { const s = A.sov.find((x) => x.id === k[1]); if (s) s[k[2]] = v; break; }
      case "co": { const c = A.cos.find((x) => x.id === k[1]); if (c) { c[k[2]] = v; if (k[2] === "status" && v === "Approved") { if (!c.approved) c.approved = c.requested; if (!c.approvedDate) c.approvedDate = window.GCW.today(); } } break; }
      case "app": app[k[1]] = v; if (k[1] === "status" && v === "Paid" && !app.paidDate) app.paidDate = window.GCW.today(); break;
      case "ln": {
        const key = k[1];
        app.lines[key] = app.lines[key] || { work: 0, stored: 0 };
        if (k[2] === "pct") {
          const r = calcApp(ui.app).rows.find((x) => x.key === key);
          app.lines[key].work = Math.round((num(el.value) / 100) * r.C - r.D - r.F);
        } else app.lines[key][k[2]] = v;
        break;
      }
      case "chk": app.checklist[+k[1]][k[2]] = v; break;
      case "vb": { app.vendorBills[k[1]] = app.vendorBills[k[1]] || {}; app.vendorBills[k[1]][k[2]] = v; break; }
      case "ven": { const vd = A.vendors.find((x) => x.id === k[1]); if (vd) vd[k[2]] = v; break; }
      case "cl": { const it = A.closeout.find((x) => x.id === k[1]); if (it) it[k[2]] = v; break; }
      case "w": A.waiver[k[1]] = v; break;
      case "ui": ui[k[1]] = isNum || /^\d+$/.test(el.value) ? +el.value : el.value; break;
    }
    commit();
  });

  function commit() {
    const fk = document.activeElement?.dataset?.key;
    save("admin", A);
    renderAll();
    if (fk) { const f = document.querySelector(`[data-key="${CSS.escape(fk)}"]`); if (f) f.focus(); }
  }

  // ---------- renderers ----------
  function renderHead() {
    const g = A.apps.length ? calcApp(A.apps.length - 1).g : null;
    $("#adm-title").textContent = A.contract.projectName || "Admin workbook";
    $("#adm-sub").textContent = g ? `Contract sum to date ${fmt.money(g.l3)}. Billed ${fmt.pct(g.l3 ? g.l4 / g.l3 : 0)} through pay app ${A.apps.length}.` : "Contract, billing, waivers, and closeout in one place.";
  }

  function renderContract() {
    const c = A.contract;
    const total = A.sov.reduce((a, s) => a + num(s.value), 0);
    const est = getEstimate();
    const estContract = Math.round(E.calc(est).contract);
    const diff = total - estContract;
    const rows = A.sov.map((s) => `<tr>
      <td style="width:70px">${inp(`sov:${s.id}:item`, s.item, { type: "text", label: "Item" })}</td>
      <td>${inp(`sov:${s.id}:desc`, s.desc, { type: "text", label: "Description" })}</td>
      <td style="width:160px">${inp(`sov:${s.id}:value`, s.value, { label: "Scheduled value" })}</td>
      <td class="num">${fmt.pct(total ? num(s.value) / total : 0)}</td>
      <td><button class="btn-x" data-act="del-sov" data-id="${s.id}" aria-label="Delete line">&times;</button></td>
    </tr>`).join("");
    $("#t-contract").innerHTML = `
      <div class="two-col">
        <div>
          <div class="sheet">
            <div class="sheet-head"><h3>Schedule of values</h3><div class="actions"><button data-act="add-sov">Add line</button></div>
              <p>Built from the final estimate so billing ties back to how the job was priced. Lenders see these lines on every pay app.</p></div>
            ${diff !== 0 ? `<div class="note red"><p>The SOV total is ${fmt.money(Math.abs(diff))} ${diff > 0 ? "over" : "under"} the current estimate contract of ${fmt.money(estContract)}. Rebuild from the estimate or adjust lines so they tie.</p></div>` : `<div class="note"><p>SOV ties to the estimate contract of ${fmt.money(estContract)} to the dollar.</p></div>`}
            <div class="table-wrap"><table class="grid">
              <thead><tr><th>Item</th><th>Description of work</th><th class="num">Scheduled value</th><th class="num">Share</th><th></th></tr></thead>
              <tbody>${rows}<tr class="total"><td colspan="2">Original contract sum</td><td class="num">${fmt.money(total)}</td><td></td><td></td></tr></tbody>
            </table></div>
          </div>
        </div>
        <div>
          <div class="sheet">
            <h3>Contract</h3>
            <div class="grid-form" style="grid-template-columns:1fr">
              <div class="field"><label>Project</label>${inp("c:projectName", c.projectName, { type: "text" })}</div>
              <div class="field"><label>Project address</label>${inp("c:projectAddress", c.projectAddress, { type: "text" })}</div>
              <div class="field"><label>Job number</label>${inp("c:jobNo", c.jobNo, { type: "text" })}</div>
              <div class="field"><label>Owner</label>${inp("c:owner", c.owner, { type: "text" })}</div>
              <div class="field"><label>Lender</label>${inp("c:lender", c.lender, { type: "text" })}</div>
              <div class="field"><label>Owner address</label>${inp("c:ownerAddress", c.ownerAddress, { type: "text" })}</div>
              <div class="field"><label>Contractor</label>${inp("c:contractor", c.contractor, { type: "text" })}</div>
              <div class="field"><label>Contractor address</label>${inp("c:contractorAddress", c.contractorAddress, { type: "text" })}</div>
              <div class="field"><label>Architect (optional)</label>${inp("c:architect", c.architect, { type: "text" })}</div>
              <div class="field"><label>Contract for</label>${inp("c:contractFor", c.contractFor, { type: "text", ph: "General construction" })}</div>
              <div class="field"><label>Contract date</label>${inp("c:contractDate", c.contractDate, { type: "date" })}</div>
              <div class="field"><label>Retainage on completed work %</label>${inp("c:retainagePct", c.retainagePct)}<span class="hint">Arizona private work: the contract sets a reasonable amount. 5% is the default here.</span></div>
              <div class="field"><label>Retainage on stored materials %</label>${inp("c:storedRetainagePct", c.storedRetainagePct)}</div>
              <div class="field"><label>Signer name</label>${inp("c:signer", c.signer, { type: "text" })}</div>
              <div class="field"><label>Signer title</label>${inp("c:signerTitle", c.signerTitle, { type: "text" })}</div>
            </div>
          </div>
          <div class="sheet">
            <h3>Rebuild from estimate</h3>
            <p class="muted">Pull the latest estimate into the SOV. Pay app billing on existing lines is cleared, so do this before the first pay app.</p>
            <div class="grid-form" style="grid-template-columns:1fr">
              <div class="field"><label>SOV detail</label>${sel("c:sovMode", c.sovMode, [["division", "One line per division"], ["line", "One line per scope"]], "SOV detail")}</div>
              <label style="display:flex;gap:.5rem;align-items:center"><input type="checkbox" data-key="c:gcSeparate" ${c.gcSeparate ? "checked" : ""}> Show general conditions, fee, insurance, and tax as their own lines</label>
            </div>
          </div>
        </div>
      </div>`;
  }

  function renderCOs() {
    const approved = A.cos.filter((c) => c.status === "Approved").reduce((a, c) => a + num(c.approved), 0);
    const pending = A.cos.filter((c) => c.status === "Pending").reduce((a, c) => a + num(c.requested), 0);
    const orig = A.sov.reduce((a, s) => a + num(s.value), 0);
    const st = { Approved: "green", Pending: "amber", Draft: "gray", Rejected: "red" };
    const rows = A.cos.map((c) => `<tr>
      <td style="width:90px">${inp(`co:${c.id}:no`, c.no, { type: "text", label: "CO number" })}</td>
      <td style="min-width:260px">${inp(`co:${c.id}:desc`, c.desc, { type: "text", label: "Description" })}</td>
      <td style="width:150px">${inp(`co:${c.id}:reason`, c.reason, { type: "text", label: "Reason" })}</td>
      <td style="width:140px">${inp(`co:${c.id}:submitted`, c.submitted, { type: "date", label: "Submitted" })}</td>
      <td style="width:120px">${sel(`co:${c.id}:status`, c.status, ["Draft", "Pending", "Approved", "Rejected"], "Status")}</td>
      <td style="width:120px">${inp(`co:${c.id}:requested`, c.requested, { label: "Requested" })}</td>
      <td style="width:120px">${inp(`co:${c.id}:approved`, c.approved, { label: "Approved", disabled: c.status !== "Approved" })}</td>
      <td style="width:140px">${inp(`co:${c.id}:approvedDate`, c.approvedDate, { type: "date", label: "Approved date", disabled: c.status !== "Approved" })}</td>
      <td style="width:70px">${inp(`co:${c.id}:days`, c.days, { label: "Schedule days" })}</td>
      <td>${stamp(c.status, st[c.status] || "gray")}</td>
      <td><button class="btn-x" data-act="del-co" data-id="${c.id}" aria-label="Delete change order">&times;</button></td>
    </tr>`).join("");
    $("#t-cos").innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${fmt.money(orig)}</div><div class="l">Original contract</div></div>
        <div class="stat"><div class="v">${fmt.money(approved)}</div><div class="l">Approved changes</div></div>
        <div class="stat"><div class="v">${fmt.money(orig + approved)}</div><div class="l">Revised contract</div></div>
        <div class="stat"><div class="v">${fmt.money(pending)}</div><div class="l">Pending exposure</div></div>
        <div class="stat"><div class="v">${A.cos.filter((c) => c.status === "Approved").reduce((a, c) => a + num(c.days), 0)}</div><div class="l">Approved schedule days</div></div>
      </div>
      <div class="sheet-head"><h3>Change order log</h3><div class="actions"><button data-act="add-co">Add change order</button></div>
        <p>Request, price, approve. Approved change orders land on the next pay app as their own lines, dated by approval.</p></div>
      <div class="table-wrap"><table class="grid">
        <thead><tr><th>No.</th><th>Description</th><th>Reason</th><th>Submitted</th><th>Status</th><th class="num">Requested</th><th class="num">Approved</th><th>Approved on</th><th class="num">Days</th><th></th><th></th></tr></thead>
        <tbody>${rows || `<tr><td colspan="11" class="muted" style="padding:1rem">No change orders yet.</td></tr>`}</tbody>
      </table></div>`;
  }

  function appPicker() {
    const st = { Paid: "green", Submitted: "blue", Draft: "amber" };
    return `<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
      ${A.apps.map((a, i) => `<button data-act="pick-app" data-i="${i}" ${i === ui.app ? 'class="btn-primary"' : ""}>Pay app ${a.no} &nbsp;${stamp(a.status, i === ui.app ? "gray" : st[a.status] || "gray")}</button>`).join("")}
      <button class="btn-ghost" data-act="new-app">New pay application</button>
    </div>`;
  }

  function g702Table(g, app) {
    return `<table class="grid">
      <tbody>
        <tr><td>1. Original contract sum</td><td class="num">${fmt.money2(g.l1)}</td></tr>
        <tr><td>2. Net change by change orders</td><td class="num">${fmt.money2(g.l2)}</td></tr>
        <tr class="subtotal"><td>3. Contract sum to date (1 + 2)</td><td class="num">${fmt.money2(g.l3)}</td></tr>
        <tr><td>4. Total completed & stored to date (column G)</td><td class="num">${fmt.money2(g.l4)}</td></tr>
        <tr><td style="padding-left:1.5rem">a. ${fmt.num2(app.retPct)}% of completed work</td><td class="num">${fmt.money2(g.l5a)}</td></tr>
        <tr><td style="padding-left:1.5rem">b. ${fmt.num2(app.sretPct)}% of stored material</td><td class="num">${fmt.money2(g.l5b)}</td></tr>
        <tr><td>5. Total retainage</td><td class="num">${fmt.money2(g.l5)}</td></tr>
        <tr><td>6. Total earned less retainage (4 &minus; 5)</td><td class="num">${fmt.money2(g.l6)}</td></tr>
        <tr><td>7. Less previous payment requests (line 6 prior)</td><td class="num">${fmt.money2(g.l7)}</td></tr>
        <tr class="total"><td>8. Current payment due</td><td class="num">${fmt.money2(g.l8)}</td></tr>
        <tr><td>9. Balance to finish, including retainage (3 &minus; 6)</td><td class="num">${fmt.money2(g.l9)}</td></tr>
      </tbody>
    </table>`;
  }

  function renderPayApp() {
    if (!A.apps.length) {
      $("#t-payapp").innerHTML = `<div class="sheet-head"><h3>Pay applications</h3></div><p>No pay applications yet. Create the first one when the period closes.</p>${appPicker()}`;
      return;
    }
    const app = A.apps[ui.app];
    const { rows, t, g } = calcApp(ui.app);
    const st = { Paid: "green", Submitted: "blue", Draft: "amber" };
    const body = rows.map((r) => `<tr ${r.isCO ? 'style="background:#fbf8f2"' : ""}>
      <td>${esc(r.item)}</td>
      <td style="min-width:220px">${esc(r.desc)}</td>
      <td class="num">${fmt.money(r.C)}</td>
      <td class="num">${fmt.money(r.D)}</td>
      <td><input type="number" step="any" class="w-qty" data-key="ln:${r.key}:work" value="${num(app.lines[r.key]?.work)}" aria-label="This period"></td>
      <td style="width:84px">${inp(`ln:${r.key}:pct`, r.C ? Math.round(((r.D + r.E + r.F) / r.C) * 1000) / 10 : 0, { label: "Percent complete to date", w: "80px" })}</td>
      <td><input type="number" step="any" class="w-qty" data-key="ln:${r.key}:stored" value="${num(app.lines[r.key]?.stored)}" aria-label="Materials stored"></td>
      <td class="num">${fmt.money(r.G)}</td>
      <td class="num">${fmt.pct(r.pct)}</td>
      <td class="num">${fmt.money(r.H)}</td>
      <td class="num">${fmt.money(r.I)}</td>
    </tr>`).join("");
    $("#t-payapp").innerHTML = `
      <div class="sheet-head no-print">${appPicker()}</div>
      <div class="two-col" style="grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)">
        <div class="sheet">
          <div class="sheet-head"><h3>Application summary, pay app ${app.no}</h3> ${stamp(app.status, st[app.status] || "gray")}
            <div class="actions"><button data-act="print-app">Print / PDF</button><button class="btn-primary" data-act="xlsx-app">Download Pay App</button></div></div>
          ${g702Table(g, app)}
          <p class="muted" style="margin-top:.6rem">For retainage release on the final pay app, set retainage to 0%.</p>
        </div>
        <div>
          <div class="sheet">
            <div class="grid-form" style="grid-template-columns:1fr 1fr">
              <div class="field"><label>Period to</label>${inp("app:periodTo", app.periodTo, { type: "date" })}</div>
              <div class="field"><label>Application date</label>${inp("app:appDate", app.appDate, { type: "date" })}</div>
              <div class="field"><label>Retainage, work %</label>${inp("app:retPct", app.retPct)}</div>
              <div class="field"><label>Retainage, stored %</label>${inp("app:sretPct", app.sretPct)}</div>
              <div class="field"><label>Status</label>${sel("app:status", app.status, ["Draft", "Submitted", "Paid"], "Status")}</div>
              <div class="field"><label>Paid on</label>${inp("app:paidDate", app.paidDate, { type: "date" })}</div>
            </div>
          </div>
          <div class="sheet">
            <h3>Change order summary</h3>
            <table class="grid"><thead><tr><th></th><th class="num">Additions</th><th class="num">Deductions</th></tr></thead><tbody>
              <tr><td>Approved in previous months</td><td class="num">${fmt.money(g.coPrevAdd)}</td><td class="num">${fmt.money(g.coPrevDed)}</td></tr>
              <tr><td>Approved this month</td><td class="num">${fmt.money(g.coThisAdd)}</td><td class="num">${fmt.money(g.coThisDed)}</td></tr>
              <tr class="total"><td>Net change by change orders</td><td class="num" colspan="2">${fmt.money(g.l2)}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>
      <div class="sheet">
        <div class="sheet-head"><h3>Continuation sheet</h3>
          <p>Enter this period's work in dollars or as percent complete to date. Stored materials are the balance on hand at period end, not yet installed. Approved change orders appear as their own lines.</p></div>
        <div class="table-wrap"><table class="grid">
          <thead><tr>
            <th><span class="col-letter">A</span>Item</th><th><span class="col-letter">B</span>Description of work</th><th class="num"><span class="col-letter">C</span>Scheduled value</th><th class="num"><span class="col-letter">D</span>From previous</th><th class="num"><span class="col-letter">E</span>This period</th><th class="num">% to date</th><th class="num"><span class="col-letter">F</span>Stored now</th><th class="num"><span class="col-letter">G</span>Completed & stored</th><th class="num">G &divide; C</th><th class="num"><span class="col-letter">H</span>Balance to finish</th><th class="num"><span class="col-letter">I</span>Retainage</th>
          </tr></thead>
          <tbody>${body}
            <tr class="total"><td colspan="2">Totals</td><td class="num">${fmt.money(t.C)}</td><td class="num">${fmt.money(t.D)}</td><td class="num">${fmt.money(t.E)}</td><td></td><td class="num">${fmt.money(t.F)}</td><td class="num">${fmt.money(t.G)}</td><td class="num">${fmt.pct(t.C ? t.G / t.C : 0)}</td><td class="num">${fmt.money(t.H)}</td><td class="num">${fmt.money(t.I)}</td></tr>
          </tbody>
        </table></div>
      </div>`;
  }

  function waiverList(idx) {
    const app = A.apps[idx];
    const prev = idx > 0 ? A.apps[idx - 1] : null;
    const c = A.contract;
    const g = calcApp(idx).g;
    const base = { project: c.projectName, jobNo: c.jobNo, owner: c.owner, jobDesc: `${c.projectName}, ${c.projectAddress}`, date: "" };
    const list = [];
    A.vendors.forEach((v) => {
      const vb = app.vendorBills?.[v.id] || {};
      if (num(vb.thisPeriod) > 0) list.push({ who: v.name, type: "az-cp", amount: num(vb.thisPeriod), through: app.periodTo, f: Object.assign({}, base, { maker: c.contractor, payee: v.name, amount: num(vb.thisPeriod), contractedWith: c.contractor, through: app.periodTo, company: v.name }) });
      if (num(vb.paidLast) > 0 && prev) list.push({ who: v.name, type: "az-up", amount: num(vb.paidLast), through: prev.periodTo, f: Object.assign({}, base, { maker: c.contractor, payee: v.name, amount: num(vb.paidLast), contractedWith: c.contractor, through: prev.periodTo, company: v.name }) });
    });
    list.push({ who: `${c.contractor} (GC)`, type: "az-cp", amount: g.l8, through: app.periodTo, f: Object.assign({}, base, { maker: c.lender || c.owner, payee: c.contractor, amount: g.l8, contractedWith: c.owner, through: app.periodTo, company: c.contractor, title: c.signerTitle }) });
    if (prev && prev.status === "Paid") {
      const pg = calcApp(idx - 1).g;
      list.push({ who: `${c.contractor} (GC)`, type: "az-up", amount: pg.l8, through: prev.periodTo, f: Object.assign({}, base, { maker: c.lender || c.owner, payee: c.contractor, amount: pg.l8, contractedWith: c.owner, through: prev.periodTo, company: c.contractor, title: c.signerTitle }) });
    }
    return list;
  }

  function renderDraw() {
    if (!A.apps.length) { $("#t-draw").innerHTML = "<p>Create a pay application first.</p>"; return; }
    const app = A.apps[ui.app];
    const g = calcApp(ui.app).g;
    const done = app.checklist.filter((c) => c.status === "Received" || c.status === "N/A").length;
    const chk = app.checklist.map((c, i) => `<tr>
      <td>${esc(c.item)}</td>
      <td style="min-width:130px">${sel(`chk:${i}:status`, c.status, ["Not started", "Requested", "Received", "N/A"], "Status")}</td>
      <td style="min-width:140px">${inp(`chk:${i}:notes`, c.notes, { type: "text", label: "Notes" })}</td>
    </tr>`).join("");
    const sovOpts = A.sov.map((s) => [s.id, `${s.item}. ${s.desc}`]);
    const ven = A.vendors.map((v) => {
      const vb = app.vendorBills?.[v.id] || {};
      return `<tr>
        <td style="min-width:180px">${inp(`ven:${v.id}:name`, v.name, { type: "text", label: "Vendor" })}</td>
        <td style="min-width:200px">${sel(`ven:${v.id}:sovId`, v.sovId, sovOpts, "SOV line")}</td>
        <td style="width:80px">${inp(`ven:${v.id}:share`, v.share, { label: "Share of line" })}</td>
        <td style="width:130px">${inp(`vb:${v.id}:thisPeriod`, vb.thisPeriod, { label: "Billed this period" })}</td>
        <td style="width:130px">${inp(`vb:${v.id}:paidLast`, vb.paidLast, { label: "Paid last period" })}</td>
        <td><button class="btn-x" data-act="del-ven" data-id="${v.id}" aria-label="Delete vendor">&times;</button></td>
      </tr>`;
    }).join("");
    const wl = waiverList(ui.app).map((w) => `<tr><td>${esc(w.who)}</td><td>${esc(W.TYPES[w.type].short)}</td><td class="num">${fmt.money2(w.amount)}</td><td>${fmt.date(w.through)}</td></tr>`).join("");
    $("#t-draw").innerHTML = `
      <div class="sheet-head no-print">${appPicker()}</div>
      <div class="stats">
        <div class="stat"><div class="v">${fmt.money(g.l8)}</div><div class="l">Draw amount, pay app ${app.no}</div></div>
        <div class="stat"><div class="v">${done} of ${app.checklist.length}</div><div class="l">Package items in hand</div></div>
        <div class="stat"><div class="v">${waiverList(ui.app).length}</div><div class="l">Lien waivers needed</div></div>
        <div class="stat"><div class="v">${fmt.money(g.l5)}</div><div class="l">Retainage held to date</div></div>
      </div>
      <div class="sheet">
        <div class="sheet-head"><h3>Subcontractor & supplier billing</h3>
          <div class="actions"><button data-act="fill-vb">Fill from pay app</button><button data-act="add-ven">Add vendor</button></div>
          <p>Each vendor ties to an SOV line and a share of it. Billed this period drives conditional waivers. Paid last period drives unconditional waivers.</p></div>
        <div class="table-wrap"><table class="grid">
          <thead><tr><th>Vendor</th><th>SOV line</th><th class="num">Share</th><th class="num">Billed this period</th><th class="num">Paid last period</th><th></th></tr></thead>
          <tbody>${ven}</tbody>
        </table></div>
      </div>
      <div class="two-col" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
        <div class="sheet">
          <div class="sheet-head"><h3>Waivers for this draw</h3>
            <div class="actions"><button data-act="print-waivers">Print all waivers</button></div>
            <p>Conditionals cover this period. Unconditionals cover last period's payments. Arizona statutory forms.</p></div>
          <div class="table-wrap"><table class="grid">
            <thead><tr><th>From</th><th>Form</th><th class="num">Amount</th><th>Through</th></tr></thead>
            <tbody>${wl}</tbody>
          </table></div>
        </div>
        <div class="sheet">
          <div class="sheet-head"><h3>Draw package checklist</h3>
            <div class="actions"><button class="btn-primary" data-act="xlsx-draw">Download draw package</button></div>
            <p>Everything the lender asks for, tracked per draw.</p></div>
          <div class="table-wrap"><table class="grid">
            <thead><tr><th>Item</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>${chk}</tbody>
          </table></div>
        </div>
      </div>`;
  }

  function renderWaiverForm() {
    const c = A.contract;
    if (!A.waiver) A.waiver = { type: "az-cp", project: c.projectName, jobNo: c.jobNo, maker: c.contractor, amount: 0, payee: "", owner: c.owner, jobDesc: `${c.projectName}, ${c.projectAddress}`, contractedWith: c.contractor, through: A.apps[A.apps.length - 1]?.periodTo || "", disputed: 0, date: "", company: "", title: "" };
    const w = A.waiver;
    const t = W.TYPES[w.type];
    const field = (k, label, type = "text", hint = "") => `<div class="field"><label>${label}</label>${inp(`w:${k}`, w[k], { type })}${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
    $("#t-waiver").innerHTML = `
      <div class="two-col" style="grid-template-columns:340px minmax(0,1fr)">
        <div class="sheet no-print">
          <h3>Waiver details</h3>
          <div class="grid-form" style="grid-template-columns:1fr">
            <div class="field"><label>Form</label>${sel("w:type", w.type, Object.entries(W.TYPES).map(([k, v]) => [k, v.label]), "Form")}</div>
            ${field("project", "Project")}
            ${field("jobNo", "Job number")}
            ${t.conditional ? field("maker", "Maker of check") : ""}
            ${field("amount", t.final && !t.conditional ? "Amount paid (reference only)" : "Amount", "number")}
            ${t.conditional ? field("payee", "Payee") : ""}
            ${field("owner", "Owner")}
            ${field("jobDesc", "Job description / location")}
            ${field("contractedWith", "Undersigned contracted with")}
            ${!t.final ? field("through", "Through date", "date") : ""}
            ${t.final ? field("disputed", "Disputed claims amount", "number") : ""}
            ${field("company", "Signing company")}
            ${field("title", "Signer title")}
            ${field("date", "Date", "date", "Leave blank to date at signing.")}
          </div>
          <button class="btn-primary" data-act="print-waiver" style="margin-top:1rem">Print / PDF</button>
          <p class="muted" style="margin-top:.75rem">Arizona form text follows <a href="${D.SOURCES.azWaiver.url}" target="_blank" rel="noopener">A.R.S. 33-1008</a>. A waiver that doesn't substantially follow the statutory form is unenforceable unless the claimant was actually paid. Confirm wording before use. Not legal advice.</p>
        </div>
        <div id="waiver-preview">${W.render(w.type, w)}</div>
      </div>`;
  }

  function renderCloseout() {
    const items = A.closeout;
    const done = items.filter((i) => i.status === "Done" || i.status === "N/A").length;
    const cats = [...new Set(items.map((i) => i.cat))];
    const st = { Done: "green", "In progress": "amber", Open: "gray", "N/A": "gray" };
    const rows = cats.map((cat) => {
      const its = items.filter((i) => i.cat === cat);
      return `<tr class="group"><td colspan="6">${esc(cat)} <span class="muted" style="font-family:var(--body);font-weight:500">${its.filter((i) => i.status === "Done" || i.status === "N/A").length} of ${its.length}</span></td></tr>` + its.map((i) => `<tr>
        <td style="min-width:300px">${inp(`cl:${i.id}:item`, i.item, { type: "text", label: "Item" })}</td>
        <td style="width:170px">${inp(`cl:${i.id}:resp`, i.resp, { type: "text", label: "Responsible" })}</td>
        <td style="width:150px">${inp(`cl:${i.id}:due`, i.due, { type: "date", label: "Due" })}</td>
        <td style="width:140px">${sel(`cl:${i.id}:status`, i.status, ["Open", "In progress", "Done", "N/A"], "Status")}</td>
        <td style="min-width:160px">${inp(`cl:${i.id}:notes`, i.notes, { type: "text", label: "Notes" })}</td>
        <td>${stamp(i.status, st[i.status] || "gray")}</td>
      </tr>`).join("");
    }).join("");
    $("#t-closeout").innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${done} of ${items.length}</div><div class="l">Closeout items complete</div></div>
        <div class="stat"><div class="v">${items.filter((i) => i.status === "In progress").length}</div><div class="l">In progress</div></div>
        <div class="stat"><div class="v">${items.filter((i) => i.due && i.due < window.GCW.today() && i.status !== "Done" && i.status !== "N/A").length}</div><div class="l">Past due</div></div>
        <div class="stat"><div class="v">${fmt.money(A.apps.length ? calcApp(A.apps.length - 1).g.l5 : 0)}</div><div class="l">Retainage waiting on closeout</div></div>
      </div>
      <div class="sheet-head"><h3>Closeout tracker</h3><div class="actions"><button data-act="add-cl">Add item</button><button data-act="xlsx-cl">Download Excel</button></div>
        <p>Retainage comes out when this list is done. Draft list for Phoenix-area residential work. Edit it to match your contract.</p></div>
      <div class="table-wrap"><table class="grid">
        <thead><tr><th>Item</th><th>Responsible</th><th>Due</th><th>Status</th><th>Notes</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  function renderAll() {
    renderHead();
    renderContract();
    renderCOs();
    renderPayApp();
    renderDraw();
    renderWaiverForm();
    renderCloseout();
  }

  // ---------- printing ----------
  function payAppDoc(idx) {
    const app = A.apps[idx];
    const c = A.contract;
    const { rows, t, g } = calcApp(idx);
    const body = rows.map((r) => `<tr><td>${esc(r.item)}</td><td>${esc(r.desc)}</td><td class="num">${fmt.money2(r.C)}</td><td class="num">${fmt.money2(r.D)}</td><td class="num">${fmt.money2(r.E)}</td><td class="num">${fmt.money2(r.F)}</td><td class="num">${fmt.money2(r.G)}</td><td class="num">${fmt.pct(r.pct)}</td><td class="num">${fmt.money2(r.H)}</td><td class="num">${fmt.money2(r.I)}</td></tr>`).join("");
    const L = (n, label, v, bold) => `<tr><td style="width:24px">${n}</td><td>${label}</td><td class="num" ${bold ? 'style="font-weight:700"' : ""}>${fmt.money2(v)}</td></tr>`;
    return `
      <div class="doc">
        <h2>Application for Payment</h2>
        <table class="noborder" style="margin-bottom:10px"><tr>
          <td style="width:50%"><strong>To owner:</strong> ${esc(c.owner)}<br><strong>Lender:</strong> ${esc(c.lender)}<br><strong>From contractor:</strong> ${esc(c.contractor)}</td>
          <td><strong>Project:</strong> ${esc(c.projectName)}<br>${esc(c.projectAddress)}<br><strong>Job no.:</strong> ${esc(c.jobNo)} &nbsp; <strong>Contract date:</strong> ${fmt.date(c.contractDate)}</td>
          <td><strong>Application no.:</strong> ${app.no}<br><strong>Period to:</strong> ${fmt.date(app.periodTo)}<br><strong>Application date:</strong> ${fmt.date(app.appDate)}</td>
        </tr></table>
        <table style="width:60%;float:left;margin-right:2%">
          ${L(1, "Original contract sum", g.l1)}
          ${L(2, "Net change by change orders", g.l2)}
          ${L(3, "Contract sum to date (line 1 + 2)", g.l3)}
          ${L(4, "Total completed and stored to date (column G)", g.l4)}
          <tr><td>5</td><td>Retainage: a. ${fmt.num2(app.retPct)}% of completed work ${fmt.money2(g.l5a)}; b. ${fmt.num2(app.sretPct)}% of stored material ${fmt.money2(g.l5b)}. Total retainage</td><td class="num">${fmt.money2(g.l5)}</td></tr>
          ${L(6, "Total earned less retainage (line 4 less line 5)", g.l6)}
          ${L(7, "Less previous payment requests (line 6 from prior application)", g.l7)}
          ${L(8, "Current payment due", g.l8, true)}
          ${L(9, "Balance to finish, including retainage (line 3 less line 6)", g.l9)}
        </table>
        <table style="width:38%">
          <tr><th>Change order summary</th><th>Additions</th><th>Deductions</th></tr>
          <tr><td>Approved in previous months</td><td class="num">${fmt.money2(g.coPrevAdd)}</td><td class="num">${fmt.money2(g.coPrevDed)}</td></tr>
          <tr><td>Approved this month</td><td class="num">${fmt.money2(g.coThisAdd)}</td><td class="num">${fmt.money2(g.coThisDed)}</td></tr>
          <tr><td>Net change by change orders</td><td class="num" colspan="2">${fmt.money2(g.l2)}</td></tr>
        </table>
        <div style="clear:both"></div>
        <table class="noborder" style="margin-top:14px"><tr>
          <td style="width:50%;vertical-align:top"><strong>Contractor statement.</strong> This request reflects work performed and materials stored through the period end date. Payments received on earlier requests have gone to the subcontractors and suppliers who performed that work. The amount requested is due under the contract.
            <div style="margin-top:14px">Contractor: ${esc(c.contractor)}</div>
            <div class="sig" style="margin-top:6px"></div>By: ${esc(c.signer || "")} ${c.signerTitle ? ", " + esc(c.signerTitle) : ""} &nbsp; Date:
            <div style="margin-top:10px;font-size:10px">Notarization, if required by lender: State of ________ County of ________. Subscribed and sworn before me this ____ day of ________, 20__. Notary: ______________ My commission expires: ________</div>
          </td>
          <td style="vertical-align:top"><strong>Owner / lender approval.</strong>
            <div style="margin-top:10px">Amount approved: $ ______________________</div>
            <div style="margin-top:10px">Explain any difference from the amount requested:</div><div class="sig"></div><div class="sig"></div>
            <div style="margin-top:10px">Approved by: ______________________ Date: __________</div>
          </td>
        </tr></table>
      </div>
      <div class="doc">
        <h2>Continuation Sheet</h2>
        <p>Application no. ${app.no} &nbsp; Period to ${fmt.date(app.periodTo)} &nbsp; Project: ${esc(c.projectName)} &nbsp; Retainage ${fmt.num2(app.retPct)}% work, ${fmt.num2(app.sretPct)}% stored</p>
        <table>
          <tr><th>A<br>Item</th><th>B<br>Description of work</th><th>C<br>Scheduled value</th><th>D<br>From previous application (D + E)</th><th>E<br>Work this period</th><th>F<br>Materials presently stored (not in D or E)</th><th>G<br>Total completed and stored to date (D + E + F)</th><th>%<br>(G &divide; C)</th><th>H<br>Balance to finish (C &minus; G)</th><th>I<br>Retainage</th></tr>
          ${body}
          <tr style="font-weight:700"><td></td><td>Totals</td><td class="num">${fmt.money2(t.C)}</td><td class="num">${fmt.money2(t.D)}</td><td class="num">${fmt.money2(t.E)}</td><td class="num">${fmt.money2(t.F)}</td><td class="num">${fmt.money2(t.G)}</td><td class="num">${fmt.pct(t.C ? t.G / t.C : 0)}</td><td class="num">${fmt.money2(t.H)}</td><td class="num">${fmt.money2(t.I)}</td></tr>
        </table>
      </div>`;
  }

  const printDocs = (html, title) => window.GCW.printDocs(html, title);

  // ---------- Excel ----------
  const X = () => window.GCW_XL;

  function tableSheet(wb, h, name, header, rowsData, widths, moneyCols = []) {
    const ws = wb.addWorksheet(name, { views: [{ showGridLines: false }], pageSetup: { paperSize: 1, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    ws.columns = widths.map((w) => ({ width: w }));
    header.forEach((t, i) => h.set(ws, `${String.fromCharCode(65 + i)}1`, t, { sans: true, bold: true, size: 10, h: "center", wrap: true, fill: "FFE8EAE6" }));
    rowsData.forEach((r, ri) => r.forEach((v, i) => h.set(ws, `${String.fromCharCode(65 + i)}${ri + 2}`, v, { wrap: true, v: "top", fmt: moneyCols.includes(i) ? h.MONEY : undefined, h: moneyCols.includes(i) ? "right" : "left" })));
    h.gridRange(ws, `A1:${String.fromCharCode(64 + header.length)}${rowsData.length + 1}`);
    return ws;
  }
  function coExtras(wb, h) {
    tableSheet(wb, h, "Change Orders", ["No.", "Description", "Reason", "Submitted", "Status", "Requested", "Approved", "Approved on", "Days"],
      A.cos.map((c) => [c.no, c.desc, c.reason, c.submitted, c.status, num(c.requested), num(c.approved), c.approvedDate, num(c.days)]), [9, 48, 22, 12, 11, 14, 14, 12, 7], [5, 6]);
  }

  async function downloadPayApp() {
    try {
      const buf = await window.GCW_PAYAPP.build(A, ui.app, calcApp, { extras: coExtras });
      const ok = await window.GCW.saveFile(`${window.GCW.slug(A.contract.projectName)}-pay-app-${A.apps[ui.app].no}.xlsx`, buf);
      if (ok) toast("Pay app saved. Two sheets, ready to print. Formulas stay live.");
    } catch (e) { console.error(e); toast("The pay app couldn't be built. Check the entries and try again."); }
  }

  async function downloadDraw() {
    const app = A.apps[ui.app];
    try {
      const buf = await window.GCW_PAYAPP.build(A, ui.app, calcApp, {
        extras: (wb, h) => {
          coExtras(wb, h);
          tableSheet(wb, h, "Lien Waiver Log", ["From", "Form", "Amount", "Through", "Received"], waiverList(ui.app).map((w) => [w.who, W.TYPES[w.type].label, w.amount, fmt.date(w.through), ""]), [34, 50, 16, 14, 11], [2]);
          tableSheet(wb, h, "Draw Checklist", ["Item", "Status", "Notes"], app.checklist.map((c) => [c.item, c.status, c.notes]), [66, 14, 40]);
        },
      });
      const ok = await window.GCW.saveFile(`${window.GCW.slug(A.contract.projectName)}-draw-${app.no}.xlsx`, buf);
      if (ok) toast("Draw package saved.");
    } catch (e) { console.error(e); toast("The draw package couldn't be built. Check the entries and try again."); }
  }

  function downloadCloseout() {
    const aoa = [["Category", "Item", "Responsible", "Due", "Status", "Notes"]];
    A.closeout.forEach((i) => aoa.push([i.cat, i.item, i.resp, i.due, i.status, i.notes]));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    X().style(ws, { header: 0, border: true, widths: [24, 60, 20, 12, 12, 40], wrapCols: [1] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Closeout");
    window.GCW.saveWorkbook(wb, `${window.GCW.slug(A.contract.projectName)}-closeout.xlsx`);
  }

  // ---------- actions ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act, id = b.dataset.id;
    const app = A.apps[ui.app];
    switch (act) {
      case "add-sov": A.sov.push({ id: uid(), item: String(A.sov.length + 1), desc: "New line", value: 0, source: "manual" }); break;
      case "del-sov": window.GCW.ask("Delete this SOV line? Billing on it will be lost.", "Delete line", true).then((go) => { if (go) { A.sov = A.sov.filter((s) => s.id !== id); commit(); } }); return;
      case "add-co": A.cos.push({ id: uid(), no: `CO-${String(A.cos.length + 1).padStart(3, "0")}`, desc: "", reason: "", submitted: window.GCW.today(), status: "Draft", requested: 0, approved: 0, approvedDate: "", days: 0 }); break;
      case "del-co": A.cos = A.cos.filter((c) => c.id !== id); break;
      case "pick-app": ui.app = +b.dataset.i; break;
      case "new-app": {
        const last = A.apps[A.apps.length - 1];
        const next = last ? new Date(last.periodTo + "T00:00:00") : new Date();
        next.setDate(1); next.setMonth(next.getMonth() + 2); next.setDate(0);
        const a = newApp((last?.no || 0) + 1, next.toISOString().slice(0, 10), num(A.contract.retainagePct), num(A.contract.storedRetainagePct));
        // carry stored materials balance forward so it isn't dropped by accident
        if (last) Object.entries(last.lines).forEach(([k, v]) => { if (num(v.stored)) a.lines[k] = { work: 0, stored: num(v.stored) }; });
        A.apps.push(a);
        ui.app = A.apps.length - 1;
        fillVendorBills(A, ui.app);
        toast(`Pay app ${a.no} created. Enter this period's work.`);
        break;
      }
      case "print-app": printDocs(payAppDoc(ui.app), `${A.contract.projectName} pay app ${A.apps[ui.app].no}`); return;
      case "xlsx-app": downloadPayApp(); return;
      case "xlsx-draw": downloadDraw(); return;
      case "xlsx-cl": downloadCloseout(); return;
      case "print-waivers": printDocs(waiverList(ui.app).map((w) => W.render(w.type, w.f)).join(""), `${A.contract.projectName} lien waivers pay app ${A.apps[ui.app].no}`); return;
      case "print-waiver": printDocs(W.render(A.waiver.type, A.waiver), `lien waiver ${A.waiver.company || A.waiver.payee || ""}`); return;
      case "fill-vb": fillVendorBills(A, ui.app); toast("Vendor amounts filled from the pay app. Adjust to match actual invoices."); break;
      case "add-ven": A.vendors.push({ id: uid(), name: "New vendor", trade: "", sovId: A.sov[0]?.id, share: 1, contact: "" }); break;
      case "del-ven": A.vendors = A.vendors.filter((v) => v.id !== id); break;
      case "add-cl": A.closeout.push({ id: uid(), cat: "Other", item: "New item", resp: "", due: "", status: "Open", notes: "" }); break;
      default: return;
    }
    commit();
  });

  document.addEventListener("DOMContentLoaded", () => {
    $("#btn-sync").onclick = async () => {
      if (!(await window.GCW.ask("Rebuild the SOV from the current estimate? Pay app billing and vendor links on the current SOV will be cleared.", "Rebuild SOV", true))) return;
      const est = getEstimate();
      A.sov = E.buildSOV(est, A.contract.sovMode || "division", A.contract.gcSeparate !== false);
      A.apps.forEach((a) => { a.lines = {}; a.vendorBills = {}; });
      A.vendors.forEach((v) => { const pre = (DEMO_VENDORS.find((d) => d[1] === v.name) || [])[0]; const l = pre && A.sov.find((s) => String(s.source).startsWith(pre) || String(s.desc).startsWith(pre)); v.sovId = l ? l.id : A.sov[0]?.id; });
      // Vendors awarded in bid leveling carry over
      est.lines.filter((l) => l.vendor).forEach((l) => {
        if (A.vendors.some((v) => v.name === l.vendor)) return;
        const s = A.sov.find((x) => x.source === l.id || x.source === l.div);
        A.vendors.push({ id: uid(), name: l.vendor, trade: l.name, sovId: s?.id || A.sov[0]?.id, share: s && s.source === l.id ? 1 : 0.5, contact: "" });
      });
      A.contract.projectName = est.project.name;
      A.contract.owner = est.project.client;
      commit();
      toast("SOV rebuilt from the estimate.");
    };
    $("#btn-reset").onclick = async () => {
      if (!(await window.GCW.ask("Reset the admin workbook to the demo data? Your admin entries in this browser will be replaced.", "Reset to demo", true))) return;
      A = demoAdmin(getEstimate());
      ui.app = A.apps.length - 1;
      commit();
    };
    renderAll();
    tabs(document);
  });
})();
