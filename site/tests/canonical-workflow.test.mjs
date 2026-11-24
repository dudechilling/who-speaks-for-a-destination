import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function fixture(){
 const context={
  window:{LanguageMatrix:{ui:{view:'timeline'}}},console,URL,Buffer,Uint8Array,ArrayBuffer,
  TextDecoder,TextEncoder,setTimeout,clearTimeout,
  document:{baseURI:'https://example.org/site/',addEventListener(){},querySelector(){return null}},
  localStorage:{getItem(){return null},setItem(){}},
  profiles:async()=>'',governance:()=>'',readingAnnotations:()=>'',render:async()=>{},
  readingTimeline:()=>'',readingFooter:()=>'',readingSourceTools:()=>'<details></details>',
  readingHeader:()=>'<header>Model assisted. Human adjudicated.</header>',
  tabs:()=>'',readingTabs:()=>'',readingReviewRows:()=>[],readingEnsureReviewYear:()=>{},
  readingScaffold:()=>'',readingHighlightRows:()=>'',readingDateLabel:x=>x,
  head:()=>'',docs:()=>[],download:()=>{},codeField:()=>'',readingReviewPeriod:()=>{},
  workbookRows:()=>[],currentRows:()=>[],rowStatus:()=>'',adjudicate:async()=>{},
  exportOwner:async()=>{},exportWorkspace:()=>{},adjudicator:()=>'',corpus:()=>{},
  chooseYear:()=>{},language:()=>'',readingProcessKey:()=>'',readingSortRows:x=>x,
  readingReviewYears:()=>[],dateYear:x=>Number(String(x).slice(0,4)),
  cleanAdjudicatorRow:obj=>({...obj,original:{
    process_type:obj.process_type,actor:obj.actor,affected_participant:obj.affected_participant,
    agency_voice:obj.agency_voice,modality:obj.modality,
    institutional_priority:obj.institutional_priority,
    social_actor_representation:obj.social_actor_representation
   },draft:obj.draft||{}}),
  visitorValues:()=>({}),putVisitor:()=>{},safeUrl:x=>x,
  getText:async()=>'',md:()=>'',readingRecords:()=>({clauses:[]})
 };
 vm.createContext(context);
 vm.runInContext(read('vendor/xlsx.full.min.js'),context);
 const app=read('app.js');
 vm.runInContext(app.slice(0,app.indexOf('function activeData')),context);
 vm.runInContext(read('canonical-workflow.js'),context);
 context.state=vm.runInContext('state',context);
 return context;
}
test('one canonical workbook round-trips an adjudication without rewriting AI proposals',()=>{
 const c=fixture();
 const file=fs.readFileSync(new URL('../../RDMO_about_coding_review.xlsx',import.meta.url));
 const original=c.parseLanguage(file,'canonical.xlsx');
 c.state.language=original;
 assert.ok(original.docs.length>=10);
 assert.ok(original.rows>=194);
 assert.equal(c.window.LanguageMatrix.ui.view,'timeline');
 assert.equal(c.window.SourceStructure['VI-H'].blocks['VI-H-009'],
              c.window.SourceStructure['VI-H'].blocks['VI-H-012']);
 assert.notEqual(c.window.SourceStructure['VI-H'].blocks['VI-H-012'],
                 c.window.SourceStructure['VI-H'].blocks['VI-H-013']);
 const selected=c.workbookRows().find(r=>r.row_id==='VI-H-001');
 assert.equal(selected.status,'pending');
 const human={status:'approved',actor:'Human-reviewed participant',
  process_type:'relational',reviewed_at_utc:'2026-11-16T02:00:00.000Z',
  annotations:'Manually verified in context'};
 c.state.visitor.overrides[selected.row_id]={fingerprint:selected.fingerprint,values:human};
 const {wb,changed}=c.window.CanonicalWorkbook.reviewedWorkbook();
 assert.equal(changed,1);
 const originalTab=c.XLSX.utils.sheet_to_json(c.XLSX.read(file,{type:'buffer'}).Sheets.VI_2002,{defval:''})[0];
 const exported=c.XLSX.write(wb,{type:'array',bookType:'xlsx',compression:true});
 const tab=c.XLSX.utils.sheet_to_json(c.XLSX.read(exported,{type:'array'}).Sheets.VI_2002,{defval:''})[0];
 assert.equal(tab.original_clause,originalTab.original_clause);
 assert.equal(tab.ideational_primary_participant,originalTab.ideational_primary_participant);
 assert.equal(tab.human_actor,'Human-reviewed participant');
 assert.equal(tab.human_review_status,'approved');
 assert.equal(tab.human_review_note,'Manually verified in context');
 assert.equal(tab.human_reviewed_at_utc,human.reviewed_at_utc);
 const again=c.parseLanguage(exported,'reimport.xlsx');
 assert.ok(again.rows>=194);
 assert.equal(again.clauses.find(r=>r.id==='VI-H-001').human_actor,'Human-reviewed participant');
 assert.equal(again.clauses.find(r=>r.id==='VI-H-001').human_review_status,'approved');
});
