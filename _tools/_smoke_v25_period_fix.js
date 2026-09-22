/* v25 冒烟测试：验证三个修复
 * ① periodForm submit handler 真实生效（不是直接调 addRecord）
 * ② mood 滑块实时更新显示
 * ③ TYPE_META.period 已定义
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
/* form.elements polyfill */
(function(){doc.querySelectorAll('form').forEach(function(anyForm){const proto=Object.getPrototypeOf(anyForm);if(Object.getOwnPropertyDescriptor(proto,'elements'))return;Object.defineProperty(proto,'elements',{configurable:true,get(){const arr=[];const seen={};try{this.querySelectorAll('input,select,textarea').forEach(function(n){const nm=n.getAttribute('name');if(!nm||seen[nm])return;seen[nm]=1;arr.push(n);arr[nm]=n;});}catch(e){}return arr;}});});})();
/* FakeFormData */
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

    /* ====== 修复 #1 验证：periodForm submit handler 真实生效 ====== */
    app.switchView('period');
    /* 触发锁屏走流程：设置 PIN → 模拟一次 submit（走真实 submit 事件） */
    doc.getElementById('periodPinSetupInput').value='1234';
    doc.getElementById('periodPinSetupConfirm').value='1234';
    doc.querySelector('[data-action="period-pin-set"]').dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,300));
    R['pin_set_for_v25']=app.periodUnlocked()?'OK':'FAIL';

    /* 在表单上点几个按钮，触发 _periodForm 累积 */
    doc.querySelector('[data-period-state="start"]').dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    doc.querySelector('[data-chip-group="discharge"] .chip[data-value="水样"]').dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    const padPlus=doc.querySelector('[data-counter="pad"][data-delta="1"]');
    padPlus.dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    padPlus.dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    R['form_state_acc']=(app.state._periodForm.isStartDay==='Y' && app.state._periodForm.discharge==='水样' && app.state._periodForm.pad===2)?'OK':'FAIL';

    /* ★ 关键：真实 submit 事件触发（v25 修复的核心） */
    const periodBefore=app.state.records.filter(r=>r.type==='period').length;
    const submitEvent=new w.Event('submit',{bubbles:true,cancelable:true});
    const formEl=doc.getElementById('periodForm');
    /* 设置日期输入 */
    const dateInput=formEl.querySelector('input[name="date"]');
    if(dateInput) dateInput.value='2026-09-06';
    /* 走原生 dispatchEvent（会触发所有监听器） */
    try{formEl.dispatchEvent(submitEvent);}catch(e){R['submit_dispatch_err']='FAIL: '+e;}
    await new Promise(r=>setTimeout(r,100));
    const periodAfter=app.state.records.filter(r=>r.type==='period').length;
    R['v25_submit_saves']=(periodAfter===periodBefore+1)?'OK':'FAIL(before='+periodBefore+',after='+periodAfter+')';

    /* 验证新增的 record 字段齐全 */
    const last=app.state.records.filter(r=>r.type==='period').pop();
    R['v25_record_fields']=(last && last.type==='period' && last.data.isStartDay==='Y' && last.data.discharge==='水样' && last.data.pad===2 && last.data.moodScore===5)?'OK':'FAIL('+JSON.stringify(last&&last.data)+')';

    /* 验证 submit 后表单已 reset（_periodForm 回到默认：false/''/[]/0） */
    R['v25_form_reset_after_submit']=(!app.state._periodForm.isStartDay && !app.state._periodForm.pad && !app.state._periodForm.discharge && !(app.state._periodForm.symptoms||[]).length)?'OK':'FAIL('+JSON.stringify(app.state._periodForm)+')';

    /* 空表单拒绝：清空 + 提交应该 toast 错误且不增加记录 */
    const beforeBlank=app.state.records.filter(r=>r.type==='period').length;
    const submitBlank=new w.Event('submit',{bubbles:true,cancelable:true});
    try{formEl.dispatchEvent(submitBlank);}catch(e){}
    await new Promise(r=>setTimeout(r,100));
    const afterBlank=app.state.records.filter(r=>r.type==='period').length;
    R['v25_blank_rejected']=(afterBlank===beforeBlank)?'OK':'FAIL';

    /* ====== 修复 #2 验证：mood 滑块实时显示 ====== */
    const scoreEl=doc.getElementById('periodMoodScore');
    const scoreValEl=doc.getElementById('periodMoodScoreVal');
    R['v25_score_el_exists']=(scoreEl && scoreValEl)?'OK':'FAIL';
    /* 初始值 */
    const initVal=scoreValEl.textContent;
    R['v25_score_initial']=(initVal==='5')?'OK':'FAIL('+initVal+')';
    /* 模拟拖动到 8 */
    scoreEl.value='8';
    const inputEvent=new w.Event('input',{bubbles:true});
    scoreEl.dispatchEvent(inputEvent);
    R['v25_score_updates_to_8']=(scoreValEl.textContent==='8')?'OK':'FAIL('+scoreValEl.textContent+')';
    /* 模拟拖动到 2 */
    scoreEl.value='2';
    scoreEl.dispatchEvent(new w.Event('input',{bubbles:true}));
    R['v25_score_updates_to_2']=(scoreValEl.textContent==='2')?'OK':'FAIL('+scoreValEl.textContent+')';

    /* ====== 修复 #3 验证：TYPE_META.period 已定义 ====== */
    /* 直接读 IIFE 内部的 TYPE_META 不行（私有）；通过 _tlMeta 函数验证 */
    const ev=[];
    app.state.records.push({id:'verify-period',type:'period',date:'2026-09-06',sample:false,data:{isStartDay:'Y',isPeriodDay:'Y',discharge:'',symptoms:[],pad:0,night:0,moodScore:5}});
    /* 触发 _tlMeta 路径：模拟一个 _buildTimelineEvents 调用 */
    /* 直接调用 IIFE 私有函数不行，所以通过 renderArchive 渲染，验证产物里有 "经期" 标签和 i-period 图标 */
    /* 先切换到 archive 视图 */
    app.switchView('archive');
    /* renderArchive 已在 init 调过，现在直接调一次 */
    try{
      /* 模拟：在 sandbox 中触发 _buildTimelineEvents + renderArchive
       * 因为是私有，无法直接调；改用评估代码：检查 IIFE 编译结果里 TYPE_META 是否包含 period
       */
      const srcStr=src;
      R['v25_type_meta_period_in_source']=(srcStr.indexOf("period:{label:'经期',icon:'i-period',tone:'plum'}")>=0)?'OK':'FAIL';
    }catch(e){R['v25_type_meta_period_in_source']='FAIL: '+e;}

    /* 也通过用户点击「全部」filter 来强制触发 _tlMeta('period')：
     * 但 _tlMeta 是私有；最简单的：通过 archive 视图产出 HTML 验证 */
    /* 直接调 sandbox 内重渲染 archive： */
    try{
      /* 重新派发点击以触发 renderArchive（renderArchive 读 _buildTimelineEvents → _tlMeta） */
      const filtAll=doc.querySelector('#archiveFilters [data-filter="all"]');
      if(filtAll){ filtAll.dispatchEvent(new w.Event('click',{bubbles:true})); }
      const archiveHtml=doc.getElementById('archiveList').innerHTML;
      /* period 记录 type tag 应包含"经期" */
      R['v25_archive_label_is_经期']=(archiveHtml.indexOf('经期')>=0)?'OK':'FAIL';
      /* archive 里的 dot 用了 i-period SVG path */
      R['v25_archive_uses_i_period']=(archiveHtml.indexOf('#i-period')>=0)?'OK':'FAIL';
    }catch(e){R['v25_archive_label_is_经期']='FAIL: '+e;R['v25_archive_uses_i_period']='FAIL: '+e;}

  }catch(e){ R['exception']='FAIL: '+((e&&e.stack)||String(e)).slice(0,500); }

  console.log('===== V25 PERIOD FIX SMOKE =====');
  console.log(JSON.stringify(R,null,2));
  const bad=Object.entries(R).filter(([k,v])=>typeof v==='string'&&/^FAIL/.test(v));
  process.exit(bad.length?1:0);
},500);