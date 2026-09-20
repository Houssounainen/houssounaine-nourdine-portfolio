"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event{
  prompt:()=>Promise<void>;
  userChoice:Promise<{outcome:"accepted"|"dismissed";platform:string}>;
}

export function PwaBootstrap(){
  const [installEvent,setInstallEvent]=useState<BeforeInstallPromptEvent|null>(null);
  const [offline,setOffline]=useState(false);
  const [iosHint,setIosHint]=useState(false);
  const [dismissed,setDismissed]=useState(true);

  useEffect(()=>{
    setOffline(!navigator.onLine);
    const onOnline=()=>setOffline(false);
    const onOffline=()=>setOffline(true);
    window.addEventListener("online",onOnline);
    window.addEventListener("offline",onOffline);

    if("serviceWorker" in navigator&&window.isSecureContext){
      navigator.serviceWorker.register("/sw.js",{scope:"/"}).catch(()=>undefined);
    }

    const standalone=window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone);
    const isIos=/iphone|ipad|ipod/i.test(navigator.userAgent);

    const beforeInstall=(event:Event)=>{
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setDismissed(sessionStorage.getItem("aedbvt-install-dismissed")==="1");
    };
    const installed=()=>{
      setInstallEvent(null);
      setIosHint(false);
      setDismissed(true);
    };
    window.addEventListener("beforeinstallprompt",beforeInstall);
    window.addEventListener("appinstalled",installed);

    if(isIos&&!standalone&&sessionStorage.getItem("aedbvt-install-dismissed")!=="1"){
      setIosHint(true);
      setDismissed(false);
    }

    return ()=>{
      window.removeEventListener("online",onOnline);
      window.removeEventListener("offline",onOffline);
      window.removeEventListener("beforeinstallprompt",beforeInstall);
      window.removeEventListener("appinstalled",installed);
    };
  },[]);

  async function install(){
    if(!installEvent) return;
    await installEvent.prompt();
    const choice=await installEvent.userChoice;
    if(choice.outcome==="accepted"){
      setInstallEvent(null);
      setDismissed(true);
    }
  }

  function dismiss(){
    sessionStorage.setItem("aedbvt-install-dismissed","1");
    setDismissed(true);
  }

  return <>
    {offline&&<div className="network-banner" role="status">Hors ligne · les données privées ne sont pas mises en cache.</div>}
    {!dismissed&&(installEvent||iosHint)&&<aside className="pwa-install-card" aria-label="Installer AEDBVT">
      <div><b>Installer AEDBVT</b><small>{installEvent?"Ajoutez l’application à votre téléphone pour un accès plus rapide.":"Sur iPhone/iPad : Partager → Ajouter à l’écran d’accueil."}</small></div>
      <div>{installEvent&&<button className="button primary" onClick={install}>Installer</button>}<button className="pwa-dismiss" onClick={dismiss} aria-label="Fermer">×</button></div>
    </aside>}
  </>;
}
