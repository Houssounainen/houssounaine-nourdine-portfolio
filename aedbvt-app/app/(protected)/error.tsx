"use client";

import { useEffect } from "react";
import { UiIcon } from "@/components/ui-icon";

export default function ProtectedError({
  error,
  reset,
}:{error:Error & {digest?:string};reset:()=>void}){
  useEffect(()=>{
    console.error("AEDBVT protected route error",error);
  },[error]);

  return <section className="page">
    <article className="panel app-error-card st-card st-inline">
      <div className="st-illus tone-warn" aria-hidden="true">
        <span className="st-illus-big"><UiIcon name="bolt"/></span>
        <span className="icon-tile lg solid st-orb st-orb-1" style={{"--tile":"var(--coral)"} as React.CSSProperties}><UiIcon name="info"/></span>
        <span className="icon-tile lg solid st-orb st-orb-2" style={{"--tile":"var(--accent)"} as React.CSSProperties}><UiIcon name="check"/></span>
      </div>
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
