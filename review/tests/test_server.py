import hashlib,json,os,subprocess,sys,tempfile,time,unittest
from http.client import HTTPConnection
from pathlib import Path
from openpyxl import Workbook,load_workbook

ROOT=Path(__file__).parents[2];SERVER=ROOT/'review/server.py';SHEETS=['Northern BC','Cariboo Chilcotin Coast','Thompson Okanagan','Kootenay Rockies','Vancouver Island'];EXTRA=['START HERE','Source Decisions','Document Findings']
FIELDS=['row_id','about_id','source_url','publication_date','capture_date','date_basis','page_section','text_type','source_order','verbatim_text','process_type','actor','affected_participant','agency_voice','modality','institutional_priority','social_actor_representation','annotations','review_status','coding_pass','codebook_version','reviewed_by','reviewed_on']
def fixture(d):
 w=Workbook();w.remove(w.active)
 for n in EXTRA:w.create_sheet(n).append(['keep',n])
 for i,n in enumerate(SHEETS):
  s=w.create_sheet(n);[s.append(['']*23) for _ in range(4)];s.append(FIELDS);s.append([f'R{i}',f'A{i}','https://web.archive.org/web/20260101id_/https://example.test/a',None,'2026-01-01','capture','about','body',1,'Synthetic text','material','actor','affected','active','none','marketing','actor','note','Pending','first','0.1','',''])
 p=d/'book.xlsx';w.save(p);c=d/'corpus';c.mkdir();html=c/'capture.html';html.write_text('<style>bad</style><script>bad</script><p>Safe source text</p>');h=hashlib.sha256(html.read_bytes()).hexdigest();(c/'source_index.csv').write_text('source_id,region,organization,original_url,archive_url,alternate_urls,retrieval_date,local_file,file_type,sha256,archive_capture_date\n1,x,x,https://example.test/a,https://web.archive.org/web/20260101/https://example.test/a,,x,capture.html,html,'+h+',2026-01-01\n');return p,c
class Tests(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory();self.d=Path(self.t.name);self.wb,self.corpus=fixture(self.d);self.sha=hashlib.sha256(self.wb.read_bytes()).hexdigest();self.port=18987;self.allow=self.d/'allow';self.allow.write_text('reviewer@test\n');os.chmod(self.allow,0o600);self.start()
 def start(self):
  self.p=subprocess.Popen([sys.executable,str(SERVER),'--workbook',str(self.wb),'--corpus',str(self.corpus),'--state-dir',str(self.d/'state'),'--allowed-login-file',str(self.allow),'--port',str(self.port)],stdout=subprocess.PIPE,text=True);self.p.stdout.readline();time.sleep(.05)
 def stop(self):
  self.p.terminate();self.p.wait();self.p.stdout.close()
 def tearDown(self):self.stop();self.t.cleanup()
 def h(self):return {'Host':'alfred.tail41f62a.ts.net:8444','Tailscale-User-Login':'reviewer@test'}
 def req(self,path,method='GET',body=None,h=None):
  c=HTTPConnection('127.0.0.1',self.port);c.request(method,path,body,h or {});r=c.getresponse();return r.status,r.read()
 def boot(self):return json.loads(self.req('/api/bootstrap',h=self.h())[1])
 def post(self,data,csrf):return self.req('/api/decision','POST',json.dumps(data),{**self.h(),'Origin':'https://alfred.tail41f62a.ts.net:8444','Content-Type':'application/json','X-CSRF-Token':csrf})
 def test_source_auth_stale_export_and_persistence(self):
  self.assertEqual(self.req('/api/rows')[0],403);b=self.boot();self.assertEqual(len(b['sources']),5)
  source=json.loads(self.req('/api/source/A0',h=self.h())[1]);self.assertEqual(source['status'],'ok');self.assertIn('Safe source text',source['text']);self.assertNotIn('bad',source['text'])
  row=json.loads(self.req('/api/row/R0',h=self.h())[1]);base={'row_id':'R0','fingerprint':row['fingerprint']}
  self.assertEqual(self.post({**base,'kind':'code','data':{'decision':'accept'}},b['csrf'])[0],409)
  self.assertEqual(self.post({**base,'kind':'source','data':{'decision':'verified'}},b['csrf'])[0],201)
  self.assertEqual(self.post({**base,'kind':'code','data':{'decision':'correct','codes':{'process_type':'relational'}}},b['csrf'])[0],201)
  out=self.req('/api/export.xlsx',h=self.h())[1];export=self.d/'out.xlsx';export.write_bytes(out);ew=load_workbook(export);self.assertTrue(set(SHEETS+EXTRA).issubset(ew.sheetnames));self.assertEqual(ew['Northern BC'].cell(6,11).value,'relational');self.assertEqual(ew['Northern BC'].cell(6,19).value,'Accepted');self.assertIn('Review Audit',ew.sheetnames);self.assertEqual(hashlib.sha256(self.wb.read_bytes()).hexdigest(),self.sha)
  w=load_workbook(self.wb);w['Northern BC'].cell(6,10).value='Changed synthetic text';w.save(self.wb)
  changed=json.loads(self.req('/api/row/R0',h=self.h())[1]);self.assertTrue(changed['review']['stale']);self.assertFalse(changed['review']['accepted']);self.assertEqual(self.post({**base,'kind':'code','data':{'decision':'defer'}},b['csrf'])[0],409)
  self.stop();self.start();self.assertTrue(json.loads(self.req('/api/row/R0',h=self.h())[1])['review']['stale'])
 def test_denials_and_original_unchanged_until_test_edit(self):
  self.assertEqual(self.req('/../server.py',h=self.h())[0],404);self.assertEqual(self.req('/api/source/nope',h=self.h())[0],200);b=self.boot();self.assertEqual(self.post({'row_id':'R0','fingerprint':'0'*64,'kind':'source','data':{'decision':'verified'}},'bad')[0],403);self.assertEqual(hashlib.sha256(self.wb.read_bytes()).hexdigest(),self.sha)
if __name__=='__main__':unittest.main()
