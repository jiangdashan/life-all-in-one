# -*- coding: utf-8 -*-
p = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = open(p, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit('ANCHOR MISMATCH count=%d expected=%d\nOLD=%r' % (n, count, old[:120]))
    s = s.replace(old, new, count)

# 1) 心情月历：7 列 grid 强制可收缩，防止第 7 列（六）溢出屏外
rep(
 '.mood-calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:6px}',
 '.mood-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:6px}'
)
# 2) 移动端格子最小高度降一档，进一步减轻最小宽压力
rep(
 '.mood-calendar .cal-cell{min-height:44px;border-radius:9px;gap:1px}',
 '.mood-calendar .cal-cell{min-height:38px;border-radius:9px;gap:1px}'
)

# 3) 身体日志行距 + 回本物品明细移动端布局（金额移到第二行）
rep(
 '#fitnessList .record-main small{max-width:100%}\n      /* 心情月历：缩小格子最小尺寸（旧 44px 最小宽会把第 7 列「星期六」挤出屏外） */',
 '#fitnessList .record-main small{max-width:100%;line-height:1.6;margin-top:3px}\n'
 '      /* 回本物品明细：金额移到第二行，名称与详情占满整行不再被挤压 */\n'
 '      #paybackList .record-row{grid-template-columns:38px minmax(0,1fr) 30px;row-gap:3px;padding:10px 6px}\n'
 '      #paybackList .record-row .record-icon{grid-row:1/span 2}\n'
 '      #paybackList .record-row .record-main{grid-column:2;grid-row:1;min-width:0}\n'
 '      #paybackList .record-amount{grid-column:2;grid-row:2;justify-self:start;font-size:12px;font-weight:650}\n'
 '      #paybackList .record-row .btn.compact{grid-column:2;grid-row:3;justify-self:start;margin-top:2px}\n'
 '      #paybackList .record-row .delete-btn{grid-column:3;grid-row:1/span 2}\n'
 '      #paybackList .record-main small{max-width:100%}\n'
 '      /* 心情月历：缩小格子最小尺寸（旧 44px 最小宽会把第 7 列「星期六」挤出屏外） */'
)

# 4) 指标项不拆词：每个指标包 nb span，只在「 · 」处换行
rep(
 '.record-main small{margin-top:2px;color:#84898f;font-size:10px}',
 '.record-main small{margin-top:2px;color:#84898f;font-size:10px}.record-main small .nb{white-space:nowrap}'
)

# 5) fitnessRow：指标用 nb span 包裹，避免「体脂肪」被从中间截断
rep(
 "const detail=parts.join(' \u00b7 ');",
 "const detail=parts.map(function(p){return '<span class=\"nb\">'+escapeHtml(p)+'</span>';}).join(' \u00b7 ');"
)

# 6) 消费结构圆环数字自适应字号（内圆直径 80px，可用约 72px）
rep(
 "const circumference=2*Math.PI*72;let offset=0;",
 "const circumference=2*Math.PI*72;let offset=0;var _amtStr=money(total);var _amlw=0;for(var _k=0;_k<_amtStr.length;_k++){var _c=_amtStr[_k];_amlw+=/[0-9]/.test(_c)?0.556:(_c==='.'||_c===',')?0.28:(_c==='\u00a5'?0.62:0.9);}var _amtFs=Math.max(10,Math.min(20,Math.floor(72/_amlw)));"
)
rep(
 'font-size="20" font-weight="500" letter-spacing="-0.5">${escapeHtml(money(total))}',
 'font-size="${_amtFs}" font-weight="500" letter-spacing="-0.5">${escapeHtml(_amtStr)}'
)

open(p, 'w', encoding='utf-8').write(s)
print('V77 APPLIED OK, len=', len(s))
