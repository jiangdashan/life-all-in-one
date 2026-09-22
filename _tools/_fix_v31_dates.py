# -*- coding: utf-8 -*-
"""v31 经期回归脚本写死了 2026-09-06（当时是「今天」），随时间漂移会误报。改为动态基准日期。"""
import io, sys, datetime

P = r"D:\workbuddyProjects\工作台3\_tools\_smoke_v31_period_history.js"
s = io.open(P, encoding="utf-8").read()

today = datetime.date.today()
def shift(n):
    d = today + datetime.timedelta(days=n)
    return d.isoformat()

# 场景中「今天 pours的一条首日」原来写死 2026-09-06 → 改成真正的今天
MAP = [
    ("2026-09-06", shift(0)),
    ("2026-08-01", shift(-36)),
    ("2026-08-02", shift(-35)),
    ("2026-08-03", shift(-34)),
    ("2026-08-04", shift(-33)),
    ("2026-08-05", shift(-32)),
]
# 先按最长的替换避免前缀冲突（从具体到宽松）
for old, new in MAP:
    n = s.count(old)
    if n == 0:
        print("WARN: %s not found" % old); continue
    s = s.replace(old, new)
    print("replaced %s -> %s (x%d)" % (old, new, n))

# 场景4 的脏数据区间大概率也写死了，检查是否存在其它绝对日期
import re
rest = sorted(set(re.findall(r"20\d\d-\d\d-\d\d", s)))
print("remaining absolute dates:", rest)

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("updated")
