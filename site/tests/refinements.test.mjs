import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../refinements.js',import.meta.url),'utf8');
function fixture() {
  const docs=[
    {id:'VI-H',region:'island',year:2002,date:'2002-06-11'},
    {id:'VI-C',region:'island',year:2026,date:'2026-11-09'},
    {id:'NB-H',region:'northern',year:2000,date:'2000-04-19'}
  ];
  const clauses=[
    {id:'VI-H-001',source:'VI-H',region:'island',year:2002,text:'Tourism Vancouver Island serves industry members.',process:'relational',actor:'Tourism Vancouver Island',agency:'Tourism Vancouver Island names the region.',affected_participant:'Not stated',type:'clause'},
    {id:'VI-H-002',source:'VI-H',region:'island',year:2002,text:'It promotes community tourism.',process:'material',actor:'It',agency:'Claims community stewardship.',affected_participant:'Not stated',type:'clause'}
  ];
  const state={route:'language',region:'island',year:2002,selected:null,language:{docs,clauses,years:[2000,2002,2026],themeFindings:[]},
    governance:{board:[],sources:[],years:[],rows:0,origin:'repository'}};
  const themes={
    beneficiaries:[{id:'businesses',label:'Tourism businesses',terms:/members|businesses/i},
      {id:'communities',label:'Communities',terms:/communities|community/i}],
    priorities:[{id:'marketing',label:'Marketing',terms:/promotes|marketing/i}]
  };
  const context={
    state, R:[['island','Vancouver Island'],['northern','Northern BC']],
    slides:[{label:'Project'},{label:"B.C.'s RDMOs"},{label:'Researcher'}],
    md:()=>'', profiles:async()=>'',mapSvg:()=>'<svg data-map-source="bc-tourism-regions" viewBox="0 0 650 500"><path data-map-select="vcm" class="map-region selected" aria-label="Select Vancouver, Coast & Mountains"></path></svg>',
    readingHeader:()=>'<header>header</header>',readingFooter:()=>'<footer>footer</footer>',
    readingTimeline:()=>'',readingSourceTools:()=>'<details></details>',
    language:()=>'',governance:()=>'',readingTabs:()=>'<nav>tabs</nav>',
    esc:s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])),
    safeUrl:s=>{try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.href:''}catch{return ''}},
    readingRecords:()=>({clauses}),readingSortRows:x=>x,
    readingHighlightRows:()=>'<div class="reading-flow">fixture</div>',
    readingDateLabel:x=>x,readingProcessKey:x=>x,
    READING_PROCESS_NAMES:{material:'Material process',relational:'Relational process'},
    readingAnnotationValue:()=>'',chooseYear:()=>{},tabs:()=>'<nav>tabs</nav>',timeline:()=>'<div>timeline</div>',
    rid:x=>x,dateYear:()=>null,render:()=>{}, window:{
      LanguageMatrix:{ui:{dimension:'beneficiaries',view:'table'},themes,availableDocs:()=>docs.filter(d=>d.region===state.region),
        statusFor:(theme,year)=>({key:'pending',label:'Pending review'})}
    },
    document:{addEventListener:()=>{},querySelector:()=>null},
  };
  vm.createContext(context);
  vm.runInContext(source,context);
  return context;
}
test('Home blurb Markdown points to the three independent editable files',()=>{
  const c=fixture();
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(app,/md:'home\/project\.md'/);
  assert.match(app,/md:'home\/rdmos\.md'/);
  assert.match(app,/md:'home\/researcher\.md'/);
  const markup=c.md('A [source](https://example.org/a) and <script>alert(1)</script>');
  assert.match(markup,/href="https:\/\/example.org\/a"/);
  assert.match(markup,/&lt;script&gt;/);
  assert.doesNotMatch(markup,/<script>/);
  assert.doesNotMatch(c.md('[bad](javascript:alert(1))'),/href=/);
});
test('Vancouver, Coast & Mountains receives the distinct hatch and out-of-scope label',()=>{
  const c=fixture(),out=c.mapSvg();
  assert.match(out,/pattern id="vcm-out-of-scope-hatch"/);
  assert.match(out,/map-region--out-of-scope/);
  assert.match(out,/outside the research scope/);
  assert.doesNotMatch(out,/map-figure-heading/);
});
test('Table renders source years for one selected RDMO, with no cross-region dates or side pane',()=>{
  const c=fixture(),out=c.window.SiteRefinements.tableView();
  assert.match(out,/<th scope="col">2002<\/th>/);
  assert.match(out,/<th scope="col">2026<\/th>/);
  assert.doesNotMatch(out,/<th scope="col">2000<\/th>/);
  assert.match(out,/data-theme-cell="businesses\|2002"/);
  assert.doesNotMatch(out,/lm-evidence-pane|data-language-scope|lm-source-key|provisional coding framework/i);
});
test('Uncoded public overview does not display legacy proposal or keyword counts',()=>{
 const c=fixture(),out=c.window.SiteRefinements.compactOverview();
 assert.match(out,/Not coded yet/);
 assert.doesNotMatch(out,/search cues|Processes|Actors|lm-mini-row/);
});
test('Timeline options track selected RDMO capture years rather than a corpus-wide annual sequence',()=>{
  const c=fixture();
  assert.deepEqual([...c.window.SiteRefinements.regionSourceYears()],[2002,2026]);
  c.state.region='northern';
  assert.deepEqual([...c.window.SiteRefinements.regionSourceYears()],[2000]);
});
test('Public analysis is withheld rather than showing legacy cue categories',()=>{
 const c=fixture(),out=c.readingAnnotations(c.state.language.clauses[0]);
 assert.match(out,/Not coded yet/);assert.doesNotMatch(out,/search cues|Tourism businesses|Material process/);
});
test('Source-only table keeps region dates without inferring results',()=>{
 const c=fixture();c.state.language.clauses[0].source_only=true;
 const out=c.window.SiteRefinements.tableView();
 assert.match(out,/<th scope="col">2002<\/th>/);assert.match(out,/<th scope="col">2026<\/th>/);
 assert.match(out,/Pending coding/);assert.doesNotMatch(out,/data-theme-cell|search cues|<th scope="col">2000<\/th>/);
});
test('Codebook Markdown renders semantic tables and escapes cell text',()=>{
 const c=fixture(),out=c.md('# Codebook\n\n| Label | Explanation |\n|---|---|\n| Process | <script>alert(1)</script> |');
 assert.match(out,/<table><thead><tr>/);assert.match(out,/<th scope="col">Label<\/th>/);
 assert.doesNotMatch(out,/<script>/);assert.match(out,/&lt;script&gt;/);
});
test('Corpus omits the Type filter and export and the controls share one grid',()=>{
 const workflow=fs.readFileSync(new URL('../canonical-workflow.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../refinements.css',import.meta.url),'utf8');
 assert.match(workflow,/corpus-toolbar--compact/);
 assert.match(workflow,/year,region,title,source_url,date_basis/);
 assert.doesNotMatch(workflow,/corpus-type|<th>TYPE<\/th>/);
 assert.match(css,/grid-template-columns:minmax\(190px,2fr\)/);
});
test('Phase 01A preserves source block order and paragraph identifiers',()=>{
 const source=fs.readFileSync(new URL('../data/language.xlsx',import.meta.url));
 const ctx={window:{},Uint8Array,ArrayBuffer,TextDecoder,TextEncoder,Buffer};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(new URL('../vendor/xlsx.full.min.js',import.meta.url),'utf8'),ctx);
 const wb=ctx.XLSX.read(source,{type:'buffer'});
 const index=ctx.XLSX.utils.sheet_to_json(wb.Sheets.Index,{header:1,defval:''});
 const h=index[1], id=h.indexOf('source_id'), sheetColumn=h.indexOf('worksheet');
 const record=index.find((row,n)=>n>1&&row[id]==='VI-2002-01');
 const sheet=ctx.XLSX.utils.sheet_to_json(wb.Sheets[record[sheetColumn]],{defval:''});
 assert.ok(sheet.length>3);
 assert.ok(sheet.every(row=>row.source_order));
 assert.ok(sheet.some(row=>row.paragraph_id));
 assert.ok(sheet.every(row=>row.source_review_status==='Awaiting researcher review'));
});
test('Global AI disclosure links to an explicitly labelled placeholder page',()=>{
 const page=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const disclosure=fs.readFileSync(new URL('../content/ai-disclosure.md',import.meta.url),'utf8');
 assert.match(page,/See how we used AI\./);
 assert.match(page,/href="#ai-disclosure"/);
 assert.match(disclosure,/Editorial placeholder/);
});

test('tooltip definitions teach process types and participants without editorial caveats',()=>{
  const source=fs.readFileSync(new URL('../refinements.js',import.meta.url),'utf8');
  const start=source.indexOf('const definitions=Object.freeze({');
  const end=source.indexOf('function definitionButton(key)',start);
  const definitions=source.slice(start,end);
  for(const word of ['Material:','Relational:','Verbal:','Mental:','Existential:','Behavioural:'])
    assert.ok(definitions.includes(word),word);
  assert.match(definitions,/Active voice places the actor/);
  assert.match(definitions,/“May” suggests possibility/);
  assert.doesNotMatch(definitions,/machine|AI proposal|model.proposed|not evidence|not verified/i);
});
test('Profiles masthead and connected regional tabs use the same styles across routes',()=>{
  const reading=fs.readFileSync(new URL('../reading-layout.js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../refinements.css',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
  assert.match(reading,/function readingTabs\(\)\s*\{[^}]*return tabs\(\)/);
  assert.match(css,/#view \.rdmo-tabs/);
  assert.match(css,/#view \.rdmo-tabs \.region-button/);
  assert.match(css,/\.page-head,\.home-head,\.reading-heading,\.governance-reading-heading/);
  assert.match(app,/carouselDirection=next<state\.slide\?'prev':'next'/);
  assert.match(css,/@keyframes home-slide-forward/);
  assert.match(css,/@keyframes home-slide-backward/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
test('AI disclosure uses the linked orbit emblem rather than the old information badge',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/<svg class="ai-disclosure-icon"/);
  assert.equal((html.match(/<ellipse cx="40"/g)||[]).length,3);
  assert.match(html,/<text x="40" y="46"[^>]*>AI<\/text>/);
  assert.doesNotMatch(html,/<span class="ai-disclosure-icon"/);
});
