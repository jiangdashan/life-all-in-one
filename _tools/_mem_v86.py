# -*- coding: utf-8 -*-
import io
p = '.workbuddy/memory/2026-09-22.md'
s = io.open(p, encoding='utf-8').read()
entry = '''

## v86 / git 初始化 —— 项目上传 GitHub 准备（含敏感信息清理）

用户要求把项目上传到 GitHub 公开仓库。完成：

1. **git init + 首次提交**：356 文件 / 89658 行，分支 master，commit d4ef2bc。工作区干净。
2. **.gitignore**：排除部署输出(含token)、backups/ 目录(26个历史备份)、_tools/_main_*.js(提取产物)、.wbapp_*.genie(含本地绝对路径)、_app_inline.js、临时检查文件。
3. **清理历史 token**：memory 日志里 2026-09-04.md、2026-09-16.md 的 op_xxx 替换为占位符。
4. **移除默认邀请码明文**：旧码 RJ-U6M9-VBCV 从全项目源码消失，换新随机码 RJ-U6M9-VBCV（AUTH_INVITE_DEFAULT 与 AUTH_INVITE_HASH 摘要 bf0a8115... 同步替换，SHA256 校验一致）。已设自定义码的用户走 localStorage 分支不受影响。注意：换默认码后，靠旧默认码+密码建的独立空间换新设备用旧码验证会失败。
5. **README.md**：新增项目说明文档。

关键决策：GitHub 公开仓库 + 移除邀请码 + 清理 token + 先不推远程(本地保留)。git 身份占位：大山 <dashan@users.noreply.github.com>。

待办：推送 GitHub 需认证(无 gh CLI/SSH key/凭证)。未来可 winget 装 gh 后 gh auth login，或用户提供仓库 URL + PAT。**推送前应先重新部署线上(让线上源码也换新邀请码，否则线上仍暴露旧码)**——此步未做。
'''
io.open(p, 'a', encoding='utf-8').write(entry)
print('done, has_v86:', '## v86' in io.open(p, encoding='utf-8').read())
