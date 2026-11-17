/* Small styling layer over xlsx-js-style so exports look like real workbooks */
(function () {
  "use strict";
  const THIN = { style: "thin", color: { rgb: "9AA3AB" } };
  const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };
  const FMT = { money: '"$"#,##0;[Red]-"$"#,##0', money2: '"$"#,##0.00;[Red]-"$"#,##0.00', pct: "0.0%", num: "#,##0", num2: "#,##0.00", date: "mmm d, yyyy" };

  function addr(r, c) { return XLSX.utils.encode_cell({ r, c }); }

  // Apply styles to a sheet built with aoa_to_sheet.
  // opts: { header: rowIndex|[rows], money:[cols], money2:[cols], pct:[cols], num:[cols], bold:[rows], fill:{row:rgb}, widths:[...], border:true, wrapCols:[cols] }
  function style(ws, opts = {}) {
    const range = XLSX.utils.decode_range(ws["!ref"]);
    const headers = [].concat(opts.header ?? []);
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const a = addr(R, C);
        if (!ws[a]) { if (opts.border && R >= (headers[0] ?? 0)) ws[a] = { t: "s", v: "" }; else continue; }
        const s = { font: { name: "Arial", sz: 10 }, alignment: { vertical: "center" } };
        if (opts.border && R >= (headers[0] ?? 0)) s.border = BORDER;
        if (headers.includes(R)) {
          s.font.bold = true;
          s.fill = { fgColor: { rgb: "E8EAE6" } };
          s.alignment = { vertical: "center", horizontal: "center", wrapText: true };
        } else {
          if ((opts.money || []).includes(C)) ws[a].z = FMT.money;
          if ((opts.money2 || []).includes(C)) ws[a].z = FMT.money2;
          if ((opts.pct || []).includes(C)) ws[a].z = FMT.pct;
          if ((opts.num || []).includes(C)) ws[a].z = FMT.num;
          if ((opts.num2 || []).includes(C)) ws[a].z = FMT.num2;
          if ((opts.wrapCols || []).includes(C)) s.alignment.wrapText = true;
        }
        if ((opts.bold || []).includes(R)) s.font.bold = true;
        if (opts.fill && opts.fill[R]) s.fill = { fgColor: { rgb: opts.fill[R] } };
        if (opts.cellStyle) Object.assign(s, opts.cellStyle(R, C) || {});
        ws[a].s = s;
      }
    }
    if (opts.widths) ws["!cols"] = opts.widths.map((w) => ({ wch: w }));
    return ws;
  }

  function title(ws, text, sub) {
    // Use with sheets whose first rows are reserved for a title.
    ws["A1"] = { t: "s", v: text, s: { font: { name: "Arial", sz: 14, bold: true } } };
    if (sub) ws["A2"] = { t: "s", v: sub, s: { font: { name: "Arial", sz: 10, color: { rgb: "4A5662" } } } };
  }

  window.GCW_XL = { style, title, FMT, addr, BORDER };
})();
