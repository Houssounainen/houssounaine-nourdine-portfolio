import Link from "next/link";
import { UiIcon } from "@/components/ui-icon";

export default async function AccessDeniedPage({
  searchParams,
}:{searchParams:Promise<{reason?:string}>}){
  const params=await searchParams;
  const suspended=params.reason==="suspended";
  const missing=params.reason==="profile";

  return <main className="access-state-page st-page">
    <article className="access-state-card st-card">
      <div className="st-illus tone-danger" aria-hidden="true">
        <span className="st-illus-big"><UiIcon name={suspended?"lock":missing?"user":"shield"}/></span>
        <span className="icon-tile lg solid st-orb st-orb-1" style={{"--tile":"var(--orange)"} as React.CSSProperties}><UiIcon name="lock"/></span>
        <span className="icon-tile lg solid st-orb st-orb-2" style={{"--tile":"var(--violet)"} as React.CSSProperties}><UiIcon name="info"/></span>
      </div>
      <span className="eyebrow">AEDBVT · Accès</span>
      <h1>{suspended?"Compte suspendu":missing?"Compte non rattaché":"Accès non autorisé"}</h1>
      <p>{suspended
        ?"Votre compte existe mais il est actuellement suspendu. Contactez un administrateur AEDBVT pour vérifier votre accès."
        :missing
          ?"Votre authentification est valide, mais aucun profil AEDBVT actif n’est encore rattaché à ce compte."
          :"Votre rôle ne donne pas accès à cette rubrique. Les autres espaces autorisés restent disponibles depuis le tableau de bord."}</p>
      <div className="access-state-actions">
        {!suspended&&!missing&&<Link className="button primary" href="/dashboard">Retour au tableau de bord</Link>}
        <form action="/auth/signout" method="post"><button className="button secondary">Se déconnecter</button></form>
      </div>
    </article>
  </main>;
}
