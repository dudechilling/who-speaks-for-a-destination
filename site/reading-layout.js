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
let readingSourceVerified = false;
let readingRecoded = false;

function readingProcessKey(value) {
  const v = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(READING_PROCESS_NAMES, v) ? v : 'other';
}
function readingLabel(value, fallback) {
  return esc(value === undefined || value === null || value === '' ? (fallback || 'Not specified') : value);
}
function readingRecords(region, year) {
  const data = state.language;
  return {
    clauses: (data?.clauses || []).filter(x => x.region === region && x.year === year && String(x.text || '').trim()),
    sources: (data?.docs || []).filter(x => x.region === region && x.year === year)
  };
}
function readingDateLabel(value) {
  if (!value) return 'Date not recorded';
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
  return '<nav class="reading-region-tabs" aria-label="Choose a regional tourism organization">' +
    R.map(pair => '<button type="button" data-region="' + esc(pair[0]) + '" aria-pressed="' + (pair[0] === state.region) + '">' + esc(pair[1]) + '</button>').join('') +
    '</nav>';
}
function readingHighlightRows(rows, selectedId, reviewMode) {
  if (!rows.length) return '<p class="reading-no-source" role="status">No captured About-page passages are available for this organization and year. Choose another observed source date.</p>';
  let html = '<div class="reading-flow" aria-label="Source passages in workbook order">';
  let paragraphOpen = false;
  let previousSource = null;
  let previousSection = null;
  for (const item of rows) {
    const id = reviewMode ? item.row_id : item.id;
    const text = reviewMode ? (item.verbatim_text || item.text || '') : item.text;
    const src = reviewMode ? item.about_id : item.source;
    const section = String(item.section || '');
    const type = String(item.type || 'clause').toLowerCase();
    const category = readingProcessKey(reviewMode ? (item.draft?.process_type || item.original?.process_type || '') : item.process);
    if (previousSource !== src) {
      if (paragraphOpen) { html += '</p>'; paragraphOpen = false; }
      html += '<div class="reading-document-name">' + esc(src || 'Unidentified source') + '</div>';
    } else if (section && section !== previousSection) {
      if (paragraphOpen) { html += '</p>'; paragraphOpen = false; }
    }
    if (type === 'heading' && !reviewMode) {
      if (paragraphOpen) { html += '</p>'; paragraphOpen = false; }
      html += '<h3 class="reading-source-heading"><button type="button" data-excerpt="' + esc(id) + '" aria-pressed="' + (selectedId === id) + '" title="Inspect heading record" >' + esc(text) + '</button></h3>';
    } else {
      if (!paragraphOpen) { html += '<p>'; paragraphOpen = true; }
      const buttonAttribute = reviewMode ? 'data-review-row' : 'data-excerpt';
      const displayText = text.trim() || (reviewMode ? id + ' · Select to load private wording' : 'Empty passage');
      html += '<button type="button" class="reading-highlight reading-highlight--' + category + '" ' + buttonAttribute + '="' + esc(id) + '" aria-pressed="' + (selectedId === id) + '" aria-label="' + esc(id + ': ' + displayText) + '" title="' + esc(READING_PROCESS_NAMES[category]) + '">' + esc(displayText) + '</button> ';
    }
    previousSource = src;
    previousSection = section;
  }
  if (paragraphOpen) html += '</p>';
  return html + '</div>';
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
function readingFooter(rows, sources, reviewMode) {
  const chosen = sources?.[0];
  const count = rows.length;
  const detail = (chosen?.date ? 'Capture: ' + readingDateLabel(chosen.date) + ' · ' : '') +
    count + (reviewMode ? ' available review rows' : ' workbook passages') +
    ' · ' + (reviewMode ? (state.owner ? 'Private reviewer' : 'Local visitor workspace') : 'AI-proposed; human review pending');
  return '<div class="reading-legend" aria-label="SFL process highlight key"><span class="reading-legend-label">SFL concepts · Proposed</span>' +
    readingLegend(rows,reviewMode) + '</div>' +
    '<div class="reading-footnotes"><button type="button" data-open-sources>Footnotes for sources</button><span>' +
    esc(detail) + '</span></div>';
}
function readingScaffold(reviewMode, left, right, rows, sources, title, selectionLabel) {
  return '<div class="reading-design ' + (reviewMode?'reading-review':'reading-language') + '">' +
    readingHeader(reviewMode) + readingTabs() +
    '<div class="reading-date-strip" aria-label="Available source capture years">' + timeline() + '</div>' +
    '<div class="reading-panels">' +
      '<section class="reading-card reading-about" aria-label="Source text">' +
        '<header><h2>' + esc(title) + '</h2><span>' + esc(selectionLabel) + '</span></header>' +
        '<div class="reading-scroll">' + left + '</div></section>' +
      '<section class="reading-card reading-annotations" aria-label="Annotations">' + right + '</section>' +
    '</div>' + readingFooter(rows,sources,reviewMode) + '</div>';
}
function language() {
  chooseYear();
  const result = readingRecords(state.region,state.year);
  const selected = result.clauses.find(row => row.id === state.selected);
  const source = result.sources.find(row => row.id === selected?.source) || result.sources[0];
  const name = R.find(pair => pair[0] === state.region)?.[1] || 'Regional organization';
  const left = readingHighlightRows(result.clauses,selected?.id,false);
  const right = '<header><h2>Annotations</h2><span>' + (selected ? esc(selected.id) : 'Select a clause') + '</span></header>' +
    '<div class="reading-scroll" aria-live="polite">' + readingAnnotations(selected,source) + '</div>';
  return readingScaffold(false,left,right,result.clauses,result.sources,'About us',name + ' · ' + (state.year||'No date'));
}
function readingReviewPeriod(row) {
  const aboutId = String(row.about_id || '');
  const d = state.language?.docs?.find(d => d.id === aboutId);
  if (d?.year) return d.year;
  const match = aboutId.match(/[-_](H|C)$/i);
  const years = (state.language?.docs || []).filter(d => d.region === rid(aboutId)).map(d => d.year).filter(Number.isFinite).sort((a,b)=>a-b);
  if (match && years.length) return match[1].toUpperCase()==='H' ? years[0] : years[years.length-1];
  return null;
}
function readingReviewRows() {
  return currentRows().filter(row => rid(row.about_id) === state.region && readingReviewPeriod(row) === state.year);
}
function readingReviewAnnotation(selected) {
  if (!selected) return '<div class="reading-placeholder"><p>Choose a source passage on the left to review its tags.</p><p>You can use the visitor workspace without changing the published research data.</p></div>';
  const proposed = selected.original || {};
  return '<div class="reading-review-form">' +
    '<div class="reading-review-meta"><strong>' + esc(selected.row_id) + '</strong><span>' + esc(rowStatus(selected)) + '</span></div>' +
    '<div class="reading-review-fields">' + CODE.map(field=>codeField(field,selected)).join('') +
      '<div class="field"><label for="adjudicator-note">Annotations / reasoning</label>' +
      '<textarea id="adjudicator-note" data-adjudicator-note rows="3">' + esc(selected.annotations||'') + '</textarea></div>' +
    '</div>' +
    '<div class="reading-review-confirmations">' +
      (state.owner ? '<label class="check"><input id="source-checked" type="checkbox" ' + (readingSourceVerified?'checked':'') + '> I independently verified the source wording.</label>' : '<p>Your decisions stay in this browser until exported.</p>') +
    '</div>' +
  '</div>';
}
function adjudicator() {
  chooseYear();
  const rows = readingReviewRows();
  const selected = rows.find(row=>row.row_id === state.selected) || rows[0];
  if(selected && selected.row_id !== state.selected) state.selected=selected.row_id;
  const name = R.find(pair=>pair[0]===state.region)?.[1] || 'Organization';
  const left = readingHighlightRows(rows,selected?.row_id,true) +
    (selected ? '<div class="reading-source-edit">' +
      (safeUrl(selected.source_url) ? '<a href="' + esc(safeUrl(selected.source_url)) + '" target="_blank" rel="noopener noreferrer">Open source / Wayback ↗</a>' : '<p>No source URL available.</p>') +
      '<details><summary>Review source wording / corrections</summary>' +
        (state.owner ? '<p>Original source wording is read-only. Record a correction below.</p>' :
          '<label for="verbatim-text">Visitor copy of the verbatim wording</label><textarea id="verbatim-text" data-verbatim-text rows="3">' + esc(selected.verbatim_text||selected.text||'') + '</textarea>') +
        '<label for="corrected-text">Corrected wording</label><textarea id="corrected-text" data-adjudicator-text rows="3">' + esc(selected.corrected_text||'') + '</textarea>' +
        (state.owner ? '<label class="check"><input id="recoded" type="checkbox" ' + (readingRecoded?'checked':'') + '> I renewed coding after correcting wording.</label>' : '') +
      '</details></div>' : '');
  const actions = '<div class="reading-review-actions">' +
    '<button type="button" class="reading-approve" data-approve ' + (selected?'':'disabled') + ' title="Accept the reviewed tags">✓ <span>Approve</span></button>' +
    '<button type="button" class="reading-reject" data-reject ' + (selected?'':'disabled') + ' title="Reject the proposed coding, not the source">× <span>Reject</span></button>' +
    '<button type="button" class="reading-export" ' + (state.owner?'data-export-xlsx':'data-export-json') + '>Export all</button></div>';
  const right = '<header class="reading-review-head"><h2>Annotations</h2>' + actions + '</header>' +
    '<div class="reading-scroll">' + readingReviewAnnotation(selected) + '</div>';
  const tools = '<div class="reading-review-toolbar"><span>' + (state.owner?'Private researcher · Alfred':'Local visitor workspace') + '</span>' +
    '<button type="button" data-connect>' + (state.owner?'Refresh researcher mode':'Connect researcher mode') + '</button>' +
    (!state.owner ? '<button type="button" data-new>New row</button><button type="button" data-import-json>Import review JSON</button>' : '') +
    '<button type="button" data-review-prev ' + (rows.length?'':'disabled') + '>← Previous</button>' +
    '<button type="button" data-review-next ' + (rows.length?'':'disabled') + '>Next →</button>' +
    '<input id="adjudicator-import" type="file" accept="application/json" hidden></div>' +
    '<p class="reading-review-notice" role="status">' + esc(state.adjudicatorNotice || 'Select a highlighted clause to inspect and change proposed tags.') + '</p>';
  const layout = readingScaffold(true,left,right,rows,[], 'About us',name+' · '+(state.year||'No date'));
  return layout.replace('<div class="reading-panels">',tools+'<div class="reading-panels">');
}
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
  readingSourceVerified = false;
  readingRecoded = false;
  if(state.owner) await selectOwnerRow(id);
  else { state.selected=id; render(); }
},true);
document.addEventListener('change', event => {
  if(event.target.id==='source-checked') readingSourceVerified=event.target.checked;
  if(event.target.id==='recoded') readingRecoded=event.target.checked;
},true);
window.ReadingViews = {readingRecords,readingReviewPeriod,readingProcessKey,readingLegend,readingReviewRows};