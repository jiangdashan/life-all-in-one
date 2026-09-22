# -*- coding: utf-8 -*-
import io, re, subprocess, sys

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
m = re.search(r'<script data-page-node-id="NWnaoiLqDuBK1LXGZoVUKl"[^>]*>(.*?)</script>', s, re.S)
assert m, 'main script not found'
js = m.group(1)
out = r'D:\workbuddyProjects\工作台3\_tools\_main_v75.js'
io.open(out, 'w', encoding='utf-8').write(js)
print('main js len', len(js))
node = r'C:\Users\依易亦奕鸭\.workbuddy\binaries\node\versions\22.22.2-3\node.exe'
r = subprocess.run([node, '--check', out], capture_output=True, text=True, encoding='utf-8')
print('node --check rc =', r.returncode)
if r.stdout:
    print(r.stdout[:2000])
if r.stderr:
    print(r.stderr[:2000])
sys.exit(r.returncode)
