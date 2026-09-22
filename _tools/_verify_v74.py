# -*- coding: utf-8 -*-
"""v74 落盘断言 + 提取主 script 供 node --check"""
import io, re, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
OUT = r"D:\workbuddyProjects\工作台3\_tools\_main_v74.js"
s = io.open(P, encoding="utf-8").read()

m = re.search(r'<script[^>]*data-page-node-id="NWnaoiLqDuBK1LXGZoVUKl"[^>]*>(.*?)</script>', s, re.S)
if not m:
    print("FAIL: main script not found"); sys.exit(1)
body = m.group(1)
io.open(OUT, "w", encoding="utf-8").write(body)
print("main script len =", len(body))
if len(body) < 100000:
    print("FAIL: script too short"); sys.exit(1)

CHECKS = [
    # --- 修复：CSS 泄漏 ---
    ("v74 泄漏已清除（无 </style>.cd-sub）", "</style>.cd-sub{"),
    ("v74 无重复 </style></style>", "</style></style>"),
    ("v74 style 标签数=2", "<style "),
    ("v74 主 style 含 cd-hero", ".cd-hero{display:grid"),
    ("v74 主 style 含 cd-num", ".cd-num{display:flex"),
    ("v74 主 style 含 cd-body", ".cd-body{flex:1"),
    ("v74 主 style 含 cd-hero-sm", ".cd-hero-sm{"),
    ("v74 主 style 含 cd-inline", ".cd-inline{display:flex"),
    ("v74 移动端断点", "@media(max-width:640px){\n  .cd-hero{grid-template-columns:1fr"),
    # --- 新渲染 ---
    ("v74 hero 主卡", '<div class="cd-hero-main">'),
    ("v74 hero 名称", "cd-hero-name"),
    ("v74 hero 计数", "cd-hero-count"),
    ("v74 hero 元信息", "cd-hero-meta"),
    ("v74 hero 侧栏", "cd-hero-side"),
    ("v74 hero 小卡", "cd-hero-sm"),
    ("v74 hero 今天文案", '就是今天</b>'),
    ("v74 行数字块", '<span class="cd-num">'),
    ("v74 行主体", '<span class="cd-body">'),
    ("v74 行今天", '<b class="txt">今天</b>'),
    ("v74 near 样式", "cd-row'+(days<=7?' near':'')"),
]

bad = 0
for name, token in CHECKS:
    if name.endswith("（无 </style>.cd-sub）") or name.endswith("</style></style>"):
        n = s.count(token)
        if n != 0:
            print("MISS  -", name, "still x%d" % n); bad += 1
        else:
            print("GONE  - %s" % name)
        continue
    n = s.count(token)
    if n < 1:
        print("MISS  -", name, "|", token); bad += 1
    else:
        print("FOUND - %s (x%d)" % (name, n))

# style 标签计数断言
nstyle = len(re.findall(r"<style ", s))
print("style tags =", nstyle)
if nstyle != 2:
    print("MISS - style 标签数异常"); bad += 1

# 习惯健康 section 内不应再有裸露 CSS 文本
i = s.find('id="view-habits"')
j = s.find('id="view-fitness"')
seg = s[i:j]
if ".cd-" in seg or ".cd-hero{" in seg:
    print("MISS - 习惯页仍残留 cd CSS"); bad += 1
else:
    print("GONE - 习惯页无残留 CSS 文本")

if bad:
    print("\nFAILED: %d" % bad); sys.exit(1)
print("\nALL CHECKS PASSED")
