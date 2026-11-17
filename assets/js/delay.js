/* Delay cost calculator */
(function () {
  "use strict";
  const { fmt, num, esc, save, load, toast } = window.GCW;
  const E = window.GCW_EST;
  const $ = (s) => document.querySelector(s);

  function fromEstimate() {
    const est = load("estimate") || E.newEstimate("btr");
    const c = E.calc(est);
    const monthlyGC = est.gc.filter((g) => g.basis === "month").reduce((a, g) => a + num(g.rate), 0);
    return {
      preset: "estimate",
      name: est.project.name,
      phase: "construction",
      units: num(est.project.units),
      rent: num(est.proforma.rent) || 1969,
      occPct: 100,
      loan: Math.round(c.dev.devCost * 0.65),
      ratePct: 7.25,
      interestOverride: "",
      siteMonthly: Math.round(monthlyGC),
      otherMonthly: 0,
      equity: Math.round(c.dev.devCost * 0.35),
      landLoan: Math.round(c.dev.land * 0.5),
      landRatePct: 8,
      holdMonthly: 3000,
      days: 30,
      note: "Pulled from the Estimating workbook: unit count, rent, and general conditions monthly burn. Loan assumed at 65% of total development cost.",
    };
  }
  const PRESETS = {
    estimate: { label: "Current estimate (demo BTR)", make: fromEstimate },
    case360: {
      label: "Case study: 360-unit garden community",
      make: () => ({
        preset: "case360", name: "Case study: 360-unit garden community, $96.5M", phase: "construction",
        units: 360, rent: 1900, occPct: 100, loan: 62800000, ratePct: "", interestOverride: 233427, siteMonthly: 300000, otherMonthly: 0, equity: 33700000,
        landLoan: 0, landRatePct: 0, holdMonthly: 10000, days: 30,
        note: "From a delay-cost model built on a real 360-unit project. Lost rent assumes the property would have been fully leased. The site and mobilization figure is still being confirmed.",
      }),
    },
  };

  let S = load("delay");
  if (!S || S.units === undefined) S = fromEstimate();

  function calc() {
    if (S.phase === "precon") {
      const interest = num(S.landLoan) * num(S.landRatePct) / 100 / 12;
      const monthly = interest + num(S.holdMonthly);
      return { parts: [["Land loan interest", interest], ["Holding costs (taxes, insurance, consultants)", num(S.holdMonthly)]], monthly };
    }
    const rent = num(S.units) * num(S.rent) * num(S.occPct) / 100;
    const interest = S.interestOverride !== "" && S.interestOverride !== null && S.interestOverride !== undefined ? num(S.interestOverride) : num(S.loan) * num(S.ratePct) / 100 / 12;
    const parts = [["Lost rent", rent], ["Construction loan interest", interest], ["Extended general conditions & site costs", num(S.siteMonthly)], ["Other carrying costs", num(S.otherMonthly)]].filter((p) => p[1] > 0);
    return { parts, monthly: parts.reduce((a, p) => a + p[1], 0) };
  }

  function inp(k, label, hint = "", type = "number") {
    return `<div class="field"><label>${label}</label><input type="${type}" step="any" data-key="${k}" value="${esc(S[k] ?? "")}">${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  }

  function render() {
    const r = calc();
    S.monthly = Math.round(r.monthly);
    save("delay", S);
    const perDay = r.monthly / 30;
    const colors = ["var(--redline)", "var(--survey)", "var(--caliche)", "var(--ink-3)"];
    const bar = r.parts.map((p, i) => `<span title="${esc(p[0])}" style="width:${(p[1] / (r.monthly || 1)) * 100}%;background:${colors[i]}"></span>`).join("");
    const legend = r.parts.map((p, i) => `<tr><td><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${colors[i]};margin-right:.4rem"></span>${esc(p[0])}</td><td class="num">${fmt.money(p[1])}</td><td class="num">${fmt.pct(p[1] / (r.monthly || 1))}</td></tr>`).join("");
    const scen = [[14, "One review cycle of avoidable lag (transparency gap estimate)"], [42, "Three review cycles of avoidable lag"], [90, "One quarter"], [num(S.days), "Your scenario"]]
      .map(([d, l]) => `<tr><td>${esc(l)}</td><td class="num">${fmt.num(d)}</td><td class="num"><strong>${fmt.money(perDay * d)}</strong></td><td class="num">${num(S.equity) ? fmt.pct((perDay * d) / num(S.equity)) : ""}</td></tr>`).join("");
    const cons = S.phase !== "precon";
    $("#app").innerHTML = `
      ${S.note ? `<div class="note"><p>${esc(S.note)}</p></div>` : ""}
      <div class="two-col" style="grid-template-columns:360px minmax(0,1fr)">
        <div class="sheet">
          <div class="field" style="margin-bottom:1rem"><label>Project</label><input type="text" data-key="name" value="${esc(S.name)}"></div>
          <div class="pill-toggle" role="group" aria-label="Project phase" style="margin-bottom:1rem">
            <button data-phase="construction" aria-pressed="${cons}">Under construction</button>
            <button data-phase="precon" aria-pressed="${!cons}">Pre-construction</button>
          </div>
          <div class="grid-form" style="grid-template-columns:1fr 1fr">
            ${cons ? `
              ${inp("units", "Units")}
              ${inp("rent", "Rent per unit per month")}
              ${inp("occPct", "Leased at delivery %", "100% matches the case study method.")}
              ${inp("loan", "Construction loan balance")}
              ${inp("ratePct", "Loan rate %")}
              ${inp("interestOverride", "Or monthly interest", "Overrides balance and rate.")}
              ${inp("siteMonthly", "Extended GCs & site per month")}
              ${inp("otherMonthly", "Other carrying per month")}
              ${inp("equity", "Equity invested")}
            ` : `
              ${inp("landLoan", "Land loan balance")}
              ${inp("landRatePct", "Land loan rate %")}
              ${inp("holdMonthly", "Holding costs per month")}
              ${inp("equity", "Equity invested")}
            `}
            ${inp("days", "Scenario: days of delay")}
          </div>
        </div>
        <div>
          <div class="stats">
            <div class="stat"><div class="v" style="color:var(--redline)">${fmt.money(r.monthly)}</div><div class="l">Cost of one month of delay</div></div>
            <div class="stat"><div class="v">${fmt.money(perDay)}</div><div class="l">Per calendar day</div></div>
            <div class="stat"><div class="v">${num(S.equity) ? fmt.pct(r.monthly / num(S.equity)) : "n/a"}</div><div class="l">Of equity, per month</div></div>
            <div class="stat"><div class="v">${fmt.money(perDay * num(S.days))}</div><div class="l">Your ${fmt.num(S.days)}-day scenario</div></div>
          </div>
          <div class="sheet">
            <h3>What makes up a month</h3>
            <div style="display:flex;height:16px;border-radius:3px;overflow:hidden;margin:.75rem 0 1rem">${bar}</div>
            <table class="grid"><tbody>${legend}<tr class="total"><td>Monthly delay cost</td><td class="num">${fmt.money(r.monthly)}</td><td></td></tr></tbody></table>
          </div>
          <div class="sheet">
            <h3>Scenarios</h3>
            <table class="grid"><thead><tr><th>Delay</th><th class="num">Days</th><th class="num">Cost</th><th class="num">Of equity</th></tr></thead><tbody>${scen}</tbody></table>
            <p class="muted" style="margin-top:.6rem">${cons ? "Before construction starts, a month of delay usually costs a fraction of this. Once the permit or approval sits on the critical path, every day pushes delivery and the full construction-phase cost applies." : "Pre-construction delay is cheap per month. It becomes expensive the moment it pushes the construction start, because delivery moves with it."} The permit tracker uses the daily figure to price critical-path review overruns.</p>
          </div>
        </div>
      </div>`;
  }

  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-key]");
    if (!el) return;
    const k = el.dataset.key;
    S[k] = el.type === "number" ? (k === "interestOverride" && el.value === "" ? "" : num(el.value)) : el.value;
    const fk = document.activeElement?.dataset?.key;
    render();
    const f = fk && document.querySelector(`[data-key="${fk}"]`);
    if (f) f.focus();
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-phase]");
    if (!b) return;
    S.phase = b.dataset.phase;
    render();
  });
  document.addEventListener("DOMContentLoaded", () => {
    $("#preset").innerHTML = Object.entries(PRESETS).map(([k, v]) => `<option value="${k}" ${S.preset === k ? "selected" : ""}>${v.label}</option>`).join("");
    $("#btn-preset").onclick = () => { S = PRESETS[$("#preset").value].make(); render(); toast("Preset loaded."); };
    render();
  });
})();
