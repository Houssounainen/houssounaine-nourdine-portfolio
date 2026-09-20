"use client";

export function SignOutButton(){
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

  return <button className="ghost-button" type="button" onClick={signOut}>Se déconnecter</button>;
}
