# -*- coding: utf-8 -*-
import io, re, urllib.request

URL = 'https://workbuddy-space-static.codebuddy.work/page/IAP7cP1ljx7juu0hAdPdVy/58/life-all-in-one.html'
req = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
s = urllib.request.urlopen(req, timeout=60).read().decode('utf-8')
io.open(r'D:\workbuddyProjects\工作台3\_tools\_online_v75.html', 'w', encoding='utf-8').write(s)
print('online len', len(s))

i = s.find('class="mobile-nav"')
j = s.find('</nav>', i)
seg = s[i:j]
navs = re.findall(r'data-nav="([^"]+)"', seg)
print('mobile-nav items:', len(navs))
print(navs)
print('has countdown:', 'countdown' in navs)
k = seg.find('countdown')
print('context:', repr(seg[max(0, k - 120):k + 120]) if k >= 0 else 'NOT FOUND')
print()
print('侧栏 countdown 次数:', s.count('data-nav="countdown"'))
print('倒数 文字:', s.count('倒数'))
print('mod-insight:', s.count('mod-insight'))
print('miMoney:', s.count('id="miMoney"'))
