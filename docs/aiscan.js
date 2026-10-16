/* AI copy-paste artifacts, AI-typical wording (from academic-research-skills writing_quality_check.md),
   and reference-list checks (fabricated-reference signals, after its Mode 2 "hallucinated citation"). */
const INVIS=[["​","ZWSP","Zero-width space"],["‌","ZWNJ","Zero-width non-joiner"],["‍","ZWJ","Zero-width joiner"],
 ["⁠","WJ","Word joiner"],["﻿","BOM","Zero-width no-break space"],[" ","NNBSP","Narrow no-break space"],
 ["­","SHY","Soft hyphen"],[" ","THSP","Thin space"],["‎","LRM","Left-to-right mark"],["‏","RLM","Right-to-left mark"],["⁢","IT","Invisible times"],["⁣","IS","Invisible separator"]];
const INVIS_RE=new RegExp("["+INVIS.map(x=>x[0]).join("")+"]","g");
const AI_ARTIFACTS=[
 [/:?contentReference\[oaicite:\d+\]\{index=\d+\}/g,"ChatGPT citation placeholder (oaicite)","high"],
 [/【\d+(?::\d+)?†[^】]{0,60}】/g,"ChatGPT source marker 【n†source】","high"],
 [/\b(?:cite)?turn\d+(?:search|news|view|fetch|file)\d+\b/g,"ChatGPT search citation token","high"],
 [/[?&]utm_source=(?:chatgpt\.com|openai|perplexity(?:\.ai)?|copilot\.com|claude\.ai|gemini)[^\s)\]>"]*/gi,"Link copied from an AI chat (utm_source tag)","high"],
 [/\bAs an AI(?: language model)?\b/gi,"Chatbot disclaimer","high"],
 [/(?:^|\n)\s*(?:Certainly|Absolutely|Sure|Great question)[!,.]\s/gi,"Chatbot reply opener","high"],
 [/\bI hope this helps\b|\bLet me know if you(?:'d| would)? like\b|\bFeel free to (?:ask|reach out|adjust)\b/gi,"Chatbot closing line","high"],
 [/\bHere(?:'s| is) (?:a|an|the|your) (?:revised|polished|refined|improved|draft|rewritten|updated)\b/gi,"Chatbot hand-off phrase","high"],
 [/^[ \t]{0,3}#{1,6}[ \t]+\S/gm,"Markdown heading (#) left in text","medium"],
 [/\*\*[^*\n]{1,80}\*\*/g,"Markdown bold (**…**) left in text","medium"],
 [/(?:^|\n)[ \t]*[-*•][ \t]+\*\*/g,"Markdown bullet with bold lead-in","medium"],
 [/\[(?:Insert|Your|Name of|Add)[^\]]{0,40}\]/g,"Unfilled template placeholder","medium"]];
const FLAGGED_TERMS={delve:"examine, investigate, analyze",tapestry:"network, interplay, system",landscape:"field, domain, context",pivotal:"important, central, key",crucial:"essential, necessary",
 foster:"promote, develop, encourage",showcase:"demonstrate, illustrate, present",testament:"evidence, indicator",navigate:"manage, address, handle",leverage:"use, apply",realm:"domain, field, area",
 embark:"begin, start, undertake",underscore:"emphasize, highlight",multifaceted:"complex, varied",nuanced:"subtle, fine-grained",comprehensive:"thorough, extensive",robust:"reliable, rigorous",
 intricate:"complex, detailed",cornerstone:"foundation, basis",paradigm:"framework, model, approach",synergy:"interaction, combined effect",holistic:"integrated, whole-system",
 streamline:"simplify, improve",["cutting-edge"]:"recent, advanced, state-of-the-art",groundbreaking:"novel, original"};
const THROAT=["in the realm of","it's important to note that","it is important to note that","it is worth mentioning that","in today's rapidly evolving","serves as a testament to","it goes without saying",
 "in order to","it should be noted that","as a matter of fact","when it comes to","at the end of the day","with that being said","this section will discuss","we now turn our attention to"];
const SURPRISE=["surprisingly","unexpectedly","counterintuitively","contrary to our hypothesis","in hindsight","we realized later"];

function aiScan(text){
  const out={invis:[],nbsp:0,artifacts:[],flagged:[],openers:[],surprise:[],emdash:{n:0,per1k:0},marks:[]};
  INVIS.forEach(([ch,code,name])=>{let n=0,i=-1;while((i=text.indexOf(ch,i+1))!==-1){n++;out.marks.push({i,len:1,kind:"invis",label:code})}if(n)out.invis.push({code,name,n})});
  out.nbsp=(text.match(/ /g)||[]).length;
  AI_ARTIFACTS.forEach(([re,label,sev])=>{const m=[...text.matchAll(re)];if(m.length){out.artifacts.push({label,sev,n:m.length,ex:m[0][0].trim().slice(0,60)});m.forEach(x=>out.marks.push({i:x.index,len:x[0].length,kind:"art",label}))}});
  const low=text.toLowerCase();const nW=Math.max(1,(low.match(/[a-z]+/g)||[]).length);
  Object.entries(FLAGGED_TERMS).forEach(([t,alt])=>{const re=new RegExp("\\b"+t.replace("-","\\-")+"\\w*","gi");const m=[...text.matchAll(re)];if(m.length){out.flagged.push({t,alt,n:m.length});m.forEach(x=>out.marks.push({i:x.index,len:x[0].length,kind:"term",label:`“${t}”: try ${alt}`}))}});
  THROAT.forEach(t=>{const n=low.split(t).length-1;if(n)out.openers.push({t,n})});
  SURPRISE.forEach(t=>{const n=low.split(t).length-1;if(n)out.surprise.push({t,n})});
  out.emdash.n=(text.match(/—/g)||[]).length;out.emdash.per1k=+(out.emdash.n/nW*1000).toFixed(1);
  const hi=out.artifacts.filter(a=>a.sev==="high").reduce((a,b)=>a+b.n,0),inv=out.invis.reduce((a,b)=>a+b.n,0),md=out.artifacts.filter(a=>a.sev==="medium").reduce((a,b)=>a+b.n,0);
  const termRate=out.flagged.reduce((a,b)=>a+b.n,0)/nW*1000;
  out.risk=Math.min(100,Math.round(hi*25+Math.min(30,inv*3)+Math.min(20,md*4)+Math.min(20,termRate*4)+Math.min(10,Math.max(0,out.emdash.per1k-3)*2)+Math.min(10,out.openers.length*3)));
  return out;
}
function cleanText(text){
  return text.replace(/:?contentReference\[oaicite:\d+\]\{index=\d+\}/g,"").replace(/【\d+(?::\d+)?†[^】]{0,60}】/g,"").replace(/\b(?:cite)?turn\d+(?:search|news|view|fetch|file)\d+\b/g,"")
   .replace(/([?&])utm_source=[^\s&)\]>"]*&?/gi,(m,p)=>p==="?"?"?":"&").replace(/[?&](?=[\s)\]>"]|$)/g,"")
   .replace(/[​‌‍⁠﻿­‎‏⁢⁣]/g,"").replace(/[   ]/g," ")
   .replace(/\*\*([^*\n]{1,80})\*\*/g,"$1").replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm,"").replace(/[ \t]{2,}/g," ").replace(/ +([,.;:])/g,"$1");
}

/* ---------- references ---------- */
const REF_HEAD=/^\s*(references(?: cited)?|bibliography|works cited|literature cited|citations|sources)\s*:?\s*$/im;
function parseRefs(text){
  const lines=text.replace(/\r/g,"").split("\n");let start=-1;
  for(let i=lines.length-1;i>=0;i--){if(REF_HEAD.test(lines[i])){start=i;break}}
  if(start<0)return{body:text,refs:[],found:false};
  const body=lines.slice(0,start).join("\n");const raw=lines.slice(start+1).map(l=>l.trim()).filter(Boolean);
  const isStart=l=>/^(\[\d+\]|\d{1,3}[.)]\s|[A-Z][A-Za-z'’\-]+(?:\s[A-Z][a-z]+)?,\s*(?:[A-Z]\.|[A-Z][a-z]+)|[A-Z][A-Za-z'’\-]+\s[A-Z]{1,3}[,.]|[A-Z][A-Za-z'’\-]+ et al\.)/.test(l);
  const refs=[];raw.forEach(l=>{if(!refs.length||isStart(l)||refs[refs.length-1].length>400)refs.push(l);else refs[refs.length-1]+=" "+l});
  return{body,refs:refs.filter(r=>r.length>15).slice(0,200).map((r,k)=>parseRef(r,k+1)),found:true};
}
function parseRef(t,n){
  const doi=(t.match(/\b10\.\d{4,9}\/[^\s"<>]+/)||[""])[0].replace(/[.,;)\]]+$/,"");
  const url=(t.match(/https?:\/\/[^\s<>"]+/)||[""])[0].replace(/[.,;)\]]+$/,"");
  const ym=t.match(/\b(1[89]\d{2}|20\d{2})[a-z]?\b/);const year=ym?+ym[1]:null;
  const num=(t.match(/^\[?(\d{1,3})[\].)]/)||[])[1];
  const clean=t.replace(/^\[?\d{1,3}[\].)]\s*/,"");
  const surname=(clean.match(/^([A-Z][A-Za-z'’\-]+)/)||[])[1]||"";
  let title="";const m=clean.match(/\(?(?:1[89]\d{2}|20\d{2})[a-z]?\)?[.,]\s*([^.?!]{8,250}[.?!])/);if(m)title=m[1].trim();
  else{const parts=clean.split(/\.\s+/);title=(parts[1]||parts[0]||"").slice(0,200)}
  return{n,num:num?+num:n,text:t,doi,url,year,surname,title:title.replace(/[.]$/,"")};
}
function refLocalFlags(r,body,all){
  const f=[];const now=new Date().getFullYear();
  if(!r.year)f.push("No year found");else if(r.year>now+1)f.push(`Year ${r.year} is in the future`);
  if(r.doi){if(/^10\.(1234|1000|5555|0000|9999)\//.test(r.doi))f.push("DOI uses a placeholder-style prefix");if(/\s|[^\x21-\x7e]/.test(r.doi))f.push("DOI contains invalid characters");}
  if(!r.doi&&!r.url&&!/\d+\s*\(\d+\)|\bvol\.|\bpp?\.\s*\d|\d+[–-]\d+|journal|proceedings|press|conference|university|thesis|report/i.test(r.text))f.push("No DOI, URL, volume, pages, or venue");
  if(/utm_source=(chatgpt|openai|perplexity|copilot|claude|gemini)/i.test(r.url||r.text))f.push("Link was copied from an AI chat");
  const key=r.title.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();if(key.length>15&&all.filter(x=>x.title.toLowerCase().replace(/[^a-z0-9]+/g," ").trim()===key).length>1)f.push("Duplicate entry");
  // cited in the text?
  if(body){const numeric=/\[\d{1,3}(?:[,–-]\s*\d{1,3})*\]/.test(body);
    if(numeric){const re=new RegExp("\\[[^\\]]*\\b"+r.num+"\\b[^\\]]*\\]");if(!re.test(body))f.push("Never cited in the text")}
    else if(r.surname&&r.year){const re=new RegExp(r.surname+"[^()\\n]{0,60}?\\(?"+r.year,"i");if(!re.test(body))f.push("Not found as an in-text citation")}}
  return f;
}
function orphanCitations(body,refs){
  const out=[];const seen=new Set();
  for(const m of body.matchAll(/\(([A-Z][A-Za-z'’\-]+)(?: et al\.| and [A-Z][A-Za-z'’\-]+| & [A-Z][A-Za-z'’\-]+)?,? (\d{4})[a-z]?\)/g)){
    const k=m[1]+" "+m[2];if(seen.has(k))continue;seen.add(k);
    if(!refs.some(r=>r.text.includes(m[1])&&r.year===+m[2]))out.push(m[0])}
  return out.slice(0,30);
}
const verifyLinks=r=>{const q=encodeURIComponent((r.title||r.text).slice(0,180));return[
  r.doi?[`https://doi.org/${r.doi}`,"Open DOI"]:null,[`https://search.crossref.org/search/works?q=${q}&from_ui=yes`,"Crossref"],
  [`https://www.semanticscholar.org/search?q=${q}`,"Semantic Scholar"],[`https://scholar.google.com/scholar?q=${q}`,"Google Scholar"]].filter(Boolean)};
function refsPrompt(refs,body){
  return `You are checking a reference list for fabricated ("hallucinated") or miscited references, as a careful journal editor would. You have no internet access, so judge from your knowledge and internal consistency only: whether the authors are known to publish on this topic, whether the venue publishes this kind of work, whether title, venue, year, volume and DOI prefix are consistent with each other (e.g., a DOI prefix that belongs to a different publisher), and whether the title sounds like a real paper or a generic composite. Never claim certainty you do not have.

Document excerpt (for topic context):
"""
${body.slice(0,2500)}
"""

References:
${refs.map(r=>`[${r.n}] ${r.text}`).join("\n").slice(0,60000)}

Return ONLY JSON: {"refs":[{"n":1,"verdict":"plausible"|"uncertain"|"likely_fabricated","confidence":0.0-1.0,"reasons":["short reason"],"corrected":"the correct full citation if you are confident you know the real work this was meant to be, else empty string"}]} with one entry per reference number.`;
}

/* ---------- two-way citation check: in-text citations <-> reference list ---------- */
const NOT_NAMES=new Set(["Figure","Fig","Table","Section","Chapter","Appendix","See","In","Since","From","Until","During","Before","After","Spring","Summer","Fall","Autumn","Winter","January","February","March","April","May","June","July","August","September","October","November","December","Year","FY","Phase","Aim","Equation","Eq","Page","Vol","No","Version","The","This","Our","We","USDA","NSF","NIH","Census"]);
function extractCitations(body){
  const cites=[];const name=String.raw`([A-Z][A-Za-z'’\-]+(?:\s+(?:van|de|von|der|da|del)\s+[A-Z][A-Za-z'’\-]+)?)`;const yr=String.raw`((?:1[89]|20)\d{2})([a-z]?)`;
  for(const m of body.matchAll(/\[(\d{1,3}(?:\s*[,–\-]\s*\d{1,3})*)\]/g)){const nums=[];m[1].split(/\s*,\s*/).forEach(p=>{const r=p.split(/\s*[–-]\s*/).map(Number);if(r.length===2&&r[1]>=r[0]&&r[1]-r[0]<60){for(let k=r[0];k<=r[1];k++)nums.push(k)}else nums.push(r[0])});cites.push({kind:"num",label:m[0],nums,pos:m.index,len:m[0].length})}
  const partRe=new RegExp(name+String.raw`(?:\s+et\s+al\.?|\s+(?:and|&)\s+[A-Z][A-Za-z'’\-]+)?,?\s+`+yr);
  for(const m of body.matchAll(/\(([^()]{3,400}?)\)/g)){
    if(!/(?:1[89]|20)\d{2}/.test(m[1]))continue;let off=m.index+1;
    m[1].split(";").forEach(part=>{const t=part.trim();const mm=t.match(partRe);
      if(mm&&!NOT_NAMES.has(mm[1])){const i=body.indexOf(t,off);cites.push({kind:"ay",label:t.replace(/^(see|e\.g\.,?|cf\.)\s+/i,""),surname:mm[1],year:+mm[2],suf:mm[3],pos:i>=0?i:m.index,len:t.length})}
      off+=part.length+1})}
  const narr=new RegExp(String.raw`\b`+name+String.raw`(?:\s+et\s+al\.?|\s+(?:and|&)\s+[A-Z][A-Za-z'’\-]+)?\s+\(`+yr+String.raw`\)`,"g");
  for(const m of body.matchAll(narr))if(!NOT_NAMES.has(m[1]))cites.push({kind:"ay",label:m[0],surname:m[1],year:+m[2],suf:m[3],pos:m.index,len:m[0].length});
  const nNum=cites.filter(c=>c.kind==="num").length,nAy=cites.length-nNum;
  return{style:nNum>nAy?"numeric":nAy?"author-year":"none",cites:cites.sort((a,b)=>a.pos-b.pos)};
}
function refMatches(c,r){
  if(c.kind==="num")return false;if(!r.year||r.year!==c.year)return false;
  const head=r.text.replace(/^\[?\d{1,3}[\].)]\s*/,"").slice(0,90).toLowerCase();
  return head.includes(c.surname.toLowerCase())&&(!c.suf||new RegExp(c.year+c.suf).test(r.text));
}
function crossCheck(body,refs){
  const X=extractCitations(body);const used=new Set();const missing=[];
  X.cites.forEach(c=>{
    if(c.kind==="num"){c.nums.forEach(n=>{const r=refs.find(z=>z.num===n);if(r){used.add(r.n);c.ok=true}else{c.bad=true;missing.push({label:"["+n+"]",pos:c.pos})}})}
    else{const r=refs.find(z=>refMatches(c,z));if(r){used.add(r.n);c.ok=true}else{c.bad=true;missing.push({label:c.label,pos:c.pos})}}});
  const seen={},miss=[];missing.forEach(m=>{const k=m.label.toLowerCase().replace(/\s+/g," ");if(seen[k])seen[k].count++;else{seen[k]={...m,count:1};miss.push(seen[k])}});
  return{...X,miss,unused:refs.filter(r=>!used.has(r.n)),used:used.size};
}
