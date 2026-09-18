#!/usr/bin/env python3
# GuildBattle skill/spec sync: skill, multiplier, TU, status, conditions
import json,re,datetime,hashlib
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
CFG=ROOT/"data"/"character-sync-sources.json"
OUT=ROOT/"data"/"character-skill-sync-latest.json"
UA="GuildBattle-skill-sync/2.0"
now=lambda:datetime.datetime.now(datetime.timezone.utc).isoformat()

def norm(s):
    return re.sub(r"\s+","",str(s or "")).replace("（","(").replace("）",")").lower()

def nums(s):
    return [float(x) for x in re.findall(r"(?<![A-Za-z])\d+(?:\.\d+)?",s or "")]

def parse_skill(name, body, idx):
    text=" ".join(str(body or "").split())
    low=text.lower()
    mult=None
    m=re.search(r"(\d+(?:\.\d+)?)\s*倍",text)
    if m: mult=float(m.group(1))
    tu=None
    m=re.search(r"(\d+)\s*TU",text,re.I)
    if m: tu=int(m.group(1))
    target="enemy_single"
    if "敵全体" in text or "全体" in name: target="enemy_all"
    elif "敵2体" in text or "2体" in name: target="enemy_2"
    elif "味方" in text or "自身" in text: target="ally_single"
    status=[]
    for jp,key in [("スタン","stun"),("睡眠","sleep"),("毒","poison"),("燃焼","burn"),("凍結","freeze"),("麻痺","paralyze"),("スロウ","slow"),("沈黙","silence")]:
        if jp in text or jp in name: status.append(key)
    conditions=[]
    patterns=[
      (r"(HP|体力)[^。\n]{0,30}(\d+)%未満","hp_below_percent"),
      (r"(HP|体力)[^。\n]{0,30}(\d+)%以下","hp_at_or_below_percent"),
      (r"(\d+)TU[^。\n]{0,30}(?:生存|経過)","survive_tu"),
      (r"(\d+)キル[^。\n]{0,20}(?:以上|達成)","kills_gte"),
      (r"(\d+)TU[^。\n]{0,20}(?:以上|以上の)","enemy_tu_gte")
    ]
    for pat,key in patterns:
        for mm in re.finditer(pat,text):
            conditions.append({"type":key,"value":int(mm.group(2) if mm.lastindex and mm.lastindex>=2 else mm.group(1))})
    if "EX" in name or "EX" in text: 
        ex=True
    else: ex=False
    return {
      "id":f"SK-{hashlib.sha1((name+'|'+str(idx)).encode()).hexdigest()[:10]}",
      "name":name.strip(),"type":"damage",
      "target":target,"multiplier":mult,"tu":tu,
      "status_effects":status,"conditions":conditions,"ex":ex,
      "raw_text":text,"source_verified":False
    }

def extract_page(url):
    r=requests.get(url,timeout=25,headers={"User-Agent":UA,"Accept":"text/html,*/*"});r.raise_for_status()
    soup=BeautifulSoup(r.text,"html.parser")
    title=soup.title.get_text(" ",strip=True) if soup.title else ""
    # Character name: page title / og:title, preserving card title.
    cname=""
    mt=re.search(r"〖パラノイズ〗(.+?)(?:の評価とスキル|の評価)",title)
    if mt:cname=mt.group(1).strip()
    if not cname:
        og=soup.select_one('meta[property="og:title"]')
        if og:cname=re.sub(r"^〖パラノイズ〗","",og.get("content","")).strip()
    skills=[]
    heads=soup.select("h3,h4,h5")
    for i,h in enumerate(heads):
        hn=h.get_text(" ",strip=True)
        if not hn or hn in ("パッシブスキル","アクティブスキル","基本ステータス"): continue
        if i+1<len(heads):
            nxt=[]
            node=h.find_next_sibling()
            while node and node!=heads[i+1]:
                t=node.get_text(" ",strip=True)
                if t:nxt.append(t)
                node=node.find_next_sibling()
            body=" ".join(nxt)
        else: body=""
        # Gamerch frequently uses heading + following paragraph; fallback to parent text.
        if not body:
            parent=h.parent.get_text(" ",strip=True) if h.parent else ""
            body=re.sub(r"\s+"," ",parent)
        if body and len(body)<1000:
            skills.append(parse_skill(hn,body,len(skills)))
    rarity="SSR" if "SSR" in soup.get_text(" ",strip=True)[:5000] else ("SR" if "SR" in soup.get_text(" ",strip=True)[:5000] else "")
    return {"name":cname,"rarity":rarity,"url":url,"skills":skills}

def main():
    cfg=json.loads(CFG.read_text())
    src=next((x for x in cfg["sources"] if x["id"]=="gamerch-performance"),None)
    if not src:
        src={"endpoint":"https://gamerch.com/paranoize/","enabled":True}
    root=src.get("endpoint") or "https://gamerch.com/paranoize/"
    r=requests.get(root,timeout=25,headers={"User-Agent":UA});r.raise_for_status()
    soup=BeautifulSoup(r.text,"html.parser")
    links=[]
    for a in soup.select("a[href]"):
        href=urljoin(root,a.get("href"))
        txt=" ".join(a.get_text(" ",strip=True).split())
        if "paranoize/" in href and ("の評価とスキル" in txt or "スキル" in txt):
            links.append((href,txt))
    # Also configured explicit article URLs.
    links=list(dict.fromkeys(x[0] for x in links))
    records=[];errors=[]
    for u in links[:300]:
        try:
            x=extract_page(u)
            if x["name"] and x["skills"]: records.append(x)
        except Exception as e: errors.append({"url":u,"error":str(e)})
    # merge by normalized card name, preserving source page and raw parsed spec
    merged={}
    for x in records:
        k=norm(x["name"])
        if k not in merged or len(x.get("skills",[]))>len(merged[k].get("skills",[])): merged[k]=x
    OUT.parent.mkdir(parents=True,exist_ok=True)
    existing={}
    if OUT.exists():
        try: existing=json.loads(OUT.read_text())
        except Exception: existing={}
    if not merged and existing.get("records"):
        errors.append({"source":"guard","error":"No skill records parsed; previous non-empty snapshot preserved."})
        merged={norm(x.get("name")):x for x in existing.get("records",[]) if x.get("name")}
    OUT.write_text(json.dumps({"version":2,"generated_at":now(),"count":len(merged),"records":list(merged.values()),"errors":errors},ensure_ascii=False,indent=2))
    print(json.dumps({"count":len(merged),"errors":len(errors)},ensure_ascii=False))

if __name__=="__main__": main()
