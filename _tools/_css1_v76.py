# -*- coding: utf-8 -*-
import re, sys
P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = open(P, encoding='utf-8').read()
pat = sys.argv[1]
out = []
for m in re.finditer(r'[^{}]*' + pat + r'[^{}]*\{[^}]*\}', s):
    t = m.group(0).strip()
    if len(t) < 400:
        out.append(t)
open(sys.argv[2], 'w', encoding='utf-8').write('\n--\n'.join(out))
print('n=', len(out))
