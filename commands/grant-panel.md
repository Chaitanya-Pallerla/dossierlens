---
description: Run the five-reviewer grant panel with a Devil's Advocate (mode: full | methods | quick)
argument-hint: [proposal] [mode]
---

First invoke the Skill tool with `skill: "dossierlens:grant-proposal-review"`, then follow it for this request: $ARGUMENTS

Go straight to step 7 (review panel) after collecting the files; default mode is full.
Resolve plugin files (scripts, references) from `${CLAUDE_PLUGIN_ROOT}`, not from the user's working directory.
