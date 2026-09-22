#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v68 三项修复：
1) 物品使用频率（settings.storageUsage）跨设备同步：
   - settingsSnapshot 推送包含 storageUsage
   - applySettingsSync 拉取按「逐物品逐字段取最大/最早/最近」合并（mergeRemoteUsage）
   - pushSettingsNow 推送前先读云端 settings 并把远端 usage 并进来（防空统计整包覆盖）
   - pullAllRemote 完成后补一次 scheduleSettingsPush（升级后尽快把已有统计推上云）
2) 示例数据清理：
   - pullAllRemote 成功后 stripSampleData：老用户设备（有已同步真实数据或清空过）整批剔除示例
   - snapshotBuild 不再把示例写进快照
   - restoreDiff/restoreApply 过滤快照中的示例（防御旧快照）
3) 时光档案当日时间线按时刻升序（上午→下午）。
"""
import io, sys, re

PATH = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
DEPLOY = r"D:\workbuddyProjects\工作台3\_tools\_deploy.py"

src = io.open(PATH, "r", encoding="utf-8").read()
orig_len = len(src)
fails = []

def rep(old, new, tag, count=1):
    global src
    n = src.count(old)
    if n != count:
        fails.append((tag, "anchor count=%d expect=%d" % (n, count)))
        return
    src = src.replace(old, new, count)
    print("OK  " + tag)

# ---------- A. settingsSnapshot 增加 storageUsage ----------
rep(
"""      moodEmoji: state.settings.moodEmoji || {},
      periodPinHash: state.settings.periodPinHash || '',""",
"""      moodEmoji: state.settings.moodEmoji || {},
      storageUsage: state.settings.storageUsage || {},
      periodPinHash: state.settings.periodPinHash || '',""",
"A settingsSnapshot+storageUsage")

# ---------- B. applySettingsSync 拉取合并 ----------
rep(
"""          if (s.moodEmoji && typeof s.moodEmoji === 'object') { state.settings.moodEmoji = Object.assign({}, state.settings.moodEmoji||{}, s.moodEmoji); changed = true; }
        }
        if (remoteAt > localAt) { state.settingsSyncedAt = remoteAt; changed = true; }""",
"""          if (s.moodEmoji && typeof s.moodEmoji === 'object') { state.settings.moodEmoji = Object.assign({}, state.settings.moodEmoji||{}, s.moodEmoji); changed = true; }
          /* v68：物品使用频率（storageUsage）跨设备同步——按「逐物品逐字段取最大/最早/最近」合并，单调计数无冲突 */
          if (s.storageUsage && typeof s.storageUsage === 'object') { if (mergeRemoteUsage(s.storageUsage)) changed = true; }
        }
        if (remoteAt > localAt) { state.settingsSyncedAt = remoteAt; changed = true; }""",
"B applySettingsSync+merge")

# ---------- C. mergeRemoteUsage 函数（紧跟 _bumpUsage 之后） ----------
rep(
"""    if(!rec.first)rec.first=today;
    u[id]=rec;
  }
  function renderStorageFrequency(records){""",
"""    if(!rec.first)rec.first=today;
    u[id]=rec;
  }
  /* v68：把远端使用频率按「累计次数取大、首末日期取早/取晚、逐月次数取大」合并进本地，返回是否有变化 */
  function mergeRemoteUsage(ru){
    var touched = false, u = _storageUsage();
    Object.keys(ru).forEach(function(k){
      var rv = ru[k]; if(!rv || typeof rv !== 'object') return;
      var lv = u[k];
      if(!lv || typeof lv !== 'object'){
        u[k] = { n:Number(rv.n||0), first:String(rv.first||''), last:String(rv.last||''), m:Object.assign({}, rv.m||{}) };
        touched = true; return;
      }
      if(!lv.m) lv.m = {};
      var on = Number(lv.n||0), of = String(lv.first||''), ol = String(lv.last||'');
      var rf = String(rv.first||''), rl = String(rv.last||'');
      var nn = Math.max(on, Number(rv.n||0));
      var nf = (of && rf) ? (of < rf ? of : rf) : (of || rf);
      var nl = (ol && rl) ? (ol > rl ? ol : rl) : (ol || rl);
      var mmChanged = false;
      Object.keys(rv.m||{}).forEach(function(mk){
        var a = Number(lv.m[mk]||0), b = Number(rv.m[mk]||0);
        if(b > a){ lv.m[mk] = b; mmChanged = true; }
      });
      if(nn !== on || nf !== of || nl !== ol || mmChanged){ lv.n = nn; lv.first = nf; lv.last = nl; touched = true; }
    });
    return touched;
  }
  function renderStorageFrequency(records){""",
"C mergeRemoteUsage")

# ---------- D. stripSampleData + _hasRealSyncedData（applyRemoteClear 之后、runMerge 之前） ----------
rep(
"""    state.lastClearedAt = keepAfter;
    state.clearedAll = false;
    habitRemoteIndex = {};
  }
  function runMerge(cb){""",
"""    state.lastClearedAt = keepAfter;
    state.clearedAll = false;
    habitRemoteIndex = {};
  }
  /* v68：本机是否存在任一「已同步到云端」的真实数据（用于识别老用户设备） */
  function _hasRealSyncedData(){
    if((state.records||[]).some(function(r){ return r && !r.sample && r.remoteId; })) return true;
    if((state.mediaItems||[]).some(function(m){ return m && !m.sample && m.remoteId; })) return true;
    return Object.keys(habitRemoteIndex||{}).length > 0;
  }
  /* v68：老用户设备上不再保留内置示例数据。localStorage 被浏览器清掉后会重新播种示例，
   * 同步到真实数据后它们会一直混在列表里（如待买"燕麦奶"）。拉取成功后：
   * 只要本机有已同步的真实数据（或清空过全部数据），就整批剔除示例记录/书影音/示例打卡。 */
  function stripSampleData(){
    if(!(Number(state.lastClearedAt||0) > 0) && !_hasRealSyncedData()) return false;
    var n0 = (state.records||[]).length, m0 = (state.mediaItems||[]).length, h0 = 0;
    state.records = (state.records||[]).filter(function(r){ return r && !r.sample; });
    state.mediaItems = (state.mediaItems||[]).filter(function(m){ return m && !m.sample; });
    (state.habits||[]).forEach(function(h){ if(h && h.sample){ h.sample = false; h.entries = {}; h0++; } });
    var hit = (n0 - state.records.length) + (m0 - state.mediaItems.length) + h0;
    if(hit > 0){ try{ saveStateQuiet(); }catch(e){} }
    return hit > 0;
  }
  function runMerge(cb){""",
"D stripSampleData")

# ---------- E. pushSettingsNow 改为「先读远端 usage 合并再整包写回」 ----------
rep(
"""  function pushSettingsNow(fp){
    if (!ONLINE || LOCAL_ONLY || settingsPushing) { settingsPushing = false; return; }
    settingsPushing = true;
    var at = Date.now();
    state.settingsUpdatedAt = at;
    var snap = settingsSnapshot(); snap.updatedAt = at;
    var habitsPayload = JSON.stringify({updatedAt:at,habits:snap.habits,hiddenHabitKeys:snap.hiddenHabitKeys,deletedHabitNames:snap.deletedHabitNames,deletedPlanIds:snap.deletedPlanIds});
    var settingsPayload = JSON.stringify({updatedAt:at,weeklyPlan:snap.weeklyPlan,weeklyPlanHistory:snap.weeklyPlanHistory,weeklyPlanWeekStart:snap.weeklyPlanWeekStart,dietPlans:snap.dietPlans,fitnessProfile:snap.fitnessProfile,fitnessProfileUpdatedAt:snap.fitnessProfileUpdatedAt,budget:snap.budget,brand:snap.brand,moodEmoji:snap.moodEmoji,periodPinHash:snap.periodPinHash,periodPinSalt:snap.periodPinSalt,deletedPlanIds:snap.deletedPlanIds});
    var left = 2, okAll = true;
    function done(ok){ if(!ok) okAll = false; left--; if(left<=0){ settingsPushing = false; if(okAll){ state.settingsFingerprint = fp; state.settingsSyncedAt = at; saveStateQuiet(); } } }
    writeMetaValue(META_HABITS_KEY, habitsPayload, done);
    writeMetaValue(META_SETTINGS_KEY, settingsPayload, done);
  }""",
"""  function pushSettingsNow(fp){
    if (!ONLINE || LOCAL_ONLY || settingsPushing) { settingsPushing = false; return; }
    settingsPushing = true;
    /* v68：推送前先读一次云端 settings，把远端 storageUsage（使用频率）并进本地再整包写回。
     * 否则两台设备交错推送时，后写的一方会用「空统计」覆盖掉对方累计的使用次数。 */
    readMetaValue(META_SETTINGS_KEY, function(remote){
      try{ if (remote && remote.storageUsage && typeof remote.storageUsage === 'object') mergeRemoteUsage(remote.storageUsage); }catch(e){}
      var at = Date.now();
      state.settingsUpdatedAt = at;
      var snap = settingsSnapshot(); snap.updatedAt = at;
      var habitsPayload = JSON.stringify({updatedAt:at,habits:snap.habits,hiddenHabitKeys:snap.hiddenHabitKeys,deletedHabitNames:snap.deletedHabitNames,deletedPlanIds:snap.deletedPlanIds});
      var settingsPayload = JSON.stringify({updatedAt:at,storageUsage:snap.storageUsage,weeklyPlan:snap.weeklyPlan,weeklyPlanHistory:snap.weeklyPlanHistory,weeklyPlanWeekStart:snap.weeklyPlanWeekStart,dietPlans:snap.dietPlans,fitnessProfile:snap.fitnessProfile,fitnessProfileUpdatedAt:snap.fitnessProfileUpdatedAt,budget:snap.budget,brand:snap.brand,moodEmoji:snap.moodEmoji,periodPinHash:snap.periodPinHash,periodPinSalt:snap.periodPinSalt,deletedPlanIds:snap.deletedPlanIds});
      var left = 2, okAll = true;
      function done(ok){ if(!ok) okAll = false; left--; if(left<=0){ settingsPushing = false; if(okAll){ state.settingsFingerprint = fp; state.settingsSyncedAt = at; saveStateQuiet(); } } }
      writeMetaValue(META_HABITS_KEY, habitsPayload, done);
      writeMetaValue(META_SETTINGS_KEY, settingsPayload, done);
    });
  }""",
"E pushSettingsNow read-merge-write")

# ---------- F. pullAllRemote 挂钩：清理示例 + 补一次设置推送 ----------
rep(
"""    applySettingsSync(function(){ pullAllRemoteInner(function(ok){
      try{ maybeDailySnapshot(ok); }catch(e){ console.warn('[snap] 生成快照异常', e); }
      if(cb) cb(ok);
    }); });""",
"""    applySettingsSync(function(){ pullAllRemoteInner(function(ok){
      try{ if(ok) stripSampleData(); }catch(e){ console.warn('[samples] 清理示例数据异常', e); }
      try{ scheduleSettingsPush(); }catch(e){}
      try{ maybeDailySnapshot(ok); }catch(e){ console.warn('[snap] 生成快照异常', e); }
      if(cb) cb(ok);
    }); });""",
"F pullAllRemote hooks")

# ---------- G. snapshotBuild 排除示例 ----------
rep(
"""  function snapshotBuild(){
    try{
      var habitDays = 0;
      (state.habits||[]).forEach(function(h){ habitDays += Object.keys((h && h.entries) || {}).length; });
      return {
        v: SNAP_VERSION,
        at: Date.now(),
        date: isoDate(),
        counts: {
          records: (state.records||[]).length,
          media: (state.mediaItems||[]).length,
          habitDays: habitDays
        },
        records: JSON.parse(JSON.stringify(state.records||[])),
        mediaItems: JSON.parse(JSON.stringify(state.mediaItems||[])),
        habits: JSON.parse(JSON.stringify(state.habits||[]))
      };
    }catch(e){ return null; }
  }""",
"""  function snapshotBuild(){
    try{
      /* v68：示例数据不入快照（否则快照恢复会把示例带回，如待买"燕麦奶"） */
      var _recs = (state.records||[]).filter(function(r){ return r && !r.sample; });
      var _media = (state.mediaItems||[]).filter(function(m){ return m && !m.sample; });
      var _habits = (state.habits||[]).filter(function(h){ return h && !h.sample; });
      var habitDays = 0;
      _habits.forEach(function(h){ habitDays += Object.keys(h.entries || {}).length; });
      return {
        v: SNAP_VERSION,
        at: Date.now(),
        date: isoDate(),
        counts: {
          records: _recs.length,
          media: _media.length,
          habitDays: habitDays
        },
        records: JSON.parse(JSON.stringify(_recs)),
        mediaItems: JSON.parse(JSON.stringify(_media)),
        habits: JSON.parse(JSON.stringify(_habits))
      };
    }catch(e){ return null; }
  }""",
"G snapshotBuild filter samples")

# ---------- H. restoreDiff 过滤示例 ----------
rep(
"""    var addRecords = (snap.records||[]).filter(function(r){ return r && r.id && !seenR[r.id]; }).length;""",
"""    var addRecords = (snap.records||[]).filter(function(r){ return r && r.id && !r.sample && !seenR[r.id]; }).length;""",
"H restoreDiff records filter")

rep(
"""    var addMedia = (snap.mediaItems||[]).filter(function(m){ return m && m.id && !seenM[m.id]; }).length;""",
"""    var addMedia = (snap.mediaItems||[]).filter(function(m){ return m && m.id && !m.sample && !seenM[m.id]; }).length;""",
"H restoreDiff media filter")

rep(
"""    (snap.habits||[]).forEach(function(sh){
      if(!sh) return;
      var target = null;
      (state.habits||[]).forEach(function(h){ if(!target && h && (h.id === sh.id || h.name === sh.name)) target = h; });
      if(!target) return;
      Object.keys(sh.entries||{}).forEach(function(d){
        if(target.entries[d] === undefined && Number(sh.entries[d])) addHabitDays++;""",
"""    (snap.habits||[]).forEach(function(sh){
      if(!sh || sh.sample) return;
      var target = null;
      (state.habits||[]).forEach(function(h){ if(!target && h && (h.id === sh.id || h.name === sh.name)) target = h; });
      if(!target) return;
      Object.keys(sh.entries||{}).forEach(function(d){
        if(target.entries[d] === undefined && Number(sh.entries[d])) addHabitDays++;""",
"H restoreDiff habits filter")

# ---------- I. restoreApply 过滤示例 ----------
rep(
"""    (snap.records||[]).forEach(function(r){
      if(!r || !r.id || seenR[r.id]) return;""",
"""    (snap.records||[]).forEach(function(r){
      if(!r || !r.id || r.sample || seenR[r.id]) return;""",
"I restoreApply records filter")

rep(
"""    (snap.mediaItems||[]).forEach(function(m){
      if(!m || !m.id || seenM[m.id]) return;""",
"""    (snap.mediaItems||[]).forEach(function(m){
      if(!m || !m.id || m.sample || seenM[m.id]) return;""",
"I restoreApply media filter")

rep(
"""    (snap.habits||[]).forEach(function(sh){
      if(!sh) return;
      var target = null;
      (state.habits||[]).forEach(function(h){ if(!target && h && (h.id === sh.id || h.name === sh.name)) target = h; });
      if(!target) return;              /* 不恢复已删除的习惯定义，只回填它的打卡数据 */""",
"""    (snap.habits||[]).forEach(function(sh){
      if(!sh || sh.sample) return;
      var target = null;
      (state.habits||[]).forEach(function(h){ if(!target && h && (h.id === sh.id || h.name === sh.name)) target = h; });
      if(!target) return;              /* 不恢复已删除的习惯定义，只回填它的打卡数据 */""",
"I restoreApply habits filter")

# ---------- J. 当日时间线升序 ----------
rep(
"""    var withTime = ev.filter(function(e){ return e.at>0; });
    var noTime = ev.filter(function(e){ return !(e.at>0); });""",
"""    var withTime = ev.filter(function(e){ return e.at>0; });
    withTime.sort(function(a,b){ return (a.at||0) - (b.at||0); });   /* v68：当日按时刻先后升序（上午→下午），不再按插入序乱跳 */
    var noTime = ev.filter(function(e){ return !(e.at>0); });""",
"J renderArchive ascending")

# ---------- K. __appTest 导出新函数 ----------
rep(
"renderArchive:renderArchive,mergeShopping:mergeShopping,",
"renderArchive:renderArchive,mergeRemoteUsage:mergeRemoteUsage,stripSampleData:stripSampleData,snapshotBuild:snapshotBuild,settingsSnapshot:settingsSnapshot,mergeShopping:mergeShopping,",
"K __appTest exports")

if fails:
    print("\n!!!! ANCHOR FAILURES !!!!")
    for t, msg in fails:
        print(" -", t, msg)
    print("文件未写入。")
    sys.exit(1)

# ---------- 写入前完整性检查 ----------
for must in ["mergeRemoteUsage", "stripSampleData", "_hasRealSyncedData", "storageUsage:snap.storageUsage", "withTime.sort(function(a,b){ return (a.at||0) - (b.at||0); })"]:
    if must not in src:
        print("MISSING after patch:", must); sys.exit(1)

io.open(PATH, "w", encoding="utf-8", newline="").write(src)
print("written:", PATH, orig_len, "->", len(src))

# ---------- _deploy.py 增加线上断言标记 ----------
dep = io.open(DEPLOY, "r", encoding="utf-8").read()
old_m = '''    "tl-clock",
]'''
new_m = '''    "tl-clock",
    # v68 使用频率跨设备同步 + 示例数据清理 + 当日时间线升序
    "storageUsage",
    "mergeRemoteUsage",
    "stripSampleData",
    "_hasRealSyncedData",
]'''
if '"mergeRemoteUsage"' in dep:
    print("deploy markers already added")
else:
    if dep.count(old_m) != 1:
        print("DEPLOY anchor fail:", dep.count(old_m)); sys.exit(1)
    dep = dep.replace(old_m, new_m, 1)
    io.open(DEPLOY, "w", encoding="utf-8", newline="").write(dep)
    print("deploy markers updated")
print("ALL DONE")
