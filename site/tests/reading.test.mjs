import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js = fs.readFileSync(new URL('../reading-layout.js', import.meta.url), 'utf8');
function setup(extra = {}) {
  const ctx = {
    window: {},
    document: { addEventListener() {} },
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
test('adjudicator and language expose corresponding two-panel reading views', () => {
  const c=setup({
    currentRows:()=>[{row_id:'VI-H-001',about_id:'VI-H',verbatim_text:'Evidence',draft:{process_type:'material'},original:{process_type:'relational'}}],
    rowStatus:()=> 'Pending',
    CODE:['process_type'],
    codeField:()=>'<label>Process</label>',
    timeline:()=>'<div class="timeline">Source years</div>',
    chooseYear:()=>{},
    render:()=>{},
  });
  c.state.language.clauses=[{id:'VI-H-001',region:'island',year:2002,source:'VI-H',text:'Evidence',process:'material'}];
  assert.match(c.language(),/reading-language/);
  assert.match(c.adjudicator(),/reading-review/);
  assert.match(c.adjudicator(),/data-approve/);
  assert.match(c.adjudicator(),/data-reject/);
  assert.match(c.adjudicator(),/data-export-json/);
  assert.match(c.adjudicator(),/data-review-row="VI-H-001"/);
});