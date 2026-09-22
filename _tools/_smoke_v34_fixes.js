/* v34 冒烟测试：
 * 1) analyzePeriod 空经期 → nextPredicted=null（清空重录后不臆造）
 * 2) clearPeriodHistoryLocal 清空本机经期；pullAllRemote 经期清空标记裁剪本地，防止并集复活
 * 3) mergeShopping/mergeStorage 按 remoteId 保留本地真实 date/createdAt（不再每次写 today）
 * 4) _buildTimelineEvents 不再输出 home/storage（待买/物品不进时间轴）
 * 5) renderDiet 改为 date-card 永不折叠（含同日多餐、多天）
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
function mkStorage(){const d={};return{_d:d,getItem:k=>k in d?d[k]:null,setItem:(k,v)=>{d[k]=String(v);},removeItem:k=>{delete d[k];},clear(){for(const k in d)delete d[k];},key:i=>Object.keys(d)[i]??null,get length(){return Object.keys(d).length;}};};
const storage=mkStorage();
const full=parseHTML(html); const w=full.window, doc=w.document;
w.scrollTo=()=>{}; w.__TESTING__=true;
const _session={};w.sessionStorage={getItem:k=>k in _session?_session[k]:null,setItem:(k,v)=>{_session[k]=String(v);},removeItem:k=>{delete _session[k];},clear(){for(const k in _session)delete _session[k];},key:i=>Object.keys(_session)[i]??null,get length(){return Object.keys(_session).length;}};
if(typeof w.matchMedia!=='function')w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
if(typeof w.requestAnimationFrame!=='function'){w.requestAnimationFrame=cb=>setTimeout(cb,0);w.cancelAnimationFrame=clearTimeout;}
w.URL.createObjectURL=w.URL.createObjectURL||(()=>'blob:x'); w.URL.revokeObjectURL=w.URL.revokeObjectURL||(()=>{});
w.alert=()=>{}; w.confirm=()=>true; w.prompt=()=>null;
try{w.localStorage=storage;}catch(e){}
if(!w.Image)w.Image=function(){};
try{Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')),'elements',{get(){return this.querySelectorAll('[name]');}});}catch(e){}
w.FormData=class{constructor(f){this._f=f;this._m=new Map();if(f){const els=f.querySelectorAll('[name]');for(const el of els){const t=(el.type||'').toLowerCase();if(t==='radio'){if(el.checked)this._m.set(el.name,el.value);}else if(t==='checkbox'){if(el.checked)this._m.set(el.name,'on');}else{this._m.set(el.name,el.value||'');}}}}get(k){return this._m.has(k)?this._m.get(k):null;}entries(){return [...this._m.entries()];}};w.Event=class{constructor(t,o){this.type=t;this.bubbles=!!(o&&o.bubbles);this.cancelable=!!(o&&o.cancelable);}};
w.requestIdleCallback=w.requestIdleCallback||(cb=>setTimeout(cb,0));
const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:w.FormData,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new w.URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:(...a)=>{process.stderr.write('PAGE ERR: '+a.map(x=>x&&x.message?x.message:String(x)).join(' ')+'\n');}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{}};
sandbox.globalThis=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox);
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){console.error('SCRIPT ERR',e&&e.stack||e);process.exit(1);}
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){}

void (async () => {
  const R={}; const app=sandbox.window.__appTest;
  if(!app){console.error('NO APP');process.exit(1);}
  const P={pass:0,fail:0,logs:[]};
  function ok(name,cond,extra){ (cond?P.pass++:P.fail++); P.logs.push((cond?'  ✔ ':'  ✘ ')+name+(extra?' — '+extra:'')); }

  // ---- 1) analyzePeriod 空 => 不预测 ----
  try{
    app.state.records=app.state.records.filter(r=>r.type!=='period');
    const a=app.analyzePeriod([]);
    ok('v34_1 analyzePeriod 空历史 nextPredicted=null', a.nextPredicted===null && !a.lastStart);
  }catch(e){ ok('v34_1 analyzePeriod',false,e.message); }

  // ---- 2) 清空后，被删除的本地经期(带 remoteId)在云空时不会被 mergePeriod 复活 ----
  try{
    // 本地放 3 条旧经期(带 remoteId, createdAt 很久前)
    const old=Date.now()-100000;
    app.state.records=[{id:'p1',type:'period',date:'2026-08-03',remoteId:'X1',createdAt:old,data:{isStartDay:'Y',isPeriodDay:'Y'}},
                       {id:'p2',type:'period',date:'2026-08-04',remoteId:'X2',createdAt:old+1,data:{isPeriodDay:'Y'}},
                       {id:'p3',type:'period',date:'2026-08-06',remoteId:'X3',createdAt:old+2,data:{isEndDay:'Y',isPeriodDay:'Y'}}];
    const cntBefore=app.state.records.filter(r=>r.type==='period').length;
    // 模拟 pullAllRemote 的经期清空：remotePeriodClear=now > local(0) => 裁剪 createdAt<=now 的经期
    const keepP=Date.now();
    app.state.records=app.state.records.filter(r=> r.type!=='period' || Number(r.createdAt||0)>keepP);
    // 云端为空 rows => mergePeriod([]) 不应把已裁剪的旧经期拉回来
    app.mergePeriod([]);
    const cntAfter=app.state.records.filter(r=>r.type==='period').length;
    ok('v34_2 清空标记裁剪后云端空不复活', cntAfter===0, `before=${cntBefore} after=${cntAfter}`);
  }catch(e){ ok('v34_2',false,e.message); }

  // ---- 3) mergeShopping 保留本地真实 date（remoteId 匹配时不写 today） ----
  try{
    app.state.records=[{id:'l1',type:'home',date:'2026-08-10',remoteId:'S1',createdAt:111,data:{name:'A',quantity:'1',category:'食品',price:1,bought:false}}];
    app.mergeShopping([{_id:'S1',"物品名称":'A',"数量":1,"预估价格":1,"是否已买":"待买","备注":""}]);
    const h=app.state.records.filter(r=>r.type==='home');
    ok('v34_3 mergeShopping 保留本地 date', h.length===1 && h[0].date==='2026-08-10', `date=${h[0]&&h[0].date} created=${h[0]&&h[0].createdAt}`);
  }catch(e){ ok('v34_3',false,e.message); }

  // ---- 3b) mergeStorage 保留本地 date ----
  try{
    app.state.records=[{id:'l2',type:'storage',date:'2026-07-01',remoteId:'ST1',createdAt:222,data:{name:'B',category:'日用',quantity:2,unit:'瓶',location:'厨房'}}];
    app.mergeStorage([{_id:'ST1',"物品名称":'B',"分类":"日用","数量":2,"单位":"瓶","存放位置":"厨房","备注":""}]);
    const s=app.state.records.filter(r=>r.type==='storage');
    ok('v34_3b mergeStorage 保留本地 date', s.length===1 && s[0].date==='2026-07-01', `date=${s[0]&&s[0].date}`);
  }catch(e){ ok('v34_3b',false,e.message); }

  // ---- 4) 时间轴不再含 home/storage ----
  try{
    app.state.records=[{id:'m1',type:'money',date:'2026-09-07',createdAt:1,data:{flow:'expense',amount:10,category:'吃饭',note:'x'}},
                       {id:'h1',type:'home',date:'2026-09-07',createdAt:2,data:{name:'待买A'}},
                       {id:'st1',type:'storage',date:'2026-09-07',createdAt:3,data:{name:'库存B'}},
                       {id:'d1',type:'diet',date:'2026-09-07',createdAt:4,data:{meal:'早餐',food:'鸡蛋',calories:100}}];
    const ev=app._buildTimelineEvents ? app._buildTimelineEvents() : null;
    if(!ev){ ok('v34_4 时间轴排除home/storage',false,'无 _buildTimelineEvents'); }
    else {
      const types=ev.map(e=>e.type);
      ok('v34_4 时间轴排除 home/storage', !types.includes('home') && !types.includes('storage') && types.includes('money') && types.includes('diet'), `types=${types.join(',')}`);
    }
  }catch(e){ ok('v34_4',false,e.message); }

  // ---- 5) renderDiet 生成 date-card，同日多餐、多天全部展示 ----
  try{
    app.state.records=[{id:'dd1',type:'diet',date:'2026-09-06',createdAt:1,data:{meal:'早餐',food:'A',calories:100}},
                       {id:'dd2',type:'diet',date:'2026-09-06',createdAt:2,data:{meal:'午餐',food:'B',calories:200}},
                       {id:'dd3',type:'diet',date:'2026-09-06',createdAt:3,data:{meal:'晚餐',food:'C',calories:300}},
                       {id:'dd4',type:'diet',date:'2026-09-06',createdAt:4,data:{meal:'加餐',food:'D',calories:50}},
                       {id:'dd5',type:'diet',date:'2026-09-05',createdAt:5,data:{meal:'早餐',food:'E',calories:80}}];
    if(!app.renderDiet) { ok('v34_5',false,'no renderDiet'); }
    else {
      app.renderDiet();
      const listEl=doc.getElementById('dietList');
      const html2=listEl?listEl.innerHTML:'';
      const cardCount=(html2.match(/class="date-card/g)||[]).length;
      const rowCount=(html2.match(/class="diet-meal-row"/g)||[]).length;
      // date-card 永不折叠：不应出现 details/date-group；同一页(6天容量)两天的5餐都在
      const hasDetails=/<(details|summary)>/.test(html2);
      ok('v34_5 renderDiet date-card 无折叠(details)', cardCount===2 && !hasDetails, `cards=${cardCount} details=${hasDetails} rows=${rowCount}`);
      ok('v34_5 同日4餐+隔日1餐全量展开', rowCount===5, `rows=${rowCount} (expect 5)`);
    }
  }catch(e){ ok('v34_5',false,e.message); }

  console.log('\n==== v34 冒烟结果 ====');
  P.logs.forEach(l=>console.log(l));
  console.log(`PASS ${P.pass} / FAIL ${P.fail}`);
  process.exit(P.fail?1:0);
})();
