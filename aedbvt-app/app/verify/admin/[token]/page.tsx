import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function VerifyAdministrativeDocumentPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const supabase=await createClient();
  const {data}=await supabase.rpc("verify_administrative_document",{p_token:token});
  const record=Array.isArray(data)?data[0]:data;

  return <main className="verify-page">
    <article className="verify-card">
      <Image src="/aedbvt-logo.webp" alt="AEDBVT" width={82} height={82}/>
      <span className="eyebrow">Vérification AEDBVT</span>
      <h1>{record?.valid?"Document authentifié":"Document non vérifié"}</h1>
      {record?.valid?<><p>Ce document figure dans le registre administratif des documents délivrés par l’AEDBVT.</p><dl><div><dt>Référence</dt><dd>{record.number}</dd></div><div><dt>Type</dt><dd>{record.document_type}</dd></div><div><dt>Objet</dt><dd>{record.subject}</dd></div><div><dt>Bénéficiaire</dt><dd>{record.member_name||"—"}</dd></div><div><dt>N° membre</dt><dd>{record.member_number||"—"}</dd></div><div><dt>Délivré le</dt><dd>{record.issued_at?new Date(record.issued_at).toLocaleDateString("fr-FR"):"—"}</dd></div></dl></>:<p>Ce jeton ne correspond à aucun document actuellement délivré dans le registre public de vérification.</p>}
      <p className="legal-note">Cette page confirme l’enregistrement du document dans l’application AEDBVT. Elle ne constitue pas une certification étatique ni une signature électronique qualifiée.</p>
      <Link className="button secondary" href="/">Retour à l’accueil</Link>
    </article>
  </main>
}
