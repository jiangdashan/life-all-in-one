# -*- coding: utf-8 -*-
"""v52b：「怎么装」按钮打开外观面板时做异常隔离（面板打开失败不影响提示条收起）。"""
import io

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()
old = "        openBrandSettings();\n        setTimeout(function(){"
new = "        try{ openBrandSettings(); }catch(e){ console.error('openBrandSettings:', e); }\n        setTimeout(function(){"
assert s.count(old) == 1, s.count(old)
s = s.replace(old, new, 1)
io.open(P, "w", encoding="utf-8", newline="").write(s)
print("patched ok")
