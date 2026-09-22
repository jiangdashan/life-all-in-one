# -*- coding: utf-8 -*-
"""创建「学习记录」云端数据表。用法：printf '%s' "$TOKEN" | python _tools/_create_study_db.py"""
import json
import subprocess
import sys

PY = r"C:\Users\依易亦奕鸭\.workbuddy\binaries\python\versions\3.13.12\python.exe"
LIB = r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library"

schema = {
    "title": "学习记录",
    "properties": [
        {"name": "日期", "config": {"date": {}}},
        {"name": "科目", "config": {"text": {}}},
        {"name": "时长(分钟)", "config": {"number": {}}},
        {"name": "类型", "config": {"text": {}}},
        {"name": "备注", "config": {"text": {}}},
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
