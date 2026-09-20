import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isStaff } from "@/lib/auth";
import { createGovernanceDocument } from "./actions";

export default async function GovernanceDocumentsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:docs}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("governance_documents").select("id,title,category,version,published,updated_at,current_version_id").order("category").order("title")
  ]);
  const staff=isStaff(profile?.role);

  return <section className="page">
    <header className="page-header"><div><Link className="back-link" href="/governance">← Gouvernance</Link><span className="eyebrow">Référentiel institutionnel</span><h1>Centre documentaire</h1></div><Link className="button secondary" href="/governance/decisions">Registre des décisions</Link></header>

    {staff&&<form action={createGovernanceDocument} className="panel editorial-form document-create">
      <div className="form-title"><div><span className="eyebrow">Nouveau texte</span><h2>Créer un document institutionnel</h2></div><button className="button primary">Créer le document</button></div>
      <label>Titre<input name="title" required placeholder="Règlement intérieur"/></label>
      <label>Catégorie<select name="category"><option>Textes fondateurs</option><option>Organisation</option><option>Éthique</option><option>Finances</option><option>Transparence</option><option>Procédures</option><option>Autre</option></select></label>
      <label>Version initiale<input name="version_label" defaultValue="1.0" required/></label>
      <label className="wide">Contenu<textarea name="body" rows={12} required placeholder="Rédigez ici le texte complet…"/></label>
    </form>}

    <div className="document-library-grid">
      {(docs||[]).map((doc)=><Link className="panel institutional-doc-card" href={"/governance/documents/"+doc.id} key={doc.id}>
        <div className="article-meta"><span className="badge">{doc.category}</span><span className={"badge "+(doc.published?"ok":"")}>{doc.published?"Publié":"Brouillon"}</span></div>
        <h2>{doc.title}</h2>
        <p>Version courante : {doc.version||"—"}</p>
        <small>Mis à jour le {new Date(doc.updated_at).toLocaleDateString("fr-FR")}</small>
        <b>Ouvrir →</b>
      </Link>)}
      {!docs?.length&&<div className="panel empty-state">Aucun document institutionnel.</div>}
    </div>
  </section>
}
