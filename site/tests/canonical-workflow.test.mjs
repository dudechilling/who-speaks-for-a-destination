import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('Phase 01A workbook retains source blocks without coding columns',()=>{
 const c={};vm.createContext(c);
 vm.runInContext(fs.readFileSync(new URL('../vendor/xlsx.full.min.js',import.meta.url),'utf8'),c);
 const wb=c.XLSX.read(fs.readFileSync(new URL('../../RDMO_about_coding_review.xlsx',import.meta.url)),{type:'buffer'});
 const index=c.XLSX.utils.sheet_to_json(wb.Sheets.Index,{header:1,defval:''});
 assert.equal(index.length-2,36);
 const header=c.XLSX.utils.sheet_to_json(wb.Sheets.SRC_01,{header:1,defval:''})[0];
 assert.ok(header.includes('original_text'));
 assert.ok(header.includes('paragraph_id'));
 assert.ok(header.includes('block_kind'));
 assert.ok(!header.includes('ideational_process_type'));
 assert.ok(!header.includes('human_actor'));
});
