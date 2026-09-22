# -*- coding: utf-8 -*-
import io, sys

p = r"D:\workbuddyProjects\工作台3\.workbuddy\memory\MEMORY.md"
s = io.open(p, encoding="utf-8").read()

# 1. 版本号
old_head = "## 版本要点（当前 v73 /56/）"
new_head = "## 版本要点（当前 v74 /57/）"
if s.count(old_head) != 1:
    print("FAIL head"); sys.exit(1)
s = s.replace(old_head, new_head, 1)

# 2. 追加 v74 条目到版本要点末尾（在「测试维护」条目前插入）
anchor = "- **测试维护**：`_smoke_v31` 写死了"
v74 = u"""- v74 /57/ ①**修 CSS 泄漏**：v73-B2 插 CSS 时裸用 `</style>` 锚点命中了 `view-habits` 的内联 style 且插在闭合标签**之后** → 一整段 `.cd-*` 变成可见文本显示在习惯健康页顶部，同时倒数日样式全丢。改为用 `</style>\\n  <title data-page-node-id="N9uQg0dpiKTsyB4FFPFrxl"` 唯一锚点放回主 style。**铁律：文件里有多个 `<style>`，插 CSS 必须用带上下文的唯一锚点，插完断言该 section 可见 HTML 无 CSS 文本。** ②**倒数日视觉重做**：Hero 两栏（左主卡 名称+38px 大数字+日期元信息 / 右侧栏列接下来 2 个 `cd-hero-sm`），≤640px 堆叠；列表行 `cd-num`（tabular-nums）+`cd-body`+`cd-tag`，`days<=7` 加 `.near`（`--red`），`days===0` 显示「今天」而非 0 天。43/43。
"""
if s.count(anchor) != 1:
    print("FAIL anchor"); sys.exit(1)
s = s.replace(anchor, v74 + anchor, 1)

io.open(p, "w", encoding="utf-8", newline="").write(s)
print("MEMORY.md updated, len =", len(s))
