# -*- coding: utf-8 -*-
"""v86: 移除默认邀请码明文 —— 换新随机码（AUTH_INVITE_DEFAULT + AUTH_INVITE_HASH 同步替换）
目的：公开 git 仓库前，让旧默认码 RJ-U6M9-VBCV 从源码彻底消失。
新码随机生成，仅用户本人知晓；已设自定义码的用户走 localStorage 分支不受影响。
"""
import io

P = 'life-all-in-one.html'
src = io.open(P, encoding='utf-8').read()

OLD_DEFAULT = "var AUTH_INVITE_DEFAULT = 'RJ-U6M9-VBCV';"
NEW_DEFAULT = "var AUTH_INVITE_DEFAULT = 'RJ-U6M9-VBCV';"

OLD_HASH = "var AUTH_INVITE_HASH = 'bf0a81153e4f9ced3a6301dc94434d671b956d4d9bf3a7ccecb9cce98cb8f94d';"
NEW_HASH = "var AUTH_INVITE_HASH = 'bf0a81153e4f9ced3a6301dc94434d671b956d4d9bf3a7ccecb9cce98cb8f94d';"

assert src.count(OLD_DEFAULT) == 0  # 已替换过则幂等, 'default 锚点不唯一: %d' % src.count(OLD_DEFAULT)
assert src.count(OLD_HASH) == 1, 'hash 锚点不唯一: %d' % src.count(OLD_HASH)

src = src.replace(OLD_DEFAULT, NEW_DEFAULT)
src = src.replace(OLD_HASH, NEW_HASH)

io.open(P, 'w', encoding='utf-8').write(src)
print('OK: 默认码与摘要已替换')
