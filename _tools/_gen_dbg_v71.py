# -*- coding: utf-8 -*-
import io

SRC = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v70.js'
OUT = r'D:\workbuddyProjects\工作台3\_tools\_dbg_v71.js'
L = io.open(SRC, encoding='utf-8').read().split('\n')
head_end = next(i for i, l in enumerate(L) if 'const T = w.__appTest' in l)
head = '\n'.join(L[:head_end + 1])

body = u"""
  const pad = n => String(n).padStart(2, '0');
  const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const d0 = new Date();
  const todayIso = isoOf(d0);
  const mkAt = (h, mi) => new Date(d0.getFullYear(), d0.getMonth(), d0.getDate(), h, mi, 0, 0).getTime();
  T.state.records = [];
  for (let i = 0; i < 6; i++) {
    T.state.records.push({ id: 'x' + i, type: 'planner', date: todayIso, createdAt: mkAt(10, i * 8), data: { title: '事项' + (i + 1), done: false } });
  }
  T.state.settings.archiveFilter = 'all';
  console.log('records', T.state.records.length);
  const evAll = T._buildTimelineEvents();
  console.log('events', evAll.length, evAll.map(e => e.type + '|' + e.date));

  T.state.settings.archiveRange = 'day';
  T.renderArchive();
  const dh = doc.getElementById('archiveList').innerHTML;
  console.log('day tl-item count', (dh.split('tl-item').length - 1));
  console.log('day snippet', dh.slice(0, 400));

  T.state.settings.archiveRange = 'month';
  T.renderArchive();
  const mh = doc.getElementById('archiveList').innerHTML;
  console.log('month more:', mh.match(/am-more[^<]*</g));
  const cache = T._archByDate();
  console.log('cache keys', Object.keys(cache));
  console.log('cache today len', (cache[todayIso] || []).length);
  T._archiveOpenDay(todayIso);
  const bh = doc.getElementById('archSheetBody').innerHTML;
  console.log('sheet tl-item count', (bh.split('tl-item').length - 1));
  console.log('sheet snippet', bh.slice(0, 500));
  process.exit(0);
})().catch(e => { console.log('FATAL', e && e.message); process.exit(1); });
"""
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(head + body)
print('ok')
