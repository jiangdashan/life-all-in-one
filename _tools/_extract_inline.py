# -*- coding: utf-8 -*-
"""提取 life-all-in-one.html 的内联 <script> 到 _tools/_app_inline.js，供 node --check 做语法校验。

用法:
    python _tools/_extract_inline.py            # 提取
    node --check _tools/_app_inline.js          # 校验

注意：同目录 _extract_inline.js 是等价的 node 版本，两者取第一个非 src 的内联 script。
（本文件此前是 0 字节空文件，导致按说明执行「什么都没发生」，已补全。）
"""
import io
import os

HTML = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
OUT = r"D:\workbuddyProjects\工作台3\_tools\_app_inline.js"


def main():
    lines = io.open(HTML, encoding="utf-8").read().split("\n")
    oi = ci = -1
    for i, line in enumerate(lines):
        if "<script" in line and "src=" not in line:
            oi = i
            break
    if oi < 0:
        print("!! 未找到内联 script")
        return 1
    for i in range(oi + 1, len(lines)):
        if "</script>" in lines[i]:
            ci = i
            break
    if ci < 0:
        print("!! 未找到 </script>")
        return 1
    body = "\n".join(lines[oi + 1:ci])
    io.open(OUT, "w", encoding="utf-8", newline="").write(body)
    print("提取完成: 行 %d-%d, %d 字符 -> %s" % (oi + 1, ci, len(body), os.path.basename(OUT)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
