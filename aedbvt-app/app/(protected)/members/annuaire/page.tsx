import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccessContext } from "@/lib/server-access";
import { getPublicSettings } from "@/lib/public-settings";
import { initials } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Annuaire des membres" };
export const dynamic = "force-dynamic";

type Member = { id: string; member_number: string | null; full_name: string; village: string | null; program: string | null; study_level: string | null; phone: string | null; email: string | null; status: string; joined_at: string | null; photo_path?: string | null };

const STATUS: Record<string, string> = { active: "Actif", pending: "En attente", inactive: "Inactif", suspended: "Suspendu" };

/** Annuaire complet, mis en page pour l’impression ou l’enregistrement en PDF. */
export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ statut?: string; village?: string }> }) {
  const params = await searchParams;
  const context = await getAccessContext("members_manage");
  if (!context.allowed) notFound();
  const settings = await getPublicSettings();
  let query = context.supabase.from("members").select("*").order("village").order("full_name");
  if (params.statut !== "tous") query = query.eq("status", "active");
  if (params.village) query = query.eq("village", params.village);
  const { data } = await query;
  const members = (data || []) as Member[];

  const paths = members.map(member => member.photo_path).filter(Boolean) as string[];
  const signed = paths.length ? (await context.supabase.storage.from("identity-photos").createSignedUrls(paths, 3600)).data || [] : [];
  const photoOf = (path?: string | null) => signed.find(item => item.path === path)?.signedUrl || null;
  const villages = [...new Set(members.map(member => member.village || "Village non renseigné"))];
  const edited = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Antananarivo" });

  return <section className="page directory-print">
    <div className="directory-toolbar-print no-print">
      <Link className="back-link" href="/members">← Membres</Link>
      <div className="chip-row">
        <Link className={`chip${params.statut !== "tous" ? " active" : ""}`} href={`/members/annuaire${params.village ? `?village=${encodeURIComponent(params.village)}` : ""}`}>Actifs</Link>
        <Link className={`chip${params.statut === "tous" ? " active" : ""}`} href={`/members/annuaire?statut=tous${params.village ? `&village=${encodeURIComponent(params.village)}` : ""}`}>Tous</Link>
        {["Darsalama", "Bandrani-Vouani"].map(village => <Link key={village} className={`chip${params.village === village ? " active" : ""}`} href={`/members/annuaire?${params.statut === "tous" ? "statut=tous&" : ""}${params.village === village ? "" : `village=${encodeURIComponent(village)}`}`}>{village}</Link>)}
      </div>
      <PrintButton label="Imprimer / PDF"/>
    </div>

    <header className="directory-head">
      <Image src="/aedbvt-logo.webp" alt="" width={56} height={56}/>
      <div><h1>Annuaire des membres</h1><p>{settings.association_name} · {members.length} membre{members.length > 1 ? "s" : ""} · édité le {edited}</p></div>
    </header>
    <p className="directory-notice">Document interne contenant des données personnelles. Diffusion réservée au Bureau ; ne pas transmettre à des tiers.</p>

    {villages.map(village => <section key={village} className="directory-group">
      <h2>{village} <span>{members.filter(member => (member.village || "Village non renseigné") === village).length}</span></h2>
      <div className="directory-grid">
        {members.filter(member => (member.village || "Village non renseigné") === village).map(member => {
          const photo = photoOf(member.photo_path);
          return <article className="directory-card" key={member.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo ? <img src={photo} alt=""/> : <span className="directory-initials">{initials(member.full_name)}</span>}
            <div>
              <b>{member.full_name}</b>
              <small>{member.member_number || "Sans numéro"} · {STATUS[member.status] || member.status}</small>
              <dl>
                <div><dt>Téléphone</dt><dd>{member.phone || "—"}</dd></div>
                <div><dt>Email</dt><dd>{member.email || "—"}</dd></div>
                <div><dt>Études</dt><dd>{[member.program, member.study_level].filter(Boolean).join(" · ") || "—"}</dd></div>
                <div><dt>Adhésion</dt><dd>{member.joined_at ? new Date(member.joined_at).toLocaleDateString("fr-FR") : "—"}</dd></div>
              </dl>
            </div>
          </article>;
        })}
      </div>
    </section>)}
    {!members.length && <p className="panel empty-state">Aucun membre pour ces critères.</p>}
  </section>;
}
