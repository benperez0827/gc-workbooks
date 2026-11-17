# GC Workbooks

Browser-based project controls tools for small general contractors and residential developers. Built as a working demo with sample data.

**Live site:** `https://benperez0827.github.io/gc-workbooks/` (once GitHub Pages is on)

## Tools

| Page | What it does |
|---|---|
| `index.html` | Overview and live delay-cost slider |
| `estimate.html` | Scope-by-scope estimate for single-family, build-to-rent, townhome, and garden multifamily. Subcontract or self-perform per line (wage, burden, production rate, material, waste, equipment). General conditions, markups, Arizona prime contracting TPT, bid leveling and buyout log, developer pro forma, NAHB benchmark check |
| `admin.html` | Schedule of values from the estimate, change order log, monthly pay application (summary and continuation sheet), lender draw checklist, Arizona statutory lien waivers, closeout tracker |
| `permits.html` | City of Phoenix plan review tracker. Desk-by-desk handoff log, cycle days against city goals, critical-path delay exposure |
| `delay.html` | Monthly cost of delay: lost rent, interest, extended general conditions |

Everything runs client-side. Data saves to the browser's local storage. Teams hand off work with **Save file / Open file** (a `.gcwb.json` file) and Excel exports. Formatted Excel templates live in `templates/`.

## Change the branding

Edit `CONFIG` at the top of `assets/js/common.js`: name, tagline, contact email, LinkedIn.

## Deploy on GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → Branch: `main`, folder `/ (root)`.

## Data sources

Wages: BLS OEWS May 2025 (Phoenix-Mesa-Chandler MSA medians where published). Cost shares: NAHB Cost of Constructing a Home 2024. Market values: Northmarq Phoenix BTR Q2 2026, Yardi Matrix Phoenix Sept 2026. Review goals: City of Phoenix PDD time frames report, Sept 2026, and the city's A.R.S. 9-835 policy. Lien waiver text: A.R.S. 33-1008(D). Full list in the Estimating workbook under *Data we need from you*.

Production rates, material prices, general conditions, and workers comp rates are sample planning figures.

## Notes

- Lien waiver forms follow the Arizona statute. Confirm wording before use. Not legal advice.
- The pay application uses the industry-standard summary and continuation sheet structure. It is not an AIA document and carries no AIA branding.
- Spreadsheet export uses [xlsx-js-style](https://github.com/gitbrent/xlsx-js-style) (Apache 2.0), bundled in `assets/vendor/`.
