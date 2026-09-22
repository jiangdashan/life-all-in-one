#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v84b：同步链路覆盖面修复。
1) init：pullAllRemote 失败（桥慢/限流）时不再整体跳过补传与删除重试；
   syncPendingDeletes 移出 n>0 嵌套（此前补传为 0 时删除重试永远不跑）。
2) authPostUnlockRehydrate（桥就绪晚于首屏、解锁后重拉的唯一路径）：
   补上 syncPendingRecords + syncPendingDeletes——此前只拉不推，
   手机端(standalone 桥慢)卡住的记录永远没有第二次上传机会 → 两端条数漂移。"""
import io

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
src = io.open(PATH, encoding="utf-8").read()
orig_len = len(src)
applied = []

def rep(old, new, tag):
    global src
    assert src.count(old) == 1, "anchor not unique (%s): count=%d" % (tag, src.count(old))
    src = src.replace(old, new)
    applied.append(tag)

# ---- 1. init 链尾 ----
old_init = (
    "pullAllRemote(function(ok){ if(ok){ saveState(); renderAll(); "
    "syncPendingRecords(function(n){ if(n>0){ saveState(); setTimeout(function(){ saveState(); renderAll(); "
    "toast('已补传 '+n+' 条未同步数据到云端'); }, 2500); "
    "syncPendingDeletes(function(dn){ if(dn>0){ saveState(); renderAll(); toast('已清理 '+dn+' 条云端残留记录'); } }); } }); } }); });"
)
new_init = (
    "pullAllRemote(function(ok){ if(ok){ saveState(); renderAll(); } "
    "/* v84: 补传/清理不再以拉取成功为前提——桥慢或个别表限流时，本地滞留数据仍要重试；"
    "删除重试移出 n>0 嵌套（此前补传为 0 时永远不跑） */ "
    "syncPendingRecords(function(n){ if(n>0){ saveState(); setTimeout(function(){ saveState(); renderAll(); "
    "toast('已补传 '+n+' 条未同步数据到云端'); }, 2500); } "
    "syncPendingDeletes(function(dn){ if(dn>0){ saveState(); renderAll(); toast('已清理 '+dn+' 条云端残留记录'); } }); }); }); });"
)
rep(old_init, new_init, "init-chain")

# ---- 2. authPostUnlockRehydrate ----
old_reh = (
    "  function authPostUnlockRehydrate(){\n"
    "    pullAllRemote(function(ok){\n"
    "      if(ok){ saveState(); renderAll(); backfillPlannerQuadrant(); }\n"
    "    });\n"
    "  }"
)
new_reh = (
    "  function authPostUnlockRehydrate(){\n"
    "    /* v84: 补上滞留数据补传/删除重试——此前只拉不推，桥就绪晚于首屏时（手机 standalone 常见），\n"
    "     * 本地卡住的记录（含 v84 前漏链的 sleep）永远没有第二次上传机会，两端条数因此漂移 */\n"
    "    pullAllRemote(function(ok){\n"
    "      if(ok){ saveState(); renderAll(); backfillPlannerQuadrant(); }\n"
    "      syncPendingRecords(function(n){\n"
    "        if(n>0){ saveState(); setTimeout(function(){ saveState(); renderAll(); toast('已补传 '+n+' 条未同步数据到云端'); }, 2500); }\n"
    "        syncPendingDeletes(function(dn){ if(dn>0){ saveState(); renderAll(); toast('已清理 '+dn+' 条云端残留记录'); } });\n"
    "      });\n"
    "    });\n"
    "  }"
)
rep(old_reh, new_reh, "rehydrate-sync")

io.open(PATH, "w", encoding="utf-8").write(src)

chk = io.open(PATH, encoding="utf-8").read()
assert chk.count("v84: 补传/清理不再以拉取成功为前提") == 1
assert chk.count("v84: 补上滞留数据补传/删除重试") == 1
assert chk.count("syncPendingDeletes(function(dn){") == 2
print("OK applied=%d len %d -> %d" % (len(applied), orig_len, len(chk)))
for t in applied:
    print(" -", t)
