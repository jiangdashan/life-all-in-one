# -*- coding: utf-8 -*-
import io

p = r"D:\workbuddyProjects\工作台3\.workbuddy\memory\2026-09-22.md"
s = io.open(p, encoding="utf-8").read()

entry = u"""
### 用户反馈（未实施，仅建议）：整体样式/展示/交互「太过普通」

已给出的建议清单（**待用户拍板，尚未改代码**）：

- **P0 结构**：①移动端 `.mobile-nav` 是左侧固定 64px 竖排图标条（16 个模块、字号 8px），吃掉一整条屏幕 → 建议改底部 5 Tab（今日/记录/计划/回顾/我的）+ 分组，或可收起侧栏；②15 个 view 一次性 `renderAll` → 改按需渲染（切到才渲染），首屏只渲染 dashboard。
- **P1 视觉**：建立三档权重（主数字 28-34px tabular-nums / 常规 13-14px / 微弱 11-12px muted）；每页顶部加「一句结论 + 一个主数字」；统一页头四件套（eyebrow / 结论 / 筛选条 / 空态）；去掉边框套边框，改用 1px 细线 + 留白分组；所有数字统一 `font-variant-numeric:tabular-nums`。
- **P2 交互**：打卡按钮即时状态（不只是 toast）；列表左滑完成/删除；骨架屏；「上次同步 xx 前」。
- **P3 锦上添花**：深色模式（--paper 现为固定浅色）；各模块 30 天 sparkline（统一 1px 细线、不用饼图不用渐变）。

**必须保留**：朴素基调（不加彩色装饰/阴影/荧光）、现有文案语气（如「完成一点，就算前进」）、离线优先、数据安全铁律。

关键现状备忘：15 个 view + 1 个 dashboard（今日总览，含 生活指数/快速开始/今日节奏/连续发生/生活脉络/轻提醒）；CSS 变量 `--paper #f7f8f9 --card #fff --ink #252a31 --muted #6b7683 --line #e4e8ec --plum #33506b --red #b0524a --radius 22px --sidebar 248px`；单文件约 650KB。
"""

io.open(p, "w", encoding="utf-8", newline="").write(s + entry)
print("appended")
