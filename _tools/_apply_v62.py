# -*- coding: utf-8 -*-
"""v62 封面文字改用 HTML 渲染：彻底脱离 SVG <text> 的移动端字形不可控问题"""
import io, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()
orig = s
log = []

# ---- R1 CSS 整组替换 ----
OLD_CSS = ".media-auto-cover{width:100%;height:100%;display:block}.media-auto-cover svg{width:100%;height:100%;display:block}.media-auto-cover .cover-ini{letter-spacing:0}.media-list .media-auto-cover .cover-t,.media-list .media-auto-cover .cover-type{display:none}"
NEW_CSS = (
    ".media-auto-cover{position:relative;width:100%;height:100%;background:var(--ac-bg);overflow:hidden;box-sizing:border-box;padding:0 11% 9% 16%;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;text-align:left}"
    ".media-auto-cover .ac-bar{position:absolute;left:0;top:0;bottom:0;width:5.5%;background:var(--ac-bar)}"
    ".media-auto-cover .ac-ini{position:absolute;left:13%;top:9%;font-family:\"Songti SC\",STSong,serif;font-size:30px;font-weight:400;line-height:1;color:var(--ac-bar);opacity:.2}"
    ".media-auto-cover .ac-title{position:relative;width:100%;font-family:-apple-system,\"PingFang SC\",\"HarmonyOS Sans SC\",\"MiSans\",sans-serif;font-size:11px;font-weight:400;line-height:1.3;color:var(--ac-ink);word-break:break-word;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;-webkit-font-smoothing:antialiased}"
    ".media-auto-cover .ac-type{position:relative;margin-top:5px;font-family:-apple-system,\"PingFang SC\",\"HarmonyOS Sans SC\",sans-serif;font-size:9px;font-weight:400;line-height:1;color:var(--ac-bar);opacity:.68}"
    ".media-auto-cover.is-mini{padding:0}"
    ".media-auto-cover.is-mini .ac-ini{left:5.5%;right:0;top:30%;text-align:center;font-size:20px;opacity:.26}"
    ".media-auto-cover.is-mini .ac-title,.media-auto-cover.is-mini .ac-type{display:none}"
)
if s.count(OLD_CSS) != 1:
    print("FAIL[css] anchor count=%d" % s.count(OLD_CSS)); sys.exit(2)
s = s.replace(OLD_CSS, NEW_CSS, 1); log.append("R1-css")

# ---- R2 删除 _coverLines + _autoCoverSvg 两个函数 ----
A2 = "  function _coverLines(name,maxWidth,maxLines){"
B2 = "  function _autoCoverHtml(item,view){"
i, j = s.find(A2), s.find(B2)
if i < 0 or j < 0 or j <= i:
    print("FAIL[del] i=%d j=%d" % (i, j)); sys.exit(2)
removed = j - i
s = s[:i] + s[j:]; log.append("R2-del(%d chars)" % removed)

# ---- R3 重写 _autoCoverHtml ----
A3 = "  function _autoCoverHtml(item,view){"
C3 = "function resetMediaCover(){"
i, j = s.find(A3), s.find(C3)
if i < 0 or j <= i:
    print("FAIL[html] i=%d j=%d" % (i, j)); sys.exit(2)
NEW_FN = """  function _autoCoverHtml(item,view){
    var plain=(item&&item.sample)?translateText(item.name):String((item&&item.name)||'');
    if(state.settings.mediaAutoCover===false){
      var nm=(item&&item.sample)?localizedHtml(item.name):userHtml(item.name);
      return '<div class="media-placeholder">'+nm+'</div>';
    }
    var type=String((item&&item.type)||'');
    var pal=_coverPalette(plain+'|'+type);
    var style='--ac-bg:'+pal.bg+';--ac-bar:'+pal.bar+';--ac-ink:'+pal.ink;
    return '<div class="media-auto-cover'+(view==='list'?' is-mini':'')+'" style="'+style+'">'
      +'<div class="ac-bar"></div>'
      +'<div class="ac-ini">'+escapeHtml(_coverInitial(plain))+'</div>'
      +'<div class="ac-title">'+escapeHtml(plain)+'</div>'
      +(type?'<div class="ac-type">'+escapeHtml(type)+'</div>':'')
      +'</div>';
  }
"""
s = s[:i] + NEW_FN + s[j:]; log.append("R3-html")

# ---- R4 __appTest 导出调整 ----
A4 = "_pickMediaCover:_pickMediaCover,_isHttpUrl:_isHttpUrl,_autoCoverSvg:_autoCoverSvg,_coverInitial:_coverInitial,_coverLines:_coverLines,_coverPalette:_coverPalette,_autoCoverHtml:_autoCoverHtml,"
B4 = "_pickMediaCover:_pickMediaCover,_isHttpUrl:_isHttpUrl,_coverInitial:_coverInitial,_coverPalette:_coverPalette,_autoCoverHtml:_autoCoverHtml,"
if s.count(A4) != 1:
    print("FAIL[test] anchor count=%d" % s.count(A4)); sys.exit(2)
s = s.replace(A4, B4, 1); log.append("R4-test")

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("OK applied:", " | ".join(log))
print("size %d -> %d (%+d)" % (len(orig), len(s), len(s) - len(orig)))
