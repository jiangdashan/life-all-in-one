# -*- coding: utf-8 -*-
import io

p = r'D:\workbuddyProjects\工作台3\.workbuddy\memory\2026-09-22.md'
add = '''

## v80 web 端「立即备份」失效（上线 /64/，MISS 0）

### 根因（真实缺陷，与两端无关但两端都受影响）
`dbUpdate` 发射后不管：业务错误 code（如 50001）/网络异常只 console.warn。而 meta 类写入有 4 处「`dbUpdate(...); if(cb) cb(true);`」——更新路径**无条件谎报成功**。立即备份当天已有云端快照时走更新路径：云端更新失败 → 用户看到「已备份到本机和云端」但云端还是旧快照 → 恢复时缺数据 → 表现为「失效」。

### 修复
- `dbUpdate(databaseId, recordId, props, cb)`：识别 result.code、catch 异常、LOCAL_ONLY → cb(false)；旧调用点不传 cb 行为不变。
- `snapshotSaveCloud` 更新失败 → 回退「dbDelete + dbAdd」重建；仍失败 → cb(false) → toast「已备份到本机，云端写入失败」。
- `renderSnapshotPanel` 文案带 `_modeNote`：未连接云端时显示「（未连接云端，备份仅存本机）」，降级状态可见。
- 其余 3 处 meta 更新路径保持 fire-and-forget（行为兼容，未动）。

### 排查过程要点
- mock 桥浏览器实测基础链路全通 → 用 mock updateRecord 返回 {code:50001} 复现「谎报成功」→ 修复后如实报错。
- 注意：行为测试的 update/add 计数会被后台 syncPendingRecords（money 记录重传）和 auto-backup 污染，断言要看**结果**（metaRows=1、toast 文案），别断言调用计数。

### 用户新增铁律（已写入 MEMORY.md）
web 端与移动端功能不允许不同步。护栏：_verify_v80.py 断言 sidebar 与 mobile-nav 的 data-nav 集合完全一致（当前各 16 项）；今后新增模块/入口必须两端同加、双视口冒烟。
'''
io.open(p, 'a', encoding='utf-8').write(add)
print('appended', len(add))

# MEMORY.md 铁律 + 版本要点
P2 = r'D:\workbuddyProjects\工作台3\.workbuddy\memory\MEMORY.md'
s = io.open(P2, encoding='utf-8').read()
old_hdr = '## 版本要点（当前 v79；线上 /63/，v79 已上线 MISS 0）'
new_hdr = '## 版本要点（当前 v80；线上 /64/，v80 已上线 MISS 0）'
assert old_hdr in s
s = s.replace(old_hdr, new_hdr, 1)
i = s.find('- v78 回本')
v80 = ('- v80 web 端立即备份失效：dbUpdate 发射后不管，4 处 meta 更新路径「dbUpdate; cb(true)」谎报成功 → '
       'dbUpdate 加回调识别 code/异常；snapshotSaveCloud 更新失败回退删除重建；面板标注「未连接云端仅存本机」。\n')
s = s[:i] + v80 + s[i:]
# 铁律区追加
j = s.find('## 工程铁律')
assert j >= 0
k = s.find('\n## ', j + 5)
rules_end = k if k > 0 else len(s)
rule_add = '- **web/移动端功能同步（用户 2026-09-22 明确要求）**：新增模块/入口必须同时改 sidebar+mobile-nav（_verify 断言两端 data-nav 集合一致）；交互功能改动必须双视口（1280+420）冒烟。\n'
s = s[:rules_end] + rule_add + s[rules_end:]
io.open(P2, 'w', encoding='utf-8').write(s)
print('MEMORY.md updated, len', len(s))
