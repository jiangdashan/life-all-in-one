#!/usr/bin/env node
/* Smoke: 验证 5 项修复在真实运行时下的表现（离线模式） */
const LINKEDOM = 'C:/Users/Administrator/.workbuddy/binaries/node/workspace/node_modules/linkedom';
const { parseHTML } = require(LINKEDOM);
const fs = require('fs');
const vm = require('vm');

const HTML_PATH = 'F:/workbuddy/工作台3/life-all-in-one.html';
const STORAGE_KEY = 'richangji-state-v1';

const html = fs.readFileSync(HTML_PATH, 'utf8');
const lines = html.split('\n');
let openIdx = -1, closeIdx = -1;
for (let i = 0; i < lines.length; i++) { if (/^<script[^>]*>$/.test(lines[i].trim()) && !/<script[^>]+src=/.test(lines[i])) { openIdx = i; break; } }
for (let i = openIdx + 1; i < lines.length; i++) { if (/<\/script>/.test(lines[i])) { closeIdx = i; break; } }
const scriptSrc = lines.slice(openIdx + 1, closeIdx).join('\n');

function makeStorage() { const d = {}; return { _d: d, getItem(k) { return k in d ? d[k] : null; }, setItem(k, v) { d[k] = String(v); }, removeItem(k) { delete d[k]; }, clear() { for (const k in d) delete d[k]; }, key(i) { return Object.keys(d)[i] ?? null; }, get length() { return Object.keys(d).length; } }; }
const storage = makeStorage();

function shift(days){ const dt=new Date(); dt.setDate(dt.getDate()+days); const l=new Date(dt.getTime()-dt.getTimezoneOffset()*60000); return l.toISOString().slice(0,10); }
const TODAY = shift(0), YEST = shift(-1), D2 = shift(-2);

function seed(){
  const records=[
    // 日程：今天 2 条，createdAt 不同（验证拖动持久化目标：仅 2 条，顺序由 createdAt 决定）
    {id:'pl1',type:'planner',date:TODAY,createdAt:200,sample:false,data:{title:'事项A',time:'09:00',priority:'normal',list:'生活',note:'',remind:false,done:false}},
    {id:'pl2',type:'planner',date:TODAY,createdAt:100,sample:false,data:{title:'事项B',time:'10:00',priority:'high',list:'工作',note:'',remind:false,done:false}},
    // 心情：今天 2 条（验证「每日可存多个图标」）
    {id:'m1',type:'mood',date:TODAY,createdAt:50,sample:false,data:{score:5,tag:'开心',feeling:'很好'}},
    {id:'m2',type:'mood',date:TODAY,createdAt:10,sample:false,data:{score:3,tag:'平静',feeling:''}},
    // 心情：昨天 1 条
    {id:'m3',type:'mood',date:YEST,createdAt:5,sample:false,data:{score:2,tag:'低落',feeling:''}}
  ];
  const mediaItems=[
    // date 倒序应显示 AAA(今天) 在 BBB(昨天) 之前；createdAt 仅作次级
    {id:'md1',name:'AAA新片',type:'电影',status:'看完',rating:5,review:'',date:TODAY,cover:'',sample:false,createdAt:200,remoteId:''},
    {id:'md2',name:'BBB旧片',type:'剧',status:'在看',rating:4,review:'',date:YEST,cover:'',sample:false,createdAt:100,remoteId:''}
  ];
  const habits=[{id:'h1',name:'喝水',key:'water',type:'check',target:1,unit:'次',tone:'sage',entries:{[TODAY]:1},sample:true}];
  return {version:2,records,mediaItems,habits,settings:{mediaView:'list'},clearedAll:false,lastClearedAt:0};
}
storage.setItem(STORAGE_KEY, JSON.stringify(seed()));

const full = parseHTML(html);
const w = full.window, doc = w.document;
w.scrollTo = () => {};
if (typeof w.matchMedia !== 'function') w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
if (typeof w.requestAnimationFrame !== 'function') { w.requestAnimationFrame = cb=>setTimeout(cb,0); w.cancelAnimationFrame = clearTimeout; }
w.URL.createObjectURL = w.URL.createObjectURL || (()=>'blob:x'); w.URL.revokeObjectURL = w.URL.revokeObjectURL || (()=>{});
w.alert = () => {}; w.confirm = () => true; w.prompt = () => null;
try { w.localStorage = storage; } catch (e) {}
if (!w.Image) w.Image = function(){};
if (w.HTMLSelectElement && w.HTMLSelectElement.prototype) { try {
  const optsOf = s => { const a=[]; if(s.options&&typeof s.options.length==='number'){for(let i=0;i<s.options.length;i++)a.push(s.options[i]);} else { const q=s.querySelectorAll('option'); for(let i=0;i<q.length;i++)a.push(q[i]);} return a; };
  Object.defineProperty(w.HTMLSelectElement.prototype,'value',{configurable:true,
    get(){ const o=this.selectedIndex!=null&&this.selectedIndex>=0?optsOf(this)[this.selectedIndex]:null; return o?(o.getAttribute('value')!=null?o.getAttribute('value'):(o.textContent||'').trim()):''; },
    set(v){ const o=optsOf(this),t=String(v==null?'':v); for(let i=0;i<o.length;i++){const val=o[i].getAttribute('value')!=null?o[i].getAttribute('value'):(o[i].textContent||'').trim(); if(val===t){this.selectedIndex=i;return;}} } });
} catch(e){} }

const errors = [];
const sandbox = { window:w, document:doc, localStorage:storage,
  navigator:{userAgent:'node',platform:'x',language:'zh-CN'},
  location:new URL('http://localhost/index.html'), history:{ replaceState(){} },
  console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math, JSON,
  crypto:require('crypto').webcrypto, parseInt, parseFloat, isNaN, String, Number, Boolean,
  Array, Object, RegExp, Error, Promise, Map, Set, Symbol, URL:w.URL, Intl,
  requestAnimationFrame:w.requestAnimationFrame, cancelAnimationFrame:w.cancelAnimationFrame,
  TextEncoder, TextDecoder, Blob, FormData, scrollTo:()=>{}, scrollBy:()=>{},
  __SMART_PAGE__: undefined };
sandbox.globalThis = sandbox; sandbox.self = sandbox;
vm.createContext(sandbox);
try { vm.runInContext(scriptSrc, sandbox, { filename:'app.js' }); } catch(e){ errors.push('eval: '+((e&&e.stack)||e)); }
try { doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true})); } catch(e){ errors.push('domready: '+((e&&e.stack)||e)); }

setTimeout(()=>{
  const R = {};
  const has = id => !!doc.getElementById(id);

  // 1) mood grid 5 个 logo 按钮已渲染且图标非空
  const grid = doc.getElementById('moodGrid');
  const logos = grid ? Array.from(grid.querySelectorAll('.mood-btn .mood-logo')) : [];
  R['moodGrid_5_logo_buttons'] = (logos.length===5 && logos.every(l=>(l.textContent||'').trim().length>0)) ? 'OK':'FAIL('+logos.length+')';
  // 今日心情 metric 展示多条（含 m1/m2 两个图标）
  const mt = doc.getElementById('moodToday');
  R['moodToday_multiple'] = (mt && (mt.textContent.match(/😄/g)||[]).length>=1 && (mt.textContent.match(/😐/g)||[]).length>=1) ? 'OK':'FAIL('+(mt?mt.textContent:'null')+')';
  // moodEmoji 纳入 settings 快照：先读默认，改 logo 后应保存进 localStorage
  // 2) 轨迹每行有删除按钮（昨天 m3 应渲染，有 delete-btn）
  const moodRows = Array.from(doc.querySelectorAll('#moodList .mood-row'));
  const anyMoodDelete = moodRows.some(r => r.querySelector('.delete-btn[data-action="delete"]'));
  R['mood_timeline_delete_btn'] = (moodRows.length>0 && anyMoodDelete) ? 'OK':'FAIL(rows='+moodRows.length+')';

  // 3) planner: task-drag 存在且不再带 draggable；同日期按 createdAt 降序(事项A created200 在前)
  const drags = Array.from(doc.querySelectorAll('#plannerList .task-drag'));
  const noDraggable = drags.length>0 && drags.every(d=>!d.hasAttribute('draggable'));
  R['planner_no_native_draggable'] = noDraggable ? 'OK':'FAIL';
  R['planner_row_count'] = drags.length===2?'OK':'FAIL('+drags.length+')';
  const dragOrder = drags.map(d=>d.dataset.id).join(',');
  R['planner_created_desc_order'] = (dragOrder==='pl1,pl2') ? 'OK(pl1,pl2)' : 'FAIL('+dragOrder+')';

  // 4) media 倒序：list 视图首卡为 AAA新片(今天)
  const mediaCol = doc.getElementById('mediaCollection');
  const firstCard = mediaCol ? mediaCol.querySelector('.media-card h3') : null;
  R['media_desc_first_newest'] = (firstCard && (firstCard.textContent||'').indexOf('AAA')>=0) ? 'OK' : 'FAIL('+(firstCard?firstCard.textContent:'none')+')';

  // 5) archive 按日期倒序：第一个 tl-date 应为「今天」
  const arch = doc.getElementById('archiveList');
  const tlDates = arch ? Array.from(arch.querySelectorAll('.tl-date')).map(x=>x.textContent.trim()) : [];
  R['archive_first_is_today'] = (tlDates.length>0 && tlDates[0]==='今天') ? 'OK' : 'FAIL('+tlDates.slice(0,2).join('|')+')';

  // diet 容器存在（内部滚动 css 在文件级单独核验）
  R['dietList_exists'] = has('dietList') ? 'OK':'FAIL';

  const report = { ERRORS: errors.length?errors:'none', ...R };
  console.log('===== SMOKE5 =====');
  console.log(JSON.stringify(report,null,2));
  const fails = Object.entries(report).filter(([k,v])=>v==='FAIL'||(k!=='ERRORS'&&String(v).indexOf('FAIL')===0));
  const fatal = report.ERRORS!=='none';
  process.exit((fails.length||fatal)?1:0);
}, 500);
