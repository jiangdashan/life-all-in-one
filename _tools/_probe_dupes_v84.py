#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v84 诊断：全 14 表扫重复行——回答"web 447 / 移动 444 条数差"是否为补传重复上传。
只读，不写任何数据。指纹 = 除 _id 外全部非空列值排序拼接。"""
import json, subprocess, sys, io
from pathlib import Path

DB = Path(r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library\database")
TABLES = {
    "money":   "O4PsdbQpHnSDT0LSKcqgoI",
    "habit":   "wuNwUprBrd6rfdcdHvCP9b",
    "plan":    "ZnLrbr3jawU5LRlL3XGSRV",
    "fitness": "Ey5dN80w9Gexo7TxLvpfVu",
    "shopping":"4mWbsWDNv6k5fW4lI75FYj",
    "media":   "P93GbycwxqQ0HWmvsDTWTQ",
    "diet":    "ZshQ2v3NpB58bxG59hlTEB",
    "storage": "9YCVWtvdwouCJvxjkfd4z0",
    "mood":    "BHhTft6ZybuV7Lc0cF2nIC",
    "period":  "rp51GH61XV6eq9fl4smboC",
    "sleep":   "4rjX5sVnSNNfS2mk16nR2W",
    "study":   "wtsziKZtrYywDnYMuRNcyP",
    "payback": "935dPbYYu1hSUxwV7asgxy",
    "meta":    "FKpqucBa96f2slzvcU3jdV",
}

def call(script, body, token):
    cmd = [sys.executable, str(DB / script), "--stdin", "--token-stdin"]
    payload = (token + "\n" + json.dumps(body, ensure_ascii=False)).encode("utf-8")
    p = subprocess.run(cmd, input=payload, capture_output=True, timeout=90)
    out = p.stdout.decode("utf-8", errors="replace").strip()
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {"error": out[:400]}

def fetch_all(database_id, token):
    recs, cursor = [], None
    while True:
        body = {"database_id": database_id, "page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        r = call("query_database_record.py", body, token)
        if "error" in r:
            return None
        recs.extend(r.get("results") or [])
        if not r.get("has_more"):
            break
        cursor = r.get("next_cursor") or r.get("start_cursor")
    return recs

def fingerprint(rec):
    props = rec.get("properties") or rec
    parts = []
    for k in sorted(props.keys()):
        if k in ("_id", "userId", "createdAt", "updatedAt"):
            continue
        v = props.get(k)
        if isinstance(v, dict):
            v = v.get("text", v.get("number", v.get("date", "")))
        if v is None or v == "":
            continue
        parts.append(k + "=" + str(v))
    return "|".join(parts)

def main():
    token = sys.stdin.readline().strip()
    lines = []
    grand_rows = 0
    grand_dupes = 0
    for name, tid in TABLES.items():
        recs = fetch_all(tid, token)
        if recs is None:
            lines.append("%s: QUERY ERROR" % name)
            continue
        grand_rows += len(recs)
        groups = {}
        for rec in recs:
            fp = fingerprint(rec)
            groups.setdefault(fp, []).append(rec.get("_id") or rec.get("id") or "?")
        dup_groups = {fp: ids for fp, ids in groups.items() if len(ids) > 1}
        extra = sum(len(ids) - 1 for ids in dup_groups.values())
        grand_dupes += extra
        lines.append("%s: rows=%d unique=%d dup_groups=%d extra_rows=%d" % (
            name, len(recs), len(groups), len(dup_groups), extra))
        for fp, ids in sorted(dup_groups.items(), key=lambda kv: -len(kv[1]))[:6]:
            lines.append("    x%d: %s" % (len(ids), fp[:160]))
            lines.append("      ids: %s" % ",".join(ids[:8]))
    lines.append("GRAND: rows=%d extra_duplicate_rows=%d" % (grand_rows, grand_dupes))
    out = "\n".join(lines)
    print(out)
    io.open(Path(__file__).parent / "_dupes_out.txt", "w", encoding="utf-8").write(out)

if __name__ == "__main__":
    main()
