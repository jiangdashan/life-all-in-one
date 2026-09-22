#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""清空云端经期表(period)全部记录 —— 用户已确认(2026-09-07)因日期全部丢失、预测臆造，需重录。
用法: printf '<token>\n' | python _clear_cloud_period.py --token-stdin
"""
import json, subprocess, sys
from pathlib import Path

DB = Path(r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library\database")
PERIOD = "rp51GH61XV6eq9fl4smboC"

def call(script, body, token):
    cmd = ["python", str(DB / script), "--stdin", "--token-stdin"]
    payload = (token + "\n" + json.dumps(body, ensure_ascii=False)).encode("utf-8")
    p = subprocess.run(cmd, input=payload, capture_output=True, timeout=60)
    out = p.stdout.decode("utf-8", errors="replace").strip()
    try:
        return json.loads(out)
    except json.JSONDecodeError:
        return {"error": out[:300]}

def fetch_ids(token):
    ids, cursor = [], None
    while True:
        body = {"database_id": PERIOD, "page_size": 100}
        if cursor: body["start_cursor"] = cursor
        r = call("query_database_record.py", body, token)
        if "error" in r:
            print("query err:", r["error"]); break
        for rec in (r.get("results") or []):
            rid = rec.get("record_id")
            if rid: ids.append(rid)
        if not r.get("has_more"): break
        cursor = r.get("next_cursor") or r.get("start_cursor")
    return ids

def main():
    token = sys.stdin.readline().strip()
    ids = fetch_ids(token)
    print(f"period 云端共 {len(ids)} 条")
    if not ids:
        print("无需删除"); return
    ok=0; fail=0
    for i in range(0, len(ids), 100):
        chunk = ids[i:i+100]
        r = call("batch_delete_database_records.py", {"database_id": PERIOD, "record_ids": chunk}, token)
        if "error" in r:
            print(f"batch {i} 顶层失败:", r["error"]); fail += len(chunk); continue
        res = r.get("results") or []
        for item in res:
            if item.get("success"): ok+=1
            else:
                fail+=1
                print("del fail:", item.get("error"))
        if not res and "error" not in r:
            ok += len(chunk)
    print(f"删除成功 {ok} 条, 失败 {fail} 条")
    # 验证
    left = fetch_ids(token)
    print(f"验证剩余 {len(left)} 条")

if __name__ == "__main__":
    main()
