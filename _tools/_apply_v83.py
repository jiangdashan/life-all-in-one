# -*- coding: utf-8 -*-
"""v83: 备份转后台后一直无提示的修复
实测云端 meta 表仅 26 行 / 660KB(5 天备份，单份 12.5-13.4 万字符)——"历史备份太多"不成立。
真正根因：①v82 给 db.query 加 filter 参数后，外壳可能抛错/永不返回，把串行查询队列永久卡死；
②当天已有备份时走 dbUpdate(大值更新)路径，更新悬挂则整个备份卡死。
修复：①dbQueryThrottled 每次调用 20s 硬超时 + 同步异常兜底(队列永不卡死)；
②dbAdd/dbUpdate 30s 硬超时如实回报失败；③备份关键路径只走 dbAdd(每日首备同路径实测稳定)，
旧行清理后置(成功后异步删)；④snapshotLoad 同键多行取 at 最新。
先校验全部锚点唯一，任一失败则不写盘。"""
import io, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

reps = []

# ---------- A. dbQueryThrottled：硬超时 + 同步异常兜底 ----------
old_A = """      return new Promise(function(resolve){
        setTimeout(function(){
          _dbQueryLastAt = Date.now();
          db.query(opts).then(function(r){
            if (r && r.code === 50001) {
              if (attempt < 5) { console.warn('[database] 限流50001，退避重试(' + (attempt + 1) + ')', opts.databaseId); setTimeout(function(){ resolve(dbQueryThrottled(opts, attempt + 1)); }, 300 * Math.pow(2, attempt)); }
              else { console.warn('[database] 限流重试耗尽，本次查询失败', opts.databaseId); resolve(r); }
            } else { resolve(r); }
          }).catch(function(err){
            if (attempt < 5 && err && /rate limit/i.test(String(err && err.message || err))) {
              setTimeout(function(){ resolve(dbQueryThrottled(opts, attempt + 1)); }, 300 * Math.pow(2, attempt));
            } else { resolve({ __error: (err && (err.message || String(err))) || 'query-failed' }); }
          });
        }, wait);
      });"""
new_A = """      return new Promise(function(resolve){
        setTimeout(function(){
          _dbQueryLastAt = Date.now();
          /* v83: 硬超时 + 同步异常兜底——外壳对未知参数(如 filter)可能抛错或永不返回，
           * 任其悬挂会把整条串行查询队列永久卡死(备份转后台后一直无提示的根因)。 */
          var settled = false;
          var hardTimer = setTimeout(function(){
            if (settled) return;
            settled = true;
            console.warn('[database] 查询硬超时(20s)', opts.databaseId);
            resolve({ __error: 'query-timeout' });
          }, 20000);
          function ok(r){
            if (settled) return;
            settled = true;
            clearTimeout(hardTimer);
            if (r && r.code === 50001) {
              if (attempt < 5) { console.warn('[database] 限流50001，退避重试(' + (attempt + 1) + ')', opts.databaseId); setTimeout(function(){ resolve(dbQueryThrottled(opts, attempt + 1)); }, 300 * Math.pow(2, attempt)); }
              else { console.warn('[database] 限流重试耗尽，本次查询失败', opts.databaseId); resolve(r); }
            } else { resolve(r); }
          }
          function bad(err){
            if (settled) return;
            settled = true;
            clearTimeout(hardTimer);
            if (attempt < 5 && err && /rate limit/i.test(String(err && err.message || err))) {
              setTimeout(function(){ resolve(dbQueryThrottled(opts, attempt + 1)); }, 300 * Math.pow(2, attempt));
            } else { resolve({ __error: (err && (err.message || String(err))) || 'query-failed' }); }
          }
          try { db.query(opts).then(ok, bad); }
          catch(e3) { bad(e3); }
        }, wait);
      });"""
reps.append((old_A, new_A))

# ---------- B. dbAdd：30s 硬超时 ----------
old_B = """    try {
      db.addRecord({ databaseId: databaseId, properties: finalProps }).then(function(result){
        /* v36f: SDK 可能把业务错误包在成功响应里（如 12607），必须识别，不能当写入成功吞掉 */
        if(result && result.code){
          lastDbWriteErr = 'addRecord 业务错误 code=' + result.code + ' ' + (result.msg || result.message || '');
          console.warn('[database] 写入业务错误', result);
          if(cb) cb(null);
          return;
        }
        var rid = result && (result.id || result._id || result.record_id || result.recordId) || null;
        if(rid) lastDbWriteErr = '';
        if(cb) cb(rid);
      }).catch(function(err){ lastDbWriteErr = 'addRecord 异常：' + String(err && err.message || err).slice(0,200); console.warn("[database] 写入失败，保留为未同步待重试", err); if(cb) cb(null); });
    } catch(e){ lastDbWriteErr = 'addRecord 调用异常：' + String(e && e.message || e).slice(0,200); console.warn("[database] 写入异常", e); if(cb) cb(null); }"""
new_B = """    /* v83: 硬超时 30s——写入悬挂时如实回报失败，不再无限等待(否则备份永远转后台) */
    var settledA = false;
    var timerA = setTimeout(function(){ if(settledA) return; settledA = true; lastDbWriteErr = 'addRecord 硬超时(30s)'; console.warn('[database] 写入硬超时', databaseId); if(cb) cb(null); }, 30000);
    function finA(fn){ return function(x){ if(settledA) return; settledA = true; clearTimeout(timerA); fn(x); }; }
    try {
      db.addRecord({ databaseId: databaseId, properties: finalProps }).then(finA(function(result){
        /* v36f: SDK 可能把业务错误包在成功响应里（如 12607），必须识别，不能当写入成功吞掉 */
        if(result && result.code){
          lastDbWriteErr = 'addRecord 业务错误 code=' + result.code + ' ' + (result.msg || result.message || '');
          console.warn('[database] 写入业务错误', result);
          if(cb) cb(null);
          return;
        }
        var rid = result && (result.id || result._id || result.record_id || result.recordId) || null;
        if(rid) lastDbWriteErr = '';
        if(cb) cb(rid);
      })).catch(finA(function(err){ lastDbWriteErr = 'addRecord 异常：' + String(err && err.message || err).slice(0,200); console.warn("[database] 写入失败，保留为未同步待重试", err); if(cb) cb(null); }));
    } catch(e){ finA(function(){})(null); lastDbWriteErr = 'addRecord 调用异常：' + String(e && e.message || e).slice(0,200); console.warn("[database] 写入异常", e); if(cb) cb(null); }"""
reps.append((old_B, new_B))

# ---------- C. dbUpdate：30s 硬超时 ----------
old_C = """    try {
      db.updateRecord({ databaseId: databaseId, recordId: recordId, properties: props }).then(function(result){
        /* v80: 业务错误（code 非零）不能当更新成功 */
        if (result && result.code) { console.warn('[database] 更新业务错误', result.code, result.msg || result.message || ''); if(cb) cb(false); return; }
        if(cb) cb(true);
      }).catch(function(err){ console.warn("[database] 更新失败", err); if(cb) cb(false); });
    } catch(e){ console.warn("[database] 更新异常", e); if(cb) cb(false); }"""
new_C = """    /* v83: 硬超时 30s——更新悬挂时如实回报失败 */
    var settledU = false;
    var timerU = setTimeout(function(){ if(settledU) return; settledU = true; console.warn('[database] 更新硬超时', databaseId, recordId); if(cb) cb(false); }, 30000);
    function finU(fn){ return function(x){ if(settledU) return; settledU = true; clearTimeout(timerU); fn(x); }; }
    try {
      db.updateRecord({ databaseId: databaseId, recordId: recordId, properties: props }).then(finU(function(result){
        /* v80: 业务错误（code 非零）不能当更新成功 */
        if (result && result.code) { console.warn('[database] 更新业务错误', result.code, result.msg || result.message || ''); if(cb) cb(false); return; }
        if(cb) cb(true);
      })).catch(finU(function(err){ console.warn("[database] 更新失败", err); if(cb) cb(false); }));
    } catch(e){ finU(function(){})(null); console.warn("[database] 更新异常", e); if(cb) cb(false); }"""
reps.append((old_C, new_C))

# ---------- D. snapshotSaveCloud：关键路径只走 dbAdd，清理后置 ----------
old_D = """    var parts = _snapValParts(val);
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
new_D = """    var parts = _snapValParts(val);
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
reps.append((old_D, new_D))

# ---------- E. snapshotLoad：同键多行取 at 最新 ----------
old_E = """    var key = snapshotMetaKey(date);
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
new_E = """    var key = snapshotMetaKey(date);
    dbFetchMetaFiltered({ prefix: key }, function(rows){
      /* v83: 同键可能同时存在多行(追加写+后置清理的过渡期)——取 at 最新的一份 */
      var best = null, bestManifest = null, bestAt = -1;
      (rows || []).forEach(function(r){
        var k = String(r["键"]||"");
        if(k !== key) return;
        var obj = null;
        try{ obj = JSON.parse(String(r["值"]||"")); }catch(e){}
        if(!obj || typeof obj !== 'object') return;
        var at = Number(obj.at)||0;
        if(at < bestAt) return;
        bestAt = at;
        if(obj.vv === 2) bestManifest = obj; else best = obj;
      });
      if(bestManifest && Number(bestManifest.chunks) > 0){
        /* v82: 分片快照——按 #序号取齐再拼接 */
        dbFetchMetaFiltered({ prefix: key + '#' }, function(crows){
          var segs = [];
          (crows || []).forEach(function(r){
            var k = String(r["键"]||"");
            if(k.indexOf(key + '#') !== 0) return;
            var idx = parseInt(k.slice(key.length + 1), 10);
            if(idx >= 1 && idx <= Number(bestManifest.chunks)) segs[idx - 1] = String(r["值"]||"");
          });
          var full = null;
          if(segs.length === Number(bestManifest.chunks) && segs.every(function(s){ return typeof s === 'string'; })){
            try{ full = JSON.parse(segs.join('')); }catch(e){}
          }
          cb(full);
        });
        return;
      }
      cb(best);
    });
  }"""
reps.append((old_E, new_E))

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
    "查询硬超时(20s)",
    "addRecord 硬超时(30s)",
    "更新硬超时",
    "关键路径只走 dbAdd",
    "取 at 最新的一份",
    "cleanupStale(manifestRid)",
]
misses = [m for m in musts if m not in chk]
gone = ["dbUpdate(DB_META, manifestId, props, function(upd){"] if "dbUpdate(DB_META, manifestId, props, function(upd){" in chk else []
if misses or gone:
    print("ASSERT FAIL missing=%s notgone=%s" % (misses, gone))
    sys.exit(1)
print("OK v83 applied, length=%d" % len(chk))
