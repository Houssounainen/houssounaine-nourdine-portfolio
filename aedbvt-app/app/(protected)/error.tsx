"use client";

import { useEffect } from "react";

export default function ProtectedError({
  error,
  reset,
}:{error:Error & {digest?:string};reset:()=>void}){
  useEffect(()=>{
    console.error("AEDBVT protected route error",error);
  },[error]);

  return <section className="page">
    <article className="panel app-error-card">
      <span className="eyebrow">Erreur temporaire</span>
      <h1>Cette rubrique n’a pas pu se charger</h1>
      <p>Vos données n’ont pas été supprimées. Réessayez la requête ou revenez au tableau de bord. Si l’erreur persiste, l’identifiant ci-dessous peut aider au diagnostic.</p>
      {error.digest&&<code>{error.digest}</code>}
      <div className="app-error-actions">
        <button className="button primary" onClick={reset}>Réessayer</button>
        <a className="button secondary" href="/dashboard">Tableau de bord</a>
      </div>
    </article>
  </section>;
}
