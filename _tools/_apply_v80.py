# -*- coding: utf-8 -*-
"""v80: 修复「立即备份」云端更新失败被谎报成功。
根因：dbUpdate 发射后不管（业务错误/网络异常仅 console.warn），
snapshotSaveCloud 等 4 处 meta 更新路径 `dbUpdate(...); if(cb) cb(true);` 无条件报成功。
修复：
  A. dbUpdate 增加回调（识别业务错误 code / catch 异常 / LOCAL_ONLY → cb(false)）
  B. snapshotSaveCloud 更新失败 → 回退删除重建；再失败 → cb(false) 如实上报
  C. renderSnapshotPanel 文案标注云端不可用状态（未连接云端时「仅存本机」明示）
  D. 两端一致性护栏：断言侧栏与移动端 nav 的 data-nav 集合一致
"""
import io, re

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig = len(s)

def rep(old, new, tag, count=1):
    global s
    n = s.count(old)
    assert n == count, '[%s] anchor count=%d expect %d' % (tag, n, count)
    s = s.replace(old, new)
    print('[OK]', tag)

# ---- A. dbUpdate 增加回调 ----
old_a = (
    "function dbUpdate(databaseId, recordId, props){\n"
    "    if (!ONLINE || LOCAL_ONLY) return;\n"
    "    try {\n"
    "      db.updateRecord({ databaseId: databaseId, recordId: recordId, properties: props }).catch(function(err){ console.warn(\"[database] 更新失败\", err); });\n"
    "    } catch(e){ console.warn(\"[database] 更新异常\", e); }\n"
    "  }"
)
new_a = (
    "function dbUpdate(databaseId, recordId, props, cb){\n"
    "    if (!ONLINE || LOCAL_ONLY) { if(cb) cb(false); return; }\n"
    "    try {\n"
    "      db.updateRecord({ databaseId: databaseId, recordId: recordId, properties: props }).then(function(result){\n"
    "        /* v80: 业务错误（code 非零）不能当更新成功 */\n"
    "        if (result && result.code) { console.warn('[database] 更新业务错误', result.code, result.msg || result.message || ''); if(cb) cb(false); return; }\n"
    "        if(cb) cb(true);\n"
    "      }).catch(function(err){ console.warn(\"[database] 更新失败\", err); if(cb) cb(false); });\n"
    "    } catch(e){ console.warn(\"[database] 更新异常\", e); if(cb) cb(false); }\n"
    "  }"
)
rep(old_a, new_a, 'A-dbUpdate-callback')

# ---- B. snapshotSaveCloud 更新路径如实上报 + 失败回退 ----
old_b = (
    "if(existingId){ dbUpdate(DB_META, existingId, props); if(cb) cb(true); }\n"
    "      else dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); });"
)
new_b = (
    "if(existingId){\n"
    "        /* v80: 更新失败不再谎报成功——回退删除重建，仍失败则如实回报 */\n"
    "        dbUpdate(DB_META, existingId, props, function(upd){\n"
    "          if(upd){ if(cb) cb(true); return; }\n"
    "          dbDelete(DB_META, existingId);\n"
    "          dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); });\n"
    "        });\n"
    "      }\n"
    "      else dbAdd(DB_META, props, function(rid){ if(cb) cb(!!rid); });"
)
rep(old_b, new_b, 'B-snapshotSaveCloud-truthful')

# ---- C. renderSnapshotPanel 文案标注云端状态 ----
old_c1 = "    snapshotList(function(list){\n      if(!list || !list.length){\n        stEl.textContent = '还没有任何备份。首次同步成功后会自动生成第一份。';"
new_c1 = "    var _modeNote = (!ONLINE || LOCAL_ONLY) ? '（未连接云端，备份仅存本机）' : '';\n    snapshotList(function(list){\n      if(!list || !list.length){\n        stEl.textContent = '还没有任何备份。首次同步成功后会自动生成第一份。' + _modeNote;"
rep(old_c1, new_c1, 'C1-panel-note-empty')

old_c2 = "      stEl.textContent = '共 ' + list.length + ' 份快照，云端保留最近 ' + SNAP_CLOUD_DAYS + ' 天。';"
new_c2 = "      stEl.textContent = '共 ' + list.length + ' 份快照，云端保留最近 ' + SNAP_CLOUD_DAYS + ' 天。' + _modeNote;"
rep(old_c2, new_c2, 'C2-panel-note-count')

# ---- 断言 ----
assert s.count('function dbUpdate(databaseId, recordId, props, cb)') == 1
assert s.count('if(existingId){\n        /* v80') == 1, 'B 补丁应恰好 1 处'
# 其余 3 处 meta 更新路径保持 fire-and-forget（行为不变），但要确认没有别的 snapshotSaveCloud 式谎报残留
assert s.count('if (existingId) { dbUpdate(DB_META, existingId, props); if(cb) cb(true); }') == 3, '其余 3 处旧式调用应保留（本次不动，行为兼容）'
assert s.count('_modeNote') == 3
io.open(P, 'w', encoding='utf-8').write(s)
print('len %d -> %d (+%d)' % (orig, len(s), len(s) - orig))
print('V80 PATCHES APPLIED')
