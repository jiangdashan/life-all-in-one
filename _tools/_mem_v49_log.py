# -*- coding: utf-8 -*-
"""修正 2026-09-17.md 被 shell 反引号破坏的 v49 日志段落。"""
import io

p = '.workbuddy/memory/2026-09-17.md'
s = io.open(p, encoding='utf-8').read()

i = s.index('## v49')
head = s[:i]

B = chr(96)  # 反引号，避免 shell 解析问题
note = (
    "## v49 四项改动（已上线 /26/）\n"
    "1. **睡眠评分缺失维度归一化**：旧逻辑未填分期时 35% 权重归零、分数上限仅 65（把「没数据」误判成「睡得差」）。"
    "改为按 hasStages / hasInBed / hasDur 判定可用维度后按权重归一化；建议区缺失时提示补齐而非误报偏低；列表无在床时间效率显示「—」。\n"
    "2. 库存「使用频率」面板移到「库存总览」上方（按 article 标签计数精确交换整块）。\n"
    "3. **本周计划多端同步**（重点）：根因 " + B + "mergePlanList" + B + " 用 " + B + "local.concat(remote)" + B +
    "「先到先得」→ 本地旧版永远胜出，另一端（移动端）的勾选状态永远同步不到 web；且无 id 时用整条内容做 key，done 一变就成新条目导致重复出现。"
    "改为按 id 取 " + B + "updatedAt" + B + " 更大者（LWW 末次修改胜出）；勾选/新增写 updatedAt；删除走 " + B + "deletedPlanIds" + B +
    " 墓碑（snapshot + payload + apply 前置合并，跨周清空时重置）。\n"
    "   - 坑：墓碑一开始只加进了 habitsPayload，而读取端读的是 META_SETTINGS_KEY（settingsPayload），必须两处都写才生效。\n"
    "4. 饮食新增**拳头法对照表**：6 组 38 条（一拳碳水 / 一掌心蛋白 / 一大拇指脂肪 / 两捧蔬菜 / 一拳水果 / 一杯乳制品）+ 每餐配比提示。\n"
    "- 测试：" + B + "_tools/_smoke_v49.js" + B + " 30/30；回归 v48(41) v42(13) v40(10) v39(26) v38(8) 全绿。\n"
    "- 记忆：MEMORY.md 已从 12111 压缩到 10860 字符（v36–v44 合并为一行摘要），并新增「merge 一律末次修改胜出」铁律。\n"
)

io.open(p, 'w', encoding='utf-8').write(head + note)
print('daily log fixed, size=%d' % len(head + note))
