# -*- coding: utf-8 -*-
"""v65 数据快照与恢复：核心函数（构建 / 本机 / 云端 / 旋转 / 触发）"""
import io, sys

P = 'life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig = s
log = []

Q = chr(96)


def sub(old, new, label, expect=1):
    global s
    n = s.count(old)
    if n != expect:
        raise SystemExit('ANCHOR FAIL [%s] count=%d expect=%d\n--- old ---\n%s' % (label, n, expect, old[:400]))
    s = s.replace(old, new, expect)
    log.append('OK  %-30s (%d)' % (label, n))


# ---------- 1) JS 核心：插在 writeMetaClearAt 之后 ----------
A1 = """      else { dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); }); }
    });
  }

  /* ===== 习惯定义 + 应用设置同步 ====="""
B1 = """      else { dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); }); }
    });
  }

""" + Q*3 + """ v65 每日数据快照 ============================================
   * 背景：「清空全部数据」会同时删本地状态与 13 张云端业务表，且会写一行清空时间戳墓碑，
   * 任何设备同步到它都会把早于该时刻的记录过滤掉。所以需要一份清空操作碰不到的备份。
   *
   * 存放位置的设计依据（已线上实测）：
   *   1. clearAllRemoteTables 的 DB_LIST 里没有 DB_META —— 清空根本不删 meta 表，
   *      所以云端快照放 meta 表是安全的。
   *   2. meta 表单格 text 实测可写入 15 万字符并原样读回（探针已验证并已清理），
   *      不需要分片。
   *   3. 本机快照放独立的缓存键，清空只动 state 那一个键，碰不到这里。
   *
   * 三条防误伤规则：
   *   - 同一天已有快照则绝不覆盖（否则「清空后当天再打开」会把空状态写成当天快照）
   *   - 空快照不写
   *   - 恢复走合并补齐，不覆盖本地现有数据，也不碰设置项（避免回滚主题/开关/PIN）
   *
   * 恢复后必须把清空墓碑归零（本地 state.lastClearedAt + 云端 meta），
   * 否则刚恢复的数据会在下次同步时被 applyRemoteClear 再过滤掉一遍。
   * ====================================================================== */ """ + Q*3 + """
  var SNAP_VERSION = 1;
  var SNAP_INDEX_KEY = 'richangji-snap-index-v1';
  var SNAP_ITEM_PREFIX = 'richangji-snap-';
  var SNAP_LOCAL_BUDGET = 2 * 1024 * 1024;
  var SNAP_CLOUD_DAYS = 30;
  var SNAP_META_PREFIX = 'backup:';
  var SNAP_LAST_RUN_KEY = 'richangji-snap-lastrun-v1';
  var _snapBusy = false;

  function _snapItemKey(date){ return SNAP_ITEM_PREFIX + String(date); }
  function _snapIndex(){
    try{
      var raw = localStorage.getItem(SNAP_INDEX_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    }catch(e){ return []; }
  }
  function _snapWriteIndex(list){
    try{ localStorage.setItem(SNAP_INDEX_KEY, JSON.stringify(list)); return true; }
    catch(e){ return false; }
  }
  function _snapHasDate(date){
    return _snapIndex().filter(function(x){ return x && x.date === date; }).length > 0;
  }
  function _snapLocalRead(date){
    try{
      var raw = localStorage.getItem(_snapItemKey(date));
      return raw ? JSON.parse(raw) : null;
    }catch(e){ return null; }
  }
  function snapshotBuild(){
    try{
      var habitDays = 0;
      (state.habits||[]).forEach(function(h){ habitDays += Object.keys((h && h.entries) || {}).length; });
      return {
        v: SNAP_VERSION,
        at: Date.now(),
        date: isoDate(),
        counts: {
          records: (state.records||[]).length,
          media: (state.mediaItems||[]).length,
          habitDays: habitDays
        },
        records: JSON.parse(JSON.stringify(state.records||[])),
        mediaItems: JSON.parse(JSON.stringify(state.mediaItems||[])),
        habits: JSON.parse(JSON.stringify(state.habits||[]))
      };
    }catch(e){ return null; }
  }
  function snapshotIsEmpty(snap){
    if(!snap || !snap.counts) return true;
    var c = snap.counts;
    if(Number(c.records||0) > 0) return false;
    if(Number(c.media||0) > 0) return false;
    if(Number(c.habitDays||0) > 0) return false;
    return true;
  }
  function snapshotSaveLocal(snap){
    var json = '';
    try{ json = JSON.stringify(snap); }catch(e){ return false; }
    if(!json) return false;
    try{ localStorage.setItem(_snapItemKey(snap.date), json); }
    catch(e){
      /* 配额不足：先裁掉一半最老的再试一次，仍失败就放弃本机这一份（云端那份照写） */
      try{
        var idx0 = _snapIndex().slice().sort(function(a,b){ return String(a.date) < String(b.date) ? -1 : 1; });
        var half = Math.max(1, Math.floor(idx0.length / 2));
        for(var q=0;q<half;q++){ try{ localStorage.removeItem(_snapItemKey(idx0[q].date)); }catch(e2){} }
        _snapWriteIndex(idx0.slice(half));
      }catch(e3){}
      try{ localStorage.setItem(_snapItemKey(snap.date), json); }
      catch(e4){ return false; }
    }
    var idx = _snapIndex().filter(function(x){ return x && x.date !== snap.date; });
    idx.push({ date: snap.date, at: snap.at, size: json.length, counts: snap.counts });
    idx.sort(function(a,b){ return String(a.date) < String(b.date) ? 1 : -1; });
    var total = 0;
    idx.forEach(function(x){ total += Number(x.size||0); });
    while(idx.length > 1 && total > SNAP_LOCAL_BUDGET){
      var oldest = idx[idx.length - 1];
      try{ localStorage.removeItem(_snapItemKey(oldest.date)); }catch(e5){}
      total -= Number(oldest.size||0);
      idx.pop();
    }
    return _snapWriteIndex(idx);
  }
  function snapshotMetaKey(date){ return SNAP_META_PREFIX + String(date); }
  function snapshotSaveCloud(snap, cb){
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
      if(existingId){ dbUpdate(DB_META, existingId, props); if(cb) cb(true); }
      else dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); });
    });
  }
  function snapshotRotateCloud(cb){
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
  }
  function snapshotEnabled(){
    try{ return state.settings.autoBackup !== false; }catch(e){ return true; }
  }
  /* 每次云端同步成功后调用：当天尚无快照才生成，空快照不写。 */
  function maybeDailySnapshot(syncOk){
    if(!syncOk) return;
    if(!snapshotEnabled()) return;
    if(!state_auth || !state_auth.unlocked) return;
    if(_snapBusy) return;
    var today = isoDate();
    if(_snapHasDate(today)) return;
    var snap = snapshotBuild();
    if(!snap || snapshotIsEmpty(snap)) return;
    _snapBusy = true;
    snapshotSaveLocal(snap);
    snapshotSaveCloud(snap, function(ok){
      if(ok){
        try{ localStorage.setItem(SNAP_LAST_RUN_KEY, String(snap.at)); }catch(e){}
        snapshotRotateCloud(function(){
          _snapBusy = false;
          if(typeof renderSnapshotPanel === 'function') renderSnapshotPanel();
        });
      } else {
        _snapBusy = false;
      }
    });
  }
  function snapshotList(cb){
    var map = {};
    _snapIndex().forEach(function(x){
      if(!x || !x.date) return;
      map[x.date] = { date: x.date, at: x.at || 0, counts: x.counts || {}, size: x.size || 0, src: 'local' };
    });
    if(!ONLINE || LOCAL_ONLY){
      cb(Object.keys(map).map(function(k){ return map[k]; }).sort(function(a,b){ return String(a.date) < String(b.date) ? 1 : -1; }));
      return;
    }
    dbFetchAll(DB_META, function(rows){
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
      });
      cb(Object.keys(map).map(function(k){ return map[k]; }).sort(function(a,b){ return String(a.date) < String(b.date) ? 1 : -1; }));
    });
  }
  function snapshotLoad(date, cb){
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
  }

  /* ===== 习惯定义 + 应用设置同步 ====="""
sub(A1, B1, 'JS 快照核心函数')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\n'.join(log))
print('文件 %d -> %d 字符' % (len(orig), len(s)))
