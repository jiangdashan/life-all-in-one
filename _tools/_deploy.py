# -*- coding: utf-8 -*-
"""发布 life-all-in-one.html 到资料库活页节点。

用法:
    python _tools/_deploy.py --token op_xxx

为什么要有这个脚本：
  bash 环境的 dirname/cd/cat/tail 缺失、PowerShell 给原生命令传含双引号的
  JSON 参数时引号会被破坏（导致 --databases 解析报「格式非法」而悄悄不生效，
  页面↔数据库关联丢失 → 客户端 12607）。用 subprocess 直传 argv 可彻底规避。

流程: import_html.py(带全 12 表) → publish_page.py → 抓线上静态文件 grep 断言。
"""
import io
import subprocess
import sys
import time
import argparse
import json
import urllib.request

PY = r"C:\Users\依易亦奕鸭\.workbuddy\binaries\python\versions\3.13.12\python.exe"
LIB = r"D:\workbuddy\resources\app.asar.unpacked\resources\plugins\workbuddy-builtin\skills\library"
HTML = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
NODE_BLOCK_ID = "IAP7cP1ljx7juu0hAdPdVy"
NODE_ID = "IAP7cP1ljx7juu0hAdPdVy"
DB_IDS = [
    "O4PsdbQpHnSDT0LSKcqgoI",  # money
    "wuNwUprBrd6rfdcdHvCP9b",  # habit
    "ZnLrbr3jawU5LRlL3XGSRV",  # plan
    "Ey5dN80w9Gexo7TxLvpfVu",  # fitness
    "4mWbsWDNv6k5fW4lI75FYj",  # shopping
    "P93GbycwxqQ0HWmvsDTWTQ",  # media
    "ZshQ2v3NpB58bxG59hlTEB",  # diet
    "9YCVWtvdwouCJvxjkfd4z0",  # storage
    "BHhTft6ZybuV7Lc0cF2nIC",  # mood
    "rp51GH61XV6eq9fl4smboC",  # period
    "4rjX5sVnSNNfS2mk16nR2W",  # sleep (v48 新增)
    "wtsziKZtrYywDnYMuRNcyP",  # study (v56 新增)
    "935dPbYYu1hSUxwV7asgxy",  # payback (v58 新增)
    "FKpqucBa96f2slzvcU3jdV",  # meta
]
STATIC_BASE = "https://workbuddy-space-static.codebuddy.work/page"

# 部署后必须在线上命中的标识（缺一即视为未真正生效）
REQUIRED_MARKERS = [
    "plannerPager",
    "planner-prev",
    "planner-next",
    "PLAN_DAYS_PER_PAGE",
    # v48 基线
    "renderSleep",
    "sleepRangeFilters",
    "i-sleep",
    "mediaSearchInput",
    "storageFreqList",
    "moodDayDetail",
    "recipe-list",
    "heat-today",
    # v52/v53 装到手机桌面
    "appInstallPanel",
    "appPlatformSel",
    "appPlatformHint",
    "_appPlatformAuto",
    "_appSelectSync",
    'value="harmony"',   # 注意：平台会给元素插 data-page-node-id / pnid 注释，marker 不要跨属性连写
    # v56 学习模块
    "renderStudy",
    "i-study",
    "studyForm",
    "studyList",
    "studyStat",
    # v56b 日程四象限同步
    "backfillPlannerQuadrant",
    "richangji_planner_quad_backfilled",
    # v57 重复日程
    "renderPlannerRepeats",
    # v58 回本模块
    "renderPayback",
    "paybackForm",
    "paybackList",
    "paybackStat",
    "i-payback",
    "analyzePlannerRepeats",
    "plannerRepeatList",
    "autoRepeatBtn",
    # v59 物品简笔画图标 + 书影音封面链接
    "storageIcon",
    "i-st-bottle",
    "mediaCoverUrl",
    "_pickMediaCover",
    "封面链接",
    # v60 离线自动封面
    "AUTO_COVER_PALETTE",
    "_coverInitial",
    "_autoCoverHtml",
    "mediaAutoCoverBtn",
    "mediaAutoCover",
    # v61/v62 封面文字清晰度（HTML 渲染，字重固定 400）
    "HarmonyOS Sans SC",
    "ac-title",
    "ac-ini",
    "is-mini",
    # v63 多用户隔离（邀请码 + 独立空间 + 清空信号按 userId 过滤）
    "authSpaceBtn",
    "authInviteGo",
    "authSubmitInvite",
    "AUTH_INVITE_HASH",
    "_rowOwnsBy",
    "authVerifyInvite",
    # v64 设置面板邀请码管理（查看/重新生成/恢复内置，需本机密码二次校验）
    "inviteBox",
    "inviteCodeText",
    "inviteCopyBtn",
    "authInviteCurrentCode",
    "authGenInviteCode",
    "bindInvitePanel",
    "AUTH_INVITE_DEFAULT",
    # v65 每日数据快照与误清空恢复
    "snapBox",
    "snapList",
    "snapNowBtn",
    "snapshotBuild",
    "snapshotSaveCloud",
    "snapshotRotateCloud",
    "maybeDailySnapshot",
    "restoreDiff",
    "restoreApply",
    "SNAP_META_PREFIX",
    "SNAP_CLOUD_DAYS",
    # v67 时光档案时间范围汇总 + 当日时刻时间线
    "archiveRange",
    "_archiveInRange",
    "_clockLabel",
    "_archiveItemHtml",
    "data-range=\"day\"",
    "tl-clock",
    # v72 优先级排序 / 周计划归档 / 经期天数 / 收纳位置归类 / 番茄累计
    "plannerPrioRank",
    "sortPlannerByPriority",
    "renderStorageLocFilters",
    "renderStorageLocGroups",
    "data-storage-loc",
    "storageLocFilters",
    "storageOvLocs",
    "_pomo.pending",
    # v73 档案日期漫游（‹ › + 日期选择器 + 回到今天）+ 倒数日模块（含农历）
    "_archCursor",
    "_archiveStep",
    "_archiveGoto",
    "renderArchiveNav",
    "id=\"archiveNav\"",
    "id=\"archiveDate\"",
    "META_COUNTDOWN_KEY",
    "countdownPush",
    "countdownPull",
    "renderCountdown",
    "data-nav=\"countdown\"",
    "i-countdown",
    "CD_LUNAR_FESTIVALS",
    "lunar2solar",
    "v72：用户习惯只标「首日 + 末日」",
    "v72：远端快照若属于「更早的一周」",
    # v68 使用频率跨设备同步 + 示例数据清理 + 当日时间线升序
    "storageUsage",
    "mergeRemoteUsage",
    "stripSampleData",
    "_hasRealSyncedData",
    # v69 使用频率名称 / 学习番茄钟 / 未来日程归档 / 档案周历月历年汇总 / 重复日程置顶
    "pomoClock",
    "pomoPanel",
    "bindPomodoro",
    "番茄时钟",
    "_archiveWeekHtml",
    "_archiveMonthHtml",
    "_archiveYearHtml",
    "arch-month-grid",
    "ay-months",
    "未来日程 · ",
    "repeat-pin",
    # v70 时刻标签时段修正（0 点不再显示成上午12点）
    "v70：凌晨段用 24 小时制",
    "'凌晨'",
    # v71 周历/月历点击展开当天全部
    "_archiveOpenDay",
    "_archiveDayItemsHtml",
    "arch-sheet-wrap",
    "data-arch-date",
    "点任意一天或 +N，查看当天全部记录",
    # v74 修复 CSS 泄漏（习惯健康页顶部出现代码）+ 倒数日视觉重做
    ".cd-hero{display:grid",
    "cd-hero-main",
    "cd-hero-name",
    "cd-hero-count",
    "cd-hero-side",
    "cd-hero-sm{",
    "cd-num{",
    "cd-body{flex:1",
    "<b class=\"txt\">今天</b>",
    "v74：倒数日样式已回归主 style",
    # v75 移动端导航补倒数日 + P1 三档视觉层级
    # 注意：平台会给元素补 data-page-node-id，不能用整段标签串做断言
    '>倒数</span>',
    'data-nav="countdown"><svg',
    "renderModuleInsights",
    "_miSet",
    "_miMoney",
    "_miHabits",
    "_miFitness",
    "_miSleep",
    "_miStudy",
    "_miPlanner",
    "_miHome",
    "_miDiet",
    "_miStorage",
    "_miPayback",
    "mod-insight",
    ".mi-main b{",
    ".mi-note{",
    "font-variant-numeric:tabular-nums",
    "id=\"miMoney\"",
    "id=\"miPayback\"",
    "function empty(message,hint)",
    "本月支出",
    "今日打卡",
    "大件投入",
    # v76 移动端文字重叠/挤压 + 闰月 checkbox 空白
    ".metric strong{margin-top:8px;font-size:23px;min-width:0;overflow-wrap:break-word",
    ".metric strong{font-size:17px;overflow-wrap:break-word;word-break:break-all",
    ".record-main{min-width:0}.record-main strong,.record-main small{display:block;overflow-wrap:break-word",
    ".mood-calendar .cal-cell{min-height:38px;border-radius:9px;gap:1px}",
    ".cd-inline input[type=checkbox]{width:16px;height:16px",
    # v77 心情月历第 7 列溢出 / 物品明细与身体记录文字挤压 / 消费结构圆环数字自适应
    "repeat(7,minmax(0,1fr))",
    "#paybackList .record-amount{grid-column:2;grid-row:2",
    "#paybackList .record-row{grid-template-columns:38px minmax(0,1fr) 30px",
    "#fitnessList .record-main small{max-width:100%;line-height:1.6;margin-top:3px}",
    ".record-main small .nb{white-space:nowrap}",
    "_amtFs",
    # v78 行被 flex 定高列表压缩（flex-shrink 缺失）致金额/体重溢出压下一条
    "border-bottom:1px solid #e3e6ea;flex-shrink:0}",
    # v79 库存总览位置筛选不生效
    "/* v79 库存总览同样应用收纳位置筛选（归类块保持全量便于切换） */",
    "data-action=\"storage-loc-clear\"",
    "if(type==='storage-loc-clear'){state.settings.storageLoc='';saveState();renderStorage();}",
    # v80 立即备份：dbUpdate 带回调，meta 更新失败不再谎报成功
    "function dbUpdate(databaseId, recordId, props, cb)",
    "stEl.textContent = '共 ' + list.length + ' 份快照，云端保留最近 ' + SNAP_CLOUD_DAYS + ' 天。' + _modeNote;",
    # v81 立即备份按不动：真就绪判定 + 即时反馈 + 委托兜底 + 绑定隔离
    "__realImpls__.database",
    "var _snapManualBusy = false;",
    "window.__snapDelegateBound",
    "[init] 绑定失败",
    # v81b 备份无提示：toast 被 settings-backdrop(z120) 盖住 + 手机上 app-tip(z120) 盖住按钮吃掉点击
    "bottom:28px;z-index:10000;",
    "safe-area-inset-bottom));z-index:90;",
    # v82 云端响应超时：meta 过滤读取 + 快照分片 + 60s 看门狗转后台
    "function dbFetchMetaFiltered",
    "var SNAP_CHUNK_CHARS = 120000;",
    "chunks: parts.length",
    "已转后台继续，完成后会再提示",
    # v83 转后台无结局：查询/写入硬超时 + 关键路径纯 dbAdd + 串行锁 + 分片带 at 身份
    "查询硬超时(20s)",
    "addRecord 硬超时(30s)",
    "关键路径只走 dbAdd",
    "var _snapCloudBusy = false;",
    "只删比我旧的，绝不误删并发的更新备份",
    "key + '#' + snap.at + '#' + (i + 1)",
    "刚触发过一次备份，正在写入",
    # v84 同步不收敛：runMerge once 保护 + sleep 补传链 + pendingDeletes 方向 + 桥慢路径补传
    "var pending = 13, done = 0, changed = false, fired = false;",
    "else if(rec.type==='sleep')pushSleep(rec);",
    "return failedKeys[d.db+'|'+d.rid];",
    "v84: 补传/清理不再以拉取成功为前提",
    "v84: 补上滞留数据补传/删除重试",
    # v85 重复日程排到今天 + 当天快照随条数变化刷新 + runMerge 兜底 + remoteId 立即落盘
    "v85：加入日程一律落到「今天」",
    "addRecord('planner',isoDate(),{title:item.title,",
    "加入即排到今天",
    "function snapshotCountsNow()",
    "v85：当天已有快照，但若本机数据条数已变化",
    "function saveStateNow()",
    "remoteId = rid; saveStateNow();",
]


def run(script, args, token):
    """调用资料库脚本，token 走 stdin 第一行。"""
    cmd = [PY, script] + args
    proc = subprocess.run(
        cmd,
        input=(token + "\n").encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=LIB,
    )
    out = proc.stdout.decode("utf-8", errors="replace")
    return proc.returncode, out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--token", required=True)
    ap.add_argument("--markers", default="", help="额外需要断言的线上标识，逗号分隔")
    opts = ap.parse_args()
    token = opts.token.strip()

    db_json = json.dumps([{"id": i} for i in DB_IDS], separators=(",", ":"))
    print("[1/4] import_html ...")
    rc, out = run("page/import_html.py", ["--token-stdin", HTML, "--node-block-id", NODE_BLOCK_ID, "--databases", db_json], token)
    print(out.strip()[:900])
    if '"error"' in out or "Traceback" in out:
        print("!! 导入失败，终止（页面未更新）")
        sys.exit(1)

    print("[2/4] publish_page ...")
    rc, out = run("page/publish_page.py", ["--token-stdin", "--node-id", NODE_ID], token)
    print(out.strip()[:900])

    print("[3/4] list artifacts ...")
    _, out = run("page/list_page_publish_artifacts.py", ["--token-stdin", "--node-id", NODE_ID], token)
    print(out.strip()[:600])
    version = None
    try:
        data = json.loads(out.strip().splitlines()[-1])
        url = data["data"]["url"]
        version = url.rstrip("/").split("/")[-1]
    except Exception as e:
        print("!! 解析版本号失败:", e)
    print("静态版本:", version)

    if not version:
        print("!! 无法取版本号，跳过线上校验")
        sys.exit(1)

    print("[4/4] 抓取线上静态文件并断言 ...")
    url = f"{STATIC_BASE}/{NODE_ID}/{version}/life-all-in-one.html"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "Pragma": "no-cache"})
            raw = urllib.request.urlopen(req, timeout=45).read().decode("utf-8", errors="replace")
            break
        except Exception as e:
            print(f"  下载失败({attempt+1}/3): {e}")
            time.sleep(3)
    else:
        print("!! 三次下载均失败")
        sys.exit(1)

    print(f"  线上文件 {len(raw)} 字符")
    markers = REQUIRED_MARKERS + [m for m in opts.markers.split(",") if m.strip()]
    missing = [m for m in markers if m not in raw]
    for m in markers:
        print(("  FOUND " if m not in missing else "  MISS  ") + m)
    if missing:
        print("!! 线上缺少标识:", missing, "——改动未真正生效，请检查")
        sys.exit(2)
    print("OK: 线上已包含全部改动标记。链接 https://workbuddy.link/p/" + NODE_ID)


if __name__ == "__main__":
    main()
