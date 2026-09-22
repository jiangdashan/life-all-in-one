# -*- coding: utf-8 -*-
"""修正 2026-09-17.md 中 v52 段落（上一步经 bash 双引号写入时反引号被 shell 吞掉）。"""
import io

P = r"D:\workbuddyProjects\工作台3\.workbuddy\memory\2026-09-17.md"
s = io.open(P, encoding="utf-8").read()
i = s.find("## v52")
assert i > 0

fixed = u"""## v52 · 把工作台装到手机桌面（用户问「能否以 App 形式安装」）
- 调研结论（已存 MEMORY.md 铁律区）：分享链接是外壳页 + iframe；产物页被注入守卫脚本禁止顶层打开；
  数据桥 __SMART_PAGE__.database 是 postMessage 桥、依赖父页 → 脱离外壳即无数据。
  故「全屏 PWA / 原生 App（APK/IPA）」在当前托管下不可行；「添加到主屏幕」可行（一键直达）。
- 已做（线上 **/29/** v52，18/18 标记命中）：app 内「装到手机桌面」面板（复制链接 + 5 套分设备步骤 + 7 天免密说明）、
  窄屏首屏提示条（可「不再提示」/ standalone 自动隐藏）、桌面图标 meta + 内联 PNG apple-touch-icon。
- 新工具：`_tools/_make_app_icon.py`（纯标准库手写 PNG，生成 180/192/512 图标 → base64，零第三方依赖）；
  `_tools/_smoke_v52.js` 36/36；顺手补全了 0 字节的空文件 `_tools/_extract_inline.py`。
- 交付文档：`v52-装到手机桌面说明.md`。
- 待用户决策：是否试做「全屏 App 外壳页」（需另行发布一个在线应用承载外壳，且需真机实测嵌套是否可用）。
"""
io.open(P, "w", encoding="utf-8", newline="").write(s[:i] + fixed)
print("fixed ok, total", len(s[:i] + fixed))
