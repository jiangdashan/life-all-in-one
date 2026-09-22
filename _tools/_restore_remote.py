#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_restore_remote.py —— 从备份目录还原云端 10 张数据表。

策略：每张表先「全量删」后「批量加」——保证还原后云端记录集合与备份快照严格一致。
  1) 读取 <backup>/remote/<key>.json 拿到 schema + records（扁平 {field:value}）
  2) 根据 schema 把扁平记录转成 {field:{type_key:value}}（适配 SDK validate_properties）
  3) 分页拉当前云端 _id → batch-delete（每次 ≤100）
  4) batch-add 备份记录（每次 ≤100）
  5) 输出对照报告：删了多少 / 加了多少 / 失败列表

注意：还原后 _id 会变（云端重新生成）。同步层依赖 remoteId 匹配本地缓存，
     所以还原后必须让用户重新打开页面，让 init() 把云端数据重新拉下来刷新本地。
     本地"未同步"的记录（无 remoteId）不会被覆盖——遵守铁律 1。

用法：
  printf '%s' "$TOKEN" | python _restore_remote.py --backup <dir> [--token-stdin] [--only money,media] [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

_SCRIPT_DIR = Path("D:/workbuddy/resources/app.asar.unpacked/resources/plugins/workbuddy-builtin/skills/library/database")

# 与 _backup_remote.py / life-all-in-one.html 中的 var DB_* 完全一致
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


def call_script(script: str, database_id: str, body: dict, token: str | None) -> dict:
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
    return result if isinstance(result, dict) else {"error": "返回非 dict"}


def fetch_all_ids(database_id: str, token: str | None, page_size: int = 200) -> list:
    """拉当前表所有 record_id。"""
    ids: list = []
    cursor = None
    while True:
        body: dict = {"page_size": page_size}
        if cursor:
            body["start_cursor"] = cursor
        r = call_script("query_database_record.py", database_id, body, token)
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


def batch_delete(database_id: str, ids: list, token: str | None) -> tuple[int, list]:
    """分批 batch-delete（≤100/批）。返回 (成功数, 失败ID列表)。"""
    success = 0
    failures: list = []
    for i in range(0, len(ids), 100):
        chunk = ids[i:i+100]
        r = call_script("batch_delete_database_records.py", database_id, {"record_ids": chunk}, token)
        if "error" in r:
            print(f"  [warn] delete batch {i}-{i+len(chunk)} 失败: {r['error']}", file=sys.stderr)
            failures.extend(chunk)
        else:
            success += len(chunk)
    return success, failures


def flat_to_typed(record: dict, schema: dict) -> dict:
    """扁平 {field:value} → {field:{type_key:value}}，依据 schema.properties[name].type。"""
    field_types: dict = {p["name"]: p["type"] for p in (schema.get("properties") or []) if p.get("name")}
    typed: dict = {}
    for field_name, value in record.items():
        if field_name in ("record_id", "_id"):
            continue  # 跳过 SDK 主键
        if value is None or value == "":
            continue  # 跳过空值
        ftype = field_types.get(field_name, "text")
        typed[field_name] = {ftype: value}
    return typed


def batch_add(database_id: str, typed_records: list, token: str | None) -> tuple[int, list]:
    """分批 batch-add（≤100/批）。"""
    success = 0
    failures: list = []
    for i in range(0, len(typed_records), 100):
        chunk = typed_records[i:i+100]
        r = call_script("batch_add_database_records.py", database_id, {"records": chunk}, token)
        if "error" in r:
            print(f"  [warn] add batch {i}-{i+len(chunk)} 失败: {r['error']}", file=sys.stderr)
            failures.extend(chunk)
        else:
            success += len(chunk)
    return success, failures


def restore_table(table: dict, backup_path: Path, token: str | None, dry_run: bool) -> dict:
    """还原单张表。返回该表的操作摘要。"""
    if not backup_path.is_file():
        return {"key": table["key"], "error": f"备份文件不存在: {backup_path}"}

    snapshot = json.loads(backup_path.read_text(encoding="utf-8"))
    schema = snapshot.get("schema") or {}
    flat_records = snapshot.get("records") or []
    typed_records = [flat_to_typed(r, schema) for r in flat_records]
    typed_records = [r for r in typed_records if r]  # 去掉全空记录

    print(f"[{table['key']}] {table['name']} ({table['id']})")
    print(f"  备份中: {len(flat_records)} 条 → 待加 {len(typed_records)} 条有效记录")

    if dry_run:
        print("  [dry-run] 跳过实际删除与添加")
        return {"key": table["key"], "skipped": True, "would_add": len(typed_records)}

    # 1) 拉当前 _id 全删
    current_ids = fetch_all_ids(table["id"], token)
    print(f"  当前云端: {len(current_ids)} 条", end="")
    if current_ids:
        deleted, del_failures = batch_delete(table["id"], current_ids, token)
        print(f" → 已删 {deleted} 条", end="")
        if del_failures:
            print(f" (失败 {len(del_failures)})", end="")
    print()

    # 2) 加备份
    added, add_failures = batch_add(table["id"], typed_records, token)
    print(f"  已加 {added} 条" + (f" (失败 {len(add_failures)})" if add_failures else ""))

    return {
        "key": table["key"],
        "existed": len(current_ids),
        "deleted": len(current_ids) - len(del_failures),
        "added": added,
        "delete_failures": len(del_failures),
        "add_failures": len(add_failures),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--backup", required=True, help="备份目录（含 remote/ 子目录与 manifest.json）")
    parser.add_argument("--token-file", default=None)
    parser.add_argument("--token-stdin", action="store_true")
    parser.add_argument("--only", default=None, help="只还原指定 key（逗号分隔），默认全量 10 张")
    parser.add_argument("--dry-run", action="store_true", help="只读备份与现状，不实际删/加")
    args = parser.parse_args()

    token: str | None = None
    if args.token_file and Path(args.token_file).is_file():
        token = Path(args.token_file).read_text(encoding="utf-8").strip()
    elif args.token_stdin:
        token = sys.stdin.readline().strip()
    if not token:
        print("[fatal] 未提供 token。", file=sys.stderr)
        sys.exit(2)

    backup_root = Path(args.backup).resolve()
    if not (backup_root / "manifest.json").is_file():
        print(f"[fatal] 备份目录缺少 manifest.json: {backup_root}", file=sys.stderr)
        sys.exit(3)

    only_keys = set(k.strip() for k in (args.only.split(",") if args.only else []))
    targets = [t for t in TABLES if not only_keys or t["key"] in only_keys]

    print(f"还原备份目录: {backup_root}")
    print(f"模式: {'DRY-RUN（不会改动云端）' if args.dry_run else '⚠️  实际删除云端并重建'}")
    print(f"目标表: {', '.join(t['key'] for t in targets)}")
    print()

    if not args.dry_run:
        print("⚠️  本操作将清空当前云端表后写入备份内容，不可撤销！")
        print("   按 Ctrl+C 中断，或等待 5 秒后自动继续…")
        try:
            import time
            time.sleep(5)
        except KeyboardInterrupt:
            print("\n[中断] 退出。")
            sys.exit(0)

    results = []
    for t in targets:
        backup_path = backup_root / "remote" / f"{t['key']}.json"
        r = restore_table(t, backup_path, token, args.dry_run)
        results.append(r)
        print()

    print("=" * 60)
    print("还原摘要")
    print("=" * 60)
    for r in results:
        if r.get("skipped"):
            print(f"  {r['key']:<10} 跳过（dry-run），将加 {r.get('would_add', 0)} 条")
        elif r.get("error"):
            print(f"  {r['key']:<10} 失败: {r['error']}")
        else:
            print(f"  {r['key']:<10} 已删 {r['deleted']}/{r['existed']} · 已加 {r['added']}" +
                  (f" · 删除失败 {r['delete_failures']}" if r.get('delete_failures') else "") +
                  (f" · 添加失败 {r['add_failures']}" if r.get('add_failures') else ""))
    print()
    print("下一步：")
    print("  1) 打开工作台页面 → init() 会自动从云端重新拉数据，本地缓存被刷新")
    print("  2) 如有本地未同步的离线新增，请用页面「导入恢复」加载 localStorage 备份")
    print("  3) 如需彻底以备份为准，清空 localStorage（页面设置中可一键清空）")


if __name__ == "__main__":
    main()
