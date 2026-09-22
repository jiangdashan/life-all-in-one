# -*- coding: utf-8 -*-
"""v65：预览式合并恢复 + 墓碑铲除（本地 + 云端）"""
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


A1 = """  function snapshotLoad(date, cb){"""
B1 = """  /* 预览：这份快照相对当前数据能补回多少。只做计算，绝不改动 state。 */
  function restoreDiff(snap){
    if(!snap) return null;
    var seenR = {};
    (state.records||[]).forEach(function(r){ if(r && r.id) seenR[r.id] = 1; });
    var addRecords = (snap.records||[]).filter(function(r){ return r && r.id && !seenR[r.id]; }).length;
    var seenM = {};
    (state.mediaItems||[]).forEach(function(m){ if(m && m.id) seenM[m.id] = 1; });
    var addMedia = (snap.mediaItems||[]).filter(function(m){ return m && m.id && !seenM[m.id]; }).length;
    var addHabitDays = 0;
    (snap.habits||[]).forEach(function(sh){
      if(!sh) return;
      var target = null;
      (state.habits||[]).forEach(function(h){ if(!target && h && (h.id === sh.id || h.name === sh.name)) target = h; });
      if(!target) return;
      Object.keys(sh.entries||{}).forEach(function(d){
        if(target.entries[d] === undefined && Number(sh.entries[d])) addHabitDays++;
      });
    });
    return {
      records: addRecords,
      media: addMedia,
      habitDays: addHabitDays,
      total: addRecords + addMedia + addHabitDays,
      snapCounts: snap.counts || {}
    };
  }
  /* 执行恢复：按 id 只补缺失，不覆盖任何现有数据，也不动设置项。
   * 关键：必须同时把清空墓碑归零，否则下一次同步会被 applyRemoteClear 再清一遍。 */
  function restoreApply(snap, cb){
    if(!snap) { if(cb) cb(null); return; }
    var added = { records: 0, media: 0, habitDays: 0 };
    var seenR = {};
    (state.records||[]).forEach(function(r){ if(r && r.id) seenR[r.id] = 1; });
    (snap.records||[]).forEach(function(r){
      if(!r || !r.id || seenR[r.id]) return;
      var copy = JSON.parse(JSON.stringify(r));
      delete copy.remoteId;      /* 清掉远端 id，让 syncPendingRecords 自动补传回云端 */
      copy.syncTriedAt = 0;
      state.records.push(copy);
      seenR[copy.id] = 1;
      added.records++;
    });
    var seenM = {};
    (state.mediaItems||[]).forEach(function(m){ if(m && m.id) seenM[m.id] = 1; });
    (snap.mediaItems||[]).forEach(function(m){
      if(!m || !m.id || seenM[m.id]) return;
      var copy = JSON.parse(JSON.stringify(m));
      delete copy.remoteId;
      copy.syncTriedAt = 0;
      state.mediaItems.push(copy);
      seenM[copy.id] = 1;
      added.media++;
    });
    (snap.habits||[]).forEach(function(sh){
      if(!sh) return;
      var target = null;
      (state.habits||[]).forEach(function(h){ if(!target && h && (h.id === sh.id || h.name === sh.name)) target = h; });
      if(!target) return;              /* 不恢复已删除的习惯定义，只回填它的打卡数据 */
      if(!target.entries) target.entries = {};
      Object.keys(sh.entries||{}).forEach(function(d){
        if(target.entries[d] === undefined && Number(sh.entries[d])){
          target.entries[d] = sh.entries[d];
          added.habitDays++;
        }
      });
    });
    /* 铲墓碑：本地标记 + 云端 meta 那一行都要归零 */
    state.lastClearedAt = 0;
    state.clearedAll = false;
    saveState();
    renderAll();
    writeMetaClearAt(0, function(){
      if(typeof syncPendingRecords === 'function'){
        syncPendingRecords(function(){ if(cb) cb(added); });
      } else if(cb) cb(added);
    });
  }
  function snapshotLoad(date, cb){"""
sub(A1, B1, 'JS 恢复预览与合并')

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('\n'.join(log))
print('文件 %d -> %d 字符' % (len(orig), len(s)))
