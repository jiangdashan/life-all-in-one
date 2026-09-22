#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v83 诊断：量 meta 表真实构成——回答"备份慢是因为单份快照大还是历史备份行太多"。
只读，不写任何数据。输出摘要到 _tools/_meta_probe_out.txt。"""
import json, subprocess, sys, io
from pathlib import Path

DB = Path(r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library\database")
META = "FKpqucBa96f2slzvcU3jdV"

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
    pages = 0
    while True:
        pages += 1
        body = {"database_id": database_id, "page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        r = call("query_database_record.py", body, token)
        if "error" in r:
            print("query err:", r["error"])
            break
        recs.extend(r.get("results") or [])
        if not r.get("has_more"):
            break
        cursor = r.get("next_cursor") or r.get("start_cursor")
    return recs, pages

def main():
    token = sys.stdin.readline().strip()
    recs, pages = fetch_all(META, token)
    lines = []
    lines.append("total_rows=%d pages=%d" % (len(recs), pages))
    groups = {}
    total_bytes = 0
    for rec in recs:
        props = rec.get("properties") or rec
        def gv(k):
            v = props.get(k)
            if isinstance(v, dict):
                v = v.get("text", v.get("number", ""))
            return v if isinstance(v, str) else ("" if v is None else str(v))
        key = gv("键")
        val = gv("值")
        total_bytes += len(val)
        if key.startswith("backup:"):
            if "#" in key:
                g = "backup_chunk"
            else:
                g = "backup_manifest"
        elif key in ("lastClearedAt", "periodClearedAt"):
            g = "clear_marker"
        elif key.startswith("auth"):
            g = "auth"
        else:
            g = "settings_other"
        d = groups.setdefault(g, {"n": 0, "bytes": 0, "max": 0, "keys": []})
        d["n"] += 1
        d["bytes"] += len(val)
        d["max"] = max(d["max"], len(val))
        if g in ("backup_manifest", "settings_other"):
            d["keys"].append((key, len(val)))
    for g, d in sorted(groups.items(), key=lambda kv: -kv[1]["bytes"]):
        lines.append("%s: rows=%d total=%d bytes max_row=%d" % (g, d["n"], d["bytes"], d["max"]))
        if g == "backup_manifest":
            for k, n in sorted(d["keys"], reverse=True)[:8]:
                lines.append("    %s = %d chars" % (k, n))
        if g == "settings_other":
            big = sorted(d["keys"], key=lambda kv: -kv[1])[:10]
            for k, n in big:
                lines.append("    %s = %d chars" % (k, n))
    lines.append("grand_total_value_bytes=%d" % total_bytes)
    out = "\n".join(lines)
    print(out)
    io.open(Path(__file__).parent / "_meta_probe_out.txt", "w", encoding="utf-8").write(out)

if __name__ == "__main__":
    main()
