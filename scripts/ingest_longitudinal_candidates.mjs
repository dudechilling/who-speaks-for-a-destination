/* One-time intake from the private, retained source workspace.
 * It writes only the bounded institutional excerpts selected for source review. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const privateText='/mnt/current-semester/Fall 2026/CMNS 3500/Assignments/Project 3 - Final Project/Working Files/corpus/derived/text';
const vendor='/tmp/xlsx.full.min.js';
if(!fs.existsSync(vendor))throw Error('Missing staged SheetJS library: '+vendor);
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(vendor,'utf8'),context);
const XLSX=context.XLSX;
const mapping={
 'VI-2002-01':'VI_nd_About_Us_Board_2001_02_Page.txt','VI-2008-10':'VI_nd_TVI_About_Us_Page_c2008.txt','VI-2021-10':'VI_nd_Our_Organization_Page_2021.txt',
 'TO-2004-09':'TO_nd_TOTA_About_2004.txt','TO-2006-11':'TO_nd_TOTA_About_totabc_com_2006_capture.txt','TO-2009-04':'TO_nd_TOTA_About_2009_Stakeholder_Model.txt','TO-2017-05':'TO_nd_TOTA_What_We_Do_2017_capture.txt','TO-2024-04':'TO_nd_TOTA_About_Organization_2024_capture.txt',
 'KR-1998-12':'KR_nd_KR_TourismRockies_AboutUs_1998.txt','KR-2004-08':'KR_nd_KR_KRT_AboutUs_2004.txt','KR-2009-05':'KR_nd_KR_KRT_AboutUs_2009.txt','KR-2011-07':'KR_nd_KR_KRT_Profile_Newsletter_No2.txt','KR-2012-11':'KR_nd_KR_KRT_Profile_Newsletter_No2_v3.txt','KR-2013-02':'KR_nd_KR_KRT_Profile_Newsletter_2013_02.txt','KR-2014':'KR_2014_KR_KRT_Profile_2014.txt','KR-2015':'KR_2015_KR_Company_Profile_2015.txt','KR-2016':'KR_2016_KR_Company_Profile_2016_May.txt','KR-2017':'KR_2017_KR_Company_Profile_2017.txt','KR-2018':'KR_2018_KR_Company_Profile_2018_Jan.txt','KR-2024':'KR_nd_KR_Company_Profile_2024_Dec.txt','KR-2025-02':'KR_2025_KR_Company_Profile_2025.txt','KR-2025-09':'KR_2025_KR_Company_Profile_2025_III.txt',
 'NB-2005-02':'NB_nd_Member_Info_About_Nbctourism_Com_C_2005.txt','NB-2006-03':'NB_nd_Stakeholders_About_Nbctourism_Com_C_2006.txt','NB-2012-05':'NB_nd_TNBC_About_Travelnbc_Com_C_2012.txt','NB-2022-01':'NB_nd_TNBC_Who_We_Are_Travelnbc_Com_C_2022.txt'
};
function parseCsv(source){let quoted=false,cell='',line=[],out=[];for(let i=0;i<source.length;i++){const ch=source[i];if(ch==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){line.push(cell);cell='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&source[i+1]==='\n')i++;line.push(cell);out.push(line);line=[];cell='';}else cell+=ch;}if(cell||line.length){line.push(cell);out.push(line);}const head=out.shift();return out.map(row=>Object.fromEntries(head.map((key,i)=>[key,row[i]||''])));}
function cells(sheet){return XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});}
function cleaned(file){const source=fs.readFileSync(path.join(privateText,file),'utf8').replace(/\r|\f/g,'\n');const redact=x=>x.replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g,'[contact removed]').replace(/(?:\+?1[ .-]?)?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}/g,'[phone removed]').replace(/[ \t]+/g,' ').replace(/\n+/g,' ').trim();const chunks=source.split(/\n\s*\n/).map(redact).filter(x=>x.length>45&&!/^(home|about|contact|search|menu|copyright|privacy|skip)/i.test(x));let total=0,chosen=[];for(const chunk of chunks){if(total>=1800)break;const part=chunk.slice(0,1800-total);chosen.push(part);total+=part.length;}return chosen.length?chosen:[redact(source).slice(0,1800)];}
const workbookPath=path.join(root,'RDMO_about_coding_review.xlsx');
const book=XLSX.read(fs.readFileSync(workbookPath),{type:'buffer',cellStyles:true});
const inventory=new Map(parseCsv(fs.readFileSync(path.join(root,'corpus/longitudinal_inventory.csv'),'utf8')).map(x=>[x.source_id,x]));
const index=cells(book.Sheets.Index),header=index[1];
for(const name of ['original_url','capture_timestamp','source_verification_status','page_title','source_text_status'])if(!header.includes(name))header.push(name);
const fields=['clause_id','source_id','source_location','original_clause','normalized_clause','ideational_process_type','ideational_primary_participant','interpersonal_modality','representation_note','coding_note','review_state','source_order','paragraph_id','block_kind','heading_before','join_after','boundary_basis','human_review_status','human_process_type','human_actor','human_affected_participant','human_agency_voice','human_modality','human_institutional_priority','human_social_actor_representation','human_review_note','human_reviewed_at_utc','human_corrected_clause','text_type'];
let n=1;
for(const [sourceId,file] of Object.entries(mapping)){
 const meta=inventory.get(sourceId);if(!meta)throw Error('Missing inventory record: '+sourceId);
 const sheet='SRC_'+String(n++).padStart(2,'0'),rows=[fields];let order=1;
 rows.push([sourceId+'-H',sourceId,'Recovered document title',meta.title,'','','','','','','Awaiting researcher review',order++,'H1','heading','','','recovered-title','','','','','','','','','','','','heading']);
 for(const text of cleaned(file))rows.push([sourceId+'-P'+String(order).padStart(3,'0'),sourceId,'Private retained extraction; paragraph boundary awaiting researcher review',text,'','','','','','','Awaiting researcher review',order++,'P'+(order-1),'paragraph','',' ','plain-text-recovery','','','','','','','','','','','','paragraph']);
 XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),sheet);
 const values=Object.fromEntries(header.map(x=>[x,'']));Object.assign(values,{source_id:sourceId,worksheet:sheet,source_url:meta.archive_url||meta.source_url,capture_or_retrieval_date:meta.capture_timestamp||'Capture timestamp unavailable',publication_date:'Not independently established',sha256:'Private retained capture; source hash remains in private source index',included_sections:'Bounded institutional source-text extraction for researcher review.',excluded_sections:'Navigation, contact details, repeated site furniture and non-institutional material.',clause_count:0,identity_or_continuity_note:'Identity is reported by the source. Legal continuity is not independently established.',material_limitations:'Awaiting researcher review. This public workbook preserves a bounded extraction, not a full-page capture.',original_url:meta.source_url,capture_timestamp:meta.capture_timestamp,source_verification_status:'Awaiting researcher review',page_title:meta.title,source_text_status:'Recovered readable text; paragraph boundaries await researcher review'});
 index.push(header.map(h=>values[h]||''));
}
book.Sheets.Index=XLSX.utils.aoa_to_sheet(index);
const bytes=XLSX.write(book,{type:'buffer',bookType:'xlsx',cellStyles:true,compression:true});
fs.writeFileSync(workbookPath,bytes);
console.log(JSON.stringify({added:Object.keys(mapping).length,sheets:book.SheetNames.length,bytes:bytes.length}));
