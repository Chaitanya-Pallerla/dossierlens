# Review panel protocol

Adapted from the `academic-paper-reviewer` skill of [Academic Research Skills](https://github.com/Imbad0202/academic-research-skills) by Cheng-I Wu (CC BY-NC 4.0): field analyst, journal-fit (EIC), methodology, domain, perspective, Devil's Advocate and editorial synthesizer agents. Wording is condensed and adapted from journal papers to grant proposals.

## Modes

| Mode | Seats | When |
|---|---|---|
| `full` | field analyst → program officer, methodology, domain, perspective, Devil's Advocate → editor | default |
| `methods` | field analyst → program officer, methodology → editor | quick check of the research design |
| `quick` | field analyst → program officer | first look |

Run every reviewer **independently**: if your tool supports sub-agents (Claude Code Task/Agent, Codex sub-agents), give each seat its own agent with only the proposal and its protocol; otherwise write each report in turn without looking back at the others. Each reviewer quotes the proposal as evidence and never invents facts.

## 0. Field analyst
Identify the primary and secondary disciplines, paradigm, methodology type and maturity, then name the specific expertise each reviewer brings.

## 1. Program officer (fit reviewer)
Do not go deep into methods. (1) First impression: timely, inside the program's scope? (2) Originality: what is new; does it really fill a gap; source of originality (new data, method, framework, perspective, combination)? (3) Significance: if the aims succeed, what changes; local or broad; why now? (4) Structural coherence: title → summary → aims → approach → outcomes consistent; any "over-promising and under-delivering"? (5) Fit to the solicitation: priorities, review criteria, length and format rules. (6) Overall signal.

## 2. Methodology reviewer (R1)
(1) Can the methods answer each aim; better method overlooked? (2) Design stated and appropriate; internal vs external validity. (3) Sampling and data collection; sample size or power analysis; selection bias. (4) Analysis plan matches the data; assumptions; effect sizes and confidence intervals planned; multiple comparisons; missing data. (5) Will negative results be reported; do expected conclusions exceed what the design supports? (6) Reproducibility: protocols, data and code sharing, ethics/IRB.
Check for: ecological fallacy, Simpson's paradox, survivorship bias, confirmation bias, p-hacking/HARKing risk, overfitting without hold-out, reverse causation, multicollinearity, endogeneity.

## 3. Domain reviewer (R2)
(1) Literature: foundational and original sources; developments of the last 3-5 years; opposing views; synthesis, not listing; convincing gap. (2) Framework suitable, applied, limits acknowledged. (3) Facts, causal claims and terminology accurate. (4) Contribution: theoretical, empirical, methodological or practical; incremental or breakthrough; positioned against prior work; overclaiming risk. Call something a major gap only if the field's accepted practice requires it.

## 4. Perspective reviewer (R3)
A constructive challenger from an adjacent discipline; give an alternative with every criticism. (1) Assumption audit: explicit, implicit, paradigm. (2) Cross-disciplinary work, concepts and methods to borrow. (3) Practical impact: practitioners, stakeholders, policymakers; implementation barriers; unintended consequences; overlooked stakeholders. (4) Ethics, privacy, fairness, equity, future directions.

## 5. Devil's Advocate
Challenge the core argument: (1) strongest counter-argument, simpler alternative; (2) cherry-picked evidence; (3) confirmation bias in questions or design; (4) logic chain and hidden assumptions; (5) overgeneralization; (6) more mature, cheaper or more feasible alternatives; (7) stakeholder blind spots (name only); (8) the "So what?" test.
Severity: **CRITICAL** only for foundation collapse, logic-chain break, data-conclusion mismatch, or a stronger counter-narrative; **MAJOR**; **MINOR**; **OBSERVATION** (not a defect). If severity rests on what the field "should" do and you cannot name the field's actual practice, down-rate to MINOR and mark *field norm unverified*. Judge the substance, not how polished the wording is.

## 6. Reviewer output
Each of seats 1-4: recommendation (ready to submit / minor revision / major revision / not competitive), self-reported confidence 1-5 (never used as a weight), criterion verdicts (EXCEEDS · MEETS · PARTLY MEETS · DOES NOT MEET · NOT ASSESSED) with a quoted line, strengths, weaknesses with line, quote and fix.
Devil's Advocate: strongest counter-argument (200-300 words), issue list with severity, ignored alternatives, missing stakeholders, observations.

## 7. Editor (synthesizer)
1. List every distinct weakness raised by the four non-DA reviewers.
2. Count over those four: `agree` = raised or corroborated; `conflict` = disputed. Label in order: conflict ≥ 1 → **SPLIT**; agree 4 → **CONSENSUS-4**; agree 3 → **CONSENSUS-3**; agree 2 → **CORROBORATED**; agree 1 → **SINGLE**.
3. SPLIT: the program officer arbitrates; evidence first, then expertise (methods → R1, domain → R2). If evidence cannot settle it, record **unresolved dissent**.
4. Every Devil's Advocate CRITICAL: corroborated by whom, assessment **validated / rejected / unresolved** with rationale, and the response the applicant must give.
5. Decision: **Ready to submit** / **Minor revision** / **Major revision** / **Not competitive yet**. A validated or unresolved DA-CRITICAL blocks "Ready to submit". Confidence scores never decide anything.
6. Revision roadmap: numbered, most important first, each item naming the reviewers it came from.
