#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import io, sys
PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
src = io.open(PATH, "r", encoding="utf-8").read()
old = "renderArchive:renderArchive,_archiveWeekHtml:_archiveWeekHtml,"
new = ("renderArchive:renderArchive,"
       "_archiveWeekHtml:_archiveWeekHtml,"
       "analyzePlannerRepeats:analyzePlannerRepeats,renderPlannerRepeats:renderPlannerRepeats,maybeAutoNextRepeat:maybeAutoNextRepeat,"
       "pomoSetLen:pomoSetLen,pomoFinish:pomoFinish,renderPomo:renderPomo,_pomo:_pomo,")
if src.count(old) != 1:
    print("anchor fail:", src.count(old)); sys.exit(1)
src = src.replace(old, new, 1)
io.open(PATH, "w", encoding="utf-8", newline="").write(src)
print("exports added")
