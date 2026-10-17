"use client";

import { UiIcon } from "@/components/ui-icon";

export function SignOutButton({ compact = false }: { compact?: boolean }){
  async function signOut(){
    try{
      if("serviceWorker" in navigator){
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
      }
    }catch{
      // La déconnexion doit rester possible même si le nettoyage push échoue.
    }

    const form=document.createElement("form");
    form.method="POST";
    form.action="/auth/signout";
    document.body.appendChild(form);
    form.submit();
  }

  if(compact) return <button className="signout-icon" type="button" onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter"><UiIcon name="logout"/></button>;
  return <button className="ghost-button" type="button" onClick={signOut}><UiIcon name="logout"/>Se déconnecter</button>;
}
