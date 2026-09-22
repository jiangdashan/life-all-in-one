# -*- coding: utf-8 -*-
import io

P = r"D:\workbuddyProjects\工作台3\.workbuddy\memory\MEMORY.md"
s = io.open(P, encoding="utf-8").read()

s = s.replace("## 版本要点（当前 v71 /54/）", "## 版本要点（当前 v73 /56/）")

OLD = "## 用户偏好"
NEW = """- v72 /55/ 用户提的七项修五项：①**日程按优先级排序** `plannerPrioRank/sortPlannerByPriority`（high>normal>low，同级未完成在前，再同级保 createdAt → 拖拽排序在同级内仍有效），清单+四象限都套；②**减脂周计划归档**（根因：`applySettingsSync` 无条件 union 远端 weeklyPlan，对端没归档就把上周计划并回来 → 新一周永远清不掉；改为远端 `weeklyPlanWeekStart < 本机` 时忽略，并在 renderAll 兜底 `rolloverWeeklyPlan`）；③**经期天数**（**实证：云端 period 表 22 条，用户习惯每月只标首日+末日，中间无记录**；旧 `rawLen = periodDayCount>0?periodDayCount:跨度` 让只标首末的周期恒算 2 天 → 均值永远显示 2；改为有末日标记时用首末跨度，[2,2]→[5,6]）；④**物品收纳位置归类**（`location` 字段早已有云端列，缺的是归类 UI）：`renderStorageLocFilters`（chips 带数量）+ `renderStorageLocGroups`（总览按位置分布），共用 `data-storage-loc` 事件，未标注用 `__none__`；⑤**番茄钟累计**：`_pomo.pending` 累计未提交分钟，多次完成 25→50→75 而非覆盖；表单 input 事件重设基数、提交成功后清零。
- v73 /56/ 剩两项：①**档案日期漫游** `_archCursor/_archiveStep/_archiveGoto/renderArchiveNav` + `#archiveNav`（‹ › + `<input type=date>` + 回到今天）；`_archiveInRange`/周历/月历/年汇总全部改用 cursor；未来 clamp 到今天。**月视图翻页坑**：先 setDate(1) 再 setMonth 会丢掉「日」（7/24→8/1），改为保留原日、目标月不足才钳月末（1/31+1月→2/28）。②**倒数日模块** `view-countdown`：内置 15 个公历 + 10 个农历节日 + 母亲节/父亲节/感恩节（`_cdNthWeekday`）；内嵌 solarlunar@3.1.0（MIT，26KB，去掉 ESM export 内联进主 script；顶层名 lunarInfo/gan/zhi/nStr1 等与主脚本零冲突，改前必须再核）；自定义支持公历/农历+闰月+是否每年重复；同步走**独立 meta key `richangji:countdown`**（不占 settings 配额，避免超 15000 被静默跳过），按 id 级 LWW + `deletedCountdownIds` 墓碑。56/56。
- **测试维护**：`_smoke_v31` 写死了 2026-09-06 当「今天」，随时间漂移会误报 → 已改为动态基准日（`_fix_v31_dates.py`）。`_smoke_v68` 8a 断言「上午2点」因 v70 改「凌晨」失效 → 已更新。判定旧测试 FAIL 时先算一遍改动前后该数据下的真实值，区分「真回归」与「日期漂移/语义变更」。

## 用户偏好"""
n = s.count(OLD)
if n != 1:
    print("FAIL anchor %d" % n); raise SystemExit(1)
s = s.replace(OLD, NEW, 1)
io.open(P, "w", encoding="utf-8", newline="").write(s)
print("MEMORY.md updated, len =", len(s))
