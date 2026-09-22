/* v35 冒烟测试：
 * A) 饮食记录：双日分页——页1含今天+昨天，各自全部记录展开；日期搜索跳到指定日完整展示；清除返回最近。
 * B) 物品存储库存总览：分类卡 + 每类条形 + 每件存量一览；临期/过期提示。
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
try{Object.defineProperty(Object.getPrototypeOf(doc.createElement('form')),'elements',{get(){return this.querySelectorAll('[name]');}});}catch(e){}
w.FormData=class{constructor(f){this._f=f;this._m=new Map();if(f){const els=f.querySelectorAll('[name]');for(const el of els){const t=(el.type||'').toLowerCase();if(t==='radio'){if(el.checked)this._m.set(el.name,el.value);}else if(t==='checkbox'){if(el.checked)this._m.set(el.name,'on');}else{this._m.set(el.name,el.value||'');}}}}get(k){return this._m.has(k)?this._m.get(k):null;}entries(){return [...this._m.entries()];}};w.Event=class{constructor(t,o){this.type=t;this.bubbles=!!(o&&o.bubbles);this.cancelable=!!(o&&o.cancelable);}};
w.requestIdleCallback=w.requestIdleCallback||(cb=>setTimeout(cb,0));
const sandbox={sessionStorage:w.sessionStorage,window:w,document:doc,localStorage:storage,FormData:w.FormData,navigator:{userAgent:'node',platform:'x',language:'zh-CN'},location:new w.URL('http://localhost/index.html'),history:{replaceState(){}},console:{log:()=>{},warn:()=>{},error:(...a)=>{process.stderr.write('PAGE ERR: '+a.map(x=>x&&x.message?x.message:String(x)).join(' ')+'\n');}},setTimeout,clearTimeout,setInterval,clearInterval,Date,Math,JSON,crypto:require('crypto').webcrypto,parseInt,parseFloat,isNaN,String,Number,Boolean,Array,Object,RegExp,Error,Promise,Map,Set,Symbol,URL:w.URL,Intl,requestAnimationFrame:w.requestAnimationFrame,cancelAnimationFrame:w.cancelAnimationFrame,TextEncoder,TextDecoder,Blob,scrollTo:()=>{},scrollBy:()=>{}};
sandbox.globalThis=sandbox; sandbox.self=sandbox;
vm.createContext(sandbox);
try{vm.runInContext(src,sandbox,{filename:'app.js'});}catch(e){console.error('SCRIPT ERR',e&&e.stack||e);process.exit(1);}
try{doc.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));}catch(e){}

void (async () => {
  const app=sandbox.window.__appTest;
  if(!app){console.error('NO APP');process.exit(1);}
  const P={pass:0,fail:0,logs:[]};
  function ok(name,cond,extra){ (cond?P.pass++:P.fail++); P.logs.push((cond?'  ✔ ':'  ✘ ')+name+(extra?' — '+extra:'')); }
  function shift(n){const d=new Date();d.setDate(d.getDate()+n);const p=x=>(x<10?'0':'')+x;return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());}

  // ---- A1 双日分页：页1=今天+昨天 完整展示（多餐不折叠） ----
  try{
    const today=app.isoDate();
    // 造：今天4餐 + 昨天3餐 + 前天2餐 + 更早1餐
    app.state.records=[];
    app.state.settings.dietPage=1; app.state.settings.dietSearchDate='';
    const mks=(id,date,n)=>Array.from({length:n},(_,i)=>({id:id+'_'+i,type:'diet',date,createdAt:i,data:{meal:['早餐','午餐','晚餐','加餐'][i%4],food:'食物'+i,calories:100}}));
    app.state.records.push(...mks('t',today,4),...mks('y',shift(-1),3),...mks('bf',shift(-2),2),...mks('old',shift(-10),1));
    app.renderDiet();
    const list=doc.getElementById('dietList').innerHTML;
    const cards=(list.match(/class="date-card/g)||[]).length;
    const rows=(list.match(/class="diet-meal-row"/g)||[]).length;
    ok('A1 页1仅显示2个日期卡(今天+昨天)', cards===2, `cards=${cards}`);
    ok('A1 页1完整展示今天4餐+昨天3餐=7餐', rows===7, `rows=${rows}`);
  }catch(e){ ok('A1',false,e.message); }

  // ---- A2 翻到第2页显示前天等更早 ----
  try{
    app.state.settings.dietSearchDate='';
    app.state.settings.dietPage=2;
    app.renderDiet();
    const list=doc.getElementById('dietList').innerHTML;
    const cards=(list.match(/class="date-card/g)||[]).length;
    const rows=(list.match(/class="diet-meal-row"/g)||[]).length;
    ok('A2 第2页显示最近第3+4天(前天2餐+其前)', cards===2&&rows===3, `cards=${cards} rows=${rows}`);
  }catch(e){ ok('A2',false,e.message); }

  // ---- A3 日期搜索跳转指定日完整展示 ----
  try{
    const target=shift(-2);
    app.state.settings.dietSearchDate=target;
    app.state.settings.dietPage=1;
    app.renderDiet();
    const list=doc.getElementById('dietList').innerHTML;
    const cards=(list.match(/class="date-card/g)||[]).length;
    const rows=(list.match(/class="diet-meal-row"/g)||[]).length;
    ok('A3 搜索某日后仅1个日期卡且2餐全展示', cards===1&&rows===2, `cards=${cards} rows=${rows}`);
    // 返回最近
    app.state.settings.dietSearchDate='';
    app.state.settings.dietPage=1; app.renderDiet();
    const list2=doc.getElementById('dietList').innerHTML;
    ok('A3 清除搜索后回到双日页(7餐)', (list2.match(/class="diet-meal-row"/g)||[]).length===7);
  }catch(e){ ok('A3',false,e.message); }

  // ---- B1 库存总览：指标、分类卡、条形、一览 ----
  try{
    const today=app.isoDate();
    app.state.records=[
      {id:'s1',type:'storage',date:today,createdAt:1,data:{name:'大米',category:'食品',quantity:3,unit:'袋',expiry:shift(2),location:'厨房'}},
      {id:'s2',type:'storage',date:today,createdAt:2,data:{name:'牛奶',category:'食品',quantity:0,unit:'盒',expiry:'',location:'冰箱'}},
      {id:'s3',type:'storage',date:today,createdAt:3,data:{name:'牙膏',category:'个护',quantity:2,unit:'支',expiry:'',location:'卫生间'}}
    ];
    app.renderStorage();
    const qtySum=doc.getElementById('storageQtySum').textContent;
    ok('B1 总件数=3+0+2=5', qtySum==='5', `sum=${qtySum}`);
    const ovCats=doc.getElementById('storageOvCats').innerHTML;
    const ovList=doc.getElementById('storageOvList').innerHTML;
    const ovAlerts=doc.getElementById('storageOvAlerts').innerHTML;
    ok('B1 分类卡含食品(2种)与个护', /食品/.test(ovCats)&&/个护/.test(ovCats));
    ok('B1 一览含大米/牛奶/牙膏', /大米/.test(ovList)&&/牛奶/.test(ovList)&&/牙膏/.test(ovList));
    ok('B1 数量0(牛奶)有提示', /数量为 0/.test(ovAlerts));
    // 牛奶过期? s1 到期 shiftDate(2) 是未来, 不临期. 添加一条临期验证
    app.state.records.push({id:'s4',type:'storage',date:today,createdAt:4,data:{name:'面包',category:'食品',quantity:1,unit:'袋',expiry:shift(5),location:'厨房'}});
    app.renderStorage();
    const ovAlerts2=doc.getElementById('storageOvAlerts').innerHTML;
    ok('B1 7天内临期(面包)有提示', /天内过期/.test(ovAlerts2), ovAlerts2.slice(0,60));
  }catch(e){ ok('B1',false,e.message); }

  // ---- B2 空库存总览显示占位 ----
  try{
    app.state.records=app.state.records.filter(r=>r.type!=='storage');
    app.renderStorage();
    const emptyList=doc.getElementById('storageOvList').innerHTML;
    ok('B2 空库存一览显示占位', /暂无库存|还没有库存/.test(emptyList), emptyList.slice(0,40));
  }catch(e){ ok('B2',false,e.message); }

  console.log('\n==== v35 冒烟结果 ====');
  P.logs.forEach(l=>console.log(l));
  console.log(`PASS ${P.pass} / FAIL ${P.fail}`);
  process.exit(P.fail?1:0);
})();
