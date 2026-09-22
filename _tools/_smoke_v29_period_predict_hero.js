/* v29 冒烟测试：经期顶部预测 hero + 周期历史滚动条 + 展开按钮 CSS 修复
 * 1. 顶部预测 hero 渲染：nextPredicted/样本数/排卵日/天数
 * 2. .period-cycle-days[hidden] CSS specificity 修复 → toggle 真的改变可见性
 * 3. .period-history max-height + overflow-y 内置滚动条
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

const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:w.FormData,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new w.URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:(...a)=>{},warn:(...a)=>{},error:(...a)=>{process.stderr.write('PAGE ERR: '+a.map(x=>x&&x.message?x.message:String(x)).join(' ')+'\n');}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{},__SMART_PAGE__:undefined};
sandbox.globalThis=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox);
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){console.error('SCRIPT ERR',e&&e.stack||e);process.exit(1);}
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){}

void (async () => {
  const R={};
  const app=sandbox.window.__appTest;
  if(!app){console.error('NO APP TEST');process.exit(1);}

  /* ==================== 场景 1：CSS 修复 — .period-cycle-days[hidden] specificity ==================== */
  // 检查 CSS rules 里有 .period-cycle-days[hidden]{display:none}
  const cssText = doc.querySelector('style').textContent;
  R['v29_css_cycle_days_hidden_rule']=(cssText.indexOf('.period-cycle-days[hidden]{display:none}')>=0)?'OK':'FAIL';
  R['v29_css_history_max_height']=(cssText.indexOf('.period-history{display:flex;flex-direction:column;gap:6px;max-height:340px;overflow-y:auto')>=0)?'OK':'FAIL';

  /* ==================== 场景 2：顶部预测 hero 渲染 ==================== */
  app.state.records.push({id:'p1',type:'period',date:'2026-07-01',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()});
  app.state.records.push({id:'p2',type:'period',date:'2026-07-05',data:{isEndDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()});
  app.state.records.push({id:'p3',type:'period',date:'2026-07-29',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()});
  app.state.records.push({id:'p4',type:'period',date:'2026-08-02',data:{isEndDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()});
  app.state.records.push({id:'p5',type:'period',date:'2026-08-26',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()});

  // 假 PIN 解锁
  app.state.settings.periodPinHash = 'fake-hash';
  app.state.settings.periodPinSalt = 'fake-salt';
  app.periodMarkUnlocked();

  app.switchView('period');
  await new Promise(r=>setTimeout(r,100));
  app.renderPeriod();
  await new Promise(r=>setTimeout(r,50));

  const nextHero = doc.getElementById('periodNextHero');
  // 手动再调一次 renderPeriod 看
  app.renderPeriod();
  const heroContent2 = nextHero ? (nextHero.outerHTML || '') : '';
  console.log('  DEBUG after 2nd renderPeriod: heroContent2 len='+heroContent2.length+' first 200:', heroContent2.slice(0,200));
  // 诊断：检查 analyzePeriod 结果
  const analysis = app.analyzePeriod(app.state.records);
  console.log('  DEBUG analysis: lastStart='+analysis.lastStart+' nextPredicted='+analysis.nextPredicted+' cycles.length='+analysis.cycles.length);

  R['v29_hero_exists']=nextHero?'OK':'FAIL';
  // linkedom 可能不暴露 innerHTML getter，用 outerHTML 或 textContent
  const heroContent = nextHero ? (nextHero.outerHTML || nextHero.textContent || String(nextHero.innerHTML||'')) : '';
  R['v29_hero_has_content']=(heroContent.length>100)?'OK':'FAIL(content len='+heroContent.length+')';
  R['v29_hero_has_next_date']=(heroContent.indexOf('next-date')>=0)?'OK':'FAIL';
  R['v29_hero_has_label']=(heroContent.indexOf('下次经期预测')>=0)?'OK':'FAIL';
  R['v29_hero_has_ovulation']=(heroContent.indexOf('排卵日')>=0)?'OK':'FAIL';
  R['v29_hero_has_days']=(heroContent.indexOf('next-days')>=0)?'OK':'FAIL';
  if(heroContent.length<200){
    console.log('  DEBUG heroContent:', heroContent.slice(0,500));
  }

  /* ==================== 场景 3：空数据时 hero 占位 ==================== */
  app.state.records = app.state.records.filter(r => r.type !== 'period');
  app.renderPeriod();
  const heroEmpty = doc.getElementById('periodNextHero');
  R['v29_hero_empty_state']=(heroEmpty && heroEmpty.innerHTML.indexOf('记录一次')>=0)?'OK':'FAIL';

  /* ==================== 场景 4：重新灌数据测 toggle 真的改变可见性 ==================== */
  app.state.records.push({id:'q1',type:'period',date:'2026-07-01',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()});
  app.state.records.push({id:'q2',type:'period',date:'2026-07-05',data:{isEndDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()});
  app.state.records.push({id:'q3',type:'period',date:'2026-07-29',data:{isStartDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()});
  app.state.records.push({id:'q4',type:'period',date:'2026-08-02',data:{isEndDay:'Y',isPeriodDay:'Y'},createdAt:Date.now(),updatedAt:Date.now()});
  app.renderPeriod();

  const histEl = doc.getElementById('periodHistory');
  const btns = histEl.querySelectorAll('[data-action="toggle-cycle"]');
  R['v29_toggle_buttons_present']=(btns.length>=2)?'OK':'FAIL(count='+btns.length+')';

  if (btns.length > 0) {
    const btn = btns[0];
    const idx = btn.dataset.cycleIdx;
    const panel = doc.getElementById('cycle-days-'+idx);

    // linkedom 不一定支持 CSS 计算，但我们可以验证 panel 的 hidden attribute 翻转
    R['v29_panel_initially_hidden']=(panel.hidden===true)?'OK':'FAIL(hidden='+panel.hidden+')';

    btn.dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,20));
    R['v29_panel_after_click_hidden_false']=(panel.hidden===false)?'OK':'FAIL(hidden='+panel.hidden+')';

    btn.dispatchEvent(new w.Event('click',{bubbles:true,cancelable:true}));
    await new Promise(r=>setTimeout(r,20));
    R['v29_panel_after_2click_hidden_true']=(panel.hidden===true)?'OK':'FAIL(hidden='+panel.hidden+')';
  }

  /* ==================== 场景 5：周期历史卡片滚动条容器属性 ==================== */
  // 检查 .period-history 渲染时确实有 overflow-y:auto
  const historyStyleRule = cssText.match(/\.period-history\{[^}]+\}/);
  R['v29_history_style_rule'] = historyStyleRule ? 'OK' : 'FAIL';
  R['v29_history_has_overflow'] = (historyStyleRule && historyStyleRule[0].indexOf('overflow-y:auto')>=0) ? 'OK' : 'FAIL';

  /* ==================== 汇总 ==================== */
  let ok=0,total=0;
  for(const k in R){ total++; if(R[k]==='OK')ok++; }
  console.log('\n=== v29 冒烟测试结果 ===');
  for(const k in R){ console.log('  '+R[k].padEnd(4)+' '+k); }
  console.log('\n总计：'+ok+'/'+total+' 通过');
  if (ok < total) process.exit(1);
})();
