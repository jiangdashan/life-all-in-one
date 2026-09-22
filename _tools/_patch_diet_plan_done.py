# -*- coding: utf-8 -*-
"""v51: 修复「计划吃什么」已吃的计划反复复活

根因：mergeDietPlans 用 local.concat(remote) + 先到先得 → 未吃的一端(done:false)永远胜出，
      把另一端已设的 done:true 抹掉；随后本端 saveState 再把 done:false 推回云端 → 全端复活。

修复：
  1) mergeDietPlans 改为按 text|date 归并、字段级合并，「已吃」用「或」（不可逆状态）。
  2) 新增「吃这餐」写 doneAt 时间戳；新增计划写 at 创建时间。
  3) renderDietPlan 增加自愈：三餐记录里已有同名食物（记录日期≥计划日期；同一天则要求
     记录晚于计划创建）→ 视为已吃，自动隐藏并落盘，修好历史数据。
"""
import io, sys

P = 'life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig = len(s)


def must(cond, msg):
    if not cond:
        print('FAIL:', msg)
        sys.exit(1)


# ---------------- 1. mergeDietPlans ----------------
old_merge = (
    "function mergeDietPlans(local, remote){\n"
    "    local = Array.isArray(local)?local:[]; remote = Array.isArray(remote)?remote:[];\n"
    "    var seen = {}, out = [];\n"
    "    function key(p){ return (p&&p.text?p.text:'')+'|'+(p&&p.date?p.date:''); }\n"
    "    local.concat(remote).forEach(function(p){ if(!p) return; var k=key(p); if(!seen[k]){ seen[k]=1; out.push(p); } });\n"
    "    return out;\n"
    "  }\n"
)
must(s.count(old_merge) == 1, 'mergeDietPlans anchor=%d' % s.count(old_merge))

new_merge = (
    "function mergeDietPlans(local, remote){\n"
    "    /* v51: 按 text|date 归并 + 字段级合并。「已吃(done)」是不可逆状态，用「或」合并——\n"
    "     * 旧版 local.concat(remote) 先到先得，未吃的一端(done:false)永远胜出会把另一端已设的\n"
    "     * done:true 抹掉，再被 saveState 推回云端 → 已吃的计划在所有设备上反复复活。 */\n"
    "    local = Array.isArray(local)?local:[]; remote = Array.isArray(remote)?remote:[];\n"
    "    var idxByKey = {}, out = [];\n"
    "    function key(p){ return (p&&p.text?p.text:'')+'|'+(p&&p.date?p.date:''); }\n"
    "    function absorb(p){\n"
    "      if(!p || !p.text) return;\n"
    "      var k = key(p);\n"
    "      if(!(k in idxByKey)){\n"
    "        idxByKey[k] = out.length;\n"
    "        out.push({text:p.text, date:p.date||'', done:!!p.done, doneAt:Number(p.doneAt||0)||0, at:Number(p.at||0)||0});\n"
    "        return;\n"
    "      }\n"
    "      var t = out[idxByKey[k]];\n"
    "      if(p.done){ t.done = true; t.doneAt = Math.max(Number(t.doneAt||0), Number(p.doneAt||0)||0); }\n"
    "      if(p.date && !t.date) t.date = p.date;\n"
    "      var pat = Number(p.at||0)||0;\n"
    "      if(pat){ t.at = t.at ? Math.min(t.at, pat) : pat; }\n"
    "    }\n"
    "    local.forEach(absorb);\n"
    "    remote.forEach(absorb);\n"
    "    return out;\n"
    "  }\n"
)
s = s.replace(old_merge, new_merge)

# ---------------- 2. 新增计划写 at ----------------
old_add = (
    "state.settings.dietPlans.push({text:input.value.trim(),date:isoDate(),done:false});"
)
must(s.count(old_add) == 1, 'add-diet-plan anchor=%d' % s.count(old_add))
new_add = (
    "state.settings.dietPlans.push({text:input.value.trim(),date:isoDate(),done:false,doneAt:0,at:Date.now()});"
)
s = s.replace(old_add, new_add)

# ---------------- 3. 吃这餐写 doneAt ----------------
old_eat = "plan.done=true;saveState();renderDietPlan();toast('已填入今日'+_meal+'，确认份量与热量后点「记下这一餐」');"
must(s.count(old_eat) == 1, 'eat-diet-plan anchor=%d' % s.count(old_eat))
new_eat = "plan.done=true;plan.doneAt=Date.now();saveState();renderDietPlan();toast('已填入今日'+_meal+'，确认份量与热量后点「记下这一餐」');"
s = s.replace(old_eat, new_eat)

# ---------------- 4. renderDietPlan 自愈 ----------------
old_pending = "    const pending=state.settings.dietPlans.filter((p)=>!p.done);\n"
must(s.count(old_pending) == 1, 'pending anchor=%d' % s.count(old_pending))
new_pending = (
    "    /* v51: 自愈——把「三餐记录里已存在的同名食物」回写成 done，修好历史上被旧版合并抹掉的标记 */\n"
    "    let _healed=false;\n"
    "    state.settings.dietPlans.forEach((p)=>{ if(!p.done && _dietPlanEatenByRecord(p)){ p.done=true; p.doneAt=p.doneAt||Date.now(); _healed=true; } });\n"
    "    if(_healed) saveStateQuiet();\n"
    "    const pending=state.settings.dietPlans.filter((p)=>!p.done);\n"
)
s = s.replace(old_pending, new_pending)

# 在 mergeDietPlans 之后插入 _dietPlanEatenByRecord
anchor_fn = "  /* v41: 本周计划历史——按周一起止日期并集合并，保留两端录入过的周归档 */"
must(s.count(anchor_fn) == 1, 'history anchor=%d' % s.count(anchor_fn))
helper = (
    "  /* v51: 判断某条「计划吃什么」是否已经吃过——\n"
    "   * ① 显式标记 done；② 自愈：三餐记录里已有同名食物，且记录日期在计划日期当天或之后；\n"
    "   *    若同一天，则记录必须晚于计划的创建时间（避免「先吃了水煮蛋、再把它加进计划」被误判为已吃）。 */\n"
    "  function _dietPlanEatenByRecord(p){\n"
    "    if(!p) return false;\n"
    "    if(p.done) return true;\n"
    "    var txt = String(p.text||'').trim();\n"
    "    if(!txt) return false;\n"
    "    var pd = String(p.date||''), pat = Number(p.at||0)||0;\n"
    "    return (state.records||[]).some(function(r){\n"
    "      if(!r || r.type!=='diet' || !r.data) return false;\n"
    "      if(String(r.data.food||'').trim() !== txt) return false;\n"
    "      var rd = String(r.date||'');\n"
    "      if(pd && rd < pd) return false;\n"
    "      if(pd && rd === pd && pat && Number(r.createdAt||0) < pat) return false;\n"
    "      return true;\n"
    "    });\n"
    "  }\n"
) + anchor_fn
s = s.replace(anchor_fn, helper)

io.open(P, 'w', encoding='utf-8').write(s)
print('OK diet-plan done patch. %d -> %d chars' % (orig, len(s)))
