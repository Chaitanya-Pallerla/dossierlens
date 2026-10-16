/* Grant budget calculator and splitter: personnel by headcount, equipment with links, other directs,
   escalation, fringe, tuition, F&A on MTDC (equipment, tuition, participant support and subaward over $25k excluded). */
const BUD_CATS={faculty:"Faculty / PI",postdoc:"Postdoc",grad:"Graduate student",undergrad:"Undergraduate",staff:"Technician / staff"};
const BUD_UNITS={year:"per year × FTE",month:"per month × months",hour:"per hour × hours"};
function budgetDefaults(){return{
  years:3,escal:3,fa:50,cap:"",note:"Example rates. Replace with your institution's salary, fringe, tuition and F&A rates.",
  fringe:{faculty:28,postdoc:30,grad:10,undergrad:2,staff:35},
  personnel:[
   {role:"PI (summer salary)",cat:"faculty",n:1,base:12200,unit:"month",qty:1,from:1,to:3},
   {role:"Graduate research assistant",cat:"grad",n:2,base:30000,unit:"year",qty:1,from:1,to:3,tuition:15000},
   {role:"Undergraduate researchers",cat:"undergrad",n:2,base:15,unit:"hour",qty:400,from:1,to:3},
   {role:"Postdoctoral researcher",cat:"postdoc",n:0,base:62000,unit:"year",qty:1,from:1,to:2}],
  equipment:[
   {name:"Hyperspectral camera",link:"",cost:28000,qty:1,year:1},
   {name:"Edge computing boards",link:"",cost:250,qty:6,year:1}],
  other:{supplies:6000,travelTrips:2,travelCost:2200,publication:3000,participant:0,computing:1500,other:0},
  subawards:[],
  aims:[{name:"Aim 1",pct:40},{name:"Aim 2",pct:35},{name:"Aim 3",pct:25}]}}
const money=v=>"$"+Math.round(v).toLocaleString("en-US");
function calcBudget(B){
  const Y=Math.max(1,Math.min(10,+B.years||1));const g=1+(+B.escal||0)/100;
  const rows={};const add=(k,y,v)=>{(rows[k]=rows[k]||Array(Y).fill(0))[y]+=v};
  let studentYears=0;
  B.personnel.forEach(p=>{for(let y=0;y<Y;y++){if(y+1<(+p.from||1)||y+1>(+p.to||Y))continue;
    const sal=(+p.n||0)*(+p.base||0)*(+p.qty||0)*Math.pow(g,y);
    add("Salaries & wages",y,sal);add("Fringe benefits",y,sal*((B.fringe[p.cat]||0)/100));
    if(p.cat==="grad"){add("Tuition remission",y,(+p.n||0)*(+p.tuition||0)*Math.pow(g,y));studentYears+=(+p.n||0)}
    if(p.cat==="undergrad")studentYears+=(+p.n||0)*0}});
  B.equipment.forEach(e=>{const y=Math.min(Y,Math.max(1,+e.year||1))-1;const unit=+e.cost||0,tot=unit*(+e.qty||0);
    add(unit>=5000?"Equipment (≥$5,000/unit)":"Materials & supplies",y,tot)});
  const o=B.other;
  for(let y=0;y<Y;y++){const f=Math.pow(g,y);
    add("Materials & supplies",y,(+o.supplies||0)*f);add("Travel",y,(+o.travelTrips||0)*(+o.travelCost||0)*f);
    add("Publication & dissemination",y,(+o.publication||0)*f);add("Participant support",y,(+o.participant||0));
    add("Computing & services",y,(+o.computing||0)*f);add("Other direct",y,(+o.other||0)*f)}
  let subFaUsed=0;const subFA=Array(Y).fill(0);
  (B.subawards||[]).forEach(s=>{let left=25000;for(let y=0;y<Y;y++){const v=(+s.amount||0)/Y;add("Subawards",y,v);const fa=Math.min(left,v);subFA[y]+=fa;left-=fa}});
  const direct=Array(Y).fill(0);Object.values(rows).forEach(r=>r.forEach((v,y)=>direct[y]+=v));
  const excl=y=>(rows["Equipment (≥$5,000/unit)"]||[])[y]+(rows["Tuition remission"]||[])[y]+(rows["Participant support"]||[])[y]+(rows["Subawards"]||[])[y]-subFA[y];
  const mtdc=direct.map((v,y)=>v-(excl(y)||0));const fa=mtdc.map(v=>v*(+B.fa||0)/100);
  const total=direct.map((v,y)=>v+fa[y]);const T=total.reduce((a,b)=>a+b,0);
  const sum=k=>(rows[k]||[]).reduce((a,b)=>a+b,0);
  const personnel=sum("Salaries & wages")+sum("Fringe benefits")+sum("Tuition remission");
  const grads=B.personnel.filter(p=>p.cat==="grad").reduce((a,p)=>a+(+p.n||0),0);
  const unders=B.personnel.filter(p=>p.cat==="undergrad").reduce((a,p)=>a+(+p.n||0),0);
  const cap=+B.cap||0;
  return{Y,rows,direct,mtdc,fa,total,T,personnel,personnelPct:T?personnel/T*100:0,
    gradYears:studentYears,grads,unders,cap,overCap:cap&&T>cap?T-cap:0,
    aims:(B.aims||[]).map(a=>({name:a.name,pct:+a.pct||0,amt:T*(+a.pct||0)/100})),
    aimPct:(B.aims||[]).reduce((a,b)=>a+(+b.pct||0),0)};
}
function budgetSummary(B){const c=calcBudget(B);
  return `Budget (from the applicant's calculator): ${c.Y} years, total ${money(c.T)} (direct ${money(c.direct.reduce((a,b)=>a+b,0))}, F&A ${money(c.fa.reduce((a,b)=>a+b,0))} at ${B.fa}% MTDC)${c.cap?`, cap ${money(c.cap)}${c.overCap?` (OVER by ${money(c.overCap)})`:""}`:""}. Personnel ${c.personnelPct.toFixed(0)}% of total. Team: ${B.personnel.filter(p=>+p.n>0).map(p=>`${p.n} × ${p.role} (Y${p.from}–Y${p.to})`).join("; ")}. Equipment: ${B.equipment.map(e=>`${e.qty} × ${e.name} ${money(e.cost)}`).join("; ")||"none"}. Aim split: ${c.aims.map(a=>`${a.name} ${a.pct}%`).join(", ")}.`}
function budgetCSV(B){const c=calcBudget(B);const hdr=["Category",...Array.from({length:c.Y},(_,y)=>"Year "+(y+1)),"Total"];
  const line=(k,arr)=>[k,...arr.map(v=>Math.round(v)),Math.round(arr.reduce((a,b)=>a+b,0))];
  const out=[hdr,...Object.entries(c.rows).map(([k,a])=>line(k,a)),line("Total direct",c.direct),line("MTDC base",c.mtdc),line(`F&A (${B.fa}%)`,c.fa),line("TOTAL",c.total),[],["Aim","Percent","Amount"],...c.aims.map(a=>[a.name,a.pct,Math.round(a.amt)]),[],["Equipment","Link","Unit cost","Qty","Year"],...B.equipment.map(e=>[e.name,e.link,e.cost,e.qty,e.year])];
  return out.map(r=>r.map(v=>{v=String(v??"");return /[",\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v}).join(",")).join("\n")}

function renderBudget(B){
  const c=calcBudget(B);const yrs=Array.from({length:c.Y},(_,y)=>y);
  const num=(path,v,w=90,step="any")=>`<input type="number" class="bin" data-b="${path}" value="${esc(v??"")}" step="${step}" style="width:${w}px" aria-label="${esc(path)}">`;
  const txt=(path,v,w=170,ph="")=>`<input type="text" class="bin" data-b="${path}" value="${esc(v??"")}" placeholder="${esc(ph)}" style="width:${w}px" aria-label="${esc(path)}">`;
  const sel=(path,v,opts)=>`<select class="bin" data-b="${path}" style="width:auto">${Object.entries(opts).map(([k,l])=>`<option value="${k}" ${v===k?"selected":""}>${esc(l)}</option>`).join("")}</select>`;
  const warn=[];
  if(c.overCap)warn.push(`Total is ${money(c.overCap)} over the ${money(c.cap)} cap.`);
  if(c.aimPct!==100)warn.push(`Aim percentages add up to ${c.aimPct}%, not 100%.`);
  if(c.personnelPct>85)warn.push(`Personnel is ${c.personnelPct.toFixed(0)}% of the budget; little is left for equipment, supplies and fieldwork.`);
  if(c.grads===0&&c.unders===0)warn.push("No students budgeted; reviewers expect training and workforce development.");
  return `<div class="cols" style="align-items:start">
   <div class="panel" style="display:grid;gap:12px;min-width:0">
     <h3>Settings</h3><p class="muted" style="margin:0;font-size:12px">${esc(B.note)}</p>
     <div class="row">${[["Years","years",B.years,60,"1"],["Annual escalation %","escal",B.escal,70],["F&A rate % (MTDC)","fa",B.fa,70],["Budget cap $","cap",B.cap,120]].map(([l,p,v,w,s])=>`<label class="bl">${l}${num(p,v,w,s)}</label>`).join("")}</div>
     <div class="row">${Object.keys(B.fringe).map(k=>`<label class="bl">Fringe % · ${BUD_CATS[k]}${num("fringe."+k,B.fringe[k],70)}</label>`).join("")}</div>
     <h3>People</h3>
     <div class="btable"><table><thead><tr><th>Role</th><th>Type</th><th>#</th><th>Rate $</th><th>Unit</th><th>FTE / months / hours</th><th>Years</th><th>Tuition $/yr</th><th></th></tr></thead><tbody>
       ${B.personnel.map((p,i)=>`<tr><td>${txt(`personnel.${i}.role`,p.role,160)}</td><td>${sel(`personnel.${i}.cat`,p.cat,BUD_CATS)}</td><td>${num(`personnel.${i}.n`,p.n,54,"1")}</td><td>${num(`personnel.${i}.base`,p.base,90)}</td><td>${sel(`personnel.${i}.unit`,p.unit,BUD_UNITS)}</td><td>${num(`personnel.${i}.qty`,p.qty,70)}</td><td class="nowrap">Y${num(`personnel.${i}.from`,p.from,48,"1")}–Y${num(`personnel.${i}.to`,p.to,48,"1")}</td><td>${p.cat==="grad"?num(`personnel.${i}.tuition`,p.tuition||0,90):"—"}</td><td><button class="dismiss" data-bdel="personnel.${i}" aria-label="Remove row">✕</button></td></tr>`).join("")}
     </tbody></table></div><button class="btn small" data-badd="personnel">+ Add person</button>
     <h3>Equipment and items</h3>
     <div class="btable"><table><thead><tr><th>Item</th><th>Link (vendor or quote)</th><th>Unit $</th><th>Qty</th><th>Year</th><th>Type</th><th></th></tr></thead><tbody>
       ${B.equipment.map((e,i)=>`<tr><td>${txt(`equipment.${i}.name`,e.name,150)}</td><td>${txt(`equipment.${i}.link`,e.link,170,"https://…")}${/^https?:\/\//.test(e.link||"")?` <a href="${esc(e.link)}" target="_blank" rel="noopener">open</a>`:""}</td><td>${num(`equipment.${i}.cost`,e.cost,90)}</td><td>${num(`equipment.${i}.qty`,e.qty,54,"1")}</td><td>${num(`equipment.${i}.year`,e.year,54,"1")}</td><td><span class="pill ${(+e.cost||0)>=5000?"acc":""}">${(+e.cost||0)>=5000?"Equipment":"Supplies"}</span></td><td><button class="dismiss" data-bdel="equipment.${i}" aria-label="Remove item">✕</button></td></tr>`).join("")}
     </tbody></table></div><button class="btn small" data-badd="equipment">+ Add item</button>
     <h3>Other direct costs (per year)</h3>
     <div class="row">${[["Supplies $","supplies"],["Trips / yr","travelTrips"],["$ per trip","travelCost"],["Publication $","publication"],["Participant support $","participant"],["Computing $","computing"],["Other $","other"]].map(([l,k])=>`<label class="bl">${l}${num("other."+k,B.other[k],100)}</label>`).join("")}</div>
     <h3>Subawards (total over the project)</h3>
     ${(B.subawards||[]).map((s,i)=>`<div class="row">${txt(`subawards.${i}.name`,s.name,170,"Partner institution")}${num(`subawards.${i}.amount`,s.amount,110)}<button class="dismiss" data-bdel="subawards.${i}">✕</button></div>`).join("")}<button class="btn small" data-badd="subawards">+ Add subaward</button>
     <h3>Split by aim</h3>
     ${B.aims.map((a,i)=>`<div class="row">${txt(`aims.${i}.name`,a.name,200)}<label class="bl" style="flex-direction:row;align-items:center;gap:6px">${num(`aims.${i}.pct`,a.pct,70)}%</label><span class="mono">${money(c.aims[i]?c.aims[i].amt:0)}</span><button class="dismiss" data-bdel="aims.${i}">✕</button></div>`).join("")}<button class="btn small" data-badd="aims">+ Add aim</button>
   </div>
   <div style="display:grid;gap:12px;min-width:0;position:sticky;top:12px">
     <div class="pkt"><div class="eyebrow">Total request</div><div class="big">${money(c.T)}</div><div style="font-size:12px;opacity:.85">${c.Y} years · ${money(c.T/c.Y)} per year · personnel ${c.personnelPct.toFixed(0)}%</div></div>
     ${warn.map(w=>`<div class="notice">${esc(w)}</div>`).join("")}
     <div class="panel btable"><table class="sum"><thead><tr><th>Category</th>${yrs.map(y=>`<th>Y${y+1}</th>`).join("")}<th>Total</th></tr></thead><tbody>
      ${Object.entries(c.rows).filter(([,a])=>a.some(v=>v)).map(([k,a])=>`<tr><td>${esc(k)}</td>${a.map(v=>`<td>${money(v)}</td>`).join("")}<td><b>${money(a.reduce((x,y)=>x+y,0))}</b></td></tr>`).join("")}
      <tr class="sub"><td>Total direct</td>${c.direct.map(v=>`<td>${money(v)}</td>`).join("")}<td><b>${money(c.direct.reduce((a,b)=>a+b,0))}</b></td></tr>
      <tr><td>MTDC base</td>${c.mtdc.map(v=>`<td>${money(v)}</td>`).join("")}<td>${money(c.mtdc.reduce((a,b)=>a+b,0))}</td></tr>
      <tr><td>F&amp;A (${esc(B.fa)}%)</td>${c.fa.map(v=>`<td>${money(v)}</td>`).join("")}<td>${money(c.fa.reduce((a,b)=>a+b,0))}</td></tr>
      <tr class="tot"><td>Total</td>${c.total.map(v=>`<td>${money(v)}</td>`).join("")}<td>${money(c.T)}</td></tr></tbody></table></div>
     <div class="panel"><h3>Split by aim</h3>${c.aims.map(a=>`<div class="sub" style="margin-top:8px"><div class="l"><span>${esc(a.name)}</span><b>${money(a.amt)}</b></div><div class="bar"><i style="width:${Math.min(100,a.pct)}%"></i></div></div>`).join("")}
       <div class="stat" style="margin-top:10px"><span>Graduate students</span><b class="mono">${c.grads}</b></div><div class="stat"><span>Undergraduates</span><b class="mono">${c.unders}</b></div><div class="stat"><span>Cost per graduate student-year</span><b class="mono">${c.gradYears?money(calcGradCost(B)/c.gradYears):"—"}</b></div></div>
     <div class="row"><button class="btn" id="budCsv">Download budget (.csv)</button><button class="btn" id="budCopy">Copy table</button><button class="btn" id="budReset">Reset to example</button></div>
   </div></div>`;
}
function calcGradCost(B){const g=1+(+B.escal||0)/100;let t=0;B.personnel.filter(p=>p.cat==="grad").forEach(p=>{for(let y=(+p.from||1)-1;y<Math.min(+B.years,+p.to||B.years);y++){const s=(+p.n||0)*(+p.base||0)*(+p.qty||0)*Math.pow(g,y);t+=s*(1+(B.fringe.grad||0)/100)+(+p.n||0)*(+p.tuition||0)*Math.pow(g,y)}});return t}
function setPath(o,path,v){const ks=path.split(".");let x=o;for(let i=0;i<ks.length-1;i++)x=x[ks[i]];const k=ks[ks.length-1];x[k]=typeof x[k]==="number"||/^(n|base|qty|from|to|tuition|cost|year|pct|amount|years|escal|fa)$/.test(k)||ks[0]==="fringe"||ks[0]==="other"?(v===""?"":+v):v}
function wireBudget(B,rerender){
  document.querySelectorAll(".bin").forEach(el=>el.onchange=()=>{setPath(B,el.dataset.b,el.value);save();rerender()});
  document.querySelectorAll("[data-badd]").forEach(b=>b.onclick=()=>{const k=b.dataset.badd;const blank={personnel:{role:"New role",cat:"grad",n:1,base:30000,unit:"year",qty:1,from:1,to:+B.years||1,tuition:15000},equipment:{name:"New item",link:"",cost:1000,qty:1,year:1},subawards:{name:"",amount:50000},aims:{name:`Aim ${B.aims.length+1}`,pct:0}}[k];(B[k]=B[k]||[]).push(blank);save();rerender()});
  document.querySelectorAll("[data-bdel]").forEach(b=>b.onclick=()=>{const [k,i]=b.dataset.bdel.split(".");B[k].splice(+i,1);save();rerender()});
  const csv=document.getElementById("budCsv");if(csv)csv.onclick=()=>saveFile("budget.csv",new Blob([budgetCSV(B)],{type:"text/csv"}));
  const cp=document.getElementById("budCopy");if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(budgetCSV(B).replace(/,/g,"\t"));toast("Budget copied; paste into Excel")}catch(e){toast("Copy was blocked; use Download instead")}};
  const rs=document.getElementById("budReset");if(rs)rs.onclick=()=>{Object.assign(B,budgetDefaults());save();rerender()};
}
