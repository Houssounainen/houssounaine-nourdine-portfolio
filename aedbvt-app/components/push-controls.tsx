"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String:string){
  const padding="=".repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
  const rawData=window.atob(base64);
  return Uint8Array.from([...rawData].map((char)=>char.charCodeAt(0)));
}

export function PushControls({
  publicKey,
  configured,
  deviceCount,
}:{publicKey:string;configured:boolean;deviceCount:number}){
  const [supported,setSupported]=useState(true);
  const [subscribed,setSubscribed]=useState(false);
  const [permission,setPermission]=useState<NotificationPermission>("default");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    const ok="serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window&&window.isSecureContext;
    setSupported(ok);
    if(!ok) return;

    setPermission(Notification.permission);
    navigator.serviceWorker.ready
      .then((registration)=>registration.pushManager.getSubscription())
      .then((subscription)=>setSubscribed(Boolean(subscription)))
      .catch(()=>setSupported(false));
  },[]);

  async function subscribe(){
    if(!supported||!configured||!publicKey) return;
    setBusy(true);
    setMessage("");
    try{
      const nextPermission=await Notification.requestPermission();
      setPermission(nextPermission);
      if(nextPermission!=="granted"){
        setMessage("Autorisation de notification non accordée.");
        return;
      }

      const registration=await navigator.serviceWorker.ready;
      let subscription=await registration.pushManager.getSubscription();
      if(!subscription){
        subscription=await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:urlBase64ToUint8Array(publicKey),
        });
      }

      const json=subscription.toJSON();
      const response=await fetch("/api/push/subscription",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          endpoint:json.endpoint,
          keys:json.keys,
          platform:navigator.platform||"web",
        }),
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||"Enregistrement impossible");
      setSubscribed(true);
      setMessage("Notifications activées sur cet appareil.");
    }catch(error:any){
      setMessage(error?.message||"Impossible d’activer les notifications.");
    }finally{
      setBusy(false);
    }
  }

  async function unsubscribe(){
    if(!supported) return;
    setBusy(true);
    setMessage("");
    try{
      const registration=await navigator.serviceWorker.ready;
      const subscription=await registration.pushManager.getSubscription();
      if(subscription){
        await fetch("/api/push/subscription",{
          method:"DELETE",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({endpoint:subscription.endpoint}),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notifications désactivées sur cet appareil.");
    }catch(error:any){
      setMessage(error?.message||"Impossible de désactiver les notifications.");
    }finally{
      setBusy(false);
    }
  }

  async function test(){
    setBusy(true);
    setMessage("");
    try{
      const response=await fetch("/api/push/test",{method:"POST"});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||"Test impossible");
      setMessage("Notification test envoyée.");
    }catch(error:any){
      setMessage(error?.message||"Test impossible.");
    }finally{
      setBusy(false);
    }
  }

  return <article className="panel push-control-card">
    <div className="panel-head"><div><span className="eyebrow">Cet appareil</span><h2>Notifications push</h2></div><span className={"badge "+(subscribed?"ok":"")}>{subscribed?"Activées":"Désactivées"}</span></div>
    {!configured&&<p className="push-warning">Les clés VAPID ne sont pas encore configurées sur le serveur de production. L’interface est prête, mais aucun push ne sera envoyé tant que cette configuration n’est pas ajoutée.</p>}
    {!supported&&<p>Ce navigateur ne prend pas en charge Web Push dans ce contexte. Sur iPhone/iPad, installez d’abord AEDBVT sur l’écran d’accueil puis ouvrez l’application installée.</p>}
    {supported&&<p>Recevez les annonces, changements d’agenda et alertes qui vous concernent, même lorsque l’application n’est pas ouverte.</p>}
    <div className="push-status-grid"><div><small>Permission navigateur</small><b>{permission}</b></div><div><small>Appareils enregistrés</small><b>{deviceCount}</b></div></div>
    <div className="push-actions">
      {!subscribed?<button className="button primary" disabled={busy||!configured} onClick={subscribe}>{busy?"Activation…":"Activer sur cet appareil"}</button>:<button className="button secondary" disabled={busy} onClick={unsubscribe}>Désactiver</button>}
      {subscribed&&<button className="button secondary" disabled={busy||!configured} onClick={test}>Envoyer un test</button>}
    </div>
    {message&&<small className="push-message" role="status">{message}</small>}
  </article>;
}
