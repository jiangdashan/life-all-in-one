# -*- coding: utf-8 -*-
"""核对线上 /59/ 是否真的含 v75 全部关键标记（不再重复发布）"""
import io, re, urllib.request

URL = 'https://workbuddy-space-static.codebuddy.work/page/IAP7cP1ljx7juu0hAdPdVy/59/life-all-in-one.html'
req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
s = urllib.request.urlopen(req, timeout=60).read().decode('utf-8')
print('online /59/ len', len(s))

MARKERS = [
    '>倒数</span>', 'data-nav="countdown"><svg',
    'renderModuleInsights', '_miSet', '_miMoney', '_miHabits', '_miFitness',
    '_miSleep', '_miStudy', '_miPlanner', '_miHome', '_miDiet', '_miStorage',
    '_miPayback', 'mod-insight', '.mi-main b{', '.mi-note{',
    'font-variant-numeric:tabular-nums', 'id="miMoney"', 'id="miPayback"',
    'function empty(message,hint)', '本月支出', '今日打卡', '大件投入',
]
miss = [m for m in MARKERS if m not in s]
for m in MARKERS:
    print(('FOUND ' if m in s else 'MISS  ') + m)

i = s.find('class="mobile-nav"')
j = s.find('</nav>', i)
navs = re.findall(r'data-nav="([^"]+)"', s[i:j])
print('\nmobile-nav items:', len(navs), '| countdown in list:', 'countdown' in navs)
print('insight 容器数:', len(re.findall(r'class="mod-insight"', s)))
print('\nMISS COUNT:', len(miss))
