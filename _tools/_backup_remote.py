#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_backup_remote.py —— 全量备份「生活全能工作台」10 张云端数据表。

对每张表：
  1) getSchema 拉取字段定义（含 select 选项 id）
  2) query 拉全量记录（pageSize=200 + nextCursor 续翻，guard>100 熔断）
  3) 保存到 <out>/remote/<key>.json：{databaseId,table,key,schema,records,fetchedAt}
  4) 汇总到 <out>/manifest.json：时间戳 + 每张表的 databaseId/schema 摘要/记录数
  5) 输出 _backup_summary.txt（人类可读总览）

与 SDK 契约 §6 一致：query 单次只回一页，startCursor=nextCursor 续翻，
游标必须前进且本页非空；guard 防呆防死循环。

用法：
  printf '%s' "$TOKEN" | python _backup_remote.py --out <dir> [--token-stdin]
  python _backup_remote.py --out <dir> --token-file <token_path>
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# --------------------------------------------------------------------------
# 10 张数据表（与 life-all-in-one.html 中 var DB_* 完全一致）
# --------------------------------------------------------------------------
TABLES = [
    {"key": "money",    "name": "记账",     "id": "O4PsdbQpHnSDT0LSKcqgoI"},
    {"key": "habit",    "name": "习惯打卡", "id": "wuNwUprBrd6rfdcdHvCP9b"},
    {"key": "plan",     "name": "日程",     "id": "ZnLrbr3jawU5LRlL3XGSRV"},
    {"key": "fitness",  "name": "健身",     "id": "Ey5dN80w9Gexo7TxLvpfVu"},
    {"key": "shopping", "name": "待买",     "id": "4mWbsWDNv6k5fW4lI75FYj"},
    {"key": "media",    "name": "书影音",   "id": "P93GbycwxqQ0HWmvsDTWTQ"},
    {"key": "diet",     "name": "饮食",     "id": "ZshQ2v3NpB58bxG59hlTEB"},
    {"key": "storage",  "name": "物品存储", "id": "9YCVWtvdwouCJvxjkfd4z0"},
    {"key": "mood",     "name": "心情",     "id": "BHhTft6ZybuV7Lc0cF2nIC"},
    {"key": "period",   "name": "经期记录", "id": "rp51GH61XV6eq9fl4smboC"},
    {"key": "meta",     "name": "同步标记", "id": "FKpqucBa96f2slzvcU3jdV"},
]

_SCRIPT_DIR = Path("D:/workbuddy/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/library/database")


def call_script(script: str, database_id: str, body: dict, token: str | None) -> dict:
    """调用 SDK 脚本，返回解析后的 JSON dict。"""
    cmd = ["python", str(_SCRIPT_DIR / script), "--database-id", database_id, "--stdin"]
    if token:
        cmd.append("--token-stdin")
    payload = json.dumps({"database_id": database_id, **body}, ensure_ascii=False)
    stdin_data = (token + "\n" + payload).encode("utf-8") if token else payload.encode("utf-8")
    proc = subprocess.run(cmd, input=stdin_data, capture_output=True, timeout=60)
    out = proc.stdout.decode("utf-8", errors="replace").strip()
    try:
        result = json.loads(out)
    except json.JSONDecodeError:
        return {"error": f"脚本返回非 JSON: {out[:200]}"}
    if not isinstance(result, dict):
        return {"error": "返回非 dict"}
    return result


def fetch_schema(database_id: str, token: str | None) -> dict:
    return call_script("get_database_schema.py", database_id, {}, token)


def fetch_all_records(database_id: str, token: str | None, page_size: int = 200, guard_max: int = 100) -> list:
    """分页拉全量。返回 [{_id, ...fields}, ...] 列表。"""
    all_records: list = []
    cursor = None
    guard = 0
    while True:
        body: dict = {"page_size": page_size}
        if cursor:
            body["start_cursor"] = cursor
        result = call_script("query_database_record.py", database_id, body, token)
        if "error" in result:
            print(f"  [warn] query 失败: {result['error']}", file=sys.stderr)
            break
        batch = result.get("results") or []
        all_records.extend(batch)
        has_more = bool(result.get("has_more"))
        next_cursor = result.get("next_cursor") or ""
        guard += 1
        if not has_more:
            break
        if not next_cursor or next_cursor == cursor or not batch:
            print(f"  [warn] 翻页异常终止 (cursor={cursor!r} next={next_cursor!r} batch={len(batch)})", file=sys.stderr)
            break
        if guard > guard_max:
            print(f"  [warn] 翻页超过熔断上限 {guard_max}，强制终止", file=sys.stderr)
            break
        cursor = next_cursor
    return all_records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, help="备份输出根目录")
    parser.add_argument("--token-file", default=None, help="token 文件路径（首行纯文本）")
    parser.add_argument("--token-stdin", action="store_true", help="从 stdin 读取 token（沙箱/管道模式）")
    parser.add_argument("--only", default=None, help="只备份指定 key（逗号分隔），默认全量 10 张")
    args = parser.parse_args()

    token: str | None = None
    if args.token_file and Path(args.token_file).is_file():
        token = Path(args.token_file).read_text(encoding="utf-8").strip()
    elif args.token_stdin:
        token = sys.stdin.readline().strip()
    if not token:
        print("[fatal] 未提供 token。请用 --token-file 或 --token-stdin。", file=sys.stderr)
        sys.exit(2)

    out_root = Path(args.out).resolve()
    remote_dir = out_root / "remote"
    remote_dir.mkdir(parents=True, exist_ok=True)

    only_keys = set(k.strip() for k in (args.only.split(",") if args.only else []))
    targets = [t for t in TABLES if not only_keys or t["key"] in only_keys]

    timestamp = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %z")
    manifest: dict = {
        "project": "生活全能工作台",
        "node_id": "muRdSFuIXga85vsZfTsTJ4",
        "backup_at": timestamp,
        "tables": [],
        "totals": {"records": 0, "tables_with_data": 0},
    }
    summary_lines: list = [f"生活全能工作台 · 云端数据全量备份 · {timestamp}", "=" * 60]

    for t in targets:
        print(f"[{t['key']}] ({t['name']}) {t['id']} → 拉取中…", flush=True)
        schema = fetch_schema(t["id"], token)
        if "error" in schema:
            print(f"  [fatal] schema 失败: {schema['error']}", file=sys.stderr)
            sys.exit(3)
        records = fetch_all_records(t["id"], token)
        schema_summary = [
            {"name": p.get("name"), "type": p.get("type")}
            for p in (schema.get("properties") or [])
        ]
        manifest["tables"].append({
            "key": t["key"],
            "name": t["name"],
            "database_id": t["id"],
            "record_count": len(records),
            "fields": schema_summary,
        })
        manifest["totals"]["records"] += len(records)
        if records:
            manifest["totals"]["tables_with_data"] += 1
        snapshot = {
            "key": t["key"],
            "name": t["name"],
            "databaseId": t["id"],
            "schema": schema,
            "records": records,
            "fetched_at": timestamp,
        }
        out_path = remote_dir / f"{t['key']}.json"
        out_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
        size_kb = out_path.stat().st_size / 1024
        summary_lines.append(f"  {t['key']:<10} {t['name']:<6} {len(records):>5} 条 · {size_kb:>7.1f} KB · {out_path}")
        print(f"  ✓ {len(records)} 条记录，{size_kb:.1f} KB", flush=True)

    (out_root / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (out_root / "_backup_summary.txt").write_text("\n".join(summary_lines), encoding="utf-8")

    print("\n" + "=" * 60)
    print(f"备份完成 · {timestamp}")
    print(f"输出目录: {out_root}")
    print(f"合计: {manifest['totals']['records']} 条记录 / {manifest['totals']['tables_with_data']} 张表有数据")
    print("=" * 60)


if __name__ == "__main__":
    main()
