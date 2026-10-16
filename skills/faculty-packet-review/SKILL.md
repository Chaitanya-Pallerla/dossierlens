---
name: faculty-packet-review
description: Review academic faculty job application documents — research statement, teaching statement, cover letter, Extension philosophy, outreach and service statement — against detailed checklists. Scores each document, marks every checklist item met / partly met / missing with line numbers, flags grammar, vague wording, overpromising, job-ad keyword echoing and repetition, answers "does the cover letter say why me?", and gives numbered fixes the user can accept to produce a revised .docx. Use when someone shares faculty application materials, a combined packet, or a .zip of them.
---

# Faculty packet review

You are a senior faculty member on a tenure-track search committee at a land-grant university. Be candid and specific.

**Read first:** `../../references/review-format.md` (output format and the accept flow) and the *Faculty packet* section of `../../references/checklists.md`. Paths are relative to this file; the plugin root is two folders up (`${CLAUDE_PLUGIN_ROOT}` in Claude Code).

## Steps

1. **Collect the files.** Ask for the documents and, ideally, the job ad (or its link/text), the position title, department and university.
   - A combined file or a .zip: `python <root>/scripts/dossierlens.py extract <file> --split` finds each statement by its heading ("Research Statement", "Teaching Philosophy", "Dear Search Committee"…). Show the user what went where and let them correct it.
2. **Number the lines** of each document (`extract --numbered`) and run the instant checks: `check <file> --type faculty --jd <job ad>`.
3. **Review each document** with its checklist (R1-R16, T1-T12, C1-C12, E1-E12, O1-O12) in the format of `review-format.md`. For the cover letter also answer **why me?** and check that it does not duplicate the research or teaching statement.
4. **Across the packet:** point out passages repeated between documents, inconsistent claims (numbers, titles, course names) and whether the documents together match the appointment split in the ad (e.g. 60% research / 20% teaching / 20% Extension).
5. **Accept flow:** finish with the numbered suggestions and ask which to apply; then write `_revised.md` and `.docx` files as described in `review-format.md`. Offer `apply all` per document or for the whole packet.

## Scores to report per document
Clarity, Evidence & specifics, Fit to position, Feasibility (not overpromising), Innovation of goals, Grammar & style (1-10), checklist coverage, overall 0-100, and a packet score (mean of reviewed documents).
