"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function safeNext(value:string|null){
  if(!value||!value.startsWith("/")||value.startsWith("//")) return "/update-password";
  return value;
}

export default function AuthCompletePage(){
  const [message,setMessage]=useState("Validation du lien sécurisé…");

  useEffect(()=>{
    let active=true;
    const run=async()=>{
      const supabase=createClient();
      const url=new URL(window.location.href);
      const next=safeNext(url.searchParams.get("next"));
      const errorDescription=url.searchParams.get("error_description");
      if(errorDescription){
        if(active) setMessage("Ce lien n’est plus valide. Demandez un nouveau lien.");
        return;
      }

      const code=url.searchParams.get("code");
      if(code){
        const {error}=await supabase.auth.exchangeCodeForSession(code);
        if(error){
          if(active) setMessage("Ce lien n’a pas pu être validé ou a expiré.");
          return;
        }
        window.location.replace(next);
        return;
      }

      const hash=new URLSearchParams(window.location.hash.replace(/^#/,""));
      const accessToken=hash.get("access_token");
      const refreshToken=hash.get("refresh_token");
      if(accessToken&&refreshToken){
        const {error}=await supabase.auth.setSession({access_token:accessToken,refresh_token:refreshToken});
        if(error){
          if(active) setMessage("La session d’activation n’a pas pu être créée.");
          return;
        }
        window.location.replace(next);
        return;
      }

      if(active) setMessage("Lien incomplet ou expiré. Demandez un nouveau lien.");
    };
    run().catch(()=>active&&setMessage("Une erreur est survenue pendant la validation."));
    return()=>{active=false};
  },[]);

  return <main className="auth-page" id="contenu">
    <section className="auth-card auth-complete-card">
      <Image src="/aedbvt-logo.webp" alt="" width={58} height={58}/>
      <span className="eyebrow">AEDBVT · Authentification</span>
      <h1>Validation du lien</h1>
      <p>{message}</p>
      <a className="button secondary" href="/forgot-password">Demander un nouveau lien</a>
    </section>
  </main>;
}
