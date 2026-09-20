const STATIC_CACHE="aedbvt-static-v1";
const OFFLINE_URL="/offline";
const PRECACHE=[OFFLINE_URL,"/aedbvt-logo.webp","/aedbvt-pwa.svg"];

self.addEventListener("install",(event)=>{
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache)=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener("activate",(event)=>{
  event.waitUntil(
    caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key!==STATIC_CACHE).map((key)=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",(event)=>{
  const request=event.request;
  if(request.method!=="GET") return;

  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;

  if(request.mode==="navigate"){
    event.respondWith(
      fetch(request).catch(()=>caches.match(OFFLINE_URL))
    );
    return;
  }

  const safeStatic=
    url.pathname.startsWith("/_next/static/") ||
    url.pathname==="/aedbvt-logo.webp" ||
    url.pathname==="/aedbvt-pwa.svg";

  if(safeStatic){
    event.respondWith(
      caches.match(request).then((cached)=>{
        if(cached) return cached;
        return fetch(request).then((response)=>{
          if(response.ok){
            const copy=response.clone();
            caches.open(STATIC_CACHE).then((cache)=>cache.put(request,copy));
          }
          return response;
        });
      })
    );
  }
});

self.addEventListener("push",(event)=>{
  let data={};
  try{ data=event.data?event.data.json():{}; }catch{ data={body:event.data?.text()||""}; }

  const title=data.title||"AEDBVT";
  const options={
    body:data.body||"Nouvelle notification",
    icon:data.icon||"/aedbvt-logo.webp",
    badge:data.badge||"/aedbvt-logo.webp",
    tag:data.tag||"aedbvt",
    data:{url:data.url||"/notifications"},
    renotify:true,
  };

  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener("notificationclick",(event)=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||"/notifications",self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({type:"window",includeUncontrolled:true}).then((clients)=>{
      for(const client of clients){
        if(client.url===target&&"focus" in client) return client.focus();
      }
      return self.clients.openWindow?self.clients.openWindow(target):undefined;
    })
  );
});
