/* Formatting-preserving documents.
   A document is a list of paragraphs (props: raw Word pPr + parsed look) and, in the sentence model, each sentence
   carries the runs (text + raw Word rPr + parsed look) that cover its text and trailing spaces. Uploaded .docx files
   keep bold/italic/underline, fonts, sizes, alignment, indents, spacing, blank lines and lists; Word downloads reuse
   the original styles, numbering, theme and page setup. Times New Roman 12 pt is the default for everything else. */
const RICH_FONTS=["Times New Roman","Arial","Calibri","Cambria","Georgia","Garamond","Helvetica","Book Antiqua","Palatino Linotype","Verdana","Tahoma","Trebuchet MS","Century Gothic","Aptos","Courier New"];
const RICH_SIZES=[8,9,10,10.5,11,11.5,12,13,14,16,18,20,24,28,32,36];
const RICH_DEFAULT={font:"Times New Roman",size:12,after:0,line:1.15};
const W_NS="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const JSZIP_URL="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";

/* ---------- reading .docx ---------- */
const wkid=(el,name)=>{if(!el)return null;for(const c of el.children)if(c.localName===name&&c.namespaceURI===W_NS)return c;return null};
const wval=(el,attr="val")=>el?el.getAttributeNS(W_NS,attr)??el.getAttribute("w:"+attr):null;
const onOff=el=>!!el&&!["0","false","off"].includes(String(wval(el)||"").toLowerCase());
function themeFonts(themeXml){const out={};if(!themeXml)return out;
  const maj=themeXml.match(/<a:majorFont>[\s\S]*?<a:latin typeface="([^"]*)"/),min=themeXml.match(/<a:minorFont>[\s\S]*?<a:latin typeface="([^"]*)"/);
  if(maj)out.major=maj[1];if(min)out.minor=min[1];return out}
function fontOf(rFonts,theme){if(!rFonts)return null;const a=wval(rFonts,"ascii")||wval(rFonts,"hAnsi");if(a)return a;
  const t=wval(rFonts,"asciiTheme")||wval(rFonts,"hAnsiTheme");if(t)return /major/i.test(t)?theme.major:theme.minor;return null}
function parseRPr(rPr,theme){const f={};if(!rPr)return f;
  if(wkid(rPr,"b"))f.b=onOff(wkid(rPr,"b"));if(wkid(rPr,"i"))f.i=onOff(wkid(rPr,"i"));
  const u=wkid(rPr,"u");if(u)f.u=!["none","0"].includes(wval(u)||"single");
  const sz=wkid(rPr,"sz");if(sz&&+wval(sz))f.sz=+wval(sz)/2;
  const fo=fontOf(wkid(rPr,"rFonts"),theme);if(fo)f.font=fo;return f}
function parsePPr(pPr,styleInfo){const f={};if(!pPr)return f;
  const jc=wkid(pPr,"jc");if(jc){const v=wval(jc);f.align=v==="both"||v==="distribute"?"justify":v==="center"?"center":(v==="right"||v==="end")?"right":"left"}
  const sp=wkid(pPr,"spacing");if(sp){const b=wval(sp,"before"),a=wval(sp,"after"),l=wval(sp,"line"),lr=wval(sp,"lineRule");
    if(b!=null)f.before=+b/20;if(a!=null)f.after=+a/20;if(l!=null)f.line=(!lr||lr==="auto")?+l/240:null;if(lr&&lr!=="auto"&&l!=null)f.lineExact=+l/20}
  const ind=wkid(pPr,"ind");if(ind){const l=wval(ind,"left")??wval(ind,"start"),fl=wval(ind,"firstLine"),hg=wval(ind,"hanging");
    if(l!=null)f.indL=+l/20;if(fl!=null)f.indFirst=+fl/20;if(hg!=null)f.indFirst=-(+hg/20)}
  const ps=wkid(pPr,"pStyle");if(ps){const id=wval(ps);f.style=id;const si=styleInfo[id];if(si){if(si.heading)f.heading=si.heading;if(si.r)f.styleRun=si.r}
    if(/^(heading|title)/i.test(id))f.heading=f.heading||(/title/i.test(id)?1:+(id.match(/\d/)||[2])[0])}
  if(wkid(pPr,"numPr"))f.list=true;return f}
function parseStyles(stylesXml,theme){const out={defaults:{...RICH_DEFAULT},styles:{}};if(!stylesXml)return out;
  const doc=new DOMParser().parseFromString(stylesXml,"application/xml");
  const dd=doc.getElementsByTagNameNS(W_NS,"docDefaults")[0];
  if(dd){const r=dd.getElementsByTagNameNS(W_NS,"rPr")[0];const rf=parseRPr(r,theme);if(rf.font)out.defaults.font=rf.font;if(rf.sz)out.defaults.size=rf.sz;
    const p=dd.getElementsByTagNameNS(W_NS,"pPr")[0];const pf=parsePPr(p,{});if(pf.after!=null)out.defaults.after=pf.after;if(pf.line)out.defaults.line=pf.line}
  for(const st of doc.getElementsByTagNameNS(W_NS,"style")){const id=wval(st,"styleId");const name=(wval(wkid(st,"name"))||"").toLowerCase();
    const r=parseRPr(wkid(st,"rPr"),theme),p=parsePPr(wkid(st,"pPr"),{});const info={r,p};
    if(/^heading \d|^title/.test(name))info.heading=/title/.test(name)?1:+name.match(/\d/)[0];out.styles[id]=info;
    if(wval(st,"type")==="paragraph"&&wval(st,"default")==="1"){if(r.font)out.defaults.font=r.font;if(r.sz)out.defaults.size=r.sz;if(p.after!=null)out.defaults.after=p.after;if(p.line)out.defaults.line=p.line}}
  return out}
async function parseDocxRich(ab){
  await loadScript(JSZIP_URL);const z=await JSZip.loadAsync(ab);const get=async n=>z.file(n)?await z.file(n).async("string"):"";
  const [docXml,styles,numbering,theme,fontTable]=await Promise.all(["word/document.xml","word/styles.xml","word/numbering.xml","word/theme/theme1.xml","word/fontTable.xml"].map(get));
  const tf=themeFonts(theme);const st=parseStyles(styles,tf);
  const doc=new DOMParser().parseFromString(docXml,"application/xml");const body=doc.getElementsByTagNameNS(W_NS,"body")[0];const ser=new XMLSerializer();
  const paras=[];let sectPr="";
  const readRuns=(node,runs)=>{for(const c of node.children){if(c.namespaceURI!==W_NS){readRuns(c,runs);continue}
      if(c.localName==="r"){const rp=wkid(c,"rPr");let t="";for(const k of c.children){if(k.namespaceURI!==W_NS)continue;
          if(k.localName==="t")t+=k.textContent;else if(k.localName==="tab")t+="\t";else if(k.localName==="br"||k.localName==="cr")t+="\u2028";else if(k.localName==="noBreakHyphen")t+="-";else if(k.localName==="softHyphen")t+=""}
        if(t)runs.push({t,rPr:rp?ser.serializeToString(rp):"",f:parseRPr(rp,tf)})}
      else if(["del","moveFrom","pPr","proofErr","bookmarkStart","bookmarkEnd","commentRangeStart","commentRangeEnd"].includes(c.localName)){}
      else readRuns(c,runs)}};
  const walkP=p=>{const pp=wkid(p,"pPr");const runs=[];readRuns(p,runs);
    // merge neighbouring runs with identical formatting
    const merged=[];runs.forEach(r=>{const l=merged[merged.length-1];if(l&&l.rPr===r.rPr)l.t+=r.t;else merged.push(r)});
    paras.push({pPr:pp?stripRefs(ser.serializeToString(pp)):"",f:parsePPr(pp,st.styles),runs:merged})};
  const walk=el=>{for(const c of el.children){if(c.namespaceURI!==W_NS)continue;
    if(c.localName==="p")walkP(c);else if(c.localName==="tbl"||c.localName==="tr"||c.localName==="tc"||c.localName==="sdt"||c.localName==="sdtContent")walk(c);
    else if(c.localName==="sectPr")sectPr=stripRefs(ser.serializeToString(c))}};
  walk(body);
  return{paras,pkg:{styles,numbering,theme,fontTable,sectPr},defaults:st.defaults};
}
const stripRefs=x=>x.replace(/<w:(headerReference|footerReference)\b[^>]*\/>/g,"").replace(/<w:(headerReference|footerReference)\b[^>]*>[\s\S]*?<\/w:\1>/g,"");
const paraText=P=>P.runs.map(r=>r.t).join("");
function plainParas(text){return String(text).replace(/\r/g,"").split("\n").map(l=>({pPr:"",f:{},runs:l?[{t:l,rPr:"",f:{}}]:[]}))}

/* ---------- sentence model with runs ---------- */
function splitParaText(P){
  const prot=P.replace(ABBR,m=>m.replace(/\./g,"\u2024"));const re=/[.!?]["”’')\]]?(\s+)(?=["“‘(\[]?[A-Z0-9])/g;const out=[];let start=0,m;
  while((m=re.exec(prot))){const endW=m.index+m[0].length,endT=endW-m[1].length;if(P.slice(start,endT).trim())out.push([start,endT,endW]);start=endW}
  const tail=P.slice(start);if(tail.trim()){const tl=tail.replace(/\s+$/,"").length;out.push([start,start+tl,P.length])}else if(out.length)out[out.length-1][2]=P.length;
  return out}
function sliceRuns(runs,a,b){const out=[];let pos=0;for(const r of runs){const s=Math.max(a,pos),e=Math.min(b,pos+r.t.length);if(e>s)out.push({t:r.t.slice(s-pos,e-pos),rPr:r.rPr,f:r.f});pos+=r.t.length}return out}
function splitRich(paras){
  const props=[],model=[];let id=0;
  paras.forEach((P,k)=>{props.push({pPr:P.pPr||"",f:P.f||{}});const T=paraText(P);
    splitParaText(T).forEach(([a,b,c])=>model.push({i:id++,p:k,t:T.slice(a,b),ws:T.slice(b,c),runs:sliceRuns(P.runs,a,c)}))});
  return{props,model}}
function richText(d){const byP={};d.model.forEach(s=>(byP[s.p]=byP[s.p]||[]).push(s));
  return d.rich.paras.map((_,k)=>(byP[k]||[]).map(s=>s.t+(s.ws||"")).join("")).join("\n")}
function editRuns(runs,oldStr,newStr){
  let a=0;while(a<oldStr.length&&a<newStr.length&&oldStr[a]===newStr[a])a++;
  let b=0;while(b<oldStr.length-a&&b<newStr.length-a&&oldStr[oldStr.length-1-b]===newStr[newStr.length-1-b])b++;
  const cu=[];runs.forEach((r,ri)=>{for(let i=0;i<r.t.length;i++)cu.push(ri)});
  const src=cu.length?cu:[0];const fmtAt=a>0?src[Math.min(a-1,src.length-1)]:src[0];
  const ins=newStr.slice(a,newStr.length-b);
  const outIdx=[...cu.slice(0,a),...Array(ins.length).fill(fmtAt),...cu.slice(oldStr.length-b)];
  const out=[];const base=runs.length?runs:[{t:"",rPr:"",f:{}}];
  for(let i=0;i<newStr.length;i++){const r=base[outIdx[i]]||base[0];const l=out[out.length-1];if(l&&l.rPr===r.rPr&&JSON.stringify(l.f)===JSON.stringify(r.f))l.t+=newStr[i];else out.push({t:newStr[i],rPr:r.rPr,f:r.f})}
  return out}
function setSentText(s,newT,newWs){const ws=newWs??(s.ws||"");s.runs=editRuns(s.runs||[{t:s.t+(s.ws||""),rPr:"",f:{}}],s.t+(s.ws||""),newT+ws);s.t=newT;s.ws=ws}
function dominantRun(s){const rs=(s&&s.runs)||[];return rs.reduce((a,r)=>!a||r.t.length>a.t.length?r:a,null)||{rPr:"",f:{}}}
function richFromModel(model){const order=[];model.forEach(s=>{if(!order.includes(s.p))order.push(s.p)});
  const props=order.map(()=>({pPr:"",f:{}}));const out=model.map((s,j)=>{const nxt=model[j+1];const last=!nxt||nxt.p!==s.p;const ws=last?"":" ";
    return{...s,p:order.indexOf(s.p),ws,runs:[{t:s.t+ws,rPr:"",f:{}}]}});return{props,model:out}}

/* ---------- display ---------- */
function richFmtStyle(f){if(!f)return"";let s="";if(f.b)s+="font-weight:700;";if(f.i)s+="font-style:italic;";if(f.u)s+="text-decoration-line:underline;";
  if(f.font)s+=`font-family:'${String(f.font).replace(/'/g,"")}',var(--docfont);`;if(f.sz)s+=`font-size:${f.sz}pt;`;return s}
function richParaStyle(f,defs){f=f||{};const d=defs||RICH_DEFAULT;let s="";
  if(f.align)s+=`text-align:${f.align};`;s+=`margin:${f.before??0}pt 0 ${f.after??d.after??0}pt;`;
  if(f.lineExact)s+=`line-height:${f.lineExact}pt;`;else s+=`line-height:${(f.line||d.line||1.15)*1.2};`;
  if(f.indL)s+=`margin-left:${f.indL}pt;`;if(f.indFirst)s+=`text-indent:${f.indFirst}pt;`;
  if(f.heading){s+=`font-weight:700;font-size:${f.heading===1?16:f.heading===2?14:13}pt;`}
  if(f.styleRun){if(f.styleRun.b)s+="font-weight:700;";if(f.styleRun.i)s+="font-style:italic;";if(f.styleRun.sz)s+=`font-size:${f.styleRun.sz}pt;`;if(f.styleRun.font)s+=`font-family:'${f.styleRun.font}',var(--docfont);`}
  return s}
function richTextHTML(t){return esc(t).replace(/\u2028/g,"<br>")}
/* char-level renderer: runs give formatting, ranges give review classes (issue underline, word marks, placeholders) */
function richChars(runs,from,to,ranges){
  const at=[];runs.forEach((r,ri)=>{for(let i=0;i<r.t.length;i++)at.push(ri)});const all=runs.map(r=>r.t).join("");
  let html="",key=null,buf="",cur=null;
  const flush=()=>{if(!buf)return;const r=runs[cur.ri]||{f:{}};html+=`<span style="${richFmtStyle(r.f)}">${cur.iss?`<span class="${cur.iss}">`:""}${cur.mk?`<mark class="${cur.mk}">`:""}${richTextHTML(buf)}${cur.mk?"</mark>":""}${cur.iss?"</span>":""}</span>`;buf=""};
  for(let i=from;i<to;i++){let iss="",mk="";for(const [a,b,kind,cls] of ranges){if(i>=a&&i<b){if(kind==="iss")iss=cls;else mk=cls}}
    const k=`${at[i]}|${iss}|${mk}`;if(k!==key){flush();key=k;cur={ri:at[i],iss,mk}}buf+=all[i]}
  flush();return html}

/* ---------- editor ---------- */
function richEditorHTML(d,table){const byP={};d.model.forEach(s=>(byP[s.p]=byP[s.p]||[]).push(s));
  return d.rich.paras.map((P,k)=>{const runs=(byP[k]||[]).flatMap(s=>s.runs||[{t:s.t+(s.ws||""),rPr:"",f:{}}]);
    const inner=runs.map(r=>{table.push({rPr:r.rPr,f:r.f});return`<span data-r="${table.length-1}" style="${richFmtStyle(r.f)}">${richTextHTML(r.t)}</span>`}).join("");
    return`<p data-pi="${k}" class="${P.f&&P.f.list?"li":""}" style="${richParaStyle(P.f,d.rich.defaults)}">${inner||"<br>"}</p>`}).join("")}
function cssFont(ff){return ff?ff.split(",")[0].replace(/["']/g,"").trim():null}
function cssSizePt(fs){if(!fs)return null;const m=String(fs).match(/([\d.]+)(pt|px)/);if(!m)return null;return m[2]==="pt"?+m[1]:Math.round(+m[1]*0.75*2)/2}
function rPrWith(raw,f){let x=raw||"";const body=x.replace(/^<w:rPr[^>]*>/,"").replace(/<\/w:rPr>$/,"").replace(/^<w:rPr[^>]*\/>$/,"");
  const keep=body.replace(/<w:(b|bCs|i|iCs|u|sz|szCs|rFonts)(\s[^>]*)?\/>/g,"").replace(/<w:(rFonts|u)(\s[^>]*)?>[\s\S]*?<\/w:\1>/g,"");
  const fo=f.font?`<w:rFonts w:ascii="${xmlEsc(f.font)}" w:hAnsi="${xmlEsc(f.font)}" w:cs="${xmlEsc(f.font)}"/>`:"";
  return`<w:rPr>${fo}${f.b?"<w:b/>":""}${f.i?"<w:i/>":""}${keep}${f.u?'<w:u w:val="single"/>':""}${f.sz?`<w:sz w:val="${Math.round(f.sz*2)}"/><w:szCs w:val="${Math.round(f.sz*2)}"/>`:""}</w:rPr>`.replace("<w:rPr></w:rPr>","")}
function richFromEditor(root,table,oldProps){
  const paras=[];let cur=null;const startP=el=>{const pi=el&&el.dataset?el.dataset.pi:null;const old=pi!=null&&oldProps[+pi]?oldProps[+pi]:{pPr:"",f:{}};cur={pPr:old.pPr,f:{...old.f},runs:[]};paras.push(cur)};
  const push=(t,ri,f)=>{if(!cur)startP(null);const base=table[ri]||{rPr:"",f:{}};const same=["b","i","u","font","sz"].every(k=>(f[k]||false)===(base.f[k]||false));
    const run=same?{t,rPr:base.rPr,f:base.f}:{t,rPr:rPrWith(base.rPr,f),f:{...base.f,...f}};
    const l=cur.runs[cur.runs.length-1];if(l&&l.rPr===run.rPr&&JSON.stringify(l.f)===JSON.stringify(run.f))l.t+=t;else cur.runs.push(run)};
  const walk=(n,f,ri)=>{if(n.nodeType===3){if(n.nodeValue)push(n.nodeValue.replace(/\u00a0/g," "),ri,f);return}if(n.nodeType!==1)return;
    const tag=n.tagName.toLowerCase();if(tag==="br"){if(n.parentNode&&n.parentNode.childNodes.length===1)return;push("\u2028",ri,f);return}
    const block=["p","div","li","h1","h2","h3","h4","h5","h6"].includes(tag);if(block)startP(n);
    let g={...f};if(n.dataset&&n.dataset.r!=null){ri=+n.dataset.r;g={...(table[ri]?table[ri].f:{})}}
    if(tag==="b"||tag==="strong")g.b=true;if(tag==="i"||tag==="em")g.i=true;if(tag==="u")g.u=true;
    if(tag==="font"&&n.getAttribute("face"))g.font=cssFont(n.getAttribute("face"));
    const st=n.style;if(st){if(st.fontWeight)g.b=st.fontWeight==="bold"||+st.fontWeight>=600;if(st.fontStyle)g.i=st.fontStyle==="italic";
      const td=st.textDecorationLine||st.textDecoration;if(td)g.u=/underline/.test(td);if(st.fontFamily)g.font=cssFont(st.fontFamily);const pt=cssSizePt(st.fontSize);if(pt)g.sz=pt}
    for(const c of n.childNodes)walk(c,g,ri)};
  for(const c of root.childNodes)walk(c,{},null);
  paras.forEach(P=>P.runs=P.runs.filter(r=>r.t));return paras}

/* ---------- Word export (keeps original styles; accepted changes as tracked changes) ---------- */
function richCharsOf(props,model){const byP={};model.forEach(s=>(byP[s.p]=byP[s.p]||[]).push(s));
  return props.map((_,k)=>{const arr=[];(byP[k]||[]).forEach(s=>(s.runs||[{t:s.t+(s.ws||""),rPr:"",f:{}}]).forEach(r=>{for(let i=0;i<r.t.length;i++)arr.push({c:r.t[i],r})}));return arr})}
function richTokens(paraChars){const toks=[];paraChars.forEach((chars,k)=>{if(k)toks.push("\n");const t=chars.map(x=>x.c).join("");t.split(/(\s+)/).forEach(x=>{if(x)toks.push(x)})});return toks}
function tidyOps(ops){const out=[];let i=0;
  while(i<ops.length){if(ops[i][0]==="="){out.push(ops[i]);i++;continue}
    let j=i;const cl=[];
    while(j<ops.length){if(ops[j][0]!=="="){cl.push(ops[j]);j++;continue}
      let k=j,txt="";while(k<ops.length&&ops[k][0]==="="&&ops[k][1]!=="\n"){txt+=ops[k][1];k++}
      if(k<ops.length&&ops[k][0]!=="="&&ops[k][1]!=="\n"&&txt.trim().split(/\s+/).filter(Boolean).length<=2&&txt.length<=14&&ops.slice(j,k).every(o=>o[1]!=="\n")){for(let m=j;m<k;m++){cl.push(["-",ops[m][1]]);cl.push(["+",ops[m][1]])}j=k;continue}
      break}
    cl.filter(o=>o[0]==="-").forEach(o=>out.push(o));cl.filter(o=>o[0]==="+").forEach(o=>out.push(o));i=j}
  return out}
function runXml(text,rPr,kind,meta){let x="";const parts=text.split(/(\t|\u2028)/);
  for(const p of parts){if(!p)continue;if(p==="\t")x+="<w:tab/>";else if(p==="\u2028")x+="<w:br/>";else x+=kind==="-"?`<w:delText xml:space="preserve">${xmlEsc(p)}</w:delText>`:`<w:t xml:space="preserve">${xmlEsc(p)}</w:t>`}
  const r=`<w:r>${rPr||""}${x}</w:r>`;if(kind==="+")return`<w:ins w:id="${meta.id++}" w:author="DossierLens" w:date="${meta.date}">${r}</w:ins>`;
  if(kind==="-")return`<w:del w:id="${meta.id++}" w:author="DossierLens" w:date="${meta.date}">${r}</w:del>`;return r}
function rPrFor(run){return run.rPr||(run.f&&Object.keys(run.f).length?rPrWith("",run.f):"")}
async function makeRichDocx(d,{tracked=true}={}){
  await loadScript(JSZIP_URL);
  const props=d.rich.paras,cur=richCharsOf(props,d.model);const meta={id:1,date:new Date().toISOString().replace(/\.\d+Z$/,"Z")};
  let paraSegs=cur.map(chars=>[["=",chars]]);let changed=0;const markIns=[];
  if(tracked&&d.baseRich){const B=JSON.parse(d.baseRich);const base=richCharsOf(B.props,B.model);
    const ops=tidyOps(dlMyers(richTokens(base),richTokens(cur)));paraSegs=cur.map(()=>[]);let bp=0,bo=0,cp=0,co=0;
    const add=(k,kind,chars)=>{const L=paraSegs[Math.min(k,paraSegs.length-1)];const l=L[L.length-1];if(l&&l[0]===kind)l[1]=l[1].concat(chars);else L.push([kind,chars])};
    for(const [t,v] of ops){
      if(v==="\n"){if(t==="="){bp++;bo=0;cp++;co=0}else if(t==="-"){bp++;bo=0}else{markIns[cp]=true;cp++;co=0;changed++}continue}
      if(t==="="){add(cp,"=",cur[cp].slice(co,co+v.length));co+=v.length;bo+=v.length}
      else if(t==="-"){add(cp,"-",(base[bp]||[]).slice(bo,bo+v.length));bo+=v.length;changed++}
      else{add(cp,"+",cur[cp].slice(co,co+v.length));co+=v.length;changed++}}}
  const body=paraSegs.map((segs,k)=>{let runs="";
    segs.forEach(([kind,chars])=>{let buf="",r=null;const fl=()=>{if(buf)runs+=runXml(buf,rPrFor(r),kind,meta);buf=""};
      chars.forEach(x=>{if(r!==x.r&&!(r&&r.rPr===x.r.rPr&&JSON.stringify(r.f)===JSON.stringify(x.r.f))){fl();r=x.r}buf+=x.c});fl()});
    let pPr=props[k].pPr||"";
    if(markIns[k]){const mk=`<w:ins w:id="${meta.id++}" w:author="DossierLens" w:date="${meta.date}"/>`; // inserted paragraph mark
      if(!pPr)pPr=`<w:pPr><w:rPr>${mk}</w:rPr></w:pPr>`;
      else if(/<w:rPr\b[^>]*\/>/.test(pPr))pPr=pPr.replace(/<w:rPr\b[^>]*\/>/,`<w:rPr>${mk}</w:rPr>`);
      else if(/<w:rPr\b[^>]*>/.test(pPr))pPr=pPr.replace(/(<w:rPr\b[^>]*>)/,"$1"+mk);
      else if(pPr.includes("<w:sectPr"))pPr=pPr.replace("<w:sectPr",`<w:rPr>${mk}</w:rPr><w:sectPr`);
      else if(/<w:pPr\b[^>]*\/>$/.test(pPr))pPr=pPr.replace(/\/>$/,`><w:rPr>${mk}</w:rPr></w:pPr>`);
      else pPr=pPr.replace(/<\/w:pPr>$/,`<w:rPr>${mk}</w:rPr></w:pPr>`)}
    return`<w:p>${pPr}${runs}</w:p>`}).join("");
  const pk=d.rich.pkg||{};const parts=[["styles","styles.xml","application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml","http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"],
    ["numbering","numbering.xml","application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml","http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering"],
    ["theme","theme/theme1.xml","application/vnd.openxmlformats-officedocument.theme+xml","http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"],
    ["fontTable","fontTable.xml","application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml","http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable"]];
  const defStyles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`;
  const files={styles:pk.styles||defStyles,numbering:pk.numbering,theme:pk.theme,fontTable:pk.fontTable};
  const zip=new JSZip();const put=(n,x)=>zip.file(n,x,{createFolders:false});let ct=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>`;
  let rels=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>`;
  parts.forEach(([k,path,type,rt],n)=>{if(!files[k])return;put("word/"+path,files[k]);ct+=`<Override PartName="/word/${path}" ContentType="${type}"/>`;rels+=`<Relationship Id="rIdP${n}" Type="${rt}" Target="${path}"/>`});
  ct+="</Types>";rels+="</Relationships>";
  put("[Content_Types].xml",ct);put("word/_rels/document.xml.rels",rels);
  put("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  put("word/settings.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="${W_NS}">${changed?"<w:trackRevisions/>":""}</w:settings>`);
  const sect=pk.sectPr||'<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
  put("word/document.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}${sect}</w:body></w:document>`);
  return zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
