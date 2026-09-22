# -*- coding: utf-8 -*-
"""v83c: 分片行带写入时间戳身份，终结跨代清理/读取混淆
分片键 backup:<date>#<at>#<i>；cleanupStale 对分片行也按 at<myAt 判旧；
snapshotLoad 只读取 bestManifest.at 对应那一代的分片。"""
import io, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"

with io.open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

reps = []

# ---------- A. snapshotSaveCloud：分片键带 at + 清理按 at 判旧 ----------
old_A = """          } else if(k.indexOf(key + '#') === 0 && chunkIds.indexOf(r._id) === -1){
            isStale = true;   /* 非本次分片(写入已串行，只可能来自当日更早的备份) */
          }"""
new_A = """          } else if(k.indexOf(key + '#') === 0){
            /* v83c: 分片键带写入时间戳 backup:<date>#<at>#<i>，按 at 判旧——
             * 非本次分片可能是并发的更新备份，绝不能按"不是我的"就删 */
            var atPart = Number(k.slice(key.length + 1).split('#')[0]) || 0;
            isStale = atPart < myAt;
          }"""
reps.append((old_A, new_A))

old_B = """      dbAdd(DB_META, { "键": { text: key + '#' + (i + 1) }, "值": { text: parts[i] } }, function(rid){
        if(!rid){ done(false); return; }
        chunkIds.push(rid);
        writeChunks(i + 1, finished);
      });"""
new_B = """      dbAdd(DB_META, { "键": { text: key + '#' + snap.at + '#' + (i + 1) }, "值": { text: parts[i] } }, function(rid){
        if(!rid){ done(false); return; }
        chunkIds.push(rid);
        writeChunks(i + 1, finished);
      });"""
reps.append((old_B, new_B))

# ---------- B. snapshotLoad：只读 bestManifest 那一代的分片 ----------
old_C = """      if(bestManifest && Number(bestManifest.chunks) > 0){
        /* v82: 分片快照——按 #序号取齐再拼接 */
        dbFetchMetaFiltered({ prefix: key + '#' }, function(crows){
          var segs = [];
          (crows || []).forEach(function(r){
            var k = String(r["键"]||"");
            if(k.indexOf(key + '#') !== 0) return;
            var idx = parseInt(k.slice(key.length + 1), 10);
            if(idx >= 1 && idx <= Number(bestManifest.chunks)) segs[idx - 1] = String(r["值"]||"");
          });"""
new_C = """      if(bestManifest && Number(bestManifest.chunks) > 0){
        /* v82: 分片快照——按 #序号取齐再拼接；v83c: 分片键带 at，只读同一代 */
        var chunkPrefix = key + '#' + Number(bestManifest.at) + '#';
        dbFetchMetaFiltered({ prefix: chunkPrefix }, function(crows){
          var segs = [];
          (crows || []).forEach(function(r){
            var k = String(r["键"]||"");
            if(k.indexOf(chunkPrefix) !== 0) return;
            var idx = parseInt(k.slice(chunkPrefix.length), 10);
            if(idx >= 1 && idx <= Number(bestManifest.chunks)) segs[idx - 1] = String(r["值"]||"");
          });"""
reps.append((old_C, new_C))

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
    "key + '#' + snap.at + '#' + (i + 1)",
    "var chunkPrefix = key + '#' + Number(bestManifest.at) + '#';",
    "atPart < myAt",
]
misses = [m for m in musts if m not in chk]
if misses:
    print("ASSERT FAIL missing=%s" % misses)
    sys.exit(1)
print("OK v83c applied, length=%d" % len(chk))
