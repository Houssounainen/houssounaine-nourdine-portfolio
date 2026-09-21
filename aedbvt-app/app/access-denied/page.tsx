import Link from "next/link";

export default async function AccessDeniedPage({
  searchParams,
}:{searchParams:Promise<{reason?:string}>}){
  const params=await searchParams;
  const suspended=params.reason==="suspended";
  const missing=params.reason==="profile";

  return <main className="access-state-page">
    <article className="access-state-card">
      <span className="access-state-mark" aria-hidden="true">!</span>
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
