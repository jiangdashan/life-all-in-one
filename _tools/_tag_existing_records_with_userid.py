#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_tools/_tag_existing_records_with_userid.py
───────────────────────────────────────────
v32 用户认证层部署后，旧云端记录全部缺 userId 字段 → dbFetchAll 视为他人数据不可见。
本脚本：对当前云端 11 张表的所有现有记录，注入 userId = SHA256(AUTH_UID_SALT + 用户密码)
使其在用户登录后重新可见。

约束：
- 不删任何记录（不动 record_id），只 update properties
- 每次 batch_update ≤100 条
- password 仅用于一次 SHA256 派生，不写盘 / 不打印 / 不上传
- 派生算法必须与前端 authHash 严格一致（djb2 fallback + SHA-256）

用法：
  printf '%s\n%s' "<token>" "<password>" | python _tag_existing_records_with_userid.py --token-stdin --stdin
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

# 必须与 life-all-in-one.html 中的 AUTH_UID_SALT 完全一致
AUTH_UID_SALT = "richangji-v32-uid-2026-09"

# 11 张表
TABLES = [
    ("money",    "记账",     "O4PsdbQpHnSDT0LSKcqgoI"),
    ("habit",    "习惯打卡", "wuNwUprBrd6rfdcdHvCP9b"),
    ("plan",     "日程",     "ZnLrbr3jawU5LRlL3XGSRV"),
    ("fitness",  "健身",     "Ey5dN80w9Gexo7TxLvpfVu"),
    ("shopping", "待买",     "4mWbsWDNv6k5fW4lI75FYj"),
    ("media",    "书影音",   "P93GbycwxqQ0HWmvsDTWTQ"),
    ("diet",     "饮食",     "ZshQ2v3NpB58bxG59hlTEB"),
    ("storage",  "物品存储", "9YCVWtvdwouCJvxjkfd4z0"),
    ("mood",     "心情",     "BHhTft6ZybuV7Lc0cF2nIC"),
    ("period",   "经期记录", "rp51GH61XV6eq9fl4smboC"),
    ("meta",     "同步标记", "FKpqucBa96f2slzvcU3jdV"),
]

DB_SCRIPT_DIR = Path(
    r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library\database"
)


def derive_user_id(password: str) -> str:
    """与前端 authUserId() 严格一致：SHA-256(AUTH_UID_SALT + ':' + password)。

    ⚠️ 关键：必须用 ':' 分隔盐和密码。JS 里是 `AUTH_UID_SALT+':'+pw`。
       早期版本漏了冒号，导致 254 条记录 userId 全部错误，浏览器看不到。
    """
    h = hashlib.sha256((AUTH_UID_SALT + ":" + password).encode("utf-8")).hexdigest()
    return h


def call_subprocess(script_name: str, body: dict, token: str) -> dict:
    """调 SDK 子脚本并返回 dict 结果。"""
    cmd = ["python", str(DB_SCRIPT_DIR / script_name), "--stdin", "--token-stdin"]
    payload = (token + "\n" + json.dumps(body, ensure_ascii=False)).encode("utf-8")
    proc = subprocess.run(cmd, input=payload, capture_output=True, timeout=60)
    out = proc.stdout.decode("utf-8", errors="replace").strip()
    try:
        r = json.loads(out)
        return r if isinstance(r, dict) else {"error": f"返回非 dict: {out[:200]}"}
    except json.JSONDecodeError:
        return {"error": f"返回非 JSON: {out[:200]}"}


def fetch_all_records(database_id: str, token: str) -> list:
    """分页拉当前表所有 record_id。"""
    ids: list = []
    cursor = None
    while True:
        body = {"database_id": database_id, "page_size": 200}
        if cursor:
            body["start_cursor"] = cursor
        r = call_subprocess("query_database_record.py", body, token)
        if "error" in r:
            print(f"  [warn] query 失败: {r['error']}", file=sys.stderr)
            break
        for rec in (r.get("results") or []):
            rid = rec.get("record_id")
            if isinstance(rid, str) and rid:
                ids.append(rid)
        if not r.get("has_more"):
            break
        cursor = r.get("next_cursor") or ""
        if not cursor:
            break
    return ids


def batch_update(database_id: str, record_ids: list, user_id: str, token: str) -> tuple[int, list]:
    """分批 batch_update，每批注入 userId。返回 (成功数, 失败 ID 列表)。
    注意：服务端返回 {results:[{index, success, error?}]}，必须逐条检查 success 字段。
    """
    success = 0
    failures: list = []
    for i in range(0, len(record_ids), 100):
        chunk = record_ids[i : i + 100]
        records = [
            {"record_id": rid, "properties": {"userId": {"text": user_id}}}
            for rid in chunk
        ]
        body = {"database_id": database_id, "records": records}
        r = call_subprocess("batch_update_database_records.py", body, token)
        if "error" in r:
            # 顶层 error（如参数错误）
            print(f"  [warn] update batch {i}-{i+len(chunk)} 顶层失败: {r['error']}", file=sys.stderr)
            failures.extend(chunk)
            continue
        # 检查 results 数组里每条是否 success=true
        results = r.get("results") or []
        for item in results:
            if not item.get("success"):
                idx = item.get("index", 0)
                rid = chunk[idx] if 0 <= idx < len(chunk) else f"<idx={idx}>"
                err = item.get("error", "unknown")
                print(f"  [warn] record {rid} 失败: {err}", file=sys.stderr)
                failures.append(rid)
            else:
                success += 1
        # 兜底：如果 results 数组长度为 0 但也没顶层 error，假设全成功（旧 SDK 行为）
        if not results and "error" not in r:
            success += len(chunk)
    return success, failures


def tag_table(key: str, name: str, database_id: str, user_id: str, token: str) -> dict:
    """单表注入 userId。"""
    print(f"[{key}] {name} ({database_id})")
    ids = fetch_all_records(database_id, token)
    print(f"  当前云端: {len(ids)} 条", end="")
    if not ids:
        print("（空表，跳过）")
        return {"key": key, "existed": 0, "tagged": 0}
    updated, fail = batch_update(database_id, ids, user_id, token)
    print(f" → 已打 userId {updated} 条" + (f" (失败 {len(fail)})" if fail else ""))
    return {
        "key": key,
        "existed": len(ids),
        "tagged": updated,
        "failures": len(fail),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="给云端 11 张表的所有现有记录注入 userId 字段")
    _group = parser.add_mutually_exclusive_group(required=True)
    _group.add_argument("--token-stdin", action="store_true", help="从 stdin 第一行读 token")
    parser.add_argument("--password", help="用户访问密码（仅用于派生 userId，不落盘）")
    parser.add_argument("--stdin", action="store_true", help="从 stdin 读完整 JSON")
    args = parser.parse_args()

    token: str | None = None
    password: str | None = None
    if args.stdin:
        # 第一行 token, 第二行 password
        lines = sys.stdin.read().splitlines()
        if len(lines) < 2:
            print("[fatal] stdin 模式需要两行：token + password", file=sys.stderr)
            sys.exit(2)
        token = lines[0].strip()
        password = lines[1].strip()
    else:
        if args.token_stdin:
            token = sys.stdin.readline().strip()
        if not token:
            print("[fatal] 未提供 token", file=sys.stderr)
            sys.exit(2)
        if not args.password:
            print("[fatal] 必须提供 --password", file=sys.stderr)
            sys.exit(2)
        password = args.password

    if not password:
        print("[fatal] 密码为空", file=sys.stderr)
        sys.exit(2)

    # 派生 userId（不打印密码）
    user_id = derive_user_id(password)
    print(f"[ok] 派生 userId 完成（前 16 位: {user_id[:16]}...）")
    print(f"     密码已用于 SHA256 派生，不会落盘 / 不会再次使用")
    print()

    print("开始扫描 11 张表并注入 userId…")
    print("=" * 64)
    results = []
    for key, name, dbid in TABLES:
        try:
            r = tag_table(key, name, dbid, user_id, token)
            results.append(r)
        except Exception as e:
            print(f"  [error] {key}: {e}", file=sys.stderr)
            results.append({"key": key, "error": str(e)})
        print()

    print("=" * 64)
    print("注入完成摘要")
    print("=" * 64)
    total_exist = total_tagged = total_fail = 0
    for r in results:
        if r.get("error"):
            print(f"  {r['key']:<10} 失败: {r['error']}")
        else:
            print(f"  {r['key']:<10} 存在 {r['existed']:>4} · 注入 {r['tagged']:>4}" +
                  (f" · 失败 {r['failures']}" if r.get("failures") else ""))
            total_exist += r["existed"]
            total_tagged += r["tagged"]
            total_fail += r.get("failures", 0)
    print("-" * 64)
    print(f"  {'合计':<10} 存在 {total_exist:>4} · 注入 {total_tagged:>4} · 失败 {total_fail}")
    print()
    print("下一步：")
    print("  1) 打开 https://workbuddy.link/p/IAP7cP1ljx7juu0hAdPdVy → 输入你的密码")
    print("  2) init() 跑完后 234+ 条历史数据应自动可见")


if __name__ == "__main__":
    main()