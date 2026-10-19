---
name: dossierlens-app
description: Open the DossierLens web app — the visual version with color-highlighted checklist coverage, line numbers, tick-to-accept suggestions, the review panel, budget calculator, funding finder and Word downloads. Use when someone wants the visual tool, a page to share, or to run it locally.
---

# Open the DossierLens web app

The app lives in `../../docs/` (`index.html` plus its `.js` files and `grants.json`). Pick the option that fits:

1. **Hosted (no install):** the GitHub Pages link in the README. AI features use the person's own Claude or OpenAI API key, entered in the page's *AI connection* panel and stored only in their browser.
2. **Local server** (instant checks work offline):
   ```bash
   cd "<plugin root>/docs"
   python -m http.server 8765
   ```
   Then open http://localhost:8765 . Opening `index.html` directly also works, but the funding list needs the server.
3. **claude.ai artifact (uses the person's Claude account, no API key):** if the Artifact tool is available, publish `<plugin root>/docs/index.html` with the supporting files `provider.js, tracked.js, checklists.js, aiscan.js, budget.js, compare.js, funding.js, ars.js, grants.json` and the capabilities `sample` (with images), `downloads` and `db`.

Tell the person that documents are processed in their browser and sent only to the AI provider they connect.
