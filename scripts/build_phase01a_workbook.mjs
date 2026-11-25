#!/usr/bin/env node
/* Build the Phase 01A source-only language workbook.
 * SheetJS runs only to construct XLSX data. Node's host filesystem creates the
 * private backup and writes the workbook; no isolated VM performs file writes. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workbookPath=path.join(root,'RDMO_about_coding_review.xlsx');
const privateRoot='/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/Working Files';
const privateText=path.join(privateRoot,'corpus/derived/text');
const archive=path.join(privateRoot,'corpus/archive');
const legacyCommit='788b497';
const vendor=path.join(root,'site/vendor/xlsx.full.min.js');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(vendor,'utf8'),context);
const XLSX=context.XLSX;

const files={
 'VI-H':'VI_nd_About_Us_Board_2001_02_Page.txt','VI-2002-01':'VI_nd_About_Us_Board_2001_02_Page.txt','VI-2008-10':'VI_nd_TVI_About_Us_Page_c2008.txt','VI-2021-10':'VI_nd_Our_Organization_Page_2021.txt',
 'TO-H':'TO_nd_TOTA_Board_AboutUs_2002.txt','TO-2004-09':'TO_nd_TOTA_About_2004.txt','TO-2006-11':'TO_nd_TOTA_About_totabc_com_2006_capture.txt','TO-2009-04':'TO_nd_TOTA_About_2009_Stakeholder_Model.txt','TO-2017-05':'TO_nd_TOTA_What_We_Do_2017_capture.txt','TO-2024-04':'TO_nd_TOTA_About_Organization_2024_capture.txt','TO-C':'TO_nd_TOTA_About_Page_Current.txt',
 'KR-1998-12':'KR_nd_KR_TourismRockies_AboutUs_1998.txt','KR-H':'KR_nd_KR_TourismRockies_AboutUs_1998.txt','KR-2004-08':'KR_nd_KR_KRT_AboutUs_2004.txt','KR-2009-05':'KR_nd_KR_KRT_AboutUs_2009.txt','KR-2011-07':'KR_nd_KR_KRT_Profile_Newsletter_No2.txt','KR-2012-11':'KR_nd_KR_KRT_Profile_Newsletter_No2_v3.txt','KR-2013-02':'KR_nd_KR_KRT_Profile_Newsletter_2013_02.txt','KR-2014':'KR_2014_KR_KRT_Profile_2014.txt','KR-2015':'KR_2015_KR_Company_Profile_2015.txt','KR-2016':'KR_2016_KR_Company_Profile_2016_May.txt','KR-2017':'KR_2017_KR_Company_Profile_2017.txt','KR-2018':'KR_2018_KR_Company_Profile_2018_Jan.txt','KR-2024':'KR_nd_KR_Company_Profile_2024_Dec.txt','KR-2025-02':'KR_2025_KR_Company_Profile_2025.txt','KR-2025-09':'KR_2025_KR_Company_Profile_2025_III.txt','KR-C':'KR_nd_KR_Company_Profile_Page_Live_2026.txt',
 'NB-H':'NB_2000_Our_Organization_Nbctourism_Com_2000_Mandate_Governance_Hist.txt','NB-2005-02':'NB_nd_Member_Info_About_Nbctourism_Com_C_2005.txt','NB-2006-03':'NB_nd_Stakeholders_About_Nbctourism_Com_C_2006.txt','NB-2012-05':'NB_nd_TNBC_About_Travelnbc_Com_C_2012.txt','NB-2022-01':'NB_nd_TNBC_Who_We_Are_Travelnbc_Com_C_2022.txt','NB-C':'NB_nd_About_Us.txt',
 'CC-H':'CC_nd_CC_About_the_CTA_2001.txt','CC-C':'CC_nd_CC_About_Vision_Mission_Current.txt'
};
// No capture is collapsed until its substantive comparison is documented.  Two
// likely duplicate pairs remain separately selectable in this increment.
const duplicates={};
const indexHeaders=['source_id','worksheet','region','page_title','genre','source_url','original_url','capture_timestamp','publication_date','source_verification_status','source_text_status','source_text_sha256','matching_capture_ids','included_sections','excluded_sections','rights_and_provenance_note','archival_reference'];
const blockHeaders=['block_id','source_id','source_order','block_kind','heading_level','heading_text','paragraph_id','list_level','list_marker','original_text','corrected_text','source_review_status','source_review_note','process_type','process','participants','voice','institutional_priority','represented_beneficiary','coding_provenance','coding_review_status','coding_review_note'];

function shaFile(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
function parseCsv(text){const rows=[];let quote=false,cell='',row=[];for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(ch===','&&!quote){row.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quote){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=ch;}if(cell||row.length){row.push(cell);rows.push(row);}const header=rows.shift();return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(header.map((key,i)=>[key,r[i]||''])));}
function normalize(value){return String(value||'').replace(/[ \t\u00a0]+/g,' ').trim();}
function curatedText(sourceId, raw){
 const between=(start,end)=>{const a=raw.indexOf(start);const b=a>=0?raw.indexOf(end,a+start.length):-1;return a>=0&&b>a?raw.slice(a,b):raw;};
 // These are documented source boundaries, not content rewrites. They remove
 // navigation, duplicated menus, contact directories and board rosters.
 if(sourceId==='VI-2002-01'||sourceId==='VI-H')return between('Tourism\nVancouver Island is one of six','Board\nof Directors');
 if(sourceId==='VI-2008-10')return between('Tourism Vancouver Island is a destination marketing organization','Explore  Our Organization');
 if(sourceId==='VI-2021-10')return between('Tourism Vancouver Island is a not-for-profit organization','Stakeholder Resources');
 if(sourceId==='TO-C')return between('About    TOTA is at the forefront','What We Do');
 if(sourceId==='NB-C')return between('About Us      Guiding Tourism Together','Corporate News');
 if(sourceId==='CC-C')return between('Cariboo Chilcotin Coast Tourism is a non-profit','Cariboo Chilcotin Coast Tourism\nSign Up');
 return raw;
}
function blocksFromText(source){const chunks=String(source).replace(/\r\n?|\f/g,'\n').split(/\n\s*\n+/).filter(x=>normalize(x));const out=[];let para=0;for(const chunk of chunks){const lines=chunk.split('\n').map(normalize).filter(Boolean);if(!lines.length)continue;if(lines.length===1&&lines[0].length<120&&/^[A-Z0-9 &/:'’\-.,()]+$/.test(lines[0])){out.push(['heading','','',lines[0]]);continue;}para++;for(const line of lines){const m=line.match(/^(?:([*•▪●-])|(\d+)[.)]|([A-Z])[.)])\s+(.+)$/);out.push(m?['list_item','P'+para,m[1]||m[2]||m[3],m[4]]:['paragraph','P'+para,'',line]);}}return out;}
function legacyBlocks(book,sourceId){const index=XLSX.utils.sheet_to_json(book.Sheets.Index,{header:1,defval:''});const h=index.findIndex(r=>r[0]==='source_id');if(h<0)return[];const cols=Object.fromEntries(index[h].map((x,i)=>[x,i]));const source=index.slice(h+1).find(r=>r[cols.source_id]===sourceId);const sheet=source?.[cols.worksheet];if(!sheet||!book.Sheets[sheet])return[];const rows=XLSX.utils.sheet_to_json(book.Sheets[sheet],{header:1,defval:''});const p=rows.findIndex(r=>r[0]==='clause_id'||r[0]==='row_id'||r[0]==='block_id');if(p<0)return[];const c=Object.fromEntries(rows[p].map((x,i)=>[x,i]));const text=c.original_clause??c.verbatim_text??c.original_text,kind=c.text_type??c.block_kind,paragraph=c.paragraph_id;return rows.slice(p+1).filter(r=>r[text]).map(r=>[r[kind]==='heading'?'heading':'paragraph',String(r[paragraph]||''),'',String(r[text])]);}
function sheet(rows){return XLSX.utils.aoa_to_sheet(rows);}
function applyWidths(ws,widths){ws['!cols']=widths.map(w=>({wch:w}));}

if(!fs.existsSync(workbookPath))throw Error('Missing canonical workbook: '+workbookPath);
const oldSha=shaFile(workbookPath);fs.mkdirSync(archive,{recursive:true});
const backup=path.join(archive,'RDMO_about_coding_review_pre_phase01a_'+legacyCommit+'.xlsx');
if(!fs.existsSync(backup))fs.copyFileSync(workbookPath,backup);
if(shaFile(backup)!=='2943ed81ba827e5f78528e57ba9fe6f40a1f3f5ce526ea88df49fce38a02ff42')throw Error('Private workbook archive does not match the documented pre-Phase 01A checksum');
const legacy=XLSX.read(fs.readFileSync(workbookPath),{type:'buffer',cellStyles:true});
const inventory=parseCsv(fs.readFileSync(path.join(root,'corpus/longitudinal_inventory.csv'),'utf8'));
const active=inventory.filter(r=>['candidate','baseline preserved'].includes(r.intake_status)&&!Object.hasOwn(duplicates,r.source_id)).sort((a,b)=>(a.region+a.capture_timestamp+a.source_id).localeCompare(b.region+b.capture_timestamp+b.source_id));
const wb=XLSX.utils.book_new();
const indexRows=[['RDMO About-page corpus — Phase 01A source-only workbook'],indexHeaders];
const registerRows=[['Longitudinal discovery inventory; excluded and unresolved items remain visible.'],[...Object.keys(inventory[0]),'active_workbook_status','retained_as_source_id']];
for(const r of inventory)registerRows.push([...Object.values(r),active.includes(r)?'active source version':Object.hasOwn(duplicates,r.source_id)?'matching capture retained in inventory':'not active',duplicates[r.source_id]||'']);
XLSX.utils.book_append_sheet(wb,sheet(indexRows),'Index');
XLSX.utils.book_append_sheet(wb,sheet(registerRows),'Source Inventory');
for(const [n,r] of active.entries()){
 const id=r.source_id,file=files[id],filePath=file&&path.join(privateText,file);
 const extracted=filePath&&fs.existsSync(filePath)?blocksFromText(curatedText(id,fs.readFileSync(filePath,'utf8'))):[];
 const sourceBlocks=extracted.length?extracted:legacyBlocks(legacy,id);
 if(!sourceBlocks.length)throw Error('No recoverable source wording for active source: '+id);
 const rows=[blockHeaders];sourceBlocks.forEach(([kind,paragraph,marker,text],i)=>rows.push([id+'-B'+String(i+1).padStart(3,'0'),id,i+1,kind,kind==='heading'?'1':'',kind==='heading'?text:'',paragraph,marker?'1':'',marker,text,'','Awaiting researcher review','','','','','','','','']));
 const name='SRC_'+String(n+1).padStart(2,'0'),ws=sheet(rows);applyWidths(ws,[24,18,12,14,14,28,14,12,14,88,88,28,48]);XLSX.utils.book_append_sheet(wb,ws,name);
 const digest=crypto.createHash('sha256').update(sourceBlocks.map(x=>x[3]).join('\n')).digest('hex');
 const matches=Object.entries(duplicates).filter(([,value])=>value===id).map(([key])=>key).join('; ');
 indexRows.push([id,name,r.region,r.title,r.genre,(r.archive_url||'').trim()||(r.source_url||'').trim(),r.source_url,r.capture_timestamp,'Not independently established','Awaiting researcher review','Recovered readable source text',digest,matches,'Recovered About-page wording, headings, paragraphs and list items.','Site navigation, contact details and repeated page furniture remain in the private capture unless part of the retained source text.',r.rights_and_provenance_note,filePath&&fs.existsSync(filePath)?'Private retained extraction: '+file:'Existing canonical recovered source wording; retained full capture is not presently indexed in the private text directory.']);
}
wb.Sheets.Index=sheet(indexRows);
applyWidths(wb.Sheets.Index,[22,14,24,38,26,64,64,26,26,32,32,66,26,56,68,56,68]);
applyWidths(wb.Sheets['Source Inventory'],[20,24,26,28,64,64,42,22,66,66,32,28]);
for(const name of wb.SheetNames){const ws=wb.Sheets[name];ws['!freeze']={xSplit:0,ySplit:name==='Index'||name==='Source Inventory'?2:1};}
wb.Props={Title:'RDMO About-page corpus — Phase 01A',Subject:'Source-only longitudinal About-page collection',Author:'Earl Healy'};
const bytes=XLSX.write(wb,{type:'buffer',bookType:'xlsx',compression:true});
fs.writeFileSync(workbookPath,bytes);
console.log(JSON.stringify({active_sources:active.length,inventory_records:inventory.length,archived_legacy_sha256:oldSha,archive:backup,bytes:bytes.length}));
