import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { UiIcon } from "@/components/ui-icon";
import { DetailHero, EmptyCard, Pill } from "@/components/gov-ui";
import { dateOnly, plural } from "@/lib/governance-labels";
import { createGovernanceDocument } from "./actions";

export default async function GovernanceDocumentsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:docs}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("governance_documents").select("id,title,category,version,published,updated_at,current_version_id").order("category").order("title")
  ]);
  const staff=isStaff(profile?.role);
  const count=docs?.length||0;
  const published=(docs||[]).filter(d=>d.published).length;

  return <section className="page gv-page">
    <DetailHero
      back={{href:"/governance#textes",label:"Gouvernance"}}
      kicker="Centre documentaire"
      title="Textes officiels"
      icon="book"
      color="#344054"
      meta={<><span><UiIcon name="document"/>{plural(count,"texte")}</span><span><UiIcon name="check"/>{plural(published,"publié")}</span></>}
      actions={<Link className="button secondary" href="/governance/decisions"><UiIcon name="list"/>Registre des décisions</Link>}
    />

    {staff&&<details className="gv-card gv-disclosure">
      <summary><span className="icon-tile" style={{"--tile":"#2453d6"} as React.CSSProperties}><UiIcon name="plus"/></span>Créer un document institutionnel</summary>
      <form action={createGovernanceDocument} className="form-stack">
        <label>Titre<input name="title" required placeholder="Règlement intérieur"/></label>
        <div className="form-two">
          <label>Catégorie<select name="category"><option>Textes fondateurs</option><option>Organisation</option><option>Éthique</option><option>Finances</option><option>Transparence</option><option>Procédures</option><option>Autre</option></select></label>
          <label>Version initiale<input name="version_label" defaultValue="1.0" required/></label>
        </div>
        <label>Contenu<textarea name="body" rows={10} required placeholder="Rédigez ici le texte complet…"/></label>
        <button className="button primary">Créer le document</button>
      </form>
    </details>}

    {count>0?<div className="gv-docs">
      {(docs||[]).map((doc)=><Link className="gv-doc" href={"/governance/documents/"+doc.id} key={doc.id}>
        <div className="gv-doc-top"><span className="gv-doc-file" aria-hidden="true"><UiIcon name="document"/></span><Pill tone={doc.published?"ok":"warn"}>{doc.published?"En vigueur":"Brouillon"}</Pill></div>
        <small>{doc.category}</small>
        <h3>{doc.title}</h3>
        <small>Version {doc.version||"—"} · mise à jour le {dateOnly(doc.updated_at)}</small>
        <span className="gv-doc-foot">Lire le texte<UiIcon name="arrow"/></span>
      </Link>)}
    </div>:<EmptyCard icon="book" color="#344054" title="Aucun texte officiel" text="Statuts, règlement intérieur et politiques de l’association apparaîtront ici."/>}
  </section>
}
