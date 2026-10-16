# Notice and attribution

DossierLens is licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Noncommercial use only.

## Adapted material

Parts of DossierLens are adapted from **Academic Research Skills** (v3.23.1) by **Cheng-I Wu**,
<https://github.com/Imbad0202/academic-research-skills>, licensed
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

| DossierLens file | Adapted from (Academic Research Skills) | What we changed |
|---|---|---|
| `scripts/dossierlens.py` (uncited claims) · `docs/ars.js` | `scripts/uncited_assertion_detector.py`, `scripts/_claim_audit_constants.py` (rule D4-c) | Rewritten in plain Python and browser JavaScript; the citation test uses in-text citations instead of `<!--ref:-->` markers |
| `scripts/dossierlens.py` (acronyms) · `docs/ars.js` | `scripts/check_acronyms.py` | Simplified to English, body scope only; same three rules and default allowlist |
| `scripts/dossierlens.py` (title similarity) · `docs/ars.js` | `scripts/_text_similarity.py` | Same normalization and `SequenceMatcher` ratio; used for near-duplicate references |
| `scripts/dossierlens.py` (tortured phrases) · `docs/ars.js` | `scripts/tortured_phrase_screening.py` | Same "phrase-list match requiring review" approach; literal matching only; starter list from Cabanac et al. (2021) |
| `scripts/dossierlens.py` (preprint flag) · `docs/ars.js` | `deep-research/agents/bibliography_agent.md` (Signal 1) | Same year ≥ 2024 + preprint-server rule, applied to free-text references |
| AI-typical words, filler openers | `academic-paper/references/writing_quality_check.md` | Shortened list; alternatives kept |
| Figure checklist | `academic-paper/references/vlm_figure_verification.md` | Adapted to grant figures; scored 1-10 |
| `references/review-panel.md` · `docs/ars.js` panel prompts | `academic-paper-reviewer/agents/*` (field analyst, EIC, methodology, domain, perspective, devil's advocate, editorial synthesizer) and `references/editorial_decision_standards.md` | Condensed; adapted from journal papers to grant proposals; decision labels renamed for grants |
| Reference-checking method | `deep-research/agents/source_verification_agent.md`, `academic-pipeline/references/ai_research_failure_modes.md` | Live database lookups are done by the AI agent when it has web access; not included in the web app |

## Other sources

- Tortured-phrase examples: G. Cabanac, C. Labbé, A. Magazinov (2021). *Tortured phrases: A dubious writing style emerging in science. Evidence of critical issues affecting established journals.* [arXiv:2107.06751](https://arxiv.org/abs/2107.06751).
- Funded-proposal sources linked in the app (NIAID, NIDCD, Open Grants, NSF Award Search, NIH RePORTER, USDA NIFA Data Gateway) belong to their owners.

## Everything else

The checklists, interface, budget calculator, funding finder, RFA rule extraction, overpromising audit and resume/ATS review were written for DossierLens.
