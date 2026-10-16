---
name: reference-ai-check
description: Check a paper, statement or proposal for likely fabricated or miscited references, mismatches between in-text citations and the reference list (cited but not listed, listed but never cited), claims without citations, undefined acronyms, tortured phrases, and copy-paste artifacts left by AI chat tools (hidden zero-width characters, oaicite markers, utm_source=chatgpt.com links, Markdown). Can produce a cleaned copy. Use when someone asks to check references or citations, look for AI traces, or asks whether text was copied from ChatGPT.
---

# References and AI check

**Read first:** `../../references/review-format.md` (line numbers and the accept flow). The plugin root is two folders up from this file (`${CLAUDE_PLUGIN_ROOT}` in Claude Code).

## Steps

1. Get the file (any format) or pasted text, including the reference list.
2. Run `python <root>/scripts/dossierlens.py check <file> --type refs`. It reports:
   - **Citation cross-check:** in-text citations missing from References and references never cited, with line numbers (numbered `[3]` and author-year `(Smith, 2020)`, `Smith et al. (2020)` styles).
   - **Reference warnings:** missing or future years, placeholder DOIs, near-duplicates (title similarity), post-2024 preprints (arXiv, bioRxiv, SSRN… — check that they were published), links copied from AI chats.
   - **Claims without a citation**, **acronym issues** and **tortured phrases** (adapted from Academic Research Skills).
   - **AI and copy-paste signals:** hidden characters, chat markers, AI-typical words with alternatives, filler openers, em-dash rate.
3. **Verify the references for real** when you have web access (Claude Code and Codex usually do): look each one up (DOI at doi.org, Crossref, Semantic Scholar, Google Scholar) and confirm title, authors, year and venue. Report each as **verified**, **mismatch** (say what differs and give the correct citation) or **not found**. Without web access, judge plausibility and say clearly that nothing was verified.
4. Report the findings with line numbers. Word carefully: AI-typical words and dashes are **signals for review, not proof** that someone used AI.
5. Offer `python <root>/scripts/dossierlens.py clean <file> -o <name>_clean.docx` to strip hidden characters, chat markers, AI-link tags and stray Markdown, and offer fixes for the citation mismatches using the accept flow.
