# -*- coding: utf-8 -*-
"""修复 2026-09-18.md：上一轮用 python -c 追加笔记时，bash 把反引号当命令替换执行了，
   导致所有 `xxx` 包裹的代码名全部丢失。这里截断后重写该段。
   教训已固化：含反引号/`$` 的文本一律写进 .py 文件再执行，不要用 python -c。"""
import io

P = '.workbuddy/memory/2026-09-18.md'
s = io.open(P, encoding='utf-8').read()
MARK = '## v65 调研：每日自动备份'
i = s.find(MARK)
if i < 0:
    raise SystemExit('marker not found')
s = s[:i]

Q = chr(96)  # 反引号，避免源码层面再被 shell 解析
NOTE = """## v65 调研：每日自动备份 + 误清空恢复（用户要求「先讨论可行性」，未动代码）

### 关键事实（读代码 + 线上只读核查）
- **清空链路**：{q}handleClearAll{q} → 本地 {q}state.records / mediaItems / habits.entries / weeklyPlan{q} 全清 + {q}state.lastClearedAt{q} → 写 meta 墓碑 {q}writeMetaClearAt{q} → {q}clearAllRemoteTables{q} 删 **13 张业务表**（DB_LIST 里**不含 DB_META**）→ 再写一次墓碑。
- **所以「清空」根本不碰 meta 表**，meta 表天然可作为备份存放地——这是整个方案成立的基础。
- **致命坑 1 · 墓碑反噬**：{q}applyRemoteClear(clearAt){q} 按 {q}createdAt > clearAt{q} 过滤，{q}readMetaClearAt{q} 跨设备生效。恢复备份若不**同时撤销本地 state.lastClearedAt + 云端 meta lastClearedAt**，恢复出来的老记录 createdAt 早于墓碑 → 一刷新又被过滤掉、其它设备还会再清一遍。**这是多数恢复方案失效的根因。**
- **致命坑 2 · 恢复不能用覆盖**：用户铁律是 LWW、禁止远程无条件替换本地。恢复必须是「按 id 把快照里缺的记录补回来」的 merge 语义，不能整份覆盖。
- **容量未知**：meta 三列全是 text，SDK 无长度声明；生产环境实测**已成功写入过的最大值 2399 字符**（appSettings）。全量快照估计 100–150 KB（13 张业务表 843 行、CSV 61.7 KB；含 meta 共 863 行 / 91.6 KB）。**能否单行存下必须探针才知道**，否则走分片（每片 ≤2000 字符）→ 属于「要不要写生产表」的取舍，已交用户定夺。
- **没有现成导出/导入实现**：i18n 里有「备份已导出 / 备份导入成功 / 导入备份」等文案，但源码里**不存在任何导出导入函数**（全是历史遗留文案）。不过 {q}normalizeState(){q} 已是完整校验器（抛「备份格式不正确」「备份中有损坏的记录」），可直接复用做恢复时的格式校验。
- **触发时机**：纯前端无后台，真「定时」做不到；可行的是「打开 + cloud 同步成功后，当天尚无快照才生成」。用 WorkBuddy 桌面自动化驱动浏览器不可靠（需本机常开）。

### 方案（待用户选择）
- A 本地快照（浏览器独立缓存键）：防误清空，零云端成本，不防清缓存/换设备。
- B 云端 meta 表快照：防设备丢失，可能需分片，每天一次全量写入。
- C 双份（推荐）+ 7 / 14 / 30 天滚动保留。
""".replace('{q}', Q)

io.open(P, 'w', encoding='utf-8', newline='').write(s + NOTE)
out = io.open(P, encoding='utf-8').read()
print('修复完成，len =', len(out))
print('反引号仍在:', out.count(Q) > 0)
print(out[-600:])
