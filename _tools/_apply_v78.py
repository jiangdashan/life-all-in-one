# -*- coding: utf-8 -*-
"""v78：修复移动端回本金额/体重压到下一条。
根因：.record-list{max-height:520px;overflow:auto} 是 flex 纵向列表，
.record-row 作为 flex 子项默认 flex-shrink:1 —— 条目一多每行被压缩到
min-height:62px，而 v76/v77 把金额/体重移到网格第二行后行自然高 ~80px，
溢出部分（overflow:visible）压进下一条。
修法：.record-row 加 flex-shrink:0，行保持自然高度、容器滚动。
"""
import sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
OLD = ".record-row{display:grid;grid-template-columns:42px 1fr auto 32px;gap:12px;align-items:center;min-height:62px;padding:8px 6px;border-bottom:1px solid #e3e6ea}"
NEW = ".record-row{display:grid;grid-template-columns:42px 1fr auto 32px;gap:12px;align-items:center;min-height:62px;padding:8px 6px;border-bottom:1px solid #e3e6ea;flex-shrink:0}"

s = open(P, encoding="utf-8").read()
n = s.count(OLD)
if n != 1:
    print("ANCHOR COUNT =", n, "—— 终止，不写入"); sys.exit(1)
s = s.replace(OLD, NEW)

# 断言（文件里本就有其它 flex-shrink:0，只要求 record-row 规则含它且旧规则已消失）
assert NEW in s and OLD not in s
assert s.count(".record-row{display:grid;grid-template-columns:42px 1fr auto 32px;gap:12px;align-items:center;min-height:62px;padding:8px 6px;border-bottom:1px solid #e3e6ea;flex-shrink:0}") == 1
# CSS 括号平衡（两个 style 块）
k, total = 0, 0
while True:
    a = s.find("<style", k)
    if a < 0: break
    b = s.find("</style>", a)
    css = s[a:b]
    assert css.count("{") == css.count("}"), "style 括号不平衡 @%d" % a
    total += 1; k = b + 1
assert total == 2, "应有 2 个 style 块"

open(P, "w", encoding="utf-8").write(s)
print("OK: patch applied, styles:", total, ", len:", len(s))
