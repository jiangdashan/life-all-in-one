import io, sys
p = 'life-all-in-one.html'
s = io.open(p, encoding='utf-8').read()

start = s.index("    const recipes=[")
endmark = ".join('')}" + chr(96) + ";"
end = s.index(endmark, start) + len(endmark)

R = [
    ("早餐", [
        ("燕麦酸奶杯", 320, "燕麦 40g + 无糖酸奶 + 蓝莓"),
        ("全麦三明治", 360, "全麦面包 + 鸡蛋 + 生菜 + 鸡胸肉"),
        ("水煮蛋玉米碗", 300, "鸡蛋 2 个 + 玉米 1 根 + 小番茄"),
        ("杂粮粥配鸡蛋", 330, "小米燕麦粥 + 水煮蛋 + 凉拌黄瓜"),
        ("牛油果吐司", 340, "全麦吐司 + 牛油果半个 + 溏心蛋"),
        ("豆浆荞麦面", 350, "无糖豆浆 + 荞麦面 60g + 青菜"),
        ("鸡胸蔬菜卷饼", 380, "全麦饼 + 鸡胸肉 80g + 生菜胡萝卜"),
        ("希腊酸奶水果碗", 300, "希腊酸奶 + 香蕉 + 坚果 10g"),
        ("红薯鸡蛋杯", 310, "红薯 150g + 鸡蛋 1 个 + 无糖豆浆"),
        ("虾仁蒸蛋全麦包", 330, "虾仁 50g + 蒸蛋 + 全麦包 1 片"),
    ]),
    ("午餐", [
        ("鸡胸肉杂粮饭", 420, "鸡胸肉 150g + 糙米饭 100g + 西兰花"),
        ("三文鱼沙拉", 380, "三文鱼 120g + 混合蔬菜 + 橄榄油"),
        ("虾仁藜麦碗", 400, "虾仁 100g + 藜麦 60g + 牛油果"),
        ("番茄牛腩饭", 480, "牛腩 100g + 米饭 100g + 番茄"),
        ("鸡腿时蔬便当", 450, "去皮鸡腿 120g + 杂粮饭 + 时蔬"),
        ("豆腐菌菇盖饭", 400, "北豆腐 150g + 杂菌 + 糙米饭"),
        ("鳕鱼藜麦沙拉", 390, "鳕鱼 120g + 藜麦 50g + 羽衣甘蓝"),
        ("牛肉西兰花炒饭", 460, "牛肉 100g + 糙米饭 + 西兰花"),
        ("鹰嘴豆蔬菜碗", 370, "鹰嘴豆 80g + 烤蔬菜 + 柠檬汁"),
        ("金枪鱼全麦卷", 350, "金枪鱼罐头 + 全麦饼 + 生菜"),
        ("香菇滑鸡饭", 430, "鸡腿肉 120g + 香菇 + 糙米饭"),
    ]),
    ("晚餐", [
        ("番茄鸡蛋面", 350, "全麦面 80g + 番茄 + 鸡蛋 2 个"),
        ("豆腐蔬菜汤", 280, "嫩豆腐 + 菌菇 + 时令蔬菜"),
        ("菌菇鸡汤", 300, "去皮鸡腿肉 + 杂菌 + 枸杞"),
        ("清蒸鲈鱼时蔬", 320, "鲈鱼 150g + 芦笋 + 胡萝卜"),
        ("虾仁炒西葫芦", 290, "虾仁 100g + 西葫芦 + 蒜末"),
        ("牛肉番茄汤", 340, "瘦牛肉 80g + 番茄 + 洋葱"),
        ("蒸蛋羹配菠菜", 260, "鸡蛋 2 个 + 菠菜 + 芝麻油"),
        ("鸡胸蔬菜沙拉", 310, "鸡胸 120g + 生菜 + 油醋汁"),
        ("白灼虾杂粮饭", 380, "基围虾 150g + 杂粮饭 80g"),
        ("冬瓜排骨汤", 330, "排骨 80g + 冬瓜 + 姜片"),
        ("烤三文鱼芦笋", 400, "三文鱼 120g + 芦笋 + 柠檬"),
    ]),
    ("加餐", [
        ("无糖希腊酸奶", 120, "无糖希腊酸奶 150g"),
        ("混合坚果", 160, "杏仁 + 核桃 共 20g"),
        ("苹果", 95, "中等大小苹果 1 个"),
        ("水煮蛋", 78, "鸡蛋 1 个"),
        ("无糖豆浆", 80, "无糖豆浆 250ml"),
        ("蓝莓", 85, "蓝莓 100g"),
        ("全麦饼干", 140, "全麦饼干 2 片"),
        ("低脂牛奶", 110, "低脂牛奶 250ml"),
        ("小番茄", 40, "小番茄 150g"),
        ("黄瓜条", 30, "黄瓜 1 根切条"),
    ]),
]

lib_lines = []
for meal, items in R:
    for n, c, d in items:
        lib_lines.append("      {name:'%s',cal:%d,desc:'%s',meal:'%s'}" % (n, c, d, meal))
lib = ",\n".join(lib_lines)

BT = chr(96)  # backtick

new = (
    "    /* v48：菜谱库扩充至每餐 >=10 道，并保证每次至少推荐 10 道（旧版每餐仅 2-3 道、加餐时段空白） */\n"
    "    const recipes=[\n" + lib + "\n    ];\n"
    "    const hour=new Date().getHours();\n"
    "    const currentMeal=hour<10?'早餐':hour<14?'午餐':hour<21?'晚餐':'加餐';\n"
    "    const mealRecipes=recipes.filter(r=>r.meal===currentMeal);\n"
    "    const pool=mealRecipes.length?mealRecipes:recipes;\n"
    "    const byFit=(a,b)=>Math.abs(a.cal-remaining)-Math.abs(b.cal-remaining);\n"
    "    const suit=pool.filter(r=>r.cal<=remaining+120).sort(byFit);\n"
    "    const rest=pool.filter(r=>suit.indexOf(r)<0).sort(byFit);\n"
    "    const MIN_RECIPES=10;\n"
    "    const suggestions=suit.concat(rest).slice(0,MIN_RECIPES);\n"
    "    if(!suggestions.length){card.innerHTML='';return;}\n"
    "    card.innerHTML=" + BT + "<span class=\"ai-badge\">AI 菜谱推荐</span><h3>${currentMeal}推荐 · 剩余 ${remaining} kcal</h3>"
    "<p>今日已摄入 ${todayCalories} kcal，目标 ${target} kcal。为你精选 ${suggestions.length} 道菜谱，按贴合当前热量缺口排序：</p>"
    "<div class=\"recipe-list\">${suggestions.map(r=>{const fit=r.cal<=remaining+120;"
    "return`<div class=\"recipe-suggestion${fit?'':' over'}\"><strong>${r.name}</strong><small>${r.desc}</small>"
    "<span class=\"calories-tag\">约 ${r.cal} kcal</span>${fit?'':'<span class=\"cal-over-tag\">略超当前缺口</span>'}</div>`;})"
    ".join('')}</div>" + BT + ";"
)

s = s[:start] + new + s[end:]

oldcss = ".recipe-suggestion .calories-tag{display:inline-block;padding:2px 7px;border-radius:6px;background:var(--sage-soft);color:var(--sage);font-size:9px;font-weight:700;margin-top:4px}"
assert s.count(oldcss) == 1, ('css count', s.count(oldcss))
newcss = oldcss + ".recipe-list{max-height:360px;overflow-y:auto;margin-top:6px;padding-right:2px}.recipe-suggestion.over{opacity:.82}.recipe-suggestion .cal-over-tag{display:inline-block;padding:2px 7px;border-radius:6px;background:var(--sand-soft);color:var(--muted);font-size:9px;font-weight:700;margin-top:4px;margin-left:5px}"
s = s.replace(oldcss, newcss)

io.open(p, 'w', encoding='utf-8').write(s)
print("OK recipes patched; recipes count:", sum(len(x[1]) for x in R))
