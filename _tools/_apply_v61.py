# -*- coding: utf-8 -*-
"""v61 自动封面文字清晰度优化：降字重 + 调字号 + 补中文字体栈"""
import io, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()
orig = s
log = []

def rep(tag, old, new):
    global s
    n = s.count(old)
    if n != 1:
        print("FAIL[%s] anchor count=%d expect=1" % (tag, n))
        sys.exit(2)
    s = s.replace(old, new, 1)
    log.append(tag)

# ---- R1 svg 根：开启精确字形渲染 ----
A1 = "'<svg viewBox=\"0 0 90 120\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-label=\"'"
B1 = "'<svg viewBox=\"0 0 90 120\" xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" text-rendering=\"geometricPrecision\" aria-label=\"'"
rep("R1-render", A1, B1)

# ---- R2 mini 模式首字：去粗体、降透明度 ----
A2 = "      return head+bg+'<text class=\"cover-ini\" x=\"47\" y=\"75\" text-anchor=\"middle\" font-size=\"46\" font-weight=\"700\" fill=\"'+p.bar+'\" opacity=\".32\" font-family=\"Songti SC,STSong,serif\">'+escapeHtml(ini)+'</text></svg>';"
B2 = "      return head+bg+'<text class=\"cover-ini\" x=\"47\" y=\"74\" text-anchor=\"middle\" font-size=\"44\" font-weight=\"400\" fill=\"'+p.bar+'\" opacity=\".24\" font-family=\"Songti SC,STSong,serif\">'+escapeHtml(ini)+'</text></svg>';"
rep("R2-mini", A2, B2)

# ---- R3 full 模式三行文字 ----
A3 = ("      +'<text class=\"cover-ini\" x=\"13\" y=\"52\" font-size=\"40\" font-weight=\"700\" fill=\"'+p.bar+'\" opacity=\".3\" font-family=\"Songti SC,STSong,serif\">'+escapeHtml(ini)+'</text>'\n"
      "      +lines.map(function(l,i){return '<text class=\"cover-t\" x=\"13\" y=\"'+(78+i*12)+'\" font-size=\"10\" font-weight=\"700\" fill=\"'+p.ink+'\" font-family=\"-apple-system,PingFang SC,Microsoft YaHei,sans-serif\">'+escapeHtml(l)+'</text>';}).join('')\n"
      "      +'<text class=\"cover-type\" x=\"13\" y=\"112\" font-size=\"7\" fill=\"'+p.bar+'\" opacity=\".85\" font-family=\"-apple-system,PingFang SC,sans-serif\">'+escapeHtml(String(type||''))+'</text>'")
B3 = ("      +'<text class=\"cover-ini\" x=\"13\" y=\"50\" font-size=\"34\" font-weight=\"400\" fill=\"'+p.bar+'\" opacity=\".22\" font-family=\"Songti SC,STSong,serif\">'+escapeHtml(ini)+'</text>'\n"
      "      +lines.map(function(l,i){return '<text class=\"cover-t\" x=\"13\" y=\"'+(76+i*11.5)+'\" font-size=\"9.5\" font-weight=\"500\" fill=\"'+p.ink+'\" font-family=\"-apple-system,'PingFang SC','HarmonyOS Sans SC',MiSans,sans-serif\">'+escapeHtml(l)+'</text>';}).join('')\n"
      "      +'<text class=\"cover-type\" x=\"13\" y=\"113\" font-size=\"9\" fill=\"'+p.bar+'\" opacity=\".7\" font-family=\"-apple-system,'PingFang SC','HarmonyOS Sans SC',MiSans,sans-serif\">'+escapeHtml(String(type||''))+'</text>'")
rep("R3-full", A3, B3)

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("OK applied:", ",".join(log))
print("size %d -> %d (%+d)" % (len(orig), len(s), len(s) - len(orig)))
