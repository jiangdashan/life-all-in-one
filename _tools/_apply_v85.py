#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v85：
1) 重复日程「加入日程」一律排到今天（此前用建议的未来 nextDate）
2) 当天快照在本机数据条数变化后自动覆盖刷新（面板不再整天停在早上那份旧条数）
3) runMerge：单表合并异常兜底 + 读取失败重试一次 + 总看门狗（任一表抛错曾导致
   cb 永不触发 → 补传/快照整条链停摆）"""
import io

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
src = io.open(PATH, encoding="utf-8").read()
orig_len = len(src)
applied = []

def rep(old, new, tag):
    global src
    assert src.count(old) == 1, "anchor not unique (%s): count=%d" % (tag, src.count(old))
    src = src.replace(old, new)
    applied.append(tag)

# ---------- 1. createNextRepeat 用今天 ----------
rep(
    "  function createNextRepeat(item){\n"
    "    if(!item||!item.nextDate||!item.template)return false;",
    "  function createNextRepeat(item){\n"
    "    /* v85：加入日程一律落到「今天」——此前用推算的 nextDate（未来某天），\n"
    "     * 用户点完「加入日程」在今天/明天的待办里都看不到它。nextDate 只作为建议提示展示。 */\n"
    "    if(!item||!item.nextDate||!item.template)return false;",
    "repeat-today-decl",
)
rep(
    "return !!addRecord('planner',item.nextDate,{title:item.title,",
    "return !!addRecord('planner',isoDate(),{title:item.title,",
    "repeat-today-addrecord",
)
rep(
    "if(res===true)toast('已按约 '+item.avgDays+' 天的节奏，自动把下次排到 '+formatDateHeading(item.nextDate));",
    "if(res===true)toast('已按约 '+item.avgDays+' 天的节奏，自动加入今天的日程');",
    "repeat-today-autotoast",
)
rep(
    "if(res==='exists')toast('已有未完成的同名日程，完成后会自动排下一次');else if(res&&it)toast('已生成待完成日程：'+formatDateHeading(it.nextDate));",
    "if(res==='exists')toast('已有未完成的同名日程，完成后会自动排下一次');else if(res&&it)toast('已加入今天的日程：'+formatDateHeading(isoDate()));",
    "repeat-today-toast",
)
rep(
    "const next=it.nextDate?('建议下次：'+formatDateHeading(it.nextDate)+'（平均每 '+it.avgDays+' 天）'):'完成节奏数据还不足，暂不能推算下次日期';",
    "const next=it.nextDate?('建议下次：'+formatDateHeading(it.nextDate)+'（平均每 '+it.avgDays+' 天）· 加入即排到今天'):'完成节奏数据还不足，暂不能推算下次日期';",
    "repeat-today-hint",
)

# ---------- 2. 当天快照条数变化时覆盖刷新 ----------
rep(
    "  function maybeDailySnapshot(syncOk){",
    "  /* v85：当前真实条数（与 snapshotBuild 的 counts 口径一致，但不序列化全量数据，开销极小） */\n"
    "  function snapshotCountsNow(){\n"
    "    try{\n"
    "      var _r=(state.records||[]).filter(function(r){ return r && !r.sample; });\n"
    "      var _m=(state.mediaItems||[]).filter(function(m){ return m && !m.sample; });\n"
    "      var _hd=0; (state.habits||[]).forEach(function(h){ if(h&&!h.sample) _hd+=Object.keys(h.entries||{}).length; });\n"
    "      return { records:_r.length, media:_m.length, habitDays:_hd };\n"
    "    }catch(e){ return { records:0, media:0, habitDays:0 }; }\n"
    "  }\n"
    "  function maybeDailySnapshot(syncOk){",
    "snapshotCountsNow",
)
rep(
    "    var today = isoDate();\n"
    "    if(_snapHasDate(today)) return;\n"
    "    var snap = snapshotBuild();",
    "    var today = isoDate();\n"
    "    if(_snapHasDate(today)){\n"
    "      /* v85：当天已有快照，但若本机数据条数已变化（同步补齐后 web 447 / 手机 444），\n"
    "       * 用当前数据覆盖刷新——否则面板会一整天停在早上那份旧条数上，看着像没同步 */\n"
    "      var _old = _snapLocalRead(today);\n"
    "      var _nowC = snapshotCountsNow();\n"
    "      var _oldC = (_old && _old.counts) || {};\n"
    "      if(Number(_oldC.records||0) === Number(_nowC.records||0)\n"
    "        && Number(_oldC.media||0) === Number(_nowC.media||0)\n"
    "        && Number(_oldC.habitDays||0) === Number(_nowC.habitDays||0)) return;\n"
    "    }\n"
    "    var snap = snapshotBuild();",
    "snapshot-refresh",
)

# ---------- 3. runMerge 兜底 + 重试 + 看门狗 ----------
old_merge_head = (
    "  function runMerge(cb){\n"
    "    /* v84: 实际派发 13 张表，旧值 11 导致 cb 在第 11/12/13 张完成时连发 3 次——\n"
    "     * 快照可能在最后 2 张表合并前生成（不同设备快照条数不一致的直接来源）。\n"
    "     * once 保护：无论多少张表后到，cb 只发一次。 */\n"
    "    var pending = 13, done = 0, changed = false, fired = false;\n"
    "    function oneDone(c){ done++; if(c) changed = true; if(done>=pending && !fired && cb){ fired = true; cb(changed); } }\n"
)
new_merge_head = (
    "  function runMerge(cb){\n"
    "    /* v84: 实际派发 13 张表，旧值 11 导致 cb 在第 11/12/13 张完成时连发 3 次——\n"
    "     * 快照可能在最后 2 张表合并前生成（不同设备快照条数不一致的直接来源）。\n"
    "     * once 保护：无论多少张表后到，cb 只发一次。\n"
    "     * v85: 单表合并 try/catch + 读取失败重试 1 次 + 25s 总看门狗——此前任一表合并抛错\n"
    "     * 会让 oneDone 永不执行、cb 永不触发，补传/快照整条链静默停摆（移动端数据拉不全的成因之一）。 */\n"
    "    var pending = 13, done = 0, changed = false, fired = false;\n"
    "    function oneDone(c){ done++; if(c) changed = true; if(done>=pending && !fired && cb){ fired = true; try{ clearTimeout(_wd); }catch(e){} cb(changed); } }\n"
    "    var _wd = setTimeout(function(){ if(!fired){ fired = true; console.warn('[merge] 汇总超时兜底触发'); if(cb) cb(changed); } }, 25000);\n"
    "    function fetchMerge(dbId, mergeFn, tries){\n"
    "      dbFetchAll(dbId, function(rows){\n"
    "        if(rows && rows.length >= 0){\n"
    "          try{ mergeFn(rows); }catch(e){ console.error('[merge] 合并异常', dbId, e); }\n"
    "          oneDone(true);\n"
    "        } else if(tries > 0){\n"
    "          setTimeout(function(){ fetchMerge(dbId, mergeFn, tries - 1); }, 600);\n"
    "        } else { console.warn('[merge] 读取失败', dbId); oneDone(false); }\n"
    "      });\n"
    "    }\n"
)
rep(old_merge_head, new_merge_head, "runMerge-head")

pairs = [
    ("dbFetchAll(DB_MONEY, function(rows){ if(rows){ mergeMoney(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_MONEY, mergeMoney, 1);"),
    ("dbFetchAll(DB_HABIT, function(rows){ if(rows){ mergeHabit(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_HABIT, mergeHabit, 1);"),
    ("dbFetchAll(DB_PLAN, function(rows){ if(rows){ mergePlan(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_PLAN, mergePlan, 1);"),
    ("dbFetchAll(DB_FITNESS, function(rows){ if(rows){ mergeFitness(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_FITNESS, mergeFitness, 1);"),
    ("dbFetchAll(DB_SHOPPING, function(rows){ if(rows){ mergeShopping(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_SHOPPING, mergeShopping, 1);"),
    ("dbFetchAll(DB_MEDIA, function(rows){ if(rows){ mergeMedia(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_MEDIA, mergeMedia, 1);"),
    ("dbFetchAll(DB_DIET, function(rows){ if(rows){ mergeDiet(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_DIET, mergeDiet, 1);"),
    ("dbFetchAll(DB_STORAGE, function(rows){ if(rows){ mergeStorage(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_STORAGE, mergeStorage, 1);"),
    ("dbFetchAll(DB_MOOD, function(rows){ if(rows){ mergeMood(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_MOOD, mergeMood, 1);"),
    ("dbFetchAll(DB_PERIOD, function(rows){ if(rows){ mergePeriod(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_PERIOD, mergePeriod, 1);"),
    ("dbFetchAll(DB_SLEEP, function(rows){ if(rows){ mergeSleep(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_SLEEP, mergeSleep, 1);"),
    ("dbFetchAll(DB_STUDY, function(rows){ if(rows){ mergeStudy(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_STUDY, mergeStudy, 1);"),
    ("dbFetchAll(DB_PAYBACK, function(rows){ if(rows){ mergePayback(rows); oneDone(true); } else oneDone(false); });", "fetchMerge(DB_PAYBACK, mergePayback, 1);"),
]
for old, new in pairs:
    rep(old, new, "runMerge-" + new[11:new.index(',')])

io.open(PATH, "w", encoding="utf-8").write(src)

chk = io.open(PATH, encoding="utf-8").read()
assert chk.count("fetchMerge(DB_") == 13, chk.count("fetchMerge(DB_")
assert chk.count("function snapshotCountsNow()") == 1
assert chk.count("v85：加入日程一律落到「今天」") == 1
assert chk.count("addRecord('planner',isoDate(),{title:item.title,") == 1
assert chk.count("加入即排到今天") == 1
print("OK applied=%d len %d -> %d" % (len(applied), orig_len, len(chk)))
for t in applied:
    print(" -", t)
