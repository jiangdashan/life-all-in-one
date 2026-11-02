#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
_deploy_public.py —— 日常集公共版一键部署脚本

在一个 WorkBuddy 账号的资料库里从零部署一个全新实例：
  1. import_html.py        导入 HTML 建页面（得到页面节点 id）
  2. create_database.py    建 15 张业务表（挂到页面下，schema 与应用 push 函数严格一致）
  3. page_database_relation.py  每张表与页面建立关联（漏了这步页面桥 12607）
  4. 替换 HTML 里的 DB_* 常量为新表 id
  5. create_page_transaction → upload_page_artifact → commit  更新页面
  6. publish_page.py        发布，得到公开访问链接

用法：
    python _deploy_public.py                # 全流程
    python _deploy_public.py --dry-run      # 只打印将执行的动作
    python _deploy_public.py --resume       # 断点续跑（进度存 _deploy_progress.json）
    python _deploy_public.py --no-publish   # 只到 commit，不发布（测试用）

进度文件：_deploy_progress.json（记录页面 id、各表 id，重跑自动跳过已完成步骤）
产物：    _deployed_instance.html（已替换表 id 的 HTML 副本）
"""

import argparse
import json
import os
import re
import subprocess
import sys

PY = sys.executable
LIB = r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library"
SRC_HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), "life-all-in-one.html")
OUT_HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_deployed_instance.html")
PROGRESS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_deploy_progress.json")

# ============ 15 张表的 schema（列名, 类型）——与代码 pushXxx 严格一致 ============
# 类型: text / number / date / select:选项1,选项2,...
GOODS_CATS = "电子数码,家居日用,厨房餐厨,个护美妆,服饰配饰,工具文具,健康运动,其他"
TABLES = [
    ("DB_META",     "设置表",      [("键", "text"), ("值", "text")]),
    ("DB_MONEY",    "收支记录表",  [("日期", "text"), ("分类", "text"), ("金额", "number"), ("备注", "text"), ("创建时刻", "number")]),
    ("DB_HABIT",    "习惯打卡表",  [("日期", "text"), ("习惯", "text"), ("数值", "number"), ("备注", "text")]),
    ("DB_PLAN",     "日程表",      [("日期", "text"), ("内容", "text"), ("类型", "text"), ("状态", "text"), ("象限", "text"), ("创建时刻", "number"), ("完成时刻", "number")]),
    ("DB_FITNESS",  "健身记录表",  [("日期", "text"), ("体重", "number"), ("体脂率", "number"), ("体脂肪kg", "number"), ("骨骼肌kg", "number"), ("身体水分kg", "number"), ("基础代谢kcal", "number"), ("腰臀比", "number"), ("身体年龄", "number"), ("备注", "text"), ("围度", "text")]),
    ("DB_SHOPPING", "待买清单表",  [("物品名称", "text"), ("数量", "number"), ("预估价格", "number"), ("是否已买", "text"), ("备注", "text")]),
    ("DB_MEDIA",    "书影音记录表", [("标题", "text"), ("类型", "select:电影,电视剧,书籍,动漫,综艺,有声书,AI漫剧"), ("状态", "select:想看,在看,看过"), ("评分", "number"), ("短评", "text"), ("日期", "date"), ("封面链接", "text")]),
    ("DB_DIET",     "饮食记录表",  [("日期", "date"), ("餐次", "select:早餐,午餐,晚餐,加餐"), ("食物", "text"), ("份量", "text"), ("热量", "number"), ("备注", "text"), ("创建时刻", "number")]),
    ("DB_STORAGE",  "物品存储表",  [("物品名称", "text"), ("分类", "select:" + GOODS_CATS), ("数量", "number"), ("单位", "text"), ("存放位置", "text"), ("过期日期", "date"), ("购买金额", "number"), ("购买时间", "date"), ("备注", "text"), ("需快速消耗", "text")]),
    ("DB_MOOD",     "心情记录表",  [("日期", "text"), ("心情值", "number"), ("心情标签", "select:开心,平静,疲惫,焦虑,低落"), ("当日感受", "text"), ("图标", "text")]),
    ("DB_PERIOD",   "经期记录表",  [("日期", "date"), ("是否经期", "text"), ("是否经期首日", "text"), ("是否经期末日", "text"), ("分泌物", "text"), ("感受", "text"), ("心情值", "number"), ("心情标签", "text"), ("卫生巾数量", "number"), ("安睡裤数量", "number"), ("出血量", "number"), ("备注", "text")]),
    ("DB_SLEEP",    "睡眠记录表",  [("日期", "date"), ("入睡时间", "text"), ("醒来时间", "text"), ("深睡", "number"), ("浅睡", "number"), ("REM", "number"), ("清醒时长", "number"), ("零星小睡", "number"), ("备注", "text")]),
    ("DB_STUDY",    "学习记录表",  [("日期", "date"), ("科目", "text"), ("时长(分钟)", "number"), ("创建时刻", "number"), ("类型", "text"), ("备注", "text")]),
    ("DB_PAYBACK",  "回本物品表",  [("购买日期", "date"), ("物品名称", "text"), ("分类", "text"), ("购买价格", "number"), ("均价方式", "text"), ("使用次数", "number"), ("创建时刻", "number")]),
    ("DB_GOODS",    "好物记录表",  [("记录日期", "date"), ("名称", "text"), ("分类", "select:" + GOODS_CATS), ("为什么好用", "text"), ("评分", "number"), ("使用时长", "text"), ("购买时间", "date"), ("价格", "number"), ("购买渠道", "text"), ("备注", "text")]),
]


def run(script, args, desc, dry=False, check=True):
    """跑 library skill 的子脚本，返回 stdout 文本。"""
    cmd = [PY, os.path.join(LIB, script)] + [str(a) for a in args]
    if dry:
        print(f"  [dry] {desc}\n        {' '.join(cmd)}")
        return ""
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=420)
    out = (r.stdout or "").strip()
    if check and ("error" in out[:200].lower() or r.returncode != 0):
        raise RuntimeError(f"{desc} 失败:\n{out[:800]}\n{r.stderr[:400]}")
    return out


def first_json(text):
    """取文本里第一段合法 JSON（兼容 KS_ 前缀行、扁平/嵌套 data 两种结构）。"""
    for line in text.splitlines():
        i = line.find("{")
        if i < 0:
            continue
        try:
            return json.loads(line[i:])
        except Exception:
            continue
    raise RuntimeError("输出中没有 JSON: " + text[:300])


def load_progress():
    if os.path.exists(PROGRESS):
        return json.load(open(PROGRESS, encoding="utf-8"))
    return {}


def save_progress(p):
    json.dump(p, open(PROGRESS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


def field_config(ftype):
    """列类型 → PropertyConfig（见 database/params-reference.md）。"""
    if ftype == "text":
        return {"text": ""}
    if ftype == "number":
        return {"number": {"decimalPlaces": 2, "useSeparate": False}}
    if ftype == "date":
        return {"date": ""}
    if ftype.startswith("select:"):
        opts = [{"text": o.strip()} for o in ftype.split(":", 1)[1].split(",") if o.strip()]
        return {"select": {"options": opts}}
    raise ValueError("未知类型 " + ftype)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--no-publish", action="store_true")
    args = ap.parse_args()
    dry = args.dry_run

    p = load_progress() if args.resume else {}
    save_progress(p)

    # ---- 步骤 1：导入 HTML 建页面 ----
    if not p.get("page_id"):
        print("[1/5] 导入 HTML 建页面 ...")
        if dry:
            run("page/import_html.py", [SRC_HTML], "导入页面", dry=True)
            page_id, import_url = "DRY_PAGE_ID", ""
        else:
            out = run("page/import_html.py", [SRC_HTML, "--file-name", "life-all-in-one.html"], "导入页面")
            j = first_json(out)
            if "error" in j:
                raise RuntimeError("导入页面失败: " + json.dumps(j, ensure_ascii=False))
            page_id = j.get("node_block_id") or j.get("nodeBlockId")
            import_url = j.get("url", "")
            assert page_id, "导入成功但没有 node_block_id: " + out[:400]
        p["page_id"] = page_id
        p["import_url"] = import_url
        save_progress(p)
    print(f"  页面节点: {p['page_id']}")

    # ---- 步骤 2：建 15 张表（含 userId 列）----
    print("[2/5] 建 15 张业务表 ...")
    tables = p.setdefault("tables", {})
    for const, title, fields in TABLES:
        if const in tables:
            print(f"  {title} 已存在({tables[const]['db']})，跳过")
            continue
        props = [{"name": n, "config": field_config(t)} for n, t in fields]
        props.append({"name": "userId", "config": {"text": ""}})
        schema = json.dumps({"title": title, "properties": props, "parent_id": p["page_id"]}, ensure_ascii=False)
        if dry:
            print(f"  [dry] create_database {title} ({len(props)} 列)")
            continue
        out = run("database/create_database.py", ["--schema", schema], f"建表 {title}")
        j = first_json(out)
        if "error" in j or not j.get("database_id"):
            raise RuntimeError(f"建表 {title} 失败: {out[:400]}")
        tables[const] = {"db": j["database_id"], "title": title, "n": len(props)}
        save_progress(p)
        print(f"  {title} -> {j['database_id']}")

    # ---- 步骤 3：页面↔数据库关联 ----
    print("[3/5] 建立页面与数据库的关联 ...")
    for const, title, _ in TABLES:
        if const not in tables:
            continue
        key = "linked_" + const
        if p.get(key):
            continue
        if dry:
            print(f"  [dry] link {title}")
            continue
        out = run("page/page_database_relation.py",
                  ["--action", "link", "--page-id", p["page_id"], "--database-id", tables[const]["db"]],
                  f"关联 {title}")
        p[key] = True
        save_progress(p)
    print("  关联完成")

    # ---- 步骤 4：替换 HTML 中的表 id ----
    print("[4/5] 生成替换表 id 后的 HTML ...")
    src = open(SRC_HTML, encoding="utf-8").read()
    n_replaced = 0
    for const, _, _ in TABLES:
        if const not in tables:
            continue
        new_id = tables[const]["db"]
        pat = re.compile(r"(var\s+" + const + r"\s*=\s*')[^']+(')")
        src, n = pat.subn(r"\g<1>" + new_id + r"\g<2>", src)
        n_replaced += n
    print(f"  替换 {n_replaced} 处表常量")
    if n_replaced != len(TABLES):
        print(f"  ⚠ 替换数({n_replaced}) != 表数({len(TABLES)})，请检查")
    with open(OUT_HTML, "w", encoding="utf-8", newline="") as f:
        f.write(src)
    if dry:
        return

    # ---- 步骤 5：上传 → commit → 发布 ----
    print("[5/5] 上传新版本并发布 ...")
    out = run("page/create_page_transaction.py", ["--node-id", p["page_id"]], "create transaction")
    j = first_json(out)
    tx = j.get("transactionId") or (j.get("data") or {}).get("transactionId")
    base_ver = j.get("baseVersion") or (j.get("data") or {}).get("baseVersion")
    assert tx, "create transaction 失败: " + out[:400]
    print(f"  transaction={tx} baseVersion={base_ver}")
    run("page/upload_page_artifact.py",
        ["--transaction-id", tx, "--path", "life-all-in-one.html", "--file", OUT_HTML], "upload artifact")
    out = run("page/commit_page_transaction.py",
              ["--transaction-id", tx, "--message", "部署日常集实例"], "commit")
    j = first_json(out)
    new_ver = j.get("newVersion") or (j.get("data") or {}).get("newVersion")
    print(f"  newVersion={new_ver}")
    if not args.no_publish:
        run("page/publish_page.py", ["--node-id", p["page_id"]], "publish")
        print(f"  已发布: https://workbuddy.link/p/{p['page_id']}")

    # ---- 汇总 ----
    print()
    print("========== 部署完成 ==========")
    print("页面节点:", p["page_id"])
    print("访问链接: https://workbuddy.link/p/" + p["page_id"])
    for const, title, _ in TABLES:
        if const in tables:
            print(f"  {title:8s} {tables[const]['db']}")


if __name__ == "__main__":
    main()
