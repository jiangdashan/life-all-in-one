/* v42 智能清单分页冒烟测试
 *  1) 默认第 1 页只展示最近 2 个日期分组
 *  2) 分组按日期倒序（最新日期在最前）
 *  3) 每组默认展开（details 带 open 属性）
 *  4) 翻到下一页展示更早的 2 组，且两组互不重复
 *  5) 上一页/下一页边界不可越界禁用生效
 *  6) 只剩 1 页时不渲染分页条
 *  7) 切换筛选后页码自动收敛，不出现空白页
 *  8) 空数据不崩溃并显示占位文案
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

  const listEl=()=>doc.getElementById('plannerList');
  const pagerEl=()=>doc.getElementById('plannerPager');
  const groupDates=()=>Array.from(listEl().querySelectorAll('details.date-group')).map(g=>{
    const sum=g.querySelector('summary strong');
    return sum?sum.textContent.trim():'';
  });

  /* 造 6 天数据：09-20(最早) ... 09-25(最新)，每天 1 条未完成 */
  const days=['2026-09-20','2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25'];
  app.state.records=days.map((d,i)=>({id:'P'+i,type:'planner',date:d,createdAt:100+i,sample:false,remoteId:null,data:{title:'待办'+i,done:false,list:'生活',priority:'normal'}}));
  app.state.settings.plannerFilter='all';
  app.state.settings.plannerPage=1;
  app.renderPlanner();

  // 1) 首页只展示 2 组
  ok('v42_1 第 1 页只展示 2 个日期分组', groupDates().length===2, 'groups='+groupDates().length);

  // 2) 倒序：最新日期在最前（09-25 应在 09-24 前）
  const d1=groupDates();
  const newestFirst = d1.length===2 && (d1[0].indexOf('25')>=0 || /\D25\D|^25|25/.test(d1[0]));
  ok('v42_2 第 1 页最新日期排最前', /25/.test(d1[0])&&/24/.test(d1[1]), '顺序='+d1.join(' | '));

  // 3) 全部展开
  const allOpen=Array.from(listEl().querySelectorAll('details.date-group')).every(g=>g.hasAttribute('open'));
  ok('v42_3 日期分组默认全部展开(open)', allOpen);

  // 4) 下一页 = 更早的 2 组，且与首页不重复
  app.state.settings.plannerPage=2;
  app.renderPlanner();
  const d2=groupDates();
  ok('v42_4 第 2 页展示更早 2 组', d2.length===2 && /23/.test(d2[0])&&/22/.test(d2[1]), '顺序='+d2.join(' | '));
  ok('v42_4b 相邻两页分组不重复', d1.every(x=>d2.indexOf(x)<0), 'p1='+d1.join(',')+' p2='+d2.join(','));

  // 5) 边界：第 1 页时上一页按钮 disabled；末页时下一页 disabled
  app.state.settings.plannerPage=1; app.renderPlanner();
  const prevBtn1=pagerEl().querySelector('[data-action="planner-prev"]');
  ok('v42_5 第 1 页「上一组」禁用', !!prevBtn1 && prevBtn1.disabled===true, 'disabled='+(prevBtn1&&prevBtn1.disabled));
  app.state.settings.plannerPage=3; app.renderPlanner();
  const nextBtn3=pagerEl().querySelector('[data-action="planner-next"]');
  ok('v42_5b 末页「下一组」禁用', !!nextBtn3 && nextBtn3.disabled===true, 'disabled='+(nextBtn3&&nextBtn3.disabled));
  // 越界页码自动收敛，不出现空白页
  app.state.settings.plannerPage=99; app.renderPlanner();
  ok('v42_5c 越界页码自动收敛到末页(非空白)', groupDates().length>0, 'page='+app.state.settings.plannerPage+' groups='+groupDates().length);

  // 6) 只有 1 页时不渲染分页条
  app.state.records=days.slice(0,1).map((d,i)=>({id:'S'+i,type:'planner',date:d,createdAt:200+i,sample:false,remoteId:null,data:{title:'单日'+i,done:false}}));
  app.state.settings.plannerPage=1; app.renderPlanner();
  ok('v42_6 仅 1 页时不显示分页条', pagerEl().innerHTML.trim()==='', 'pager="'+pagerEl().innerHTML.trim()+'"');
  ok('v42_6b 仅 1 页时仍能展示该日数据', groupDates().length===1, 'groups='+groupDates().length);

  // 7) 切换筛选（已完成→无数据）页码收敛不崩
  app.state.records=days.map((d,i)=>({id:'Q'+i,type:'planner',date:d,createdAt:300+i,sample:false,remoteId:null,data:{title:'待办'+i,done:false}}));
  app.state.settings.plannerPage=3;
  app.state.settings.plannerFilter='done';
  app.renderPlanner();
  ok('v42_7 切到「已完成」空结果不崩溃', !!listEl(), 'page='+app.state.settings.plannerPage);
  ok('v42_7b 空结果显示占位提示', /暂时没有事项|没有/.test(listEl().textContent), listEl().textContent.trim().slice(0,30));
  app.state.settings.plannerFilter='all';

  // 8) 空数据不崩溃
  app.state.records=[]; app.state.settings.plannerPage=1; app.renderPlanner();
  ok('v42_8 空数据不崩溃且显示占位', !!listEl() && /暂时没有事项|没有/.test(listEl().textContent), listEl().textContent.trim().slice(0,30));

  console.log('\n=== v42 智能清单分页冒烟结果 ===');
  P.logs.forEach(l=>console.log(l));
  console.log(`PASS ${P.pass} / FAIL ${P.fail} / TOTAL ${P.pass+P.fail}`);
  process.exit(P.fail?1:0);
})();
