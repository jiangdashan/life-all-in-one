
(() => {
  'use strict';

  /* ================= v32 用户认证 =================
   * 设计：访问密码 → SHA256(UID_SALT+password) 派生 userId（确定性 + 跨设备同步）
   * 本地存储 SHA256(PW_SALT+password) 用于验证。两个不同 salt 让 userId 即使公开
   * 也不能反推/冒充登录。云端每条记录带 userId，读取时只取当前用户的数据。
   * 会话标记 sessionStorage('unlockApp')，关页面自动失效。
   * 5 次错误密码锁定 5 分钟防止暴力破解。 */
  var AUTH_PW_SALT = 'richangji-v32-pw-2026-09';
  var AUTH_UID_SALT = 'richangji-v32-uid-2026-09';
  var AUTH_STORAGE_KEY = 'richangji-auth-v1';
  var AUTH_SESSION_KEY = 'unlockApp';
  var AUTH_LOCK_MS = 5 * 60 * 1000;
  var AUTH_MAX_ATTEMPTS = 5;
  /* v37: 7 天信任期——移动端重开浏览器/从桌面图标进入时 sessionStorage 必然是新的，
   * 每次进入都要求输密码太繁琐。信任期内用本地保存的派生身份直接解锁（含经期 PIN 免输入）。
   * 手动「锁定」会清除信任期；本地密码哈希变化（改密）也会使信任期失效。 */
  var AUTH_TRUST_KEY = 'richangji-auth-trust-v1';
  var AUTH_TRUST_MS = 7 * 24 * 60 * 60 * 1000;

  var state_auth = {
    hasPassphrase: false,
    userId: null,
    unlocked: false,
    failedAttempts: 0,
    lockedUntil: 0,
    /* v36: 新设备无本地哈希时，改用「派生 userId 是否命中云端已有记录」校验密码，
     * 杜绝新设备随手设新密码 → userId 分裂 → 两端数据互不可见。 */
    cloudVerify: false
  };

  async function authHash(s){
    try{
      var enc = new TextEncoder();
      var buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
      return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
    }catch(e){
      var h=5381;
      for(var i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0;
      return 'djb2_'+(h>>>0).toString(16);
    }
  }
  async function authUserId(pw){ return await authHash(AUTH_UID_SALT+':'+pw); }
  async function authPwHash(pw){ return await authHash(AUTH_PW_SALT+':'+pw); }

  function authLoadStored(){
    try { return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}'); }
    catch(e){ return {}; }
  }
  function authSaveStored(s){ localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(s)); }
  function authClearStored(){ localStorage.removeItem(AUTH_STORAGE_KEY); }

  /* v37: 信任期写入/校验 */
  function authMarkTrusted(){
    try {
      var stored = authLoadStored();
      if(!stored.passwordHash || !state_auth.userId) return;
      localStorage.setItem(AUTH_TRUST_KEY, JSON.stringify({uid: state_auth.userId, pwHash: stored.passwordHash, until: Date.now() + AUTH_TRUST_MS}));
    } catch(e){}
  }
  function authTrustValid(){
    try {
      var trust = JSON.parse(localStorage.getItem(AUTH_TRUST_KEY) || 'null');
      var stored = authLoadStored();
      if(!trust || !trust.until || trust.until <= Date.now()) return null;
      if(!trust.uid || !trust.pwHash || !stored.passwordHash || trust.pwHash !== stored.passwordHash) return null;
      return trust;
    } catch(e){ return null; }
  }

  function authStrengthLevel(pw){
    if(!pw) return 0;
    var score=0;
    if(pw.length>=8) score++;
    if(pw.length>=12) score++;
    if(/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if(/[0-9]/.test(pw)) score++;
    if(/[^a-zA-Z0-9]/.test(pw)) score++;
    return Math.min(4, score);
  }
  function authStrengthLabel(s){ return s<=1?'弱':(s===2?'一般':(s===3?'良好':'强')); }

  function authShowError(msg, isLocked){
    var el = document.getElementById('authError');
    if(!el) return;
    el.textContent = msg || '';
    el.classList.toggle('locked', !!isLocked);
  }

  function authSwitchToCreate(){
    var f=document.getElementById('authForm'); if(!f) return;
    document.getElementById('authTitle').textContent='生活工作台';
    document.querySelector('.auth-sub').innerHTML='用你的<b>访问密码</b>保护所有记录。忘记密码将无法恢复云端数据，请妥善保管。<br><small style="color:#81868d">提示：多台设备必须使用<b>同一个</b>访问密码，数据才会同步。</small>';
    document.getElementById('authLabel1').textContent='设置访问密码';
    document.getElementById('authPass1').placeholder='至少 8 位，建议字母+数字';
    document.getElementById('authPass2').hidden = false;
    document.getElementById('authStrength').style.display='flex';
    document.getElementById('authSubmit').textContent='创建密码并进入';
    document.getElementById('authFoot').innerHTML='';
    state_auth.hasPassphrase = false;
    state_auth.cloudVerify = false;
  }
  function authSwitchToEnter(){
    document.getElementById('authTitle').textContent='欢迎回来';
    document.querySelector('.auth-sub').innerHTML='输入你的<b>访问密码</b>以解锁。';
    document.getElementById('authLabel1').textContent='访问密码';
    document.getElementById('authPass1').placeholder='输入访问密码';
    document.getElementById('authPass2').hidden = true;
    document.getElementById('authStrength').style.display='none';
    document.getElementById('authSubmit').textContent='解锁';
    state_auth.hasPassphrase = true;
    state_auth.cloudVerify = false;
  }
  /* v36: 新设备（本地无密码哈希）+ 云端已有数据 → 用「输入密码 + 云端身份校验」模式。
   * 提示语明确告诉用户必须输入与电脑端相同的密码，否则数据不同步。 */
  function authSwitchToCloudEnter(){
    authSwitchToEnter();
    document.getElementById('authTitle').textContent='欢迎回来';
    document.querySelector('.auth-sub').innerHTML='检测到云端已有数据。请输入与<b>电脑端相同的访问密码</b>，两台设备才会同步同一份数据。';
  }

  function authCheckStored(){
    var stored = authLoadStored();
    return !!(stored && stored.passwordHash);
  }

  function authCheckLock(){
    if(state_auth.lockedUntil && Date.now() < state_auth.lockedUntil){
      var sec = Math.ceil((state_auth.lockedUntil - Date.now())/1000);
      var min = Math.floor(sec/60), s = sec%60;
      authShowError('尝试次数过多，已锁定。请 '+(min>0?min+' 分 ':'')+s+' 秒后再试。', true);
      document.getElementById('authSubmit').disabled = true;
      document.getElementById('authPass1').disabled = true;
      return true;
    }
    return false;
  }

  async function authSubmit(e){
    if(e && e.preventDefault) e.preventDefault();
    if(authCheckLock()) return;
    var p1 = document.getElementById('authPass1').value;
    var p2 = document.getElementById('authPass2').value;
    var submitBtn = document.getElementById('authSubmit');
    if(!p1 || p1.length < 8){ authShowError('密码至少 8 位'); return; }
    submitBtn.disabled = true;
    submitBtn.textContent = state_auth.hasPassphrase ? '校验中…' : '创建中…';
    try{
      if(!state_auth.hasPassphrase){
        if(p1 !== p2){ authShowError('两次输入不一致，请重新输入'); return; }
        var uid = await authUserId(p1);
        var pwHash = await authPwHash(p1);
        authSaveStored({passwordHash: pwHash, createdAt: Date.now()});
        state_auth.userId = uid;
        state_auth.unlocked = true;
        sessionStorage.setItem(AUTH_SESSION_KEY,'1');
        sessionStorage.setItem('unlockPw', p1);  /* v32: 用于刷新后自动恢复 */
        authMarkTrusted();
        authUnlockComplete();
      } else if(state_auth.cloudVerify){
        /* v36: 新设备云端校验——派生 userId 必须命中云端已有记录，否则拒绝，
         * 防止「设了个不同的密码」静默分裂出第二个身份。 */
        var cvUid = await authUserId(p1);
        var cvRes = await new Promise(function(res){ cloudCollectUserIds(res); });
        if(cvRes && cvRes.err){
          authShowError('网络异常，暂时无法校验密码，请检查网络后重试');
        } else if(cvRes && cvRes.uids && cvRes.uids.indexOf(cvUid) >= 0){
          var cvHash = await authPwHash(p1);
          authSaveStored({passwordHash: cvHash, createdAt: Date.now()});
          state_auth.failedAttempts = 0;
          state_auth.userId = cvUid;
          state_auth.unlocked = true;
          state_auth.cloudVerify = false;
          sessionStorage.setItem(AUTH_SESSION_KEY,'1');
          sessionStorage.setItem('unlockPw', p1);
          authMarkTrusted();
          authUnlockComplete();
        } else {
          state_auth.failedAttempts++;
          if(state_auth.failedAttempts >= AUTH_MAX_ATTEMPTS){
            state_auth.lockedUntil = Date.now() + AUTH_LOCK_MS;
            authCheckLock();
          } else {
            authShowError('密码不正确。多台设备必须使用【同一个访问密码】数据才能同步（还可尝试 '+(AUTH_MAX_ATTEMPTS - state_auth.failedAttempts)+' 次）');
          }
        }
      } else {
        var stored = authLoadStored();
        var got = await authPwHash(p1);
        if(got === stored.passwordHash){
          state_auth.failedAttempts = 0;
          state_auth.userId = await authUserId(p1);
          state_auth.unlocked = true;
          sessionStorage.setItem(AUTH_SESSION_KEY,'1');
          sessionStorage.setItem('unlockPw', p1);
          authMarkTrusted();
          authUnlockComplete();
        } else {
          state_auth.failedAttempts++;
          if(state_auth.failedAttempts >= AUTH_MAX_ATTEMPTS){
            state_auth.lockedUntil = Date.now() + AUTH_LOCK_MS;
            authCheckLock();
          } else {
            authShowError('密码错误，还可尝试 '+(AUTH_MAX_ATTEMPTS - state_auth.failedAttempts)+' 次');
          }
        }
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = state_auth.hasPassphrase ? '解锁' : '创建密码并进入';
    }
  }

  function authUnlockComplete(){
    document.body.classList.remove('auth-locked');
    var overlay = document.getElementById('authOverlay');
    if(overlay) overlay.style.display='none';
    /* v32: init() 已经执行过，这里只重新拉一次云端数据（带正确 userId 过滤） */
    if(typeof authPostUnlockRehydrate === 'function') authPostUnlockRehydrate();
  }

  function authLockApp(){
    state_auth.userId = null;
    state_auth.unlocked = false;
    localStorage.removeItem(AUTH_TRUST_KEY);   /* v37: 手动锁定 = 立即退出信任期，需重新输密码 */
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    sessionStorage.removeItem('unlockPw');
    sessionStorage.removeItem('unlockPeriod');
    document.body.classList.add('auth-locked');
    var overlay = document.getElementById('authOverlay');
    if(overlay){ overlay.style.display='flex'; }
    document.getElementById('authPass1').value='';
    document.getElementById('authPass2').value='';
    authShowError('');
  }

  function authInit(){
    var overlay = document.getElementById('authOverlay');
    var form = document.getElementById('authForm');
    var pass1 = document.getElementById('authPass1');
    var pass2 = document.getElementById('authPass2');
    var strength = document.getElementById('authStrength');
    if(!overlay || !form) return;

    pass1.addEventListener('input', function(){
      if(state_auth.hasPassphrase) return;
      var lvl = authStrengthLevel(pass1.value);
      strength.classList.remove('weak','fair','good','strong');
      if(lvl===1) strength.classList.add('weak');
      else if(lvl===2) strength.classList.add('fair');
      else if(lvl===3) strength.classList.add('good');
      else if(lvl===4) strength.classList.add('strong');
    });

    form.addEventListener('submit', authSubmit);

    /* v32 测试钩子：测试环境直接跳过认证，用占位 userId */
    if(typeof window !== 'undefined' && (window.__TESTING__ || window.__BYPASS_AUTH__)){
      state_auth.hasPassphrase = true;
      state_auth.userId = window.__TEST_USER_ID__ || 'test-bypass-user';
      state_auth.unlocked = true;
      authUnlockComplete();
      return;
    }

    /* v37: 信任期内自动解锁（含经期 PIN）——移动端每次进入不再要求输密码 */
    var trust = authTrustValid();
    if(trust){
      state_auth.hasPassphrase = true;
      state_auth.userId = trust.uid;
      state_auth.unlocked = true;
      state_auth.failedAttempts = 0;
      sessionStorage.setItem(AUTH_SESSION_KEY,'1');
      periodMarkUnlocked();
      authUnlockComplete();
      return;
    }

    /* v32: sessionStorage 缓存明文密码——支持 F5 刷新不解锁。代价：密码明文短暂存在于内存/会话存储。
     * 接受此权衡：sessionStorage 在关闭浏览器标签页时自动清除，且本机不持久化到磁盘。
     * 进一步加固方案：刷新后强制重新输入。 */
    var hasStored = authCheckStored();
    var sessionOk = sessionStorage.getItem(AUTH_SESSION_KEY) === '1';
    var cachedPw = sessionStorage.getItem('unlockPw');
    if(hasStored && sessionOk && cachedPw){
      /* 自动恢复：异步验证 + 派生 userId */
      authPwHash(cachedPw).then(function(got){
        var stored = authLoadStored();
        if(got === stored.passwordHash){
          state_auth.failedAttempts = 0;
          state_auth.userId = '';  /* 临时值，下面异步覆盖 */
          authUserId(cachedPw).then(function(uid){
            state_auth.userId = uid;
            state_auth.unlocked = true;
            state_auth.hasPassphrase = true;
            authMarkTrusted();
            periodMarkUnlocked();   /* v37: 信任期内经期 PIN 一并免输入 */
            authUnlockComplete();
          });
        } else {
          /* 缓存密码与本地哈希不符（极少见：本地哈希被改）→ 降级到登录页 */
          sessionStorage.removeItem(AUTH_SESSION_KEY);
          sessionStorage.removeItem('unlockPw');
          document.body.classList.add('auth-locked');
          overlay.style.display='flex';
          authSwitchToEnter();
          setTimeout(function(){ pass1.focus(); }, 50);
        }
      });
      return;
    }

    document.body.classList.add('auth-locked');
    overlay.style.display='flex';
    if(hasStored) authSwitchToEnter();
    else {
      /* v36: 新设备防呆——先探测云端是否已有数据：
       * 有 → 进入「云端身份校验」模式（必须输入相同密码才能同步）；
       * 无 → 真正的首次使用 → 设置密码模式；
       * 探测失败（离线）→ 设置模式 + 醒目提示必须用同一密码。 */
      authSwitchToCloudEnter();
      cloudCollectUserIds(function(res){
        if(state_auth.unlocked) return;
        if(res && !res.err && res.uids && res.uids.length){
          state_auth.cloudVerify = true;
        } else if(res && !res.err){
          authSwitchToCreate();
        } else {
          authSwitchToCreate();
          authShowError('提示：若你在其他设备已设置过密码，此设备必须输入【同一个密码】，数据才会同步');
        }
      });
    }
    setTimeout(function(){ pass1.focus(); }, 50);
  }

  /* ================= Database SDK Integration ================= */
  var DB_MONEY = 'O4PsdbQpHnSDT0LSKcqgoI';
  var DB_HABIT = 'wuNwUprBrd6rfdcdHvCP9b';
  var DB_PLAN = 'ZnLrbr3jawU5LRlL3XGSRV';
  var DB_FITNESS = 'Ey5dN80w9Gexo7TxLvpfVu';
  var DB_SHOPPING = '4mWbsWDNv6k5fW4lI75FYj';
  var DB_MEDIA = 'P93GbycwxqQ0HWmvsDTWTQ';
  var DB_DIET = 'ZshQ2v3NpB58bxG59hlTEB';
  var DB_STORAGE = '9YCVWtvdwouCJvxjkfd4z0';
  var DB_MOOD = 'BHhTft6ZybuV7Lc0cF2nIC';
  var DB_PERIOD = 'rp51GH61XV6eq9fl4smboC';
var DB_SLEEP = '4rjX5sVnSNNfS2mk16nR2W';
var DB_STUDY = 'wtsziKZtrYywDnYMuRNcyP';
  var DB_PAYBACK = '935dPbYYu1hSUxwV7asgxy';
  var DB_META = 'FKpqucBa96f2slzvcU3jdV';
  var META_CLEAR_KEY = 'lastClearedAt';
  /* 习惯定义与应用设置同步键（存 JSON，text 字段实测可容纳 20000+ 字符） */
  var META_HABITS_KEY = 'habitsDef';
  var META_SETTINGS_KEY = 'appSettings';
  var ONLINE = false, LOCAL_ONLY = false;
  var db = null;
  function refreshDb(){
    try { db = (window.__SMART_PAGE__ && window.__SMART_PAGE__.database) || null; ONLINE = !!db; }
    catch(e){ db = null; ONLINE = false; }
  }
  refreshDb();
  /* v54: 桥就绪轮询——脚本加载瞬间若父页 postMessage 握手尚未完成，
   * window.__SMART_PAGE__.database 可能还不存在，导致 ONLINE 误判为 false、
   * 之后所有云端读写被 if(!ONLINE) 静默跳过（表现：settings 类数据全空、经期 PIN 永远"错误"）。
   * 某些环境（如鸿蒙「添加到桌面」的 standalone 模式）外壳与 iframe 桥接时序与浏览器不同，
   * 工作台脚本常在桥就绪前执行。这里轮询等待桥就绪，一旦就绪立即刷新 ONLINE 并重拉云端数据。 */
  function ensureBridgeSync(){
    refreshDb();
    if(ONLINE) return;
    if(!(typeof window !== 'undefined' && window.__SMART_PAGE__)) return; /* 非平台环境，无需轮询 */
    var tries = 0;
    var timer = setInterval(function(){
      tries++;
      refreshDb();
      if(ONLINE || tries > 50){
        try{ clearInterval(timer); }catch(e){}
        if(ONLINE){
          /* 桥已就绪：重新拉取云端数据（含 settings 里的 plan/diet/pin） */
          if(typeof authPostUnlockRehydrate === 'function') authPostUnlockRehydrate();
          else pullAllRemote(function(ok){ if(ok){ saveState(); renderAll(); } });
        }
      }
    }, 200);
  }

  function goLocalOnly(reason){ LOCAL_ONLY = true; console.warn("[database] " + reason); }

  /* v45: 页面级限流(50001)保护——所有云端读取走同一串行队列 + 限流退避重试。
   * 根因：runMerge 一次性并发 10+ 次 db.query，runHealthCheck 又叠加 22 次，触发 spaceengine
   * 页面限流 50001「access rate limit exceeded」，被拒的表查询返回 null → 该模块(如书影音)线上为空。
   * 串行队列 + 最小间隔 + 退避重试彻底解决。队列永远 fulfill（错误以 {__error} 标记 resolve），
   * 绝不 reject，避免中断后续排队查询。 */
  var _dbQuerySeq = Promise.resolve();
  var _dbQueryMinGap = 250; /* ms，查询间最小间隔，主动留出余量避开限流 */
  var _dbQueryLastAt = Date.now() - _dbQueryMinGap;
  function dbQueryThrottled(opts, attempt){
    if (attempt == null) attempt = 0;
    _dbQuerySeq = _dbQuerySeq.then(function(){
      var now = Date.now();
      var wait = Math.max(0, _dbQueryMinGap - (now - _dbQueryLastAt));
      return new Promise(function(resolve){
        setTimeout(function(){
          _dbQueryLastAt = Date.now();
          db.query(opts).then(function(r){
            if (r && r.code === 50001) {
              if (attempt < 5) { console.warn('[database] 限流50001，退避重试(' + (attempt + 1) + ')', opts.databaseId); setTimeout(function(){ resolve(dbQueryThrottled(opts, attempt + 1)); }, 300 * Math.pow(2, attempt)); }
              else { console.warn('[database] 限流重试耗尽，本次查询失败', opts.databaseId); resolve(r); }
            } else { resolve(r); }
          }).catch(function(err){
            if (attempt < 5 && err && /rate limit/i.test(String(err && err.message || err))) {
              setTimeout(function(){ resolve(dbQueryThrottled(opts, attempt + 1)); }, 300 * Math.pow(2, attempt));
            } else { resolve({ __error: (err && (err.message || String(err))) || 'query-failed' }); }
          });
        }, wait);
      });
    });
    return _dbQuerySeq;
  }

  /* v32: 读取时按 userId 过滤。返回空数组代表"无数据"（不是错误）。
   * records 可能没有 userId（旧数据 / v32 前导入的备份）→ 视为他人数据，不返回。 */
  function _authGetRowUserId(r){
    if(!r) return null;
    var u = r.userId;
    if(typeof u === 'string') return u;
    if(u && typeof u.text === 'string') return u.text;
    if(u && typeof u.value === 'string') return u.value;
    return null;
  }
  function dbFetchAll(databaseId, cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(null); return; }
    var all = [], cursor = null, guard = 0;
    function fetchPage(){
      guard++;
      if (guard > 100) { console.warn('[database] 翻页超过上限，已熔断', databaseId); if(cb) cb(all); return; }
      dbQueryThrottled({ databaseId: databaseId, pageSize: 200, startCursor: cursor }).then(function(result){
        /* v45: 队列内部网络错误以 __error 标记返回，按读取失败处理 */
        if (result && result.__error) { console.warn('[database] 读取失败', result.__error); if(cb) cb(null); return; }
        /* v36e: SDK 会把业务错误（如 12607 page not linked to database）包在成功响应里返回(results=null)，必须识别，不能当空数据 */
        if (result && result.code) { console.warn('[database] query 业务错误', result.code, result.msg); if(cb) cb(null); return; }
        var page = result.results || [];
        all = all.concat(page);
        var next = result.nextCursor;
        if (result.hasMore && next && next !== cursor && page.length) { cursor = next; fetchPage(); }
        else {
          /* v32: 按 userId 过滤，未登录或未匹配当前 userId 的记录全部丢弃 */
          var uid = state_auth.userId;
          /* v43: 未登录(uid 为空)必须返回 null 而非 [] —— 返回空数组会让 runMerge 调用 mergeMedia([])
           * 把本地数据清空并 saveState 持久化(用户红线:数据零容忍)。返回 null 时 runMerge 走 oneDone(false)
           * 保留本地,等 auth 解锁后用正确 userId 重拉。这是"书影音/各模块刷新后变空"的根因。 */
          if(!uid){ if(cb) cb(null); return; }
          var filtered = all.filter(function(r){ return _authGetRowUserId(r) === uid; });
          if(cb) cb(filtered);
        }
      }).catch(function(err){ console.warn("[database] 读取失败", err); if(cb) cb(null); });
    }
    fetchPage();
  }

  /* v32: 写入时自动注入 userId（如 props 里没有），保证云端每条记录都能归属到当前用户 */
  var lastDbWriteErr = '';
  function dbAdd(databaseId, props, cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(null); return; }
    var uid = state_auth.userId;
    var finalProps = Object.assign({}, props || {});
    if(uid && !finalProps.userId) finalProps.userId = { text: uid };  /* v36g: 必须 PropertyValue 信封，裸字符串会 11607 unmarshal 失败 */
    try {
      db.addRecord({ databaseId: databaseId, properties: finalProps }).then(function(result){
        /* v36f: SDK 可能把业务错误包在成功响应里（如 12607），必须识别，不能当写入成功吞掉 */
        if(result && result.code){
          lastDbWriteErr = 'addRecord 业务错误 code=' + result.code + ' ' + (result.msg || result.message || '');
          console.warn('[database] 写入业务错误', result);
          if(cb) cb(null);
          return;
        }
        var rid = result && (result.id || result._id || result.record_id || result.recordId) || null;
        if(rid) lastDbWriteErr = '';
        if(cb) cb(rid);
      }).catch(function(err){ lastDbWriteErr = 'addRecord 异常：' + String(err && err.message || err).slice(0,200); console.warn("[database] 写入失败，保留为未同步待重试", err); if(cb) cb(null); });
    } catch(e){ lastDbWriteErr = 'addRecord 调用异常：' + String(e && e.message || e).slice(0,200); console.warn("[database] 写入异常", e); if(cb) cb(null); }
  }

  function dbUpdate(databaseId, recordId, props){
    if (!ONLINE || LOCAL_ONLY) return;
    try {
      db.updateRecord({ databaseId: databaseId, recordId: recordId, properties: props }).catch(function(err){ console.warn("[database] 更新失败", err); });
    } catch(e){ console.warn("[database] 更新异常", e); }
  }

  function dbDelete(databaseId, recordId){
    if (!ONLINE || LOCAL_ONLY) return;
    try {
      db.deleteRecord({ databaseId: databaseId, recordId: recordId }).catch(function(err){ console.warn("[database] 删除失败", err); });
    } catch(e){ console.warn("[database] 删除异常", e); }
  }

  /* ===== 经期专用清空信号（v34）：键=periodClearedAt，只清经期，不动其它模块。
   * 用途：经期历史因旧 bug 日期丢失/臆造，用户选择清空重录。写入时间戳后，
   * 任何设备的 init 拉取到比本地更晚的标记 → 丢弃 createdAt 早于该时刻的本地经期记录，
   * 从而在云端已删、mergePeriod 并集(规则④不丢本地)前提下也不会把旧脏经期复活回来。 */
  var META_PERIOD_CLEAR_KEY = 'periodClearedAt';
  /* v36: 原始读取（不按 userId 过滤），仅供登录前的云端身份校验使用。
   * 返回 null 表示读取失败（网络异常），[] 表示确实无数据。 */
  function dbFetchAllRaw(databaseId, cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(null); return; }
    var all = [], cursor = null, guard = 0;
    function fetchPage(){
      guard++;
      if (guard > 100) { console.warn('[database] raw 翻页超过上限，已熔断', databaseId); if(cb) cb(all); return; }
      dbQueryThrottled({ databaseId: databaseId, pageSize: 200, startCursor: cursor }).then(function(result){
        if (result && result.__error) { console.warn('[database] raw 读取失败', result.__error); if(cb) cb(null); return; }
        /* v36e: SDK 会把业务错误（如 12607 page not linked to database）包在成功响应里返回(results=null)，必须识别，不能当空数据 */
        if (result && result.code) { console.warn('[database] query 业务错误', result.code, result.msg); if(cb) cb(null); return; }
        all = all.concat(result.results || []);
        var next = result.nextCursor;
        if (result.hasMore && next && next !== cursor && (result.results||[]).length) { cursor = next; fetchPage(); }
        else if(cb) cb(all);
      }).catch(function(err){ console.warn("[database] raw 读取失败", err); if(cb) cb(null); });
    }
    fetchPage();
  }
  /* v36: 收集云端已存在的全部 userId（探测 meta + money 两张小表）。
   * cb({err:bool, uids:[...]}) —— err=true 表示网络异常，无法判断。 */
  function cloudCollectUserIds(cb){
    if(!ONLINE || LOCAL_ONLY){ if(cb) cb({err:true, uids:[]}); return; }
    var uids = [], anyOk = false;
    function collect(rows){
      if(rows && rows.length){ anyOk = true; }
      if(rows) rows.forEach(function(r){ var u=_authGetRowUserId(r); if(u && uids.indexOf(u)<0) uids.push(u); });
    }
    dbFetchAllRaw(DB_META, function(rows){
      collect(rows);
      dbFetchAllRaw(DB_MONEY, function(rows2){
        collect(rows2);
        if(cb) cb({err:!anyOk, uids:uids});
      });
    });
  }
  /* v36b: 数据体检——对比「云端总数 / 当前身份可见数 / 本机条数」，客观定位"数据看不见"发生在哪一层 */
  var DIAG_TABLES = [
    {key:'money',   name:'记账',   id:DB_MONEY},
    {key:'habit',   name:'习惯',   id:DB_HABIT},
    {key:'planner', name:'日程',   id:DB_PLAN},
    {key:'fitness', name:'健身',   id:DB_FITNESS},
    {key:'home',    name:'待买',   id:DB_SHOPPING},
    {key:'media',   name:'书影音库', id:DB_MEDIA},
    {key:'diet',    name:'饮食',   id:DB_DIET},
    {key:'storage', name:'物品',   id:DB_STORAGE},
    {key:'mood',    name:'心情',   id:DB_MOOD},
    {key:'period',  name:'经期',   id:DB_PERIOD},
    {key:'sleep', name:'睡眠', id:DB_SLEEP},
    {key:'study', name:'学习', id:DB_STUDY},
    {key:'payback', name:'回本记录', id:DB_PAYBACK},
    {key:'meta',    name:'同步标记', id:DB_META}
  ];
  function diagFetchRaw(dbid){ return new Promise(function(res){ dbFetchAllRaw(dbid, function(rows){ res(rows||null); }); }); }
  function diagCountVisible(dbid){ return new Promise(function(res){ dbFetchAll(dbid, function(rows){ res(rows?rows.length:-1); }); }); }
  /* v36d: 直接探测一次原始查询，带回真实响应/报错，用于区分「真为空」vs「查询异常」 */
  function diagProbeDetail(){
    var info = { ONLINE: ONLINE, LOCAL_ONLY: LOCAL_ONLY, hasBridge: !!(window.__SMART_PAGE__ && window.__SMART_PAGE__.database), uid: (state_auth.userId||'').slice(0,8) };
    return new Promise(function(res){
      if(!info.hasBridge){ res(Object.assign(info,{probe:'无 __SMART_PAGE__.database 桥接'})); return; }
      var t0 = Date.now();
      db.query({ databaseId: DB_MONEY, pageSize: 5 }).then(function(r){
        info.probe = 'query 成功 '+(Date.now()-t0)+'ms；results='+(r.results?r.results.length:'null')+'，hasMore='+r.hasMore+'，nextCursor='+(r.nextCursor?'有':'无')+'；首页JSON：'+JSON.stringify(r).slice(0,300);
        res(info);
      }).catch(function(err){
        try{ info.probe = 'query 失败 '+(Date.now()-t0)+'ms：'+(err && (err.message||JSON.stringify(err)).slice(0,200) || String(err)); }catch(e){ info.probe = 'query 失败：'+String(err); }
        res(info);
      });
    });
  }
  function runHealthCheck(){
    var out = document.getElementById('diagHealthOut');
    if(!out) return;
    if(!ONLINE || LOCAL_ONLY){ out.innerHTML='<p class="diag-note">当前处于本地模式（未连接云端），无法体检。请在正式链接打开页面。</p>'; return; }
    var uid = state_auth.userId || '';
    out.innerHTML = '<p class="diag-note">正在体检…（正在逐表查询云端）</p>';
    Promise.all(DIAG_TABLES.map(function(t){
      return Promise.all([diagFetchRaw(t.id), diagCountVisible(t.id)]).then(function(c){
        var rawRows = c[0], ids = null;
        if(rawRows){ ids = {}; rawRows.forEach(function(r){ var id = r && (r._id || r.id); if(id) ids[id] = 1; }); }
        return {t:t, raw: rawRows?rawRows.length:-1, ids:ids, vis:c[1]};
      });
    })).then(function(rows){
      return diagProbeDetail().then(function(probe){ return {rows:rows, probe:probe}; });
    }).then(function(pack){
      var rows = pack.rows, probe = pack.probe;
      /* v36f: 本机统计拆分 —— 有效(非示例)/示例/待传(无云端身份)/孤儿(有身份但云端已不存在) */
      var TYPE2KEY = { planner:'plan', home:'shopping' };
      var cloudIds = {}; rows.forEach(function(x){ if(x.ids) cloudIds[x.t.key] = x.ids; });
      var stats = {}; var orphanRecs = []; var mediaOrphans = [];
      (state.records||[]).forEach(function(r){
        if(!r || !r.type) return;
        var s = stats[r.type] || (stats[r.type] = {total:0,sample:0,pending:0,orphan:0});
        s.total++;
        if(r.sample){ s.sample++; return; }
        if(!r.remoteId){ s.pending++; return; }
        var key = TYPE2KEY[r.type] || r.type;
        if(cloudIds[key] && !cloudIds[key][r.remoteId]){ s.orphan++; orphanRecs.push(r); }
      });
      (state.mediaItems||[]).forEach(function(m){
        if(!m) return;
        var s = stats.media || (stats.media = {total:0,sample:0,pending:0,orphan:0});
        s.total++;
        if(m.sample){ s.sample++; return; }
        if(!m.remoteId){ s.pending++; return; }
        if(cloudIds.media && !cloudIds.media[m.remoteId]){ s.orphan++; mediaOrphans.push(m); }
      });
      var orphanTotal = orphanRecs.length + mediaOrphans.length;
      var pendingTotal = 0, sampleTotal = 0;
      Object.keys(stats).forEach(function(ty){ pendingTotal += stats[ty].pending; sampleTotal += stats[ty].sample; });
      var totalRaw=0, totalVis=0, mismatch=false, anyRaw=false, anyFail=false;
      var html = '<table class="diag-table"><tr><th>模块</th><th>云端总数</th><th>当前身份可见</th><th>本机(有效)</th></tr>';
      rows.forEach(function(x){
        /* v36d: -1 = 查询失败，必须如实显示，不能吞成 0 */
        if(x.raw<0 || x.vis<0) anyFail=true;
        totalRaw += Math.max(0,x.raw); totalVis += Math.max(0,x.vis);
        if(x.raw>0 && x.vis===0) mismatch=true;
        if(x.raw>0) anyRaw=true;
        var warn = (x.raw>0 && x.vis===0) ? ' class="diag-bad"' : '';
        var st = stats[x.t.key];
        var localCell = '—';
        if(x.t.key !== 'meta' && x.t.key !== 'habit' && st){
          localCell = (st.total - st.sample) + (st.sample>0 ? ' <small>(+'+st.sample+'示例)</small>' : '');
          if(st.orphan>0) localCell += ' <b class="diag-bad">⚠'+st.orphan+'缺失</b>';
          if(st.pending>0) localCell += ' <small>待传'+st.pending+'</small>';
        }
        html += '<tr'+warn+'><td>'+x.t.name+'</td><td>'+(x.raw<0?'<b>读取失败</b>':x.raw)+'</td><td>'+(x.vis<0?'<b>读取失败</b>':x.vis)+'</td><td>'+localCell+'</td></tr>';
      });
      html += '</table>';
      html += '<p class="diag-note">当前身份：<b>'+(uid?escapeHtml(uid.slice(0,8))+'…':'未登录')+'</b>；云端共 <b>'+totalRaw+'</b> 条'+(anyFail?'（<b class="diag-bad">部分表读取失败，以上 0 可能不可信</b>）':'')+'，当前身份可见 <b>'+totalVis+'</b> 条。</p>';
      if(mismatch){
        html += '<p class="diag-note diag-bad">⚠ 云端有数据，但当前登录身份一条都看不到——说明登录用的密码与数据的归属身份不一致（常见于在某台设备上设过一个不同的密码）。点下方按钮可把云端数据全部归属到当前身份：只改归属，不删除、不改动任何内容。</p>';
        html += '<button type="button" class="btn primary full" id="diagRetagBtn">把云端数据归属到当前身份（'+totalRaw+' 条）</button>';
      } else if(anyFail){
        html += '<p class="diag-note diag-bad">⚠ 云端查询有失败（网络波动或客户端桥接异常），本结果不可信。请检查网络后重试；若反复失败，请把下方「诊断详情」整段发给助手。</p>';
      }
      if(orphanTotal>0){
        html += '<p class="diag-note diag-bad">⚠ 本机有 <b>'+orphanTotal+'</b> 条记录在云端已不存在（历史上云端被删除/清空，本机按保护规则保留、但永不自动补传）。若这些数据你仍需要，点下方按钮把它们作为新记录重新上传：</p>';
        html += '<button type="button" class="btn primary full" id="diagResyncBtn">重新补传这 '+orphanTotal+' 条到云端</button>';
      }
      if(pendingTotal>0){
        html += '<p class="diag-note'+(lastDbWriteErr?' diag-bad':'')+'">本机另有 <b>'+pendingTotal+'</b> 条记录尚未上传到云端'+(lastDbWriteErr?'；<b>最近一次写入报错：'+escapeHtml(lastDbWriteErr)+'</b>':'（点顶栏「同步」即可补传）')+'。</p>';
      }
      if(sampleTotal>0){
        html += '<p class="diag-note">本机统计含 '+sampleTotal+' 条内置示例数据（表中括号标注，不参与同步）；不需要可在顶栏点「清空示例」。</p>';
      }
      if(!mismatch && !anyFail && orphanTotal===0 && pendingTotal===0 && anyRaw){
        html += '<p class="diag-note good">✅ 云端数据完整、身份匹配、本机与云端一致，没有任何丢失。</p>';
      } else if(!mismatch && !anyFail && !anyRaw){
        html += '<p class="diag-note">云端为空：历史数据尚未上传到云端（或此前执行过清空）。此后新增的记录会正常同步。若你确认电脑端有数据，请把下方「诊断详情」整段发给助手。</p>';
      }
      html += '<details class="diag-debug"><summary>诊断详情（点开复制全部内容发给助手）</summary><pre id="diagDebugPre"></pre></details>';
      out.innerHTML = html;
      var statsByKey = {};
      Object.keys(stats).forEach(function(ty){ statsByKey[TYPE2KEY[ty]||ty] = stats[ty]; });
      var pre = document.getElementById('diagDebugPre');
      if(pre){ pre.textContent = JSON.stringify({env:{href:location.href.slice(0,120), ua:(navigator.userAgent||'').slice(0,120)}, probe:probe, lastWriteErr:lastDbWriteErr, rows:rows.map(function(x){return {m:x.t.name, raw:x.raw, vis:x.vis, local:statsByKey[x.t.key]||undefined};})}, null, 1); }
      var rb = document.getElementById('diagRetagBtn');
      if(rb) rb.addEventListener('click', function(){
        showConfirm({title:'确认归属迁移', desc:'将把云端全部 '+totalRaw+' 条记录的归属身份改为当前登录身份。数据内容不变，此操作不可撤销。', onConfirm:function(okc){ if(!okc) return; retagCloudToCurrentUser(); }});
      });
      var sb = document.getElementById('diagResyncBtn');
      if(sb) sb.addEventListener('click', function(){
        showConfirm({title:'确认补传', desc:'将把 '+orphanTotal+' 条本机记录重新上传为云端新记录（内容不变）。若云端之后出现重复条目，可再由助手精确清理。', onConfirm:function(okc){
          if(!okc) return;
          orphanRecs.forEach(function(r){ r.remoteId = null; r.syncTriedAt = 0; });
          mediaOrphans.forEach(function(m){ m.remoteId = null; m.syncTriedAt = 0; });
          saveState();
          syncPendingRecords(function(n){
            toast(n>0 ? ('已发起补传 '+n+' 条') : '没有需要补传的记录');
            saveState(); renderAll();
            setTimeout(runHealthCheck, 2000);
          });
        }});
      });
    });
  }
  function retagCloudToCurrentUser(){
    var uid = state_auth.userId;
    if(!uid){ toast('尚未登录，无法迁移'); return; }
    if(!ONLINE || LOCAL_ONLY){ toast('当前处于本地模式，无法迁移'); return; }
    var done=0, fail=0, idx=0;
    var tasks = DIAG_TABLES.map(function(t){ return {id:t.id, name:t.name}; });
    toast('开始迁移云端数据归属…');
    function nextTable(){
      if(idx>=tasks.length){
        toast('迁移完成：成功 '+done+' 条'+(fail?('，失败 '+fail+' 条'):''));
        pullAllRemote(function(){ saveState(); renderAll(); });
        runHealthCheck();
        return;
      }
      var t = tasks[idx++];
      dbFetchAllRaw(t.id, function(rows){
        if(!rows || !rows.length){ nextTable(); return; }
        var need = rows.filter(function(r){ return _authGetRowUserId(r) !== uid; });
        if(!need.length){ nextTable(); return; }
        var i = 0;
        function nextRow(){
          if(i>=need.length){ nextTable(); return; }
          var r = need[i++];
          var rid = r._id || r.record_id || r.id;
          if(!rid){ fail++; nextRow(); return; }
          db.updateRecord({databaseId:t.id, recordId:rid, properties:{userId:{text:uid}}})  /* v36g: PropertyValue 信封 */
            .then(function(){ done++; })
            .catch(function(err){ fail++; console.warn('[体检] 迁移失败', t.name, rid, err); })
            .then(nextRow);
        }
        nextRow();
      });
    }
    nextTable();
  }
  function readPeriodClearMarker(cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(0); return; }
    /* v36b: 标记行可能不带 userId（如 periodClearedAt），必须用 raw 读取，否则被身份过滤漏掉 */
    dbFetchAllRaw(DB_META, function(rows){
      var ts = 0;
      if (rows) rows.forEach(function(r){ if (String(r["键"]||"") === META_PERIOD_CLEAR_KEY) ts = Math.max(ts, Number(r["值"])||0); });
      if(cb) cb(ts);
    });
  }
  function writePeriodClearMarker(ts, cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(false); return; }
    var props = { "键": { text: META_PERIOD_CLEAR_KEY }, "值": { text: String(ts) } };
    dbFetchAll(DB_META, function(rows){
      var existingId = null, dupIds = [];
      if (rows) rows.forEach(function(r){
        if (String(r["键"]||"") === META_PERIOD_CLEAR_KEY) { if (existingId) dupIds.push(r._id); else existingId = r._id; }
      });
      dupIds.forEach(function(rid){ dbDelete(DB_META, rid); });
      if (existingId) { dbUpdate(DB_META, existingId, props); if(cb) cb(true); }
      else { dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); }); }
    });
  }
  /* 本地经期清空：本地删除 + 云端删除 + 写标记（供用户主动「清空经期历史」用） */
  function clearPeriodHistoryLocal(){
    var allPeriod = state.records.filter(function(r){ return r.type==='period'; });
    var toDelete = allPeriod.filter(function(r){ return r.remoteId; });
    toDelete.forEach(function(r){ try{ deleteRemotePeriod(r.remoteId); }catch(e){} });
    state.records = state.records.filter(function(r){ return r.type!=='period'; });
    state._periodForm = null;
    var ts = Date.now();
    writePeriodClearMarker(ts, function(){});
    saveState();
  }

  /* ===== 跨设备清空信号：元数据表存 lastClearedAt 时间戳 ===== */
  function readMetaClearAt(cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(0); return; }
    /* v36b: 标记行可能不带 userId，用 raw 读取避免被身份过滤漏掉 */
    dbFetchAllRaw(DB_META, function(rows){
      var ts = 0;
      if (rows) rows.forEach(function(r){
        if (String(r["键"]||"") === META_CLEAR_KEY) ts = Math.max(ts, Number(r["值"])||0);
      });
      if(cb) cb(ts);
    });
  }
  function writeMetaClearAt(ts, cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(false); return; }
    var props = { "键": { text: META_CLEAR_KEY }, "值": { text: String(ts) } };
    dbFetchAll(DB_META, function(rows){
      var existingId = null, dupIds = [];
      if (rows) rows.forEach(function(r){
        if (String(r["键"]||"") === META_CLEAR_KEY) {
          if (existingId) dupIds.push(r._id); else existingId = r._id;
        }
      });
      dupIds.forEach(function(rid){ dbDelete(DB_META, rid); });
      if (existingId) { dbUpdate(DB_META, existingId, props); if(cb) cb(true); }
      else { dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); }); }
    });
  }

  /* ===== 习惯定义 + 应用设置同步 =====
   * 背景：习惯的「定义」（名称/目标/单位/打卡方式）和周计划、饮食计划、健身档案
   * 都只存在 localStorage 里，从来不上云。结果 web 端新建的自定义习惯、写好的饮食
   * 计划，在移动端完全看不到 —— 因为移动端压根没有这些习惯定义，mergeHabit 遍历
   * 本地习惯时匹配不到，远程的打卡数据也被整批丢弃。
   * 这里复用同步标记表（键/值 两个 text 字段），把定义与设置以 JSON 形式同步。 */
  function writeMetaValue(key, value, cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(false); return; }
    if (!value || value.length > 15000) { console.warn('[sync] 同步内容过大，已跳过', key, value && value.length); if(cb) cb(false); return; }
    var props = { "键": { text: key }, "值": { text: value } };
    dbFetchAll(DB_META, function(rows){
      var existingId = null, dupIds = [];
      (rows || []).forEach(function(r){
        if (String(r["键"]||"") === key) {
          if (existingId) dupIds.push(r._id); else existingId = r._id;
        }
      });
      dupIds.forEach(function(rid){ dbDelete(DB_META, rid); });
      if (existingId) { dbUpdate(DB_META, existingId, props); if(cb) cb(true); }
      else { dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); }); }
    });
  }
  function readMetaValue(key, cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(null); return; }
    dbFetchAll(DB_META, function(rows){
      var val = null, best = -1;
      (rows || []).forEach(function(r){
        if (String(r["键"]||"") !== key) return;
        var obj = null;
        try { obj = JSON.parse(String(r["值"]||"")); } catch(e){ return; }
        if (!obj || typeof obj !== 'object') return;
        var at = Number(obj.updatedAt || 0);
        if (at >= best) { best = at; val = obj; }
      });
      if(cb) cb(val);
    });
  }
  function settingsSnapshot(){
    return {
      updatedAt: Number(state.settingsUpdatedAt || 0),
      habits: (state.habits||[]).map(function(h){
        return {id:h.id,name:h.name,key:h.key,type:h.type,target:h.target,unit:h.unit,tone:h.tone};
      }),
      hiddenHabitKeys: state.settings.hiddenHabitKeys || [],
      deletedHabitNames: state.settings.deletedHabitNames || [], deletedPlanIds: state.settings.deletedPlanIds || [],
      weeklyPlan: state.settings.weeklyPlan || [],
      weeklyPlanHistory: state.settings.weeklyPlanHistory || [],
      weeklyPlanWeekStart: state.settings.weeklyPlanWeekStart || '',
      dietPlans: state.settings.dietPlans || [],
      fitnessProfile: state.settings.fitnessProfile || {},
      fitnessProfileUpdatedAt: Number(state.settings.fitnessProfileUpdatedAt || 0),
      budget: Number(state.settings.budget || 0),
      brand: state.settings.brand || {},
      moodEmoji: state.settings.moodEmoji || {},
      periodPinHash: state.settings.periodPinHash || '',
      periodPinSalt: state.settings.periodPinSalt || ''
    };
  }
  function settingsFingerprint(){ try { var s = settingsSnapshot(); s.updatedAt = 0; return JSON.stringify(s); } catch(e){ return ''; } }
  /* 习惯定义用「并集合并」，只增不删，绝不覆盖本地已有定义。
   * 删除靠 deletedHabitNames 名单双向同步，避免删掉的习惯被对端重新拉回来。 */
  function mergeRemoteHabits(payload){
    var changed = false;
    if (!payload || !Array.isArray(payload.habits)) return false;
    var localDeleted = state.settings.deletedHabitNames || [];
    var remoteDeleted = Array.isArray(payload.deletedHabitNames) ? payload.deletedHabitNames : [];
    var localHidden = state.settings.hiddenHabitKeys || [];
    var remoteHidden = Array.isArray(payload.hiddenHabitKeys) ? payload.hiddenHabitKeys : [];
    var hiddenKeys = {};
    localHidden.forEach(function(k){ hiddenKeys[k] = true; });
    remoteHidden.forEach(function(k){ if(k) hiddenKeys[k] = true; });
    var allDeleted = {};
    localDeleted.forEach(function(n){ allDeleted[n] = true; });
    remoteDeleted.forEach(function(n){ allDeleted[n] = true; });
    /* v40: 内置习惯删除走 hiddenHabitKeys（存 key 而非 name）。必须把这些 key 对应的习惯名也并入 allDeleted，
     * 否则云端习惯定义里的内置习惯会在下面被重新加回 → 已隐藏的内置习惯（看书/冥想/睡觉）重启后复活。 */
    HABIT_DEFS.forEach(function(def){ if (def.key && hiddenKeys[def.key]) allDeleted[def.name] = true; });
    var before = (state.habits||[]).length;
    state.habits = (state.habits||[]).filter(function(h){
      if (allDeleted[h.name]) return false;
      if (h.key && hiddenKeys[h.key]) return false;
      return true;
    });
    if (state.habits.length !== before) changed = true;
    payload.habits.forEach(function(rh){
      if (!rh || !rh.name || allDeleted[rh.name] || (rh.key && hiddenKeys[rh.key])) return;
      var exist = null;
      (state.habits||[]).forEach(function(h){ if(!exist && (h.name === rh.name || (rh.key && h.key === rh.key))) exist = h; });
      if (!exist) {
        state.habits.push({
          id: rh.id || uid(), key: rh.key || ('custom-'+uid()), name: rh.name,
          type: ['check','counter','number'].indexOf(rh.type) >= 0 ? rh.type : 'check',
          target: Math.max(.1, Number(rh.target||1)), unit: rh.unit || '次', tone: rh.tone || 'sage',
          entries: {}, sample: false
        });
        changed = true;
        return;
      }
      if (exist.target !== Number(rh.target||1) || exist.unit !== (rh.unit||'次') || exist.type !== rh.type) {
        exist.type = ['check','counter','number'].indexOf(rh.type) >= 0 ? rh.type : 'check';
        exist.target = Math.max(.1, Number(rh.target||1));
        exist.unit = rh.unit || '次';
        changed = true;
      }
    });
    var mergedDeleted = Object.keys(allDeleted);
    if (mergedDeleted.length !== localDeleted.length) { state.settings.deletedHabitNames = mergedDeleted; changed = true; }
    var localHidden = state.settings.hiddenHabitKeys || [];
    var remoteHidden = Array.isArray(payload.hiddenHabitKeys) ? payload.hiddenHabitKeys : [];
    var mergedHidden = localHidden.slice();
    remoteHidden.forEach(function(k){ if (mergedHidden.indexOf(k) < 0) mergedHidden.push(k); });
    if (mergedHidden.length !== localHidden.length) { state.settings.hiddenHabitKeys = mergedHidden; changed = true; }
    return changed;
  }
  /* 拉取远端设置：习惯定义并集合并；周计划/饮食计划/健身档案等按时间戳取新的一份 */
  /* v40: 设置数组用「并集去重」合并，避免云端旧/空值整体覆盖本地未上云的数据
   * （例：云端 dietPlans 为空时，不应清空本地刚录入的"计划吃什么")。 */
  function mergePlanList(local, remote){
    local = Array.isArray(local)?local:[]; remote = Array.isArray(remote)?remote:[];
    /* v49: 计划状态多端同步。
       旧逻辑 local.concat(remote)「先到先得」→ 本地旧版本永远胜出，另一台设备的勾选状态永远同步不过来；
       且无 id 时按整条内容做 key，done 一变就成了「新条目」导致重复出现两条。
       新逻辑：按 id 归并，取 updatedAt 更大的一方（末次修改胜出）；删除走 deletedPlanIds 墓碑防止被并集复活。 */
    var deleted = {};
    try{ (Array.isArray(state.settings.deletedPlanIds)?state.settings.deletedPlanIds:[]).forEach(function(x){ if(x) deleted[x]=1; }); }catch(e){}
    var byId = {}, out = [];
    local.concat(remote).forEach(function(p){
      if(!p || !p.id) return;
      if(deleted[p.id]) return;
      var cur = byId[p.id];
      if(!cur){ byId[p.id]=p; out.push(p); return; }
      if(Number(p.updatedAt||0) > Number(cur.updatedAt||0)){ var i = out.indexOf(cur); if(i>=0) out[i]=p; byId[p.id]=p; }
    });
    local.concat(remote).forEach(function(p){
      if(!p || p.id) return;
      var k='__c'+JSON.stringify(p);
      if(!byId[k]){ byId[k]=1; out.push(p); }
    });
    return out;
  }
  function mergeDietPlans(local, remote){
    /* v51: 按 text|date 归并 + 字段级合并。「已吃(done)」是不可逆状态，用「或」合并——
     * 旧版 local.concat(remote) 先到先得，未吃的一端(done:false)永远胜出会把另一端已设的
     * done:true 抹掉，再被 saveState 推回云端 → 已吃的计划在所有设备上反复复活。 */
    local = Array.isArray(local)?local:[]; remote = Array.isArray(remote)?remote:[];
    var idxByKey = {}, out = [];
    function key(p){ return (p&&p.text?p.text:'')+'|'+(p&&p.date?p.date:''); }
    function absorb(p){
      if(!p || !p.text) return;
      var k = key(p);
      if(!(k in idxByKey)){
        idxByKey[k] = out.length;
        out.push({text:p.text, date:p.date||'', done:!!p.done, doneAt:Number(p.doneAt||0)||0, at:Number(p.at||0)||0});
        return;
      }
      var t = out[idxByKey[k]];
      if(p.done){ t.done = true; t.doneAt = Math.max(Number(t.doneAt||0), Number(p.doneAt||0)||0); }
      if(p.date && !t.date) t.date = p.date;
      var pat = Number(p.at||0)||0;
      if(pat){ t.at = t.at ? Math.min(t.at, pat) : pat; }
    }
    local.forEach(absorb);
    remote.forEach(absorb);
    return out;
  }
  /* v51: 判断某条「计划吃什么」是否已经吃过——
   * ① 显式标记 done；② 自愈：三餐记录里已有同名食物，且记录日期在计划日期当天或之后；
   *    若同一天，则记录必须晚于计划的创建时间（避免「先吃了水煮蛋、再把它加进计划」被误判为已吃）。 */
  function _dietPlanEatenByRecord(p){
    if(!p) return false;
    if(p.done) return true;
    var txt = String(p.text||'').trim();
    if(!txt) return false;
    /* 片段化：用户点「吃这餐」后往往在预填文本上继续添加食物（如
     * 计划「饺子馄饨汤底+水煮蛋」实际记成「饺子馄饨汤底+咸奶茶+…+水煮蛋2」），
     * 整串包含匹配不到，因此按片段判定：记录里「全部片段都出现」即视为已吃。 */
    var segs = txt.split(/[\+＋,，、;；|\/\s]+/).map(function(x){ return x.trim(); })
                  .filter(function(x){ return x.length >= 2; });
    if(!segs.length) segs = [txt];
    var pd = String(p.date||''), pat = Number(p.at||0)||0;
    return (state.records||[]).some(function(r){
      if(!r || r.type!=='diet' || !r.data) return false;
      var rd = String(r.date||'');
      if(pd && rd < pd) return false;
      if(pd && rd === pd && pat && Number(r.createdAt||0) < pat) return false;
      var food = String(r.data.food||'');
      if(food.indexOf(txt) >= 0) return true;
      if(segs.length < 2) return false;
      for(var i=0;i<segs.length;i++){ if(food.indexOf(segs[i]) < 0) return false; }
      return true;
    });
  }
  /* v41: 本周计划历史——按周一起止日期并集合并，保留两端录入过的周归档 */
  function mergePlanHistory(local, remote){
    local = Array.isArray(local)?local:[]; remote = Array.isArray(remote)?remote:[];
    var byWeek = {}, out = [];
    local.concat(remote).forEach(function(w){ if(!w || !w.weekStart) return; if(!byWeek[w.weekStart]){ byWeek[w.weekStart]=1; out.push(w); } });
    out.sort(function(a,b){ return a.weekStart < b.weekStart ? 1 : -1; });
    return out.slice(0,12);
  }
  /* v41: 取某日期所在周的周一（ISO 周起始） */
  function isoWeekStart(base){
    var d = new Date(base || new Date());
    var day = (d.getDay()+6)%7;
    d.setDate(d.getDate()-day);
    d.setHours(0,0,0,0);
    return isoDate(d);
  }
  function fmtWeekLabel(ws){
    if(!ws) return '';
    var parts = ws.split('-');
    return parts.length===3 ? (parts[1].replace(/^0/,'')+'/'+parts[2].replace(/^0/,'')+' 那周') : ws;
  }
  /* v41: 跨周滚动——把上一周计划归档到历史，并清空本周完成状态 */
  function rolloverWeeklyPlan(){
    var ws = isoWeekStart();
    var prev = state.settings.weeklyPlanWeekStart;
    if(prev === ws) return;
    var cur = Array.isArray(state.settings.weeklyPlan)?state.settings.weeklyPlan:[];
    if(cur.length){
      var items = cur.map(function(x){ return {title:x.title,titleEn:x.titleEn,note:x.note,noteEn:x.noteEn,group:x.group,done:Boolean(x.done)}; });
      var completed = cur.filter(function(x){ return x.done; }).length;
      state.settings.weeklyPlanHistory = Array.isArray(state.settings.weeklyPlanHistory)?state.settings.weeklyPlanHistory:[];
      state.settings.weeklyPlanHistory.unshift({weekStart:prev||ws,weekLabel:fmtWeekLabel(prev||ws),items:items,completed:completed,total:cur.length});
      if(state.settings.weeklyPlanHistory.length>12) state.settings.weeklyPlanHistory.length=12;
    }
    state.settings.weeklyPlan = [];
    state.settings.weeklyPlanWeekStart = ws;
    state.settings.deletedPlanIds = [];
    try{ saveStateQuiet(); }catch(e){}
  }
  /* v41: 渲染历史计划列表 */
  function renderPlanHistory(){
    var el = document.getElementById('planHistory');
    if(!el) return;
    var hist = Array.isArray(state.settings.weeklyPlanHistory)?state.settings.weeklyPlanHistory:[];
    if(!hist.length){ el.innerHTML = empty('还没有历史计划，每周一会自动归档上一周'); return; }
    el.innerHTML = '<div class="plan-history-list">'+hist.map(function(w){
      var items = (w.items||[]).map(function(it){
        var title = (LANG==='en'&&it.titleEn)?it.titleEn:(it.title||'');
        return '<div class="hist-item'+(it.done?' done':'')+'"><span class="hist-dot"></span><span>'+escapeHtml(title)+'</span></div>';
      }).join('');
      return '<div class="hist-week"><div class="hist-week-head"><strong>'+escapeHtml(w.weekLabel||w.weekStart||'')+'</strong><span class="hist-count">'+(w.completed||0)+' / '+(w.total||0)+' 完成</span></div>'+items+'</div>';
    }).join('')+'</div>';
  }
  function applySettingsSync(cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(false); return; }
    var changed = false, remoteAt = 0;
    readMetaValue(META_HABITS_KEY, function(h){
      if (h) changed = mergeRemoteHabits(h) || changed;
      remoteAt = Math.max(remoteAt, Number(h && h.updatedAt || 0));
      readMetaValue(META_SETTINGS_KEY, function(s){
        remoteAt = Math.max(remoteAt, Number(s && s.updatedAt || 0));
        var localAt = Number(state.settingsSyncedAt || 0);
        if (s && remoteAt > localAt) {
          if (Array.isArray(s.deletedPlanIds)) { var _dp = {}; (Array.isArray(state.settings.deletedPlanIds)?state.settings.deletedPlanIds:[]).concat(s.deletedPlanIds).forEach(function(x){ if(x) _dp[x]=1; }); state.settings.deletedPlanIds = Object.keys(_dp); changed = true; }
          if (Array.isArray(s.weeklyPlan)) { state.settings.weeklyPlan = mergePlanList(state.settings.weeklyPlan, s.weeklyPlan); changed = true; }
          if (Array.isArray(s.weeklyPlanHistory)) { state.settings.weeklyPlanHistory = mergePlanHistory(state.settings.weeklyPlanHistory, s.weeklyPlanHistory); changed = true; }
          if (typeof s.weeklyPlanWeekStart === 'string' && s.weeklyPlanWeekStart && s.weeklyPlanWeekStart > state.settings.weeklyPlanWeekStart) { state.settings.weeklyPlanWeekStart = s.weeklyPlanWeekStart; changed = true; }
          if (Array.isArray(s.dietPlans)) { state.settings.dietPlans = mergeDietPlans(state.settings.dietPlans, s.dietPlans); changed = true; }
          if (s.fitnessProfile && typeof s.fitnessProfile === 'object' && Number(s.fitnessProfileUpdatedAt||0) > Number(state.settings.fitnessProfileUpdatedAt||0)) { state.settings.fitnessProfile = Object.assign({}, state.settings.fitnessProfile, s.fitnessProfile); state.settings.fitnessProfileUpdatedAt = Number(s.fitnessProfileUpdatedAt||0); changed = true; }
          if (typeof s.periodPinHash === 'string' && s.periodPinHash) { state.settings.periodPinHash = s.periodPinHash; state.settings.periodPinSalt = s.periodPinSalt || ''; changed = true; }
          if (s.budget != null && Number(s.budget) !== Number(state.settings.budget||0)) { state.settings.budget = Number(s.budget)||0; changed = true; }
          if (s.brand && typeof s.brand === 'object') { state.settings.brand = Object.assign({}, state.settings.brand, s.brand); changed = true; }
          if (s.moodEmoji && typeof s.moodEmoji === 'object') { state.settings.moodEmoji = Object.assign({}, state.settings.moodEmoji||{}, s.moodEmoji); changed = true; }
        }
        if (remoteAt > localAt) { state.settingsSyncedAt = remoteAt; changed = true; }
        if(cb) cb(changed);
      });
    });
  }
  var settingsPushTimer = null, settingsPushing = false;
  function pushSettingsNow(fp){
    if (!ONLINE || LOCAL_ONLY || settingsPushing) { settingsPushing = false; return; }
    settingsPushing = true;
    var at = Date.now();
    state.settingsUpdatedAt = at;
    var snap = settingsSnapshot(); snap.updatedAt = at;
    var habitsPayload = JSON.stringify({updatedAt:at,habits:snap.habits,hiddenHabitKeys:snap.hiddenHabitKeys,deletedHabitNames:snap.deletedHabitNames,deletedPlanIds:snap.deletedPlanIds});
    var settingsPayload = JSON.stringify({updatedAt:at,weeklyPlan:snap.weeklyPlan,weeklyPlanHistory:snap.weeklyPlanHistory,weeklyPlanWeekStart:snap.weeklyPlanWeekStart,dietPlans:snap.dietPlans,fitnessProfile:snap.fitnessProfile,fitnessProfileUpdatedAt:snap.fitnessProfileUpdatedAt,budget:snap.budget,brand:snap.brand,moodEmoji:snap.moodEmoji,periodPinHash:snap.periodPinHash,periodPinSalt:snap.periodPinSalt,deletedPlanIds:snap.deletedPlanIds});
    var left = 2, okAll = true;
    function done(ok){ if(!ok) okAll = false; left--; if(left<=0){ settingsPushing = false; if(okAll){ state.settingsFingerprint = fp; state.settingsSyncedAt = at; saveStateQuiet(); } } }
    writeMetaValue(META_HABITS_KEY, habitsPayload, done);
    writeMetaValue(META_SETTINGS_KEY, settingsPayload, done);
  }
  /* 设置变更后自动上云：比对指纹，只有真的变了才推，避免无谓写入 */
  function scheduleSettingsPush(){
    if (!ONLINE || LOCAL_ONLY) return;
    if (settingsPushTimer) clearTimeout(settingsPushTimer);
    settingsPushTimer = setTimeout(function(){
      settingsPushTimer = null;
      try {
        var fp = settingsFingerprint();
        if (!fp || fp === state.settingsFingerprint) return;
        pushSettingsNow(fp);
      } catch(e){ console.warn('[sync] 设置同步异常', e); }
    }, 1200);
  }
  /* 别的设备执行过清空：本地同步清除，只保留清空之后新建的数据 */
  function applyRemoteClear(clearAt){
    var keepAfter = Number(clearAt)||0;
    state.records = (state.records||[]).filter(function(r){
      return Number(r.createdAt||0) > keepAfter;
    });
    state.mediaItems = (state.mediaItems||[]).filter(function(m){
      return Number(m.createdAt||0) > keepAfter;
    });
    (state.habits||[]).forEach(function(h){
      if (h && h.entries) h.entries = {};
    });
    state.lastClearedAt = keepAfter;
    state.clearedAll = false;
    habitRemoteIndex = {};
  }
  function runMerge(cb){
    var pending = 11, done = 0, changed = false;
    function oneDone(c){ done++; if(c) changed = true; if(done>=pending && cb) cb(changed); }
    dbFetchAll(DB_MONEY, function(rows){ if(rows){ mergeMoney(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_HABIT, function(rows){ if(rows){ mergeHabit(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_PLAN, function(rows){ if(rows){ mergePlan(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_FITNESS, function(rows){ if(rows){ mergeFitness(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_SHOPPING, function(rows){ if(rows){ mergeShopping(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_MEDIA, function(rows){ if(rows){ mergeMedia(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_DIET, function(rows){ if(rows){ mergeDiet(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_STORAGE, function(rows){ if(rows){ mergeStorage(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_MOOD, function(rows){ if(rows){ mergeMood(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_PERIOD, function(rows){ if(rows){ mergePeriod(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_SLEEP, function(rows){ if(rows){ mergeSleep(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_STUDY, function(rows){ if(rows){ mergeStudy(rows); oneDone(true); } else oneDone(false); });
    dbFetchAll(DB_PAYBACK, function(rows){ if(rows){ mergePayback(rows); oneDone(true); } else oneDone(false); });
  }
  function pullAllRemote(cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(false); return; }
    /* v37: 设置类数据（含「计划吃什么」/周计划/预算/外观/习惯定义）随每次同步拉取。
     * 旧版只在 init 拉一次设置——手动点「同步」、解锁后重拉都拿不到最新设置，
     * 导致一端改了「计划吃什么」另一端永远看不到。 */
    applySettingsSync(function(){ pullAllRemoteInner(cb); });
  }
  function pullAllRemoteInner(cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(false); return; }
    if (state.clearedAll) {
      /* 上次清空时线上数据没删干净，先重试删除再合并 */
      clearAllRemoteTables(function(){
        state.clearedAll = false;
        saveState();
        runMerge(cb);
      });
      return;
    }
    readMetaClearAt(function(remoteClearAt){
      var localClearAt = Number(state.lastClearedAt || 0);
      if (remoteClearAt > localClearAt) {
        applyRemoteClear(remoteClearAt);
        saveState();
        if(cb) cb(true);
        return;
      }
      /* v34 经期专用清空：若云端标记比本地更新的经期清空时刻新 → 先清本地脏经期再合并，防并集复活 */
      readPeriodClearMarker(function(remotePeriodClear){
        var localPeriodClear = Number(state.periodClearApplied || 0);
        if (remotePeriodClear > localPeriodClear) {
          state.periodClearApplied = remotePeriodClear;
          var keepP = Number(remotePeriodClear)||0;
          var beforeP = state.records.length;
          state.records = (state.records||[]).filter(function(r){
            return r.type!=='period' || Number(r.createdAt||0) > keepP;
          });
          if (state.records.length !== beforeP) state._periodForm = null;
          saveState();
        }
        runMerge(cb);
      });
    });
  }

  var habitSyncTried = {};
  /* ===== 未同步数据补传：本地 ──► 远程 =====
   * 以前只有 pullAllRemote 做「远程 → 本地」，缺了反方向。一条记录若在新增时
   * 写入失败（网络抖动、或当时页面正处于离线），remoteId 就一直为空，且永远
   * 没有第二次机会同步 —— 这正是"web 端存了、移动端看不到"的直接原因。
   * 现在每次 init 拉完远程后，把所有 remoteId 为空的自有数据重推一次。 */
  function syncPendingRecords(cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(0); return; }
    var now = Date.now();
    /* 退避保护：刚尝试过（60 秒内）的不再重复推，避免失败时反复刷新导致远程数据翻倍 */
    var pending = (state.records||[]).filter(function(r){ return r && !r.sample && !r.remoteId && (now - Number(r.syncTriedAt||0) > 60000); });
    var mediaPending = (state.mediaItems||[]).filter(function(m){ return m && !m.sample && !m.remoteId && (now - Number(m.syncTriedAt||0) > 60000); });
    /* 习惯打卡：mergeHabit 已按远程数据重建 habitRemoteIndex，
     * 索引里查不到的「习惯名 + 日期」就是远程缺失的，需要补传 */
    var habitPending = [];
    (state.habits||[]).forEach(function(h){
      if(!h || !h.entries || h.sample) return;
      Object.keys(h.entries).forEach(function(d){
        var val = Number(h.entries[d]||0);
        if(!val) return;
        if(!(((habitRemoteIndex||{})[h.name]||{})[d]) && (now - Number(habitSyncTried[h.name+'|'+d]||0) > 60000)) habitPending.push({habit:h,date:d});
      });
    });
    var total = pending.length + mediaPending.length + habitPending.length;
    if (!total) { if(cb) cb(0); return; }
    pending.forEach(function(rec){
      rec.syncTriedAt = now;
      try{
        if(rec.type==='money')pushMoney(rec);
        else if(rec.type==='planner')pushPlan(rec);
        else if(rec.type==='fitness')pushFitness(rec);
        else if(rec.type==='home')pushShopping(rec);
        else if(rec.type==='diet')pushDiet(rec);
        else if(rec.type==='storage')pushStorage(rec);
        else if(rec.type==='mood')pushMood(rec);
        else if(rec.type==='period')pushPeriod(rec);
        else if(rec.type==='study')pushStudy(rec);else if(rec.type==='payback')pushPayback(rec);
      }catch(e){ console.warn('[sync] push 异常', e); }
    });
    mediaPending.forEach(function(item){
      item.syncTriedAt = now;
      try{ pushMedia(item); }catch(e){ console.warn('[sync] pushMedia 异常', e); }
    });
    habitPending.forEach(function(p){
      habitSyncTried[p.habit.name+'|'+p.date] = now;
      try{ pushHabit(p.habit, p.date); }catch(e){ console.warn('[sync] pushHabit 异常', e); }
    });
    if(cb) cb(total);
  }

  /* v40: 删除可靠上云——本地删除记录后，若云端删除请求当时未成功（网络抖动/页面在请求完成前被关闭），
   * remoteId 会记入 pendingDeletes 队列，重启或下次同步时重试 db.deleteRecord，直到云端真正删除，
   * 避免「删了又从云端拉回」（如待买"燕麦奶"删除后复活）。 */
  function enqueuePendingDelete(dbId, rid){
    if(!dbId || !rid) return;
    state.pendingDeletes = state.pendingDeletes || [];
    if(!state.pendingDeletes.some(function(d){ return d.db===dbId && d.rid===rid; })){
      state.pendingDeletes.push({ db: dbId, rid: rid, triedAt: 0 });
    }
  }
  function syncPendingDeletes(cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(0); return; }
    var list = (state.pendingDeletes||[]).filter(function(d){ return d && d.rid; });
    var now = Date.now();
    var pending = list.filter(function(d){ return now - Number(d.triedAt||0) > 60000; });
    if(!pending.length){ if(cb) cb(0); return; }
    var remaining = pending.length, removed = 0, failed = [];
    pending.forEach(function(d){
      d.triedAt = now;
      try {
        db.deleteRecord({ databaseId: d.db, recordId: d.rid })
          .then(function(){ removed++; })
          .catch(function(){ failed.push(d); })
          .then(function(){ if(--remaining<=0) finish(); });
      } catch(e){ failed.push(d); if(--remaining<=0) finish(); }
    });
    function finish(){
      var failedKeys = {}; failed.forEach(function(d){ failedKeys[d.db+'|'+d.rid] = true; });
      state.pendingDeletes = (state.pendingDeletes||[]).filter(function(d){ return !failedKeys[d.db+'|'+d.rid]; });
      saveState(); if(cb) cb(removed);
    }
  }

  /* 未同步判断：以「清空时间戳」为界，保留清空之后新建的本地数据 */
  function isKeptLocal(item){
    /* 保留"本地新增还没同步上远程"的记录（!remoteId）。
     * 跨设备清空逻辑由 applyRemoteClear（init 时按 lastClearedAt 时间戳过滤）独立处理，
     * 不在这里重复判断。否则 lastClearedAt=0 时 createdAt>0 永远为 true，会把所有已同步记录
     * 重复 concat，导致数据每刷新一次翻倍。 */
    return !item.sample && !item.remoteId;
  }

  function mergeMoney(rows){
    if(!rows) return;
    var remoteRecords = rows.map(function(r){
      var d = r["日期"] ? String(r["日期"]).slice(0,10) : isoDate();
      var cat = r["分类"] || "其他";
      var amt = Number(r["金额"]) || 0;
      var note = r["备注"] || "";
      var isIncome = note.indexOf("收入：") === 0;
      return {id:r._id||uid(),type:'money',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,data:{flow:isIncome?'income':'expense',amount:amt,category:cat,note:isIncome?note.slice(3):note}};
    });
    var _unsyncedMoney = state.records.filter(function(r){return r.type==='money' && isKeptLocal(r);}); state.records = state.records.filter(function(r){return r.type!=='money';}).concat(remoteRecords).concat(_unsyncedMoney);
  }

  var habitRemoteIndex = {};
  function mergeHabit(rows){
    if(!rows) return;
    var remoteEntries = {};
    rows.forEach(function(r){
      var d = r["日期"] ? String(r["日期"]).slice(0,10) : isoDate();
      var hname = r["习惯"] || "";
      var val = Number(r["数值"]) || 0;
      if(!remoteEntries[hname]) remoteEntries[hname] = {};
      remoteEntries[hname][d] = val;
      if(!habitRemoteIndex[hname]) habitRemoteIndex[hname] = {};
      if(r._id) habitRemoteIndex[hname][d] = r._id;
    });
    state.habits.forEach(function(h){
      var remote = remoteEntries[h.name];
      if(remote){
        var merged = Object.assign({}, h.entries || {}, remote);
        h.entries = merged;
        h.sample = false;
      }
    });
  }

  function mergePlan(rows){
    /* v33: union-merge（同 mergePeriod/mergeMedia 红线）。
     * 云端 planner 列只有 日期/内容/类型/状态，不落 time/priority/note/remind/象限。
     * 若无条件用云端重建，会在每次同步后把这些本地字段全部冲掉。因此：能本地并集就并集；
     * 云端同 remoteId 只更新 内容/清单/完成状态/日期，其余本地字段一律保留。 */
    if(!rows) return;
    var localPlan = state.records.filter(function(r){return r.type==='planner';});
    var localByRemoteId = {}; localPlan.forEach(function(r){ if(r.remoteId) localByRemoteId[r.remoteId]=r; });
    var _unsyncedPlan = localPlan.filter(function(r){return isKeptLocal(r);});
    var _keyed={}; _unsyncedPlan.forEach(function(r){ if(r.remoteId) _keyed['r_'+r.remoteId]=r; else _keyed['l_'+r.id]=r; });
    var merged=[];
    var seen={};
    rows.forEach(function(r){
      var rid=r._id||'';
      var local = rid ? localByRemoteId[rid] : null;
      var d = r["日期"] ? String(r["日期"]).slice(0,10) : (local?local.date:isoDate());
      var title = (r["内容"]!=null&&r["内容"]!=='') ? String(r["内容"]) : (local?local.data.title:'');
      var list = (r["类型"]!=null&&r["类型"]!=='') ? String(r["类型"]) : (local?local.data.list:'生活');
      var status = r["状态"] || '待完成';
      var oldData = local?local.data:{};
      var rec={id:rid||uid(),type:'planner',date:d,createdAt:local?Number(local.createdAt||Date.now()):Date.now(),sample:false,remoteId:rid,data:{
        title:title, list:list,
        done:(status==='已完成'),
        time:oldData.time||'',            /* 云端不落 → 保留本地 */
        priority:oldData.priority||'normal',
        note:oldData.note||'',
        remind:oldData.remind||false,
        quadrant:(r["象限"]!=null && r["象限"]!=='') ? r["象限"] : (oldData.quadrant||'')   /* v33 四象限：云端象限优先(与done同先例)，本地兑底，保留未同步/旧本地值 */
      }};
      if(rid) seen['r_'+rid]=true;
      merged.push(rec);
    });
    merged = merged.concat(_unsyncedPlan);
    state.records = state.records.filter(function(r){return r.type!=='planner';}).concat(merged);
  }

  /* v56b: 一次性回填——把本地已分类(有 quadrant)但云端缺 象限 的 planner 记录推到云端。
   * 历史原因：象限 列曾为 select 且 merge 从未回读，已分类记录在鸽蒙端全落「重要紧急」。
   * 现已改 text 列 + merge 回读，需把 web 端现有本地象限 补写一次。每设备仅跑一次(localStorage 守卫)，ONLINE 未就绪不置位以免漏推。 */
  function backfillPlannerQuadrant(){
    try{ if(localStorage.getItem('richangji_planner_quad_backfilled')==='1') return; }catch(e){}
    if(!ONLINE || LOCAL_ONLY) return;
    var recs = state.records.filter(function(r){ return r.type==='planner' && r.remoteId && r.data && r.data.quadrant; });
    if(!recs.length){ try{ localStorage.setItem('richangji_planner_quad_backfilled','1'); }catch(e){} return; }
    var i=0;
    (function step(){
      if(i>=recs.length){ try{ localStorage.setItem('richangji_planner_quad_backfilled','1'); }catch(e){} return; }
      var r=recs[i++];
      updateRemotePlan(r);
      setTimeout(step, 250);
    })();
  }

  function mergeFitness(rows){
    if(!rows) return;
    var remoteRecords = rows.map(function(r){
      var d = r["日期"] ? String(r["日期"]).slice(0,10) : isoDate();
      return {id:r._id||uid(),type:'fitness',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,data:{weight:Number(r["体重"])||0,bodyFat:r["体脂率"]?Number(r["体脂率"]):null,calories:0,duration:0,note:r["备注"]||"",bodyFatKg:r["体脂肪kg"]?Number(r["体脂肪kg"]):null,skeletalMuscle:r["骨骼肌kg"]?Number(r["骨骼肌kg"]):null,bodyWater:r["身体水分kg"]?Number(r["身体水分kg"]):null,bmr:r["基础代谢kcal"]?Number(r["基础代谢kcal"]):null,waistHipRatio:r["腰臀比"]?Number(r["腰臀比"]):null,bodyAge:r["身体年龄"]?Number(r["身体年龄"]):null}};
    });
    var _unsyncedFit = state.records.filter(function(r){return r.type==='fitness' && isKeptLocal(r);}); state.records = state.records.filter(function(r){return r.type!=='fitness';}).concat(remoteRecords).concat(_unsyncedFit);
  }

  function mergeShopping(rows){
    /* v34：云端待买表无「日期」列 → 不再无条件把每条写成 today（旧 bug 每次同步把清单全挤到今天）。
     * 按 remoteId 并集合并：本地已有 → 保留本地真实 date/createdAt；仅云端全新(本地无)的行才 fallback today。 */
    if(!rows) return;
    var localHome = state.records.filter(function(r){return r.type==='home';});
    var localByRid = {}; localHome.forEach(function(r){ if(r.remoteId) localByRid[r.remoteId]=r; });
    var merged={}; var seen={};
    rows.forEach(function(r){
      var rid=r._id||'', loc=rid?localByRid[rid]:null;
      var d = (loc && /^\d{4}-\d{2}-\d{2}$/.test(loc.date||'')) ? loc.date : isoDate();
      var created = (loc && Number(loc.createdAt)) ? Number(loc.createdAt) : Date.now();
      var rec={id:rid||uid(),type:'home',date:d,createdAt:created,sample:false,remoteId:rid,data:{name:r["物品名称"]||"",quantity:String(r["数量"]||""),category:"日用品",price:Number(r["预估价格"])||0,priority:"normal",note:r["备注"]||"",bought:(r["是否已买"]==="已买")}};
      merged['r_'+(rid||rec.id)]=rec; if(rid) seen[rid]=true;
    });
    localHome.forEach(function(r){
      if(!r.remoteId){ merged['l_'+r.id]=r; }        /* 本地新增未上传 */
      /* v37 墓碑语义：rows 非空 = 本次全量拉取成功；有 remoteId 却不在结果里，
       * 说明已在其他设备删除 → 本地同步移除。旧规则「保留本地」会让跨设备删除永不生效
       * （如待买「笔记本电脑键盘膜」web 端删了移动端还在）。 */
    });
    state.records = state.records.filter(function(x){return x.type!=='home';}).concat(Object.values(merged));
  }

  function mergeMedia(rows){
    /* v33: union-merge，保护本地封面/日期/创建序。
     * 根因修复（书影音在档案里反复挤到"当天"）：旧 pushMedia 不写"日期"列，mergeMedia 又把云端每条
     * 强制 date=isoDate()+createdAt=now → 每次同步后所有书影音都变成"今天"。
     * 现在：①云端带"日期"则读回；②云端无日期（历史脏行）→ 回退保留本地同 remoteId 的真实 date/cover/createdAt；
     * ③本地无 remoteId（未上传）→ 保留本地。绝不无条件用云端覆盖本地已存在字段（用户红线第 1/3 条）。 */
    /* v43: 空数组(未登录瞬时态/uid 不匹配导致按 userId 过滤后为空/云端确实清空)一律保留本地,
     * 杜绝"空结果覆盖本地"导致书影音丢失。media 删除走单条 pendingDeletes,不依赖整表清空语义。 */
    if(!rows || rows.length===0) return;
    var typeMap = {'书籍':'书','电影':'电影','电视剧':'剧','动漫':'番','综艺':'综艺','有声书':'有声书','AI漫剧':'AI漫剧'};
    var statusMap = {'想看':'想看','在看':'在看','看过':'看完'};
    var _existingMedia = state.mediaItems || [];
    var localByRemoteId = {}; _existingMedia.forEach(function(m){ if(m.remoteId) localByRemoteId[m.remoteId]=m; });
    var _unsyncedMedia = _existingMedia.filter(function(m){ return isKeptLocal(m); });
    var merged = [];
    var seen = {};
    var _needDateBackfill = [];   /* v44：云端缺日期的记录，待回写真实日期 */
    rows.forEach(function(r){
      var rid = r._id || '';
      var local = rid ? localByRemoteId[rid] : null;
      var type = typeMap[r["类型"]] || (local?local.type:'电影');
      var status = statusMap[r["状态"]] || (local?local.status:'想看');
      var rawDate = r["日期"] ? String(r["日期"]).slice(0,10) : '';
      /* v44：云端缺日期时，用记录的创建时间（_created_at）回填真实日期；再不行才 fallback today */
      var createdAtDate = (function(ca){ ca = ca||r._created_at||r.created_at||r.createdTime; return ca?String(ca).slice(0,10):''; })();
      var date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate
               : (local && /^\d{4}-\d{2}-\d{2}$/.test(local.date||'')) ? local.date
               : /^\d{4}-\d{2}-\d{2}$/.test(createdAtDate) ? createdAtDate
               : isoDate();
      var _dateFromCreated = !/^\d{4}-\d{2}-\d{2}$/.test(rawDate) && /^\d{4}-\d{2}-\d{2}$/.test(createdAtDate);
      var item = {
        id: rid || uid(),
        name: (r["标题"]!=null&&r["标题"]!=='') ? String(r["标题"]) : (local?local.name:''),
        type: type, status: status,
        rating: (r["评分"]!=null&&r["评分"]!=='') ? Number(r["评分"])||0 : (local?Number(local.rating||0):0),
        review: (r["短评"]!=null&&r["短评"]!=='') ? String(r["短评"]) : (local?local.review||'':''),
        date: date,
        cover: (local && local.cover) ? local.cover : (_cloudCoverPlain(r["封面链接"]) || ''),   /* v59: 本地优先；无本地封面时用云端封面链接 */
        sample: false,
        remoteId: rid,
        createdAt: (local && Number(local.createdAt)) ? Number(local.createdAt) : Number(r["_created_at"]||Date.now())
      };
      if(rid) seen['m_'+rid]=true;
      if(_dateFromCreated) _needDateBackfill.push(item);
      merged.push(item);
    });
    /* 云端独有 + 保留本地无 remoteId 的未上传项 */
    merged = merged.concat(_unsyncedMedia);
    state.mediaItems = merged;
    /* v44：自修复——云端缺日期的记录用创建时间回填并写回（幂等；列不存在则静默跳过，不影响显示）。
       一次性尝试：写成功后下次同步云端已有日期，_dateFromCreated 不再成立，不会重复刷写。 */
    if(!state.settings._mediaDateBackfilled && ONLINE && !LOCAL_ONLY){
      _needDateBackfill.forEach(function(it){ if(it && it.remoteId) updateRemoteMedia(it); });
      state.settings._mediaDateBackfilled = true; saveStateQuiet();
    }
  }

  function mergeDiet(rows){
    if(!rows) return;
    var remoteRecords = rows.map(function(r){
      var d = r["日期"] ? String(r["日期"]).slice(0,10) : isoDate();
      var mealMap = {'早餐':'早餐','午餐':'午餐','晚餐':'晚餐','加餐':'加餐'};
      return {id:r._id||uid(),type:'diet',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,data:{meal:mealMap[r["餐次"]]||'早餐',food:r["食物"]||"",portion:r["份量"]||"",calories:Number(r["热量"])||0,note:r["备注"]||""}};
    });
    var _unsyncedDiet = state.records.filter(function(r){return r.type==='diet' && isKeptLocal(r);}); state.records = state.records.filter(function(r){return r.type!=='diet';}).concat(remoteRecords).concat(_unsyncedDiet);
  }

  function mergeStorage(rows){
    /* v34：云端物品表无「日期」列 → 不再无条件写 today（旧 bug 每次同步把库存全挤到今天）。
     * 按 remoteId 并集合并：本地已有 → 保留本地真实 date/createdAt；仅云端全新(本地无)行才 fallback today。 */
    if(!rows) return;
    var catMap = {'食品':'食品','日用':'日用','个护':'个护','清洁':'清洁','其他':'其他'};
    var localSto = state.records.filter(function(r){return r.type==='storage';});
    var localByRid = {}; localSto.forEach(function(r){ if(r.remoteId) localByRid[r.remoteId]=r; });
    var merged={}; var seen={};
    rows.forEach(function(r){
      var rid=r._id||'', loc=rid?localByRid[rid]:null;
      var d = (loc && /^\d{4}-\d{2}-\d{2}$/.test(loc.date||'')) ? loc.date : isoDate();
      var created = (loc && Number(loc.createdAt)) ? Number(loc.createdAt) : Date.now();
      var exp = r["过期日期"] ? String(r["过期日期"]).slice(0,10) : '';
      var rec={id:rid||uid(),type:'storage',date:d,createdAt:created,sample:false,remoteId:rid,data:{name:r["物品名称"]||"",category:catMap[r["分类"]]||'其他',quantity:Number(r["数量"])||0,unit:r["单位"]||"",location:r["存放位置"]||"",expiry:exp,note:r["备注"]||"",purchaseAmount:r["购买金额"]?Number(r["购买金额"]):null,purchaseDate:r["购买时间"]?String(r["购买时间"]).slice(0,10):""}};
      merged['r_'+(rid||rec.id)]=rec; if(rid) seen[rid]=true;
    });
    localSto.forEach(function(r){
      if(!r.remoteId){ merged['l_'+r.id]=r; }
      /* v37 墓碑语义：与 mergeShopping 一致，云端拉取成功却无此 remoteId = 已在别处删除 → 本地移除 */
    });
    state.records = state.records.filter(function(x){return x.type!=='storage';}).concat(Object.values(merged));
  }

  function mergeMood(rows){
    if(!rows) return;
    var tagMap = {'开心':'开心','平静':'平静','疲惫':'疲惫','焦虑':'焦虑','低落':'低落'};
    var remoteRecords = rows.map(function(r){
      var d = r["日期"] ? String(r["日期"]).slice(0,10) : isoDate();
      return {id:r._id||uid(),type:'mood',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,data:{score:Number(r["心情值"])||3,tag:tagMap[r["心情标签"]]||'平静',feeling:r["当日感受"]||"",emoji:r["图标"]||""}};
    });
    var _unsyncedMood = state.records.filter(function(r){return r.type==='mood' && isKeptLocal(r);}); state.records = state.records.filter(function(r){return r.type!=='mood';}).concat(remoteRecords).concat(_unsyncedMood);
  }

  function mergeSleep(rows){
    if(!rows || rows.length===0) return;   /* 空结果保留本地，绝不覆盖清空 */
    var remote = rows.map(function(r){
      var d = r["日期"] ? String(r["日期"]).slice(0,10) : isoDate();
      return {id:r._id||uid(),type:'sleep',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,
        data:{bedtime:String(r["入睡时间"]||""),wake:String(r["醒来时间"]||""),
              deep:Number(r["深睡"])||0,light:Number(r["浅睡"])||0,rem:Number(r["REM"])||0,
              awake:Number(r["清醒时长"])||0,nap:Number(r["零星小睡"])||0,note:String(r["备注"]||"")}};
    });
    var _unsynced = state.records.filter(function(r){return r.type==='sleep' && isKeptLocal(r);});
    state.records = state.records.filter(function(r){return r.type!=='sleep';}).concat(remote).concat(_unsynced);
  }
  function mergeStudy(rows){
    if(!rows || rows.length===0) return;   /* 空结果保留本地，绝不覆盖清空 */
    var remote = rows.map(function(r){
      var d = r["日期"] ? String(r["日期"]).slice(0,10) : isoDate();
      return {id:r._id||uid(),type:'study',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,
        data:{subject:String(r["科目"]||""),minutes:Number(r["时长(分钟)"])||0,category:String(r["类型"]||""),note:String(r["备注"]||"")}};
    });
    var _unsynced = state.records.filter(function(r){return r.type==='study' && isKeptLocal(r);});
    state.records = state.records.filter(function(r){return r.type!=='study';}).concat(remote).concat(_unsynced);
  }

  function mergePayback(rows){
    if(!rows || rows.length===0) return;   /* 空结果保留本地，绝不覆盖清空 */
    var remote = rows.map(function(r){
      var d = r["购买日期"] ? String(r["购买日期"]).slice(0,10) : isoDate();
      return {id:r._id||uid(),type:'payback',date:d,createdAt:Date.now(),sample:false,remoteId:r._id,
        data:{name:String(r["物品名称"]||""),category:String(r["分类"]||"其他"),price:Number(r["购买价格"])||0,
              mode:String(r["均价方式"]||"time")==='count'?'count':'time',uses:Number(r["使用次数"])||0}};
    });
    var _unsynced = state.records.filter(function(r){return r.type==='payback' && isKeptLocal(r);});
    state.records = state.records.filter(function(r){return r.type!=='payback';}).concat(remote).concat(_unsynced);
  }

  function pushMoney(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = { text: rec.date };
    props["分类"] = { text: rec.data.category || "" };
    props["金额"] = { number: rec.data.amount || 0 };
    props["备注"] = { text: (rec.data.flow==='income'?'收入：':'') + (rec.data.note||"") };
    dbAdd(DB_MONEY, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }

  function pushHabit(h, date){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = { text: date };
    props["习惯"] = { text: h.name || "" };
    props["数值"] = { number: Number(h.entries[date]||0) };
    props["备注"] = { text: h.unit || "" };
    var hname = h.name || "";
    var existingId = (habitRemoteIndex[hname] || {})[date];
    if (existingId) {
      dbUpdate(DB_HABIT, existingId, props);
    } else {
      dbAdd(DB_HABIT, props, function(rid){
        if (rid) {
          if (!habitRemoteIndex[hname]) habitRemoteIndex[hname] = {};
          habitRemoteIndex[hname][date] = rid;
        }
      });
    }
  }

  function pushPlan(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = { text: rec.date };
    props["内容"] = { text: rec.data.title || "" };
    props["类型"] = { text: rec.data.list || "" };
    props["状态"] = { text: rec.data.done ? "已完成" : "待完成" };
    if(rec.data.quadrant) props["象限"] = { text: rec.data.quadrant };  /* v33 四象限 */
    dbAdd(DB_PLAN, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }

  function pushFitness(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = { text: rec.date };
    props["体重"] = { number: rec.data.weight || 0 };
    props["体脂率"] = { number: rec.data.bodyFat || 0 };
    props["体脂肪kg"] = { number: rec.data.bodyFatKg || 0 };
    props["骨骼肌kg"] = { number: rec.data.skeletalMuscle || 0 };
    props["身体水分kg"] = { number: rec.data.bodyWater || 0 };
    props["基础代谢kcal"] = { number: rec.data.bmr || 0 };
    props["腰臀比"] = { number: rec.data.waistHipRatio || 0 };
    props["身体年龄"] = { number: rec.data.bodyAge || 0 };
    props["备注"] = { text: rec.data.note || "" };
    dbAdd(DB_FITNESS, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }

  function pushShopping(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var qty = parseInt(rec.data.quantity) || 0;
    var props = {};
    props["物品名称"] = { text: rec.data.name || "" };
    props["数量"] = { number: qty };
    props["预估价格"] = { number: rec.data.price || 0 };
    props["是否已买"] = { text: rec.data.bought ? "已买" : "待买" };
    props["备注"] = { text: rec.data.note || "" };
    dbAdd(DB_SHOPPING, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }

  function pushMedia(item){
    if (!ONLINE || LOCAL_ONLY) return;
    var typeMap = {'电影':'电影','剧':'电视剧','书':'书籍','番':'动漫','综艺':'综艺','有声书':'有声书','AI漫剧':'AI漫剧'};
    var statusMap = {'想看':'想看','在看':'在看','看完':'看过','弃了':'在看'};
    var props = {};
    props["标题"] = { text: item.name || "" };
    props["类型"] = { text: typeMap[item.type] || "电影" };
    props["状态"] = { text: statusMap[item.status] || "想看" };
    props["评分"] = { number: item.rating || 0 };
    props["短评"] = { text: item.review || "" };
    if(item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) props["日期"] = { date: item.date };  /* v33: 持久化日期，档案按真实日期归位 */
    if(_isHttpUrl(item.cover)) props["封面链接"] = { text: String(item.cover).trim() };  /* v59: 封面链接同步，本地上传图不同步 */
    dbAdd(DB_MEDIA, props, function(rid){ if(rid){ item.remoteId = rid; saveStateQuiet(); } });
  }

  function pushDiet(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = { date: rec.date };
    props["餐次"] = { select: rec.data.meal || "早餐" };
    props["食物"] = { text: rec.data.food || "" };
    props["份量"] = { text: rec.data.portion || "" };
    props["热量"] = { number: rec.data.calories || 0 };
    props["备注"] = { text: rec.data.note || "" };
    dbAdd(DB_DIET, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }

  function pushStorage(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["物品名称"] = { text: rec.data.name || "" };
    props["分类"] = { select: rec.data.category || "其他" };
    props["数量"] = { number: rec.data.quantity || 0 };
    props["单位"] = { text: rec.data.unit || "" };
    props["存放位置"] = { text: rec.data.location || "" };
    if(rec.data.expiry) props["过期日期"] = { date: rec.data.expiry };
    if(rec.data.purchaseAmount) props["购买金额"] = { number: rec.data.purchaseAmount };
    if(rec.data.purchaseDate) props["购买时间"] = { date: rec.data.purchaseDate };
    props["备注"] = { text: rec.data.note || "" };
    dbAdd(DB_STORAGE, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }

  function pushSleep(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = { date: rec.date };
    props["入睡时间"] = { text: String(rec.data.bedtime || "") };
    props["醒来时间"] = { text: String(rec.data.wake || "") };
    props["深睡"] = { number: Number(rec.data.deep)||0 };
    props["浅睡"] = { number: Number(rec.data.light)||0 };
    props["REM"] = { number: Number(rec.data.rem)||0 };
    props["清醒时长"] = { number: Number(rec.data.awake)||0 };
    props["零星小睡"] = { number: Number(rec.data.nap)||0 };
    props["备注"] = { text: String(rec.data.note || "") };
    dbAdd(DB_SLEEP, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }
  function updateRemoteSleep(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["日期"] = { date: rec.date };
    props["入睡时间"] = { text: String(rec.data.bedtime || "") };
    props["醒来时间"] = { text: String(rec.data.wake || "") };
    props["深睡"] = { number: Number(rec.data.deep)||0 };
    props["浅睡"] = { number: Number(rec.data.light)||0 };
    props["REM"] = { number: Number(rec.data.rem)||0 };
    props["清醒时长"] = { number: Number(rec.data.awake)||0 };
    props["零星小睡"] = { number: Number(rec.data.nap)||0 };
    props["备注"] = { text: String(rec.data.note || "") };
    dbUpdate(DB_SLEEP, rec.remoteId, props);
  }
  function deleteRemoteSleep(rid){ if(rid) dbDelete(DB_SLEEP, rid); }
  function pushStudy(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = { date: rec.date };
    props["科目"] = { text: String(rec.data.subject || "") };
    props["时长(分钟)"] = { number: Number(rec.data.minutes)||0 };
    props["类型"] = { text: String(rec.data.category || "") };
    props["备注"] = { text: String(rec.data.note || "") };
    dbAdd(DB_STUDY, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }
  function updateRemoteStudy(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["日期"] = { date: rec.date };
    props["科目"] = { text: String(rec.data.subject || "") };
    props["时长(分钟)"] = { number: Number(rec.data.minutes)||0 };
    props["类型"] = { text: String(rec.data.category || "") };
    props["备注"] = { text: String(rec.data.note || "") };
    dbUpdate(DB_STUDY, rec.remoteId, props);
  }
  function deleteRemoteStudy(rid){ if(rid) dbDelete(DB_STUDY, rid); }
  function pushPayback(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["购买日期"] = { date: rec.date };
    props["物品名称"] = { text: String(rec.data.name || "") };
    props["分类"] = { text: String(rec.data.category || "其他") };
    props["购买价格"] = { number: Number(rec.data.price)||0 };
    props["均价方式"] = { text: rec.data.mode==='count' ? 'count' : 'time' };
    props["使用次数"] = { number: Number(rec.data.uses)||0 };
    dbAdd(DB_PAYBACK, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }
  function updateRemotePayback(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["购买日期"] = { date: rec.date };
    props["物品名称"] = { text: String(rec.data.name || "") };
    props["分类"] = { text: String(rec.data.category || "其他") };
    props["购买价格"] = { number: Number(rec.data.price)||0 };
    props["均价方式"] = { text: rec.data.mode==='count' ? 'count' : 'time' };
    props["使用次数"] = { number: Number(rec.data.uses)||0 };
    dbUpdate(DB_PAYBACK, rec.remoteId, props);
  }
  function deleteRemotePayback(rid){ if(rid) dbDelete(DB_PAYBACK, rid); }
  function updateRemoteMoney(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["分类"] = { text: rec.data.category || "" };
    props["金额"] = { number: rec.data.amount || 0 };
    props["备注"] = { text: (rec.data.flow==='income'?'收入：':'') + (rec.data.note||"") };
    dbUpdate(DB_MONEY, rec.remoteId, props);
  }
  function deleteRemoteMoney(rid){ if(rid) dbDelete(DB_MONEY, rid); }

  function updateRemotePlan(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["状态"] = { text: rec.data.done ? "已完成" : "待完成" };
    if(rec.data.quadrant) props["象限"] = { text: rec.data.quadrant };  /* v33 四象限 */
    dbUpdate(DB_PLAN, rec.remoteId, props);
  }
  function deleteRemotePlan(rid){ if(rid) dbDelete(DB_PLAN, rid); }

  function updateRemoteFitness(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["体重"] = { number: rec.data.weight || 0 };
    props["体脂率"] = { number: rec.data.bodyFat || 0 };
    props["体脂肪kg"] = { number: rec.data.bodyFatKg || 0 };
    props["骨骼肌kg"] = { number: rec.data.skeletalMuscle || 0 };
    props["身体水分kg"] = { number: rec.data.bodyWater || 0 };
    props["基础代谢kcal"] = { number: rec.data.bmr || 0 };
    props["腰臀比"] = { number: rec.data.waistHipRatio || 0 };
    props["身体年龄"] = { number: rec.data.bodyAge || 0 };
    props["备注"] = { text: rec.data.note || "" };
    dbUpdate(DB_FITNESS, rec.remoteId, props);
  }
  function deleteRemoteFitness(rid){ if(rid) dbDelete(DB_FITNESS, rid); }

  function updateRemoteShopping(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["是否已买"] = { text: rec.data.bought ? "已买" : "待买" };
    dbUpdate(DB_SHOPPING, rec.remoteId, props);
  }
  function deleteRemoteShopping(rid){ if(rid) dbDelete(DB_SHOPPING, rid); }

  function updateRemoteMedia(item){
    if (!ONLINE || LOCAL_ONLY || !item.remoteId) return;
    var typeMap = {'电影':'电影','剧':'电视剧','书':'书籍','番':'动漫','综艺':'综艺','有声书':'有声书','AI漫剧':'AI漫剧'};
    var statusMap = {'想看':'想看','在看':'在看','看完':'看过','弃了':'在看'};
    var props = {};
    /* v47: 编辑保存写回 标题/类型，修复「改类型后再进编辑失效」（此前漏写类型→云端旧值覆盖本地） */
    props["标题"] = { text: item.name || "" };
    props["类型"] = { text: typeMap[item.type] || "电影" };
    props["状态"] = { text: statusMap[item.status] || "想看" };
    props["评分"] = { number: item.rating || 0 };
    props["短评"] = { text: item.review || "" };
    if(item.date && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) props["日期"] = { date: item.date };  /* v33: 老记录补日期 */
    props["封面链接"] = { text: _isHttpUrl(item.cover) ? String(item.cover).trim() : "" };  /* v59: 封面链接同步（清空则写空串） */
    dbUpdate(DB_MEDIA, item.remoteId, props);
  }
  function _cloudCoverPlain(v){
    if(v==null) return '';
    if(typeof v==='string'){ v=v.trim(); return /^https?:\/\//i.test(v)?v:''; }
    if(typeof v==='object'){ return _cloudCoverPlain(v.text!=null?v.text:(v.value!=null?v.value:'')); }
    return '';
  }
  function _drm(r){ return r||{}; }
  function deleteRemoteMedia(rid){ if(rid) dbDelete(DB_MEDIA, rid); }

  function updateRemoteDiet(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["餐次"] = { select: rec.data.meal || "早餐" };
    props["食物"] = { text: rec.data.food || "" };
    props["份量"] = { text: rec.data.portion || "" };
    props["热量"] = { number: rec.data.calories || 0 };
    props["备注"] = { text: rec.data.note || "" };
    dbUpdate(DB_DIET, rec.remoteId, props);
  }
  function deleteRemoteDiet(rid){ if(rid) dbDelete(DB_DIET, rid); }

  function updateRemoteStorage(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["数量"] = { number: rec.data.quantity || 0 };
    props["存放位置"] = { text: rec.data.location || "" };
    props["购买金额"] = { number: rec.data.purchaseAmount || 0 };
    props["购买时间"] = { date: rec.data.purchaseDate || "" };
    props["备注"] = { text: rec.data.note || "" };
    dbUpdate(DB_STORAGE, rec.remoteId, props);
  }
  function deleteRemoteStorage(rid){ if(rid) dbDelete(DB_STORAGE, rid); }

    function pushPeriod(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = rec.date ? { date: rec.date } : (isoDate?{date:isoDate()}:{});  /* v33: 日期列是 date 类型，用 date envelope（此前 text 导致云端日期写不进/读不回 → 经期预测错月） */
    props["是否经期"] = { text: rec.data.isPeriodDay==='Y'?'Y':'' };
    props["是否经期首日"] = { text: rec.data.isStartDay==='Y'?'Y':'' };
    props["是否经期末日"] = { text: rec.data.isEndDay==='Y'?'Y':'' };
    props["分泌物"] = { text: rec.data.discharge || '' };
    props["感受"] = { text: JSON.stringify(rec.data.symptoms||[]) };
    props["心情值"] = { number: Number(rec.data.moodScore||0) };
    props["心情标签"] = { text: rec.data.moodLabel || '' };
    props["卫生巾数量"] = { number: Number(rec.data.pad||0) };
    props["安睡裤数量"] = { number: Number(rec.data.night||0) };
    props["出血量"] = { number: Number(rec.data.bleeding||0) };
    props["备注"] = { text: rec.data.note || '' };
    /* v30 修复：upsert 而不是 insert。v27 同日合并期间 existing record 二次 push 之前是 dbAdd，
     * 会在云端创建第二条同 date 记录 → 云端翻倍 → merge 时补漏到本地也翻倍（用户红线第 3 条的反面）。
     * 现在有 remoteId 就 dbUpdate（upsert），无 remoteId 才 dbAdd（首次创建）。 */
    if(rec.remoteId){
      dbUpdate(DB_PERIOD, rec.remoteId, props);
    } else {
      dbAdd(DB_PERIOD, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
    }
  }
  function deleteRemotePeriod(rid){ if(rid) dbDelete(DB_PERIOD, rid); }
  function mergePeriod(rows){
    if(!rows) return;
    /* v33：先收集本地 period（按 remoteId），供云端行日期缺失时回退真实本地日期 —— 修复云端日期列
     * 未回读导致"所有经期记录都塌到今天 → 预测错月"的问题。绝不无条件用云端空日期覆盖本地真实日期。 */
    var _localP0 = state.records.filter(function(r){return r.type==='period';});
    var _localByRid = {}; _localP0.forEach(function(r){ if(r.remoteId) _localByRid[r.remoteId]=r; });
    var remoteRecords = rows.map(function(r){
      var _loc = (r._id && _localByRid[r._id]) ? _localByRid[r._id] : null;
      var rawD = r["日期"] ? String(r["日期"]).slice(0,10) : '';
      var d = /^\d{4}-\d{2}-\d{2}$/.test(rawD) ? rawD : (_loc && /^\d{4}-\d{2}-\d{2}$/.test(_loc.date||'') ? _loc.date : isoDate());
      var symptoms=[];
      try{ symptoms = JSON.parse(r["感受"]||"[]"); if(!Array.isArray(symptoms)) symptoms=[]; }catch(e){ symptoms=[]; }
      return {id:r._id||uid(),type:'period',date:d,createdAt:(_loc&&Number(_loc.createdAt))?Number(_loc.createdAt):Date.now(),sample:false,remoteId:r._id,
        data:{
          isPeriodDay:r["是否经期"]==='Y'?'Y':'',
          isStartDay:r["是否经期首日"]==='Y'?'Y':'',
          isEndDay:r["是否经期末日"]==='Y'?'Y':'',
          discharge:r["分泌物"]||'',
          symptoms:symptoms,
          moodScore:Number(r["心情值"]||0),
          moodLabel:r["心情标签"]||'',
          pad:Number(r["卫生巾数量"]||0),
          night:Number(r["安睡裤数量"]||0),
          bleeding:Number(r["出血量"]||0),
          note:r["备注"]||''
        }};
    });
    /* v30 修复：union 模式 —— 严格保护本地所有 period 记录
     * 之前 replace 模式：state.records = [非period] + remote + _unsynced。
     * 这意味着已同步的本地记录（带 remoteId）如果云端这次拉取没有传回来（云端分页截断、
     * 云端记录被另一台设备删除但本地未刷新、网络抖动等），会被 filter 掉 → 数据丢失。
     * 用户红线第 3 条：每次更新后不要清空已上传的历史数据。
     *
     * union 规则：
     *   ① 云端每条 → 本地有相同 remoteId → 用云端最新值（latest wins）
     *   ② 云端每条 → 本地无对应 remoteId → 新增（云端独有）
     *   ③ 本地无 remoteId（新增未上传）→ 保留本地
     *   ④ 本地有 remoteId 但云端没拉回 → 保留本地（云端丢失保护，绝不丢本地！）
     */
    var localPeriod = state.records.filter(function(r){return r.type==='period';});
    var localByRemoteId = {};
    localPeriod.forEach(function(r){
      if(r.remoteId) localByRemoteId[r.remoteId] = r;
    });
    var merged = {};
    /* ① ②：处理云端 */
    remoteRecords.forEach(function(r){
      if(r.remoteId && localByRemoteId[r.remoteId]){
        /* ① 本地有，云端有 → 用云端覆盖 */
        merged['r_'+r.remoteId] = r;
        delete localByRemoteId[r.remoteId];
      } else {
        /* ② 云端独有 → 补进来。r._id 已映射到 r.remoteId 上（map 函数返回的新对象只有 id/remoteId，没有 _id），用 remoteId 作 key。 */
        merged['r_'+(r.remoteId || r.id)] = r;
      }
    });
    /* ③④：处理本地剩余 */
    localPeriod.forEach(function(r){
      if(!r.remoteId){
        /* ③ 本地新增未上传 → 保留 */
        merged['l_'+r.id] = r;
      } else if(localByRemoteId[r.remoteId]){
        /* ④ 本地有 remoteId，云端没拉回（分页/丢失/被对端删除）→ 保留本地，绝不丢！ */
        merged['l_'+r.remoteId] = localByRemoteId[r.remoteId];
        delete localByRemoteId[r.remoteId];
      }
      /* 已匹配（被 delete）的跳过 */
    });
    var mergedList = Object.values(merged);
    state.records = state.records.filter(function(r){return r.type!=='period';}).concat(mergedList);
  }

  function pushMood(rec){
    if (!ONLINE || LOCAL_ONLY) return;
    var props = {};
    props["日期"] = { text: rec.date };
    props["心情值"] = { number: rec.data.score || 3 };
    props["心情标签"] = { select: rec.data.tag || "平静" };
    props["当日感受"] = { text: rec.data.feeling || "" };
    props["图标"] = { text: rec.data.emoji || "" };
    dbAdd(DB_MOOD, props, function(rid){ if(rid){ rec.remoteId = rid; saveStateQuiet(); } });
  }
  function updateRemoteMood(rec){
    if (!ONLINE || LOCAL_ONLY || !rec.remoteId) return;
    var props = {};
    props["心情值"] = { number: rec.data.score || 3 };
    props["心情标签"] = { select: rec.data.tag || "平静" };
    props["当日感受"] = { text: rec.data.feeling || "" };
    props["图标"] = { text: rec.data.emoji || "" };
    dbUpdate(DB_MOOD, rec.remoteId, props);
  }
  function deleteRemoteMood(rid){ if(rid) dbDelete(DB_MOOD, rid); }

  const LANG_PARAM = new URL(location).searchParams.get('lang');
  const LANG = LANG_PARAM === 'en' ? 'en' : 'zh';
  document.documentElement.lang = LANG;
  const EN_I18N = {
    "日常集 · 生活工作台":"Daily Atlas · Life Workbench","日常集——把财务、习惯、健康、日程与待买清单安放在一个地方。":"Daily Atlas brings your finances, habits, health, schedule, and shopping list into one calm place.",
    "日":"D","日常集":"Daily Atlas","生活工作台":"Life Workbench","生活有迹可循":"A life you can trace","自定义":"Customize","自定义工作台外观":"Customize workbench appearance","主导航":"Main navigation","手机导航":"Mobile navigation","语言 / Language":"Language",
    "今日总览":"Today","生活模块":"LIFE","记账理财":"Money","习惯健康":"Habits & Health","减脂健身":"Fitness","日程统筹":"Planner","待买清单":"Shopping List","书影音库":"Media Library","数据":"DATA","时光档案":"Life Archive",
    "本机安全保存":"Saved safely on this device","每次修改立即保存；换设备前请导出备份。":"Every change is saved instantly. Export a backup before switching devices.","距备份提醒还有 20 条":"20 entries until the next backup reminder","今天，慢慢来":"Take today at your own pace","已自动保存":"Autosaved","保存失败":"Save failed","清空示例":"Clear samples","导入":"Import","导出备份":"Export backup",
    "数据暂时存不下了":"Your data could not be saved","请先导出备份，再清理浏览器空间。刚才的修改仍保留在当前页面。":"Export a backup first, then free up browser storage. Your latest changes are still available on this page.","发现本地数据损坏":"Corrupted local data found","已为你打开安全空白页，请导入之前的备份恢复。":"A safe blank workspace has been opened. Import a previous backup to restore your data.","导入备份":"Import backup","该给生活存个档了":"Time to archive your life","新增记录已达到 20 条，建议现在导出一份备份。":"You have added 20 entries. We recommend exporting a backup now.","立即导出":"Export now",
    "今日生活指数":"TODAY'S LIFE SCORE","三件要事，一点运动，留一笔清楚账。":"Three priorities, a little movement, and one clear entry.","快速开始":"QUICK START","记下一件小事":"Capture one small thing","输入时自动保存":"Saved as you type","记一笔":"Add transaction","支出或收入":"Expense or income","排日程":"Plan task","待办与提醒":"Tasks and reminders","记体重":"Log weight","减脂趋势":"Fitness trend","待买物品":"Shopping item","采购清单":"Shopping list",
    "本月支出":"Monthly spending","预算余量充足":"Plenty of budget left","今日习惯":"Today's habits","从一件小事开始":"Start with one small thing","今日待办":"Today's tasks","0 件":"0 tasks","节奏刚刚好":"A comfortable pace","今日节奏":"TODAY'S RHYTHM","待办清单":"Task list","查看全部":"View all","连续发生":"KEEP IT GOING","习惯打卡":"Habit check-in","管理":"Manage","生活脉络":"LIFE THREAD","最近记录":"Recent entries","进入档案":"Open archive","轻提醒":"GENTLE NOTE","规律不是把每天塞满，而是知道什么值得留下。":"Routine is not about filling every day. It is about knowing what is worth keeping.","根据你的记录生成":"Generated from your entries",
    "导出 Excel":"Export Excel","收支手账":"MONEY JOURNAL","记一笔账":"Add a transaction","草稿自动保存":"Draft autosaved","草稿已保存":"Draft saved","草稿保存失败":"Draft save failed","支出":"Expense","收入":"Income","金额":"Amount","分类":"Category","日期":"Date","备注":"Note","这笔钱花在了哪里":"What was this money for?","记下这笔":"Save transaction","本月收入":"Monthly income","本月剩余":"Monthly balance","月度对比":"MONTHLY COMPARISON","暂无对比":"No comparison yet","有了上月数据后，这里会显示变化":"Changes will appear once last month's data is available","月度预算":"MONTHLY BUDGET","花得明白，不必紧绷":"Spend with clarity, not pressure","预算 ¥":"Budget ¥","已使用 0%":"0% used","剩余 ¥0":"¥0 left","消费结构":"SPENDING BREAKDOWN","钱花在了哪里":"Where your money went","流水":"TRANSACTIONS","最近账目":"Recent transactions","全部分类":"All categories","消费结构饼图":"Spending breakdown pie chart","暂无支出":"No spending yet",
    "吃饭":"Dining","交通":"Transport","购物":"Shopping","娱乐":"Entertainment","房租":"Rent","看病":"Healthcare","学习":"Learning","其他":"Other","工资":"Salary","奖金":"Bonus","兼职":"Side income","理财":"Investments",
    "今天打卡":"TODAY'S CHECK-IN","完成一点，就算前进":"Every small completion counts","每次点击立即保存":"Every click saves instantly","新增习惯":"Add habit","今日完成":"Completed today","最佳连续":"Best streak","0 天":"0 days","近 30 天完成率":"30-day completion","30 天热力图":"30-DAY HEATMAP","坚持，是有形状的":"Consistency has a shape","手机可横向滑动":"Swipe horizontally on mobile","喝水":"Drink water","睡觉":"Sleep","运动":"Exercise","看书":"Read","冥想":"Meditate","杯":"cups","小时":"hours","次":"times","分钟":"minutes","页":"pages","目标":"Target","连续":"streak","已完成":"Completed","待完成":"To do","待打卡":"Not checked in","未完成":"Not completed","删除习惯":"Delete habit",
    "目标设置":"Goal settings","每日记录":"DAILY LOG","体重与体脂":"Weight & body fat","体重 kg":"Weight kg","体脂率 %":"Body fat %","摄入热量 kcal":"Calories kcal","运动分钟":"Exercise minutes","睡眠、饮食或身体感受":"Sleep, meals, or how your body feels","保存今日数据":"Save today's data","当前体重":"Current weight","距离目标":"To goal","10 斤":"5.0 kg","当前 BMI":"Current BMI","目标进度":"GOAL PROGRESS","稳稳向 55 kg 前进":"Moving steadily toward 55 kg","起点 60 kg":"Start 60 kg","目标 55 kg":"Goal 55 kg","体重趋势":"WEIGHT TREND","日波动与 7 天平均":"Daily changes and 7-day average","体重":"Weight","7 日平均":"7-day average","本周计划":"WEEKLY PLAN","运动与三餐安排":"Movement and meal plan","新增计划":"Add plan","身体日志":"BODY LOG","再记录一天，就能看到趋势":"Log one more day to see your trend","删除计划":"Delete plan",
    "力量训练 2 次":"2 strength sessions","每次 30–40 分钟":"30–40 minutes each","中低强度有氧 3 次":"3 low-to-moderate cardio sessions","快走、骑行或游泳":"Brisk walking, cycling, or swimming","每餐一掌心蛋白质":"One palm of protein per meal","鱼、蛋、瘦肉或豆制品":"Fish, eggs, lean meat, or tofu","午晚餐蔬菜占一半":"Fill half your lunch and dinner with vegetables","优先深色蔬菜":"Choose dark leafy vegetables first","主食不过度削减":"Do not cut carbs too aggressively","每餐约一拳头":"About one fist-sized serving per meal","睡够 7 小时":"Get 7 hours of sleep","恢复也是减脂计划":"Recovery is part of the plan","饮食":"Nutrition","恢复":"Recovery","无补充说明":"No additional notes","按自己的节奏完成":"Complete it at your own pace",
    "提醒事项":"REMINDERS","添加待办":"Add task","要做什么":"Task","写下一件具体的事":"Write down one specific task","时间":"Time","清单":"List","生活":"Life","工作":"Work","家庭":"Family","个人":"Personal","优先级":"Priority","普通":"Normal","高优先级":"High priority","低优先级":"Low priority","地点、准备事项或补充说明":"Location, preparation, or notes","到时间提醒我":"Remind me when it is due","加入日程":"Add to planner","今天":"Today","昨天":"Yesterday","已逾期":"Overdue","未来 7 天":"Next 7 days","一周日历":"WEEK CALENDAR","接下来七天":"The next seven days","智能清单":"SMART LIST","我的提醒事项":"My reminders","全部":"All","计划内":"Scheduled","全天":"All day","到时提醒":"Reminder on","留白":"Open","切换完成状态":"Toggle completion","删除":"Delete",
    "想买先记下":"SAVE IT FOR LATER","添加待买物品":"Add shopping item","物品名称":"Item name","例如：洗衣液、燕麦奶":"For example: detergent or oat milk","数量":"Quantity","2 盒":"2 cartons","食品":"Food","日用品":"Household","家居":"Home","数码":"Electronics","药品":"Medicine","预计单价 ¥":"Estimated unit price ¥","有空买":"When convenient","急需":"Urgent","等等再买":"Wait before buying","品牌、规格或购买渠道":"Brand, size, or where to buy","加入待买清单":"Add to shopping list","预计预算":"Estimated budget","本月买到":"Bought this month","需要的时候再买":"Buy it when you need it","待买":"To buy","已买":"Bought","数量未填":"No quantity","未分类":"Uncategorized","待定":"TBD","预计":"Estimate","燕麦奶":"Oat milk","无糖款":"Unsweetened","洗衣液":"Laundry detergent","1 瓶":"1 bottle","补充装":"Refill pack",
    "我的精神收藏":"MY MEDIA SHELF","记下一部作品":"Add a title","名字":"Title","电影、剧、书或番的名字":"Film, show, book, or anime title","类型":"Type","电影":"Film","剧":"Series","书":"Book","番":"Anime","状态":"Status","想看":"Want to watch","在看":"In progress","看完":"Finished","弃了":"Dropped","我的评分":"My rating","暂不评分":"Not rated yet","记录日期":"Log date","一句话短评":"One-line review","这一部为什么值得记住":"Why is this one worth remembering?","可选封面":"Optional cover","自动压缩保存，也可以只写名字":"Compressed and saved automatically; a title alone is fine","加入我的书影音":"Add to media log","今年看完":"Finished this year","0 部":"0 titles","平均评分":"Average rating","最爱类型":"Favorite type","年度统计":"YEAR IN REVIEW","，我的精神足迹":", my media journey","适合截图分享":"Ready to screenshot and share","书影音收藏":"Media collection","封面墙":"Cover wall","列表":"List","全部类型":"All types","全部状态":"All statuses","全部评分":"All ratings","5 星":"5 stars","4 星以上":"4+ stars","3 星以上":"3+ stars","未评分":"Not rated","封面":" cover","宇宙探索编辑部":"Journey to the West","漫长的季节":"The Long Season","献给阿尔吉侬的花束":"Flowers for Algernon","葬送的芙莉莲":"Frieren: Beyond Journey's End","机器人之梦":"Robot Dreams","荒诞又真诚，浪漫得很具体。":"Absurd yet sincere, with a wonderfully tangible sense of romance.","往前看，别回头。":"Keep moving forward. Do not look back.","聪明与幸福之间，并没有简单答案。":"There is no simple answer between intelligence and happiness.","时间把告别变成了理解。":"Time turns farewell into understanding.",
    "所有日常，都有出处":"EVERY DAY LEAVES A TRACE","按日期折叠的生活记录":"A life log grouped by date","财务":"Money","健康":"Health","日程":"Planner","记账":"Money","习惯":"Habits","条记录":"entries","生活记录":"Life entry","一笔收支":"Transaction","一项日程":"Task","身体记录":"Body log",
    "习惯设置":"HABIT SETTINGS","新增自己的习惯":"Create your own habit","习惯名称":"Habit name","例如：早睡、拉伸、背单词":"For example: sleep early, stretch, or learn words","打卡方式":"Tracking method","完成 / 未完成":"Done / not done","计数累加":"Counter","填写数值":"Numeric value","主题色":"Theme color","鼠尾草绿":"Sage green","暮色紫":"Twilight plum","陶土橙":"Terracotta","燕麦色":"Oat","每日目标":"Daily target","单位":"Unit","次 / 分钟 / 页":"times / minutes / pages","当前习惯":"Current habits","删除后历史打卡也会一起移除":"Deleting a habit also removes its check-in history","取消":"Cancel","添加习惯":"Add habit","关闭":"Close",
    "周计划":"WEEKLY PLAN","添加运动或饮食计划":"Add an exercise or nutrition plan","类别":"Category","其他":"Other","计划名称":"Plan name","例如：慢跑 2 次":"For example: jog twice","补充说明":"Additional notes","频次、时长或具体做法":"Frequency, duration, or details","现有周计划":"Current weekly plan","可随时删除不再需要的项目":"Remove plans you no longer need at any time","添加计划":"Add plan",
    "减脂档案":"FITNESS PROFILE","身高 cm":"Height cm","目标 kg":"Goal kg","年龄":"Age","生理性别":"Sex","女":"Female","男":"Male","日常活动":"Daily activity","久坐":"Sedentary","轻度活动":"Lightly active","中度活动":"Moderately active","高强度活动":"Highly active","保存目标":"Save goal",
    "工作台外观":"WORKBENCH APPEARANCE","把它变成你的日常集":"Make this workbench yours","页面名称":"Page name","头像文字":"Avatar text","副标题":"Tagline","森林绿":"Forest green","陶土棕":"Clay brown","深海蓝":"Deep sea blue","恢复默认":"Restore defaults","保存外观":"Save appearance",
    "午饭":"Lunch","公交":"Bus","买衣服":"Clothes","电影票":"Movie ticket","整理本周生活清单":"Organize this week's life list","先处理最重要的三件事":"Start with the three most important things","预约牙科检查":"Book a dental checkup","带上医保卡":"Bring insurance card","周末采购":"Weekend shopping","按待买清单购买":"Shop from the list","状态平稳":"Feeling steady",
    "今天的节奏很好，也记得留一点空白。":"You found a good rhythm today. Remember to leave a little breathing room.","已经在稳稳推进，继续保持自己的节奏。":"You are making steady progress. Keep your own pace.","今天先从一件小事开始，慢慢来就好。":"Start with one small thing today. Take it slowly.","已超出本月预算":"Over this month's budget","今天全部完成":"Everything completed today","第一条记录，会从这里开始":"Your first entry will appear here","生活已经积攒了一些痕迹，趁现在为它存一份备份。":"Your life has gathered a few traces. This is a good time to save a backup.","你不是在追赶完美，而是在让好习惯慢慢变得自然。":"You are not chasing perfection; you are letting good habits become natural.","这个分类还没有流水":"No transactions in this category yet","今天还没记账":"No transaction logged today","有空时补一笔，让月度趋势保持完整。":"Add one when you have time to keep your monthly trend complete.","已新增 20 笔账目":"20 transactions added","建议现在导出一次备份。":"We recommend exporting a backup now.","先看消费结构，再决定哪些支出可以放慢一点。":"Review the spending breakdown, then decide what can wait.",
    "目标已达成，进入稳定期":"Goal reached. You are now in the maintenance phase.","多记录几天后估算达成时间":"Log a few more days to estimate your goal date","今天还没称重":"No weight logged today","尽量在相似时间、相似状态下记录，关注 7 天平均线。":"Log under similar conditions and focus on the 7-day average.","不用追赶，选一项适合今天状态的完成。":"No need to catch up. Choose one plan that fits how you feel today.","今天已记录，本周计划也完成了":"Today's data is logged and this week's plan is complete","做得很好，记得给身体留恢复时间。":"Well done. Remember to leave time for recovery.","还没有周计划，点击右上角新增一项":"No weekly plan yet. Add one from the top right.","记录体重和体脂，关注趋势而不是单日数字":"Log weight and body fat, and focus on the trend rather than a single day.","这个智能清单里暂时没有事项":"No items in this smart list yet","待买清单已经清空":"Your shopping list is clear","这里还没有物品":"No items here yet","这个筛选条件下还没有作品":"No titles match these filters","这个范围还没有记录":"No entries in this range","建议现在导出备份":"Export a backup now","还没有习惯":"No habits yet","还没有周计划":"No weekly plan yet","已完成":"Completed","完成":"Done","记录":"Logged","全部类型":"All types",
    "存不下了，先导出备份":"Storage is full. Export a backup first.","已经攒到 20 笔，记得导出备份":"You have reached 20 transactions. Remember to export a backup.","已立即保存到本机":"Saved to this device instantly","记录已删除":"Entry deleted","备份格式不正确":"Invalid backup format","备份中有损坏的记录，请换一份备份重试":"The backup contains corrupted entries. Try another backup.","备份已导出，请妥善保存":"Backup exported. Keep it somewhere safe.","Excel 已导出":"Excel file exported","备份导入成功":"Backup imported successfully","导入失败，请检查备份文件":"Import failed. Check the backup file.","封面读取失败":"Could not read the cover image","封面格式不支持":"Unsupported cover image format","封面图片请控制在 12MB 以内":"Keep the cover image under 12 MB","封面已压缩，可以保存了":"Cover compressed and ready to save","已加入书影音清单":"Added to your media log","新习惯已加入":"New habit added","新计划已加入":"New plan added","目标设置已更新":"Goal settings updated","完成一项，心里轻一点":"One task done, one less thing on your mind","习惯已删除":"Habit deleted","计划已删除":"Plan deleted","买到了，已移入完成":"Bought and moved to completed","已从书影音清单移除":"Removed from your media log","已恢复默认外观":"Default appearance restored","月度预算已更新":"Monthly budget updated","示例内容已清空":"Sample content cleared","另一个页面的数据已同步":"Data from another tab has been synced","工作台外观已更新":"Workbench appearance updated","请输入有效金额":"Enter a valid amount","请记录今天的体重":"Log today's weight"
  };
  const I18N = {zh:Object.fromEntries(Object.keys(EN_I18N).map(key=>[key,key])),en:EN_I18N};
  const t = (key, vars={}) => String(I18N[LANG][key] ?? key).replace(/\{(\w+)\}/g,(_,name)=>vars[name] ?? '');
  const dynamicTranslators = [
    [/^距备份提醒还有 (\d+) 条$/,m=>`${m[1]} entries until the next backup reminder`],
    [/^(\d+) 月 (\d+) 日 · 星期([日一二三四五六])$/,m=>new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',weekday:'long'}).format(new Date(new Date().getFullYear(),Number(m[1])-1,Number(m[2])))],
    [/^(\d+) 月 (\d+) 日$/,m=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(new Date(new Date().getFullYear(),Number(m[1])-1,Number(m[2])))],
    [/^还可安排 (.+)$/,m=>`${m[1]} available`],[/^已经完成 (\d+) 件$/,m=>`${m[1]} completed`],[/^(\d+) 件$/,m=>`${m[1]} tasks`],
    [/^比上月(多|少)花了 (.+)$/,m=>`${m[1]==='多'?'Spent':'Saved'} ${m[2]} ${m[1]==='多'?'more':'versus last month'}`],[/^([↑↓]) (\d+)% · 上月 (.+)$/,m=>`${m[1]} ${m[2]}% · Last month ${m[3]}`],
    [/^已使用 (-?\d+)%$/,m=>`${m[1]}% used`],[/^剩余 (.+)$/,m=>`${m[1]} left`],[/^本月支出已超预算 (.+)$/,m=>`Monthly spending is ${m[1]} over budget`],
    [/^目标 (.+) (.+) · 连续 (\d+) 天$/,m=>`Target ${m[1]} ${translateText(m[2])} · ${m[3]}-day streak`],[/^(\d+) 天$/,m=>`${m[1]} days`],[/^(\d+)：(.+)$/,m=>`${m[1]}: ${translateText(m[2])}`],
    [/^起点 (.+) kg$/,m=>`Start ${m[1]} kg`],[/^目标 (.+) kg$/,m=>`Goal ${m[1]} kg`],[/^按当前趋势，约还需 (\d+) 天$/,m=>`About ${m[1]} days at the current trend`],
    [/^按 Mifflin–St Jeor 公式估算，当前每日消耗约 (\d+) kcal。记录饮食后可判断热量缺口。$/,m=>`Estimated daily expenditure is about ${m[1]} kcal using the Mifflin–St Jeor formula. Log meals to assess your calorie deficit.`],
    [/^当前估算每日热量缺口 (-?\d+) kcal，不在健康建议的 500–750 kcal 范围内，请调整饮食或运动。$/,m=>`Your estimated daily calorie deficit is ${m[1]} kcal, outside the recommended 500–750 kcal range. Adjust food intake or exercise.`],
    [/^当前估算每日热量缺口 (-?\d+) kcal，在建议的 500–750 kcal 范围内。$/,m=>`Your estimated daily calorie deficit is ${m[1]} kcal, within the recommended 500–750 kcal range.`],
    [/^本周计划还有 (\d+) 项$/,m=>`${m[1]} items remain in this week's plan`],[/^(\d+) \/ (\d+) 已完成$/,m=>`${m[1]} / ${m[2]} completed`],[/^(\d+) 项$/,m=>`${m[1]} items`],[/^(\d+) 件待完成$/,m=>`${m[1]} to do`],
    [/^(\d+) 部$/,m=>`${m[1]} titles`],[/^(\d+) 星$/,m=>`${m[1]} stars`],[/^(\d+) 条记录$/,m=>`${m[1]} entries`],[/^“(.+)”$/,m=>`“${translateText(m[1])}”`],
    [/^将导入 (\d+) 条记录，并替换当前数据。是否继续？$/,m=>`Import ${m[1]} entries and replace the current data?`],[/^将清空 (\d+) 条示例记录和示例打卡，你自己的内容会保留。是否继续？$/,m=>`Clear ${m[1]} sample entries and sample check-ins? Your own content will be kept.`],
    [/^确定删除“(.+)”吗？删除后无法撤回。$/,m=>`Delete “${translateText(m[1])}”? This cannot be undone.`],[/^确定删除习惯“(.+)”吗？历史打卡也会一起删除。$/,m=>`Delete the habit “${translateText(m[1])}” and all of its history?`],[/^确定删除计划“(.+)”吗？$/,m=>`Delete the plan “${translateText(m[1])}”?`],[/^确定从清单中删除“(.+)”吗？$/,m=>`Remove “${translateText(m[1])}” from the list?`],
    [/^(.+)，完成得漂亮$/,m=>`${translateText(m[1])} completed — nicely done`]
  ];
  function translateText(value){
    if(LANG!=='en') return String(value ?? '');
    const source=String(value ?? ''),trimmed=source.trim();
    if(!trimmed)return source;
    let translated=EN_I18N[trimmed];
    if(!translated){for(const [pattern,format] of dynamicTranslators){const match=trimmed.match(pattern);if(match){translated=format(match);break;}}}
    if(!translated&&trimmed.includes(' · ')){const parts=trimmed.split(' · '),mapped=parts.map(part=>EN_I18N[part]||part);if(mapped.some((part,index)=>part!==parts[index]))translated=mapped.join(' · ');}
    if(!translated)return source;
    return source.replace(trimmed,translated);
  }
  function localizeSubtree(root){
    if(LANG!=='en'||!root)return;
    const translateAttributes=element=>{
      if(!(element instanceof Element)||element.closest('[data-user-content]'))return;
      ['placeholder','title','aria-label','alt','data-title'].forEach(name=>{if(element.hasAttribute(name))element.setAttribute(name,translateText(element.getAttribute(name)));});
      if(element.tagName==='META'&&element.getAttribute('name')==='description')element.setAttribute('content',translateText(element.getAttribute('content')));
    };
    if(root.nodeType===Node.TEXT_NODE){const parent=root.parentElement;if(parent&&!parent.closest('script,style,[data-user-content]')){const translated=translateText(root.nodeValue);if(translated!==root.nodeValue)root.nodeValue=translated;}return;}
    if(!(root instanceof Element)&&root!==document)return;
    if(root instanceof Element)translateAttributes(root);
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
    let node;while((node=walker.nextNode())){
      if(node.nodeType===Node.ELEMENT_NODE)translateAttributes(node);
      else if(!node.parentElement?.closest('script,style,[data-user-content]')){
        const option=node.parentElement?.closest('option');if(option&&!option.hasAttribute('value'))option.setAttribute('value',option.value);
        const translated=translateText(node.nodeValue);if(translated!==node.nodeValue)node.nodeValue=translated;
      }
    }
  }
  function startI18n(){
    document.querySelectorAll('[data-lang]').forEach(button=>{button.classList.toggle('active',button.dataset.lang===LANG);button.setAttribute('aria-pressed',String(button.dataset.lang===LANG));button.addEventListener('click',()=>{if(button.dataset.lang===LANG)return;const url=new URL(location);url.searchParams.set('lang',button.dataset.lang);location.assign(url.href);});});
    localizeSubtree(document);
    if(LANG==='en')new MutationObserver(mutations=>mutations.forEach(mutation=>{if(mutation.type==='characterData')localizeSubtree(mutation.target);else mutation.addedNodes.forEach(localizeSubtree);})).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  }
  const nativeConfirm=window.confirm.bind(window);window.confirm=message=>nativeConfirm(translateText(message));

  const STORAGE_KEY = 'richangji-state-v1';
  const EXPENSE_CATEGORIES = ['吃饭','交通','购物','娱乐','房租','看病','学习','其他'];
  const INCOME_CATEGORIES = ['工资','奖金','兼职','理财','其他'];
  const CATEGORY_COLORS = ['#4a7aa8','#5f8a70','#8091b0','#b08a3e','#6fa0c4','#8a94a6','#7d8ba8','#9aa5b5'];
  const TYPE_META = {
    money:{label:'财务',icon:'i-wallet',tone:'terracotta'},fitness:{label:'健康',icon:'i-fitness',tone:'sage'},
    planner:{label:'日程',icon:'i-calendar',tone:'plum'},home:{label:'待买',icon:'i-cart',tone:'sand'},
    diet:{label:'饮食',icon:'i-diet',tone:'sage'},storage:{label:'物品',icon:'i-storage',tone:'plum'},mood:{label:'心情',icon:'i-mood',tone:'terra'},
    period:{label:'经期',icon:'i-period',tone:'plum'},
    sleep:{label:'睡眠',icon:'i-sleep',tone:'plum'},
    study:{label:'学习',icon:'i-study',tone:'plum'},
    payback:{label:'回本记录',icon:'i-payback',tone:'plum'}
  };
  const HABIT_DEFS = [
    {key:'water',name:'喝水',nameEn:'Drink water',type:'counter',target:8,unit:'杯',unitEn:'cups',tone:'sage'},
    {key:'sleep',name:'睡觉',nameEn:'Sleep',type:'number',target:7,unit:'小时',unitEn:'hours',tone:'plum'},
    {key:'exercise',name:'运动',nameEn:'Exercise',type:'check',target:1,unit:'次',unitEn:'times',tone:'terracotta'},
    {key:'reading',name:'看书',nameEn:'Read',type:'check',target:1,unit:'次',unitEn:'times',tone:'sand'},
    {key:'meditation',name:'冥想',nameEn:'Meditate',type:'check',target:1,unit:'次',unitEn:'times',tone:'sage'}
  ];
  const resolveHabitName = def => (LANG==='en'&&def.nameEn)?def.nameEn:def.name;
  const resolveHabitUnit = def => (LANG==='en'&&def.unitEn)?def.unitEn:def.unit;
  const DEFAULT_PLAN = [
    {id:'move-1',group:'运动',title:'力量训练 2 次',titleEn:'Strength training ×2',note:'每次 30–40 分钟',noteEn:'30–40 min each',done:false},
    {id:'move-2',group:'运动',title:'中低强度有氧 3 次',titleEn:'Moderate cardio ×3',note:'快走、骑行或游泳',noteEn:'Walk / cycle / swim',done:false},
    {id:'meal-1',group:'饮食',title:'每餐一掌心蛋白质',titleEn:'Palm-size protein per meal',note:'鱼、蛋、瘦肉或豆制品',noteEn:'Fish, eggs, lean meat or tofu',done:false},
    {id:'meal-2',group:'饮食',title:'午晚餐蔬菜占一半',titleEn:'Veggies = half the plate',note:'优先深色蔬菜',noteEn:'Prefer dark greens',done:false},
    {id:'meal-3',group:'饮食',title:'主食不过度削减',titleEn:"Don't cut carbs too much",note:'每餐约一拳头',noteEn:'~one fist per meal',done:false},
    {id:'meal-4',group:'恢复',title:'睡够 7 小时',titleEn:'Sleep 7+ hours',note:'恢复也是减脂计划',noteEn:'Rest is part of fat loss',done:false}
  ];

  const isoDate = (date = new Date()) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,10);
  };
  const shiftDate = (days, base = new Date()) => { const d = new Date(base); d.setDate(d.getDate()+days); return isoDate(d); };
  const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const money = value => `¥${Number(value||0).toLocaleString(LANG==='en'?'en-US':'zh-CN',{maximumFractionDigits:2})}`;
  const escapeHtml = value => String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const userHtml = value => `<span data-user-content>${escapeHtml(value)}</span>`;
  const localizedHtml = value => escapeHtml(translateText(value));
  const icon = id => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const sum = (items, pick) => items.reduce((total,item)=>total+Number(pick(item)||0),0);
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));

  function sampleFitness() {
    const weights = [61.2,61,60.9,60.7,60.8,60.5,60.4,60.3,60.2,60.1,60.2,60.1,60,60];
    return weights.map((weight,index)=>({id:uid(),type:'fitness',date:shiftDate(index-13),createdAt:Date.now()-100000+index,sample:true,data:{weight,bodyFat:Number((29.2-index*.07).toFixed(1)),calories:1650+(index%3)*60,duration:index%2?35:20,note:index===13?'状态平稳':''}}));
  }

  function makeInitialState() {
    const today=isoDate();
    const habits=HABIT_DEFS.map((def,index)=>{
      const entries={};
      for(let day=29;day>=0;day--){
        const date=shiftDate(-day);
        if((day+index)%5!==0){
          entries[date]=def.type==='counter'?6+(day%3):def.type==='number'?6.5+(day%3)*.5:1;
        }
      }
      if(def.key==='water') entries[today]=5;
      if(def.key==='sleep') entries[today]=7.5;
      if(def.key==='exercise') entries[today]=1;
      delete entries[today];
      return {...def,id:`habit-${def.key}`,entries,sample:true};
    });
    return {
      version:2,
      records:[
        {id:uid(),type:'money',date:today,createdAt:Date.now()-1000,sample:true,data:{flow:'expense',amount:32,category:'吃饭',note:'午饭'}},
        {id:uid(),type:'money',date:today,createdAt:Date.now()-2000,sample:true,data:{flow:'expense',amount:6,category:'交通',note:'公交'}},
        {id:uid(),type:'money',date:shiftDate(-2),createdAt:Date.now()-3000,sample:true,data:{flow:'income',amount:12000,category:'工资',note:'工资'}},
        {id:uid(),type:'money',date:shiftDate(-3),createdAt:Date.now()-4000,sample:true,data:{flow:'expense',amount:158,category:'购物',note:'买衣服'}},
        {id:uid(),type:'money',date:shiftDate(-4),createdAt:Date.now()-5000,sample:true,data:{flow:'expense',amount:45,category:'娱乐',note:'电影票'}},
        ...sampleFitness(),
        {id:uid(),type:'planner',date:today,createdAt:Date.now()-6000,sample:true,data:{title:'整理本周生活清单',titleEn:'Review weekly checklist',time:'10:30',priority:'high',list:'生活',note:'先处理最重要的三件事',remind:true,done:false}},
        {id:uid(),type:'planner',date:shiftDate(1),createdAt:Date.now()-7000,sample:true,data:{title:'预约牙科检查',titleEn:'Book dental checkup',time:'15:00',priority:'normal',list:'个人',note:'带上医保卡',remind:true,done:false}},
        {id:uid(),type:'planner',date:shiftDate(3),createdAt:Date.now()-8000,sample:true,data:{title:'周末采购',titleEn:'Weekend groceries',time:'11:00',priority:'low',list:'家庭',note:'按待买清单购买',remind:false,done:false}},
        {id:uid(),type:'home',date:today,createdAt:Date.now()-9000,sample:true,data:{name:'燕麦奶',quantity:'2 盒',category:'食品',price:18,priority:'high',note:'无糖款',bought:false}},
        {id:uid(),type:'home',date:shiftDate(-2),createdAt:Date.now()-10000,sample:true,data:{name:'洗衣液',quantity:'1 瓶',category:'日用品',price:39,priority:'normal',note:'补充装',bought:true,boughtDate:shiftDate(-1)}}
      ],
      habits,
      mediaItems:[
        {id:uid(),name:'宇宙探索编辑部',type:'电影',status:'看完',rating:5,review:'荒诞又真诚，浪漫得很具体。',date:today,cover:'',sample:true},
        {id:uid(),name:'漫长的季节',type:'剧',status:'看完',rating:5,review:'往前看，别回头。',date:shiftDate(-18),cover:'',sample:true},
        {id:uid(),name:'献给阿尔吉侬的花束',type:'书',status:'看完',rating:5,review:'聪明与幸福之间，并没有简单答案。',date:shiftDate(-35),cover:'',sample:true},
        {id:uid(),name:'葬送的芙莉莲',type:'番',status:'在看',rating:4,review:'时间把告别变成了理解。',date:shiftDate(-7),cover:'',sample:true},
        {id:uid(),name:'机器人之梦',type:'电影',status:'想看',rating:0,review:'',date:shiftDate(-2),cover:'',sample:true}
      ],
      drafts:{},
      settings:{budget:5000,recordsSinceExport:0,moneySinceExport:0,lastExportAt:null,archiveFilter:'all',moneyFilter:'all',plannerFilter:'all',shoppingFilter:'pending',mediaView:'wall',mediaTypeFilter:'all',mediaStatusFilter:'all',mediaRatingFilter:0,moodEmoji:{},moodPage:1,moodCalYM:'',hiddenHabitKeys:[],brand:{name:'日常集',avatar:'日',tagline:'生活有迹可循',theme:'plum'},fitnessProfileUpdatedAt:0,fitnessProfile:{height:158,target:55,startWeight:54.9,age:32,sex:'female',activity:1.375},weeklyPlan:[],weeklyPlanHistory:[],weeklyPlanWeekStart:isoWeekStart()},
      pendingDeletes:[]
    };
  }

  function normalizeHabit(habit,index) {
    const def=HABIT_DEFS.find(item=>item.key===habit.key) || HABIT_DEFS[index] || {key:`custom-${index}`,name:habit.name||'习惯',type:'check',target:1,unit:'次',tone:habit.tone||'sage'};
    const entries={...(habit.entries||{})};
    (habit.completedDates||[]).forEach(date=>{entries[date]=1;});
    return {...def,...habit,id:habit.id||`habit-${def.key}`,entries};
  }

  function normalizeState(candidate) {
    if(!candidate||!Array.isArray(candidate.records)) throw new Error('备份格式不正确');
    const validTypes=new Set(Object.keys(TYPE_META));
    const validRecords=candidate.records.every(record=>record&&validTypes.has(record.type)&&/^\d{4}-\d{2}-\d{2}$/.test(record.date)&&record.data&&typeof record.data==='object');
    if(!validRecords) throw new Error('备份中有损坏的记录，请换一份备份重试');
    const defaults=makeInitialState();
    const existing=(Array.isArray(candidate.habits)?candidate.habits:[]).map(normalizeHabit);
    const hiddenHabitKeys=new Set(Array.isArray(candidate.settings?.hiddenHabitKeys)?candidate.settings.hiddenHabitKeys:[]);
    const defaultHabits=HABIT_DEFS.filter(def=>!hiddenHabitKeys.has(def.key)).map(def=>{
      const match=existing.find(h=>h.key===def.key || h.name===def.name || (def.key==='reading'&&h.name?.includes('阅读')) || (def.key==='water'&&h.name?.includes('水')));
      return match?{...def,...match,entries:match.entries||{}}:{...def,id:`habit-${def.key}`,entries:{},sample:false};
    });
    const defaultIds=new Set(defaultHabits.map(h=>h.id)),defaultKeys=new Set(HABIT_DEFS.map(h=>h.key));
    const customHabits=existing.filter(h=>!defaultIds.has(h.id)&&!defaultKeys.has(h.key)).map((h,index)=>({...h,key:h.key||`custom-${index}-${uid()}`,type:['check','counter','number'].includes(h.type)?h.type:'check',target:Number(h.target||1),unit:h.unit||'次',entries:h.entries||{},sample:Boolean(h.sample)}));
    const habits=[...defaultHabits,...customHabits];
    const shouldRefreshSamples=Number(candidate.version||1)<2&&candidate.records.some(record=>record.sample);
    const sourceRecords=shouldRefreshSamples
      ? [...candidate.records.filter(record=>!record.sample),...defaults.records.filter(record=>record.sample)]
      : candidate.records;
    const records=sourceRecords.map(record=>{
      const data={...(record.data||{})};
      if(record.type==='money'){
        const map={餐饮:'吃饭',居住:'房租',健康:'看病'};
        data.category=map[data.category]||data.category||'其他';
      }
      if(record.type==='home'){
        data.category=data.category||data.location||'其他'; data.price=Number(data.price||0); data.bought=Boolean(data.bought);
      }
      if(record.type==='planner'){data.list=data.list||'生活';data.note=data.note||'';data.remind=Boolean(data.remind);}
      return {...record,id:record.id||uid(),data};
    });
    const mediaItems=(Array.isArray(candidate.mediaItems)?candidate.mediaItems:defaults.mediaItems).filter(item=>item&&item.name).map(item=>({id:item.id||uid(),name:String(item.name),type:['电影','剧','书','番'].includes(item.type)?item.type:'电影',status:['想看','在看','看完','弃了'].includes(item.status)?item.status:'想看',rating:clamp(Number(item.rating||0),0,5),review:String(item.review||''),date:/^\d{4}-\d{2}-\d{2}$/.test(item.date||'')?item.date:isoDate(),cover:typeof item.cover==='string'?item.cover:'',sample:Boolean(item.sample),createdAt:Number(item.createdAt||0),remoteId:item.remoteId||'',syncTriedAt:Number(item.syncTriedAt||0)}));
    return {
      version:2,records,habits,mediaItems,
      drafts:candidate.drafts&&typeof candidate.drafts==='object'?candidate.drafts:{},
      settings:{...defaults.settings,...(candidate.settings||{}),brand:{...defaults.settings.brand,...(candidate.settings?.brand||{})},fitnessProfile:{...defaults.settings.fitnessProfile,...(candidate.settings?.fitnessProfile||{})},weeklyPlan:Array.isArray(candidate.settings?.weeklyPlan)?candidate.settings.weeklyPlan:[],weeklyPlanHistory:Array.isArray(candidate.settings?.weeklyPlanHistory)?candidate.settings.weeklyPlanHistory:[],weeklyPlanWeekStart:typeof candidate.settings?.weeklyPlanWeekStart==='string'&&candidate.settings.weeklyPlanWeekStart?candidate.settings.weeklyPlanWeekStart:isoWeekStart(),fitnessProfileUpdatedAt:Number(candidate.settings?.fitnessProfileUpdatedAt||0)},
      clearedAll:Boolean(candidate.clearedAll),
      lastClearedAt:Number(candidate.lastClearedAt||0),
      periodClearApplied:Number(candidate.periodClearApplied||0),
      pendingDeletes:Array.isArray(candidate.pendingDeletes)?candidate.pendingDeletes:[]
    };
  }

  let dataCorrupted=false;
  function loadState(){
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return makeInitialState();
    try{return normalizeState(JSON.parse(raw));}
    catch(error){dataCorrupted=true;return makeInitialState();}
  }

  let state=loadState();
  let toastTimer;
  let pendingMediaCover='';
  var quietSaveTimer = null;
  function saveStateQuiet(){
    if (quietSaveTimer) clearTimeout(quietSaveTimer);
    quietSaveTimer = setTimeout(function(){
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); scheduleSettingsPush(); } catch(e){}
    }, 400);
  }
  function saveState(showSaved=false){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
      document.querySelector('.save-state')?.classList.remove('error');
      document.getElementById('saveText').textContent='已自动保存';
      if(showSaved) pulseSaved();
      scheduleSettingsPush();
      return true;
    }catch(error){
      document.querySelector('.save-state')?.classList.add('error');
      document.getElementById('saveText').textContent='保存失败';
      toast('存储空间不足，无法保存');
      return false;
    }
  }
  function pulseSaved(){const el=document.querySelector('.save-state');if(!el)return;el.animate?.([{opacity:.5},{opacity:1}],{duration:350});}
  function toast(message){const el=document.getElementById('toast');el.textContent=translateText(message);el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
  function celebrate(){const box=document.getElementById('confetti');box.innerHTML=Array.from({length:16},(_,i)=>`<i style="--x:${45+Math.random()*10}%;--dx:${(Math.random()-.5)*240}px;--dy:${-70-Math.random()*170}px;--c:${['#4a7aa8','#5f8a70','#b08a3e','#8091b0'][i%4]}"></i>`).join('');setTimeout(()=>box.innerHTML='',900);}

  function sortedRecords(type,ascending=false){return state.records.filter(r=>!type||r.type===type).sort((a,b)=>(ascending?1:-1)*(a.date.localeCompare(b.date)||(a.createdAt||0)-(b.createdAt||0)));}
  function addRecord(type,date,data){
    /* v27：period 改为「同日合并」语义—— 同一天多次保存只生成 1 条记录（合并 data 字段），避免 starts 数组出现重复日期 */
    if(type==='period'){
      date = date || isoDate();
      var existing = state.records.find(function(r){ return r.type==='period' && r.date===date; });
      if(existing){
        /* 合并：旧值是 base，新数据中"非空"字段才覆盖；症状数组 union 去重；数值字段由新值覆盖（用户主动改）
         * 关键：避免新 data.isStartDay='' 覆盖已有 'Y'，避免新 discharge='' 覆盖已有粘稠 */
        var oldData = existing.data || {};
        var _upd = {};
        for(var _k in data){
          var _v = data[_k];
          if(Array.isArray(_v)) _upd[_k] = _v;  /* 数组字段（symptoms）下面 union 处理 */
          else if(_v !== '' && _v !== null && _v !== undefined) _upd[_k] = _v;
        }
        var oldSym = Array.isArray(oldData.symptoms) ? oldData.symptoms : [];
        var newSym = Array.isArray(data.symptoms) ? data.symptoms : [];
        existing.data = Object.assign({}, oldData, _upd, {
          symptoms: Array.from(new Set(oldSym.concat(newSym)))
        });
        existing.createdAt = Date.now();
        pushPeriod(existing); /* 复用 existing.remoteId，upsert 到云端 */
        state.settings.recordsSinceExport=Number(state.settings.recordsSinceExport||0)+1;
        var savedMerge=saveState(true); renderAll();
        if(savedMerge){ toast('今日记录已更新'); }
        return !!savedMerge;
      }
      /* 首次记录今日——走正常新增 */
      var newRec = {id:uid(),type:'period',date:date,createdAt:Date.now(),sample:false,data:data};
      state.records.push(newRec);
      pushPeriod(newRec);
      state.settings.recordsSinceExport=Number(state.settings.recordsSinceExport||0)+1;
      var savedNew=saveState(true); renderAll();
      if(!savedNew) return false;
      toast('已立即保存');
      return true;
    }
    state.records.push({id:uid(),type,date:date||isoDate(),createdAt:Date.now(),sample:false,data});
    var rec=state.records[state.records.length-1];
    if(type==='money')pushMoney(rec);
    if(type==='planner')pushPlan(rec);
    if(type==='fitness')pushFitness(rec);
    if(type==='home')pushShopping(rec);
    if(type==='diet')pushDiet(rec);
    if(type==='storage')pushStorage(rec);
    if(type==='mood')pushMood(rec);
    if(type==='sleep')pushSleep(rec);
    if(type==='study')pushStudy(rec);
    if(type==='payback')pushPayback(rec);
    state.settings.recordsSinceExport=Number(state.settings.recordsSinceExport||0)+1;
    if(type==='money') state.settings.moneySinceExport=Number(state.settings.moneySinceExport||0)+1;
    const saved=saveState(true);renderAll();
    if(!saved)return false;
    toast('已立即保存');
    return true;
  }
  function deleteRecord(id){const target=state.records.find(r=>r.id===id);if(!target)return;showConfirm({title:t('删除'),message:LANG==='en'?`Delete “${titleFor(target)}”? This cannot be undone.`:`确定删除“${titleFor(target)}”吗？删除后无法撤回。`,confirmText:t('删除'),cancelText:LANG==='en'?'Cancel':'取消',danger:true,onConfirm:function(ok){if(!ok)return;if(target.remoteId){var _delDb=target.type==='money'?DB_MONEY:target.type==='planner'?DB_PLAN:target.type==='fitness'?DB_FITNESS:target.type==='home'?DB_SHOPPING:target.type==='diet'?DB_DIET:target.type==='storage'?DB_STORAGE:target.type==='mood'?DB_MOOD:target.type==='period'?DB_PERIOD:target.type==='sleep'?DB_SLEEP:target.type==='study'?DB_STUDY:target.type==='payback'?DB_PAYBACK:null;if(_delDb)enqueuePendingDelete(_delDb,target.remoteId);if(target.type==='money')deleteRemoteMoney(target.remoteId);if(target.type==='planner')deleteRemotePlan(target.remoteId);if(target.type==='fitness')deleteRemoteFitness(target.remoteId);if(target.type==='home')deleteRemoteShopping(target.remoteId);if(target.type==='diet')deleteRemoteDiet(target.remoteId);if(target.type==='storage')deleteRemoteStorage(target.remoteId);if(target.type==='mood')deleteRemoteMood(target.remoteId);if(target.type==='period')deleteRemotePeriod(target.remoteId);if(target.type==='sleep')deleteRemoteSleep(target.remoteId);if(target.type==='study')deleteRemoteStudy(target.remoteId);if(target.type==='payback')deleteRemotePayback(target.remoteId);if(target.type==='study')deleteRemoteStudy(target.remoteId);if(target.type==='payback')deleteRemotePayback(target.remoteId);}state.records=state.records.filter(r=>r.id!==id);const saved=saveState();renderAll();if(saved)toast('记录已删除');}});}
  function switchView(view){const target=document.getElementById(`view-${view}`);if(!target)return;document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el===target));document.querySelectorAll('[data-nav]').forEach(el=>el.classList.toggle('active',el.dataset.nav===view));document.getElementById('viewTitle').textContent=target.dataset.title||'日常集';if(location.hash!==`#${view}`)history.replaceState(null,'',`#${view}`);scrollTo({top:0,behavior:'smooth'});}
  function formatDateHeading(value){if(value===isoDate())return t('今天');if(value===shiftDate(-1))return t('昨天');const date=new Date(`${value}T00:00:00`);return LANG==='en'?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'}).format(date):`${date.getMonth()+1} 月 ${date.getDate()} 日`;}
  function titleFor(record){const d=record.data||{},local=value=>record.sample?translateText(value):value;if(record.type==='sleep')return (d.bedtime&&d.wake)?('睡眠 '+d.bedtime+' → '+d.wake):t('睡眠记录');if(record.type==='money')return d.note?local(d.note):t(d.category||'一笔收支');if(record.type==='planner')return d.title?local(d.title):t('一项日程');if(record.type==='fitness')return d.note?local(d.note):t('身体记录');if(record.type==='home')return d.name?local(d.name):t('待买物品');if(record.type==='diet')return d.food?local(d.food):t('饮食记录');if(record.type==='storage')return d.name?local(d.name):t('囤货物品');if(record.type==='mood')return (d.emoji?d.emoji+' ':'')+(d.feeling?local(d.feeling):t('一条心情'));if(record.type==='period'){if(d.isStartDay==='Y')return '经期首日';if(d.isEndDay==='Y')return '经期末日';if(d.isPeriodDay==='Y')return '经期中';if((d.symptoms||[]).length)return d.symptoms[0];return '经期记录';}return t('生活记录');}
  function detailFor(record){const d=record.data||{};if(record.type==='sleep'){var _m=_sleepMetrics(record);return (d.bedtime||'')+' → '+(d.wake||'')+' · 睡 '+_fmtMin(_m.asleep)+(_m.inBed?' / 卧床 '+_fmtMin(_m.inBed):'');}if(record.type==='money')return`${t(d.category||'其他')} · ${t(d.flow==='income'?'收入':'支出')}`;if(record.type==='planner')return`${t(d.list||'生活')} · ${d.time||t('全天')} · ${t(d.done?'已完成':'待完成')}`;if(record.type==='fitness')return`${d.bodyFat?`${LANG==='en'?'Body fat':'体脂'} ${d.bodyFat}% · `:''}${d.duration||0} ${LANG==='en'?'min exercise':'分钟运动'}`;if(record.type==='home')return`${record.sample?translateText(d.quantity||'数量未填'):(d.quantity||t('数量未填'))} · ${t(d.category||'未分类')} · ${t(d.bought?'已买':'待买')}`;if(record.type==='diet')return`${t(d.meal||'早餐')} · ${d.calories||0} kcal`;if(record.type==='storage')return`${d.quantity||0} ${d.unit||''} · ${t(d.category||'其他')}${d.location?' · '+d.location:''}`;if(record.type==='mood')return `${moodEmojiOf(d.score||3)}${d.feeling?' · '+d.feeling:''}`;if(record.type==='period'){var p=[];if(d.discharge)p.push('分泌物 '+d.discharge);if((d.symptoms||[]).length)p.push(d.symptoms.join(' · '));if(d.bleeding)p.push('出血量 '+d.bleeding+'/5');if(d.pad)p.push('卫生巾 '+d.pad);if(d.night)p.push('安睡裤 '+d.night);return p.join(' · ')||'—';}return '';}
  function valueFor(record){const d=record.data||{};if(record.type==='sleep'){var _sm=_sleepMetrics(record);return _fmtMin(_sm.asleep)+' · '+Math.round(_sm.eff)+'%';}if(record.type==='money')return`${d.flow==='income'?'+':'-'}${money(d.amount)}`;if(record.type==='fitness'&&d.weight)return`${d.weight} kg`;if(record.type==='planner')return d.time||'';if(record.type==='home')return d.price?money(d.price):'';if(record.type==='diet')return (d.calories||0)+' kcal';if(record.type==='storage')return (d.quantity||0)+(d.unit?' '+d.unit:'');if(record.type==='mood')return (d.emoji||moodEmojiOf(d.score||3));if(record.type==='period'){var t2=[];if(d.moodScore!=null&&d.moodScore!=='')t2.push('心情 '+d.moodScore+'/10');if(d.pad||d.night)t2.push(((d.pad||0)+(d.night||0))+' 片');return t2.join(' · ')||'记录';}return '';}
  function recordDetailHtml(record){if(record.type!=='home'&&record.type!=='diet'&&record.type!=='storage')return escapeHtml(detailFor(record));const d=record.data||{},quantity=record.sample?localizedHtml(d.quantity||'数量未填'):userHtml(d.quantity||t('数量未填'));return`${quantity} · ${localizedHtml(d.category||'未分类')} · ${t(d.bought?'已买':'待买')}`;}
  function recordTitleHtml(record){if(record.sample)return localizedHtml(titleFor(record));const raw=titleFor(record);const translated=translateText(raw);return translated!==raw?translated:userHtml(raw);}
  function empty(message){return`<div class="empty-state">${localizedHtml(message)}</div>`;}
  function taskRow(record,deletable=false){const d=record.data;const overdue=!d.done&&record.date<isoDate(),title=record.sample?(LANG==='en'&&d.titleEn?d.titleEn:localizedHtml(d.title)):userHtml(d.title),note=record.sample?localizedHtml(d.note||''):userHtml(d.note||'');return`<div class="task-row ${d.done?'done':''} ${overdue?'overdue':''}"><button class="check-btn ${d.done?'checked':''}" data-action="toggle-task" data-id="${record.id}" aria-label="${t('切换完成状态')}">${d.done?icon('i-check'):''}</button><span class="task-title">${title} <i class="list-tag">${localizedHtml(d.list||'生活')}</i><small>${note}${d.remind?` · ${t('到时提醒')}`:''}</small></span><span class="task-time">${overdue?t('已逾期'):escapeHtml(d.time||t('全天'))}</span><span class="priority-flag ${d.priority==='high'?'high':''}"></span>${deletable?`<button class="delete-btn" data-action="delete" data-id="${record.id}" aria-label="${t('删除')}">${icon('i-trash')}</button>`:''}</div>`;}
  function recordRow(record){const meta=TYPE_META[record.type]||TYPE_META.home;const flowClass=record.type==='money'?record.data.flow:'';return`<div class="record-row"><span class="record-icon ${meta.tone}">${icon(meta.icon)}</span><span class="record-main"><strong>${recordTitleHtml(record)}</strong><small>${escapeHtml(formatDateHeading(record.date))} · ${recordDetailHtml(record)}</small></span><span class="record-amount ${flowClass}">${escapeHtml(valueFor(record))}</span><button class="delete-btn" data-action="delete" data-id="${record.id}" aria-label="${t('删除')}">${icon('i-trash')}</button></div>`;}
  /* 健身记录行：回显全部身体指标字段（体重/体脂/体脂肪/骨骼肌/水分/基础代谢/腰臀比/身体年龄/热量/运动） */
  function fitnessRow(record){
    const d=record.data||{},parts=[];
    if(d.bodyFat!=null)parts.push(`${LANG==='en'?'Body fat':'体脂'} ${d.bodyFat}%`);
    if(d.bodyFatKg!=null)parts.push(`${LANG==='en'?'Fat mass':'体脂肪'} ${d.bodyFatKg} kg`);
    if(d.skeletalMuscle!=null)parts.push(`${LANG==='en'?'Muscle':'骨骼肌'} ${d.skeletalMuscle} kg`);
    if(d.bodyWater!=null)parts.push(`${LANG==='en'?'Water':'水分'} ${d.bodyWater} kg`);
    if(d.bmr!=null)parts.push(`${LANG==='en'?'BMR':'基础代谢'} ${d.bmr} kcal`);
    if(d.waistHipRatio!=null)parts.push(`${LANG==='en'?'WHR':'腰臀比'} ${d.waistHipRatio}`);
    if(d.bodyAge!=null)parts.push(`${LANG==='en'?'Body age':'身体年龄'} ${d.bodyAge}`);
    if(d.calories)parts.push(`${d.calories} kcal`);
    if(d.duration)parts.push(`${d.duration} ${LANG==='en'?'min':'分钟运动'}`);
    const detail=parts.join(' · ');
    const title=d.note?(record.sample?localizedHtml(d.note):userHtml(d.note)):t('身体记录');
    return`<div class="record-row"><span class="record-icon sage">${icon('i-fitness')}</span><span class="record-main"><strong>${title}</strong><small>${escapeHtml(formatDateHeading(record.date))}${detail?' · '+detail:''}</small></span><span class="record-amount">${d.weight?d.weight+' kg':''}</span><button class="delete-btn" data-action="delete" data-id="${record.id}" aria-label="${t('删除')}">${icon('i-trash')}</button></div>`;
  }

  function habitNameHtml(habit){const def=HABIT_DEFS.find(d=>d.key===habit.key);if(def)return escapeHtml(resolveHabitName(def));return habit.sample?localizedHtml(habit.name):userHtml(habit.name);}
  function habitDone(habit,date=isoDate()){return Number(habit.entries?.[date]||0)>=Number(habit.target||1);}
  /* v39：连续天数计入「今天还没来得及打卡」的情形——今天未达成时从昨天往前回溯，
   * 只要昨天及之前连续满足目标就保留真实天数（旧逻辑今天未打卡即显示 0 天）。 */
  function habitStreak(habit){let streak=0;const cursor=new Date();if(!habitDone(habit,isoDate(cursor)))cursor.setDate(cursor.getDate()-1);while(habitDone(habit,isoDate(cursor))){streak++;cursor.setDate(cursor.getDate()-1);}return streak;}
  function habitBestStreak(habit){let best=0,current=0;Object.keys(habit.entries||{}).sort().forEach((date,index,dates)=>{if(!habitDone(habit,date)){current=0;return;}const previous=dates[index-1];current=previous&&Math.round((new Date(date)-new Date(previous))/86400000)===1?current+1:1;best=Math.max(best,current);});return best;}

  function renderDashboard(){
    const today=isoDate(),month=today.slice(0,7);
    const monthExpense=sum(state.records.filter(r=>r.type==='money'&&r.date.startsWith(month)&&r.data.flow==='expense'),r=>r.data.amount);
    const todayTasks=sortedRecords('planner').filter(r=>r.date===today),doneTasks=todayTasks.filter(r=>r.data.done).length;
    const completed=state.habits.filter(h=>habitDone(h)).length;
    const fitnessToday=state.records.some(r=>r.type==='fitness'&&r.date===today);
    const habitRatio=state.habits.length?completed/state.habits.length:0;
    const taskRatio=todayTasks.length?doneTasks/todayTasks.length:0;
    const score=Math.min(100,Math.max(60,Math.round(60+habitRatio*20+taskRatio*12+(fitnessToday?8:0))));
    document.getElementById('lifeScore').textContent=score;
    document.getElementById('heroSummary').textContent=t(score>=85?'今天的节奏很好，也记得留一点空白。':score>=70?'已经在稳稳推进，继续保持自己的节奏。':'今天先从一件小事开始，慢慢来就好。');
    document.getElementById('monthExpense').textContent=money(monthExpense);
    document.getElementById('budgetHint').textContent=monthExpense>state.settings.budget?'已超出本月预算':`还可安排 ${money(Math.max(0,state.settings.budget-monthExpense))}`;
    document.getElementById('habitProgress').textContent=`${completed} / ${state.habits.length}`;
    document.getElementById('habitHint').textContent=completed===state.habits.length?'今天全部完成':'从一件小事开始';
    document.getElementById('taskProgress').textContent=`${todayTasks.filter(r=>!r.data.done).length} 件`;
    document.getElementById('taskHint').textContent=doneTasks?`已经完成 ${doneTasks} 件`:'节奏刚刚好';
    document.getElementById('dashboardTasks').innerHTML=todayTasks.length?todayTasks.slice(0,4).map(r=>taskRow(r)).join(''):empty('今天还没有待办，给自己留点空间');
    document.getElementById('dashboardHabits').innerHTML=state.habits.slice(0,5).map(h=>`<div class="habit-pill"><span class="habit-dot ${h.tone}"></span><strong>${habitNameHtml(h)}</strong><small>${t(habitDone(h)?'已完成':'待打卡')}</small><button class="check-btn ${habitDone(h)?'checked':''}" data-action="habit-quick" data-id="${h.id}">${habitDone(h)?icon('i-check'):''}</button></div>`).join('');
    const recent=sortedRecords().slice(0,5);document.getElementById('recentRecords').innerHTML=recent.length?recent.map(r=>{const meta=TYPE_META[r.type]||TYPE_META.home;return`<div class="timeline-item"><span class="record-icon ${meta.tone}">${icon(meta.icon)}</span><span><strong>${recordTitleHtml(r)}</strong><small>${escapeHtml(formatDateHeading(r.date))} · ${t(meta.label)}</small></span><span class="record-value">${escapeHtml(valueFor(r))}</span></div>`;}).join(''):empty('第一条记录，会从这里开始');
    document.getElementById('insightText').textContent=completed?'你不是在追赶完美，而是在让好习惯慢慢变得自然。':'规律不是把每天塞满，而是知道什么值得留下。';
  }

  function previousMonthKey(){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-1);return isoDate(d).slice(0,7);}
  function renderMoneyPie(expenses){
    const byCategory={};expenses.forEach(r=>byCategory[r.data.category]=(byCategory[r.data.category]||0)+Number(r.data.amount||0));
    const entries=Object.entries(byCategory).sort((a,b)=>b[1]-a[1]),total=sum(entries,e=>e[1]);
    const svg=document.getElementById('moneyPie'),legend=document.getElementById('moneyLegend');
    if(!total){svg.innerHTML='<circle cx="110" cy="110" r="72" fill="#e3e6ea"/><text x="110" y="115" text-anchor="middle" fill="#7f8389" font-size="12">暂无支出</text>';legend.innerHTML='';return;}
    const circumference=2*Math.PI*72;let offset=0;
    svg.innerHTML=`<circle cx="110" cy="110" r="72" fill="none" stroke="#e3e6ea" stroke-width="34"/>`+entries.map(([category,value],index)=>{const length=value/total*circumference;const item=`<circle cx="110" cy="110" r="72" fill="none" stroke="${CATEGORY_COLORS[index%CATEGORY_COLORS.length]}" stroke-width="34" stroke-dasharray="${length} ${circumference-length}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 110)"/>`;offset+=length;return item;}).join('')+`<circle cx="110" cy="110" r="40" fill="white" fill-opacity=".85"/><text x="110" y="102" text-anchor="middle" fill="#8d9095" font-size="10" font-weight="400">${t('本月支出')}</text><text x="110" y="124" text-anchor="middle" fill="#343639" font-size="20" font-weight="500" letter-spacing="-0.5">${escapeHtml(money(total))}</text>`;
    legend.innerHTML=entries.map(([category,value],index)=>`<div class="legend-item"><i style="background:${CATEGORY_COLORS[index%CATEGORY_COLORS.length]}"></i><span>${escapeHtml(category)}</span><b>${Math.round(value/total*100)}%</b></div>`).join('');
  }
  function renderMoney(){
    const month=isoDate().slice(0,7),prev=previousMonthKey(),records=sortedRecords('money');
    const monthly=records.filter(r=>r.date.startsWith(month)),expenses=monthly.filter(r=>r.data.flow==='expense');
    const expense=sum(expenses,r=>r.data.amount),income=sum(monthly.filter(r=>r.data.flow==='income'),r=>r.data.amount),remain=income-expense;
    const prevExpense=sum(records.filter(r=>r.date.startsWith(prev)&&r.data.flow==='expense'),r=>r.data.amount);
    document.getElementById('moneyIncome').textContent=money(income);document.getElementById('moneyExpense').textContent=money(expense);document.getElementById('moneyBalance').textContent=money(remain);
    if(prevExpense){const diff=expense-prevExpense,pct=Math.abs(diff/prevExpense*100).toFixed(0);document.getElementById('monthCompare').textContent=`比上月${diff>=0?'多':'少'}花了 ${money(Math.abs(diff))}`;document.getElementById('monthCompareDetail').textContent=`${diff>=0?'↑':'↓'} ${pct}% · 上月 ${money(prevExpense)}`;}else{document.getElementById('monthCompare').textContent='暂无对比';document.getElementById('monthCompareDetail').textContent='有了上月数据后，这里会显示变化';}
    const used=state.settings.budget?Math.round(expense/state.settings.budget*100):0;document.getElementById('budgetInput').value=state.settings.budget;document.getElementById('budgetBar').style.width=`${Math.min(100,used)}%`;document.getElementById('budgetUsedText').textContent=`已使用 ${used}%`;document.getElementById('budgetRemainText').textContent=`剩余 ${money(state.settings.budget-expense)}`;
    const alert=document.getElementById('moneyAlert'),todayCount=records.filter(r=>r.date===isoDate()).length;
    if(expense>state.settings.budget){alert.className='module-alert';alert.innerHTML=`<div><strong>本月支出已超预算 ${money(expense-state.settings.budget)}</strong><span>先看消费结构，再决定哪些支出可以放慢一点。</span></div>`;}else if(!todayCount){alert.className='module-alert good';alert.innerHTML='<div><strong>今天还没记账</strong><span>有空时补一笔，让月度趋势保持完整。</span></div>';}else if(state.settings.moneySinceExport>=20){alert.className='module-alert';alert.innerHTML='<div><strong>已新增 20 笔账目</strong><span>建议现在导出一次备份。</span></div>';}else alert.innerHTML='';
    const categories=[...new Set([...EXPENSE_CATEGORIES,...INCOME_CATEGORIES])];
    document.getElementById('moneyFilter').innerHTML='<option value="all">全部分类</option>'+categories.map(c=>`<option ${state.settings.moneyFilter===c?'selected':''}>${c}</option>`).join('');
    const filtered=records.filter(r=>state.settings.moneyFilter==='all'||r.data.category===state.settings.moneyFilter);document.getElementById('moneyList').innerHTML=filtered.length?filtered.slice(0,60).map(recordRow).join(''):empty('这个分类还没有流水');
    renderMoneyPie(expenses);
  }

  function renderHabits(){
    const today=isoDate(),done=state.habits.filter(h=>habitDone(h)).length,maxStreak=Math.max(0,...state.habits.map(habitBestStreak));
    const dates=Array.from({length:30},(_,i)=>shiftDate(i-29));let completedCells=0;
    state.habits.forEach(h=>dates.forEach(d=>{if(habitDone(h,d))completedCells++;}));
    document.getElementById('habitsDone').textContent=`${done} / ${state.habits.length}`;document.getElementById('habitsStreak').textContent=`${maxStreak} 天`;document.getElementById('habitRate').textContent=state.habits.length?`${Math.round(completedCells/(state.habits.length*30)*100)}%`:'0%';
    document.getElementById('dailyHabitList').innerHTML=state.habits.slice().sort((a,b)=>{const ad=habitDone(a)?1:0,bd=habitDone(b)?1:0;return ad-bd||String(a.name||'').localeCompare(String(b.name||''),'zh');}).map(h=>{const value=Number(h.entries?.[today]||0),isDone=habitDone(h),pulse=!isDone&&new Date().getHours()>=20,isBuiltIn=HABIT_DEFS.some(def=>def.key===h.key)||h.sample,hdef=HABIT_DEFS.find(d=>d.key===h.key),unit=h.type==='check'?localizedHtml('次'):hdef?escapeHtml(resolveHabitUnit(hdef)):isBuiltIn?localizedHtml(h.unit):userHtml(h.unit);let control='';if(h.type==='counter')control=`<div class="counter-control"><button data-action="habit-minus" data-id="${h.id}">${icon('i-minus')}</button><strong>${value}</strong><button data-action="habit-plus" data-id="${h.id}">${icon('i-plus')}</button></div>`;else if(h.type==='number')control=`<div class="sleep-control"><input data-action="habit-number" data-id="${h.id}" type="number" min="0" max="9999" step="0.1" value="${value||''}" placeholder="0"><span>${unit}</span></div>`;else control=`<button class="habit-check ${isDone?'checked':''}" data-action="habit-toggle" data-id="${h.id}">${isDone?icon('i-check'):''}</button>`;return`<div class="daily-habit ${isDone?'done':''} ${pulse?'pulse':''}"><button class="habit-card-delete" data-action="delete-habit-custom" data-id="${h.id}" aria-label="${t('删除习惯')}">${icon('i-trash')}</button><div><h3>${habitNameHtml(h)}</h3><p>${LANG==='en'?`Target ${h.target} ${unit} · ${habitStreak(h)}-day streak`:`目标 ${h.target} ${unit} · 连续 ${habitStreak(h)} 天`}</p></div><div class="habit-action"><span class="habit-state">${t(isDone?'已完成':'待完成')}</span>${control}</div></div>`;}).join('');
    /* v48 对齐修复：dates[i] = shiftDate(i-29)，故该列"距今天数"= 29-i。
     * 旧公式 Math.round(28-i*26/25) 与真实偏移整体错一位且未锚定到今天，导致表头与格子对不上。
     * 现在每 5 列标一次、从最右(今天)向左对齐，今天显示"今"。 */
    const header=`<div class="heatmap-header"><span></span>${dates.map((d,i)=>{const ago=29-i;return`<span${ago===0?' class="heat-today"':''}>${ago%5===0?(ago===0?t('今'):String(ago)):''}</span>`;}).join('')}</div>`;
    document.getElementById('habitHeatmap').innerHTML=header+state.habits.map(h=>`<div class="heatmap-row"><span class="heatmap-name">${habitNameHtml(h)}<i class="streak-badge">${LANG==='en'?`${habitBestStreak(h)} days`:`${habitBestStreak(h)} 天`}</i></span>${dates.map(date=>{const value=Number(h.entries?.[date]||0);return`<span class="heat-cell ${habitDone(h,date)?'done':value?'partial':''}" title="${date}${LANG==='en'?': ':'：'}${value||t('未完成')}"></span>`;}).join('')}</div>`).join('');
  }

  function fitnessStats(){
    const records=sortedRecords('fitness',true).filter(r=>r.data&&r.data.weight),profile=state.settings.fitnessProfile||{};
    const current=records.length?Number(records.at(-1).data.weight):(Number(profile.startWeight)||0);
    const target=Number(profile.target)||0,height=Number(profile.height)||165;
    /* v33 目标进度修复：
     * start(起点) 不能再取 startWeight==current 的退化情形（此时 (start-current)/(start-target)=0 → 进度恒 0）。
     * 优先用 profile.startWeight；若它 ≤ 当前(说明被误设成最新体重)，回退到"历史最早一次记录体重"作为真实起步值；
     * 若历史最早也不高于当前，则保留 startWeight 本身。 */
    let start = profile.startWeight ? Number(profile.startWeight) : 0;
    const recStart = records.length ? Number(records[0].data.weight) : 0;
    if (!(start > current)) {
      if (recStart && recStart > start) start = recStart;
      if (!(start > current) && recStart) start = recStart;   // 连最早记录都不高于当前，也用它兜底
    }
    if (!(start>0)) start = current>0? current : 60;
    if (!(target>0)) target = 55;
    const bmi=current&&height?current/((height/100)**2):0;let dailyRate=0;
    if(records.length>=2){const first=records[0],last=records.at(-1),days=Math.max(1,(new Date(last.date)-new Date(first.date))/86400000);dailyRate=((first.data.weight||0)-(last.data.weight||0))/days;}
    const bmr=10*current+6.25*height-5*(profile.age||30)+(profile.sex==='male'?5:-161),tdee=bmr*Number(profile.activity||1.375);
    const calorieRecords=records.filter(r=>Number(r.data.calories)>0),avgIntake=calorieRecords.length?sum(calorieRecords,r=>r.data.calories)/calorieRecords.length:0,deficit=avgIntake?tdee-avgIntake:0;
    if(dailyRate<=0&&deficit>0)dailyRate=deficit/7700;
    const remaining=Math.max(0,current-target);
    const days=remaining&&dailyRate>0?Math.ceil(remaining/dailyRate):null;
    /* 进度：已达目标→100；分母(start-target)非正视为无有效区间→0（不除0） */
    let progress;
    if(current<=target){ progress=100; }
    else { const denom=start-target; progress=denom>0?clamp((start-current)/denom*100,0,100):(start>current?100:0); }
    return{records,profile,current,start,target,bmi,bmr,tdee,avgIntake,deficit,remaining,days,progress};
  }
  /* v33: 减脂健身的「骨骼肌趋势图」——只画记录了骨骼肌的记录，主曲线=骨骼肌、虚线=7日均值 */
  function drawWeightChart(records){
    const svg=document.getElementById('weightChart');
    const points=(records||[]).filter(r=>r && r.data && r.data.skeletalMuscle!=null && r.data.skeletalMuscle!=='' && Number(r.data.skeletalMuscle)>0).slice(-30);
    if(points.length<2){svg.innerHTML='<text x="380" y="140" text-anchor="middle" fill="#7f8389" font-size="14" font-family="Inter, PingFang SC, sans-serif">再记录一天骨骼肌，就能看到趋势</text>';return;}
    const values=points.map(r=>Number(r.data.skeletalMuscle)),averages=values.map((_,i)=>{const slice=values.slice(Math.max(0,i-6),i+1);return sum(slice,x=>x)/slice.length;});
    const rawMin=Math.min(...values,...averages),rawMax=Math.max(...values,...averages),step=Math.max(.2,Math.ceil((rawMax-rawMin)/4*10)/10),axisMin=Math.floor((rawMin-step)*10)/10,axisMax=Math.ceil((rawMax+step)*10)/10;
    const w=760,h=280,pad={l:62,r:24,t:20,b:42},x=i=>pad.l+i*(w-pad.l-pad.r)/(points.length-1),y=v=>pad.t+(axisMax-v)*(h-pad.t-pad.b)/(axisMax-axisMin),path=arr=>arr.map((v,i)=>`${i?'L':'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const ticks=4,grid=Array.from({length:ticks+1},(_,i)=>{const gy=pad.t+i*(h-pad.t-pad.b)/ticks,val=axisMax-i*(axisMax-axisMin)/ticks;return`<line x1="${pad.l}" x2="${w-pad.r}" y1="${gy}" y2="${gy}" stroke="#dadde2" stroke-width="1"/><text x="${pad.l-12}" y="${gy+4}" text-anchor="end" fill="#72767c" font-size="11" font-weight="500" font-family="Inter, PingFang SC, sans-serif">${val.toFixed(1)}</text>`;}).join('');
    const labelEvery=Math.max(1,Math.ceil(points.length/5)),labels=points.map((r,i)=>(i%labelEvery===0||i===points.length-1)?`<text x="${x(i)}" y="${h-12}" text-anchor="middle" fill="#72767c" font-size="10" font-weight="500" font-family="Inter, PingFang SC, sans-serif">${r.date.slice(5).replace('-','/')}</text>`:'').join('');
    svg.innerHTML=`${grid}<path d="${path(values)}" fill="none" stroke="var(--plum)" stroke-width="3" vector-effect="non-scaling-stroke"/><path d="${path(averages)}" fill="none" stroke="#8a94a6" stroke-width="2.5" stroke-dasharray="7 5" vector-effect="non-scaling-stroke"/>${values.map((v,i)=>`<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#fff" stroke="var(--plum)" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join('')}${labels}`;
  }
  function renderFitness(){
    const s=fitnessStats(),latest=s.records.at(-1),today=s.records.some(r=>r.date===isoDate());
    document.getElementById('latestWeight').textContent=`${Number(s.current).toFixed(1)} kg`;document.getElementById('weightRemain').textContent=LANG==='en'?`${s.remaining.toFixed(1)} kg`:`${(s.remaining*2).toFixed(1)} 斤`;document.getElementById('currentBmi').textContent=s.bmi.toFixed(1);
    const progress=s.progress;document.getElementById('fitnessPercent').textContent=`${Math.round(progress)}%`;document.getElementById('fitnessProgressBar').style.width=`${progress}%`;document.getElementById('fitnessStartText').textContent=`起点 ${s.start} kg`;document.getElementById('fitnessTargetText').textContent=`目标 ${s.target} kg`;document.getElementById('fitnessEstimate').textContent=s.remaining<=0?'目标已达成，进入稳定期':s.days?`按当前趋势，约还需 ${s.days} 天`:'多记录几天后估算达成时间';
    const advice=document.getElementById('calorieAdvice');if(!s.avgIntake){advice.className='health-note';advice.textContent=`按 Mifflin–St Jeor 公式估算，当前每日消耗约 ${Math.round(s.tdee)} kcal。记录饮食后可判断热量缺口。`;}else if(s.deficit<500||s.deficit>750){advice.className='health-note warning';advice.textContent=`当前估算每日热量缺口 ${Math.round(s.deficit)} kcal，不在健康建议的 500–750 kcal 范围内，请调整饮食或运动。`;}else{advice.className='health-note';advice.textContent=`当前估算每日热量缺口 ${Math.round(s.deficit)} kcal，在建议的 500–750 kcal 范围内。`}
    const alert=document.getElementById('fitnessAlert'),planLeft=state.settings.weeklyPlan.filter(x=>!x.done).length;alert.className=`module-alert ${today&&planLeft===0?'good':''}`;alert.innerHTML=!today?'<div><strong>今天还没称重</strong><span>尽量在相似时间、相似状态下记录，关注 7 天平均线。</span></div>':planLeft?`<div><strong>本周计划还有 ${planLeft} 项</strong><span>不用追赶，选一项适合今天状态的完成。</span></div>`:'<div><strong>今天已记录，本周计划也完成了</strong><span>做得很好，记得给身体留恢复时间。</span></div>';
    drawWeightChart(s.records);const donePlan=state.settings.weeklyPlan.filter(x=>x.done).length;document.getElementById('planProgress').textContent=LANG==='en'?`${donePlan} / ${state.settings.weeklyPlan.length} completed`:`${donePlan} / ${state.settings.weeklyPlan.length} 已完成`;document.getElementById('weeklyPlan').innerHTML=state.settings.weeklyPlan.length?state.settings.weeklyPlan.slice().sort((a,b)=>(a.done?1:0)-(b.done?1:0)).map(item=>{const isDefault=DEFAULT_PLAN.some(plan=>plan.id===item.id),title=isDefault?(LANG==='en'&&item.titleEn?item.titleEn:localizedHtml(item.title)):userHtml(item.title),note=isDefault?(LANG==='en'&&item.noteEn?item.noteEn:localizedHtml(item.note)):userHtml(item.note);return`<div class="plan-item ${item.done?'done':''}"><button class="check-btn ${item.done?'checked':''}" data-action="toggle-plan" data-id="${item.id}">${item.done?icon('i-check'):''}</button><span><strong>${title}</strong><small>${t(item.group)} · ${note}</small></span><button class="plan-delete" data-action="delete-plan" data-id="${item.id}" aria-label="${t('删除计划')}">${icon('i-trash')}</button></div>`;}).join(''):empty('还没有周计划，点击右上角新增一项');
    document.getElementById('fitnessList').innerHTML=s.records.length?s.records.slice().reverse().slice(0,20).map(fitnessRow).join(''):empty('记录体重和体脂，关注趋势而不是单日数字');
    renderFitnessAI(s);
    renderPlanHistory();
  }

  function renderFitnessAI(s){
    var card=document.getElementById('fitnessAIAnalysis');if(!card)return;
    var latest=s.records.at(-1);if(!latest){card.innerHTML='';return;}
    var d=latest.data,analysis=[],bmi=s.bmi;
    var tagColor={'良好':'#5f8a70','偏高':'#b0524a','偏低':'#b08a3e','正常':'#5f8a70'};
    analysis.push('<span class="ai-badge">AI 健康分析</span>');
    analysis.push('<h3>基于最近数据的智能解读</h3>');
    if(bmi>0){
      if(bmi<18.5)analysis.push('<p><b>BMI '+bmi.toFixed(1)+'</b> — 偏瘦。建议适当增加优质蛋白质和碳水摄入，配合力量训练增加肌肉量。</p>');
      else if(bmi<24)analysis.push('<p><b>BMI '+bmi.toFixed(1)+'</b> — 正常范围，继续保持当前的生活节奏。</p>');
      else if(bmi<28)analysis.push('<p><b>BMI '+bmi.toFixed(1)+'</b> — 超重。建议控制每日热量摄入在 '+Math.round(s.tdee-500)+' kcal 左右，保持 500 kcal 缺口。</p>');
      else analysis.push('<p><b>BMI '+bmi.toFixed(1)+'</b> — 肥胖。建议咨询专业人士制定减重计划，从低强度运动开始。</p>');
    }
    if(d.bodyFat!=null){
      var bf=d.bodyFat;
      if(bf>25)analysis.push('<p><b>体脂率 '+bf+'%</b> — 偏高。建议增加有氧运动频次至每周 3-4 次，关注饮食结构中脂肪占比。</p>');
      else if(bf>18)analysis.push('<p><b>体脂率 '+bf+'%</b> — 在健康范围内，可继续保持。</p>');
      else analysis.push('<p><b>体脂率 '+bf+'%</b> — 较低，肌肉线条应比较明显。注意保证必要脂肪摄入。</p>');
    }
    if(d.bodyFatKg!=null&&d.skeletalMuscle!=null){
      var ratio=(d.skeletalMuscle/(d.bodyFatKg||1)).toFixed(2);
      analysis.push('<p><b>骨骼肌/体脂肪比 '+ratio+'</b> — '+(ratio>1?'肌肉量充足，代谢基础好':ratio>0.6?'肌肉量适中，可适当增加力量训练':'肌肉量偏少，建议增加蛋白质摄入和力量训练')+'。</p>');
    }
    if(d.bodyWater!=null){
      var wp=(d.bodyWater/(latest.data.weight||1)*100).toFixed(1);
      analysis.push('<p><b>身体水分占比 '+wp+'%</b> — '+(wp>55?'水分充足':wp>45?'正常':'偏低，建议多喝水')+'。</p>');
    }
    if(d.bmr!=null){
      analysis.push('<p><b>基础代谢 '+d.bmr+' kcal</b> — 加上日常活动，每日总消耗约 '+Math.round(s.tdee)+' kcal。</p>');
    }
    if(d.waistHipRatio!=null){
      var whr=d.waistHipRatio;
      analysis.push('<p><b>腰臀比 '+whr+'</b> — '+(whr>0.9?'内脏脂肪偏高，建议减少精制碳水':whr>0.8?'正常范围':'体型分布健康')+'。</p>');
    }
    if(d.bodyAge!=null){
      var diff=d.bodyAge-(state.settings.fitnessProfile?.age||30);
      analysis.push('<p><b>身体年龄 '+d.bodyAge+' 岁</b> — '+(diff<0?'比实际年龄年轻 '+Math.abs(diff)+' 岁，状态很好':diff>0?'比实际年龄大 '+diff+' 岁，建议调整生活方式':'与实际年龄一致')+'。</p>');
    }
    if(s.deficit&&s.avgIntake){
      if(s.deficit<500)analysis.push('<p><b>热量缺口 '+Math.round(s.deficit)+' kcal</b> — 偏小，减脂速度较慢。可适当减少 100-200 kcal 摄入或增加运动量。</p>');
      else if(s.deficit>750)analysis.push('<p><b>热量缺口 '+Math.round(s.deficit)+' kcal</b> — 偏大，长期可能影响代谢。建议增加 100-200 kcal 摄入。</p>');
      else analysis.push('<p><b>热量缺口 '+Math.round(s.deficit)+' kcal</b> — 在理想范围内，保持下去即可。</p>');
    }
    if(analysis.length<=2)analysis.push('<p>多记录几天数据后，AI 会给出更详细的健康解读和建议。</p>');
    card.innerHTML=analysis.join('');
  }

  function groupByDate(records){return records.reduce((groups,r)=>{(groups[r.date]||=[]).push(r);return groups;},{});}
  /* 日程拖动排序：拖动 task-drag 行在同一天内重排，持久化 via createdAt 重排 */
  var _dragRow=null,_dragDate='',_dragMoved=false,_dragStartY=0,_dragActive=false;
  function _dragTaskFrom(e,row){
    _dragRow=row; _dragDate=row.dataset.date; _dragMoved=false; _dragStartY=(e.clientY!=null?e.clientY:0); _dragActive=false;
    row.classList.add('dragging');
  }
  /* 在同一天内、按指针纵坐标落到哪一行的中点决定插入位置，实时移动 DOM 行 */
  function _plannerInsertBefore(parent,pointerY){
    if(!_dragRow||parent!==_dragRow.parentNode)return;
    var rows=[].slice.call(parent.querySelectorAll('.task-drag')).filter(function(r){return r!==_dragRow;});
    var before=null;
    for(var i=0;i<rows.length;i++){
      var rc=rows[i].getBoundingClientRect?rows[i].getBoundingClientRect():{top:i*48,height:48};
      if(pointerY < rc.top + (rc.height||48)/2){ before=rows[i]; break; }
    }
    parent.querySelectorAll('.task-drag.drag-over-top,.task-drag.drag-over-bottom').forEach(function(r){r.classList.remove('drag-over-top','drag-over-bottom');});
    if(before){ var b=before.getBoundingClientRect?before.getBoundingClientRect():{top:0,height:48}; before.classList.add(pointerY < b.top+(b.height||48)/2?'drag-over-top':'drag-over-bottom'); }
    var curBefore=_dragRow.nextSibling;
    if(curBefore===before)return;
    if(_dragRow===before)return;
    parent.insertBefore(_dragRow,before);
    _dragMoved=true;
  }
  function _commitPlannerOrder(){
    if(!_dragRow){return;}
    _dragRow.classList.remove('dragging'); var moved=_dragMoved;
    _dragRow=null; _dragDate=''; _dragMoved=false; _dragActive=false;
    document.querySelectorAll('.task-drag.drag-over-top,.task-drag.drag-over-bottom').forEach(function(r){r.classList.remove('drag-over-top','drag-over-bottom');});
    if(!moved)return;
    var dateGroups={};
    document.querySelectorAll('#plannerList .date-group').forEach(function(g){
      var body=g.querySelector('.group-body'); if(!body)return;
      var ids=Array.prototype.map.call(body.querySelectorAll('.task-drag'),function(r){return r.dataset.id;});
      var first=body.querySelector('.task-drag'); var date=first?first.getAttribute('data-date'):null;
      if(ids.length&&date) dateGroups[date]=ids;
    });
    var changed=false;
    Object.keys(dateGroups).forEach(function(date){
      var ids=dateGroups[date],recs=state.records.filter(function(r){return r.type==='planner'&&r.date===date;});
      var rank={}; ids.forEach(function(id,i){rank[id]=i;});
      if(!recs.some(function(r){return rank[r.id]!=null;}))return;
      recs.sort(function(a,b){var ra=rank[a.id],rb=rank[b.id];if(ra!=null&&rb!=null)return ra-rb;if(ra!=null)return -1;if(rb!=null)return 1;return (a.createdAt||0)-(b.createdAt||0);});
      var minAt=Math.min.apply(null,recs.map(function(r){return (r.createdAt!=null)?r.createdAt:Date.now();}));
      recs.forEach(function(r,i){ if(rank[r.id]!=null) r.createdAt=minAt+i; });
      changed=true;
    });
    if(changed){ saveState(); renderPlanner(); toast('顺序已调整'); }
  }
  function initPlannerDrag(){
    var list=document.getElementById('plannerList'); if(!list||list._dragBound)return; list._dragBound=true;
    /* 按下：只在「日程行且不在按钮上」时进入拖拽候选（去掉原生 draggable，避免鼠标被 HTML5 拖拽劫持） */
    list.addEventListener('pointerdown',function(e){
      if(_dragRow)return;
      var row=findAncestor(e.target,function(el){return el.classList&&el.classList.contains('task-drag');});
      if(!row)return;
      if(findAncestor(e.target,function(el){return el.classList&&(el.classList.contains('delete-btn')||el.classList.contains('check-btn')||el.classList.contains('habit-number'));}))return;
      /* 左键/触摸主触点才拖拽；右键忽略 */
      if(e.button!==undefined&&e.button!==0&&e.pointerType==='mouse')return;
      _dragTaskFrom(e,row);
    },true);
    /* 移动/抬起挂到 document：保证手指或鼠标移出行外仍能继续拖动 */
    function onDragMove(e){
      if(!_dragRow)return;
      var y=(e.clientY!=null)?e.clientY:0;
      if(!_dragActive){
        if(Math.abs(y-_dragStartY)<8)return;   /* 8px 阈值，先允许滚动 */
        _dragActive=true;
      }
      var par=_dragRow.parentNode;
      if(par)_plannerInsertBefore(par,y);
      if(e.cancelable)e.preventDefault();
    }
    function onDragEnd(){ if(_dragRow)_commitPlannerOrder(); }
    document.addEventListener('pointermove',onDragMove,true);
    document.addEventListener('pointerup',onDragEnd,true);
    document.addEventListener('pointercancel',onDragEnd,true);
    document.addEventListener('pointerleave',function(e){ if(_dragRow&&e.pointerType==='mouse'&&!e.buttons)onDragEnd(); },true);
  }
  function renderPlanner(){
    const records=sortedRecords('planner'),today=isoDate(),weekEnd=shiftDate(6),filter=state.settings.plannerFilter;
    document.getElementById('plannerToday').textContent=records.filter(r=>r.date===today&&!r.data.done).length;document.getElementById('plannerOverdue').textContent=records.filter(r=>r.date<today&&!r.data.done).length;document.getElementById('plannerWeek').textContent=records.filter(r=>r.date>=today&&r.date<=weekEnd&&!r.data.done).length;
    document.getElementById('weekStrip').innerHTML=Array.from({length:7},(_,i)=>{const date=shiftDate(i),d=new Date(`${date}T00:00:00`),count=records.filter(r=>r.date===date&&!r.data.done).length,weekdays=LANG==='en'?['Sun','Mon','Tue','Wed','Thu','Fri','Sat']:['日','一','二','三','四','五','六'];return`<div class="week-day ${i===0?'today':''}"><span>${weekdays[d.getDay()]}</span><strong>${d.getDate()}</strong><small>${count?(LANG==='en'?`${count} items`:`${count} 项`):t('留白')}</small></div>`;}).join('');
    document.querySelectorAll('[data-planner-filter]').forEach(b=>b.classList.toggle('active',b.dataset.plannerFilter===filter));
    const filtered=records.filter(r=>filter==='all'||(filter==='today'&&r.date===today&&!r.data.done)||(filter==='scheduled'&&r.date>=today&&!r.data.done)||(filter==='done'&&r.data.done));const groups=Object.entries(groupByDate(filtered)).sort((a,b)=>b[0].localeCompare(a[0]));
    /* v42: 智能清单按「天」倒序（最新在前），每页展示最近两整天；用分页替代滚动条 */
    const PLAN_DAYS_PER_PAGE=2;
    const totalPages=Math.max(1,Math.ceil(groups.length/PLAN_DAYS_PER_PAGE));
    if(!state.settings.plannerPage)state.settings.plannerPage=1;
    let page=Number(state.settings.plannerPage)||1;
    if(page<1)page=1;
    if(page>totalPages)page=totalPages;
    state.settings.plannerPage=page;
    const pageGroups=groups.slice((page-1)*PLAN_DAYS_PER_PAGE,page*PLAN_DAYS_PER_PAGE);
    document.getElementById('plannerList').innerHTML=pageGroups.length?pageGroups.map(([date,items])=>`<details class="date-group" open><summary><strong>${formatDateHeading(date)}</strong><span>${items.filter(x=>!x.data.done).length} 件待完成</span></summary><div class="group-body planner-drop">${items.map(r=>`<div class="task-drag" data-date="${date}" data-id="${r.id}">${taskRow(r,true)}</div>`).join('')}</div></details>`).join(''):empty('这个智能清单里暂时没有事项');
    const plannerPager=document.getElementById('plannerPager');
    if(plannerPager){
      plannerPager.innerHTML=totalPages>1?`<button class="btn ghost compact" data-action="planner-prev" ${page<=1?'disabled':''}>‹ 上一组</button><span class="planner-pgmid">${page} / ${totalPages} · 每组最近 ${PLAN_DAYS_PER_PAGE} 天</span><button class="btn ghost compact" data-action="planner-next" ${page>=totalPages?'disabled':''}>下一组 ›</button>`:'';
    }
  }
  /* v33 四象限：按 quadrant 字段把「未完成」待办分组到 2×2 区域；可点勾完成 / 用覆盖下拉改象限 */
  const QUADRANTS=[['重要紧急','立刻去做',1],['重要不紧急','计划去做',2],['紧急不重要','授权/快办',3],['不重要不紧急','尽量少做',4]];
  function renderQuadrant(){
    const el=document.getElementById('quadrantGrid');if(!el)return;
    const all=sortedRecords('planner');
    const today=isoDate();
    el.innerHTML=QUADRANTS.map(([name,sub,cid])=>{
      const items=all.filter(r=>!r.data.done && (r.data.quadrant===name || (!r.data.quadrant&&cid===1))).slice(0,8);
      const body=items.length?items.map(r=>{const tt=r.sample?(LANG==='en'&&r.data.titleEn?r.data.titleEn:localizedHtml(r.data.title)):userHtml(r.data.title);const overdue=r.date<today;const due=r.date===today?'今天':r.date;return`<div class="quad-task"><button class="check-btn ${r.data.done?'checked':''}" data-action="toggle-task" data-id="${r.id}" aria-label="完成">${r.data.done?icon('i-check'):''}</button><div class="qt-body ${r.data.done?'done':''}"><strong>${tt}</strong><small>${overdue?'<span style="color:var(--red)">已逾期</span>':''}${due}${r.data.time?' · '+escapeHtml(r.data.time):''}</small></div><div class="quad-shift"><button type="button" tabindex="-1">${icon('i-more')}</button><select data-action="quad-move" data-id="${r.id}" aria-label="改象限"><option value="重要紧急" ${name==='重要紧急'?'selected':''}>重要紧急</option><option value="重要不紧急" ${name==='重要不紧急'?'selected':''}>重要不紧急</option><option value="紧急不重要" ${name==='紧急不重要'?'selected':''}>紧急不重要</option><option value="不重要不紧急" ${name==='不重要不紧急'?'selected':''}>不重要不紧急</option></select></div></div>`;}).join(''):'<div class="quad-cell-empty">暂无待办</div>';
      return`<div class="quadrant-cell q${cid}"><div class="quadrant-head"><b>${name}</b><span class="mini-note">${sub}</span></div><div class="quad-tasks">${body}</div></div>`;
    }).join('');
  }

  /* v57 重复日程：统计同名日程（历史全部+当前）的添加→完成节奏，自动/一键生成下次待完成日程 */
  function _tsToIso(ts){const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function analyzePlannerRepeats(){
    const groups={};
    state.records.forEach(r=>{if(r.type!=='planner'||r.sample)return;const key=(r.data.title||'').trim();if(!key)return;(groups[key]=groups[key]||[]).push(r);});
    const out=[];
    Object.keys(groups).forEach(key=>{
      const g=groups[key];if(g.length<2)return;
      const done=g.filter(r=>r.data.done).slice().sort((a,b)=>((a.data.doneAt||0)-(b.data.doneAt||0))||a.date.localeCompare(b.date));
      const intervals=[];
      done.forEach(r=>{const st=Number(r.createdAt||0),en=Number(r.data.doneAt||0);if(en>st)intervals.push((en-st)/86400000);});
      if(!intervals.length&&done.length>=2){for(let i=1;i<done.length;i++){const dd=(new Date(done[i].date+'T00:00:00')-new Date(done[i-1].date+'T00:00:00'))/86400000;if(dd>0)intervals.push(dd);}}
      const avgDays=intervals.length?Math.max(1,Math.round(intervals.reduce((a,b)=>a+b,0)/intervals.length)):0;
      const last=done[done.length-1];
      const baseDate=last?((last.data.doneAt?_tsToIso(last.data.doneAt):last.date)):'';
      const nextDate=(baseDate&&avgDays>0)?shiftDate(avgDays,new Date(baseDate+'T00:00:00')):'';
      out.push({title:key,count:g.length,doneCount:done.length,pendingCount:g.length-done.length,avgDays,lastDoneDate:last?baseDate:'',nextDate,hasPending:g.some(r=>!r.data.done),template:last?{time:last.data.time||'',priority:last.data.priority||'normal',list:last.data.list||'生活',note:last.data.note||'',remind:!!last.data.remind,quadrant:last.data.quadrant||'重要紧急'}:null});
    });
    out.sort((a,b)=>(b.doneCount-a.doneCount)||(b.count-a.count));
    return out;
  }
  function createNextRepeat(item){
    if(!item||!item.nextDate||!item.template)return false;
    if(state.records.some(r=>r.type==='planner'&&!r.sample&&!r.data.done&&((r.data.title||'').trim()===item.title)))return 'exists';
    return !!addRecord('planner',item.nextDate,{title:item.title,time:item.template.time,priority:item.template.priority,list:item.template.list,note:item.template.note,remind:item.template.remind,done:false,quadrant:item.template.quadrant});
  }
  function maybeAutoNextRepeat(task){
    try{
      if(state.settings.plannerAutoNext===false)return;
      if(!task||task.sample)return;
      const title=(task.data.title||'').trim();if(!title)return;
      const item=analyzePlannerRepeats().find(x=>x.title===title);
      if(!item||!item.nextDate)return;
      const res=createNextRepeat(item);
      if(res===true)toast('已按约 '+item.avgDays+' 天的节奏，自动把下次排到 '+formatDateHeading(item.nextDate));
    }catch(e){}
  }
  var _plannerRepeats=[];
  function renderPlannerRepeats(){
    const el=document.getElementById('plannerRepeatList');if(!el)return;
    const btn=document.getElementById('autoRepeatBtn');
    if(btn)btn.textContent=(state.settings.plannerAutoNext===false?'自动生成：关':'自动生成：开');
    _plannerRepeats=analyzePlannerRepeats();
    el.innerHTML=_plannerRepeats.length?_plannerRepeats.map((it,i)=>{
      const stat='历史 '+it.count+' 次 · 已完成 '+it.doneCount+(it.pendingCount?(' · 待完成 '+it.pendingCount):'')+(it.lastDoneDate?(' · 上次完成 '+formatDateHeading(it.lastDoneDate)):'');
      const next=it.nextDate?('建议下次：'+formatDateHeading(it.nextDate)+'（平均每 '+it.avgDays+' 天）'):'完成节奏数据还不足，暂不能推算下次日期';
      const action=it.nextDate?('<button class="btn ghost compact" data-action="gen-repeat" data-idx="'+i+'">生成下次</button>'):'';
      return '<div class="repeat-row"><span class="repeat-main"><strong>'+escapeHtml(it.title)+'</strong><small>'+escapeHtml(stat)+'</small><small class="repeat-next">'+escapeHtml(next)+'</small></span>'+action+'</div>';
    }).join(''):'<div class="quad-cell-empty">还没有重复出现的日程——同一件事安排两次以上，就会在这里出现节奏分析</div>';
  }
  function renderHome(){
    const records=sortedRecords('home'),filter=state.settings.shoppingFilter,month=isoDate().slice(0,7),pending=records.filter(r=>!r.data.bought),bought=records.filter(r=>r.data.bought);
    document.getElementById('homeTotal').textContent=pending.length;document.getElementById('homeBudget').textContent=money(sum(pending,r=>r.data.price));document.getElementById('homeBought').textContent=bought.filter(r=>(r.data.boughtDate||r.date).startsWith(month)).length;
    document.querySelectorAll('[data-shopping-filter]').forEach(b=>b.classList.toggle('active',b.dataset.shoppingFilter===filter));const filtered=records.filter(r=>filter==='all'||(filter==='pending'&&!r.data.bought)||(filter==='bought'&&r.data.bought));
    document.getElementById('homeList').innerHTML=filtered.length?filtered.map(r=>{const name=r.sample?localizedHtml(r.data.name):userHtml(r.data.name),quantity=r.sample?localizedHtml(r.data.quantity||'数量未填'):userHtml(r.data.quantity||t('数量未填')),note=r.data.note?(r.sample?` · ${localizedHtml(r.data.note)}`:` · ${userHtml(r.data.note)}`):'';return`<div class="shopping-row ${r.data.bought?'bought':''}"><button class="check-btn ${r.data.bought?'checked':''}" data-action="toggle-shopping" data-id="${r.id}">${r.data.bought?icon('i-check'):''}</button><span class="shopping-main"><strong>${r.data.priority==='high'?'<i class="urgent-dot"></i>':''}${name}</strong><small>${quantity} · ${localizedHtml(r.data.category||'其他')}${note}</small></span><span class="shopping-price"><strong>${r.data.price?money(r.data.price):t('待定')}</strong><small>${t(r.data.bought?'已买':'预计')}</small></span><button class="delete-btn" data-action="delete" data-id="${r.id}" aria-label="${t('删除')}">${icon('i-trash')}</button></div>`;}).join(''):empty(filter==='pending'?'待买清单已经清空':'这里还没有物品');
  }

  function _dietMealCard(date,items,today){
    const mealMap={'早餐':'早餐','午餐':'午餐','晚餐':'晚餐','加餐':'加餐'};
    return `<section class="date-card ${date===today?'today':''}"><header><strong>${formatDateHeading(date)}</strong><span class="dc-sub">${sum(items,r=>r.data.calories)} kcal · ${items.length} 餐</span></header><div class="dc-body">${items.map(r=>{const food=r.sample?localizedHtml(r.data.food):userHtml(r.data.food||t('饮食记录')),portion=r.data.portion?(r.sample?localizedHtml(r.data.portion):userHtml(r.data.portion)):'',note=r.data.note?(r.sample?localizedHtml(r.data.note):userHtml(r.data.note)):'';return`<div class="diet-meal-row"><span class="meal-chip">${t(mealMap[r.data.meal]||r.data.meal||'早餐')}</span><span class="diet-food"><strong>${food}</strong><small>${portion}${note?` · ${note}`:''}</small></span><span class="diet-cal">${r.data.calories||0} kcal</span><button class="delete-btn" data-action="delete" data-id="${r.id}" aria-label="${t('删除')}">${icon('i-trash')}</button></div>`;}).join('')}</div></section>`;
  }
  function renderDiet(){
    const records=sortedRecords('diet',true),today=isoDate(),todayRecords=records.filter(r=>r.date===today);
    const todayCalories=sum(todayRecords,r=>r.data.calories);
    const _c0=document.getElementById('dietTodayCount');if(_c0)_c0.textContent=todayRecords.length;
    const _c1=document.getElementById('dietTodayCalories');if(_c1)_c1.textContent=todayCalories+' kcal';
    /* v35 展示法：按「天」倒序，每页展示「最近的两整天」的全部记录（页 1=今天+昨天），
     * 每张天卡内所有餐全量展开、永不折叠 → 任一页都不会再出现「同一天看不全」。
     * 顶部另提供「按日期查询」，跳到任意一天单独完整查看。 */
    const groups=Object.entries(groupByDate(records)).sort((a,b)=>b[0].localeCompare(a[0]));
    const DIET_DAYS_PER_PAGE=2;
    const totalPages=Math.max(1,Math.ceil(groups.length/DIET_DAYS_PER_PAGE));
    if(!state.settings.dietPage)state.settings.dietPage=1;
    let page=Number(state.settings.dietPage)||1;
    if(page<1)page=1;
    if(page>totalPages)page=totalPages;
    state.settings.dietPage=page;
    const _search=(state.settings.dietSearchDate||'').trim();
    const inSearch=_search && groups.some(g=>g[0]===_search);
    const pageGroups=inSearch?groups.filter(g=>g[0]===_search):groups.slice((page-1)*DIET_DAYS_PER_PAGE,page*DIET_DAYS_PER_PAGE);
    const _listEl=document.getElementById('dietList');
    if(_listEl){
      _listEl.innerHTML=pageGroups.length?pageGroups.map(([date,items])=>_dietMealCard(date,items,today)).join(''):(inSearch?empty(`这一天（${escapeHtml(_search)}）没有饮食记录`):empty('还没有饮食记录'));
    }
    /* 顶部搜索框回显当前查询日期 */
    const searchIn=document.getElementById('dietSearchDate');
    if(searchIn){ if(searchIn.value!==_search) searchIn.value=_search; }
    /* 底部通用分页条 */
    const dietPager=document.getElementById('dietPager');
    if(dietPager){
      if(inSearch){
        dietPager.innerHTML=`<button data-action="diet-search-clear">返回最近记录</button><span>正在查看 ${escapeHtml(_search)} · 共 ${pageGroups.length?pageGroups[0][1].length:0} 餐</span>`;
      } else {
        dietPager.innerHTML=totalPages>1?`<button data-action="diet-prev" ${page<=1?'disabled':''}>上一页</button><span>第 ${page} / ${totalPages} 组 · 每组最近 ${DIET_DAYS_PER_PAGE} 天 · 共 ${records.length} 餐</span><button data-action="diet-next" ${page>=totalPages?'disabled':''}>下一页</button>`:'';
      }
    }
    /* 顶部「上一组/下一组」快捷按钮 */
    const pgbtns=document.getElementById('dietPgbtns');
    if(pgbtns){
      if(inSearch){
        pgbtns.innerHTML='<span class="diet-pghint">按日期查询中</span>';
      } else if(totalPages>1){
        pgbtns.innerHTML=`<button class="btn ghost compact" data-action="diet-prev" ${page<=1?'disabled':''}>‹ 上一组</button><span class="diet-pgmid">${page} / ${totalPages}</span><button class="btn ghost compact" data-action="diet-next" ${page>=totalPages?'disabled':''}>下一组 ›</button>`;
      } else {
        pgbtns.innerHTML='';
      }
    }
    renderDietPlan();
    renderDietAI(todayCalories);
  }

  function renderDietPlan(){
    if(!state.settings.dietPlans)state.settings.dietPlans=[];
    const list=document.getElementById('dietPlanList');if(!list)return;
    /* v33: 只展示未吃的计划；已「记入三餐」的计划自动隐藏（不在列表重复出现） */
    /* v51: 自愈——把「三餐记录里已存在的同名食物」回写成 done，修好历史上被旧版合并抹掉的标记 */
    let _healed=false;
    state.settings.dietPlans.forEach((p)=>{ if(!p.done && _dietPlanEatenByRecord(p)){ p.done=true; p.doneAt=p.doneAt||Date.now(); _healed=true; } });
    if(_healed) saveStateQuiet();
    const pending=state.settings.dietPlans.filter((p)=>!p.done);
    list.innerHTML=pending.length?pending.map((p,i)=>{const realIdx=state.settings.dietPlans.indexOf(p);return`<div class="diet-plan-item"><span><strong>${escapeHtml(p.text)}</strong><small>${escapeHtml(p.date)}</small></span><div><button class="btn ghost compact" data-action="eat-diet-plan" data-idx="${realIdx}" title="填入今日三餐">${icon('i-plus')} 吃这餐</button><button class="delete-btn" data-action="delete-diet-plan" data-idx="${realIdx}" aria-label="删除" style="margin-left:4px">${icon('i-trash')}</button></div></div>`;}).join(''):empty('没有待吃的计划，已吃过的已自动记入三餐');
  }

  function renderDietAI(todayCalories){
    const card=document.getElementById('dietAIRecipe');if(!card)return;
    const profile=state.settings.fitnessProfile||{};
    const tdee=profile.height?Math.round((10*60+6.25*(profile.height||170)-5*(profile.age||30)+5)*(profile.activity||1.4)):1800;
    const target=tdee-500;
    const remaining=Math.max(0,target-todayCalories);
    /* v48：菜谱库扩充至每餐 >=10 道，并保证每次至少推荐 10 道（旧版每餐仅 2-3 道、加餐时段空白） */
    const recipes=[
      {name:'燕麦酸奶杯',cal:320,desc:'燕麦 40g + 无糖酸奶 + 蓝莓',meal:'早餐'},
      {name:'全麦三明治',cal:360,desc:'全麦面包 + 鸡蛋 + 生菜 + 鸡胸肉',meal:'早餐'},
      {name:'水煮蛋玉米碗',cal:300,desc:'鸡蛋 2 个 + 玉米 1 根 + 小番茄',meal:'早餐'},
      {name:'杂粮粥配鸡蛋',cal:330,desc:'小米燕麦粥 + 水煮蛋 + 凉拌黄瓜',meal:'早餐'},
      {name:'牛油果吐司',cal:340,desc:'全麦吐司 + 牛油果半个 + 溏心蛋',meal:'早餐'},
      {name:'豆浆荞麦面',cal:350,desc:'无糖豆浆 + 荞麦面 60g + 青菜',meal:'早餐'},
      {name:'鸡胸蔬菜卷饼',cal:380,desc:'全麦饼 + 鸡胸肉 80g + 生菜胡萝卜',meal:'早餐'},
      {name:'希腊酸奶水果碗',cal:300,desc:'希腊酸奶 + 香蕉 + 坚果 10g',meal:'早餐'},
      {name:'红薯鸡蛋杯',cal:310,desc:'红薯 150g + 鸡蛋 1 个 + 无糖豆浆',meal:'早餐'},
      {name:'虾仁蒸蛋全麦包',cal:330,desc:'虾仁 50g + 蒸蛋 + 全麦包 1 片',meal:'早餐'},
      {name:'鸡胸肉杂粮饭',cal:420,desc:'鸡胸肉 150g + 糙米饭 100g + 西兰花',meal:'午餐'},
      {name:'三文鱼沙拉',cal:380,desc:'三文鱼 120g + 混合蔬菜 + 橄榄油',meal:'午餐'},
      {name:'虾仁藜麦碗',cal:400,desc:'虾仁 100g + 藜麦 60g + 牛油果',meal:'午餐'},
      {name:'番茄牛腩饭',cal:480,desc:'牛腩 100g + 米饭 100g + 番茄',meal:'午餐'},
      {name:'鸡腿时蔬便当',cal:450,desc:'去皮鸡腿 120g + 杂粮饭 + 时蔬',meal:'午餐'},
      {name:'豆腐菌菇盖饭',cal:400,desc:'北豆腐 150g + 杂菌 + 糙米饭',meal:'午餐'},
      {name:'鳕鱼藜麦沙拉',cal:390,desc:'鳕鱼 120g + 藜麦 50g + 羽衣甘蓝',meal:'午餐'},
      {name:'牛肉西兰花炒饭',cal:460,desc:'牛肉 100g + 糙米饭 + 西兰花',meal:'午餐'},
      {name:'鹰嘴豆蔬菜碗',cal:370,desc:'鹰嘴豆 80g + 烤蔬菜 + 柠檬汁',meal:'午餐'},
      {name:'金枪鱼全麦卷',cal:350,desc:'金枪鱼罐头 + 全麦饼 + 生菜',meal:'午餐'},
      {name:'香菇滑鸡饭',cal:430,desc:'鸡腿肉 120g + 香菇 + 糙米饭',meal:'午餐'},
      {name:'番茄鸡蛋面',cal:350,desc:'全麦面 80g + 番茄 + 鸡蛋 2 个',meal:'晚餐'},
      {name:'豆腐蔬菜汤',cal:280,desc:'嫩豆腐 + 菌菇 + 时令蔬菜',meal:'晚餐'},
      {name:'菌菇鸡汤',cal:300,desc:'去皮鸡腿肉 + 杂菌 + 枸杞',meal:'晚餐'},
      {name:'清蒸鲈鱼时蔬',cal:320,desc:'鲈鱼 150g + 芦笋 + 胡萝卜',meal:'晚餐'},
      {name:'虾仁炒西葫芦',cal:290,desc:'虾仁 100g + 西葫芦 + 蒜末',meal:'晚餐'},
      {name:'牛肉番茄汤',cal:340,desc:'瘦牛肉 80g + 番茄 + 洋葱',meal:'晚餐'},
      {name:'蒸蛋羹配菠菜',cal:260,desc:'鸡蛋 2 个 + 菠菜 + 芝麻油',meal:'晚餐'},
      {name:'鸡胸蔬菜沙拉',cal:310,desc:'鸡胸 120g + 生菜 + 油醋汁',meal:'晚餐'},
      {name:'白灼虾杂粮饭',cal:380,desc:'基围虾 150g + 杂粮饭 80g',meal:'晚餐'},
      {name:'冬瓜排骨汤',cal:330,desc:'排骨 80g + 冬瓜 + 姜片',meal:'晚餐'},
      {name:'烤三文鱼芦笋',cal:400,desc:'三文鱼 120g + 芦笋 + 柠檬',meal:'晚餐'},
      {name:'无糖希腊酸奶',cal:120,desc:'无糖希腊酸奶 150g',meal:'加餐'},
      {name:'混合坚果',cal:160,desc:'杏仁 + 核桃 共 20g',meal:'加餐'},
      {name:'苹果',cal:95,desc:'中等大小苹果 1 个',meal:'加餐'},
      {name:'水煮蛋',cal:78,desc:'鸡蛋 1 个',meal:'加餐'},
      {name:'无糖豆浆',cal:80,desc:'无糖豆浆 250ml',meal:'加餐'},
      {name:'蓝莓',cal:85,desc:'蓝莓 100g',meal:'加餐'},
      {name:'全麦饼干',cal:140,desc:'全麦饼干 2 片',meal:'加餐'},
      {name:'低脂牛奶',cal:110,desc:'低脂牛奶 250ml',meal:'加餐'},
      {name:'小番茄',cal:40,desc:'小番茄 150g',meal:'加餐'},
      {name:'黄瓜条',cal:30,desc:'黄瓜 1 根切条',meal:'加餐'}
    ];
    const hour=new Date().getHours();
    const currentMeal=hour<10?'早餐':hour<14?'午餐':hour<21?'晚餐':'加餐';
    const mealRecipes=recipes.filter(r=>r.meal===currentMeal);
    const pool=mealRecipes.length?mealRecipes:recipes;
    const byFit=(a,b)=>Math.abs(a.cal-remaining)-Math.abs(b.cal-remaining);
    const suit=pool.filter(r=>r.cal<=remaining+120).sort(byFit);
    const rest=pool.filter(r=>suit.indexOf(r)<0).sort(byFit);
    const MIN_RECIPES=10;
    const suggestions=suit.concat(rest).slice(0,MIN_RECIPES);
    if(!suggestions.length){card.innerHTML='';return;}
    card.innerHTML=`<span class="ai-badge">AI 菜谱推荐</span><h3>${currentMeal}推荐 · 剩余 ${remaining} kcal</h3><p>今日已摄入 ${todayCalories} kcal，目标 ${target} kcal。为你精选 ${suggestions.length} 道菜谱，按贴合当前热量缺口排序：</p><div class="recipe-list">${suggestions.map(r=>{const fit=r.cal<=remaining+120;return`<div class="recipe-suggestion${fit?'':' over'}"><strong>${r.name}</strong><small>${r.desc}</small><span class="calories-tag">约 ${r.cal} kcal</span>${fit?'':'<span class="cal-over-tag">略超当前缺口</span>'}</div>`;}).join('')}</div>`;
  }

  var _storageSearch='';
  var _mediaSearch='';
  var _storageOvSearch='';
  /* v59：物品名称 -> 简笔画图标（离线词典，纯前端推导，不占存储、跨设备天然一致）
   * 顺序敏感：越具体的词排越前（如「洗衣粉」须先于「粉」类）。
   * 匹配不到名称 -> 用分类兜底 -> 再兜底通用箱形。 */
  var STORAGE_ICON_RULES=[
    ['i-st-med',['药','维生素','退烧','感冒','咳嗽','创可贴','碘伏','口罩','纱布','棉签']],
    ['i-st-tube',['牙膏','洗面奶','面霜','护手霜','乳液','身体乳','染发','防晒霜','唇膏','面膜']],
    ['i-st-spray',['喷雾','清新剂','花露水','杀虫','洁厕','玻璃水','厨房重油']],
    ['i-st-clean',['扫把','拖把','刷','海绵','抹布','钢丝球','手套','百洁布','除尘']],
    ['i-st-tissue',['纸巾','抽纸','卷纸','卫生纸','厨房纸','湿巾','手帕纸','纸']],
    ['i-st-bag',['垃圾袋','保鲜袋','密封袋','洗衣粉','皂粉','皂','袋']],
    ['i-st-snack',['零食','饼干','薯片','坚果','巧克力','瓜子','辣条','糖','果冻','蛋糕']],
    ['i-st-carton',['牛奶','豆浆','盒装','酸奶','椰汁','果汁盒']],
    ['i-st-grain',['米','面','粉','麦','粮','豆','小米','薏米','燕麦','谷物']],
    ['i-st-veg',['菜','水果','苹果','香蕉','橙','葱','姜','蒜','萝卜','土豆','番茄','西红柿','黄瓜','梨']],
    ['i-st-egg',['蛋','肉','鱼','虾','鸡','牛','猪','腊肠','火腿']],
    ['i-st-can',['罐','啤酒','可乐','汽水','听装','罐头']],
    ['i-st-bottle',['油','醋','酱油','料酒','蚝油','洗衣液','洗手液','沐浴露','洗发水','护发素','洗洁精','柔顺剂','消毒液','水和饮料','矿泉水','饮料','水','酒']]
  ];
  function storageIcon(name,cat){
    var n=String(name||'').trim();
    if(n){ for(var i=0;i<STORAGE_ICON_RULES.length;i++){ var words=STORAGE_ICON_RULES[i][1];
      for(var j=0;j<words.length;j++){ if(n.indexOf(words[j])>=0) return STORAGE_ICON_RULES[i][0]; } } }
    var catMap={'食品':'i-st-veg','日用':'i-st-bag','个护':'i-st-tube','清洁':'i-st-spray','其他':'i-st-box'};
    return catMap[String(cat||'').trim()]||'i-st-box';
  }
  function renderStorage(){
    const records=sortedRecords('storage'),filter=state.settings.storageFilter||'all',today=isoDate();
    const _q=(_storageSearch||'').trim().toLowerCase();
    let filtered=records.filter(r=>filter==='all'||r.data.category===filter);
    if(_q){filtered=filtered.filter(function(r){var nm=(r.sample?translateText(r.data.name):String(r.data.name||'')).toLowerCase();var hay=[nm,r.data.category||'',r.data.location||'',r.data.note||'',r.data.unit||''].join(' ').toLowerCase();return hay.indexOf(_q)>=0;});}
    var _si=document.getElementById('storageSearchInput');if(_si&&_si.value!==_storageSearch)_si.value=_storageSearch;
    const totalItems=records.length,categories={};
    records.forEach(r=>{categories[r.data.category]=(categories[r.data.category]||0)+1;});
    document.getElementById('storageTotal').textContent=totalItems;
    document.getElementById('storageCats').textContent=Object.keys(categories).length;
    /* v35 新增汇总指标：总件数 + 临期/过期 */
    const _e1=document.getElementById('storageQtySum');if(_e1)_e1.textContent=records.reduce((s,r)=>s+(Number(r.data.quantity)||0),0);
    const expiringN=records.filter(r=>r.data.expiry&&r.data.expiry<=shiftDate(7)&&r.data.expiry>=today).length;
    const expiredN=records.filter(r=>r.data.expiry&&r.data.expiry<today).length;
    const _e2=document.getElementById('storageExpiring');if(_e2)_e2.textContent=expiringN+' / '+expiredN;
    document.querySelectorAll('[data-storage-filter]').forEach(b=>b.classList.toggle('active',b.dataset.storageFilter===filter));
    document.getElementById('storageList').innerHTML=filtered.length?filtered.map(r=>{const name=r.sample?localizedHtml(r.data.name):userHtml(r.data.name),expiry=r.data.expiry,expiring=expiry&&expiry<=shiftDate(7)&&expiry>=today,expired=expiry&&expiry<today;var dailyCost='',pa=r.data.purchaseAmount,pd=r.data.purchaseDate;if(pa&&pd){var days=Math.max(1,Math.round((new Date(today)-new Date(pd))/86400000)+1);var daily=(pa/days).toFixed(2);dailyCost=`<div class="storage-cost">购买 ¥${pa} · 日均 <b>¥${daily}</b>${r.data.quantity>0?' · 每件日均 ¥'+(pa/days/(r.data.quantity||1)).toFixed(2):''}</div>`;}return`<div class="storage-row ${expired?'expired':''} ${expiring?'expiring':''}"><span class="storage-icon" title="${escapeHtml(r.data.name||'')}">${icon(storageIcon(r.data.name,r.data.category))}</span><span class="storage-main"><strong>${name}</strong><small>${r.data.quantity||0} ${r.data.unit||''} · ${localizedHtml(r.data.category||'其他')}${r.data.location?' · '+escapeHtml(r.data.location):''}${expiry?' · '+escapeHtml(expiry):''}</small>${dailyCost}</span><div class="storage-qty"><button class="qty-btn" data-action="storage-minus" data-id="${r.id}" aria-label="减少">${icon('i-minus')}</button><b>${r.data.quantity||0}</b><button class="qty-btn" data-action="storage-plus" data-id="${r.id}" aria-label="增加">${icon('i-plus')}</button></div><button class="delete-btn" data-action="delete" data-id="${r.id}" aria-label="${t('删除')}">${icon('i-trash')}</button></div>`;}).join(''):empty(_q?('没有匹配「'+escapeHtml(_q)+'」的物品'):'物品存储已清空');
    renderStorageOverview(records);
    renderStorageFrequency(records);
  }

  /* v35 库存总览：分类卡片 + 每类件数条形 + 临期/过期提示 + 全部物品逐条存量一览 */
  function renderStorageOverview(records){
    const catEl=document.getElementById('storageOvCats'),barEl=document.getElementById('storageOvBar'),
          alertEl=document.getElementById('storageOvAlerts'),listEl=document.getElementById('storageOvList'),
          noteEl=document.getElementById('storageOvFilterNote');
    records=records||sortedRecords('storage');
    var _ovq=(_storageOvSearch||'').trim().toLowerCase();
    if(_ovq) records=records.filter(function(r){var d=r.data||{};return [d.name,d.category,d.location,d.note].some(function(f){return (f||'').toLowerCase().indexOf(_ovq)>=0;});});
    const today=isoDate(),seven=shiftDate(7);
    const CAT_ORDER=['食品','日用','个护','清洁','其他'];
    const _catOf=r=>((r.data.category&&CAT_ORDER.indexOf(r.data.category)>=0)?r.data.category:'其他');
    const cats={};records.forEach(r=>{const c=_catOf(r);if(!cats[c])cats[c]={kinds:0,qty:0,items:[]};cats[c].kinds++;cats[c].qty+=Number(r.data.quantity)||0;cats[c].items.push(r);});
    const catKeys=CAT_ORDER.filter(c=>cats[c]);
    const filter=state.settings.storageFilter||'all';
    /* v39：分类卡始终按全量统计（方便随时切换/取消），条形图·提醒·明细只展示当前选中的分类 */
    const view=filter==='all'?records:records.filter(r=>_catOf(r)===filter);
    const viewKeys=filter==='all'?catKeys:catKeys.filter(c=>c===filter);
    const viewQty=view.reduce((s,r)=>s+(Number(r.data.quantity)||0),0);
    const maxCatQty=Math.max(1,...viewKeys.map(c=>cats[c].qty));
    const maxItemQty=Math.max(1,...view.map(r=>Number(r.data.quantity)||0));
    if(catEl) catEl.innerHTML=catKeys.length?catKeys.map(c=>`<button class="ov-cat ${filter===c?'active':''}" data-storage-filter="${c}" aria-pressed="${filter===c?'true':'false'}" title="点击只看「${c}」，再点一次恢复全部"><span>${c}</span><span class="ov-num"><strong>${cats[c].kinds}</strong><span>种 · ${cats[c].qty} 件</span></span></button>`).join(''):'';
    if(noteEl) noteEl.innerHTML=(filter!=='all'&&filter)?`<span>只看「${escapeHtml(String(filter))}」· ${view.length} 种 / ${viewQty} 件</span><button type="button" class="btn ghost compact" data-action="storage-filter-clear">显示全部</button>`:'';
    if(barEl) barEl.innerHTML=viewKeys.length?viewKeys.map(c=>{const p=Math.round(cats[c].qty/maxCatQty*100);return`<div class="storage-ov-row"><span class="lbl" title="${c}">${c}</span><span class="track"><i style="width:${Math.max(p,2)}%"></i></span><span class="val">${cats[c].qty} 件 / ${cats[c].kinds} 种</span></div>`;}).join(''):(records.length?'<span class="ov-empty">'+(filter&&filter!=='all'?'该分类暂无物品':'还没有库存物品')+'</span>':'<span class="ov-empty">还没有库存物品，先记下一件吧</span>');
    const expired=view.filter(r=>r.data.expiry&&r.data.expiry<today);
    const expiring=view.filter(r=>r.data.expiry&&r.data.expiry>=today&&r.data.expiry<=seven);
    let alerts='';
    if(view.length){
      const low=view.filter(r=>(Number(r.data.quantity)||0)<=0);
      if(expired.length)alerts+=`<div class="storage-ov-alert bad">⚠ 已过期 ${expired.length} 件：${expired.slice(0,3).map(r=>escapeHtml(r.data.name)).join('、')}${expired.length>3?' 等':''}</div>`;
      if(expiring.length)alerts+=`<div class="storage-ov-alert warn">⏳ 7 天内过期 ${expiring.length} 件：${expiring.slice(0,3).map(r=>escapeHtml(r.data.name)).join('、')}${expiring.length>3?' 等':''}</div>`;
      if(low.length)alerts+=`<div class="storage-ov-alert warn">➖ 数量为 0 共 ${low.length} 件：${low.slice(0,3).map(r=>escapeHtml(r.data.name)).join('、')}${low.length>3?' 等':''}</div>`;
      if(!alerts)alerts=`<div class="storage-ov-alert ok">✓ 库存健康，无临期或过期</div>`;
    }
    if(alertEl) alertEl.innerHTML=alerts;
    if(listEl) listEl.innerHTML=view.length?view.map(r=>{const q=Number(r.data.quantity)||0,p=Math.round(q/maxItemQty*100);const ex=r.data.expiry&&r.data.expiry<today,ep=r.data.expiry&&r.data.expiry>=today&&r.data.expiry<=seven;const name=r.sample?translateText(r.data.name):escapeHtml(r.data.name);const cat=localizedHtml(r.data.category||'其他');return`<div class="storage-ov-item"><span class="nm">${name}<small>${cat}${r.data.expiry?' · 到期 '+escapeHtml(r.data.expiry):''}</small></span><span class="qty ${ex?'expired':''}">${q} ${escapeHtml(r.data.unit||'件')}</span><span class="bar"><i class="${ex?'expired':ep?'expiring':''}" style="width:${Math.max(p,2)}%"></i></span></div>`;}).join(''):'<div class="ov-empty">'+(filter&&filter!=='all'&&records.length?'该分类暂无物品':(records.length?'当前筛选下暂无库存物品':'暂无库存物品'))+'</div>';
  }


  /* v48 使用频率统计：storageUsage 存于 settings（随 appSettings 跨设备同步），
   * 避免改动云端 storage 表结构。每次「减少」= 一次使用。 */
  function _storageUsage(){ if(!state.settings.storageUsage) state.settings.storageUsage={}; return state.settings.storageUsage; }
  function _bumpUsage(id,n){
    if(!id)return;const u=_storageUsage(),today=isoDate(),m=today.slice(0,7);
    const rec=u[id]||{n:0,first:today,last:today,m:{}};
    if(!rec.m)rec.m={};
    rec.n=Math.max(0,Number(rec.n||0)+(Number(n)||0));
    if(n>0){rec.m[m]=Number(rec.m[m]||0)+(Number(n)||0);rec.last=today;}
    if(!rec.first)rec.first=today;
    u[id]=rec;
  }
  function renderStorageFrequency(records){
    const el=document.getElementById('storageFreqList');if(!el)return;
    const u=_storageUsage(),today=isoDate(),curM=today.slice(0,7);
    const all=records||sortedRecords('storage');
    /* 清理已删除物品的统计，避免 settings 无限增长 */
    const alive={};all.forEach(r=>alive[r.id]=1);Object.keys(u).forEach(k=>{if(!alive[k])delete u[k];});
    const rows=all.map(r=>{
      const rec=u[r.id]||{n:0,m:{},first:r.date||today,last:''};
      const total=Number(rec.n||0);
      const days=Math.max(1,Math.round((new Date(today)-new Date(rec.first||r.date||today))/86400000)+1);
      const rate=total/days*30;
      return {id:r.id,name:(r.sample?translateText(r.data.name):String(r.data.name||'')),total:total,rate:rate,last:rec.last||'',month:Number((rec.m&&rec.m[curM])||0)};
    });
    const sort=state.settings.storageFreqSort||'rate';
    document.querySelectorAll('#storageFreqSwitch [data-freq-sort]').forEach(b=>b.classList.toggle('active',b.dataset.freqSort===sort));
    const ranked=rows.filter(x=>x.total>0).sort((a,b)=>sort==='total'?(b.total-a.total||b.rate-a.rate):(b.rate-a.rate||b.total-a.total));
    if(!ranked.length){el.innerHTML='<div class="ov-empty">还没有使用记录，点清单里的「−」记录一次使用吧</div>';return;}
    const maxRate=Math.max(0.001,...ranked.map(x=>x.rate));
    el.innerHTML=ranked.slice(0,10).map((x,i)=>`<div class="freq-row ${i===0?'top1':''}"><span class="freq-rank">${i+1}</span><span class="freq-name"><strong>${escapeHtml(x.name)}</strong><span class="freq-bar"><i style="width:${Math.max(4,Math.round(x.rate/maxRate*100))}%"></i></span></span><span class="freq-num"><b>${x.rate.toFixed(1)} 次/月</b>累计 ${x.total} 次 · 本月 ${x.month} 次${x.last?' · 最近 '+escapeHtml(x.last):''}</span></div>`).join('');
  }
  /* ===== v48 睡眠统计 ===== */
  function _sleepNum(v){var n=Number(v);return (isFinite(n)&&n>0)?n:0;}
  function _fmtMin(m){m=Math.round(m||0);if(m<=0)return '0 分钟';var h=Math.floor(m/60),mi=m%60;return h?(mi?h+' 小时 '+mi+' 分':h+' 小时'):(mi+' 分钟');}
  function _sleepInBed(b,w){
    if(!b||!w)return 0;
    var bp=String(b).split(':'),wp=String(w).split(':');
    var bh=parseInt(bp[0],10),bm=parseInt(bp[1]||0,10),wh=parseInt(wp[0],10),wm=parseInt(wp[1]||0,10);
    if(isNaN(bh)||isNaN(wh))return 0;
    var a=bh*60+(isNaN(bm)?0:bm),c=wh*60+(isNaN(wm)?0:wm);
    if(c<=a)c+=1440;
    return c-a;
  }
  function _sleepMetrics(rec){
    var d=rec&&rec.data?rec.data:{};
    var deep=_sleepNum(d.deep),light=_sleepNum(d.light),rem=_sleepNum(d.rem),awake=_sleepNum(d.awake),nap=_sleepNum(d.nap);
    var inBed=_sleepInBed(d.bedtime,d.wake);
    var stages=deep+light+rem;
    var asleep=stages>0?stages:Math.max(0,inBed-awake);
    if(inBed>0&&asleep>inBed)asleep=inBed;
    var eff=inBed>0?Math.min(100,asleep/inBed*100):0;
    var deepPct=asleep>0?deep/asleep*100:0;
    var remPct=asleep>0?rem/asleep*100:0;
    var durScore = asleep>=420&&asleep<=540?100:(asleep<420?Math.max(0,asleep/420*100):Math.max(0,100-(asleep-540)/180*40));
    var deepScore = deepPct>=13&&deepPct<=25?100:(deepPct<13?Math.max(0,deepPct/13*100):Math.max(0,100-(deepPct-25)/15*40));
    var remScore = remPct>=18&&remPct<=28?100:(remPct<18?Math.max(0,remPct/18*100):Math.max(0,100-(remPct-28)/12*40));
    var effScore = Math.min(100, eff/85*100);
    /* v49: 缺失维度不参与评分，按已有维度权重归一化。
       此前未填分期时 deepPct/remPct=0 → 35% 权重归零 → 分数上限仅 65，把「没数据」误判成「睡得差」。 */
    var hasStages=stages>0, hasInBed=inBed>0, hasDur=asleep>0;
    var parts=[];
    if(hasDur)parts.push({w:0.40,v:durScore});
    if(hasInBed)parts.push({w:0.25,v:effScore});
    if(hasStages){parts.push({w:0.20,v:deepScore});parts.push({w:0.15,v:remScore});}
    var wsum=0,vsum=0;
    for(var pi=0;pi<parts.length;pi++){wsum+=parts[pi].w;vsum+=parts[pi].w*parts[pi].v;}
    var score=wsum>0?Math.round(vsum/wsum):0;
    var partial=!(hasDur&&hasInBed&&hasStages);
    return {deep:deep,light:light,rem:rem,awake:awake,nap:nap,inBed:inBed,asleep:asleep,eff:eff,
            deepPct:deepPct,remPct:remPct,score:score,hasStages:hasStages,hasInBed:hasInBed,partial:partial};
  }
  function _sleepScoreTone(score){return score>=85?'good':score>=70?'ok':'warn';}
  function _sleepAdviceFor(m,rec){
    var out=[],d=(rec&&rec.data)||{};
    if(!m.asleep&&!m.inBed){out.push({tone:'',text:'还没有可用的睡眠数据，先记录一晚吧。'});return out;}
    if(m.asleep<420)out.push({tone:'warn',text:'睡眠时长偏短（'+_fmtMin(m.asleep)+'），建议再提前 '+Math.round(420-m.asleep)+' 分钟上床，成人目标为 7–9 小时。'});
    else if(m.asleep>540)out.push({tone:'warn',text:'睡眠时间偏长（'+_fmtMin(m.asleep)+'），若白天仍困倦，留意是否存在睡眠质量不佳或作息过晚。'});
    else out.push({tone:'good',text:'睡眠时长达标（'+_fmtMin(m.asleep)+'，处于 7–9 小时区间），继续保持。'});
    if(!m.hasStages){
      out.push({tone:'',text:'本条未填写深睡 / 浅睡 / REM，评分已按时长与效率归一化计算（分期维度不计入，不代表睡得差）。补齐分期可得到更完整的评估。'});
    }else{
      if(m.deepPct<13)out.push({tone:'warn',text:'深睡比例偏低（'+m.deepPct.toFixed(0)+'%，参考 13–25%）。建议睡前 1 小时远离屏幕、卧室保持 18–22℃、避免睡前饮酒。'});
      else if(m.deepPct>25)out.push({tone:'ok',text:'深睡比例偏高（'+m.deepPct.toFixed(0)+'%），若白天疲惫明显，留意是否身体在补偿性恢复。'});
      else out.push({tone:'good',text:'深睡比例健康（'+m.deepPct.toFixed(0)+'%）。'});
      if(m.remPct<18)out.push({tone:'warn',text:'REM 比例偏低（'+m.remPct.toFixed(0)+'%，参考 18–28%），常见诱因是压力、酒精或作息不规律。建议固定起床时间、减少睡前饮酒。'});
      else if(m.remPct>28)out.push({tone:'ok',text:'REM 比例偏高（'+m.remPct.toFixed(0)+'%），多见于作息紊乱后的补偿，保持规律即可。'});
      else out.push({tone:'good',text:'REM 比例健康（'+m.remPct.toFixed(0)+'%）。'});
    }
    if(!m.hasInBed){
      out.push({tone:'',text:'未填写入睡 / 醒来时间，无法计算睡眠效率，该维度未计入评分。'});
    }else if(m.eff<85)out.push({tone:'warn',text:'睡眠效率偏低（'+Math.round(m.eff)+'%，目标 ≥85%），夜间清醒 '+_fmtMin(m.awake)+'。建议减少床上使用手机、固定起床时间、避免睡前大量饮水。'});
    else out.push({tone:'good',text:'睡眠效率良好（'+Math.round(m.eff)+'%）。'});
    if(m.nap>45)out.push({tone:'warn',text:'零星小睡偏多（'+_fmtMin(m.nap)+'），建议控制在 30 分钟内，并尽量安排在下午 3 点之前。'});
    else if(m.nap>0)out.push({tone:'ok',text:'有小睡 '+_fmtMin(m.nap)+'，在合理范围内。'});
    if(d.note)out.push({tone:'',text:'备注：'+String(d.note)});
    return out;
  }
  function _sleepRangeList(all,range){
    var today=isoDate();
    if(range==='day'){
      var ds=state.settings.sleepDay||today;
      return {from:ds,to:ds,list:all.filter(r=>r.date===ds)};
    }
    var days = range==='week'?7:range==='month'?30:365;
    var from=shiftDate(-(days-1));
    return {from:from,to:today,list:all.filter(r=>r.date>=from&&r.date<=today)};
  }
  function _sleepSeries(list,range){
    var map={},i;
    list.forEach(function(r){
      var key;
      if(range==='week'||range==='day')key=r.date;
      else if(range==='month'){var off=Math.floor((new Date(isoDate())-new Date(r.date))/86400000);key='第'+(Math.floor(off/7)+1)+'周';}
      else key=Number(r.date.slice(5,7))+'月';
      if(!map[key])map[key]={sum:0,n:0};
      var m=_sleepMetrics(r);map[key].sum+=m.asleep;map[key].n++;
    });
    var keys=Object.keys(map);
    if(range==='month')keys=keys.sort(function(a,b){return Number(a.replace(/[^0-9]/g,''))-Number(b.replace(/[^0-9]/g,''));});
    else if(range==='year')keys=keys.sort(function(a,b){return Number(String(a).replace('月',''))-Number(String(b).replace('月',''));});
    else keys=keys.sort();
    return keys.map(function(k){return {label:(range==='week'?k.slice(5):k),value:map[k].n?map[k].sum/map[k].n:0,n:map[k].n};});
  }
  /* v58 回本模块：大件购买记录，按时间/次数计算摊销成本 */
  var PAYBACK_CATS=[['数码','i-pb-digital'],['家电','i-pb-home'],['家具','i-pb-furniture'],['出行','i-pb-car'],['运动','i-pb-sport'],['服饰','i-pb-wear'],['美妆','i-pb-beauty'],['图书','i-pb-book'],['其他','i-pb-other']];
  function paybackIcon(cat){ cat=String(cat||'').trim(); for(var i=0;i<PAYBACK_CATS.length;i++){ if(PAYBACK_CATS[i][0]===cat) return PAYBACK_CATS[i][1]; } return 'i-pb-other'; }
  function _pbHoldDays(date){ var d1=new Date(date+'T00:00:00'), d2=new Date(isoDate()+'T00:00:00'); var n=Math.floor((d2-d1)/86400000)+1; return n>0?n:1; }
  function renderPayback(){
    const all=sortedRecords('payback');
    const listEl=document.getElementById('paybackList');
    const statEl=document.getElementById('paybackStat');
    if(listEl){
      listEl.innerHTML=all.length?all.slice(0,80).map(function(r){
        var d=r.data||{}, hold=_pbHoldDays(r.date), price=Number(d.price)||0;
        var mode=d.mode==='count'?'count':'time';
        var per=mode==='count'?((Number(d.uses)||0)>=1?price/Number(d.uses):null):(price/hold);
        var perTxt=per==null?'尚未使用':(mode==='count'?'¥'+per.toFixed(2)+' / 次':'¥'+per.toFixed(2)+' / 天');
        var modeTxt=mode==='count'?('按次数 · 已用 '+(Number(d.uses)||0)+' 次'):('按时间 · 持有 '+hold+' 天');
        var useBtn=mode==='count'?'<button class="btn ghost compact" data-action="payback-use" data-id="'+r.id+'">+1 次</button>':'';
        return '<div class="record-row"><span class="record-icon plum">'+icon(paybackIcon(d.category))+'</span>'+
          '<span class="record-main"><strong>'+escapeHtml(d.name||'物品')+'</strong>'+
          '<small>'+escapeHtml(d.category||'其他')+' · '+escapeHtml(formatDateHeading(r.date))+' · '+escapeHtml(modeTxt)+'</small></span>'+
          useBtn+
          '<span class="record-amount">'+perTxt+'<small style="display:block;color:var(--muted)">'+money(price)+'</small></span>'+
          '<button class="delete-btn" data-action="delete" data-id="'+r.id+'" aria-label="删除">'+icon('i-trash')+'</button></div>';
      }).join(''):empty('还没有回本物品，先从左侧添加一件');
    }
    if(statEl){
      var total=0, dailySum=0;
      all.forEach(function(r){ var price=Number((r.data||{}).price)||0; total+=price; dailySum+=price/_pbHoldDays(r.date); });
      const cards=[['物品总数',all.length+' 件'],['总资产',money(Math.round(total*100)/100)],['日均成本',money(Math.round(dailySum*100)/100)]];
      statEl.innerHTML=cards.map(function(c){return '<div class="sleep-metric"><span>'+c[0]+'</span><b>'+escapeHtml(c[1])+'</b></div>';}).join('');
    }
  }
  function addPaybackUse(id){
    var rec=state.records.find(function(r){return r.id===id&&r.type==='payback';});if(!rec)return;
    rec.data.uses=(Number(rec.data.uses)||0)+1;
    updateRemotePayback(rec);const saved=saveState();renderPayback();
    if(saved)toast('已记 1 次使用');
  }
  function renderStudy(){
    const all=sortedRecords('study');
    const listEl=document.getElementById('studyList');
    const statEl=document.getElementById('studyStat');
    if(listEl){
      listEl.innerHTML=all.length?all.slice(0,60).map(function(r){
        var d=r.data||{};
        return '<div class="record-row"><span class="record-icon plum">'+icon('i-study')+'</span>'+
          '<span class="record-main"><strong>'+escapeHtml(d.subject||'学习')+'</strong>'+
          '<small>'+escapeHtml(formatDateHeading(r.date))+(d.category?' · '+escapeHtml(d.category):'')+' · '+(Number(d.minutes)||0)+' 分钟'+(d.note?' · '+escapeHtml(d.note):'')+'</small></span>'+
          '<span class="record-amount">'+(Number(d.minutes)||0)+' 分</span>'+
          '<button class="delete-btn" data-action="delete" data-id="'+r.id+'" aria-label="删除">'+icon('i-trash')+'</button></div>';
      }).join(''):empty('还没有学习记录');
    }
    if(statEl){
      var today=isoDate(), weekAgo=shiftDate(-6);
      function _min(arr){ return arr.reduce(function(a,r){return a+Number((r.data||{}).minutes||0);},0); }
      var todayMin=_min(all.filter(function(r){return r.date===today;}));
      var weekMin=_min(all.filter(function(r){return r.date>=weekAgo && r.date<=today;}));
      var totalMin=_min(all);
      function _fmt(m){ m=Math.round(Number(m)||0); if(m<60) return m+' 分钟'; var h=Math.floor(m/60), rem=m%60; return rem? (h+' 小时 '+rem+' 分') : (h+' 小时'); }
      const cards=[['今日学习',_fmt(todayMin)],['近 7 天',_fmt(weekMin)],['累计',_fmt(totalMin)],['学习次数',all.length+' 次']];
      statEl.innerHTML=cards.map(function(c){return '<div class="sleep-metric"><span>'+c[0]+'</span><b>'+escapeHtml(c[1])+'</b></div>';}).join('');
    }
  }
  function renderSleep(){
    const all=sortedRecords('sleep');
    const range=state.settings.sleepRange||'week';
    document.querySelectorAll('#sleepRangeFilters button').forEach(b=>b.classList.toggle('active',b.dataset.sleepRange===range));
    const titleEl=document.getElementById('sleepRangeTitle');
    const RANGE_TEXT={day:'当日睡眠分析',week:'近 7 天睡眠分析',month:'近 30 天睡眠分析',year:'近 365 天睡眠分析'};
    if(titleEl)titleEl.textContent=RANGE_TEXT[range]||'睡眠质量分析';
    const seg=_sleepRangeList(all,range);
    const list=seg.list;
    const metEl=document.getElementById('sleepMetrics'),stEl=document.getElementById('sleepStack'),
          chEl=document.getElementById('sleepChart'),adEl=document.getElementById('sleepAdvice'),
          liEl=document.getElementById('sleepList');
    if(liEl){
      liEl.innerHTML=all.length?all.slice(0,60).map(function(r){
        var m=_sleepMetrics(r),d=r.data||{};
        return '<div class="sleep-row"><span class="sleep-main"><strong>'+escapeHtml(r.date)+'</strong>'+
          '<small>'+escapeHtml((d.bedtime||'—')+' → '+(d.wake||'—'))+' · 睡 '+_fmtMin(m.asleep)+' · 效率 '+(m.hasInBed?Math.round(m.eff)+'%':'—')+
          (d.note?' · '+escapeHtml(d.note):'')+'</small></span>'+
          '<span class="sleep-score '+_sleepScoreTone(m.score)+'">'+m.score+'</span>'+
          '<button class="delete-btn" data-action="delete" data-id="'+r.id+'" aria-label="删除">'+icon('i-trash')+'</button></div>';
      }).join(''):empty('还没有睡眠记录');
    }
    if(!list.length){
      if(metEl)metEl.innerHTML='';
      if(stEl)stEl.innerHTML='';
      if(chEl)chEl.innerHTML='';
      if(adEl)adEl.innerHTML='<div class="sleep-advice-item">'+escapeHtml(range==='day'?((state.settings.sleepDay||isoDate())+' 这天还没有睡眠记录'):'这段时间还没有睡眠记录')+'</div>';
      return;
    }
    const agg=list.reduce(function(a,r){var m=_sleepMetrics(r);a.deep+=m.deep;a.light+=m.light;a.rem+=m.rem;a.awake+=m.awake;a.nap+=m.nap;a.asleep+=m.asleep;a.inBed+=m.inBed;a.eff+=m.eff;a.score+=m.score;a.n++;return a;},{deep:0,light:0,rem:0,awake:0,nap:0,asleep:0,inBed:0,eff:0,score:0,n:0});
    const n=agg.n||1;
    const avg={deep:agg.deep/n,light:agg.light/n,rem:agg.rem/n,awake:agg.awake/n,nap:agg.nap/n,asleep:agg.asleep/n,inBed:agg.inBed/n,eff:agg.eff/n,score:agg.score/n};
    if(metEl){
      const cards=[['记录天数',agg.n+' 天'],['平均睡眠',_fmtMin(avg.asleep)],['平均深睡',_fmtMin(avg.deep)],['平均浅睡',_fmtMin(avg.light)],['平均REM',_fmtMin(avg.rem)],['平均清醒',_fmtMin(avg.awake)],['平均小睡',_fmtMin(avg.nap)],['平均效率',Math.round(avg.eff)+'%'],['平均评分',Math.round(avg.score)]];
      metEl.innerHTML=cards.map(function(c){return '<div class="sleep-metric"><span>'+c[0]+'</span><b>'+escapeHtml(c[1])+'</b></div>';}).join('');
    }
    if(stEl){
      const tot=avg.deep+avg.light+avg.rem+avg.awake;
      if(tot>0){
        const seg2=[['深睡',avg.deep,'#33506b'],['浅睡',avg.light,'#5f8a70'],['REM',avg.rem,'#4a7aa8'],['清醒',avg.awake,'#c0a79a']];
        stEl.innerHTML='<div class="sleep-stack">'+seg2.map(function(x){var w=x[1]/tot*100;return w>0?'<i style="width:'+w.toFixed(2)+'%;background:'+x[2]+'" title="'+x[0]+' '+_fmtMin(x[1])+'"></i>':'';}).join('')+'</div>'+
          '<div class="sleep-legend">'+seg2.map(function(x){var p=tot?Math.round(x[1]/tot*100):0;return '<span><i style="background:'+x[2]+'"></i>'+x[0]+' '+p+'%</span>';}).join('')+'</div>';
      } else stEl.innerHTML='';
    }
    if(chEl){
      const series=_sleepSeries(list,range);
      const max=Math.max(1,...series.map(x=>x.value));
      chEl.innerHTML=series.map(function(x){
        const h=Math.max(3,Math.round(x.value/max*100));
        return '<div class="sleep-bar-wrap"><span class="sleep-bar-val">'+_fmtMin(x.value)+'</span><span class="sleep-bar" style="height:'+h+'px"></span><span class="sleep-bar-lbl">'+escapeHtml(String(x.label))+'</span></div>';
      }).join('');
    }
    if(adEl){
      const latest=list[list.length-1];
      const m=_sleepMetrics(latest);
      adEl.innerHTML=_sleepAdviceFor(m,latest).map(function(a){return '<div class="sleep-advice-item '+(a.tone||'')+'">'+escapeHtml(a.text)+'</div>';}).join('');
    }
  }
  function renderMedia(){
    if(!state.settings.mediaPage)state.settings.mediaPage=1;
    if(!state.settings.mediaPageSize)state.settings.mediaPageSize=12;
    const year=String(new Date().getFullYear()),items=[...(state.mediaItems||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(Number(b.createdAt||0)-Number(a.createdAt||0))),finished=items.filter(item=>item.status==='看完'&&item.date.startsWith(year)),rated=finished.filter(item=>item.rating>0);
    const average=rated.length?sum(rated,item=>item.rating)/rated.length:0,typeCounts={};finished.forEach(item=>typeCounts[item.type]=(typeCounts[item.type]||0)+1);const favorite=Object.entries(typeCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—';
    document.getElementById('mediaYear').textContent=year;document.getElementById('mediaFinished').textContent=`${finished.length} 部`;document.getElementById('mediaAverage').textContent=average?`${average.toFixed(1)} ★`:'—';document.getElementById('mediaFavorite').textContent=favorite;
    const distribution=Array.from({length:5},(_,i)=>rated.filter(item=>item.rating===i+1).length),max=Math.max(1,...distribution);document.getElementById('ratingDistribution').innerHTML=distribution.map((count,i)=>`<div class="rating-bar"><b>${count}</b><span style="--h:${Math.max(4,count/max*72)}px"></span><small>${i+1} 星</small></div>`).join('');
    document.querySelectorAll('[data-media-view]').forEach(button=>button.classList.toggle('active',button.dataset.mediaView===state.settings.mediaView));
    const typeSel=document.getElementById('mediaTypeFilter');if(typeSel){const known=['电影','剧','书','番','综艺','有声书','AI漫剧'],types=[...new Set(known.concat((state.mediaItems||[]).map(i=>i.type).filter(Boolean)))];typeSel.innerHTML=[{v:'all',l:t('全部类型')}].concat(types.map(x=>({v:x,l:x}))).map(o=>`<option value="${o.v}" ${(state.settings.mediaTypeFilter||'all')===o.v?'selected':''}>${o.l}</option>`).join('');}
    document.getElementById('mediaStatusFilter').value=state.settings.mediaStatusFilter;document.getElementById('mediaRatingFilter').value=String(state.settings.mediaRatingFilter||0);
    const _baseItems=items.filter(item=>(state.settings.mediaTypeFilter==='all'||item.type===state.settings.mediaTypeFilter)&&(state.settings.mediaStatusFilter==='all'||item.status===state.settings.mediaStatusFilter)&&(!Number(state.settings.mediaRatingFilter)||item.rating>=Number(state.settings.mediaRatingFilter)));
    /* v48 书影音搜索：名称 / 类型 / 状态 / 短评 实时过滤 */
    var _mq=(_mediaSearch||'').trim().toLowerCase();
    const filtered=_mq?_baseItems.filter(function(it){var nm=it.sample?translateText(it.name):String(it.name||'');var hay=[nm,it.type||'',it.status||'',it.review||''].join(' ').toLowerCase();return hay.indexOf(_mq)>=0;}):_baseItems;
    var _msi=document.getElementById('mediaSearchInput');if(_msi&&_msi.value!==_mediaSearch)_msi.value=_mediaSearch;
    const totalPages=Math.ceil(filtered.length/state.settings.mediaPageSize);if(state.settings.mediaPage>totalPages)state.settings.mediaPage=1;const pageItems=filtered.slice((state.settings.mediaPage-1)*state.settings.mediaPageSize,state.settings.mediaPage*state.settings.mediaPageSize);
    const collection=document.getElementById('mediaCollection');collection.className=state.settings.mediaView==='list'?'media-list':'media-wall';collection.innerHTML=pageItems.length?pageItems.map(item=>{const name=item.sample?localizedHtml(item.name):userHtml(item.name),plainName=item.sample?translateText(item.name):item.name,review=item.sample?localizedHtml(item.review):userHtml(item.review);return`<article class="media-card"><div class="media-cover">${item.cover?`<img src="${item.cover}" alt="${escapeHtml(plainName)}${t('封面')}">`:`<div class="media-placeholder">${name}</div>`}</div><div class="media-card-body"><h3 title="${escapeHtml(plainName)}" ${item.sample?'':'data-user-content'}>${name}</h3><div class="media-meta"><span>${t(item.type)} · ${t(item.status)}</span><span class="media-date">${item.date||''}</span><span class="stars">${item.rating?'★'.repeat(item.rating):t('未评分')}</span></div>${item.review?`<p class="media-review">“${review}”</p>`:''}</div><button class="media-edit" data-action="edit-media" data-id="${item.id}" aria-label="${t('编辑')}">${icon('i-edit')}</button><button class="media-delete" data-action="delete-media" data-id="${item.id}" aria-label="${t('删除')}">${icon('i-trash')}</button></article>`;}).join(''):empty(_mq?('没有匹配「'+escapeHtml(_mediaSearch.trim())+'」的作品'):'这个筛选条件下还没有作品');
    const pager=document.getElementById('mediaPager');if(pager){pager.innerHTML=totalPages>1?`<button data-action="media-prev" ${state.settings.mediaPage<=1?'disabled':''}>上一页</button><span>第 ${state.settings.mediaPage} / ${totalPages} 页 · 共 ${filtered.length} 部</span><button data-action="media-next" ${state.settings.mediaPage>=totalPages?'disabled':''}>下一页</button>`:'';}
  }

  const MOOD_EMOJI_SCORE={'😄':5,'🤩':5,'🥳':5,'😁':5,'😆':5,'🤗':5,'🥰':5,'😊':4,'🙂':4,'😌':4,'😋':4,'😉':4,'😎':4,'😇':4,'😐':3,'😶':3,'🤔':3,'😴':3,'😑':3,'🙃':3,'😔':2,'😕':2,'🥱':2,'😞':2,'😟':2,'🤧':2,'😢':1,'😭':1,'😰':1,'😡':1,'😠':1,'😨':1,'😷':1};
  const MOOD_PALETTE=['😄','🤩','🥳','😁','😆','🤗','🥰','😊','🙂','😌','😋','😉','😎','😇','😐','🤔','😶','😴','😑','🙃','😔','😕','🥱','😞','😟','🤧','😢','😭','😰','😡','😠','😨','😷'];
  function moodEmojiOf(score){const m=state.settings&&state.settings.moodEmoji;if(m&&m[score])return m[score];const d={'5':'😄','4':'🙂','3':'😐','2':'😔','1':'😢'};return d[score]||'😐';}
  /* display emoji of one mood record: prefer stored emoji, else by intensity */
  function moodRecordEmoji(r){const e=(r&&r.data)?(r.data.emoji||''):'';if(e)return e;return moodEmojiOf(r&&r.data?Number(r.data.score):3);}
  function moodScoreOfEmoji(e){e=e||'';return MOOD_EMOJI_SCORE[e]||3;}
  function _moodChosen(){return state.settings._moodEmoji||'😐';}
  function moodColorOf(score){const d={5:'#5f8a70',4:'#a9c4b1',3:'#c6cdd6',2:'#dba3a0',1:'#b0524a'};return d[score]||'#c6cdd6';}
  function _pad2(n){return (n<10?'0':'')+n;}
  function renderMoodCalendar(){
    const el=document.getElementById('moodCalendar');if(!el)return;
    if(!state.settings.moodCalYM)state.settings.moodCalYM=isoDate().slice(0,7);
    const ym=state.settings.moodCalYM,y=Number(ym.slice(0,4)),mo=Number(ym.slice(5,7));
    const first=new Date(y,mo-1,1),daysIn=new Date(y,mo,0).getDate(),lead=first.getDay();
    const records=sortedRecords('mood');
    const byDate={};records.forEach(r=>{byDate[r.date]=(byDate[r.date]||[]).concat(r);});
    document.getElementById('moodCalTitle').textContent=`${y} 年 ${mo} 月`;
    const weekdayEn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],weekdayZh=['日','一','二','三','四','五','六'];
    const wd=(LANG==='en'?weekdayEn:weekdayZh).map(d=>`<div class="cal-weekday">${d}</div>`).join('');
    const today=isoDate();let cells='';
    for(let i=0;i<lead;i++)cells+=`<div class="cal-cell other"></div>`;
    for(let d=1;d<=daysIn;d++){
      const ds=`${ym}-${_pad2(d)}`;const list=byDate[ds]||[];
      const isToday=ds===today,hasMood=list.length>0;
      const ics=hasMood?list.slice(0,2).map(r=>`<span class="mood-ic">${moodRecordEmoji(r)}</span>`).join(''):'';
      const isSel=state.settings.moodSelDate===ds;
      cells+=`<div class="cal-cell ${hasMood?'has-mood':''} ${isToday?'today':''} ${isSel?'sel':''}" data-date="${ds}" data-action="mood-day" data-date2="${ds}"><span class="day-num">${d}</span>${ics}${list.length>2?`<span class="mood-more">+${list.length-2}</span>`:''}</div>`;
    }
    el.innerHTML=wd+cells;
    renderMoodDayDetail();
  }
  /* v48：月历点击后展示当天的心情表情 + 文字记录 */
  function renderMoodDayDetail(){
    const el=document.getElementById('moodDayDetail');if(!el)return;
    const ds=state.settings.moodSelDate||'';
    if(!ds){el.innerHTML='<p class="mini-note">点击月历上的任意一天，查看当天的心情表情与文字记录。</p>';return;}
    const recs=(state.records||[]).filter(r=>r.type==='mood'&&r.date===ds).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    if(!recs.length){el.innerHTML=`<p class="mood-day-empty">${escapeHtml(ds)} 这天还没有心情记录</p>`;return;}
    el.innerHTML=`<div class="mood-day-head"><strong>${escapeHtml(ds)}</strong><span class="mini-note">共 ${recs.length} 条</span></div>`+recs.map(r=>{const e=moodRecordEmoji(r),c=moodColorOf(r.data.score),feel=(r.data.feeling||'').trim();return`<div class="mood-day-item"><div class="mood-emoji" style="background:${c}22;color:${c}">${e}</div><div class="mood-day-body"><span class="mood-day-tag">${escapeHtml(r.data.tag||'')}</span><p class="mood-day-text">${feel?escapeHtml(feel):'<em>这天没有写下文字</em>'}</p></div><button class="delete-btn" data-action="delete" data-id="${r.id}" aria-label="删除">${icon('i-trash')}</button></div>`;}).join('');
  }
  function renderMoodTimeline(){
    const el=document.getElementById('moodList');if(!el)return;
    /* v39：sortedRecords 默认即为「日期倒序+同日按录入时间倒序」，旧的 .reverse() 反而把最新的排到了最后 → 去掉 */
    const records=sortedRecords('mood');
    const PAGE=10,totalPages=Math.max(1,Math.ceil(records.length/PAGE));
    if(!state.settings.moodPage)state.settings.moodPage=1;
    let page=Number(state.settings.moodPage)||1;if(page<1)page=1;if(page>totalPages)page=totalPages;state.settings.moodPage=page;
    const pageRecs=records.slice((page-1)*PAGE,page*PAGE);
    el.innerHTML=pageRecs.length?pageRecs.map(r=>{
      const e=moodRecordEmoji(r),c=moodColorOf(r.data.score),feel=(r.data.feeling||'').trim();
      return`<div class="mood-row"><div class="mood-emoji" style="background:${c}22;color:${c}">${e}</div><span class="mood-date"><small>${escapeHtml(formatDateHeading(r.date))}</small>${feel?`<span class="mood-feel">${escapeHtml(feel)}</span>`:''}</span><button class="delete-btn" data-action="delete" data-id="${r.id}" aria-label="${t('删除')}">${icon('i-trash')}</button></div>`;
    }).join(''):empty('还没有心情记录');
    const pager=document.getElementById('moodPager');if(pager)pager.innerHTML=totalPages>1?`<button data-action="mood-prev" ${page<=1?'disabled':''}>上一页</button><span>第 ${page} / ${totalPages} 页 · 共 ${records.length} 条</span><button data-action="mood-next" ${page>=totalPages?'disabled':''}>下一页</button>`:'';
  }
  function renderMood(){
    const records=sortedRecords('mood'),today=isoDate();
    const todayMoods=records.filter(r=>r.date===today);
    const weekRecords=records.filter(r=>r.date>=shiftDate(-6));
    const weekAvg=weekRecords.length?(weekRecords.reduce((s,r)=>s+r.data.score,0)/weekRecords.length).toFixed(1):'—';
    const moodTodayEl=document.getElementById('moodToday');
    if(moodTodayEl) moodTodayEl.innerHTML=todayMoods.length?todayMoods.map(r=>`<span class="mood-inline">${moodRecordEmoji(r)}</span>`).join(''):'—';
    /* v48：三个顶部小指标模块已移除，保留空值保护避免抛错 */
    const _waEl=document.getElementById('moodWeekAvg');if(_waEl)_waEl.textContent=weekAvg;
    const _mtEl=document.getElementById('moodTotal');if(_mtEl)_mtEl.textContent=records.length;
    const cur=_moodChosen(),wrap=document.getElementById('moodEmojis');
    if(wrap){
      const set=MOOD_PALETTE.slice();if(cur&&!set.includes(cur))set.unshift(cur);
      wrap.innerHTML=set.map(e=>`<button type="button" class="mood-emoji-opt ${e===cur?'selected':''}" data-action="mood-emoji" data-emoji="${e}" aria-label="选择表情">${e}</button>`).join('');
    }
    const cus=document.getElementById('moodCustomEmoji');if(cus&&!cus.value.trim())cus.value='';
    renderMoodCalendar();
    renderMoodTimeline();
  }
  function _tlMeta(type){return TYPE_META[type]||(type==='media'?{label:'书影音库',icon:'i-media',tone:'sand'}:type==='habit'?{label:'习惯',icon:'i-habit',tone:'sage'}:{label:'生活',icon:'i-home',tone:'plum'});}
  function _dateValid(x){return /^\d{4}-\d{2}-\d{2}$/.test(x||'');}
  function _buildTimelineEvents(){
    var ev=[],i,r;
    /* v34：待买清单(home)与物品存储(storage)属「常驻清单/库存」，非某天操作日志；云端无可靠记录日期，
     * 旧 merge 曾强行把它们的 date 写成"今天"，导致每次同步都污染当天时间轴。统一从「按天时间轴」剔除，
     * 其增删改在各自主模块查看，不再冒充当日操作（用户红线：勿再出现未操作却挂在今天）。 */
    for(i=0;i<state.records.length;i++){r=state.records[i];if(!r||!r.date||!r.data)continue;if(r.type==='home'||r.type==='storage')continue;var m=_tlMeta(r.type),dd=recordDetailHtml(r),vv=valueFor(r);if(r.type==='diet'){var _d=r.data||{},_q=r.sample?localizedHtml(_d.food||t('饮食记录')):userHtml(_d.food||t('饮食记录'));dd=_q+' · '+(r.sample?localizedHtml(_d.meal||t('早餐')):userHtml(_d.meal||t('早餐')));vv=(_d.calories||0)?(_d.calories||0)+' kcal':'';}ev.push({date:r.date,at:Number(r.createdAt||0),type:r.type,label:m.label,icon:m.icon,tone:m.tone,title:recordTitleHtml(r),detail:dd,value:vv});}
    (state.mediaItems||[]).forEach(function(it){if(!it||!it.name||!_dateValid(it.date))return;var st=it.status||'想看',mv=_tlMeta('media');ev.push({date:it.date,at:Number(it.createdAt||0),type:'media',label:mv.label,icon:mv.icon,tone:mv.tone,title:(it.sample?localizedHtml(it.name):userHtml(it.name)),detail:t(it.type||'电影')+' · '+t(st)+(it.review?(' “'+(it.sample?localizedHtml(it.review):userHtml(it.review))+'”'):''),value:it.rating?'★'.repeat(it.rating):''});});
    (state.habits||[]).forEach(function(hh){if(!hh||!hh.entries)return;Object.keys(hh.entries).forEach(function(date){if(!_dateValid(date))return;var v=Number(hh.entries[date]||0);if(!v)return;var isBuilt=HABIT_DEFS.some(function(d){return d.key===hh.key;}),hv=_tlMeta('habit');ev.push({date:date,at:0,type:'habit',label:hv.label,icon:hv.icon,tone:hv.tone,title:(isBuilt||hh.sample)?localizedHtml(hh.name):userHtml(hh.name),detail:(habitDone(hh,date)?t('已完成'):(LANG==='en'?'Value '+v:t('记录')+' '+v)),value:(hh.type==='check'?t('完成'):String(v)+(hh.unit?' '+(hh.unit):''))});});});
    return ev;
  }
    /* ====================== 经期模块 ====================== */
  const PERIOD_SYMPTOMS=['疲倦','失眠','乳房胀痛','腹痛','浮肿','心情低落','亢奋','食欲增加','头痛','腰酸'];
  const PERIOD_DISCHARGES=['无','粘稠','水样','蛋清样'];
  const PERIOD_PHASES=[
    {key:'menstrual',label:'月经期',emoji:'🩸',color:'#b0524a',dayRange:'1~5',note:'注意保暖，避免生冷和剧烈运动。可能出现：<b>腹痛、疲倦、情绪低落、经量变化</b>。'},
    {key:'follicular',label:'卵泡期',emoji:'🌱',color:'#5f8a70',dayRange:'6~14',note:'精力旺盛，皮肤状态好。常见：<b>心情愉悦、思维敏捷</b>，适合开始新计划。'},
    {key:'ovulation',label:'排卵期',emoji:'🌸',color:'#4a7aa8',dayRange:'14~16',note:'分泌物蛋清样拉丝是典型表现。常见：<b>轻微腹痛、性欲增强、心情愉悦</b>。'},
    {key:'luteal',label:'黄体期',emoji:'🌙',color:'#8a94a6',dayRange:'17~28',note:'体内孕酮升高。可能：<b>乳房胀痛、浮肿、疲倦、失眠、情绪波动</b>，想吃甜食属正常。'}
  ];

  async function periodHashPin(pin, salt){
    try{
      const enc=new TextEncoder();
      const buf=await crypto.subtle.digest('SHA-256', enc.encode(salt+pin));
      return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){
      /* 兜底：简单 djb2 哈希（无 SubtleCrypto 时） */
      let h=5381;
      const s2=salt+pin;
      for(let i=0;i<s2.length;i++) h=((h<<5)+h+s2.charCodeAt(i))|0;
      return ('djb2_'+((h>>>0).toString(16)));
    }
  }
  function periodPinExists(){ return !!(state.settings && state.settings.periodPinHash); }
  function periodSavePin(hash, salt){
    if(!state.settings) state.settings={};
    state.settings.periodPinHash=hash;
    state.settings.periodPinSalt=salt;
    saveState();
  }
  function periodClearPin(){
    if(!state.settings) return;
    delete state.settings.periodPinHash;
    delete state.settings.periodPinSalt;
    sessionStorage.removeItem('unlockPeriod');
    saveState();
  }
  function periodUnlocked(){ return sessionStorage.getItem('unlockPeriod')==='1'; }
  function periodMarkUnlocked(){ sessionStorage.setItem('unlockPeriod','1'); }
  function periodLock(){ sessionStorage.removeItem('unlockPeriod'); }

  function _periodResetForm(){
    state._periodForm = {isStartDay:false, isPeriodDay:false, isEndDay:false, discharge:'', symptoms:[], pad:0, night:0};
    var f=document.getElementById('periodForm');
    if(f){ try{f.reset();}catch(e){} var d=f.elements.date; if(d)d.value=isoDate(); }
    var score=document.getElementById('periodMoodScore'); if(score) score.value='5';
    var sv=document.getElementById('periodMoodScoreVal'); if(sv) sv.textContent='5';
    var pv=document.getElementById('periodPadVal'); if(pv) pv.textContent='0';
    var nv=document.getElementById('periodNightVal'); if(nv) nv.textContent='0';
    document.querySelectorAll('.period-state-btn').forEach(function(b){b.classList.remove('active');});
    document.querySelectorAll('[data-chip-group] .chip').forEach(function(c){c.classList.remove('active');});
  }

  function analyzePeriod(records){
    records=(records||[]).filter(function(r){return r.type==='period';});
    var today=isoDate();
    /* v27：starts 数组去重——如果历史脏数据有同日多条 isStartDay=Y，避免 starts 出现重复日期引发"同一周期显示 N 次" */
    var starts=Array.from(new Set(records.filter(function(r){return r.data && r.data.isStartDay==='Y';}).map(function(r){return r.date;}))).sort();
    /* 只算已结束周期：starts 数组最后一个是「当前」未闭合周期，不进入 cycles */
    var closedStarts=starts.length>=2?starts.slice(0,-1):starts.slice();
    var cycles=[];
    for(var i=1;i<starts.length;i++){
      /* 跳过最后一个 starts（未闭合）→ 仅在 starts 长度>=3 时排除 i=last */
      if(i===starts.length-1 && starts.length>=3) continue;
      cycles.push(daysBetween(starts[i-1],starts[i]));
    }
    var recent=cycles.slice(-3);
    var avgCycle=recent.length?Math.round(recent.reduce(function(a,b){return a+b;},0)/recent.length):28;
    if(!recent.length && starts.length) avgCycle=28;  /* 只有 1 次记录时用默认 28 */
    var periodLens=[];
    var periodEnds=[];
    var cyclesExpanded=[]; /* v28：每个周期展开成 days 数组，用于历史卡片"每日详情"展示。不创建新 record（防止 v27 那种同步翻倍）。 */
    var isLastCycle; /* v28 修复：仅当前未闭合周期才能延伸到 today，历史周期必须用末日或下个首日前一天 */
    for(var j=0;j<starts.length;j++){
      var startDate=starts[j];
      var nextStart=starts[j+1];
      isLastCycle = (j === starts.length - 1);
      /* 取本周期内所有「末日」标记的最大日期（用户只标首末时，这是关键） */
      var endDayRecs=records.filter(function(r){return r.data && r.data.isEndDay==='Y' && r.date>=startDate && (!nextStart || r.date<nextStart);});
      var lastEndDay=endDayRecs.length?endDayRecs[endDayRecs.length-1].date:null;
      var endDate;
      if(lastEndDay){
        /* 有末日标记 → 取末日与边界的较小值（v26 矫正：末日超出本周期夹到边界） */
        if(nextStart){
          var nextStartMinus1=shiftDate(-1,new Date(nextStart));
          endDate = (lastEndDay <= nextStartMinus1) ? lastEndDay : nextStartMinus1;
        } else {
          endDate = (lastEndDay <= today) ? lastEndDay : today;
        }
      } else {
        /* v28：无末日标记 → 当前周期到 today；历史周期① v26:有下个首日则用 nextStart-1 ② v28 修复:孤儿历史(无下个首日)=startDate */
        if(isLastCycle){
          endDate = today;
        } else if(nextStart){
          endDate = shiftDate(-1, new Date(nextStart));
        } else {
          endDate = startDate;
        }
      }
      periodEnds.push(endDate);
      /* 经期天数：优先 isPeriodDay 精确计数；否则用首末间隔天数（自动补全用户只标首末的场景）
       * v31：经期长度必须落在合理区间(1~15天)。超长(如36天)判定为脏数据/误录 → 不计入经期均值。
       *      此前 periodDayCount 无上限，历史脏数据可能给出"平均36天经期"的臆造值。 */
      var periodDayCount=records.filter(function(r){return r.data && r.data.isPeriodDay==='Y' && r.date>=startDate && r.date<=endDate;}).length;
      var spanDays=daysBetween(startDate,endDate)+1;
      var rawLen = periodDayCount>0 ? periodDayCount : (spanDays>=2 && spanDays<=15 ? spanDays : 0);
      var len = (rawLen>=1 && rawLen<=15) ? rawLen : 0;
      /* v31：只有「已经结束且落于过去」的周期才计入经期均值。
       * 旧逻辑 (j<starts.length-1 || lastEndDay) 只排除"未标末日的当前周期"，
       * 但今天同时标了首日+末日仍会被计入 → 这正是"仅一条今天记录就显示 1/36 天经期"的根因。
       * 统一改为 endDate < today（严格过去）判定，把"当前正在进行的周期"排除出历史样本。 */
      if(len>0 && endDate < today) periodLens.push(len);
      /* v28 展开每一天 */
      var days=[];
      try{
        var dc=new Date(startDate+'T00:00:00');
        var de=new Date(endDate+'T00:00:00');
        var manualMidDays=records.filter(function(r){return r.data && r.data.isPeriodDay==='Y' && r.date>=startDate && r.date<=endDate;}).map(function(r){return r.date;});
        while(dc<=de){
          var ds=isoDate(dc);
          var dayRec=records.find(function(r){return r.date===ds;});
          var source;
          if(ds===startDate) source='start';
          else if(ds===endDate && lastEndDay===ds) source='end';
          else if(manualMidDays.indexOf(ds)>=0) source='mid-manual';
          else source='mid-auto';
          days.push({date:ds, source:source, record:dayRec||null});
          dc.setDate(dc.getDate()+1);
        }
      }catch(e){ days=[]; }
      cyclesExpanded.push({startDate:startDate, endDate:endDate, hasEndMark:!!lastEndDay, closed:(endDate < today), days:days});
    }
    var avgPeriod=periodLens.length?Math.round(periodLens.reduce(function(a,b){return a+b;},0)/periodLens.length):5;
    var lastStart=starts[starts.length-1]||null;
    var phase='follicular', phaseDay=0, phaseInfo=null, nextPredicted=null, phaseNote='', dayOfCycle=null;
    if(lastStart){
      dayOfCycle=daysBetween(lastStart,today)+1;
      var ovulationDay=avgCycle-14;
      if(dayOfCycle<=avgPeriod){ phase='menstrual'; }
      else if(dayOfCycle<=ovulationDay-2){ phase='follicular'; }
      else if(dayOfCycle<=ovulationDay+2){ phase='ovulation'; }
      else { phase='luteal'; }
      phaseInfo=PERIOD_PHASES.find(function(p){return p.key===phase;});
      phaseDay=dayOfCycle;
      /* v30 修复：cycles.length===0 表示还没形成完整周期（只有 1 条 starts，或多条 starts 但还没闭合），
       * 此时按默认 28 天预测下次经期会误导用户。nextPredicted 必须为 null，让 hero 显示「样本不足」。
       * cycles.length===1 是刚刚形成第 1 个周期，可以预测但样本不足（hero 已展示"样本不足"标识）。 */
      nextPredicted = cycles.length > 0 ? shiftDate(avgCycle, new Date(lastStart)) : null;
      var span='';
      if(periodLens.length>0){  /* v31：仅在存在真实历史经期样本时才显示"/平均间隔"，否则不臆造经期长度 */
        if(dayOfCycle<=avgPeriod) span='第 '+dayOfCycle+' / '+avgPeriod+' 天';
        else if(dayOfCycle<=ovulationDay-2) span='第 '+(dayOfCycle-avgPeriod)+' 天（周期第 '+dayOfCycle+' 天）';
        else if(dayOfCycle<=ovulationDay+2) span='周期第 '+dayOfCycle+' 天';
        else span='第 '+(dayOfCycle-ovulationDay-2)+' 天（周期第 '+dayOfCycle+' 天）';
      } else {
        span='第 '+dayOfCycle+' 天';  /* 无历史样本时只显示当前天数，不显示"经期预计 N 天" */
      }
      phaseNote='<b>'+phaseInfo.label+'</b> · '+span+'<br>'+phaseInfo.note;
    }
    return {records:records, starts:starts, cycles:cycles, recentCycles:recent, avgCycle:avgCycle, avgPeriod:avgPeriod, periodLens:periodLens, periodEnds:periodEnds, cyclesExpanded:cyclesExpanded, lastStart:lastStart, currentPhase:phase, phaseInfo:phaseInfo, phaseDay:phaseDay, dayOfCycle:dayOfCycle, nextPredicted:nextPredicted, phaseNote:phaseNote};
  }

  function renderPeriod(){
    var lockPanel=document.getElementById('periodLockPanel');
    var content=document.getElementById('periodContent');
    var dateLabel=document.getElementById('periodDateToday');
    if(dateLabel) dateLabel.textContent=isoDate();
    if(!lockPanel || !content) return;
    if(!state._periodForm) _periodResetForm();
    if(!periodPinExists()){
      lockPanel.hidden=false; content.hidden=true;
      document.getElementById('periodLockSetup').hidden=false;
      document.getElementById('periodLockEnter').hidden=true;
      document.querySelector('.lock-title').textContent='首次使用，请设置 4 位 PIN';
      document.querySelector('.lock-desc').textContent='PIN 用于解锁经期数据；设置后跨设备同步（哈希值存储）。';
      return;
    }
    if(!periodUnlocked()){
      lockPanel.hidden=false; content.hidden=true;
      document.getElementById('periodLockSetup').hidden=true;
      document.getElementById('periodLockEnter').hidden=false;
      document.querySelector('.lock-title').textContent='经期数据已加密';
      document.querySelector('.lock-desc').textContent='输入 4 位 PIN 解锁。';
      var attemptEl=document.getElementById('periodLockHint');
      if(attemptEl) attemptEl.textContent='';
      return;
    }
    lockPanel.hidden=true; content.hidden=false;

    /* v29：顶部下次经期预测 hero 卡 —— 基于 analyzePeriod 智能预测 */
    var nextHeroEl=document.getElementById('periodNextHero');
    var b=analyzePeriod(state.records||[]);
    if(nextHeroEl){
      var heroHtml='';
      if(b.nextPredicted){
        var daysToNext=daysBetween(isoDate(),b.nextPredicted);
        var ovDay=shiftDate(Math.max(14,b.avgCycle)-14,new Date(b.lastStart));
        var daysTxt=daysToNext>=0?('还有 <b>'+daysToNext+'</b> 天'):('已过 <b>'+Math.abs(daysToNext)+'</b> 天');
        var sampleTxt=b.cycles.length>=2?('<span>基于最近 <b>'+b.cycles.length+'</b> 次周期 · 平均 <b>'+b.avgCycle+'</b> 天</span>'):'<span>样本不足，仅供参考</span>';
        heroHtml='<div style="flex:1;min-width:200px">';
        heroHtml+='<span class="next-label">下次经期预测</span>';
        heroHtml+='<span class="next-date">'+b.nextPredicted+'</span>';
        heroHtml+='<div class="next-meta">';
        heroHtml+=sampleTxt;
        heroHtml+='<span>排卵日 <b>'+ovDay+'</b></span>';
        heroHtml+='</div></div>';
        heroHtml+='<div class="next-days">';
        heroHtml+='<b>'+(daysToNext>=0?daysToNext:0)+'</b>';
        heroHtml+='<small>'+(daysToNext>=0?'天 后':'已逾期')+'</small>';
        heroHtml+='</div>';
        nextHeroEl.classList.remove('no-prediction');
      } else if(b.lastStart){
        heroHtml='<div style="flex:1;min-width:200px">';
        heroHtml+='<span class="next-label">下次经期预测</span>';
        heroHtml+='<span class="next-date">—</span>';
        heroHtml+='<div class="next-meta"><span>样本不足，记录更多周期后会自动预测</span></div>';
        heroHtml+='</div>';
        nextHeroEl.classList.add('no-prediction');
      } else {
        heroHtml='<div style="flex:1;min-width:200px">';
        heroHtml+='<span class="next-label">下次经期预测</span>';
        heroHtml+='<span class="next-date">记录一次「经期首日」</span>';
        heroHtml+='<div class="next-meta"><span>开始记录后这里会基于历史智能预测</span></div>';
        heroHtml+='</div>';
        nextHeroEl.classList.add('no-prediction');
      }
      nextHeroEl.innerHTML=heroHtml;
    }

    /* 状态卡 */
    var statusEl=document.getElementById('periodStatus');
    var a=analyzePeriod(state.records||[]);
    var statusHtml='';
    if(a.lastStart){
      statusHtml='<span class="phase-tag">'+a.phaseInfo.label+'</span>';
      statusHtml+='<h2>'+(a.lastStart)+' 起 · '+a.phaseInfo.emoji+'</h2>';
      statusHtml+='<div class="phase-day">'+a.phaseNote+'</div>';
      /* v30 修复：cycles.length===0 时没有真实"平均周期"概念（avgCycle=28 是 v26 兜底默认值，会误导），
       * 此时只显示经期均值（如有）；周期均值留白并提示"记录更多周期后显示"。 */
      statusHtml+='<div class="prediction">';
      if(a.cycles.length>0){
        statusHtml+='<span>平均<b>'+a.avgCycle+'</b>天周期 <small style="opacity:.6;font-weight:400">· '+a.cycles.length+' 次样本</small></span>';
      } else {
        statusHtml+='<span style="color:var(--muted);font-size:12px">记录更多周期后显示周期均值</span>';
      }
      if(a.periodLens.length>0){
        statusHtml+='<span>平均<b>'+a.avgPeriod+'</b>天经期 <small style="opacity:.6;font-weight:400">· '+a.periodLens.length+' 次样本</small></span>';
      }
      statusHtml+='</div>';
    } else {
      statusHtml='<span class="phase-tag">未开始记录</span>';
      statusHtml+='<h2>记录今天的身体状况</h2>';
      statusHtml+='<div class="phase-day">至少标记一次「经期首日」后，这里会显示当前阶段、智能预测和阶段提示。</div>';
    }
    statusEl.innerHTML=statusHtml;

    /* 阶段概览 */
    var analysisEl=document.getElementById('periodAnalysis');
    var phasesHtml='<h3>周期 4 阶段</h3><div class="phases-grid">';
    PERIOD_PHASES.forEach(function(p){
      var cls='phase-card'+(a.currentPhase===p.key?' current':'');
      phasesHtml+='<div class="'+cls+'">';
      phasesHtml+='<div class="emoji">'+p.emoji+'</div>';
      phasesHtml+='<b>'+p.label+'</b>';
      phasesHtml+='<small>'+p.dayRange+' 天</small>';
      if(a.currentPhase===p.key) phasesHtml+='<small style="color:var(--plum);font-weight:700">← 当前</small>';
      phasesHtml+='</div>';
    });
    phasesHtml+='</div>';
    if(a.lastStart && a.nextPredicted){
      var daysToNext=daysBetween(isoDate(),a.nextPredicted);
      if(daysToNext>=0) phasesHtml+='<p style="margin:12px 0 0;color:var(--muted);font-size:12px">距下次预测 <b>'+daysToNext+'</b> 天</p>';
    }
    analysisEl.innerHTML=phasesHtml;

    /* 周期历史 —— v28：每个周期一行总览 + 可展开的每日详情（中间未手动打卡的日期自动标记为「经期中（自动补）」）
     * v39：改为「已结束周期 + 当前进行中周期」都列入历史（本月经期不再凭空消失），进行中一行加 .ongoing 标记与「进行中」徽标；
     *      统计口径完全不受影响——periodLens 仍要求 endDate<today，进行中周期不进均值样本，不会臆造"1 天平均经期"。 */
    var histEl=document.getElementById('periodHistory');
    var historyHtml='';
    var _pastCyc=[];
    if(a.cyclesExpanded && a.cyclesExpanded.length){
      a.cyclesExpanded.forEach(function(cyc,ci){
        if(!cyc || !cyc.startDate) return;
        if(cyc.startDate > isoDate()) return;           /* 未来日期的记录不进历史 */
        _pastCyc.push({i:ci,cyc:cyc});
      });
    }
    if(_pastCyc.length){
      _pastCyc.reverse().forEach(function(item){
        var idx=item.i; var cyc=item.cyc;
        var periodLen=cyc.days.length;
        var cycleLen=(idx>0)?a.cycles[idx-1]:null;
        var pads=state.records.filter(function(r){return r.type==='period'&&r.date>=cyc.startDate&&r.date<=cyc.endDate&&(r.data.pad||r.data.night);}).reduce(function(acc,r){return acc+(r.data.pad||0)+(r.data.night||0);},0);
        var autoCnt=cyc.days.filter(function(d){return d.source==='mid-auto';}).length;
        var manualCnt=cyc.days.filter(function(d){return d.source==='mid-manual';}).length;
        var endMarkTxt=cyc.hasEndMark?('至 '+cyc.endDate):'进行中';
        var ongoing=!cyc.closed;   /* v39：进行中的周期也回显，但标注出来，避免与"已结束"混淆 */
        historyHtml+='<div class="period-history-row'+(ongoing?' ongoing':'')+'" data-cycle-row="'+idx+'">';
        historyHtml+='<div class="history-main">';
        historyHtml+='<strong>'+cyc.startDate+'</strong> <small>→ '+endMarkTxt+'</small>'+(ongoing?' <span class="hist-ongoing-tag">进行中</span>':'');
        historyHtml+='<div class="history-meta">';
        historyHtml+='<span class="len">'+(ongoing?('已记录 '+periodLen+' 天'):(periodLen+' 天经期'));
        if(autoCnt){ historyHtml+=' <small style="color:var(--muted);font-weight:400">（自动补 '+autoCnt+' 天'; if(manualCnt){ historyHtml+=' · 手记 '+manualCnt; } historyHtml+='）</small>'; }
        if(cycleLen){ historyHtml+=' / '+cycleLen+' 天周期'; }
        historyHtml+='</span>';
        historyHtml+='<span class="pads">'+(pads||0)+' 片用品</span>';
        historyHtml+='</div></div>';
        historyHtml+='<button class="expand-btn" data-action="toggle-cycle" data-cycle-idx="'+idx+'" aria-label="展开每日详情" aria-expanded="false"><svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></button>';
        historyHtml+='</div>';
        /* 每日详情（默认折叠）—— v28：不创建新 record，仅展示派生数据 */
        historyHtml+='<div class="period-cycle-days" id="cycle-days-'+idx+'" hidden>';
        cyc.days.forEach(function(d){
          var lblMap={start:'🩸 首日','mid-manual':'经期中','end':'🩸 末日','mid-auto':'经期中（自动补）'};
          var lbl=lblMap[d.source]||'—';
          var rec=d.record||(d.record && d.record.data?d.record:null);
          var dd = rec && rec.data ? rec.data : {};
          var padInfo='', moodInfo='';
          if(dd){
            if((dd.pad||dd.night)) padInfo='用品 '+(dd.pad||0)+'+'+(dd.night||0);
            if(dd.moodScore!=null && dd.moodScore!=='') moodInfo='心情 '+dd.moodScore+'/10';
            if(dd.discharge) padInfo += (padInfo?' · ':'') + '分泌物 '+dd.discharge;
          }
          historyHtml+='<div class="period-day-row '+d.source+'">';
          historyHtml+='<span class="day-date">'+d.date+'</span>';
          historyHtml+='<span class="day-label">'+lbl+'</span>';
          historyHtml+='<small class="day-info">'+(padInfo||(moodInfo?moodInfo:'-'))+(moodInfo && padInfo?' · '+moodInfo:'')+'</small>';
          historyHtml+='</div>';
        });
        historyHtml+='</div>';
      });
    } else {
      historyHtml='<div class="empty-state">还没有经期记录</div>';
    }
    histEl.innerHTML=historyHtml;

    /* 用量统计 */
    var statsEl=document.getElementById('periodStats');
    var currentStart=a.starts[a.starts.length-1]||null;
    var currentEnd=(a.periodEnds&&a.periodEnds.length)?a.periodEnds[a.periodEnds.length-1]:isoDate();
    var currentRecs=currentStart?(state.records.filter(function(r){return r.type==='period'&&r.date>=currentStart&&r.date<=currentEnd})):[];
    var curPad=currentRecs.reduce(function(acc,r){return acc+(r.data.pad||0);},0);
    var curNight=currentRecs.reduce(function(acc,r){return acc+(r.data.night||0);},0);
    var allRecs=state.records.filter(function(r){return r.type==='period'&&(r.data.pad||r.data.night);});
    var allPad=allRecs.reduce(function(acc,r){return acc+(r.data.pad||0);},0);
    var allNight=allRecs.reduce(function(acc,r){return acc+(r.data.night||0);},0);
    var curPeriodLen=0;
    /* v31："本次经期 N 天"显示当前进行中的周期已记录的经期天数（=当前周期内 isPeriodDay 数量），
     * 不再用历史经期均值(periodLens)充当天数，避免"仅一条今天记录却显示 36 天"的误报。 */
    if(a.lastStart){
      var _curEnd=(a.periodEnds && a.periodEnds.length)?a.periodEnds[a.periodEnds.length-1]:isoDate();
      curPeriodLen=state.records.filter(function(r){return r.type==='period'&&r.data&&r.data.isPeriodDay==='Y'&&r.date>=a.lastStart&&r.date<=_curEnd;}).length||0;
    }
    statsEl.innerHTML='<div class="stat-card"><span>本次经期</span><b>'+curPad+'</b>片卫生巾 · '+curNight+'条安睡裤</div>'
      +'<div class="stat-card"><span>累计</span><b>'+allPad+'</b>片卫生巾 · '+allNight+'条安睡裤</div>'
      +'<div class="stat-card"><span>本次经期</span><b>'+curPeriodLen+'</b>天</div>';

    /* 情绪统计（按阶段） */
    var moodEl=document.getElementById('periodMoodStats');
    var moodHtml='';
    PERIOD_PHASES.forEach(function(p){
      var phaseRecords=[];
      a.starts.forEach(function(s,si){
        var startD=s;
        var endD=(a.periodEnds&&a.periodEnds[si])?a.periodEnds[si]:isoDate();
        var darr=[];
        for(var d=new Date(startD);d<=new Date(endD);d.setDate(d.getDate()+1)){ darr.push(isoDate(d)); }
        var phaseKey='menstrual';
        var avgC=a.avgCycle, avgP=a.avgPeriod;
        var ovDay=avgC-14;
        darr.forEach(function(dateStr){
          var dc=daysBetween(startD,dateStr)+1;
          if(dc<=avgP) phaseKey='menstrual';
          else if(dc<=ovDay-2) phaseKey='follicular';
          else if(dc<=ovDay+2) phaseKey='ovulation';
          else phaseKey='luteal';
          if(phaseKey===p.key){
            var rec=state.records.find(function(r){return r.type==='period'&&r.date===dateStr;});
            if(rec && rec.data && rec.data.moodScore!=null && rec.data.moodScore!=='' && rec.data.moodScore!==undefined){
              phaseRecords.push(Number(rec.data.moodScore));
            }
          }
        });
      });
      var avg=phaseRecords.length?(phaseRecords.reduce(function(a,b){return a+b;},0)/phaseRecords.length).toFixed(1):'—';
      var color=(p.key===a.currentPhase)?'var(--plum)':'var(--muted)';
      moodHtml+='<div class="mood-stat-cell">';
      moodHtml+='<div class="emoji">'+p.emoji+'</div>';
      moodHtml+='<b>'+avg+'</b>';
      moodHtml+='<small>'+p.label+' · '+phaseRecords.length+' 条</small>';
      moodHtml+='</div>';
    });
    moodEl.innerHTML=moodHtml;

    /* 渲染表单状态（state._periodForm → DOM） */
    var pf=state._periodForm;
    document.querySelectorAll('.period-state-btn').forEach(function(b){
      var t=b.dataset.periodState;
      b.classList.toggle('active', (t==='start'&&pf.isStartDay)||(t==='mid'&&pf.isPeriodDay&&!pf.isStartDay&&!pf.isEndDay)||(t==='end'&&pf.isEndDay));
    });
    document.querySelectorAll('[data-chip-group="discharge"] .chip').forEach(function(c){c.classList.toggle('active', c.dataset.value===pf.discharge);});
    document.querySelectorAll('[data-chip-group="symptom"] .chip').forEach(function(c){c.classList.toggle('active', pf.symptoms.indexOf(c.dataset.value)>=0);});
    document.getElementById('periodPadVal').textContent=pf.pad||0;
    document.getElementById('periodNightVal').textContent=pf.night||0;
  }

  function renderPeriodHistory(){ renderPeriod(); }

  function daysBetween(d1,d2){
    var a=new Date(d1+'T00:00:00'), b=new Date(d2+'T00:00:00');
    return Math.round((b.getTime()-a.getTime())/(24*60*60*1000));
  }

function renderArchive(){const filter=state.settings.archiveFilter||'all';document.querySelectorAll('#archiveFilters button').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));const ev=_buildTimelineEvents().filter(e=>filter==='all'||e.type===filter);ev.sort((a,b)=>{const c=b.date.localeCompare(a.date);return c?c:(b.at||0)-(a.at||0);});const el=document.getElementById('archiveList');if(!el)return;if(!ev.length){el.innerHTML=empty('这个范围还没有记录');return;}let html='',cur='';ev.forEach(e=>{if(e.date!==cur){cur=e.date;html+=`<div class="tl-date">${formatDateHeading(cur)}</div>`;}const m=_tlMeta(e.type);html+=`<div class="tl-item"><span class="tl-dot ${m.tone}">${icon(m.icon)}</span><div class="tl-card"><span class="type-tag">${t(m.label)}</span><strong>${e.title}</strong><small>${e.detail}</small>${e.value?`<span class="tl-value">${escapeHtml(e.value)}</span>`:''}</div></div>`;});el.innerHTML=`<div class="timeline">${html}</div>`;}
  function renderBackupStatus(){document.getElementById('clearSamplesBtn').hidden=!state.records.length&&!state.mediaItems.length&&!state.habits.some(h=>Object.keys(h.entries||{}).length);}
  function renderHabitManageList(){const list=document.getElementById('habitManageList');list.innerHTML=state.habits.length?state.habits.map(h=>{const isBuiltIn=HABIT_DEFS.some(def=>def.key===h.key)||h.sample,hdef=HABIT_DEFS.find(d=>d.key===h.key),unit=h.type==='check'?localizedHtml('次'):hdef?escapeHtml(resolveHabitUnit(hdef)):isBuiltIn?localizedHtml(h.unit):userHtml(h.unit);return`<div class="custom-manage-row"><span><strong>${habitNameHtml(h)}</strong><small>${t(h.type==='check'?'完成 / 未完成':h.type==='counter'?'计数累加':'填写数值')} · ${LANG==='en'?'Target':'目标'} ${h.target} ${unit}</small></span><button type="button" data-action="delete-habit-custom" data-id="${h.id}" aria-label="${t('删除习惯')}">${icon('i-trash')}</button></div>`;}).join(''):empty('还没有习惯');}
  function openHabitSettings(){renderHabitManageList();document.getElementById('habitSettings').hidden=false;setTimeout(()=>document.getElementById('habitSettingsForm').elements.name.focus(),80);}
  function closeHabitSettings(){document.getElementById('habitSettings').hidden=true;}
  function renderPlanManageList(){const list=document.getElementById('planManageList');list.innerHTML=state.settings.weeklyPlan.length?state.settings.weeklyPlan.map(item=>{const isDefault=DEFAULT_PLAN.some(plan=>plan.id===item.id),title=isDefault?(LANG==='en'&&item.titleEn?item.titleEn:localizedHtml(item.title)):userHtml(item.title),note=isDefault?(LANG==='en'&&item.noteEn?item.noteEn:localizedHtml(item.note||'无补充说明')):userHtml(item.note||t('无补充说明'));return`<div class="custom-manage-row"><span><strong>${title}</strong><small>${t(item.group)} · ${note}</small></span><button type="button" data-action="delete-plan" data-id="${item.id}" aria-label="${t('删除计划')}">${icon('i-trash')}</button></div>`;}).join(''):empty('还没有周计划');}
  var _editingMediaId=null;
  function openMediaEditor(it){_editingMediaId=it.id;var f=document.getElementById('mediaForm');if(!f)return;f.elements.name.value=it.name||'';f.elements.type.value=it.type||'电影';f.elements.status.value=it.status||'想看';f.elements.rating.value=String(it.rating||0);f.elements.date.value=it.date||isoDate();f.elements.review.value=it.review||'';pendingMediaCover=it.cover||'';var _cue=document.getElementById('mediaCoverUrl');if(_cue)_cue.value=(_isHttpUrl(it.cover)?it.cover:'');var pv=document.getElementById('mediaCoverPreview');if(it.cover){pv.style.backgroundImage='url('+it.cover+')';pv.closest('.cover-upload').classList.add('has-cover');}else{pv.style.backgroundImage='';pv.closest('.cover-upload').classList.remove('has-cover');}var sb=f.querySelector('button[type=submit]');if(sb)sb.textContent='保存修改';var v=document.getElementById('view-media');if(v)v.scrollIntoView({behavior:'smooth'});toast('正在编辑：'+(it.sample?translateText(it.name):it.name));}
  function openPlanSettings(){renderPlanManageList();document.getElementById('planSettings').hidden=false;setTimeout(()=>document.getElementById('planSettingsForm').elements.title.focus(),80);}
  function closePlanSettings(){document.getElementById('planSettings').hidden=true;}
  function openFitnessProfile(){const form=document.getElementById('fitnessProfileForm'),profile=state.settings.fitnessProfile;['height','target','startWeight','age','sex','activity'].forEach(key=>form.elements[key].value=profile[key]);document.getElementById('fitnessProfileSettings').hidden=false;setTimeout(()=>form.elements.height.focus(),80);}
  function closeFitnessProfile(){document.getElementById('fitnessProfileSettings').hidden=true;}

  function applyBrand(){
    const brand=state.settings.brand||{name:'日常集',avatar:'日',tagline:'生活有迹可循',theme:'plum'},isDefault=brand.name==='日常集'&&brand.avatar==='日'&&brand.tagline==='生活有迹可循';
    const themes={plum:{primary:'#33506b',soft:'#e4eaf0'},forest:{primary:'#3d5a4c',soft:'#dfe8e2'},clay:{primary:'#7a5a48',soft:'#ece2db'},navy:{primary:'#2e3440',soft:'#dfe2e8'}};
    const theme=themes[brand.theme]||themes.plum;
    document.documentElement.style.setProperty('--plum',theme.primary);document.documentElement.style.setProperty('--plum-soft',theme.soft);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme.primary);
    const avatar=document.getElementById('brandAvatar'),name=document.getElementById('brandName'),tagline=document.getElementById('brandTagline');[avatar,name,tagline].forEach(element=>element.toggleAttribute('data-user-content',!isDefault));avatar.textContent=isDefault?t('日'):(brand.avatar||'日');name.textContent=isDefault?t('日常集'):(brand.name||'日常集');tagline.textContent=isDefault?t('生活有迹可循'):(brand.tagline||'生活有迹可循');document.title=`${isDefault?t('日常集'):(brand.name||'日常集')} · ${t('生活工作台')}`;
  }
  function openBrandSettings(){const brand=state.settings.brand;const form=document.getElementById('brandForm');const isDefault=brand.name==='日常集'&&brand.avatar==='日'&&brand.tagline==='生活有迹可循';form.elements.name.value=isDefault&&LANG==='en'?'Daily Atlas':brand.name;form.elements.avatar.value=isDefault&&LANG==='en'?'D':brand.avatar;form.elements.tagline.value=isDefault&&LANG==='en'?'A life you can trace':brand.tagline;const radio=form.querySelector(`[name="theme"][value="${brand.theme}"]`);if(radio)radio.checked=true;updateBrandPreview();document.getElementById('brandSettings').hidden=false;setTimeout(()=>{localizeSubtree(document.getElementById('brandSettings'));form.elements.name.focus();},80);}
  function updateBrandPreview(){const form=document.getElementById('brandForm'),defName=LANG==='en'?'Daily Atlas':'日常集',defAvatar=LANG==='en'?'D':'日',defTagline=LANG==='en'?'A life you can trace':'生活有迹可循',values={name:form.elements.name.value||defName,avatar:form.elements.avatar.value||defAvatar,tagline:form.elements.tagline.value||defTagline},isDefault=(LANG==='en'?values.name==='Daily Atlas'&&values.avatar==='D'&&values.tagline==='A life you can trace':values.name===defName&&values.avatar===defAvatar&&values.tagline===defTagline);[['previewName','name'],['previewAvatar','avatar'],['previewTagline','tagline']].forEach(([id,key])=>{const element=document.getElementById(id);element.toggleAttribute('data-user-content',!isDefault);element.textContent=isDefault?t(values[key]):values[key];});}
  function closeBrandSettings(){document.getElementById('brandSettings').hidden=true;}
  /* v45 健壮性：每个模块的渲染互相隔离，任一模块（如 renderStorage/renderHome）在运行时抛错，
   * 不再连累其后模块（含书影音/心情/经期/归档）整体罢工。错误打到 console 便于定位，不影响其它模块。 */
  function _safeRender(name, fn){ try{ fn(); }catch(e){ console.error('[render] ' + name + ' 渲染异常', e); } }
  function renderAll(){
    _safeRender('brand', applyBrand);
    _safeRender('dashboard', renderDashboard);
    _safeRender('money', renderMoney);
    _safeRender('habits', renderHabits);
    _safeRender('fitness', renderFitness);
    _safeRender('planner', renderPlanner);
    _safeRender('plannerRepeats', renderPlannerRepeats);
    _safeRender('quadrant', renderQuadrant);
    _safeRender('home', renderHome);
    _safeRender('diet', renderDiet);
    _safeRender('storage', renderStorage);
    _safeRender('media', renderMedia);
    _safeRender('mood', renderMood);
    _safeRender('sleep', renderSleep); _safeRender('period', renderPeriod); _safeRender('study', renderStudy); _safeRender('payback', renderPayback);
    _safeRender('archive', renderArchive);
    _safeRender('backup', renderBackupStatus);
  }

  function setDateDefaults(){document.querySelectorAll('input[type="date"][name="date"]').forEach(input=>{if(!input.value)input.value=isoDate();});}
  function serializeForm(form){const values={};Array.from(form.elements).forEach(field=>{if(!field.name||field.type==='submit'||(field.type==='radio'&&!field.checked))return;values[field.name]=field.type==='checkbox'?field.checked:field.value;});return values;}
  function restoreDrafts(){document.querySelectorAll('form[data-draft]').forEach(form=>{const draft=state.drafts[form.dataset.draft];if(!draft)return;Object.entries(draft).forEach(([name,value])=>form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach(field=>{if(field.type==='radio')field.checked=field.value===value;else if(field.type==='checkbox')field.checked=Boolean(value);else field.value=value;}));});updateMoneyCategories();}
  function clearDraft(form){delete state.drafts[form.dataset.draft];form.reset();setDateDefaults();updateMoneyCategories();saveState();}
  function updateMoneyCategories(){const form=document.getElementById('moneyForm'),flow=form?.querySelector('[name="flow"]:checked')?.value||'expense',select=document.getElementById('moneyCategory');if(!select)return;const current=select.value,categories=flow==='income'?INCOME_CATEGORIES:EXPENSE_CATEGORIES;select.innerHTML=categories.map(c=>`<option ${c===current?'selected':''}>${c}</option>`).join('');}

  function downloadBlob(content,type,name){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportExcel(kind){
    let headers=[],rows=[],name=LANG==='en'?'daily-atlas':'日常集';
    if(kind==='money'){headers=LANG==='en'?['Date','Type','Category','Amount','Note']:['日期','类型','分类','金额','备注'];rows=sortedRecords('money').map(r=>[r.date,t(r.data.flow==='income'?'收入':'支出'),t(r.data.category),r.data.amount,r.sample?translateText(r.data.note||''):r.data.note||'']);name=LANG==='en'?'transactions':'记账流水';}
    else{headers=LANG==='en'?['Date','Weight (kg)','Body fat (%)','Calories (kcal)','Exercise (min)','Note']:['日期','体重(kg)','体脂率(%)','摄入热量(kcal)','运动分钟','备注'];rows=sortedRecords('fitness').map(r=>[r.date,r.data.weight||'',r.data.bodyFat||'',r.data.calories||'',r.data.duration||'',r.sample?translateText(r.data.note||''):r.data.note||'']);name=LANG==='en'?'fitness-log':'减脂记录';}
    if(!rows.length){toast('暂无数据可导出');return;}
    try{const html=`<html><head><meta charset="UTF-8"></head><body><table border="1"><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr>${rows.map(row=>`<tr>${row.map(v=>`<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</table></body></html>`;downloadBlob(html,'application/vnd.ms-excel',`${name}-${isoDate()}.xls`);toast(`已导出 ${rows.length} 条记录`);}
    catch(e){toast('导出失败，请重试');console.error(e);}
  }

  function compressCover(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('封面读取失败'));reader.onload=()=>{const image=new Image();image.onerror=()=>reject(new Error('封面格式不支持'));image.onload=()=>{const maxWidth=360,maxHeight=480,ratio=Math.min(maxWidth/image.width,maxHeight/image.height,1),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.72));};image.src=reader.result;};reader.readAsDataURL(file);});}

  /* v59 封面取值优先级：本地上传 > 封面链接 URL（避免编辑已有 URL 封面时被旧 dataURL 覆盖） */
  function _isHttpUrl(u){ return /^https?:\/\//i.test(String(u||'').trim()); }
  function _pickMediaCover(){
    if(pendingMediaCover) return pendingMediaCover;
    var el=document.getElementById('mediaCoverUrl');
    return (el && _isHttpUrl(el.value)) ? String(el.value).trim() : '';
  }
  function resetMediaCover(){pendingMediaCover='';const input=document.getElementById('mediaCoverInput'),preview=document.getElementById('mediaCoverPreview');input.value='';input.closest('.cover-upload').classList.remove('has-cover');preview.style.backgroundImage='';const urlEl=document.getElementById('mediaCoverUrl');if(urlEl)urlEl.value='';}

  function bindForms(){
    document.querySelectorAll('form[data-draft]').forEach(form=>form.addEventListener('input',()=>{state.drafts[form.dataset.draft]=serializeForm(form);const saved=saveState(true);const status=document.querySelector(`[data-draft-for="${form.dataset.draft}"]`);if(status){status.textContent=saved?'草稿已保存':'草稿保存失败';if(saved)setTimeout(()=>status.textContent='草稿自动保存',900);}}));
    document.getElementById('moneyForm').addEventListener('change',e=>{if(e.target.name==='flow')updateMoneyCategories();});
    document.getElementById('moneyForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));if(!(Number(data.amount)>0))return toast('请输入有效金额');if(addRecord('money',data.date,{flow:data.flow,amount:Number(data.amount),category:data.category,note:data.note.trim()}))clearDraft(e.currentTarget);});
    document.getElementById('fitnessForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));if(!(Number(data.weight)>0))return toast('请记录今天的体重');if(addRecord('fitness',data.date,{weight:Number(data.weight),bodyFat:data.bodyFat?Number(data.bodyFat):null,calories:Number(data.calories||0),duration:Number(data.duration||0),note:data.note.trim(),bodyFatKg:data.bodyFatKg?Number(data.bodyFatKg):null,skeletalMuscle:data.skeletalMuscle?Number(data.skeletalMuscle):null,bodyWater:data.bodyWater?Number(data.bodyWater):null,bmr:data.bmr?Number(data.bmr):null,waistHipRatio:data.waistHipRatio?Number(data.waistHipRatio):null,bodyAge:data.bodyAge?Number(data.bodyAge):null}))clearDraft(e.currentTarget);});
    document.getElementById('plannerForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));if(addRecord('planner',data.date,{title:data.title.trim(),time:data.time,priority:data.priority,list:data.list,note:data.note.trim(),remind:data.remind==='1',done:false,quadrant:data.quadrant||'重要紧急'}))clearDraft(e.currentTarget);});
    document.getElementById('homeForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));if(addRecord('home',isoDate(),{name:data.name.trim(),quantity:data.quantity.trim(),category:data.category,price:Number(data.price||0),priority:data.priority,note:data.note.trim(),bought:false}))clearDraft(e.currentTarget);});
    document.getElementById('dietForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));if(!data.food.trim())return toast('请输入食物名称');if(addRecord('diet',data.date,{meal:data.meal,food:data.food.trim(),portion:data.portion.trim(),calories:Number(data.calories||0),note:data.note.trim()}))clearDraft(e.currentTarget);});
    document.getElementById('storageForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));if(!data.name.trim())return toast('请输入物品名称');if(addRecord('storage',isoDate(),{name:data.name.trim(),category:data.category,quantity:Number(data.quantity||1),unit:data.unit.trim(),location:data.location.trim(),expiry:data.expiry||'',note:data.note.trim(),purchaseAmount:data.purchaseAmount?Number(data.purchaseAmount):null,purchaseDate:data.purchaseDate||''}))clearDraft(e.currentTarget);});
    document.getElementById('mediaCoverInput').addEventListener('change',async e=>{const[file]=e.target.files;if(!file)return;if(file.size>12*1024*1024){toast('封面图片请控制在 12MB 以内');e.target.value='';return;}try{pendingMediaCover=await compressCover(file);const preview=document.getElementById('mediaCoverPreview');preview.style.backgroundImage=`url(${pendingMediaCover})`;preview.closest('.cover-upload').classList.add('has-cover');toast('封面已压缩，可以保存了');}catch(error){toast(error.message);resetMediaCover();}});
    document.getElementById('mediaForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));if(_editingMediaId){const it=state.mediaItems.find(media=>media.id===_editingMediaId);if(it){it.name=data.name.trim();it.type=data.type;it.status=data.status;it.rating=Number(data.rating||0);it.review=data.review.trim();it.date=data.date;it.cover=_pickMediaCover();it.sample=false;updateRemoteMedia(it);}const saved=saveState(true);renderAll();_editingMediaId=null;var sb=e.currentTarget.querySelector('button[type=submit]');if(sb)sb.textContent='加入我的书影音';clearDraft(e.currentTarget);resetMediaCover();if(saved)toast('已更新书影音');return;}var newItem={id:uid(),name:data.name.trim(),type:data.type,status:data.status,rating:Number(data.rating||0),review:data.review.trim(),date:data.date,cover:_pickMediaCover(),sample:false,createdAt:Date.now()};state.mediaItems.push(newItem);pushMedia(newItem);state.settings.recordsSinceExport=Number(state.settings.recordsSinceExport||0)+1;const saved=saveState(true);renderAll();if(saved){clearDraft(e.currentTarget);resetMediaCover();toast('已加入书影音清单');}});
    document.getElementById('moodForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));const emoji=_moodChosen();const score=moodScoreOfEmoji(emoji);const tagMap={5:'开心',4:'开心',3:'平静',2:'低落',1:'低落'};const tag=tagMap[score]||'平静';if(addRecord('mood',data.date,{score:score,tag:tag,emoji:emoji,feeling:(data.feeling||'').trim()})){clearDraft(e.currentTarget);state.settings._moodEmoji='😐';renderMood();toast('心情已记录');}});
    document.getElementById('habitTypeSelect').addEventListener('change',e=>{const form=document.getElementById('habitSettingsForm'),isCheck=e.target.value==='check';form.elements.target.value=isCheck?'1':form.elements.target.value;form.elements.unit.value=isCheck?'次':form.elements.unit.value;document.getElementById('habitTargetFields').classList.toggle('is-check',isCheck);});
    document.getElementById('habitSettingsForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget)),isCheck=data.type==='check';state.habits.push({id:uid(),key:`custom-${uid()}`,name:data.name.trim(),type:data.type,target:isCheck?1:Math.max(.1,Number(data.target||1)),unit:isCheck?'次':data.unit.trim()||'次',tone:data.tone,entries:{},sample:false});const saved=saveState();renderAll();renderHabitManageList();if(saved){e.currentTarget.reset();document.getElementById('habitTypeSelect').dispatchEvent(new Event('change'));toast('新习惯已加入');}});
    document.getElementById('planSettingsForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));state.settings.weeklyPlan.push({id:uid(),group:data.group,title:data.title.trim(),note:data.note.trim()||'按自己的节奏完成',done:false,updatedAt:Date.now()});const saved=saveState();renderFitness();renderPlanManageList();if(saved){e.currentTarget.reset();toast('新计划已加入');}});
    document.getElementById('fitnessProfileForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));state.settings.fitnessProfile={...state.settings.fitnessProfile,height:Number(data.height),target:Number(data.target),startWeight:Number(data.startWeight),age:Number(data.age),sex:data.sex,activity:Number(data.activity)};state.settings.fitnessProfileUpdatedAt=Date.now();const saved=saveState();renderFitness();closeFitnessProfile();if(saved)toast('目标设置已更新');});
    /* ====== v25 修复：经期表单 submit + 心情滑块实时显示 ====== */
    document.getElementById('periodForm').addEventListener('submit',e=>{
      e.preventDefault();
      var data=Object.fromEntries(new FormData(e.currentTarget));
      var pf=state._periodForm||{isStartDay:'',isPeriodDay:'',isEndDay:'',discharge:'',symptoms:[],pad:0,night:0};
      /* 至少需要 1 项才允许保存（避免空白记录污染历史） */
      if(!pf.isStartDay && !pf.isPeriodDay && !pf.isEndDay && !pf.discharge && !(pf.symptoms&&pf.symptoms.length) && !Number(pf.pad) && !Number(pf.night) && !Number(data.bleeding)){
        return toast('请至少选择一项状态 / 分泌物 / 用品');
      }
      var ok=addRecord('period', data.date||isoDate(), {
        isStartDay:pf.isStartDay||'', isPeriodDay:pf.isPeriodDay||'', isEndDay:pf.isEndDay||'',
        discharge:pf.discharge||'', symptoms:pf.symptoms||[],
        moodScore:Number(data.moodScore||5), moodLabel:(data.moodLabel||'').trim(),
        pad:Number(pf.pad||0), night:Number(pf.night||0),
        bleeding:Number(data.bleeding||0), note:(data.note||'').trim()
      });
      if(ok){ _periodResetForm(); renderPeriod(); }
    });
    /* 心情滑块实时显示 */
    var _pScoreEl=document.getElementById('periodMoodScore');
    var _pScoreValEl=document.getElementById('periodMoodScoreVal');
    if(_pScoreEl && _pScoreValEl){
      _pScoreEl.addEventListener('input',function(){ _pScoreValEl.textContent=_pScoreEl.value; });
    }
  }

  function updateHabit(id,operation,value){const h=state.habits.find(x=>x.id===id);if(!h)return;const today=isoDate(),current=Number(h.entries[today]||0);if(operation==='plus')h.entries[today]=current+1;if(operation==='minus')h.entries[today]=Math.max(0,current-1);if(operation==='toggle')h.entries[today]=habitDone(h)?0:1;if(operation==='quick')h.entries[today]=habitDone(h)?0:Number(h.target||1);if(operation==='number')h.entries[today]=clamp(Number(value||0),0,9999);pushHabit(h,today);const justDone=habitDone(h),saved=saveState();renderAll();if(saved&&justDone){celebrate();const name=HABIT_DEFS.some(def=>def.key===h.key)||h.sample?translateText(h.name):h.name;toast(LANG==='en'?`${name} completed — nicely done`:`${h.name}，完成得漂亮`);}}
  function movePlanner(id,dir){
    const records=state.records.filter(r=>r.type==='planner');
    const target=records.find(r=>r.id===id);if(!target)return;
    const allRecords=state.records;
    const idx=allRecords.indexOf(target);
    const sameDate=records.filter(r=>r.date===target.date);
    const dateIdx=sameDate.indexOf(target);
    const swapWith=sameDate[dateIdx+dir];
    if(!swapWith)return;
    const swapIdx=allRecords.indexOf(swapWith);
    [allRecords[idx],allRecords[swapIdx]]=[allRecords[swapIdx],allRecords[idx]];
    [target.createdAt,swapWith.createdAt]=[swapWith.createdAt,target.createdAt];
    saveState();renderPlanner();
  }
  function toggleTask(id){const task=state.records.find(r=>r.id===id&&r.type==='planner');if(!task)return;task.data.done=!task.data.done;if(task.data.done)task.data.doneAt=Date.now();updateRemotePlan(task);const saved=saveState();renderAll();if(saved&&task.data.done){celebrate();toast('完成一项，心里轻一点');maybeAutoNextRepeat(task);}}

  function findAncestor(el, matcher){
    var guard = 0;
    while (el && el.nodeType === 1 && guard++ < 40) {
      if (matcher(el)) return el;
      el = el.parentElement;
    }
    return null;
  }
  function bindGlobalClick(){
    document.addEventListener('click',function(event){
      var t = event.target;
      var nav = findAncestor(t, function(el){ return el.hasAttribute && el.hasAttribute('data-nav'); });
      if (nav) { switchView(nav.getAttribute('data-nav')); return; }
      var quick = findAncestor(t, function(el){ return el.hasAttribute && el.hasAttribute('data-quick'); });
      if (quick) {
        switchView(quick.getAttribute('data-quick'));
        setTimeout(function(){
          var el = document.querySelector('#view-' + quick.getAttribute('data-quick') + ' input:not([type="radio"])');
          if (el) el.focus();
        }, 200);
        return;
      }
      var clearBtn = document.getElementById('clearSamplesBtn');
      if (clearBtn && !clearBtn.hidden) {
        var hit = false;
        if (t === clearBtn) hit = true;
        else if (clearBtn.contains && clearBtn.contains(t)) hit = true;
        else if (t.closest && t.closest('#clearSamplesBtn')) hit = true;
        if (hit) { event.preventDefault(); handleClearAll(); }
      }
    });
    /* v33 四象限：<select data-action="quad-move"> 用 change 委托（click 读到的值是旧值，不可靠） */
    document.addEventListener('change',function(event){
      var sel = event.target;
      if(!sel || sel.nodeName!=='SELECT') return;
      if(sel.getAttribute && sel.getAttribute('data-action')==='quad-move'){
        var rid = sel.getAttribute('data-id');
        if(!rid) return;
        var task = state.records.find(function(r){ return r.id===rid && r.type==='planner'; });
        if(task && sel.value){ task.data.quadrant = sel.value; updateRemotePlan(task); saveState(); renderAll(); toast('已移到「'+sel.value+'」'); }
        sel.blur();
      }
    });
  }
  function showConfirm(opts){
    var wrap = document.createElement('div');
    wrap.className = 'confirm-mask';
    wrap.innerHTML = '<div class="confirm-box"><h3 class="confirm-title"></h3><p class="confirm-msg"></p><div class="confirm-actions"><button type="button" class="btn ghost confirm-cancel"></button><button type="button" class="btn primary confirm-ok"></button></div></div>';
    wrap.querySelector('.confirm-title').textContent = opts.title || '\u8bf7\u786e\u8ba4';
    wrap.querySelector('.confirm-msg').textContent = opts.message || '';
    var okBtn = wrap.querySelector('.confirm-ok'), cancelBtn = wrap.querySelector('.confirm-cancel');
    okBtn.textContent = opts.confirmText || '\u786e\u5b9a';
    cancelBtn.textContent = opts.cancelText || '\u53d6\u6d88';
    if (opts.danger) okBtn.classList.add('danger');
    function close(){ if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }
    okBtn.addEventListener('click', function(){ close(); if (opts.onConfirm) opts.onConfirm(true); });
    cancelBtn.addEventListener('click', function(){ close(); if (opts.onConfirm) opts.onConfirm(false); });
    wrap.addEventListener('click', function(e){ if (e.target === wrap) { close(); if (opts.onConfirm) opts.onConfirm(false); } });
    document.body.appendChild(wrap);
  }

  function clearAllRemoteTables(cb){
    if (!ONLINE || LOCAL_ONLY) { if (cb) cb(false); return; }
    var DB_LIST = [DB_MONEY, DB_HABIT, DB_PLAN, DB_FITNESS, DB_SHOPPING, DB_MEDIA, DB_DIET, DB_STORAGE, DB_MOOD, DB_PERIOD, DB_SLEEP, DB_STUDY, DB_PAYBACK];
    var pending = DB_LIST.length, done = 0;
    function oneDone(){ done++; if (done >= pending && cb) cb(true); }
    DB_LIST.forEach(function(dbId){
      dbFetchAll(dbId, function(rows){
        if (!rows || !rows.length) { oneDone(); return; }
        var delPending = 0, delDone = 0;
        var ids = [];
        rows.forEach(function(r){ if (r._id) ids.push(r._id); });
        delPending = ids.length;
        if (!delPending) { oneDone(); return; }
        ids.forEach(function(rid){
          try {
            db.deleteRecord({ databaseId: dbId, recordId: rid })
              .then(function(){ delDone++; if (delDone >= delPending) oneDone(); })
              .catch(function(){ delDone++; if (delDone >= delPending) oneDone(); });
          } catch(e){ delDone++; if (delDone >= delPending) oneDone(); }
        });
      });
    });
  }

  function handleClearAll(){
    var allRecords=state.records.length,allMedia=state.mediaItems.length;
    var habitCount=state.habits.filter(function(h){return Object.keys(h.entries||{}).length;}).length;
    if(!allRecords&&!allMedia&&!habitCount)return;
    showConfirm({
      title:'\u786e\u8ba4\u6e05\u7a7a\u5168\u90e8\u6570\u636e',
      message:'\u5c06\u6e05\u7a7a '+allRecords+' \u6761\u8bb0\u5f55\u3001'+allMedia+' \u4e2a\u4e66\u5f71\u97f3\u3001'+habitCount+' \u4e2a\u4e60\u60ef\u7684\u6253\u5361\u5386\u53f2\uff0c\u5e76\u540c\u6b65\u5220\u9664\u7ebf\u4e0a\u6570\u636e\u3002\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\uff0c\u5efa\u8bae\u5148\u5bfc\u51fa\u5907\u4efd\u3002',
      confirmText:'\u786e\u8ba4\u6e05\u7a7a',
      cancelText:'\u53d6\u6d88',
      danger:true,
      onConfirm:function(ok){
        if(!ok)return;
        var clearAt = Date.now();
        state.records=[];
        state.mediaItems=[];
        state.habits.forEach(function(h){h.entries={};h.sample=false;});
        habitRemoteIndex={};
        state.settings.weeklyPlan=[];state.settings.weeklyPlanHistory=[];state.settings.weeklyPlanWeekStart=isoWeekStart();
        state.lastClearedAt=clearAt;
        state.clearedAll=true;
        saveState();
        renderAll();
        toast('本地数据已清空，正在删除线上数据…');
        /* 先写清空时间戳，其它设备下次打开即可同步清空；再删远程，最后确认时间戳已落库 */
        writeMetaClearAt(clearAt, function(){
          clearAllRemoteTables(function(success){
            writeMetaClearAt(clearAt, function(metaOk){
              state.clearedAll = !(success && metaOk);
              saveState();
              renderAll();
              if(success && metaOk) toast('全部数据已清空，其它设备下次打开会自动同步');
              else toast('本地已清空，线上删除未完全成功，下次打开将自动重试');
            });
          });
        });
      }
    });
  }
  function bindEvents(){
    document.getElementById('brandSettingsBtn').addEventListener('click',openBrandSettings);
    var _mbBtn=document.getElementById('mobileBrandBtn'); if(_mbBtn) _mbBtn.addEventListener('click',openBrandSettings);
    document.getElementById('brandForm').addEventListener('input',updateBrandPreview);
    document.getElementById('brandForm').addEventListener('submit',event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));state.settings.brand={name:data.name.trim()||'日常集',avatar:data.avatar.trim()||'日',tagline:data.tagline.trim()||'生活有迹可循',theme:data.theme||'plum'};const saved=saveState();applyBrand();closeBrandSettings();if(saved)toast('工作台外观已更新');});
    document.getElementById('brandSettings').addEventListener('click',event=>{if(event.target.id==='brandSettings')closeBrandSettings();});
    document.getElementById('habitSettings').addEventListener('click',event=>{if(event.target.id==='habitSettings')closeHabitSettings();});
    document.getElementById('planSettings').addEventListener('click',event=>{if(event.target.id==='planSettings')closePlanSettings();});
    document.getElementById('fitnessProfileSettings').addEventListener('click',event=>{if(event.target.id==='fitnessProfileSettings')closeFitnessProfile();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){closeBrandSettings();closeHabitSettings();closePlanSettings();closeFitnessProfile();}});
    document.addEventListener('click',event=>{
      const nav=event.target.closest('[data-nav]');if(nav)switchView(nav.dataset.nav);
      const quick=event.target.closest('[data-quick]');if(quick){switchView(quick.dataset.quick);setTimeout(()=>document.querySelector(`#view-${quick.dataset.quick} input:not([type="radio"])`)?.focus(),200);}
      const _pState=event.target.closest('[data-period-state]');
      if(_pState){var st=_pState.dataset.periodState;if(!state._periodForm) state._periodForm={isStartDay:false,isPeriodDay:false,isEndDay:false,discharge:'',symptoms:[],pad:0,night:0};var pf=state._periodForm;if(st==='start'){pf.isStartDay=pf.isStartDay==='Y'?'':'Y';pf.isPeriodDay=pf.isStartDay==='Y'?'Y':'';pf.isEndDay='';}else if(st==='mid'){pf.isStartDay='';pf.isEndDay='';pf.isPeriodDay='Y';}else if(st==='end'){pf.isEndDay=pf.isEndDay==='Y'?'':'Y';pf.isStartDay='';pf.isPeriodDay=pf.isEndDay==='Y'?'Y':'';}renderPeriod();return;}
      const _pChip=event.target.closest('.chip[data-value]');if(_pChip){if(!state._periodForm) state._periodForm={isStartDay:false,isPeriodDay:false,isEndDay:false,discharge:'',symptoms:[],pad:0,night:0};var grp=_pChip.parentElement.dataset.chipGroup;var v=_pChip.dataset.value;var pf2=state._periodForm;if(grp==='discharge'){pf2.discharge=pf2.discharge===v?'':v;}else if(grp==='symptom'){var idx=pf2.symptoms.indexOf(v);if(idx>=0)pf2.symptoms.splice(idx,1);else pf2.symptoms.push(v);}renderPeriod();return;}
      const _pCounter=event.target.closest('[data-counter]');if(_pCounter){if(!state._periodForm) state._periodForm={isStartDay:false,isPeriodDay:false,isEndDay:false,discharge:'',symptoms:[],pad:0,night:0};var key=_pCounter.dataset.counter;var d=Number(_pCounter.dataset.delta||0);state._periodForm[key]=Math.max(0,Number(state._periodForm[key]||0)+d);renderPeriod();return;}
      const action=event.target.closest('[data-action]');if(!action)return;const id=action.dataset.id,type=action.dataset.action;
      if(type==='period-reset'){_periodResetForm();toast('已清空表单');}
      if(type==='period-pin-set'){(async function(){var p1=document.getElementById('periodPinSetupInput'),p2=document.getElementById('periodPinSetupConfirm');if(!p1||!p2)return;var v1=(p1.value||'').trim(),v2=(p2.value||'').trim();if(!/^\d{4}$/.test(v1))return toast('PIN必须是 4 位数字');if(v1!==v2)return toast('两次输入不一致');var salt=Math.random().toString(36).slice(2,12);var hash=await periodHashPin(v1,salt);periodSavePin(hash,salt);periodMarkUnlocked();p1.value='';p2.value='';renderPeriod();toast('PIN已设置并解锁');})();}
      if(type==='period-pin-enter'){(async function(){var inp=document.getElementById('periodPinEnterInput');if(!inp)return;var v=(inp.value||'').trim();if(!/^\d{4}$/.test(v))return toast('PIN必须是 4 位数字');var salt=(state.settings&&state.settings.periodPinSalt)||'';var expect=(state.settings&&state.settings.periodPinHash)||'';var hash=await periodHashPin(v,salt);if(hash===expect){periodMarkUnlocked();inp.value='';renderPeriod();toast('已解锁');}else{inp.value='';var hint=document.getElementById('periodLockHint');if(hint)hint.textContent='PIN错误，请重试';} })();}
      if(type==='period-pin-reset'){showConfirm({title:'重设 PIN',message:'重设后需要在其他设备上用新 PIN 重新解锁。云端 PIN 哈希值会更新。',confirmText:'确认重设',cancelText:'取消',onConfirm:function(ok){if(!ok)return;var salt=Math.random().toString(36).slice(2,12);state.settings.periodPinHash='';state.settings.periodPinSalt=salt;saveState();periodLock();renderPeriod();document.getElementById('periodPinSetupInput')&&(document.getElementById('periodPinSetupInput').value='');document.getElementById('periodPinSetupConfirm')&&(document.getElementById('periodPinSetupConfirm').value='');toast('请设置新 PIN');}});}
      if(type==='period-pin-clear'){showConfirm({title:'清除 PIN',message:'清除后任何人打开链接都能看到经期数据。要恢复私密请重新设置 PIN。',confirmText:'确认清除',cancelText:'取消',danger:true,onConfirm:function(ok){if(!ok)return;periodClearPin();renderPeriod();toast('PIN 已清除');}});}
      if(type==='period-clear-history'){showConfirm({title:'清空经期历史',message:'将删除本机与云端的所有经期记录（含历史与预测依据）。删除后不可恢复，需要重新记录真实经期。确定继续吗？',confirmText:'确认清空',cancelText:'取消',danger:true,onConfirm:function(ok){if(!ok)return;clearPeriodHistoryLocal();renderPeriod();toast('经期历史已清空，请重新记录');}});}
      /* v28：周期历史每日详情展开/折叠 —— 修改 aria-expanded 和 hidden，不动 record 数据 */
      if(type==='toggle-cycle'){
        var cIdx=action.dataset.cycleIdx;
        var panel=document.getElementById('cycle-days-'+cIdx);
        if(panel){
          var isHidden=panel.hidden;
          panel.hidden=!isHidden;
          action.setAttribute('aria-expanded', isHidden?'true':'false');
          action.classList.toggle('expanded', isHidden);
        }
      }

      if(type==='delete')deleteRecord(id);if(type==='toggle-task')toggleTask(id);if(type==='gen-repeat'){const it=_plannerRepeats[Number(action.dataset.idx||0)]||null;const res=createNextRepeat(it);if(res==='exists')toast('已有未完成的同名日程，完成后会自动排下一次');else if(res&&it)toast('已生成待完成日程：'+formatDateHeading(it.nextDate));}if(type==='auto-repeat-switch'){state.settings.plannerAutoNext=(state.settings.plannerAutoNext===false);saveState();renderPlannerRepeats();}if(type==='payback-use')addPaybackUse(id);
      /* v37: quad-move 只走 change 委托（bindEvents 顶部）——旧 click 分支会在移动端原生下拉
       * 还没选完时就用当前值触发 renderAll 重建 DOM，change 事件落在被替换的节点上，
       * 导致「无法切换到其他象限」，已移除。 */
      if(type==='habit-plus')updateHabit(id,'plus');if(type==='habit-minus')updateHabit(id,'minus');if(type==='habit-toggle')updateHabit(id,'toggle');if(type==='habit-quick')updateHabit(id,'quick');
      if(type==='toggle-plan'){const item=state.settings.weeklyPlan.find(x=>x.id===id);if(item){item.done=!item.done;item.updatedAt=Date.now();const saved=saveState();renderFitness();if(saved&&item.done)celebrate();}}
      if(type==='delete-habit-custom'){const habit=state.habits.find(h=>h.id===id);if(!habit)return;showConfirm({title:t('删除习惯'),message:LANG==='en'?`Delete the habit “${habit.name}” and all of its history?`:`确定删除习惯“${habit.name}”吗？历史打卡也会一起删除。`,confirmText:t('删除'),cancelText:LANG==='en'?'Cancel':'取消',danger:true,onConfirm:function(ok){if(!ok)return;state.habits=state.habits.filter(h=>h.id!==id);if(HABIT_DEFS.some(def=>def.key===habit.key)){state.settings.hiddenHabitKeys=[...new Set([...(state.settings.hiddenHabitKeys||[]),habit.key])];}else{state.settings.deletedHabitNames=[...new Set([...(state.settings.deletedHabitNames||[]),habit.name])];}const saved=saveState();renderAll();renderHabitManageList();if(saved)toast('习惯已删除');}});}
      if(type==='delete-plan'){const item=state.settings.weeklyPlan.find(x=>x.id===id);if(!item)return;showConfirm({title:t('删除计划'),message:LANG==='en'?`Delete the plan “${item.title}”?`:`确定删除计划“${item.title}”吗？`,confirmText:t('删除'),cancelText:LANG==='en'?'Cancel':'取消',danger:true,onConfirm:function(ok){if(!ok)return;state.settings.weeklyPlan=state.settings.weeklyPlan.filter(x=>x.id!==id);state.settings.deletedPlanIds=[...new Set([...(state.settings.deletedPlanIds||[]),id])];const saved=saveState();renderFitness();renderPlanManageList();if(saved)toast('计划已删除');}});}
      if(type==='toggle-shopping'){const item=state.records.find(r=>r.id===id&&r.type==='home');if(item){item.data.bought=!item.data.bought;item.data.boughtDate=item.data.bought?isoDate():null;updateRemoteShopping(item);const saved=saveState();renderAll();if(saved&&item.data.bought){celebrate();toast('买到了，已移入完成');}}}
      if(type==='storage-plus'){const item=state.records.find(r=>r.id===id&&r.type==='storage');if(item){item.data.quantity=Number(item.data.quantity||0)+1;_bumpUsage(id,0);updateRemoteStorage(item);const saved=saveState();renderStorage();if(saved)toast('数量已增加');}}
      if(type==='storage-minus'){const item=state.records.find(r=>r.id===id&&r.type==='storage');if(item){item.data.quantity=Math.max(0,Number(item.data.quantity||0)-1);if(Number(item.data.quantity||0)>=0)_bumpUsage(id,1);updateRemoteStorage(item);const saved=saveState();renderStorage();if(saved&&item.data.quantity===0)toast('数量已归零，可删除');else if(saved)toast('数量已减少');}}
      if(type==='sleep-range'){state.settings.sleepRange=action.dataset.sleepRange;if(state.settings.sleepRange==='day'&&!state.settings.sleepDay)state.settings.sleepDay=isoDate();saveState();renderSleep();}
            if(type==='freq-sort'){state.settings.storageFreqSort=action.dataset.freqSort;saveState();renderStorage();}
      if(type==='media-search-clear'){_mediaSearch='';var _msc=document.getElementById('mediaSearchInput');if(_msc)_msc.value='';state.settings.mediaPage=1;renderMedia();}
            if(type==='storage-search-clear'){_storageSearch='';var _sic=document.getElementById('storageSearchInput');if(_sic)_sic.value='';renderStorage();}
      if(type==='storage-ov-search-clear'){_storageOvSearch='';var _sos=document.getElementById('storageOvSearch');if(_sos)_sos.value='';renderStorageOverview();}
      if(type==='storage-filter-clear'){state.settings.storageFilter='all';saveState();renderStorage();}
      if(type==='delete-media'){const item=state.mediaItems.find(media=>media.id===id);if(!item)return;showConfirm({title:t('删除'),message:LANG==='en'?`Remove "${item.name}" from the list?`:`确定从清单中删除"${item.name}"吗？`,confirmText:t('删除'),cancelText:LANG==='en'?'Cancel':'取消',danger:true,onConfirm:function(ok){if(!ok)return;if(item.remoteId)deleteRemoteMedia(item.remoteId);state.mediaItems=state.mediaItems.filter(media=>media.id!==id);const saved=saveState();renderMedia();if(saved)toast('已从书影音清单移除');}});}
      if(type==='edit-media'){const item=state.mediaItems.find(media=>media.id===id);if(!item)return;openMediaEditor(item);}
      if(type==='open-habit-settings')openHabitSettings();if(type==='close-habit-settings')closeHabitSettings();if(type==='open-plan-settings')openPlanSettings();if(type==='close-plan-settings')closePlanSettings();if(type==='view-plan-history'){var ph=document.getElementById('planHistory');if(ph){ph.hidden=!ph.hidden;if(!ph.hidden)renderPlanHistory();}}if(type==='open-fitness-profile')openFitnessProfile();if(type==='close-fitness-profile')closeFitnessProfile();
      if(type==='export-money')exportExcel('money');if(type==='export-fitness')exportExcel('fitness');
      if(type==='media-prev'){state.settings.mediaPage=Math.max(1,state.settings.mediaPage-1);saveState();renderMedia();}
      if(type==='media-next'){state.settings.mediaPage++;saveState();renderMedia();}
      if(type==='diet-prev'){state.settings.dietPage=Math.max(1,Number(state.settings.dietPage||1)-1);state.settings.dietSearchDate='';saveState();renderDiet();}
      if(type==='diet-next'){state.settings.dietPage=Number(state.settings.dietPage||1)+1;state.settings.dietSearchDate='';saveState();renderDiet();}
      if(type==='planner-prev'){state.settings.plannerPage=Math.max(1,Number(state.settings.plannerPage||1)-1);saveState();renderPlanner();}
      if(type==='planner-next'){state.settings.plannerPage=Number(state.settings.plannerPage||1)+1;saveState();renderPlanner();}
      if(type==='diet-search'){const _v=(document.getElementById('dietSearchDate')||{}).value||'';if(!_v)return toast('请先选择要查询的日期');const _has=state.records.some(r=>r.type==='diet'&&r.date===_v);state.settings.dietSearchDate=_v;state.settings.dietPage=1;saveState();renderDiet();if(!_has)toast('这一天没有饮食记录');}
      if(type==='diet-search-clear'){state.settings.dietSearchDate='';saveState();renderDiet();}
      if(type==='mood-prev'){state.settings.moodPage=Math.max(1,Number(state.settings.moodPage||1)-1);saveState();renderMoodTimeline();}
      if(type==='mood-next'){state.settings.moodPage=Number(state.settings.moodPage||1)+1;saveState();renderMoodTimeline();}
      if(type==='mood-cal-prev'){const ym=state.settings.moodCalYM||isoDate().slice(0,7),d=new Date(Number(ym.slice(0,4)),Number(ym.slice(5,7))-2,1);state.settings.moodCalYM=`${d.getFullYear()}-${_pad2(d.getMonth()+1)}`;saveState();renderMoodCalendar();}
      if(type==='mood-cal-next'){const ym=state.settings.moodCalYM||isoDate().slice(0,7),d=new Date(Number(ym.slice(0,4)),Number(ym.slice(5,7)),1);state.settings.moodCalYM=`${d.getFullYear()}-${_pad2(d.getMonth()+1)}`;saveState();renderMoodCalendar();}
      if(type==='mood-emoji'){state.settings._moodEmoji=action.dataset.emoji;renderMood();const btn=document.getElementById('moodCustomEmoji');if(btn)btn.value='';toast('已选 '+(action.dataset.emoji||''));}
      if(type==='mood-pick-custom'){const inp=document.getElementById('moodCustomEmoji');if(!inp)return;const v=(inp.value||'').trim();if(!v)return toast('请输入一个表情');const first=[...v][0];state.settings._moodEmoji=first;renderMood();toast('已选 '+(first||''));}
      if(type==='mood-day'){const ds=action.dataset.date2||action.dataset.date;if(!ds)return;state.settings.moodSelDate=(state.settings.moodSelDate===ds?'':ds);saveState();renderMoodCalendar();}
      if(type==='add-diet-plan'){const input=document.getElementById('dietPlanInput');if(!input||!input.value.trim())return;if(!state.settings.dietPlans)state.settings.dietPlans=[];state.settings.dietPlans.push({text:input.value.trim(),date:isoDate(),done:false,doneAt:0,at:Date.now()});saveState();renderDietPlan();input.value='';toast('已添加饮食计划');}
      
      if(type==='eat-diet-plan'){const idx=Number(action.dataset.idx);if(state.settings.dietPlans&&state.settings.dietPlans[idx]){const plan=state.settings.dietPlans[idx];/* 自动推断当前餐次 */const _hr=new Date().getHours(),_meal=_hr<10?'早餐':_hr<14?'午餐':_hr<21?'晚餐':'加餐';const _form=document.getElementById('dietForm');if(_form){const _food=_form.querySelector('[name="food"]'),_mealSel=_form.querySelector('[name="meal"]'),_date=_form.querySelector('[name="date"]'),_portion=_form.querySelector('[name="portion"]'),_cal=_form.querySelector('[name="calories"]');if(_food){_food.value=plan.text||'';_food.focus();}if(_mealSel){_mealSel.value=_meal;}if(_date){_date.value=isoDate();}if(_portion){_portion.value='';}if(_cal){_cal.value='';}}plan.done=true;plan.doneAt=Date.now();saveState();renderDietPlan();toast('已填入今日'+_meal+'，确认份量与热量后点「记下这一餐」');}}
      if(type==='delete-diet-plan'){const idx=Number(action.dataset.idx);if(state.settings.dietPlans&&state.settings.dietPlans[idx]){state.settings.dietPlans.splice(idx,1);saveState();renderDietPlan();toast('已删除');}}
      if(type==='close-brand')closeBrandSettings();if(type==='reset-brand'){state.settings.brand={name:'日常集',avatar:'日',tagline:'生活有迹可循',theme:'plum'};saveState();applyBrand();openBrandSettings();toast('已恢复默认外观');}
    });
    document.addEventListener('change',event=>{if(event.target.dataset.action==='habit-number')updateHabit(event.target.dataset.id,'number',event.target.value);});
    const _moodCustomInp=document.getElementById('moodCustomEmoji');if(_moodCustomInp)_moodCustomInp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const v=(e.target.value||'').trim();if(!v)return;state.settings._moodEmoji=[...v][0];renderMood();toast('已选 '+(state.settings._moodEmoji||''));}});
        var _sleepForm=document.getElementById('sleepForm');
    if(_sleepForm&&!_sleepForm._bound){_sleepForm._bound=true;_sleepForm.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(e.currentTarget);
      var date=String(fd.get('date')||'').trim()||isoDate();
      var data={
        bedtime:String(fd.get('bedtime')||'').trim(),
        wake:String(fd.get('wake')||'').trim(),
        deep:Math.max(0,Math.round(Number(fd.get('deep'))||0)),
        light:Math.max(0,Math.round(Number(fd.get('light'))||0)),
        rem:Math.max(0,Math.round(Number(fd.get('rem'))||0)),
        awake:Math.max(0,Math.round(Number(fd.get('awake'))||0)),
        nap:Math.max(0,Math.round(Number(fd.get('nap'))||0)),
        note:String(fd.get('note')||'').trim()
      };
      if(!data.bedtime||!data.wake){toast('请填写入睡与醒来时间');return;}
      var exist=null;for(var _i=0;_i<state.records.length;_i++){if(state.records[_i].type==='sleep'&&state.records[_i].date===date){exist=state.records[_i];break;}}
      if(exist){ exist.data=data; updateRemoteSleep(exist); const sv=saveState(true); renderSleep(); if(sv)toast('这一晚已更新'); return; }
      if(addRecord('sleep',date,data)){ state.settings.sleepDay=date; e.currentTarget.reset(); var _sd=e.currentTarget.elements.date; if(_sd)_sd.value=isoDate(); renderSleep(); }
    });}
    var _studyForm=document.getElementById('studyForm');
    if(_studyForm&&!_studyForm._bound){_studyForm._bound=true;_studyForm.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(e.currentTarget);
      var date=String(fd.get('date')||'').trim()||isoDate();
      var subject=String(fd.get('subject')||'').trim();
      var category=String(fd.get('category')||'其他').trim();
      var minutes=Math.max(1,Math.round(Number(fd.get('minutes'))||0));
      var note=String(fd.get('note')||'').trim();
      if(!subject){toast('请填写科目 / 主题');return;}
      if(!minutes){toast('请填写有效时长');return;}
      if(addRecord('study',date,{subject:subject,category:category,minutes:minutes,note:note})){ e.currentTarget.reset(); var _sd=e.currentTarget.elements.date; if(_sd)_sd.value=isoDate(); renderStudy(); }
    });}
    var _paybackForm=document.getElementById('paybackForm');
    if(_paybackForm&&!_paybackForm._bound){_paybackForm._bound=true;_paybackForm.addEventListener('submit',function(e){
      e.preventDefault();
      var fd=new FormData(e.currentTarget);
      var date=String(fd.get('date')||'').trim()||isoDate();
      var name=String(fd.get('name')||'').trim();
      var category=String(fd.get('category')||'其他').trim();
      var price=Math.max(0,Number(fd.get('price'))||0);
      var mode=String(fd.get('mode')||'time')==='count'?'count':'time';
      var uses=Math.max(0,Math.round(Number(fd.get('uses'))||0));
      if(!name){toast('请填写物品名称');return;}
      if(!price){toast('请填写有效购买价格');return;}
      if(addRecord('payback',date,{name:name,category:category,price:price,mode:mode,uses:mode==='count'?uses:0})){ e.currentTarget.reset(); var _pd=e.currentTarget.elements.date; if(_pd)_pd.value=isoDate(); renderPayback(); }
    });
      var _pcat=document.getElementById('paybackCat');
      if(_pcat)_pcat.addEventListener('change',function(){var _pv=document.getElementById('paybackIconPreview');if(_pv)_pv.innerHTML='<use href="#'+paybackIcon(_pcat.value)+'"/>';});
    }
document.getElementById('budgetInput').addEventListener('change',e=>{state.settings.budget=Math.max(0,Number(e.target.value||0));const saved=saveState();renderAll();if(saved)toast('月度预算已更新');});
    document.getElementById('moneyFilter').addEventListener('change',e=>{state.settings.moneyFilter=e.target.value;saveState();renderMoney();});
    document.getElementById('plannerFilters').addEventListener('click',e=>{const b=e.target.closest('[data-planner-filter]');if(!b)return;state.settings.plannerFilter=b.dataset.plannerFilter;saveState();renderPlanner();});
    document.getElementById('shoppingFilters').addEventListener('click',e=>{const b=e.target.closest('[data-shopping-filter]');if(!b)return;state.settings.shoppingFilter=b.dataset.shoppingFilter;saveState();renderHome();});
    /* v39：分类筛选支持「再点一次恢复全部」切换 */
    var _storageFilterClick=e=>{const b=e.target.closest('[data-storage-filter]');if(!b)return;const v=b.dataset.storageFilter;state.settings.storageFilter=((state.settings.storageFilter||'all')===v)?'all':v;saveState();renderStorage();};
    document.getElementById('storageFilters').addEventListener('click',_storageFilterClick);
    document.getElementById('storageOvCats').addEventListener('click',_storageFilterClick);
    var _msi2=document.getElementById('mediaSearchInput');if(_msi2&&!_msi2._bound){_msi2._bound=true;_msi2.addEventListener('input',function(){_mediaSearch=this.value;state.settings.mediaPage=1;renderMedia();});}
    var _ssi=document.getElementById('storageSearchInput');if(_ssi&&!_ssi._bound){_ssi._bound=true;_ssi.addEventListener('input',function(){_storageSearch=this.value;renderStorage();});}
    var _sov=document.getElementById('storageOvSearch');if(_sov&&!_sov._bound){_sov._bound=true;_sov.addEventListener('input',function(){_storageOvSearch=this.value;renderStorageOverview();});}
    document.getElementById('archiveFilters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;state.settings.archiveFilter=b.dataset.filter;saveState();renderArchive();});
    document.querySelectorAll('[data-media-view]').forEach(button=>button.addEventListener('click',()=>{state.settings.mediaView=button.dataset.mediaView;saveState();renderMedia();}));
    document.getElementById('mediaStatusFilter').addEventListener('change',e=>{state.settings.mediaStatusFilter=e.target.value;saveState();renderMedia();});
    document.getElementById('mediaTypeFilter')?.addEventListener('change',e=>{state.settings.mediaTypeFilter=e.target.value;saveState();renderMedia();});
    document.getElementById('mediaRatingFilter').addEventListener('change',e=>{state.settings.mediaRatingFilter=Number(e.target.value);saveState();renderMedia();});
    /* 清空按钮已移至 bindGlobalClick，确保在 init 最前面绑定，不受 bindEvents 错误影响 */
    window.addEventListener('storage',e=>{if(e.key!==STORAGE_KEY||!e.newValue)return;try{state=normalizeState(JSON.parse(e.newValue));renderAll();toast('另一个页面的数据已同步');}catch{}});
  }

  /* ===== v52: 装到手机桌面（把工作台变成一个桌面图标）===== */
  var APP_SHARE_URL = 'https://workbuddy.link/p/IAP7cP1ljx7juu0hAdPdVy';
  var APP_TIP_KEY = 'richangji-app-tip-v1';
  var APP_PLATFORM_KEY = 'richangji-app-platform-v1';
  var APP_PLATFORM_LIST = [
    ['auto','自动识别'],
    ['harmony','鸿蒙 / 华为浏览器'],
    ['harmony-wx','鸿蒙 / 微信'],
    ['ios-safari','iPhone / Safari'],
    ['ios-other','iPhone / 其他浏览器'],
    ['android','Android / Chrome'],
    ['android-wx','Android / 微信'],
    ['desktop','电脑浏览器']
  ];
  function _appPlatformKey(){ try{ return localStorage.getItem(APP_PLATFORM_KEY) || 'auto'; }catch(e){ return 'auto'; } }
  function _appPlatformSet(v){ try{ localStorage.setItem(APP_PLATFORM_KEY, v || 'auto'); }catch(e){} renderAppInstall(); }
  function _appPlatformLabel(k){
    var t = '';
    APP_PLATFORM_LIST.forEach(function(it){ if(it[0] === k) t = it[1]; });
    return t || k;
  }
  function _appStandalone(){
    try{
      if(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if(window.navigator && window.navigator.standalone === true) return true;
    }catch(e){}
    return false;
  }
  /* 自动识别：鸿蒙必须排在 Android 之前——HarmonyOS 4 兼容安卓，UA 里同时带 Android */
  function _appPlatformAuto(){
    var ua = (navigator.userAgent || '');
    if(/OpenHarmony|HarmonyOS/i.test(ua) || /HuaweiBrowser/i.test(ua)){
      return /MicroMessenger/i.test(ua) ? 'harmony-wx' : 'harmony';
    }
    if(/iPhone|iPad|iPod/i.test(ua)) return /CriOS|FxiOS|EdgiOS|MicroMessenger/i.test(ua) ? 'ios-other' : 'ios-safari';
    if(/Android/i.test(ua)) return /MicroMessenger/i.test(ua) ? 'android-wx' : 'android';
    return 'desktop';
  }
  /* 给 select 赋值：个别环境（如测试用 DOM 实现）value 只有 getter，逐级降级 */
  function _appSelectSync(sel, val){
    if(!sel || !val) return;
    try{ if(sel.value !== val) sel.value = val; }catch(e){}
    try{ if(sel.value === val) return; }catch(e){}
    try{
      var opts = sel.options || [];
      for(var i = 0; i < opts.length; i++){
        var o = opts[i];
        var ov = '';
        try{ ov = (o.getAttribute && o.getAttribute('value')) || ''; }catch(e){}
        if(!ov){ try{ ov = o.value || ''; }catch(e){} }
        try{ o.selected = (ov === val); }catch(e){}
      }
      for(var j = 0; j < opts.length; j++){
        try{
          if(opts[j].selected) opts[j].setAttribute('selected', 'selected');
          else if(opts[j].removeAttribute) opts[j].removeAttribute('selected');
        }catch(e){}
      }
    }catch(e){}
  }
  function _appPlatform(){
    var k = _appPlatformKey();
    if(k && k !== 'auto') return k;
    return _appPlatformAuto();
  }
  /* 分设备的安装步骤（[{t:标题, s:[步骤...]}]） */
  function _appStepsData(){
    var p = _appPlatform();
    if(_appStandalone()) return [{t:'已经装好了', s:['桌面上的图标点开就是这个工作台，数据与电脑端共用同一份云端数据。']}];
    if(p === 'harmony') return [
      {t:'鸿蒙 / 华为浏览器', s:[
        '用手机自带的「浏览器」（华为浏览器）打开上面的链接',
        '点底部工具栏的「三横线」菜单（部分版本在右下角，或地址栏右侧「⋮」）',
        '选「添加到桌面」，确认后桌面就会出现图标',
        '菜单里没有？试试「分享」→「添加到桌面」，或长按网页空白处看是否有「添加到桌面」'
      ]},
      {t:'纯血鸿蒙（HarmonyOS NEXT）说明', s:[
        '目前给的是「网页快捷方式」：点图标会用浏览器打开，顶部可能仍显示地址栏',
        '功能、数据、登录状态与在浏览器里打开完全一致，不影响使用',
        '想要更像 App：在浏览器菜单里开「全屏浏览 / 无工具栏」，即可隐藏地址栏'
      ]}
    ];
    if(p === 'harmony-wx') return [
      {t:'鸿蒙 / 微信', s:[
        '点微信右上角「…」→「在浏览器打开」',
        '在华为浏览器里点底部「三横线」菜单',
        '选「添加到桌面」，确认即可'
      ]}
    ];
    if(p === 'ios-safari') return [{t:'iPhone / Safari', s:['点底部工具栏的「分享」按钮（方框向上箭头）','在菜单里向下找到「添加到主屏幕」','右上角点「添加」，桌面就会出现图标']}];
    if(p === 'ios-other') return [{t:'iPhone / 其他浏览器或微信', s:['先点右上角「…」，选「在 Safari 中打开」','再按 Safari 的步骤：分享 → 添加到主屏幕']}];
    if(p === 'android') return [{t:'Android / Chrome', s:['点右上角「⋮」菜单','选「添加到主屏幕」或「安装应用」','确认添加，桌面就会出现图标']}];
    if(p === 'android-wx') return [{t:'Android / 微信', s:['点右上角「…」，选「在浏览器打开」','在浏览器里点「⋮」→「添加到主屏幕」']}];
    return [{t:'电脑浏览器', s:['直接收藏到书签栏即可；手机上按下面的步骤添加到主屏幕。']}];
  }
  function renderAppInstall(){
    var box = document.getElementById('appInstallSteps');
    if(box){
      var html = '';
      _appStepsData().forEach(function(g){
        html += '<div class="app-install-group"><strong>' + g.t + '</strong>';
        g.s.forEach(function(step, i){
          html += '<div class="app-step"><b>' + (i + 1) + '</b><span>' + step + '</span></div>';
        });
        html += '</div>';
      });
      box.innerHTML = html;
    }
    var sel = document.getElementById('appPlatformSel');
    var cur = _appPlatformKey();
    _appSelectSync(sel, cur);
    var hint = document.getElementById('appPlatformHint');
    if(hint){
      hint.textContent = (cur === 'auto')
        ? ('自动识别为：' + _appPlatformLabel(_appPlatformAuto()))
        : ('已手动选择，切回「自动识别」可恢复系统判断');
    }
    var inp = document.getElementById('appInstallUrl');
    if(inp && !inp.value) inp.value = APP_SHARE_URL;
    var note = document.getElementById('appInstallNote');
    if(note){
      note.textContent = _appStandalone()
        ? '已从桌面图标进入，数据与电脑端共用同一份云端数据。'
        : '装好后：点图标即进；同一台设备 7 天内不用重新输密码；换设备或超过 7 天输一次密码，数据自动从云端同步回来。';
    }
  }
  function _appCopyText(text, done){
    var fallback = function(){
      try{
        var i = document.getElementById('appInstallUrl');
        if(!i) return false;
        i.removeAttribute('readonly');
        i.focus();
        i.select();
        if(i.setSelectionRange) i.setSelectionRange(0, 9999);
        var ok = document.execCommand('copy');
        i.setAttribute('readonly', 'readonly');
        return ok;
      }catch(e){ return false; }
    };
    try{
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(fallback()); });
        return;
      }
    }catch(e){}
    done(fallback());
  }
  function bindAppInstall(){
    var copy = document.getElementById('appInstallCopyBtn');
    if(copy && !copy._bound){
      copy._bound = true;
      copy.addEventListener('click', function(){
        _appCopyText(APP_SHARE_URL, function(ok){ toast(ok ? '链接已复制，粘贴到手机浏览器打开' : '复制失败，请长按输入框手动复制'); });
      });
    }
    var psel = document.getElementById('appPlatformSel');
    if(psel && !psel._bound){
      psel._bound = true;
      psel.addEventListener('change', function(){ _appPlatformSet(psel.value); });
    }
    var close = document.getElementById('appTipClose');
    if(close && !close._bound){
      close._bound = true;
      close.addEventListener('click', function(){
        var tip = document.getElementById('appTip');
        if(tip) tip.hidden = true;
        try{ localStorage.setItem(APP_TIP_KEY, 'dismissed'); }catch(e){}
      });
    }
    var go = document.getElementById('appTipGo');
    if(go && !go._bound){
      go._bound = true;
      go.addEventListener('click', function(){
        var tip = document.getElementById('appTip');
        if(tip) tip.hidden = true;
        try{ localStorage.setItem(APP_TIP_KEY, 'dismissed'); }catch(e){}
        try{ openBrandSettings(); }catch(e){ console.error('openBrandSettings:', e); }
        setTimeout(function(){
          var panel = document.getElementById('appInstallPanel');
          if(panel && panel.scrollIntoView) panel.scrollIntoView({ block: 'center' });
        }, 220);
      });
    }
  }
  /* 首屏提示：仅窄屏（手机）且未装到桌面、未点过「不再提示」时出现一次 */
  function maybeShowAppTip(){
    if(_appStandalone()) return;
    var tip = document.getElementById('appTip');
    if(!tip) return;
    var seen = '';
    try{ seen = localStorage.getItem(APP_TIP_KEY) || ''; }catch(e){}
    if(seen) return;
    var narrow = false;
    try{ narrow = window.matchMedia('(max-width: 860px)').matches; }catch(e){ narrow = window.innerWidth < 861; }
    if(!narrow) return;
    tip.hidden = false;
  }
  function init(){rolloverWeeklyPlan();bindGlobalClick();try{renderAppInstall();bindAppInstall();maybeShowAppTip();}catch(e){console.error('appInstall:',e)}const now=new Date(),weekdays=['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];document.getElementById('todayLabel').textContent=LANG==='en'?new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',weekday:'long'}).format(now):`${now.getMonth()+1} 月 ${now.getDate()} 日 · ${weekdays[now.getDay()]}`;setDateDefaults();updateMoneyCategories();restoreDrafts();try{bindForms()}catch(e){console.error('bindForms:',e)}try{bindEvents()}catch(e){console.error('bindEvents:',e)}renderAll();switchView(document.getElementById(`view-${location.hash.slice(1)}`)?location.hash.slice(1):'dashboard');if(!dataCorrupted)saveState();applySettingsSync(function(changed){ if(changed){ saveState(); renderAll(); } pullAllRemote(function(ok){ if(ok){ saveState(); renderAll(); syncPendingRecords(function(n){ if(n>0){ saveState(); setTimeout(function(){ saveState(); renderAll(); toast('已补传 '+n+' 条未同步数据到云端'); }, 2500); syncPendingDeletes(function(dn){ if(dn>0){ saveState(); renderAll(); toast('已清理 '+dn+' 条云端残留记录'); } }); } }); } }); });}

  /* v32: 绑定锁定工作台按钮 */
  function bindLockButton(){
    var btn = document.getElementById('lockAppBtn');
    if(!btn) return;
    btn.addEventListener('click', function(){
      authLockApp();
      setTimeout(function(){ document.getElementById('authPass1').focus(); }, 60);
    });
  }

  /* v36: 手动「同步」按钮——先拉云端合并，再补传本地未上传记录，最后提示结果 */
  function bindSyncButton(){
    var btn = document.getElementById('syncNowBtn');
    if(!btn) return;
    btn.addEventListener('click', function(){
      if(!state_auth.unlocked) return;
      var label = btn.querySelector('span');
      var oldTxt = label ? label.textContent : null;
      btn.disabled = true;
      if(label) label.textContent = '同步中…';
      rolloverWeeklyPlan();
      pullAllRemote(function(ok){
        syncPendingRecords(function(n){
          btn.disabled = false;
          if(label && oldTxt != null) label.textContent = oldTxt;
          saveState();
          renderAll();
          if(!ok && LOCAL_ONLY) toast('同步失败：当前处于本地模式，请检查网络后重试');
          else if(!ok) toast('同步失败：无法连接云端，请检查网络后重试');
          else toast(n > 0 ? ('已同步云端数据，并补传 ' + n + ' 条本地记录') : '已同步云端最新数据');
        });
      });
    });
  }

  /* v36b: 绑定「数据体检」按钮（设置面板内） */
  function bindHealthCheckButton(){
    var btn = document.getElementById('diagHealthBtn');
    if(!btn) return;
    btn.addEventListener('click', function(){
      var out = document.getElementById('diagHealthOut');
      if(out) out.innerHTML = '<small>正在体检…</small>';
      runHealthCheck();
    });
  }

  startI18n();
  bindLockButton();
  bindSyncButton();
  bindHealthCheckButton();
  /* v32: init() 始终执行（DOMContentLoaded），但 dbFetchAll 在未登录时返回 []——所以即使
   * init() 调用 pullAllRemote 也不会暴露他人数据。authInit() 仅负责管理登录页 overlay。
   * 登录成功后调 authPostUnlockRehydrate() 重新拉一次云端数据（用真实 userId 过滤）。 */
  function authPostUnlockRehydrate(){
    pullAllRemote(function(ok){
      if(ok){ saveState(); renderAll(); backfillPlannerQuadrant(); }
    });
  }
  document.addEventListener('DOMContentLoaded', init);
  /* v54: 桥就绪轮询——覆盖外壳与 iframe 握手晚于脚本执行的时序场景（鸿蒙桌面图标 standalone 等） */
  document.addEventListener('DOMContentLoaded', ensureBridgeSync);
  /* authInit 在 init 之后立刻执行（DOMContentLoaded 已经触发后用微任务排队） */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', authInit);
  } else {
    /* 浏览器已就绪：直接执行 */
    setTimeout(authInit, 0);
  }
try{if(window.__TESTING__){window.__appTest={storageIcon:storageIcon,_pickMediaCover:_pickMediaCover,_isHttpUrl:_isHttpUrl,renderStorage:renderStorage,mergeMedia:mergeMedia,state:state,switchView:switchView,renderPeriod:renderPeriod,analyzePeriod:analyzePeriod,mergePeriod:mergePeriod,_periodResetForm:_periodResetForm,periodUnlocked:periodUnlocked,periodLock:periodLock,periodMarkUnlocked:periodMarkUnlocked,periodPinExists:periodPinExists,periodHashPin:periodHashPin,addRecord:addRecord,dbAdd:dbAdd,dbFetchAll:dbFetchAll,state_auth:state_auth,authHash:authHash,authUserId:authUserId,authPwHash:authPwHash,authLoadStored:authLoadStored,authClearStored:authClearStored,authInit:authInit,authUnlockComplete:authUnlockComplete,authLockApp:authLockApp,AUTH_PW_SALT:AUTH_PW_SALT,AUTH_UID_SALT:AUTH_UID_SALT,AUTH_STORAGE_KEY:AUTH_STORAGE_KEY,AUTH_SESSION_KEY:AUTH_SESSION_KEY,AUTH_MAX_ATTEMPTS:AUTH_MAX_ATTEMPTS,AUTH_LOCK_MS:AUTH_LOCK_MS,_authGetRowUserId:_authGetRowUserId,_buildTimelineEvents:_buildTimelineEvents,mergeShopping:mergeShopping,mergeStorage:mergeStorage,renderDiet:renderDiet,renderPlanner:renderPlanner,renderStorage:renderStorage,renderStorageOverview:renderStorageOverview,habitStreak:habitStreak,habitDone:habitDone,renderHabits:renderHabits,renderMoodTimeline:renderMoodTimeline,setStorageSearch:function(v){_storageSearch=v;},getStorageSearch:function(){return _storageSearch;},clearPeriodHistoryLocal:clearPeriodHistoryLocal,readPeriodClearMarker:readPeriodClearMarker,writePeriodClearMarker:writePeriodClearMarker,pullAllRemote:pullAllRemote,dbFetchAllRaw:dbFetchAllRaw,cloudCollectUserIds:cloudCollectUserIds,authSwitchToCloudEnter:authSwitchToCloudEnter,runHealthCheck:runHealthCheck,retagCloudToCurrentUser:retagCloudToCurrentUser,DIAG_TABLES:DIAG_TABLES,getLastDbWriteErr:function(){return lastDbWriteErr;},diagFetchRaw:diagFetchRaw,syncPendingRecords:syncPendingRecords,backfillPlannerQuadrant:backfillPlannerQuadrant,analyzePlannerRepeats:analyzePlannerRepeats,createNextRepeat:createNextRepeat,maybeAutoNextRepeat:maybeAutoNextRepeat,renderPlannerRepeats:renderPlannerRepeats,mergePayback:mergePayback,renderPayback:renderPayback,paybackIcon:paybackIcon,addPaybackUse:addPaybackUse,mergeRemoteHabits:mergeRemoteHabits,mergeDietPlans:mergeDietPlans,mergePlan:mergePlan,mergePlanList:mergePlanList,applySettingsSync:applySettingsSync,syncPendingDeletes:syncPendingDeletes,enqueuePendingDelete:enqueuePendingDelete,isoDate:isoDate,uid:uid,renderSleep:renderSleep,mergePlanList:mergePlanList,_dietPlanEatenByRecord:_dietPlanEatenByRecord,renderDietPlan:renderDietPlan,renderMood:renderMood,_sleepMetrics:_sleepMetrics,_fmtMin:_fmtMin,_sleepInBed:_sleepInBed,_sleepSeries:_sleepSeries,_sleepAdviceFor:_sleepAdviceFor,renderStorageFrequency:renderStorageFrequency,_bumpUsage:_bumpUsage,renderMoodCalendar:renderMoodCalendar,renderMoodDayDetail:renderMoodDayDetail,renderMedia:renderMedia,renderHabits:renderHabits,renderStorage:renderStorage,renderDietAI:renderDietAI,renderAppInstall:renderAppInstall,_appStandalone:_appStandalone,_appPlatform:_appPlatform,_appStepsData:_appStepsData,bindAppInstall:bindAppInstall,maybeShowAppTip:maybeShowAppTip,APP_SHARE_URL:APP_SHARE_URL,_appPlatformSet:_appPlatformSet,_appPlatformAuto:_appPlatformAuto,_appPlatformLabel:_appPlatformLabel,_appPlatformKey:_appPlatformKey,_appSelectSync:_appSelectSync};}}catch(e){}
})();

  