/* Prototype-based, workbook-driven two-panel Language and Adjudicator views. */
'use strict';
const READING_PROCESS_NAMES = Object.freeze({
  material:'Material process',
  relational:'Relational process',
  verbal:'Verbal process',
  mental:'Mental process',
  existential:'Existential process',
  behavioural:'Behavioural process',
  unclear:'Unclear / not coded',
  not_applicable:'Not applicable',
  other:'Other / unspecified'
});
const READING_PROCESS_ORDER = ['material','relational','verbal','mental','existential','behavioural','unclear','not_applicable','other'];
let readingSourceId = null;

function readingProcessKey(value) {
  const v = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(READING_PROCESS_NAMES, v) ? v : 'other';
}
function readingLabel(value, fallback) {
  return esc(value === undefined || value === null || value === '' ? (fallback || 'Not specified') : value);
}

function readingRecords(region, year) {
  const data = state.language;
  const availableSources = (data?.docs || []).filter(x => x.region === region && x.year === year);
  const sameYear = (data?.clauses || []).filter(x => x.region === region && x.year === year);
  const activeClause = sameYear.find(x => x.id === state.selected);
  const chosen = availableSources.find(x => x.id === readingSourceId) ||
    availableSources.find(x => x.id === activeClause?.source) || availableSources[0] || null;
  const clauses = chosen ? sameYear.filter(x => x.source === chosen.id) : [];
  return {
    clauses: readingSortRows(clauses),
    sources: chosen ? [chosen] : [],
    availableSources
  };
}
function readingSortRows(rows) {
  return rows.map((r,index)=>({r,index})).sort((a,b)=>
    Number.isFinite(a.r.source_order) && Number.isFinite(b.r.source_order)
      ? a.r.source_order-b.r.source_order || a.index-b.index
      : a.index-b.index
  ).map(x=>x.r);
}
function readingDateLabel(value) {
  if (!value) return 'Date not recorded';
  if (typeof value==='number' && typeof XLSX!=='undefined') { const parts=XLSX.SSF.parse_date_code(value); if(parts) return parts.y+'-'+String(parts.m).padStart(2,'0')+'-'+String(parts.d).padStart(2,'0'); }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0,10);
}
function readingSourceTools(reviewMode) {
  const data = state.language;
  const imported = data?.origin === 'imported';
  const label = imported ? data?.name || 'Imported workbook' : 'RDMO_about_coding_review.xlsx';
  return '<details class="reading-workbook-details"><summary aria-label="Language workbook settings">Workbook · ' +
    (imported ? 'Imported' : 'GitHub') + '<span class="reading-row-count"> · ' + (data?.rows || 0) + ' rows</span></summary>' +
    '<div class="reading-workbook-menu"><strong title="' + esc(label) + '">' + esc(label) + '</strong>' +
    '<label for="language-import">Import language XLSX</label><input id="language-import" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">' +
    '<button type="button" class="reading-action" data-restore="language">Restore GitHub workbook</button>' +
    '<p>Imports remain in this browser. Available years and annotations update from the selected file.</p>' +
    (reviewMode && state.owner ? '<p>Researcher decisions use Alfred’s private workbook, not the public import.</p>' : '') +
    '</div></details>';
}
function readingTabs() {
  // Share the same region controls with the Profiles page.
  return tabs();
}

function readingSourceBlockKey(item) {
  const curated=window.SourceStructure?.[item.source]?.blocks?.[item.id];
  if(curated)return 'documented:'+item.source+':'+curated;
  const explicit = item.block_id || item.paragraph_id;
  if (explicit) return 'block:' + explicit;
  const loc = String(item.section || '');
  const xpath = loc.split(/\s*[;|]\s*/,1)[0].trim();
  // The original public workbook records the DOM paragraph location, before character offsets.
  if (/(?:^|\/)p(?:\[\d+\])?$/.test(xpath)) return 'dom:' + xpath;
  const named = loc.match(/\bparagraph\s+(\d+)\b/i);
  if (named) return 'named:' + named[1] + ':' + loc.split('|')[0].trim();
  // The newer workbook retains page_section, but no paragraph-specific locator.
  // Group consecutive clauses within one section, while keeping headings, lists and
  // standalone material as hard boundaries. A future block_id takes precedence.
  return loc && !loc.includes('/') ? 'section:' + loc : null;
}
function readingHighlightRows(rows, selectedId, reviewMode) {
  if (!rows.length) return '<p class="reading-no-source" role="status">No captured About-page passages are available for this organization and year. Choose another observed source date.</p>';
  let html='<div class="reading-flow" aria-label="Source content, following workbook order">';
  let tag=null, key=null, listNumber=null, previousSource=null;
  function close() {
    if(tag) html+='</'+tag+'>';
    tag=null;key=null;listNumber=null;
  }
  function enter(nextTag,nextKey=null,start=null) {
    if(tag===nextTag&&key===nextKey&&nextKey!==null) return;
    close();
    tag=nextTag;key=nextKey;
    html+='<'+nextTag+(nextTag==='ol'&&Number.isInteger(start)?' start="'+start+'"':'')+'>';
    if(nextTag==='ol') listNumber=(Number.isInteger(start)?start:1)-1;
  }
  function control(item,content) {
    const id=reviewMode?item.row_id:item.id;
    const field=reviewMode?'data-review-row':'data-excerpt';
    const category=readingProcessKey(reviewMode?(item.draft?.process_type||item.original?.process_type||''):item.process);
    const visible=String(content).trim();
    const full=String(reviewMode?(item.verbatim_text||item.text||''):item.text||'').trim();
    return '<span role="button" tabindex="0" class="reading-highlight reading-highlight--'+category+'" '+
      field+'="'+esc(id)+'" aria-pressed="'+(id===selectedId)+'" aria-label="'+esc(full)+'" title="'+esc(READING_PROCESS_NAMES[category])+'">'+esc(visible)+'</span>';
  }
  function addList(item,content,number=null,bullet=false) {
    const kind=bullet?'ul':'ol';
    if (tag===kind && kind==='ol' && Number.isInteger(number) && number!==listNumber+1) close();
    if(tag!==kind) enter(kind,'list:'+kind,number);
    html+='<li>'+control(item,content)+'</li>';
    if(kind==='ol')listNumber++;
  }
  for(const item of readingSortRows(rows)) {
    const src=reviewMode?item.about_id:item.source;
    const content=String(reviewMode?(item.verbatim_text||item.text||''):item.text||'').trim();
    if(!content)continue;
    const type=String(item.type||item.text_type||'clause').toLowerCase();
    if(src!==previousSource) {
      close();
      // Internal document IDs are not displayed.
      previousSource=src;
    }
    // Source-checked display headings do not add or change coded clauses.
    const display=window.SourceStructure?.[src];
    for(const heading of display?.before?.[reviewMode?item.row_id:item.id]||[]) {
      close();
      const level=heading.level===2?'h2':'h3';
      html+='<'+level+' class="reading-source-heading reading-source-heading--documented">'+esc(heading.text)+'</'+level+'>';
    }
    if(display?.styles?.[item.id]==='lead') {
      close();
      html+='<h4 class="reading-source-lead">'+control(item,content)+'</h4>';
      continue;
    }
    if(type==='heading') {
      close();
      const id=reviewMode?item.row_id:item.id;
      const attr=reviewMode?'data-review-row':'data-excerpt';
      html+='<h3 class="reading-source-heading"><button type="button" '+attr+'="'+esc(id)+'" aria-pressed="'+(id===selectedId)+'" title="Inspect source heading">'+esc(content)+'</button></h3>';
      continue;
    }
    const numbered=content.match(/^(\d+)[.)]\s+([\s\S]+)$/);
    const bulleted=content.match(/^(?:[•●▪\-*])\s+([\s\S]+)$/);
    const intro=content.match(/^(.+?:)\s+(1)[.)]\s+([\s\S]+)$/);
    if(type==='list_item'||numbered||bulleted) {
      addList(item,numbered?numbered[2]:bulleted?bulleted[1]:content,numbered?Number(numbered[1]):null,!!bulleted||(!numbered&&type==='list_item'));
      continue;
    }
    if(intro) {
      enter('p','intro:'+String(item.id||item.row_id));
      html+=control(item,intro[1]);
      close();
      addList(item,intro[3],Number(intro[2]),false);
      continue;
    }
    if(['button','teaser','caption','footer','other'].includes(type)) {
      close();
      const cls='reading-source-'+type;
      html+='<div class="'+cls+'">'+control(item,content)+'</div>';
      continue;
    }
    const block=readingSourceBlockKey(item);
    if(tag!=='p'||key!==block||block===null)enter('p',block);
    const connector=reviewMode?' ':display?.separators?.[item.id];
    html+=control(item,content)+(typeof connector==='string'&&connector.length<=8?esc(connector):' ');
  }
  close();
  return html+'</div>';
}
function readingLegend(rows, reviewMode) {
  const counts = {};
  for (const row of rows) {
    const key = readingProcessKey(reviewMode ? (row.draft?.process_type || row.original?.process_type || '') : row.process);
    counts[key] = (counts[key] || 0) + 1;
  }
  if (!rows.length) return '<span class="reading-legend-empty">No coded passages for this observation.</span>';
  return READING_PROCESS_ORDER.filter(key => counts[key]).map(key =>
    '<span class="reading-legend-item" title="' + esc(READING_PROCESS_NAMES[key]) + '"><i class="reading-legend-dot reading-legend-dot--' + key + '" aria-hidden="true"></i>' +
    '<span>' + esc(READING_PROCESS_NAMES[key]) + ' <small>(' + counts[key] + ')</small></span></span>'
  ).join('');
}
function readingAnnotationValue(heading, value) {
  return '<div class="reading-annotation-item"><dt>' + esc(heading) + '</dt><dd>' + readingLabel(value) + '</dd></div>';
}
function readingAnnotations(selected, source) {
  if (!selected) return '<div class="reading-placeholder"><p>Select a highlighted passage to inspect its proposed tags.</p><p>Colours represent SFL process categories, not verified findings.</p></div>';
  const link = safeUrl(selected.url || source?.url);
  const fields = [
    ['SFL process', READING_PROCESS_NAMES[readingProcessKey(selected.process)]],
    ['Actor / primary participant', selected.actor],
    ['Affected participant', selected.affected_participant],
    ['Agency / voice', selected.agency],
    ['Modality', selected.modality],
    ['Institutional priority', selected.institutional_priority],
    ['Social actor representation', selected.social_actor_representation],
    ['Coding annotation', selected.annotations]
  ];
  return '<div class="reading-annotation-content"><div class="reading-annotation-status">' + esc(selected.id) + ' · ' + esc(selected.status || 'pending human review') + '</div>' +
    '<blockquote>' + esc(selected.text) + '</blockquote><dl>' + fields.map(pair => readingAnnotationValue(pair[0],pair[1])).join('') + '</dl>' +
    (link ? '<a href="' + esc(link) + '" rel="noopener noreferrer" target="_blank">Open source capture ↗</a>' : '<p>Source URL unavailable.</p>') + '</div>';
}
function readingHeader(reviewMode) {
  const title = reviewMode ? 'Annotation<br>Adjudicator' : 'The language<br>of a destination';
  const subtitle = reviewMode ? 'Model assisted. Human adjudicated.' : 'How each RDMO described its organization';
  return '<div class="corner-meta">THOMPSON RIVERS UNIVERSITY | CMNS 3500 | FALL 2026</div>' +
    '<header class="reading-heading"><div><h1 class="page-title">' + title + '</h1><p class="page-subtitle">' + subtitle + '</p></div>' +
    readingSourceTools(reviewMode) + '</header>';
}

function readingFooter(rows, source, reviewMode) {
  const count=rows.length;
  const date=source?.date||source?.capture_date||'';
  const url=safeUrl(source?.url||source?.source_url);
  const sourceId=String(source?.id||source?.about_id||'About page');
  const orgName=R.find(pair=>pair[0]===state.region)?.[1]||'RDMO';
  const archive=url&&new URL(url).hostname==='web.archive.org';
  const citation=url
    ? '<a class="reading-source-citation" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(url)+'">Source: '+esc(orgName)+' About ('+esc(sourceId)+')'+
      (date?' · '+(archive?'Archived ':'Retrieved ')+esc(readingDateLabel(date)):'')+' ↗</a>'
    : '<span class="reading-source-unavailable">Source link unavailable for the displayed About page</span>';
  const detail=count+(reviewMode?' available review rows':' workbook passages')+
    ' · '+(reviewMode?(state.owner?'Private reviewer':'Local visitor workspace'):'AI-proposed; human review pending');
  return '<div class="reading-legend" aria-label="SFL process highlight key"><span class="reading-legend-label">SFL concepts · Proposed</span>'+
    readingLegend(rows,reviewMode)+'</div>'+
    '<div class="reading-footnotes">'+citation+'<span>'+esc(detail)+'</span></div>';
}
function readingSourcePicker(options,selected) {
  if(options.length<=1) return '';
  return '<label class="reading-source-picker">About-page capture <select data-reading-source aria-label="Select About-page capture">'+
    options.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===selected?.id?'selected':'')+'>'+'Capture '+(options.indexOf(x)+1)+' · '+esc(readingDateLabel(x.date||x.capture_date))+'</option>').join('')+
    '</select></label>';
}
function readingScaffold(reviewMode, left, right, rows, source, title, selectionLabel, sourcePicker='') {
  return '<div class="reading-design ' + (reviewMode?'reading-review':'reading-language') + '">' +
    readingHeader(reviewMode) + readingTabs() +
    '<div class="reading-date-strip" aria-label="Available source capture years">' + readingTimeline(reviewMode) + '</div>' +
    '<div class="reading-panels">' +
      '<section class="reading-card reading-about" aria-label="Source text">' +
        '<header><h2>' + esc(title) + '</h2>'+sourcePicker+'<span>' + esc(selectionLabel) + '</span></header>' +
        '<div class="reading-scroll">' + left + '</div></section>' +
      '<section class="reading-card reading-annotations" aria-label="Annotations">' + right + '</section>' +
    '</div>' + readingFooter(rows,source,reviewMode) + '</div>';
}
function language() {
  chooseYear();
  const result = readingRecords(state.region,state.year);
  const selected = result.clauses.find(row => row.id === state.selected);
  const source = result.sources.find(row => row.id === selected?.source) || result.sources[0];
  const name = R.find(pair => pair[0] === state.region)?.[1] || 'Regional organization';
  const left = readingHighlightRows(result.clauses,selected?.id,false);
  const right = '<header><h2>Annotations</h2><span>' + (selected ? 'Selected passage' : 'Overview') + '</span></header>' +
    '<div class="reading-scroll" aria-live="polite">' + readingAnnotations(selected,source) + '</div>';
  return readingScaffold(false,left,right,result.clauses,source,'About us',name + ' · ' + (state.year||'No date'),readingSourcePicker(result.availableSources,source));
}
function readingReviewPeriod(row) {
  // The authenticated reviewer reads the current private workbook. Never assign
  // its rows a year taken from a different public workbook.
  const captured=row.capture_date ? dateYear(row.capture_date) : null;
  if(Number.isFinite(captured)) return captured;
  const aboutId = String(row.about_id || '');
  const d = state.language?.docs?.find(d => d.id === aboutId);
  if (d?.year) return d.year;
  const match = aboutId.match(/[-_](H|C)$/i);
  const years = (state.language?.docs || []).filter(d => d.region === rid(aboutId)).map(d => d.year).filter(Number.isFinite).sort((a,b)=>a-b);
  if (match && years.length) return match[1].toUpperCase()==='H' ? years[0] : years[years.length-1];
  return null;
}

function readingReviewYears() {
  return [...new Set(currentRows().map(readingReviewPeriod).filter(Number.isFinite))].sort((a,b)=>a-b);
}
function readingEnsureReviewYear() {
  const all=readingReviewYears();
  if(!all.length){ state.year=null;return; }
  if(all.includes(state.year))return;
  const region=readingReviewCandidatesByRegion().map(readingReviewPeriod);
  state.year=region.find(Number.isFinite)??all[0];
}
function readingReviewCandidatesByRegion() {
  return currentRows().filter(row=>rid(row.about_id)===state.region);
}
function readingTimeline(reviewMode) {
  if(!reviewMode)return timeline();
  const ys=readingReviewYears();
  if(!ys.length)return '<section class="timeline"><p class="empty">No dated review source records.</p></section>';
  const i=Math.max(0,ys.indexOf(state.year)),percent=ys.length>1?i/(ys.length-1)*100:0;
  return '<section class="timeline" aria-label="Source chronology"><div class="timeline-labels">'+
    ys.map((year,n)=>'<button type="button" data-year="'+year+'" style="left:'+(ys.length>1?n/(ys.length-1)*100:50)+'%" aria-current="'+(year===state.year)+'">'+year+'</button>').join('')+
    '</div><div class="timeline-track" style="--progress:'+percent+'%"><input id="review-time-slider" type="range" min="0" max="'+(ys.length-1)+'" step="1" value="'+i+'" aria-label="Select reviewer source year"></div>'+
    '<div class="timeline-caption"><span>OBSERVED SOURCE DATES</span><span>SELECTED '+state.year+'</span></div></section>';
}
function readingReviewCandidates() {
  return readingSortRows(currentRows().filter(row => rid(row.about_id) === state.region && readingReviewPeriod(row) === state.year));
}
function readingReviewRows() {
  const candidates=readingReviewCandidates();
  const selected=candidates.find(row=>row.row_id===state.selected);
  const aboutId=candidates.find(row=>row.about_id===readingSourceId)?.about_id || selected?.about_id || candidates[0]?.about_id;
  return candidates.filter(row=>row.about_id===aboutId);
}
function adjudicator(){return ''; /* replaced by canonical-workflow.js */}
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-review-row],[data-review-prev],[data-review-next]');
  if(!button) return;
  event.preventDefault();
  event.stopPropagation();
  const rows = readingReviewRows();
  let id = button.dataset.reviewRow;
  if(!id) {
    const ix = Math.max(0,rows.findIndex(r => r.row_id === state.selected));
    id = rows[(ix + (button.hasAttribute('data-review-prev')? rows.length-1:1))%rows.length]?.row_id;
  }
  if (!id) return;
  state.selected=id;
  const promise=render();
  if(typeof matchMedia==='function' && matchMedia('(max-width: 820px)').matches){
    Promise.resolve(promise).then(()=>{
      if(state.route!=='adjudicator')return;
      const annotation=document.querySelector('.reading-review .reading-annotations');
      if(annotation)annotation.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    });
  }
},true);
document.addEventListener('change', event => {
  if(event.target.matches('[data-reading-source]')) { readingSourceId=event.target.value;state.selected=null;render(); }
  if(event.target.id==='review-time-slider'){ state.year=readingReviewYears()[Number(event.target.value)]??null;state.selected=null;render(); }
  if(event.target.id==='source-checked') readingSourceVerified=event.target.checked;
  if(event.target.id==='recoded') readingRecoded=event.target.checked;
},true);
// Inline text wraps naturally while Enter and Space activate its clause selection.
document.addEventListener('keydown', event => {
  if(event.key!=='Enter'&&event.key!==' ')return;
  const clause=event.target.closest?.('[role="button"][data-excerpt],[role="button"][data-review-row]');
  if(!clause)return;
  event.preventDefault();
  clause.click();
},true);
window.ReadingViews = {readingRecords,readingReviewPeriod,readingProcessKey,readingLegend,readingReviewRows};