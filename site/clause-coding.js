/* Researcher-owned annotations. Suggested boundaries remain uncoded pending review. */
'use strict';
(() => {
const fields=['process_type','process','participants','voice','institutional_priority','represented_beneficiary'];
const headers=['clause_id','source_id','block_id','start_offset','end_offset','clause_text','block_fingerprint',...fields,'process_start','process_end','coding_provenance','coding_review_status','coding_review_note','boundary_provenance','boundary_review_status'];
const sections={process_type:'Process types',voice:'Voice',institutional_priority:'Institutional priorities',represented_beneficiary:'Beneficiaries and social groups'};
let catalog={},data=null,workspace=null,selected=null,candidate=null,enabled=false,notice='';
function parseBook(src){
 const out={};let section='';
 for(const line of src.split(/\r?\n/)){
  if(line.startsWith('## ')){section=line.slice(3);out[section]={};continue;}
  const m=line.match(/^\|\s*\x60([a-z_]+)\x60\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*$/);
  if(section&&m)out[section][m[1]]={id:m[1],label:m[2].trim(),tip:m[3].trim()};
 }return out;
}
const ready=getText('content/home/codebook.md').then(src=>{catalog=parseBook(src);if(!fields.every(f=>catalog['Coding fields']?.[f]))notice='Codebook unavailable. Reload before coding.';});
const entry=(s,k)=>catalog[s]?.[k],label=(s,k)=>entry(s,k)?.label||k||'Not selected';
function hash(v){
 let a=2166136261,b=0x9e3779b9;
 for(let i=0;i<v.length;i++){const x=typeof v==='string'?v.charCodeAt(i):v[i];a=Math.imul(a^x,16777619);b=Math.imul(b^x,2246822519);}
 return v.length+'-'+(a>>>0).toString(16)+'-'+(b>>>0).toString(16);
}
const txt=b=>String(b?.text||'').trim(),blockFor=r=>state.language?.clauses.find(b=>b.id===r.block_id&&b.source===r.source_id);
const array=v=>Array.isArray(v)?v:String(v||'').split(';').map(x=>x.trim()).filter(Boolean);
function decode(row){
 const r={};for(const h of headers)r[h]=String(row[h]??'');
 for(const k of ['start_offset','end_offset','process_start','process_end'])r[k]=row[k]===''||row[k]==null?null:Number(row[k]);
 try{r.participants=Array.isArray(row.participants)?row.participants:JSON.parse(row.participants||'[]');}catch{r.participants=[];}
 if(!Array.isArray(r.participants))r.participants=[];
 r.institutional_priority=array(row.institutional_priority);r.represented_beneficiary=array(row.represented_beneficiary);
 if(!r.boundary_provenance)r.boundary_provenance='human_original';
 if(!r.boundary_review_status)r.boundary_review_status=r.coding_review_status==='coded'?'confirmed':'selected';
 return r;
}
function valid(r,b){
 const t=txt(b);return !!b&&Number.isInteger(r.start_offset)&&Number.isInteger(r.end_offset)&&r.start_offset>=0&&r.end_offset>r.start_offset&&r.end_offset<=t.length&&t.slice(r.start_offset,r.end_offset)===r.clause_text&&hash(t)===r.block_fingerprint;
}
function ensure(){
 if(!state.language)return null;
 if(data===state.language)return workspace;
 data=state.language;selected=null;candidate=null;notice='';
 const fileHash=hash(new Uint8Array(data.workbookBytes));
 // Preserve browser work against the preceding, identical source workbook.
 const key='rdmo-manual-clauses-v1:'+(fileHash==='155765-ef26b43d-2301171d'?'180426-bab46780-c70d2348':fileHash);
 const imported=Object.create(null),changes=Object.create(null),invalid=[];
 const wb=XLSX.read(data.workbookBytes,{type:'array'});
 if(wb.Sheets.Clauses)for(const row of XLSX.utils.sheet_to_json(wb.Sheets.Clauses,{defval:''})){
  const r=decode(row);if(!r.clause_id||!valid(r,blockFor(r))||Object.hasOwn(imported,r.clause_id))invalid.push(r.clause_id);else imported[r.clause_id]=r;
 }
 try{for(const [k,v] of Object.entries(JSON.parse(localStorage.getItem(key)||'{}').changes||{})){
  if(v===null&&Object.hasOwn(imported,k))changes[k]=null;
  else if(v&&k===v.clause_id&&valid(v,blockFor(v)))changes[k]=decode(v);
 }}catch{}
 workspace={key,imported,changes,invalid};
 if(invalid.length)notice=invalid.length+' imported annotation(s) no longer match source text. Export blocked to prevent loss.';
 return workspace;
}
function all(){
 const w=ensure();return w?(w.rows||(w.rows=Object.values({...w.imported,...w.changes}).filter(Boolean).filter(r=>valid(r,blockFor(r))))):[];
}
function persist(r,id=r?.clause_id){
 const w=ensure();if(!w||!id)return;
 if(r===null&&!Object.hasOwn(w.imported,id))delete w.changes[id];else w.changes[id]=r;w.rows=null;
 try{localStorage.setItem(w.key,JSON.stringify({changes:w.changes}));return true;}catch{notice='Browser storage failed; export before leaving.';return false;}
}
const excluded=r=>r.boundary_review_status==='rejected';
const suggested=r=>r.coding_review_status==='suggested';
const coded=r=>!excluded(r)&&r.coding_review_status==='coded'&&['human_original','human_accepted','human_edited'].includes(r.coding_provenance);
const records=()=>{const src=readingRecords(state.region,state.year).sources[0]?.id;return all().filter(r=>r.source_id===src&&!excluded(r)).sort((a,b)=>(blockFor(a)?.source_order||0)-(blockFor(b)?.source_order||0)||a.start_offset-b.start_offset);};
const current=()=>records().find(r=>r.clause_id===selected&&(enabled||coded(r)));
function rangeFor(b,a,z){
 const t=txt(b);while(a<z&&/\s/.test(t[a]))a++;while(z>a&&/\s/.test(t[z-1]))z--;
 return a<z?{source_id:b.source,block_id:b.id,start_offset:a,end_offset:z,clause_text:t.slice(a,z),block_fingerprint:hash(t)}:null;
}
function makeClause(){
 if(!candidate||!valid(candidate,blockFor(candidate)))return;
 const r=all().find(r=>!excluded(r)&&r.block_id===candidate.block_id&&r.source_id===candidate.source_id&&r.start_offset===candidate.start_offset&&r.end_offset===candidate.end_offset);
 if(r)selected=r.clause_id;else{
  const fresh={...candidate,clause_id:candidate.block_id+':'+candidate.start_offset+':'+candidate.end_offset,process_type:'',process:'',process_start:null,process_end:null,participants:[],voice:'',institutional_priority:[],represented_beneficiary:[],coding_provenance:'',coding_review_status:'draft',coding_review_note:'',boundary_provenance:'human_original',boundary_review_status:'selected'};
  persist(fresh);selected=fresh.clause_id;
 }
 candidate=null;getSelection()?.removeAllRanges();notice='';refresh(true);focusEditor();
}
function blockMarkup(b,visible){
 const t=txt(b),start=t.indexOf(visible);if(start<0)return esc(visible);
 const end=start+visible.length,rs=all().filter(r=>r.block_id===b.id&&r.source_id===b.source&&!excluded(r)&&(enabled||coded(r)));
 const pts=[...new Set([start,end,...rs.flatMap(r=>[Math.max(start,Math.min(end,r.start_offset)),Math.max(start,Math.min(end,r.end_offset))])])].sort((a,b)=>a-b);
 let out='';
 for(let i=0;i<pts.length-1;i++){
  const a=pts[i],z=pts[i+1],cover=rs.filter(r=>r.start_offset<=a&&r.end_offset>=z),pick=cover.find(r=>r.clause_id===selected),r=pick||cover.sort((x,y)=>(x.end_offset-x.start_offset)-(y.end_offset-y.start_offset))[0];
  const words=esc(t.slice(a,z));out+=r?'<span role="button" tabindex="0" class="manual-annotation'+(suggested(r)?' manual-suggestion':'')+(pick?' manual-selected reading-highlight--'+esc(entry('Process types',r.process_type)?r.process_type:'other'):'')+'" data-manual-clause="'+esc(r.clause_id)+'" aria-pressed="'+!!pick+'">'+words+'</span>':words;
 }
 return '<span class="manual-source-block" data-source-block="'+esc(b.id)+'" data-base-offset="'+start+'"'+(enabled?' tabindex="0" aria-label="Source block. Select text, or press Enter to choose a clause."':'')+'>'+out+'</span>';
}
function updateButtons(){document.querySelectorAll('[data-manual-action="use"]').forEach(b=>{b.disabled=!candidate;b.textContent=candidate?'Code selected text':'Select text to code';});}
function capture(){
 if(!enabled||state.route!=='language'||state.languageMode!=='analysis')return;
 const s=getSelection();if(!s||s.isCollapsed||!s.rangeCount)return;
 const r=s.getRangeAt(0),node=n=>n.nodeType===1?n:n.parentElement,a=node(r.startContainer)?.closest('[data-source-block]'),z=node(r.endContainer)?.closest('[data-source-block]');
 if(!a||a!==z||!a.closest('.reading-about')){if(a||z){candidate=null;updateButtons();}return;}
 const b=data.clauses.find(b=>b.id===a.dataset.sourceBlock),pre=document.createRange();if(!b)return;
 pre.selectNodeContents(a);pre.setEnd(r.startContainer,r.startOffset);const x=Number(a.dataset.baseOffset)+pre.toString().length;
 pre.setEnd(r.endContainer,r.endOffset);candidate=rangeFor(b,x,Number(a.dataset.baseOffset)+pre.toString().length);updateButtons();
}function tip(s,k,id=''){
 return '<button type="button" class="manual-help" data-manual-help="'+esc(s)+'" data-key="'+esc(k)+'" data-select="'+esc(id)+'" aria-expanded="false" aria-label="Explain '+esc(label(s,k))+'">?</button>';
}
const helpArea=()=>'<p class="manual-tip" hidden role="status"></p>';
function options(s,value,filter=()=>true,placeholder='Choose…'){
 return '<option value="">'+esc(placeholder)+'</option>'+Object.values(catalog[s]||{}).filter(e=>filter(e.id)).map(e=>'<option value="'+esc(e.id)+'"'+(e.id===value?' selected':'')+'>'+esc(e.label)+'</option>').join('');
}
function category(k,r){
 const id='manual-'+k.replaceAll('_','-');
 return '<div class="manual-field"><label for="'+id+'">'+esc(label('Coding fields',k))+'</label>'+tip('Coding fields',k,id)+'<select id="'+id+'" data-manual-field="'+k+'">'+options(sections[k],r[k])+'</select>'+helpArea()+'</div>';
}
function multi(k,r){
 const id='manual-'+k.replaceAll('_','-'),s=sections[k],values=r[k]||[];
 return '<div class="manual-field"><label for="'+id+'">'+esc(label('Coding fields',k))+'</label>'+tip('Coding fields',k,id)+'<select id="'+id+'" data-manual-add="'+k+'">'+options(s,'',x=>!values.includes(x)&&x!=='non_social','Add category…')+'</select><div class="manual-chips">'+values.map(x=>'<span>'+esc(label(s,x))+tip(s,x)+'<button type="button" data-manual-remove="'+k+'" data-value="'+esc(x)+'" aria-label="Remove '+esc(label(s,x))+'">×</button></span>').join('')+'</div>'+helpArea()+'</div>';
}
function participantEditor(r){
 const roles=[...(PARTICIPANT_ROLES[r.process_type]||[]),'other_role','unclear_role'];
 return '<div class="manual-field manual-wide manual-participant-field"><label for="manual-role">Participants</label>'+tip('Coding fields','participants','manual-role')+'<div class="manual-participant-controls"><select id="manual-role" aria-label="Participant role">'+options('Participant roles','',x=>roles.includes(x),'Choose role…')+'</select><select id="manual-presence" aria-label="Participant presence"><option value="explicit">Explicit (select words)</option><option value="implicit">Implicit</option><option value="omitted">Omitted</option></select><button type="button" data-manual-action="participant" aria-label="Add participant">Add</button></div><input id="manual-implicit" hidden placeholder="Implicit participant" aria-label="Implicit participant"><div id="manual-actor-wrap" hidden><label for="manual-actor-group">Actor group</label>'+tip('Beneficiaries and social groups','rdmo','manual-actor-group')+'<select id="manual-actor-group">'+options('Beneficiaries and social groups','',x=>x!=='not_expressed')+'</select></div><div class="manual-participants">'+r.participants.map((p,i)=>'<div><span><b>'+esc(label('Participant roles',p.role))+'</b> '+esc(p.words||p.presence)+(p.group?' · '+esc(label('Beneficiaries and social groups',p.group)):'')+'</span><button type="button" data-manual-remove-participant="'+i+'" aria-label="Remove participant">×</button></div>').join('')+'</div>'+helpArea()+'</div>';
}
function editor(r){
 return '<div class="manual-editor manual-coding-form"><div class="manual-evidence"><div class="manual-editor-top"><label for="manual-evidence">Selected clause</label><div class="manual-editor-nav"><button type="button" data-manual-action="adjust">Adjust boundary</button><button type="button" data-manual-action="overview">All clauses</button><button type="button" class="manual-primary" data-manual-action="save">Save clause</button></div></div><textarea readonly id="manual-evidence" aria-label="Selected clause. Highlight words to assign the process or participants." rows="'+Math.min(3,Math.max(2,Math.ceil(r.clause_text.length/95)))+'">'+esc(r.clause_text)+'</textarea><p class="manual-status" role="status">'+esc(notice||'')+'</p></div><div class="manual-coding-fields">'+category('process_type',r)+category('voice',r)+'<div class="manual-field manual-wide"><label for="manual-process">Process</label>'+tip('Coding fields','process')+'<div class="manual-span-row"><input readonly id="manual-process" value="'+esc(r.process)+'" placeholder="Select process words in clause"><button type="button" data-manual-action="process">Use selected words</button></div>'+helpArea()+'</div>'+participantEditor(r)+multi('institutional_priority',r)+multi('represented_beneficiary',r)+'</div><div class="manual-coding-footer"><details class="manual-note"'+(r.coding_review_note?' open':'')+'><summary>Note (optional)</summary><label class="manual-note-label" for="manual-note">Coding note</label><textarea id="manual-note" rows="2" data-manual-field="coding_review_note">'+esc(r.coding_review_note)+'</textarea></details><div class="manual-actions"><button type="button" data-manual-action="delete">'+(suggested(r)?'Exclude suggestion':'Delete clause')+'</button></div></div></div>';
}
function readout(r){
 const parts=r.participants.map(p=>esc(label('Participant roles',p.role))+': '+esc(p.words||p.presence)).join('<br>');
 return '<div class="manual-editor"><button type="button" data-manual-action="overview">All clauses</button><blockquote>'+esc(r.clause_text)+'</blockquote><dl class="manual-read">'+fields.map(k=>'<dt>'+esc(label('Coding fields',k))+'</dt><dd>'+ (k==='participants'?parts:k==='process'?esc(r.process):Array.isArray(r[k])?r[k].map(x=>esc(label(sections[k],x))).join(', '):esc(label(sections[k],r[k])))+'</dd>').join('')+'</dl><p>'+esc(label('Coding provenance',r.coding_provenance))+'</p></div>';
}
function counts(rs,k){
 const m=Object.create(null);for(const r of rs.filter(coded)){
  const vs=k==='agency'?r.participants.filter(p=>p.role==='actor'&&p.group).map(p=>p.group):Array.isArray(r[k])?r[k]:[r[k]];
  for(const v of new Set(vs.filter(Boolean)))m[v]=(m[v]||0)+1;
 }return m;
}function overview(){
 const rs=records(),done=rs.filter(coded);
 if(!enabled&&!done.length)return '<p class="lm-empty">Not coded yet. Clause analysis will appear after researcher coding.</p>';
 let out=enabled?'<p>Click a suggested clause in the About page or the list below to start coding. Adjust its boundary if needed, or select your own text.</p><button type="button" class="manual-primary" data-manual-action="use" '+(candidate?'':'disabled')+'>Select text to code</button><p class="manual-status" role="status">'+esc(notice)+'</p>':'';
 out+='<p class="manual-count">'+done.length+' coded clause'+(done.length===1?'':'s')+(enabled?' · '+rs.filter(suggested).length+' suggested · '+rs.filter(r=>!coded(r)&&!suggested(r)).length+' drafts':'')+'</p>';
 if(!enabled)for(const [k,title,s] of [['process_type','Processes','Process types'],['institutional_priority','Priorities','Institutional priorities'],['represented_beneficiary','Beneficiaries','Beneficiaries and social groups'],['agency','Material Actors','Beneficiaries and social groups']]){
  const m=counts(done,k);if(Object.keys(m).length)out+='<h3>'+title+'</h3><dl class="manual-counts">'+Object.entries(m).map(([v,n])=>'<dt>'+esc(label(s,v))+'</dt><dd>'+n+'</dd>').join('')+'</dl>';
 }
 const visible=enabled?rs:done;
 return out+(visible.length?'<h3>'+ (enabled?'Clauses to review':'Coded clauses')+'</h3><div class="manual-clause-list">'+visible.map(r=>'<button type="button" data-manual-open="'+esc(r.clause_id)+'"><span>'+esc(r.clause_text)+'</span><small>'+esc(coded(r)?label('Process types',r.process_type):suggested(r)?'Suggested · uncoded':'Draft')+'</small></button>').join('')+'</div>':'');
}
function annotations(){const r=current();return r?(enabled?editor(r):readout(r)):overview();}
function refresh(left=false){
 const panel=document.querySelector('.reading-language .reading-annotations'),body=panel?.querySelector('.reading-scroll');if(!body)return;
 const y=body.scrollTop;body.innerHTML=annotations();body.scrollTop=y;
 const h=panel.querySelector('header>span');if(h)h.textContent=enabled?'Coding mode':current()?'Selected clause':'Overview';
 if(left){const l=document.querySelector('.reading-language .reading-about .reading-scroll');if(l){const top=l.scrollTop;const rec=readingRecords(state.region,state.year);l.innerHTML=readingHighlightRows(rec.clauses,null,false);l.scrollTop=top;}}
 updateButtons();
}
function focusEditor(){
 const panel=document.querySelector('.reading-annotations');const body=panel?.querySelector('.reading-scroll');if(body)body.scrollTop=0;
 if(matchMedia('(max-width:820px)').matches)panel?.scrollIntoView({block:'start'});
}
function mutate(r,c){persist({...r,...c,coding_review_status:'draft'});}
function status(s){notice=s;const p=document.querySelector('.manual-status');if(p)p.textContent=s;}
function evidence(id='manual-evidence'){
 const box=document.getElementById(id);if(!box)return null;let a=box.selectionStart,z=box.selectionEnd,t=box.value;
 while(a<z&&/\s/.test(t[a]))a++;while(z>a&&/\s/.test(t[z-1]))z--;
 return a<z?{start:a,end:z,words:t.slice(a,z)}:null;
}
function save(r){
 const missing=[];
 if(!entry('Process types',r.process_type))missing.push('process type');
 if(!r.process||r.process!==r.clause_text.slice(r.process_start,r.process_end))missing.push('process words');
 if(!r.participants.length)missing.push('participant');
 if(!entry('Voice',r.voice))missing.push('voice');
 if(!r.institutional_priority.length)missing.push('priority');
 if(!r.represented_beneficiary.length)missing.push('beneficiary');
 if(missing.length){status('Complete '+missing.join(', ')+'. Your draft is retained.');return;}
 const prior=workspace.imported[r.clause_id],machine=prior?.coding_provenance==='machine_proposed';
 const changed=machine&&fields.some(k=>JSON.stringify(prior[k])!==JSON.stringify(r[k]));
 const provenance=machine?(changed?'human_edited':'human_accepted'):(r.coding_provenance||'human_original');
 if(persist({...r,coding_review_status:'coded',coding_provenance:provenance,boundary_review_status:r.boundary_review_status==='adjusted'?'adjusted':'confirmed'}))notice='Clause saved locally. Export XLSX to retain your work.';
 refresh(true);
}
function chooseBlock(b,adjust=null){
 const body=document.querySelector('.reading-language .reading-annotations .reading-scroll');if(!enabled||!body)return;
 body.innerHTML='<div class="manual-editor"><label for="manual-block-selector">Select the exact clause within this source block.</label><textarea readonly id="manual-block-selector" rows="6">'+esc(txt(b))+'</textarea><button type="button" class="manual-primary" data-manual-use-block="'+esc(b.id)+'">'+(adjust?'Use adjusted boundary':'Code selected text')+'</button><button type="button" data-manual-action="cancel-boundary">Cancel</button><p class="manual-status" role="status"></p></div>';
 const input=document.querySelector('#manual-block-selector');input.focus();if(adjust)input.setSelectionRange(adjust.start_offset,adjust.end_offset);
 if(matchMedia('(max-width:820px)').matches)document.querySelector('.reading-annotations')?.scrollIntoView({block:'start'});
}
function writeToWorkbook(wb){
 const w=ensure();if(!w)return;
 if(w.invalid.length)throw Error('Some imported annotations do not match source text. Repair the workbook before exporting.');
 const rs=all(),blocks=new Map();
 if(!rs.length&&!wb.Sheets.Clauses)return;
 for(const n of wb.SheetNames.filter(n=>n.startsWith('SRC_'))){
  for(const b of XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:''}))blocks.set(String(b.block_id),{text:b.corrected_text||b.original_text,source:b.source_id});
 }
 for(const r of rs){const b=blocks.get(r.block_id);if(!valid(r,b)||b.source!==r.source_id)throw Error('A source correction conflicts with a selected clause. Export after resolving the correction or clause.');}
 const values=rs.map(r=>headers.map(h=>h==='participants'?(r[h].length?JSON.stringify(r[h]):''):Array.isArray(r[h])?r[h].join('; '):r[h]??''));
 const sheet=XLSX.utils.aoa_to_sheet([headers,...values]);
 sheet['!cols']=headers.map(h=>({wch:h==='clause_text'?75:h==='participants'?65:h==='coding_review_note'?48:24}));
 sheet['!autofilter']={ref:sheet['!ref']};
 if(wb.Sheets.Clauses)wb.Sheets.Clauses=sheet;else XLSX.utils.book_append_sheet(wb,sheet,'Clauses');
}
function tables(){
 const years=regionYears(),rs=all().filter(r=>blockFor(r)?.region===state.region&&coded(r));
 if(!rs.length)return null;
 const dims=[['institutional_priority','Priorities','Institutional priorities'],['represented_beneficiary','Beneficiaries','Beneficiaries and social groups'],['agency','Material Actors','Beneficiaries and social groups']];
 return '<p>Frequency counts from saved clauses. Uncoded years remain blank.</p>'+dims.map(([k,title,s])=>{
  const group=Object.values(catalog[s]||{}).filter(e=>rs.some(r=>counts([r],k)[e.id]));
  if(!group.length)return '';
  return '<h3>'+title+'</h3><div class="lm-table-scroll"><table class="lm-table lm-table--regional"><thead><tr><th>Category</th>'+years.map(y=>'<th scope="col">'+y+'</th>').join('')+'</tr></thead><tbody>'+group.map(e=>'<tr><th scope="row">'+esc(e.label)+'</th>'+years.map(y=>{const yr=rs.filter(r=>blockFor(r)?.year===y);return '<td>'+(yr.length?(counts(yr,k)[e.id]||0):'—')+'</td>';}).join('')+'</tr>').join('')+'</tbody></table></div>';
 }).join('');
}document.addEventListener('selectionchange',capture);
document.addEventListener('mouseup',capture);
document.addEventListener('keyup',capture);
document.addEventListener('click',event=>{
 const t=event.target.closest('button,[data-manual-clause]');if(!t)return;
 const action=t.dataset.manualAction,open=t.dataset.manualOpen||t.dataset.manualClause;
 if(open){if(t.dataset.manualClause&&getSelection()?.toString()&&candidate)return;event.preventDefault();event.stopImmediatePropagation();selected=open;candidate=null;getSelection()?.removeAllRanges();notice='';refresh(true);focusEditor();return;}
 if(t.dataset.manualHelp){
  event.preventDefault();const field=t.closest('.manual-field'),area=field?.querySelector('.manual-tip');if(!area)return;
  const s=t.dataset.manualHelp,k=t.dataset.key,id=t.dataset.select,chosen=id?document.getElementById(id)?.value:'';
  let sub=id==='manual-role'?'Participant roles':id==='manual-actor-group'?'Beneficiaries and social groups':sections[k];
  const option=chosen&&entry(sub,chosen);
  area.textContent=(entry(s,k)?.tip||'')+(option?' '+option.label+': '+option.tip:'');
  area.hidden=!area.hidden;t.setAttribute('aria-expanded',String(!area.hidden));return;
 }
 if(t.dataset.manualUseBlock){
  const b=data.clauses.find(x=>x.id===t.dataset.manualUseBlock),e=evidence('manual-block-selector');
  if(!e||!b){status('Select the clause words first.');return;}
  const r=current(),next=rangeFor(b,e.start,e.end);
  if(!next)return;
  if(r&&r.block_id===b.id){
   if(r.start_offset===next.start_offset&&r.end_offset===next.end_offset){refresh();focusEditor();return;}
   const existing=records().find(x=>x.clause_id!==r.clause_id&&x.block_id===b.id&&x.start_offset===next.start_offset&&x.end_offset===next.end_offset);
   if(existing){status('This exact boundary already exists. Cancel and select it from the list.');return;}
   if(!suggested(r)&&!confirm('Changing a boundary clears codes for this clause. Continue?'))return;
   persist({...r,...next,process_type:'',process:'',process_start:null,process_end:null,participants:[],voice:'',institutional_priority:[],represented_beneficiary:[],coding_provenance:'',coding_review_status:'draft',coding_review_note:'',boundary_review_status:'adjusted'});
   notice='Boundary adjusted. Code the selected words.';refresh(true);focusEditor();
  }else{candidate=next;makeClause();}
  return;
 }
 if(t.hasAttribute('data-manual-mode')){
  event.preventDefault();event.stopImmediatePropagation();enabled=!enabled;selected=null;candidate=null;state.sourceReview=false;state.languageMode='analysis';if(window.LanguageMatrix?.ui)window.LanguageMatrix.ui.view='timeline';render();return;
 }
 if(t.hasAttribute('data-source-review')){enabled=false;return;}
 const r=current();
 if(t.dataset.manualRemoveParticipant!==undefined&&r){mutate(r,{participants:r.participants.filter((_,i)=>i!==Number(t.dataset.manualRemoveParticipant))});refresh();return;}
 if(t.dataset.manualRemove&&r){const k=t.dataset.manualRemove;mutate(r,{[k]:r[k].filter(x=>x!==t.dataset.value)});refresh();return;}
 if(!action)return;event.preventDefault();event.stopImmediatePropagation();
 if(action==='use'){makeClause();return;}
 if(action==='overview'){selected=null;notice='';refresh(true);return;}
 if(action==='cancel-boundary'){refresh();focusEditor();return;}
 if(!r)return;
 if(action==='save'){save(r);return;}
 if(action==='adjust'){chooseBlock(blockFor(r),r);return;}
 if(action==='delete'){
  if(confirm(suggested(r)?'Exclude this suggested boundary? Source text remains unchanged.':'Remove this clause annotation? The source text will not change.')){
   if(r.boundary_provenance==='machine_proposed')persist({...r,process_type:'',process:'',process_start:null,process_end:null,participants:[],voice:'',institutional_priority:[],represented_beneficiary:[],coding_provenance:'',coding_review_status:'excluded',coding_review_note:'',boundary_review_status:'rejected'});
   else persist(null,r.clause_id);
   selected=null;notice='Clause removed.';refresh(true);
  }return;
 }
 if(action==='process'){const e=evidence();if(!e){status('Select the process words in the clause first.');return;}mutate(r,{process:e.words,process_start:e.start,process_end:e.end});refresh();return;}
 if(action==='participant'){
  const role=document.getElementById('manual-role').value,presence=document.getElementById('manual-presence').value,e=evidence();
  const group=role==='actor'?document.getElementById('manual-actor-group').value:'';
  if(!role){status('Choose a participant role.');return;}
  if(presence==='explicit'&&!e){status('Select the participant words in the clause first.');return;}
  if(role==='actor'&&!group&&presence!=='omitted'){status('Choose the Actor group.');return;}
  const words=presence==='explicit'?e.words:presence==='implicit'?document.getElementById('manual-implicit').value.trim():'';
  if(presence==='implicit'&&!words){status('Identify the implicit participant.');return;}
  const p={role,presence,words,group,start:presence==='explicit'?e.start:null,end:presence==='explicit'?e.end:null};
  if(r.participants.some(x=>JSON.stringify(x)===JSON.stringify(p))){status('This participant is already recorded.');return;}
  mutate(r,{participants:[...r.participants,p]});refresh();return;
 }
},true);
document.addEventListener('change',event=>{
 const el=event.target,r=current();
 if(el.id==='manual-role'){document.getElementById('manual-actor-wrap').hidden=el.value!=='actor';return;}
 if(el.id==='manual-presence'){document.getElementById('manual-implicit').hidden=el.value!=='implicit';return;}
 if(!r)return;
 const k=el.dataset.manualField,a=el.dataset.manualAdd;
 if(k&&k!=='coding_review_note'){
  if(k==='process_type'&&r.participants.length&&el.value!==r.process_type){if(!confirm('Changing the process type removes the current participant roles. Continue?')){el.value=r.process_type;return;}mutate(r,{process_type:el.value,participants:[]});}
  else mutate(r,{[k]:el.value});
  refresh();document.getElementById(el.id)?.focus({preventScroll:true});
 }else if(a&&el.value){
  const v=el.value,exclusive=['not_expressed','unclear'];
  mutate(r,{[a]:exclusive.includes(v)?[v]:[...r[a].filter(x=>!exclusive.includes(x)),v]});refresh();document.getElementById(el.id)?.focus({preventScroll:true});
 }
});
document.addEventListener('input',event=>{const r=current();if(r&&event.target.id==='manual-note')mutate(r,{coding_review_note:event.target.value});});
document.addEventListener('keydown',event=>{
 if(event.key!=='Enter'&&event.key!==' ')return;
 const t=event.target;if(t.matches('[data-manual-clause]')){event.preventDefault();t.click();return;}
 if(enabled&&t.matches('[data-source-block]')){event.preventDefault();const b=data.clauses.find(b=>b.id===t.dataset.sourceBlock);if(b){selected=null;chooseBlock(b);}}
},true);
const oldAnnotations=readingAnnotations;
readingAnnotations=function manualAnnotations(row,source){return state.language?.clauses.some(b=>b.source_only)?annotations():oldAnnotations(row,source);};
const oldTools=readingSourceTools;
readingSourceTools=function manualWorkbookTools(mode){
 const h=oldTools(mode);if(mode==='governance'||!state.language?.clauses.some(b=>b.source_only))return h;
 return h.replace('<p>Imports remain in this browser.','<button type="button" class="reading-action" data-manual-mode>'+(enabled?'Exit coding mode':'Code clauses')+'</button><p>Imports remain in this browser.').replace('Source-only phase — coding is not enabled.','Manual coding · edits stay in your browser until exported.');
};
const oldRender=render;let lastKey='';
render=async function manualRender(){
 await ready;if(state.language)ensure();
 const key=state.route+':'+state.region+':'+state.year+':'+state.languageMode;
 if(key!==lastKey){selected=null;candidate=null;lastKey=key;}
 await oldRender();
 if(state.route==='language'&&state.languageMode==='analysis'&&state.language?.clauses.some(b=>b.source_only)){
  const header=document.querySelector('.reading-language .reading-about>header');
  if(enabled&&header){const b=document.createElement('button');b.type='button';b.className='manual-use';b.dataset.manualAction='use';b.textContent='Select text to code';b.disabled=true;header.append(b);}
  refresh(false);
  const table=document.querySelector('.lm-table-view .lm-surface-body');const content=tables();if(table&&content)table.innerHTML=content;
 }
};
window.ClauseCoding={parseBook,blockMarkup,writeToWorkbook,reportError:status};
})();