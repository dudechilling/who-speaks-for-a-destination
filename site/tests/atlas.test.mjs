import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={window:{},console,TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,Buffer,setTimeout,clearTimeout};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../vendor/xlsx.full.min.js',import.meta.url),'utf8'),ctx);
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
vm.runInContext(app.slice(0,app.indexOf('function activeData')),ctx);
const {parseLanguage,parseGovernance}=ctx.window.AtlasParse;
test('Phase 01A workbook has all recovered source blocks, uncoded, and mapped regional evidence',()=>{const b=fs.readFileSync(new URL('../data/language.xlsx',import.meta.url));const x=parseLanguage(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'canonical.xlsx');assert.equal(x.docs.length,23);assert.equal(x.rows,332);assert.equal(new Set(x.docs.map(d=>d.region+":"+d.year)).size,x.docs.length);assert.ok(x.clauses.every(r=>r.source_only));assert.ok(x.years.every(Number.isInteger));assert.ok(x.clauses.every(r=>r.process==='Not coded'));assert.ok(x.clauses.filter(r=>r.region==='northern'&&r.year===2000).length>=1);assert.ok(x.clauses.some(r=>r.region==='island'&&r.year===2002));assert.ok(x.clauses.some(r=>r.region==='island'&&r.year>=2026));});
test('future language year is indexed dynamically',()=>{const w=ctx.XLSX.utils.book_new(),s=ctx.XLSX.utils.aoa_to_sheet([['row_id','about_id','source_url','publication_date','capture_date','verbatim_text','process_type','actor','agency_voice','modality','review_status'],['a1','future','https://example.org','', '2034-04-01','A test-only source','material','we','active','none','pending_human_review']]);ctx.XLSX.utils.book_append_sheet(w,s,'Northern BC');const a=ctx.XLSX.write(w,{type:'array',bookType:'xlsx'}),x=parseLanguage(a,'test.xlsx');assert.deepEqual([...x.years],[2034]);});
test('Excel serial dates are not interpreted as 1970',()=>{const w=ctx.XLSX.utils.book_new(),s=ctx.XLSX.utils.aoa_to_sheet([['row_id','about_id','source_url','publication_date','capture_date','verbatim_text'],['a1','NB-H','https://example.org','',45658,'A test-only source']]);ctx.XLSX.utils.book_append_sheet(w,s,'NB_2000');const a=ctx.XLSX.write(w,{type:'array',bookType:'xlsx'}),x=parseLanguage(a,'serial.xlsx');assert.equal(x.clauses[0].region,'northern');assert.notEqual(x.years[0],1970);});
test('governance indexes dates but only verified supports findings',()=>{const w=ctx.XLSX.utils.book_new(),b=ctx.XLSX.utils.aoa_to_sheet([['record_id','organization','record_date','member_name','role','affiliation','sector','source_id','source_url','verification_status','notes'],['1','Northern BC','2035-01-01','Verified','Chair','','Government','s','https://example.org','verified',''],['2','Northern BC','2035-01-01','Pending','Member','','Other','s','https://example.org','pending','']]),s=ctx.XLSX.utils.aoa_to_sheet([['source_id','organization','title','document_date','capture_date','source_url','publisher','verification_status','notes'],['s','Northern BC','Test','2035-01-01','','https://example.org','','verified','']]);ctx.XLSX.utils.book_append_sheet(w,b,'Board');ctx.XLSX.utils.book_append_sheet(w,s,'Sources');const a=ctx.XLSX.write(w,{type:'array',bookType:'xlsx'}),x=parseGovernance(a,'test.xlsx');assert.deepEqual([...x.years],[2035]);assert.equal(x.board.filter(r=>r.verification_status==='verified').length,1);});
test('browser adjudication uses a single canonical XLSX and no private API',()=>{
 const browser=fs.readFileSync(new URL('../canonical-workflow.js',import.meta.url),'utf8');
 assert.match(browser,/XLSX\.write\(/);
 assert.match(browser,/RDMO_about_coding_review\.xlsx/);
 assert.match(browser,/human_review_status/);
 assert.doesNotMatch(app,/tail41f62a|\/api\/bootstrap|\/api\/approve|X-CSRF-Token/);
 assert.doesNotMatch(browser,/\/api\//);
 assert.match(app,/localStorage\.getItem\('rdmo-visitor-v1'\)/);
});
test('Codebook v0.6 coding fields and browser review controls exist',()=>{
 const workflow=fs.readFileSync(new URL('../canonical-workflow.js',import.meta.url),'utf8');
 assert.match(app,/process_type:\['material','mental','relational','verbal'/);
 assert.match(app,/represented_beneficiary/);
 for(const label of ['data-review-prev','data-review-next','data-export-xlsx','data-approve','data-reject'])
   assert.ok(workflow.includes(label),label);
 assert.doesNotMatch(workflow,/data-connect|data-import-json|data-export-json/);
});

test('the render loop selects all dock links and sets the active route correctly',()=>{
  assert.match(app,/\$\$\('#dock a'\)\.forEach/);
  assert.match(app,/setAttribute\('aria-current','page'\)/);
  assert.doesNotMatch(app,/(?<!\$)\$\('#dock a'\)\.forEach/);
});
