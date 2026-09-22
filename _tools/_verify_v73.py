# -*- coding: utf-8 -*-
"""v73 落盘断言 + 提取主 script 供 node --check"""
import io, re, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
OUT = r"D:\workbuddyProjects\工作台3\_tools\_main_v73.js"
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
    # --- v72 ---
    ("v72 排序函数", "function sortPlannerByPriority("),
    ("v72 清单排序", "sortPlannerByPriority(items)"),
    ("v72 象限排序", "sortPlannerByPriority(all.filter"),
    ("v72 周计划校验", "v72：远端快照若属于「更早的一周」"),
    ("v72 renderAll 兜底", "try{ rolloverWeeklyPlan(); }catch(e){}"),
    ("v72 经期新逻辑", "if(lastEndDay && spanDays>=1 && spanDays<=15) rawLen = spanDays;"),
    ("v72 番茄累加", "_pomo.pending = _base + _pomo.len;"),
    ("v72 位置归类函数", "function renderStorageLocGroups("),
    ("v72 位置筛选条", 'id="storageLocFilters"'),
    # --- v73-A 档案日期导航 ---
    ("v73 档案 cursor", "function _archCursor()"),
    ("v73 档案翻页", "function _archiveStep("),
    ("v73 档案跳转", "function _archiveGoto("),
    ("v73 档案导航渲染", "function renderArchiveNav("),
    ("v73 导航条 HTML", 'class="archive-nav" id="archiveNav"'),
    ("v73 日期选择器", 'id="archiveDate"'),
    ("v73 回到今天按钮", 'id="archTodayBtn"'),
    ("v73 导航 CSS", ".archive-nav{"),
    ("v73 范围判定用 cursor", "function _archiveInRange(dateStr, range){\n  var base = _archCursor();"),
    ("v73 周历用 cursor", "isoWeekStart(new Date(_archCursor()+'T00:00:00'))"),
    ("v73 月历用 cursor", "ym=_archCursor().slice(0,7)"),
    ("v73 年汇总用 cursor", "var y=_archCursor().slice(0,4)"),
    # --- v73-B 倒数日 ---
    ("v73 农历库", "var lunarInfo = [0x04bd8"),
    ("v73 lunar2solar", "lunar2solar("),
    ("v73 solar2lunar", "solar2lunar("),
    ("v73 无残留 export", None),
    ("v73 倒数日 meta key", "var META_COUNTDOWN_KEY='richangji:countdown'"),
    ("v73 倒数日 push", "function countdownPush("),
    ("v73 倒数日 pull", "function countdownPull("),
    ("v73 倒数日 merge", "function _cdMergeList("),
    ("v73 倒数日 next", "function _cdNextOccur("),
    ("v73 内置节日", "CD_LUNAR_FESTIVALS"),
    ("v73 母亲节算法", "function _cdNthWeekday("),
    ("v73 倒数日渲染", "function renderCountdown("),
    ("v73 倒数日绑定", "function bindCountdown("),
    ("v73 视图 HTML", 'id="view-countdown"'),
    ("v73 导航项", 'data-nav="countdown"'),
    ("v73 图标 symbol", '<symbol id="i-countdown"'),
    ("v73 倒数日 CSS", ".cd-hero{"),
    ("v73 renderAll 挂载", "_safeRender('countdown', renderCountdown)"),
]
bad = 0
for name, token in CHECKS:
    if token is None:
        continue
    n = s.count(token)
    if n < 1:
        print("MISS  -", name, "|", token); bad += 1
    else:
        print("FOUND - %s (x%d)" % (name, n))

# 反向断言：确认 ESM 语法没有漏进主 script
if re.search(r"^\s*export\s*\{", body, re.M):
    print("MISS-OLD - 主脚本里残留 ESM export"); bad += 1
else:
    print("GONE - 主脚本无 ESM export")
if "sourceMappingURL" in body:
    print("MISS-OLD - 残留 sourceMappingURL"); bad += 1
else:
    print("GONE - 无 sourceMappingURL")

if bad:
    print("\nFAILED: %d" % bad); sys.exit(1)
print("\nALL CHECKS PASSED")
