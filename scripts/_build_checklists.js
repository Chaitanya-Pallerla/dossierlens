// Regenerates references/checklists.md from docs/checklists.js (the web app's copy). Run: node scripts/_build_checklists.js
const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.join(__dirname,'..');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'docs/checklists.js'),'utf8').replace(/^const /gm,'var '),ctx);
let md='# DossierLens checklists\n\nSingle source for every skill and the web app (generated from docs/checklists.js). Each item is scored **met**, **partly met** or **missing**.\n';
for(const m of Object.values(ctx.MODES)){md+='\n## '+m.label+'\n\n**Reviewer role:** '+m.role+'.\n\n**Scores (1-10):** '+m.subsDesc+'.\n';
 for(const d of m.docs){md+='\n### '+d.label+'\n\nTypical length: '+d.range[0]+'-'+d.range[1]+' words ('+d.pages+').'+(d.whyMe?' Also answer: **does it say why the applicant, rather than other applicants?**':'')+'\n\n';
  let g='';for(const it of d.items){if(it.group&&it.group!==g){g=it.group;md+='\n**'+ctx.GROUP_NAMES[g]+'**\n\n'}md+='- **'+it.id+'** '+it.text+'\n'}}}
md+='\n## Where to find funded proposals\n\n'+ctx.FUNDED_SOURCES.map(([n,u,d])=>'- ['+n+']('+u+'): '+d).join('\n')+'\n';
fs.writeFileSync(path.join(root,'references/checklists.md'),md);console.log('references/checklists.md updated');
