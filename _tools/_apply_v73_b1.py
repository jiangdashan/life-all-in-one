# -*- coding: utf-8 -*-
"""v73-B1：内嵌公农历转换库 + 倒数日核心逻辑（节日表 / 计算 / 同步 / 渲染）"""
import io, sys, re

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
LIB = r"D:\workbuddyProjects\工作台3\_tools\solarlunar.esm.js"
s = io.open(P, encoding="utf-8").read()
orig_len = len(s)

lib = io.open(LIB, encoding="utf-8").read()
lib = re.sub(r"export\s*\{[^}]*\}\s*;?", "", lib)
lib = lib.replace("//# sourceMappingURL=solarlunar.esm.js.map", "")
if "export " in lib:
    print("FAIL: lib still contains export"); sys.exit(1)
print("lib len =", len(lib))

JS = r"""
  /* ===================== v73 倒数日 ===================== */
  /* ---- 公农历互转（内嵌 solarlunar@3.1.0，MIT；1900-2100） ---- */
LUNAR_LIB_PLACEHOLDER

  var CD_LMONTHS=['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','腊月'];
  var CD_LDAYS=['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
  var CD_WEEKDAYS=['周日','周一','周二','周三','周四','周五','周六'];
  /* 内置节日：公历固定日期 */
  var CD_SOLAR_FESTIVALS=[['元旦','01-01'],['情人节','02-14'],['妇女节','03-08'],['植树节','03-12'],['劳动节','05-01'],['青年节','05-04'],['儿童节','06-01'],['建党节','07-01'],['建军节','08-01'],['教师节','09-10'],['国庆节','10-01'],['万圣节','10-31'],['平安夜','12-24'],['圣诞节','12-25'],['跨年夜','12-31']];
  /* 内置节日：农历月日 */
  var CD_LUNAR_FESTIVALS=[['春节',1,1],['元宵节',1,15],['龙抬头',2,2],['端午节',5,5],['七夕',7,7],['中元节',7,15],['中秋节',8,15],['重阳节',9,9],['腊八节',12,8],['除夕',12,30]];
  /* 某月第 N 个星期 X：母亲节=5月第2个周日、父亲节=6月第3个周日、感恩节=11月第4个周四 */
  var CD_NTH_FESTIVALS=[['母亲节',5,0,2],['父亲节',6,0,3],['感恩节',11,4,4]];

  function _cdPad(n){ return String(n).padStart(2,'0'); }
  function _cdDaysTo(dstr){ return Math.round((new Date(dstr+'T00:00:00') - new Date(isoDate()+'T00:00:00'))/86400000); }
  function _cdNthWeekday(y,month,weekday,nth){
    var d=new Date(y,month-1,1);
    var lead=(weekday-d.getDay()+7)%7;
    d.setDate(1+lead+(nth-1)*7);
    return d.getFullYear()+'-'+_cdPad(d.getMonth()+1)+'-'+_cdPad(d.getDate());
  }
  function _cdLunarToSolar(year,lmonth,lday,leap){
    try{
      var r=solarLunar.lunar2solar(year,lmonth,lday,!!leap);
      if(!r||typeof r!=='object') return null;
      if(r.cYear===-1||r.cMonth===-1||!r.cYear) return null;
      return r.cYear+'-'+_cdPad(r.cMonth)+'-'+_cdPad(r.cDay);
    }catch(e){ return null; }
  }
  /* 求出下一次发生的公历日期（>= today）；返回 null 表示已过且不会再来 */
  function _cdNextOccur(item, today){
    today=today||isoDate();
    var y0=Number(today.slice(0,4));
    if(item.type==='lunar'){
      var m=Number(String(item.date).slice(5,7)), d=Number(String(item.date).slice(8,10));
      for(var k=0;k<3;k++){
        var out=_cdLunarToSolar(y0+k,m,d,item.leap);
        if(out && out>=today) return out;
      }
      return null;
    }
    if(item.repeat===false) return (item.date>=today)?item.date:null;
    var md=String(item.date).slice(5);
    for(var j=0;j<3;j++){
      var cand=(y0+j)+'-'+md;
      if(cand>=today) return cand;
    }
    return null;
  }
  /* 内置节日清单（已经算好下一次日期） */
  function _cdBuiltin(today){
    today=today||isoDate();
    var y0=Number(today.slice(0,4)), out=[];
    CD_SOLAR_FESTIVALS.forEach(function(f){
      var n=_cdNextOccur({type:'solar',date:y0+'-'+f[1],repeat:true}, today);
      if(n) out.push({name:f[0],type:'solar',next:n});
    });
    CD_LUNAR_FESTIVALS.forEach(function(f){
      var n=_cdNextOccur({type:'lunar',date:'0001-'+_cdPad(f[1])+'-'+_cdPad(f[2]),repeat:true}, today);
      if(!n && f[2]===30){ n=_cdNextOccur({type:'lunar',date:'0001-12-29',repeat:true}, today); }  /* 腊月没三十的年份用廿九 */
      if(n) out.push({name:f[0],type:'lunar',next:n});
    });
    CD_NTH_FESTIVALS.forEach(function(f){
      for(var k=0;k<2;k++){
        var cand=_cdNthWeekday(y0+k,f[1],f[2],f[3]);
        if(cand>=today){ out.push({name:f[0],type:'solar',next:cand}); return; }
      }
    });
    return out;
  }
  function _cdDateNote(item){
    if(item.type==='lunar'){
      var m=Number(String(item.date).slice(5,7)), d=Number(String(item.date).slice(8,10));
      return '农历'+(item.leap?'闰':'')+CD_LMONTHS[m-1]+CD_LDAYS[d-1];
    }
    return '公历 '+Number(String(item.date).slice(5,7))+'月'+Number(String(item.date).slice(8,10))+'日';
  }
  function _cdWeekday(dstr){ return CD_WEEKDAYS[new Date(dstr+'T00:00:00').getDay()]; }

  /* ---- 同步：独立 meta key，按 id 做 LWW + 墓碑删除，避免 settings 快照超限 ---- */
  var META_COUNTDOWN_KEY='richangji:countdown';
  function _cdList(){ return Array.isArray(state.settings.countdowns)?state.settings.countdowns:[]; }
  function _cdSetList(list){
    state.settings.countdowns=list;
    state.settings.countdownsAt=Date.now();
    try{ saveStateQuiet(); }catch(e){}
  }
  function countdownPush(){
    writeMetaValue(META_COUNTDOWN_KEY, JSON.stringify({
      updatedAt:Number(state.settings.countdownsAt||Date.now()),
      list:_cdList(),
      deleted:state.settings.deletedCountdownIds||[]
    }), function(){});
  }
  function _cdMergeList(local, remote, remoteTomb){
    var map={}, tombs={}, i, changed=false;
    (state.settings.deletedCountdownIds||[]).forEach(function(x){ tombs[x]=1; });
    (remoteTomb||[]).forEach(function(x){ if(x && !tombs[x]){ tombs[x]=1; changed=true; } });
    (local||[]).forEach(function(x){ if(x&&x.id&&!tombs[x.id]) map[x.id]=x; });
    (remote||[]).forEach(function(x){
      if(!x||!x.id||tombs[x.id]) return;
      var a=map[x.id];
      if(!a){ map[x.id]=x; changed=true; }
      else if(Number(x.updatedAt||0)>Number(a.updatedAt||0)){ map[x.id]=x; changed=true; }
    });
    return {list:Object.keys(map).map(function(k){ return map[k]; }), deleted:Object.keys(tombs), changed:changed};
  }
  function countdownPull(cb){
    readMetaValue(META_COUNTDOWN_KEY, function(v){
      if(v && Array.isArray(v.list)){
        var r=_cdMergeList(_cdList(), v.list, v.deleted);
        if(r.changed){
          state.settings.countdowns=r.list;
          state.settings.deletedCountdownIds=r.deleted;
          state.settings.countdownsAt=Math.max(Number(state.settings.countdownsAt||0), Number(v.updatedAt||0));
          try{ saveStateQuiet(); }catch(e){}
          try{ renderCountdown(); }catch(e){}
        }
      }
      if(cb) cb(v || null);
    });
  }
  function addCountdown(data){
    var list=_cdList();
    var name=String(data.name||'').trim();
    if(!name){ toast('请填写名称'); return false; }
    var item={
      id:uid(), name:name, type:(data.type==='lunar'?'lunar':'solar'),
      date:data.date, leap:!!data.leap, repeat:data.repeat!==false,
      note:String(data.note||'').trim(), updatedAt:Date.now()
    };
    if(!_cdNextOccur(item)){ toast('这个日期已经过去了'); return false; }
    list.push(item);
    _cdSetList(list);
    countdownPush();
    renderCountdown();
    return true;
  }
  function deleteCountdown(id){
    var list=_cdList().filter(function(x){ return x.id!==id; });
    state.settings.deletedCountdownIds=(state.settings.deletedCountdownIds||[]).concat([id]);
    _cdSetList(list);
    countdownPush();
    renderCountdown();
  }

  /* ---- 渲染 ---- */
  var _cdSource='all';
  function renderCountdown(){
    var el=document.getElementById('countdownList'); if(!el) return;
    var today=isoDate();
    var rows=[];
    _cdBuiltin(today).forEach(function(b){ rows.push({builtin:true,name:b.name,type:b.type,next:b.next,note:''}); });
    _cdList().forEach(function(c){
      var n=_cdNextOccur(c, today);
      if(!n) return;
      rows.push({builtin:false,id:c.id,name:c.name,type:c.type,next:n,note:c.note||'',item:c});
    });
    rows.sort(function(a,b){ return (_cdDaysTo(a.next)-_cdDaysTo(b.next)) || a.name.localeCompare(b.name); });
    var view = (_cdSource==='all') ? rows : rows.filter(function(x){ return _cdSource==='builtin' ? x.builtin : !x.builtin; });
    document.querySelectorAll('#cdSourceFilter button').forEach(function(b){ b.classList.toggle('active', b.dataset.cdSrc===_cdSource); });

    var heroEl=document.getElementById('cdHero');
    if(heroEl){
      var first=rows[0];
      heroEl.innerHTML = first
        ? '<div class="cd-hero-item"><span class="cd-hero-lab">最近的一个日子</span><strong>'+escapeHtml(first.name)+'</strong><span class="cd-hero-days">'+
          (_cdDaysTo(first.next)===0?'就是今天':('还有 '+_cdDaysTo(first.next)+' 天'))+
          '</span><small>'+first.next+' '+_cdWeekday(first.next)+(first.type==='lunar'&&first.item?' · '+_cdDateNote(first.item):(first.item?' · '+_cdDateNote(first.item):''))+'</small></div>'
        : '<div class="ov-empty">暂时没有倒数日</div>';
    }
    if(!view.length){
      el.innerHTML=empty(_cdSource==='custom'?'你还没有添加自定义倒数日':'没有符合条件的倒数日');
      return;
    }
    el.innerHTML=view.map(function(x){
      var days=_cdDaysTo(x.next);
      var tag=x.type==='lunar'?'农历':'公历';
      var note=x.item?_cdDateNote(x.item):(tag==='农历'?'农历节日':'公历节日');
      return '<div class="cd-row'+(days<=7?' near':'')+'">'+
        '<span class="cd-days"><b>'+days+'</b><small>天</small></span>'+
        '<span class="cd-main"><strong>'+escapeHtml(x.name)+'</strong>'+
        '<small>'+x.next+' '+_cdWeekday(x.next)+' · '+escapeHtml(note)+(x.note?' · '+escapeHtml(x.note):'')+'</small></span>'+
        '<span class="cd-tag">'+tag+'</span>'+
        (x.builtin?'':'<button class="delete-btn" data-action="del-countdown" data-id="'+x.id+'" aria-label="删除">'+icon('i-trash')+'</button>')+
        '</div>';
    }).join('');
  }
""" .replace("LUNAR_LIB_PLACEHOLDER", lib)

OLD = "  function renderAll(){try{ rolloverWeeklyPlan(); }catch(e){}\n"
NEW = JS + "\n" + OLD
n = s.count(OLD)
if n != 1:
    print("FAIL[anchor renderAll] count=%d" % n); sys.exit(1)
s = s.replace(OLD, NEW, 1)
print("OK  [1 农历库 + 倒数日逻辑]")

OLD = "    _safeRender('archive', renderArchive);"
NEW = "    _safeRender('archive', renderArchive);\n    _safeRender('countdown', renderCountdown);"
n = s.count(OLD)
if n != 1:
    print("FAIL[anchor renderAll body] count=%d" % n); sys.exit(1)
s = s.replace(OLD, NEW, 1)
print("OK  [2 renderAll 挂载]")

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("written: %d -> %d" % (orig_len, len(s)))
