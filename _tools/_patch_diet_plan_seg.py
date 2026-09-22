# -*- coding: utf-8 -*-
"""v51b: 自愈判定升级为「片段匹配」

真实数据里用户点「吃这餐」后会在预填文本上继续加东西（如计划「饺子馄饨汤底+水煮蛋」
实际记录为「饺子馄饨汤底+咸奶茶+可可麦芬+水煮蛋2+魔芋爽6」），整串包含匹配不到。

改为：把计划文本按 + ＋ , ， 、 ; ； / | 空白 切片段（长度>=2），
若记录中「全部片段都出现」→ 视为已吃；单片段计划仍用整串包含兜底。
"""
import io, sys

P = 'life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig = len(s)


def must(cond, msg):
    if not cond:
        print('FAIL:', msg)
        sys.exit(1)


old = (
    "  function _dietPlanEatenByRecord(p){\n"
    "    if(!p) return false;\n"
    "    if(p.done) return true;\n"
    "    var txt = String(p.text||'').trim();\n"
    "    if(!txt) return false;\n"
    "    var pd = String(p.date||''), pat = Number(p.at||0)||0;\n"
    "    return (state.records||[]).some(function(r){\n"
    "      if(!r || r.type!=='diet' || !r.data) return false;\n"
    "      if(String(r.data.food||'').trim() !== txt) return false;\n"
    "      var rd = String(r.date||'');\n"
    "      if(pd && rd < pd) return false;\n"
    "      if(pd && rd === pd && pat && Number(r.createdAt||0) < pat) return false;\n"
    "      return true;\n"
    "    });\n"
    "  }\n"
)
must(s.count(old) == 1, 'helper anchor=%d' % s.count(old))

new = (
    "  function _dietPlanEatenByRecord(p){\n"
    "    if(!p) return false;\n"
    "    if(p.done) return true;\n"
    "    var txt = String(p.text||'').trim();\n"
    "    if(!txt) return false;\n"
    "    /* 片段化：用户点「吃这餐」后往往在预填文本上继续添加食物（如\n"
    "     * 计划「饺子馄饨汤底+水煮蛋」实际记成「饺子馄饨汤底+咸奶茶+…+水煮蛋2」），\n"
    "     * 整串包含匹配不到，因此按片段判定：记录里「全部片段都出现」即视为已吃。 */\n"
    "    var segs = txt.split(/[\\+＋,，、;；|\\/\\s]+/).map(function(x){ return x.trim(); })\n"
    "                  .filter(function(x){ return x.length >= 2; });\n"
    "    if(!segs.length) segs = [txt];\n"
    "    var pd = String(p.date||''), pat = Number(p.at||0)||0;\n"
    "    return (state.records||[]).some(function(r){\n"
    "      if(!r || r.type!=='diet' || !r.data) return false;\n"
    "      var rd = String(r.date||'');\n"
    "      if(pd && rd < pd) return false;\n"
    "      if(pd && rd === pd && pat && Number(r.createdAt||0) < pat) return false;\n"
    "      var food = String(r.data.food||'');\n"
    "      if(food.indexOf(txt) >= 0) return true;\n"
    "      if(segs.length < 2) return false;\n"
    "      for(var i=0;i<segs.length;i++){ if(food.indexOf(segs[i]) < 0) return false; }\n"
    "      return true;\n"
    "    });\n"
    "  }\n"
)
s = s.replace(old, new)

io.open(P, 'w', encoding='utf-8').write(s)
print('OK segment heuristic. %d -> %d chars' % (orig, len(s)))
