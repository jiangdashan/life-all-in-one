# -*- coding: utf-8 -*-
"""v72：补导出冒烟测试需要访问的函数"""
import io, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()

OLD = "_archiveOpenDay:_archiveOpenDay"
NEW = ("_archiveOpenDay:_archiveOpenDay,"
       "plannerPrioRank:plannerPrioRank,sortPlannerByPriority:sortPlannerByPriority,"
       "renderPlanner:renderPlanner,renderQuadrant:renderQuadrant,"
       "rolloverWeeklyPlan:rolloverWeeklyPlan,isoWeekStart:isoWeekStart,"
       "renderStorageLocFilters:renderStorageLocFilters,renderStorageLocGroups:renderStorageLocGroups,"
       "renderPomo:renderPomo,pomoFinish:pomoFinish,pomoReset:pomoReset,"
       "saveState:saveState")

n = s.count(OLD)
if n != 1:
    print("FAIL anchor count=%d" % n); sys.exit(1)
s = s.replace(OLD, NEW, 1)
io.open(P, "w", encoding="utf-8", newline="").write(s)
print("OK exports added")
