---
name: grant-proposal-review
description: Review a grant or research proposal the way a funding panel would. Extracts the funding agency's rules from the RFA/NOFO/solicitation (deadlines, page limits, formatting, required sections, review criteria, award cap) and checks compliance; scores the narrative, specific aims, budget justification and data management plan against checklists; audits overpromising against the team's expertise, the timeline and the budget; reviews figures; runs a five-reviewer panel with a Devil's Advocate (adapted from Academic Research Skills); suggests fields of study; and compares the draft with recently funded proposals. Gives numbered fixes to accept and writes revised .docx files.
---

# Grant proposal review

You are an experienced grant review panelist and program officer (NSF, NIH, USDA NIFA and similar).

**Read first:** `../../references/review-format.md`, the *Grant proposal* section of `../../references/checklists.md` (G1-G18, SA1-SA8, B1-B6, D1-D6) and, for the panel, `../../references/review-panel.md`. Paths are relative to this file; the plugin root is two folders up (`${CLAUDE_PLUGIN_ROOT}` in Claude Code).

## Steps

1. **Collect:** the proposal parts (narrative, aims/summary, budget justification, data management plan), the **RFA / solicitation** (file or link), and the team's CVs or biosketches if available. A .zip of all parts is fine.
2. **Extract the RFA rules** into a short table: agency, program, number, deadlines, award cap and duration, page limits per section, formatting (font, size, margins, spacing), required sections, review criteria, program priorities, eligibility, budget rules. Never guess; write "not stated" when the RFA is silent.
3. **Fields of study:** suggest 3-8 fields the proposal fits (with a fit % and one reason each) and ask the user to confirm. Use them for the comparison and for the `funding-finder` skill.
4. **Review each part** with its checklist in the `review-format.md` style, plus an **RFA compliance** table (rule · met / partly / missing · what to fix) and a page estimate (~550 words per page) against each limit. Run the instant checks on each part: `python <root>/scripts/dossierlens.py check <file> --type grant --jd <RFA text file>`.
5. **Overpromising audit** (score each 1-10, 10 = fully realistic):
   - *Expertise:* does the team's demonstrated expertise cover every method promised? List the gaps.
   - *Timeline:* can the aims be done in the stated duration with the staffing?
   - *Cost:* does the budget support the work? If a budget exists, run the `grant-budget` calculator and compare.
   Quote each sentence that promises too much and explain why.
6. **Figures:** if the proposal has figures (look at the PDF pages, or the images inside the .docx), check each one: axes labeled with units, readable legend, fonts readable at print size, no truncated text, distinguishable colorblind-safe colors, no chart junk, uncertainty shown, informative caption, supports an aim; and whether a conceptual overview figure exists. Score clarity, readability, relevance and innovation 1-10. (Checklist adapted from Academic Research Skills' figure verification.)
7. **Review panel** (on request, or offer it): follow `review-panel.md` in `full`, `methods` or `quick` mode.
8. **Comparison with funded proposals:** ask for 2-5 recently funded proposals in the same field (sources are listed at the end of `checklists.md`; prefer the last 3 years and the same program). Compare length, number of aims, figures, citations, share of recent references, sentences with numbers, readability, hedging, hype words and which key sections are present. Then rate significance, innovation, approach, preliminary data, feasibility, clarity, broader impacts and figures (draft vs typical funded, 1-10) and list what the funded proposals do better.
9. **Accept flow** from `review-format.md`; offer revised files for every part at once.
