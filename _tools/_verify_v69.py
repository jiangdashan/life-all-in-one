#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v69 写入后校验：中文串断言 + 提取主 script 供 node --check"""
import io, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
OUT = r"D:\workbuddyProjects\工作台3\_tools\_main_v69.js"

src = io.open(PATH, "r", encoding="utf-8").read()

musts = [
    "专注结束时，时长会自动填入「记下这一次学习」",
    "本轮专注完成，时长已填入表单",
    "今天已完成 ",
    "把「该安排了」的重复日程置顶",
    "重复日程不再自动塞进四象限，改为在重复清单置顶回显",
    "未来日程 · ",
    "12 个月的记录节奏",
    "有记录的天数",
    "最充实的一天",
    "（未命名物品）",
]
bad = [m for m in musts if m not in src]
if bad:
    print("CHINESE ASSERT FAIL:")
    for b in bad: print("  -", b)
    sys.exit(1)
print("chinese asserts: all hit")

m_start = src.find('<script data-page-node-id="NWnaoiLqDuBK1LXGZoVUKl"')
if m_start < 0:
    import re
    mm = __import__('re').search(r'<script[^>]*data-page-node-id="NWnaoiLqDuBK1LXGZoVUKl"[^>]*>', src)
    if not mm:
        print("main script open tag not found"); sys.exit(1)
    start = src.find(">", mm.start()) + 1
else:
    start = src.find(">", m_start) + 1
end = src.find("</script>", start)
code = src[start:end]
print("main script length:", len(code))
if len(code) < 100000:
    print("TOO SHORT — extraction wrong"); sys.exit(1)
io.open(OUT, "w", encoding="utf-8", newline="\n").write(code)
print("extracted ->", OUT)

pairs = [
    ("function _archiveWeekHtml(", "_archiveWeekHtml(ev)"),
    ("function _archiveMonthHtml(", "_archiveMonthHtml(ev)"),
    ("function _archiveYearHtml(", "_archiveYearHtml(ev)"),
    ("function bindPomodoro(", "bindPomodoro();"),
    ("function pomoFinish(", "pomoToggle"),
    ("var _pomo = {", "renderPomo()"),
    ("repeat-pin", "const pin=(!it.hasPending && it.nextDate)"),
]
for a, b in pairs:
    if a not in code: print("MISS def:", a); sys.exit(1)
    if b not in code: print("MISS call:", b); sys.exit(1)
print("structure asserts: all hit")
