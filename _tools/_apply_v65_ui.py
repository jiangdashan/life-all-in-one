# -*- coding: utf-8 -*-
"""v65：设置面板「数据备份」区块 + 触发点挂载 + 启动绑定 + 测试导出"""
import io

P = 'life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig = s
log = []
Q = chr(96)


def sub(old, new, label, expect=1):
    global s
    n = s.count(old)
    if n != expect:
        raise SystemExit('ANCHOR FAIL [%s] count=%d expect=%d\n--- old ---\n%s' % (label, n, expect, old[:300]))
    s = s.replace(old, new, expect)
    log.append('OK  %-30s (%d)' % (label, n))


# ---------- 1) HTML：inviteBox 之后插入备份区块 ----------
A1 = """        </div>
      </div>
    </section>
  </div>
  <div class="app-tip" id="appTip" hidden>"""
B1 = """        </div>
      </div>
      <div class="snap-box" id="snapBox">
        <div class="snap-head"><b>数据备份</b><small>每天首次同步后自动留一份快照，误清空时可按日期找回。</small></div>
        <small class="snap-state" id="snapState">正在读取备份…</small>
        <div class="snap-actions">
          <button class="btn ghost" id="snapNowBtn" type="button">立即备份</button>
          <button class="btn ghost" id="snapRefreshBtn" type="button">刷新列表</button>
        </div>
        <div class="snap-list" id="snapList"></div>
      </div>
    </section>
  </div>
  <div class="app-tip" id="appTip" hidden>"""
sub(A1, B1, 'HTML 数据备份区块')

# ---------- 2) CSS ----------
A2 = '.invite-box{border-top:1px solid var(--line);margin-top:14px;padding-top:14px;display:flex;flex-direction:column;gap:9px}'
B2 = ('.snap-box{border-top:1px solid var(--line);margin-top:14px;padding-top:14px;display:flex;flex-direction:column;gap:9px}\n'
      '  .snap-head b{font-size:13px;font-weight:600;color:var(--ink)}\n'
      '  .snap-head small{display:block;font-size:12px;color:var(--muted);line-height:1.6;margin-top:2px}\n'
      '  .snap-state{font-size:12px;color:var(--muted);line-height:1.6}\n'
      '  .snap-actions{display:flex;gap:8px;flex-wrap:wrap}\n'
      '  .snap-actions .btn{flex:none;padding:7px 12px;font-size:12.5px}\n'
      '  .snap-list{display:flex;flex-direction:column;gap:6px;margin-top:2px}\n'
      '  .snap-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border:1px solid var(--line);border-radius:9px;padding:8px 10px}\n'
      '  .snap-row-main{flex:1;min-width:120px}\n'
      '  .snap-row-date{font-size:12.5px;color:var(--ink)}\n'
      '  .snap-row-meta{font-size:11.5px;color:var(--muted);margin-top:1px}\n'
      '  .snap-row-btn{flex:none}\n'
      '  .snap-empty{font-size:12px;color:var(--muted)}\n'
      + A2)
sub(A2, B2, 'CSS 备份区块样式')

# ---------- 3) JS：面板渲染与交互，插在 snapshotLoad 之前 ----------
A3 = '  function snapshotLoad(date, cb){'
B3 = """  function _snapSizeText(n){
    var v = Number(n||0);
    if(v >= 1024*1024) return (v/1024/1024).toFixed(1) + ' MB';
    if(v >= 1024) return Math.round(v/1024) + ' KB';
    return v + ' B';
  }
  function _snapCountsText(c){
    var c = c || {};
    return (Number(c.records||0)) + ' 条记录 · ' + (Number(c.media||0)) + ' 个书影音 · ' + (Number(c.habitDays||0)) + ' 天打卡';
  }
  function renderSnapshotPanel(){
    var stEl = document.getElementById('snapState');
    var listEl = document.getElementById('snapList');
    if(!stEl || !listEl) return;
    listEl.innerHTML = '';
    if(!snapshotEnabled()){
      stEl.textContent = '自动备份已关闭。';
      return;
    }
    snapshotList(function(list){
      if(!list || !list.length){
        stEl.textContent = '还没有任何备份。首次同步成功后会自动生成第一份。';
        var e0 = document.createElement('div');
        e0.className = 'snap-empty';
        e0.textContent = '暂无快照';
        listEl.appendChild(e0);
        return;
      }
      stEl.textContent = '共 ' + list.length + ' 份快照，云端保留最近 ' + SNAP_CLOUD_DAYS + ' 天。';
      list.forEach(function(it){
        var row = document.createElement('div');
        row.className = 'snap-row';
        var main = document.createElement('div');
        main.className = 'snap-row-main';
        var d = document.createElement('div');
        d.className = 'snap-row-date';
        d.textContent = it.date + '　' + (it.src === 'local' ? '仅本机' : (it.src === 'cloud' ? '仅云端' : '本机 + 云端'));
        var m = document.createElement('div');
        m.className = 'snap-row-meta';
        m.textContent = _snapCountsText(it.counts) + ' · ' + _snapSizeText(it.size);
        main.appendChild(d); main.appendChild(m);
        var btn = document.createElement('button');
        btn.className = 'btn ghost snap-row-btn';
        btn.type = 'button';
        btn.textContent = '从此恢复';
        btn.setAttribute('data-snap-date', it.date);
        btn.addEventListener('click', function(){ snapshotRestoreDate(it.date); });
        row.appendChild(main); row.appendChild(btn);
        listEl.appendChild(row);
      });
    });
  }
  function snapshotRestoreDate(date){
    snapshotLoad(date, function(snap){
      if(!snap){ toast('这份备份读取失败，请稍后重试'); return; }
      var diff = restoreDiff(snap);
      if(!diff || !diff.total){
        toast('这份备份里的内容当前都在，无需恢复');
        return;
      }
      var msg = '将补回 ' + diff.records + ' 条记录、' + diff.media + ' 个书影音、' + diff.habitDays + ' 天习惯打卡。\\n'
        + '已有的数据不会被改动，设置项也不会变。\\n\\n确定从 ' + date + ' 的备份恢复吗？';
      var go = true;
      try{ if(window.confirm) go = !!window.confirm(msg); }catch(e){}
      if(!go) return;
      restoreApply(snap, function(added){
        if(added && (added.records || added.media || added.habitDays)){
          toast('已恢复 ' + (added.records + added.media + added.habitDays) + ' 项，正在同步到云端');
        } else {
          toast('没有需要恢复的内容');
        }
        renderSnapshotPanel();
      });
    });
  }
  function snapshotManual(){
    var snap = snapshotBuild();
    if(!snap || snapshotIsEmpty(snap)){ toast('当前没有可备份的数据'); return; }
    snapshotSaveLocal(snap);
    snapshotSaveCloud(snap, function(ok){
      toast(ok ? '已备份到本机和云端' : '已备份到本机，云端写入失败');
      renderSnapshotPanel();
    });
  }
  function bindSnapshotPanel(){
    var now = document.getElementById('snapNowBtn');
    var ref = document.getElementById('snapRefreshBtn');
    if(now) now.addEventListener('click', function(){ snapshotManual(); });
    if(ref) ref.addEventListener('click', function(){ renderSnapshotPanel(); });
    try{ renderSnapshotPanel(); }catch(e){}
  }
  function snapshotLoad(date, cb){"""
sub(A3, B3, 'JS 备份面板渲染')

# ---------- 4) 触发点：pullAllRemote 成功后 ----------
A4 = """    applySettingsSync(function(){ pullAllRemoteInner(cb); });
  }"""
B4 = """    applySettingsSync(function(){ pullAllRemoteInner(function(ok){
      try{ maybeDailySnapshot(ok); }catch(e){ console.warn('[snap] 生成快照异常', e); }
      if(cb) cb(ok);
    }); });
  }"""
sub(A4, B4, 'JS 同步后触发快照')

# ---------- 5) 启动绑定 ----------
A5 = '  bindInvitePanel();\n'
B5 = '  bindInvitePanel();\n  bindSnapshotPanel();\n'
sub(A5, B5, '启动绑定 bindSnapshotPanel')

# ---------- 6) __appTest 导出 ----------
A6 = 'bindInvitePanel:bindInvitePanel};'
B6 = ('bindInvitePanel:bindInvitePanel,SNAP_VERSION:SNAP_VERSION,SNAP_INDEX_KEY:SNAP_INDEX_KEY,'
      'SNAP_ITEM_PREFIX:SNAP_ITEM_PREFIX,SNAP_LOCAL_BUDGET:SNAP_LOCAL_BUDGET,SNAP_CLOUD_DAYS:SNAP_CLOUD_DAYS,'
      'SNAP_META_PREFIX:SNAP_META_PREFIX,snapshotBuild:snapshotBuild,snapshotIsEmpty:snapshotIsEmpty,'
      'snapshotSaveLocal:snapshotSaveLocal,snapshotSaveCloud:snapshotSaveCloud,snapshotRotateCloud:snapshotRotateCloud,'
      'maybeDailySnapshot:maybeDailySnapshot,snapshotList:snapshotList,snapshotLoad:snapshotLoad,'
      'restoreDiff:restoreDiff,restoreApply:restoreApply,renderSnapshotPanel:renderSnapshotPanel,'
      'snapshotManual:snapshotManual,bindSnapshotPanel:bindSnapshotPanel,snapshotMetaKey:snapshotMetaKey,'
      'snapshotEnabled:snapshotEnabled,_snapIndex:_snapIndex,_snapHasDate:_snapHasDate,'
      'writeMetaClearAt:writeMetaClearAt,readMetaClearAt:readMetaClearAt,DB_META:DB_META,META_CLEAR_KEY:META_CLEAR_KEY,'
      'refreshDb:refreshDb,ONLINE:function(){return ONLINE;}};')
sub(A6, B6, '__appTest 导出')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\n'.join(log))
print('文件 %d -> %d 字符' % (len(orig), len(s)))
