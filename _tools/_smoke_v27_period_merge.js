/* v26 冒烟测试：验证首末自动补全 + 智能预测
 * ① 用户只标首日+末日（不标 isPeriodDay）→ avgPeriod 算的是首末间隔天数
 * ② 多个历史周期 → nextPredicted 基于最近 3 期 avgCycle
 * ③ 周期历史行显示真实末日（不是 nextStart-1）
 * ④ 单个周期 → avgCycle 默认 28
 * ⑤ v25 回归：form submit + mood 滑块 + TYPE_META.period
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
 const oo=s=>{const a=[],c=s.options;if(c&&typeof c.length==='number'){for(let i=0;i<c.length;i++)a.push(c[i]);}else{const q=s.querySelectorAll('option');for(let i=0;i<q.length;i++)a.push(q[i]);}return a;};
 Object.defineProperty(w.HTMLSelectElement.prototype,'value',{configurable:true,get(){const o=this.selectedIndex!=null&&this.selectedIndex>=0?oo(this)[this.selectedIndex]:null;return o?(o.getAttribute('value')!=null?o.getAttribute('value'):(o.textContent||'').trim()):'';},set(v){const o=oo(this),t=String(v==null?'':v);for(let i=0;i<o.length;i++){const val=o[i].getAttribute('value')!=null?o[i].getAttribute('value'):(o[i].textContent||'').trim();if(val===t){this.selectedIndex=i;return;}}}});
}catch(e){}}
(function(){doc.querySelectorAll('form').forEach(function(anyForm){const proto=Object.getPrototypeOf(anyForm);if(Object.getOwnPropertyDescriptor(proto,'elements'))return;Object.defineProperty(proto,'elements',{configurable:true,get(){const arr=[];const seen={};try{this.querySelectorAll('input,select,textarea').forEach(function(n){const nm=n.getAttribute('name');if(!nm||seen[nm])return;seen[nm]=1;arr.push(n);arr[nm]=n;});}catch(e){}return arr;}});});})();
class FakeFormData{constructor(form){this._d={};if(!form)return;let els;try{els=form.elements;}catch(e){els=null;}if(!els||typeof els.length!=='number')els=form.querySelectorAll('[name]');for(const el of els){if(!el.name||el.type==='submit'||el.type==='button')continue;if(el.type==='radio'&&!el.checked)continue;if(el.type==='checkbox')this._d[el.name]=el.checked;else this._d[el.name]=el.value==null?'':el.value;}}*[Symbol.iterator](){yield* Object.entries(this._d);}get(k){return this._d[k];}}

const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:FakeFormData,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:(...a)=>{}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{},__SMART_PAGE__:undefined};
sandbox.globalThis=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox);
let evalErr=null, domErr=null;
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){evalErr=(e&&e.stack)||e;}
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){domErr=(e&&e.stack)||e;}

function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function shiftDays(s,n){const d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function daysBetween(d1,d2){const a=new Date(d1+'T00:00:00'),b=new Date(d2+'T00:00:00');return Math.round((b.getTime()-a.getTime())/(24*60*60*1000));}

setTimeout(async()=>{
  const R={};
  const TODAY=today();
  function rec(date,data){return {id:'r_'+date+'_'+Math.random().toString(36).slice(2,6),type:'period',date:date,sample:false,createdAt:Date.now(),data:data||{}};}

  const app=sandbox.window.__appTest;
  if(!app){console.error('NO __appTest');process.exit(1);}
  R['eval']=evalErr?'FAIL: '+evalErr:'OK';
  R['domready']=domErr?'FAIL: '+domErr:'OK';
  R['test_expose']=app?'OK':'FAIL';

  app.periodMarkUnlocked();
  /* 设 PIN 让 periodPinExists() 返回 true */
  if(!app.periodPinExists()){
    app.state.settings.periodPinHash = 'fake-hash';
    app.state.settings.periodPinSalt = 'fake-salt';
  }
  app.switchView('period');
  await new Promise(r=>setTimeout(r,100));

  /* ==================== v27 场景 1：同一天 3 次 addRecord('period') → records 只增 1 条 ==================== */
  app.state.records = app.state.records.filter(r => r.type !== 'period');
  const periodBefore = app.state.records.filter(r=>r.type==='period').length;
  const _addRet1 = app.addRecord('period', TODAY, {isStartDay:'Y', isPeriodDay:'Y', isEndDay:'', discharge:'', symptoms:['腹痛'], moodScore:5, moodLabel:'', bleeding:3, pad:2, night:0, note:''});
  const _addRet2 = app.addRecord('period', TODAY, {isStartDay:'', isPeriodDay:'Y', isEndDay:'', discharge:'粘稠', symptoms:['疲倦'], moodScore:4, moodLabel:'', bleeding:2, pad:3, night:1, note:'补记'});
  const _addRet3 = app.addRecord('period', TODAY, {isStartDay:'', isPeriodDay:'', isEndDay:'Y', discharge:'', symptoms:['乳房胀痛'], moodScore:6, moodLabel:'', bleeding:1, pad:1, night:0, note:'结束'});
  const periodAfter = app.state.records.filter(r=>r.type==='period').length;
  R['v27_s1_records_one']=(periodAfter===periodBefore+1)?'OK':'FAIL(diff='+(periodAfter-periodBefore)+')';
  R['v27_s1_addReturns']=(_addRet1 && _addRet2 && _addRet3)?'OK':'FAIL';
  const merged27 = app.state.records.filter(r=>r.type==='period').pop();
  R['v27_s1_keep_isStartDay']=(merged27 && merged27.data.isStartDay==='Y')?'OK':'FAIL('+JSON.stringify(merged27)+')';
  R['v27_s1_keep_isEndDay']=(merged27 && merged27.data.isEndDay==='Y')?'OK':'FAIL';
  R['v27_s1_keep_isPeriodDay']=(merged27 && merged27.data.isPeriodDay==='Y')?'OK':'FAIL';
  R['v27_s1_discharge']=(merged27 && merged27.data.discharge==='粘稠')?'OK':'FAIL';
  R['v27_s1_symptoms_union']=(merged27 && Array.isArray(merged27.data.symptoms) && merged27.data.symptoms.length===3 && merged27.data.symptoms.indexOf('腹痛')>=0 && merged27.data.symptoms.indexOf('疲倦')>=0 && merged27.data.symptoms.indexOf('乳房胀痛')>=0)?'OK':'FAIL('+JSON.stringify(merged27 && merged27.data.symptoms)+')';
  R['v27_s1_pad_last']=(merged27 && merged27.data.pad===1)?'OK':'FAIL('+(merged27 && merged27.data.pad)+')';
  R['v27_s1_bleeding_last']=(merged27 && merged27.data.bleeding===1)?'OK':'FAIL('+(merged27 && merged27.data.bleeding)+')';
  R['v27_s1_moodScore_last']=(merged27 && merged27.data.moodScore===6)?'OK':'FAIL('+(merged27 && merged27.data.moodScore)+')';
  const startsAfterMerge = app.analyzePeriod(app.state.records).starts;
  R['v27_s1_starts_unique']=(startsAfterMerge.length===1 && startsAfterMerge[0]===TODAY)?'OK':'FAIL('+JSON.stringify(startsAfterMerge)+')';

  /* ==================== v27 场景 2：脏数据去重（同一天 3 条都标 isStartDay=Y）==================== */
  const T2=shiftDays(TODAY,-30); const T3=shiftDays(TODAY,-60);
  const dirtyRecs = [
    rec(T2, {isStartDay:'Y', isPeriodDay:'Y', isEndDay:'', symptoms:[]}),
    rec(T2, {isStartDay:'Y', isPeriodDay:'Y', isEndDay:'', symptoms:[]}),
    rec(T2, {isStartDay:'Y', isPeriodDay:'Y', isEndDay:'', symptoms:[]}),
    rec(T3, {isStartDay:'Y', isEndDay:'Y', symptoms:[]})
  ];
  const D27 = app.analyzePeriod(dirtyRecs);
  R['v27_s2_starts_dedup']=(D27.starts.length===2 && D27.starts[0]===T3 && D27.starts[1]===T2)?'OK':'FAIL('+JSON.stringify(D27.starts)+')';

  /* ==================== v26 场景 1：用户只标首末（不标 isPeriodDay）==================== */
  const startA=shiftDays(TODAY,-60); const endA=shiftDays(startA,4);   /* 5 天经期 */
  const startB=shiftDays(TODAY,-30); const endB=shiftDays(startB,4);   /* 5 天经期 */
  const recs=[
    rec(startA,{isStartDay:'Y'}),
    rec(endA,{isEndDay:'Y'}),
    rec(startB,{isStartDay:'Y'}),
    rec(endB,{isEndDay:'Y'})
  ];
  const A=app.analyzePeriod(recs);
  R['s1_starts']=(A.starts.length===2 && A.starts[0]===startA && A.starts[1]===startB)?'OK':'FAIL('+JSON.stringify(A.starts)+')';
  R['s1_periodLens']=(A.periodLens.length===2 && A.periodLens[0]===5 && A.periodLens[1]===5)?'OK':'FAIL('+JSON.stringify(A.periodLens)+')';
  R['s1_avgPeriod']=(A.avgPeriod===5)?'OK':'FAIL('+A.avgPeriod+')';
  R['s1_cycles']=(A.cycles.length===1 && A.cycles[0]===daysBetween(startA,startB))?'OK':'FAIL('+JSON.stringify(A.cycles)+')';
  R['s1_avgCycle']=(A.avgCycle===daysBetween(startA,startB))?'OK':'FAIL('+A.avgCycle+')';
  R['s1_lastStart']=(A.lastStart===startB)?'OK':'FAIL('+A.lastStart+')';
  R['s1_periodEnds']=(A.periodEnds&&A.periodEnds.length===2 && A.periodEnds[0]===endA && A.periodEnds[1]===endB)?'OK':'FAIL('+JSON.stringify(A.periodEnds)+')';
  R['s1_nextPredicted']=(A.nextPredicted===shiftDays(startB,daysBetween(startA,startB)))?'OK':'FAIL('+A.nextPredicted+')';

  /* ==================== 场景 2：3 个历史周期（首末日分开记录） ==================== */
  const sC1=shiftDays(TODAY,-90); const eC1=shiftDays(sC1,5);  /* 6 天经期 */
  const sC2=shiftDays(TODAY,-60); const eC2=shiftDays(sC2,6);  /* 7 天经期 */
  const sC3=shiftDays(TODAY,-30); const eC3=shiftDays(sC3,5);  /* 6 天经期 */
  const sC4=shiftDays(TODAY,-3);   /* 当前周期首日 3 天前，未标末日 */
  const recs2=[
    rec(sC1,{isStartDay:'Y'}),
    rec(eC1,{isEndDay:'Y'}),
    rec(sC2,{isStartDay:'Y'}),
    rec(eC2,{isEndDay:'Y'}),
    rec(sC3,{isStartDay:'Y'}),
    rec(eC3,{isEndDay:'Y'}),
    rec(sC4,{isStartDay:'Y'})
  ];
  const B=app.analyzePeriod(recs2);
  const cycExpected=[daysBetween(sC1,sC2),daysBetween(sC2,sC3)];
  R['s2_cycles_len']=(B.cycles.length===2)?'OK':'FAIL('+B.cycles.length+')';
  R['s2_cycles_vals']=(B.cycles[0]===cycExpected[0] && B.cycles[1]===cycExpected[1])?'OK':'FAIL('+JSON.stringify(B.cycles)+')';
  const avgC=Math.round((cycExpected[0]+cycExpected[1])/2);
  R['s2_avgCycle']=(B.avgCycle===avgC)?'OK':'FAIL('+B.avgCycle+' vs '+avgC+')';
  R['s2_periodLens_3closed']=(B.periodLens.length===3 && B.periodLens[0]===6 && B.periodLens[1]===7 && B.periodLens[2]===6)?'OK':'FAIL('+JSON.stringify(B.periodLens)+')';
  R['s2_avgPeriod']=(B.avgPeriod===Math.round((6+7+6)/3))?'OK':'FAIL('+B.avgPeriod+' vs '+Math.round((6+7+6)/3)+')';
  R['s2_lastStart']=(B.lastStart===sC4)?'OK':'FAIL('+B.lastStart+')';
  R['s2_periodEnds']=(B.periodEnds&&B.periodEnds.length===4 && B.periodEnds[0]===eC1 && B.periodEnds[1]===eC2 && B.periodEnds[2]===eC3 && B.periodEnds[3]===TODAY)?'OK':'FAIL('+JSON.stringify(B.periodEnds)+')';
  R['s2_nextPredicted']=(B.nextPredicted===shiftDays(sC4,avgC))?'OK':'FAIL('+B.nextPredicted+' vs '+shiftDays(sC4,avgC)+')';

  /* ==================== 场景 3：单期（<2 周期）→ 默认 28 天 ==================== */
  const sD=shiftDays(TODAY,-10); const eD=shiftDays(sD,4);
  const recs3=[rec(sD,{isStartDay:'Y'}),rec(eD,{isEndDay:'Y'})];
  const C=app.analyzePeriod(recs3);
  R['s3_avgCycle_default28']=(C.avgCycle===28)?'OK':'FAIL('+C.avgCycle+')';
  R['s3_cycles_empty']=(C.cycles.length===0)?'OK':'FAIL('+JSON.stringify(C.cycles)+')';
  R['s3_nextPredicted_exists']=(C.nextPredicted===null)?'OK':'FAIL('+C.nextPredicted+')'; /* v30:cycles=0时不再预测 */

  /* ==================== 场景 4：末日标记异常（标到下个周期之后 → 自动回退到 nextStart-1） ==================== */
  const sE1=shiftDays(TODAY,-60);
  const eE1_BAD=shiftDays(TODAY,-15);  /* 末日错误地标到下个周期之后（> nextStart） */
  const sE2=shiftDays(TODAY,-30);
  const recs4=[
    rec(sE1,{isStartDay:'Y'}),
    rec(eE1_BAD,{isEndDay:'Y'}),   /* 末日日期在下个首日之后 */
    rec(sE2,{isStartDay:'Y'})
  ];
  const D=app.analyzePeriod(recs4);
  const eE1Correct=shiftDays(sE2,-1);
  R['s4_periodEnds_correction']=(D.periodEnds&&D.periodEnds[0]===eE1Correct)?'OK':'FAIL('+JSON.stringify(D.periodEnds)+' expected first='+eE1Correct+')';

  /* ==================== 场景 5：v25 回归 ==================== */
  const formEl=doc.getElementById('periodForm');
  R['v25_form_submit_bound']=(typeof formEl!=='undefined' && typeof formEl.onsubmit!=='function')?'OK':'FAIL';
  const _pScore=doc.getElementById('periodMoodScore');
  const _pScoreVal=doc.getElementById('periodMoodScoreVal');
  R['v25_mood_score_el']=(_pScore && _pScoreVal)?'OK':'FAIL';
  try{_pScore.value='8';_pScore.dispatchEvent(new w.Event('input'));R['v25_mood_score_input']=(_pScoreVal.textContent==='8')?'OK':'FAIL('+_pScoreVal.textContent+')';}catch(e){R['v25_mood_score_input']='ERR('+e.message+')';}

  /* ==================== 场景 6：renderPeriod 状态卡显示样本数 + 末日 ==================== */
  app.state.records=recs2;
  app.renderPeriod();
  await new Promise(r=>setTimeout(r,50));
  const statusEl=doc.getElementById('periodStatus');
  const statusHtml=statusEl.innerHTML;
  console.log('DEBUG statusHtml:', statusHtml.substring(0,400));
  console.log('DEBUG historyHtml:', doc.getElementById('periodHistory').innerHTML.substring(0,400));
  R['s6_avgCycle_sample']=(statusHtml.indexOf('次样本')>=0)?'OK':'FAIL(no "次样本" in status)';
  R['s6_history_shows_real_end']=(doc.getElementById('periodHistory').innerHTML.indexOf('至 '+eC1)>=0)?'OK':'FAIL(no 至 eC1='+eC1+' in history)';

  let ok=0,total=0;
  for(const k in R){total++; if(R[k]==='OK')ok++;}
  console.log('\n=== v26 冒烟测试结果 ===');
  for(const k in R)console.log('  ['+(R[k]==='OK'?'✅':'❌')+'] '+k+': '+R[k]);
  console.log('\n总计：'+ok+'/'+total+' 通过\n');
  process.exit(ok===total?0:1);
}, 500);
