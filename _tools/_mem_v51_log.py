# -*- coding: utf-8 -*-
import io, os

f = '.workbuddy/memory/2026-09-17.md'
head = '' if os.path.exists(f) else '# 2026-09-17 工作日志\n'

note = """
## v51 「计划吃什么」已吃条目复活修复（已上线 /28/）
- 用户报：「第一个和第三个昨天已经加到已吃里了，为什么又显示出来了」。
- 排查（关键：先查线上真实数据再改代码）：用 `_tools/_diag_meta_dietplans.py` dump meta 表 → 云端最新 `appSettings`
  （updatedAt=1789583668155）里 dietPlans 7 条，其中「饺子馄饨汤底+水煮蛋」「番茄咖喱土豆鱼丸肥牛+糙米饭」done 仍为 **false**，
  **实锤 done 标记被抹掉**（不是前端隐藏逻辑的问题）。
- 根因：`mergeDietPlans` = `local.concat(remote)` 先到先得。任一端 done:false 就永远胜出，把另一端 done:true 抹掉；
  随后本端 `saveState()` → `scheduleSettingsPush()` 把 done:false 推回云端 → 全端复活。与 v49 的 weeklyPlan bug 同源（同一函数族）。
- 修复三层：
  1. `mergeDietPlans` 按 `text|date` 归并 + 字段级合并，`done` 用「或」、`doneAt`/`at` 取 max/min —— 已吃不可逆。
  2. 「吃这餐」写 `doneAt`；新增计划写 `at`（创建时间，用于同日不误判）。
  3. `renderDietPlan` 自愈 `_dietPlanEatenByRecord`：三餐记录里有同名食物即视为已吃。**必须用片段匹配**——
     用户点「吃这餐」后会在预填文本上继续加东西（计划「饺子馄饨汤底+水煮蛋」实际记成「饺子馄饨汤底+咸奶茶+可可麦芬+水煮蛋2+魔芋爽6」），
     整串包含匹配不到。规则：按 `+＋,，、;；|/空白` 切片，**全部片段出现**才算；单片段用整串包含兜底；同日要求记录晚于计划创建 `at`。
- 验证（重要方法）：`_tools/_diag_diet_plan_verify.py` 把 JS 规则在 Python 里逐字复刻，直接跑**线上 51 条三餐记录 + 云端 7 条计划**，
  结果：隐藏 6 条 / 仍展示 1 条，仍展示的正是用户没吃的「蒸红薯+蒸玉米+水煮蛋」——判定与用户描述完全一致。
- 冒烟 `_tools/_smoke_v51.js` 33/33（含真实数据回归 2n）；回归全绿 v49(30) v48(41) v42(13) v40(10) v39(26) v38(8)。
- **方法论沉淀**：这类「看起来像前端显示 bug」的问题，先用云端数据核实真实字段值（done / updatedAt），
  往往一次就能定位到是同步合并把状态抹了，而不是渲染逻辑。改完再用真实数据复刻规则跑一遍验证，比只写单元测试更可信。
"""

io.open(f, 'a', encoding='utf-8').write(head + note)
print('daily log appended')
