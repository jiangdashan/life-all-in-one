# -*- coding: utf-8 -*-
"""v75 落盘断言：中文串必须真实存在于文件里"""
import io, re, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
fail = []


def ok(name, cond):
    print(('OK  ' if cond else 'MISS') + ' ' + name)
    if not cond:
        fail.append(name)


# 1 移动端导航
i = s.find('class="mobile-nav"')
j = s.find('</nav>', i)
seg = s[i:j]
ok('1a mobile-nav 含 countdown 按钮', 'data-nav="countdown"' in seg)
ok('1b mobile-nav 含「倒数」文字', '<span>倒数</span>' in seg)
ok('1c mobile-nav 共 16 个模块项', len(re.findall(r'data-nav="', seg)) == 16)
ok('1d 侧栏也仍有 countdown', s.count('data-nav="countdown"') == 2)

# 2 CSS
ok('2a 三档层级样式已注入', '.mod-insight{' in s and '.mi-main b{' in s)
ok('2b 全局等宽数字', 'body{font-variant-numeric:tabular-nums}' in s)
ok('2c 空状态副提示样式', '.empty-hint{' in s)
ok('2d 样式在主样式表内', s.find('.mod-insight{') < s.find('</style>'))

# 3 容器
for cap in ['Money', 'Habits', 'Fitness', 'Sleep', 'Study',
            'Planner', 'Home', 'Diet', 'Storage', 'Payback']:
    ok('3 容器 mi%s' % cap, 'id="mi%s" hidden' % cap in s)

# 4 JS
ok('4a renderModuleInsights 定义', 'function renderModuleInsights()' in s)
ok('4b renderAll 内调用', 'try{ renderModuleInsights(); }catch(e){}' in s)
ok('4c _miSet 定义', 'function _miSet(' in s)
for fn in ['_miMoney', '_miHabits', '_miFitness', '_miSleep', '_miStudy',
           '_miPlanner', '_miHome', '_miDiet', '_miStorage', '_miPayback']:
    ok('4d %s 定义' % fn, 'function %s(' % fn in s)

# 5 empty
ok('5a empty 支持第二参数', 'function empty(message,hint)' in s)
ok('5b empty 渲染副提示', 'empty-hint' in s)

# 中文断言（铁律：含中文替换必须 grep 真实中文串）
for cn in ['本月支出', '今日打卡', '当前体重', '昨晚睡了', '近 7 天学习',
           '待办未完成', '待买清单', '今日摄入', '库存', '大件投入',
           '今天完成一点，就算前进', '越用越回本']:
    ok('中文 %s' % cn, cn in s)

# 只有一个 </style> 被重复插入？
ok('style 标签数量正常', s.count('</style>') == 2)

print('\n' + ('FAIL %d' % len(fail) if fail else 'ALL ASSERTIONS PASSED'))
sys.exit(1 if fail else 0)
