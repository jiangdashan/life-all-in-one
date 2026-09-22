# -*- coding: utf-8 -*-
"""生成 _smoke_v71.js：复用 v70 沙箱头部，测试周历/月历点击展开当天全部"""
import io

SRC = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v70.js'
OUT = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v71.js'

L = io.open(SRC, encoding='utf-8').read().split('\n')
head_end = None
for i, l in enumerate(L):
    if 'const T = w.__appTest' in l:
        head_end = i
        break
assert head_end is not None
head = '\n'.join(L[:head_end + 1])

body = u"""
  // ---------- 1. 样式与结构 ----------
  ok('1a 详情面板 CSS 存在', html.indexOf('.arch-sheet-wrap{position:fixed') > 0);
  ok('1b 移动端底部抽屉样式', html.indexOf('@media(max-width:560px){.arch-sheet{left:0;right:0;top:auto;bottom:0') > 0);
  ok('1c 可点元素有手型指针', html.indexOf('.aw-day,.aw-col,.am-cell,.aw-more,.am-more{cursor:pointer}') > 0);
  ok('1d 新函数已导出', ['_archiveOpenDay', '_archiveCloseDay', '_archiveDayItemsHtml', '_archiveDayTitle', '_archByDate'].every(k => typeof T[k] === 'function'));

  // ---------- 2. 构造同一天 6 条记录 ----------
  const pad = n => String(n).padStart(2, '0');
  const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const d0 = new Date();
  const todayIso = isoOf(d0);
  const mkAt = (h, mi) => new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), h, mi, 0, 0).getTime();
  T.state.records = [];
  for (let i = 0; i < 6; i++) {
    T.state.records.push({
      id: 'x' + i, type: 'planner', date: todayIso, createdAt: mkAt(10, i * 8),
      data: { title: '事项' + (i + 1), done: false }
    });
  }
  T.state.mediaItems = [];      /* 清掉初始化播种的示例书影音/习惯，避免干扰计数 */
  T.state.habits = [];
  T.state.settings.archiveFilter = 'all';

  // ---------- 3. 周历：同小时 >3 折叠为 +N，列带日期 ----------
  T.state.settings.archiveRange = 'week';
  T.renderArchive();
  const wh = doc.getElementById('archiveList').innerHTML;
  ok('3a 周历提示文案存在', wh.indexOf('点任意一天或 +N，查看当天全部记录') >= 0);
  ok('3b 周历列带 data-arch-date', wh.indexOf('data-arch-date="' + todayIso + '"') >= 0);
  ok('3c 同小时超过 3 条出现 +4', wh.indexOf('>+4<') >= 0);
  ok('3d 折叠块用了 aw-ev-more', (wh.split('class="aw-ev aw-ev-more"').length - 1) === 1);
  ok('3e 只画 2 条 + 1 个折叠块', (wh.split('class="aw-ev"').length - 1) === 2);

  // ---------- 4. 月历：格子可点 + +N ----------
  T.state.settings.archiveRange = 'month';
  T.renderArchive();
  const mh = doc.getElementById('archiveList').innerHTML;
  ok('4a 月历格子带 data-arch-date', mh.indexOf('data-arch-date="' + todayIso + '"') >= 0);
  ok('4b 月历超出显示 +3', mh.indexOf('>+3<') >= 0);
  ok('4c 月历提示文案存在', mh.indexOf('点日期或 +N，查看当天全部') >= 0);
  ok('4d 缓存已写入', (T._archByDate()[todayIso] || []).length === 6);

  // ---------- 5. 点击展开当天全部 ----------
  ok('5a 标题格式', T._archiveDayTitle(todayIso, 6).indexOf('月') > 0 && T._archiveDayTitle(todayIso, 6).indexOf('共 6 条') > 0);
  T._archiveOpenDay(todayIso);
  const wrap = doc.getElementById('archSheet');
  ok('5b 面板已创建并打开', !!wrap && wrap.classList.contains('open'));
  const bodyHtml = doc.getElementById('archSheetBody').innerHTML;
  ok('5c 面板列出全部 6 条（不再只显示 3 条）', (bodyHtml.split('class="tl-item"').length - 1) === 6);
  ok('5d 6 条标题都在', [1, 2, 3, 4, 5, 6].every(i => bodyHtml.indexOf('事项' + i) >= 0));
  ok('5e 带时刻标签', bodyHtml.indexOf('上午10点') >= 0);
  T._archiveCloseDay();
  ok('5f 关闭后面板隐藏', !doc.getElementById('archSheet').classList.contains('open'));

  // ---------- 6. 点击委派（点格子里的 +N / 任意位置都能开） ----------
  T.state.settings.archiveRange = 'month';
  T.renderArchive();
  const listEl = doc.getElementById('archiveList');
  const cell = listEl.querySelector('[data-arch-date="' + todayIso + '"]');
  ok('6a 找到可点格子', !!cell);
  if (cell) {
    try {
      cell.dispatchEvent(new w.Event('click', { bubbles: true }));
    } catch (e) { ok('6a-dispatch', false); console.log(e.message); }
    ok('6b 点击格子即打开面板', doc.getElementById('archSheet').classList.contains('open'));
    ok('6c 面板内容是当天 6 条', (doc.getElementById('archSheetBody').innerHTML.split('class="tl-item"').length - 1) === 6);
    T._archiveCloseDay();
  }

  // ---------- 7. 空日期不崩溃 ----------
  ok('7a 无记录日显示空态', T._archiveDayItemsHtml('1999-01-01').indexOf('这天没有记录') >= 0);
  T._archiveOpenDay('1999-01-01');
  ok('7b 空日也能打开且不抛错', doc.getElementById('archSheet').classList.contains('open'));
  T._archiveCloseDay();

  // ---------- 8. 当日时间线不受影响 ----------
  T.state.settings.archiveRange = 'day';
  T.renderArchive();
  const dh = doc.getElementById('archiveList').innerHTML;
  ok('8a 当日仍是时间线', dh.indexOf('class="tl-clock"') >= 0);
  ok('8b 当日仍列出全部 6 条', (dh.split('class="tl-item"').length - 1) === 6);

  console.log('\\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message); process.exit(1); });
"""

io.open(OUT, 'w', encoding='utf-8', newline='\n').write(head + body)
print('generated', OUT)
