import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={window:{},console,TextDecoder,TextEncoder,Uint8Array,ArrayBuffer,Buffer,setTimeout,clearTimeout};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../vendor/xlsx.full.min.js',import.meta.url),'utf8'),ctx);
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
vm.runInContext(app.slice(0,app.indexOf('function activeData')),ctx);
const {parseLanguage,parseGovernance}=ctx.window.AtlasParse;
test('legacy workbook has ten sources, 194 clauses, and mapped region-year evidence',()=>{const b=fs.readFileSync(new URL('../data/language.xlsx',import.meta.url));const x=parseLanguage(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'legacy.xlsx');assert.equal(x.docs.length,10);assert.equal(x.rows,194);assert.ok(x.years.every(Number.isInteger));assert.equal(x.clauses.filter(r=>r.region==='northern'&&r.year===2000).length,11);assert.ok(x.clauses.some(r=>r.region==='island'&&r.year===2002));assert.ok(x.clauses.some(r=>r.region==='island'&&r.year===2026));});
test('future language year is indexed dynamically',()=>{const w=ctx.XLSX.utils.book_new(),s=ctx.XLSX.utils.aoa_to_sheet([['row_id','about_id','source_url','publication_date','capture_date','verbatim_text','process_type','actor','agency_voice','modality','review_status'],['a1','future','https://example.org','', '2034-04-01','A test-only source','material','we','active','none','pending_human_review']]);ctx.XLSX.utils.book_append_sheet(w,s,'Northern BC');const a=ctx.XLSX.write(w,{type:'array',bookType:'xlsx'}),x=parseLanguage(a,'test.xlsx');assert.deepEqual([...x.years],[2034]);});
test('Excel serial dates are not interpreted as 1970',()=>{const w=ctx.XLSX.utils.book_new(),s=ctx.XLSX.utils.aoa_to_sheet([['row_id','about_id','source_url','publication_date','capture_date','verbatim_text'],['a1','NB-H','https://example.org','',45658,'A test-only source']]);ctx.XLSX.utils.book_append_sheet(w,s,'NB_2000');const a=ctx.XLSX.write(w,{type:'array',bookType:'xlsx'}),x=parseLanguage(a,'serial.xlsx');assert.equal(x.clauses[0].region,'northern');assert.notEqual(x.years[0],1970);});
test('governance indexes dates but only verified supports findings',()=>{const w=ctx.XLSX.utils.book_new(),b=ctx.XLSX.utils.aoa_to_sheet([['record_id','organization','record_date','member_name','role','affiliation','sector','source_id','source_url','verification_status','notes'],['1','Northern BC','2035-01-01','Verified','Chair','','Government','s','https://example.org','verified',''],['2','Northern BC','2035-01-01','Pending','Member','','Other','s','https://example.org','pending','']]),s=ctx.XLSX.utils.aoa_to_sheet([['source_id','organization','title','document_date','capture_date','source_url','publisher','verification_status','notes'],['s','Northern BC','Test','2035-01-01','','https://example.org','','verified','']]);ctx.XLSX.utils.book_append_sheet(w,b,'Board');ctx.XLSX.utils.book_append_sheet(w,s,'Sources');const a=ctx.XLSX.write(w,{type:'array',bookType:'xlsx'}),x=parseGovernance(a,'test.xlsx');assert.deepEqual([...x.years],[2035]);assert.equal(x.board.filter(r=>r.verification_status==='verified').length,1);});
test('adjudicator retains original proposals and separates visitor from owner saving',()=>{
 for(const field of ['process_type','actor','affected_participant','agency_voice','modality','institutional_priority','social_actor_representation'])assert.match(app,new RegExp(field));
 assert.match(app,/localStorage\.getItem\('rdmo-visitor-v1'\)/);assert.match(app,/function currentRows\(\)/);assert.match(app,/baseline:\{status:'immutable'/);
 assert.match(app,/X-CSRF-Token/);assert.match(app,/\/api\/bootstrap/);assert.match(app,/\/api\/rows/);assert.match(app,/\/api\/row\//);assert.match(app,/\/api\/approve/);assert.match(app,/\/api\/export\.xlsx/);
 assert.match(app,/Corrected wording requires renewed coding confirmation/);assert.match(app,/Independently verify source wording before approving/);assert.match(app,/no success has been recorded/);
});
test('adjudicator codebook values and navigation are concrete controls',()=>{
 assert.match(app,/process_type:\['material','relational','mental','verbal','existential','behavioural','unclear','not_applicable'\]/);
 assert.match(app,/agency_voice:\['active','passive','non_finite','unclear','not_applicable'\]/);
 assert.match(app,/modality:\['probability','usuality','obligation','commitment','capacity','none','unclear','not_applicable'\]/);
 assert.match(app,/data-row-prev/);assert.match(app,/data-row-next/);assert.match(app,/Export all JSON/);assert.match(app,/Export all XLSX/);assert.match(app,/Reject coding/);
});
