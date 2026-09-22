# -*- coding: utf-8 -*-
"""v72 落盘断言：提取主 script 供 node --check，并校验中文内容真的写进去了。"""
import io, re, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
OUT = r"D:\workbuddyProjects\工作台3\_tools\_main_v72.js"
s = io.open(P, encoding="utf-8").read()

m = re.search(r'<script[^>]*data-page-node-id="NWnaoiLqDuBK1LXGZoVUKl"[^>]*>(.*?)</script>', s, re.S)
if not m:
    print("FAIL: main script not found"); sys.exit(1)
body = m.group(1)
io.open(OUT, "w", encoding="utf-8").write(body)
print("main script len =", len(body))
if len(body) < 100000:
    print("FAIL: script too short"); sys.exit(1)

CHECKS = [
    ("v72 排序函数", "v72：日程优先级排序"),
    ("v72 排函数调用(清单)", "sortPlannerByPriority(items)"),
    ("v72 排函数调用(象限)", "sortPlannerByPriority(all.filter"),
    ("v72 周计划注释", "v72：远端快照若属于「更早的一周」"),
    ("v72 renderAll 兜底", "try{ rolloverWeeklyPlan(); }catch(e){}"),
    ("v72 经期注释", "v72：用户习惯只标「首日 + 末日」"),
    ("v72 经期新逻辑", "if(lastEndDay && spanDays>=1 && spanDays<=15) rawLen = spanDays;"),
    ("v72 番茄累加注释", "v72：连着完成多个番茄要累加"),
    ("v72 番茄 pending", "_pomo.pending = _base + _pomo.len;"),
    ("v72 待记录文案", "待记录 "),
    ("v72 位置归类注释", "v72 收纳位置归类"),
    ("v72 位置容器", 'id="storageOvLocs"'),
    ("v72 位置筛选条", 'id="storageLocFilters"'),
    ("v72 位置CSS", ".storage-ov-locs{"),
    ("v72 位置gridCSS", ".ov-loc-list{"),
    ("v72 位置事件", "_locClick"),
    ("v72 position funcs", "function renderStorageLocGroups("),
]
bad = 0
for name, token in CHECKS:
    n = s.count(token)
    if n < 1:
        print("MISS  -", name, "|", token); bad += 1
    else:
        print("FOUND - %s (x%d)" % (name, n))

# 反向断言：确认旧的错误写法已消失
GONE = [
    ("旧经期逻辑已移除", "var rawLen = periodDayCount>0 ? periodDayCount"),
    ("旧番茄覆盖已移除", "f.elements.minutes.value = String(_pomo.len);"),
]
for name, token in GONE:
    if token in s:
        print("MISS-OLD -", name, "（旧写法仍在）"); bad += 1
    else:
        print("GONE -", name)

if bad:
    print("\nFAILED: %d" % bad); sys.exit(1)
print("\nALL CHECKS PASSED")
