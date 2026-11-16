/* Evidence-first Language Tables. Source-derived years; no inferred findings. */
'use strict';
(() => {
  const BASE_LANGUAGE = language;
  const THEMES = Object.freeze({
    beneficiaries: [
      {id:'businesses',label:'Tourism businesses and operators',terms:/\b(business(?:es)?|operators?|industry|members?|accommodations?|hotels?|tourism sector)\b/i},
      {id:'visitors',label:'Visitors and travellers',terms:/\b(visitors?|travell?ers?|tourists?|guests?)\b/i},
      {id:'communities',label:'Local communities and residents',terms:/\b(communities|community|residents?|local people|citizens?)\b/i},
      {id:'indigenous',label:'Indigenous peoples and Nations',terms:/\b(Indigenous|First Nations?|Métis|Inuit|Aboriginal|Nations?)\b/i},
      {id:'other',label:'Other explicitly named beneficiaries',terms:null}
    ],
    priorities: [
      {id:'marketing',label:'Destination marketing',terms:/\b(marketing|promot(?:e|es|ed|ing|ion)|advertis(?:e|ing)|campaigns?|branding)\b/i},
      {id:'economic_development',label:'Economic and industry development',terms:/\b(econom(?:y|ic)|development|business|investment|spending|industry|employment)\b/i},
      {id:'community_benefit',label:'Community benefit',terms:/\b(communities|community|residents?|wellbeing|well-being|local benefits?)\b/i},
      {id:'environmental_stewardship',label:'Environmental stewardship',terms:/\b(environment(?:al)?|stewardship|sustainab(?:ility|le)|conservation|ecolog(?:y|ical))\b/i},
      {id:'indigenous_tourism',label:'Indigenous tourism',terms:/\b(Indigenous|First Nations?|Métis|Inuit|Aboriginal)\b/i},
      {id:'coordination',label:'Coordination and partnerships',terms:/\b(partnerships?|collaborat(?:e|ion|ing)|coordinat(?:e|ion|ing)|stakeholders?)\b/i},
      {id:'other',label:'Other explicitly stated priorities',terms:null}
    ]
  });
  const ui = {view:'timeline',dimension:'beneficiaries',scope:'regional',region:null,workbook:null,theme:null,year:null,source:null};

  // Optional, deliberately separate human adjudication sheet. It does not exist in the
  // published public workbook and cannot be inferred from linguistic process labels.
  const originalParser = parseLanguage;
  function extractThemeFindings(ab) {
    const wb=XLSX.read(ab,{type:'array'});
    const sheet=wb.Sheets['Theme Findings'];
    if(!sheet)return [];
    const raw=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
    const hr=raw.findIndex(row=>row.includes('about_id')&&row.includes('theme_id')&&row.includes('dimension'));
    if(hr<0)return [];
    const keys=raw[hr].map(v=>String(v).trim().toLowerCase());
    return raw.slice(hr+1).filter(row=>row.some(v=>String(v).trim())).map(row=>{
      const record=Object.fromEntries(keys.map((key,i)=>[key,String(row[i]??'').trim()]));
      const dimension=record.dimension.toLowerCase(), theme=record.theme_id.toLowerCase();
      if(!Object.prototype.hasOwnProperty.call(THEMES,dimension) || !THEMES[dimension].some(x=>x.id===theme))return null;
      if(!record.about_id || record.about_id.length>160)return null;
      return {
        aboutId:record.about_id,dimension,theme,
        result:String(record.finding_status||'').toLowerCase(),
        review:String(record.review_status||'').toLowerCase(),
        reviewer:record.reviewed_by||'',
        coverage:String(record.coverage_verified||'').toLowerCase(),
        supportIds:String(record.supporting_row_ids||'').split(/[;,]/).map(s=>s.trim()).filter(Boolean).slice(0,80),
        note:String(record.notes||'').slice(0,750)
      };
    }).filter(Boolean);
  }
  parseLanguage = function parseWithHumanThemes(ab,name) {
    const parsed=originalParser(ab,name);
    parsed.themeFindings=extractThemeFindings(ab);
    return parsed;
  };
  if(window.AtlasParse) window.AtlasParse.parseLanguage=parseLanguage;

  function availableDocs(region=state.region) {
    return (state.language?.docs||[]).filter(d=>d.region===region&&Number.isFinite(d.year))
      .slice().sort((a,b)=>a.year-b.year||String(a.date||'').localeCompare(String(b.date||''))||String(a.id).localeCompare(String(b.id)));
  }
  function yearDocs(year) {return availableDocs().filter(d=>d.year===year);}
  function displayYears() {
    const regional=[...new Set(availableDocs().map(d=>d.year))].sort((a,b)=>a-b);
    return ui.scope==='all'?(state.language?.years||[]):regional;
  }
  function syncSelection(){
    const data=state.language;
    if(ui.region!==state.region||ui.workbook!==data){
      ui.region=state.region;ui.workbook=data;ui.theme=THEMES[ui.dimension][0].id;
      ui.year=availableDocs()[0]?.year ?? data?.years?.[0] ?? null;
      ui.source=null;
    }
    const themes=THEMES[ui.dimension];
    if(!themes.some(t=>t.id===ui.theme))ui.theme=themes[0].id;
    const ys=data?.years||[];
    if(!ys.includes(ui.year))ui.year=availableDocs()[0]?.year??ys[0]??null;
    const docs=yearDocs(ui.year);
    if(!docs.some(d=>d.id===ui.source))ui.source=docs[0]?.id||null;
  }
  function clausesFor(doc) {
    return doc?readingSortRows((state.language?.clauses||[]).filter(row=>row.source===doc.id)):[];
  }
  function acceptedFinding(theme,doc) {
    const f=(state.language?.themeFindings||[]).filter(r=>
      r.aboutId===doc.id&&r.dimension===ui.dimension&&r.theme===theme.id &&
      ['accepted','approved'].includes(r.review)&&r.reviewer
    );
    if(f.length!==1)return null;
    const record=f[0];
    if(record.result==='present'){
      if(!record.supportIds.length)return null;
      const known=new Set(clausesFor(doc).map(row=>row.id));
      if(record.supportIds.some(id=>!known.has(id)))return null;
      return record;
    }
    if(record.result==='not_mentioned'&&['yes','true','verified'].includes(record.coverage))return record;
    return null;
  }
  function statusFor(theme,year) {
    const docs=yearDocs(year);
    if(!docs.length)return {key:'missing',label:'No source',docs};
    if(docs.length>1)return {key:'multiple',label:docs.length+' captures',docs};
    const finding=acceptedFinding(theme,docs[0]);
    if(!finding)return {key:'pending',label:'Pending review',docs};
    if(finding.result==='present')return {key:'present',label:'Present',docs,finding};
    return {key:'not-mentioned',label:'Not mentioned',docs,finding};
  }
  function tableTabs(){
    return '<div class="lm-view-switch" role="group" aria-label="Language display">'+
      [['timeline','Timeline'],['table','Tables']].map(([k,v])=>
        '<button type="button" data-language-view="'+k+'" aria-pressed="'+(ui.view===k)+'">'+v+'</button>').join('')+
      '</div>';
  }
  function dimensionTabs(){
    return '<div class="lm-theme-switch" role="group" aria-label="Research dimension">'+
      [['beneficiaries','Beneficiaries'],['priorities','Priorities']].map(([k,v])=>
        '<button type="button" data-language-dimension="'+k+'" aria-pressed="'+(ui.dimension===k)+'">'+v+'</button>').join('')+
      '</div>';
  }
  function sourceLink(doc,caption='Open About-page source ↗'){
    const url=safeUrl(doc?.url);
    return url?'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(caption)+'</a>':'<span class="lm-no-link">Source URL unavailable</span>';
  }
  function viewTimeline(){
    let markup=BASE_LANGUAGE();
    markup=markup.replace('reading-design reading-language','reading-design reading-language lm-timeline');
    markup=markup.replace('<div class="reading-date-strip"',
       '<div class="lm-mode-row">'+tableTabs()+'<span class="lm-inline-note">Original About-page excerpts · SFL tags available in Annotations</span></div><div class="reading-date-strip"');
    return markup;
  }
  function matrix(){
    const years=displayYears(), themes=THEMES[ui.dimension];
    if(!years.length)return '<p class="lm-empty">No dated About-page captures are available. Import a workbook to begin.</p>';
    const cols='<colgroup><col class="lm-theme-column">'+years.map(()=>'<col class="lm-year-column">').join('')+'</colgroup>';
    const header='<thead><tr><th scope="col">Theme</th>'+years.map(y=>'<th scope="col">'+y+'</th>').join('')+'</tr></thead>';
    const body=themes.map(t=>'<tr><th scope="row">'+esc(t.label)+'</th>'+years.map(y=>{
      const st=statusFor(t,y),selected=ui.theme===t.id&&ui.year===y;
      return '<td><button type="button" data-language-cell="'+esc(t.id)+'|'+y+'" class="lm-cell lm-cell--'+st.key+'" aria-pressed="'+selected+'" aria-label="'+esc(t.label+', '+y+': '+st.label)+'" title="'+esc(st.label)+'">'+
        '<span class="lm-cell-main">'+esc(st.label)+'</span>'+
        (st.key==='present'?'<span class="lm-cell-mark" aria-hidden="true">✓</span>':st.key==='pending'?'<span class="lm-cell-mark" aria-hidden="true">·</span>':'')+
      '</button></td>';
    }).join('')+'</tr>').join('');
    return '<div class="lm-table-scroll"><table class="lm-table lm-table--'+ui.scope+'">'+cols+header+'<tbody>'+body+'</tbody></table></div>';
  }
  function teaserMatches(theme,doc){
    if(!theme?.terms)return [];
    return clausesFor(doc).filter(x=>theme.terms.test(x.text)).slice(0,4);
  }
  function evidencePanel() {
    const theme=THEMES[ui.dimension].find(t=>t.id===ui.theme), y=ui.year;
    const docs=yearDocs(y),doc=docs.find(d=>d.id===ui.source)||docs[0]||null;
    const status=theme?statusFor(theme,y):{key:'missing',label:'No source'};
    const header='<header class="lm-evidence-head"><div><span class="lm-eyebrow">SELECTED CELL</span><h3>'+esc(theme?.label||'Choose a theme')+'</h3>'+
      '<p>'+esc(y||'No date')+' · '+esc(R.find(r=>r[0]===state.region)?.[1]||'Regional organization')+'</p></div>'+
      '<span class="lm-evidence-status lm-evidence-status--'+status.key+'">'+esc(status.label)+'</span></header>';
    if(!doc)return header+'<div class="lm-evidence-body"><p class="lm-disclaimer">No eligible About-page capture for this year. Missing evidence is not evidence of a missing organizational priority.</p></div>';
    const pick=docs.length>1?'<label class="lm-source-choice">Capture <select data-language-source>'+
      docs.map(d=>'<option value="'+esc(d.id)+'" '+(d.id===doc.id?'selected':'')+'>'+esc(d.id)+' · '+esc(readingDateLabel(d.date))+'</option>').join('')+
      '</select></label>':'';
    const finding=acceptedFinding(theme,doc);
    let body='<div class="lm-evidence-body">'+pick+
      '<div class="lm-source-meta"><strong>'+esc(doc.id)+'</strong> · captured/retrieved '+esc(readingDateLabel(doc.date))+'</div>';
    if(finding&&finding.result==='not_mentioned'){
      body+='<p class="lm-interpretation">The researcher reviewed the complete source and recorded no qualifying mention of this theme.</p>';
    } else if(finding&&finding.result==='present'){
      body+='<p class="lm-interpretation">Human-confirmed theme. Supporting passages:</p>'+
        clausesFor(doc).filter(x=>finding.supportIds.includes(x.id)).map(x=>evidenceButton(x,doc,true)).join('');
    } else {
      const matches=teaserMatches(theme,doc);
      body+='<p class="lm-disclaimer"><strong>No human-confirmed classification.</strong> The passages below are keyword matches for navigation only, not verified beneficiary or priority claims.</p>';
      if(matches.length)body+=matches.map(x=>evidenceButton(x,doc,false)).join('');
      else body+='<p class="lm-no-matches">No matching words in the displayed source. This does not establish absence of a theme.</p>';
    }
    body+='<div class="lm-evidence-links">'+sourceLink(doc)+
      '<button type="button" data-language-open-source="'+esc(doc.id)+'">Read this About page →</button></div></div>';
    return header+body;
  }
  function evidenceButton(row,doc,confirmed) {
    return '<button type="button" class="lm-passage" data-language-passage="'+esc(row.id)+'" data-language-doc="'+esc(doc.id)+'">'+
      '<span>'+esc(row.id)+' · '+(confirmed?'Reviewed passage':'Unreviewed text match')+'</span>'+
      '<span class="lm-passage-text">'+esc(row.text)+'</span></button>';
  }
  function tableView(){
    syncSelection();
    const org=R.find(x=>x[0]===state.region)?.[1]||'Regional organization';
    const years=displayYears();
    const sourceCount=availableDocs().length;
    const tableHeading=ui.dimension==='beneficiaries'?'Who is identified as a beneficiary?':'What does the organization prioritize?';
    return '<div class="reading-design lm-table-view">'+readingHeader(false)+readingTabs()+
      '<div class="lm-mode-row">'+tableTabs()+'<span class="lm-inline-note">Capture years only · No interpolated annual findings</span></div>'+
      '<div class="lm-dimension-row">'+dimensionTabs()+
        '<div class="lm-summary-controls"><span>'+esc(org)+' · '+sourceCount+' About-page capture'+(sourceCount===1?'':'s')+'</span>'+ 
        '<label>Year columns <select data-language-scope aria-label="Choose available year scope"><option value="regional" '+(ui.scope==='regional'?'selected':'')+'>Selected RDMO</option><option value="all" '+(ui.scope==='all'?'selected':'')+'>All RDMO years</option></select></label></div></div>'+
      '<section class="lm-surface" aria-label="Language theme comparison"><div class="lm-surface-head">'+
        '<div><h2>'+esc(tableHeading)+'</h2><p>Provisional coding framework · cells require human review</p></div>'+
        '<div class="lm-source-key"><span>Present = reviewed</span><span>Not mentioned = reviewed absence</span><span>Pending = unreviewed</span><span>— = no source</span></div></div>'+
      '<div class="lm-surface-body"><div class="lm-matrix-pane">'+matrix()+
        '<p class="lm-table-caption">'+(ui.scope==='regional'?'Only years documented for this RDMO. Choose All RDMO years to inspect evidence gaps.':'Dates come from observed captures across all five RDMOs. Missing periods are not interpolated.')+' Multiple captures in one year require source selection.</p></div>'+
        '<aside class="lm-evidence-pane" aria-label="Selected year and theme evidence">'+evidencePanel()+'</aside></div></section>'+
      '<div class="lm-bottom-note"><span>Click any cell to inspect its source. Keyword matches are not adjudicated findings.</span>'+
      '<span>Research focus: claimed beneficiaries · institutional priorities · board composition</span></div></div>';
  }
  language = function languageWithTables() {
    if(!state.language)return BASE_LANGUAGE();
    return ui.view==='timeline'?viewTimeline():tableView();
  };

  function toTimeline(doc,clause){
    ui.view='timeline';
    if(doc) {
      state.year=doc.year;
      readingSourceId=doc.id;
      state.selected=clause?.id||null;
    }
    render();
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-language-view],[data-language-dimension],[data-language-cell],[data-language-open-source],[data-language-passage]');
    if(!b||state.route!=='language')return;
    e.preventDefault();e.stopPropagation();
    if(b.dataset.languageView){
      ui.view=b.dataset.languageView;
      if(ui.view==='timeline' && Number.isFinite(ui.year))state.year=ui.year;
      render();return;
    }
    if(b.dataset.languageDimension){
      ui.dimension=b.dataset.languageDimension;
      ui.theme=THEMES[ui.dimension][0].id;
      render();return;
    }
    if(b.dataset.languageCell){
      const parts=b.dataset.languageCell.split('|');
      const year=Number(parts[1]);
      if(!THEMES[ui.dimension].some(t=>t.id===parts[0]) || !(state.language?.years||[]).includes(year))return;
      ui.theme=parts[0];ui.year=year;ui.source=null;
      render();return;
    }
    if(b.dataset.languageOpenSource || b.dataset.languagePassage){
      const src=b.dataset.languageOpenSource||b.dataset.languageDoc;
      const d=availableDocs().find(doc=>doc.id===src);
      const row=d&&b.dataset.languagePassage?clausesFor(d).find(r=>r.id===b.dataset.languagePassage):null;
      if(d)toTimeline(d,row);
    }
  },true);
  document.addEventListener('change',e=>{
    if(state.route!=='language')return;
    if(e.target.matches('[data-language-scope]')){
      if(['regional','all'].includes(e.target.value)){ui.scope=e.target.value;render();}
      return;
    }
    if(!e.target.matches('[data-language-source]'))return;
    if(yearDocs(ui.year).some(d=>d.id===e.target.value)){
      ui.source=e.target.value;render();
    }
  },true);
  window.LanguageMatrix={themes:THEMES,statusFor,availableDocs,acceptedFinding,extractThemeFindings,ui};
})();