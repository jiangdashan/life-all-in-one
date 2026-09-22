# -*- coding: utf-8 -*-
"""v52 补丁：在 app 内加入「装到手机桌面」引导（含桌面图标 meta、复制链接、分设备步骤、首屏提示）。
一次性批量替换（同文件多处并行 Edit 会互相覆盖），改完逐项断言。"""
import io, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()
orig_len = len(s)

b64 = io.open(r"D:\workbuddyProjects\工作台3\_tools\_icon_b64.txt", encoding="utf-8").read().split("\n")
ICON180 = b64[1].strip()

applied = []


def rep(old, new, tag, count=1):
    global s
    n = s.count(old)
    if n != count:
        print("!! [%s] 锚点匹配 %d 次（期望 %d），中止" % (tag, n, count))
        sys.exit(1)
    s = s.replace(old, new, count)
    applied.append(tag)


# ---------- 1. head：桌面图标 / 独立窗口 meta ----------
old = '  <meta data-page-node-id="rvUDVCrHKMahST6E6GoNhS" content="#f7f8f9" name="theme-color">'
new = old + """
  <!-- v52: 装到手机桌面——桌面图标与独立窗口所需 meta（顶层打开时生效） -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="\u65e5\u5e38\u96c6">
  <meta name="application-name" content="\u65e5\u5e38\u96c6">
  <link rel="apple-touch-icon" sizes="180x180" href="data:image/png;base64,""" + ICON180 + '">'
rep(old, new, "head-meta")

# ---------- 2. CSS ----------
old = "#dietList{max-height:none;overflow:visible}}</style>"
new = "#dietList{max-height:none;overflow:visible}}" + """
  /* v52: 装到手机桌面（安装引导面板 + 首屏提示条） */
  .app-install{border-top:1px solid var(--line);margin-top:14px;padding-top:14px;display:flex;flex-direction:column;gap:10px}
  .app-install-head b{font-size:13px;font-weight:600;color:var(--ink)}
  .app-install-head small{display:block;font-size:12px;color:var(--muted);line-height:1.65;margin-top:2px}
  .app-install-link{display:flex;gap:8px;align-items:center}
  .app-install-link input{flex:1;min-width:0;height:40px;padding:0 12px;border:1px solid var(--line);border-radius:11px;font-size:12.5px;color:var(--muted);background:#f7f8f9;box-sizing:border-box}
  .app-install-link .btn{flex:none;height:40px}
  .app-install-steps{display:flex;flex-direction:column;gap:9px}
  .app-install-group{display:flex;flex-direction:column;gap:5px}
  .app-install-group>strong{font-size:12.5px;font-weight:600;color:var(--ink)}
  .app-step{display:flex;gap:8px;font-size:12.5px;line-height:1.7;color:var(--muted)}
  .app-step b{flex:none;width:17px;height:17px;border-radius:50%;background:var(--plum-soft);color:var(--plum);font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;margin-top:3px}
  .app-install-note{font-size:12px;color:var(--muted);line-height:1.7}
  .app-tip{position:fixed;left:10px;right:10px;bottom:calc(74px + env(safe-area-inset-bottom));z-index:120;display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:#fff;box-shadow:0 10px 26px rgba(40,50,65,.14)}
  .app-tip[hidden]{display:none!important}
  .app-tip-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
  .app-tip-body b{font-size:13.5px;font-weight:600;color:var(--ink)}
  .app-tip-body span{font-size:12px;color:var(--muted);line-height:1.5}
  .app-tip .btn{flex:none;height:36px;padding:0 12px;font-size:13px}
  .app-tip-x{flex:none;width:28px;height:28px;border:none;background:transparent;color:var(--muted);font-size:17px;line-height:1;cursor:pointer}
  @media all and (display-mode:standalone){.app-tip{display:none!important}}
</style>"""
rep(old, new, "css")

# ---------- 3. 设置面板内的安装引导 ----------
old = """        <button type="button" class="btn ghost full" id="diagHealthBtn">开始数据体检</button>
      </div>"""
new = old + """
      <div class="app-install" id="appInstallPanel">
        <div class="app-install-head"><b>装到手机桌面</b><small>把工作台变成一个桌面图标，点开就能直接进入，不用每次找链接</small></div>
        <div class="app-install-link">
          <input type="text" id="appInstallUrl" readonly value="https://workbuddy.link/p/IAP7cP1ljx7juu0hAdPdVy">
          <button type="button" class="btn ghost" id="appInstallCopyBtn">复制链接</button>
        </div>
        <div class="app-install-steps" id="appInstallSteps"></div>
        <small class="app-install-note" id="appInstallNote"></small>
      </div>"""
rep(old, new, "panel-html")

# ---------- 4. 首屏提示条 ----------
old = '  <div data-page-node-id="O6lqhL5DjisqKtD2248Lk7" aria-live="polite" class="toast" id="toast" role="status"></div>'
new = """  <div class="app-tip" id="appTip" hidden>
    <div class="app-tip-body"><b>把它装到手机桌面</b><span>点桌面图标即可直接进入，无需再找链接</span></div>
    <button type="button" class="btn primary" id="appTipGo">怎么装</button>
    <button type="button" class="app-tip-x" id="appTipClose" aria-label="不再提示">\u00d7</button>
  </div>
""" + old
rep(old, new, "tip-html")

# ---------- 5. JS 逻辑 + init 调用 ----------
JS = u"""  /* ===== v52: 装到手机桌面（把工作台变成一个桌面图标）===== */
  var APP_SHARE_URL = 'https://workbuddy.link/p/IAP7cP1ljx7juu0hAdPdVy';
  var APP_TIP_KEY = 'richangji-app-tip-v1';
  function _appStandalone(){
    try{
      if(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if(window.navigator && window.navigator.standalone === true) return true;
    }catch(e){}
    return false;
  }
  function _appPlatform(){
    var ua = (navigator.userAgent || '');
    if(/iPhone|iPad|iPod/i.test(ua)) return /CriOS|FxiOS|EdgiOS|MicroMessenger/i.test(ua) ? 'ios-other' : 'ios-safari';
    if(/Android|HarmonyOS/i.test(ua)) return /MicroMessenger/i.test(ua) ? 'android-wx' : 'android';
    return 'desktop';
  }
  /* 分设备的安装步骤（[{t:标题, s:[步骤...]}]） */
  function _appStepsData(){
    var p = _appPlatform();
    if(_appStandalone()) return [{t:'已经装好了', s:['桌面上的图标点开就是这个工作台，数据与电脑端共用同一份云端数据。']}];
    if(p === 'ios-safari') return [{t:'iPhone / Safari', s:['点底部工具栏的「分享」按钮（方框向上箭头）','在菜单里向下找到「添加到主屏幕」','右上角点「添加」，桌面就会出现图标']}];
    if(p === 'ios-other') return [{t:'iPhone / 其他浏览器或微信', s:['先点右上角「…」，选「在 Safari 中打开」','再按 Safari 的步骤：分享 → 添加到主屏幕']}];
    if(p === 'android') return [{t:'Android / Chrome', s:['点右上角「\u22ee」菜单','选「添加到主屏幕」或「安装应用」','确认添加，桌面就会出现图标']}];
    if(p === 'android-wx') return [{t:'Android / 微信', s:['点右上角「…」，选「在浏览器打开」','在浏览器里点「\u22ee」→「添加到主屏幕」']}];
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
        openBrandSettings();
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
"""
old = "  function init(){rolloverWeeklyPlan();bindGlobalClick();"
new = JS + "  function init(){rolloverWeeklyPlan();bindGlobalClick();try{renderAppInstall();bindAppInstall();maybeShowAppTip();}catch(e){console.error('appInstall:',e)}"
rep(old, new, "js+init")

# ---------- 6. 测试导出 ----------
old = ",renderDietAI:renderDietAI};}}catch(e){}"
new = ",renderDietAI:renderDietAI,renderAppInstall:renderAppInstall,_appStandalone:_appStandalone,_appPlatform:_appPlatform,_appStepsData:_appStepsData,bindAppInstall:bindAppInstall,maybeShowAppTip:maybeShowAppTip,APP_SHARE_URL:APP_SHARE_URL};}}catch(e){}"
rep(old, new, "test-export")

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("已应用:", applied)
print("字符数 %d -> %d (+%d)" % (orig_len, len(s), len(s) - orig_len))
