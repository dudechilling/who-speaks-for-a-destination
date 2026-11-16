/* Browser-only canonical workbook workflow. */
'use strict';
(() => {
 const originalProfiles=profiles, originalGovernance=governance;
 const originalAnnotations=readingAnnotations, originalRender=render;
 const originalSourceTools=readingSourceTools, originalReadingHeader=readingHeader;
 readingSourceTools=function plainWorkbookTools(mode){return originalSourceTools(mode===true?false:mode);};
 readingHeader=function compactHeader(reviewMode){return originalReadingHeader(reviewMode).replace('Model assisted. Human adjudicated.','Review proposed coding in the browser.');};
 const fields=['process_type','actor','affected_participant','agency_voice','modality','institutional_priority','social_actor_representation'];

 readingAnnotations=function selectedAnnotations(row){
   return originalAnnotations(row)
     .replace(/<p class="lm-overview-lede">[^<]*<\/p>/,'')
     .replace(/<p class="lm-overview-caveat">[^<]*<\/p>/,'');
 };
 profiles=async function linkedProfiles(){
   const src=await getText('content/profiles/'+state.region+'.md');
   const links=[...src.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g)],last=links.at(-1);
   let html=await originalProfiles();
   html=html.replace(/<span class="profile-index">[^<]*<\/span>/,'');
   const names={island:'4VI Group',northern:'Northern BC Tourism Association',
     thompson:'Thompson Okanagan Tourism Association',kootenay:'Kootenay Rockies Tourism',
     cariboo:'Cariboo Chilcotin Coast Tourism',vcm:'Destination BC'};
   if(last&&safeUrl(last[2])){
     const link='<a class="profile-homepage" target="_blank" rel="noopener noreferrer" href="'+
       esc(safeUrl(last[2]))+'">'+esc(names[state.region]||last[1])+' ↗</a>';
     html=html.replace(/(<h2 class="profile-name">[\s\S]*?<\/h2>)/,'$1'+link);
     html=html.replace(/<div class="prose">[\s\S]*?<\/div><\/section>/,
       '<div class="prose">'+md(src.replace(last[0],''))+'</div></section>');
   }
   return html;
 };
 function governanceYears(){
   const g=state.governance;
   return [...new Set([
     ...(g?.board||[]).filter(x=>rid(x.organization)===state.region).map(x=>dateYear(x.record_date)),
     ...(g?.sources||[]).filter(x=>rid(x.organization)===state.region)
       .map(x=>dateYear(x.document_date)||dateYear(x.capture_date))
   ].filter(Number.isFinite))].sort((a,b)=>a-b);
 }
 function slider(years,id,label){
   const text=years.map((year,i)=>'<button type="button" data-year="'+year+'" style="left:'+
      (years.length===1?50:i/(years.length-1)*100)+'%" aria-current="'+(year===state.year)+'">'+year+'</button>').join('');
   return '<div class="lm-observation-line"><div class="lm-observation-labels">'+
     (text||'<span class="empty-date-label">No dated records yet</span>')+
     '</div><div class="lm-observation-track"><input type="range" id="'+id+'" min="0" max="'+
     Math.max(0,years.length-1)+'" value="'+Math.max(0,years.indexOf(state.year))+
     '" step="1" aria-label="'+esc(label)+'" '+(years.length?'':'disabled')+'></div></div>';
 }
 function languageYears(){
   return [...new Set((state.language?.docs||[]).filter(d=>d.region===state.region)
     .map(d=>d.year).filter(Number.isFinite))].sort((a,b)=>a-b);
 }
 governance=function alignedGovernance(){
   let html=originalGovernance().replace(tabs(),readingTabs());
   const begin=html.indexOf('<div class="selected-region">');
   const end=html.indexOf('<div class="governance-layout">',begin);
   if(begin>=0&&end>=0)html=html.slice(0,begin)+
     '<div class="governance-date-strip">'+slider(governanceYears(),
       'governance-year-slider','Available governance observation years')+'</div>'+
     html.slice(end);
   return html;
 };
 readingTimeline=function unifiedDateControl(reviewMode){
   return slider(languageYears(),reviewMode?'adjudicator-year-slider':'language-year-slider',
      'Available About-page capture years');
 };
 readingFooter=function compactCitation(rows,source,reviewMode){
   const name=R.find(x=>x[0]===state.region)?.[1]||'Regional organization';
   const url=safeUrl(source?.url||source?.source_url),date=source?.date||source?.capture_date;
   const label='Source: '+name+(date?' · '+readingDateLabel(date):'');
   return '<div class="reading-footnotes">'+(url?
     '<a class="reading-source-citation" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+
     esc(label)+' ↗</a>':esc(label))+'</div>';
 };


 function proposedVoice(value){
   const s=String(value||'').toLowerCase().trim();
   return ['active','passive','non_finite','unclear','not_applicable'].includes(s)?s:'';
 }
 workbookRows=function canonicalReviewerRows(){
   return (state.language?.clauses||[]).map(c=>{
     const doc=(state.language?.docs||[]).find(d=>d.id===c.source);
     const proposals={process_type:c.process,actor:c.actor,
       affected_participant:c.affected_participant,agency_voice:proposedVoice(c.agency),
       modality:c.modality,institutional_priority:c.institutional_priority,
       social_actor_representation:c.social_actor_representation};
     const draft={};fields.forEach(key=>draft[key]=String(c['human_'+key]||proposals[key]||''));
     const row=cleanAdjudicatorRow({
       row_id:c.id,about_id:c.source,source_url:c.url||doc?.url,
       verbatim_text:c.text,text:c.text,source_order:c.source_order,
       section:c.section,type:c.type,capture_date:doc?.date||'',
       fingerprint:'workbook:'+c.id,
       annotations:c.human_review_note||'',status:c.human_review_status||'pending',
       corrected_text:c.human_corrected_clause||'',draft,...proposals
     });
     if(!row)return null;
     row.source=c.source;row.about_id=c.source;row.block_id=c.block_id;
     row.paragraph_id=c.block_id;row.heading_before=c.heading_before;
     row.join_after=c.join_after;row.block_kind=c.block_kind;
     row.reviewed_at_utc=c.human_reviewed_at_utc||'';
     return row;
   }).filter(Boolean);
 };
 currentRows=function canonicalRows(){
   return workbookRows().map(row=>{
     const entry=state.visitor.overrides[row.row_id];
     if(!entry||entry.fingerprint!==row.fingerprint)return row;
     const values=entry.values||{};
     return {...row,...values,draft:{...row.draft,
       ...Object.fromEntries(fields.filter(f=>Object.hasOwn(values,f)).map(f=>[f,values[f]]))}};
   });
 };
 rowStatus=function humanReviewStatus(r){
   const v=String(r?.status||'pending').toLowerCase();
   return v.startsWith('approv')?'Approved':v.startsWith('reject')?'Rejected':
     v.startsWith('draft')?'Draft':'Pending';
 };
 adjudicate=async function saveBrowserDecision(kind){
   const row=currentRow();if(!row)return;
   const values=visitorValues(row);
   values.status=kind==='approve'?'approved':'rejected';
   values.reviewed_at_utc=new Date().toISOString();
   putVisitor(row,values);
   state.adjudicatorNotice='Decision saved in this browser. Export the Excel workbook to keep it.';
   await render();
 };
 function setSheetCell(sheet,row,col,value){
   if(!Number.isInteger(col))throw Error('Canonical workbook is missing a review column.');
   sheet[XLSX.utils.encode_cell({r:row,c:col})]={t:'s',v:String(value??'')};
 }
 function reviewedWorkbook(){
   if(!state.language?.workbookBytes)throw Error('The canonical language workbook is not loaded.');
   const wb=XLSX.read(state.language.workbookBytes,{type:'array',cellStyles:true});
   const existing=new Map(workbookRows().map(r=>[r.row_id,r]));
   let changed=0;
   for(const name of wb.SheetNames){
     if(['Index','Review Log','Theme Findings','Source Decisions'].includes(name))continue;
     const sheet=wb.Sheets[name],raw=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
     const h=raw.findIndex(row=>row[0]==='clause_id'||row[0]==='row_id');
     if(h<0)continue;
     const cols=Object.fromEntries(raw[h].map((s,i)=>[String(s),i]));
     for(let r=h+1;r<raw.length;r++){
       const id=String(raw[r][cols.clause_id??cols.row_id]||'');
       const local=state.visitor.overrides[id],baseline=existing.get(id);
       if(!local||!baseline||local.fingerprint!==baseline.fingerprint)continue;
       const data=local.values||{};
       if(!Object.keys(data).length)continue;
       for(const f of fields)if(Object.hasOwn(data,f))
         setSheetCell(sheet,r,cols['human_'+f],data[f]);
       if(Object.hasOwn(data,'status'))
         setSheetCell(sheet,r,cols.human_review_status,data.status);
       if(Object.hasOwn(data,'annotations'))
         setSheetCell(sheet,r,cols.human_review_note,data.annotations);
       if(Object.hasOwn(data,'corrected_text'))
         setSheetCell(sheet,r,cols.human_corrected_clause,data.corrected_text);
       if(Object.hasOwn(data,'reviewed_at_utc'))
         setSheetCell(sheet,r,cols.human_reviewed_at_utc,data.reviewed_at_utc);
       changed++;
     }
   }
   return {wb,changed};
 }
 async function exportCanonical(){
   try{
     const {wb,changed}=reviewedWorkbook();
     const bytes=XLSX.write(wb,{type:'array',bookType:'xlsx',cellStyles:true,compression:true});
     download('RDMO_about_coding_review.xlsx',bytes,
       'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
     state.adjudicatorNotice='Excel export started ('+changed+
       ' edited rows). Inspect it in Excel before replacing the GitHub workbook.';
   }catch(error){
     state.adjudicatorNotice='Excel export failed: '+String(error.message||error);
   }
   await render();
 }
 exportOwner=exportCanonical;
 exportWorkspace=exportCanonical;


 adjudicator=function simplifiedAdjudicator(){
   readingEnsureReviewYear();
   const rows=readingReviewRows();
   const selected=rows.find(r=>r.row_id===state.selected)||rows[0]||null;
   if(selected&&selected.row_id!==state.selected)state.selected=selected.row_id;
   const org=R.find(x=>x[0]===state.region)?.[1]||'Region';
   const source=(state.language?.docs||[]).find(d=>d.id===selected?.about_id);
   const url=safeUrl(selected?.source_url||source?.url||'');
   const left=readingHighlightRows(rows,selected?.row_id,true)+
     (url?'<p class="reading-review-source"><a href="'+esc(url)+
     '" target="_blank" rel="noopener noreferrer">Original source ↗</a></p>':'');
   const actions='<button type="button" class="reading-approve" data-approve '+
     (selected?'':'disabled')+'>Approve</button>'+
     '<button type="button" class="reading-reject" data-reject '+
     (selected?'':'disabled')+'>Reject</button>'+
     '<button type="button" class="reading-export" data-export-xlsx>Export XLSX</button>';
   const form=selected?'<div class="reading-review-form">'+
     '<div class="reading-review-meta"><span>'+rowStatus(selected)+'</span></div>'+
     '<div class="reading-review-fields">'+fields.map(f=>codeField(f,selected)).join('')+
     '<div class="field"><label for="adjudicator-note">Review note</label>'+
     '<textarea id="adjudicator-note" data-adjudicator-note rows="3">'+
     esc(selected.annotations||'')+'</textarea></div>'+
     '<details class="reading-source-edit"><summary>Correct source wording</summary>'+
     '<label for="corrected-text">Proposed correction</label>'+
     '<textarea id="corrected-text" data-adjudicator-text rows="3">'+
     esc(selected.corrected_text||'')+'</textarea></details></div></div>':
     '<p>No source passages for this period.</p>';
   const right='<header class="reading-review-head"><h2>Annotations</h2>'+
     '<div class="reading-review-actions">'+actions+'</div></header>'+
     '<div class="reading-scroll">'+form+'</div>';
   const toolbar='<div class="reading-review-toolbar">'+
     '<button type="button" data-review-prev '+(rows.length?'':'disabled')+
     '>← Previous</button><button type="button" data-review-next '+(rows.length?'':'disabled')+
     '>Next →</button></div>'+
     (state.adjudicatorNotice?'<p class="reading-review-notice" role="status">'+
     esc(state.adjudicatorNotice)+'</p>':'');
   const result=readingScaffold(true,left,right,rows,source||null,'About us',
     org+' · '+(state.year||'No date'));
   return result.replace('<div class="reading-panels">',
      toolbar+'<div class="reading-panels">');
 };
 corpus=function compactCorpus(){
   const all=docs(),filtered=all.filter(d=>
      (state.corpusRegion==='all'||d.region===state.corpusRegion)&&
      (state.corpusYear==='all'||String(d.year)===state.corpusYear)&&
      (!state.query||JSON.stringify(d).toLowerCase().includes(state.query.toLowerCase())));
   const years=[...new Set(all.map(d=>d.year).filter(Number.isFinite))].sort((a,b)=>a-b);
   const controls='<div class="corpus-toolbar corpus-toolbar--compact">'+
     '<div class="field"><label for="corpus-search">Search corpus</label>'+
     '<input type="search" id="corpus-search" value="'+esc(state.query)+'"></div>'+
     '<div class="field"><label for="corpus-region">Region</label>'+
     '<select id="corpus-region"><option value="all">All regions</option>'+
     R.map(([id,name])=>'<option value="'+id+'" '+(state.corpusRegion===id?'selected':'')+
     '>'+esc(name)+'</option>').join('')+'</select></div>'+
     '<div class="field"><label for="corpus-year">Year</label>'+
     '<select id="corpus-year"><option value="all">All years</option>'+
     years.map(y=>'<option value="'+y+'" '+(String(y)===state.corpusYear?'selected':'')+
     '>'+y+'</option>').join('')+'</select></div>'+
     '<button type="button" class="plain-btn corpus-download" data-export-csv>Download CSV ↓</button></div>';
   const entries=filtered.map(d=>'<tr><td>'+esc(d.year||'')+'</td><td>'+
     esc(R.find(([id])=>id===d.region)?.[1]||d.region)+'</td><td>'+
     esc(d.title||'About page')+'</td><td>'+
     (safeUrl(d.url)?'<a href="'+esc(safeUrl(d.url))+
     '" target="_blank" rel="noopener noreferrer">Source ↗</a>':'Unavailable')+
     '</td></tr>').join('');
   return '<div class="corner-meta"></div>'+head('Research corpus',
     'Source pages from the current workbook.')+controls+
     '<section class="corpus-area"><div class="corpus-area-meta"><span class="micro">'+
     filtered.length+' source records</span></div><div class="corpus-table-wrap">'+
     '<table><thead><tr><th>Year</th><th>RDMO</th><th>Source</th><th>Link</th></tr></thead>'+
     '<tbody>'+(entries||'<tr><td colspan="4">No matching sources.</td></tr>')+
     '</tbody></table></div></section>';
 };
 window.aiDisclosure=async function aiDisclosure(){
   return '<div class="corner-meta"></div><div class="page-head"><div>'+
     '<h1 class="page-title">How we used AI</h1>'+
     '<p class="page-subtitle">Disclosure and research methods</p></div></div>'+
     '<article class="ai-disclosure-content prose">'+
     md(await getText('content/ai-disclosure.md'))+'</article>';
 };
 document.addEventListener('click',event=>{
   if(event.target.closest('[data-export-csv]')&&state.route==='corpus'){
     event.preventDefault();event.stopImmediatePropagation();
     const cell=v=>'"'+String(v??'').replaceAll('"','""').replace(/^[=+\-@\t]/,"'$&")+'"';
     const match=docs().filter(d=>(state.corpusRegion==='all'||d.region===state.corpusRegion)&&
       (state.corpusYear==='all'||String(d.year)===state.corpusYear)&&
       (!state.query||JSON.stringify(d).toLowerCase().includes(state.query.toLowerCase())));
     download('research-corpus.csv',['year,region,title,source_url,date_basis',
       ...match.map(d=>[d.year,d.region,d.title,d.url,d.basis].map(cell).join(','))].join('\r\n'),
       'text/csv');
   }else if(event.target.closest('[data-export-xlsx]')){
     event.preventDefault();event.stopImmediatePropagation();exportCanonical();
   }
 },true);
 document.addEventListener('change',event=>{
   if(['governance-year-slider','adjudicator-year-slider'].includes(event.target.id)){
     const values=event.target.id==='governance-year-slider'?governanceYears():languageYears();
     const y=values[Number(event.target.value)];
     if(Number.isFinite(y)){state.year=y;state.selected=null;render();}
   }
 },true);
 render=async function unifiedRender(){
   await originalRender();
   const meta=document.querySelector('#view .corner-meta');
   if(meta)meta.textContent='Thompson Rivers University | CMNS 3500 | Fall 2026 · Earl Healy';
 };
 window.CanonicalWorkbook={reviewedWorkbook,exportCanonical};
})();
