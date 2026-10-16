"""Regenerates the README screenshots with headless Edge/Chrome. Run from the repo root: python scripts/_screenshots.py"""
import os, subprocess, threading, http.server, socketserver, functools, time, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs"); OUT = os.path.join(DOCS, "assets", "screenshots"); os.makedirs(OUT, exist_ok=True)
BROWSER = next(p for p in [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", r"C:\Program Files\Google\Chrome\Application\chrome.exe", shutil.which("google-chrome") or "", shutil.which("chromium") or ""] if p and os.path.exists(p))

COMMON = """document.documentElement.dataset.theme="light";{const st=document.createElement("style");st.textContent="*,*::before,*::after{animation:none!important;transition:none!important}.bgfx{display:none}";document.head.appendChild(st)}const pb=document.getElementById("providerBar");if(pb)pb.remove();const cb=document.getElementById("claudeBar");if(cb)cb.style.display="none";
const go=sel=>{let el=document.querySelector(sel);if(!el)return;if(sel==="#panelRun")el=el.closest("section");let n=el;while(n&&n!==document.body){let p=n.previousElementSibling;while(p){if(!p.matches("script,style,title,meta,link"))p.style.display="none";p=p.previousElementSibling}n=n.parentElement}window.scrollTo(0,0)};"""
GRANT_TEXT = ("Project Narrative\\nSignificance\\nCrop scouting costs growers up to 32% of margins on small farms. Most growers lack affordable sensors (Smith, 2020).\\n"
  "Aim 1 builds a sub-$200 hyperspectral node. Aim 2 validates it on 20 cooperator farms. Aim 3 delivers decision tools through Extension.\\n"
  "Our approach will revolutionize scouting statewide within five years using profound learning on NDVI maps.\\nReferences\\nSmith, J. (2020). Crop sensing for small farms. J. Ag. Eng. 12(3), 1-10.")
PANEL = """{mode:"full",hash:hash(S.docs.proposal.text),errors:[],field:{primary:"Biological & agricultural engineering",cards:{fit:"USDA NIFA program officer",methods:"field sensing experimental design",domain:"precision agriculture",perspective:"agricultural economics"}},
seats:{fit:{recommendation:"minor",confidence:4,summary:"Strong fit to the program priority on affordable sensing; the statewide promise in the approach overreaches and the Extension aim needs measurable outcomes.",criteria:[{criterion:"Fit to program priorities",verdict:"MEETS",evidence:"Aim 3 delivers decision tools through Extension",rationale:"Matches the stakeholder-adoption priority."},{criterion:"Originality",verdict:"PARTLY_MEETS",evidence:"sub-$200 hyperspectral node",rationale:"Cost target is new; method novelty is not argued against commercial tools."},{criterion:"Structural coherence",verdict:"DOES_NOT_MEET",evidence:"revolutionize scouting statewide within five years",rationale:"Promise exceeds what three aims can deliver."}],strengths:["Clear, affordable-technology angle","Extension pathway built in"],weaknesses:[{issue:"Statewide impact claim is not supported by the design",severity:"major",evidence:"revolutionize scouting statewide",fix:"Promise a measurable 3-year outcome on cooperator farms."}]},
methods:{recommendation:"major",confidence:4,summary:"No sample size or power analysis for the 20-farm validation; no hold-out plan for the model.",criteria:[{criterion:"Sampling and power",verdict:"DOES_NOT_MEET",evidence:"validates it on 20 cooperator farms",rationale:"No justification for 20 farms."}],strengths:["Field validation planned"],weaknesses:[{issue:"Missing power analysis",severity:"major",evidence:"20 cooperator farms",fix:"Add a power analysis for the primary accuracy outcome."}]},
domain:{recommendation:"minor",confidence:3,summary:"Literature is thin and dated; recent low-cost sensing work is missing.",criteria:[],strengths:["Well-defined gap"],weaknesses:[{issue:"Only one citation, from 2020",severity:"minor",evidence:"(Smith, 2020)",fix:"Cite 2023-2026 work on low-cost spectral sensing."}]},
perspective:{recommendation:"minor",confidence:3,summary:"Adoption barriers for small growers are not discussed.",criteria:[],strengths:["Equity angle for small farms"],weaknesses:[{issue:"No adoption or cost-sharing plan",severity:"minor",evidence:"Most growers lack affordable sensors",fix:"Add an adoption study with growers."}]},
da:{strongest_counter_argument:"Smartphone imagery with existing vegetation indices may deliver most of the benefit at near-zero cost, so a custom hyperspectral node may not be the simplest path.",issues:[{severity:"CRITICAL",dimension:"logic chain",issue:"The 32% cost figure has no source and drives the significance argument",evidence:"costs growers up to 32% of margins",fix:"Cite the figure or replace it with a sourced estimate."}],alternatives:["Smartphone RGB indices","Satellite scouting services"],missing_stakeholders:["Crop consultants"],observations:[]}},
synth:{decision:"major",letter:"The panel sees a timely, well-targeted idea with a credible Extension pathway. Before submission, ground the significance claim in a source, replace the statewide promise with a measurable three-year outcome, add a power analysis for the farm validation and update the literature.",
items:[{issue:"Overreaching impact claim",label:"CONSENSUS-3",reviewers:["fit","methods","domain"],action:"Rewrite as a measurable 3-year outcome"},{issue:"Missing power analysis",label:"CORROBORATED",reviewers:["methods","fit"],action:"Add sample-size justification"},{issue:"Adoption barriers",label:"SINGLE",reviewers:["perspective"],action:"Add a grower adoption study"}],splits:[],
da_critical:[{issue:"Unsourced 32% cost figure",corroborated_by:["domain"],assessment:"validated",rationale:"The significance argument depends on it and no source is given.",required_response:"Cite a source or revise the figure."}],
roadmap:[{priority:1,item:"Source the 32% figure or revise it",from:["da","domain"]},{priority:2,item:"Replace the statewide promise with a measurable outcome",from:["fit","methods","domain"]},{priority:3,item:"Add a power analysis for the 20-farm validation",from:["methods"]},{priority:4,item:"Cite 2023-2026 low-cost sensing work",from:["domain"]}]}}"""
REFS = ("Crop losses reached 32% in 2021. Most farms lack tools (Smith, 2020). Kim and Park (2019) showed that edge devices work, and we delve into a robust pipeline using profound learning on NDVI data​. "
  "See https://example.org/report?utm_source=chatgpt.com for details (Ghost, 2018).\\nReferences\\nSmith, J. (2020). Crop sensing for small farms. Journal of Agricultural Engineering, 12(3), 1-10.\\n"
  "Kim, S., & Park, J. (2019). Edge imaging for crops. Sensors, 4, 1-3.\\nNever, C. (2025). Unused preprint on sensing. arXiv preprint.\\nNever, C. (2025). Unused preprint on sensing. arXiv preprints.")
SHOTS = {
 "01-faculty-review": (1400, 1500, "document.getElementById('bulk').style.display='none';document.getElementById('posPanel').style.display='none';"),
 "02-suggestions": (1400, 1150, "document.querySelector('[data-acc]').click();setTimeout(()=>go('#paper'),400);"),
 "03-grant-panel": (1400, 1700, f"switchMode('grant');S.docs.proposal={{text:\"{GRANT_TEXT}\",name:'proposal.docx',ai:null,model:null}};S.active='proposal';S.docs.proposal.panel={PANEL};renderAll();setTimeout(()=>go('#panelRun'),300);"),
 "04-budget": (1400, 1500, "switchMode('grant');S.active='tool:budget';renderAll();go('#doc');"),
 "05-references-ai": (1400, 1800, f"switchMode('refs');ALL.refs.text=\"{REFS}\";ALL.refs.name='paper.docx';ALL.refs.ai=null;renderAll();go('#doc');"),
 "06-funding-finder": (1400, 1600, "switchMode('funding');setTimeout(()=>{ff().fields=['Agriculture'];renderFunding();go('#doc')},800);"),
}

def main():
    src = open(os.path.join(DOCS, "index.html"), encoding="utf-8").read()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DOCS)
    handler.log_message = lambda *a: None
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
        port = httpd.server_address[1]; threading.Thread(target=httpd.serve_forever, daemon=True).start()
        for name, (w, h, js) in SHOTS.items():
            page = os.path.join(DOCS, f"_shot_{name}.html")
            open(page, "w", encoding="utf-8").write(src.replace("</body>", f"<script>setTimeout(()=>{{{COMMON}{js}}},1500);</script></body>"))
            out = os.path.join(OUT, f"{name}.png")
            subprocess.run([BROWSER, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", f"--window-size={w},{h}",
                            "--virtual-time-budget=6000", f"--screenshot={out}", f"http://127.0.0.1:{port}/_shot_{name}.html"], capture_output=True, timeout=120)
            os.remove(page); print("wrote", out, os.path.exists(out))
        httpd.shutdown()

if __name__ == "__main__":
    main()
