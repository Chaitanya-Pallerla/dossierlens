// Made-up sample content used only for the README screenshots (not shipped in the web app).
window.SAMPLE = {
  job: {title: "Assistant Professor of Chemistry", dept: "Department of Chemistry", univ: "Example State University",
    ad: "Example State University invites applications for a tenure-track Assistant Professor of Chemistry. The successful candidate will teach general and physical chemistry, develop courses in computational and data-driven chemistry, mentor undergraduate and graduate researchers, and build an externally funded research program."},
  teaching: `Teaching Statement
My goal as a teacher is to help students think like chemists: to ask testable questions, design careful experiments, and explain their results clearly. Over the past four years I have taught General Chemistry recitations for 320 students and co-taught the Physical Chemistry laboratory as a graduate instructor. In my recitations I replaced worked examples with short group problems, and average quiz scores rose from 68% to 79% over one semester.
I believe that every student can succeed in chemistry if they are given the right support and the right environment to learn and grow in. I will use active learning, flipped classrooms, project-based learning, and cutting-edge technology to transform how chemistry is taught across the entire department. In my laboratory sections, students designed their own buffer experiments and presented posters to their peers at the end of the term.
I am qualified to teach General Chemistry, Physical Chemistry, and Instrumental Analysis. I would also like to develop a new elective on computational chemistry that would compliment the department's existing data science courses. I assess learning with weekly low-stakes quizzes, lab reports graded with a shared rubric, and a final project.
I have mentored five undergraduate researchers, three of whom co-authored conference presentations.`,
  teachingAI: {
    summary: "Concrete evidence of teaching impact (quiz gains, student-designed labs), but the philosophy paragraph is generic, one sentence overpromises a department-wide transformation, and there is no plan for students with different preparation or for improving courses from feedback.",
    scores: {clarity: 7, evidence: 8, fit: 6, feasibility: 5, innovation: 6, writing: 7},
    innovation_comment: "The student-designed buffer labs are a good hook; say what is new about the computational elective compared with existing courses.",
    feasibility_comment: "\"Transform how chemistry is taught across the entire department\" is beyond what a new assistant professor controls. Promise changes in your own courses.",
    checklist: [
      {id: "T1", status: "met", sentences: [1], note: "Clear goal stated in the first sentence.", add: null},
      {id: "T2", status: "met", sentences: [2], note: "Specific courses and numbers of students.", add: null},
      {id: "T3", status: "met", sentences: [3, 6], note: "Group problems and student-designed labs, with results.", add: null},
      {id: "T4", status: "partial", sentences: [5, 6], note: "Lists methods but only one concrete project example.", add: null},
      {id: "T5", status: "partial", sentences: [5], note: "\"Cutting-edge technology\" is vague; name the tools you will use.", add: null},
      {id: "T6", status: "met", sentences: [7], note: "Courses listed.", add: null},
      {id: "T7", status: "met", sentences: [8], note: "Computational chemistry elective proposed.", add: null},
      {id: "T8", status: "met", sentences: [9], note: "Quizzes, rubric and final project.", add: null},
      {id: "T9", status: "missing", sentences: [], note: "Nothing on students with different backgrounds or preparation.",
        add: {after: 4, new_paragraph: false, text: "Because students arrive with very different preparation, I offer optional review sessions in the first weeks and pair groups so that [strategy you use] supports students who are new to lab work."}},
      {id: "T10", status: "partial", sentences: [10], note: "Undergraduate mentoring only; add how you will mentor graduate students.",
        add: {after: 10, new_paragraph: false, text: "With graduate students, I set shared milestones each semester and give them chances to mentor undergraduates themselves."}},
      {id: "T11", status: "missing", sentences: [], note: "No plan for improving teaching from feedback.",
        add: {after: 9, new_paragraph: false, text: "I collect anonymous mid-semester feedback and compare learning outcomes each term, and I revised [course] after students asked for more worked practice."}},
      {id: "T12", status: "partial", sentences: [8], note: "Link the elective to the department's data science courses more directly.", add: null}],
    issues: [
      {s: 4, type: "unclear", quote: "if they are given the right support and the right environment to learn and grow in", replacement: "when they get timely feedback and regular practice, which is why I build both into every course", fix: "Generic; say what support you actually provide."},
      {s: 5, type: "overpromise", quote: "to transform how chemistry is taught across the entire department", replacement: "in the courses I teach, starting with [course name]", fix: "A new faculty member cannot change the whole department's teaching."},
      {s: 8, type: "grammar", quote: "would compliment", replacement: "would complement", fix: "\"Complement\" (to complete) is the correct word here."}],
    lacking: ["How you support students with different preparation", "How you use feedback to improve courses", "Graduate mentoring approach"],
    top_changes: ["Replace the generic belief sentence with what you actually do", "Scale the department-wide promise down to your own courses", "Add a sentence on supporting differently prepared students", "Add how you use mid-semester feedback"],
    formatting: ["Keep to about one and a half pages", "Consider short bold lead-ins for philosophy, practice and assessment"],
    strengths: ["Quantified result (68% to 79%)", "Student-designed labs"],
    why_me: null
  },
  grantText: `Project Narrative
Significance
Lithium-ion battery recycling recovers less than 5% of electrolyte solvents today. Most recyclers lack a low-energy separation step (Lee, 2021).
Aim 1 designs a membrane that separates carbonate solvents. Aim 2 tests it on 12 industrial waste streams. Aim 3 trains technicians through community college partners.
Our process will eliminate electrolyte waste nationwide within five years using profound learning to tune membranes.
References
Lee, H. (2021). Electrolyte recovery from spent lithium-ion cells. Journal of Power Sources, 480, 1-9.`,
  panel: {mode: "full", errors: [], field: {primary: "Chemical engineering", cards: {fit: "NSF program officer", methods: "membrane separation experiments", domain: "battery recycling", perspective: "environmental economics"}},
    seats: {
      fit: {recommendation: "minor", confidence: 4, summary: "Strong fit to the program's sustainability priority; the nationwide promise overreaches and the workforce aim needs measurable outcomes.",
        criteria: [{criterion: "Fit to program priorities", verdict: "MEETS", evidence: "Aim 3 trains technicians through community college partners", rationale: "Matches the workforce priority."},
          {criterion: "Originality", verdict: "PARTLY_MEETS", evidence: "a membrane that separates carbonate solvents", rationale: "Novelty versus existing distillation methods is not argued."},
          {criterion: "Structural coherence", verdict: "DOES_NOT_MEET", evidence: "eliminate electrolyte waste nationwide within five years", rationale: "The promise exceeds what three aims can deliver."}],
        strengths: ["Clear environmental need", "Workforce pathway built in"],
        weaknesses: [{issue: "Nationwide impact claim is not supported by the design", severity: "major", evidence: "eliminate electrolyte waste nationwide", fix: "Promise a measurable outcome for the 12 waste streams."}]},
      methods: {recommendation: "major", confidence: 4, summary: "No justification for 12 waste streams and no plan for replicate runs.", criteria: [{criterion: "Sampling and replication", verdict: "DOES_NOT_MEET", evidence: "tests it on 12 industrial waste streams", rationale: "No replication or power justification."}],
        strengths: ["Real industrial samples"], weaknesses: [{issue: "No replication plan", severity: "major", evidence: "12 industrial waste streams", fix: "Add replicate runs and a sample-size rationale."}]},
      domain: {recommendation: "minor", confidence: 3, summary: "Literature is thin; recent membrane work is missing.", criteria: [], strengths: ["Well-defined gap"], weaknesses: [{issue: "Only one citation, from 2021", severity: "minor", evidence: "(Lee, 2021)", fix: "Cite 2023-2026 membrane separation studies."}]},
      perspective: {recommendation: "minor", confidence: 3, summary: "Recycler adoption costs are not discussed.", criteria: [], strengths: ["Workforce angle"], weaknesses: [{issue: "No adoption or cost analysis", severity: "minor", evidence: "Most recyclers lack a low-energy separation step", fix: "Add a techno-economic estimate."}]},
      da: {strongest_counter_argument: "Improving existing distillation may recover most solvents at lower risk than a new membrane, so the membrane may not be the simplest path.",
        issues: [{severity: "CRITICAL", dimension: "logic chain", issue: "The 5% recovery figure is not sourced and drives the significance argument", evidence: "recovers less than 5% of electrolyte solvents", fix: "Cite the figure or replace it with a sourced estimate."}],
        alternatives: ["Improved distillation", "Solvent-free electrolyte designs"], missing_stakeholders: ["Recycling plant operators"], observations: []}},
    synth: {decision: "major",
      letter: "The panel sees a timely, well-targeted idea with a credible workforce pathway. Before submission, source the recovery figure, replace the nationwide promise with a measurable outcome, add a replication plan for the 12 waste streams and update the literature.",
      items: [{issue: "Overreaching impact claim", label: "CONSENSUS-3", reviewers: ["fit", "methods", "domain"], action: "Rewrite as a measurable outcome"},
        {issue: "No replication plan", label: "CORROBORATED", reviewers: ["methods", "fit"], action: "Add replicate runs"},
        {issue: "Adoption costs", label: "SINGLE", reviewers: ["perspective"], action: "Add a techno-economic estimate"}],
      splits: [],
      da_critical: [{issue: "Unsourced 5% recovery figure", corroborated_by: ["domain"], assessment: "validated", rationale: "The significance argument depends on it and no source is given.", required_response: "Cite a source or revise the figure."}],
      roadmap: [{priority: 1, item: "Source the 5% figure or revise it", from: ["da", "domain"]}, {priority: 2, item: "Replace the nationwide promise with a measurable outcome", from: ["fit", "methods", "domain"]},
        {priority: 3, item: "Add replicate runs and a sample-size rationale", from: ["methods"]}, {priority: 4, item: "Cite 2023-2026 membrane studies", from: ["domain"]}]}},
  refs: `Electrolyte losses reached 32% of recovered material in 2021. Most recyclers lack separation steps (Lee, 2021). Kim and Park (2019) showed that membranes work, and we delve into a robust process using profound learning on GC-MS data​. See https://example.org/report?utm_source=chatgpt.com for details (Ghost, 2018).
References
Lee, H. (2021). Electrolyte recovery from spent lithium-ion cells. Journal of Power Sources, 480, 1-9.
Kim, S., & Park, J. (2019). Membrane separation of carbonate solvents. Membranes, 4, 1-3.
Never, C. (2025). Unused preprint on battery recycling. arXiv preprint.
Never, C. (2025). Unused preprint on battery recycling. arXiv preprints.`
};
window.loadSampleTeaching = function () {
  switchMode("faculty"); resetMode(); S.job = {...SAMPLE.job};
  S.docs.teaching = {text: SAMPLE.teaching, name: "Example teaching statement", ai: {...JSON.parse(JSON.stringify(SAMPLE.teachingAI)), hash: hash(SAMPLE.teaching), t: 1}, model: null};
  S.active = "teaching"; ui.animKey = null; renderAll();
};
