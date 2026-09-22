/* v31 冒烟测试：
 * 需求1：周期历史只展示「过去已结束」的周期；当前进行中的周期（含今天首末同日记录）不列入历史。
 * 需求2：状态卡不臆造经期长度（无真实历史时不给 "第 X / N 天"、不给 "平均N天经期"）。
 * 需求3：经期长度限幅 1~15 天（剔除 36 天这样的脏数据）。
 * 需求4：PIN 重输（锁定→解锁）不清空经期记录，历史正确显示。
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

function iso(d){ const date=new Date(d+'T00:00:00'); const m=String(date.getMonth()+1).padStart(2,'0'), day=String(date.getDate()).padStart(2,'0'); return date.getFullYear()+'-'+m+'-'+day; }
function rec(dateStr, flags, extra){ return {id:'r'+Math.random(),type:'period',date:dateStr,data:Object.assign({isStartDay:'',isPeriodDay:'',isEndDay:'',symptoms:[],pad:0,night:0},flags||{},extra||{}),createdAt:Date.now(),updatedAt:Date.now()}; }

void (async () => {
  const R={};
  const app=sandbox.window.__appTest;
  if(!app){console.error('NO APP TEST');process.exit(1);}
  app.state.settings.periodPinHash='fake-hash'; app.state.settings.periodPinSalt='fake-salt';
  app.periodMarkUnlocked();
  await new Promise(r=>setTimeout(r,50));

  const histEl=()=>doc.getElementById('periodHistory');
  const statusEl=()=>doc.getElementById('periodStatus');
  const statsEl=()=>doc.getElementById('periodStats');

  function render(records){ app.state.records=records; app.renderPeriod(); }

  /* ---------- 场景1：仅今天一条首日（未标末日） ---------- */
  {
    const records=[rec('2026-09-22',{isStartDay:'Y',isPeriodDay:'Y'})];
    render(records);
    const a=app.analyzePeriod(records);
    const h=histEl()?histEl().innerHTML:'';
    const s=statusEl()?statusEl().innerHTML:'';
    /* v39 起：当前周期（本月经期）也要在周期历史里回显，且带「进行中」徽标（旧 v31 要求不列 → 已反转） */
    R['v31_s1_hist_empty']=(h.indexOf('2026-09-22')>=0)?'OK':'FAIL——当前周期应回显在历史中';
    R['v31_s1_hist_no_current']=(h.indexOf('hist-ongoing-tag')>=0)?'OK':'FAIL——当前周期行应带「进行中」徽标';
    R['v31_s1_status_no_divisor']=(s.indexOf('第 1 天')>=0 && s.indexOf('第 1 /')<0)?'OK':'FAIL——无历史时状态卡不应显示"第 1 / N 天"';
    R['v31_s1_status_no_avgPeriod']=(s.indexOf('平均')<0)?'OK':'FAIL——无历史时不应显示"平均"';
    R['v31_s1_periodLens_empty']=(a.periodLens.length===0)?'OK':'FAIL('+JSON.stringify(a.periodLens)+')';
    R['v31_s1_nextPredicted_null']=(a.nextPredicted===null)?'OK':'FAIL('+a.nextPredicted+')';
  }

  /* ---------- 场景2：今天一条首日+末日（同日）→ 仍是当前周期，不进历史、不算样本 ---------- */
  {
    const records=[rec('2026-09-22',{isStartDay:'Y',isPeriodDay:'Y',isEndDay:'Y'})];
    render(records);
    const a=app.analyzePeriod(records);
    const h=histEl()?histEl().innerHTML:'';
    const s=statusEl()?statusEl().innerHTML:'';
    const st=statsEl()?statsEl().innerHTML:'';
    /* v39 起：首末同日的「今天」记录仍属当前周期，但要回显（带进行中徽标） */
    R['v31_s2_hist_empty']=(h.indexOf('2026-09-22')>=0)?'OK':'FAIL——当前周期应回显在历史中';
    R['v31_s2_hist_no_current']=(h.indexOf('period-history-row')>=0 && h.indexOf('还没有经期记录')<0)?'OK':'FAIL——应先渲染出周期行';
    R['v31_s2_status_no_divisor']=(s.indexOf('第 1 天')>=0 && s.indexOf('第 1 /')<0)?'OK':'FAIL——应显示"第 1 天"而非"第 1 / N 天"';
    R['v31_s2_periodLens_empty']=(a.periodLens.length===0)?'OK':'FAIL——当前周期不应计入经期样本';
    R['v31_s2_stats_no_36']=(st.indexOf('36')<0)?'OK':'FAIL——本次经期不应显示 36 天';
    R['v31_s2_stats_current_len']=(st.indexOf('>1</b>天')>=0 || st.indexOf('1</b>天')>=0)?'OK':'WARN——本次经期 N 天应为当前周期实际天数';
  }

  /* ---------- 场景3：有真实历史 8/1-8/5 + 今天新首日 → 历史显示过去，状态用真实均值 ---------- */
  {
    const records=[
      rec('2026-08-17',{isStartDay:'Y',isPeriodDay:'Y'}),
      rec('2026-08-18',{isPeriodDay:'Y'}),
      rec('2026-08-19',{isPeriodDay:'Y'}),
      rec('2026-08-20',{isPeriodDay:'Y'}),
      rec('2026-08-21',{isPeriodDay:'Y',isEndDay:'Y'}),
      rec('2026-09-22',{isStartDay:'Y',isPeriodDay:'Y'})
    ];
    render(records);
    const a=app.analyzePeriod(records);
    const h=histEl()?histEl().innerHTML:'';
    const s=statusEl()?statusEl().innerHTML:'';
    R['v31_s3_hist_has_past']=(h.indexOf('2026-08-17')>=0 && h.indexOf('5 天经期')>=0)?'OK':'FAIL——应显示真实历史周期 8/1-8/5 (5天)';
    /* v39 起：当前周期回显（带「进行中」徽标），历史周期照常显示 */
    R['v31_s3_hist_excl_current']=(h.indexOf('2026-09-22')>=0 && h.indexOf('hist-ongoing-tag')>=0)?'OK':'FAIL——当前周期应回显且标记进行中';
    R['v31_s3_status_real_avg']=(s.indexOf('5</b>天经期')>=0 && s.indexOf('第 1 / 5 天')>=0)?'OK':'FAIL——有历史时应显示真实均值(实际: '+s.slice(0,240)+')';
    R['v31_s3_periodLens']=JSON.stringify(a.periodLens)==='[5]'?'OK':'FAIL('+JSON.stringify(a.periodLens)+')';
    R['v31_s3_cycles_one']=(a.cycles.length===1)?'OK':'FAIL('+a.cycles.length+')';
  }

  /* ---------- 场景4：脏数据 36 天经期（过去，连续标 36 天）→ 被限幅剔除 ---------- */
  {
    const records=[];
    let d=new Date('2026-07-01T00:00:00');
    for(let i=0;i<36;i++){ const ds=iso(d.toISOString().slice(0,10)); const fl={isPeriodDay:'Y'}; if(i===0)fl.isStartDay='Y'; if(i===35)fl.isEndDay='Y'; records.push(rec(ds,fl)); d.setDate(d.getDate()+1); }
    const a=app.analyzePeriod(records);
    R['v31_s4_no_36_in_periodLens']=(a.periodLens.indexOf(36)<0)?'OK':'FAIL——36 天经期被限幅剔除';
    R['v31_s4_periodLens_capped']=(a.periodLens.every(x=>x<=15))?'OK':'FAIL——经期长度应≤15';
  }

  /* ---------- 场景5：PIN 重输（锁定→重新解锁）不清空记录 ---------- */
  {
    const keep=[
      rec('2026-08-17',{isStartDay:'Y',isPeriodDay:'Y'}),
      rec('2026-08-21',{isPeriodDay:'Y',isEndDay:'Y'}),
      rec('2026-09-22',{isStartDay:'Y',isPeriodDay:'Y'})
    ];
    render(keep);
    const before=JSON.stringify(app.state.records.map(r=>r.id));
    app.periodLock();                 // 锁定
    const lockedCount=app.state.records.length;
    app.periodMarkUnlocked();          // 重新输入 PIN 解锁
    app.renderPeriod();
    const after=JSON.stringify(app.state.records.map(r=>r.id));
    const h=histEl()?histEl().innerHTML:'';
    R['v31_s5_pin_reentry_no_clear']=(before===after)?'OK':'FAIL——PIN 重输后记录不应清空';
    R['v31_s5_records_intact']=(app.state.records.length===keep.length)?'OK':'FAIL('+app.state.records.length+'→应'+keep.length+')';
    R['v31_s5_hist_shows_past_after_unlock']=(h.indexOf('2026-08-17')>=0)?'OK':'FAIL——解锁后历史应正确显示';
  }

  /* ---------- 汇总 ---------- */
  let ok=0,total=0, fails=[];
  for(const k in R){ total++; if(R[k]==='OK') ok++; else if(R[k].indexOf('FAIL')===0) fails.push(k+': '+R[k]); }
  console.log('\n=== v31 冒烟测试结果 ===');
  for(const k in R){ console.log('  '+R[k].padEnd(4)+' '+k); }
  console.log('\n总计：'+ok+'/'+total+' 通过');
  if (fails.length){ console.log('\n失败项：'); fails.forEach(f=>console.log('  '+f)); }
  if (ok < total) process.exit(1);
})();
