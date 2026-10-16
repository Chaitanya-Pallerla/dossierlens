/* Grant metrics, figure extraction + review, comparison with funded proposals, and file export (.docx / .zip). */
const NOW_Y=new Date().getFullYear();
const SECTION_CUES=[["Significance",/significance|knowledge gap|rationale|background/i],["Innovation",/innovat|novel/i],["Approach",/approach|methods?|research design|methodology/i],
 ["Preliminary data",/preliminary (data|results|studies|work)/i],["Timeline",/timeline|milestone|gantt|schedule/i],["Pitfalls & alternatives",/pitfall|alternative (strateg|approach)|risk mitigation|contingenc/i],
 ["Evaluation",/evaluation plan|metrics of success|success (criteria|metrics)|assessment plan/i],["Broader impacts",/broader impact|societal|extension|outreach/i],
 ["Dissemination",/disseminat|publication plan|outreach plan/i],["Data management",/data management|data sharing|repository/i]];
function grantMetrics(text){
  const sents=splitDoc(text);const ws=words(text);const n=ws.length||1;
  const syl=w=>Math.max(1,(w.toLowerCase().replace(/e$/,"").match(/[aeiouy]+/g)||[]).length);
  const sy=ws.reduce((a,w)=>a+syl(w),0);
  const flesch=206.835-1.015*(n/Math.max(1,sents.length))-84.6*(sy/n);
  const aims=new Set([...text.matchAll(/\b(?:Specific\s+)?(?:Aim|Objective|Thrust|Task)\s*([1-9])\b/gi)].map(m=>m[1])).size;
  const figs=new Set([...text.matchAll(/\b(?:Figure|Fig\.)\s*(\d+)/gi)].map(m=>m[1])).size;
  const numCites=new Set([...text.matchAll(/\[(\d{1,3}(?:\s*[,–-]\s*\d{1,3})*)\]/g)].flatMap(m=>m[1].split(/[,–-]/).map(s=>s.trim()))).size;
  const ayCites=[...text.matchAll(/\(([A-Z][A-Za-z'’\-]+)[^()]{0,40}?((?:19|20)\d{2})\)/g)];
  const years=[...text.matchAll(/\b((?:19|20)\d{2})\b/g)].map(m=>+m[1]).filter(y=>y<=NOW_Y&&y>1950);
  const recent=years.length?years.filter(y=>y>=NOW_Y-5).length/years.length*100:0;
  const quant=sents.filter(s=>/\d/.test(s.t)).length/Math.max(1,sents.length)*100;
  const per1k=re=>(text.match(re)||[]).length/n*1000;
  return{words:n,pages:+(n/550).toFixed(1),sentLen:+(n/Math.max(1,sents.length)).toFixed(1),flesch:Math.round(flesch),aims,figs,
    cites:Math.max(numCites,ayCites.length),recent:Math.round(recent),quant:Math.round(quant),
    hedges:+per1k(/\b(may|might|could|possibly|potentially|perhaps)\b/gi).toFixed(1),
    hype:+per1k(/\b(revolutioni[sz]e|transformative|groundbreaking|unprecedented|paradigm|game-changing|first-ever|cutting-edge|eliminate|guarantee)\w*/gi).toFixed(1),
    sections:SECTION_CUES.filter(([,re])=>re.test(text)).map(([k])=>k)};
}
const METRIC_DEFS=[["words","Length (words)"],["aims","Aims / objectives"],["figs","Figures referenced"],["cites","Citations"],["recent","Recent refs (≤5 yrs) %"],
 ["quant","Sentences with numbers %"],["sentLen","Avg sentence length"],["flesch","Readability (Flesch)"],["hedges","Hedges per 1k words"],["hype","Hype words per 1k"],["nsec","Key sections present (of 10)"]];
function median(a){if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function wMedian(vals,ws){const z=vals.map((v,i)=>[v,ws[i]]).filter(x=>x[0]!=null&&x[1]>0).sort((a,b)=>a[0]-b[0]);const T=z.reduce((a,b)=>a+b[1],0);let c=0;for(const [v,w] of z){c+=w;if(c>=T/2)return v}return null}
function topTerms(t,k=40){const c={};words(t).filter(w=>w.length>4&&!STOP.has(w)).forEach(w=>{const s=stem(w);c[s]=(c[s]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,k)}
function cosine(a,b){const A=Object.fromEntries(a),B=Object.fromEntries(b);let d=0,na=0,nb=0;for(const k in A){na+=A[k]**2;if(B[k])d+=A[k]*B[k]}for(const k in B)nb+=B[k]**2;return na&&nb?d/Math.sqrt(na*nb):0}
function guessYear(t){const ys=[...t.slice(0,4000).matchAll(/\b(20[0-3]\d)\b/g)].map(m=>+m[1]).filter(y=>y<=NOW_Y);return ys.length?Math.max(...ys):""}
function guessAgency(t){const s=t.slice(0,6000);for(const [k,re] of [["NIH",/\bNIH\b|National Institutes? of Health|\bR01\b|\bR21\b/],["NSF",/\bNSF\b|National Science Foundation|Broader Impacts/],["USDA NIFA",/\bNIFA\b|\bUSDA\b|\bAFRI\b/],["DOE",/\bDOE\b|Department of Energy/],["DARPA",/\bDARPA\b/],["NASA",/\bNASA\b/]])if(re.test(s))return k;return""}
function exampleWeight(ex,mine,field){
  const age=ex.year?NOW_Y-+ex.year:99;const rec=age<=3?1:age<=5?.6:.3;
  const sim=cosine(topTerms(ex.text),topTerms(mine));
  const fieldMatch=field&&ex.field&&ex.field.toLowerCase().split(/\W+/).some(w=>w.length>3&&field.toLowerCase().includes(w))?1:0;
  const fit=Math.max(sim,fieldMatch?.6:0);
  return{rec,sim:+sim.toFixed(2),fieldMatch,w:+(rec*(.4+.6*fit)).toFixed(2)};
}
function compareTable(mine,examples,field){
  const mm=grantMetrics(mine);mm.nsec=mm.sections.length;
  const exs=examples.map(e=>{const m=grantMetrics(e.text);m.nsec=m.sections.length;return{e,m,wt:exampleWeight(e,mine,field)}});
  const rows=METRIC_DEFS.map(([k,l])=>{const vals=exs.map(x=>x.m[k]),ws=exs.map(x=>x.wt.w);const med=wMedian(vals,ws);const lo=Math.min(...vals),hi=Math.max(...vals);
    const v=mm[k];const status=med==null?"":v>=lo&&v<=hi?"ok":"warn";return{k,l,v,med,lo,hi,status}});
  return{mm,exs,rows};
}
function comparePrompt(mine,exs,job){
  const top=[...exs].sort((a,b)=>b.wt.w-a.wt.w).slice(0,3);
  return `You are an experienced grant review panelist. Compare the applicant's draft proposal with ${top.length} recently FUNDED proposals in a related field, to show what the funded ones do that the draft does not. Weight more recent and closer-field examples more heavily (weights given).
Target program: ${job.title||"?"} · ${job.dept||"?"} · field: ${job.univ||"?"}

DRAFT PROPOSAL (excerpt):
"""
${mine.slice(0,14000)}
"""
${top.map((x,i)=>`\nFUNDED EXAMPLE ${i+1} — ${x.e.name} · year ${x.e.year||"?"} · agency ${x.e.agency||"?"} · field ${x.e.field||"?"} · weight ${x.wt.w}\n"""\n${x.e.text.slice(0,9000)}\n"""`).join("\n")}

Return ONLY JSON: {"dimensions":[{"name":"Significance"|"Innovation"|"Approach & rigor"|"Preliminary data"|"Feasibility & scope"|"Clarity & structure"|"Broader impacts"|"Figures & visuals","draft":1-10,"funded":1-10,"note":"one sentence"}],"funded_do_better":["specific practice seen in the funded examples, naming which example"],"draft_strengths":["..."],"recommendations":["concrete change to the draft"],"overpromising":"one or two sentences: is the draft's scope larger than the funded examples given similar budgets and durations?"}`;
}

/* ---------- figures ---------- */
async function extractFigures(file){
  const name=file.name.toLowerCase();const out=[];
  if(name.endsWith(".docx")){
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    let k=0;await window.mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()},{convertImage:window.mammoth.images.imgElement(img=>img.read("base64").then(b=>{
      if(k<12&&/png|jpe?g|gif|webp/.test(img.contentType)){k++;const bin=atob(b);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
        const blob=new Blob([u],{type:img.contentType});if(blob.size>6000)out.push({blob,url:URL.createObjectURL(blob),label:`Image ${out.length+1}`})}
      return{src:""}}))});
  }else if(name.endsWith(".pdf")){
    const lib=await ensurePdf();
    const pdf=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const IMG=[lib.OPS.paintImageXObject,lib.OPS.paintInlineImageXObject,lib.OPS.paintJpegXObject].filter(x=>x!=null);
    for(let p=1;p<=pdf.numPages&&out.length<8;p++){
      const page=await pdf.getPage(p);const ops=await page.getOperatorList();const tc=await page.getTextContent();
      const caption=tc.items.some(it=>/^\s*(Figure|Fig\.)\s*\d+/i.test(it.str));
      if(!ops.fnArray.some(f=>IMG.includes(f))&&!caption)continue;
      const vp=page.getViewport({scale:1.4});const cv=document.createElement("canvas");cv.width=vp.width;cv.height=vp.height;
      await page.render({canvasContext:cv.getContext("2d"),viewport:vp}).promise;
      const blob=await new Promise(r=>cv.toBlob(r,"image/jpeg",.82));if(blob)out.push({blob,url:URL.createObjectURL(blob),label:`Page ${p}`});
    }
  }
  return out;
}
function figuresPrompt(figs,ctx){
  return `You are a grant reviewer judging the figures of a proposal. ${figs.length} image(s) are attached in order (${figs.map((f,i)=>`#${i+1}: ${f.label}`).join(", ")}). Some are whole PDF pages: judge the figure(s) on them, ignore body text.
Proposal context: ${ctx.slice(0,1500)}

For each image apply this checklist (pass/fail): axes labeled with units; legend present and readable; fonts readable at print size (nothing under ~8 pt); no truncated/overlapping text; colors distinguishable (and colorblind-safe); no chart junk (3D, heavy gridlines); error bars or uncertainty shown where data are plotted; has an informative caption; supports a specific claim or aim; conceptual/overview figure explains the project at a glance.
Score 1-10: clarity, readability, relevance (to the aims), innovation (does the figure communicate a novel idea, method or result compellingly).
Return ONLY JSON: {"figures":[{"n":1,"kind":"conceptual|data|photo|workflow|table|other","scores":{"clarity":7,"readability":6,"relevance":8,"innovation":5},"checks":[{"item":"axes labeled with units","pass":true}],"issues":["..."],"fix":"most important improvement"}],"overall":"2-3 sentences on the figure set, including whether a conceptual overview figure is missing"}`;
}

/* ---------- export ---------- */
const xmlEsc=s=>String(s).replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
async function makeDocx(text,title){
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
  const run=(t,{b,hl}={})=>`<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${b?"<w:b/>":""}${hl?'<w:highlight w:val="yellow"/>':""}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;
  const para=line=>{const head=line.length<90&&!/[.,;:]$/.test(line)&&(headType(line)||/^[A-Z][A-Za-z ,&/-]{2,60}$/.test(line)&&line.split(" ").length<=8);
    const parts=line.split(/(\[[^\]\n]{1,80}\])/);
    return `<w:p><w:pPr><w:spacing w:after="${head?80:160}" w:line="276" w:lineRule="auto"/></w:pPr>${parts.map((p,i)=>p?run(p,{b:head,hl:i%2===1}):"").join("")}</w:p>`};
  const body=(title?`<w:p><w:pPr><w:spacing w:after="200"/></w:pPr>${run(title,{b:true})}</w:p>`:"")+text.split(/\n+/).map(l=>l.trim()).filter(Boolean).map(para).join("");
  const zip=new JSZip();
  zip.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file("word/document.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
const fileSafe=s=>s.replace(/[^\w\- ]+/g,"").trim().replace(/\s+/g,"_")||"document";
async function saveFile(filename,data){
  if(!dlFn){toast("Downloads aren't available in this view. Open the page on claude.ai.");return false}
  try{await dlFn.save({filename,data});return true}catch(e){if(e&&e.code!=="cancelled")toast("The download didn't start. Try again.");return false}
}
async function zipFiles(files){await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");const z=new JSZip();files.forEach(f=>z.file(f.name,f.data));return z.generateAsync({type:"blob"})}
