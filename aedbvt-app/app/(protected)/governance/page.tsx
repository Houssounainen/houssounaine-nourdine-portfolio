import { createClient } from "@/lib/supabase/server";

export default async function GovernancePage() {
  const supabase = await createClient();
  const { data: docs } = await supabase.from("governance_documents").select("id,title,category,version,published,updated_at").order("category").order("title");

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Transparence</span><h1>Gouvernance</h1></div><span className="status-pill">Validation juridique requise</span></header>
      <div className="governance-grid">{(docs||[]).map(d=><article className="panel gov-card" key={d.id}><span className="eyebrow">{d.category}</span><h2>{d.title}</h2><p>Version {d.version} · {d.published?"publiée":"brouillon"}</p><small>Dernière mise à jour : {new Date(d.updated_at).toLocaleDateString("fr-FR")}</small></article>)}</div>
      <article className="panel warning"><h2>Avant lancement institutionnel</h2><p>Le régime juridique applicable à l’AEDBVT, y compris la question d’une éventuelle qualification d’association étrangère à Madagascar, doit être confirmé auprès des autorités compétentes avant de publier une mention de reconnaissance ou d’autorisation officielle.</p></article>
    </section>
  );
}
