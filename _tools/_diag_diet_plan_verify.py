#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""用线上真实数据验证 v51 的「计划已吃」自愈判定：把 JS 规则在 Python 里逐字复刻，
逐条列出 7 条计划的新判定结果（应隐藏 / 仍展示）与命中的三餐记录。
用法： printf '<token>' | python _tools/_diag_diet_plan_verify.py
"""
import sys, json, re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _inspect_tables import fetch_all, TABLES

DB_DIET = "ZshQ2v3NpB58bxG59hlTEB"
SPLIT = re.compile(r"[\+＋,，、;；|/\s]+")


def eaten_by_record(plan, records, live=None):
    """复刻 JS _dietPlanEatenByRecord（不含 p.done 的短路，便于对照）"""
    if plan.get("done"):
        return ("显式done", None)
    txt = (plan.get("text") or "").strip()
    if not txt:
        return (None, None)
    segs = [x.strip() for x in SPLIT.split(txt) if len(x.strip()) >= 2]
    if not segs:
        segs = [txt]
    pd = plan.get("date") or ""
    pat = int(plan.get("at") or 0)
    for r in records:
        rd = r["date"]
        if pd and rd < pd:
            continue
        if pd and rd == pd and pat and int(r.get("createdAt") or 0) < pat:
            continue
        if txt in r["food"]:
            return ("整串包含", r)
        if len(segs) < 2:
            continue
        if all(seg in r["food"] for seg in segs):
            return ("片段全中(%d段)" % len(segs), r)
    return (None, None)


def main():
    token = sys.stdin.readline().strip()
    # —— 线上真实三餐记录 ——
    records = []
    for r in fetch_all(DB_DIET, token):
        records.append({
            "date": str(r.get("日期") or "")[:10],
            "food": str(r.get("食物") or ""),
            "meal": str(r.get("餐次") or ""),
            "createdAt": r.get("_created_at") or r.get("created_at") or 0,
        })
    # —— meta 里 updatedAt 最大的 appSettings（与前端 readMetaValue 同规则）——
    best_at, plans = -1, []
    for r in fetch_all(TABLES["meta"], token):
        if str(r.get("键") or "") != "appSettings":
            continue
        try:
            o = json.loads(str(r.get("值") or ""))
        except Exception:
            continue
        at = int(o.get("updatedAt") or 0)
        if at >= best_at:
            best_at, plans = at, o.get("dietPlans") or []
    print("线上三餐记录 %d 条 | 云端最新 appSettings.updatedAt=%d | dietPlans %d 条" % (len(records), best_at, len(plans)))
    print("\n==== 逐条计划判定（模拟修复后首屏自愈） ====")
    hidden, shown = [], []
    for i, p in enumerate(plans):
        why, hit = eaten_by_record(p, records)
        tag = "隐藏" if why else "展示"
        (hidden if why else shown).append(p.get("text"))
        print("[%d] %s  %s | 计划日期 %s" % (i + 1, tag, p.get("text"), p.get("date")))
        print("     判定依据: %s" % (why or "无匹配记录 → 仍待吃"))
        if hit:
            print("     命中记录: %s %s «%s»" % (hit["date"], hit["meal"], hit["food"]))
    print("\n汇总：隐藏 %d 条 / 仍展示 %d 条" % (len(hidden), len(shown)))
    print("仍展示：", json.dumps(shown, ensure_ascii=False))


if __name__ == "__main__":
    main()
