# -*- coding: utf-8 -*-
import subprocess, io

NODE = r'C:\Users\依易亦奕鸭\.workbuddy\binaries\node\versions\22.22.2-3\node.exe'
BASE = r'D:\workbuddyProjects\工作台3\_tools'
out = []
for f in ['_smoke_v29_period_predict_hero', '_smoke_v30_period_safety', '_smoke_v31_period_history']:
    p = BASE + '\\' + f + '.js'
    r = subprocess.run([NODE, p], capture_output=True, text=True, encoding='utf-8', timeout=180)
    lines = (r.stdout or '').split('\n')
    out.append('===== %s  rc=%d' % (f, r.returncode))
    keep = [l for l in lines if ('总计' in l or 'FAIL' in l or '失败' in l or '通过' in l)]
    out.extend(keep[-8:])
    out.append('last: ' + (lines[-1][:200] if lines else ''))
io.open(BASE + r'\_out_p.txt', 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(out))
