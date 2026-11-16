/* Editorial refinements for the public research atlas. Data remains workbook-backed. */
'use strict';
(() => {
  const originalMd = md;
  const originalProfiles = profiles;
  const originalMapSvg = mapSvg;
  const originalReadingHeader = readingHeader;
  const originalReadingFooter = readingFooter;
  const originalReadingTimeline = readingTimeline;
  const originalReadingSourceTools = readingSourceTools;
  const originalLanguage = language;
  const originalGovernance = governance;
  let modalFocusTarget = null;
  let themeModalSelection = null;

  const definitions=Object.freeze({
    process_type:'A process describes what happens in a clause. Material: doing or changing something (build, fund). Relational: being, having or identifying (is, has). Verbal: saying or reporting (states, announces). Mental: thinking, feeling or perceiving (believes, notices). Existential: something exists (there is). Behavioural: an observable human response (laughs, watches).',
    process:'Process types classify how language represents experience: material means doing (build), relational means being or having (is, has), verbal means saying (announces), and mental means sensing or thinking (believes). Existential describes existence; behavioural describes human behaviour.',
    actor:'The person, group or thing presented as carrying out an action. In “The organization supports local operators,” the organization is the actor.',
    affected_participant:'The person, group or thing receiving an action or experiencing its effect. In “The organization supports local operators,” local operators are affected participants.',
    named_groups:'People and groups named in the passage, such as visitors, tourism operators, residents, communities and First Nations. These categories show how often related terms appear.',
    priorities:'Goals and activities expressed in the wording, such as attracting visitors, supporting businesses or protecting the environment. Compare what each organization emphasizes.',
    agency_voice:'Active voice places the actor in the foreground: “The organization funds projects.” Passive voice foregrounds the action or recipient: “Projects are funded.” Compare who is named and who is left unstated.',
    modality:'Language expressing possibility, certainty, permission or obligation. “May” suggests possibility; “will” indicates commitment; “must” expresses obligation.',
    institutional_priority:'A goal or activity the organization presents as important, such as destination marketing, industry support or stewardship.',
    social_actor_representation:'How people and groups are described: by name, role, membership, collective identity or relationship to the organization.',
    annotations:'Notes explaining how a passage was interpreted or why a grammatical category was chosen.',
    corpus:'A register of the webpages, capture years and organizations used in the study.'
  });
  function definitionButton(key){
    return definitions[key]?'<button class="definition-trigger" type="button" data-definition="'+esc(key)+'" aria-label="Explain '+esc(key.replaceAll('_',' '))+'" aria-expanded="false">?</button>':'';
  }
  if(typeof codeField==='function'){
    const originalCodeField=codeField;
    codeField=function codeFieldWithExplanation(field,row){
      return originalCodeField(field,row).replace('<span aria-hidden="true">ⓘ</span>','')
        .replace('</label>','</label>'+definitionButton(field));
    };
  }
  let activeDefinition=null;
  function closeDefinition(){
    const tip=document.querySelector('#definition-tooltip');
    if(tip)tip.hidden=true;
    if(activeDefinition){activeDefinition.setAttribute('aria-expanded','false');activeDefinition.removeAttribute('aria-describedby');}
    activeDefinition=null;
  }
  function toggleDefinition(button){
    if(activeDefinition===button){closeDefinition();return;}
    closeDefinition();
    const tip=document.querySelector('#definition-tooltip'),message=definitions[button.dataset.definition];
    if(!tip||!message)return;
    tip.textContent=message;tip.hidden=false;
    const rect=button.getBoundingClientRect(),width=Math.min(340,window.innerWidth-24);
    tip.style.maxWidth=width+'px';
    tip.style.left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12))+'px';
    tip.style.top=(rect.bottom+8)+'px';
    if(rect.bottom+8+tip.offsetHeight>window.innerHeight-12)tip.style.top=Math.max(12,rect.top-tip.offsetHeight-8)+'px';
    button.setAttribute('aria-expanded','true');button.setAttribute('aria-describedby','definition-tooltip');
    activeDefinition=button;
  }

  // Markdown is authored in site/content/ on GitHub. Render links as links,
  // never as trusted HTML. All ordinary text still uses the original escaping.
  function inlineMarkdown(value) {
    const source=String(value||''), re=/\[([^\]\n]{1,150})\]\((https?:\/\/[^\s)]+)\)/gi;
    let out='', cursor=0, match;
    while ((match=re.exec(source))!==null) {
      out+=esc(source.slice(cursor,match.index));
      const url=safeUrl(match[2]);
      out+=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(match[1])+' ↗</a>':esc(match[0]);
      cursor=match.index+match[0].length;
    }
    return out+esc(source.slice(cursor));
  }
  md=function renderEditableMarkdown(source){
    let out='',buffer=[];
    const flush=()=>{if(buffer.length){out+='<p>'+inlineMarkdown(buffer.join(' '))+'</p>';buffer=[]}};
    for(const line of String(source||'').replace(/\r/g,'').split('\n')){
      const text=line.trim(),heading=text.match(/^(#{1,3})\s+(.+)$/);
      if(!text)flush();
      else if(heading){flush();const tag='h'+heading[1].length;out+='<'+tag+'>'+inlineMarkdown(heading[2])+'</'+tag+'>';}
      else buffer.push(text);
    }
    flush();return out;
  };
  mapSvg=function mapSvgWithOutOfScopeRegion(){
    let html=originalMapSvg();
    if(!html.includes('data-map-source="bc-tourism-regions"'))return html;
    html=html.replace(/<div class="map-figure-heading">[\s\S]*?<\/div>/,'');
    html=html.replace('data-map-select="vcm" class="map-region ','data-map-select="vcm" class="map-region map-region--out-of-scope ');
    html=html.replace('aria-label="Select Vancouver, Coast & Mountains"','aria-label="Vancouver, Coast & Mountains, outside the research scope"');
    html=html.replace(/(<svg data-map-source="bc-tourism-regions"[^>]*>)/,
      '$1<defs><pattern id="vcm-out-of-scope-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(40)"><rect width="9" height="9" fill="#d2dbd0"/><path d="M0 0V9" stroke="#9cafa0" stroke-width="3"/></pattern></defs>');
    return html;
  };
  profiles=async function profilesWithEditableDescriptions(){
    const html=await originalProfiles();
    return html.replace('Regional profiles and official tourism-region geography.','Regional profiles and geography');
  };

  readingHeader=function readingHeaderWithResearchQuestion(reviewMode){
    const html=originalReadingHeader(reviewMode);
    return reviewMode?html:html.replace('How each RDMO described its organization','How regional organizations describe their roles, priorities and beneficiaries');
  };

  // Use identical source control positions and behaviour on Language and Governance.
  readingSourceTools=function readingSourceToolsByPage(mode){
    if(mode!=='governance'){
      const tools=originalReadingSourceTools(mode);
      return mode===false?tools.replace(/<span class="reading-row-count">[\s\S]*?<\/span>/,''):tools;
    }
    const g=state.governance, imported=g?.origin==='imported';
    return '<details class="reading-workbook-details"><summary aria-label="Governance workbook settings">Workbook · '+
      (imported?'Imported':'GitHub')+'</summary>'+
      '<div class="reading-workbook-menu"><strong>'+esc(imported?g?.name||'Imported workbook':'governance.xlsx')+'</strong>'+
      '<label for="governance-import">Import governance XLSX</label>'+
      '<input id="governance-import" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">'+
      '<button class="reading-action" type="button" data-restore="governance">Restore GitHub workbook</button>'+
      '<p>Imports stay in this browser. Only independently verified board records appear as findings.</p></div></details>';
  };

  governance=function governanceWithCompactWorkbookControl(){
    chooseYear();
    const g=state.governance;
    if(!g)return '<div class="governance-reading-heading"><h1 class="page-title">Who speaks for<br>a destination?</h1><p>Loading governance records…</p></div>';
    const org=R.find(x=>x[0]===state.region)?.[1]||'Regional organization';
    const entries=g.board.filter(r=>rid(r.organization)===state.region && dateYear(r.record_date)===state.year);
    const verified=entries.filter(r=>String(r.verification_status).toLowerCase()==='verified');
    const sectors={};
    verified.forEach(r=>{const k=r.sector||'Unknown';sectors[k]=(sectors[k]||0)+1});
    const roster=verified.map(r=>'<article class="member"><div class="avatar"><span aria-hidden="true">○</span></div><b>'+
      esc(r.member_name||'Name withheld')+'</b><span>'+esc(r.role)+'</span><span>'+esc(r.affiliation||'Affiliation not stated')+'</span></article>').join('')||
      '<p class="empty">No verified board records yet.</p>';
    const sources=[...new Set(entries.map(r=>safeUrl(r.source_url)).filter(Boolean))]
      .map(url=>'<a href="'+esc(url)+'" rel="noopener noreferrer" target="_blank">Source ↗</a>').join(' · ');
    return '<div class="corner-meta">THOMPSON RIVERS UNIVERSITY | CMNS 3500 | FALL 2026</div>'+
      '<header class="governance-reading-heading"><div><h1 class="page-title">Who speaks for<br>a destination?</h1>'+
      '<p class="page-subtitle">Board composition across available source years</p></div>'+
      readingSourceTools('governance')+'</header>'+
      tabs()+'<div class="selected-region"><span>'+esc(org)+'</span><span class="selected-period">'+
      esc(state.year||'NO DATE')+' / DOCUMENTED OBSERVATION</span></div>'+timeline()+
      '<div class="governance-layout"><div class="board-roster">'+roster+'</div><div>'+
      '<div class="board-legend">'+(Object.entries(sectors).map(([k,v])=>'<span><i></i>'+esc(k)+' · '+v+'/'+verified.length+'</span>').join('')||
      '<span>Pending and excluded records are not composition findings.</span>')+'</div>'+
      '<div class="board-footnote">Board dates do not establish continuous tenure. '+sources+
      ' <button type="button" class="panel-action" data-open-sources>View sources ↗</button></div></div></div>';
  };

  readingFooter=function readingFooterSourceOnly(rows,source,reviewMode){
    if(reviewMode)return originalReadingFooter(rows,source,true);
    const url=safeUrl(source?.url||source?.source_url);
    const org=R.find(x=>x[0]===state.region)?.[1]||'Regional organization';
    const date=source?.date||source?.capture_date;
    const citation='Source: '+org+' About page'+(date?' · '+readingDateLabel(date):'');
    return '<div class="reading-footnotes">'+(url?'<a class="reading-source-citation" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(citation)+' ↗</a>':
      '<span class="reading-source-unavailable">'+esc(citation)+' · Link unavailable</span>')+'</div>';
  };

  function regionSourceYears(){
    return [...new Set((state.language?.docs||[]).filter(d=>d.region===state.region).map(d=>d.year).filter(Number.isFinite))].sort((a,b)=>a-b);
  }
  readingTimeline=function readingTimelineByOrganization(reviewMode){
    if(reviewMode)return originalReadingTimeline(true);
    const years=regionSourceYears();
    if(!years.length)return '<div class="lm-observation-line lm-observation-line--empty">No dated About page available for this organization.</div>';
    const current=Math.max(0,years.indexOf(state.year));
    const labels=years.map((y,i)=>'<button type="button" data-year="'+y+'" style="left:'+
      (years.length===1?50:i/(years.length-1)*100)+'%" aria-current="'+(years[current]===y)+'">'+y+'</button>').join('');
    return '<div class="lm-observation-line" aria-label="Available About-page capture years">'+
      '<div class="lm-observation-labels">'+labels+'</div>'+
      '<div class="lm-observation-track"><input id="language-year-slider" type="range" min="0" max="'+(years.length-1)+'" step="1" value="'+current+
      '" aria-label="Choose About-page source year"></div></div>';
  };


  const toneNames=['amber','indigo','sage','coral','blue','ochre','violet'];
  function coded(value){
    const v=String(value??'').trim();
    return !!v&&!/^(?:none|not stated(?: in clause)?|not coded|not specified|not applicable|unclear|unknown|n\/a|other)$/i.test(v);
  }
  function topCategories(rows,key,limit=4){
    const counts=new Map();
    for(const row of rows){
      const value=String(row[key]??'').trim();
      if(!coded(value))continue;
      const k=value.toLowerCase(),entry=counts.get(k)||{label:value,count:0};
      entry.count++;counts.set(k,entry);
    }
    return [...counts.values()].sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label))
      .slice(0,limit).map(x=>[x.label.length>70?x.label.slice(0,67)+'…':x.label,x.count]);
  }
  function cueCategories(rows,dimension,limit=5){
    return (window.LanguageMatrix?.themes?.[dimension]||[]).map((theme,i)=>{
      if(!theme.terms)return null;
      const re=new RegExp(theme.terms.source,theme.terms.flags.replace(/g/g,''));
      const count=rows.filter(row=>re.test(String(row.text||''))).length;
      return count?[theme.label,count,i]:null;
    }).filter(Boolean).sort((a,b)=>b[1]-a[1]).slice(0,limit);
  }
  function miniBreakdown(title,values,emptyText='No coded entries',help=''){
    const max=Math.max(1,...values.map(v=>v[1]));
    const bars=values.length?values.map(([value,count,tone])=>
      '<div class="lm-mini-row"><div class="lm-mini-label" title="'+esc(value)+'">'+
      (Number.isInteger(tone)?'<i class="lm-mini-swatch theme-tone-'+toneNames[tone]+'" aria-hidden="true"></i>':'')+esc(value)+
      '</div><div class="lm-mini-track"><i class="'+(Number.isInteger(tone)?'theme-tone-'+toneNames[tone]:'')+'" style="width:'+Math.max(6,Math.round(count/max*100))+'%"></i></div>'+
      '<strong>'+count+'</strong></div>').join(''):'<p class="lm-mini-empty">'+esc(emptyText)+'</p>';
    return '<section class="lm-mini-metric"><h3>'+esc(title)+definitionButton(help)+'</h3>'+bars+'</section>';
  }
  function compactOverview(){
    const rows=readingRecords(state.region,state.year).clauses.filter(r=>!['heading','caption','footer','button'].includes(r.type));
    const affected=topCategories(rows,'affected_participant',3);
    return '<div class="lm-annotation-overview"><p class="lm-overview-lede">Proposed linguistic codes and source-text search cues. Select a passage for details.</p>'+
      '<div class="lm-mini-grid">'+
      miniBreakdown('Processes',topCategories(rows,'process',4),'No process proposals','process')+
      miniBreakdown('Actors',topCategories(rows,'actor',3),'No named actors','actor')+
      (affected.length?miniBreakdown('Affected participants',affected,'No separately coded participants','affected_participant'):'')+
      miniBreakdown('Named groups · search cues',cueCategories(rows,'beneficiaries'),'No matching group terms','named_groups')+
      miniBreakdown('Priorities · search cues',cueCategories(rows,'priorities'),'No matching priority terms','priorities')+
      '</div><p class="lm-overview-caveat">Search cues are not confirmed beneficiaries, affected participants or research findings.</p></div>';
  }
  readingAnnotations=function readingAnnotationsWithoutSourceLink(selected){
    if(!selected)return compactOverview();
    const fields=[
      ['SFL process',READING_PROCESS_NAMES[readingProcessKey(selected.process)],'process_type'],
      ['Actor / primary participant',selected.actor,'actor'],
      ['Affected participant',selected.affected_participant,'affected_participant'],
      ['Agency / voice',/^(?:active|passive|non_finite)$/i.test(String(selected.agency||'').trim())?selected.agency:'','agency_voice'],
      ['Modality',selected.modality,'modality'],
      ['Institutional priority',selected.institutional_priority,'institutional_priority'],
      ['Social actor representation',selected.social_actor_representation,'social_actor_representation'],
      ['Coding annotation',selected.annotations,'annotations']
    ].filter(item=>coded(item[1]));
    const rowHtml=fields.map(([name,val,key])=>
      '<div class="reading-annotation-item"><dt>'+esc(name)+definitionButton(key)+'</dt><dd>'+esc(val)+'</dd></div>').join('');
    const cues=cueCategories([selected],'beneficiaries');
    const cueHtml=cues.length?'<div class="reading-annotation-item"><dt>Named groups · search cues'+definitionButton('named_groups')+'</dt><dd class="lm-clause-cues">'+
      cues.map(([name,,tone])=>'<span class="lm-cue-chip"><i class="theme-tone-'+toneNames[tone]+'" aria-hidden="true"></i>'+esc(name)+'</span>').join('')+
      '</dd></div>':'';
    return '<div class="reading-annotation-content"><dl>'+rowHtml+cueHtml+'</dl></div>';
  };

  function tableView(){
    const matrix=window.LanguageMatrix;
    if(!state.language||!matrix)return originalLanguage();
    const ui=matrix.ui,org=R.find(([id])=>id===state.region)?.[1]||'Regional organization';
    const years=[...new Set(matrix.availableDocs().map(d=>d.year))].sort((a,b)=>a-b);
    const themes=matrix.themes[ui.dimension]||matrix.themes.beneficiaries;
    const title=ui.dimension==='beneficiaries'?'Who is identified as a beneficiary?':'What does the organization prioritize?';
    const buttons='<div class="lm-view-switch" role="group" aria-label="Language display">'+
      [['timeline','Timeline'],['table','Tables']].map(([mode,label])=>
        '<button type="button" data-language-view="'+mode+'" aria-pressed="'+(ui.view===mode)+'">'+label+'</button>').join('')+'</div>';
    const dimensions='<div class="lm-theme-switch" role="group" aria-label="Research dimension">'+
      [['beneficiaries','Beneficiaries'],['priorities','Priorities']].map(([mode,label])=>
        '<button type="button" data-language-dimension="'+mode+'" aria-pressed="'+(ui.dimension===mode)+'">'+label+'</button>').join('')+'</div>';
    const th='<thead><tr><th scope="col">Theme</th>'+years.map(y=>'<th scope="col">'+y+'</th>').join('')+'</tr></thead>';
    const tbody=themes.map(theme=>'<tr><th scope="row">'+esc(theme.label)+'</th>'+years.map(year=>{
      const status=matrix.statusFor(theme,year);
      return '<td><button type="button" data-theme-cell="'+esc(theme.id)+'|'+year+'" class="lm-cell lm-cell--'+status.key+'" title="Inspect '+esc(theme.label)+' in '+year+
      '" aria-label="'+esc(org+': '+theme.label+', '+year+', '+status.label)+'">'+esc(status.label)+'</button></td>';
    }).join('')+'</tr>').join('');
    const table=years.length?'<div class="lm-table-scroll"><table class="lm-table lm-table--regional">'+
      '<colgroup><col class="lm-theme-column">'+years.map(()=>'<col class="lm-year-column">').join('')+'</colgroup>'+th+
      '<tbody>'+tbody+'</tbody></table></div>':
      '<p class="lm-empty">No eligible dated About pages are available for '+esc(org)+'.</p>';
    return '<div class="reading-design lm-table-view lm-clean-table">'+readingHeader(false)+readingTabs()+
      '<div class="lm-mode-row">'+buttons+'</div><div class="lm-dimension-row">'+dimensions+'</div>'+
      '<section class="lm-surface" aria-label="Theme comparison for '+esc(org)+'">'+
      '<header class="lm-surface-head"><h2>'+esc(title)+'</h2></header>'+
      '<div class="lm-surface-body"><div class="lm-matrix-pane">'+table+'</div></div></section></div>';
  }

  language=function languageWithSourceFocusedTables(){
    if(state.language && window.LanguageMatrix?.ui.view==='table')return tableView();
    return originalLanguage().replace(
      '<span class="lm-inline-note">Original About-page excerpts · SFL tags available in Annotations</span>',''
    );
  };

  function syncSelectedClause(id) {
    const record=readingRecords(state.region,state.year);
    const selected=record.clauses.find(r=>r.id===id)||null;
    state.selected=selected?.id||null;
    const panel=document.querySelector('.reading-language .reading-annotations');
    if(!panel)return;
    const h=panel.querySelector('header>span');
    if(h)h.textContent=selected?'Selected passage':'Overview';
    const scroller=panel.querySelector('.reading-scroll');
    if(scroller){scroller.innerHTML=readingAnnotations(selected);scroller.scrollTop=0;}
    document.querySelectorAll('.reading-language [data-excerpt]').forEach(node=>
      node.setAttribute('aria-pressed',String(node.dataset.excerpt===state.selected)));
    // On phones the annotation card follows the full source text.
    if(selected && typeof matchMedia==='function' && matchMedia('(max-width: 820px)').matches) {
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      panel.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
    }
  }

  // The full About page is reconstructed using paragraph/list locators already
  // present in the workbook. Phrase highlights are search cues, never decisions.
  function markedText(value,dimension){
    const source=String(value||''),themes=window.LanguageMatrix.themes[dimension];
    const matches=[];
    themes.forEach((theme,index)=>{
      if(!theme.terms)return;
      const re=new RegExp(theme.terms.source,'gi');
      for(const match of source.matchAll(re)){
        if(!match[0])continue;
        matches.push({start:match.index,end:match.index+match[0].length,index,label:theme.label});
      }
    });
    matches.sort((a,b)=>a.start-b.start||b.end-a.end||a.index-b.index);
    let pos=0,out='';
    for(const m of matches){
      if(m.start<pos)continue;
      out+=esc(source.slice(pos,m.start));
      out+='<mark class="theme-phrase theme-tone-'+toneNames[m.index]+'" title="Search term: '+esc(m.label)+'">'+esc(source.slice(m.start,m.end))+'</mark>';
      pos=m.end;
    }
    return out+esc(source.slice(pos));
  }
  function highlightedPage(doc,dimension){
    const raw=readingSortRows((state.language?.clauses||[]).filter(row=>row.source===doc.id));
    const fragment=document.createElement('div');
    fragment.innerHTML=readingHighlightRows(raw,null,false);
    for(const button of fragment.querySelectorAll('[data-excerpt]')){
      const id=button.dataset.excerpt,value=button.textContent;
      const approved=window.LanguageMatrix.themes[dimension].map((theme,i)=>{
        const f=window.LanguageMatrix.acceptedFinding(theme,doc);
        return f?.result==='present'&&f.supportIds.includes(id)?i:null;
      }).find(v=>v!==null && v!==undefined);
      const replacement=document.createElement('span');
      replacement.className='theme-source-clause';
      replacement.dataset.rowId=id;
      replacement.innerHTML=approved===undefined?markedText(value,dimension):
        '<mark class="theme-phrase theme-tone-'+toneNames[approved]+' theme-confirmed" title="Human-confirmed passage">'+esc(value)+'</mark>';
      button.replaceWith(replacement);
    }
    return fragment.innerHTML;
  }
  function themeDocumentContent(){
    if(!themeModalSelection)return null;
    const {year,theme,dimension}=themeModalSelection;
    const docs=window.LanguageMatrix.availableDocs().filter(d=>d.year===year);
    const doc=docs.find(d=>d.id===themeModalSelection.sourceId)||docs[0]||null;
    const selected=window.LanguageMatrix.themes[dimension].find(t=>t.id===theme);
    const name=R.find(([id])=>id===state.region)?.[1]||'Regional organization';
    const dialog=document.querySelector('#theme-document-modal');
    if(!dialog)return null;
    dialog.querySelector('.theme-dialog-eyebrow').textContent=name+' · '+year;
    dialog.querySelector('#theme-dialog-title').textContent=selected?.label||'About-page source';
    const src=dialog.querySelector('.theme-dialog-source');
    const body=dialog.querySelector('.theme-dialog-reading');
    const legend=dialog.querySelector('.theme-dialog-legend');
    const note=dialog.querySelector('.theme-dialog-note');
    if(!doc){
      src.textContent='No documented About page for this year';
      body.innerHTML='<p>No source text is available. No theme conclusion can be made.</p>';
    }else{
      const link=safeUrl(doc.url);
      src.innerHTML='<strong>About-page excerpt</strong> · '+esc(readingDateLabel(doc.date))+
        (link?' · <a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Original capture ↗</a>':' · Source link unavailable')+
        (docs.length>1?' · <label>Capture <select data-theme-source>'+docs.map(d=>
          '<option value="'+esc(d.id)+'" '+(d.id===doc.id?'selected':'')+'>Source '+(docs.indexOf(d)+1)+'</option>').join('')+'</select></label>':'');
      body.innerHTML=highlightedPage(doc,dimension);
      body.scrollTop=0;
    }
    legend.innerHTML=window.LanguageMatrix.themes[dimension].map((t,i)=>
      '<span class="theme-legend-item"><i class="theme-tone-'+toneNames[i]+'"></i>'+esc(t.label)+'</span>').join('');
    note.textContent='Displayed text is reconstructed from indexed workbook passages; open the original capture for unexcerpted content. Coloured terms are search cues, not verified interpretations. Outlined passages have a human-confirmed theme recorded in the workbook.';
    return doc;
  }
  function openThemeModal(raw){
    const parts=String(raw||'').split('|'),year=Number(parts[1]);
    const matrix=window.LanguageMatrix;
    if(!matrix||!(matrix.themes[matrix.ui.dimension]||[]).some(t=>t.id===parts[0]) ||
       !matrix.availableDocs().some(d=>d.year===year))return;
    themeModalSelection={theme:parts[0],year,dimension:matrix.ui.dimension,sourceId:null};
    themeDocumentContent();
    const dialog=document.querySelector('#theme-document-modal');
    if(!dialog)return;
    modalFocusTarget=document.activeElement;
    dialog.showModal();
    dialog.querySelector('.theme-dialog-close')?.focus();
  }
  function closeThemeModal(){
    const dialog=document.querySelector('#theme-document-modal');
    if(dialog?.open)dialog.close();
  }

  document.addEventListener('click',event=>{
    const definition=event.target.closest('[data-definition]');
    if(definition){event.preventDefault();event.stopPropagation();toggleDefinition(definition);return;}
    if(activeDefinition&&!event.target.closest('#definition-tooltip'))closeDefinition();
    const button=event.target.closest('[data-theme-cell]');
    if(button&&state.route==='language'){
      event.preventDefault();event.stopPropagation();
      openThemeModal(button.dataset.themeCell);return;
    }
    if(event.target.closest('.theme-dialog-close')){closeThemeModal();return;}
    if(event.target.id==='theme-document-modal'){closeThemeModal();return;}
    if(state.route!=='language'||window.LanguageMatrix?.ui.view!=='timeline')return;
    const clause=event.target.closest('.reading-language [data-excerpt]');
    if(clause){
      event.preventDefault();event.stopPropagation();
      syncSelectedClause(clause.dataset.excerpt);return;
    }
    const reading=document.querySelector('.reading-language');
    const outsideAnnotation=reading && state.selected &&
      event.target.closest('.reading-language') &&
      !event.target.closest('.reading-language .reading-annotations') &&
      !event.target.closest('[data-excerpt],button,a,input,select,summary,label');
    if(outsideAnnotation)syncSelectedClause(null);
  },true);
  document.addEventListener('change',event=>{
    if(event.target.id==='language-year-slider'&&state.route==='language'){
      event.stopPropagation();
      const years=regionSourceYears(),value=years[Number(event.target.value)];
      if(Number.isFinite(value)){state.year=value;state.selected=null;render();}
    }
    if(event.target.matches('[data-theme-source]')&&themeModalSelection){
      themeModalSelection.sourceId=event.target.value;
      themeDocumentContent();
    }
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')closeDefinition();
    if(event.key==='Enter'||event.key===' '){
      const element=event.target.closest('.reading-language .reading-source-heading [data-excerpt]');
      if(element){event.preventDefault();syncSelectedClause(element.dataset.excerpt);}
    }
  },true);
  document.addEventListener('close',event=>{
    if(event.target.id==='theme-document-modal')modalFocusTarget?.focus?.();
  },true);
  window.SiteRefinements={inlineMarkdown,regionSourceYears,markedText,highlightedPage,compactOverview,tableView,openThemeModal};
})();