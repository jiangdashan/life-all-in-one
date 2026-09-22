/* v37 移动端六项修复冒烟测试
 *  1) mergeShopping 墓碑语义：云端拉取成功但 remoteId 不在结果里 → 本地移除（跨设备删除生效）
 *  2) mergeStorage 墓碑语义：同上
 *  3) quad-move click 分支已移除（change 委托保留）→ 移动端可切换象限
 *  4) 智能清单手动拖拽排序已移除（renderPlanner 不再调 initPlannerDrag + touch-action 解除占用）
 *  5) pullAllRemote 内含 applySettingsSync（「计划吃什么」等设置随每次同步拉取）
 *  6) authInit 信任期自动解锁：sessionStorage 为空 + 信任期有效 → 免密码解锁 + 经期 PIN 免输入
 *  7) authLockApp 手动锁定清除信任期
 *  8/9) 身体日志 / 心情月历 移动端 CSS 存在
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
const _origGetById=doc.getElementById.bind(doc);
function mkDummySelect(){ return {value:'',textContent:'',innerHTML:'',style:{},hidden:false,disabled:false,classList:{add(){},remove(){},toggle(){},contains:()=>false},addEventListener(){},removeEventListener(){},setAttribute(){},getAttribute:()=>null,querySelectorAll:()=>[],appendChild(){},closest:()=>null,options:[],selectedIndex:-1}; }
doc.getElementById=function(id){
  if(id==='mediaStatusFilter'||id==='mediaRatingFilter') return mkDummySelect();
  return _origGetById(id);
};
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

const _fakeCloudStore={records:{}};
w.__SMART_PAGE__={database:{
  query:async function({databaseId,pageSize,startCursor}){
    const arr=_fakeCloudStore.records[databaseId]||[];
    const start=startCursor?parseInt(startCursor,10)||0:0;
    const slice=arr.slice(start,start+pageSize);
    const next=start+pageSize<arr.length?String(start+pageSize):null;
    return {results:slice,hasMore:!!next,nextCursor:next};
  },
  addRecord:async function({databaseId,properties}){
    const rec=Object.assign({_id:'rec_'+Math.random().toString(36).slice(2)},properties||{});
    if(!_fakeCloudStore.records[databaseId])_fakeCloudStore.records[databaseId]=[];
    _fakeCloudStore.records[databaseId].push(rec);
    return {_id:rec._id,id:rec._id};
  },
  updateRecord:async function(){return {};}, deleteRecord:async()=>({}), getSchema:async()=>({properties:[]})
}};

const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:w.FormData,__SMART_PAGE__:w.__SMART_PAGE__,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new w.URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:(...a)=>{process.stderr.write('PAGE ERR: '+a.map(x=>x&&x.message?x.message:String(x)).join(' ')+'\n');}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{}};
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

  /* ===== 1) mergeShopping 墓碑 ===== */
  app.state.records=[
    {id:'L1',type:'home',date:'2026-09-01',createdAt:111,sample:false,remoteId:'R_DEL',data:{name:'笔记本电脑键盘膜',quantity:'1',category:'数码',price:20,priority:'normal',note:'',bought:false}},
    {id:'L2',type:'home',date:'2026-09-05',createdAt:222,sample:false,remoteId:null,data:{name:'本地新加未上传',quantity:'2',category:'食品',price:0,priority:'normal',note:'',bought:false}}
  ];
  app.mergeShopping([{_id:'R_KEEP','物品名称':'云端已有物品','数量':'1','是否已买':''}]);
  const homes=app.state.records.filter(r=>r.type==='home');
  ok('v37_1 mergeShopping 墓碑：已删记录不再复活', !homes.some(r=>r.remoteId==='R_DEL'), homes.map(r=>r.data.name).join('|'));
  ok('v37_1b 本地未上传记录保留', homes.some(r=>r.id==='L2'));
  ok('v37_1c 云端行正常合入', homes.some(r=>r.remoteId==='R_KEEP'));

  /* ===== 2) mergeStorage 墓碑 ===== */
  app.state.records=[
    {id:'S1',type:'storage',date:'2026-08-01',createdAt:333,sample:false,remoteId:'RS_DEL',data:{name:'已在他端删除的物品',category:'日用',quantity:1,unit:'',location:'',expiry:'',note:''}},
    {id:'S2',type:'storage',date:'2026-08-02',createdAt:444,sample:false,remoteId:null,data:{name:'本地新库存',category:'食品',quantity:3,unit:'袋',location:'',expiry:'',note:''}}
  ];
  app.mergeStorage([{_id:'RS_KEEP','物品名称':'云端库存','分类':'日用','数量':'2'}]);
  const stos=app.state.records.filter(r=>r.type==='storage');
  ok('v37_2 mergeStorage 墓碑：已删记录不再复活', !stos.some(r=>r.remoteId==='RS_DEL'), stos.map(r=>r.data.name).join('|'));
  ok('v37_2b 本地未上传库存保留', stos.some(r=>r.id==='S2'));

  /* ===== 3) quad-move click 分支移除 ===== */
  ok('v37_3 quad-move click 分支已移除', !/if\(type==='quad-move'\)/.test(src));
  ok('v37_3b quad-move change 委托保留', /data-action'\]\==='quad-move'|getAttribute\('data-action'\)==='quad-move'/.test(src));

  /* ===== 4) 拖拽排序移除 ===== */
  ok('v37_4 renderPlanner 不再调用 initPlannerDrag', !/;initPlannerDrag\(\);/.test(src));
  ok('v37_4b task-drag 触摸占用已解除(touch-action:auto)', /\.task-drag\{touch-action:auto/.test(html));

  /* ===== 5) pullAllRemote 拉设置 ===== */
  ok('v37_5 pullAllRemote 内含 applySettingsSync', /applySettingsSync\(function\(\)\{ pullAllRemoteInner\(cb\); \}\)/.test(src));

  /* ===== 8/9) 移动端 CSS ===== */
  ok('v37_8 身体日志移动端 CSS', html.includes('#fitnessList .record-row{grid-template-columns:38px minmax(0,1fr) 30px'));
  ok('v37_9 心情月历移动端 CSS(含星期六列)', html.includes('.mood-calendar .cal-cell{min-height:34px'));

  /* ===== 6) 信任期自动解锁 ===== */
  w.__TESTING__=false;
  w.sessionStorage.clear();
  storage.clear();
  const hash=await app.authPwHash('test-password-123');
  storage.setItem('richangji-auth-v1', JSON.stringify({passwordHash:hash, createdAt:Date.now()}));
  storage.setItem('richangji-auth-trust-v1', JSON.stringify({uid:'trust-uid-1', pwHash:hash, until:Date.now()+3600e3}));
  app.authInit();
  await wait(120);
  ok('v37_6 信任期内免密码自动解锁', app.state_auth.unlocked===true && app.state_auth.userId==='trust-uid-1', 'uid='+app.state_auth.userId);
  ok('v37_6b 信任期内经期 PIN 免输入', w.sessionStorage.getItem('unlockPeriod')==='1');

  /* ===== 7) 手动锁定清除信任期 ===== */
  app.authLockApp();
  ok('v37_7 手动锁定清除信任期', storage.getItem('richangji-auth-trust-v1')===null);
  ok('v37_7b 锁定后未解锁状态', app.state_auth.unlocked===false);

  /* ===== 6c) 信任期与本地哈希不匹配 → 不自动解锁 ===== */
  w.sessionStorage.clear();
  storage.setItem('richangji-auth-v1', JSON.stringify({passwordHash:hash, createdAt:Date.now()}));
  storage.setItem('richangji-auth-trust-v1', JSON.stringify({uid:'trust-uid-1', pwHash:'old-hash-mismatch', until:Date.now()+3600e3}));
  app.authInit();
  await wait(120);
  ok('v37_6c 哈希不匹配不自动解锁(改密防护)', app.state_auth.unlocked===false, 'unlocked='+app.state_auth.unlocked);

  console.log(P.logs.join('\n'));
  console.log('\n结果: '+P.pass+' 通过, '+P.fail+' 失败');
  process.exit(P.fail?1:0);
})().catch(e=>{console.error('TEST ERR',e&&e.stack||e);process.exit(1);});
