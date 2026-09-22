#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v68 写入后校验：中文串断言 + 提取主 script 供 node --check"""
import io, re, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
OUT = r"D:\workbuddyProjects\工作台3\_tools\_main_v68.js"

src = io.open(PATH, "r", encoding="utf-8").read()

# 1) 中文串必须原样落盘（防 unicode 转义写错静默失败）
musts = [
    "物品使用频率（storageUsage）跨设备同步",
    "把远端使用频率按「累计次数取大、首末日期取早/取晚、逐月次数取大」合并进本地",
    "本机是否存在任一「已同步到云端」的真实数据",
    "老用户设备上不再保留内置示例数据",
    "只要本机有已同步的真实数据（或清空过全部数据），就整批剔除示例记录/书影音/示例打卡",
    "推送前先读一次云端 settings，把远端 storageUsage（使用频率）并进本地再整包写回",
    "否则两台设备交错推送时，后写的一方会用「空统计」覆盖掉对方累计的使用次数",
    "示例数据不入快照（否则快照恢复会把示例带回，如待买\"燕麦奶\"）",
    "当日按时刻先后升序（上午→下午），不再按插入序乱跳",
]
bad = [m for m in musts if m not in src]
if bad:
    print("CHINESE ASSERT FAIL:")
    for b in bad: print("  -", b)
    sys.exit(1)
print("chinese asserts: all hit")

# 2) 提取主 script（锚定页面节点 id，防误抓 inject.js 的 src 标签）
m = re.search(r'<script[^>]*data-page-node-id="NWnaoiLqDuBK1LXGZoVUKl"[^>]*>', src)
if not m:
    print("main script open tag not found"); sys.exit(1)
start = src.find(">", m.start()) + 1
end = src.find("</script>", start)
code = src[start:end]
print("main script length:", len(code))
if len(code) < 100000:
    print("TOO SHORT — extraction wrong"); sys.exit(1)
io.open(OUT, "w", encoding="utf-8", newline="\n").write(code)
print("extracted ->", OUT)

# 3) 结构自检：新函数定义与调用点都在主脚本内
pairs = [
    ("function mergeRemoteUsage(", "mergeRemoteUsage(s.storageUsage)"),
    ("function stripSampleData(", "if(ok) stripSampleData()"),
    ("function _hasRealSyncedData(", "_hasRealSyncedData()"),
    ("storageUsage: state.settings.storageUsage || {}", "storageUsage:snap.storageUsage"),
]
for a, b in pairs:
    if a not in code: print("MISS def:", a); sys.exit(1)
    if b not in code: print("MISS call:", b); sys.exit(1)
print("structure asserts: all hit")
