# -*- coding: utf-8 -*-
"""生成 _smoke_v74.js：CSS 泄漏修复 + 倒数日视觉重做"""
import io

HEAD = r"D:\workbuddyProjects\工作台3\_tools\_smoke_v73.js"
OUT = r"D:\workbuddyProjects\工作台3\_tools\_smoke_v74.js"

L = io.open(HEAD, encoding="utf-8").read().split("\n")
cut = None
for i, l in enumerate(L):
    if "const T = w.__appTest" in l:
        cut = i
        break
if cut is None:
    raise SystemExit("anchor not found")
head = "\n".join(L[:cut + 1])

body = r"""
  // ================= A. 习惯健康页顶部不再有裸露 CSS =================
  const habitSec = doc.getElementById('view-habits');
  const habitTxt = habitSec ? habitSec.textContent : '';
  ok('A1 习惯页文本不含 .cd-hero{ 残留', habitTxt.indexOf('.cd-hero{') < 0);
  ok('A2 习惯页文本不含 .cd-num{ 残留', habitTxt.indexOf('.cd-num{') < 0);
  ok('A3 习惯页文本不含 .cd- 前缀残留', habitTxt.indexOf('.cd-') < 0);
  const habitVisible = habitSec.innerHTML.replace(/<style[\s\S]*?<\/style>/g, '');
  ok('A4 习惯页可见 HTML 不含 @media 残留', habitVisible.indexOf('@media') < 0);
  ok('A4b 习惯页可见 HTML 不含任何 CSS 规则', habitVisible.indexOf('.cd-') < 0 && habitVisible.indexOf('{display:grid') < 0);
  ok('A5 习惯页仍保留正常中文标题', habitTxt.indexOf('今天打卡') >= 0);

  const styleEls = doc.querySelectorAll('style');
  ok('A6 只有两个 style 标签', styleEls.length === 2);
  const mainCss = styleEls[0] ? styleEls[0].textContent : '';
  ok('A7 主 style 已含 .cd-hero 规则', mainCss.indexOf('.cd-hero{display:grid') >= 0);
  ok('A8 主 style 已含 .cd-num 规则', mainCss.indexOf('.cd-num{display:flex') >= 0);
  ok('A9 主 style 已含 .cd-hero-sm 规则', mainCss.indexOf('.cd-hero-sm{') >= 0);
  ok('A10 主 style 已含移动端断点', mainCss.indexOf('@media(max-width:640px){') >= 0);
  ok('A11 主 style 未被截断（含 sidebar 规则）', mainCss.indexOf('.sidebar{') >= 0);

  // ================= B. 倒数日 hero 重做 =================
  T.renderCountdown();
  const heroEl = doc.getElementById('cdHero');
  const heroHtml = heroEl ? heroEl.innerHTML : '';
  ok('B1 hero 容器为 cd-hero', heroHtml.indexOf('<div class="cd-hero">') >= 0);
  ok('B2 hero 主卡存在', heroHtml.indexOf('cd-hero-main') >= 0);
  ok('B3 hero 有名称行', heroHtml.indexOf('cd-hero-name') >= 0);
  ok('B4 hero 有大数字', /<div class="cd-hero-count"><b>\d+<\/b><span>天<\/span><\/div>/.test(heroHtml));
  ok('B5 hero 有日期元信息', heroHtml.indexOf('cd-hero-meta') >= 0);
  ok('B6 hero 有侧栏（接下来两个）', heroHtml.indexOf('cd-hero-side') >= 0);
  ok('B7 侧栏小卡数量为 2', (heroHtml.match(/cd-hero-sm/g) || []).length === 2);
  ok('B8 小卡含天数', /cd-hs-days">还有 <b>\d+<\/b> 天/.test(heroHtml) || heroHtml.indexOf('就是今天') >= 0);
  ok('B9 hero 不再用旧结构', heroHtml.indexOf('cd-hero-item') < 0 && heroHtml.indexOf('cd-hero-days') < 0);

  // ================= C. 倒数日列表行重做 =================
  const listEl = doc.getElementById('countdownList');
  const listHtml = listEl ? listEl.innerHTML : '';
  ok('C1 列表非空', listHtml.length > 50);
  ok('C2 行用 cd-num 数字块', listHtml.indexOf('<span class="cd-num">') >= 0);
  ok('C3 行用 cd-body 主体', listHtml.indexOf('<span class="cd-body">') >= 0);
  ok('C4 行含类型标签', listHtml.indexOf('cd-tag') >= 0);
  ok('C5 不再用旧 class cd-days', listHtml.indexOf('cd-days') < 0);
  ok('C6 不再用旧 class cd-main', listHtml.indexOf('cd-main') < 0);
  ok('C7 天数与「天」字成对出现', /<b>\d+<\/b><span>天<\/span>/.test(listHtml));

  // ================= D. 今天 / 临近 =================
  const pad2 = n => String(n).padStart(2, '0');
  const d = new Date();
  const iso = v => v.getFullYear() + '-' + pad2(v.getMonth() + 1) + '-' + pad2(v.getDate());
  const todayStr = iso(d);
  const d3 = new Date(); d3.setDate(d3.getDate() + 3);

  T.addCountdown({ name: '就在今天', type: 'solar', repeat: true, note: '', date: todayStr, leap: false });
  T.addCountdown({ name: '三天后', type: 'solar', repeat: true, note: '', date: iso(d3), leap: false });
  T.renderCountdown();
  const h2 = doc.getElementById('cdHero').innerHTML;
  const l2 = doc.getElementById('countdownList').innerHTML;
  ok('D1 今天的事项在 hero 显示「就是今天」', h2.indexOf('就是今天') >= 0);
  ok('D2 列表里今天显示「今天」而非 0 天', l2.indexOf('<b class="txt">今天</b>') >= 0);
  ok('D3 三天后的项标为临近 near', l2.indexOf('cd-row near') >= 0);
  ok('D4 三天后的项数字为 3', /<b>3<\/b><span>天<\/span>/.test(l2));

  const cdList = T._cdList();
  const mine = cdList.filter(x => x.name === '就在今天' || x.name === '三天后');
  ok('D5 自定义项已存入', mine.length === 2);
  mine.forEach(x => T.deleteCountdown(x.id));
  T.renderCountdown();
  const l3 = doc.getElementById('countdownList').innerHTML;
  ok('D6 删除后不再出现', l3.indexOf('就在今天') < 0 && l3.indexOf('三天后') < 0);

  // ================= E. 农历倒数仍正确 =================
  const lunarNext = T._cdNextOccur({ name: '春节', type: 'lunar', repeat: true, date: '0001-01-01', leap: false }, todayStr);
  ok('E1 农历春节能算出下一次日期', !!lunarNext && /^\d{4}-\d{2}-\d{2}$/.test(lunarNext));
  ok('E2 春节在下一年 1-2 月', Number(lunarNext.slice(5, 7)) <= 2);
  ok('E3 内置农历节日数量 > 5', (T.CD_LUNAR_FESTIVALS || []).length > 5);
  ok('E4 内置公历节日数量 > 5', (T.CD_SOLAR_FESTIVALS || []).length > 5);

  const builtin = T._cdBuiltin(todayStr);
  ok('E5 内置倒数日全部有未来日期', builtin.every(b => T._cdDaysTo(b.next) >= 0));
  const minDays = Math.min.apply(null, builtin.map(b => T._cdDaysTo(b.next)));
  T.renderCountdown();
  const h3 = doc.getElementById('cdHero').innerHTML;
  ok('E6 hero 显示的是最近的那个（天数最小）',
    h3.indexOf('<b>' + minDays + '</b>') >= 0 || (minDays === 0 && h3.indexOf('就是今天') >= 0));
  const l4 = doc.getElementById('countdownList').innerHTML;
  const daySeq = (l4.match(/<b>(\d+)<\/b><span>天<\/span>/g) || []).map(x => Number(x.replace(/\D+/g, '')));
  ok('E7 列表按天数升序排列', (function () {
    for (let i = 1; i < daySeq.length; i++) if (daySeq[i] < daySeq[i - 1]) return false;
    return daySeq.length > 3;
  })());
"""

tail = r"""
  console.log('\nRESULT: pass=' + P.pass + ' fail=' + P.fail);
  process.exit(P.fail > 0 ? 1 : 0);
})().catch(e => { console.log('FATAL', e && e.message, e && e.stack); process.exit(1); });
"""

io.open(OUT, "w", encoding="utf-8").write(head + body + tail)
print("generated", OUT)
