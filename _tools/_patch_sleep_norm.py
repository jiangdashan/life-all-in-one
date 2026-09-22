# -*- coding: utf-8 -*-
"""v49-1: 睡眠评分缺失维度归一化。
未填写分期(深睡/浅睡/REM)时，deepPct/remPct=0 会让 35% 权重归零，分数上限仅 65。
改为：只把「有数据的维度」纳入，按权重归一化。
"""
import io

p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()

# ---------- 1. _sleepMetrics 归一化 ----------
old = """    var effScore = Math.min(100, eff/85*100);
    var score = Math.round(durScore*0.4+deepScore*0.2+remScore*0.15+effScore*0.25);
    return {deep:deep,light:light,rem:rem,awake:awake,nap:nap,inBed:inBed,asleep:asleep,eff:eff,
            deepPct:deepPct,remPct:remPct,score:score};"""
assert s.count(old) == 1, ('metrics tail', s.count(old))

new = """    var effScore = Math.min(100, eff/85*100);
    /* v49: 缺失维度不参与评分，按已有维度权重归一化。
       此前未填分期时 deepPct/remPct=0 → 35% 权重归零 → 分数上限仅 65，把「没数据」误判成「睡得差」。 */
    var hasStages=stages>0, hasInBed=inBed>0, hasDur=asleep>0;
    var parts=[];
    if(hasDur)parts.push({w:0.40,v:durScore});
    if(hasInBed)parts.push({w:0.25,v:effScore});
    if(hasStages){parts.push({w:0.20,v:deepScore});parts.push({w:0.15,v:remScore});}
    var wsum=0,vsum=0;
    for(var pi=0;pi<parts.length;pi++){wsum+=parts[pi].w;vsum+=parts[pi].w*parts[pi].v;}
    var score=wsum>0?Math.round(vsum/wsum):0;
    var partial=!(hasDur&&hasInBed&&hasStages);
    return {deep:deep,light:light,rem:rem,awake:awake,nap:nap,inBed:inBed,asleep:asleep,eff:eff,
            deepPct:deepPct,remPct:remPct,score:score,hasStages:hasStages,hasInBed:hasInBed,partial:partial};"""
s = s.replace(old, new)

# ---------- 2. _sleepAdviceFor：缺失维度不误报，改提示补齐 ----------
old2 = """    if(m.deepPct<13)out.push({tone:'warn',text:'深睡比例偏低（'+m.deepPct.toFixed(0)+'%，参考 13–25%）。建议睡前 1 小时远离屏幕、卧室保持 18–22℃、避免睡前饮酒。'});
    else if(m.deepPct>25)out.push({tone:'ok',text:'深睡比例偏高（'+m.deepPct.toFixed(0)+'%），若白天疲惫明显，留意是否身体在补偿性恢复。'});
    else out.push({tone:'good',text:'深睡比例健康（'+m.deepPct.toFixed(0)+'%）。'});
    if(m.remPct<18)out.push({tone:'warn',text:'REM 比例偏低（'+m.remPct.toFixed(0)+'%，参考 18–28%），常见诱因是压力、酒精或作息不规律。建议固定起床时间、减少睡前饮酒。'});
    else if(m.remPct>28)out.push({tone:'ok',text:'REM 比例偏高（'+m.remPct.toFixed(0)+'%），多见于作息紊乱后的补偿，保持规律即可。'});
    else out.push({tone:'good',text:'REM 比例健康（'+m.remPct.toFixed(0)+'%）。'});
    if(m.eff<85)out.push({tone:'warn',text:'睡眠效率偏低（'+Math.round(m.eff)+'%，目标 ≥85%），夜间清醒 '+_fmtMin(m.awake)+'。建议减少床上使用手机、固定起床时间、避免睡前大量饮水。'});
    else out.push({tone:'good',text:'睡眠效率良好（'+Math.round(m.eff)+'%）。'});"""
assert s.count(old2) == 1, ('advice block', s.count(old2))

new2 = """    if(!m.hasStages){
      out.push({tone:'',text:'本条未填写深睡 / 浅睡 / REM，评分已按时长与效率归一化计算（分期维度不计入，不代表睡得差）。补齐分期可得到更完整的评估。'});
    }else{
      if(m.deepPct<13)out.push({tone:'warn',text:'深睡比例偏低（'+m.deepPct.toFixed(0)+'%，参考 13–25%）。建议睡前 1 小时远离屏幕、卧室保持 18–22℃、避免睡前饮酒。'});
      else if(m.deepPct>25)out.push({tone:'ok',text:'深睡比例偏高（'+m.deepPct.toFixed(0)+'%），若白天疲惫明显，留意是否身体在补偿性恢复。'});
      else out.push({tone:'good',text:'深睡比例健康（'+m.deepPct.toFixed(0)+'%）。'});
      if(m.remPct<18)out.push({tone:'warn',text:'REM 比例偏低（'+m.remPct.toFixed(0)+'%，参考 18–28%），常见诱因是压力、酒精或作息不规律。建议固定起床时间、减少睡前饮酒。'});
      else if(m.remPct>28)out.push({tone:'ok',text:'REM 比例偏高（'+m.remPct.toFixed(0)+'%），多见于作息紊乱后的补偿，保持规律即可。'});
      else out.push({tone:'good',text:'REM 比例健康（'+m.remPct.toFixed(0)+'%）。'});
    }
    if(!m.hasInBed){
      out.push({tone:'',text:'未填写入睡 / 醒来时间，无法计算睡眠效率，该维度未计入评分。'});
    }else if(m.eff<85)out.push({tone:'warn',text:'睡眠效率偏低（'+Math.round(m.eff)+'%，目标 ≥85%），夜间清醒 '+_fmtMin(m.awake)+'。建议减少床上使用手机、固定起床时间、避免睡前大量饮水。'});
    else out.push({tone:'good',text:'睡眠效率良好（'+Math.round(m.eff)+'%）。'});"""
s = s.replace(old2, new2)

# ---------- 3. 列表行：无在床时间时效率显示 — ----------
old3 = """'<small>'+escapeHtml((d.bedtime||'—')+' → '+(d.wake||'—'))+' · 睡 '+_fmtMin(m.asleep)+' · 效率 '+Math.round(m.eff)+'%'+"""
assert s.count(old3) == 1, ('row eff', s.count(old3))
new3 = """'<small>'+escapeHtml((d.bedtime||'—')+' → '+(d.wake||'—'))+' · 睡 '+_fmtMin(m.asleep)+' · 效率 '+(m.hasInBed?Math.round(m.eff)+'%':'—')+"""
s = s.replace(old3, new3)

io.open(p, 'w', encoding='utf-8').write(s)
print('OK sleep score normalization applied')
