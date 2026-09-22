# -*- coding: utf-8 -*-
"""v61b 修正：JS 单引号字符串内不能再嵌单引号（字体栈去引号）"""
import io, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()
orig = s

BAD = "font-family=\"-apple-system,'PingFang SC','HarmonyOS Sans SC',MiSans,sans-serif\""
GOOD = "font-family=\"-apple-system,PingFang SC,HarmonyOS Sans SC,MiSans,sans-serif\""
n = s.count(BAD)
if n != 2:
    print("FAIL anchor count=%d expect=2" % n)
    sys.exit(2)
s = s.replace(BAD, GOOD)

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("OK fixed %d occurrences, size %d -> %d" % (n, len(orig), len(s)))
