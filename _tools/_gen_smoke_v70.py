# -*- coding: utf-8 -*-
"""生成 _smoke_v70.js：复用 v69 的沙箱头部，追加 _clockLabel 时段测试"""
import io

SRC = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v69.js'
OUT = r'D:\workbuddyProjects\工作台3\_tools\_smoke_v70.js'

L = io.open(SRC, encoding='utf-8').read().split('\n')
head_end = None
for i, l in enumerate(L):
    if 'const T = w.__appTest' in l:
        head_end = i
        break
assert head_end is not None, 'anchor not found'
head = '\n'.join(L[:head_end + 1])

body = u"""
  // ---------- 1. _clockLabel 时段 ----------
  ok('1a _clockLabel 已导出', typeof T._clockLabel === 'function');
  function at(h, m) { var d = new Date(2026, 8, 20, h, m || 0, 0, 0); return T._clockLabel(d.getTime()); }
  ok('1b 0:56 显示凌晨0点56分', at(0, 56) === '凌晨0点56分');
  ok('1c 0:00 显示凌晨0点', at(0, 0) === '凌晨0点');
  ok('1d 5:20 显示凌晨5点20分', at(5, 20) === '凌晨5点20分');
  ok('1e 6:00 显示早上6点', at(6, 0) === '早上6点');
  ok('1f 8:30 显示早上8点30分', at(8, 30) === '早上8点30分');
  ok('1g 10:00 显示上午10点', at(10, 0) === '上午10点');
  ok('1h 11:59 显示上午11点59分', at(11, 59) === '上午11点59分');
  ok('1i 12:00 显示中午12点', at(12, 0) === '中午12点');
  ok('1j 12:30 显示中午12点30分', at(12, 30) === '中午12点30分');
  ok('1k 13:05 显示下午1点05分', at(13, 5) === '下午1点05分');
  ok('1l 15:00 显示下午3点', at(15, 0) === '下午3点');
  ok('1m 17:45 显示下午5点45分', at(17, 45) === '下午5点45分');
  ok('1n 18:00 显示晚上6点', at(18, 0) === '晚上6点');
  ok('1o 23:59 显示晚上11点59分', at(23, 59) === '晚上11点59分');
  ok('1p 空时间戳返回 null', T._clockLabel(0) === null);
  ok('1q 旧「上午12点」写法已移除', html.indexOf("var part = h<12 ? '上午' : '下午'") < 0);

  // ---------- 2. 当日时间线仍用 _clockLabel 分组 ----------
  var today = new Date();
  var mk = function (h, m) { var d = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0, 0); return d.getTime(); };
  T.state.records = [
    { id: 'a1', type: 'planner', date: '2026-09-20', createdAt: mk(0, 56), data: { title: '写周报', done: false } },
    { id: 'a2', type: 'planner', date: '2026-09-20', createdAt: mk(10, 0), data: { title: '开会', done: false } }
  ];
  T.state.settings.archiveRange = 'day';
  T.state.settings.archiveFilter = 'all';
  T.renderArchive();
  var ah = doc.getElementById('archiveList').innerHTML;
  ok('2a 当日时间线出现凌晨0点56分', ah.indexOf('凌晨0点56分') >= 0);
  ok('2b 凌晨排在上午之前', ah.indexOf('凌晨0点56分') < ah.indexOf('上午10点'));

  console.log('\\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message); process.exit(1); });
"""

io.open(OUT, 'w', encoding='utf-8', newline='\n').write(head + body)
print('generated', OUT)
