# -*- coding: utf-8 -*-
"""v81: 立即备份"按不动"修复
根因: inject.js 的 __SMART_PAGE__ 是永真代理——外壳注入真实数据库实现前,
      .database 也返回可调用对象, refreshDb 判 ONLINE 恒 true,
      云端调用排进 15s 超时队列; 且点击无即时反馈 → 用户感知"按不动"。
修复: 1) refreshDb 用 __realImpls__.database 判真就绪
      2) snapshotManual 即时反馈(备份中…/disabled) + 20s 看门狗 + 全程 try/catch
      3) bindSnapshotPanel 增 document 委托兜底(_snapManualBusy 去重)
      4) init 绑定逐个隔离, 单个抛错不拖死后续绑定
"""
import io, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig = s

def rep(old, new, cnt=1):
    global s
    assert s.count(old) == cnt, 'anchor count %d != %d: %r' % (s.count(old), cnt, old[:80])
    s = s.replace(old, new, cnt)

# ---------- 1) refreshDb 真就绪判定 ----------
rep(
"""function refreshDb(){
    try { db = (window.__SMART_PAGE__ && window.__SMART_PAGE__.database) || null; ONLINE = !!db; }
    catch(e){ db = null; ONLINE = false; }
  }""",
"""function refreshDb(){
    /* v81: inject.js 的 __SMART_PAGE__ 是"永真代理"——外壳注入真实实现前 .database 也返回可调用对象,
     * 旧判定 ONLINE 恒为 true: 桥未就绪时云端调用排进 15 秒超时队列, 点击零反馈(=按不动),
     * 且 v54 桥就绪轮询因此从不生效。改用 __realImpls__.database 判真就绪(外壳注入实现必经 set 钩子写入 real);
     * 非平台环境无 __realImpls__ 字段, 回退旧判定, 兼容本地 mock。 */
    try {
      var _sp = window.__SMART_PAGE__;
      var _impls = _sp && _sp.__realImpls__;
      if (_impls) { db = _impls.database || null; }
      else { db = (_sp && _sp.database) || null; }
      ONLINE = !!db;
    }
    catch(e){ db = null; ONLINE = false; }
  }""")

# ---------- 2) snapshotManual 重写 ----------
rep(
"""function snapshotManual(){
    var snap = snapshotBuild();
    if(!snap || snapshotIsEmpty(snap)){ toast('当前没有可备份的数据'); return; }
    snapshotSaveLocal(snap);
    snapshotSaveCloud(snap, function(ok){
      toast(ok ? '已备份到本机和云端' : '已备份到本机，云端写入失败');
      renderSnapshotPanel();
    });
  }""",
"""var _snapManualBusy = false;
  function snapshotManual(){
    /* v81: 即时反馈(备份中…/disabled) + 25s 看门狗 + 全程 try/catch——
     * 任何一步抛错或云端挂起都不再是"按不动", 按钮状态一定会恢复。 */
    if(_snapManualBusy) return;
    var btn = document.getElementById('snapNowBtn');
    _snapManualBusy = true;
    if(btn){ btn.disabled = true; btn.textContent = '备份中…'; }
    var done = false;
    var watchdog = setTimeout(function(){
      finish(false, '云端响应超时，请稍后在备份列表确认结果');
    }, 25000);
    function finish(ok, msg){
      if(done) return;
      done = true;
      clearTimeout(watchdog);
      _snapManualBusy = false;
      if(btn){ btn.disabled = false; btn.textContent = '立即备份'; }
      toast(msg || (ok ? '已备份到本机和云端' : '已备份到本机，云端写入失败'));
      try{ renderSnapshotPanel(); }catch(e2){}
    }
    try{
      var snap = snapshotBuild();
      if(!snap || snapshotIsEmpty(snap)){ finish(true, '当前没有可备份的数据'); return; }
      snapshotSaveLocal(snap);
      snapshotSaveCloud(snap, function(ok){ finish(ok); });
    }catch(e){
      console.error('[snapshot] 立即备份异常', e);
      finish(false, '备份出错：' + (e && e.message || '未知错误'));
    }
  }""")

# ---------- 3) bindSnapshotPanel 委托兜底 ----------
rep(
"""function bindSnapshotPanel(){
    var now = document.getElementById('snapNowBtn');
    var ref = document.getElementById('snapRefreshBtn');
    if(now) now.addEventListener('click', function(){ snapshotManual(); });
    if(ref) ref.addEventListener('click', function(){ renderSnapshotPanel(); });
    try{ renderSnapshotPanel(); }catch(e){}
  }""",
"""function bindSnapshotPanel(){
    var now = document.getElementById('snapNowBtn');
    var ref = document.getElementById('snapRefreshBtn');
    if(now) now.addEventListener('click', function(){ snapshotManual(); });
    if(ref) ref.addEventListener('click', function(){ renderSnapshotPanel(); });
    /* v81: 委托兜底——直接绑定因任何原因丢失(面板重渲染/初始化中断)时按钮仍可点;
     * capture 阶段先于直绑触发, 用 _snapManualBusy 去重防止一次点击双跑备份。 */
    if(!window.__snapDelegateBound){
      window.__snapDelegateBound = true;
      document.addEventListener('click', function(ev){
        var t = ev.target;
        if(!t || !t.closest) return;
        if(t.closest('#snapNowBtn')){ ev.preventDefault(); snapshotManual(); }
        else if(t.closest('#snapRefreshBtn')){ ev.preventDefault(); try{ renderSnapshotPanel(); }catch(e){} }
      }, true);
    }
    try{ renderSnapshotPanel(); }catch(e){}
  }""")

# ---------- 4) init 绑定隔离 ----------
rep(
"""  startI18n();
  bindLockButton();
  bindSyncButton();
  bindHealthCheckButton();
  bindInvitePanel();
  bindSnapshotPanel();""",
"""  /* v81: 绑定逐个隔离——单个绑定抛错不再中断后续绑定
   * (此前若前面某个 bind 抛错, bindSnapshotPanel 被跳过, 备份按钮永远无响应)。 */
  [startI18n, bindLockButton, bindSyncButton, bindHealthCheckButton, bindInvitePanel, bindSnapshotPanel].forEach(function(fn){
    try{ fn(); }catch(e){ console.error('[init] 绑定失败: ' + (fn.name || 'anonymous'), e); }
  });""")

# ---------- 断言 ----------
assert s != orig
for m in ['__realImpls__.database', '_snapManualBusy', '__snapDelegateBound',
          '云端响应超时，请稍后在备份列表确认结果', '备份出错：', '[init] 绑定失败']:
    assert m in s, 'missing: ' + m
assert s.count('_snapManualBusy') >= 3
# 旧代码必须消失
assert 'db = (window.__SMART_PAGE__ && window.__SMART_PAGE__.database) || null; ONLINE = !!db;' not in s
assert "if(!snap || snapshotIsEmpty(snap)){ toast('当前没有可备份的数据'); return; }" not in s

io.open(P, 'w', encoding='utf-8').write(s)
print('v81 patch applied, len', len(s))
