/* Funding finder (grants kept in the artifact database, refreshed by a scheduled routine),
   RFA rule extraction, and field-of-study selection for grant proposals. */
const FIELDS=["Agriculture","Food science","Plant science","Animal science","Robotics","Artificial intelligence","Machine learning","Computer vision","Data science","Cybersecurity",
 "Quantum","Computing & HPC","Engineering","Biological & agricultural engineering","Electrical engineering","Mechanical engineering","Civil & environmental engineering","Materials science",
 "Chemistry","Physics","Mathematics","Biology","Genomics","Neuroscience","Biomedical","Public health","Health informatics","Ecology","Climate","Water","Energy","Ocean","Space",
 "Manufacturing","Transportation","Education (STEM)","Social sciences","Economics","Humanities & arts","AI safety","Small business / SBIR","Workforce development"];
const SPONSOR_TYPES=["Federal","State","Foundation","Industry","International","Other"];
const COUNTRIES=["USA","Canada","United Kingdom","European Union","Germany","France","Netherlands","Switzerland","India","China","Japan","South Korea","Singapore","Australia","New Zealand","Brazil","International (any)"];

/* ---------- database ---------- */
function initFunding(){
ui.grants=null;ui.fundMeta=null;ui.dbState="loading";
  (async()=>{await new Promise(r=>setTimeout(r));let db=null;try{db=window.claude?await window.claude.use("db"):null}catch(e){}
    if(!db){ // outside claude.ai: read the snapshot published with the site
    try{const r=await fetch("grants.json",{cache:"no-cache"});const j=await r.json();ui.grants=(j.grants||[]);ui.fundMeta=j.meta||null;ui.dbState="ok"}catch(e){ui.dbState="none"}
    if(ALL.mode==="funding")renderDoc();return}
    ui.dbState="ok";
    db.collection("grants").limit(1000).onSnapshot(s=>{ui.grants=s.docs.map(d=>({id:d.id,...d.data()}));if(ALL.mode==="funding")renderFundList()},e=>{ui.dbState="error";if(ALL.mode==="funding")renderDoc()});
    db.doc("meta/status").onSnapshot(s=>{ui.fundMeta=s.exists?s.data():null;const el=document.getElementById("fundMeta");if(el)el.innerHTML=fundMetaHTML()},()=>{});
  })();
  setTimeout(()=>{if(ui.dbState==="loading"){ui.dbState="none";if(ALL.mode==="funding")renderDoc()}},11000);
}
function ff(){ALL.ff=ALL.ff||{country:"USA",types:[],sponsor:"",fields:[],combine:"all",q:"",window:"any",forecast:true,sort:"deadline"};return ALL.ff}
const daysLeft=d=>d?Math.ceil((new Date(d+"T23:59:00")-new Date())/864e5):null;
function grantMatch(g){
  const text=(S&&ALL.modes.grant.docs.proposal.text)||"";const sel=ALL.modes.grant.fields||[];
  let m=0;if(text.trim())m=cosine(topTerms(text),topTerms([g.title,g.summary,(g.fields||[]).join(" ")].join(" ")))*100;
  const fo=sel.length?(g.fields||[]).filter(f=>sel.includes(f)).length/sel.length*100:0;
  return Math.round(Math.min(100,text.trim()&&sel.length?.5*Math.min(100,m*2.2)+.5*fo:text.trim()?Math.min(100,m*2.2):fo));
}
function hasField(g,f){const lf=f.toLowerCase();return(g.fields||[]).some(x=>x.toLowerCase()===lf)||((g.title||"")+" "+(g.summary||"")).toLowerCase().includes(lf.split(/[ &(]/)[0])}
function filteredGrants(){
  const F=ff();let a=(ui.grants||[]).slice();
  a=a.filter(g=>{const dl=daysLeft(g.deadline);
    if(g.status!=="rolling"&&g.status!=="forecast"&&dl!=null&&dl<0)return false;
    if(!F.forecast&&g.status==="forecast")return false;
    if(F.country&&F.country!=="All"){const cs=g.countries||[g.country];if(!cs.includes(F.country)&&!cs.includes("International (any)"))return false}
    if(F.types.length&&!F.types.includes(g.sponsorType))return false;
    if(F.sponsor&&g.sponsor!==F.sponsor)return false;
    if(F.fields.length){const hits=F.fields.map(f=>hasField(g,f));if(F.combine==="all"?!hits.every(Boolean):!hits.some(Boolean))return false}
    if(F.window!=="any"&&dl!=null&&dl>+F.window)return false;
    if(F.window!=="any"&&dl==null&&g.status!=="rolling")return false;
    if(F.q){const q=F.q.toLowerCase();if(![g.title,g.sponsor,g.summary,g.eligibility,(g.fields||[]).join(" ")].join(" ").toLowerCase().includes(q))return false}
    return true});
  const key={deadline:g=>g.deadline||"9999",amount:g=>-(+g.amountMax||0),match:g=>-grantMatch(g),sponsor:g=>g.sponsor||""}[F.sort]||(g=>g.deadline||"9999");
  return a.sort((x,y)=>{const a1=key(x),b1=key(y);return a1<b1?-1:a1>b1?1:0});
}
function fundMetaHTML(){const m=ui.fundMeta;if(!m)return`<span class="muted">Not refreshed yet.</span>`;
  const t=m.lastRun?new Date(m.lastRun):null;return`<span class="pill ${t&&(Date.now()-t)<36e5*30?"ok":"warn"}">Last refreshed ${t?t.toLocaleString([], {dateStyle:"medium",timeStyle:"short"}):"—"}</span> <span class="muted" style="font-size:12px">${esc(m.note||"")}${m.count?` · ${m.count} calls`:""}</span>`}
function renderFunding(){
  const host=$("doc");host.classList.remove("anim");const F=ff();
  if(ui.dbState==="none"||ui.dbState==="error"){host.innerHTML=`<div class="notice">${ui.dbState==="error"?"The grant list couldn't be loaded. Reload the page to try again.":"The funding list could not be loaded. Serve this folder with a local web server (see the README) or open the page on GitHub Pages."}</div>`;return}
  const sponsors=[...new Set((ui.grants||[]).map(g=>g.sponsor).filter(Boolean))].sort();
  host.innerHTML=`<div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="eyebrow">Funding finder</div><h2>Open calls and deadlines</h2>
     <p class="muted" style="margin:4px 0 0;max-width:80ch">Federal agencies, foundations, big-tech research programs and international funders. The list is refreshed by the DossierLens funding-finder skill (schedule it to run every morning). Always confirm dates on the funder's page before you plan around them.</p></div><div id="fundMeta">${fundMetaHTML()}</div></div>
   <div class="panel" style="display:grid;gap:10px">
     <div class="row">
       <label class="bl">Country<select id="fCountry" style="width:auto">${["All",...COUNTRIES].map(c=>`<option ${F.country===c?"selected":""} value="${c}">${c==="All"?"All countries":c}</option>`).join("")}</select></label>
       <label class="bl">Funder<select id="fSponsor" style="width:auto"><option value="">All funders</option>${sponsors.map(s=>`<option ${F.sponsor===s?"selected":""}>${esc(s)}</option>`).join("")}</select></label>
       <label class="bl">Deadline within<select id="fWindow" style="width:auto">${[["any","Any time"],["30","30 days"],["60","60 days"],["90","90 days"],["180","6 months"],["365","1 year"]].map(([v,l])=>`<option value="${v}" ${F.window===v?"selected":""}>${l}</option>`).join("")}</select></label>
       <label class="bl">Sort<select id="fSort" style="width:auto">${[["deadline","Deadline"],["match","Match to my proposal"],["amount","Award size"],["sponsor","Funder"]].map(([v,l])=>`<option value="${v}" ${F.sort===v?"selected":""}>${l}</option>`).join("")}</select></label>
       <label class="bl" style="flex:1;min-width:180px">Search<input type="text" id="fQ" value="${esc(F.q)}" placeholder="e.g. sensors, AI safety, early career"></label>
     </div>
     <div class="row"><span class="muted" style="font-size:12px;font-weight:600">Funder type</span>${SPONSOR_TYPES.map(t=>`<button class="tg" data-ftype="${t}" aria-pressed="${F.types.includes(t)}">${t==="Industry"?"Industry & big tech":t}</button>`).join("")}
       <label class="row" style="gap:6px;font-size:12px;margin-left:auto"><input type="checkbox" id="fForecast" ${F.forecast?"checked":""}> Include forecast calls</label></div>
     <div style="display:grid;gap:6px"><div class="row" style="justify-content:space-between"><span class="muted" style="font-size:12px;font-weight:600">Fields of study ${F.fields.length>1?`· combine with`:""}</span>
       ${F.fields.length>1?`<span class="row" style="gap:4px"><button class="tg" data-comb="all" aria-pressed="${F.combine==="all"}">All selected (e.g. robotics + food)</button><button class="tg" data-comb="any" aria-pressed="${F.combine==="any"}">Any selected</button></span>`:""}</div>
       <div class="filters">${FIELDS.map(f=>`<button class="tg" data-ffield="${esc(f)}" aria-pressed="${F.fields.includes(f)}">${esc(f)}</button>`).join("")}</div>
       ${(ALL.modes.grant.fields||[]).length?`<div><button class="btn small" id="fMine">Use my proposal's fields (${ALL.modes.grant.fields.map(esc).join(", ")})</button></div>`:""}</div>
   </div>
   <div id="fundList"></div>`;
  const set=(k,v)=>{F[k]=v;save();renderFundList()};
  $("fCountry").onchange=e=>set("country",e.target.value);$("fSponsor").onchange=e=>set("sponsor",e.target.value);
  $("fWindow").onchange=e=>set("window",e.target.value);$("fSort").onchange=e=>set("sort",e.target.value);
  {let t;$("fQ").oninput=e=>{clearTimeout(t);t=setTimeout(()=>set("q",e.target.value),200)}}
  $("fForecast").onchange=e=>set("forecast",e.target.checked);
  document.querySelectorAll("[data-ftype]").forEach(b=>b.onclick=()=>{const t=b.dataset.ftype;F.types=F.types.includes(t)?F.types.filter(x=>x!==t):[...F.types,t];save();renderFunding()});
  document.querySelectorAll("[data-ffield]").forEach(b=>b.onclick=()=>{const t=b.dataset.ffield;F.fields=F.fields.includes(t)?F.fields.filter(x=>x!==t):[...F.fields,t];save();renderFunding()});
  document.querySelectorAll("[data-comb]").forEach(b=>b.onclick=()=>{F.combine=b.dataset.comb;save();renderFunding()});
  const fm=$("fMine");if(fm)fm.onclick=()=>{F.fields=[...ALL.modes.grant.fields];save();renderFunding()};
  renderFundList();
}
function renderFundList(){
  const el=$("fundList");if(!el)return;
  if(ui.grants==null){el.innerHTML=`<div class="notice info dots">Loading grants</div>`;return}
  if(!ui.grants.length){el.innerHTML=`<div class="panel"><b>No grants stored yet.</b><p class="muted" style="margin:6px 0 0">The morning routine adds open calls here. Ask Claude in your session to refresh the funding finder to fill it now.</p></div>`;return}
  const list=filteredGrants();const hasProp=!!ALL.modes.grant.docs.proposal.text.trim()||(ALL.modes.grant.fields||[]).length;
  el.innerHTML=`<div class="muted" style="margin:4px 2px 10px;font-size:12.5px">${list.length} of ${ui.grants.length} calls match your filters.</div>`+(list.length?`<div style="display:grid;gap:10px">${list.map((g,k)=>{const dl=daysLeft(g.deadline);const m=hasProp?grantMatch(g):null;
    return `<article class="panel" style="display:grid;gap:8px;padding:14px 16px">
      <div class="row" style="justify-content:space-between;align-items:flex-start"><div style="min-width:0;flex:1"><div class="eyebrow">${esc(g.sponsor||"")} · ${esc(g.sponsorType||"")} · ${esc((g.countries||[g.country]).join(", "))}</div><h3 style="margin-top:2px">${esc(g.title)}</h3></div>
        <div class="row" style="gap:6px">${g.status==="rolling"?`<span class="pill acc">Rolling</span>`:g.status==="forecast"?`<span class="pill">Forecast</span>`:dl!=null?`<span class="pill ${dl<=14?"bad":dl<=45?"warn":"ok"}">${dl===0?"Due today":dl+" days left"}</span>`:`<span class="pill">Check date</span>`}${m!=null?`<span class="pill ${m>=50?"ok":m>=25?"warn":""}">${m}% match</span>`:""}</div></div>
      <div class="row" style="gap:16px;font-size:13px"><span><b>Deadline:</b> ${g.deadline?new Date(g.deadline+"T12:00:00").toLocaleDateString([], {dateStyle:"medium"}):"—"}${g.deadlineNote?` <span class="muted">(${esc(g.deadlineNote)})</span>`:""}</span>${g.amount?`<span><b>Award:</b> ${esc(g.amount)}</span>`:""}</div>
      ${g.summary?`<div style="font-size:13.5px">${esc(g.summary)}</div>`:""}${g.eligibility?`<div class="muted" style="font-size:12.5px"><b>Eligibility:</b> ${esc(g.eligibility)}</div>`:""}
      <div class="chips" style="margin:0">${(g.fields||[]).map(f=>`<span class="chip">${esc(f)}</span>`).join("")}</div>
      <div class="row" style="justify-content:space-between"><span class="muted" style="font-size:11.5px">${g.sourceType==="aggregator"?"From a grant listing site; confirm on the funder's page.":"From the funder's page."}${g.updated?` Checked ${esc(g.updated)}.`:""}</span>
        <span class="row" style="gap:6px">${g.url?`<a class="btn small" href="${esc(g.url)}" target="_blank" rel="noopener">Open call ↗</a>`:""}<button class="btn small" data-target="${esc(g.id)}">Use as my funding target</button></span></div></article>`}).join("")}</div>`:`<div class="panel muted">Nothing matches. Clear a filter or switch the country to “All countries”.</div>`);
  el.querySelectorAll("[data-target]").forEach(b=>b.onclick=()=>{const g=ui.grants.find(x=>x.id===b.dataset.target);if(!g)return;const st=ALL.modes.grant;
    st.job={title:g.title,dept:g.sponsor,univ:(g.fields||[]).join(", "),ad:[g.summary,g.eligibility?("Eligibility: "+g.eligibility):"",g.amount?("Award: "+g.amount):"",g.deadline?("Deadline: "+g.deadline):"",g.url?("Call: "+g.url):""].filter(Boolean).join("\n")};
    save();switchMode("grant");toast("Set as your funding target. Upload the full RFA for exact rules.")});
}

/* ---------- RFA rules + fields for grant mode ---------- */
function rfaPrompt(text){return `Extract the rules from this funding solicitation (RFA / NOFO / program description). Return ONLY JSON. Use null or [] when the document does not say; never guess.
"""
${text.slice(0,90000)}
"""
{"agency":"","program":"","number":"solicitation or NOFO number","deadlines":[{"label":"Full proposal","date":"YYYY-MM-DD","time":"5 p.m. local"}],"award":{"max":"e.g. $650,000 total","duration":"e.g. 3 years","maxDollars":650000,"years":3,"count":"expected number of awards"},
"page_limits":[{"section":"Project Description","limit":"15 pages","pages":15}],"formatting":{"font":"","size":"","margins":"","spacing":"","other":[]},"required_sections":["..."],"review_criteria":["..."],"priorities":["program priority areas"],"eligibility":["..."],"budget_rules":["..."],"submission":["portal, registrations, letters of intent, limits per institution"],"fields":["fields of study this call targets"]}`}
function fieldsPrompt(text,rfa){return `Which fields of study does this grant proposal belong to, and which of them fit best for funding? Choose from this list where possible: ${FIELDS.join(", ")}. You may add up to 2 other fields if none fit. ${rfa?`The target solicitation is ${rfa.agency||""} ${rfa.program||""}.`:""}
Proposal excerpt:
"""
${text.slice(0,12000)}
"""
Return ONLY JSON: {"fields":[{"field":"Robotics","fit":0-100,"why":"one short reason"}]} with 3-8 entries, best fit first.`}
function renderRfaArea(){
  const host=$("rfaArea");if(!host)return;if(MODE!=="grant"){host.innerHTML="";return}
  const R=S.rfa;const sel=S.fields||[];const sug=S.fieldSug||[];
  host.innerHTML=`<div style="display:grid;gap:12px;margin-top:14px;border-top:1px solid var(--line);padding-top:14px">
    <div class="row" style="justify-content:space-between"><div><b>Funding agency rules (RFA / NOFO)</b><div class="muted" style="font-size:12px">Upload the solicitation PDF or DOCX. Claude pulls out deadlines, page limits, formatting, required sections and review criteria, and the review then checks your proposal against them.</div></div>
      <span class="row"><label class="btn small" for="rfaFile">${S.rfaName?"Replace RFA":"Upload RFA"}</label><input type="file" id="rfaFile" accept=".pdf,.docx,.txt,.md" hidden>
      ${S.rfaText?`<button class="btn small primary" id="rfaRun" ${ui.rfaBusy||claudeState!=="ready"?"disabled":""}>${ui.rfaBusy?"Reading rules…":R?"Extract again":"Extract rules"}</button>`:""}</span></div>
    ${S.rfaName?`<div class="muted" style="font-size:12px">${esc(S.rfaName)} · ${words(S.rfaText||"").length} words</div>`:""}
    ${R?rfaRulesHTML(R):""}
    <div><b>Fields of study</b> <span class="muted" style="font-size:12px">Pick the fields your proposal fits. They weight the funded-proposal comparison and the funding finder match.</span>
      <div class="row" style="margin-top:6px">${ALL.modes.grant.docs.proposal.text.trim()?`<button class="btn small" id="fieldRun" ${ui.fieldBusy||claudeState!=="ready"?"disabled":""}>${ui.fieldBusy?"Thinking…":"Suggest fields from my proposal"}</button>`:`<span class="muted" style="font-size:12px">Add your Project Narrative to get suggestions.</span>`}</div>
      ${sug.length?`<div class="chips">${sug.map(s=>`<button class="tg" data-fsel="${esc(s.field)}" aria-pressed="${sel.includes(s.field)}" title="${esc(s.why||"")}">${esc(s.field)} · ${s.fit}%</button>`).join("")}</div>`:""}
      <div class="filters" style="margin-top:8px">${[...new Set([...FIELDS,...sel])].map(f=>`<button class="tg" data-fsel="${esc(f)}" aria-pressed="${sel.includes(f)}">${esc(f)}</button>`).join("")}</div></div></div>`;
  $("rfaFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const t=await readFile(f);S.rfaText=t.slice(0,150000);S.rfaName=f.name;if(!S.job.ad.trim())S.job.ad=t.slice(0,7000);save();renderPos();renderRfaArea()}catch(x){toast(x.message||"Couldn't read that file.")}};
  const rr=$("rfaRun");if(rr)rr.onclick=async()=>{ui.rfaBusy=true;renderRfaArea();
    try{const r=await sampleFn.json(rfaPrompt(S.rfaText),{modelTier:"default"});S.rfa=r||{};if(r&&r.program&&!S.job.title)S.job.title=r.program;if(r&&r.agency&&!S.job.dept)S.job.dept=r.agency;S.job.ad=S.rfaText.slice(0,7000);save();renderPos()}
    catch(e){if(!(e&&e.code==="cancelled"))toast(ERR[e&&e.code]||"Couldn't read the rules. Try again.")}finally{ui.rfaBusy=false;renderRfaArea()}};
  const fr=$("fieldRun");if(fr)fr.onclick=async()=>{ui.fieldBusy=true;renderRfaArea();
    try{const r=await sampleFn.json(fieldsPrompt(ALL.modes.grant.docs.proposal.text,S.rfa),{modelTier:"quick"});S.fieldSug=(Array.isArray(r.fields)?r.fields:[]).map(x=>({field:String(x.field),fit:Math.round(+x.fit||0),why:String(x.why||"")})).slice(0,8);
      if(!(S.fields||[]).length)S.fields=S.fieldSug.filter(x=>x.fit>=60).map(x=>x.field);save()}
    catch(e){if(!(e&&e.code==="cancelled"))toast(ERR[e&&e.code]||"Couldn't suggest fields. Try again.")}finally{ui.fieldBusy=false;renderRfaArea()}};
  host.querySelectorAll("[data-fsel]").forEach(b=>b.onclick=()=>{const f=b.dataset.fsel;S.fields=S.fields||[];S.fields=S.fields.includes(f)?S.fields.filter(x=>x!==f):[...S.fields,f];S.job.univ=S.fields.join(", ");save();renderPos();renderRfaArea()});
  const ab=$("rfaBudget");if(ab)ab.onclick=()=>{const a=S.rfa.award||{};if(+a.maxDollars)ALL.budget.cap=+a.maxDollars;if(+a.years)ALL.budget.years=Math.round(+a.years);save();renderStrip();toast("Budget cap and duration set from the RFA")};
}
function rfaRulesHTML(R){const A=R.award||{};const list=(t,a)=>a&&a.length?`<div><b style="font-size:12.5px">${t}</b><ul class="clean" style="margin-top:4px;font-size:12.5px">${a.map(x=>`<li>${esc(typeof x==="string"?x:JSON.stringify(x))}</li>`).join("")}</ul></div>`:"";
  const fm=R.formatting||{};
  return `<div class="glass" style="padding:12px;border-radius:12px;display:grid;gap:10px">
    <div class="row" style="justify-content:space-between"><b>${esc([R.agency,R.program,R.number].filter(Boolean).join(" · ")||"Extracted rules")}</b>${+A.maxDollars||+A.years?`<button class="btn small" id="rfaBudget">Use award cap and duration in budget</button>`:""}</div>
    <div class="row" style="gap:14px;font-size:13px">${(R.deadlines||[]).map(d=>`<span><b>${esc(d.label||"Deadline")}:</b> ${esc(d.date||"")} ${esc(d.time||"")}</span>`).join("")}${A.max?`<span><b>Award:</b> ${esc(A.max)}${A.duration?` · ${esc(A.duration)}`:""}</span>`:""}</div>
    <div class="cols3">${list("Page limits",(R.page_limits||[]).map(p=>`${p.section}: ${p.limit}`))}${list("Formatting",[fm.font,fm.size,fm.margins,fm.spacing,...(fm.other||[])].filter(Boolean))}${list("Required sections",R.required_sections)}</div>
    <div class="cols3">${list("Review criteria",R.review_criteria)}${list("Program priorities",R.priorities)}${list("Eligibility & submission",[...(R.eligibility||[]),...(R.submission||[])])}</div>
    ${list("Budget rules",R.budget_rules)}</div>`}
function rfaPromptBlock(){const R=S.rfa;if(MODE!=="grant"||!R)return"";
  return `\n- FUNDING AGENCY RULES extracted from the solicitation: ${JSON.stringify({page_limits:R.page_limits,formatting:R.formatting,required_sections:R.required_sections,review_criteria:R.review_criteria,priorities:R.priorities,budget_rules:R.budget_rules,award:R.award}).slice(0,6000)}\n  Check compliance with each rule that applies to this document and return "rfa_compliance":[{"rule":"short rule","status":"met"|"partial"|"missing","note":"what to fix"}] (max 20). Score "fit" against these review criteria and priorities.${(S.fields||[]).length?`\n- The applicant positions this proposal in: ${S.fields.join(", ")}.`:""}`}
function rfaComplianceHTML(ai,d){const rc=ai&&Array.isArray(ai.rfa_compliance)?ai.rfa_compliance:[];const R=S.rfa;if(!rc.length&&!R)return"";
  const pages=+(words(d.text).length/550).toFixed(1);const lim=R&&(R.page_limits||[]).find(p=>/description|narrative|research strategy|project/i.test(p.section||""));
  return `<section class="panel" style="display:grid;gap:10px"><div><div class="eyebrow">Funding agency rules</div><h3>RFA compliance</h3></div>
    ${lim&&+lim.pages?`<div class="notice ${pages>+lim.pages?"bad":"ok"}">About ${pages} pages at ~550 words per page. Limit for ${esc(lim.section)}: ${esc(lim.limit)}.</div>`:""}
    ${rc.length?`<div class="btable"><table><tbody>${rc.map(r=>`<tr><td><span class="pill ${r.status==="met"?"ok":r.status==="partial"?"warn":"bad"}">${r.status==="met"?"Met":r.status==="partial"?"Partly":"Missing"}</span></td><td><b>${esc(r.rule||"")}</b><div class="muted" style="font-size:12.5px">${esc(r.note||"")}</div></td></tr>`).join("")}</tbody></table></div>`:`<p class="muted" style="margin:0">Review the proposal to check it against these rules.</p>`}</section>`}
