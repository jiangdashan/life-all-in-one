#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复 MEMORY.md：v69 条目误吃掉 v68 行首，补回 v68 条目开头。"""
import io, sys
P = r"D:\workbuddyProjects\工作台3\.workbuddy\memory\MEMORY.md"
s = io.open(P, encoding="utf-8").read()

old_mid = "\u65e5\u7a0b\u6309\u521b\u5efa\u65f6\u523b\u5f52\u6863\uff09\u3002\u2460"   # 日程按创建时刻归档）。①
new_mid = ("\u65e5\u7a0b\u6309\u521b\u5efa\u65f6\u523b\u5f52\u6863\uff09\u3002\n"
           "- v68 /51/ **\u4f7f\u7528\u9891\u7387\u540c\u6b65 + \u793a\u4f8b\u6570\u636e\u6e05\u7406 + \u5f53\u65e5\u65f6\u95f4\u7ebf\u5347\u5e8f**\uff1a\u2460")  # 日程按创建时刻归档）。\n- v68 /51/ **使用频率同步 + 示例数据清理 + 当日时间线升序**：①
if s.count(old_mid) != 1:
    print("anchor fail:", s.count(old_mid)); sys.exit(1)
s = s.replace(old_mid, new_mid, 1)
io.open(P, "w", encoding="utf-8", newline="").write(s)
print("fixed. v68 line restored:")
for line in s.split("\n"):
    if line.startswith("- v68 ") or line.startswith("- v69 "):
        print("  ", line[:40])
