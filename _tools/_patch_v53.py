# -*- coding: utf-8 -*-
"""v53: 鸿蒙（HarmonyOS / 华为浏览器）安装引导
1) _appPlatform 增加鸿蒙识别（必须排在 Android 之前，因为 HarmonyOS 4 的 UA 同时含 Android）
2) 新增 harmony / harmony-wx 两套步骤 + 纯血鸿蒙说明
3) 面板加「我的设备」下拉，可手动切换（UA 识别不准时用）
4) CSS + 测试导出
"""
import io

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'count mismatch %d != %d for: %s' % (c, n, old[:80])
    s = s.replace(old, new, n)


# ---------- 1. 常量 ----------
rep(
    "  var APP_TIP_KEY = 'richangji-app-tip-v1';\n",
    "  var APP_TIP_KEY = 'richangji-app-tip-v1';\n"
    "  var APP_PLATFORM_KEY = 'richangji-app-platform-v1';\n"
    "  var APP_PLATFORM_LIST = [\n"
    "    ['auto','自动识别'],\n"
    "    ['harmony','鸿蒙 / 华为浏览器'],\n"
    "    ['harmony-wx','鸿蒙 / 微信'],\n"
    "    ['ios-safari','iPhone / Safari'],\n"
    "    ['ios-other','iPhone / 其他浏览器'],\n"
    "    ['android','Android / Chrome'],\n"
    "    ['android-wx','Android / 微信'],\n"
    "    ['desktop','电脑浏览器']\n"
    "  ];\n"
    "  function _appPlatformKey(){ try{ return localStorage.getItem(APP_PLATFORM_KEY) || 'auto'; }catch(e){ return 'auto'; } }\n"
    "  function _appPlatformSet(v){ try{ localStorage.setItem(APP_PLATFORM_KEY, v || 'auto'); }catch(e){} renderAppInstall(); }\n"
    "  function _appPlatformLabel(k){\n"
    "    var t = '';\n"
    "    APP_PLATFORM_LIST.forEach(function(it){ if(it[0] === k) t = it[1]; });\n"
    "    return t || k;\n"
    "  }\n"
)

# ---------- 2. 平台识别 ----------
rep(
    """  function _appPlatform(){
    var ua = (navigator.userAgent || '');
    if(/iPhone|iPad|iPod/i.test(ua)) return /CriOS|FxiOS|EdgiOS|MicroMessenger/i.test(ua) ? 'ios-other' : 'ios-safari';
    if(/Android|HarmonyOS/i.test(ua)) return /MicroMessenger/i.test(ua) ? 'android-wx' : 'android';
    return 'desktop';
  }
""",
    """  /* 自动识别：鸿蒙必须排在 Android 之前——HarmonyOS 4 兼容安卓，UA 里同时带 Android */
  function _appPlatformAuto(){
    var ua = (navigator.userAgent || '');
    if(/OpenHarmony|HarmonyOS/i.test(ua) || /HuaweiBrowser/i.test(ua)){
      return /MicroMessenger/i.test(ua) ? 'harmony-wx' : 'harmony';
    }
    if(/iPhone|iPad|iPod/i.test(ua)) return /CriOS|FxiOS|EdgiOS|MicroMessenger/i.test(ua) ? 'ios-other' : 'ios-safari';
    if(/Android/i.test(ua)) return /MicroMessenger/i.test(ua) ? 'android-wx' : 'android';
    return 'desktop';
  }
  function _appPlatform(){
    var k = _appPlatformKey();
    if(k && k !== 'auto') return k;
    return _appPlatformAuto();
  }
"""
)

# ---------- 3. 步骤数据 ----------
rep(
    "    if(p === 'ios-safari') return [{t:'iPhone / Safari'",
    """    if(p === 'harmony') return [
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
    if(p === 'ios-safari') return [{t:'iPhone / Safari'"""
)

# ---------- 4. 面板 HTML：设备下拉 ----------
rep(
    """        <div class="app-install-link">
          <input type="text" id="appInstallUrl" readonly value="https://workbuddy.link/p/IAP7cP1ljx7juu0hAdPdVy">""",
    """        <div class="app-install-pick">
          <label for="appPlatformSel">我的设备</label>
          <select id="appPlatformSel">
            <option value="auto">自动识别</option>
            <option value="harmony">鸿蒙 / 华为浏览器</option>
            <option value="harmony-wx">鸿蒙 / 微信</option>
            <option value="ios-safari">iPhone / Safari</option>
            <option value="ios-other">iPhone / 其他浏览器</option>
            <option value="android">Android / Chrome</option>
            <option value="android-wx">Android / 微信</option>
            <option value="desktop">电脑浏览器</option>
          </select>
          <small id="appPlatformHint"></small>
        </div>
        <div class="app-install-link">
          <input type="text" id="appInstallUrl" readonly value="https://workbuddy.link/p/IAP7cP1ljx7juu0hAdPdVy">"""
)

# ---------- 5. renderAppInstall 同步下拉 ----------
rep(
    """    var inp = document.getElementById('appInstallUrl');
    if(inp && !inp.value) inp.value = APP_SHARE_URL;""",
    """    var sel = document.getElementById('appPlatformSel');
    var cur = _appPlatformKey();
    if(sel && sel.value !== cur) sel.value = cur;
    var hint = document.getElementById('appPlatformHint');
    if(hint){
      hint.textContent = (cur === 'auto')
        ? ('自动识别为：' + _appPlatformLabel(_appPlatformAuto()))
        : ('已手动选择，切回「自动识别」可恢复系统判断');
    }
    var inp = document.getElementById('appInstallUrl');
    if(inp && !inp.value) inp.value = APP_SHARE_URL;"""
)

# ---------- 6. 绑定下拉 ----------
rep(
    """    var close = document.getElementById('appTipClose');""",
    """    var psel = document.getElementById('appPlatformSel');
    if(psel && !psel._bound){
      psel._bound = true;
      psel.addEventListener('change', function(){ _appPlatformSet(psel.value); });
    }
    var close = document.getElementById('appTipClose');"""
)

# ---------- 7. CSS ----------
rep(
    "  .app-install-head b{",
    "  .app-install-pick{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n"
    "  .app-install-pick label{flex:none;font-size:12.5px;color:var(--muted)}\n"
    "  .app-install-pick select{flex:1;min-width:150px;height:38px;padding:0 10px;border:1px solid var(--line);border-radius:11px;font-size:13px;background:#fff;color:var(--ink);box-sizing:border-box}\n"
    "  .app-install-pick small{flex-basis:100%;font-size:12px;color:var(--muted);line-height:1.6}\n"
    "  .app-install-head b{"
)

# ---------- 8. 测试导出 ----------
rep(
    "APP_SHARE_URL:APP_SHARE_URL};",
    "APP_SHARE_URL:APP_SHARE_URL,_appPlatformSet:_appPlatformSet,_appPlatformAuto:_appPlatformAuto,_appPlatformLabel:_appPlatformLabel,_appPlatformKey:_appPlatformKey};"
)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('v53 patched, len =', len(s))
