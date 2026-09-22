# -*- coding: utf-8 -*-
"""v50: 饮食页布局调整
左侧( module-layout 第一列 )只保留「今日三餐 / 记下这一餐」表单；
其余全部放入右侧( module-main )，顺序：份量参考 → 计划吃什么 → AI菜谱推荐 → 今日指标 + 饮食记录。
并移除写死高度（recipe-list 360px / dietList 520px），改为自适应。
"""
import io, re, sys

P = 'life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()
orig_len = len(s)


def extract_block(text, class_name, tag='div'):
    """从 text 中按 class 定位元素，返回 (start, end, block)；按同标签嵌套配平。"""
    m = re.search(r'class="[^"]*\b%s\b[^"]*"' % re.escape(class_name), text)
    if not m:
        raise RuntimeError('class not found: ' + class_name)
    i = m.start()
    start = text.rindex('<' + tag, 0, i)
    depth = 0
    pos = start
    open_pat = re.compile(r'<%s\b' % tag)
    close_pat = re.compile(r'</%s>' % tag)
    while True:
        mo = open_pat.search(text, pos)
        mc = close_pat.search(text, pos)
        if mc is None:
            raise RuntimeError('unbalanced tag for ' + class_name)
        if mo and mo.start() < mc.start():
            depth += 1
            pos = mo.end()
        else:
            depth -= 1
            pos = mc.end()
            if depth == 0:
                return start, pos, text[start:pos]


def must(cond, msg):
    if not cond:
        print('FAIL:', msg)
        sys.exit(1)


# ---------- 1. 切出三个面板 ----------
plan = extract_block(s, 'diet-plan-section', 'div')
ai = extract_block(s, 'ai-recipe-card', 'div')
fist = extract_block(s, 'fist-guide-panel', 'article')

# 从后往前删，避免索引失效
for st, en, blk in sorted([plan, ai, fist], key=lambda x: -x[0]):
    s = s[:st] + s[en:]

# 删完后原本 block 之间的换行空白可能残留，做一次轻量清理（只针对 view-diet 区）
i0 = s.index('id="view-diet"')
i1 = s.index('id="view-storage"')
diet_seg = s[i0:i1]
diet_seg = re.sub(r'\n[ \t]*\n', '\n', diet_seg)
s = s[:i0] + diet_seg + s[i1:]

# ---------- 2. 插入到 module-main 内部最前 ----------
i0 = s.index('id="view-diet"')
i1 = s.index('id="view-storage"')
seg = s[i0:i1]
mm = seg.index('class="module-main"')
gt = seg.index('>', mm) + 1

blocks = '\n' + fist[2].strip() + '\n' + plan[2].strip() + '\n' + ai[2].strip() + '\n'
seg2 = seg[:gt] + blocks + seg[gt:]
s = s[:i0] + seg2 + s[i1:]

# ---------- 3. CSS：去写死高度 + 右侧 flex 内边距归零 ----------
old_recipe = '.recipe-list{max-height:360px;overflow-y:auto;margin-top:6px;padding-right:2px}'
must(s.count(old_recipe) == 1, 'recipe-list css count=%d' % s.count(old_recipe))
new_recipe = '.recipe-list{margin-top:6px;padding-right:2px}'
s = s.replace(old_recipe, new_recipe)

anchor = '.fist-items{gap:6px 12px}'
must(s.count(anchor) == 1, 'fist anchor count=%d' % s.count(anchor))
extra = (
    anchor +
    '.module-main>.diet-plan-section,.module-main>.ai-recipe-card{margin:0}'
    '.module-main>.fist-guide-panel,.module-main>.diet-plan-section,'
    '.module-main>.ai-recipe-card{min-width:0}'
    '#dietList{max-height:none;overflow:visible}'
)
s = s.replace(anchor, extra)

io.open(P, 'w', encoding='utf-8').write(s)
print('OK layout patched. %d -> %d chars' % (orig_len, len(s)))
