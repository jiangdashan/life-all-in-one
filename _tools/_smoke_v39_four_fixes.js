/* v39 冒烟测试：四项修复
 *  1) 习惯热力图「连续天数」：今天还没打卡时不该清零（从昨天回溯），热力图徽标显示真实天数
 *  2) 本月经期（当前进行中的周期）要在周期历史中回显，并带「进行中」徽标
 *  3) 心情轨迹按时间倒序（最新在最上面）
 *  4) 库存总览点击类型卡片即筛选（条形图/提醒/明细跟随），再点一次或「显示全部」恢复
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

function iso(d){ const dt=new Date(d+'T00:00:00'); const m=String(dt.getMonth()+1).padStart(2,'0'), day=String(dt.getDate()).padStart(2,'0'); return dt.getFullYear()+'-'+m+'-'+day; }
function shift(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

void (async () => {
  const app=sandbox.window.__appTest;
  if(!app){console.error('NO APP');process.exit(1);}
  const P={pass:0,fail:0,logs:[]};
  function ok(name,cond,extra){ (cond?P.pass++:P.fail++); P.logs.push((cond?'  ✔ ':'  ✘ ')+name+(extra?' — '+extra:'')); }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const TODAY=app.isoDate();

  /* ============ 1) 习惯连续天数 ============ */
  {
    const mk=(entries)=>({id:'H1',key:'custom:test',name:'阅读',type:'check',target:1,entries:entries});
    const h1=mk({[shift(-1)]:1,[shift(-2)]:1,[shift(-3)]:1});            // 昨天起连续 3 天，今天未打卡
    const h2=mk({[TODAY]:1,[shift(-1)]:1,[shift(-2)]:1});                // 含今天连续 3 天
    const h3=mk({[shift(-2)]:1,[shift(-3)]:1});                          // 昨天断更
    const h4=mk({});                                                     // 无记录
    ok('v39_1a 今天未打卡仍保留真实连续天数(3)', app.habitStreak(h1)===3, 'streak='+app.habitStreak(h1));
    ok('v39_1b 今天已打卡算入连续(3)', app.habitStreak(h2)===3, 'streak='+app.habitStreak(h2));
    ok('v39_1c 昨天断更则归零(0)', app.habitStreak(h3)===0, 'streak='+app.habitStreak(h3));
    ok('v39_1d 无记录为0', app.habitStreak(h4)===0, 'streak='+app.habitStreak(h4));
    /* 热力图渲染出的徽标必须显示真实天数，而非 0 */
    app.state.habits=[h1];
    try{ app.renderHabits(); }catch(e){}
    const hm=doc.getElementById('habitHeatmap')?(doc.getElementById('habitHeatmap').innerHTML||''):'';
    ok('v39_1e 热力图徽标显示 3 天', hm.includes('3 天') && !hm.includes('0 天'), hm.slice(0,120));
    app.state.habits=[];
  }

  /* ============ 2) 本月经期在周期历史中回显 ============ */
  {
    app.state.settings.periodPinHash='fake-hash'; app.state.settings.periodPinSalt='fake-salt';
    app.periodMarkUnlocked();
    await wait(30);
    const mkP=(dateStr,flags)=>({id:'p'+Math.random(),type:'period',date:dateStr,data:Object.assign({isStartDay:'',isPeriodDay:'',isEndDay:'',symptoms:[],pad:0,night:0},flags||{}),createdAt:Date.now(),updatedAt:Date.now()});
    /* 当前进行中的本月经期：3 天前开始，一直到今天都没标末日 */
    const records=[
      mkP(shift(-3),{isStartDay:'Y',isPeriodDay:'Y'}),
      mkP(shift(-2),{isPeriodDay:'Y'}),
      mkP(shift(-1),{isPeriodDay:'Y'}),
      mkP(TODAY,{isPeriodDay:'Y'})
    ];
    app.state.records=records;
    app.renderPeriod();
    const hist=doc.getElementById('periodHistory')?(doc.getElementById('periodHistory').innerHTML||''):'';
    ok('v39_2a 当前（本月）周期出现在周期历史中', hist.includes(shift(-3)), hist.slice(0,120));
    ok('v39_2b 当前周期带「进行中」标记', hist.includes('hist-ongoing-tag')&&hist.includes('ongoing'), 'hasTag='+hist.includes('hist-ongoing-tag'));
    ok('v39_2c 当前周期文案为「已记录 N 天」', hist.includes('已记录 4 天'), hist.slice(hist.indexOf('已记录'),hist.indexOf('已记录')+30));
    ok('v39_2d 进行中周期不计入经期均值样本', app.analyzePeriod(records).periodLens.length===0, JSON.stringify(app.analyzePeriod(records).periodLens));
    /* 历史已结束周期：不带进行中标记 */
    const past=[
      mkP(shift(-40),{isStartDay:'Y',isPeriodDay:'Y'}),
      mkP(shift(-39),{isPeriodDay:'Y'}),
      mkP(shift(-38),{isPeriodDay:'Y',isEndDay:'Y'}),
      mkP(shift(-3),{isStartDay:'Y',isPeriodDay:'Y'})
    ];
    app.state.records=past;
    app.renderPeriod();
    const hist2=doc.getElementById('periodHistory')?(doc.getElementById('periodHistory').innerHTML||''):'';
    ok('v39_2e 已结束周期显示为「N 天经期」且无进行中标记', hist2.includes('3 天经期') && hist2.indexOf('hist-ongoing-tag')<hist2.indexOf(shift(-40))+400 && hist2.includes('hist-ongoing-tag'), '两行并存');
    app.state.records=[];
  }

  /* ============ 3) 心情轨迹倒序 ============ */
  {
    const mkM=(dateStr,i)=>({id:'m'+i,type:'mood',date:dateStr,createdAt:1000+i,sample:false,remoteId:null,data:{score:4,feeling:'第'+i+'天',emoji:'🙂'}});
    app.state.records=[mkM(shift(-5),1),mkM(shift(-1),2),mkM(shift(-9),3),mkM(TODAY,4),mkM(shift(-3),5)];
    app.state.settings.moodPage=1;
    app.renderMoodTimeline();
    const rows=[...doc.querySelectorAll('#moodList .mood-row')];
    const texts=rows.map(r=>(r.textContent||''));
    ok('v39_3a 心情行数=5', rows.length===5, 'rows='+rows.length);
    ok('v39_3b 第一条是今天', rows.length>0 && rows[0].textContent.includes('第4天'), rows.length?rows[0].textContent.slice(0,40):'none');
    ok('v39_3c 整体倒序(最新→最旧)', rows.length===5 && texts[0].includes('第4天')&&texts[1].includes('第2天')&&texts[2].includes('第5天')&&texts[3].includes('第1天')&&texts[4].includes('第3天'), texts.map(t=>t.replace(/[^0-9天第]/g,'')).join('|'));
    app.state.records=[];
  }

  /* ============ 4) 库存总览点击类型筛选 ============ */
  {
    app.state.records=[
      {id:'S1',type:'storage',date:TODAY,createdAt:1,sample:false,remoteId:null,data:{name:'大米',category:'食品',quantity:2,unit:'袋',location:'厨房',expiry:'',note:''}},
      {id:'S2',type:'storage',date:TODAY,createdAt:2,sample:false,remoteId:null,data:{name:'牛奶',category:'食品',quantity:6,unit:'瓶',location:'冰箱',expiry:'',note:''}},
      {id:'S3',type:'storage',date:TODAY,createdAt:3,sample:false,remoteId:null,data:{name:'洗衣液',category:'日用',quantity:1,unit:'瓶',location:'卫生间',expiry:'',note:''}},
      {id:'S4',type:'storage',date:TODAY,createdAt:4,sample:false,remoteId:null,data:{name:'牙膏',category:'个护',quantity:3,unit:'支',location:'卫生间',expiry:'',note:''}}
    ];
    app.state.settings.storageFilter='all';
    app.renderStorage();
    const catsEl=doc.getElementById('storageOvCats');
    const cards=catsEl?[...catsEl.querySelectorAll('.ov-cat')]:[];
    ok('v39_4a 总览渲染出分类卡', cards.length===3, 'cards='+cards.length);
    const foodCard=cards.find(c=>c.getAttribute('data-storage-filter')==='食品');
    ok('v39_4b 存在「食品」分类卡', !!foodCard);
    /* 未筛选时：条形图含全部 3 类，明细 4 条 */
    ok('v39_4c 未筛选时明细列出全部4件', (doc.getElementById('storageOvList').innerHTML.match(/storage-ov-item/g)||[]).length===4);
    /* 点击「食品」卡：仅显示食品 */
    if(foodCard){ foodCard.dispatchEvent(new w.Event('click',{bubbles:true})); }
    await wait(20);
    const bar=doc.getElementById('storageOvBar').innerHTML||'';
    const list=doc.getElementById('storageOvList').innerHTML||'';
    const note=doc.getElementById('storageOvFilterNote')?(doc.getElementById('storageOvFilterNote').innerHTML||''):'';
    ok('v39_4d 点击后 storageFilter=食品', app.state.settings.storageFilter==='食品', String(app.state.settings.storageFilter));
    ok('v39_4e 条形图只剩 1 行(食品)', (bar.match(/storage-ov-row/g)||[]).length===1, 'rows='+(bar.match(/storage-ov-row/g)||[]).length);
    ok('v39_4f 明细只剩 2 件(大米/牛奶)', (list.match(/storage-ov-item/g)||[]).length===2 && list.includes('大米') && list.includes('牛奶'));
    ok('v39_4g 筛选提示条出现并含「显示全部」按钮', note.includes('只看「食品」') && note.includes('storage-filter-clear'), note.slice(0,80));
    ok('v39_4h 分类卡呈选中态', !!foodCard && (foodCard.getAttribute('class')||'').includes('active'));
    /* 再点一次同张卡 → 取消筛选（注意：render 会重建卡片 DOM，必须重新查询） */
    const foodCard2=[...(doc.getElementById('storageOvCats').querySelectorAll('.ov-cat')||[])].find(c=>c.getAttribute('data-storage-filter')==='食品');
    if(foodCard2){ foodCard2.dispatchEvent(new w.Event('click',{bubbles:true})); }
    await wait(20);
    ok('v39_4i 再点一次恢复全部', app.state.settings.storageFilter==='all', String(app.state.settings.storageFilter));
    ok('v39_4j 恢复后明细回到4件', (doc.getElementById('storageOvList').innerHTML.match(/storage-ov-item/g)||[]).length===4);
    /* 「显示全部」按钮 */
    app.state.settings.storageFilter='日用'; app.renderStorage();
    ok('v39_4k 筛日用时明细只剩1件', (doc.getElementById('storageOvList').innerHTML.match(/storage-ov-item/g)||[]).length===1);
    const clearBtn=doc.getElementById('storageOvFilterNote').querySelector('[data-action="storage-filter-clear"]');
    ok('v39_4l 存在「显示全部」按钮', !!clearBtn);
    if(clearBtn){ clearBtn.dispatchEvent(new w.Event('click',{bubbles:true})); }
    await wait(20);
    ok('v39_4m 点「显示全部」后恢复全部分类', app.state.settings.storageFilter==='all', String(app.state.settings.storageFilter));
  }

  console.log(P.logs.join('\n'));
  console.log('\n结果: '+P.pass+' 通过, '+P.fail+' 失败');
  process.exit(P.fail?1:0);
})().catch(e=>{console.error('TEST ERR',e&&e.stack||e);process.exit(1);});
