# -*- coding: utf-8 -*-
"""v58 回本模块：原子应用全部改动（单次读-改-写，逐锚点断言，任一缺失即 abort 不落盘）"""
import io, sys

P = 'D:/workbuddyProjects/工作台3/life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig_len = len(s.encode('utf-8'))

def rep(old, new, label, expect=1, replace_all=False):
    global s
    n = s.count(old)
    if n != expect:
        print('ANCHOR FAIL [%s]: count=%d expect=%d' % (label, n, expect))
        sys.exit(2)
    s = s.replace(old, new) if replace_all else s.replace(old, new, 1)
    print('OK  %s' % label)

# ---------- 1. DB 常量 ----------
rep("var DB_STUDY = 'wtsziKZtrYywDnYMuRNcyP';",
    "var DB_STUDY = 'wtsziKZtrYywDnYMuRNcyP';\n  var DB_PAYBACK = '935dPbYYu1hSUxwV7asgxy';",
    'db-constant')

# ---------- 2. DIAG_TABLES ----------
rep("    {key:'study', name:'学习', id:DB_STUDY},",
    "    {key:'study', name:'学习', id:DB_STUDY},\n    {key:'payback', name:'回本', id:DB_PAYBACK},",
    'diag-tables')

# ---------- 3. pullAllRemote ----------
rep("dbFetchAll(DB_STUDY, function(rows){ if(rows){ mergeStudy(rows); oneDone(true); } else oneDone(false); });",
    "dbFetchAll(DB_STUDY, function(rows){ if(rows){ mergeStudy(rows); oneDone(true); } else oneDone(false); });\n    dbFetchAll(DB_PAYBACK, function(rows){ if(rows){ mergePayback(rows); oneDone(true); } else oneDone(false); });",
    'pull-remote')

# ---------- 4. mergePayback（锚在 mergeStudy 函数尾） ----------
MERGE_TAIL = """    var _unsynced = state.records.filter(function(r){return r.type==='study' && isKeptLocal(r);});
    state.records = state.records.filter(function(r){return r.type!=='study';}).concat(remote).concat(_unsynced);
  }"""
MERGE_ADD = MERGE_TAIL + """

  function mergePayback(rows){
    if(!rows || rows.length===0) return;   /* 空结果保留本地，绝不覆盖清空 */
    var remote = rows.map(function(r){
      var d = r["购买日期"] ? String(r["购买日期"]).slice(0,10) : isoDate();
      return {id:r._id||uid(),type:'payback',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,
        data:{name:String(r["物品名称"]||""),category:String(r["分类"]||"其他"),price:Number(r["购买价格"])||0,
              mode:String(r["均价方式"]||"time")==='count'?'count':'time',uses:Number(r["使用次数"])||0}};
    });
    var _unsynced = state.records.filter(function(r){return r.type==='payback' && isKeptLocal(r);});
    state.records = state.records.filter(function(r){return r.type!=='payback';}).concat(remote).concat(_unsynced);
  }"""
rep(MERGE_TAIL, MERGE_ADD, 'merge-payback')

# ---------- 5. push/updateRemote/deleteRemote ----------
PUSH_ANCHOR = "function deleteRemoteStudy(rid){ if(rid) dbDelete(DB_STUDY, rid); }"
PUSH_ADD = PUSH_ANCHOR + """
  function pushPayback(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["购买日期"] = { date: rec.date };
    props["物品名称"] = { text: String(rec.data.name || "") };
    props["分类"] = { text: String(rec.data.category || "其他") };
    props["购买价格"] = { number: Number(rec.data.price)||0 };
    props["均价方式"] = { text: rec.data.mode==='count' ? 'count' : 'time' };
    props["使用次数"] = { number: Number(rec.data.uses)||0 };
    dbAdd(DB_PAYBACK, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }
  function updateRemotePayback(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["购买日期"] = { date: rec.date };
    props["物品名称"] = { text: String(rec.data.name || "") };
    props["分类"] = { text: String(rec.data.category || "其他") };
    props["购买价格"] = { number: Number(rec.data.price)||0 };
    props["均价方式"] = { text: rec.data.mode==='count' ? 'count' : 'time' };
    props["使用次数"] = { number: Number(rec.data.uses)||0 };
    dbUpdate(DB_PAYBACK, rec.remoteId, props);
  }
  function deleteRemotePayback(rid){ if(rid) dbDelete(DB_PAYBACK, rid); }"""
rep(PUSH_ANCHOR, PUSH_ADD, 'push-block')

# ---------- 6. syncPendingRecords 分发 ----------
rep("else if(rec.type==='study')pushStudy(rec);",
    "else if(rec.type==='study')pushStudy(rec);else if(rec.type==='payback')pushPayback(rec);",
    'sync-dispatch')

# ---------- 7. addRecord 分发 ----------
rep("    if(type==='study')pushStudy(rec);",
    "    if(type==='study')pushStudy(rec);\n    if(type==='payback')pushPayback(rec);",
    'addrecord-dispatch')

# ---------- 8. deleteRecord 表 ternary ----------
rep("target.type==='study'?DB_STUDY:null;",
    "target.type==='study'?DB_STUDY:target.type==='payback'?DB_PAYBACK:null;",
    'delete-ternary')

# ---------- 9. deleteRecord 云端删除（重复两处都要补） ----------
rep("if(target.type==='study')deleteRemoteStudy(target.remoteId);",
    "if(target.type==='study')deleteRemoteStudy(target.remoteId);if(target.type==='payback')deleteRemotePayback(target.remoteId);",
    'delete-remote', expect=2, replace_all=True)

# ---------- 10. clearAllRemoteTables DB_LIST（补 sleep 修复 v56 遗留 + payback） ----------
rep("var DB_LIST = [DB_MONEY, DB_HABIT, DB_PLAN, DB_FITNESS, DB_SHOPPING, DB_MEDIA, DB_DIET, DB_STORAGE, DB_MOOD, DB_PERIOD, DB_STUDY];",
    "var DB_LIST = [DB_MONEY, DB_HABIT, DB_PLAN, DB_FITNESS, DB_SHOPPING, DB_MEDIA, DB_DIET, DB_STORAGE, DB_MOOD, DB_PERIOD, DB_SLEEP, DB_STUDY, DB_PAYBACK];",
    'clear-db-list')

# ---------- 11. TYPE_META ----------
rep("study:{label:'学习',icon:'i-study',tone:'plum'}",
    "study:{label:'学习',icon:'i-study',tone:'plum'},\n    payback:{label:'回本',icon:'i-payback',tone:'plum'}",
    'type-meta')

# ---------- 12. SVG 图标（i-payback + 9 个分类简笔画） ----------
SYM_ANCHOR = '<symbol id="i-study" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></symbol>'
SYM_ADD = SYM_ANCHOR + '''<symbol id="i-payback" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 8.5l3 3.2 3-3.2M12 11.7V17M9.6 13.6h4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol><symbol id="i-pb-digital" viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.5 17.5h3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol><symbol id="i-pb-home" viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="13.5" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 6.5h2M12 6.5h2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol><symbol id="i-pb-furniture" viewBox="0 0 24 24"><path d="M7 3.5V11h10V3.5M5.5 11h13v3.5h-13zM7.5 14.5V20M16.5 14.5V20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol><symbol id="i-pb-car" viewBox="0 0 24 24"><path d="M5.5 13L7 8.8A2 2 0 0 1 8.9 7.5h6.2A2 2 0 0 1 17 8.8L18.5 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="4" y="13" width="16" height="5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 18v2.5M17 18v2.5M8 15.5h.01M16 15.5h.01" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol><symbol id="i-pb-sport" viewBox="0 0 24 24"><path d="M7.5 8.5v7M4.5 10v4M16.5 8.5v7M19.5 10v4M7.5 12h9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></symbol><symbol id="i-pb-wear" viewBox="0 0 24 24"><path d="M8.5 4L12 5.8 15.5 4l4.5 3-2 2.8V20h-12V9.8L4 7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol><symbol id="i-pb-beauty" viewBox="0 0 24 24"><path d="M10 10V5.2L14.5 3.5V10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><rect x="8" y="10" width="8" height="10.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.8"/></symbol><symbol id="i-pb-book" viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5V5.5M20 18v3H6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></symbol><symbol id="i-pb-other" viewBox="0 0 24 24"><path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></symbol>'''
rep(SYM_ANCHOR, SYM_ADD, 'svg-symbols')

# ---------- 13. 桌面导航（学习记录 之后） ----------
NAV_D = '<button class="nav-item" data-nav="study"><svg><use href="#i-study"/></svg><span>学习记录</span></button>'
rep(NAV_D, NAV_D + '\n        <button class="nav-item" data-nav="payback"><svg><use href="#i-payback"/></svg><span>回本</span></button>', 'nav-desktop')

# ---------- 14. 移动端导航（学习 之后） ----------
NAV_M = '<button class="nav-item" data-nav="study"><svg><use href="#i-study"/></svg><span>学习</span></button>'
rep(NAV_M, NAV_M + '\n  <button class="nav-item" data-nav="payback"><svg><use href="#i-payback"/></svg><span>回本</span></button>', 'nav-mobile')

# ---------- 15. view-payback 区块（view-study 之后、经期之前） ----------
VIEW_ANCHOR = '''      <section data-page-node-id="Prd0000000000000PeriodView" class="view" data-title="经期记录" id="view-period">'''
VIEW_ADD = '''      <section class="view" data-title="回本记录" id="view-payback">
        <div class="module-layout">
          <article class="panel form-panel">
            <div class="panel-head"><div><p class="eyebrow">回本记录</p><h2>记下一件大件</h2></div></div>
            <form id="paybackForm">
              <label class="field"><span>物品名称</span><input name="name" maxlength="40" required placeholder="例如：Switch、跑步机、羽绒服"></label>
              <div class="form-row">
                <label class="field"><span>分类</span><select name="category" id="paybackCat"><option>数码</option><option>家电</option><option>家具</option><option>出行</option><option>运动</option><option>服饰</option><option>美妆</option><option>图书</option><option>其他</option></select></label>
                <label class="field" style="flex:0 0 auto"><span>匹配图标</span><svg id="paybackIconPreview" width="30" height="30" aria-hidden="true"><use href="#i-pb-digital"/></svg></label>
              </div>
              <div class="form-row">
                <label class="field"><span>购买价格 ¥</span><input name="price" inputmode="decimal" min="0" step="0.01" required type="number" placeholder="如 2999"></label>
                <label class="field"><span>购买日期</span><input name="date" required type="date"></label>
              </div>
              <div class="form-row">
                <label class="field"><span>计算均价方式</span><select name="mode"><option value="time" selected>按时间（日均成本）</option><option value="count">按次数（每次成本）</option></select></label>
                <label class="field"><span>已使用次数</span><input name="uses" inputmode="numeric" min="0" step="1" type="number" placeholder="按次数时填写"></label>
              </div>
              <button class="btn primary full" type="submit"><svg><use href="#i-plus"/></svg>加入回本清单</button>
            </form>
          </article>
          <div class="module-main">
            <article class="panel">
              <div class="panel-head"><div><p class="eyebrow">回本统计</p><h2>资产与摊销</h2></div></div>
              <div class="sleep-metrics" id="paybackStat"></div>
            </article>
            <article class="panel">
              <div class="panel-head"><div><p class="eyebrow">物品明细</p><h2>每一件的成本</h2></div></div>
              <div class="record-list" id="paybackList"></div>
            </article>
          </div>
        </div>
      </section>
      ''' + VIEW_ANCHOR
rep(VIEW_ANCHOR, VIEW_ADD, 'view-payback')

# ---------- 16. JS 核心：renderPayback 等（锚在 renderStudy 前） ----------
JS_ANCHOR = '  function renderStudy(){'
JS_BLOCK = '''  /* v58 回本模块：大件购买记录，按时间/次数计算摊销成本 */
  var PAYBACK_CATS=[['数码','i-pb-digital'],['家电','i-pb-home'],['家具','i-pb-furniture'],['出行','i-pb-car'],['运动','i-pb-sport'],['服饰','i-pb-wear'],['美妆','i-pb-beauty'],['图书','i-pb-book'],['其他','i-pb-other']];
  function paybackIcon(cat){ cat=String(cat||'').trim(); for(var i=0;i<PAYBACK_CATS.length;i++){ if(PAYBACK_CATS[i][0]===cat) return PAYBACK_CATS[i][1]; } return 'i-pb-other'; }
  function _pbHoldDays(date){ var d1=new Date(date+'T00:00:00'), d2=new Date(isoDate()+'T00:00:00'); var n=Math.floor((d2-d1)/86400000)+1; return n>0?n:1; }
  function renderPayback(){
    const all=sortedRecords('payback');
    const listEl=document.getElementById('paybackList');
    const statEl=document.getElementById('paybackStat');
    if(listEl){
      listEl.innerHTML=all.length?all.slice(0,80).map(function(r){
        var d=r.data||{}, hold=_pbHoldDays(r.date), price=Number(d.price)||0;
        var mode=d.mode==='count'?'count':'time';
        var per=mode==='count'?((Number(d.uses)||0)>=1?price/Number(d.uses):null):(price/hold);
        var perTxt=per==null?'尚未使用':(mode==='count'?'¥'+per.toFixed(2)+' / 次':'¥'+per.toFixed(2)+' / 天');
        var modeTxt=mode==='count'?('按次数 · 已用 '+(Number(d.uses)||0)+' 次'):('按时间 · 持有 '+hold+' 天');
        var useBtn=mode==='count'?'<button class="btn ghost compact" data-action="payback-use" data-id="'+r.id+'">+1 次</button>':'';
        return '<div class="record-row"><span class="record-icon plum">'+icon(paybackIcon(d.category))+'</span>'+
          '<span class="record-main"><strong>'+escapeHtml(d.name||'物品')+'</strong>'+
          '<small>'+escapeHtml(d.category||'其他')+' · '+escapeHtml(formatDateHeading(r.date))+' · '+escapeHtml(modeTxt)+'</small></span>'+
          useBtn+
          '<span class="record-amount">'+perTxt+'<small style="display:block;color:var(--muted)">'+money(price)+'</small></span>'+
          '<button class="delete-btn" data-action="delete" data-id="'+r.id+'" aria-label="删除">'+icon('i-trash')+'</button></div>';
      }).join(''):empty('还没有回本物品，先从左侧添加一件');
    }
    if(statEl){
      var total=0, dailySum=0;
      all.forEach(function(r){ var price=Number((r.data||{}).price)||0; total+=price; dailySum+=price/_pbHoldDays(r.date); });
      const cards=[['物品总数',all.length+' 件'],['总资产',money(Math.round(total*100)/100)],['日均成本',money(Math.round(dailySum*100)/100)]];
      statEl.innerHTML=cards.map(function(c){return '<div class="sleep-metric"><span>'+c[0]+'</span><b>'+escapeHtml(c[1])+'</b></div>';}).join('');
    }
  }
  function addPaybackUse(id){
    var rec=state.records.find(function(r){return r.id===id&&r.type==='payback';});if(!rec)return;
    rec.data.uses=(Number(rec.data.uses)||0)+1;
    updateRemotePayback(rec);const saved=saveState();renderPayback();
    if(saved)toast('已记 1 次使用');
  }
''' + JS_ANCHOR
rep(JS_ANCHOR, JS_BLOCK, 'js-core')

# ---------- 17. 表单绑定（锚在 study 表单绑定块尾） ----------
FORM_ANCHOR = """      if(addRecord('study',date,{subject:subject,category:category,minutes:minutes,note:note})){ e.currentTarget.reset(); var _sd=e.currentTarget.elements.date; if(_sd)_sd.value=isoDate(); renderStudy(); }
    });}"""
FORM_ADD = FORM_ANCHOR + """
    var _paybackForm=document.getElementById('paybackForm');
    if(_paybackForm&&!_paybackForm._bound){_paybackForm._bound=true;_paybackForm.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(e.currentTarget);
      var date=String(fd.get('date')||'').trim()||isoDate();
      var name=String(fd.get('name')||'').trim();
      var category=String(fd.get('category')||'其他').trim();
      var price=Math.max(0,Number(fd.get('price'))||0);
      var mode=String(fd.get('mode')||'time')==='count'?'count':'time';
      var uses=Math.max(0,Math.round(Number(fd.get('uses'))||0));
      if(!name){toast('请填写物品名称');return;}
      if(!price){toast('请填写有效购买价格');return;}
      if(addRecord('payback',date,{name:name,category:category,price:price,mode:mode,uses:mode==='count'?uses:0})){ e.currentTarget.reset(); var _pd=e.currentTarget.elements.date; if(_pd)_pd.value=isoDate(); renderPayback(); }
    });
      var _pcat=document.getElementById('paybackCat');
      if(_pcat)_pcat.addEventListener('change',function(){var _pv=document.getElementById('paybackIconPreview');if(_pv)_pv.innerHTML='<use href="#'+paybackIcon(_pcat.value)+'"/>';});
    }"""
rep(FORM_ANCHOR, FORM_ADD, 'form-binding')

# ---------- 18. renderAll：挂 renderStudy（修复 v56 遗留漏挂）+ renderPayback ----------
rep("    _safeRender('sleep', renderSleep); _safeRender('period', renderPeriod);",
    "    _safeRender('sleep', renderSleep); _safeRender('period', renderPeriod); _safeRender('study', renderStudy); _safeRender('payback', renderPayback);",
    'renderall-hook')

# ---------- 19. 点击分发：payback-use ----------
rep("if(type==='auto-repeat-switch'){state.settings.plannerAutoNext=(state.settings.plannerAutoNext===false);saveState();renderPlannerRepeats();}",
    "if(type==='auto-repeat-switch'){state.settings.plannerAutoNext=(state.settings.plannerAutoNext===false);saveState();renderPlannerRepeats();}if(type==='payback-use')addPaybackUse(id);",
    'click-dispatch')

# ---------- 20. __appTest 导出 ----------
rep("renderPlannerRepeats:renderPlannerRepeats,",
    "renderPlannerRepeats:renderPlannerRepeats,mergePayback:mergePayback,renderPayback:renderPayback,paybackIcon:paybackIcon,addPaybackUse:addPaybackUse,",
    'apptest-exports')

io.open(P, 'w', encoding='utf-8').write(s)
new_len = len(s.encode('utf-8'))
print('WROTE %d -> %d bytes (delta %d)' % (orig_len, new_len, new_len - orig_len))

# ---------- 落盘后中文断言（工程铁律） ----------
chk = io.open(P, encoding='utf-8').read()
for zh in ['回本记录', '记下一件大件', '计算均价方式', '按时间（日均成本）', '按次数（每次成本）', '加入回本清单', '物品总数', '总资产', '日均成本', '匹配图标', '还没有回本物品']:
    if zh not in chk:
        print('ZH ASSERT FAIL: missing %r' % zh)
        sys.exit(3)
print('ZH ASSERT ALL OK')
