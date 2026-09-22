# 项目长期记忆 — 生活全能工作台（日常集）

## 铁律（数据安全，最高优先级）
1. merge 一律 LWW（同 id 比 `updatedAt`）；删除走墓碑（`deletedPlanIds`/`hiddenHabitKeys`/`deletedHabitNames`/`deletedCountdownIds`，须同时进 snapshot+payload+apply 前置合并）；`done` 取「或」不可逆。
2. 绝不用远程无条件替换本地；`isKeptLocal` 只判 `!sample && !remoteId`；打卡类 Object.assign+upsert。
3. `normalizeState` 必须 `{...record}` 展开保留 remoteId/syncTriedAt/createdAt。
4. `dbFetchAll` 未登录/uid 空返回 `null`（非 `[]`）；各 merge 遇空数组 `return` 保留本地。
5. 批量删/清空逐条 deleteRecord。跨设备清空 = 云端删 + meta `lastClearedAt` + init `applyRemoteClear`。
6. 单次网络失败禁 goLocalOnly，必须 syncPendingRecords 补传（60s 退避）。设置同步顺序 applySettingsSync→pullAllRemote→syncPendingRecords。
7. 云端页面级限流 50001：读取全走 `dbQueryThrottled` 串行队列（250ms + 退避 5 次），禁裸并发 db.query。

## 多用户隔离（v63 上线，勿重复调研）
- userId=SHA256(`richangji-v32-uid-2026-09`+':'+pw)；**红线：不得改此派生公式**（改了旧云端数据全读不到）。
- `_rowOwnsBy` 必须宽松：行无 userId 时返回 true。
- 邀请码：内置码明文随源码（`AUTH_INVITE_DEFAULT`）；自定义码只存 localStorage。查看/改需本机 `passwordHash` 二次校验。
- 已修：`readMetaClearAt`/`readPeriodClearMarker` 全局最大时间戳连坐 → 按 `_rowOwnsBy` 过滤；cloudCollectUserIds 强制同密码 → 加邀请码 + 「创建独立空间」入口。

## 工程铁律
- 改 JS 必 `node --check`（锚 `data-page-node-id="NWnaoiLqDuBK1LXGZoVUKl"` 提取主 script，确认长度 >400000；`<script[^>]*>` 会先命中 inject.js）。
- 多处改动写 python 原子脚本（锚点带真实缩进）；含中文替换落盘后必须 grep 断言；断言失败后只跑只读校验，绝不重跑 apply。
- **文件里有 2 个 `<style>`**（主 style + view-habits 内联）：插 CSS 必须用带上下文的唯一锚点，插完断言可见 HTML 无裸露 CSS 文本（v74 泄漏事故）。
- 冒烟：linkedom+vm，函数经 `window.__appTest` 导出。小改版**用生成器复用上一版头部**（截到 `const T = w.__appTest` 行）。测试前先置空 `state.mediaItems/habits`（应用会播种示例数据）。
- `__appTest` 已导出 `renderAll/renderMoney/renderFitness/renderMoneyPie/renderMoodCalendar/renderPayback/renderMood/renderCountdown/renderStorage/switchView/empty/state/...`（v77 补）；**`renderAll` 用 `_safeRender` 吞错** → 查异常必须直接调具体 render 函数。
- 往函数里插语句前确认插入点在变量声明之后（renderArchive `const el` 之前用 `el` → TDZ）。
- linkedom 垫片：无 form.elements（defineProperty 到原型）、select.value 只读、submit 走 dispatchEvent；**必须注入 TextEncoder/TextDecoder**（否则 crypto.subtle 报错 → 回落 djb2）。
- 云端 SDK 返回列值是解包纯值（`Number(r["金额"])`），mock 别写 `{text:...}` 信封。
- 含反引号/`$`/单引号长文本必须写 .py 文件执行，禁 `python -c`。
- **平台给元素补 `data-page-node-id`** → 部署断言禁用整段标签串，改短片段（`>倒数</span>`、`data-nav="countdown"><svg`）。
- bash shim 会退化（cat/tail/管道）→ 长输出 `> 文件` 再 Read。
- 移动端 SVG `<text>` 中文渲染不可控 → 精确文字样式一律用 HTML 元素。
- **web/移动端功能同步（用户 2026-09-22 明确要求）**：新增模块/入口必须同时改 sidebar+mobile-nav（_verify 断言两端 data-nav 集合一致）；交互功能改动必须双视口（1280+420）冒烟。

## 移动端「装成 App」与封面（定论，勿重复调研）
- `workbuddy.link/p/<id>` 是平台外壳（React），工作台在 iframe；产物 `.../page/<id>/<ver>/<file>.html`（无 latest）。产物页不能顶层直开（inject.js 检 self===top）。
- 数据层依赖父页 `window.__SMART_PAGE__.database`（postMessage 桥），换托管必重写数据层。
- 桥接时序：壳与 iframe 异步握手 → 用 `refreshDb()` + `ensureBridgeSync()`；「界面能进但数据全空」先怀疑此点。
- 图标名由外壳控制；sites 全屏外壳在鸿蒙手机连接超时 → 回退 workbuddy.link；原生 APK/IPA 不可行。
- Google Books/OpenLibrary/TMDB 不可达 + 豆瓣反爬 → **联网抓封面永久否决**，走离线生成。

## 部署与工具
- 活页节点 `IAP7cP1ljx7juu0hAdPdVy`；发布 https://workbuddy.link/p/IAP7cP1ljx7juu0hAdPdVy 。
- 部署：`python _tools/_deploy.py --token <op_xxx>`（import_html 带全 14 表 → publish → 取版本号 → 线上 grep 断言）。判上线看「版本号递增 + 标记 MISS 0」。禁 PowerShell 传 --databases JSON。
- token：`ToolSearch(["connect_open_platform"])` → `DeferExecuteTool{connect_open_platform, {skill_id:"library"}}` 得 `op_xxx`（TTL 1800s）。**禁从文件/env 搜 token**；工具不可用即停（2026-09-22 12:40 起该工具报 not available，部署曾阻塞，需重试/重连资料库）。
- 【12607】import_html 必须传全表 databases；【11607】写属性值必须信封 `{text}/{number}/{date}/{select}`。
- 14 表：money O4PsdbQpHnSDT0LSKcqgoI · habit wuNwUprBrd6rfdcdHvCP9b · plan ZnLrbr3jawU5LRlL3XGSRV · fitness Ey5dN80w9Gexo7TxLvpfVu · shopping 4mWbsWDNv6k5fW4lI75FYj · media P93GbycwxqQ0HWmvsDTWTQ · diet ZshQ2v3NpB58bxG59hlTEB · storage 9YCVWtvdwouCJvxjkfd4z0 · mood BHhTft6ZybuV7Lc0cF2nIC · period rp51GH61XV6eq9fl4smboC · sleep 4rjX5sVnSNNfS2mk16nR2W · study wtsziKZtrYywDnYMuRNcyP · payback 935dPbYYu1hSUxwV7asgxy · meta FKpqucBa96f2slzvcU3jdV。
- 交付只 present 说明文档，**不 present 源 HTML**（本地预览无云桥接会误判数据丢失）。

## 版本要点（当前 v85；线上 /71/，MISS 0）
- v45–v55：`_safeRender`、`dbQueryThrottled`、热力图/心情/睡眠、经期 PIN、装桌面引导。
- v56/33 学习模块（修 renderStudy 未挂 renderAll、clearAllRemoteTables 漏 DB_SLEEP）；v56b 四象限同步（DB_PLAN「象限」改 text 列 + `backfillPlannerQuadrant`）。
- v57 重复日程 `maybeAutoNextRepeat`；v58 回本模块 DB_PAYBACK + 9 类 `i-pb-*`；v59 `storageIcon(name,cat)`（词典**顺序敏感**）+ media 封面链接列；v60 离线自动封面（FNV-1a seed=`name|type`，**不能用 record id**）；v61→v62 封面糊字根因=**字重非字号** → 改 HTML 渲染。
- v63 多用户隔离 + 邀请码；v64 邀请码管理面板；v65 每日备份 + 误清空恢复（`snapshotBuild` 本机 2MB 滚动 + 云端 meta `backup:<date>` 30 天；`restoreApply` 只补缺失不覆盖；**恢复后必须铲墓碑**）；v66 四按钮文案。
- v67 档案四档；v68 ①`storageUsage` 纳入同步 ②`stripSampleData` 示例清理（守卫 lastClearedAt>0 / `_hasRealSyncedData`）③当日时间线升序；v69 ①使用频率名称两行（根因 `.freq-row` 第三列 nowrap 压扁）②番茄钟 `#pomoPanel` ③**未来日程按 createdAt 归档**（创建当天记「未来日程 · X月X日」）④档案周历/月历/年汇总 ⑤重复日程置顶 `repeat-pin`。
- v70 `_clockLabel` 六段（0-5 点凌晨用 24h）；v71 周/月历点击展开当日（`_archiveOpenDay` + `#archSheet`，同小时 >3 改画 2 条 +N）。
- v72 ①优先级 `sortPlannerByPriority`（high>normal>low，同级未完成在前）②减脂周计划归档（远端 `weeklyPlanWeekStart` 更早则忽略）③经期改首末跨度（[2,2]→[5,6]）④收纳位置归类 `data-storage-loc` ⑤番茄累计 `_pomo.pending`。
- v73 ①档案日期漫游 `_archCursor/_archiveStep/_archiveGoto`（**月视图翻页保留原日**，不足钳月末）②倒数日模块（独立 meta key `richangji:countdown`，内嵌 solarlunar@3.1.0 + `deletedCountdownIds` 墓碑）。
- v74 ①修 CSS 泄漏（裸 `</style>` 锚点命中 view-habits 内联样式，整段 `.cd-*` 变可见文本）②倒数日视觉重做（`cd-hero`/`cd-num`，days<=7 转红，0 天显示「今天」）。
- v75 ①移动端导航补倒数日 —— **`.mobile-nav` 与 `.sidebar` 是两份独立列表，加新模块必须同时改两处** ②P1 三档层级（`renderModuleInsights` + 10 个 `_miXxx` + `_miSet(view,eyebrow,main,unit,note)` + `.mod-insight`；无数据 hidden）③全局 `tabular-nums` ④`empty(msg,hint)` 增第二行灰字。
- v76 移动端文字重叠：`.metric strong` 换行保护 + 移动端 17px；`.record-main{min-width:0}`；`.cal-cell` 高度；**闰月 checkbox 被 `.field input{width:100%;height:44px}` 撑爆** → `.cd-inline input[type=checkbox]` 覆盖。
- v80 web 端立即备份失效：dbUpdate 发射后不管，4 处 meta 更新路径「dbUpdate; cb(true)」谎报成功 → dbUpdate 加回调识别 code/异常；snapshotSaveCloud 更新失败回退删除重建；面板标注「未连接云端仅存本机」。
- v78 回本/身体记录串行：根因=`.record-list` 定高520px+flex，行缺 `flex-shrink:0` 被压到 min-height:62px，两行内容(~80px)溢出压下一条 → `.record-row` 加 flex-shrink:0（浏览器几何实测 62→80.7px，重叠 0）。
- v81 备份按钮按不动：根因=inject.js 永真代理致 ONLINE 恒 true（真就绪须查 __realImpls__.database，v54 轮询因此复活）；修复=真就绪判定 + 按钮即时反馈/25s 看门狗/try-catch + document 委托兜底 + init 绑定隔离数组。e2e：桥就绪 199ms 成功/桥未就绪 168ms 明确报错（修复前 15s+ 零反馈）。
- v81b 备份无任何提示（双层级 bug）：①`.toast` z100 被设置面板 `.settings-backdrop` z120 盖住 → toast z10000；②手机视口 `#appTip` 引导条 z120（DOM 在 backdrop 后同层居上）压住「立即备份」按钮吃掉点击 → z90。**教训：涉及 fixed 遮罩的功能 e2e 必须做 elementFromPoint 命中测试断言视觉层级，只查 textContent 会漏检；toast 一律最高层级。**
- v82 云端响应超时：根因=快照数据量——`dbFetchAll(DB_META)` 全量拉含 30 天快照行的 meta 表（数 MB 经桥接拖过 25s）+ meta 单格 15 万字符上限可能被超长快照顶爆。修复=①`dbFetchMetaFiltered`（平台 `db.query` 支持 `filter`：`{property:{property:"键",text:{equals/contains}}}`，见 library skill params-reference.md；外壳不支持回退全量）②快照分片 `SNAP_CHUNK_CHARS=120000`（`backup:<date>#N` 分片行 + vv:2 清单行，snapshotLoad 拼装；短快照格式不变）③看门狗 25s→60s 超时转后台不判死④按钮显示快照体积。**教训：mock 必须对齐平台 filter 能力；rotate/list 同步改过滤读取。**
- v83 转后台无结局（实测 meta 表仅 26 行/660KB，"数据量大"不成立）：真根因=①v82 的 filter 参数在外壳上可能悬挂（每次拖慢串行队列 20s，多次渲染成车队）→ **v83b 弃用 filter** 统一走 dbFetchAll；②query/dbAdd/dbUpdate 悬挂无兜底 → 20s/30s 硬超时 + try/catch（一个悬挂查询会永久卡死 `_dbQuerySeq` 串行队列）；③当日二备份走 dbUpdate 大值悬挂 → 关键路径纯 dbAdd+后置清理；④每日自动备份与手动并发互删对方行 → `_snapCloudBusy` 串行锁 + 清理只删 at 更旧；⑤分片键 `backup:<date>#<at>#<i>` 带 at 身份。e2e `_test_v83.js` 双 PASS。**教训：两个写入方共表必须串行化+按时间戳判旧；"数据量大"先实测再改架构；meta 表体检脚本 `_probe_meta_v83.py`。**
- v84 每次刷新弹补传/清理提示 + 两端条数漂移（web447/移动444）：实测全 14 表 0 重复、447 恰好=11 记录表行数和（云端全量）。真根因=①补传链漏 sleep（pushSleep 存在但没接进 `syncPendingRecords`，失败后永远卡本地且每次计数）②`runMerge` pending=11 实派 13 表+cb 无 once（连发 3 次，快照可能在合并完成前生成）③`syncPendingDeletes.finish` 过滤反了（保留成功的删除条目→每次重删重弹）④桥慢路径 `authPostUnlockRehydrate` 只拉不推（手机端滞留记录无补传机会，444 来源）+init 里删除重试嵌在 n>0。修复后 e2e 双场景 PASS（含二次刷新零提示零重复）。**教训：同步收敛必须 reload 双会话验证；「每次刷新弹同样提示」=重试队列不收敛=先查增删方向；mock 的 _rows 必须持久化否则 reload 失真。**
- v85 移动端仍 444 + 重复日程日期应为当天：①`createNextRepeat` 由建议的 `item.nextDate`（未来）改当天日期 ②`maybeDailySnapshot` 原当天只生成一次（移动端 444 是早间旧数字不更新）→ 本机条数变化时自动覆盖刷新当天快照 ③`runMerge` 每表 merge 加 try/catch+失败重试+总看门狗（任一表抛错会致回调永不触发、同步链停摆）。v85b（e2e 暴露）：push 成功 remoteId 走 400ms 防抖保存，窗口内刷新即丢 remoteId → 云端本地并存重复+3 → **remoteId 立即 saveState() 同步落盘**。e2e 双 PASS + 回归 v84/v83 PASS。**教训：remoteId 回写不能依赖防抖；push 成功到 saveState 之间是重复数据温床。**
- v79 库存总览位置筛选不生效：renderStorageOverview 漏应用 storageLoc → 归类块后补 `_locF` 过滤（归类块保持全量）+ 提示条/`storage-loc-clear`；浏览器实测 11/11。
- v77 **用户 4 张手机截图的四处错乱**：①心情月历 `repeat(7,1fr)`+`min-height` 使第 7 列（六）溢出屏外 → 改 `repeat(7,minmax(0,1fr))`，移动端格子高度 44→38px ②回本物品明细挤压 → 移动端 3 列 + amount 下移第二行 ③消费结构圆环中心金额溢出内圆（固定 20px）→ `_amtFs` 按字符宽度自适应（内圆 80px，预算 72px；数字 0.556/千分位 0.28/¥ 0.62）④身体记录挤压 → `#fitnessList small` `line-height:1.6` + 指标包 `.nb{white-space:nowrap}` 不再断词（「体脂肪」曾被截成「体脂/肪」）。20/20。
- v78 **回本金额压下一条/体重重叠** 根因=`.record-list` 定高 flex 列表 + 行默认 flex-shrink:1 被压到 min-height:62px，两行网格内容溢出 → `.record-row{flex-shrink:0}` 一行修复。**验证利器：playwright-core+本机 Edge 实测布局几何**（__TESTING__ 跳鉴权 + __appTest 注数据 + getBoundingClientRect 查重叠）。

## 用户偏好
- 简洁朴素排版，去彩色装饰/阴影/荧光高亮。
- 数据安全零容忍：改同步/merge 必须保留本地未同步变更；验证 = 添加 → 刷新 → 数据还在。
- 决策前先看详细改动清单与风险对比再拍板。
- 反馈问题走「手机截图 + 一句话点出哪几处」，期望直接修好并上线。
