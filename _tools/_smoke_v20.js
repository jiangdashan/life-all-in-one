const LINKEDOM = 'C:/Users/依易亦奕鸭/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const { parseHTML } = require(LINKEDOM);
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('D:/workbuddyProjects/工作台3/life-all-in-one.html','utf8');
const seed = fs.readFileSync('_state_seed.json','utf8');
const lines = html.split('\n');
let oi=-1,ci=-1;
for(let i=0;i<lines.length;i++){ if(/<script[^>]*>/.test(lines[i]) && !/<script[^>]+src=/.test(lines[i])){oi=i;break;} }
for(let i=oi+1;i<lines.length;i++){ if(/<\/script>/.test(lines[i])){ci=i;break;} }
const src = lines.slice(oi+1,ci).join('\n');
function mkStorage(){const d={};return{_d:d,getItem:k=>k in d?d[k]:null,setItem:(k,v)=>{d[k]=String(v);},removeItem:k=>{delete d[k];},clear(){for(const k in d)delete d[k];},key:i=>Object.keys(d)[i]??null,get length(){return Object.keys(d).length;}};}
const storage=mkStorage();
storage.setItem('richangji-state-v1', seed);
const full=parseHTML(html); const w=full.window, doc=w.document;
w.scrollTo=()=>{};
if(typeof w.matchMedia!=='function')w.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
if(typeof w.requestAnimationFrame!=='function'){w.requestAnimationFrame=cb=>setTimeout(cb,0);w.cancelAnimationFrame=clearTimeout;}
w.URL.createObjectURL=w.URL.createObjectURL||(()=>'blob:x'); w.URL.revokeObjectURL=w.URL.revokeObjectURL||(()=>{});
w.alert=()=>{};w.confirm=()=>true;w.prompt=()=>null;
try{w.localStorage=storage;}catch(e){}
if(!w.Image)w.Image=function(){};
if(w.HTMLSelectElement&&w.HTMLSelectElement.prototype){try{
 const oo=s=>{const a=[],c=s.options;if(c&&typeof c.length==='number'){for(let i=0;i<c.length;i++)a.push(c[i]);}else{const q=s.querySelectorAll('option');for(let i=0;i<q.length;i++)a.push(q[i]);}return a;};
 Object.defineProperty(w.HTMLSelectElement.prototype,'value',{configurable:true,get(){const o=this.selectedIndex!=null&&this.selectedIndex>=0?oo(this)[this.selectedIndex]:null;return o?(o.getAttribute('value')!=null?o.getAttribute('value'):(o.textContent||'').trim()):'';},set(v){const o=oo(this),t=String(v==null?'':v);for(let i=0;i<o.length;i++){const val=o[i].getAttribute('value')!=null?o[i].getAttribute('value'):(o[i].textContent||'').trim();if(val===t){this.selectedIndex=i;return;}}}});
}catch(e){}}
const errors=[];
const sandbox={window:w,document:doc,localStorage:storage,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:(...a)=>{}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,FormData,scrollTo:()=>{},scrollBy:()=>{},__SMART_PAGE__:undefined};
sandbox.globalThis=sandbox;sandbox.self=sandbox;
vm.createContext(sandbox);
let evalErr=null;
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){evalErr=(e&&e.stack)||e;}
let domErr=null;
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){domErr=(e&&e.stack)||e;}
setTimeout(()=>{
  const R={};
  R['eval']=evalErr?'FAIL: '+evalErr:'OK';
  R['domready']=domErr?'FAIL: '+domErr:'OK';
  // diet: inspect #dietList details open attrs
  const dietList=doc.getElementById('dietList');
  const details=[].slice.call(dietList.querySelectorAll('details.date-group'));
  const detailInfo=details.map(d=>{const st=d.querySelector('summary strong');return {txt:(st?st.textContent:'').trim(),open:d.hasAttribute('open')};});
  R['diet_groups']=detailInfo;
  R['diet_today_open']=detailInfo.some(g=>g.open && g.txt==='今天')?'OK':'FAIL';
  R['diet_older_collapsed']=detailInfo.some(g=>!g.open && /1 日|1日/.test(g.txt)&&g.txt.indexOf('9')>=0)?'OK':'FAIL';
  // diet inner scroll css presence is not runtime-testable; check element id exists
  R['dietList_scrollable']=dietList?'OK(element present)':'FAIL';
  // mood: legend removed
  R['moodLegend_gone']=doc.getElementById('moodLegend')===null?'OK':'FAIL(legend still present)';
  R['moodLegend_div_count']=doc.querySelectorAll('.mood-cal-legend').length;
  // mood timeline feeling echo
  const moodList=doc.getElementById('moodList');
  const rows=[].slice.call(moodList.querySelectorAll('.mood-row'));
  const moodRows=rows.map(r=>r.textContent.trim());
  R['mood_rows']=moodRows;
  R['mood_feeling_echoed']=rows.some(r=>/面试/.test(r.textContent))?'OK':'FAIL(feeling not shown in timeline)';
  console.log('===== V20 SMOKE =====');
  console.log(JSON.stringify(R,null,2));
  const bad=Object.values(R).filter(v=>typeof v==='string'&&/^FAIL/.test(v));
  process.exit(bad.length?1:0);
},350);
