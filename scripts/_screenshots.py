"""Regenerates the README screenshots with headless Edge/Chrome. Run from the repo root: python scripts/_screenshots.py"""
import os, subprocess, threading, http.server, socketserver, functools, time, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, "docs"); OUT = os.path.join(DOCS, "assets", "screenshots"); os.makedirs(OUT, exist_ok=True)
BROWSER = next(p for p in [r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe", r"C:\Program Files\Google\Chrome\Application\chrome.exe", shutil.which("google-chrome") or "", shutil.which("chromium") or ""] if p and os.path.exists(p))

COMMON = """document.documentElement.dataset.theme="light";window.countUp=()=>{};{const st=document.createElement("style");st.textContent="*,*::before,*::after{animation:none!important;transition:none!important}.bgfx{display:none}";document.head.appendChild(st)}const pb=document.getElementById("providerBar");if(pb)pb.remove();const cb=document.getElementById("claudeBar");if(cb)cb.style.display="none";
const go=sel=>{let el=document.querySelector(sel);if(!el)return;if(sel==="#panelRun")el=el.closest("section");let n=el;while(n&&n!==document.body){let p=n.previousElementSibling;while(p){if(!p.matches("script,style,title,meta,link"))p.style.display="none";p=p.previousElementSibling}n=n.parentElement}window.scrollTo(0,0)};"""
SHOTS = {
 "01-faculty-review": (1400, 1500, "loadSampleTeaching();document.getElementById('bulk').style.display='none';document.getElementById('posPanel').style.display='none';"),
 "02-suggestions": (1400, 1150, "loadSampleTeaching();setTimeout(()=>{document.querySelector('[data-acc]').click();setTimeout(()=>go('#paper'),400)},300);"),
 "03-grant-panel": (1400, 1700, "switchMode('grant');S.docs.proposal={text:SAMPLE.grantText,name:'proposal.docx',ai:null,model:null};S.active='proposal';S.docs.proposal.panel={...SAMPLE.panel,hash:hash(SAMPLE.grantText)};renderAll();setTimeout(()=>go('#panelRun'),300);"),
 "04-budget": (1400, 1500, "switchMode('grant');S.active='tool:budget';renderAll();go('#doc');"),
 "05-references-ai": (1400, 1800, "switchMode('refs');ALL.refs.text=SAMPLE.refs;ALL.refs.name='paper.docx';ALL.refs.ai=null;renderAll();go('#doc');"),
 "06-funding-finder": (1400, 1600, "switchMode('funding');setTimeout(()=>{ff().fields=['Chemistry'];ff().country='All';renderFunding();go('#doc')},800);"),
}

def main():
    src = open(os.path.join(DOCS, "index.html"), encoding="utf-8").read()
    shutil.copy(os.path.join(ROOT, "scripts", "_sample_data.js"), os.path.join(DOCS, "_sample.js"))
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DOCS)
    handler.log_message = lambda *a: None
    with socketserver.TCPServer(("127.0.0.1", 0), handler) as httpd:
        port = httpd.server_address[1]; threading.Thread(target=httpd.serve_forever, daemon=True).start()
        for name, (w, h, js) in SHOTS.items():
            page = os.path.join(DOCS, f"_shot_{name}.html")
            open(page, "w", encoding="utf-8").write(src.replace("</body>", f"<script src='_sample.js'></script><script>setTimeout(()=>{{{COMMON}{js}}},1500);</script></body>"))
            out = os.path.join(OUT, f"{name}.png")
            subprocess.run([BROWSER, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", f"--window-size={w},{h}",
                            "--virtual-time-budget=6000", f"--screenshot={out}", f"http://127.0.0.1:{port}/_shot_{name}.html"], capture_output=True, timeout=120)
            os.remove(page); print("wrote", out, os.path.exists(out))
        httpd.shutdown()
    os.remove(os.path.join(DOCS, "_sample.js"))

if __name__ == "__main__":
    main()
