import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
test('Canonical source-only workbook matches inventory with no analytical codes',()=>{
 const c={};vm.createContext(c);
 vm.runInContext(fs.readFileSync(new URL('../vendor/xlsx.full.min.js',import.meta.url),'utf8'),c);
 const bytes=fs.readFileSync(new URL('../../RDMO_about_coding_review.xlsx',import.meta.url));
 assert.deepEqual(bytes,fs.readFileSync(new URL('../data/language.xlsx',import.meta.url)));
 const wb=c.XLSX.read(bytes,{type:'buffer'});
 const rows=(name,range=0)=>c.XLSX.utils.sheet_to_json(wb.Sheets[name],{range,defval:''});
 const index=rows('Index',1),inventory=rows('Source Inventory',1);
 assert.equal(index.length,23);assert.equal(inventory.length,41);
 const active=inventory.filter(r=>r.active_workbook_status.startsWith('Active source text'));
 assert.deepEqual([...active.map(r=>r.source_id)].sort(),[...index.map(r=>r.source_id)].sort());
 assert.equal(new Set(index.map(r=>r.region+':'+r.capture_timestamp.slice(0,4))).size,index.length);
 assert.equal(inventory.find(r=>r.source_id==='VI-H').retained_as_source_id,'VI-2002-01');
 assert.equal(inventory.find(r=>r.source_id==='KR-H').retained_as_source_id,'KR-1998-12');
 assert.equal(inventory.filter(r=>r.active_workbook_status.startsWith('Held: company-profile PDF')).length,11);
 const fields=['process_type','process','participants','voice','institutional_priority','represented_beneficiary','coding_provenance'];
 let total=0;
 for(const source of index){
  const records=rows(source.worksheet);
  assert.ok(records.length);
  for(const [i,r] of records.entries()){
   assert.equal(r.source_id,source.source_id);assert.equal(r.source_order,i+1);
   assert.ok(r.original_text.trim()&&!r.original_text.includes('\ufffd'));
   for(const field of fields)assert.equal(r[field],'',source.source_id+' '+field);
  }
  assert.equal(crypto.createHash('sha256').update(records.map(r=>r.original_text).join('\n')).digest('hex'),source.source_text_sha256);
  total+=records.length;
 }
 assert.equal(total,332);
 const vi=rows(index.find(r=>r.source_id==='VI-2002-01').worksheet);
 assert.equal(vi.filter(r=>r.block_kind==='heading').length,1);
 assert.equal(vi.filter(r=>r.block_kind==='paragraph').length,5);
 assert.deepEqual([...vi.filter(r=>r.block_kind==='list_item').map(r=>r.list_marker)],['1','2','3']);
});
