# -*- coding: utf-8 -*-
"""v60 离线自动封面：原子读-改-写"""
import io, sys

P = r"D:\workbuddyProjects\工作台3\life-all-in-one.html"
s = io.open(P, encoding="utf-8").read()
orig = s
log = []

def rep(tag, old, new, expect=1, tail=False):
    global s
    n = s.count(old)
    if n != expect:
        print("FAIL[%s] anchor count=%d expect=%d" % (tag, n, expect))
        sys.exit(2)
    s = s.replace(old, new, 1)
    log.append(tag)

# ---- R1 CSS ----
A1 = ".media-list .media-placeholder{padding:5px;font-size:10px}"
CSS = ".media-auto-cover{width:100%;height:100%;display:block}.media-auto-cover svg{width:100%;height:100%;display:block}.media-auto-cover .cover-ini{letter-spacing:0}.media-list .media-auto-cover .cover-t,.media-list .media-auto-cover .cover-type{display:none}"
rep("R1-css", A1, A1 + CSS)

# ---- R2 HTML 开关按钮 ----
A2 = '</div><select class="compact-select" id="mediaTypeFilter">'
B2 = '</div><button type="button" class="btn ghost compact" id="mediaAutoCoverBtn" data-action="media-auto-cover" aria-pressed="true">自动封面</button><select class="compact-select" id="mediaTypeFilter">'
rep("R2-html", A2, B2)

# ---- R3 settings 默认值 ----
A3 = "mediaView:'wall',"
rep("R3-default", A3, A3 + "mediaAutoCover:true,")

# ---- R4 JS 函数体 ----
A4 = "function resetMediaCover(){"
FN = r"""  /* v60 离线自动封面：纯本地生成，零网络请求；同名作品的配色在任何设备上完全一致 */
  const AUTO_COVER_PALETTE=[
    {bg:'#eef1f4',bar:'#8a94a6',ink:'#2f343c'},
    {bg:'#ebeff3',bar:'#7b8aa3',ink:'#2c3340'},
    {bg:'#e9eeea',bar:'#7f9a86',ink:'#2b3830'},
    {bg:'#f1ece6',bar:'#a8927c',ink:'#3a3029'},
    {bg:'#eee9ef',bar:'#9b879c',ink:'#372c38'},
    {bg:'#e8edf1',bar:'#7f95a8',ink:'#29323a'},
    {bg:'#f0eee6',bar:'#a09a7c',ink:'#35342a'},
    {bg:'#ebe9e5',bar:'#8d8579',ink:'#332f2a'}
  ];
  function _hashStr(str){var h=2166136261;var s2=String(str||'');for(var i=0;i<s2.length;i++){h^=s2.charCodeAt(i);h=Math.imul(h,16777619);h=h>>>0;}return h>>>0;}
  function _coverPalette(seed){return AUTO_COVER_PALETTE[_hashStr(seed)%AUTO_COVER_PALETTE.length];}
  function _coverInitial(name){
    var s2=String(name||'').trim();if(!s2)return '\u00b7';
    var c=s2.charAt(0);
    if(/[\u4e00-\u9fa5]/.test(c))return c;
    var parts=s2.split(/[\s:\uff1a\-\u2013\u2014\u00b7\u3001,\uff0c.\u3002!\uff01?\uff1f()\uff08\uff09\[\]\/]+/).filter(Boolean);
    if(parts.length>=2)return (parts[0].charAt(0)+parts[1].charAt(0)).toUpperCase();
    return s2.slice(0,2).toUpperCase();
  }
  function _coverLines(name,maxWidth,maxLines){
    maxWidth=maxWidth||7;maxLines=maxLines||3;
    var s2=String(name||'').replace(/\s+/g,' ').trim();if(!s2)return [''];
    function cw(ch){return /[\u3000-\u9fff\uff00-\uffef]/.test(ch)?1:0.55;}
    var lines=[],cur='',w=0;
    for(var i=0;i<s2.length;i++){
      var ch=s2.charAt(i),vw=cw(ch);
      if(w+vw>maxWidth&&cur){lines.push(cur);cur=ch;w=vw;if(lines.length===maxLines)break;}
      else{cur+=ch;w+=vw;}
    }
    if(lines.length<maxLines&&cur)lines.push(cur);
    if(lines.length===maxLines&&lines.join('').length<s2.length){
      var li=maxLines-1,last=lines[li];
      lines[li]=(last.length>1?last.slice(0,-1):last)+'\u2026';
    }
    return lines.length?lines:[''];
  }
  function _autoCoverSvg(name,type,seed,mode){
    var p=_coverPalette(seed||name),ini=_coverInitial(name);
    var head='<svg viewBox="0 0 90 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+escapeHtml(name||'')+'">';
    var bg='<rect width="90" height="120" fill="'+p.bg+'"/><rect x="0" y="0" width="5" height="120" fill="'+p.bar+'"/>';
    if(mode==='mini'){
      return head+bg+'<text class="cover-ini" x="47" y="75" text-anchor="middle" font-size="46" font-weight="700" fill="'+p.bar+'" opacity=".32" font-family="Songti SC,STSong,serif">'+escapeHtml(ini)+'</text></svg>';
    }
    var lines=_coverLines(name,7,3);
    return head+bg
      +'<text class="cover-ini" x="13" y="52" font-size="40" font-weight="700" fill="'+p.bar+'" opacity=".3" font-family="Songti SC,STSong,serif">'+escapeHtml(ini)+'</text>'
      +lines.map(function(l,i){return '<text class="cover-t" x="13" y="'+(78+i*12)+'" font-size="10" font-weight="700" fill="'+p.ink+'" font-family="-apple-system,PingFang SC,Microsoft YaHei,sans-serif">'+escapeHtml(l)+'</text>';}).join('')
      +'<text class="cover-type" x="13" y="112" font-size="7" fill="'+p.bar+'" opacity=".85" font-family="-apple-system,PingFang SC,sans-serif">'+escapeHtml(String(type||''))+'</text>'
      +'</svg>';
  }
  function _autoCoverHtml(item,view){
    var plain=(item&&item.sample)?translateText(item.name):String((item&&item.name)||'');
    if(state.settings.mediaAutoCover===false){
      var nm=(item&&item.sample)?localizedHtml(item.name):userHtml(item.name);
      return '<div class="media-placeholder">'+nm+'</div>';
    }
    var seed=plain+'|'+String((item&&item.type)||'');
    return '<div class="media-auto-cover">'+_autoCoverSvg(plain,(item&&item.type),seed,view==='list'?'mini':'full')+'</div>';
  }

"""
rep("R4-js", A4, FN + A4)

# ---- R5 renderMedia 卡片模板 ----
A5 = ':`<div class="media-placeholder">${name}</div>`}'
B5 = ':_autoCoverHtml(item,state.settings.mediaView)}'
rep("R5-tpl", A5, B5)

# ---- R6 按钮状态 ----
A6 = "document.querySelectorAll('[data-media-view]').forEach(button=>button.classList.toggle('active',button.dataset.mediaView===state.settings.mediaView));"
B6 = A6 + "var _acEl=document.getElementById('mediaAutoCoverBtn');if(_acEl){var _acOn=state.settings.mediaAutoCover!==false;_acEl.classList.toggle('active',_acOn);_acEl.setAttribute('aria-pressed',_acOn?'true':'false');}"
rep("R6-btns", A6, B6)

# ---- R7 事件 ----
A7 = "if(type==='media-search-clear'){_mediaSearch='';var _msc=document.getElementById('mediaSearchInput');if(_msc)_msc.value='';state.settings.mediaPage=1;renderMedia();}"
B7 = A7 + "\n      if(type==='media-auto-cover'){state.settings.mediaAutoCover=(state.settings.mediaAutoCover===false);saveState();renderMedia();}"
rep("R7-event", A7, B7)

# ---- R8 __appTest 导出 ----
A8 = "_pickMediaCover:_pickMediaCover,_isHttpUrl:_isHttpUrl,"
B8 = "_pickMediaCover:_pickMediaCover,_isHttpUrl:_isHttpUrl,_autoCoverSvg:_autoCoverSvg,_coverInitial:_coverInitial,_coverLines:_coverLines,_coverPalette:_coverPalette,_autoCoverHtml:_autoCoverHtml,"
rep("R8-test", A8, B8)

io.open(P, "w", encoding="utf-8", newline="").write(s)
print("OK applied:", ",".join(log))
print("size %d -> %d (+%d)" % (len(orig), len(s), len(s) - len(orig)))
