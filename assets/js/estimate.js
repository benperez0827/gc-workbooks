/* Estimating workbook UI */
(function () {
  "use strict";
  const { fmt, num, esc, uid, save, load, toast, tabs } = window.GCW;
  const D = window.GCW_DATA;
  const E = window.GCW_EST;

  let est = load("estimate");
  if (!est || !est.lines) { est = E.newEstimate("btr"); save("estimate", est); }
  if (!est.bids) est.bids = [];

  const $ = (s, r = document) => r.querySelector(s);
  const DRIVERS = { units: "Units", sf: "Living SF", acres: "Acres", bldgs: "Buildings", ls: "Lump sum" };

  // ---------- generic field helpers ----------
  function inp(key, value, opts = {}) {
    const type = opts.type || "number";
    const step = opts.step ? `step="${opts.step}"` : 'step="any"';
    const ph = opts.ph !== undefined ? `placeholder="${esc(opts.ph)}"` : "";
    const w = opts.w ? `style="width:${opts.w}"` : "";
    const aria = opts.label ? `aria-label="${esc(opts.label)}"` : "";
    const cls = opts.cls ? `class="${opts.cls}"` : "";
    const v = value === null || value === undefined ? "" : value;
    return `<input type="${type}" ${type === "number" ? step : ""} data-key="${key}" value="${esc(v)}" ${ph} ${w} ${aria} ${cls}>`;
  }
  function sel(key, value, options, label, cls) {
    return `<select data-key="${key}" aria-label="${esc(label || "")}" ${cls ? `class="${cls}"` : ""}>${options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
  }
  function srcLink(id) {
    const s = D.SOURCES[id];
    if (!s) return "";
    return s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a>` : esc(s.label);
  }

  // Apply an edit from a data-key: "scope:path" or "kind:id:field"
  function applyEdit(key, raw, el) {
    const parts = key.split(":");
    const isNum = el.type === "number";
    const val = el.type === "checkbox" ? el.checked : isNum ? (raw === "" ? "" : num(raw)) : raw;
    const kind = parts[0];
    if (kind === "p") est.project[parts[1]] = val === "" ? 0 : val;
    else if (kind === "m") est.markups[parts[1]] = val === "" ? 0 : val;
    else if (kind === "pf") est.proforma[parts[1]] = val === "" ? 0 : val;
    else if (kind === "b") est.burden[parts[1]] = val === "" ? 0 : val;
    else if (kind === "line") {
      const l = est.lines.find((x) => x.id === parts[1]);
      if (!l) return;
      if (parts[2] === "qtyOverride") l.qtyOverride = raw === "" ? null : num(raw);
      else l[parts[2]] = val === "" && isNum ? 0 : val;
    } else if (kind === "trade") {
      const t = est.trades.find((x) => x.id === parts[1]);
      if (t) t[parts[2]] = val === "" && isNum ? 0 : val;
    } else if (kind === "gc") {
      const g = est.gc.find((x) => x.id === parts[1]);
      if (!g) return;
      if (parts[2] === "months") g.months = raw === "" ? undefined : num(raw);
      else g[parts[2]] = val === "" && isNum ? 0 : val;
    } else if (kind === "bid") {
      const b = est.bids.find((x) => x.id === parts[1]);
      if (b) b[parts[2]] = val === "" && isNum ? 0 : val;
    } else if (kind === "ui") {
      ui[parts[1]] = val;
    }
  }

  const ui = { bidLine: null, divFilter: "" };

  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-key]");
    if (!el) return;
    applyEdit(el.dataset.key, el.value, el);
    commit();
  });

  function commit() {
    const focusKey = document.activeElement?.dataset?.key;
    save("estimate", est);
    renderAll();
    if (focusKey) {
      const f = document.querySelector(`[data-key="${CSS.escape(focusKey)}"]`);
      if (f) f.focus();
    }
  }

  // ---------- renderers ----------
  function renderHead(c) {
    $("#est-title").textContent = est.project.name || "Estimating workbook";
    $("#est-sub").textContent = `${D.PRODUCTS[est.project.product]?.label || ""}. ${fmt.num(est.project.units)} units, ${fmt.num(c.totalSF)} SF. Contract ${fmt.money(c.contract)}.`;
  }

  function renderSummary(c) {
    const p = est.project, m = est.markups, pf = est.proforma;
    const prod = D.PRODUCTS[p.product] || D.PRODUCTS.btr;
    const divRows = est.divisions.filter((d) => c.byDiv[d]).map((d) => {
      const v = c.byDiv[d];
      const share = c.direct ? v / c.direct : 0;
      return `<tr><td>${esc(d)}</td><td class="num">${fmt.money(v)}</td><td class="num">${fmt.money(v / (c.units || 1))}</td><td class="num">${fmt.money2(v / (c.totalSF || 1))}</td><td><div class="bar-cell"><div class="bar" style="flex:1"><span style="width:${(share * 100).toFixed(1)}%"></span></div><span class="muted">${fmt.pct(share)}</span></div></td></tr>`;
    }).join("");

    const bench = E.benchmark(est, c).map((r) => {
      const diff = r.share - r.nahb;
      const flag = Math.abs(diff) > 0.05 ? window.GCW.stamp(diff > 0 ? "Above" : "Below", diff > 0 ? "amber" : "blue") : "";
      return `<tr><td>${esc(r.name)}</td><td class="num">${fmt.pct(r.share)}</td><td class="num">${fmt.pct(r.nahb)}</td><td>${flag}</td></tr>`;
    }).join("");

    const d = c.dev;
    $("#t-summary").innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${fmt.money(c.contract)}</div><div class="l">GC contract price</div></div>
        <div class="stat"><div class="v">${fmt.money(c.perUnit)}</div><div class="l">Per unit</div></div>
        <div class="stat"><div class="v">${fmt.money2(c.perSF)}</div><div class="l">Per living SF</div></div>
        <div class="stat"><div class="v">${fmt.money(c.fee)}</div><div class="l">GC fee (${fmt.pct(c.feeMargin)} of contract)</div></div>
        <div class="stat"><div class="v">${fmt.num(c.hours)}</div><div class="l">Self-perform labor hours</div></div>
      </div>

      <div class="two-col">
        <div>
          <div class="sheet">
            <div class="sheet-head"><h3>Project</h3><p>Quantities scale from these drivers. Change units or SF and every scope updates.</p></div>
            <div class="grid-form">
              <div class="field"><label>Project name</label>${inp("p:name", p.name, { type: "text" })}</div>
              <div class="field"><label>Client</label>${inp("p:client", p.client, { type: "text" })}</div>
              <div class="field"><label>Location</label>${inp("p:location", p.location, { type: "text" })}</div>
              <div class="field"><label>Product type</label>${sel("p:product", p.product, Object.entries(D.PRODUCTS).map(([k, v]) => [k, v.label]), "Product type")}<span class="hint">Changes labels only. Use Start from template for new scopes.</span></div>
              <div class="field"><label>Units</label>${inp("p:units", p.units)}</div>
              <div class="field"><label>Average living SF per unit</label>${inp("p:sf", p.sf)}</div>
              <div class="field"><label>Buildings</label>${inp("p:bldgs", p.bldgs)}</div>
              <div class="field"><label>Site acres</label>${inp("p:acres", p.acres)}</div>
              <div class="field"><label>Construction months</label>${inp("p:months", p.months)}<span class="hint">Drives monthly general conditions.</span></div>
              <div class="field"><label>Start date</label>${inp("p:start", p.start, { type: "date" })}</div>
            </div>
          </div>

          <div class="sheet">
            <div class="sheet-head"><h3>Cost by division</h3></div>
            <div class="table-wrap"><table class="grid">
              <thead><tr><th>Division</th><th class="num">Cost</th><th class="num">Per unit</th><th class="num">Per SF</th><th style="min-width:180px">Share of direct cost</th></tr></thead>
              <tbody>${divRows}<tr class="total"><td>Direct cost</td><td class="num">${fmt.money(c.direct)}</td><td class="num">${fmt.money(c.direct / (c.units || 1))}</td><td class="num">${fmt.money2(c.direct / (c.totalSF || 1))}</td><td></td></tr></tbody>
            </table></div>
          </div>

          <div class="sheet">
            <div class="sheet-head"><h3>Sanity check against NAHB stage shares</h3><p>Share of direct cost by stage, compared to the national single-family average. Big gaps are worth a second look, not automatically wrong. NAHB site work also includes permit and impact fees, which sit in the developer pro forma here.</p></div>
            <div class="table-wrap"><table class="grid">
              <thead><tr><th>Stage</th><th class="num">This estimate</th><th class="num">NAHB 2024</th><th>Gap over 5 pts</th></tr></thead>
              <tbody>${bench}</tbody>
            </table></div>
            <p class="muted" style="margin-top:.5rem">Source: ${srcLink("nahb")}</p>
          </div>
        </div>

        <div>
          <div class="sheet">
            <div class="sheet-head"><h3>Contract build-up</h3></div>
            <table class="grid buildup">
              <tbody>
                <tr><td>Direct cost (scopes)</td><td class="pct"></td><td class="num">${fmt.money(c.direct)}</td></tr>
                <tr><td>General conditions</td><td class="pct"></td><td class="num">${fmt.money(c.gcTotal)}</td></tr>
                <tr><td>Contingency, % of direct</td><td class="pct">${inp("m:contingencyPct", m.contingencyPct, { label: "Contingency percent" })} %</td><td class="num">${fmt.money(c.contingency)}</td></tr>
                <tr class="subtotal"><td>Cost</td><td class="pct"></td><td class="num">${fmt.money(c.cost)}</td></tr>
                <tr><td>Fee, % of cost</td><td class="pct">${inp("m:feePct", m.feePct, { label: "Fee percent" })} %</td><td class="num">${fmt.money(c.fee)}</td></tr>
                <tr><td>General liability</td><td class="pct">${inp("m:glPct", m.glPct, { label: "General liability percent" })} %</td><td class="num">${fmt.money(c.insurance * (num(m.glPct) / ((num(m.glPct) + num(m.brPct) + num(m.bondPct)) || 1)))}</td></tr>
                <tr><td>Builder's risk</td><td class="pct">${inp("m:brPct", m.brPct, { label: "Builders risk percent" })} %</td><td class="num">${fmt.money(c.insurance * (num(m.brPct) / ((num(m.glPct) + num(m.brPct) + num(m.bondPct)) || 1)))}</td></tr>
                <tr><td>Payment & performance bond</td><td class="pct">${inp("m:bondPct", m.bondPct, { label: "Bond percent" })} %</td><td class="num">${fmt.money(c.insurance * (num(m.bondPct) / ((num(m.glPct) + num(m.brPct) + num(m.bondPct)) || 1)))}</td></tr>
                <tr><td><label style="display:inline-flex;gap:.4rem;align-items:center;color:var(--ink)"><input type="checkbox" data-key="m:tptOn" ${m.tptOn ? "checked" : ""}> AZ prime contracting TPT</label><span class="muted" style="display:block">Rate, on ${inp("m:tptBasePct", m.tptBasePct, { w: "52px", label: "TPT base percent" })} % of gross</span></td><td class="pct">${inp("m:tptRatePct", m.tptRatePct, { label: "TPT rate" })} %</td><td class="num">${fmt.money(c.tpt)}</td></tr>
                <tr class="total"><td>Contract price</td><td class="pct"></td><td class="num">${fmt.money(c.contract)}</td></tr>
              </tbody>
            </table>
            <p class="muted" style="margin-top:.6rem">TPT: ${srcLink("adorTPT")}. Confirm the current business code 015 rate for the job's city before bidding.</p>
          </div>

          <div class="sheet">
            <div class="sheet-head"><h3>Developer pro forma</h3><p>How the GC price lands in the deal.</p></div>
            <div class="grid-form" style="grid-template-columns:1fr 1fr">
              <div class="field"><label>${esc(prod.valueLabel)}</label>${inp("pf:value", pf.value)}<span class="hint">${esc(prod.valueNote)}</span></div>
              <div class="field"><label>Land / finished lot per unit</label>${inp("pf:land", pf.land)}<span class="hint">${esc(prod.landNote)}</span></div>
              <div class="field"><label>Soft costs % of hard</label>${inp("pf:softPct", pf.softPct)}</div>
              <div class="field"><label>Financing % of revenue</label>${inp("pf:financePct", pf.financePct)}</div>
              <div class="field"><label>Overhead % of revenue</label>${inp("pf:overheadPct", pf.overheadPct)}</div>
              <div class="field"><label>Marketing % of revenue</label>${inp("pf:marketingPct", pf.marketingPct)}</div>
              <div class="field"><label>Commission / disposition %</label>${inp("pf:commissionPct", pf.commissionPct)}</div>
              <div class="field"><label>Monthly rent per unit</label>${inp("pf:rent", pf.rent)}<span class="hint">Rentals only. Leave 0 for for-sale.</span></div>
            </div>
            <table class="grid" style="margin-top:1rem">
              <tbody>
                <tr><td>Revenue</td><td class="num">${fmt.money(d.revenue)}</td></tr>
                <tr><td>Land</td><td class="num">${fmt.money(d.land)}</td></tr>
                <tr><td>Hard cost (GC contract)</td><td class="num">${fmt.money(d.hard)}</td></tr>
                <tr><td>Soft costs</td><td class="num">${fmt.money(d.soft)}</td></tr>
                <tr><td>Financing, overhead, marketing, commission</td><td class="num">${fmt.money(d.finance + d.overhead + d.marketing + d.commission)}</td></tr>
                <tr class="subtotal"><td>Total development cost</td><td class="num">${fmt.money(d.devCost)}</td></tr>
                <tr class="total"><td>Developer profit</td><td class="num" style="color:${d.profit < 0 ? "var(--redline)" : "inherit"}">${fmt.money(d.profit)}</td></tr>
                <tr><td>Margin on revenue</td><td class="num">${fmt.pct(d.margin)}</td></tr>
                <tr><td>Profit per unit</td><td class="num">${fmt.money(d.perUnitProfit)}</td></tr>
                ${d.annualRent ? `<tr><td>Gross rent yield on cost</td><td class="num">${fmt.pct(d.rentYield, 2)}</td></tr>` : ""}
              </tbody>
            </table>
            <p class="muted" style="margin-top:.6rem">Value: ${srcLink(prod.valueSrc)}. Cost shares: ${srcLink("nahb")}.</p>
          </div>
        </div>
      </div>`;
  }

  function tradeOpts() { return est.trades.map((t) => [t.id, t.name]); }

  function renderScopes(c) {
    const rows = [];
    est.divisions.forEach((d) => {
      const lines = est.lines.filter((l) => l.div === d);
      rows.push(`<tr class="group"><td colspan="17"><div style="display:flex;align-items:center;gap:.75rem;position:sticky;left:.5rem;width:max-content">${esc(d)} <span class="muted" style="font-family:var(--body);font-weight:500">${lines.length ? fmt.money(c.byDiv[d] || 0) : "No scopes for this product"}</span><button class="btn-ghost no-print" data-act="add-line" data-div="${esc(d)}" style="margin-left:auto">Add scope</button></div></td></tr>`);
      lines.forEach((l) => {
        const lc = c.lineCalcs[l.id];
        const self = l.method === "self";
        const dis = (on) => (on ? "" : "disabled");
        rows.push(`<tr data-row="${l.id}">
          <td>${inp(`line:${l.id}:code`, l.code, { type: "text", label: "Code", cls: "w-code" })}</td>
          <td>${inp(`line:${l.id}:name`, l.name, { type: "text", label: "Scope", cls: "w-name" })}</td>
          <td class="num"><strong>${fmt.money(lc.total)}</strong></td>
          <td class="num">${fmt.money(lc.total / (c.units || 1))}</td>
          <td>${sel(`line:${l.id}:method`, l.method, [["sub", "Subcontract"], ["self", "Self-perform"]], "Method", "w-sel")}</td>
          <td>${sel(`line:${l.id}:driver`, l.driver, Object.entries(DRIVERS), "Quantity driver", "w-sel")}</td>
          <td>${inp(`line:${l.id}:factor`, l.factor, { label: "Factor", cls: "w-num" })}</td>
          <td>${inp(`line:${l.id}:qtyOverride`, l.qtyOverride, { ph: fmt.num(lc.autoQty), label: "Quantity override", cls: "w-qty" })}</td>
          <td>${inp(`line:${l.id}:uom`, l.uom, { type: "text", label: "Unit of measure", cls: "w-uom" })}</td>
          <td>${self ? '<span class="muted">n/a</span>' : inp(`line:${l.id}:rate`, l.rate, { label: "Subcontract dollars per unit", cls: "w-qty" })}</td>
          <td>${self ? sel(`line:${l.id}:trade`, l.trade, tradeOpts(), "Trade", "w-trade") : '<span class="muted">n/a</span>'}</td>
          <td>${self ? inp(`line:${l.id}:prod`, l.prod, { label: "Production per labor hour", cls: "w-num" }) : ""}</td>
          <td>${self ? inp(`line:${l.id}:mat`, l.mat, { label: "Material per unit", cls: "w-num" }) : ""}</td>
          <td>${self ? inp(`line:${l.id}:waste`, l.waste, { label: "Waste percent", cls: "w-num" }) : ""}</td>
          <td>${self ? inp(`line:${l.id}:equip`, l.equip, { label: "Equipment per unit", cls: "w-num" }) : ""}</td>
          <td class="num">${self ? fmt.num(lc.hours) : ""}</td>
          <td><button class="btn-x no-print" data-act="del-line" data-id="${l.id}" aria-label="Delete scope">&times;</button></td>
        </tr>`);
      });
    });
    $("#t-scopes").innerHTML = `
      <div class="note"><p><strong>How quantities work.</strong> Quantity = factor &times; driver. A drywall factor of 3.2 on Living SF means 3.2 SF of board per SF of house. Type a number in Qty to override. Subcontract lines price at $/UOM. Self-perform lines price labor (quantity &divide; production rate &times; loaded wage), material with waste, and equipment.</p><p>Production rates and material prices here are sample planning figures. Replace them with your crews' history and current quotes.</p></div>
      <div class="sheet-head no-print"><div class="actions" style="margin-left:0"><button data-act="add-div">Add division</button></div></div>
      <div class="table-wrap"><table class="grid">
        <thead><tr>
          <th>Code</th><th>Scope</th><th class="num">Total</th><th class="num">Per unit</th><th>Method</th><th>Driver</th><th>Factor</th><th>Qty</th><th>UOM</th><th>Sub $/UOM</th><th>Trade</th><th>UOM per hr</th><th>Mat $/UOM</th><th>Waste %</th><th>Equip $/UOM</th><th class="num">Hours</th><th></th>
        </tr></thead>
        <tbody>${rows.join("")}
          <tr class="total"><td colspan="2">Direct cost</td><td class="num">${fmt.money(c.direct)}</td><td class="num">${fmt.money(c.direct / (c.units || 1))}</td><td colspan="11"></td><td class="num">${fmt.num(c.hours)}</td><td></td></tr>
        </tbody>
      </table></div>`;
  }

  function renderLabor(c) {
    const b = est.burden;
    const rows = est.trades.map((t) => `
      <tr>
        <td style="min-width:200px">${inp(`trade:${t.id}:name`, t.name, { type: "text", label: "Trade" })}</td>
        <td class="small">${esc(t.soc || "")}</td>
        <td style="width:100px">${inp(`trade:${t.id}:wage`, t.wage, { label: "Base wage" })}</td>
        <td style="width:100px">${inp(`trade:${t.id}:wc`, t.wc, { label: "Workers comp per 100" })}</td>
        <td class="num"><strong>${fmt.money2(E.loadedRate(est, t.id))}</strong></td>
        <td class="small" style="max-width:320px">${t.src ? srcLink(t.src) : "Your rate"}${t.note ? `. ${esc(t.note)}` : ""}</td>
        <td><button class="btn-x" data-act="del-trade" data-id="${t.id}" aria-label="Delete trade">&times;</button></td>
      </tr>`).join("");
    $("#t-labor").innerHTML = `
      <div class="two-col">
        <div>
          <div class="sheet-head"><h3>Wage rates by trade</h3><div class="actions"><button data-act="add-trade">Add trade</button></div><p>Base wages are BLS medians for the Phoenix metro unless noted. Your real rates will differ. Workers comp figures are placeholders inside published Arizona ranges. Use your carrier's rates and EMR.</p></div>
          <div class="table-wrap"><table class="grid">
            <thead><tr><th>Trade</th><th>SOC</th><th class="num">Base $/hr</th><th class="num">WC $/100</th><th class="num">Loaded $/hr</th><th>Source</th><th></th></tr></thead>
            <tbody>${rows}</tbody>
          </table></div>
          <p class="muted" style="margin-top:.6rem">Workers comp reference: ${srcLink("azWC")}</p>
        </div>
        <div class="sheet">
          <h3>Labor burden</h3>
          <p class="muted">Loaded rate = base &times; (1 + payroll taxes + workers comp + PTO) + benefits per hour.</p>
          <div class="grid-form" style="grid-template-columns:1fr">
            <div class="field"><label>Payroll taxes %</label>${inp("b:payrollTaxPct", b.payrollTaxPct)}<span class="hint">FICA 7.65% plus effective FUTA and AZ unemployment.</span></div>
            <div class="field"><label>PTO & holidays %</label>${inp("b:ptoPct", b.ptoPct)}</div>
            <div class="field"><label>Benefits $ per hour</label>${inp("b:benefitsPerHr", b.benefitsPerHr)}</div>
          </div>
        </div>
      </div>`;
  }

  function renderGC(c) {
    const rows = est.gc.map((g) => {
      const gc = c.gcCalcs[g.id];
      return `<tr>
        <td style="min-width:260px">${inp(`gc:${g.id}:name`, g.name, { type: "text", label: "Item" })}</td>
        <td>${sel(`gc:${g.id}:basis`, g.basis, [["month", "Per month"], ["ls", "Lump sum"]], "Basis")}</td>
        <td style="width:120px">${inp(`gc:${g.id}:rate`, g.rate, { label: "Rate" })}</td>
        <td style="width:90px">${g.basis === "month" ? inp(`gc:${g.id}:months`, g.months, { ph: est.project.months, label: "Months" }) : ""}</td>
        <td class="num"><strong>${fmt.money(gc.total)}</strong></td>
        <td><button class="btn-x" data-act="del-gc" data-id="${g.id}" aria-label="Delete item">&times;</button></td>
      </tr>`;
    }).join("");
    const monthly = est.gc.filter((g) => g.basis === "month").reduce((a, g) => a + num(g.rate), 0);
    $("#t-gc").innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${fmt.money(c.gcTotal)}</div><div class="l">General conditions</div></div>
        <div class="stat"><div class="v">${fmt.money(monthly)}</div><div class="l">Monthly burn</div></div>
        <div class="stat"><div class="v">${fmt.pct(c.direct ? c.gcTotal / c.direct : 0)}</div><div class="l">Of direct cost</div></div>
        <div class="stat"><div class="v">${fmt.money(monthly / 30)}</div><div class="l">Per calendar day of delay</div></div>
      </div>
      <div class="sheet-head"><h3>General conditions</h3><div class="actions"><button data-act="add-gc">Add item</button></div><p>Monthly items run for the project duration unless you set months on the line. The monthly burn is what one more month of schedule costs the GC.</p></div>
      <div class="table-wrap"><table class="grid">
        <thead><tr><th>Item</th><th>Basis</th><th class="num">Rate</th><th class="num">Months</th><th class="num">Total</th><th></th></tr></thead>
        <tbody>${rows}<tr class="total"><td colspan="4">Total general conditions</td><td class="num">${fmt.money(c.gcTotal)}</td><td></td></tr></tbody>
      </table></div>
      <p class="muted" style="margin-top:.6rem">Staff and site costs are sample figures. Replace with your payroll and vendor costs.</p>`;
  }

  function renderBids(c) {
    const subLines = est.lines;
    if (!ui.bidLine || !est.lines.find((l) => l.id === ui.bidLine)) ui.bidLine = (est.bids[0] && est.bids[0].lineId) || subLines[0]?.id;
    const line = est.lines.find((l) => l.id === ui.bidLine);
    const lc = line ? c.lineCalcs[line.id] : null;
    const bids = est.bids.filter((b) => b.lineId === ui.bidLine);
    const leveled = (b) => num(b.base) + num(b.adj);
    const low = bids.length ? Math.min(...bids.map(leveled)) : 0;
    const bidRows = bids.map((b) => {
      const lv = leveled(b);
      const vsBudget = lv - (lc?.total || 0);
      return `<tr>
        <td style="min-width:180px">${inp(`bid:${b.id}:bidder`, b.bidder, { type: "text", label: "Bidder" })}</td>
        <td style="width:130px">${inp(`bid:${b.id}:base`, b.base, { label: "Base bid" })}</td>
        <td style="width:130px">${inp(`bid:${b.id}:adj`, b.adj, { label: "Scope gap adjustment" })}</td>
        <td style="min-width:240px">${inp(`bid:${b.id}:notes`, b.notes, { type: "text", ph: "Exclusions, clarifications, alternates", label: "Notes" })}</td>
        <td class="num"><strong>${fmt.money(lv)}</strong> ${lv === low && bids.length > 1 ? window.GCW.stamp("Low", "blue") : ""}</td>
        <td class="num" style="color:${vsBudget > 0 ? "var(--redline)" : "var(--ok)"}">${vsBudget > 0 ? "+" : ""}${fmt.money(vsBudget)}</td>
        <td>${b.awarded ? window.GCW.stamp("Awarded", "green") : `<button data-act="award" data-id="${b.id}">Award</button>`}</td>
        <td><button class="btn-x" data-act="del-bid" data-id="${b.id}" aria-label="Delete bid">&times;</button></td>
      </tr>`;
    }).join("");

    const buyout = est.lines.filter((l) => l.vendor).map((l) => {
      const aw = est.bids.find((b) => b.lineId === l.id && b.awarded);
      const budget = aw ? num(aw.budgetAtAward) : c.lineCalcs[l.id].total;
      const awarded = aw ? leveled(aw) : c.lineCalcs[l.id].total;
      return `<tr><td>${esc(l.code)} ${esc(l.name)}</td><td>${esc(l.vendor)}</td><td class="num">${fmt.money(budget)}</td><td class="num">${fmt.money(awarded)}</td><td class="num" style="color:${awarded > budget ? "var(--redline)" : "var(--ok)"}">${fmt.money(budget - awarded)}</td></tr>`;
    }).join("");

    $("#t-bids").innerHTML = `
      <div class="note"><p>Level each bid to the same scope. Enter the base bid, then add the cost of anything the bidder excluded that the budget includes. Award the leveled number and the scope's subcontract rate updates to match. Awarded vendors carry into the Admin workbook.</p></div>
      <div>
        <div>
          <div class="sheet">
            <div class="sheet-head">
              <h3>Leveling sheet</h3>
              <div class="actions"><button data-act="add-bid">Add bidder</button></div>
            </div>
            <div class="grid-form" style="grid-template-columns:minmax(0,2fr) 1fr 1fr;margin-bottom:1rem">
              <div class="field"><label>Scope</label>${sel("ui:bidLine", ui.bidLine, est.lines.map((l) => [l.id, `${l.code} ${l.name}${est.bids.some((b) => b.lineId === l.id) ? " (bids in)" : ""}`]), "Scope")}</div>
              <div class="field"><label>Budget</label><div style="padding:.4rem 0;font-weight:700">${fmt.money(lc?.total || 0)}</div></div>
              <div class="field"><label>Quantity</label><div style="padding:.4rem 0">${fmt.num(lc?.qty || 0)} ${esc(line?.uom || "")}</div></div>
            </div>
            <div class="table-wrap"><table class="grid">
              <thead><tr><th>Bidder</th><th class="num">Base bid</th><th class="num">Scope gap +/-</th><th>Notes</th><th class="num">Leveled</th><th class="num">vs budget</th><th></th><th></th></tr></thead>
              <tbody>${bidRows || `<tr><td colspan="8" class="muted" style="padding:1rem">No bids on this scope yet. Add a bidder to start leveling.</td></tr>`}</tbody>
            </table></div>
          </div>
        </div>
        <div class="sheet">
          <h3>Buyout log</h3>
          <p class="muted">Awarded scopes against the budget at award. Positive variance is buyout savings.</p>
          <div class="table-wrap"><table class="grid">
            <thead><tr><th>Scope</th><th>Vendor</th><th class="num">Budget</th><th class="num">Awarded</th><th class="num">Savings</th></tr></thead>
            <tbody>${buyout || `<tr><td colspan="5" class="muted" style="padding:1rem">Nothing awarded yet.</td></tr>`}</tbody>
          </table></div>
        </div>
      </div>`;
  }

  function renderData() {
    const li = (arr) => arr.map(([t, d]) => `<li><strong>${esc(t)}.</strong> ${esc(d)}</li>`).join("");
    $("#t-data").innerHTML = `
      <div class="wrap narrow" style="padding:0">
        <p>The demo runs on public data and sample planning figures. With your numbers, the same workbook becomes your estimating standard. Here is what I'd ask for, in rough order of impact on accuracy.</p>
        <h3 style="margin-top:1.5rem">For the estimating workbook</h3>
        <ul class="need-list">${li(D.CLIENT_DATA_NEEDED.estimating)}</ul>
        <h3 style="margin-top:1.5rem">For the admin workbook</h3>
        <ul class="need-list">${li(D.CLIENT_DATA_NEEDED.admin)}</ul>
        <h3 style="margin-top:1.5rem">Where the demo numbers come from</h3>
        <ul class="need-list">${Object.values(D.SOURCES).map((s) => `<li>${s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a>` : esc(s.label)}</li>`).join("")}</ul>
      </div>`;
  }

  function renderAll() {
    const c = E.calc(est);
    renderHead(c);
    renderSummary(c);
    renderScopes(c);
    renderLabor(c);
    renderGC(c);
    renderBids(c);
    renderData();
  }

  // ---------- actions ----------
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act, id = b.dataset.id;
    const c = E.calc(est);
    if (act === "add-line") {
      est.lines.push({ id: uid(), code: "", div: b.dataset.div, name: "New scope", uom: "LS", driver: "ls", factor: 1, qtyOverride: null, method: "sub", rate: 0, trade: "lab", prod: 10, mat: 0, waste: 0, equip: 0, vendor: "", notes: "", custom: true });
      const at = est.lines.pop();
      const lastIdx = est.lines.map((l) => l.div).lastIndexOf(b.dataset.div);
      est.lines.splice(lastIdx + 1, 0, at);
    } else if (act === "del-line") {
      est.lines = est.lines.filter((l) => l.id !== id);
      est.bids = est.bids.filter((x) => x.lineId !== id);
    } else if (act === "add-div") {
      window.GCW.askText("Name the new division.", "17 Solar & EV charging").then((name) => {
        if (!name) return;
        est.divisions.push(name);
        est.lines.push({ id: uid(), code: "", div: name, name: "New scope", uom: "LS", driver: "ls", factor: 1, qtyOverride: null, method: "sub", rate: 0, trade: "lab", prod: 10, mat: 0, waste: 0, equip: 0, vendor: "", notes: "", custom: true });
        commit();
      });
      return;
    } else if (act === "add-trade") {
      est.trades.push({ id: uid(), name: "New trade", soc: "", wage: 25, wc: 4, src: "" });
    } else if (act === "del-trade") {
      if (est.lines.some((l) => l.method === "self" && l.trade === id)) { toast("A self-perform scope uses this trade. Change that scope's trade first."); return; }
      est.trades = est.trades.filter((t) => t.id !== id);
    } else if (act === "add-gc") {
      est.gc.push({ id: uid(), name: "New item", basis: "month", rate: 0 });
    } else if (act === "del-gc") {
      est.gc = est.gc.filter((g) => g.id !== id);
    } else if (act === "add-bid") {
      if (!ui.bidLine) return;
      est.bids.push({ id: uid(), lineId: ui.bidLine, bidder: "", base: 0, adj: 0, notes: "", awarded: false });
    } else if (act === "del-bid") {
      est.bids = est.bids.filter((x) => x.id !== id);
    } else if (act === "award") {
      const bid = est.bids.find((x) => x.id === id);
      const line = est.lines.find((l) => l.id === bid.lineId);
      const lc = c.lineCalcs[line.id];
      if (!bid.bidder) { toast("Name the bidder before awarding."); return; }
      est.bids.filter((x) => x.lineId === bid.lineId).forEach((x) => (x.awarded = false));
      bid.awarded = true;
      bid.budgetAtAward = lc.total;
      line.method = "sub";
      line.rate = lc.qty ? (num(bid.base) + num(bid.adj)) / lc.qty : num(bid.base) + num(bid.adj);
      line.vendor = bid.bidder;
      toast(`Awarded to ${bid.bidder}. Scope rate updated.`);
    } else return;
    commit();
  });

  // ---------- template & export ----------
  function initTemplateControls() {
    const s = $("#tpl-product");
    s.innerHTML = Object.entries(D.PRODUCTS).map(([k, v]) => `<option value="${k}" ${k === est.project.product ? "selected" : ""}>${v.label}</option>`).join("");
    $("#btn-new").onclick = () => {
      const p = s.value;
      window.GCW.ask(`Start a new ${D.PRODUCTS[p].label} estimate from the template? This replaces the estimate in this browser. Save a project file first if you want to keep it.`, "Start new estimate").then((go) => {
        if (!go) return;
        est = E.newEstimate(p);
        save("estimate", est);
        renderAll();
        toast("New estimate started from the template.");
      });
    };
    $("#btn-xlsx").onclick = exportXlsx;
  }

  function exportXlsx() {
    const c = E.calc(est);
    const wb = XLSX.utils.book_new();
    const p = est.project;

    // Labor rates with live loaded-rate formula
    const lr = [["Trade", "SOC", "Base $/hr", "WC $/100", "Payroll tax %", "PTO %", "Benefits $/hr", "Loaded $/hr", "Source"]];
    est.trades.forEach((t, i) => {
      const r = i + 2;
      lr.push([t.name, t.soc || "", num(t.wage), num(t.wc), num(est.burden.payrollTaxPct), num(est.burden.ptoPct), num(est.burden.benefitsPerHr), { f: `C${r}*(1+E${r}/100+D${r}/100+F${r}/100)+G${r}` }, D.SOURCES[t.src]?.label || ""]);
    });
    const wsL = XLSX.utils.aoa_to_sheet(lr);
    wsL["!cols"] = [{ wch: 32 }, { wch: 9 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 60 }];

    // Scopes with live formulas
    const sc = [["Division", "Code", "Scope", "Method", "Qty", "UOM", "Sub $/UOM", "Trade", "UOM per hr", "Loaded $/hr", "Mat $/UOM", "Waste %", "Equip $/UOM", "Labor hours", "Labor $", "Material $", "Equipment $", "Subcontract $", "Total", "Per unit", "Vendor", "Notes"]];
    est.lines.forEach((l, i) => {
      const r = i + 2;
      const lc = c.lineCalcs[l.id];
      const self = l.method === "self";
      const t = est.trades.find((x) => x.id === l.trade);
      sc.push([
        l.div, l.code, l.name, self ? "Self-perform" : "Subcontract", Math.round(lc.qty * 100) / 100, l.uom,
        self ? 0 : num(l.rate), self ? t?.name || "" : "", self ? num(l.prod) : 0, self ? Math.round(lc.rate * 100) / 100 : 0,
        self ? num(l.mat) : 0, self ? num(l.waste) : 0, self ? num(l.equip) : 0,
        { f: `IF(I${r}>0,E${r}/I${r},0)` }, { f: `N${r}*J${r}` }, { f: `E${r}*K${r}*(1+L${r}/100)` }, { f: `E${r}*M${r}` }, { f: `E${r}*G${r}` },
        { f: `O${r}+P${r}+Q${r}+R${r}` }, { f: `S${r}/${num(p.units) || 1}` }, l.vendor || "", l.notes || "",
      ]);
    });
    const last = est.lines.length + 1;
    sc.push(["Direct cost", "", "", "", "", "", "", "", "", "", "", "", "", { f: `SUM(N2:N${last})` }, { f: `SUM(O2:O${last})` }, { f: `SUM(P2:P${last})` }, { f: `SUM(Q2:Q${last})` }, { f: `SUM(R2:R${last})` }, { f: `SUM(S2:S${last})` }, { f: `SUM(T2:T${last})` }]);
    const wsS = XLSX.utils.aoa_to_sheet(sc);
    wsS["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 42 }, { wch: 13 }, { wch: 10 }, { wch: 9 }, { wch: 10 }, { wch: 24 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 11 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 13 }, { wch: 13 }, { wch: 11 }, { wch: 18 }, { wch: 40 }];

    // General conditions
    const gc = [["Item", "Basis", "Rate", "Qty (months)", "Total"]];
    est.gc.forEach((g, i) => {
      const r = i + 2;
      gc.push([g.name, g.basis === "month" ? "Per month" : "Lump sum", num(g.rate), c.gcCalcs[g.id].qty, { f: `C${r}*D${r}` }]);
    });
    gc.push(["Total", "", "", "", { f: `SUM(E2:E${est.gc.length + 1})` }]);
    const wsG = XLSX.utils.aoa_to_sheet(gc);
    wsG["!cols"] = [{ wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];

    // Summary with formulas back to the other sheets
    const m = est.markups;
    const sm = [
      ["Project", p.name], ["Client", p.client], ["Location", p.location], ["Product", D.PRODUCTS[p.product]?.label || ""],
      ["Units", num(p.units)], ["Avg living SF", num(p.sf)], ["Total living SF", { f: "B5*B6" }], ["Months", num(p.months)],
      [],
      ["Direct cost", { f: `Scopes!S${last + 1}` }],
      ["General conditions", { f: `'General conditions'!E${est.gc.length + 2}` }],
      ["Contingency %", num(m.contingencyPct)], ["Contingency", { f: "B10*B12/100" }],
      ["Cost", { f: "B10+B11+B13" }],
      ["Fee % of cost", num(m.feePct)], ["Fee", { f: "B14*B15/100" }],
      ["Insurance & bond %", num(m.glPct) + num(m.brPct) + num(m.bondPct)], ["Insurance & bonds", { f: "(B14+B16)*B17/100" }],
      ["Contract before tax", { f: "B14+B16+B18" }],
      ["TPT rate %", m.tptOn ? num(m.tptRatePct) : 0], ["TPT taxable base %", num(m.tptBasePct)], ["Prime contracting TPT", { f: "B19*B20/100*B21/100" }],
      ["Contract price", { f: "B19+B22" }],
      ["Per unit", { f: "B23/B5" }], ["Per SF", { f: "B23/B7" }],
    ];
    const wsM = XLSX.utils.aoa_to_sheet(sm);
    wsM["!cols"] = [{ wch: 26 }, { wch: 22 }];

    XLSX.utils.book_append_sheet(wb, wsM, "Summary");
    XLSX.utils.book_append_sheet(wb, wsS, "Scopes");
    XLSX.utils.book_append_sheet(wb, wsL, "Labor rates");
    XLSX.utils.book_append_sheet(wb, wsG, "General conditions");
    window.GCW.saveWorkbook(wb, `${window.GCW.slug(p.name)}-estimate.xlsx`).then((ok) => { if (ok) toast("Excel estimate saved. Formulas stay live."); });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTemplateControls();
    renderAll();
    tabs(document);
  });
})();
