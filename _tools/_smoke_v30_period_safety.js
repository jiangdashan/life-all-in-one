/* v30 冒烟测试：
 * Fix 1+2: 无 cycles 时不预测下次经期（nextPredicted=null）
 * Fix 3: mergePeriod union 模式保护本地所有 period 记录
 * Fix 3 配套: pushPeriod 改 upsert 避免云端翻倍
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
if(w.HTMLSelectElement&&w.HTMLSelectElement.prototype){try{
 const oo=s=>{const a=[],c=s.options;if(c&&typeof c.length==='number'){for(let i=0;i<c.length;i++)a.push(c[i]);}else{const q=s.querySelectorAll('option');for(let i=0;i<c.length;i++)a.push(q[i]);}return a;};
 Object.defineProperty(w.HTMLSelectElement.prototype,'options',{get(){return oo(this);}});
}catch(e){}}
try{Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')),'elements',{get(){return this.querySelectorAll('[name]');}});}catch(e){}
w.FormData=class{constructor(f){this._f=f;this._m=new Map();if(f){const els=f.querySelectorAll('[name]');for(const el of els){const t=(el.type||'').toLowerCase();if(t==='radio'){if(el.checked)this._m.set(el.name,el.value);}else if(t==='checkbox'){if(el.checked)this._m.set(el.name,'on');}else{this._m.set(el.name,el.value||'');}}}}get(k){return this._m.has(k)?this._m.get(k):null;}entries(){return [...this._m.entries()];}};w.Event=class{constructor(t,o){this.type=t;this.bubbles=!!(o&&o.bubbles);this.cancelable=!!(o&&o.cancelable);}};
w.requestIdleCallback=w.requestIdleCallback||(cb=>setTimeout(cb,0));

const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:w.FormData,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new w.URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:(...a)=>{try{process.stdout.write('PAGE LOG: '+a.map(x=>typeof x==='string'?x:JSON.stringify(x)).join(' ')+'\n');}catch(e){}},warn:(...a)=>{},error:(...a)=>{process.stderr.write('PAGE ERR: '+a.map(x=>x&&x.message?x.message:String(x)).join(' ')+'\n');}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{},__SMART_PAGE__:undefined};
sandbox.globalThis=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox);
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){console.error('SCRIPT ERR',e&&e.stack||e);process.exit(1);}
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){}

void (async () => {
  const R={};
  const app=sandbox.window.__appTest;
  if(!app){console.error('NO APP TEST');process.exit(1);}

  /* ==================== 场景 1：零历史 cycles 时不预测（Fix 1） ==================== */
  // 0 条 period：lastStart=null → nextPredicted=null → hero 显示"记录一次经期首日"
  {
    app.state.records = [];
    const a = app.analyzePeriod([]);
    R['v30_fix1_empty_lastStart_null'] = (a.lastStart === null) ? 'OK' : 'FAIL('+a.lastStart+')';
    R['v30_fix1_empty_nextPredicted_null'] = (a.nextPredicted === null) ? 'OK' : 'FAIL('+a.nextPredicted+')';
  }

  // 1 条 starts（还没形成完整周期）→ cycles=[] → nextPredicted=null
  {
    app.state.records = [{id:'p1',type:'period',date:'2026-09-01',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()}];
    const a = app.analyzePeriod(app.state.records);
    R['v30_fix1_oneStart_lastStart_set'] = (a.lastStart === '2026-09-01') ? 'OK' : 'FAIL('+a.lastStart+')';
    R['v30_fix1_oneStart_cycles_zero'] = (a.cycles.length === 0) ? 'OK' : 'FAIL(len='+a.cycles.length+')';
    R['v30_fix1_oneStart_nextPredicted_null'] = (a.nextPredicted === null) ? 'OK' : 'FAIL('+a.nextPredicted+')——这就是用户 1+2 共同根因：cycles=0 时不应预测';
  }

  // 2 条 starts + 中间闭合 → cycles=1 → nextPredicted 仍可预测（但样本不足）
  {
    app.state.records = [
      {id:'p1',type:'period',date:'2026-08-01',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()},
      {id:'p2',type:'period',date:'2026-08-05',data:{isEndDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()},
      {id:'p3',type:'period',date:'2026-09-01',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()}
    ];
    const a = app.analyzePeriod(app.state.records);
    R['v30_fix1_twoCycles_cycles_one'] = (a.cycles.length === 1) ? 'OK' : 'FAIL(len='+a.cycles.length+')';
    R['v30_fix1_twoCycles_nextPredicted_set'] = (a.nextPredicted !== null) ? 'OK' : 'FAIL('+a.nextPredicted+')';
  }

  // hero 渲染：cycles=0 时 hero 不显示预测日期数字
  {
    app.state.records = [{id:'p1',type:'period',date:'2026-09-01',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()}];
    app.state.settings.periodPinHash = 'fake-hash';
    app.state.settings.periodPinSalt = 'fake-salt';
    app.periodMarkUnlocked();
    app.switchView('period');
    await new Promise(r=>setTimeout(r,50));
    app.renderPeriod();
    const heroEl = doc.getElementById('periodNextHero');
    const html = heroEl ? (heroEl.outerHTML || '') : '';
    R['v30_fix1_hero_no_prediction_when_no_cycles'] = (html.indexOf('样本不足') >= 0 || html.indexOf('—') >= 0) ? 'OK' : 'FAIL——hero 应显示样本不足占位，不显示预测日期';
    R['v30_fix1_hero_no_next_days_number'] = (html.indexOf('next-days') < 0) ? 'OK' : 'FAIL——hero 不应有 next-days 数字（无预测时）';
  }

  // 用户原话 2：当前月还未记录的数据不能算历史 → 测试"只有当前月 09-05 一条 starts"
  {
    const today = new Date();
    const todayStr = today.toISOString().slice(0,10);
    app.state.records = [{id:'p1',type:'period',date:todayStr,data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()}];
    const a = app.analyzePeriod(app.state.records);
    R['v30_fix2_todayOnly_no_predict'] = (a.nextPredicted === null && a.cycles.length === 0) ? 'OK' : 'FAIL(nextPredicted='+a.nextPredicted+' cycles='+a.cycles.length+')——只有当前月 1 条首日不算历史，不应预测下次';
  }

  /* ==================== 场景 2：mergePeriod union 模式（Fix 3） ==================== */

  // 场景 2.1：本地有 1 条已同步（remoteId=X），云端返回 1 条 X → 用云端覆盖
  {
    app.state.records = [{id:'l1',type:'period',date:'2026-08-01',remoteId:'X1',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()}];
    const remoteRows = [{
      "_id":"X1", "日期":"2026-08-01","是否经期":"Y","是否经期首日":"Y","是否经期末日":"","分泌物":"","感受":"[]","心情值":5,"心情标签":"","卫生巾数量":0,"安睡裤数量":0,"出血量":0,"备注":""
    }];
    app.mergePeriod(remoteRows);
    const periodRecs = app.state.records.filter(r=>r.type==='period');
    R['v30_union_cloud_match_count'] = (periodRecs.length === 1) ? 'OK' : 'FAIL(count='+periodRecs.length+')';
    R['v30_union_cloud_match_remoteId'] = (periodRecs[0] && periodRecs[0].remoteId === 'X1') ? 'OK' : 'FAIL('+JSON.stringify(periodRecs[0])+')';
  }

  // 场景 2.2：本地有 1 条已同步（remoteId=X），云端不返回 X（云端少传/被对端删除）→ 本地保留，绝不丢！
  {
    app.state.records = [{id:'l1',type:'period',date:'2026-08-01',remoteId:'X1',data:{isStartDay:'Y',isPeriodDay:'Y',moodScore:7},createdAt:Date.now(),updatedAt:Date.now()}];
    const remoteRows = []; // 云端空
    app.mergePeriod(remoteRows);
    const periodRecs = app.state.records.filter(r=>r.type==='period');
    R['v30_union_no_cloud_keeps_local'] = (periodRecs.length === 1) ? 'OK' : 'FAIL(count='+periodRecs.length+')——云端不传时本地必须保留';
    R['v30_union_no_cloud_keeps_local_data'] = (periodRecs[0] && periodRecs[0].data.moodScore === 7) ? 'OK' : 'FAIL——本地 data 必须完整保留';
    R['v30_union_no_cloud_keeps_local_remoteId'] = (periodRecs[0] && periodRecs[0].remoteId === 'X1') ? 'OK' : 'FAIL——本地 remoteId 必须保留';
  }

  // 场景 2.3：本地无 remoteId（新增未同步），云端返回任意条 → 本地未同步保留
  {
    app.state.records = [{id:'l1',type:'period',date:'2026-09-01',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()}];
    const remoteRows = [{
      "_id":"Y1", "日期":"2026-08-01","是否经期":"Y","是否经期首日":"Y","是否经期末日":"","分泌物":"","心情值":5,"心情标签":"","卫生巾数量":0,"安睡裤数量":0,"出血量":0,"备注":""
    }];
    app.mergePeriod(remoteRows);
    const periodRecs = app.state.records.filter(r=>r.type==='period');
    R['v30_union_unsynced_local_kept'] = (periodRecs.length === 2) ? 'OK' : 'FAIL(count='+periodRecs.length+')——本地未同步 + 云端独有 = 2 条';
    R['v30_union_unsynced_local_id'] = (periodRecs.find(r=>r.id==='l1')) ? 'OK' : 'FAIL——本地 l1 必须保留';
    R['v30_union_cloud_only_added'] = (periodRecs.find(r=>r.remoteId==='Y1')) ? 'OK' : 'FAIL——云端 Y1 必须补进来';
  }

  // 场景 2.4：混合 - 本地 3 条 + 云端 2 条（云端少了 1 条） → union 后 3 条都在
  {
    app.state.records = [
      {id:'l1',type:'period',date:'2026-08-01',remoteId:'X1',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()},
      {id:'l2',type:'period',date:'2026-08-05',remoteId:'X2',data:{isEndDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()},
      {id:'l3',type:'period',date:'2026-09-01',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()} // 未同步
    ];
    const remoteRows = [
      {"_id":"X1","日期":"2026-08-01","是否经期":"Y","是否经期首日":"Y","是否经期末日":"","分泌物":"","感受":"[]","心情值":5,"心情标签":"","卫生巾数量":0,"安睡裤数量":0,"出血量":0,"备注":""},
      {"_id":"X2","日期":"2026-08-05","是否经期":"","是否经期首日":"","是否经期末日":"Y","分泌物":"","感受":"[]","心情值":5,"心情标签":"","卫生巾数量":0,"安睡裤数量":0,"出血量":0,"备注":""}
      // 注意：本地 l3 无 remoteId，云端没有 → 保留本地
    ];
    app.mergePeriod(remoteRows);
    const periodRecs = app.state.records.filter(r=>r.type==='period');
    R['v30_union_mixed_count_3'] = (periodRecs.length === 3) ? 'OK' : 'FAIL(count='+periodRecs.length+')——3 条本地必须全保留';
    R['v30_union_mixed_l1_kept'] = (periodRecs.find(r=>r.id==='X1' || r.id==='l1')) ? 'OK' : 'FAIL——l1 丢失（应该被云端 X1 覆盖）';
    R['v30_union_mixed_l2_kept'] = (periodRecs.find(r=>r.id==='X2' || r.id==='l2')) ? 'OK' : 'FAIL——l2 丢失（应该被云端 X2 覆盖）';
    console.log('  DEBUG 2.4 end state: '+JSON.stringify(app.state.records.map(r=>({type:r.type,id:r.id,remoteId:r.remoteId}))));
    R['v30_union_mixed_l1_remoteId_kept'] = (periodRecs.find(r=>r.remoteId==='X1')) ? 'OK' : 'FAIL——云端覆盖后 remoteId 必须仍是 X1';
    R['v30_union_mixed_l2_remoteId_kept'] = (periodRecs.find(r=>r.remoteId==='X2')) ? 'OK' : 'FAIL';
    R['v30_union_mixed_l3_kept'] = (periodRecs.find(r=>r.id==='l3')) ? 'OK' : 'FAIL——未同步的 l3 必须保留';
  }

  // 场景 2.5：本地无 period 记录，新设备拉云端 → 全部新增
  {
    app.state.records = [];
    console.log('  DEBUG 2.5 before mergePeriod: state.records.length='+app.state.records.length);
    const remoteRows = [
      {"_id":"X1","日期":"2026-08-01","是否经期":"Y","是否经期首日":"Y","是否经期末日":"","分泌物":"","感受":"[]","心情值":5,"心情标签":"","卫生巾数量":0,"安睡裤数量":0,"出血量":0,"备注":""},
      {"_id":"X2","日期":"2026-08-05","是否经期":"","是否经期首日":"","是否经期末日":"Y","分泌物":"","感受":"[]","心情值":5,"心情标签":"","卫生巾数量":0,"安睡裤数量":0,"出血量":0,"备注":""}
    ];
    // 测试时跳过 mergePeriod 直接看转换逻辑
    console.log('  DEBUG 2.5 remoteRows.length='+remoteRows.length+' first._id='+remoteRows[0]._id);
    app.mergePeriod(remoteRows);
    console.log('  DEBUG 2.5 after mergePeriod: state.records.length='+app.state.records.length+' all types='+JSON.stringify(app.state.records.map(r=>({type:r.type,id:r.id,remoteId:r.remoteId,date:r.date}))));
    // 直接模拟 union 逻辑看哪条出问题
    const _lp = app.state.records.filter(r=>r.type==='period');
    console.log('  DEBUG 2.5 _lp.length='+_lp.length);
    const periodRecs = app.state.records.filter(r=>r.type==='period');
    R['v30_union_empty_local_pulls_all'] = (periodRecs.length === 2) ? 'OK' : 'FAIL(count='+periodRecs.length+' state.records.length='+app.state.records.length+')——本地空时应拉全部 2 条';
  }

  // 场景 2.6：rows=null（云端拉取失败）→ state.records 不变
  {
    app.state.records = [{id:'l1',type:'period',date:'2026-09-01',remoteId:'X1',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()}];
    const beforeCount = app.state.records.filter(r=>r.type==='period').length;
    app.mergePeriod(null);
    const afterCount = app.state.records.filter(r=>r.type==='period').length;
    R['v30_union_null_rows_unchanged'] = (beforeCount === afterCount) ? 'OK' : 'FAIL——云端失败时本地不变';
  }

  /* ==================== 场景 3：renderPeriod 完整链路 ==================== */
  // 模拟真实场景：用户新增 1 条首日 → renderPeriod → hero 显示样本不足（不预测）
  {
    app.state.records = [{id:'p1',type:'period',date:'2026-09-05',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()}];
    app.state.settings.periodPinHash = 'fake-hash';
    app.state.settings.periodPinSalt = 'fake-salt';
    app.periodMarkUnlocked();
    app.switchView('period');
    await new Promise(r=>setTimeout(r,50));
    app.renderPeriod();
    const heroEl = doc.getElementById('periodNextHero');
    const statusEl = doc.getElementById('periodStatus');
    const heroHtml = heroEl ? (heroEl.outerHTML || '') : '';
    const statusHtml = statusEl ? (statusEl.outerHTML || '') : '';
    R['v30_render_no_predict_in_status'] = (statusHtml.indexOf('记录更多周期后显示周期均值') >= 0) ? 'OK' : 'FAIL——状态卡在 cycles=0 时不应显示"平均 X 天周期"，应显示"记录更多周期后显示"';
    R['v30_render_hero_sample_insufficient'] = (heroHtml.indexOf('样本不足') >= 0 || heroHtml.indexOf('记录更多') >= 0) ? 'OK' : 'FAIL——hero 应显示样本不足提示';
  }

  /* ==================== 汇总 ==================== */
  let ok=0,total=0, fails=[];
  for(const k in R){
    total++;
    if(R[k]==='OK') ok++;
    else if(R[k].indexOf('FAIL')===0) fails.push(k+': '+R[k]);
  }
  console.log('\n=== v30 冒烟测试结果 ===');
  for(const k in R){ console.log('  '+R[k].padEnd(4)+' '+k); }
  console.log('\n总计：'+ok+'/'+total+' 通过');
  if (fails.length) {
    console.log('\n失败项：');
    fails.forEach(f => console.log('  '+f));
  }
  if (ok < total) process.exit(1);
})();