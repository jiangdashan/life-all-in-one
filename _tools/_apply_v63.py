# -*- coding: utf-8 -*-
"""v63 多用户隔离：邀请码 + 独立空间创建入口 + 清空信号按 userId 过滤

红线：不得改变 authUserId 的派生公式 SHA256(AUTH_UID_SALT+':'+pw)，
      否则用户已有云端数据会因为 userId 变化而全部读不到（等同数据丢失）。
"""
import io

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()

EDITS = []

# ---------- 1) HTML：邀请码输入区 + 创建独立空间入口 ----------
A1 = '        <div class="auth-foot" id="authFoot"></div>'
H1 = (
    '        <div class="auth-space" id="authSpaceBox" hidden>\n'
    '          <label for="authInvite">邀请码</label>\n'
    '          <div class="auth-space-row">\n'
    '            <input type="text" id="authInvite" placeholder="向空间主人索取" autocomplete="off" autocapitalize="characters" spellcheck="false">\n'
    '            <button type="button" id="authInviteGo">验证</button>\n'
    '          </div>\n'
    '          <p class="auth-space-tip">验证后可创建一个全新的独立空间，与你之外的空间数据互不可见。</p>\n'
    '        </div>\n'
    '        <button type="button" class="auth-space-btn" id="authSpaceBtn" hidden>创建一个新的独立空间</button>\n'
    '        <div class="auth-foot" id="authFoot"></div>'
)
EDITS.append((A1, H1, 1))

# ---------- 2) CSS ----------
A2 = ".auth-strength.strong i{background:#5a8961}\n"
H2 = A2 + (
    ".auth-form .auth-space{display:flex;flex-direction:column;gap:8px;padding:14px;border:1px dashed #cdd1d7;border-radius:13px;background:#fbfcfc}\n"
    ".auth-form .auth-space-row{display:flex;gap:8px}\n"
    ".auth-form .auth-space-row input{flex:1;height:44px;text-transform:uppercase;letter-spacing:.08em}\n"
    ".auth-form .auth-space-row button{min-height:44px;padding:0 18px;flex:0 0 auto;font-size:13px}\n"
    ".auth-form .auth-space-tip{margin:0;color:#8b8f94;font-size:11px;line-height:1.55}\n"
    ".auth-form .auth-space-btn{min-height:0;padding:6px 0;background:none;color:#8b8f94;font-size:11px;font-weight:400;text-decoration:underline;text-underline-offset:3px}\n"
    ".auth-form .auth-space-btn:hover{background:none;color:#3b4654;transform:none}\n"
)
EDITS.append((A2, H2, 1))

# ---------- 3) 邀请码逻辑 + 云端行归属判定 ----------
A3 = "  var AUTH_TRUST_MS = 7 * 24 * 60 * 60 * 1000;\n"
H3 = A3 + (
    "  /* ===== v63 多用户隔离：邀请码 =====\n"
    "   * 背景：新设备一旦探测到云端已有数据就会被 cloudVerify 拦下（必须与原密码一致），\n"
    "   * 导致第二个人根本无法自助建立自己的空间。这里给一条受控入口：验证邀请码后才允许创建。\n"
    "   * 注意：userId 派生公式保持 SHA256(AUTH_UID_SALT+':'+pw) 完全不变——\n"
    "   * 改动它会让已有云端数据因 userId 失配而全部读不到（等同数据丢失）。\n"
    "   * 不同人只要密码不同就天然是不同 userId，云端读写早已按 userId 隔离，无需改数据模型。\n"
    "   * 源码只放邀请码的 SHA256 摘要不放明文；用户重生成后明文存本机 localStorage，\n"
    "   * 且绝不写入云端（避免被其他身份读到）。 */\n"
    "  var AUTH_INVITE_SALT = 'richangji-invite-v1';\n"
    "  var AUTH_INVITE_HASH = '2fe922e9d064a0afb7b0fa2ac20c4a0b6b20937a46386c843ffda4746d30cb3c';\n"
    "  var AUTH_INVITE_STORE_KEY = 'richangji-invite-code-v1';\n"
    "  function authStoredInviteCode(){ try{ return localStorage.getItem(AUTH_INVITE_STORE_KEY) || ''; }catch(e){ return ''; } }\n"
    "  function authInviteDigest(code){ return authHash(AUTH_INVITE_SALT+':'+String(code||'').trim().toUpperCase()); }\n"
    "  async function authCurrentInviteDigest(){\n"
    "    var custom = authStoredInviteCode();\n"
    "    if(custom) return await authInviteDigest(custom);\n"
    "    return AUTH_INVITE_HASH;\n"
    "  }\n"
    "  /* 纯函数：给定摘要比对邀请码，便于冒烟测试 */\n"
    "  function authInviteMatch(code, want){\n"
    "    var input = String(code||'').trim().toUpperCase();\n"
    "    if(!input || !want) return false;\n"
    "    return input === String(want).trim().toUpperCase();\n"
    "  }\n"
    "  async function authVerifyInvite(code){\n"
    "    var input = String(code||'').trim().toUpperCase();\n"
    "    if(!input) return false;\n"
    "    var want = await authCurrentInviteDigest();\n"
    "    return (await authInviteDigest(input)) === want;\n"
    "  }\n"
    "  /* v63: 一条云端记录是否归属当前用户。\n"
    "   * 老数据可能没写 userId（如历史清空标记），无 userId 时保守视为本人的历史数据；\n"
    "   * 有 userId 但不相等则一定排除——这是多用户隔离的关键判定。 */\n"
    "  function _rowOwnsBy(r){\n"
    "    if(!r) return false;\n"
    "    var uid = state_auth.userId;\n"
    "    var ru = _authGetRowUserId(r);\n"
    "    if(!ru) return true;\n"
    "    return !!uid && ru === uid;\n"
    "  }\n"
    "  /* 邀请码输入区显隐：只在“新设备 + 云端已有数据”场景出现 */\n"
    "  function _authSetSpaceEntry(show){\n"
    "    try{\n"
    "      var btn = document.getElementById('authSpaceBtn');\n"
    "      var box = document.getElementById('authSpaceBox');\n"
    "      var inp = document.getElementById('authInvite');\n"
    "      if(btn) btn.hidden = !show;\n"
    "      if(box) box.hidden = true;\n"
    "      if(inp) inp.value = '';\n"
    "    }catch(e){}\n"
    "  }\n"
    "  function authShowSpaceBox(show){\n"
    "    var box = document.getElementById('authSpaceBox');\n"
    "    var btn = document.getElementById('authSpaceBtn');\n"
    "    if(box) box.hidden = !show;\n"
    "    if(btn) btn.hidden = show;\n"
    "    if(show){ var inp=document.getElementById('authInvite'); if(inp) setTimeout(function(){ inp.focus(); },60); }\n"
    "  }\n"
    "  async function authSubmitInvite(){\n"
    "    var inp = document.getElementById('authInvite');\n"
    "    var code = inp ? inp.value : '';\n"
    "    if(!String(code||'').trim()){ authShowError('请输入邀请码'); return; }\n"
    "    if(authCheckLock()) return;\n"
    "    var ok = await authVerifyInvite(code);\n"
    "    if(ok){\n"
    "      state_auth.failedAttempts = 0;\n"
    "      authShowError('');\n"
    "      authShowSpaceBox(false);\n"
    "      authSwitchToCreate();\n"
    "      var sub = document.querySelector('.auth-sub');\n"
    "      if(sub) sub.innerHTML='邀请码已验证。请设置你自己的<b>访问密码</b>，即可获得一个全新的独立空间。<br><small style=\"color:#81868d\">至少 8 位；忘记密码无法恢复，请妥善保管。</small>';\n"
    "    } else {\n"
    "      state_auth.failedAttempts++;\n"
    "      if(state_auth.failedAttempts >= AUTH_MAX_ATTEMPTS){ state_auth.lockedUntil = Date.now() + AUTH_LOCK_MS; authCheckLock(); }\n"
    "      else authShowError('邀请码不正确，还可尝试 '+(AUTH_MAX_ATTEMPTS - state_auth.failedAttempts)+' 次');\n"
    "    }\n"
    "  }\n"
)
EDITS.append((A3, H3, 1))

# ---------- 4) 登录模式切换时控制入口显隐 ----------
A4 = "  function authSwitchToEnter(){\n    document.getElementById('authTitle').textContent='欢迎回来';"
H4 = "  function authSwitchToEnter(){\n    _authSetSpaceEntry(false);\n    document.getElementById('authTitle').textContent='欢迎回来';"
EDITS.append((A4, H4, 1))

A5 = "  function authSwitchToCloudEnter(){\n    authSwitchToEnter();"
H5 = "  function authSwitchToCloudEnter(){\n    authSwitchToEnter();\n    _authSetSpaceEntry(true);"
EDITS.append((A5, H5, 1))

A6 = "  function authSwitchToCreate(){\n    var f=document.getElementById('authForm'); if(!f) return;"
H6 = "  function authSwitchToCreate(){\n    _authSetSpaceEntry(false);\n    var f=document.getElementById('authForm'); if(!f) return;"
EDITS.append((A6, H6, 1))

# ---------- 5) 事件绑定 ----------
A7 = "    form.addEventListener('submit', authSubmit);\n"
H7 = (
    A7 +
    "    /* v63: 邀请码入口 */\n"
    "    var spaceBtn = document.getElementById('authSpaceBtn');\n"
    "    var inviteGo = document.getElementById('authInviteGo');\n"
    "    var inviteInp = document.getElementById('authInvite');\n"
    "    if(spaceBtn) spaceBtn.addEventListener('click', function(){ authShowError(''); authShowSpaceBox(true); });\n"
    "    if(inviteGo) inviteGo.addEventListener('click', function(e){ if(e && e.preventDefault) e.preventDefault(); authSubmitInvite(); });\n"
    "    if(inviteInp) inviteInp.addEventListener('keydown', function(e){ if(e && e.key === 'Enter'){ e.preventDefault(); authSubmitInvite(); } });\n"
)
EDITS.append((A7, H7, 1))

# ---------- 6) 清空信号改为按 userId 过滤（修复跨用户互清） ----------
A8 = (
    "  function readMetaClearAt(cb){\n"
    "    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(0); return; }\n"
    "    /* v36b: 标记行可能不带 userId，用 raw 读取避免被身份过滤漏掉 */\n"
    "    dbFetchAllRaw(DB_META, function(rows){\n"
    "      var ts = 0;\n"
    "      if (rows) rows.forEach(function(r){\n"
    '        if (String(r["键"]||"") === META_CLEAR_KEY) ts = Math.max(ts, Number(r["值"])||0);\n'
    "      });\n"
    "      if(cb) cb(ts);\n"
    "    });\n"
    "  }"
)
H8 = (
    "  function readMetaClearAt(cb){\n"
    "    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(0); return; }\n"
    "    /* v63: raw 读取后必须再按 userId 过滤——旧实现取全局最大时间戳，\n"
    "     * 会让「甲空间执行清空」把乙空间的数据一起清掉。\n"
    "     * 老标记行可能没有 userId（历史数据），此时保守采用，避免用户自己的旧清空信号失效。 */\n"
    "    dbFetchAllRaw(DB_META, function(rows){\n"
    "      var ts = 0;\n"
    "      if (rows) rows.forEach(function(r){\n"
    '        if (String(r["键"]||"") !== META_CLEAR_KEY) return;\n'
    "        if (!_rowOwnsBy(r)) return;\n"
    '        ts = Math.max(ts, Number(r["值"])||0);\n'
    "      });\n"
    "      if(cb) cb(ts);\n"
    "    });\n"
    "  }"
)
EDITS.append((A8, H8, 1))

A9 = (
    "  function readPeriodClearMarker(cb){\n"
    "    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(0); return; }\n"
    "    /* v36b: 标记行可能不带 userId（如 periodClearedAt），必须用 raw 读取，否则被身份过滤漏掉 */\n"
    "    dbFetchAllRaw(DB_META, function(rows){\n"
    "      var ts = 0;\n"
    '      if (rows) rows.forEach(function(r){ if (String(r["键"]||"") === META_PERIOD_CLEAR_KEY) ts = Math.max(ts, Number(r["值"])||0); });\n'
    "      if(cb) cb(ts);\n"
    "    });\n"
    "  }"
)
H9 = (
    "  function readPeriodClearMarker(cb){\n"
    "    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(0); return; }\n"
    "    /* v63: 同 readMetaClearAt——按 userId 过滤，避免一方清空经期把另一方一起清掉。\n"
    "     * 无 userId 的老行保守采用。 */\n"
    "    dbFetchAllRaw(DB_META, function(rows){\n"
    "      var ts = 0;\n"
    '      if (rows) rows.forEach(function(r){ if (String(r["键"]||"") !== META_PERIOD_CLEAR_KEY) return; if (!_rowOwnsBy(r)) return; ts = Math.max(ts, Number(r["值"])||0); });\n'
    "      if(cb) cb(ts);\n"
    "    });\n"
    "  }"
)
EDITS.append((A9, H9, 1))

# ---------- 7) 测试导出 ----------
A10 = "authHash:authHash,authUserId:authUserId,"
H10 = "authHash:authHash,authUserId:authUserId,authInviteMatch:authInviteMatch,authVerifyInvite:authVerifyInvite,authInviteDigest:authInviteDigest,AUTH_INVITE_HASH:AUTH_INVITE_HASH,_rowOwnsBy:_rowOwnsBy,readMetaClearAt:readMetaClearAt,"
EDITS.append((A10, H10, 1))

out = s
report = []
ok = True
for i, (old, new, exp) in enumerate(EDITS):
    n = out.count(old)
    if n != exp:
        ok = False
        report.append("MISS#%d expected=%d got=%d :: %r" % (i, exp, n, old[:70]))
        continue
    out = out.replace(old, new, 1)

if ok:
    io.open(P, "w", encoding="utf-8", newline="").write(out)
    print("APPLIED OK, len %d -> %d" % (len(s), len(out)))
else:
    print("ABORTED, nothing written")
    for r in report:
        print(r)
