# -*- coding: utf-8 -*-
"""v80 落盘校验 + 两端一致性护栏（用户指令：web/移动端功能不允许不同步）"""
import io, re, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
fails = []

def ok(name, cond):
    print(('PASS ' if cond else 'FAIL ') + name)
    if not cond: fails.append(name)

# ---- v80 修复落盘 ----
ok('A dbUpdate 带回调签名', 'function dbUpdate(databaseId, recordId, props, cb)' in s)
ok('A dbUpdate 业务错误识别', "if (result && result.code) { console.warn('[database] 更新业务错误'" in s)
ok('B snapshotSaveCloud 失败回退', 'dbUpdate(DB_META, existingId, props, function(upd){' in s)
ok('B 旧谎报模式(snapshotSaveCloud)消除', 'if(existingId){ dbUpdate(DB_META, existingId, props); if(cb) cb(true); }' not in s)
ok('C 面板云端状态标注', s.count('_modeNote') == 3)

# ---- 两端一致性护栏 D ----
# 1) 侧栏与移动端 nav 的 data-nav 集合必须一致
sidebar_m = re.search(r'<aside[^>]*class="sidebar".*?</aside>', s, re.S)
mobile_m = re.search(r'class="mobile-nav".*?</nav>', s, re.S)
ok('存在侧栏与移动端两份导航', bool(sidebar_m and mobile_m))
if sidebar_m and mobile_m:
    side = set(re.findall(r'data-nav="([^"]+)"', sidebar_m.group(0)))
    mob = set(re.findall(r'data-nav="([^"]+)"', mobile_m.group(0)))
    ok('侧栏 data-nav 集合=%d 项' % len(side), len(side) >= 15)
    ok('移动端 data-nav 集合=%d 项' % len(mob), len(mob) >= 15)
    ok('两端导航模块完全一致 (差集=%s)' % (side ^ mob or '无'), side == mob)

# 2) 备份面板四件套 + 关键函数存在
for el in ['id="snapNowBtn"', 'id="snapRefreshBtn"', 'id="snapList"', 'id="snapState"', 'id="snapBox"']:
    ok('备份面板元素 %s' % el, el in s)
for fn in ['function snapshotManual', 'function bindSnapshotPanel', 'function snapshotSaveCloud', 'function renderSnapshotPanel']:
    ok('备份函数 %s' % fn, fn in s)
ok('bindSnapshotPanel 在启动链调用', re.search(r'startI18n\(\);[\s\S]{0,200}bindSnapshotPanel\(\);', s) is not None or re.search(r'\[startI18n, [\s\S]{0,120}bindSnapshotPanel\]', s) is not None)  # v81 起支持隔离数组形式

# ---- CSS 括号平衡（防泄漏复发） ----
k = 0; bal = True
while True:
    a = s.find('<style', k)
    if a < 0: break
    b = s.find('</style>', a)
    css = s[a:b]
    if css.count('{') != css.count('}'): bal = False; print('  style@%d braces %d/%d' % (a, css.count('{'), css.count('}')))
    k = b + 1
ok('全部 style 标签括号平衡', bal)

print('TOTAL FAIL:', len(fails))
sys.exit(1 if fails else 0)
