# -*- coding: utf-8 -*-
import io, os

D = r'D:\workbuddyProjects\工作台3\.workbuddy\memory'
P = os.path.join(D, '2026-09-22.md')
head = '' if os.path.exists(P) else '# 2026-09-22 工作日志\n'
entry = """

## v75 移动端导航补倒数日 + P1 三档视觉层级（已上线 /59/）

### 用户反馈
1. 手机上没有倒数日模块。
2. 按上一轮给出的建议做 P1（建立视觉主次）。

### 根因（问题 1）
移动端导航 `.mobile-nav` 是**独立于侧栏 `.sidebar` 的第二份列表**（15 项）。v73 新增倒数日时只往侧栏加了按钮，移动端那份没同步 —— 所以电脑上能进、手机上永远看不到。
修：在 payback 之后插入 countdown 按钮（图标 `#i-countdown` 早已存在）。
**教训（已写进 MEMORY）**：新增模块必须同时改侧栏与 mobile-nav 两处；冒烟新增 A2/A3 断言（16 项且含 countdown）堵住复发。

### P1 落地内容
- 新增 `renderModuleInsights()`，在 `renderAll()` 内 `try{}catch{}` 调用；10 个 `_miXxx()` 各算一个主数字 + 一句结论，经 `_miSet()` 渲染到 `.mod-insight#miXxx`。
  - money 本月支出 / 比上月多·少花了 X
  - habits 今日打卡 x/y / 最长连续 N 天（否则「今天完成一点，就算前进」）
  - fitness 当前体重 kg / 比上次轻·重 X kg
  - sleep 昨晚睡了 X / 比近 N 天平均多·少睡 X
  - study 近 7 天学习 / 今天 X 分钟 · 已完成 N 个番茄
  - planner 待办未完成 N 件 / 其中 N 件今天该做了
  - home 待买 N 件 / 本月已买 N 件
  - diet 今日摄入 kcal / 已记 N 餐
  - storage N 种 / N 件在库 · 放在 N 个位置
  - payback 大件投入 ¥X / N 件在用，越用越回本
  - 无数据时容器 `hidden`，不占位。
- CSS：`.mi-eyebrow` 11px / `.mi-main b` 30px Songti（移动端 26px）/ `.mi-note` 13px；全局 `font-variant-numeric:tabular-nums`。
- `empty(message,hint)` 增第二参数 → `.empty-hint`（向后兼容，调用点不动）。

### 验证
- node --check 过；`_verify_v75.py` 46 项断言全过（含中文串落盘断言）。
- `_smoke_v75.js` 42/42；全量回归 v57 27、v63 32、v65 41、v67 22、v68 28、v69 39、v70 21、v71 28、v72 39、v73 56、v74 43、v75 42 + period 系列（28+40+83+15+28+22）全绿。
- 部署：/57/ → /58/ → /59/。

### 新坑
- **平台发布会往元素上补 `data-page-node-id`**，部署断言用整段标签串必然 MISS（`<span>倒数</span>` 也会变成 `<span data-page-node-id="x">倒数</span>`）。改用 `>倒数</span>` 这类抗插值短串。
- 本次首次部署报 MISS 后，我没有直接改代码，而是下载线上文件核对，确认改动其实已生效（mobile-nav 16 项含 countdown），只是断言写法问题。
- bash shim 继续退化（tail/head 不可用）→ 回归改用 python subprocess 汇总输出。
"""
s = (head + (io.open(P, encoding='utf-8').read() if os.path.exists(P) else '')) + entry
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('daily log updated')
