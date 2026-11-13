#!/usr/bin/env python3
"""Private fail-closed, read-only workbook adjudicator."""
from __future__ import annotations
import argparse,csv,hashlib,io,json,mimetypes,secrets,sqlite3,threading
from datetime import datetime,timezone
from html.parser import HTMLParser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs,urlparse,urlunparse
from openpyxl import load_workbook

SHEETS=("Northern BC","Cariboo Chilcotin Coast","Thompson Okanagan","Kootenay Rockies","Vancouver Island")
HEADERS=("row_id","about_id","source_url","publication_date","capture_date","date_basis","page_section","text_type","source_order","verbatim_text","process_type","actor","affected_participant","agency_voice","modality","institutional_priority","social_actor_representation","annotations","review_status","coding_pass","codebook_version","reviewed_by","reviewed_on")
CODE_FIELDS=("process_type","actor","affected_participant","agency_voice","modality","institutional_priority","social_actor_representation")
MAX_BODY=100000; PUBLIC_HOST="alfred.tail41f62a.ts.net:8444"; PAGES_ORIGIN="https://dudechilling.github.io"

def now(): return datetime.now(timezone.utc).isoformat()
def digest(p):
    with open(p,"rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()
def date_key(v): return str(v or "").strip()[:10]
def canonical_url(v):
    v=(v or "").strip().replace("id_/","/")
    p=urlparse(v); host=p.netloc[:-3] if p.netloc.endswith(":80") else p.netloc
    return urlunparse((p.scheme,host,p.path.rstrip("/") or "/",p.params,p.query,""))
def fingerprint(r):
    return hashlib.sha256(json.dumps({k:r.get(k,"") for k in ("row_id","about_id","source_url","capture_date","verbatim_text",*CODE_FIELDS)},sort_keys=True,default=str,separators=(",", ":")).encode()).hexdigest()

class TextOnly(HTMLParser):
    def __init__(self): super().__init__();self.parts=[];self.skip=0
    def handle_starttag(self,t,a): self.skip+=t.lower() in ("script","style","data")
    def handle_endtag(self,t):
        if t.lower() in ("script","style","data") and self.skip:self.skip-=1
    def handle_data(self,d):
        if not self.skip:self.parts.append(d)
    def text(self):return " ".join(" ".join(self.parts).split())

class Store:
    def __init__(self,d):
        self.path=Path(d);self.path.mkdir(parents=True,exist_ok=True);self.db=self.path/"adjudicator.sqlite3";self.lock=threading.Lock()
        with self.con() as c:c.execute("CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,row_id TEXT,kind TEXT,payload TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL)")
    def con(self):return sqlite3.connect(self.db,check_same_thread=False)
    def events(self,rid):
        with self.con() as c: rows=c.execute("SELECT id,kind,payload,actor,created_at FROM events WHERE row_id=? ORDER BY id",(rid,)).fetchall()
        return [{"id":i,"kind":k,"data":json.loads(p),"actor":a,"at":t} for i,k,p,a,t in rows]
    def latest(self,rid,fp):
        good={};stale=[]
        for e in self.events(rid):
            if e["data"].get("fingerprint")==fp:good[e["kind"]]=e
            else:stale.append(e)
        return good,stale
    def append(self,rid,kind,data,actor):
        with self.lock,self.con() as c:c.execute("INSERT INTO events(row_id,kind,payload,actor,created_at) VALUES(?,?,?,?,?)",(rid,kind,json.dumps(data,ensure_ascii=False),actor,now()))
    def append_many(self,events,actor):
        """One transaction prevents a source/code half-approval."""
        with self.lock,self.con() as c:
            for rid,kind,data in events:c.execute("INSERT INTO events(row_id,kind,payload,actor,created_at) VALUES(?,?,?,?,?)",(rid,kind,json.dumps(data,ensure_ascii=False),actor,now()))

class App:
    def __init__(self,a):
        self.args=a;self.workbook=Path(a.workbook).resolve();self.corpus=Path(a.corpus).resolve();self.token=secrets.token_urlsafe(32)
        if a.host.lower() not in ("127.0.0.1","::1"):raise ValueError("the adjudicator may bind only to 127.0.0.1 or ::1")
        self.allowed=Path(a.allowed_login_file).read_text().strip() if a.allowed_login_file else ""
        if not a.dev_local:
            f=Path(a.allowed_login_file or ""); repo=Path(__file__).resolve().parents[1]; state=Path(a.state_dir).resolve()
            if not self.workbook.is_file() or not f.is_file() or not self.allowed:raise ValueError("production requires workbook and nonempty allow-login file")
            if f.stat().st_mode&0o777!=0o600:raise ValueError("allow-login file must have mode 0600")
            if state==repo or repo in state.parents:raise ValueError("state directory must be outside repository")
        self.store=Store(a.state_dir)
    def rows(self):
        wb=load_workbook(self.workbook,read_only=True,data_only=False);out=[]
        try:
            for sn in SHEETS:
                ws=wb[sn];h=[c.value for c in next(ws.iter_rows(min_row=5,max_row=5))]
                if tuple(h[:len(HEADERS)])!=HEADERS:raise ValueError(f"unexpected workbook columns in {sn}")
                for n,v in enumerate(ws.iter_rows(min_row=6,values_only=True),6):
                    if not v[0]:continue
                    r={HEADERS[i]:v[i] for i in range(len(HEADERS))};r.update(sheet=sn,sheet_row=n)
                    for k,x in list(r.items()):
                        if hasattr(x,"isoformat"):r[k]=x.isoformat()
                    r["fingerprint"]=fingerprint(r);out.append(r)
        finally:wb.close()
        return out
    def sources(self):
        d={}
        for r in self.rows():d.setdefault(r["about_id"],{k:r[k] for k in ("about_id","source_url","publication_date","capture_date","date_basis")})
        return list(d.values())
    def source_text(self,aid):
        src=next((x for x in self.sources() if x["about_id"]==aid),None); base={"about_id":aid,"external_url":src["source_url"] if src else ""}
        idx=self.corpus/"source_index.csv"
        if not src:return {**base,"status":"gap","message":"Unknown source page."}
        if not idx.is_file():return {**base,"status":"gap","message":"Source index is unavailable."}
        target,cap=canonical_url(src["source_url"]),date_key(src["capture_date"]);match=None
        with idx.open(newline="",encoding="utf-8") as f:
            for x in csv.DictReader(f):
                urls=[x.get("archive_url",""),x.get("original_url","")]+[u.strip() for u in x.get("alternate_urls","").split("|")]
                # Historical captures are keyed by Wayback timestamp. Current official
                # captures are keyed by the date of local retrieval, not archive date.
                is_wayback="web.archive.org" in urlparse(src["source_url"]).netloc
                evidence_date=x.get("archive_capture_date") if is_wayback else x.get("retrieval_date")
                if cap and date_key(evidence_date)!=cap:continue
                if any(canonical_url(u)==target for u in urls):match=x;break
        if not match:return {**base,"status":"gap","message":"No indexed local capture exactly matches this URL and capture date."}
        file=(self.corpus/match.get("local_file","")).resolve()
        if self.corpus not in file.parents or not file.is_file():return {**base,"status":"gap","message":"Indexed capture is missing."}
        actual=digest(file).lower(); expected=match.get("sha256","").lower()
        if not expected or actual!=expected:return {**base,"status":"mismatch","message":"Indexed capture hash mismatch or is unverified.","expected_sha256":expected,"actual_sha256":actual}
        parser=TextOnly();parser.feed(file.read_text(encoding="utf-8",errors="replace"));parser.close()
        return {**base,"status":"ok","text":parser.text(),"hash_corroborated":True,"archive_url":match.get("archive_url",""),"original_url":match.get("original_url","")}
    def identity(self,h):
        hosts=h.headers.get_all("Host") or [];logins=h.headers.get_all("Tailscale-User-Login") or []; loop=h.client_address[0] in ("127.0.0.1","::1")
        local={f"127.0.0.1:{self.args.port}",f"localhost:{self.args.port}",f"[::1]:{self.args.port}"}
        if self.args.dev_local and loop and len(hosts)==1 and hosts[0] in local and not logins:return "dev-local"
        if len(hosts)!=1 or hosts[0]!=PUBLIC_HOST or len(logins)!=1 or not self.allowed or not secrets.compare_digest(logins[0],self.allowed):return None
        return logins[0]

class Handler(BaseHTTPRequestHandler):
    app:App
    def log_message(self,*a):pass
    def send(self,status,body=b"",typ="application/json; charset=utf-8",extra=None):
        self.send_response(status);self.send_header("X-Content-Type-Options","nosniff");self.send_header("X-Frame-Options","DENY");self.send_header("Referrer-Policy","no-referrer");self.send_header("Content-Security-Policy","default-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; style-src 'self'; script-src 'self'");self.send_header("Content-Type",typ);self.send_header("Content-Length",str(len(body)));self.send_header("Cache-Control","no-store")
        origins=self.headers.get_all("Origin") or []
        # The reviewer never exposes an unauthenticated cross-origin resource.
        # CORS only lets the Pages shell read a response after Tailnet auth succeeds.
        if len(origins)==1 and origins[0]==PAGES_ORIGIN:
            self.send_header("Access-Control-Allow-Origin",PAGES_ORIGIN);self.send_header("Access-Control-Allow-Credentials","true");self.send_header("Vary","Origin")
        for k,v in (extra or {}).items():self.send_header(k,v)
        self.end_headers();self.wfile.write(body)
    def js(self,s,x):self.send(s,json.dumps(x,ensure_ascii=False).encode())
    def auth(self):
        a=self.app.identity(self)
        if not a:self.js(403,{"error":"private tailnet authorization required"})
        return a
    def csrf(self):
        origins=self.headers.get_all("Origin") or []; exp=f"http://{self.headers.get('Host','')}" if self.app.args.dev_local else f"https://{PUBLIC_HOST}"
        return len(origins)==1 and origins[0] in (exp,PAGES_ORIGIN) and secrets.compare_digest(self.headers.get("X-CSRF-Token",""),self.app.token)
    def origin_ok(self):
        """No Origin is ordinary same-origin navigation; cross-origin is exact-only."""
        origins=self.headers.get_all("Origin") or []
        if not origins:return True
        exp=f"http://{self.headers.get('Host','')}" if self.app.args.dev_local else f"https://{PUBLIC_HOST}"
        return len(origins)==1 and origins[0] in (exp,PAGES_ORIGIN)
    def do_OPTIONS(self):
        origins=self.headers.get_all("Origin") or []; hosts=self.headers.get_all("Host") or []; methods=self.headers.get_all("Access-Control-Request-Method") or []; origin=origins[0] if len(origins)==1 else ""; method=methods[0] if len(methods)==1 else ""; requested={x.strip().lower() for x in self.headers.get("Access-Control-Request-Headers","").split(",") if x.strip()}
        safe={"content-type","x-csrf-token"}
        if len(hosts)!=1 or hosts[0]!=PUBLIC_HOST or origin!=PAGES_ORIGIN or method not in ("GET","POST") or not requested.issubset(safe):return self.js(403,{"error":"CORS preflight rejected"})
        self.send(204,b"","text/plain",{"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, X-CSRF-Token","Access-Control-Max-Age":"600"})
    def state(self,r):
        cur,stale=self.app.store.latest(r["row_id"],r["fingerprint"]);s=cur.get("source",{}).get("data",{}).get("decision","pending");c=cur.get("code",{}).get("data",{}).get("decision","pending");ok=c in ("accept","correct") and s in ("verified","correct")
        return cur,stale,{"source":s,"code":"accepted" if ok else c,"accepted":ok,"stale":bool(stale)}
    def present(self,r,full=False):
        if not r:return None
        d=dict(r);cur,stale,review=self.state(r);d.update(decisions=cur,stale_events=stale,review=review)
        if not full:d.pop("verbatim_text",None);d.pop("annotations",None)
        return d
    def static(self,n,t):
        f=(Path(__file__).parent/"static"/n).resolve();root=(Path(__file__).parent/"static").resolve()
        if root not in f.parents or not f.is_file():return self.js(404,{"error":"not found"})
        self.send(200,f.read_bytes(),t)
    def do_GET(self):
        if not self.auth():return
        if not self.origin_ok():return self.js(403,{"error":"origin rejected"})
        p=urlparse(self.path).path
        if p=="/api/bootstrap":return self.js(200,{"csrf":self.app.token,"workbook_sha256":digest(self.app.workbook),"sources":self.app.sources(),"dev_local":self.app.args.dev_local})
        if p=="/api/rows":
            q=parse_qs(urlparse(self.path).query);needle=q.get("q",[""])[0].lower();about=q.get("about",[""])[0];rows=[self.present(r) for r in self.app.rows() if(not about or r["about_id"]==about)and(not needle or needle in json.dumps(r,default=str).lower())];accepted=sum(r["review"]["accepted"] for r in rows)
            return self.js(200,{"rows":rows,"total":len(rows),"accepted":accepted,"pending":len(rows)-accepted,"workbook_sha256":digest(self.app.workbook)})
        if p.startswith("/api/row/"):
            r=next((x for x in self.app.rows() if x["row_id"]==p.rsplit("/",1)[-1]),None);return self.js(200,self.present(r,True)) if r else self.js(404,{"error":"row not found"})
        if p.startswith("/api/source/"):return self.js(200,self.app.source_text(p.rsplit("/",1)[-1]))
        if p=="/api/export.csv":return self.export_csv()
        if p=="/api/export.xlsx":return self.export_xlsx()
        if p=="/api/export-approved.json":return self.export_approved()
        if p in ("/","/index.html"):return self.static("index.html","text/html; charset=utf-8")
        if p in ("/style.css","/app.js"):return self.static(p[1:],mimetypes.guess_type(p)[0] or "application/octet-stream")
        self.js(404,{"error":"not found"})
    def do_POST(self):
        actor=self.auth()
        if not actor:return
        if not self.origin_ok():return self.js(403,{"error":"origin rejected"})
        if not self.csrf():return self.js(403,{"error":"origin or CSRF token rejected"})
        if self.path not in ("/api/decision","/api/approve"):return self.js(404,{"error":"not found"})
        try:
            n=int(self.headers.get("Content-Length","-1"));assert 1<=n<=MAX_BODY;x=json.loads(self.rfile.read(n));rid,fp=x["row_id"],x["fingerprint"]
        except Exception:return self.js(400,{"error":"invalid request"})
        r=next((v for v in self.app.rows() if v["row_id"]==rid),None)
        if not r:return self.js(404,{"error":"row not found"})
        if not secrets.compare_digest(fp,r["fingerprint"]):return self.js(409,{"error":"stale row; reload before saving"})
        data=x.get("data",{}); decision=data.get("decision")
        if self.path=="/api/approve":
            decision=x.get("decision"); checked=x.get("checked") is True
            if decision not in ("accept","reject"):return self.js(400,{"error":"invalid approval decision"})
            if decision=="accept" and not checked:return self.js(400,{"error":"source wording confirmation is required"})
            codes=x.get("codes",{})
            corrected=x.get("corrected_text","")
            note=x.get("note","")
            if not isinstance(codes,dict) or any(k not in CODE_FIELDS or not isinstance(v,str) or len(v)>4096 for k,v in codes.items()):
                return self.js(400,{"error":"invalid code fields"})
            if not isinstance(corrected,str) or len(corrected)>30000 or not isinstance(note,str) or len(note)>8000:
                return self.js(400,{"error":"invalid review text"})
            if decision=="accept" and corrected and x.get("recoded") is not True:
                return self.js(400,{"error":"corrected wording requires renewed coding confirmation"})
            changed_codes=any(codes.get(f,str(r[f] or ""))!=str(r[f] or "") for f in CODE_FIELDS)
            source="correct" if corrected else "verified"
            code="correct" if changed_codes else "accept"
            cd={"decision":code if decision=="accept" else "reject","codes":codes if decision=="accept" else {},"note":note,"fingerprint":r["fingerprint"]}
            if decision=="accept":
                sd={"decision":source,"corrected_text":corrected,"note":note,"fingerprint":r["fingerprint"]}
                events=[(rid,"source",sd),(rid,"code",cd)]
            else:
                # Reject is a classification decision; it is not evidence the source is wrong.
                events=[(rid,"code",cd)]
            self.app.store.append_many(events,actor)
            return self.js(201,{"saved":True,"atomic":True,"message":"human decision saved"})
        kind=x.get("kind")
        if kind not in ("source","code") or decision not in ("correct","verified","accept","reject","defer"):return self.js(400,{"error":"invalid decision"})
        cur,_,_=self.state(r)
        if kind=="code" and decision in ("accept","correct") and cur.get("source",{}).get("data",{}).get("decision") not in ("correct","verified"):return self.js(409,{"error":"a current source verification is required before accepting or correcting tags"})
        data={**data,"fingerprint":r["fingerprint"]}
        if kind=="source" and data.get("corrected_text"):self.app.store.append(rid,"code",{"decision":"defer","reason":"source text correction requires new tag review","fingerprint":r["fingerprint"]},actor)
        self.app.store.append(rid,kind,data,actor);cur,stale=self.app.store.latest(rid,r["fingerprint"]);self.js(201,{"saved":True,"decisions":cur,"stale_events":stale})
    def merged(self):
        for r in self.app.rows():
            cur,stale,review=self.state(r);source,code=cur.get("source",{}),cur.get("code",{});sd,cd=source.get("data",{}),code.get("data",{});o=dict(r)
            o.update(source_status=review["source"],code_status=review["code"],stale=review["stale"],human_status="Accepted" if review["accepted"] else "Pending",human_reviewed_by=code.get("actor","") if review["accepted"] else "",human_reviewed_on=code.get("at","") if review["accepted"] else "",reviewer_note=cd.get("note",""),source_note=sd.get("note",""),corrected_source_text=sd.get("corrected_text","") if review["accepted"] else "",audit_ledger=json.dumps({"current":cur,"stale":stale},ensure_ascii=False))
            for f in CODE_FIELDS:o["candidate_"+f]=r[f];o["confirmed_"+f]=cd.get("codes",{}).get(f,r[f]) if review["accepted"] else ""
            yield o
    def export_csv(self):
        rows=list(self.merged());f=io.StringIO();w=csv.DictWriter(f,fieldnames=list(rows[0]) if rows else list(HEADERS),extrasaction="ignore");w.writeheader()
        for row in rows:
            # Preserve literal text in XLSX. CSV needs spreadsheet-formula protection.
            w.writerow({k:("'"+v if isinstance(v,str) and v.lstrip().startswith(("=","+","-","@")) else v) for k,v in row.items()})
        self.send(200,f.getvalue().encode(),"text/csv; charset=utf-8",{"Content-Disposition":"attachment; filename=adjudicated-export.csv"})
    def export_xlsx(self):
        data={r["row_id"]:r for r in self.merged()};wb=load_workbook(self.app.workbook,read_only=False,data_only=False);audit=wb.create_sheet("Review Audit");audit.append(["row_id","fingerprint","source_status","code_status","stale","reviewed_by","reviewed_on","reviewer_note","source_note"])
        for sn in SHEETS:
            ws=wb[sn]
            for n in range(6,ws.max_row+1):
                r=data.get(str(ws.cell(n,1).value))
                if not r:continue
                if r["human_status"]=="Accepted":
                    for col,f in enumerate(CODE_FIELDS,11):
                        cell=ws.cell(n,col);cell.value=str(r["confirmed_"+f] or "");cell.data_type="s"
                    if r["corrected_source_text"]:
                        cell=ws.cell(n,10);cell.value=str(r["corrected_source_text"]);cell.data_type="s"
                    old=ws.cell(n,18).value or "";cell=ws.cell(n,18);cell.value=(old+"\nHuman review: "+r["reviewer_note"]).strip();cell.data_type="s"
                    ws.cell(n,19).value="Accepted";ws.cell(n,22).value=r["human_reviewed_by"];ws.cell(n,23).value=r["human_reviewed_on"]
                audit.append([r[k] for k in ("row_id","fingerprint","source_status","code_status","stale","human_reviewed_by","human_reviewed_on","reviewer_note","source_note")])
        b=io.BytesIO();wb.save(b);wb.close();self.send(200,b.getvalue(),"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",{"Content-Disposition":"attachment; filename=adjudicated-export.xlsx"})
    def export_approved(self):
        # Owner-only release candidate, deliberately not a public route or publisher.
        rows=[]
        for r in self.merged():
            if r["human_status"]=="Accepted":rows.append({"row_id":r["row_id"],"about_id":r["about_id"],"source_url":r["source_url"],"codes":{f:r["confirmed_"+f] for f in CODE_FIELDS},"rights_review_required":True})
        self.js(200,{"version":1,"status":"not yet published","rights_review_required":True,"rows":rows})

def main():
    p=argparse.ArgumentParser();p.add_argument("--workbook",required=True);p.add_argument("--corpus",required=True);p.add_argument("--state-dir",required=True);p.add_argument("--allowed-login-file");p.add_argument("--port",type=int,default=8778);p.add_argument("--host",default="127.0.0.1");p.add_argument("--dev-local",action="store_true");a=p.parse_args();app=App(a);Handler.app=app;httpd=ThreadingHTTPServer((a.host,a.port),Handler);print(f"{'LOCAL DEVELOPMENT MODE' if a.dev_local else 'PRIVATE TAILNET MODE'}: adjudicator listening on {a.host}:{a.port}",flush=True);httpd.serve_forever()
if __name__=="__main__":main()
