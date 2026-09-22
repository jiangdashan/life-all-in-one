# -*- coding: utf-8 -*-
"""v73：补导出档案导航与倒数日的函数给冒烟测试"""
import io, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()

OLD = "rolloverWeeklyPlan:rolloverWeeklyPlan,isoWeekStart:isoWeekStart,"
NEW = ("rolloverWeeklyPlan:rolloverWeeklyPlan,isoWeekStart:isoWeekStart,"
       "_archCursor:_archCursor,_archiveStep:_archiveStep,_archiveGoto:_archiveGoto,renderArchiveNav:renderArchiveNav,"
       "_cdNextOccur:_cdNextOccur,_cdBuiltin:_cdBuiltin,_cdDaysTo:_cdDaysTo,_cdLunarToSolar:_cdLunarToSolar,"
       "_cdNthWeekday:_cdNthWeekday,_cdWeekday:_cdWeekday,_cdList:_cdList,_cdMergeList:_cdMergeList,"
       "addCountdown:addCountdown,deleteCountdown:deleteCountdown,renderCountdown:renderCountdown,"
       "CD_LUNAR_FESTIVALS:CD_LUNAR_FESTIVALS,CD_SOLAR_FESTIVALS:CD_SOLAR_FESTIVALS,solarLunar:solarLunar,")

n = s.count(OLD)
if n != 1:
    print("FAIL anchor count=%d" % n); sys.exit(1)
s = s.replace(OLD, NEW, 1)
io.open(P, "w", encoding="utf-8", newline="").write(s)
print("OK v73 exports added")
