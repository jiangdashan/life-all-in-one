# -*- coding: utf-8 -*-
"""v83b: 三处收敛
1) dbFetchMetaFiltered 弃用 filter——实测 meta 表仅 26 行/660KB，全量扫描足够快且路径稳定；
   filter 在外壳上有悬挂/报错风险(每次悬挂拖慢串行队列 20s)。
2) snapshotSaveCloud 写入串行锁 _snapCloudBusy——自动每日备份与手动备份并发时，
   双方后置清理会互删对方刚写的行(实测 B 场景备份行消失)。
3) cleanupStale 改为只删 at 比自己旧的行(绝不误删并发的更新备份)；
   snapshotManual 遇锁占用时温和提示。"""
import io, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

reps = []

# ---------- A. dbFetchMetaFiltered 弃用 filter ----------
old_A = """  function dbFetchMetaFiltered(q, cb){
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
  }"""
new_A = """  function dbFetchMetaFiltered(q, cb){
    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(null); return; }
    /* v83b: 实测 meta 表仅数十行/数百 KB，全量扫描足够快且是各模块天天在走的稳定路径；
     * filter 参数在外壳上存在悬挂/报错风险(虽有 20s 硬超时兜底，但每次悬挂都拖慢串行队列 20s)，
     * 弃用之，统一走 dbFetchAll，由各调用方按键过滤。 */
    dbFetchAll(DB_META, cb);
  }"""
reps.append((old_A, new_A))

# ---------- B. snapshotSaveCloud：串行锁 + 清理只删更旧 ----------
old_B = """  function snapshotSaveCloud(snap, cb){
    if(!ONLINE || LOCAL_ONLY){ if(cb) cb(false); return; }
    var val = '';
    try{ val = JSON.stringify(snap); }catch(e){ if(cb) cb(false); return; }
    var parts = _snapValParts(val);
    var key = snapshotMetaKey(snap.date);
    var manifestVal = parts
      ? JSON.stringify({ vv: 2, at: snap.at, counts: snap.counts, chunks: parts.length, size: val.length })
      : val;
    /* v83: 关键路径只走 dbAdd(与每日首备同路径、实测稳定)；旧行清理后置异步执行，
     * 不再前置查询——此前"查到旧行就 dbUpdate"的更新路径一旦悬挂，整个备份就卡死转后台。 */
    var chunkIds = [];
    function cleanupStale(manifestRid){
      dbFetchMetaFiltered({ prefix: key }, function(rows){
        (rows || []).forEach(function(r){
          var k = String(r["键"]||"");
          var isStale = (k === key && r._id !== manifestRid) || (k.indexOf(key + '#') === 0 && chunkIds.indexOf(r._id) === -1);
          if(isStale) dbDelete(DB_META, r._id);
        });
      });
    }
    function writeChunks(i, done){
      if(i >= parts.length){ if(done) done(); return; }
      dbAdd(DB_META, { "键": { text: key + '#' + (i + 1) }, "值": { text: parts[i] } }, function(rid){
        if(!rid){ if(cb) cb(false); return; }
        chunkIds.push(rid);
        writeChunks(i + 1, done);
      });
    }
    dbAdd(DB_META, { "键": { text: key }, "值": { text: manifestVal } }, function(rid){
      if(!rid){ if(cb) cb(false); return; }
      if(!parts){ cleanupStale(rid); if(cb) cb(true); return; }
      writeChunks(0, function(){ cleanupStale(rid); if(cb) cb(true); });
    });
  }"""
new_B = """  var _snapCloudBusy = false;
  function snapshotSaveCloud(snap, cb){
    if(!ONLINE || LOCAL_ONLY){ if(cb) cb(false); return; }
    /* v83b: 写入串行锁——自动每日备份与手动备份并发时，双方的后置清理会互删对方刚写的行 */
    if(_snapCloudBusy){ console.warn('[snapshot] 已有备份在写入，跳过本次'); if(cb) cb(false); return; }
    _snapCloudBusy = true;
    function done(ok){ _snapCloudBusy = false; if(cb) cb(ok); }
    var val = '';
    try{ val = JSON.stringify(snap); }catch(e){ done(false); return; }
    var parts = _snapValParts(val);
    var key = snapshotMetaKey(snap.date);
    var manifestVal = parts
      ? JSON.stringify({ vv: 2, at: snap.at, counts: snap.counts, chunks: parts.length, size: val.length })
      : val;
    /* v83: 关键路径只走 dbAdd(与每日首备同路径、实测稳定)；旧行清理后置异步执行，
     * 不再前置查询——此前"查到旧行就 dbUpdate"的更新路径一旦悬挂，整个备份就卡死转后台。 */
    var chunkIds = [];
    function cleanupStale(manifestRid, myAt){
      dbFetchMetaFiltered({ prefix: key }, function(rows){
        (rows || []).forEach(function(r){
          var k = String(r["键"]||"");
          var isStale = false;
          if(k === key && r._id !== manifestRid){
            var obj = null; try{ obj = JSON.parse(String(r["值"]||"")); }catch(e){}
            isStale = ((obj && Number(obj.at)) || 0) < myAt;   /* v83b: 只删比我旧的，绝不误删并发的更新备份 */
          } else if(k.indexOf(key + '#') === 0 && chunkIds.indexOf(r._id) === -1){
            isStale = true;   /* 非本次分片(写入已串行，只可能来自当日更早的备份) */
          }
          if(isStale) dbDelete(DB_META, r._id);
        });
      });
    }
    function writeChunks(i, finished){
      if(i >= parts.length){ if(finished) finished(); return; }
      dbAdd(DB_META, { "键": { text: key + '#' + (i + 1) }, "值": { text: parts[i] } }, function(rid){
        if(!rid){ done(false); return; }
        chunkIds.push(rid);
        writeChunks(i + 1, finished);
      });
    }
    dbAdd(DB_META, { "键": { text: key }, "值": { text: manifestVal } }, function(rid){
      if(!rid){ done(false); return; }
      if(!parts){ cleanupStale(rid, snap.at); done(true); return; }
      writeChunks(0, function(){ cleanupStale(rid, snap.at); done(true); });
    });
  }"""
reps.append((old_B, new_B))

# ---------- C. snapshotManual：锁占用温和提示 ----------
old_C = """    if(_snapManualBusy) return;
    var btn = document.getElementById('snapNowBtn');
    _snapManualBusy = true;"""
new_C = """    if(_snapManualBusy) return;
    if(_snapCloudBusy){ toast('刚触发过一次备份，正在写入，请稍候几秒再试'); return; }
    var btn = document.getElementById('snapNowBtn');
    _snapManualBusy = true;"""
reps.append((old_C, new_C))

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

with io.open(PATH, "r", encoding="utf-8") as f:
    chk = f.read()
musts = [
    "v83b: 实测 meta 表仅数十行/数百 KB",
    "var _snapCloudBusy = false;",
    "只删比我旧的，绝不误删并发的更新备份",
    "刚触发过一次备份，正在写入",
]
misses = [m for m in musts if m not in chk]
if misses:
    print("ASSERT FAIL missing=%s" % misses)
    sys.exit(1)
print("OK v83b applied, length=%d" % len(chk))
