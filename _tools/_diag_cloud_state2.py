#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""诊断2：各表日期分布（找最新记录日期）+ meta 表全量 dump，定位页面看不到数据的原因。"""
import sys, json, subprocess
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _inspect_tables import TABLES, fetch_all

def main():
    token = sys.stdin.read().strip()
    print("==== 各表记录日期分布 ====")
    for name, dbid in TABLES.items():
        recs = fetch_all(dbid, token)
        if not recs:
            print(f"[{name}] 0 条"); continue
        dates = {}
        nokey = 0
        for r in recs:
            d = r.get("日期") or r.get("date") or r.get("日期键") or ""
            if not d:
                nokey += 1
                continue
            dates[str(d)[:10]] = dates.get(str(d)[:10], 0) + 1
        top = sorted(dates.items(), reverse=True)[:6]
        print(f"[{name}] {len(recs)}条 | 无日期键:{nokey} | 最新日期: {top}")
    print("\n==== meta 表全量 ====")
    for r in fetch_all(TABLES["meta"], token):
        out = {}
        for k, v in r.items():
            if k == "_id": continue
            s = str(v)
            out[k] = s[:60] + ("…" if len(s) > 60 else "")
        print(json.dumps(out, ensure_ascii=False))

if __name__ == "__main__":
    main()
