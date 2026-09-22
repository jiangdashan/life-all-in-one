# -*- coding: utf-8 -*-
"""追加 v78 记录到今日日志 + 更新 MEMORY.md 版本行。"""

P1 = r"D:\workbuddyProjects\工作台3\.workbuddy\memory\2026-09-22.md"
add = '''

## v78（线上 /62/）—— 回本金额压到下一条 + 身体日志体重重叠

### 根因（本轮最有价值的发现）
`.record-list` 是 `display:flex;flex-direction:column;max-height:520px;overflow:auto`
（桌面端定高滚动列表设计）。`.record-row` 作为 flex 子项默认 `flex-shrink:1`：
条目一多，**每一行被压缩到 min-height:62px**。v76/v77 把金额/体重移到网格第二行后
行自然高 ~80px，压缩后第二行内容溢出（行 overflow:visible）压进下一条。
表现为「每条金额都被挤到下一个物品」「体重和身体记录重叠」。

### 修法（一行 CSS）
`.record-row` 基础规则加 `flex-shrink:0` —— 行保持自然高度，容器滚动替代压缩。
纯 CSS，一行修复全部两处。

### 验证方法突破（重要，复用）
- **安装 playwright-core + 本机 Edge（免下载 Chromium）做真实布局实测**：
  `page.addInitScript(() => window.__TESTING__ = true)` 可跳过鉴权并暴露 `__appTest`
  （v77 起含 renderAll/switchView/state），evaluate 注入回本测试数据 → switchView →
  **量 getBoundingClientRect 检测行内元素/相邻行的几何重叠**，再配元素级截图。
  本次靠它把「肉眼猜 CSS」变成「数字证明压缩 62px vs 内容 79.7px」。
- npm 直装遇 EBUSY 缓存锁 → 换 `--cache` 到隔离目录重试即好。
- 截图要截 `#paybackList`/`#fitnessList` 元素本身（页面截图只拍到表单区）。
- 脚本在 `C:/Users/依易亦奕鸭/.workbuddy/binaries/node/workspace/_layout_test_v77.js`
  与 `_shot_lists_v78.js`，下轮移动端样式问题直接改数据复用。
'''
open(P1, "a", encoding="utf-8").write(add)

P2 = r"D:\workbuddyProjects\工作台3\.workbuddy\memory\MEMORY.md"
s = open(P2, encoding="utf-8").read()
old_line = "## 版本要点（当前 v77；线上 /61/，v77 已上线 MISS 0）"
new_line = "## 版本要点（当前 v78；线上 /62/，v78 已上线 MISS 0）"
assert old_line in s
s = s.replace(old_line, new_line)
marker = "\n- v77 "
i = s.find(marker)
j = s.find("\n", i + 1)
ins = "\n- v78 **回本金额压下一条/体重重叠** 根因=`.record-list` 定高 flex 列表 + 行默认 flex-shrink:1 被压到 min-height:62px，两行网格内容溢出 → `.record-row{flex-shrink:0}` 一行修复。**验证利器：playwright-core+本机 Edge 实测布局几何**（__TESTING__ 跳鉴权 + __appTest 注数据 + getBoundingClientRect 查重叠）。"
s = s[:j] + ins + s[j:]
open(P2, "w", encoding="utf-8").write(s)
print("memory updated")
