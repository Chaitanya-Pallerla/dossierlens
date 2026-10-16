/* DossierLens provider adapter.
   Inside claude.ai the page uses the viewer's Claude account (window.claude). Anywhere else
   (GitHub Pages, a local file, a local server) it can use the viewer's own API key for
   Anthropic Claude or OpenAI, stored only in this browser. It exposes the same small
   interface the page already uses: sample(input, opts) -> {text}, sample.json(), sample.limits(). */
const DL_PROVIDER_KEY="dossierlens-provider-v1";
const DL_PROVIDERS={
  anthropic:{label:"Claude (Anthropic API key)",model:"claude-sonnet-5-5",keyHint:"sk-ant-…",keysUrl:"https://console.anthropic.com/settings/keys"},
  openai:{label:"ChatGPT / OpenAI (API key)",model:"gpt-6-astra",keyHint:"sk-…",keysUrl:"https://platform.openai.com/api-keys"}};
function dlLoadProvider(){try{return JSON.parse(localStorage.getItem(DL_PROVIDER_KEY)||"null")}catch(e){return null}}
function dlSaveProvider(p){try{p?localStorage.setItem(DL_PROVIDER_KEY,JSON.stringify(p)):localStorage.removeItem(DL_PROVIDER_KEY)}catch(e){}}
const dlBlobToB64=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=rej;r.readAsDataURL(b)});
function dlParseJSON(text){
  const t=String(text||"").trim();try{return JSON.parse(t)}catch(e){}
  const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f){try{return JSON.parse(f[1])}catch(e){}}
  const a=Math.min(...["{","["].map(c=>{const i=t.indexOf(c);return i<0?1e9:i})),b=Math.max(t.lastIndexOf("}"),t.lastIndexOf("]"));
  if(a<b){try{return JSON.parse(t.slice(a,b+1))}catch(e){}}
  throw{code:"invalid_json",message:"The reply was not valid JSON.",text:t};
}
function dlMakeSample(cfg){
  if(!cfg||!cfg.key)return null;
  const prov=cfg.provider==="openai"?"openai":"anthropic";
  async function call(input,opts={}){
    const turns=typeof input==="string"?[{role:"user",content:input}]:input;
    const imgs=opts.images?[...(opts.images.length!=null?opts.images:[opts.images])]:[];
    const last=turns[turns.length-1].content;const json=!!opts._json;
    const note=json?"\n\nReply with only the JSON value, no other text.":"";
    let res;
    try{
      if(prov==="anthropic"){
        const parts=[];for(const b of imgs)parts.push({type:"image",source:{type:"base64",media_type:b.type||"image/jpeg",data:await dlBlobToB64(b)}});
        parts.push({type:"text",text:last+note});
        const messages=[...turns.slice(0,-1).map(m=>({role:m.role,content:m.content})),{role:"user",content:parts}];
        res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal:opts.signal,headers:{"content-type":"application/json","x-api-key":cfg.key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
          body:JSON.stringify({model:cfg.model||DL_PROVIDERS.anthropic.model,max_tokens:16000,messages})});
      }else{
        const parts=[{type:"text",text:last+note}];for(const b of imgs)parts.push({type:"image_url",image_url:{url:`data:${b.type||"image/jpeg"};base64,${await dlBlobToB64(b)}`}});
        const messages=[...turns.slice(0,-1).map(m=>({role:m.role,content:m.content})),{role:"user",content:parts}];
        res=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",signal:opts.signal,headers:{"content-type":"application/json","authorization":"Bearer "+cfg.key},
          body:JSON.stringify({model:cfg.model||DL_PROVIDERS.openai.model,messages,...(json?{response_format:{type:"json_object"}}:{})})});
      }
    }catch(e){if(e&&e.name==="AbortError")throw{code:"cancelled",message:"Stopped."};throw{code:"upstream_error",message:"Could not reach the AI service. Check your connection."}}
    if(!res.ok){const body=await res.text().catch(()=>"");
      throw{code:res.status===401||res.status===403?"not_granted":res.status===429?"rate_limited":res.status===413?"prompt_too_large":"upstream_error",message:`${res.status}: ${body.slice(0,300)}`}}
    const data=await res.json();
    const text=prov==="anthropic"?(data.content||[]).filter(c=>c.type==="text").map(c=>c.text).join(""):((data.choices||[])[0]||{}).message?.content||"";
    if(!text.trim())throw{code:"empty_completion",message:"The reply was empty."};
    if(opts.onText)try{opts.onText({text,delta:text})}catch(e){}
    return{text,truncated:prov==="anthropic"?data.stop_reason==="max_tokens":((data.choices||[])[0]||{}).finish_reason==="length",modelTierApplied:"default"};
  }
  const sample=(input,opts)=>call(input,opts);
  sample.json=async(input,opts={})=>dlParseJSON((await call(input,{...opts,_json:true})).text);
  sample.limits=async()=>({maxPromptBytes:400000,images:{maxCount:8,maxInputBytes:20e6,mediaTypes:["image/jpeg","image/png","image/webp","image/gif"]},tools:null});
  return sample;
}
/* downloads outside claude.ai: an ordinary browser download */
const dlLocalDownloads={save:async({filename,data})=>{const blob=data instanceof Blob?data:new Blob([data]);const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);return{saved:true}}};

/* settings panel (shown only outside claude.ai) */
function dlProviderUI(){
  if(window.claude)return;
  const cfg=dlLoadProvider()||{provider:"anthropic",model:"",key:""};
  const bar=document.createElement("div");bar.className="panel";bar.id="providerBar";bar.style.cssText="display:grid;gap:10px";
  bar.innerHTML=`<div class="row" style="justify-content:space-between"><div><div class="eyebrow">AI connection</div><b>${cfg.key?`Connected: ${DL_PROVIDERS[cfg.provider].label.split(" (")[0]}`:"Connect your own Claude or OpenAI account to turn on AI reviews"}</b>
      <div class="muted" style="font-size:12px">Your key is saved only in this browser and sent only to the provider you pick. Instant checks, the budget calculator and uploads work without a key.</div></div>
      <button class="btn small" id="provToggle">${cfg.key?"Change":"Connect"}</button></div>
    <div id="provForm" hidden style="display:grid;gap:8px">
      <div class="row"><label class="bl">Provider<select id="provSel" style="width:auto">${Object.entries(DL_PROVIDERS).map(([k,v])=>`<option value="${k}" ${cfg.provider===k?"selected":""}>${v.label}</option>`).join("")}</select></label>
        <label class="bl" style="flex:1;min-width:200px">API key<input type="password" id="provKey" autocomplete="off" value="${cfg.key?"••••••••":""}" placeholder="${DL_PROVIDERS[cfg.provider].keyHint}"></label>
        <label class="bl">Model<input type="text" id="provModel" value="${cfg.model||""}" placeholder="${DL_PROVIDERS[cfg.provider].model}" style="width:190px"></label></div>
      <div class="row"><button class="btn primary" id="provSave">Save and reload</button>${cfg.key?`<button class="btn" id="provForget">Forget key</button>`:""}
        <a id="provKeys" href="${DL_PROVIDERS[cfg.provider].keysUrl}" target="_blank" rel="noopener" style="font-size:12.5px">Get an API key ↗</a></div></div>`;
  const top=document.querySelector(".top");top.parentNode.insertBefore(bar,top.nextSibling);
  const $p=id=>document.getElementById(id);
  $p("provToggle").onclick=()=>{$p("provForm").hidden=!$p("provForm").hidden};
  $p("provSel").onchange=e=>{const v=DL_PROVIDERS[e.target.value];$p("provModel").placeholder=v.model;$p("provKey").placeholder=v.keyHint;$p("provKeys").href=v.keysUrl};
  $p("provSave").onclick=()=>{const k=$p("provKey").value.trim();const key=k&&!/^•+$/.test(k)?k:cfg.key;if(!key){$p("provKey").focus();return}
    dlSaveProvider({provider:$p("provSel").value,key,model:$p("provModel").value.trim()});location.reload()};
  const f=$p("provForget");if(f)f.onclick=()=>{dlSaveProvider(null);location.reload()};
}
