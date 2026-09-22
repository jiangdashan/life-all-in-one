# -*- coding: utf-8 -*-
"""v57 重复日程：原子应用全部改动（单次读-改-写，逐锚点断言，任一缺失即 abort 不落盘）"""
import io, sys

P = 'D:/workbuddyProjects/工作台3/life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig = s

def rep(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        print('ANCHOR FAIL [%s]: count=%d' % (label, n))
        sys.exit(2)
    s = s.replace(old, new)
    print('OK  %s' % label)

# ---------- 1. CSS：重复日程面板样式（锚在 quad-cell-empty 规则后） ----------
CSS_ANCHOR = '.quad-cell-empty{color:#a7abb0;font-size:9px;padding:4px 2px}'
CSS_ADD = CSS_ANCHOR + '.repeat-list{display:flex;flex-direction:column;gap:8px}.repeat-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 10px;border:1px solid #d5d9de;border-radius:11px;background:#fff}.repeat-main{min-width:0;display:flex;flex-direction:column;gap:2px}.repeat-main strong{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.repeat-main small{color:var(--muted);font-size:10px}.repeat-next{color:var(--terra)!important}'
rep(CSS_ANCHOR, CSS_ADD, 'css-repeat')

# ---------- 2. HTML：日程统筹 view 内、一周日历面板前插入「重复日程」面板 ----------
HTML_ANCHOR = '<article data-page-node-id="Px5floKfHXUvHDjfKZvIK2" class="panel week-panel">'
HTML_PANEL = '<article data-page-node-id="REP10Panel" class="panel"><div data-page-node-id="REP11Head" class="panel-head"><div><p data-page-node-id="REP12Eye" class="eyebrow">重复日程</p><h2 data-page-node-id="REP13H2">按你的节奏排下一次</h2></div><button data-page-node-id="REP14Btn" class="btn ghost compact" data-action="auto-repeat-switch" id="autoRepeatBtn" type="button">自动生成：开</button></div><div data-page-node-id="REP15List" class="repeat-list" id="plannerRepeatList"></div></article>\n            ' + HTML_ANCHOR
rep(HTML_ANCHOR, HTML_PANEL, 'html-panel')

# ---------- 3. JS 核心：渲染函数之前插入分析与生成逻辑（锚在 renderHome 前） ----------
JS_ANCHOR = '  function renderHome(){'
JS_BLOCK = '''  /* v57 重复日程：统计同名日程（历史全部+当前）的添加→完成节奏，自动/一键生成下次待完成日程 */
  function _tsToIso(ts){const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function analyzePlannerRepeats(){
    const groups={};
    state.records.forEach(r=>{if(r.type!=='planner'||r.sample)return;const key=(r.data.title||'').trim();if(!key)return;(groups[key]=groups[key]||[]).push(r);});
    const out=[];
    Object.keys(groups).forEach(key=>{
      const g=groups[key];if(g.length<2)return;
      const done=g.filter(r=>r.data.done).slice().sort((a,b)=>((a.data.doneAt||0)-(b.data.doneAt||0))||a.date.localeCompare(b.date));
      const intervals=[];
      done.forEach(r=>{const st=Number(r.createdAt||0),en=Number(r.data.doneAt||0);if(en>st)intervals.push((en-st)/86400000);});
      if(!intervals.length&&done.length>=2){for(let i=1;i<done.length;i++){const dd=(new Date(done[i].date+'T00:00:00')-new Date(done[i-1].date+'T00:00:00'))/86400000;if(dd>0)intervals.push(dd);}}
      const avgDays=intervals.length?Math.max(1,Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length)):0;
      const last=done[done.length-1];
      const baseDate=last?((last.data.doneAt?_tsToIso(last.data.doneAt):last.date)):'';
      const nextDate=(baseDate&&avgDays>0)?shiftDate(avgDays,new Date(baseDate+'T00:00:00')):'';
      out.push({title:key,count:g.length,doneCount:done.length,pendingCount:g.length-done.length,avgDays,lastDoneDate:last?baseDate:'',nextDate,hasPending:g.some(r=>!r.data.done),template:last?{time:last.data.time||'',priority:last.data.priority||'normal',list:last.data.list||'生活',note:last.data.note||'',remind:!!last.data.remind,quadrant:last.data.quadrant||'重要紧急'}:null});
    });
    out.sort((a,b)=>(b.doneCount-a.doneCount)||(b.count-a.count));
    return out;
  }
  function createNextRepeat(item){
    if(!item||!item.nextDate||!item.template)return false;
    if(state.records.some(r=>r.type==='planner'&&!r.sample&&!r.data.done&&((r.data.title||'').trim()===item.title)))return 'exists';
    return !!addRecord('planner',item.nextDate,{title:item.title,time:item.template.time,priority:item.template.priority,list:item.template.list,note:item.template.note,remind:item.template.remind,done:false,quadrant:item.template.quadrant});
  }
  function maybeAutoNextRepeat(task){
    try{
      if(state.settings.plannerAutoNext===false)return;
      if(!task||task.sample)return;
      const title=(task.data.title||'').trim();if(!title)return;
      const item=analyzePlannerRepeats().find(x=>x.title===title);
      if(!item||!item.nextDate)return;
      const res=createNextRepeat(item);
      if(res===true)toast('已按约 '+item.avgDays+' 天的节奏，自动把下次排到 '+formatDateHeading(item.nextDate));
    }catch(e){}
  }
  var _plannerRepeats=[];
  function renderPlannerRepeats(){
    const el=document.getElementById('plannerRepeatList');if(!el)return;
    const btn=document.getElementById('autoRepeatBtn');
    if(btn)btn.textContent=(state.settings.plannerAutoNext===false?'自动生成：关':'自动生成：开');
    _plannerRepeats=analyzePlannerRepeats();
    el.innerHTML=_plannerRepeats.length?_plannerRepeats.map((it,i)=>{
      const stat='历史 '+it.count+' 次 · 已完成 '+it.doneCount+(it.pendingCount?(' · 待完成 '+it.pendingCount):'')+(it.lastDoneDate?(' · 上次完成 '+formatDateHeading(it.lastDoneDate)):'');
      const next=it.nextDate?('建议下次：'+formatDateHeading(it.nextDate)+'（平均每 '+it.avgDays+' 天）'):'完成节奏数据还不足，暂不能推算下次日期';
      const action=it.nextDate?('<button class="btn ghost compact" data-action="gen-repeat" data-idx="'+i+'">生成下次</button>'):'';
      return '<div class="repeat-row"><span class="repeat-main"><strong>'+escapeHtml(it.title)+'</strong><small>'+escapeHtml(stat)+'</small><small class="repeat-next">'+escapeHtml(next)+'</small></span>'+action+'</div>';
    }).join(''):'<div class="quad-cell-empty">还没有重复出现的日程——同一件事安排两次以上，就会在这里出现节奏分析</div>';
  }
''' + JS_ANCHOR
rep(JS_ANCHOR, JS_BLOCK, 'js-core')

# ---------- 4. toggleTask：完成时记 doneAt + 触发自动生成 ----------
OLD_TOGGLE = "function toggleTask(id){const task=state.records.find(r=>r.id===id&&r.type==='planner');if(!task)return;task.data.done=!task.data.done;updateRemotePlan(task);const saved=saveState();renderAll();if(saved&&task.data.done){celebrate();toast('完成一项，心里轻一点');}}"
NEW_TOGGLE = "function toggleTask(id){const task=state.records.find(r=>r.id===id&&r.type==='planner');if(!task)return;task.data.done=!task.data.done;if(task.data.done)task.data.doneAt=Date.now();updateRemotePlan(task);const saved=saveState();renderAll();if(saved&&task.data.done){celebrate();toast('完成一项，心里轻一点');maybeAutoNextRepeat(task);}}"
rep(OLD_TOGGLE, NEW_TOGGLE, 'toggle-task')

# ---------- 5. 点击分发：gen-repeat / auto-repeat-switch ----------
CLICK_ANCHOR = "if(type==='delete')deleteRecord(id);if(type==='toggle-task')toggleTask(id);"
CLICK_ADD = CLICK_ANCHOR + "if(type==='gen-repeat'){const it=_plannerRepeats[Number(action.dataset.idx||0)]||null;const res=createNextRepeat(it);if(res==='exists')toast('已有未完成的同名日程，完成后会自动排下一次');else if(res&&it)toast('已生成待完成日程：'+formatDateHeading(it.nextDate));}if(type==='auto-repeat-switch'){state.settings.plannerAutoNext=(state.settings.plannerAutoNext===false);saveState();renderPlannerRepeats();}"
rep(CLICK_ANCHOR, CLICK_ADD, 'click-dispatch')

# ---------- 6. renderAll 挂 renderPlannerRepeats ----------
RA_ANCHOR = "    _safeRender('planner', renderPlanner);"
RA_ADD = RA_ANCHOR + "\n    _safeRender('plannerRepeats', renderPlannerRepeats);"
rep(RA_ANCHOR, RA_ADD, 'renderAll-hook')

# ---------- 7. __appTest 导出 ----------
EXP_ANCHOR = 'backfillPlannerQuadrant:backfillPlannerQuadrant,'
EXP_ADD = EXP_ANCHOR + 'analyzePlannerRepeats:analyzePlannerRepeats,createNextRepeat:createNextRepeat,maybeAutoNextRepeat:maybeAutoNextRepeat,renderPlannerRepeats:renderPlannerRepeats,'
rep(EXP_ANCHOR, EXP_ADD, 'apptest-exports')

io.open(P, 'w', encoding='utf-8').write(s)
print('WROTE %d -> %d bytes (delta %d)' % (len(orig.encode("utf-8")), len(s.encode("utf-8")), len(s.encode("utf-8")) - len(orig.encode("utf-8"))))

# ---------- 落盘后中文断言（工程铁律：必须 grep 断言实际中文串） ----------
chk = io.open(P, encoding='utf-8').read()
for zh in ['重复日程', '按你的节奏排下一次', '自动生成：开', '生成下次', '还没有重复出现的日程', '重要紧急', '平均每']:
    if zh not in chk:
        print('ZH ASSERT FAIL: missing %r' % zh)
        sys.exit(3)
print('ZH ASSERT ALL OK')
