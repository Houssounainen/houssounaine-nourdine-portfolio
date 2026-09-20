import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function VerifyMemberPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  if (!admin) {
    return (
      <main id="contenu" className="verify-page">
        <section className="verify-card"><h1>Vérification indisponible</h1><p>Le service de vérification n’est pas encore configuré sur ce déploiement.</p></section>
      </main>
    );
  }

  const { data: member } = await admin.from("members")
    .select("member_number,full_name,village,status,joined_at")
    .eq("verification_token",token)
    .maybeSingle();

  if (!member) notFound();

  return (
    <main id="contenu" className="verify-page">
      <section className="verify-card">
        <Image src="/aedbvt-logo.webp" alt="AEDBVT" width={82} height={82}/>
        <span className="eyebrow">Vérification de carte</span>
        <h1>{member.status==="active"?"Membre AEDBVT vérifié":"Carte non active"}</h1>
        <div className={"verification-state "+(member.status==="active"?"valid":"invalid")}><b>{member.status==="active"?"✓ VALIDE":"! NON ACTIVE"}</b></div>
        <dl><div><dt>Numéro membre</dt><dd>{member.member_number}</dd></div><div><dt>Nom</dt><dd>{member.full_name}</dd></div><div><dt>Village</dt><dd>{member.village||"—"}</dd></div><div><dt>Membre depuis</dt><dd>{member.joined_at?new Date(member.joined_at).toLocaleDateString("fr-FR"):"—"}</dd></div></dl>
        <p className="legal-note">Cette page ne révèle que les informations nécessaires à la vérification de la carte. Aucun téléphone, email, paiement ou donnée interne n’est affiché.</p>
        <Link className="button secondary" href="/">Retour à l’AEDBVT</Link>
      </section>
    </main>
  );
}
