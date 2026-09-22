/* 校验 solarlunar 库：农历转公历 + 节气（供倒数日模块使用） */
const fs = require('fs');
const vm = require('vm');
let src = fs.readFileSync('D:/workbuddyProjects/工作台3/_tools/solarlunar.esm.js', 'utf8');
src = src.replace(/export\s*\{[^}]*\};?/, '');
src += '\n;module.exports = solarLunar;';
const mod = { exports: {} };
vm.runInNewContext(src, { module: mod, exports: mod.exports, console });
const SL = mod.exports;

const pad = n => String(n).padStart(2, '0');
const fmt = o => o && o.cYear ? `${o.cYear}-${pad(o.cMonth)}-${pad(o.cDay)}` : JSON.stringify(o);

console.log('lunarTerm =', SL.lunarTerm.join(','));
console.log('--- 农历转公历 ---');
const cases = [
  [2026, 1, 1, '2026-02-17'],
  [2025, 1, 1, '2025-01-29'],
  [2024, 1, 1, '2024-02-10'],
  [2027, 1, 1, '2027-02-06'],
  [2026, 5, 5, '2026-06-19'],
  [2026, 8, 15, '2026-09-25'],
  [2024, 8, 15, '2024-09-17'],
  [2024, 5, 5, '2024-06-10'],
];
let bad = 0;
cases.forEach(([y, m, d, expect]) => {
  const got = fmt(SL.lunar2solar(y, m, d));
  const okk = got === expect;
  if (!okk) bad++;
  console.log((okk ? '  OK   ' : '  BAD  ') + `lunar ${y}-${m}-${d} -> ${got} (期望 ${expect})`);
});
console.log('--- 节气 ---');
SL.lunarTerm.forEach((name, i) => {
  const t = SL.getTerm(2026, i);
  console.log('  idx', i, name, t);
});
console.log('--- 公历转农历抽查 ---');
[[2026, 2, 17], [2026, 9, 25], [2025, 10, 6]].forEach(([y, m, d]) => {
  const r = SL.solar2lunar(y, m, d);
  console.log(`  ${y}-${pad(m)}-${pad(d)} -> 农历 ${r.lYear}-${r.lMonth}-${r.lDay} 闰=${r.isLeap} ${r.monthCn}${r.dayCn} term=${r.term}`);
});
console.log('BAD =', bad);
