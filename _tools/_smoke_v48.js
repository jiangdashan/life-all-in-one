/* v48 冒烟测试：
 *  1) 热力图表头天数与列对齐（最后一列=今天=今，其余 5 的倍数）
 *  2) AI 菜谱推荐 >= 10 道（含加餐时段）
 *  3) 心情页顶部三个小指标模块已移除
 *  4) 心情月历点击日期展示表情+文字
 *  5) 物品库存使用频率排行
 *  6) 书影音搜索过滤
 *  7) 睡眠模块：记录/统计/分析/日周年切换
 */
const LINKEDOM='C:/Users/依易亦奕鸭/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const {parseHTML}=require(LINKEDOM);
const fs=require('fs'); const vm=require('vm');
const html=fs.readFileSync('D:/workbuddyProjects/工作台3/life-all-in-one.html','utf8');
const lines=html.split('\n');
let oi=-1,ci=-1;
for(let i=0;i<lines.length;i++){ if(/<script[^>]*>/.test(lines[i])&&!/<script[^>]+src=/.test(lines[i])){oi=i;break;} }
for(let i=oi+1;i<lines.length;i++){ if(/<\/script>/.test(lines[i])){ci=i;break;} }
const src=lines.slice(oi+1,ci).join('\n');
function mkStorage(){const d={};return{_d:d,getItem:k=>k in d?d[k]:null,setItem:(k,v)=>{d[k]=String(v);},removeItem:k=>{delete d[k];},clear(){for(const k in d)delete d[k];},key:i=>Object.keys(d)[i]??null,get length(){return Object.keys(d).length;}};}
const storage=mkStorage();
const full=parseHTML(html); const w=full.window, doc=w.document;
const _origGetById=doc.getElementById.bind(doc);
function mkDummySelect(){ return {value:'',textContent:'',innerHTML:'',style:{},hidden:false,disabled:false,classList:{add(){},remove(){},toggle(){},contains:()=>false},addEventListener(){},removeEventListener(){},setAttribute(){},getAttribute:()=>null,querySelectorAll:()=>[],appendChild(){},closest:()=>null,options:[],selectedIndex:-1}; }
doc.getElementById=function(id){ if(id==='mediaStatusFilter'||id==='mediaRatingFilter') return mkDummySelect(); return _origGetById(id); };
w.scrollTo=()=>{}; w.__TESTING__=true;
const _session={};w.sessionStorage={getItem:k=>k in _session?_session[k]:null,setItem:(k,v)=>{_session[k]=String(v);},removeItem:k=>{delete _session[k];},clear(){for(const k in _session)delete _session[k];},key:i=>Object.keys(_session)[i]??null,get length(){return Object.keys(_session).length;}};
if(typeof w.matchMedia!=='function')w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
if(typeof w.requestAnimationFrame!=='function'){w.requestAnimationFrame=cb=>setTimeout(cb,0);w.cancelAnimationFrame=clearTimeout;}
w.URL.createObjectURL=w.URL.createObjectURL||(()=>'blob:x'); w.URL.revokeObjectURL=w.URL.revokeObjectURL||(()=>{});
w.alert=()=>{}; w.confirm=()=>true; w.prompt=()=>null;
try{w.localStorage=storage;}catch(e){}
if(!w.Image)w.Image=function(){};
try{Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')),'elements',{get(){return this.querySelectorAll('[name]');}});}catch(e){}
w.FormData=class{constructor(f){this._f=f;this._m=new Map();if(f){const els=f.querySelectorAll('[name]');for(const el of els){const t=(el.type||'').toLowerCase();if(t==='radio'){if(el.checked)this._m.set(el.name,el.value);}else if(t==='checkbox'){if(el.checked)this._m.set(el.name,'on');}else{this._m.set(el.name,el.value||'');}}}}get(k){return this._m.has(k)?this._m.get(k):null;}entries(){return [...this._m.entries()];}};
w.Event=class{constructor(t,o){this.type=t;this.bubbles=!!(o&&o.bubbles);this.cancelable=!!(o&&o.cancelable);}};
const _fake={records:{}};
w.__SMART_PAGE__={database:{query:async function({databaseId,pageSize,startCursor}){const arr=_fake.records[databaseId]||[];const start=startCursor?parseInt(startCursor,10)||0:0;const slice=arr.slice(start,start+pageSize);const next=start+pageSize<arr.length?String(start+pageSize):null;return {results:slice,hasMore:!!next,nextCursor:next};},addRecord:async()=>({_id:'r'}),updateRecord:async()=>({}),deleteRecord:async()=>({}),getSchema:async()=>({properties:[]})}};
const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:w.FormData,__SMART_PAGE__:w.__SMART_PAGE__,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new w.URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:()=>{}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{}};
sandbox.globalThis=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox);
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){console.error('SCRIPT ERR',e&&e.stack||e);process.exit(1);}
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){}

void (async () => {
  const app=sandbox.window.__appTest;
  if(!app){console.error('NO APP');process.exit(1);}
  const P={pass:0,fail:0,logs:[]};
  function ok(name,cond,extra){ (cond?P.pass++:P.fail++); P.logs.push((cond?'  ✔ ':'  ✘ ')+name+(extra?' — '+extra:'')); }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  await wait(30);

  const iso=app.isoDate();

  /* ---- 1) 热力图表头 ---- */
  app.state.habits=[{id:'h1',name:'喝水',type:'counter',target:1,unit:'杯',entries:{[iso]:1},createdAt:Date.now()}];
  try{ app.renderHabits(); }catch(e){ P.logs.push('  ✘ renderHabits 抛错: '+e.message); P.fail++; }
  const hm=doc.getElementById('habitHeatmap');
  const hdr=hm?hm.querySelector('.heatmap-header'):null;
  const spans=hdr?Array.from(hdr.querySelectorAll('span')):[];
  ok('1a 表头 31 个格子(1 名称+30 天)', spans.length===31, 'got '+spans.length);
  const last=spans[30]?spans[30].textContent.trim():'';
  ok('1b 最后一列(今天)标记为「今」', last==='今', 'got "'+last+'"');
  const nums=spans.slice(1).map((s,i)=>({i,t:s.textContent.trim()})).filter(x=>x.t);
  const expected=nums.every(x=>{const ago=29-x.i; return (x.t==='今'&&ago===0)||(x.t===String(ago)&&ago%5===0);});
  ok('1c 每个标注值 = 该列真实距今天数', expected, JSON.stringify(nums.map(x=>x.i+':'+x.t)));
  ok('1d 标注间隔为 5 列', nums.every(x=>(29-x.i)%5===0), '');

  /* ---- 2) AI 菜谱 ---- */
  const card=doc.getElementById('dietAIRecipe');
  try{ app.renderDietAI(1200); }catch(e){ P.logs.push('  ✘ renderDietAI 抛错: '+e.message); P.fail++; }
  const recipeCount=(card.innerHTML.match(/class="recipe-suggestion/g)||[]).length;
  ok('2a 当前时段推荐 >= 10 道', recipeCount>=10, 'got '+recipeCount);
  /* 菜谱库每餐都应有 >=10 道（源码级断言，覆盖加餐等所有时段） */
  for(const meal of ['早餐','午餐','晚餐','加餐']){
    const n=(html.match(new RegExp("meal:'"+meal+"'",'g'))||[]).length;
    ok('2b 菜谱库 '+meal+' >= 10 道', n>=10, 'got '+n);
  }

  /* ---- 3) 心情顶部三模块移除 ---- */
  ok('3a moodToday 元素已移除', !doc.getElementById('moodToday'));
  ok('3b moodWeekAvg 元素已移除', !doc.getElementById('moodWeekAvg'));
  ok('3c moodTotal 元素已移除', !doc.getElementById('moodTotal'));
  let moodErr=null;
  try{ app.renderMood(); }catch(e){ moodErr=e.message; }
  ok('3d renderMood 不再抛错', !moodErr, moodErr||'');

  /* ---- 4) 心情月历点击 ---- */
  app.state.records=app.state.records.filter(r=>r.type!=='mood');
  app.state.records.push({id:'m1',type:'mood',date:iso,createdAt:Date.now(),data:{score:5,tag:'开心',emoji:'😄',feeling:'今天很棒'}});
  try{ app.renderMoodCalendar(); }catch(e){ P.logs.push('  ✘ renderMoodCalendar 抛错: '+e.message); P.fail++; }
  const cal=doc.getElementById('moodCalendar');
  const cell=cal?cal.querySelector('.cal-cell[data-action="mood-day"][data-date2="'+iso+'"]'):null;
  ok('4a 今天的格子可点击', !!cell, cell?'':'not found');
  if(cell){
    const ev=new w.Event('click',{bubbles:true});
    cell.dispatchEvent(ev);
    await wait(10);
    const det=doc.getElementById('moodDayDetail');
    const txt=det?det.textContent:'';
    ok('4b 详情展示表情', txt.indexOf('😄')>=0, txt.slice(0,60));
    ok('4c 详情展示文字记录', txt.indexOf('今天很棒')>=0, txt.slice(0,80));
  } else { P.fail+=2; }

  /* ---- 5) 库存使用频率 ---- */
  app.state.records=app.state.records.filter(r=>r.type!=='storage');
  app.state.records.push({id:'s1',type:'storage',date:iso,createdAt:Date.now(),data:{name:'洗衣液',category:'清洁',quantity:5,unit:'瓶'}});
  app.state.records.push({id:'s2',type:'storage',date:iso,createdAt:Date.now(),data:{name:'大米',category:'食品',quantity:2,unit:'袋'}});
  app.state.settings.storageUsage={};
  app._bumpUsage('s1',1); app._bumpUsage('s1',1); app._bumpUsage('s1',1);
  app._bumpUsage('s2',1);
  try{ app.renderStorage(); }catch(e){ P.logs.push('  ✘ renderStorage 抛错: '+e.message); P.fail++; }
  const freq=doc.getElementById('storageFreqList');
  const frows=freq?freq.querySelectorAll('.freq-row').length:0;
  ok('5a 排行渲染出记录', frows===2, 'rows='+frows);
  const first=freq?freq.querySelector('.freq-row .freq-name strong'):null;
  ok('5b 洗衣液(3 次)排第一', first&&first.textContent.indexOf('洗衣液')>=0, first?first.textContent:'');
  ok('5c 排行含「次/月」频次', freq&&freq.textContent.indexOf('次/月')>=0, '');

  /* ---- 6) 书影音搜索 ---- */
  app.state.mediaItems=[
    {id:'x1',name:'海洋奇缘2',type:'电影',status:'看完',rating:5,review:'很好看',date:iso},
    {id:'x2',name:'三体',type:'书',status:'在看',rating:4,review:'硬核',date:iso}
  ];
  app.state.settings.mediaPage=1; app.state.settings.mediaPageSize=12;
  sandbox.window.__appTest.state.settings.mediaTypeFilter='all';
  try{ app.renderMedia(); }catch(e){ P.logs.push('  ✘ renderMedia 抛错: '+e.message); P.fail++; }
  const col=doc.getElementById('mediaCollection');
  ok('6a 未搜索时 2 条', col.querySelectorAll('.media-card').length===2, 'n='+col.querySelectorAll('.media-card').length);
  const si=doc.getElementById('mediaSearchInput');
  ok('6b 搜索框存在', !!si);
  if(si){
    si.value='三体';
    si.dispatchEvent(new w.Event('input',{bubbles:true}));
    await wait(10);
    ok('6c 搜索「三体」只剩 1 条', col.querySelectorAll('.media-card').length===1, 'n='+col.querySelectorAll('.media-card').length);
    si.value='硬核';
    si.dispatchEvent(new w.Event('input',{bubbles:true}));
    await wait(10);
    ok('6d 可按短评搜索', col.querySelectorAll('.media-card').length===1, 'n='+col.querySelectorAll('.media-card').length);
    si.value='不存在xyz';
    si.dispatchEvent(new w.Event('input',{bubbles:true}));
    await wait(10);
    ok('6e 无匹配时显示提示', col.textContent.indexOf('没有匹配')>=0, col.textContent.slice(0,50));
    si.value='';
    si.dispatchEvent(new w.Event('input',{bubbles:true}));
    await wait(10);
  }

  /* ---- 7) 睡眠模块 ---- */
  ok('7a 睡眠视图存在', !!doc.getElementById('view-sleep'));
  ok('7b 桌面导航有睡眠', !!doc.querySelector('.side-nav [data-nav="sleep"]'));
  ok('7c 手机导航有睡眠', !!doc.querySelector('.mobile-nav [data-nav="sleep"]'));
  ok('7d 归档有睡眠筛选', !!doc.querySelector('#archiveFilters [data-filter="sleep"]'));

  const m1=app._sleepMetrics({data:{bedtime:'23:00',wake:'07:00',deep:90,light:240,rem:100,awake:30,nap:20}});
  ok('7e 卧床时长跨午夜=480', m1.inBed===480, 'got '+m1.inBed);
  ok('7f 实际睡眠=430', m1.asleep===430, 'got '+m1.asleep);
  ok('7g 效率正确', Math.abs(m1.eff-89.6)<0.5, 'got '+m1.eff.toFixed(1));
  ok('7h 评分为 0-100', m1.score>=0&&m1.score<=100, 'got '+m1.score);

  app.state.records=app.state.records.filter(r=>r.type!=='sleep');
  for(let i=0;i<3;i++){
    app.state.records.push({id:'sl'+i,type:'sleep',date:app.isoDate(),createdAt:Date.now()+i,
      data:{bedtime:'23:30',wake:'07:00',deep:80,light:230,rem:90,awake:25,nap:i*20,note:''}});
  }
  app.state.settings.sleepRange='week';
  try{ app.renderSleep(); }catch(e){ P.logs.push('  ✘ renderSleep 抛错: '+e.message+'\n'+e.stack); P.fail++; }
  ok('7i 指标卡渲染 9 个', (doc.getElementById('sleepMetrics').querySelectorAll('.sleep-metric')||[]).length===9,
     'n='+doc.getElementById('sleepMetrics').querySelectorAll('.sleep-metric').length);
  ok('7j 记录列表 3 条', doc.getElementById('sleepList').querySelectorAll('.sleep-row').length===3,
     'n='+doc.getElementById('sleepList').querySelectorAll('.sleep-row').length);
  ok('7k 阶段占比条渲染', doc.getElementById('sleepStack').innerHTML.indexOf('sleep-stack')>=0);
  ok('7l 图表有柱子', doc.getElementById('sleepChart').querySelectorAll('.sleep-bar').length>0,
     'n='+doc.getElementById('sleepChart').querySelectorAll('.sleep-bar').length);
  const adv=doc.getElementById('sleepAdvice').textContent;
  ok('7m 给出分析与建议', adv.length>10, adv.slice(0,60));

  for(const rg of ['day','month','year']){
    app.state.settings.sleepRange=rg;
    let err=null;
    try{ app.renderSleep(); }catch(e){ err=e.message; }
    ok('7n 切换到'+rg+'不抛错且出图', !err && doc.getElementById('sleepChart').querySelectorAll('.sleep-bar').length>0, err||'');
  }
  ok('7o 归档时间轴含睡眠', app._buildTimelineEvents().some(e=>e.type==='sleep'));

  console.log(P.logs.join('\n'));
  console.log('\n结果: '+P.pass+' 通过 / '+P.fail+' 失败');
  process.exit(P.fail?1:0);
})();
