# -*- coding: utf-8 -*-
p = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = open(p, encoding='utf-8').read()
fails = []

MUST = [
 'repeat(7,minmax(0,1fr))',
 '.mood-calendar .cal-cell{min-height:38px;border-radius:9px;gap:1px}',
 '#paybackList .record-row{grid-template-columns:38px minmax(0,1fr) 30px;row-gap:3px;padding:10px 6px}',
 '#paybackList .record-row .record-main{grid-column:2;grid-row:1;min-width:0}',
 '#paybackList .record-amount{grid-column:2;grid-row:2;justify-self:start;font-size:12px;font-weight:650}',
 '#paybackList .record-row .delete-btn{grid-column:3;grid-row:1/span 2}',
 '#fitnessList .record-main small{max-width:100%;line-height:1.6;margin-top:3px}',
 '.record-main small .nb{white-space:nowrap}',
 'var _amtFs=Math.max(10,Math.min(20,Math.floor(72/_amlw)))',
 'font-size="${_amtFs}" font-weight="500" letter-spacing="-0.5"',
 'escapeHtml(_amtStr)',
 'nb">\'+escapeHtml(p)+\'</span>',
]
SHOULD_NOT = [
 '.mood-calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:6px',
 'font-size="20" font-weight="500" letter-spacing="-0.5">${escapeHtml(money(total))}',
 "const detail=parts.join(",
 '.mood-calendar .cal-cell{min-height:44px;border-radius:9px;gap:1px}',
]
for k in MUST:
    if k not in s:
        fails.append('MISS: ' + k[:90])
for k in SHOULD_NOT:
    if k in s:
        fails.append('STILL PRESENT: ' + k[:90])

# CSS 大括号平衡
i = s.find('<style'); j = s.find('</style>', i)
css = s[i:j]
if css.count('{') != css.count('}'):
    fails.append('CSS brace mismatch %d/%d' % (css.count('{'), css.count('}')))

print('MUST %d/%d checked' % (len(MUST) - len([f for f in fails if f.startswith('MISS')]), len(MUST)))
if fails:
    print('FAIL:')
    for f in fails: print('  ' + f)
    raise SystemExit(1)
print('V77 VERIFY ALL PASS (css braces %d/%d)' % (css.count('{'), css.count('}')))
