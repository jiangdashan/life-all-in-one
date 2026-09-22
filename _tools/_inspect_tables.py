#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""临时诊断工具：拉取指定表全量记录，打印每条 record_id + 全部属性（含原始值），用于定位日期丢失/臆造。
用法： printf '<token>\n' | python _inspect_tables.py --token-stdin --tables period,shopping,storage,media,diet
"""
from __future__ import annotations
import argparse, json, subprocess, sys
from pathlib import Path

DB = Path(r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library\database")
TABLES = {
    "money":    "O4PsdbQpHnSDT0LSKcqgoI",
    "habit":    "wuNwUprBrd6rfdcdHvCP9b",
    "plan":     "ZnLrbr3jawU5LRlL3XGSRV",
    "fitness":  "Ey5dN80w9Gexo7TxLvpfVu",
    "shopping": "4mWbsWDNv6k5fW4lI75FYj",
    "media":    "P93GbycwxqQ0HWmvsDTWTQ",
    "diet":     "ZshQ2v3NpB58bxG59hlTEB",
    "storage":  "9YCVWtvdwouCJvxjkfd4z0",
    "mood":     "BHhTft6ZybuV7Lc0cF2nIC",
    "period":   "rp51GH61XV6eq9fl4smboC",
    "meta":     "FKpqucBa96f2slzvcU3jdV",
}

def call(script, body, token):
    cmd = ["python", str(DB / script), "--stdin", "--token-stdin"]
    payload = (token + "\n" + json.dumps(body, ensure_ascii=False)).encode("utf-8")
    p = subprocess.run(cmd, input=payload, capture_output=True, timeout=60)
    out = p.stdout.decode("utf-8", errors="replace").strip()
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {"error": out[:300]}

def fetch_all(database_id, token):
    recs, cursor = [], None
    while True:
        body = {"database_id": database_id, "page_size": 100}
        if cursor: body["start_cursor"] = cursor
        r = call("query_database_record.py", body, token)
        if "error" in r:
            print("  query err:", r["error"]); break
        for rec in (r.get("results") or []):
            recs.append(rec)
        if not r.get("has_more"): break
        cursor = r.get("next_cursor") or r.get("start_cursor")
    return recs

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--token-stdin", action="store_true")
    ap.add_argument("--tables", default="period,shopping,storage,media,diet")
    a = ap.parse_args()
    token = sys.stdin.readline().strip()
    for key in [x.strip() for x in a.tables.split(",") if x.strip()]:
        did = TABLES.get(key)
        if not did: print(f"[skip] {key}"); continue
        recs = fetch_all(did, token)
        print(f"\n########## {key} ({len(recs)} 条) ##########")
        for i, rec in enumerate(recs):
            rid = rec.get("record_id") or rec.get("_id") or rec.get("id")
            props = rec.get("properties") or {k: v for k, v in rec.items() if k not in ("record_id","_id","id","has_more","_created_at","created_at","createdTime")}
            # 打印原始行便于观察日期存储形态
            print(f"[{i}] rid={rid}")
            # 尝试打印所有键值，把日期/时间类单独标出
            for k, v in rec.items():
                if k in ("record_id","properties"): continue
                print(f"    raw.{k} = {v!r}")
            if isinstance(rec.get("properties"), dict):
                for k, v in rec["properties"].items():
                    print(f"    prop.{k} = {json.dumps(v, ensure_ascii=False)}")
        print()

if __name__ == "__main__":
    main()
