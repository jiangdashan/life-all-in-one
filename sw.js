/* 日常集 · Service Worker
   策略：文档请求 network-first（优先拿最新代码），失败或超时回落缓存 → 离线可用。
   安全边界：只缓存应用外壳（HTML），绝不接触任何用户数据（数据全部存于 localStorage，SW 无法访问）。 */
var CACHE = 'richangji-shell-v1';
var SHELL = ['./', './life-all-in-one.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(u).catch(function () {});
      }));
    }).catch(function () {})
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).catch(function () {}).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function (e) {
  if (e && e.data && e.data.action === 'skipWaiting') self.skipWaiting();
});

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error('sw-timeout')); }, ms);
    promise.then(function (v) { clearTimeout(timer); resolve(v); },
                 function (err) { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  var isDoc = req.mode === 'navigate' || /(\.html|\/)$/.test(url.pathname);
  if (!isDoc) return;

  e.respondWith(
    withTimeout(fetch(req), 3000).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        return caches.match('./life-all-in-one.html').then(function (h2) {
          return h2 || caches.match('./');
        });
      }).then(function (fallback) {
        return fallback || Response.error();
      });
    })
  );
});
