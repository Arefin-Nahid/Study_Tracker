// Study Tracker service worker: makes the app installable and usable offline.
const CACHE='study-tracker-v7';
const CORE=['./','index.html','study-tracker.webmanifest','config/firebase-config.js','css/styles.css','js/data.js','js/app.js','js/planner.js','js/ai.js','js/boot.js','js/sync.js','icons/icon.svg','icons/logo-32.png','icons/logo-180.png','icons/logo-192.png','icons/logo-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
  e.respondWith(fetch(r).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{});return res})
    .catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):Response.error()))));
});
