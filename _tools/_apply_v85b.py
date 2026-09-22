#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v85b：push 拿到 remoteId 立即落盘（原来走 400ms 防抖 saveStateQuiet）。
窗口内刷新页面 → remoteId 丢失 → 下次拉取时云端那份与本地「未同步」那份同时存在，
记录凭空多出一份（e2e 实测 5+3 变成 11）。数据零容忍，改为同步立即写。"""
import io

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
src = io.open(PATH, encoding="utf-8").read()
orig_len = len(src)

OLD = "remoteId = rid; saveStateQuiet();"
NEW = "remoteId = rid; saveStateNow();  /* v85b: 立即落盘，防抖窗口内刷新会丢 remoteId 导致重复 */"
n = src.count(OLD)
assert n == 12, "expected 12 got %d" % n
src = src.replace(OLD, NEW)

ANCHOR = "  function saveStateQuiet(){"
NEWFN = (
    "  /* v85b: 立即持久化（无防抖、无 UI 副作用）。用于 remoteId 回写这类「丢了就会重复」的关键字段 */\n"
    "  function saveStateNow(){\n"
    "    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}\n"
    "  }\n"
)
assert src.count(ANCHOR) == 1
src = src.replace(ANCHOR, NEWFN + ANCHOR)

io.open(PATH, "w", encoding="utf-8").write(src)
chk = io.open(PATH, encoding="utf-8").read()
assert chk.count("function saveStateNow()") == 1
assert chk.count("remoteId = rid; saveStateNow();") == 12
assert "remoteId = rid; saveStateQuiet();" not in chk
print("OK len %d -> %d, patched %d push callbacks" % (orig_len, len(chk), n))
