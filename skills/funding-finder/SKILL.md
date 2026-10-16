---
name: funding-finder
description: Find currently open research funding calls and deadlines from US federal agencies (NSF, NIH, USDA NIFA, DOE, DARPA, NASA…), foundations (Simons, Sloan, Moore, Gates, FFAR…), big-tech academic research programs (Google, Microsoft, Meta, Amazon, NVIDIA, Apple, IBM…) and international funders (ERC, UKRI, NSERC, ARC, DFG, JSPS…). Filters by field of study (including combinations such as robotics + food), country (USA by default), funder type and deadline window, and can refresh the web app's grants.json. Use when someone asks what grants are open, about upcoming deadlines, or for funding on a topic.
---

# Funding finder

1. Ask for (or infer) the filters: fields of study (allow combinations — *Robotics + Food science* means calls that fit both), country (default **USA**), funder types (Federal, State, Foundation, Industry & big tech, International), career stage, and deadline window.
2. Search the web. Run at least one search per relevant funder group, then open the funder's own page to confirm every date you report. Never invent or estimate a date, amount or eligibility rule: write "not stated", mark a call **check** when sources disagree, **forecast** when only an expected cycle is known, and **rolling** when there is no fixed deadline.
3. Present a table sorted by deadline: call · funder · type · country · deadline (days left) · award · fields · eligibility · link · source (official page / listing site). Then the 3 best matches for the user's proposal or fields, with one reason each.
4. **Refresh the web app (optional):** inside a DossierLens checkout, when asked, update `docs/grants.json` (`{"meta": {"lastRun", "runBy", "count", "note"}, "grants": [...]}`) keeping the fields `id, title, sponsor, sponsorType, countries, fields, deadline, deadlineNote, status, amount, summary, eligibility, url, sourceType, updated`. Remove calls more than 7 days past their deadline (except rolling and forecast) and take `lastRun` from the system clock (`date -u +%Y-%m-%dT%H:%M:%SZ`).
5. **Every morning automatically:** in Claude Code use `/schedule` to create a routine that runs this skill; with Codex, schedule `codex exec "Use $funding-finder to refresh docs/grants.json"` with cron (macOS/Linux) or Task Scheduler (Windows).
