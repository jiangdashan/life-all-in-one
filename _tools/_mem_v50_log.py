# -*- coding: utf-8 -*-
import io, os

f = '.workbuddy/memory/2026-09-17.md'
head = '' if os.path.exists(f) else '# 2026-09-17 工作日志\n'

note = """
## v50 饮食页布局重排（已上线 /27/）
- 需求：左侧只留「每日三餐记录区域」，其余全放右侧，顺序 份量参考 → 计划吃什么 → AI菜谱推荐 → 饮食记录，高度自适应。
- 实现：用 `_tools/_patch_diet_layout.py` 做**同标签嵌套配平**的整块搬迁（`<div>`/`<article>` 深度计数），把 diet-plan-section / ai-recipe-card / fist-guide-panel 三块从 `.module-layout` 第一列搬到 `.module-main` 内部最前，保持 DOM 完整不丢属性。
  - 坑：`extract_block` 初版用 `class="xxx"` 全等匹配，fist 面板是 `class="panel fist-guide-panel"` 匹配不到 → 改为正则 `class="[^"]*\\bname\\b[^"]*"`。
- 去写死高度：`.recipe-list` 去掉 `max-height:360px`；`#dietList{max-height:none;overflow:visible}` 覆盖全局 `.record-list{max-height:520px}`（只改饮食页，避免影响其他模块）。
- `.module-main>.diet-plan-section/.ai-recipe-card{margin:0}`：这两个块自带 `margin:14~16px 0`，进入 flex column(gap:18px) 后间距会翻倍。
- 验证：node --check 通过；回归全绿 v49(30) v48(41) v42(13) v40(10) v39(26) v38(8)；抓线上静态断言顺序 fist<plan<ai<dietList 且均在 module-main 之后。
"""

io.open(f, 'a', encoding='utf-8').write(head + note)
print('daily log appended')
