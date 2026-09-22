# -*- coding: utf-8 -*-
import io, sys

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(PATH, encoding="utf-8").read()

edits = []

# 1) mergePlan 回读云端「象限」（与 done 同为云端优先，本地兜底）
a1 = "        quadrant:oldData.quadrant||''      /* v33 四象限 */"
b1 = "        quadrant:(r[\"\u50a2\u9650\"]!=null && r[\"\u50a2\u9650\"]!=='') ? r[\"\u50a2\u9650\"] : (oldData.quadrant||'')   /* v33 \u56db\u8c61\u9650\uff1a\u4e91\u7aef\u50a2\u9650\u4f18\u5148(\u4e0edone\u540c\u5148\u4f8b)\uff0c\u672c\u5730\u5151\u5e95\uff0c\u4fdd\u7559\u672a\u540c\u6b65/\u65e7\u672c\u5730\u503c */"
edits.append((a1, b1, "mergePlan-quadrant-read"))

# 2) 在 mergePlan 之后插入 backfillPlannerQuadrant
a2 = "    state.records = state.records.filter(function(r){return r.type!=='planner';}).concat(merged);\n  }\n\n  function mergeFitness(rows){"
b2 = (
"    state.records = state.records.filter(function(r){return r.type!=='planner';}).concat(merged);\n"
"  }\n\n"
"  /* v56b: \u4e00\u6b21\u6027\u56de\u586b\u2014\u2014\u628a\u672c\u5730\u5df2\u5206\u7c7b(\u6709 quadrant)\u4f46\u4e91\u7aef\u7f3a \u50a2\u9650 \u7684 planner \u8bb0\u5f55\u63a8\u5230\u4e91\u7aef\u3002\n"
"   * \u5386\u53f2\u539f\u56e0\uff1a\u50a2\u9650 \u5217\u66fe\u4e3a select \u4e14 merge \u4ece\u672a\u56de\u8bfb\uff0c\u5df2\u5206\u7c7b\u8bb0\u5f55\u5728\u9e3d\u8499\u7aef\u5168\u843d\u300c\u91cd\u8981\u7d27\u6025\u300d\u3002\n"
"   * \u73b0\u5df2\u6539 text \u5217 + merge \u56de\u8bfb\uff0c\u9700\u628a web \u7aef\u73b0\u6709\u672c\u5730\u50a2\u9650 \u8865\u5199\u4e00\u6b21\u3002\u6bcf\u8bbe\u5907\u4ec5\u8dd1\u4e00\u6b21(localStorage \u5b88\u536b)\uff0cONLINE \u672a\u5c31\u7eea\u4e0d\u7f6e\u4f4d\u4ee5\u514d\u6f0f\u63a8\u3002 */\n"
"  function backfillPlannerQuadrant(){\n"
"    try{ if(localStorage.getItem('richangji_planner_quad_backfilled')==='1') return; }catch(e){}\n"
"    if(!ONLINE || LOCAL_ONLY) return;\n"
"    var recs = state.records.filter(function(r){ return r.type==='planner' && r.remoteId && r.data && r.data.quadrant; });\n"
"    if(!recs.length){ try{ localStorage.setItem('richangji_planner_quad_backfilled','1'); }catch(e){} return; }\n"
"    var i=0;\n"
"    (function step(){\n"
"      if(i>=recs.length){ try{ localStorage.setItem('richangji_planner_quad_backfilled','1'); }catch(e){} return; }\n"
"      var r=recs[i++];\n"
"      updateRemotePlan(r);\n"
"      setTimeout(step, 250);\n"
"    })();\n"
"  }\n\n"
"  function mergeFitness(rows){"
)
edits.append((a2, b2, "backfill-fn"))

# 3) init \u5b8c\u6210\u540e\u89e6\u53d1\u56de\u586b
a3 = "  function authPostUnlockRehydrate(){\n    pullAllRemote(function(ok){\n      if(ok){ saveState(); renderAll(); }\n    });\n  }"
b3 = "  function authPostUnlockRehydrate(){\n    pullAllRemote(function(ok){\n      if(ok){ saveState(); renderAll(); backfillPlannerQuadrant(); }\n    });\n  }"
edits.append((a3, b3, "init-call"))

for old, new, name in edits:
    if old not in s:
        print("ANCHOR MISSING:", name)
        sys.exit(2)
    if new in s:
        print("ALREADY APPLIED (skip):", name)
        continue
    s = s.replace(old, new, 1)
    print("APPLIED:", name)

io.open(PATH, "w", encoding="utf-8").write(s)
print("DONE")
