# -*- coding: utf-8 -*-
"""修复 2026-09-22.md 中被 bash 反引号篡改的 v76/v77 记录：截掉坏段落，重写干净版本。"""
import io, re

P = r"D:\workbuddyProjects\工作台3\.workbuddy\memory\2026-09-22.md"
s = open(P, encoding="utf-8").read()

marker = "\n## v76/v77"
i = s.find(marker)
assert i > 0, "v76/v77 段落未找到"

clean = '''

## v76/v77 移动端样式修复（v76 上线 /60/；v77 上线 /61/）

### v76（文字重叠/挤压 + 闰月空白）
- `.metric strong` 加 `min-width:0;overflow-wrap:break-word`，移动端 18→17px（长金额在 3 列窄卡溢出）。
- `.record-main` 加 `min-width:0`，strong/small 允许换行（回本明细/身体日志挤压）。
- 心情月历 `.cal-cell` 移动端 min-height 34→44px。
- 闰月 checkbox 被 `.field input{width:100%;height:44px}` 撑爆 → `.cd-inline input[type=checkbox]{width:16px;height:16px}` 覆盖。

### v77（第二轮截图四错乱）
- 心情月历周六列挤出：根因 = `repeat(7,1fr)` 轨道 min-width:auto + 格子 `aspect-ratio:1 + min-height:44` 钉死最小宽 → 改 `repeat(7,minmax(0,1fr))`，移动端格子 44→38px。
- 回本物品明细挤压：移动端 4 列改 3 列，金额 `{grid-column:2;grid-row:2}` 下移到名称下一行。
- 消费结构圆环数字溢出：新增 `_amtFs` 按字符宽度自适应字号（数字 0.556 / 千分位 0.28 / ¥ 0.62，预算 72px），替代写死 font-size=20。
- 身体记录挤压：`#fitnessList .record-main small` line-height:1.6 + 每个指标包 `.nb{white-space:nowrap}`（v76 的 word-break 会把「体脂肪」截成「体脂/肪」，指标内禁断词）。

### 流程要点
- v77 曾因 connect_open_platform 报 not available 阻塞部署（12:40 起），13:02 重试恢复，成功发布 /61/，全部标记 FOUND MISS 0。
- 给测试导出补函数（renderAll/switchView 等）时用 `__TESTING__` 守卫；冒烟 20/20。
- 又一次踩「含反引号文本用 python -c 追加」的坑：bash 把反引号当命令替换，追加内容被截断篡改 → **写 memory 日志也必须走 .py 文件**，已用本脚本重写干净版本。
'''
open(P, "w", encoding="utf-8").write(s[:i] + clean)
print("rewritten, total", len(s[:i] + clean))
