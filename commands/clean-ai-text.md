---
description: Strip hidden characters, ChatGPT markers, AI-link tags and stray Markdown from a file
argument-hint: [file]
---

First invoke the Skill tool with `skill: "dossierlens:reference-ai-check"`, then follow it for this request: $ARGUMENTS

Only run the cleaning step and report what was removed.
Resolve plugin files (scripts, references) from `${CLAUDE_PLUGIN_ROOT}`, not from the user's working directory.
