# -*- coding: utf-8 -*-
"""v49-3: 本周计划状态多端同步。

根因：mergePlanList 用 local.concat(remote) 且「先到先得」，本地旧版本永远胜出，
另一端（移动端）的勾选状态永远同步不过来；且无 id 时按整条内容做 key，
done 一变就成了新条目导致重复。

修复：计划项带 updatedAt，按 id 归并取「末次修改」；删除走 deletedPlanIds 墓碑，
防止被并集复活。
"""
import io

p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()


def must(old, cnt=1, tag=''):
    c = s.count(old)
    assert c == cnt, ('%s count=%d expect=%d' % (tag, c, cnt))
    return old


# ---------- 1. mergePlanList 重写 ----------
old = """  function mergePlanList(local, remote){
    local = Array.isArray(local)?local:[]; remote = Array.isArray(remote)?remote:[];
    var byId = {}, out = [];
    local.concat(remote).forEach(function(p){ if(!p) return; var k = p.id||JSON.stringify(p); if(!byId[k]){ byId[k]=1; out.push(p); } });
    return out;
  }"""
must(old, 1, 'mergePlanList')
new = """  function mergePlanList(local, remote){
    local = Array.isArray(local)?local:[]; remote = Array.isArray(remote)?remote:[];
    /* v49: 计划状态多端同步。
       旧逻辑 local.concat(remote)「先到先得」→ 本地旧版本永远胜出，另一台设备的勾选状态永远同步不过来；
       且无 id 时按整条内容做 key，done 一变就成了「新条目」导致重复出现两条。
       新逻辑：按 id 归并，取 updatedAt 更大的一方（末次修改胜出）；删除走 deletedPlanIds 墓碑防止被并集复活。 */
    var deleted = {};
    try{ (Array.isArray(state.settings.deletedPlanIds)?state.settings.deletedPlanIds:[]).forEach(function(x){ if(x) deleted[x]=1; }); }catch(e){}
    var byId = {}, out = [];
    local.concat(remote).forEach(function(p){
      if(!p || !p.id) return;
      if(deleted[p.id]) return;
      var cur = byId[p.id];
      if(!cur){ byId[p.id]=p; out.push(p); return; }
      if(Number(p.updatedAt||0) > Number(cur.updatedAt||0)){ var i = out.indexOf(cur); if(i>=0) out[i]=p; byId[p.id]=p; }
    });
    local.concat(remote).forEach(function(p){
      if(!p || p.id) return;
      var k='__c'+JSON.stringify(p);
      if(!byId[k]){ byId[k]=1; out.push(p); }
    });
    return out;
  }"""
s = s.replace(old, new)

# ---------- 2. 勾选：写 updatedAt ----------
old = """if(type==='toggle-plan'){const item=state.settings.weeklyPlan.find(x=>x.id===id);if(item){item.done=!item.done;const saved=saveState();renderFitness();if(saved&&item.done)celebrate();}}"""
must(old, 1, 'toggle-plan')
new = """if(type==='toggle-plan'){const item=state.settings.weeklyPlan.find(x=>x.id===id);if(item){item.done=!item.done;item.updatedAt=Date.now();const saved=saveState();renderFitness();if(saved&&item.done)celebrate();}}"""
s = s.replace(old, new)

# ---------- 3. 删除：写墓碑，防止其它设备把它并集回来 ----------
old = """onConfirm:function(ok){if(!ok)return;state.settings.weeklyPlan=state.settings.weeklyPlan.filter(x=>x.id!==id);const saved=saveState();renderFitness();renderPlanManageList();if(saved)toast('计划已删除');}"""
must(old, 1, 'delete-plan')
new = """onConfirm:function(ok){if(!ok)return;state.settings.weeklyPlan=state.settings.weeklyPlan.filter(x=>x.id!==id);state.settings.deletedPlanIds=[...new Set([...(state.settings.deletedPlanIds||[]),id])];const saved=saveState();renderFitness();renderPlanManageList();if(saved)toast('计划已删除');}"""
s = s.replace(old, new)

# ---------- 4. 新增计划：带 updatedAt ----------
old = """state.settings.weeklyPlan.push({id:uid(),group:data.group,title:data.title.trim(),note:data.note.trim()||'按自己的节奏完成',done:false})"""
must(old, 1, 'add-plan')
new = """state.settings.weeklyPlan.push({id:uid(),group:data.group,title:data.title.trim(),note:data.note.trim()||'按自己的节奏完成',done:false,updatedAt:Date.now()})"""
s = s.replace(old, new)

# ---------- 5. 跨周清空时重置墓碑 ----------
old = """    state.settings.weeklyPlan = [];
    state.settings.weeklyPlanWeekStart = ws;
    try{ saveStateQuiet(); }catch(e){}"""
must(old, 1, 'rollover')
new = """    state.settings.weeklyPlan = [];
    state.settings.weeklyPlanWeekStart = ws;
    state.settings.deletedPlanIds = [];
    try{ saveStateQuiet(); }catch(e){}"""
s = s.replace(old, new)

# ---------- 6. 快照纳入 deletedPlanIds ----------
old = """deletedHabitNames: state.settings.deletedHabitNames || []"""
must(old, 1, 'snapshot')
new = """deletedHabitNames: state.settings.deletedHabitNames || [], deletedPlanIds: state.settings.deletedPlanIds || []"""
s = s.replace(old, new)

# ---------- 7. 上传 payload 纳入 deletedPlanIds ----------
old = """deletedHabitNames:snap.deletedHabitNames"""
must(old, 1, 'payload')
new = """deletedHabitNames:snap.deletedHabitNames,deletedPlanIds:snap.deletedPlanIds"""
s = s.replace(old, new)

# ---------- 8. 拉取时先合并墓碑（必须在 mergePlanList 之前） ----------
old = """        if (s && remoteAt > localAt) {
          if (Array.isArray(s.weeklyPlan))"""
must(old, 1, 'apply')
new = """        if (s && remoteAt > localAt) {
          if (Array.isArray(s.deletedPlanIds)) { var _dp = {}; (Array.isArray(state.settings.deletedPlanIds)?state.settings.deletedPlanIds:[]).concat(s.deletedPlanIds).forEach(function(x){ if(x) _dp[x]=1; }); state.settings.deletedPlanIds = Object.keys(_dp); changed = true; }
          if (Array.isArray(s.weeklyPlan))"""
s = s.replace(old, new)

io.open(p, 'w', encoding='utf-8').write(s)
print('OK: weeklyPlan multi-device sync patched (8 anchors)')
