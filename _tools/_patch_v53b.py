# -*- coding: utf-8 -*-
"""v53b: 下拉赋值改为健壮写法（部分环境 select.value 只读），并抽出 _appSelectSync"""
import io

P = r'D:\workbuddyProjects\工作台3\life-all-in-one.html'
s = io.open(P, encoding='utf-8').read()


def rep(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'count mismatch %d != %d for: %s' % (c, n, old[:90])
    s = s.replace(old, new, n)


rep(
    "  function _appPlatform(){\n",
    """  /* 给 select 赋值：个别环境（如测试用 DOM 实现）value 只有 getter，逐级降级 */
  function _appSelectSync(sel, val){
    if(!sel || !val) return;
    try{ if(sel.value !== val) sel.value = val; }catch(e){}
    try{ if(sel.value === val) return; }catch(e){}
    try{
      var opts = sel.options || [];
      for(var i = 0; i < opts.length; i++){
        var o = opts[i];
        var ov = (o && (o.value !== undefined ? o.value : o.getAttribute && o.getAttribute('value'))) || '';
        try{ o.selected = (ov === val); }catch(e){}
      }
      for(var j = 0; j < opts.length; j++){
        try{ opts[j].setAttribute('selected', opts[j].selected ? 'selected' : ''); }catch(e){}
      }
    }catch(e){}
  }
  function _appPlatform(){\n"""
)

rep(
    """    var sel = document.getElementById('appPlatformSel');
    var cur = _appPlatformKey();
    if(sel && sel.value !== cur) sel.value = cur;""",
    """    var sel = document.getElementById('appPlatformSel');
    var cur = _appPlatformKey();
    _appSelectSync(sel, cur);"""
)

rep(
    "_appPlatformKey:_appPlatformKey};",
    "_appPlatformKey:_appPlatformKey,_appSelectSync:_appSelectSync};"
)

io.open(P, 'w', encoding='utf-8', newline='').write(s)
print('v53b patched, len =', len(s))
