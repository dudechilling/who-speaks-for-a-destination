import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../language-table.js',import.meta.url),'utf8');
function fixture(){
  const records=[
    {id:'VI-H',region:'island',year:2002,date:'2002-06-11',url:'https://example.org/vi-h'},
    {id:'VI-C',region:'island',year:2026,date:'2026-11-09',url:'https://example.org/vi-c'}
  ];
  const clauses=[
    {id:'VI-H-001',source:'VI-H',region:'island',year:2002,text:'Tourism Vancouver Island serves industry members.',process:'relational',status:'pending_human_review'},
    {id:'VI-C-001',source:'VI-C',region:'island',year:2026,text:'Community partnerships are central to stewardship.',process:'relational',status:'pending_human_review'}
  ];
  const state={route:'language',region:'island',year:2002,selected:null,
    language:{name:'example',docs:records,clauses,years:[1999,2000,2001,2002,2026],rows:2,themeFindings:[]}};
  const context={
    state,R:[['island','Vancouver Island'],['northern','Northern BC']],
    language:()=>'<div class="reading-design reading-language"><div class="reading-date-strip"></div></div>',
    parseLanguage:()=>({name:'example',docs:records,clauses,years:state.language.years,rows:2}),
    esc:x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;'),
    safeUrl:u=>u, readingDateLabel:x=>x, readingSortRows:r=>r,
    readingHeader:()=>'<div>Header</div>', readingTabs:()=>'<nav>Regions</nav>',
    render:()=>{}, readingSourceId:null,
    document:{addEventListener(){}},window:{AtlasParse:{}},
    XLSX:{read:()=>({Sheets:{}}),utils:{sheet_to_json:()=>[]}}
  };
  vm.createContext(context);
  vm.runInContext(source,context,{filename:'language-table.js'});
  return context;
}
test('public Language page defaults to Tables / Beneficiaries, source years only',()=>{
  const c=fixture();
  const out=c.language();
  assert.match(out,/data-language-view="table" aria-pressed="true"/);
  assert.match(out,/data-language-dimension="beneficiaries" aria-pressed="true"/);
  assert.match(out,/<th scope="col">2002<\/th>/);
  assert.match(out,/<th scope="col">2026<\/th>/);
  assert.doesNotMatch(out,/<th scope="col">2015<\/th>/);
  assert.doesNotMatch(out,/<th scope="col">1999<\/th>/);
  c.window.LanguageMatrix.ui.scope='all';
  assert.match(c.language(),/<th scope="col">1999<\/th>/);
});
test('explicit absence of a source does not count as absence of a theme',()=>{
  const c=fixture(),theme=c.window.LanguageMatrix.themes.beneficiaries[0];
  assert.equal(c.window.LanguageMatrix.statusFor(theme,1999).key,'missing');
  assert.equal(c.window.LanguageMatrix.statusFor(theme,2002).key,'pending');
});
test('AI process tags, actor mentions, and keyword matches never produce a confirmed beneficiary',()=>{
  const c=fixture(),theme=c.window.LanguageMatrix.themes.beneficiaries[0];
  c.state.language.clauses[0].actor='Tourism members';
  c.state.language.clauses[0].institutional_priority='economic development';
  assert.equal(c.window.LanguageMatrix.statusFor(theme,2002).key,'pending');
});
test('only single approved finding with a reviewer and a valid supporting row becomes Present',()=>{
  const c=fixture(),theme=c.window.LanguageMatrix.themes.beneficiaries[0];
  c.state.language.themeFindings=[{aboutId:'VI-H',dimension:'beneficiaries',theme:'businesses',result:'present',review:'accepted',reviewer:'Researcher',coverage:'',supportIds:['VI-H-001']}];
  assert.equal(c.window.LanguageMatrix.statusFor(theme,2002).key,'present');
  c.state.language.themeFindings[0].reviewer='';
  assert.equal(c.window.LanguageMatrix.statusFor(theme,2002).key,'pending');
  c.state.language.themeFindings[0].reviewer='Researcher';
  c.state.language.themeFindings[0].supportIds=['MISSING-ID'];
  assert.equal(c.window.LanguageMatrix.statusFor(theme,2002).key,'pending');
});
test('Not mentioned requires affirmative full-source coverage and human acceptance',()=>{
  const c=fixture(),theme=c.window.LanguageMatrix.themes.beneficiaries[1];
  c.state.language.themeFindings=[{aboutId:'VI-H',dimension:'beneficiaries',theme:'visitors',result:'not_mentioned',review:'accepted',reviewer:'Researcher',coverage:'no',supportIds:[]}];
  assert.equal(c.window.LanguageMatrix.statusFor(theme,2002).key,'pending');
  c.state.language.themeFindings[0].coverage='yes';
  assert.equal(c.window.LanguageMatrix.statusFor(theme,2002).key,'not-mentioned');
});
test('priority categories follow workbook codebook without conflating Indigenous beneficiaries with Indigenous tourism',()=>{
  const c=fixture();
  const a=c.window.LanguageMatrix.themes;
  assert.ok(a.beneficiaries.some(x=>x.id==='indigenous'));
  assert.ok(a.priorities.some(x=>x.id==='indigenous_tourism'));
  assert.ok(a.priorities.some(x=>x.id==='environmental_stewardship'));
  assert.ok(!a.beneficiaries.some(x=>x.id==='environmental_stewardship'));
});
test('future years and captures recompute from an imported workbook',()=>{
  const c=fixture();
  c.state.language.years.push(2034);
  c.state.language.docs.push({id:'VI-2034',region:'island',year:2034,date:'2034-01-01'});
  assert.match(c.language(),/<th scope="col">2034<\/th>/);
});
test('two source captures in one year remain unresolved, rather than silently combined',()=>{
  const c=fixture(),theme=c.window.LanguageMatrix.themes.beneficiaries[0];
  c.state.language.docs.push({id:'VI-2002-ALT',region:'island',year:2002,date:'2002-08-01'});
  assert.equal(c.window.LanguageMatrix.statusFor(theme,2002).key,'multiple');
});
test('optional theme findings ignore unrecognized categories',()=>{
  const c=fixture();
  c.XLSX.read=()=>({Sheets:{'Theme Findings':{}}});
  c.XLSX.utils.sheet_to_json=()=>[['about_id','dimension','theme_id','finding_status','review_status','reviewed_by','supporting_row_ids'],['VI-H','beneficiaries','invented','present','accepted','Researcher','VI-H-001']];
  assert.equal(c.window.LanguageMatrix.extractThemeFindings(new ArrayBuffer(0)).length,0);
});