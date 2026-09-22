# -*- coding: utf-8 -*-
"""v81: 更新记忆文件"""
import io

# 1) 今日日志追加
LOG = r'D:\workbuddyProjects\工作台3\.workbuddy\memory\2026-09-22.md'
add = '''

## v81 立即备份"按不动"（上线 /65/，MISS 0）

### 根因（三层叠加）
1. **inject.js 的 __SMART_PAGE__ 是"永真代理"**：外壳注入真实 database 实现前，`.database` 也返回可调用的 nsProxy（调用排 15s 超时队列）。`refreshDb` 的 `ONLINE = !!db` 因此**恒为 true**。
2. v54 桥就绪轮询 `ensureBridgeSync` 因此从不生效（第一次 refreshDb 就 ONLINE=true 直接 return）。
3. 桥未就绪/握手失败时点「立即备份」→ snapshotSaveCloud 的 dbFetchAll 排进 15s 队列 + dbAdd 再 15s，且点击零即时反馈 → 用户感知"按不动"。（30s 后其实会有 toast，但几乎没人等）

### 修复（4 处）
- `refreshDb` 改用 `window.__SMART_PAGE__.__realImpls__.database` 判真就绪（inject.js 注入实现必经 set 钩子写入 real）；无 `__realImpls__` 字段（非平台/mock）回退旧判定。
- `snapshotManual` 重写：`_snapManualBusy` 去重 + 点击即变「备份中…」+disabled + 25s 看门狗 + 全程 try/catch（finish 统一恢复按钮/弹 toast/刷面板）。
- `bindSnapshotPanel` 加 document 捕获委托兜底（`__snapDelegateBound` 防重复注册；与直绑双触发由 busy 去重）。
- init 绑定改隔离数组 `[startI18n,...,bindSnapshotPanel].forEach(try/catch)`——单个 bind 抛错不再拖死后续绑定。

### 验证（真实浏览器 + 真实 inject.js 握手 + mock 外壳）
- 场景 A 桥就绪：点「立即备份」→ **199ms** toast 成功、mock 云端 backup 行 n=1、面板「共 1 份快照」无离线标注。
- 场景 B 桥未就绪：→ **168ms** toast「已备份到本机，云端写入失败」、本机快照保留、面板正确标注「（未连接云端）」。修复前此场景 15s+ 零反馈。
- node --check 过；_verify_v80 护栏 21/21（断言更新为兼容 v81 隔离数组形式）；线上 181 标记 MISS 0。

### 测试基建坑（复用价值）
- 平台 inject.js 路径是**绝对路径** `/page/page_comm/inject.js`，mock 服务器要按 `indexOf('inject.js')` 匹配。
- 外壳握手协议：iframe 广播 `SMARTPAGE_LOADER_READY`（含 loaderNonce）→ 父回 `SMARTPAGE_INJECT_SCRIPT` + `{loaderNonce, kind:'database', script}` → inject.js `__SMART_PAGE__.database = impl` 触发 set 钩子。
- 桥就绪时 auth 云端探测异步 → auth 按钮先显「解锁」后切「创建密码并进入」，测试要轮询等文案再点。
- 设置面板入口是 `#brandSettingsBtn`（`#brandSettings` 是 hidden 遮罩）；设置面板内容超高，点击前要 `scrollIntoView`。
- snapshotList 是异步渲染，toast 出现后立刻读 snapState 会读到旧文案，等 1.2s。
- `_verify_v80.py` 的启动链断言已更新：支持 `[startI18n, ..., bindSnapshotPanel]` 隔离数组形式。
'''
io.open(LOG, 'a', encoding='utf-8').write(add)

# 2) MEMORY.md 版本行 + 追加一条要点
M = r'D:\workbuddyProjects\工作台3\.workbuddy\memory\MEMORY.md'
s = io.open(M, encoding='utf-8').read()
old = '## 版本要点（当前 v79；线上 /63/，v79 已上线 MISS 0）'
new = '## 版本要点（当前 v81；线上 /65/，v81 已上线 MISS 0）'
assert old in s, s[s.find('版本要点'):s.find('版本要点')+70]
s = s.replace(old, new, 1)
anchor = '- v79 库存总览位置筛选不生效'
i = s.find(anchor)
assert i >= 0
add2 = ('- v80 立即备份谎报成功：dbUpdate 原为发射后不管，meta 更新路径无条件 cb(true) → dbUpdate 加 cb 识别业务错误，备份更新失败回退删除重建，如实上报；面板加「（未连接云端）」标注。\n'
        '- v81 备份按钮按不动：根因=inject.js `__SMART_PAGE__` 永真代理致 `ONLINE` 恒 true（真就绪须查 `__realImpls__.database`），桥未就绪时云端调用排 15s 超时队列且点击零反馈；修复=真就绪判定（v54 轮询因此复活）+ 按钮「备份中…」即时反馈/25s 看门狗/全程 try-catch + document 委托兜底 + init 绑定隔离数组。e2e 实测桥就绪 199ms 成功/桥未就绪 168ms 明确报错。\n')
s = s[:i] + add2 + s[i:]
io.open(M, 'w', encoding='utf-8').write(s)
print('memory updated')
