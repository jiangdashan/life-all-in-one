# -*- coding: utf-8 -*-
import io, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(PATH, encoding="utf-8").read()

edits = []

# 暴露 mergePlan 便于单测回读
a1 = "mergePlanList:mergePlanList,"
b1 = "mergePlan:mergePlan,mergePlanList:mergePlanList,"
edits.append((a1, b1, "export-mergePlan"))

# 暴露 backfillPlannerQuadrant 便于单测回填
a2 = "syncPendingRecords:syncPendingRecords,"
b2 = "syncPendingRecords:syncPendingRecords,backfillPlannerQuadrant:backfillPlannerQuadrant,"
edits.append((a2, b2, "export-backfill"))

for old, new, name in edits:
    if old not in s:
        print("ANCHOR MISSING:", name); sys.exit(2)
    if new in s:
        print("ALREADY APPLIED (skip):", name); continue
    s = s.replace(old, new, 1)
    print("APPLIED:", name)

io.open(PATH, "w", encoding="utf-8").write(s)
print("DONE")
