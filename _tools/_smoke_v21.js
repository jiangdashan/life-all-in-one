const LINKEDOM = 'C:/Users/依易亦奕鸭/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const { parseHTML } = require(LINKEDOM);
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('D:/workbuddyProjects/工作台3/life-all-in-one.html','utf8');
const lines = html.split('\n');
let oi=-1,ci=-1;
for(let i=0;i<lines.length;i++){ if(/<script[^>]*>/.test(lines[i]) && !/<script[^>]+src=/.test(lines[i])){oi=i;break;} }
for(let i=oi+1;i<lines.length;i++){ if(/<\/script>/.test(lines[i])){ci=i;break;} }
const src = lines.slice(oi+1,ci).join('\n');
function mkStorage(){const d={};return{_d:d,getItem:k=>k in d?d[k]:null,setItem:(k,v)=>{d[k]=String(v);},removeItem:k=>{delete d[k];},clear(){for(const k in d)delete d[k];},key:i=>Object.keys(d)[i]??null,get length(){return Object.keys(d).length;}};}
const storage=mkStorage();
const full=parseHTML(html); const w=full.window, doc=w.document;
w.scrollTo=()=>{};
if(typeof w.matchMedia!=='function')w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
if(typeof w.requestAnimationFrame!=='function'){w.requestAnimationFrame=cb=>setTimeout(cb,0);w.cancelAnimationFrame=clearTimeout;}
w.URL.createObjectURL=w.URL.createObjectURL||(()=>'blob:x'); w.URL.revokeObjectURL=w.URL.revokeObjectURL||(()=>{});
w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
try{w.localStorage=storage;}catch(e){}
if(!w.Image)w.Image=function(){};
// linkedom 不支持 form.elements（所有元素扁平成 HTMLElement）：打到实际原型上（真实浏览器无需）
(function(){
  const anyForm=doc.querySelector('form'); if(!anyForm) return;
  const proto=Object.getPrototypeOf(anyForm);
  if(Object.getOwnPropertyDescriptor(proto,'elements')) return;
  Object.defineProperty(proto,'elements',{configurable:true,get(){
    const arr=[];const seen={};
    try{this.querySelectorAll('input,select,textarea').forEach(n=>{const nm=n.getAttribute('name');if(!nm||seen[nm])return;seen[nm]=1;arr.push(n);arr[nm]=n;});}catch(e){}
    return arr;
  }});
})();
if(w.HTMLSelectElement&&w.HTMLSelectElement.prototype){try{
 const oo=s=>{const a=[],c=s.options;if(c&&typeof c.length==='number'){for(let i=0;i<c.length;i++)a.push(c[i]);}else{const q=s.querySelectorAll('option');for(let i=0;i<q.length;i++)a.push(q[i]);}return a;};
 Object.defineProperty(w.HTMLSelectElement.prototype,'value',{configurable:true,get(){const o=this.selectedIndex!=null&&this.selectedIndex>=0?oo(this)[this.selectedIndex]:null;return o?(o.getAttribute('value')!=null?o.getAttribute('value'):(o.textContent||'').trim()):'';},set(v){const o=oo(this),t=String(v==null?'':v);for(let i=0;i<o.length;i++){const val=o[i].getAttribute('value')!=null?o[i].getAttribute('value'):(o[i].textContent||'').trim();if(val===t){this.selectedIndex=i;return;}}}});
}catch(e){}}
// 可迭代的 FormData 替身：让 Object.fromEntries(new FormData(form)) 在 linkedom 下工作
class FakeFormData {
  constructor(form){ this._d={}; if(!form) return;
    let els; try{ els=form.elements; }catch(e){ els=null; }
    if(!els||typeof els.length!=='number'){ els=form.querySelectorAll('[name]'); }
    for(const el of els){ if(!el.name||el.type==='submit'||el.type==='button') continue;
      if(el.type==='radio'&&!el.checked) continue;
      if(el.type==='checkbox'){ this._d[el.name]=el.checked; }
      else this._d[el.name]=el.value==null?'':el.value; } }
  *[Symbol.iterator](){ yield* Object.entries(this._d); }
  get(k){ return this._d[k]; }
}
const errors=[];
const sandbox={window:w,document:doc,localStorage:storage,FormData:FakeFormData,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:(...a)=>{}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{},__SMART_PAGE__:undefined};
sandbox.globalThis=sandbox;sandbox.self=sandbox;
vm.createContext(sandbox);
let evalErr=null;
const dbgSrc=src.replace(
  'function openFitnessProfile(){const form=document.getElementById(\'fitnessProfileForm\'),profile=state.settings.fitnessProfile;',
  'function openFitnessProfile(){const form=document.getElementById(\'fitnessProfileForm\'),profile=state.settings.fitnessProfile;__dbg.push(JSON.stringify({has:profile!==undefined,settingsKeys:Object.keys(state.settings||{}),fp:JSON.stringify(state.settings&&state.settings.fitnessProfile)}));'
);
sandbox.__dbg=[];console.log('A: typeof __dbg right after set =', typeof sandbox.__dbg, 'injected=', dbgSrc.includes('__dbg.push'));
try{vm.runInContext(dbgSrc,sandbox,{filename:'app.js'});}catch(e){evalErr=(e&&e.stack)||e;}
let domErr=null;
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){domErr=(e&&e.stack)||e;}
setTimeout(()=>{
  const R={};
  R['eval']=evalErr?'FAIL: '+evalErr:'OK';
  R['domready']=domErr?'FAIL: '+domErr:'OK';
  try{
    var dbg=JSON.parse(storage.getItem('richangji-state-v1')||'null');
    R['dbg_settings_keys']=dbg?Object.keys(dbg.settings||{}):'NO STATE';
    R['dbg_fp']=dbg?JSON.stringify(dbg.settings.fitnessProfile):'-';
    // 1) 表单里有起始体重输入框
    const form=doc.getElementById('fitnessProfileForm');
    const sw=form.querySelector('[name="startWeight"]');
    R['field_exists']=sw?'OK':'FAIL(无 startWeight 输入框)';
    // 2) 打开目标设置 → 回填默认 60
    const openBtn=doc.querySelector('[data-action="open-fitness-profile"]');
    openBtn.dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));

    R['sheet_opened']=doc.getElementById('fitnessProfileSettings').hidden===false?'OK':'FAIL(弹窗未打开)';
    R['prefill_60']=sw.value==='60'?'OK':'FAIL(回填值='+sw.value+')';
    // 3) 改起始体重为 65.5 并保存
    sw.value='65.5';
    form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
    // 4) 起点文本与持久化
    const startText=doc.getElementById('fitnessStartText').textContent;
    R['start_text']=/起点 65\.5 kg/.test(startText)?'OK':'FAIL(显示='+startText+')';
    const saved=JSON.parse(storage.getItem('richangji-state-v1'));
    R['persisted']=saved.settings.fitnessProfile.startWeight===65.5?'OK':'FAIL(持久化='+saved.settings.fitnessProfile.startWeight+')';
    R['other_fields_kept']=saved.settings.fitnessProfile.height===165&&saved.settings.fitnessProfile.target===55?'OK':'FAIL';
    // 5) 进度条/百分比重算无异常
    R['percent']=/%$/.test(doc.getElementById('fitnessPercent').textContent)?'OK':'FAIL';
  }catch(e){ R['exception']='FAIL: '+((e&&e.stack)||e); }
  console.log('C: __dbg after click =', JSON.stringify(sandbox.__dbg));
  console.log('===== V21 SMOKE =====');
  console.log(JSON.stringify(R,null,2));
  const bad=Object.entries(R).filter(([k,v])=>typeof v==='string'&&/^FAIL/.test(v));
  process.exit(bad.length?1:0);
},350);
