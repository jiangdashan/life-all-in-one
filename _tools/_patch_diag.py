import io

p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()

marker = "{key:'sleep', name:'睡眠', id:DB_SLEEP}"
if marker in s:
    print('skip: already added')
else:
    idx = s.index('var DIAG_TABLES')
    end = s.index('];', idx)
    seg = s[idx:end]
    old = "{key:'period',  name:'经期',   id:DB_PERIOD}"
    assert seg.count(old) == 1, ('period entry', seg.count(old))
    new_seg = seg.replace(old, old + ",\n    " + marker)
    s = s[:idx] + new_seg + s[end:]
    io.open(p, 'w', encoding='utf-8').write(s)
    print('DIAG_TABLES + sleep added')

# verify
s2 = io.open(p, encoding='utf-8').read()
idx = s2.index('var DIAG_TABLES')
print(s2[idx:s2.index('];', idx)][-160:])
