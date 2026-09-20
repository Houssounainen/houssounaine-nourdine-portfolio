import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const [members, payments, events, docs, settings] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("payments").select("amount").eq("status", "confirmed"),
    supabase.from("events").select("*", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()),
    supabase.from("governance_documents").select("*", { count: "exact", head: true }).eq("published", true),
    supabase.from("app_settings").select("value").eq("key", "administrator_display_name").maybeSingle(),
  ]);
  const collected = (payments.data || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const adminName = typeof settings.data?.value === "string" ? settings.data.value : "Houssounaine Nourdine";

  return (
    <section className="page">
      <header className="page-header"><div><span className="eyebrow">Vue d’ensemble</span><h1>Tableau de bord</h1></div><span className="status-pill">Administrateur : {adminName}</span></header>
      <div className="stat-grid">
        <article><small>Membres actifs</small><strong>{members.count || 0}</strong><span>registre central</span></article>
        <article><small>Cotisations encaissées</small><strong>{collected.toLocaleString("fr-FR")} Ar</strong><span>paiements confirmés</span></article>
        <article><small>Événements à venir</small><strong>{events.count || 0}</strong><span>calendrier associatif</span></article>
        <article><small>Documents publiés</small><strong>{docs.count || 0}</strong><span>gouvernance</span></article>
      </div>
      <div className="content-grid">
        <article className="panel"><h2>Priorités de lancement</h2><ul className="check-list"><li>Créer le projet Supabase et appliquer la migration</li><li>Configurer le compte administrateur de Houssounaine Nourdine</li><li>Importer les membres réels après validation</li><li>Valider les statuts et le règlement avant publication officielle</li><li>Brancher le projet Vercel indépendant</li></ul></article>
        <article className="panel accent-panel"><span className="eyebrow">Sécurité</span><h2>Accès basé sur les rôles</h2><p>Les droits sont contrôlés dans PostgreSQL avec Row Level Security : membre, secrétaire, trésorier, bureau et administrateur.</p></article>
      </div>
    </section>
  );
}
