# -*- coding: utf-8 -*-
import io

P = 'life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()

def sub(old, new, tag):
    global s
    n = s.count(old)
    assert n == 1, '锚点不唯一(%d): %s' % (n, tag)
    s = s.replace(old, new, 1)
    print('OK  ', tag)

# 1) 备份面板头部加功能说明块（朴素灰色小字，用现有 CSS 变量）
sub(
    '<div class="snap-head"><b>数据备份</b><small>每天首次同步后自动留一份快照，误清空时可按日期找回。</small></div>',
    '<div class="snap-head"><b>数据备份</b><small>每天首次同步后自动留一份快照，误清空时可按日期找回。</small></div>'
    '<div class="snap-help">'
      '<p class="snap-help-line"><b>同步</b>：把手机和云端的数据对一遍，两边互相补上缺的，不会删任何东西。</p>'
      '<p class="snap-help-line"><b>清空全部</b>：删光你的记账、待办、打卡、书影音等数据（本机和云端一起删），但<b>不删备份</b>。</p>'
      '<p class="snap-help-line"><b>立即备份</b>：现在手动存一份快照，作为后悔药。</p>'
      '<p class="snap-help-line"><b>从此恢复</b>：选某一天的快照，把后来弄丢或删掉的数据补回来（只补不删、不动设置）。</p>'
      '<p class="snap-help-note">误点「清空全部」后，来这里点「从此恢复」即可找回清空前的数据。</p>'
    '</div>',
    '备份面板功能说明'
)

# 2) 同步按钮 title 更直白
sub(
    'id="syncNowBtn" title="立即与云端同步数据"',
    'id="syncNowBtn" title="把手机和云端的数据对一遍，两边补缺，不删数据"',
    '同步按钮 title'
)

# 3) 清空按钮 title 更直白
sub(
    'id="clearSamplesBtn" title="清空全部数据"',
    'id="clearSamplesBtn" title="删光所有数据（本机和云端一起删），不删备份，删前会二次确认"',
    '清空按钮 title'
)

# 4) 加 CSS 样式（紧跟 .snap-box 区块后面插入）
sub(
    '.snap-box{border-top:1px solid var(--line);margin-top:14px;padding-top:14px;display:flex;flex-direction:column;gap:9px}',
    '.snap-box{border-top:1px solid var(--line);margin-top:14px;padding-top:14px;display:flex;flex-direction:column;gap:9px}\n'
    '  .snap-help{font-size:12px;color:var(--muted);line-height:1.7;margin-top:2px}\n'
    '  .snap-help-line{margin:2px 0}\n'
    '  .snap-help-line b{color:var(--ink);font-weight:600}\n'
    '  .snap-help-note{margin:6px 0 0;color:var(--muted);opacity:.9}',
    '说明块 CSS'
)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('DONE, new len', len(s))
