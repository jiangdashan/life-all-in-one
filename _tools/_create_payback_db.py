# -*- coding: utf-8 -*-
"""创建「回本记录」云端数据表。用法：printf '%s' "$TOKEN" | python _tools/_create_payback_db.py"""
import json
import subprocess
import sys

PY = r"C:\Users\依易亦奕鸭\.workbuddy\binaries\python\versions\3.13.12\python.exe"
LIB = r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library"

schema = {
    "title": "回本记录",
    "properties": [
        {"name": "购买日期", "config": {"date": {}}},
        {"name": "物品名称", "config": {"text": {}}},
        {"name": "分类", "config": {"text": {}}},
        {"name": "购买价格", "config": {"number": {}}},
        {"name": "均价方式", "config": {"text": {}}},
        {"name": "使用次数", "config": {"number": {}}},
        {"name": "userId", "config": {"text": {}}},
    ],
}

token = sys.stdin.readline().strip()
if not token:
    print("ERROR: no token on stdin")
    sys.exit(1)

proc = subprocess.run(
    [PY, "database/create_database.py", "--token-stdin", "--stdin"],
    input=(token + "\n" + json.dumps(schema, ensure_ascii=False)).encode("utf-8"),
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    cwd=LIB,
)
out = proc.stdout.decode("utf-8", errors="replace")
print(out)
