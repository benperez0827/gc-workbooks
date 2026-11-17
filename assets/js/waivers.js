/* Lien waiver forms. Arizona forms follow the statutory text in A.R.S. 33-1008(D).
   Confirm wording against the current statute before use. Not legal advice. */
(function () {
  "use strict";
  const { esc, fmt } = window.GCW;

  const TYPES = {
    "az-cp": { label: "Arizona: conditional waiver, progress payment", short: "AZ conditional progress", state: "AZ", conditional: true, final: false },
    "az-up": { label: "Arizona: unconditional waiver, progress payment", short: "AZ unconditional progress", state: "AZ", conditional: false, final: false },
    "az-cf": { label: "Arizona: conditional waiver, final payment", short: "AZ conditional final", state: "AZ", conditional: true, final: true },
    "az-uf": { label: "Arizona: unconditional waiver, final payment", short: "AZ unconditional final", state: "AZ", conditional: false, final: true },
    "gen-c": { label: "Generic: conditional waiver (other states)", short: "Generic conditional", state: "", conditional: true, final: false },
    "gen-u": { label: "Generic: unconditional waiver (other states)", short: "Generic unconditional", state: "", conditional: false, final: false },
  };

  const B = (v, w = 180) => `<span class="blank" style="display:inline-block;min-width:${w}px">${esc(v || "")}</span>`;
  const L = (t) => ` <span class="lab">(${t})</span>`;
  const money = (v) => (v === "" || v === undefined || v === null ? "" : fmt.money2(v).replace("$", ""));
  const RELEASE = "any mechanic's lien, any state or federal statutory bond right, any private bond right, any claim for payment and any rights under any similar ordinance, rule or statute related to claim or payment rights for persons in the undersigned's position";
  const NOTICE = "Notice: This document waives rights unconditionally and states that you have been paid for giving up those rights. This document is enforceable against you if you sign it, even if you have not been paid. If you have not been paid, use a conditional release form.";

  function sigBlock(f, word) {
    return `
      <table class="noborder" style="margin-top:22px;width:auto">
        <tr><td>${word}:</td><td>${B(f.date ? fmt.date(f.date) : "", 200)}</td></tr>
        <tr><td></td><td>${B(f.company, 280)}${L("Company name")}</td></tr>
        <tr><td>By:</td><td>${B("", 280)}${L("Signature")}</td></tr>
        <tr><td></td><td>${B(f.title, 280)}${L("Title")}</td></tr>
      </table>`;
  }
  function head(f, title) {
    return `<h2>${title}</h2>
      <p>Project: ${B(f.project, 380)}</p>
      <p>Job No.: ${B(f.jobNo, 200)}</p>`;
  }

  function render(type, f) {
    const t = TYPES[type];
    let body = "";
    if (type === "az-cp") {
      body = head(f, "Conditional waiver and release on progress payment") + `
        <p>On receipt by the undersigned of a check from ${B(f.maker)}${L("maker of check")} in the sum of $${B(money(f.amount), 110)}${L("amount of check")} payable to ${B(f.payee)}${L("payee or payees of check")} and when the check has been properly endorsed and has been paid by the bank on which it is drawn, this document becomes effective to release ${RELEASE} that the undersigned has on the job of ${B(f.owner)}${L("owner")} located at ${B(f.jobDesc, 260)}${L("job description")} to the following extent. This release covers a progress payment for all labor, services, equipment or materials furnished to the jobsite or to ${B(f.contractedWith)}${L("person with whom undersigned contracted")} through ${B(fmt.date(f.through), 130)}${L("date")} only and does not cover any retention, pending modifications and changes or items furnished after that date. Before any recipient of this document relies on it, that person should verify evidence of payment to the undersigned.</p>
        ${sigBlock(f, "Date")}`;
    } else if (type === "az-up") {
      body = head(f, "Unconditional waiver and release on progress payment") + `
        <p>The undersigned has been paid and has received a progress payment in the sum of $${B(money(f.amount), 110)} for all labor, services, equipment or material furnished to the jobsite or to ${B(f.contractedWith)}${L("person with whom undersigned contracted")} on the job of ${B(f.owner)}${L("owner")} located at ${B(f.jobDesc, 260)}${L("job description")} and does hereby release ${RELEASE} that the undersigned has on the above referenced project to the following extent. This release covers a progress payment for all labor, services, equipment or materials furnished to the jobsite or to ${B(f.contractedWith)}${L("person with whom undersigned contracted")} through ${B(fmt.date(f.through), 130)}${L("date")} only and does not cover any retention, pending modifications and changes or items furnished after that date.</p>
        ${sigBlock(f, "Dated")}
        <div class="notice">${NOTICE}</div>`;
    } else if (type === "az-cf") {
      body = head(f, "Conditional waiver and release on final payment") + `
        <p>On receipt by the undersigned of a check from ${B(f.maker)}${L("maker of check")} in the sum of $${B(money(f.amount), 110)}${L("amount of check")} payable to ${B(f.payee)}${L("payee or payees of check")} and when the check has been properly endorsed and has been paid by the bank on which it is drawn, this document becomes effective to release ${RELEASE} that the undersigned has on the job of ${B(f.owner)}${L("owner")} located at ${B(f.jobDesc, 260)}${L("job description")}. This release covers the final payment to the undersigned for all labor, services, equipment or materials furnished to the jobsite or to ${B(f.contractedWith)}${L("person with whom undersigned contracted")}, except for disputed claims in the amount of $${B(money(f.disputed), 110)}. Before any recipient of this document relies on it, the person should verify evidence of payment to the undersigned.</p>
        ${sigBlock(f, "Dated")}`;
    } else if (type === "az-uf") {
      body = head(f, "Unconditional waiver and release on final payment") + `
        <p>The undersigned has been paid in full for all labor, services, equipment or material furnished to the jobsite or to ${B(f.contractedWith)}${L("person with whom undersigned contracted")} on the job of ${B(f.owner)}${L("owner")} located at ${B(f.jobDesc, 260)}${L("job description")} and does hereby waive and release any right to mechanic's lien, any state or federal statutory bond right, any private bond right, any claim for payment and any rights under any similar ordinance, rule or statute related to claim or payment rights for persons in the undersigned's position, except for disputed claims for extra work in the amount of $${B(money(f.disputed), 110)}.</p>
        ${sigBlock(f, "Dated")}
        <div class="notice">${NOTICE}</div>`;
    } else if (type === "gen-c") {
      body = head(f, "Conditional lien waiver and release (progress)") + `
        <p>Upon receipt of payment from ${B(f.maker)} in the amount of $${B(money(f.amount), 110)}, payable to ${B(f.payee)}, and once that payment has cleared, the undersigned releases its lien, bond, and payment claims against the property of ${B(f.owner)} at ${B(f.jobDesc, 260)} for labor, services, equipment and materials furnished to ${B(f.contractedWith)} through ${B(fmt.date(f.through), 130)}. This release does not cover retention, pending changes, disputed amounts, or work furnished after that date.</p>
        ${sigBlock(f, "Dated")}
        <p class="lab" style="margin-top:14px">Generic template. Many states require a specific statutory form. Check the project state's requirements before use.</p>`;
    } else if (type === "gen-u") {
      body = head(f, "Unconditional lien waiver and release (progress)") + `
        <p>The undersigned has received payment of $${B(money(f.amount), 110)} for labor, services, equipment and materials furnished to ${B(f.contractedWith)} on the property of ${B(f.owner)} at ${B(f.jobDesc, 260)} through ${B(fmt.date(f.through), 130)}, and releases its lien, bond, and payment claims for that work. This release does not cover retention, pending changes, disputed amounts, or work furnished after that date.</p>
        ${sigBlock(f, "Dated")}
        <div class="notice">This release is effective whether or not the payment has cleared. Do not sign it until you have been paid.</div>
        <p class="lab" style="margin-top:14px">Generic template. Many states require a specific statutory form. Check the project state's requirements before use.</p>`;
    }
    const footer = t.state === "AZ" ? `<p class="lab" style="margin-top:18px">Form text follows A.R.S. 33-1008(D). Confirm against the current statute before use. This is not legal advice.</p>` : "";
    return `<div class="doc waiver">${body}${footer}</div>`;
  }

  window.GCW_WAIVERS = { TYPES, render };
})();
