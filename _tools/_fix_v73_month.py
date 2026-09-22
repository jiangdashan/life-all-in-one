# -*- coding: utf-8 -*-
"""修正月视图翻页：保留原来的「日」，目标月天数不足时才钳到月末"""
import io, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()

OLD = "  else if(range==='month'){ var m=d.getMonth()+delta; d.setDate(1); d.setMonth(m); }   /* 先归 1 号，避免 1/31 +1 月溢出到 3 月 */"
NEW = """  else if(range==='month'){
    /* 保留原来的「日」：1/24 +1 月 → 2/24；目标月不足则钳到月末（1/31 +1 月 → 2/28），避免溢出到下个月 */
    var _day=d.getDate(), _m=d.getMonth()+delta;
    d.setDate(1); d.setMonth(_m);
    var _dim=new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    d.setDate(Math.min(_day,_dim));
  }"""
n = s.count(OLD)
if n != 1:
    print("FAIL anchor count=%d" % n); sys.exit(1)
s = s.replace(OLD, NEW, 1)
io.open(P, "w", encoding="utf-8", newline="").write(s)
print("OK month step fixed")
