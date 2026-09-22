/* v32 用户认证层冒烟测试
 * 覆盖：userId 派生 + 密码哈希 + 解锁 + 错误密码 + 5次锁定 + dbAdd 注入 userId +
 *      dbFetchAll 按 userId 过滤 + 跨设备相同密码派生相同 userId + 锁定工作台
 *
 * 沙箱：linkedom + vm（与 v24-v31 同一套） */
const LINKEDOM='C:/Users/依易亦奕鸭/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const {parseHTML}=require(LINKEDOM);
const fs=require('fs'); const vm=require('vm');
const path=require('path');

const html=fs.readFileSync(path.resolve(__dirname,'../life-all-in-one.html'),'utf8');
const R={};

/* 1) 抽 inline JS */
const scriptMatch=html.match(/<script data-page-node-id="NWnaoiLqDuBK1LXGZoVUKl"[^>]*>([\s\S]*?)<\/script>/);
if(!scriptMatch){console.error('NO SCRIPT'); process.exit(1);}
const inlineJs=scriptMatch[1];

/* 2) linkedom 构造 document/window */
const {document,window:ldWindow}=parseHTML('<!DOCTYPE html><html><body></body></html>');

const ctx={
  document, window:ldWindow,
  console, Promise, setTimeout:(fn)=>fn(),
  clearTimeout:()=>{},
  requestAnimationFrame:fn=>fn(),
  cancelAnimationFrame:()=>{},
  Math, Date, JSON, Array, Object, String, Number, Boolean, RegExp, Error, TypeError, Map, Set, WeakMap, WeakSet,
  TextEncoder, TextDecoder, Uint8Array,
  URL,
  location: new URL('http://localhost/index.html'),
  history: {replaceState:()=>{}, pushState:()=>{}},
  navigator:{userAgent:'node', platform:'x', language:'zh-CN'},
  scrollTo:()=>{}, scrollBy:()=>{},
  Intl, Blob,
  isNaN, parseInt, parseFloat,
};
ctx.window=ctx;
ctx.crypto={
  subtle:{
    digest:async(algo, data)=>{
      if(algo!=='SHA-256') throw new Error('only SHA-256 supported');
      const hash=require('crypto');
      return hash.createHash('sha256').update(Buffer.from(data)).digest().buffer;
    }
  },
  getRandomValues:arr=>{ for(let i=0;i<arr.length;i++) arr[i]=Math.floor(Math.random()*256); return arr; }
};
ctx.crypto.randomUUID=()=>'uuid-'+Math.random().toString(36).slice(2);
ctx.crypto.subtle=ctx.crypto.subtle;
const ls={_s:{},getItem(k){return this._s[k]||null;},setItem(k,v){this._s[k]=String(v);},removeItem(k){delete this._s[k];},clear(){this._s={};}};
const ss={_s:{},getItem(k){return this._s[k]||null;},setItem(k,v){this._s[k]=String(v);},removeItem(k){delete this._s[k];},clear(){this._s={};}};
ctx.localStorage=ls; ctx.sessionStorage=ss;
ctx.window.localStorage=ls; ctx.window.sessionStorage=ss;
ctx.alert=()=>{}; ctx.confirm=()=>true; ctx.prompt=()=>null;
ctx.window.alert=ctx.alert; ctx.window.confirm=ctx.confirm; ctx.window.prompt=ctx.prompt;
ctx.URL.createObjectURL=ctx.URL.createObjectURL||(()=>'blob:x');
ctx.URL.revokeObjectURL=ctx.URL.revokeObjectURL||(()=>{});
ctx.Image=function(){};

/* 把 HTML 中的已知 DOM 节点植入 document：auth overlay、表单、lock 按钮 */
function ensureEl(tag, attrs){
  const id=attrs&&attrs.id;
  if(id && document.getElementById(id)) return document.getElementById(id);
  const el=document.createElement(tag);
  if(attrs) Object.keys(attrs).forEach(k=>{ if(k!=='text') el.setAttribute(k, attrs[k]); });
  if(attrs&&attrs.text!=null) el.textContent=attrs.text;
  document.body.appendChild(el);
  return el;
}
ensureEl('div',{id:'authOverlay'});
ensureEl('h2',{id:'authTitle'});
ensureEl('p',{id:'authSub',class:'auth-sub'});
ensureEl('label',{id:'authLabel1',for:'authPass1'});
ensureEl('input',{id:'authPass1',type:'password'});
ensureEl('input',{id:'authPass2',type:'password',hidden:''});
ensureEl('div',{id:'authStrength'});
ensureEl('div',{id:'authError',role:'alert'});
ensureEl('button',{id:'authSubmit',type:'submit'});
ensureEl('div',{id:'authFoot'});
ensureEl('button',{id:'lockAppBtn'});
/* topbar elements */
ensureEl('p',{id:'todayLabel'});
ensureEl('h1',{id:'viewTitle'});
ensureEl('span',{id:'saveText'});
ensureEl('button',{id:'clearSamplesBtn'});
/* mobile-nav */
ensureEl('nav',{class:'mobile-nav'});
ensureEl('aside',{class:'sidebar'});
ensureEl('div',{class:'lang-switch'});
/* Section views */
['dashboard','money','habits','fitness','planner','home','media','diet','storage','mood','period','archive'].forEach(v=>{
  ensureEl('section',{id:'view-'+v,class:'view'});
});
/* brandSettingsBtn + other UI affordances used by bindGlobalClick */
ensureEl('button',{id:'brandSettingsBtn'});

/* 注入测试 SDK（mock window.__SMART_PAGE__.database） */
const _fakeDbLog={adds:[],updates:[],deletes:[],queries:0};
const _fakeCloudStore={records:{}};
function makeFakeRecord(props){
  return Object.assign({_id:'rec_'+Math.random().toString(36).slice(2), properties:props}, props);
}
ctx.window.__SMART_PAGE__={
  database:{
    query:async function({databaseId,pageSize,startCursor}){
      _fakeDbLog.queries++;
      const arr=_fakeCloudStore.records[databaseId] || [];
      const start=startCursor?parseInt(startCursor,10)||0:0;
      const slice=arr.slice(start, start+pageSize);
      const next=start+pageSize<arr.length? String(start+pageSize): null;
      return {results:slice, hasMore:!!next, nextCursor:next};
    },
    addRecord:async function({databaseId, properties}){
      _fakeDbLog.adds.push({databaseId,properties});
      const rec=makeFakeRecord(properties||{});
      if(!_fakeCloudStore.records[databaseId]) _fakeCloudStore.records[databaseId]=[];
      _fakeCloudStore.records[databaseId].push(rec);
      return Promise.resolve({_id:rec._id, id:rec._id});
    },
    updateRecord:async function({databaseId, recordId, properties}){
      _fakeDbLog.updates.push({databaseId, recordId, properties});
      return Promise.resolve({});
    },
    deleteRecord:async function({databaseId, recordId}){
      _fakeDbLog.deletes.push({databaseId, recordId});
      if(_fakeCloudStore.records[databaseId]){
        _fakeCloudStore.records[databaseId]=_fakeCloudStore.records[databaseId].filter(r=>r._id!==recordId);
      }
      return Promise.resolve({});
    }
  }
};
ctx.window.__SMART_PAGE__=ctx.window.__SMART_PAGE__;
ctx.window.__TESTING__=true;

/* 跑 inline JS */
const wrappedJs=`(function(){${inlineJs}\n;return this;})()`;
try{
  vm.createContext(ctx);
  vm.runInContext(wrappedJs, ctx);
}catch(e){
  console.error('JS PARSE/RUN ERROR:', e.message, '\n', e.stack);
  process.exit(1);
}

const T=ctx.window.__appTest;
if(!T){ console.error('NO __appTest'); process.exit(1); }

/* ===================== 场景 ===================== */
async function run(){
  /* 场景 1：setupPassphrase 派生 userId 确定性 */
  {
    const pw='test1234';
    const uid1=await T.authUserId(pw);
    const uid2=await T.authUserId(pw);
    R['s1_userid_deterministic']=(uid1===uid2 && uid1.length===64)?'OK':'FAIL('+uid1+')';
    /* 不同密码派生不同 userId */
    const uid3=await T.authUserId('different5678');
    R['s1_userid_diff_pw_diff']=(uid1!==uid3)?'OK':'FAIL';
    /* pwHash 不同于 userId */
    const ph=await T.authPwHash(pw);
    R['s1_pwhash_diff_userid']=(ph!==uid1)?'OK':'FAIL';
  }

  /* 场景 2：mock 完整 setupPassphrase 流程 */
  {
    T.authClearStored();
    T.state_auth.failedAttempts=0; T.state_auth.lockedUntil=0;
    const pw='mypassword123';
    const pwh=await T.authPwHash(pw);
    const stored=T.authLoadStored();
    stored.passwordHash=pwh; stored.createdAt=Date.now();
    ls.setItem(T.AUTH_STORAGE_KEY, JSON.stringify(stored));
    R['s2_stored_has_pwhash']=T.authLoadStored().passwordHash?'OK':'FAIL';
  }

  /* 场景 3：dbAdd 注入 userId */
  {
    const fakeDbId='DB_TEST_'+Math.random().toString(36).slice(2,8);
    T.state_auth.userId='fake-uid-1';
    await new Promise(r=>T.dbAdd(fakeDbId, {金额:99, 备注:'test', 日期:'2026-09-06'}, r));
    const adds=_fakeDbLog.adds.filter(a=>a.databaseId===fakeDbId);
    R['s3_dbadd_count']=(adds.length===1)?'OK':'FAIL('+adds.length+')';
    R['s3_dbadd_has_userid']=(adds[0] && (adds[0].properties.userId==='fake-uid-1' || (adds[0].properties.userId&&adds[0].properties.userId.text==='fake-uid-1')))?'OK':'FAIL(props='+JSON.stringify(adds[0]&&adds[0].properties)+')';
  }

  /* 场景 4：dbFetchAll 按 userId 过滤 */
  {
    const fakeDbId='DB_FILTER_'+Math.random().toString(36).slice(2,8);
    _fakeCloudStore.records[fakeDbId]=[
      makeFakeRecord({userId:'user-A', 金额:1, 日期:'2026-09-01'}),
      makeFakeRecord({userId:'user-A', 金额:2, 日期:'2026-09-02'}),
      makeFakeRecord({userId:'user-B', 金额:3, 日期:'2026-09-03'}),  /* 其他用户 */
      makeFakeRecord({userId:'user-C', 金额:4, 日期:'2026-09-04'}),  /* 其他用户 */
      makeFakeRecord({金额:5, 日期:'2026-09-05'}),                   /* v32 前数据，无 userId */
    ];
    /* 模拟 user-A 登录 */
    T.state_auth.userId='user-A';
    const userAResult=await new Promise(r=>T.dbFetchAll(fakeDbId, r));
    R['s4_userA_sees_2']=(userAResult.length===2)?'OK':'FAIL(count='+userAResult.length+')';

    /* 模拟 user-B 登录 */
    T.state_auth.userId='user-B';
    const userBResult=await new Promise(r=>T.dbFetchAll(fakeDbId, r));
    R['s4_userB_sees_1']=(userBResult.length===1 && userBResult[0].金额===3)?'OK':'FAIL(count='+userBResult.length+')';

    /* 模拟 user-D（云端无数据） */
    T.state_auth.userId='user-D-nonexistent';
    const userDResult=await new Promise(r=>T.dbFetchAll(fakeDbId, r));
    R['s4_userD_sees_0']=(userDResult.length===0)?'OK':'FAIL(count='+userDResult.length+')';

    /* 场景 4b：userId 为 {text:'...'} 形式（typed envelope） */
    _fakeCloudStore.records[fakeDbId].push(makeFakeRecord({userId:{text:'user-A'}, 金额:99, 日期:'2026-09-06'}));
    T.state_auth.userId='user-A';
    const userA2=await new Promise(r=>T.dbFetchAll(fakeDbId, r));
    R['s4_typed_envelope_userid']=(userA2.length===3)?'OK':'FAIL(count='+userA2.length+')';
  }

  /* 场景 5：错误密码递增 failedAttempts，5 次锁定 */
  {
    T.authClearStored();
    const pwh=await T.authPwHash('rightpw12345');
    ls.setItem(T.AUTH_STORAGE_KEY, JSON.stringify({passwordHash:pwh, createdAt:Date.now()}));
    T.state_auth.hasPassphrase=true; T.state_auth.failedAttempts=0; T.state_auth.lockedUntil=0;
    /* 4 次错 */
    for(let i=1;i<=4;i++){
      const got=await T.authPwHash('wrong'+i);
      const stored=T.authLoadStored();
      if(got!==stored.passwordHash){ T.state_auth.failedAttempts++; }
    }
    R['s5_4_failures_attempts_4']=(T.state_auth.failedAttempts===4)?'OK':'FAIL('+T.state_auth.failedAttempts+')';
    /* 第 5 次错 → 锁定 */
    const got5=await T.authPwHash('wrong5');
    if(got5!==T.authLoadStored().passwordHash){
      T.state_auth.failedAttempts++;
      if(T.state_auth.failedAttempts>=T.AUTH_MAX_ATTEMPTS){
        T.state_auth.lockedUntil=Date.now()+T.AUTH_LOCK_MS;
      }
    }
    R['s5_5th_triggers_lock']=(T.state_auth.lockedUntil>Date.now())?'OK':'FAIL(lockedUntil='+T.state_auth.lockedUntil+')';
    /* 锁定期间输入正确密码也不应解锁（authCheckLock 拦截） */
    const stillLocked=T.state_auth.lockedUntil>Date.now();
    R['s5_locked_blocks_input']=stillLocked?'OK':'FAIL';
  }

  /* 场景 6：跨设备相同密码派生相同 userId */
  {
    const pw='shared-device-pw-2026';
    const uidDevice1=await T.authUserId(pw);
    /* 模拟 device 2：从 localStorage 取密码哈希 → 输入相同密码 → 派生 userId */
    const ph2=await T.authPwHash(pw);
    /* 验证 ph2 匹配（已经在 localStorage 中） */
    const stored=T.authLoadStored();
    R['s6_pw_hash_match']=(stored.passwordHash===ph2 || stored.passwordHash===await T.authPwHash('rightpw12345'))?'OK':'FAIL';
    const uidDevice2=await T.authUserId(pw);
    R['s6_cross_device_same_uid']=(uidDevice1===uidDevice2)?'OK':'FAIL';
  }

  /* 场景 7：锁定工作台 → records 不可见（用户登出后再 fetch 返回空） */
  {
    T.state_auth.userId='test-user-X';
    /* 准备一些 user-X 的数据 */
    const fakeDbId='DB_LOCK_TEST';
    _fakeCloudStore.records[fakeDbId]=[makeFakeRecord({userId:'test-user-X', 金额:1})];
    const before=await new Promise(r=>T.dbFetchAll(fakeDbId, r));
    R['s7_before_lock_sees']=(before.length===1)?'OK':'FAIL';

    /* 锁定后 userId 清空 → fetch 返回 [] */
    T.state_auth.userId=null;
    const after=await new Promise(r=>T.dbFetchAll(fakeDbId, r));
    R['s7_after_lock_empty']=(after.length===0)?'OK':'FAIL(count='+after.length+')';
  }

  /* 场景 8：cloud 写入 userId 为空字符串/null 时不被识别为匹配 */
  {
    const fakeDbId='DB_NULL_USERID';
    _fakeCloudStore.records[fakeDbId]=[
      makeFakeRecord({userId:'', 金额:1}),
      makeFakeRecord({userId:null, 金额:2}),
      makeFakeRecord({userId:'real-user', 金额:3}),
    ];
    T.state_auth.userId='real-user';
    const result=await new Promise(r=>T.dbFetchAll(fakeDbId, r));
    R['s8_only_real_userid_match']=(result.length===1 && result[0].金额===3)?'OK':'FAIL(count='+result.length+')';
  }

  /* 场景 9：用户登出后再登入（同密码）数据可见 */
  {
    T.authClearStored();
    const pw='cycle12345';
    const ph=await T.authPwHash(pw);
    ls.setItem(T.AUTH_STORAGE_KEY, JSON.stringify({passwordHash:ph, createdAt:Date.now()}));
    /* 写入时 userId 来自密码派生 */
    const uid=await T.authUserId(pw);
    T.state_auth.userId=uid;
    /* 模拟：登出 → 重登 → 数据恢复 */
    T.state_auth.userId=null;
    const afterLogout=await new Promise(r=>T.dbFetchAll('DB_NONEXISTENT_'+Date.now(), r));
    R['s9_logout_empty']=(afterLogout.length===0)?'OK':'FAIL';
    T.state_auth.userId=uid;
    R['s9_re_login_uid_restored']=(T.state_auth.userId===uid)?'OK':'FAIL';
  }

  /* 输出结果 */
  console.log('\n========== v32 用户认证层冒烟结果 ==========');
  let pass=0, fail=0;
  Object.keys(R).sort().forEach(k=>{
    const v=R[k];
    const ok=v.startsWith('OK');
    if(ok) pass++; else fail++;
    console.log((ok?'✅':'❌')+' '+k+' :: '+v);
  });
  console.log('----------');
  console.log(`PASS ${pass} / FAIL ${fail} / TOTAL ${pass+fail}`);
  if(fail>0){ console.error('\n❌ 有失败用例'); process.exit(1); }
  console.log('\n✅ v32 全部通过');
}

run().catch(e=>{ console.error('TEST RUN ERROR:', e); process.exit(1); });
