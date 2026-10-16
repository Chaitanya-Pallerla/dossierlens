---
name: grant-budget
description: Build and check a research grant budget — people by headcount (PI summer months, graduate students with tuition, undergraduates by hours, postdocs, staff), equipment with vendor links, travel, supplies, participant support, subawards — with yearly escalation, fringe, F&A on modified total direct costs (MTDC), a split by aim, cap checks and CSV export. Use when someone asks for a grant budget, budget justification numbers, or whether a budget fits a funding cap.
---

# Grant budget calculator

1. Get the inputs: duration, award cap (from the RFA if available), institution rates (fringe by role, F&A rate and base, tuition, escalation), people and effort, equipment (with links or quotes), travel, supplies, other costs, subawards, and the aims with their share of effort.
2. Start from the example and edit it: `python <root>/scripts/dossierlens.py budget --example > budget.json`.
3. Compute: `python <root>/scripts/dossierlens.py budget budget.json --csv budget.csv`. Rules used: salaries escalate yearly; fringe by role; tuition for graduate students; items of $5,000 or more per unit count as equipment; F&A is charged on MTDC, which excludes equipment, tuition, participant support and subaward amounts above the first $25,000 of each subaward.
4. Report the year-by-year table, the total against the cap, personnel share, cost per graduate student-year and the split by aim. Warn when: over the cap; aims do not add up to 100%; personnel is above ~85%; no students are budgeted; equipment is bought in the final year.
5. Offer a draft **budget justification** paragraph per category that ties each cost to an activity in the proposal, with [brackets] for anything unknown. Tell the user to replace the example rates with their institution's.
