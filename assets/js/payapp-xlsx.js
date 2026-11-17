/* Builds a print-ready pay application in Excel: summary sheet (G702 structure) and
   continuation sheet (G703 structure). Same layout and math as the industry-standard form.
   Wording in the certification blocks is our own. No AIA name, logo, or document numbers. */
(function () {
  "use strict";

  const MONEY = '"$"#,##0.00;[Red]-"$"#,##0.00;"$"0.00';
  const PCT = "0%";
  const CYAN = "FFD9F7F7";
  const YELLOW = "FFFFFFDD";
  const SERIF = "Times New Roman";
  const SANS = "Arial";
  const thin = { style: "thin", color: { argb: "FF000000" } };
  const medium = { style: "medium", color: { argb: "FF000000" } };

  function fill(c, argb) { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb } }; }
  function set(ws, ref, value, o = {}) {
    const c = ws.getCell(ref);
    if (value !== undefined) c.value = value;
    c.font = { name: o.sans ? SANS : SERIF, size: o.size || 10, bold: !!o.bold, italic: !!o.italic };
    c.alignment = { vertical: o.v || "middle", horizontal: o.h || "left", wrapText: !!o.wrap, indent: o.indent || 0 };
    if (o.fmt) c.numFmt = o.fmt;
    if (o.fill) fill(c, o.fill);
    if (o.border) c.border = o.border;
    return c;
  }
  function merge(ws, range, value, o = {}) {
    ws.mergeCells(range);
    return set(ws, range.split(":")[0], value, o);
  }
  function boxRange(ws, range, side = thin) {
    const [a, b] = range.split(":");
    const s = ws.getCell(a), e = ws.getCell(b);
    for (let r = s.row; r <= e.row; r++) {
      for (let col = s.col; col <= e.col; col++) {
        const c = ws.getCell(r, col);
        c.border = Object.assign({}, c.border, {
          top: r === s.row ? side : c.border?.top,
          bottom: r === e.row ? side : c.border?.bottom,
          left: col === s.col ? side : c.border?.left,
          right: col === e.col ? side : c.border?.right,
        });
      }
    }
  }
  function gridRange(ws, range) {
    const [a, b] = range.split(":");
    const s = ws.getCell(a), e = ws.getCell(b);
    for (let r = s.row; r <= e.row; r++) for (let col = s.col; col <= e.col; col++) ws.getCell(r, col).border = { top: thin, bottom: thin, left: thin, right: thin };
  }
  function underline(ws, range, side = thin) {
    const [a, b] = range.split(":");
    const s = ws.getCell(a), e = ws.getCell(b || a);
    for (let col = s.col; col <= e.col; col++) { const c = ws.getCell(s.row, col); c.border = Object.assign({}, c.border, { bottom: side }); }
  }
  const F = (formula, result) => ({ formula, result });
  const dt = (s) => (s ? new Date(s + "T12:00:00") : null);

  async function build(state, idx, calcApp, opts = {}) {
    const c = state.contract;
    const app = state.apps[idx];
    const { rows, g } = calcApp(idx);
    const wb = new ExcelJS.Workbook();
    wb.creator = c.contractor || "";
    wb.created = new Date();

    // =============== Sheet 1: Application for Payment ===============
    const ws = wb.addWorksheet("Application", {
      views: [{ showGridLines: false }],
      pageSetup: { paperSize: 1, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 1, horizontalCentered: true, margins: { left: 0.35, right: 0.35, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } },
    });
    ws.columns = [{ width: 4 }, { width: 34 }, { width: 9 }, { width: 15 }, { width: 17 }, { width: 3 }, { width: 17 }, { width: 30 }, { width: 18 }, { width: 13 }, { width: 18 }];

    merge(ws, "A1:E1", "APPLICATION AND CERTIFICATE FOR PAYMENT", { sans: true, size: 17, bold: true });
    set(ws, "H1", "Summary sheet", { sans: true, size: 10, bold: true });
    set(ws, "K1", "PAGE 1 OF 2", { h: "right" });
    merge(ws, "A2:E2", "Continuation sheet attached", { size: 10 });
    ws.getRow(1).height = 24;
    underline(ws, "A2:K2", medium);

    // Header block
    const hdr = [
      [4, "CONTRACTOR:", c.contractor, "PROJECT:", c.projectName, "APPLICATION NO.:", app.no],
      [5, "", c.contractorAddress || "", "", c.projectAddress, "PERIOD TO:", dt(app.periodTo)],
      [6, "TO OWNER:", c.owner, "", "", "JOB NO.:", c.jobNo],
      [7, "", c.ownerAddress || "", "VIA LENDER:", c.lender, "CONTRACT DATE:", dt(c.contractDate)],
      [8, "CONTRACT FOR:", c.contractFor || "General construction", "VIA ARCHITECT:", c.architect || "", "APPLICATION DATE:", dt(app.appDate)],
    ];
    hdr.forEach(([r, l1, v1, l2, v2, l3, v3]) => {
      set(ws, `A${r}`, l1, { size: 10 }); ws.mergeCells(`A${r}:B${r}`);
      ws.getCell(`A${r}`).value = l1;
      merge(ws, `C${r}:E${r}`, v1, { bold: r === 4 || r === 6 });
      set(ws, `G${r}`, l2);
      set(ws, `H${r}`, v2, { bold: r === 4 });
      set(ws, `I${r}`, l3, { h: "right" });
      set(ws, `J${r}`, v3, { h: "left", fmt: v3 instanceof Date ? "mm/dd/yy" : undefined, bold: true });
    });
    set(ws, "K4", "Distribution to:");
    ["Owner", "Lender", "Architect", "Contractor"].forEach((who, i) => set(ws, `K${5 + i}`, `${who === "Contractor" ? "☒" : "☐"} ${who.toUpperCase()}`));
    underline(ws, "A9:K9", medium);

    // Left: contractor's application
    merge(ws, "A11:E11", "CONTRACTOR'S APPLICATION FOR PAYMENT", { sans: true, size: 13, bold: true });
    merge(ws, "A12:E12", "Application is made for payment, as shown below, in connection with the contract.", {});
    merge(ws, "A13:E13", "The continuation sheet is attached.", {});

    const R = (n) => `E${n}`;
    const line = (r, num, label, formula, result, o = {}) => {
      set(ws, `A${r}`, num, { h: "left" });
      set(ws, `B${r}`, label, { sans: true, bold: true, size: 10 });
      if (o.mid) set(ws, `C${r}`, o.mid, { h: "left", size: 9 });
      const cell = set(ws, R(r), formula === null ? result : F(formula, result), { h: "right", fmt: MONEY, fill: o.input ? CYAN : undefined, bold: !!o.bold });
      underline(ws, `${R(r)}:${R(r)}`);
      if (o.box) cell.border = { top: thin, bottom: thin, left: thin, right: thin };
    };
    const sub = (r, text) => set(ws, `B${r}`, text, { size: 9 });

    // Continuation-sheet references (filled after sheet 2 rows are known)
    const nOrig = state.sov.length;
    const coRows = rows.filter((x) => x.isCO);
    const CS = "'Continuation Sheet'";
    const firstRow = 10;
    const origLast = firstRow + Math.max(nOrig, 1) - 1;
    const origTot = origLast + 1;
    const coHead = origTot + 1;
    const coFirst = coHead + 1;
    const coBlank = 3;
    const coLast = coFirst + coRows.length + coBlank - 1;
    const coTot = coLast + 1;
    const grand = coTot + 1;

    line(15, "1.", "ORIGINAL CONTRACT SUM", `${CS}!C${origTot}`, g.l1);
    line(17, "2.", "NET CHANGE BY CHANGE ORDERS", `${CS}!C${coTot}`, g.l2);
    line(19, "3.", "CONTRACT SUM TO DATE", "E15+E17", g.l3, { mid: "(Line 1 + 2)" });
    line(21, "4.", "TOTAL COMPLETED & STORED TO DATE", `${CS}!G${grand}`, g.l4);
    sub(22, "(Column G on continuation sheet)");
    set(ws, "A24", "5.");
    set(ws, "B24", "RETAINAGE:", { sans: true, bold: true });
    set(ws, "B25", "a.  % of completed work", { indent: 1 });
    set(ws, "C25", g.ret, { h: "right", fmt: "0.0%", fill: CYAN, bold: true });
    set(ws, "D25", F(`(${CS}!D${grand}+${CS}!E${grand})*C25`, g.l5a), { h: "right", fmt: MONEY });
    underline(ws, "C25:D25");
    sub(26, "      (Columns D + E on continuation sheet)");
    set(ws, "B27", "b.  % of stored material", { indent: 1 });
    set(ws, "C27", g.sret, { h: "right", fmt: "0.0%", fill: CYAN, bold: true });
    set(ws, "D27", F(`${CS}!F${grand}*C27`, g.l5b), { h: "right", fmt: MONEY });
    underline(ws, "C27:D27");
    sub(28, "      (Column F on continuation sheet)");
    set(ws, "B29", "Total retainage (line 5a + 5b, or total in column I)", { size: 10 });
    set(ws, "E29", F("D25+D27", g.l5), { h: "right", fmt: MONEY }); underline(ws, "E29:E29");
    line(31, "6.", "TOTAL EARNED LESS RETAINAGE", "E21-E29", g.l6);
    sub(32, "(Line 4 less line 5 total)");
    line(34, "7.", "LESS PREVIOUS CERTIFICATES FOR PAYMENT", null, g.l7, { input: true });
    sub(35, "(Line 6 from prior certificate)");
    line(37, "8.", "CURRENT PAYMENT DUE", "E31-E34", g.l8, { bold: true, box: true });
    line(39, "9.", "BALANCE TO FINISH, INCLUDING RETAINAGE", "E19-E31", g.l9);
    sub(40, "(Line 3 less line 6)");

    // Change order summary box
    const co0 = 42;
    set(ws, `B${co0}`, "CHANGE ORDER SUMMARY", { fill: YELLOW });
    merge(ws, `C${co0}:D${co0}`, "ADDITIONS", { h: "center", fill: YELLOW });
    set(ws, `E${co0}`, "DEDUCTIONS", { h: "center", fill: YELLOW });
    set(ws, `B${co0 + 1}`, "Total changes approved in previous months by owner", { wrap: true, size: 9 });
    ws.getRow(co0 + 1).height = 26;
    merge(ws, `C${co0 + 1}:D${co0 + 1}`, g.coPrevAdd, { h: "right", fmt: MONEY, fill: YELLOW });
    set(ws, `E${co0 + 1}`, g.coPrevDed, { h: "right", fmt: MONEY, fill: YELLOW });
    set(ws, `B${co0 + 2}`, "Total approved this month", { size: 9 });
    merge(ws, `C${co0 + 2}:D${co0 + 2}`, g.coThisAdd, { h: "right", fmt: MONEY, fill: YELLOW });
    set(ws, `E${co0 + 2}`, g.coThisDed, { h: "right", fmt: MONEY, fill: YELLOW });
    set(ws, `B${co0 + 3}`, "TOTALS", { h: "center", size: 9 });
    merge(ws, `C${co0 + 3}:D${co0 + 3}`, F(`C${co0 + 1}+C${co0 + 2}`, g.coPrevAdd + g.coThisAdd), { h: "right", fmt: MONEY, fill: YELLOW });
    set(ws, `E${co0 + 3}`, F(`E${co0 + 1}+E${co0 + 2}`, g.coPrevDed + g.coThisDed), { h: "right", fmt: MONEY, fill: YELLOW });
    set(ws, `B${co0 + 4}`, "NET CHANGES by change order", { size: 9 });
    merge(ws, `C${co0 + 4}:E${co0 + 4}`, F(`C${co0 + 3}+E${co0 + 3}`, g.l2), { h: "right", fmt: MONEY, fill: YELLOW });
    gridRange(ws, `B${co0}:E${co0 + 4}`);

    // Right: contractor certification, notary, certificate for payment
    merge(ws, "G11:K15", "The undersigned contractor states that the work and stored materials covered by this application are complete through the period end date as shown, that payments received on earlier applications have been paid to the subcontractors and suppliers who performed that work, and that the current payment shown here is due under the contract.", { wrap: true, v: "top", size: 11 });
    set(ws, "G17", "CONTRACTOR:", { sans: true, bold: true });
    merge(ws, "H17:K17", c.contractor, { bold: true });
    set(ws, "G19", "By:"); underline(ws, "H19:I19");
    set(ws, "J19", "Date:", { h: "right" }); underline(ws, "K19:K19");
    merge(ws, "H20:I20", [c.signer, c.signerTitle].filter(Boolean).join(", "), { size: 9 });
    set(ws, "G22", "State of:"); set(ws, "H22", "Arizona", { bold: true }); set(ws, "I22", "County of:", { h: "right" }); set(ws, "J22", "Maricopa", { bold: true });
    set(ws, "G23", "Subscribed and sworn before me on this"); underline(ws, "I23:J23");
    set(ws, "G25", "Notary:", { bold: true }); underline(ws, "H25:H25");
    set(ws, "I25", "My commission expires:", { bold: true, h: "right" }); underline(ws, "J25:K25");
    underline(ws, "G26:K26", medium);

    merge(ws, "G28:K28", "CERTIFICATE FOR PAYMENT", { sans: true, size: 13, bold: true });
    merge(ws, "G29:K33", "Based on site observations and the data in this application, the reviewer confirms that the work has progressed as shown, that its quality meets the contract documents as far as the reviewer can tell, and that the contractor is entitled to payment of the amount certified.", { wrap: true, v: "top", size: 11 });
    set(ws, "G35", "AMOUNT CERTIFIED", { sans: true, bold: true, size: 11 });
    set(ws, "I35", "$", { h: "right" });
    set(ws, "J35", null, { fmt: MONEY, fill: CYAN }); ws.mergeCells("J35:K35"); underline(ws, "J35:K35", medium);
    merge(ws, "G36:K37", "If the amount certified differs from the amount requested, attach the reason and initial each changed figure on both sheets.", { italic: true, wrap: true, v: "top", size: 9 });
    set(ws, "G39", "OWNER / LENDER:", { sans: true, bold: true });
    set(ws, "G40", "By:"); underline(ws, "H40:I40"); set(ws, "J40", "Date:", { h: "right" }); underline(ws, "K40:K40");
    set(ws, "G42", "ARCHITECT / INSPECTOR:", { sans: true, bold: true });
    set(ws, "G43", "By:"); underline(ws, "H43:I43"); set(ws, "J43", "Date:", { h: "right" }); underline(ws, "K43:K43");
    merge(ws, "G45:K46", "This certificate is not negotiable. The amount certified is payable only to the contractor named here. Issuing, paying, or accepting it does not waive any right of the owner or contractor under the contract.", { wrap: true, v: "top", size: 9 });
    ws.pageSetup.printArea = "A1:K46";

    // =============== Sheet 2: Continuation Sheet ===============
    const cs = wb.addWorksheet("Continuation Sheet", {
      views: [{ showGridLines: false, state: "frozen", ySplit: 9 }],
      pageSetup: { paperSize: 1, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, horizontalCentered: true, printTitlesRow: "6:9", margins: { left: 0.35, right: 0.35, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.2 } },
      headerFooter: { oddFooter: "&LContinuation sheet&RApplication " + app.no },
    });
    cs.columns = [{ width: 7 }, { width: 40 }, { width: 16 }, { width: 16 }, { width: 15 }, { width: 15 }, { width: 16 }, { width: 8 }, { width: 16 }, { width: 15 }];
    merge(cs, "A1:E1", "CONTINUATION SHEET - Schedule of Values", { sans: true, size: 17, bold: true });
    cs.getRow(1).height = 24;
    set(cs, "J1", "PAGE 2 OF 2", { h: "right" });
    underline(cs, "A1:J1");
    merge(cs, "A2:E2", "Application and certificate for payment, with the contractor's signed statement, is attached.", { size: 10 });
    merge(cs, "A3:E3", "Amounts are stated to the nearest cent.", { size: 10 });
    merge(cs, "A4:E4", "Use column I where retainage varies by line item.", { size: 10 });
    const ref = [["APPLICATION NO.:", "Application!J4", app.no, null], ["APPLICATION DATE:", "Application!J8", dt(app.appDate), "mm/dd/yy"], ["PERIOD TO:", "Application!J5", dt(app.periodTo), "mm/dd/yy"], ["JOB NO.:", "Application!J6", c.jobNo, null]];
    ref.forEach(([l, f, v, fmt], i) => { merge(cs, `G${2 + i}:I${2 + i}`, l, { h: "right" }); set(cs, `J${2 + i}`, F(f, v), { bold: true, fmt: fmt || undefined }); });

    // Column letters + headers
    const letters = ["A", "B", "C", "D", "E", "F", "G", "", "H", "I"];
    letters.forEach((l, i) => set(cs, `${String.fromCharCode(65 + i)}6`, l, { h: "center" }));
    cs.mergeCells("G6:H6");
    set(cs, "G6", "G", { h: "center" });
    const H = (ref, text, rng) => { if (rng) cs.mergeCells(rng); set(cs, ref, text, { h: "center", v: "middle", wrap: true, size: 10 }); };
    H("A7", "ITEM NO.", "A7:A9");
    H("B7", "DESCRIPTION OF WORK", "B7:B9");
    H("C7", "SCHEDULED VALUE", "C7:C9");
    H("D7", "WORK COMPLETED", "D7:E7");
    H("D8", "FROM PREVIOUS APPLICATION (D + E)", "D8:D9");
    H("E8", "THIS PERIOD", "E8:E9");
    H("F7", "MATERIALS PRESENTLY STORED (NOT IN D OR E)", "F7:F9");
    H("G7", "TOTAL COMPLETED AND STORED TO DATE (D + E + F)", "G7:G9");
    H("H7", "% (G ÷ C)", "H7:H9");
    H("I7", "BALANCE TO FINISH (C − G)", "I7:I9");
    H("J7", "RETAINAGE (IF VARIABLE RATE)", "J7:J9");
    cs.getRow(8).height = 30; cs.getRow(9).height = 30;
    gridRange(cs, "A6:J9");
    boxRange(cs, "A6:J9", medium);

    const RET = "Application!$C$25", SRET = "Application!$C$27";
    const writeLine = (r, item, desc, C, D, E, Fv) => {
      const G = D + E + Fv;
      set(cs, `A${r}`, item, { h: "center" });
      set(cs, `B${r}`, desc, { wrap: true });
      set(cs, `C${r}`, C, { h: "right", fmt: MONEY, fill: CYAN });
      set(cs, `D${r}`, D, { h: "right", fmt: MONEY, fill: CYAN });
      set(cs, `E${r}`, E, { h: "right", fmt: MONEY, fill: CYAN });
      set(cs, `F${r}`, Fv, { h: "right", fmt: MONEY, fill: CYAN });
      set(cs, `G${r}`, F(`D${r}+E${r}+F${r}`, G), { h: "right", fmt: MONEY });
      set(cs, `H${r}`, F(`IF(C${r}=0,0,G${r}/C${r})`, C ? G / C : 0), { h: "center", fmt: PCT });
      set(cs, `I${r}`, F(`C${r}-G${r}`, C - G), { h: "right", fmt: MONEY });
      set(cs, `J${r}`, F(`(D${r}+E${r})*${RET}+F${r}*${SRET}`, (D + E) * g.ret + Fv * g.sret), { h: "right", fmt: MONEY });
    };
    const orig = rows.filter((x) => !x.isCO);
    if (!orig.length) writeLine(firstRow, "", "", 0, 0, 0, 0);
    orig.forEach((x, i) => writeLine(firstRow + i, x.item, x.desc, x.C, x.D, x.E, x.F));
    gridRange(cs, `A${firstRow}:J${origLast}`);

    const sumRow = (r, label, from, to, fillArgb) => {
      merge(cs, `A${r}:B${r}`, label, { bold: true, fill: fillArgb });
      const subset = rows.filter((x) => (label.startsWith("CHANGE") ? x.isCO : label.startsWith("SUB") ? !x.isCO : true));
      const tot = (k) => subset.reduce((a, x) => a + (x[k] || 0), 0);
      const res = { C: tot("C"), D: tot("D"), E: tot("E"), F: tot("F"), G: tot("G"), I: tot("H"), J: tot("I") };
      ["C", "D", "E", "F", "G", "I", "J"].forEach((col) => {
        set(cs, `${col}${r}`, F(typeof from === "string" ? from.replace(/#/g, col) : `SUM(${col}${from}:${col}${to})`, res[col]), { h: "right", fmt: MONEY, bold: true, fill: fillArgb });
      });
      set(cs, `H${r}`, F(`IF(C${r}=0,0,G${r}/C${r})`, res.C ? res.G / res.C : 0), { h: "center", fmt: PCT, bold: true, fill: fillArgb });
      gridRange(cs, `A${r}:J${r}`);
    };
    sumRow(origTot, "SUB TOTALS:", firstRow, origLast);
    merge(cs, `A${coHead}:J${coHead}`, "Change Orders", { bold: true, h: "center", fill: YELLOW });
    gridRange(cs, `A${coHead}:J${coHead}`);
    coRows.forEach((x, i) => writeLine(coFirst + i, x.item, x.desc, x.C, x.D, x.E, x.F));
    for (let i = 0; i < coBlank; i++) writeLine(coFirst + coRows.length + i, "", "", 0, 0, 0, 0);
    gridRange(cs, `A${coFirst}:J${coLast}`);
    sumRow(coTot, "CHANGE ORDER TOTALS:", coFirst, coLast);
    sumRow(grand, "GRAND TOTALS:", `#${origTot}+#${coTot}`, null, "FFF2F2F2");
    boxRange(cs, `A${grand}:J${grand}`, medium);
    set(cs, `A${grand + 2}`, "Blue cells are entries. Everything else calculates. Retainage rates come from the summary sheet, lines 5a and 5b.", { italic: true, size: 9 });
    cs.mergeCells(`A${grand + 2}:J${grand + 2}`);

    // =============== Optional extra sheets for the draw package ===============
    if (opts.extras) opts.extras(wb, { set, merge, gridRange, MONEY, SANS, SERIF, fill });

    return wb.xlsx.writeBuffer();
  }

  window.GCW_PAYAPP = { build };
})();
