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
test('Agency summary never treats free-text representation notes as voice categories',()=>{
  const c=fixture(),out=c.window.SiteRefinements.compactOverview();
  assert.match(out,/Processes/);
  assert.match(out,/Actors/);
  assert.match(out,/Named groups · search cues/);
  assert.match(out,/Priorities · search cues/);
  assert.doesNotMatch(out,/Affected participants<\/h3>/);
  assert.doesNotMatch(out,/Agency \/ voice/);
  assert.doesNotMatch(out,/Claims community stewardship/);
});
test('Timeline options track selected RDMO capture years rather than a corpus-wide annual sequence',()=>{
  const c=fixture();
  assert.deepEqual([...c.window.SiteRefinements.regionSourceYears()],[2002,2026]);
  c.state.region='northern';
  assert.deepEqual([...c.window.SiteRefinements.regionSourceYears()],[2000]);
});
test('Selected annotations suppress quotes, absent modality and un-coded voice while providing search cues',()=>{
  const c=fixture();
  const selected={...c.state.language.clauses[0],modality:'none',institutional_priority:'Not stated',
    social_actor_representation:'Not stated',annotations:'Not specified'};
  const output=c.readingAnnotations(selected);
  assert.doesNotMatch(output,/<blockquote|>Modality<|>Agency \/ voice<|VI-H-001/);
  assert.match(output,/Named groups · search cues/);
  assert.match(output,/Tourism businesses/);
  assert.match(output,/definition-trigger/);
});
test('Corpus omits the Type filter and export and the controls share one grid',()=>{
 const workflow=fs.readFileSync(new URL('../canonical-workflow.js',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../refinements.css',import.meta.url),'utf8');
 assert.match(workflow,/corpus-toolbar--compact/);
 assert.match(workflow,/year,region,title,source_url,date_basis/);
 assert.doesNotMatch(workflow,/corpus-type|<th>TYPE<\/th>/);
 assert.match(css,/grid-template-columns:minmax\(190px,2fr\)/);
});
test('Paragraph boundaries and display headings are in the canonical workbook',()=>{
 const source=fs.readFileSync(new URL('../data/language.xlsx',import.meta.url));
 const ctx={window:{},Uint8Array,ArrayBuffer,TextDecoder,TextEncoder,Buffer};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync(new URL('../vendor/xlsx.full.min.js',import.meta.url),'utf8'),ctx);
 const wb=ctx.XLSX.read(source,{type:'buffer'});
 const sheet=ctx.XLSX.utils.sheet_to_json(wb.Sheets.VI_2002,{defval:''});
 assert.equal(sheet.length,13);
 assert.equal(sheet[0].paragraph_id,sheet[1].paragraph_id);
 assert.equal(sheet[8].paragraph_id,sheet[11].paragraph_id);
 assert.notEqual(sheet[11].paragraph_id,sheet[12].paragraph_id);
 assert.equal(sheet[0].heading_before,'## ABOUT US');
 assert.equal(sheet[1].join_after,' – ');
 const current=ctx.XLSX.utils.sheet_to_json(wb.Sheets.VI_Current,{defval:''});
 assert.match(current[1].heading_before,/Our Commitment to the Future/);
 assert.equal(current[0].block_kind,'lead');
 assert.equal(sheet[0].human_review_status,'');
});
test('Global AI disclosure links to an explicitly labelled placeholder page',()=>{
 const page=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const disclosure=fs.readFileSync(new URL('../content/ai-disclosure.md',import.meta.url),'utf8');
 assert.match(page,/See how we used AI\./);
 assert.match(page,/href="#ai-disclosure"/);
 assert.match(disclosure,/Editorial placeholder/);
});
