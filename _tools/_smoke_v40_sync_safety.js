/* v40 冒烟测试：重启后"删除/修改丢失"的三类修复
 *  1) 内置习惯（看书/冥想/睡觉）走 hiddenHabitKeys 删除后，mergeRemoteHabits 不再从云端复活
 *  2) 自定义习惯走 deletedHabitNames 删除，仍生效
 *  3) 云端 settings 的 dietPlans 为空/旧时，mergeDietPlans 不覆盖本地已录入的计划吃
 *  4) 删除记录时 enqueuePendingDelete 正确入队且去重（重启后可重试云端删除）
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
w.__SMART_PAGE__={database:{query:async function({databaseId,pageSize,startCursor}){const arr=[];const start=startCursor?parseInt(startCursor,10)||0:0;const slice=arr.slice(start,start+pageSize);const next=start+pageSize<arr.length?String(start+pageSize):null;return {results:slice,hasMore:!!next,nextCursor:next};},addRecord:async()=>({_id:'r'}),updateRecord:async()=>({}),deleteRecord:async()=>({}),getSchema:async()=>({properties:[]})}};
const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:w.FormData,__SMART_PAGE__:w.__SMART_PAGE__,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new w.URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:()=>{}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{}};
sandbox.globalThis=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox);
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){console.error('SCRIPT ERR',e&&e.stack||e);process.exit(1);}
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){}

void (async () => {
  const app=sandbox.window.__appTest;
  if(!app){console.error('NO APP');process.exit(1);}
  const P={pass:0,fail:0,logs:[]};
  function ok(name,cond,extra){ (cond?P.pass++:P.fail++); P.logs.push((cond?'  OK ':'  XX ')+name+(extra?' — '+extra:'')); }

  /* ===== 1) 内置习惯删除走 hiddenHabitKeys，重启合并不再复活 ===== */
  {
    app.state.settings.hiddenHabitKeys=['reading','meditation','sleep'];
    app.state.settings.deletedHabitNames=[];
    app.state.habits=[
      {id:'h-read',key:'reading',name:'看书',type:'check',target:1,entries:{}},
      {id:'h-med',key:'meditation',name:'冥想',type:'check',target:1,entries:{}},
      {id:'h-sleep',key:'sleep',name:'睡觉',type:'number',target:7,entries:{}},
      {id:'h-ex',key:'exercise',name:'运动',type:'check',target:1,entries:{}}
    ];
    const payload={ updatedAt:Date.now(),
      habits:[
        {name:'睡觉',key:'sleep',type:'number',target:7,unit:'小时'},
        {name:'看书',key:'reading',type:'check',target:1,unit:'次'},
        {name:'冥想',key:'meditation',type:'check',target:1,unit:'次'},
        {name:'运动',key:'exercise',type:'check',target:1,unit:'次'}
      ], hiddenHabitKeys:[], deletedHabitNames:[] };
    app.mergeRemoteHabits(payload);
    const names=app.state.habits.map(h=>h.name);
    ok('v40_1a 内置习惯(看书)不再复活', !names.includes('看书'), 'habits='+names.join(','));
    ok('v40_1b 内置习惯(冥想)不再复活', !names.includes('冥想'));
    ok('v40_1c 内置习惯(睡觉)不再复活', !names.includes('睡觉'));
    ok('v40_1d 未隐藏习惯(运动)保留', names.includes('运动'));
  }

  /* ===== 2) 自定义习惯走 deletedHabitNames，合并后不复活 ===== */
  {
    app.state.settings.hiddenHabitKeys=[];
    app.state.settings.deletedHabitNames=['我的习惯'];
    app.state.habits=[];
    const payload={ updatedAt:Date.now(),
      habits:[ {name:'我的习惯',key:'custom-x',type:'check',target:1,unit:'次'} ],
      hiddenHabitKeys:[], deletedHabitNames:[] };
    app.mergeRemoteHabits(payload);
    ok('v40_2a 已删自定义习惯不复活', !app.state.habits.some(h=>h.name==='我的习惯'));
  }

  /* ===== 3) 云端 dietPlans 为空时，不覆盖本地已录入的计划吃 ===== */
  {
    const local=[{text:'番茄炒蛋',date:'2026-09-14',done:false},{text:'燕麦粥',date:'2026-09-15',done:false}];
    const merged=app.mergeDietPlans(local, []);
    ok('v40_3a 云端空不丢本地计划吃', merged.length===2 && merged[0].text==='番茄炒蛋', 'len='+merged.length);
    const merged2=app.mergeDietPlans(local, [{text:'番茄炒蛋',date:'2026-09-14',done:false},{text:'牛油果吐司',date:'2026-09-16',done:false}]);
    const set=new Set(merged2.map(p=>p.text+'|'+p.date));
    ok('v40_3b 本地+云端合并去重', merged2.length===3 && set.has('牛油果吐司|2026-09-16') && set.has('燕麦粥|2026-09-15'), 'len='+merged2.length);
  }

  /* ===== 4) 删除记录入队，便于重启后重试云端删除 ===== */
  {
    app.state.pendingDeletes=[];
    app.enqueuePendingDelete('DB_SHOPPING','rid-aaa');
    app.enqueuePendingDelete('DB_SHOPPING','rid-aaa'); // 重复应去重
    app.enqueuePendingDelete('DB_DIET','rid-bbb');
    ok('v40_4a 入队 2 条(去重)', app.state.pendingDeletes.length===2, 'len='+app.state.pendingDeletes.length);
    ok('v40_4b 含待删记录', app.state.pendingDeletes.some(d=>d.rid==='rid-aaa'&&d.db==='DB_SHOPPING'));
    ok('v40_4c 缺参不入队', (app.enqueuePendingDelete(null,null), app.state.pendingDeletes.length===2));
  }

  console.log('\n=== v40 同步安全冒烟 ===');
  P.logs.forEach(l=>console.log(l));
  console.log(`\n结果: ${P.pass} 通过 / ${P.fail} 失败`);
  process.exit(P.fail?1:0);
})();
