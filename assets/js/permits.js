/* Permit review tracker: whose desk, how long, what it costs */
(function () {
  "use strict";
  const { fmt, num, esc, uid, save, load, toast, stamp, today, addDays, daysBetween } = window.GCW;
  const D = window.GCW_DATA;
  const $ = (s) => document.querySelector(s);
  const TYPES = Object.fromEntries(D.PHX_REVIEWS.map((r) => [r.id, r]));
  const isApplicant = (desk) => /^Applicant/.test(desk || "");

  function defaultPerDay() {
    const d = load("delay");
    if (d && d.monthly) return Math.round(d.monthly / 30);
    return Math.round(141900 / 30); // 40-unit BTR profile from the delay-cost model
  }

  function demo() {
    const T = today();
    const at = (n) => addDays(T, -n);
    return {
      perDay: defaultPerDay(),
      asOf: "",
      permits: [
        {
          id: uid(), project: "Desert Willow BTR (demo)", name: "Civil plans: grading, drainage, water, sewer, paving", type: "cv-med", ref: "KIVA 26-0000 (sample)", critical: true, status: "In review",
          cycles: [{ submitted: at(95), returned: at(58) }, { submitted: at(41), returned: "" }],
          desk: [
            { date: at(95), desk: "Intake / administrative review", note: "Submitted through ePlans" },
            { date: at(89), desk: "Civil: grading & drainage", note: "" },
            { date: at(71), desk: "Civil: water & sewer", note: "Waiting on water capacity confirmation" },
            { date: at(58), desk: "Applicant: design team corrections", note: "27 comments returned" },
            { date: at(41), desk: "Intake / administrative review", note: "Resubmitted" },
            { date: at(38), desk: "Civil: water & sewer", note: "" },
            { date: at(12), desk: "Civil: paving & streets", note: "Reviewer out one week per city" },
          ],
        },
        {
          id: uid(), project: "Desert Willow BTR (demo)", name: "Site plan, final review", type: "sp-major", ref: "Sample ref", critical: true, status: "Approved",
          cycles: [{ submitted: at(160), returned: at(119) }, { submitted: at(108), returned: at(96) }],
          desk: [
            { date: at(160), desk: "Intake / administrative review", note: "" },
            { date: at(156), desk: "Site planning", note: "" },
            { date: at(140), desk: "Zoning", note: "" },
            { date: at(119), desk: "Applicant: design team corrections", note: "" },
            { date: at(108), desk: "Site planning", note: "Resubmitted" },
            { date: at(96), desk: "Permit issuance / fees", note: "Approved" },
          ],
        },
        {
          id: uid(), project: "Desert Willow BTR (demo)", name: "Building plans, standard unit plans", type: "rb-std", ref: "Sample ref", critical: false, status: "In review",
          cycles: [{ submitted: at(30), returned: "" }],
          desk: [
            { date: at(30), desk: "Intake / administrative review", note: "" },
            { date: at(26), desk: "Building: structural", note: "" },
            { date: at(9), desk: "Fire plan review", note: "" },
          ],
        },
        {
          id: uid(), project: "Desert Willow BTR (demo)", name: "Landscape plans", type: "cv-land", ref: "Sample ref", critical: false, status: "Corrections",
          cycles: [{ submitted: at(44), returned: at(27) }],
          desk: [
            { date: at(44), desk: "Intake / administrative review", note: "" },
            { date: at(41), desk: "Landscape review", note: "" },
            { date: at(27), desk: "Applicant: design team corrections", note: "Landscape architect has the comments" },
          ],
        },
      ],
    };
  }

  let S = load("permits");
  if (!S || !S.permits) { S = demo(); save("permits", S); }
  const asOf = () => S.asOf || today();

  function analyze(p) {
    const t = TYPES[p.type] || { goal: 0, avg: 0, name: "Custom" };
    const now = asOf();
    const cycles = p.cycles.map((c, i) => {
      const end = c.returned || (p.status === "Approved" || p.status === "Issued" ? c.submitted : now);
      const days = daysBetween(c.submitted, c.returned || now);
      const open = !c.returned && !(p.status === "Approved" || p.status === "Issued");
      const over = Math.max(0, days - num(t.goal));
      return { i, submitted: c.submitted, returned: c.returned, days: open || c.returned ? days : 0, open, over: open || c.returned ? over : 0 };
    });
    const desks = {};
    let cityDays = 0, appDays = 0;
    const log = [...p.desk].sort((a, b) => (a.date < b.date ? -1 : 1));
    const closed = p.status === "Approved" || p.status === "Issued";
    log.forEach((d, i) => {
      const next = log[i + 1]?.date || (closed ? d.date : now);
      const n = Math.max(0, daysBetween(d.date, next));
      desks[d.desk] = (desks[d.desk] || 0) + n;
      if (isApplicant(d.desk)) appDays += n; else if (!/Permit issuance/.test(d.desk)) cityDays += n;
    });
    const current = closed ? null : log[log.length - 1];
    const currentDays = current ? daysBetween(current.date, now) : 0;
    const overGoal = cycles.reduce((a, c) => a + c.over, 0);
    const exposure = p.critical ? overGoal * num(S.perDay) : 0;
    const statutory = t.admin ? { total: t.admin + t.subst, used: cycles.slice(0, 2).reduce((a, c) => a + c.days, 0) } : null;
    return { t, cycles, desks, cityDays, appDays, current, currentDays, overGoal, exposure, log, statutory };
  }

  // ---------- render ----------
  function inp(key, value, opts = {}) {
    const type = opts.type || "text";
    return `<input type="${type}" ${type === "number" ? 'step="any"' : ""} data-key="${key}" value="${esc(value ?? "")}" aria-label="${esc(opts.label || key)}" ${opts.w ? `style="width:${opts.w}"` : ""}>`;
  }
  function sel(key, value, options, label) {
    return `<select data-key="${key}" aria-label="${esc(label)}">${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select>`;
  }
  const typeOpts = () => D.PHX_REVIEWS.map((r) => [r.id, `${r.group}: ${r.name}`]);

  function deskBar(a) {
    const total = Object.values(a.desks).reduce((x, y) => x + y, 0) || 1;
    const segs = a.log.map((d, i) => {
      const next = a.log[i + 1]?.date || (a.current ? asOf() : d.date);
      const n = Math.max(0, daysBetween(d.date, next));
      if (!n) return "";
      const app = isApplicant(d.desk);
      return `<span title="${esc(d.desk)}: ${n} days" style="width:${(n / total) * 100}%;background:${app ? "var(--caliche)" : "var(--survey)"};opacity:${0.55 + 0.45 * ((i % 2) ? 0.6 : 1)}"></span>`;
    }).join("");
    return `<div style="display:flex;height:14px;border-radius:3px;overflow:hidden;background:var(--concrete-2)">${segs}</div>
      <div class="muted" style="display:flex;gap:1.25rem;margin-top:.35rem"><span><span style="display:inline-block;width:10px;height:10px;background:var(--survey);border-radius:2px"></span> City desks ${a.cityDays} days</span><span><span style="display:inline-block;width:10px;height:10px;background:var(--caliche);border-radius:2px"></span> Applicant desks ${a.appDays} days</span></div>`;
  }

  function render() {
    const all = S.permits.map((p) => ({ p, a: analyze(p) }));
    const active = all.filter(({ p }) => !(p.status === "Approved" || p.status === "Issued"));
    const onCity = active.filter(({ a }) => a.current && !isApplicant(a.current.desk)).length;
    const onApp = active.filter(({ a }) => a.current && isApplicant(a.current.desk)).length;
    const over = all.filter(({ p }) => p.critical).reduce((x, { a }) => x + a.overGoal, 0);
    const exposure = all.reduce((x, { a }) => x + a.exposure, 0);
    const stCol = { "In review": "blue", Corrections: "amber", Approved: "green", Issued: "green", "Not submitted": "gray" };

    const cards = all.map(({ p, a }) => {
      const cyc = a.cycles.map((c, i) => `<tr>
        <td>${i + 1}${i === 0 ? "" : " (resubmittal)"}</td>
        <td style="width:150px">${inp(`cy:${p.id}:${i}:submitted`, c.submitted, { type: "date", label: "Submitted" })}</td>
        <td style="width:150px">${inp(`cy:${p.id}:${i}:returned`, c.returned, { type: "date", label: "Comments returned" })}</td>
        <td class="num">${c.days}${c.open ? " and counting" : ""}</td>
        <td class="num">${a.t.goal}</td>
        <td class="num">${a.t.avg}</td>
        <td class="num" style="color:${c.over ? "var(--redline)" : "inherit"}">${c.over}</td>
      </tr>`).join("");
      const deskRows = a.log.map((d, i) => `<tr>
        <td style="width:150px">${inp(`dk:${p.id}:${i}:date`, d.date, { type: "date", label: "Date" })}</td>
        <td style="min-width:220px">${sel(`dk:${p.id}:${i}:desk`, d.desk, D.PHX_DESKS.includes(d.desk) ? D.PHX_DESKS : D.PHX_DESKS.concat([d.desk]), "Desk")}</td>
        <td>${inp(`dk:${p.id}:${i}:note`, d.note, { label: "Note" })}</td>
        <td><button class="btn-x" data-act="del-desk" data-id="${p.id}" data-i="${i}" aria-label="Delete entry">&times;</button></td>
      </tr>`).join("");
      const now = a.current
        ? `<div style="display:flex;gap:1rem;align-items:baseline;flex-wrap:wrap"><span class="muted">Now on</span><strong style="font-family:var(--display);font-stretch:85%;font-size:var(--step-2)">${esc(a.current.desk)}</strong><span>${a.currentDays} days, since ${fmt.date(a.current.date)}</span>${isApplicant(a.current.desk) ? stamp("Our court", "amber") : stamp("City", "blue")}</div>`
        : `<div><strong style="font-family:var(--display);font-stretch:85%;font-size:var(--step-2)">${esc(p.status)}</strong></div>`;
      const statut = a.statutory ? `<p class="muted" style="margin:.5rem 0 0">A.R.S. 9-835 time frame for this review type: ${D.PHX_REVIEWS.find((r) => r.id === p.type).admin} administrative + ${D.PHX_REVIEWS.find((r) => r.id === p.type).subst} substantive days, covering the first review and one resubmittal. City review days used so far on those cycles: ${a.statutory.used}.</p>` : "";
      return `<div class="sheet">
        <div class="sheet-head">
          <h3 style="margin:0">${esc(p.name)}</h3> ${stamp(p.status, stCol[p.status] || "gray")} ${p.critical ? stamp("Critical path", "red") : ""}
          <div class="actions"><button class="btn-x" data-act="del-permit" data-id="${p.id}" aria-label="Delete submittal">&times;</button></div>
        </div>
        <div class="grid-form" style="margin-bottom:1rem">
          <div class="field"><label>Submittal</label>${inp(`p:${p.id}:name`, p.name)}</div>
          <div class="field" style="grid-column:span 2"><label>Phoenix review type</label>${sel(`p:${p.id}:type`, p.type, typeOpts(), "Review type")}</div>
          <div class="field"><label>Reference / KIVA no.</label>${inp(`p:${p.id}:ref`, p.ref)}</div>
          <div class="field"><label>Status</label>${sel(`p:${p.id}:status`, p.status, ["Not submitted", "In review", "Corrections", "Approved", "Issued"], "Status")}</div>
          <label style="display:flex;gap:.5rem;align-items:center;align-self:end;padding-bottom:.45rem"><input type="checkbox" data-key="p:${p.id}:critical" ${p.critical ? "checked" : ""}> On the critical path</label>
        </div>
        ${now}
        <div style="margin:1rem 0">${deskBar(a)}</div>
        <div style="display:grid;gap:1.25rem">
          <div>
            <div class="sheet-head"><h3>Review cycles</h3><div class="actions"><button data-act="add-cycle" data-id="${p.id}">Add resubmittal</button></div></div>
            <div class="table-wrap"><table class="grid">
              <thead><tr><th>Cycle</th><th>Submitted</th><th>Comments back</th><th class="num">Days with city</th><th class="num">Goal</th><th class="num">City avg</th><th class="num">Over goal</th></tr></thead>
              <tbody>${cyc}</tbody>
            </table></div>
            ${statut}
            ${p.critical && a.overGoal ? `<p style="margin:.75rem 0 0"><strong style="color:var(--redline)">${fmt.money(a.exposure)}</strong> exposure: ${a.overGoal} days over goal at ${fmt.money(S.perDay)} per day.</p>` : ""}
          </div>
          <div>
            <div class="sheet-head"><h3>Desk log</h3><div class="actions"><button data-act="add-desk" data-id="${p.id}">Log a handoff</button></div></div>
            <div class="table-wrap"><table class="grid">
              <thead><tr><th>Date</th><th>Desk</th><th>Note</th><th></th></tr></thead>
              <tbody>${deskRows}</tbody>
            </table></div>
          </div>
        </div>
      </div>`;
    }).join("");

    const ref = D.PHX_REVIEWS.map((r) => `<tr><td>${esc(r.group)}</td><td>${esc(r.name)}</td><td class="num">${r.goal}</td><td class="num" style="color:${r.avg > r.goal ? "var(--redline)" : "inherit"}">${r.avg}</td><td class="num">${r.admin ? `${r.admin} + ${r.subst}` : ""}</td></tr>`).join("");

    $("#app").innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${active.length}</div><div class="l">Active submittals</div></div>
        <div class="stat"><div class="v">${onCity}</div><div class="l">On a city desk</div></div>
        <div class="stat"><div class="v">${onApp}</div><div class="l">On our side (corrections, sign-off)</div></div>
        <div class="stat"><div class="v">${over}</div><div class="l">Critical-path days over city goal</div></div>
        <div class="stat"><div class="v" style="color:var(--redline)">${fmt.money(exposure)}</div><div class="l">Delay exposure</div></div>
      </div>
      <div class="sheet" style="display:flex;gap:1.25rem;flex-wrap:wrap;align-items:end">
        <div class="field" style="width:200px"><label>Delay cost per day</label>${inp("s:perDay", S.perDay, { type: "number" })}</div>
        <button data-act="pull-delay">Use delay calculator figure</button>
        <div class="field" style="width:190px"><label>Measure as of</label>${inp("s:asOf", S.asOf, { type: "date" })}<span class="hint">Blank means today.</span></div>
        <p class="muted" style="margin:0;flex:1;min-width:240px">Exposure counts only critical-path submittals, and only days past the city's initial-review goal. It is a planning number, not a claim.</p>
      </div>
      ${cards}
      <div class="sheet">
        <div class="sheet-head"><h3>City of Phoenix review goals</h3><p>Goal is the city's target in calendar days for an initial review. City avg is the prior month's actual. Red means the average is running over goal. Statutory time frames are from the city's A.R.S. 9-835 policy where shown.</p></div>
        <div class="table-wrap"><table class="grid">
          <thead><tr><th>Group</th><th>Review type</th><th class="num">Goal (days)</th><th class="num">City avg</th><th class="num">A.R.S. 9-835 admin + substantive</th></tr></thead>
          <tbody>${ref}</tbody>
        </table></div>
        <p class="muted" style="margin-top:.6rem">Sources: <a href="${D.SOURCES.phxTimes.url}" target="_blank" rel="noopener">${esc(D.SOURCES.phxTimes.label)}</a>. <a href="${D.SOURCES.phx9835.url}" target="_blank" rel="noopener">${esc(D.SOURCES.phx9835.label)}</a>. Civil major statutory figure from the same policy.</p>
      </div>`;
  }

  // ---------- events ----------
  document.addEventListener("change", (e) => {
    const el = e.target.closest("[data-key]");
    if (!el) return;
    const k = el.dataset.key.split(":");
    const v = el.type === "checkbox" ? el.checked : el.type === "number" ? num(el.value) : el.value;
    const p = S.permits.find((x) => x.id === k[1]);
    if (k[0] === "s") S[k[1]] = v;
    else if (k[0] === "p" && p) p[k[2]] = v;
    else if (k[0] === "cy" && p) p.cycles[+k[2]][k[3]] = v;
    else if (k[0] === "dk" && p) {
      const sorted = [...p.desk].sort((a, b) => (a.date < b.date ? -1 : 1));
      sorted[+k[2]][k[3]] = v;
      p.desk = sorted;
    }
    commit();
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const p = S.permits.find((x) => x.id === b.dataset.id);
    switch (b.dataset.act) {
      case "add-cycle": p.cycles.push({ submitted: asOf(), returned: "" }); p.desk.push({ date: asOf(), desk: "Intake / administrative review", note: "Resubmitted" }); p.status = "In review"; break;
      case "add-desk": {
        const sorted = [...p.desk].sort((a, c) => (a.date < c.date ? -1 : 1));
        p.desk = sorted.concat([{ date: asOf(), desk: D.PHX_DESKS[0], note: "" }]);
        break;
      }
      case "del-desk": { const sorted = [...p.desk].sort((a, c) => (a.date < c.date ? -1 : 1)); sorted.splice(+b.dataset.i, 1); p.desk = sorted; break; }
      case "del-permit": window.GCW.ask("Delete this submittal and its desk log?", "Delete", true).then((go) => { if (go) { S.permits = S.permits.filter((x) => x !== p); commit(); } }); return;
      case "pull-delay": S.perDay = defaultPerDay(); toast(`Using ${fmt.money(S.perDay)} per day.`); break;
      default: return;
    }
    commit();
  });
  function commit() {
    const fk = document.activeElement?.dataset?.key;
    save("permits", S);
    render();
    if (fk) { const f = document.querySelector(`[data-key="${CSS.escape(fk)}"]`); if (f) f.focus(); }
  }

  function exportXlsx() {
    const aoa = [["Project", "Submittal", "Review type", "Reference", "Status", "Critical path", "Now on desk", "Days on current desk", "Days on city desks", "Days on applicant desks", "Days over goal", "Exposure"]];
    S.permits.forEach((p) => {
      const a = analyze(p);
      aoa.push([p.project, p.name, `${a.t.group}: ${a.t.name}`, p.ref, p.status, p.critical ? "Yes" : "No", a.current?.desk || "", a.currentDays, a.cityDays, a.appDays, a.overGoal, a.exposure]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    window.GCW_XL.style(ws, { header: 0, border: true, money: [11], widths: [24, 40, 44, 18, 13, 10, 32, 12, 12, 12, 10, 14], wrapCols: [1, 2] });
    const log = [["Submittal", "Date", "Desk", "Note"]];
    S.permits.forEach((p) => [...p.desk].sort((a, b) => (a.date < b.date ? -1 : 1)).forEach((d) => log.push([p.name, d.date, d.desk, d.note])));
    const ws2 = XLSX.utils.aoa_to_sheet(log);
    window.GCW_XL.style(ws2, { header: 0, border: true, widths: [40, 12, 34, 44] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Status");
    XLSX.utils.book_append_sheet(wb, ws2, "Desk log");
    window.GCW.saveWorkbook(wb, "permit-tracker.xlsx");
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#btn-add").onclick = () => {
      S.permits.unshift({ id: uid(), project: "", name: "New submittal", type: "cv-minor", ref: "", critical: true, status: "In review", cycles: [{ submitted: asOf(), returned: "" }], desk: [{ date: asOf(), desk: D.PHX_DESKS[0], note: "Submitted" }] });
      commit();
    };
    $("#btn-xlsx").onclick = exportXlsx;
    $("#btn-reset").onclick = () => window.GCW.ask("Reset the tracker to the demo submittals?", "Reset to demo", true).then((go) => { if (go) { S = demo(); commit(); } });
    render();
  });
})();
