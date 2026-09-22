# -*- coding: utf-8 -*-
"""v82: 备份"云端响应超时"根因修复
1) 新增 dbFetchMetaFiltered——meta 表按键过滤读取(filter)，不再全量拉 30 天快照行
2) 快照云端分片存储(SNAP_CHUNK_CHARS=120000)，兼容旧单行格式
3) snapshotManual 看门狗 25s→60s，超时转后台不判死；按钮显示快照体积
4) snapshotLoad/snapshotList/snapshotRotateCloud 适配分片与过滤读取
先校验全部锚点唯一，任一失败则不写盘。"""
import io, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

reps = []

# ---------- A. 插入 dbFetchMetaFiltered（挂在 dbFetchAll 之后、写入注释之前） ----------
anchor_A = "  /* v32: 写入时自动注入 userId（如 props 里没有），保证云端每条记录都能归属到当前用户 */"
insert_A = """  /* v82: 按键过滤读取 meta 表。备份快照行单行可达十几万字符，
   * 旧版 snapshotSaveCloud/snapshotLoad/snapshotList/snapshotRotateCloud 直接全量拉 meta，
   * 快照行一多，一次读取就是数 MB，经桥接传输可拖过 25 秒（"云端响应超时"的根因之一）。
   * 平台 db.query 支持 filter；若外壳不支持(报错/被忽略/翻页未尽)则回退全量扫描，行为不劣于旧版。 */
  function dbFetchMetaFiltered(q, cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(null); return; }
    var opts = { databaseId: DB_META, pageSize: 200 };
    opts.filter = q.exact
      ? { property: { property: "\\u952e", text: { equals: q.exact } } }
      : { property: { property: "\\u952e", text: { contains: q.prefix } } };
    dbQueryThrottled(opts).then(function(result){
      if (result && (result.__error || result.code || result.hasMore)) { dbFetchAll(DB_META, cb); return; }
      var rows = (result && result.results) || [];
      var uid = state_auth.userId;
      if(!uid){ if(cb) cb(null); return; }
      cb(rows.filter(function(r){ return _authGetRowUserId(r) === uid; }));
    }).catch(function(){ dbFetchAll(DB_META, cb); });
  }

"""
reps.append((anchor_A, insert_A + anchor_A))

# ---------- B. snapshotSaveCloud 重写（分片） ----------
old_B = """  function snapshotSaveCloud(snap, cb){
    if(!ONLINE || LOCAL_ONLY){ if(cb) cb(false); return; }
    var val = '';
    try{ val = JSON.stringify(snap); }catch(e){ if(cb) cb(false); return; }
    var props = { "键": { text: snapshotMetaKey(snap.date) }, "值": { text: val } };
    dbFetchAll(DB_META, function(rows){
      var existingId = null, dupIds = [];
      var key = snapshotMetaKey(snap.date);
      if(rows) rows.forEach(function(r){
        if(String(r["键"]||"") === key){ if(existingId) dupIds.push(r._id); else existingId = r._id; }
      });
      dupIds.forEach(function(rid){ dbDelete(DB_META, rid); });
      if(existingId){
        /* v80: 更新失败不再谎报成功——回退删除重建，仍失败则如实回报 */
        dbUpdate(DB_META, existingId, props, function(upd){
          if(upd){ if(cb) cb(true); return; }
          dbDelete(DB_META, existingId);
          dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); });
        });
      }
      else dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); });
    });
  }"""
new_B = """  /* v82: 云端快照分片存储——meta 单格实测 15 万字符安全，超过 SNAP_CHUNK_CHARS 的快照
   * 拆成 backup:<date>#1..N 分片行 + backup:<date> 清单行(vv:2)。短快照格式与旧版完全一致。 */
  var SNAP_CHUNK_CHARS = 120000;
  function _snapValParts(val){
    if(val.length <= SNAP_CHUNK_CHARS) return null;
    var parts = [];
    for(var i = 0; i < val.length; i += SNAP_CHUNK_CHARS) parts.push(val.slice(i, i + SNAP_CHUNK_CHARS));
    return parts;
  }
  function snapshotSaveCloud(snap, cb){
    if(!ONLINE || LOCAL_ONLY){ if(cb) cb(false); return; }
    var val = '';
    try{ val = JSON.stringify(snap); }catch(e){ if(cb) cb(false); return; }
    var parts = _snapValParts(val);
    var key = snapshotMetaKey(snap.date);
    var props = parts
      ? { "键": { text: key }, "值": { text: JSON.stringify({ vv: 2, at: snap.at, counts: snap.counts, chunks: parts.length, size: val.length }) } }
      : { "键": { text: key }, "值": { text: val } };
    dbFetchMetaFiltered({ prefix: key }, function(rows){
      var manifestId = null, staleIds = [];
      (rows || []).forEach(function(r){
        var k = String(r["键"]||"");
        if(k === key){ if(manifestId) staleIds.push(r._id); else manifestId = r._id; }
        else if(k.indexOf(key + '#') === 0) staleIds.push(r._id);
      });
      staleIds.forEach(function(rid){ dbDelete(DB_META, rid); });
      function writeChunks(i){
        if(!parts || i >= parts.length){ if(cb) cb(true); return; }
        dbAdd(DB_META, { "键": { text: key + '#' + (i + 1) }, "值": { text: parts[i] } }, function(rid){
          if(!rid){ if(cb) cb(false); return; }
          writeChunks(i + 1);
        });
      }
      if(manifestId){
        /* v80: 更新失败不再谎报成功——回退删除重建，仍失败则如实回报 */
        dbUpdate(DB_META, manifestId, props, function(upd){
          if(upd){ writeChunks(0); return; }
          dbDelete(DB_META, manifestId);
          dbAdd(DB_META, props, function(rid){ if(!rid){ if(cb) cb(false); return; } writeChunks(0); });
        });
      }
      else dbAdd(DB_META, props, function(rid){ if(!rid){ if(cb) cb(false); return; } writeChunks(0); });
    });
  }"""
reps.append((old_B, new_B))

# ---------- C. snapshotRotateCloud 重写（过滤读取 + 按日期整组清理） ----------
old_C = """  function snapshotRotateCloud(cb){
    if(!ONLINE || LOCAL_ONLY){ if(cb) cb(0); return; }
    dbFetchAll(DB_META, function(rows){
      var mine = [];
      if(rows) rows.forEach(function(r){
        var k = String(r["键"]||"");
        if(k.indexOf(SNAP_META_PREFIX) !== 0) return;
        mine.push({ _id: r._id, key: k });
      });
      if(mine.length <= SNAP_CLOUD_DAYS){ if(cb) cb(0); return; }
      mine.sort(function(a,b){ return String(a.key) < String(b.key) ? -1 : 1; });
      var drops = mine.slice(0, mine.length - SNAP_CLOUD_DAYS);
      drops.forEach(function(x){ dbDelete(DB_META, x._id); });
      if(cb) cb(drops.length);
    });
  }"""
new_C = """  function snapshotRotateCloud(cb){
    if(!ONLINE || LOCAL_ONLY){ if(cb) cb(0); return; }
    /* v82: 改按键前缀过滤读取 + 按日期整组清理（含分片行），不再全量拉 meta */
    dbFetchMetaFiltered({ prefix: SNAP_META_PREFIX }, function(rows){
      var byDate = {};
      (rows || []).forEach(function(r){
        var k = String(r["键"]||"");
        if(k.indexOf(SNAP_META_PREFIX) !== 0) return;
        var date = k.slice(SNAP_META_PREFIX.length).split('#')[0];
        if(!byDate[date]) byDate[date] = [];
        byDate[date].push(r._id);
      });
      var dates = Object.keys(byDate);
      if(dates.length <= SNAP_CLOUD_DAYS){ if(cb) cb(0); return; }
      dates.sort();
      var drops = dates.slice(0, dates.length - SNAP_CLOUD_DAYS);
      var n = 0;
      drops.forEach(function(d){ byDate[d].forEach(function(rid){ dbDelete(DB_META, rid); n++; }); });
      if(cb) cb(drops.length);
    });
  }"""
reps.append((old_C, new_C))

# ---------- D. snapshotList 适配（过滤读取 + 分片感知） ----------
old_D = """    dbFetchAll(DB_META, function(rows){
      if(rows) rows.forEach(function(r){
        var k = String(r["键"]||"");
        if(k.indexOf(SNAP_META_PREFIX) !== 0) return;
        var date = k.slice(SNAP_META_PREFIX.length);
        var snap = null;
        try{ snap = JSON.parse(String(r["值"]||"")); }catch(e){}
        if(map[date]) map[date].src = 'both';
        else map[date] = {
          date: date,
          at: (snap && snap.at) || 0,
          counts: (snap && snap.counts) || {},
          size: String(r["值"]||'').length,
          src: 'cloud'
        };
      });"""
new_D = """    dbFetchMetaFiltered({ prefix: SNAP_META_PREFIX }, function(rows){
      if(rows) rows.forEach(function(r){
        var k = String(r["键"]||"");
        if(k.indexOf(SNAP_META_PREFIX) !== 0) return;
        if(k.indexOf('#') !== -1) return; /* v82: 分片行随清单行展示，不单列 */
        var date = k.slice(SNAP_META_PREFIX.length);
        var raw = String(r["值"]||"");
        var snap = null;
        try{ snap = JSON.parse(raw); }catch(e){}
        var at = 0, counts = {}, size = raw.length;
        if(snap && snap.vv === 2){ at = Number(snap.at)||0; counts = snap.counts || {}; size = Number(snap.size)||raw.length; }
        else if(snap){ at = Number(snap.at)||0; counts = snap.counts || {}; }
        if(map[date]) map[date].src = 'both';
        else map[date] = {
          date: date,
          at: at,
          counts: counts,
          size: size,
          src: 'cloud'
        };
      });"""
reps.append((old_D, new_D))

# ---------- E. snapshotManual 重写（60s 看门狗 + 转后台 + 体积显示） ----------
old_E = """  var _snapManualBusy = false;
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
  }"""
new_E = """  var _snapManualBusy = false;
  function snapshotManual(){
    /* v81: 即时反馈(备份中…/disabled) + 看门狗 + 全程 try/catch——
     * 任何一步抛错或云端挂起都不再是"按不动", 按钮状态一定会恢复。
     * v82: 看门狗 25s→60s，超时不再判死——大快照经桥接写入实测可超 25 秒，
     * 转后台继续等回调，完成后仍会补提示；按钮显示快照体积便于判断负载。 */
    if(_snapManualBusy) return;
    var btn = document.getElementById('snapNowBtn');
    _snapManualBusy = true;
    var done = false, bgMode = false;
    var watchdog = setTimeout(function(){
      bgMode = true;
      if(btn){ btn.textContent = '备份中(已转后台)…'; }
      toast('云端写入较慢，已转后台继续，完成后会再提示');
    }, 60000);
    function finish(ok, msg){
      if(done) return;
      done = true;
      clearTimeout(watchdog);
      _snapManualBusy = false;
      if(btn){ btn.disabled = false; btn.textContent = '立即备份'; }
      if(bgMode && ok) toast('后台备份已完成：已备份到本机和云端');
      else toast(msg || (ok ? '已备份到本机和云端' : '已备份到本机，云端写入失败'));
      try{ renderSnapshotPanel(); }catch(e2){}
    }
    try{
      var snap = snapshotBuild();
      if(!snap || snapshotIsEmpty(snap)){ finish(true, '当前没有可备份的数据'); return; }
      if(btn){
        btn.disabled = true; btn.textContent = '备份中…';
        var _v = ''; try{ _v = JSON.stringify(snap); }catch(e0){}
        var _kb = Math.round(_v.length / 1024);
        if(_kb >= 100) btn.textContent = '备份中(' + (_kb >= 1024 ? (_kb/1024).toFixed(1) + 'MB' : _kb + 'KB') + ')…';
      }
      var _t0 = Date.now();
      snapshotSaveLocal(snap);
      snapshotSaveCloud(snap, function(ok){
        console.warn('[snapshot] 云端备份总耗时', (Date.now() - _t0) + 'ms', ok ? 'OK' : 'FAIL');
        finish(ok);
      });
    }catch(e){
      console.error('[snapshot] 立即备份异常', e);
      finish(false, '备份出错：' + (e && e.message || '未知错误'));
    }
  }"""
reps.append((old_E, new_E))

# ---------- F. snapshotLoad 适配（过滤读取 + 分片拼装） ----------
old_F = """  function snapshotLoad(date, cb){
    var local = _snapLocalRead(date);
    if(local){ cb(local); return; }
    if(!ONLINE || LOCAL_ONLY){ cb(null); return; }
    dbFetchAll(DB_META, function(rows){
      var hit = null;
      if(rows) rows.forEach(function(r){
        if(String(r["键"]||"") !== snapshotMetaKey(date)) return;
        try{ hit = JSON.parse(String(r["值"]||"")); }catch(e){}
      });
      cb(hit);
    });
  }"""
new_F = """  function snapshotLoad(date, cb){
    var local = _snapLocalRead(date);
    if(local){ cb(local); return; }
    if(!ONLINE || LOCAL_ONLY){ cb(null); return; }
    var key = snapshotMetaKey(date);
    dbFetchMetaFiltered({ exact: key }, function(rows){
      var hit = null;
      (rows || []).forEach(function(r){
        if(String(r["键"]||"") !== key) return;
        try{ hit = JSON.parse(String(r["值"]||"")); }catch(e){}
      });
      if(hit && hit.vv === 2 && Number(hit.chunks) > 0){
        /* v82: 分片快照——按 #序号取齐再拼接 */
        dbFetchMetaFiltered({ prefix: key + '#' }, function(crows){
          var segs = [];
          (crows || []).forEach(function(r){
            var k = String(r["键"]||"");
            if(k.indexOf(key + '#') !== 0) return;
            var idx = parseInt(k.slice(key.length + 1), 10);
            if(idx >= 1 && idx <= Number(hit.chunks)) segs[idx - 1] = String(r["值"]||"");
          });
          var full = null;
          if(segs.length === Number(hit.chunks) && segs.every(function(s){ return typeof s === 'string'; })){
            try{ full = JSON.parse(segs.join('')); }catch(e){}
          }
          cb(full);
        });
        return;
      }
      cb(hit);
    });
  }"""
reps.append((old_F, new_F))

# ---------- 校验锚点唯一性 ----------
errs = []
for i, (o, n) in enumerate(reps):
    c = src.count(o)
    if c != 1:
        errs.append("rep #%d anchor count=%d" % (i, c))
if errs:
    print("ANCHOR FAIL:", "; ".join(errs))
    sys.exit(1)

out = src
for o, n in reps:
    out = out.replace(o, n, 1)

with io.open(PATH, "w", encoding="utf-8", newline="") as f:
    f.write(out)

# ---------- 落盘断言 ----------
with io.open(PATH, "r", encoding="utf-8") as f:
    chk = f.read()
musts = [
    "function dbFetchMetaFiltered",
    "var SNAP_CHUNK_CHARS = 120000;",
    "vv: 2, at: snap.at, counts: snap.counts, chunks: parts.length",
    "已转后台继续，完成后会再提示",
    "dbUpdate(DB_META, manifestId, props, function(upd){",
    "后台备份已完成：已备份到本机和云端",
    "if(k.indexOf('#') !== -1) return;",
]
misses = [m for m in musts if m not in chk]
gone = [g for g in ["云端响应超时，请稍后在备份列表确认结果", "dbUpdate(DB_META, existingId, props, function(upd){"] if g in chk]
if misses or gone:
    print("ASSERT FAIL missing=%s notgone=%s" % (misses, gone))
    sys.exit(1)
print("OK v82 applied, length=%d" % len(chk))
