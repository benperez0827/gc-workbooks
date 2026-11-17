/* Shared helpers: config, storage, formatting, nav, file handoff */
(function () {
  "use strict";

  // Edit these to rebrand the whole site.
  const CONFIG = {
    brandName: "Ben Perez",
    brandSub: "Project controls for builders",
    contactEmail: "", // e.g. "you@yourfirm.com"
    contactLinkedIn: "", // e.g. "https://www.linkedin.com/in/your-profile"
    storageKey: "gcwb.v1",
    // Inside Claude, each tool is its own artifact. Links between pages point here.
    artifactLinks: {
      "index.html": "https://claude.ai/artifact/V71FiDSfX5pRc2aaZ2idm4",
      "estimate.html": "https://claude.ai/artifact/5jQ7LvAKXvBsBpV1AgU4Y5",
      "admin.html": "https://claude.ai/artifact/NQZKsykPaHqTxhfNPLVgrA",
      "permits.html": "https://claude.ai/artifact/YRJajQhR3MdMCKw4CbtGQh",
      "delay.html": "https://claude.ai/artifact/HTuyD6pFRRnULr86LEFQW4",
    },
  };

  // True when the page runs as a Claude artifact (sandboxed: no native downloads, print, or dialogs).
  const IN_CLAUDE = !!(window.claude && typeof window.claude.use === "function");

  const NAV = [
    { href: "index.html", label: "Overview" },
    { href: "estimate.html", label: "Estimating" },
    { href: "admin.html", label: "Admin & billing" },
    { href: "permits.html", label: "Permit tracker" },
    { href: "delay.html", label: "Delay cost" },
  ];

  // ---------- storage ----------
  function loadAll() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveAll(data) {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }
  function load(slice) { return loadAll()[slice]; }
  function save(slice, value) {
    const all = loadAll();
    all[slice] = value;
    all.savedAt = new Date().toISOString();
    return saveAll(all);
  }

  // ---------- formatting ----------
  const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const n0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const n2 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const fmt = {
    money: (v) => usd0.format(num(v)),
    money2: (v) => usd2.format(num(v)),
    num: (v) => n0.format(num(v)),
    num2: (v) => n2.format(num(v)),
    pct: (v, d = 1) => (num(v) * 100).toFixed(d) + "%",
    date: (s) => {
      if (!s) return "";
      const d = new Date(s + "T00:00:00");
      return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    },
    dateLong: (s) => {
      if (!s) return "";
      const d = new Date(s + "T00:00:00");
      return isNaN(d) ? s : d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    },
  };
  function num(v) {
    const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[$,%\s]/g, ""));
    return isFinite(n) ? n : 0;
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function today() { return new Date().toISOString().slice(0, 10); }
  function daysBetween(a, b) {
    if (!a || !b) return 0;
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  }
  function addDays(s, n) {
    const d = new Date(s + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---------- downloads ----------
  let dlNS;
  async function downloadsNS() {
    if (!IN_CLAUDE) return null;
    if (dlNS === undefined) {
      try { dlNS = await window.claude.use("downloads"); } catch (e) { dlNS = null; }
    }
    return dlNS;
  }
  // Save a generated file. Uses Claude's download prompt inside an artifact, a normal download elsewhere.
  async function saveFile(filename, data, type = "application/octet-stream") {
    if (IN_CLAUDE) {
      const ns = await downloadsNS();
      if (!ns) { toast("Saving files isn't available in this view. Use the GitHub version of the site."); return false; }
      try { await ns.save({ filename, data }); return true; }
      catch (e) {
        if (e && e.code === "declined") return false;
        if (e && e.code === "rate_limited") { toast("A save prompt is already open. Finish it, then try again."); return false; }
        toast("That file couldn't be saved here. Use the GitHub version of the site.");
        return false;
      }
    }
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
    return true;
  }
  function download(filename, text, type = "application/json") { return saveFile(filename, text, type); }
  function saveWorkbook(wb, filename) {
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return saveFile(filename, buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  }
  function slug(s) { return String(s || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project"; }

  // Whole-project handoff file: every department's data in one JSON file.
  function exportProjectFile() {
    const all = loadAll();
    const name = all.estimate?.project?.name || all.admin?.contract?.projectName || "project";
    all.exportedAt = new Date().toISOString();
    all.format = "gc-workbooks/1";
    download(`${slug(name)}.gcwb.json`, JSON.stringify(all, null, 2)).then((ok) => { if (ok) toast("Project file saved. Send it to the next department."); });
  }
  function importProjectFile(onDone) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (typeof data !== "object" || data === null) throw new Error("bad");
          const keep = {};
          ["estimate", "admin", "permits", "delay"].forEach((k) => { if (data[k]) keep[k] = data[k]; });
          if (!Object.keys(keep).length) throw new Error("empty");
          saveAll(Object.assign(loadAll(), keep));
          toast("Project file opened.");
          if (onDone) onDone(); else location.reload();
        } catch (e) {
          toast("That file isn't a workbook project file. Choose a .gcwb.json file exported from these tools.");
        }
      };
      r.readAsText(file);
    };
    input.click();
  }

  // ---------- in-page dialogs (work everywhere, including Claude artifacts) ----------
  function dialog({ message, ok = "OK", cancel = "Cancel", input = false, placeholder = "", danger = false }) {
    return new Promise((resolve) => {
      const back = document.createElement("div");
      back.className = "dlg-back";
      back.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="${esc(ok)}">
        <p>${esc(message)}</p>
        ${input ? `<input type="text" class="dlg-input" placeholder="${esc(placeholder)}">` : ""}
        <div class="dlg-actions"><button type="button" data-v="0">${esc(cancel)}</button><button type="button" data-v="1" class="${danger ? "btn-red" : "btn-primary"}">${esc(ok)}</button></div>
      </div>`;
      const prev = document.activeElement;
      document.body.appendChild(back);
      const field = back.querySelector(".dlg-input");
      const close = (v) => {
        back.remove();
        document.removeEventListener("keydown", key, true);
        if (prev && prev.focus) prev.focus();
        resolve(input ? (v ? (field.value.trim() || null) : null) : !!v);
      };
      const key = (e) => {
        if (e.key === "Escape") { e.preventDefault(); close(0); }
        if (e.key === "Enter") { e.preventDefault(); close(1); }
      };
      document.addEventListener("keydown", key, true);
      back.addEventListener("click", (e) => { const b = e.target.closest("[data-v]"); if (b) close(+b.dataset.v); else if (e.target === back) close(0); });
      (field || back.querySelector('[data-v="1"]')).focus();
    });
  }
  const ask = (message, ok = "Continue", danger = false) => dialog({ message, ok, danger });
  const askText = (message, placeholder = "", ok = "Add") => dialog({ message, ok, input: true, placeholder });

  // Print documents. Inside Claude, printing is blocked, so save a print-ready web page instead.
  function printDocs(html, title = "document") {
    if (IN_CLAUDE) {
      let css = "";
      for (const sh of document.styleSheets) {
        try { for (const r of sh.cssRules) css += r.cssText + "\n"; } catch (e) { /* cross-origin font sheet */ }
      }
      const page = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}\nbody{background:#fff}.doc{border:none;margin:0 auto 28px}@media print{.doc{page-break-after:always}}</style></head><body>${html}<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},300)});<\/script></body></html>`;
      saveFile(`${slug(title)}.html`, page, "text/html").then((ok) => { if (ok) toast("Saved a print-ready page. Open it and it goes straight to print or PDF."); });
      return;
    }
    let area = document.getElementById("print-area");
    if (!area) {
      area = document.createElement("section");
      area.id = "print-area";
      area.className = "panel";
      (document.querySelector("main") || document.body).appendChild(area);
    }
    area.innerHTML = html;
    area.hidden = false;
    area.classList.add("printing");
    const done = () => { area.hidden = true; area.classList.remove("printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    setTimeout(() => window.print(), 50);
  }

  // Inside Claude, page links point at sibling artifacts, and file links save through Claude.
  function rewriteLinks(root = document) {
    if (!IN_CLAUDE) return;
    const map = CONFIG.artifactLinks || {};
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (a.dataset.rewritten || /^(https?:|mailto:|#)/.test(href)) return;
      const [page, hash] = href.split("#");
      if (map[page]) {
        a.href = map[page] + (hash ? "#" + hash : "");
        a.target = "_top";
        a.dataset.rewritten = "1";
      }
    });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[download]");
    if (!a || !IN_CLAUDE) return;
    e.preventDefault();
    const name = a.getAttribute("href").split("/").pop();
    const b64 = window.GCW_TEMPLATES && window.GCW_TEMPLATES[name];
    if (b64) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      saveFile(name, bytes);
      return;
    }
    fetch(a.getAttribute("href"))
      .then((r) => { if (!r.ok) throw new Error(); return r.arrayBuffer(); })
      .then((buf) => saveFile(a.getAttribute("href").split("/").pop(), buf))
      .catch(() => toast("That template isn't included in this view. Download it from the GitHub version."));
  });

  // ---------- UI ----------
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 3200);
  }

  function renderChrome() {
    const page = document.body.dataset.page || location.pathname.split("/").pop() || "index.html";
    const header = document.querySelector("[data-header]");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `
        <div class="wrap">
          <a class="brand" href="index.html">${esc(CONFIG.brandName)}<span>${esc(CONFIG.brandSub)}</span></a>
          <nav class="site-nav" aria-label="Tools">
            ${NAV.map((n) => `<a href="${n.href}" ${n.href === page ? 'aria-current="page"' : ""}>${n.label}</a>`).join("")}
          </nav>
          <div class="header-tools">
            <button class="btn" data-open-file title="Open a .gcwb.json file from another department">Open file</button>
            <button class="btn" data-save-file title="Download every workbook as one file to hand off">Save file</button>
          </div>
        </div>`;
      header.querySelector("[data-open-file]").onclick = () => importProjectFile();
      header.querySelector("[data-save-file]").onclick = exportProjectFile;
    }
    const footer = document.querySelector("[data-footer]");
    if (footer) {
      footer.className = "site-footer";
      const contact = [
        CONFIG.contactEmail ? `<a href="mailto:${esc(CONFIG.contactEmail)}">${esc(CONFIG.contactEmail)}</a>` : "",
        CONFIG.contactLinkedIn ? `<a href="${esc(CONFIG.contactLinkedIn)}">LinkedIn</a>` : "",
      ].filter(Boolean).join(" &nbsp; ");
      footer.innerHTML = `
        <div class="wrap">
          <span>${esc(CONFIG.brandName)}. Demo tools with sample data. Your data stays in your browser until you export it.</span>
          <span>${contact}</span>
        </div>`;
    }
    rewriteLinks();
  }

  function tabs(root) {
    const btns = root.querySelectorAll(".tabs [role=tab]");
    function show(id) {
      btns.forEach((b) => {
        const on = b.dataset.tab === id;
        b.setAttribute("aria-selected", on);
        const p = document.getElementById(b.dataset.tab);
        if (p) p.hidden = !on;
      });
      history.replaceState(null, "", "#" + id);
      document.dispatchEvent(new CustomEvent("tabchange", { detail: id }));
    }
    btns.forEach((b) => (b.onclick = () => show(b.dataset.tab)));
    const initial = location.hash.slice(1);
    show([...btns].some((b) => b.dataset.tab === initial) ? initial : btns[0].dataset.tab);
    return show;
  }

  function stamp(text, color) { return `<span class="stamp ${color}">${esc(text)}</span>`; }

  // Print one panel only.
  function printPanel(panel) {
    panel.classList.add("printing");
    const done = () => { panel.classList.remove("printing"); window.removeEventListener("afterprint", done); };
    window.addEventListener("afterprint", done);
    window.print();
  }

  window.GCW = { CONFIG, IN_CLAUDE, load, save, loadAll, saveAll, fmt, num, uid, today, daysBetween, addDays, esc, clone, download, saveFile, saveWorkbook, slug, exportProjectFile, importProjectFile, toast, tabs, stamp, printPanel, printDocs, ask, askText, rewriteLinks };
  document.addEventListener("DOMContentLoaded", renderChrome);
})();
