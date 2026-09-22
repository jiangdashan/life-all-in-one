/* v36 跨设备同步修复冒烟测试（基于 v34 完整 DOM harness 模式）
 * 覆盖：
 *  1) 新设备(无本地哈希) + 云端已有数据 → 登录页进入云端校验模式（cloudVerify=true + 相同密码提示）
 *  2) cloudCollectUserIds 收集云端已有身份（meta+money）
 *  3) dbFetchAllRaw 不做 userId 过滤
 *  4) 云端校验模式 + 正确密码 → 解锁 + 本地保存哈希 + userId 与 Web 端派生值一致
 *  5) 云端校验模式 + 错误密码 → 报错不解锁 + failedAttempts 增加
 *  6) 云端校验模式 + 网络异常 → 提示网络错误不解锁
 *  7) 新设备 + 云端无数据 → 创建模式（cloudVerify=false + hasPassphrase=false）
 *  8) 顶栏「同步」按钮存在
 *  9) 有本地哈希的老设备 → enter 模式（cloudVerify=false），密码错误走本地校验路径
 */
const LINKEDOM='C:/Users/依易亦奕鸭/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const {parseHTML}=require(LINKEDOM);
const fs=require('fs'); const vm=require('vm'); const nodeCrypto=require('crypto');
const html=fs.readFileSync('D:/workbuddyProjects/工作台3/life-all-in-one.html','utf8');
const lines=html.split('\n');
let oi=-1,ci=-1;
for(let i=0;i<lines.length;i++){ if(/<script[^>]*>/.test(lines[i])&&!/<script[^>]+src=/.test(lines[i])){oi=i;break;} }
for(let i=oi+1;i<lines.length;i++){ if(/<\/script>/.test(lines[i])){ci=i;break;} }
const src=lines.slice(oi+1,ci).join('\n');
function mkStorage(){const d={};return{_d:d,getItem:k=>k in d?d[k]:null,setItem:(k,v)=>{d[k]=String(v);},removeItem:k=>{delete d[k];},clear(){for(const k in d)delete d[k];},key:i=>Object.keys(d)[i]??null,get length(){return Object.keys(d).length;}};};
const storage=mkStorage();
const full=parseHTML(html); const w=full.window, doc=w.document;
/* linkedom 的 select 元素 value 只有 getter；renderMedia 会赋值 → 用可写 dummy 顶替这两个筛选器 */
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

/* mock 云端数据库（扁平记录，与真实 API 一致） */
const _fakeCloudStore={records:{}};
function seedCloud(dbid, rows){ _fakeCloudStore.records[dbid]=rows.map(r=>Object.assign({_id:'rec_'+Math.random().toString(36).slice(2)},r)); }
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
  updateRecord:async function({databaseId,recordId,properties}){
    const arr=_fakeCloudStore.records[databaseId]||[];
    const rec=arr.find(r=>(r._id||r.record_id)===recordId);
    if(rec&&properties) Object.assign(rec,properties);
    return {};
  }, deleteRecord:async()=>({}), getSchema:async()=>({properties:[]})
}};

const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:w.FormData,__SMART_PAGE__:w.__SMART_PAGE__,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new w.URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:(...a)=>{process.stderr.write('PAGE ERR: '+a.map(x=>x&&x.message?x.message:String(x)).join(' ')+'\n');}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{}};
sandbox.globalThis=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox);
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){console.error('SCRIPT ERR',e&&e.stack||e);process.exit(1);}
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){}

void (async () => {
  const R={}; const app=sandbox.window.__appTest;
  if(!app){console.error('NO APP');process.exit(1);}
  const P={pass:0,fail:0,logs:[]};
  function ok(name,cond,extra){ (cond?P.pass++:P.fail++); P.logs.push((cond?'  ✔ ':'  ✘ ')+name+(extra?' — '+extra:'')); }
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const META='FKpqucBa96f2slzvcU3jdV', MONEY='O4PsdbQpHnSDT0LSKcqgoI';

  /* 预置云端数据：web 端用户（相同密码派生相同 userId） */
  const WEB_PW='cross-device-pass';
  const WEB_UID=nodeCrypto.createHash('sha256').update('richangji-v32-uid-2026-09:'+WEB_PW).digest('hex');
  seedCloud(META,[{键:'appSettings',值:'{}',userId:WEB_UID}]);
  seedCloud(MONEY,[{分类:'购物',金额:9.9,日期:'2026-09-06',userId:WEB_UID}]);

  /* 模拟设备：清认证痕迹（keepAuthKey=true 时保留本地哈希，模拟已登录过的老设备），重跑真实 authInit */
  function resetToFreshDevice(keepAuthKey){
    w.__TESTING__=false;
    if(!keepAuthKey) storage.removeItem('richangji-auth-v1');
    w.sessionStorage.removeItem('unlockApp'); w.sessionStorage.removeItem('unlockPw');
    app.state_auth.unlocked=false; app.state_auth.cloudVerify=false;
    app.state_auth.userId=null; app.state_auth.failedAttempts=0; app.state_auth.lockedUntil=0;
    doc.body.classList.add('auth-locked');
    const ov=doc.getElementById('authOverlay'); if(ov) ov.style.display='flex';
    doc.getElementById('authPass1').value='';
    doc.getElementById('authPass2').value='';
    const err=doc.getElementById('authError'); if(err) err.textContent='';
    app.authInit();
  }

  // ---- 1) 新设备 + 云端有数据 → cloudVerify 模式 ----
  try{
    resetToFreshDevice();
    await wait(3500);
    ok('v36_1 cloudVerify 模式', app.state_auth.cloudVerify===true && app.state_auth.hasPassphrase===true,
       JSON.stringify({cv:app.state_auth.cloudVerify,hp:app.state_auth.hasPassphrase}));
    const sub=doc.querySelector('.auth-sub');
    ok('v36_1b 提示「相同的访问密码」', /相同的访问密码/.test(sub?sub.textContent:''), sub&&sub.textContent.slice(0,50));
  }catch(e){ ok('v36_1',false,e.message); }

  // ---- 2) cloudCollectUserIds ----
  try{
    const probe=await new Promise(res=>app.cloudCollectUserIds(res));
    ok('v36_2 命中 web 端身份', !probe.err && probe.uids.indexOf(WEB_UID)>=0, JSON.stringify(probe).slice(0,90));
  }catch(e){ ok('v36_2',false,e.message); }

  // ---- 3) dbFetchAllRaw 不过滤 ----
  try{
    const raw=await new Promise(res=>app.dbFetchAllRaw(MONEY,res));
    ok('v36_3 raw 返回未过滤记录', Array.isArray(raw)&&raw.length===1, 'len='+(raw&&raw.length));
  }catch(e){ ok('v36_3',false,e.message); }

  // ---- 4) 正确密码 → 解锁 + userId 一致 + 本地存哈希 ----
  try{
    doc.getElementById('authPass1').value=WEB_PW;
    const form=doc.getElementById('authForm');
    form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await wait(3500);
    ok('v36_4 正确密码 → 解锁', app.state_auth.unlocked===true);
    ok('v36_4b userId 与 Web 端一致', app.state_auth.userId===WEB_UID, app.state_auth.userId&&app.state_auth.userId.slice(0,10));
    const stored=JSON.parse(storage.getItem('richangji-auth-v1')||'{}');
    ok('v36_4c 本地已存密码哈希', !!stored.passwordHash);
    ok('v36_4d 会话标记写入', w.sessionStorage.getItem('unlockApp')==='1');
  }catch(e){ ok('v36_4',false,e.message); }

  // ---- 5) 错误密码 → 拒绝 ----
  try{
    app.state_auth.unlocked=false; app.state_auth.cloudVerify=true; app.state_auth.userId=null; app.state_auth.failedAttempts=0;
    doc.getElementById('authPass1').value='wrong-password-1';
    doc.getElementById('authForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await wait(3500);
    ok('v36_5 错误密码 → 拒绝解锁', app.state_auth.unlocked===false && /密码不正确/.test(doc.getElementById('authError').textContent),
       doc.getElementById('authError').textContent.slice(0,40));
    ok('v36_5b failedAttempts 增加', app.state_auth.failedAttempts>=1);
  }catch(e){ ok('v36_5',false,e.message); }

  // ---- 6) 网络异常 → 网络提示 ----
  try{
    app.state_auth.unlocked=false; app.state_auth.cloudVerify=true; app.state_auth.failedAttempts=0;
    const origQuery=w.__SMART_PAGE__.database.query;
    w.__SMART_PAGE__.database.query=async()=>{ throw new Error('net down'); };
    doc.getElementById('authPass1').value=WEB_PW;
    doc.getElementById('authForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await wait(3500);
    ok('v36_6 网络异常 → 提示且不解锁', app.state_auth.unlocked===false && /网络异常/.test(doc.getElementById('authError').textContent),
       doc.getElementById('authError').textContent.slice(0,40));
    w.__SMART_PAGE__.database.query=origQuery;
  }catch(e){ ok('v36_6',false,e.message); }

  // ---- 7) 新设备 + 云端无数据 → 创建模式 ----
  try{
    _fakeCloudStore.records[META]=[]; _fakeCloudStore.records[MONEY]=[];
    resetToFreshDevice();
    await wait(3500);
    ok('v36_7 云端无数据 → 创建模式', app.state_auth.cloudVerify===false && app.state_auth.hasPassphrase===false,
       JSON.stringify({cv:app.state_auth.cloudVerify,hp:app.state_auth.hasPassphrase}));
    /* 恢复 */
    seedCloud(META,[{键:'appSettings',值:'{}',userId:WEB_UID}]);
    seedCloud(MONEY,[{分类:'购物',金额:9.9,userId:WEB_UID}]);
  }catch(e){ ok('v36_7',false,e.message); }

  // ---- 8) 老设备(有本地哈希) → enter 模式 ----
  try{
    /* 用正确密码预存本地哈希（模拟已在 Web 端登录过的设备），保留哈希重跑 authInit */
    const pwHash=nodeCrypto.createHash('sha256').update('richangji-v32-pw-2026-09:'+WEB_PW).digest('hex');
    storage.setItem('richangji-auth-v1',JSON.stringify({passwordHash:pwHash,createdAt:Date.now()}));
    resetToFreshDevice(true);
    await wait(3500);
    ok('v36_8 老设备 → enter 模式(非 cloudVerify)', app.state_auth.hasPassphrase===true && app.state_auth.cloudVerify===false);
    /* 本地校验错误密码路径仍然有效 */
    app.state_auth.unlocked=false; app.state_auth.failedAttempts=0;
    doc.getElementById('authPass1').value='definitely-wrong-pw';
    doc.getElementById('authForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    await wait(3500);
    ok('v36_8b 本地哈希校验路径不受影响', app.state_auth.unlocked===false && app.state_auth.failedAttempts>=1);
  }catch(e){ ok('v36_8',false,e.message); }

  // ---- 9) 顶栏同步按钮 ----
  try{
    ok('v36_9 同步按钮存在且带文案', !!doc.getElementById('syncNowBtn') && /同步/.test(doc.getElementById('syncNowBtn').textContent));
  }catch(e){ ok('v36_9',false,e.message); }

  // ---- 10) 数据体检：身份不匹配 → 警示 + 迁移按钮 ----
  try{
    /* 当前测试会话身份是 'test-bypass-user'，云端记录属于 WEB_UID → 应判 mismatch */
    app.state_auth.userId='test-bypass-user';
    app.runHealthCheck();
    await wait(3500);
    const out=doc.getElementById('diagHealthOut').innerHTML;
    ok('v36_10 体检判 mismatch', /归属到当前身份/.test(out) && /diag-bad/.test(out), out.slice(0,60));
    /* 执行迁移 → 云端记录 userId 全部变为当前身份 */
    app.retagCloudToCurrentUser();
    await wait(9000);
    const allRows=[].concat(_fakeCloudStore.records[META]||[],_fakeCloudStore.records[MONEY]||[]);
    const flat=r=>typeof r.userId==='string'?r.userId:(r.userId&&r.userId.text);
    const migrated=allRows.filter(r=>flat(r)==='test-bypass-user').length;
    ok('v36_10b 迁移后云端归属=当前身份', migrated>=2, `migrated=${migrated}`);
    app.runHealthCheck();
    await wait(9000);
    const out2=doc.getElementById('diagHealthOut').innerHTML;
    ok('v36_10c 体检复查 → 无 mismatch/无坏警', !/diag-bad/.test(out2) && !/重新补传/.test(out2), out2.slice(-80));
  }catch(e){ ok('v36_10',false,e.message); }

  // ---- 11) 经期清空标记 raw 读取可见（无 userId 的标记行不再被漏掉） ----
  try{
    _fakeCloudStore.records[META].push({键:'periodClearedAt',值:'1788713810214'});
    const ts=await new Promise(res=>app.readPeriodClearMarker(res));
    ok('v36_11 无 userId 标记行可被读到', ts===1788713810214, `ts=${ts}`);
  }catch(e){ ok('v36_11',false,e.message); }

  // ---- 12) v36f 体检升级：孤儿记录检测 + 一键补传 + 示例数据单独标注 ----
  try{
    const beforeMoney=(_fakeCloudStore.records[MONEY]||[]).length;
    /* 孤儿：有 remoteId 但云端不存在；示例：sample=true 不参与同步 */
    app.state.records.push(
      {id:'orphan1',type:'money',date:'2026-09-07',createdAt:Date.now(),sample:false,remoteId:'deleted_in_cloud',data:{category:'购物',amount:1,flow:'expense',note:'孤儿记录'}},
      {id:'sampleX',type:'money',date:'2026-09-07',createdAt:Date.now(),sample:true,remoteId:null,data:{category:'示例',amount:9,flow:'expense',note:'示例记录'}}
    );
    app.runHealthCheck();
    await wait(9000);
    const out3=doc.getElementById('diagHealthOut').innerHTML;
    ok('v36_12 孤儿记录被检出并给出补传按钮', /重新补传这 1 条/.test(out3) && /diagResyncBtn/.test(out3), out3.slice(0,80));
    ok('v36_12b 示例数据单独标注不混入有效数', /\(\+1示例\)/.test(out3), '应含(+1示例)');
    ok('v36_12c 表格标注缺失计数', /⚠1缺失/.test(out3));
    /* 一键补传核心路径：清除孤儿 remoteId → syncPendingRecords → 云端新增 */
    app.state.records.forEach(r=>{ if(r.id==='orphan1'){ r.remoteId=null; r.syncTriedAt=0; } });
    const n=await new Promise(res=>app.syncPendingRecords(res));
    await wait(9000);
    const afterMoney=(_fakeCloudStore.records[MONEY]||[]).length;
    ok('v36_12d 补传后云端记账数 +1', afterMoney===beforeMoney+1, `${beforeMoney}→${afterMoney} (n=${n})`);
    const pushed=(_fakeCloudStore.records[MONEY]||[]).find(r=>/孤儿/.test(JSON.stringify(r)));
    const pushedUid=pushed?(typeof pushed.userId==='string'?pushed.userId:(pushed.userId&&pushed.userId.text)):null;
    ok('v36_12e 补传记录带上当前身份 userId', !!pushed && pushedUid===app.state_auth.userId, pushed?('uid='+String(pushedUid).slice(0,8)):'not found');
    app.runHealthCheck();
    await wait(9000);
    const out4=doc.getElementById('diagHealthOut').innerHTML;
    ok('v36_12f 补传后体检不再报孤儿', !/重新补传这/.test(out4), out4.slice(0,60));
    ok('v36_12g getLastDbWriteErr 导出可用', typeof app.getLastDbWriteErr==='function');
  }catch(e){ ok('v36_12',false,e.message); }

  P.logs.forEach(l=>console.log(l));
  console.log(`\n结果: ${P.pass} 通过, ${P.fail} 失败`);
  process.exit(P.fail?1:0);
})().catch(e=>{ console.error('TEST ERR:',e&&e.stack||e); process.exit(1); });
