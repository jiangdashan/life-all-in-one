# -*- coding: utf-8 -*-
import io, os

P = r'D:\workbuddyProjects\工作台3\.workbuddy\memory\MEMORY.md'
s = io.open(P, encoding='utf-8').read()

# 版本标题
old_head = '## 版本要点（当前 v71 /54/）'
if old_head in s:
    s = s.replace(old_head, '## 版本要点（当前 v75 /59/）', 1)
else:
    import re
    s = re.sub(r'## 版本要点（当前 [^）]*）', '## 版本要点（当前 v75 /59/）', s, count=1)

ENTRY = """
- v75 /59/ **移动端导航补倒数日 + P1 三档视觉层级**：
  ① **移动端导航是独立的一份列表**（`.mobile-nav`，15 项），与侧栏 `.sidebar` 分开维护 —— v73 加倒数日时只加了侧栏，移动端因此看不到。**以后加新模块必须同时改两处**（已写进 v75 冒烟 A2/A3 断言 16 项 + countdown）。
  ② P1 三档层级：新增 `renderModuleInsights()`（在 renderAll 内 `try{ }catch{}` 调用）+ 10 个 `_miXxx()` + `_miSet(view,eyebrow,main,unit,note)`，每个模块页顶 `.mod-insight#miXxx` 只放一个主数字（30px Songti，`<b>`）+ 一句人话结论（13px `.mi-note`）+ 小标签（11px `.mi-eyebrow`）；无数据时 `hidden`。覆盖 money/habits/fitness/sleep/study/planner/home/diet/storage/payback（mood/media/countdown/archive 已有各自统计卡，未重复加）。
  ③ 全局 `body{font-variant-numeric:tabular-nums}`（数字不跳动）；`empty(message,hint)` 增第二参数渲染 `.empty-hint`（向后兼容，调用点无需改）。
  ④ 42/42 + 全量回归 ~600 项 0 失败。
"""

anchor = '- v71 /54/'
if anchor in s:
    s = s.replace(anchor, ENTRY.strip() + '\n- v71 /54/', 1)
else:
    s = s.rstrip() + '\n' + ENTRY

# 工程铁律补一条
OLD_RULE = '- bash shim 工具会退化'
NEW_RULE = """- **平台会给元素补 `data-page-node-id`**：部署断言**不能用整段标签串**（如 `<button class=...><span>倒数</span></button>`），线上会被规范化成 `<button data-page-node-id="x" class=...><span data-page-node-id="y">倒数</span>` → 恒 MISS。改用短且抗插值的片段（`>倒数</span>`、`data-nav="countdown"><svg`）。
- bash shim 工具会退化"""
if OLD_RULE in s:
    s = s.replace(OLD_RULE, NEW_RULE, 1)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('MEMORY.md updated, len', len(s))
