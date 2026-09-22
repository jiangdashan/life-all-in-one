# -*- coding: utf-8 -*-
import io, os, re

P = '.workbuddy/memory/MEMORY.md'
s = io.open(P, encoding='utf-8').read()

if '| v51 | /28/ |' not in s:
    anchor = '| v50 | /27/ |'
    assert anchor in s, 'v50 row missing'
    end = s.index('\n', s.index(anchor))
    nxt = [x for x in (s.find('\n| ', end), s.find('\n\n', end)) if x > 0]
    cut = min(nxt) if nxt else end
    v51 = ('| v51 | /28/ | 「计划吃什么」已吃条目反复复活修复。根因：`mergeDietPlans` 用 `local.concat(remote)` 先到先得 → '
           '未吃的一端(done:false)永远胜出，抹掉另一端已设的 done:true，再被 saveState 推回云端 → 全端复活（实测云端 appSettings 里两条已吃计划 done 仍为 false）。'
           '修复：①merge 改按 `text|date` 归并 + 字段级合并，`done` 用「或」（不可逆状态）、`doneAt` 取 max；'
           '②「吃这餐」写 `doneAt`、新增计划写 `at` 创建时间；'
           '③`renderDietPlan` 加自愈 `_dietPlanEatenByRecord`——三餐记录里存在同名食物（**片段全中**规则：按 `+＋,，、;；|/空白` 切片，'
           '要求全部片段出现，单片段则整串包含；同日需记录晚于计划创建 `at`）即视为已吃并落盘。'
           '已上线 /28/（512921 字符，17 标记全 FOUND）。新增 `_tools/_smoke_v51.js`(33/33)；'
           '并新增 `_tools/_diag_diet_plan_verify.py`（用线上真实数据复刻 JS 规则逐条验证判定）。 |\n')
    s = s[:cut] + '\n' + v51 + s[cut:]

s = re.sub(r'当前静态 \*\*/\d+/\*\*', '当前静态 **/28/**', s)
s = s.replace('（v50 已部署；12 张云表）', '（v51 已部署；12 张云表）')

io.open(P, 'w', encoding='utf-8').write(s)
print('MEMORY updated | v51:', '| v51 | /28/ |' in s, '| static:', '当前静态 **/28/**' in s, '| size:', len(s))
