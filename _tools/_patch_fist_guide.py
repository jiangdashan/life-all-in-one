# -*- coding: utf-8 -*-
"""v49-4: 饮食模块新增「拳头法」份量对照表。"""
import io

p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()

GROUPS = [
    ("一拳头碳水", "约 130 kcal", "#b08a3e", [
        ("白米饭", "半碗"), ("糙米饭", "半碗"), ("面条", "半碗（煮好）"), ("红薯", "中等 1 个"),
        ("玉米", "半根"), ("全麦面包", "1 片"), ("燕麦", "40g 干重"), ("杂粮粥", "1 碗"),
    ]),
    ("一掌心蛋白质", "约 100–120 kcal", "#b0524a", [
        ("鸡胸肉", "煮熟后比手掌薄一片"), ("牛瘦肉", "比手掌略小一圈"), ("鱼 / 虾", "和手掌差不多大"),
        ("北豆腐", "一块麻将盒大小"), ("鸡蛋", "1 个（约 70 kcal）"), ("无糖豆浆", "250ml"), ("希腊酸奶", "150g"),
    ]),
    ("一大拇指脂肪", "约 90–130 kcal", "#5f8a70", [
        ("食用油", "1 汤匙"), ("花生 / 杏仁", "15–20 颗"), ("牛油果", "1/4 个"),
        ("核桃", "2 个（去壳）"), ("芝麻酱", "1 汤匙"),
    ]),
    ("两捧蔬菜", "约 50 kcal", "#639922", [
        ("菠菜 / 生菜", "两捧"), ("西兰花", "半棵"), ("黄瓜", "1 根"),
        ("番茄", "1 个"), ("胡萝卜", "1 根"), ("芦笋", "一小把"),
    ]),
    ("一拳水果", "约 60–80 kcal", "#c0a79a", [
        ("苹果", "半个"), ("香蕉", "半根"), ("蓝莓", "100g"), ("小番茄", "150g"), ("橙子", "1 个"),
    ]),
    ("一杯乳制品", "约 100–150 kcal", "#4a7aa8", [
        ("低脂牛奶", "250ml"), ("无糖酸奶", "150g"), ("奶酪", "1 片"),
    ]),
]

rows = []
for title, kcal, color, items in GROUPS:
    lis = "".join(
        '<span class="fist-item"><b>%s</b>%s</span>' % (n, q) for n, q in items
    )
    rows.append(
        '<div class="fist-group">'
        '<div class="fist-group-head"><i class="fist-dot" style="background:%s"></i>'
        '<b>%s</b><span class="fist-kcal">%s</span></div>'
        '<div class="fist-items">%s</div></div>' % (color, title, kcal, lis)
    )

panel = (
    '<article class="panel fist-guide-panel">'
    '<div class="panel-head"><div><p class="eyebrow">份量参考</p><h2>拳头法对照表</h2></div></div>'
    '<p class="fist-tip">不用称重，用手估量：每餐建议 <b>1 拳主食 + 1 掌心蛋白 + 2 捧蔬菜 + 1 拇指脂肪</b>，'
    '水果与乳制品放在加餐。</p>'
    + "".join(rows) +
    '</article>'
)

anchor = '<div data-page-node-id="rkl7dRriCOotBaFSoYsygc" class="ai-recipe-card" id="dietAIRecipe"></div>'
assert s.count(anchor) == 1, ('anchor', s.count(anchor))
s = s.replace(anchor, anchor + '\n' + panel)

CSS = (
    ".fist-guide-panel .fist-tip{margin:0 0 2px;font-size:12px;line-height:1.7;color:#8b9096}"
    ".fist-guide-panel .fist-tip b{font-weight:500;color:#5f5e5a}"
    ".fist-group{border-top:1px solid var(--line);padding:10px 0}"
    ".fist-group:last-child{padding-bottom:0}"
    ".fist-group-head{display:flex;align-items:center;gap:7px;margin-bottom:7px}"
    ".fist-dot{width:8px;height:8px;border-radius:50%;flex:none}"
    ".fist-group-head b{font-size:13px;font-weight:500}"
    ".fist-kcal{font-size:11px;color:#8b9096}"
    ".fist-items{display:flex;flex-wrap:wrap;gap:6px 14px}"
    ".fist-item{font-size:12px;color:#8b9096}"
    ".fist-item b{font-weight:500;color:#2c2c2a;margin-right:5px}"
    "@media(max-width:768px){.fist-items{gap:6px 12px}}"
)

i = s.index('</style>')
s = s[:i] + CSS + s[i:]

io.open(p, 'w', encoding='utf-8').write(s)
print('OK fist guide inserted. groups=%d' % len(GROUPS))
