#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""诊断：dump meta 表全部键 + 解析其中的 dietPlans，确认云端 done 标记是否被抹掉。"""
import sys, json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _inspect_tables import fetch_all, TABLES


def main():
    token = sys.stdin.readline().strip()
    recs = fetch_all(TABLES["meta"], token)
    print("meta 记录数:", len(recs))
    for r in recs:
        keys = [k for k in r.keys() if k not in ("_id", "record_id")]
        print("\n--- record ---")
        print("  所有列名:", keys)
        for k in keys:
            v = r.get(k)
            sv = str(v)
            print("   %s = %s" % (k, sv[:200] + ("…" if len(sv) > 200 else "")))
            if isinstance(v, str) and "dietPlans" in v:
                try:
                    o = json.loads(v)
                except Exception as e:
                    print("      (JSON 解析失败: %s)" % e)
                    continue
                dp = o.get("dietPlans")
                print("      >> updatedAt=%s, dietPlans=%s" % (o.get("updatedAt"), json.dumps(dp, ensure_ascii=False)))


if __name__ == "__main__":
    main()
