# -*- coding: utf-8 -*-
p = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = open(p, encoding='utf-8').read()

OLD = 'window.__appTest={renderModuleInsights:renderModuleInsights,'
NEW = 'window.__appTest={renderAll:renderAll,renderMoney:renderMoney,renderFitness:renderFitness,renderMoneyPie:renderMoneyPie,renderMoodCalendar:renderMoodCalendar,renderModuleInsights:renderModuleInsights,'

n = s.count(OLD)
if n != 1:
    raise SystemExit('ANCHOR MISMATCH count=%d' % n)
s = s.replace(OLD, NEW, 1)
open(p, 'w', encoding='utf-8').write(s)
print('V77b TEST-EXPORT APPLIED, len=', len(s))
