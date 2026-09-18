#!/usr/bin/env python3
import json, re, hashlib, datetime, os
from pathlib import Path
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"data"/"character-sync-latest.json"
SOURCES=ROOT/"data"/"character-sync-sources.json"
now=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()

def norm(s): return re.sub(r"\s+","",str(s or "")).replace("（","(").replace("）",")").lower()

def extract_json(x,out):
    if isinstance(x,list):
        for v in x: extract_json(v,out)
    elif isinstance(x,dict):
        name=x.get("name") or x.get("characterName") or x.get("cardName") or x.get("title")
        rarity=str(x.get("rarity") or x.get("rarityName") or x.get("rank") or "").upper()
        if name and rarity in {"SSR","SR","R"}:
            out.append(x)
        for v in x.values():
            if isinstance(v,(dict,list)): extract_json(v,out)

def fetch(s):
    r=requests.get(s["endpoint"],timeout=20,headers={"User-Agent":"GuildBattle-character-sync/1.0","Accept":"application/json,text/html,*/*"})
    r.raise_for_status()
    if s["format"]=="json":
        out=[]; extract_json(r.json(),out); return out
    soup=BeautifulSoup(r.text,"html.parser")
    out=[]
    for el in soup.select("a,h1,h2,h3,h4,h5,li"):
        t=" ".join(el.get_text(" ",strip=True).split())
        m=re.match(r"^(.+?)\s+(?:（|\()?((?:SSR|SR|R))(?:）|\))?$",t,re.I)
        if m and len(m.group(1))<100:
            out.append({"name":m.group(1),"rarity":(m.group(2) or "").upper()})
    return out

def main():
    cfg=json.loads(SOURCES.read_text())
    rows=[];errors=[]
    for s in sorted([x for x in cfg["sources"] if x.get("enabled") and x.get("endpoint")],key=lambda x:x["priority"]):
        try:
            got=fetch(s)
            for x in got:
                x["_source"]=s["id"]; x["_priority"]=s["priority"]; x["_source_url"]=s["endpoint"]
            rows.extend(got)
        except Exception as e: errors.append({"source":s["id"],"error":str(e)})
    merged={}
    for x in rows:
        n=x.get("name") or x.get("characterName") or x.get("cardName") or x.get("title")
        if n: merged[norm(n)]={**x,"name":str(n).strip()}
    result={"version":1,"generated_at":now(),"count":len(merged),"records":list(merged.values()),"errors":errors,
            "source_priority":["game_server","public_api","official_web_api","public_guide"]}
    OUT.parent.mkdir(parents=True,exist_ok=True); OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps({"count":len(merged),"errors":errors},ensure_ascii=False))

if __name__=="__main__": main()
