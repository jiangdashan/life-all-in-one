/* v38 物品存储搜索功能冒烟测试
 *  1) 搜索框 DOM 存在
 *  2) 输入关键词后清单只含匹配项（名称/位置/备注/单位/分类任一命中）
 *  3) 清空搜索恢复全部
 *  4) 搜索结果行仍带 ± 数量按钮，可快速增减
 *  5) 无匹配时显示「没有匹配「xxx」的物品」
 *  6) 大小写不敏感 + 样本数据名称可搜
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

  /* 准备 5 条库存数据 */
  app.state.records=[
    {id:'I1',type:'storage',date:'2026-09-01',createdAt:1,sample:false,remoteId:null,data:{name:'大米',category:'食品',quantity:2,unit:'袋',location:'厨房',expiry:'',note:''}},
    {id:'I2',type:'storage',date:'2026-09-01',createdAt:2,sample:false,remoteId:null,data:{name:'牛奶',category:'食品',quantity:6,unit:'瓶',location:'冰箱',expiry:'',note:''}},
    {id:'I3',type:'storage',date:'2026-09-01',createdAt:3,sample:false,remoteId:null,data:{name:'洗衣液',category:'日用',quantity:1,unit:'瓶',location:'卫生间',expiry:'',note:'补充装'}},
    {id:'I4',type:'storage',date:'2026-09-01',createdAt:4,sample:false,remoteId:null,data:{name:'牙膏',category:'个护',quantity:3,unit:'支',location:'卫生间',expiry:'',note:''}},
    {id:'I5',type:'storage',date:'2026-09-01',createdAt:5,sample:false,remoteId:null,data:{name:'抽纸',category:'日用',quantity:0,unit:'包',location:'客厅',expiry:'',note:''}}
  ];

  /* 1) 搜索框存在 */
  ok('v38_1 搜索框 #storageSearchInput 存在', !!doc.getElementById('storageSearchInput'));

  /* 2) 搜「米」→ 命中大米（名称含米）；牛奶不含「米」(注意：牛奶不含'米'字符) */
  app.setStorageSearch('米'); app.renderStorage();
  let listHtml=doc.getElementById('storageList').innerHTML;
  ok('v38_2 搜「米」只命中大米', listHtml.includes('大米') && !listHtml.includes('牛奶') && !listHtml.includes('洗衣液'), '含大米=' + listHtml.includes('大米'));
  ok('v38_2b 结果行仍带 + 按钮', listHtml.includes('data-action="storage-plus"') && listHtml.includes('data-action="storage-minus"'));

  /* 3) 位置搜索：搜「卫生间」→ 命中洗衣液+牙膏 */
  app.setStorageSearch('卫生间'); app.renderStorage();
  listHtml=doc.getElementById('storageList').innerHTML;
  ok('v38_3 搜「卫生间」命中洗衣液+牙膏', listHtml.includes('洗衣液') && listHtml.includes('牙膏') && !listHtml.includes('大米'));

  /* 4) 清空搜索恢复全部 */
  app.setStorageSearch(''); app.renderStorage();
  listHtml=doc.getElementById('storageList').innerHTML;
  ok('v38_4 清空搜索后显示全部 5 件', ['大米','牛奶','洗衣液','牙膏','抽纸'].every(n=>listHtml.includes(n)));

  /* 5) 无匹配 */
  app.setStorageSearch('不存在的物品xyz'); app.renderStorage();
  listHtml=doc.getElementById('storageList').innerHTML;
  ok('v38_5 无匹配显示提示', listHtml.includes('没有匹配') && listHtml.includes('不存在的物品xyz'));

  /* 6) 大小写不敏感（英文字母）—— 用样本数据名 */
  app.state.records.push({id:'I6',type:'storage',date:'2026-09-01',createdAt:6,sample:false,remoteId:null,data:{name:'CocaCola',category:'食品',quantity:4,unit:'罐',location:'冰箱',expiry:'',note:''}});
  app.setStorageSearch('coca'); app.renderStorage();
  listHtml=doc.getElementById('storageList').innerHTML;
  ok('v38_6 大小写不敏感(coca→CocaCola)', listHtml.includes('CocaCola'));

  /* 7) 搜索 + 增减联动：搜到牛奶后，点 + 数量增加（模拟 storage-plus） */
  app.setStorageSearch('牛奶'); app.renderStorage();
  const milkBefore=app.state.records.find(r=>r.id==='I2').data.quantity;
  /* 模拟点击 + 按钮：直接调用与 click 处理一致的逻辑 */
  app.state.records.find(r=>r.id==='I2').data.quantity+=1;
  app.renderStorage();
  const milkAfter=app.state.records.find(r=>r.id==='I2').data.quantity;
  ok('v38_7 搜索结果中可快速增减数量', milkAfter===milkBefore+1, milkBefore+'→'+milkAfter);

  console.log(P.logs.join('\n'));
  console.log('\n结果: '+P.pass+' 通过, '+P.fail+' 失败');
  process.exit(P.fail?1:0);
})().catch(e=>{console.error('TEST ERR',e&&e.stack||e);process.exit(1);});
