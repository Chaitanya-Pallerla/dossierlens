/* Word export with tracked changes. Compares the reviewed text (base) with the current text word by word
   (Myers diff) and writes insertions as <w:ins> and deletions as <w:del>, so Word shows each accepted
   suggestion as a change the user can accept or reject. Track Changes stays on for further edits. */
function dlTokens(text){
  const out=[];text.split(/\n+/).map(p=>p.trim()).filter(Boolean).forEach((p,i)=>{if(i)out.push("\n");p.split(/(\s+)/).forEach(t=>{if(t)out.push(t)})});
  return out;
}
function dlMyers(a,b){
  const n=a.length,m=b.length,max=n+m,off=max+1,trace=[];let v=new Int32Array(2*max+3);
  outer:for(let d=0;d<=max;d++){
    trace.push(v.slice());
    for(let k=-d;k<=d;k+=2){
      let x=(k===-d||(k!==d&&v[off+k-1]<v[off+k+1]))?v[off+k+1]:v[off+k-1]+1;let y=x-k;
      while(x<n&&y<m&&a[x]===b[y]){x++;y++}
      v[off+k]=x;if(x>=n&&y>=m)break outer;
    }
  }
  const ops=[];let x=n,y=m;
  for(let d=trace.length-1;d>=0;d--){
    const vv=trace[d],k=x-y;
    const pk=(k===-d||(k!==d&&vv[off+k-1]<vv[off+k+1]))?k+1:k-1;
    const px=vv[off+pk],py=px-pk;
    while(x>px&&y>py){ops.push(["=",a[x-1]]);x--;y--}
    if(d>0){if(x===px)ops.push(["+",b[y-1]]);else ops.push(["-",a[x-1]])}
    x=px;y=py;
  }
  return ops.reverse();
}
function dlTrackedBody(base,text,run){
  const ops=dlMyers(dlTokens(base),dlTokens(text));
  const date=new Date().toISOString().replace(/\.\d+Z$/,"Z");let id=1;
  const paras=[];let cur=[];
  for(const [t,v] of ops){
    if(v==="\n"){if(t==="-")continue;paras.push(cur);cur=[];continue}
    const last=cur[cur.length-1];if(last&&last[0]===t)last[1]+=v;else cur.push([t,v]);
  }
  paras.push(cur);
  // Readability: absorb tiny unchanged pieces (1-2 short words) between changes, then show each changed
  // stretch as one deletion followed by one insertion, the way Word's own compare does.
  const tidy=segs=>{const out=[];let del="",ins="",open=false;
    const flush=()=>{if(del)out.push(["-",del]);if(ins)out.push(["+",ins]);del="";ins="";open=false};
    segs.forEach((s,i)=>{
      if(s[0]==="="){const next=segs[i+1];const small=open&&next&&next[0]!=="="&&s[1].trim().split(/\s+/).filter(Boolean).length<=2&&s[1].length<=14;
        if(small){del+=s[1];ins+=s[1];return}flush();out.push(s);return}
      open=true;if(s[0]==="-")del+=s[1];else ins+=s[1]});
    flush();return out};
  const xml=paras.filter(p=>p.length).map(tidy).map(segs=>{
    const finalText=segs.filter(s=>s[0]!=="-").map(s=>s[1]).join("").trim();
    const head=finalText.length<90&&!/[.,;:]$/.test(finalText)&&(headType(finalText)||/^[A-Z][A-Za-z ,&/-]{2,60}$/.test(finalText)&&finalText.split(" ").length<=8);
    const inner=segs.map(([t,v])=>{
      if(t==="-")return `<w:del w:id="${id++}" w:author="DossierLens" w:date="${date}"><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>${head?"<w:b/>":""}<w:sz w:val="22"/></w:rPr><w:delText xml:space="preserve">${xmlEsc(v)}</w:delText></w:r></w:del>`;
      const runs=v.split(/(\[[^\]\n]{1,80}\])/).map((p,i)=>p?run(p,{b:head,hl:i%2===1}):"").join("");
      return t==="+"?`<w:ins w:id="${id++}" w:author="DossierLens" w:date="${date}">${runs}</w:ins>`:runs;
    }).join("");
    return `<w:p><w:pPr><w:spacing w:after="${head?80:160}" w:line="276" w:lineRule="auto"/></w:pPr>${inner}</w:p>`;
  }).join("");
  return{xml,changes:id-1};
}
