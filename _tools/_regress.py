# -*- coding: utf-8 -*-
import subprocess, sys, io

NODE = r'C:\Users\依易亦奕鸭\.workbuddy\binaries\node\versions\22.22.2-3\node.exe'
BASE = r'D:\workbuddyProjects\工作台3\_tools'
FILES = ['_smoke_v57', '_smoke_v63', '_smoke_v65', '_smoke_v67', '_smoke_v68',
         '_smoke_v69', '_smoke_v70', '_smoke_v71', '_smoke_v72', '_smoke_v73',
         '_smoke_v74', '_smoke_v75',
         '_smoke_v26_period_predict', '_smoke_v27_period_merge',
         '_smoke_v28_period_expand', '_smoke_v29_period_predict_hero',
         '_smoke_v30_period_safety', '_smoke_v31_period_history']
out = []
bad = []
for f in FILES:
    p = BASE + '\\' + f + '.js'
    try:
        r = subprocess.run([NODE, p], capture_output=True, text=True, encoding='utf-8', timeout=180)
        txt = (r.stdout or '') + (r.stderr or '')
    except Exception as e:
        txt = 'EXCEPTION ' + str(e)
    line = [l for l in txt.split('\n') if 'RESULT' in l or 'FATAL' in l or 'FAILED' in l]
    summary = line[-1].strip() if line else (txt.strip().split('\n')[-1] if txt.strip() else 'NO OUTPUT')
    fails = [l for l in txt.split('\n') if 'FAIL' in l]
    out.append('%-28s %s' % (f, summary))
    if r.returncode != 0 if 'r' in dir() else False:
        bad.append(f)
    if fails:
        out.extend(['    ' + x.strip()[:160] for x in fails[:8]])
        bad.append(f)
io.open(BASE + r'\_out_regress.txt', 'w', encoding='utf-8').write('\n'.join(out))
print('\n'.join(out))
print('\nBAD:', bad)
sys.exit(1 if bad else 0)
