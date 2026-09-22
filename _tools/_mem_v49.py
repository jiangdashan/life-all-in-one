# -*- coding: utf-8 -*-
"""把 v49 写入项目记忆：版本表 + 当前静态指针 + 同步铁律。"""
import io

p = '.workbuddy/memory/MEMORY.md'
s = io.open(p, encoding='utf-8').read()

# ---- 1. 版本表追加 v49 ----
anchor = '| v48 | /25/ |'
assert s.count(anchor) == 1, ('v48 row', s.count(anchor))
i = s.index(anchor)
j = s.index('\n', i)
row48 = s[i:j]

v49 = ("| v49 | /26/ | 四项：①**睡眠评分缺失维度归一化**——`_sleepMetrics` 旧逻辑未填分期时 deepPct/remPct=0 → 35% 权重归零 → 分数上限仅 65（把「没数据」误判成「睡得差」）；改为每个维度判定可用性（`hasStages`/`hasInBed`/`hasDur`），只把有数据的维度按权重归一化；`_sleepAdviceFor` 缺失时不误报「深睡偏低」改提示补齐；列表无在床时间效率显示「—」。"
       "②库存「使用频率」面板移到「库存总览」上方。"
       "③**本周计划多端同步修复**——根因 `mergePlanList` 用 `local.concat(remote)`「先到先得」→ 本地旧版永远胜出，移动端勾选状态永远同步不到 web；且无 id 时按整条内容做 key，done 一变就成了新条目导致重复。改为按 id 归并取 `updatedAt` 更大者（末次修改胜出），勾选/新增写 `updatedAt`，删除走 `deletedPlanIds` 墓碑（入快照+payload+apply 前置合并，跨周清空时重置），防止并集复活。"
       "④饮食新增**拳头法对照表**（6 组 38 条：碳水/蛋白质/脂肪/蔬菜/水果/乳制品 + 每餐配比提示）。"
       "已上线 /26/（510449 字符，16/16 标记全 FOUND）。新增 `_tools/_smoke_v49.js`(30/30 通过) |")

s = s[:j] + '\n' + v49 + s[j:]

# ---- 2. 当前静态指针 ----
old = '当前静态 **/25/**（v48 已部署；12 张云表）'
assert s.count(old) == 1, ('static ptr', s.count(old))
s = s.replace(old, '当前静态 **/26/**（v49 已部署；12 张云表）')

# ---- 3. 同步铁律 ----
old2 = '7. 直接改云端 meta 表后必须让用户 F5 刷新（前端只在 init 拉取）。'
assert s.count(old2) == 1, ('rule7', s.count(old2))
new2 = (old2 +
        '\n8. **merge 一律「末次修改胜出(LWW)」，禁「先到先得」**：并集去重时 `local.concat(remote)` + `if(!seen)` 会让本地旧版永远赢，另一台设备的改动**永远同步不过来**（v49 weeklyPlan 勾选不同步根因）。同 id 必须比 `updatedAt` 取新；任何可编辑的设置类数据（weeklyPlan/dietPlans…）在勾选/新增/编辑时**必须写 `updatedAt`**；删除**必须走黑名单墓碑**（如 `deletedPlanIds`）且墓碑要同时进 snapshot + payload + apply 前置合并，否则并集合并会让已删项复活。')
s = s.replace(old2, new2)

io.open(p, 'w', encoding='utf-8').write(s)
print('MEMORY.md updated: v49 row + static ptr + LWW rule')
