#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""诊断：统计各表记录的 userId 分布 + 最近创建时间，定位移动端/Web端数据不同步原因。
用法： printf '<token>' | python _diag_userid_sync.py --token-stdin
"""
import sys, json, subprocess
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from _inspect_tables import TABLES, fetch_all

def main():
    token = sys.stdin.read().strip()
    for name, dbid in TABLES.items():
        recs = fetch_all(dbid, token)
        if not recs:
            print(f"[{name}] 0 条")
            continue
        dist = {}
        for r in recs:
            uid = r.get("userId") or ""
            key = (uid or "(无userId)")[:12] + ("..." if uid and len(uid) > 12 else "")
            d = dist.setdefault(key, {"n": 0, "latest": ""})
            d["n"] += 1
            ct = r.get("created_time", "")
            if ct > d["latest"]:
                d["latest"] = ct
        parts = ", ".join(f"{k}×{v['n']}(最新{v['latest'][:16]})" for k, v in sorted(dist.items(), key=lambda x: -x[1]["n"]))
        print(f"[{name}] 共{len(recs)}条: {parts}")

if __name__ == "__main__":
    main()
