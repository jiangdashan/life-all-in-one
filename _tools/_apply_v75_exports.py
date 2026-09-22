# -*- coding: utf-8 -*-
import io

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()

OLD = '__appTest={storageIcon:storageIcon,'
NEW = '__appTest={renderModuleInsights:renderModuleInsights,_miSet:_miSet,_miMoney:_miMoney,_miHabits:_miHabits,_miFitness:_miFitness,_miSleep:_miSleep,_miStudy:_miStudy,_miPlanner:_miPlanner,_miHome:_miHome,_miDiet:_miDiet,_miStorage:_miStorage,_miPayback:_miPayback,empty:empty,storageIcon:storageIcon,'
assert s.count(OLD) == 1, s.count(OLD)
s = s.replace(OLD, NEW, 1)
io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('exports added')
