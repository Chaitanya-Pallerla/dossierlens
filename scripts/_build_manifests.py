"""Writes the plugin manifests and Claude Code slash commands. Run from the repo root: python scripts/_build_manifests.py"""
import json, os

VERSION = "1.0.0"
OWNER = "Chaitanya-Pallerla"
REPO = f"https://github.com/{OWNER}/dossierlens"
DESC = ("Review faculty application packets, industry resumes (ATS) and grant proposals with detailed checklists, "
        "line-numbered fixes you can accept, a five-reviewer grant panel, RFA rule checks, a budget calculator, "
        "reference and AI-artifact checks, and a funding finder. Works with Claude Code and Codex.")
KEYWORDS = ["academic-jobs", "faculty-application", "research-statement", "teaching-statement", "cover-letter", "resume", "ats",
            "grant-writing", "proposal-review", "citations", "ai-detection", "funding"]
SKILLS = ["faculty-packet-review", "resume-ats-review", "grant-proposal-review", "grant-budget", "reference-ai-check", "funding-finder", "dossierlens-app"]

def w(path, data):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(data if isinstance(data, str) else json.dumps(data, indent=2, ensure_ascii=False) + "\n")

author = {"name": "Chaitanya Pallerla", "url": f"https://github.com/{OWNER}"}
# Claude Code
w(".claude-plugin/plugin.json", {"name": "dossierlens", "version": VERSION, "description": DESC, "author": author,
    "homepage": REPO, "repository": REPO, "license": "CC-BY-NC-4.0", "keywords": KEYWORDS})
w(".claude-plugin/marketplace.json", {"name": "dossierlens", "owner": author, "description": "DossierLens for Claude Code.",
    "plugins": [{"name": "dossierlens", "source": "./", "description": DESC, "version": VERSION, "license": "CC-BY-NC-4.0",
                 "skills": [f"./skills/{s}" for s in SKILLS]}]})
# Codex
w(".codex-plugin/plugin.json", {"name": "dossierlens", "version": VERSION, "description": DESC, "author": author, "homepage": REPO,
    "repository": REPO, "license": "CC-BY-NC-4.0", "keywords": KEYWORDS, "skills": "./skills/",
    "interface": {"displayName": "DossierLens", "shortDescription": "Review faculty packets, resumes and grant proposals.",
        "longDescription": DESC, "developerName": "Chaitanya Pallerla", "category": "Productivity", "capabilities": ["Interactive", "Read", "Write"],
        "websiteURL": REPO, "termsOfServiceURL": f"{REPO}/blob/main/LICENSE",
        "defaultPrompt": ["Use $faculty-packet-review on my research statement and the job ad.", "Use $grant-proposal-review with the full review panel on proposal.docx and rfa.pdf.", "Use $funding-finder for robotics + food science calls in the USA."]}})
w(".agents/plugins/marketplace.json", {"name": "dossierlens", "interface": {"displayName": "DossierLens"},
    "plugins": [{"name": "dossierlens", "source": {"source": "local", "path": "./"}, "policy": {"installation": "AVAILABLE", "authentication": "ON_INSTALL"}, "category": "Productivity"}]})

# Claude Code slash commands -> /dossierlens:<name>
CMDS = {
 "review-packet": ("faculty-packet-review", "Review a faculty application packet (research, teaching, cover letter, Extension, outreach)", "[files or folder] [job ad file or URL]"),
 "review-resume": ("resume-ats-review", "Review an industry resume and cover letter for ATS and recruiters", "[resume] [job description]"),
 "review-grant": ("grant-proposal-review", "Review a grant proposal against the RFA, checklists and an overpromising audit", "[proposal files] [RFA file or URL]"),
 "grant-panel": ("grant-proposal-review", "Run the five-reviewer grant panel with a Devil's Advocate (mode: full | methods | quick)", "[proposal] [mode]"),
 "grant-budget": ("grant-budget", "Build or check a grant budget with F&A on MTDC and a split by aim", "[budget.json or description]"),
 "check-references": ("reference-ai-check", "Check references, in-text citations and AI copy-paste artifacts", "[file]"),
 "clean-ai-text": ("reference-ai-check", "Strip hidden characters, ChatGPT markers, AI-link tags and stray Markdown from a file", "[file]"),
 "find-funding": ("funding-finder", "Find open funding calls by field, country and funder type", "[fields] [country] [deadline window]"),
 "open-app": ("dossierlens-app", "Open the DossierLens web app", ""),
}
for name, (skill, desc, hint) in CMDS.items():
    extra = {"grant-panel": "Go straight to step 7 (review panel) after collecting the files; default mode is full.",
             "clean-ai-text": "Only run the cleaning step and report what was removed.",
             "find-funding": "Default country is USA unless the user names another."}.get(name, "")
    w(f"commands/{name}.md", f"""---
description: {desc}
argument-hint: {hint}
---

First invoke the Skill tool with `skill: "dossierlens:{skill}"`, then follow it for this request: $ARGUMENTS

{extra}
Resolve plugin files (scripts, references) from `${{CLAUDE_PLUGIN_ROOT}}`, not from the user's working directory.
""".replace("\n\n\nResolve", "\n\nResolve"))
print("manifests and", len(CMDS), "commands written")
