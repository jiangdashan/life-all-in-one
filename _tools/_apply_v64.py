# -*- coding: utf-8 -*-
"""v64: 设置面板新增「邀请他人使用」区块（查看/重新生成/恢复内置 邀请码）
   所有查看与修改均需校验本机访问密码，防止他人设备顺手改码。
   一律原子读-改-写 + 逐锚点断言。
"""
import io, sys

P = 'life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig = s
log = []

def sub(old, new, label, expect=1):
    global s
    n = s.count(old)
    if n != expect:
        raise SystemExit('ANCHOR FAIL [%s] count=%d expect=%d\n--- old ---\n%s' % (label, n, expect, old[:300]))
    s = s.replace(old, new, expect)
    log.append('OK  %-28s (%d)' % (label, n))

# ---------- 1) HTML: 在 app-install 之后、section 结束前插入邀请区块 ----------
A1 = '        <small class="app-install-note" id="appInstallNote"></small>\n      </div>\n    </section>'
B1 = '''        <small class="app-install-note" id="appInstallNote"></small>
      </div>
      <div class="invite-box" id="inviteBox">
        <div class="invite-head"><b>邀请他人使用</b><small>每个人用自己的访问密码进入，数据是彼此完全隔离的独立空间。</small></div>
        <div class="invite-code-row">
          <span class="invite-label">当前邀请码</span>
          <code class="invite-code" id="inviteCodeText" data-shown="0">············</code>
          <button class="btn ghost" id="inviteToggleBtn" type="button">显示</button>
        </div>
        <small class="invite-state" id="inviteState"></small>
        <div class="invite-actions">
          <button class="btn ghost" id="inviteCopyBtn" type="button">复制邀请信息</button>
          <button class="btn ghost" id="inviteRegenBtn" type="button">重新生成</button>
          <button class="btn ghost" id="inviteResetBtn" type="button">恢复内置</button>
        </div>
      </div>
    </section>'''
sub(A1, B1, 'HTML 邀请区块')

# ---------- 2) CSS ----------
A2 = '.diag-health{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}'
B2 = '''.invite-box{border-top:1px solid var(--line);margin-top:14px;padding-top:14px;display:flex;flex-direction:column;gap:9px}
  .invite-head b{font-size:13px;font-weight:600;color:var(--ink)}
  .invite-head small{display:block;font-size:12px;color:var(--muted);line-height:1.6;margin-top:2px}
  .invite-code-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .invite-label{flex:none;font-size:12.5px;color:var(--muted)}
  .invite-code{flex:1;min-width:132px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px;letter-spacing:1px;color:var(--ink);background:#f4f6f8;border:1px solid var(--line);border-radius:9px;padding:7px 10px;box-sizing:border-box}
  .invite-state{font-size:12px;color:var(--muted);line-height:1.6}
  .invite-actions{display:flex;gap:8px;flex-wrap:wrap}
  .invite-actions .btn{flex:none;padding:7px 12px;font-size:12.5px}
  .diag-health{margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}'''
sub(A2, B2, 'CSS 邀请区块')

# ---------- 3) JS: 邀请码管理函数 ----------
A3 = "  var AUTH_INVITE_STORE_KEY = 'richangji-invite-code-v1';\n"
B3 = """  var AUTH_INVITE_STORE_KEY = 'richangji-invite-code-v1';
  /* ===== v64 邀请码管理（设置面板） =====
   * 内置码明文随源码发布：页面 JS 对访问者本就完全可读，存哈希并不构成安全边界
   * （校验函数本身就在同一份源码里）。真正的私密性来自「自行重新生成」——
   * 自定义码只写本机 localStorage，绝不进云端，也就不会被其他身份读到。
   * 另外：任何查看/修改都先校验本机访问密码，避免他人在自己设备上顺手改码。 */
  var AUTH_INVITE_DEFAULT = 'RJ-U6M9-VBCV';
  var AUTH_INVITE_OWNER_KEY = 'richangji-invite-owner-v1';
  function authInviteCurrentCode(){
    var c = authStoredInviteCode();
    return c ? String(c).trim().toUpperCase() : AUTH_INVITE_DEFAULT;
  }
  function authInviteIsCustom(){ return !!authStoredInviteCode(); }
  function authGenInviteCode(){
    /* 剔除易混淆字符 I/O/0/1 */
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    function pick(n){ var o = ''; for(var i=0;i<n;i++) o += A.charAt(Math.floor(Math.random()*A.length)); return o; }
    return 'RJ-' + pick(4) + '-' + pick(4);
  }
  function authInviteIsOwnerOk(){ try{ return sessionStorage.getItem(AUTH_INVITE_OWNER_KEY) === '1'; }catch(e){ return false; } }
  async function authInviteAskPw(){
    var stored = authLoadStored();
    if(!stored || !stored.passwordHash) return false;
    var cached = '';
    try{ cached = sessionStorage.getItem('unlockPw') || ''; }catch(e){}
    if(cached && (await authPwHash(cached)) === stored.passwordHash) return true;
    var input = '';
    try{ input = (typeof window !== 'undefined' && window.prompt) ? (window.prompt('请输入你的访问密码，以便查看或修改邀请码') || '') : ''; }catch(e){}
    if(!input) return false;
    return (await authPwHash(input)) === stored.passwordHash;
  }
  async function authInviteEnsureOwner(){
    if(authInviteIsOwnerOk()) return true;
    if(!(await authInviteAskPw())){ toast('需要验证你的访问密码'); return false; }
    try{ sessionStorage.setItem(AUTH_INVITE_OWNER_KEY, '1'); }catch(e){}
    return true;
  }
  function authInviteRender(){
    var el = document.getElementById('inviteCodeText');
    var st = document.getElementById('inviteState');
    var tg = document.getElementById('inviteToggleBtn');
    if(!el) return;
    var shown = el.getAttribute('data-shown') === '1';
    el.textContent = shown ? authInviteCurrentCode() : '············';
    if(tg) tg.textContent = shown ? '隐藏' : '显示';
    if(st) st.innerHTML = authInviteIsCustom()
      ? '当前使用<b>自定义邀请码</b>，仅保存在本机浏览器，不会同步到云端。'
      : '当前使用<b>内置邀请码</b>。它随页面源码发布，建议点「重新生成」换一个。';
  }
  async function authInviteToggle(){
    var el = document.getElementById('inviteCodeText');
    if(!el) return;
    if(el.getAttribute('data-shown') === '1'){ el.setAttribute('data-shown','0'); authInviteRender(); return; }
    if(!(await authInviteEnsureOwner())) return;
    el.setAttribute('data-shown','1'); authInviteRender();
  }
  async function authInviteRegen(){
    if(!(await authInviteEnsureOwner())) return;
    var old = authInviteCurrentCode();
    var msg = '重新生成后，旧的邀请码 ' + old + ' 将立即失效。' +
      '\\n如果对方还没用它注册，需要把新码重新发给他。\\n\\n确定要重新生成吗？';
    if(!authInviteConfirm(msg)) return;
    var code = authGenInviteCode();
    try{ localStorage.setItem(AUTH_INVITE_STORE_KEY, code); }
    catch(e){ toast('保存失败，请检查浏览器存储空间'); return; }
    try{ var vis = document.getElementById('inviteCodeText'); if(vis) vis.setAttribute('data-shown','1'); }catch(e){}
    authInviteRender();
    toast('已生成新的邀请码');
  }
  async function authInviteReset(){
    if(!(await authInviteEnsureOwner())) return;
    if(!authInviteIsCustom()){ toast('当前已经是内置邀请码'); return; }
    if(!authInviteConfirm('恢复为内置邀请码后，当前自定义码将失效。确定吗？')) return;
    try{ localStorage.removeItem(AUTH_INVITE_STORE_KEY); }catch(e){}
    authInviteRender();
    toast('已恢复为内置邀请码');
  }
  function authInviteConfirm(msg){
    try{ if(typeof window !== 'undefined' && window.confirm) return !!window.confirm(msg); }catch(e){}
    return true;
  }
  function authInviteClipboard(txt){
    var done = false;
    try{ if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(txt); done = true; } }catch(e){}
    if(!done){
      try{
        var ta = document.createElement('textarea');
        ta.value = txt; ta.setAttribute('readonly','');
        ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        done = document.execCommand('copy');
        document.body.removeChild(ta);
      }catch(e){}
    }
    toast(done ? '邀请信息已复制' : '复制失败，请长按选中文字手动复制');
  }
  async function authInviteCopy(){
    if(!(await authInviteEnsureOwner())) return;
    var url = (typeof APP_SHARE_URL !== 'undefined' && APP_SHARE_URL) ? APP_SHARE_URL : String(location.href || '').split('#')[0];
    var txt = '工作台链接：' + url + '\\n邀请码：' + authInviteCurrentCode() +
      '\\n\\n打开链接，点底部「创建一个新的独立空间」，输入邀请码后设置一个你自己的访问密码即可。' +
      '\\n（记住自己的密码，忘记无法找回）';
    authInviteClipboard(txt);
  }
  function bindInvitePanel(){
    var map = { inviteToggleBtn: authInviteToggle, inviteRegenBtn: authInviteRegen,
                inviteResetBtn: authInviteReset, inviteCopyBtn: authInviteCopy };
    try{
      Object.keys(map).forEach(function(id){
        var b = document.getElementById(id);
        if(b) b.addEventListener('click', function(){ map[id](); });
      });
      authInviteRender();
    }catch(e){}
  }
"""
sub(A3, B3, 'JS 邀请码管理函数')

# ---------- 4) 启动绑定 ----------
A4 = '  bindHealthCheckButton();\n'
B4 = '  bindHealthCheckButton();\n  bindInvitePanel();\n'
sub(A4, B4, '启动绑定 bindInvitePanel')

# ---------- 5) __appTest 导出 ----------
A5 = '_appSelectSync:_appSelectSync};'
B5 = ('_appSelectSync:_appSelectSync,AUTH_INVITE_DEFAULT:AUTH_INVITE_DEFAULT,'
      'AUTH_INVITE_STORE_KEY:AUTH_INVITE_STORE_KEY,AUTH_INVITE_OWNER_KEY:AUTH_INVITE_OWNER_KEY,'
      'authInviteCurrentCode:authInviteCurrentCode,authInviteIsCustom:authInviteIsCustom,'
      'authGenInviteCode:authGenInviteCode,authInviteRender:authInviteRender,'
      'authInviteToggle:authInviteToggle,authInviteRegen:authInviteRegen,'
      'authInviteReset:authInviteReset,authInviteCopy:authInviteCopy,'
      'authInviteClipboard:authInviteClipboard,bindInvitePanel:bindInvitePanel};')
sub(A5, B5, '__appTest 导出')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\n'.join(log))
print('文件 %d -> %d 字符' % (len(orig), len(s)))
