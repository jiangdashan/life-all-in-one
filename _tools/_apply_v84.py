#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v84：修同步不收敛三 bug。
1) runMerge pending=11 实际 13 表 + cb 无 once 保护（连发 3 次，快照可能在合并完成前生成）
2) syncPendingRecords 补传链漏 sleep 类型 → sleep 记录永远卡本地、每次刷新都计入补传
3) syncPendingDeletes.finish 过滤反了：成功删除的条目留在队列反复重删+反复弹提示
含中文，落盘后 grep 断言。"""
import io, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"

src = io.open(PATH, encoding="utf-8").read()
orig_len = len(src)
applied = []

def rep(old, new, tag):
    global src
    assert src.count(old) == 1, "anchor not unique (%s): count=%d" % (tag, src.count(old))
    src = src.replace(old, new)
    applied.append(tag)

# ---- 1a. pending 11 -> 13 + once 标记 ----
rep(
    "  function runMerge(cb){\n    var pending = 11, done = 0, changed = false;\n"
    "    function oneDone(c){ done++; if(c) changed = true; if(done>=pending && cb) cb(changed); }",
    "  function runMerge(cb){\n"
    "    /* v84: 实际派发 13 张表，旧值 11 导致 cb 在第 11/12/13 张完成时连发 3 次——\n"
    "     * 快照可能在最后 2 张表合并前生成（不同设备快照条数不一致的直接来源）。\n"
    "     * once 保护：无论多少张表后到，cb 只发一次。 */\n"
    "    var pending = 13, done = 0, changed = false, fired = false;\n"
    "    function oneDone(c){ done++; if(c) changed = true; if(done>=pending && !fired && cb){ fired = true; cb(changed); } }",
    "runMerge-pending-once",
)

# ---- 2. 补传链补 sleep ----
rep(
    "else if(rec.type==='study')pushStudy(rec);else if(rec.type==='payback')pushPayback(rec);",
    "else if(rec.type==='study')pushStudy(rec);else if(rec.type==='payback')pushPayback(rec);"
    "else if(rec.type==='sleep')pushSleep(rec);  /* v84: sleep 之前漏在链外，失败后永远卡本地 */",
    "sync-chain-sleep",
)

# ---- 3. pendingDeletes 清理方向修正 ----
rep(
    "      state.pendingDeletes = (state.pendingDeletes||[]).filter(function(d){ return !failedKeys[d.db+'|'+d.rid]; });",
    "      /* v84: 方向修正——失败的留在队列里等重试，成功的才移除；旧逻辑反了导致成功的\n"
    "       * 删除每次刷新重删一遍、提示反复弹 */\n"
    "      state.pendingDeletes = (state.pendingDeletes||[]).filter(function(d){ return failedKeys[d.db+'|'+d.rid]; });",
    "pendingDeletes-filter-fix",
)

io.open(PATH, "w", encoding="utf-8").write(src)

# ---- 落盘断言 ----
chk = io.open(PATH, encoding="utf-8").read()
assert chk.count("var pending = 13, done = 0, changed = false, fired = false;") == 1
assert chk.count("else if(rec.type==='sleep')pushSleep(rec);") == 1
assert chk.count("return failedKeys[d.db+'|'+d.rid];") == 1
assert "return !failedKeys[d.db+'|'+d.rid];" not in chk
assert chk.count("runMerge(cb)") >= 1
print("OK applied=%d len %d -> %d" % (len(applied), orig_len, len(chk)))
for t in applied:
    print(" -", t)
