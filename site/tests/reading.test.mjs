import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js = fs.readFileSync(new URL('../reading-layout.js', import.meta.url), 'utf8');
function setup(extra = {}) {
  const ctx = {
    window: {},
    URL,
    document: { addEventListener() {} },
    tabs:()=>'<nav class="rdmo-tabs" aria-label="Choose a B.C. tourism region"></nav>',
    esc: v => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;'),
    safeUrl: v => /^https?:\/\//.test(String(v)) ? String(v) : '',
    R: [['island','Vancouver Island'],['kootenay','Kootenay Rockies']],
    state: {
      owner:false,
      region:'island',
      year:2002,
      language:{docs:[{id:'VI-H',region:'island',year:2002,date:'2002-01-29'}],clauses:[]},
      selected:null,
      adjudicatorNotice:''
    },
    rid: v => /^VI/i.test(String(v)) ? 'island' : /^KR/i.test(String(v)) ? 'kootenay' : null,
    currentRows: () => [],
    ...extra
  };
  vm.createContext(ctx);
  vm.runInContext(js, ctx, { filename: 'reading-layout.js' });
  return ctx;
}
test('process palette uses exact model proposal categories', () => {
  const c=setup();
  assert.equal(c.window.ReadingViews.readingProcessKey('RELATIONAL'), 'relational');
  assert.equal(c.window.ReadingViews.readingProcessKey('undefined category'), 'other');
  assert.match(c.readingLegend([{process:'material'}, {process:'material'}, {process:'verbal'}],false),/Material process/);
});
test('source excerpt uses verbatim escaped text and clickable selection', () => {
  const c=setup();
  const html=c.readingHighlightRows([
    {id:'VI-H-001',source:'VI-H',text:'Research & visitors',process:'relational',type:'clause'},
    {id:'VI-H-002',source:'VI-H',text:'About us',process:'not_applicable',type:'heading'}
  ],'VI-H-001',false);
  assert.match(html,/Research &amp; visitors/);
  assert.match(html,/reading-highlight--relational/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/reading-source-heading/);
  assert.match(html,/data-excerpt="VI-H-002"/);
});
test('review page filters by organization and observed period', () => {
  const c=setup({currentRows:()=>[
    {row_id:'VI-H-001',about_id:'VI-H'},
    {row_id:'VI-C-001',about_id:'VI-C'},
    {row_id:'KR-H-001',about_id:'KR-H'}
  ]});
  c.state.language.docs.push({id:'VI-C',region:'island',year:2026});
  assert.equal(c.window.ReadingViews.readingReviewRows().length,1);
  assert.equal(c.window.ReadingViews.readingReviewRows()[0].row_id,'VI-H-001');
  c.state.year=2026;
  assert.equal(c.window.ReadingViews.readingReviewRows()[0].row_id,'VI-C-001');
});
test('reading module delegates reviewer rendering to the browser-only canonical workflow', () => {
  const c=setup({chooseYear:()=>{},timeline:()=>'<div>timeline</div>'});
  c.state.language.clauses=[{id:'VI-H-001',region:'island',year:2002,source:'VI-H',text:'Evidence',process:'material'}];
  assert.match(c.language(),/reading-language/);
  const workflow=fs.readFileSync(new URL('../canonical-workflow.js',import.meta.url),'utf8');
  assert.match(workflow,/adjudicator=function simplifiedAdjudicator/);
  assert.match(workflow,/data-export-xlsx/);
  assert.doesNotMatch(workflow,/data-connect|tail41f62a/);
});

test('legacy DOM paragraph locators preserve paragraph boundaries and clause selection', () => {
  const c=setup();
  const html=c.readingHighlightRows([
    {id:'VI-H-001',source:'VI-H',section:'p[7]; chars 0:60',text:'First sentence.',process:'relational'},
    {id:'VI-H-002',source:'VI-H',section:'p[7]; chars 61:130',text:'Second sentence.',process:'relational'},
    {id:'VI-H-003',source:'VI-H',section:'p[8]; chars 0:80',text:'Next original paragraph.',process:'material'},
  ], 'VI-H-002', false);
  assert.equal((html.match(/<p>/g)||[]).length,2);
  assert.match(html, /First sentence\..*Second sentence\./);
  assert.match(html, /data-excerpt="VI-H-002" aria-pressed="true"/);
  assert.match(html, /<\/p><p>/);
});

test('inline numbered lists remain ordered lists while their text stays fully attributable', () => {
  const c=setup();
  const html=c.readingHighlightRows([
    {id:'VI-H-006',source:'VI-H',section:'p[9]; chars 0:130',text:'The objectives are: 1. Build visits.',process:'relational'},
    {id:'VI-H-007',source:'VI-H',section:'p[9]; chars 131:200',text:'2. Encourage spending.',process:'material'},
    {id:'VI-H-008',source:'VI-H',section:'p[9]; chars 201:245',text:'3. Extend stays.',process:'material'},
    {id:'VI-H-009',source:'VI-H',section:'p[9]; chars 246:360',text:'A later paragraph.',process:'relational'},
  ],'VI-H-007',false);
  assert.match(html, /<ol start="1"><li>/);
  assert.equal((html.match(/<li>/g)||[]).length,3);
  assert.match(html, /The objectives are:/);
  assert.match(html, /<\/ol><p>/);
  assert.equal((html.match(/data-excerpt="VI-H-006"/g)||[]).length,2);
  assert.doesNotMatch(html, /<p><ol>/);
});

test('newer workbook renders headings and normalized list_item rows structurally', () => {
  const c=setup();
  const html=c.readingHighlightRows([
    {id:'VI-H-001',source:'VI-H',type:'heading',section:'About Us',text:'About us',source_order:1},
    {id:'VI-H-002',source:'VI-H',type:'clause',section:'About Us',text:'Introduces tourism.',source_order:2},
    {id:'VI-H-003',source:'VI-H',type:'list_item',section:'About Us',text:'1. First objective.',source_order:3},
    {id:'VI-H-004',source:'VI-H',type:'list_item',section:'About Us',text:'2. Second objective.',source_order:4},
    {id:'VI-H-005',source:'VI-H',type:'teaser',section:'About Us',text:'A page teaser.',source_order:5},
  ],null,false);
  assert.match(html, /<h3 class="reading-source-heading">/);
  assert.match(html, /<ol start="1">/);
  assert.equal((html.match(/<li>/g)||[]).length,2);
  assert.match(html, /reading-source-teaser/);
});

test('Language footer references only the source currently shown and opens it directly', () => {
  const c=setup();
  const html=c.readingFooter([{id:'VI-H-001',process:'relational'}],
      {id:'VI-H',url:'https://web.archive.org/web/20020129/example',date:'2002-01-29'},false);
  assert.match(html, /href="https:\/\/web.archive.org\/web\/20020129\/example"/);
  assert.match(html, /Source: Vancouver Island About \(VI-H\) · Archived 2002-01-29/);
  assert.doesNotMatch(html, /data-open-sources/);
  assert.doesNotMatch(html, /Loaded source register/);
});

test('a future second capture in one year cannot mix two About pages on screen', () => {
  const c=setup();
  c.state.language.docs.push({id:'VI-ALT',region:'island',year:2002,url:'https://example.org/alt'});
  c.state.language.clauses=[
    {id:'VI-H-001',source:'VI-H',region:'island',year:2002,text:'First source.'},
    {id:'VI-ALT-001',source:'VI-ALT',region:'island',year:2002,text:'Second source.'}
  ];
  let view=c.window.ReadingViews.readingRecords('island',2002);
  assert.equal(view.clauses.length,1);
  assert.equal(view.clauses[0].id,'VI-H-001');
  assert.equal(view.availableSources.length,2);
  c.state.selected='VI-ALT-001';
  view=c.window.ReadingViews.readingRecords('island',2002);
  assert.equal(view.clauses.length,1);
  assert.equal(view.sources[0].url,'https://example.org/alt');
});


test('review year follows its own capture date, not another source year', () => {
  const ownerRows=[{row_id:'KR-H-001',about_id:'KR-H',capture_date:'1998-12-05',verbatim_text:'Historic wording'},
                   {row_id:'KR-C-001',about_id:'KR-C',capture_date:'2026-11-09',verbatim_text:'Current wording'}];
  const c=setup({
    currentRows:()=>ownerRows,
    dateYear:s=>Number(String(s).slice(0,4)),
    timeline:()=>'<div>Public years</div>'
  });
  c.state.owner=true;
  c.state.region='kootenay';
  c.state.year=1999;
  c.readingEnsureReviewYear();
  assert.equal(c.state.year,1998);
  assert.equal(c.window.ReadingViews.readingReviewRows()[0].row_id,'KR-H-001');
  assert.match(c.readingTimeline(true),/1998/);
  assert.match(c.readingTimeline(true),/review-time-slider/);
});

test('same-paragraph clauses remain in one flowing paragraph with keyboard-selectable inline text',()=>{
  const c=setup();
  const html=c.readingHighlightRows([
    {id:'VI-H-001',source:'VI-H',block_id:'P1',text:'The organization describes its mission.',process:'relational'},
    {id:'VI-H-002',source:'VI-H',block_id:'P1',text:'It supports local tourism.',process:'material'},
    {id:'VI-H-003',source:'VI-H',block_id:'P2',text:'A new paragraph follows.',process:'relational'}
  ],null,false);
  assert.equal((html.match(/<p>/g)||[]).length,2);
  assert.match(html,/<span role="button" tabindex="0"[^>]*data-excerpt="VI-H-001"[^>]*>The organization describes its mission\.<\/span> <span role="button" tabindex="0"[^>]*data-excerpt="VI-H-002"/);
  assert.doesNotMatch(html,/<button[^>]*data-excerpt=/);
  assert.match(js,/event\.key!=='Enter'&&event\.key!==' '/);
  assert.match(js,/clause\.click\(\)/);
  assert.equal(c.readingTabs(),c.tabs());
});

test('Language exposes Clause analysis and workbook menu entry to coding review',()=>{
  const c=setup({chooseYear:()=>{},timeline:()=>'<div>timeline</div>'});
  c.state.language.clauses=[
    {id:'VI-H-001',region:'island',year:2002,source:'VI-H',text:'The region attracts tourists.',process:'material'}
  ];
  const displayed=c.language();
  assert.match(displayed,/<h2>Clause analysis<\/h2>/);
  assert.match(displayed,/aria-label="Clause analysis"/);
  const menu=c.readingSourceTools(false);
  assert.match(menu,/data-language-mode="review">Open coding review/);
  c.state.languageMode='review';
  assert.match(c.readingSourceTools(true),/data-language-mode="analysis">Return to clause analysis/);
});
