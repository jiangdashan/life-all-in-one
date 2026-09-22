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
w.scrollTo=()=>{};
w.__TESTING__=true;
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
// form.elements polyfill
(function(){doc.querySelectorAll('form').forEach(function(anyForm){const proto=Object.getPrototypeOf(anyForm);if(Object.getOwnPropertyDescriptor(proto,'elements'))return;Object.defineProperty(proto,'elements',{configurable:true,get(){const arr=[];const seen={};try{this.querySelectorAll('input,select,textarea').forEach(function(n){const nm=n.getAttribute('name');if(!nm||seen[nm])return;seen[nm]=1;arr.push(n);arr[nm]=n;});}catch(e){}return arr;}});});})();
// FakeFormData
class FakeFormData{constructor(form){this._d={};if(!form)return;let els;try{els=form.elements;}catch(e){els=null;}if(!els||typeof els.length!=='number')els=form.querySelectorAll('[name]');for(const el of els){if(!el.name||el.type==='submit'||el.type==='button')continue;if(el.type==='radio'&&!el.checked)continue;if(el.type==='checkbox')this._d[el.name]=el.checked;else this._d[el.name]=el.value==null?'':el.value;}}*[Symbol.iterator](){yield* Object.entries(this._d);}get(k){return this._d[k];}}

const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:FakeFormData,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:(...a)=>{}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{},__SMART_PAGE__:undefined};
sandbox.globalThis=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox);
let evalErr=null, domErr=null;
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){evalErr=(e&&e.stack)||e;}
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){domErr=(e&&e.stack)||e;}

setTimeout(async()=>{
  const R={};
  R['eval']=evalErr?'FAIL: '+evalErr:'OK';
  R['domready']=domErr?'FAIL: '+domErr:'OK';
  const app=sandbox.window.__appTest;
  R['test_expose']=app?'OK':'FAIL(无 __appTest)';

  try{
    if(!app) throw new Error('no test exposure');

    // 1. 切换视图
    app.switchView('period');
    R['switch_view']=doc.getElementById('view-period').classList.contains('active')?'OK':'FAIL';

    // 2. 未设置 PIN → 锁屏
    R['lock_no_pin']=(doc.getElementById('periodLockPanel').hidden===false && doc.getElementById('periodLockSetup').hidden===false)?'OK':'FAIL';
    R['content_hidden']=(doc.getElementById('periodContent').hidden===true)?'OK':'FAIL';

    // 3. 设置 PIN
    doc.getElementById('periodPinSetupInput').value='1234';
    doc.getElementById('periodPinSetupConfirm').value='1234';
    doc.querySelector('[data-action="period-pin-set"]').dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,300));
    R['pin_set']=(app.state.settings.periodPinHash && app.periodUnlocked())?'OK':'FAIL';

    // 4. 内容显示
    R['content_visible']=(doc.getElementById('periodContent').hidden===false)?'OK':'FAIL';

    // 5. 锁定 + 错误 PIN
    app.periodLock(); app.renderPeriod();
    R['re_locked']=(doc.getElementById('periodLockEnter').hidden===false)?'OK':'FAIL';
    doc.getElementById('periodPinEnterInput').value='9999';
    doc.querySelector('[data-action="period-pin-enter"]').dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,300));
    R['wrong_pin_hint']=(doc.getElementById('periodLockHint').textContent.indexOf('错误')>=0)?'OK':'FAIL';
    R['wrong_pin_locked']=!app.periodUnlocked()?'OK':'FAIL';

    // 6. 正确 PIN
    doc.getElementById('periodPinEnterInput').value='1234';
    doc.querySelector('[data-action="period-pin-enter"]').dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,300));
    R['correct_pin_unlocked']=app.periodUnlocked()?'OK':'FAIL';

    // 7. 表单交互
    doc.querySelector('[data-period-state="start"]').dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    R['state_start']=(app.state._periodForm.isStartDay==='Y' && app.state._periodForm.isPeriodDay==='Y')?'OK':'FAIL';
    doc.querySelector('[data-chip-group="discharge"] .chip[data-value="蛋清样"]').dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    R['discharge_set']=(app.state._periodForm.discharge==='蛋清样')?'OK':'FAIL';
    const padPlus=doc.querySelector('[data-counter="pad"][data-delta="1"]');
    padPlus.dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    padPlus.dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    padPlus.dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    R['pad_count']=(app.state._periodForm.pad===3)?'OK':'FAIL';

    // 8. 提交表单（直接调 addRecord 模拟）
    const periodRecsBefore=app.state.records.filter(r=>r.type==='period').length;
    const _addRet = app.addRecord('period','2026-09-06',{isStartDay:'Y',isPeriodDay:'Y',isEndDay:'',discharge:'蛋清样',symptoms:['腹痛'],moodScore:5,moodLabel:'',bleeding:3,pad:3,night:0,note:'冒烟测试'});
    R['addRecord_ret']=String(_addRet);
    const periodRecsAfter=app.state.records.filter(r=>r.type==='period').length;
    R['record_added']=(periodRecsAfter===periodRecsBefore+1)?'OK':'FAIL';
    const last=app.state.records.filter(r=>r.type==='period').pop();
    R['record_payload']=(last && last.data.isStartDay==='Y' && last.data.discharge==='蛋清样' && last.data.pad===3 && last.data.moodScore===5 && last.data.bleeding===3)?'OK':'FAIL('+JSON.stringify(last&&last.data)+')';

    // 9. 渲染区
    app.renderPeriod();
    R['history_rendered']=doc.getElementById('periodHistory').textContent.indexOf('2026-09-06')>=0?'OK':'FAIL';
    R['stats_rendered']=doc.getElementById('periodStats').textContent.indexOf('片')>=0?'OK':'FAIL';
    R['analysis_rendered']=doc.getElementById('periodAnalysis').textContent.indexOf('阶段')>=0?'OK':'FAIL';
    R['mood_stats']=doc.getElementById('periodMoodStats').textContent.indexOf('月经期')>=0?'OK':'FAIL';

    // 10. analyzePeriod 多周期
    app.state.records.push({id:'t1',type:'period',date:'2026-08-01',sample:false,data:{isStartDay:'Y',isPeriodDay:'Y',symptoms:[],moodScore:6}});
    app.state.records.push({id:'t2',type:'period',date:'2026-08-02',sample:false,data:{isStartDay:'',isPeriodDay:'Y',symptoms:[],moodScore:5}});
    app.state.records.push({id:'t3',type:'period',date:'2026-08-03',sample:false,data:{isStartDay:'',isPeriodDay:'Y',symptoms:['腹痛'],moodScore:4}});
    app.state.records.push({id:'t4',type:'period',date:'2026-08-29',sample:false,data:{isStartDay:'Y',isPeriodDay:'Y',symptoms:[],moodScore:7}});
    app.state.records.push({id:'t5',type:'period',date:'2026-08-30',sample:false,data:{isStartDay:'',isPeriodDay:'Y',symptoms:['乳房胀痛'],moodScore:6}});
    const a=app.analyzePeriod(app.state.records);
    R['analyze_starts']=(a.starts.indexOf('2026-08-01')>=0 && a.starts.indexOf('2026-08-29')>=0)?'OK':'FAIL';
    R['analyze_cycle_28']=(a.cycles.indexOf(28)>=0)?'OK':'FAIL('+JSON.stringify(a.cycles)+')';
    R['analyze_period_len']=(a.periodLens.length===2 && a.periodLens[0]===3 && a.periodLens[1]===2)?'OK_v26(未闭合周期不计入均值)('+JSON.stringify(a.periodLens)+')':'FAIL('+JSON.stringify(a.periodLens)+')';
    R['analyze_avg_cycle']=(a.avgCycle===28)?'OK':'FAIL('+a.avgCycle+')';

    // 11. mergePeriod
    const fakeRows=[{_id:'rP1',"\u65e5\u671f":'2026-08-01',"\u662f\u5426\u7ecf\u671f":'Y',"\u662f\u5426\u7ecf\u671f\u9996\u65e5":'Y',"\u662f\u5426\u7ecf\u671f\u672b\u65e5":'',"\u5206\u6ccc\u7269":'\u7c98\u7a20','\u5fc3\u60c5\u503c':7,'\u5fc3\u60c5\u6807\u7b7e':'\u5e73\u9759','\u536b\u751f\u5dfe\u6570\u91cf':2,'\u5b89\u7761\u88e4\u6570\u91cf':1,'\u51fa\u8840\u91cf':3,'\u5907\u6ce8':'\u6d4b\u8bd5','\u611f\u53d7':'["\u75b2\u5026","\u8179\u75db"]'}];
    app.state.records = app.state.records.filter(r=>!(r.type==='period' && r.date==='2026-08-01'));
    app.mergePeriod(fakeRows);
    const merged=app.state.records.find(r=>r.type==='period' && r.date==='2026-08-01');
    R['merge_basic']=(merged && merged.remoteId==='rP1' && merged.data.discharge==='\u7c98\u7a20' && merged.data.pad===2 && merged.data.night===1 && merged.data.bleeding===3)?'OK':'FAIL';
    R['merge_symptoms']=(merged && JSON.stringify(merged.data.symptoms)==='["\u75b2\u5026","\u8179\u75db"]')?'OK':'FAIL';

    // 12. UI 元素
    R['i_period_svg']=doc.getElementById('i-period')?'OK':'FAIL';
    R['mobile_nav']=doc.querySelector('.mobile-nav [data-nav="period"]')?'OK':'FAIL';
    R['sidebar_nav']=doc.querySelector('.sidebar .nav-item[data-nav="period"]')?'OK':'FAIL';
  }catch(e){ R['exception']='FAIL: '+((e&&e.stack)||String(e)).slice(0,500); }

  console.log('===== V24 PERIOD SMOKE =====');
  console.log(JSON.stringify(R,null,2));
  const bad=Object.entries(R).filter(([k,v])=>typeof v==='string'&&/^FAIL/.test(v));
  process.exit(bad.length?1:0);
},500);
