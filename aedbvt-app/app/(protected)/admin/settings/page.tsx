import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/access";
import { updateInstitutionalSettings } from "./actions";

const keys=[
  "association_name","association_short_name","association_city","association_country",
  "contact_email","contact_phone","official_address","support_email","privacy_email",
  "homepage_message","legal_status_note","administrator_display_name","annual_dues_ariary",
  "mobile_money_mvola","mobile_money_orange","mobile_money_airtel","mobile_money_holder","mobile_money_instructions",
];

export default async function InstitutionalSettingsPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  const [{data:profile},{data:rows}]=await Promise.all([
    supabase.from("profiles").select("role").eq("id",user!.id).single(),
    supabase.from("app_settings").select("key,value").in("key",keys),
  ]);
  if(!can(profile?.role,"admin_manage")) notFound();

  const map=new Map((rows||[]).map((row)=>[row.key,typeof row.value==="string"?row.value:String(row.value??"")]));
  const value=(key:string,fallback="")=>map.get(key)||fallback;

  return <section className="page">
    <header className="page-header"><div><h1>Paramètres</h1></div><Link className="button secondary" href="/admin">← Administration</Link></header>

    <form action={updateInstitutionalSettings} className="settings-form">
      <article className="panel form-stack">
        <div><span className="eyebrow">Identité</span><h2>Association</h2></div>
        <label>Nom officiel<input name="association_name" defaultValue={value("association_name","Association des Étudiants de Darsalama et Bandrani-Vouani à Tuléar")} required/></label>
        <label>Nom court<input name="association_short_name" defaultValue={value("association_short_name","AEDBVT")} required/></label>
        <div className="form-two"><label>Ville<input name="association_city" defaultValue={value("association_city","Tuléar")}/></label><label>Pays<input name="association_country" defaultValue={value("association_country","Madagascar")}/></label></div>
        <label>Adresse officielle<textarea name="official_address" rows={3} defaultValue={value("official_address")}/></label>
      </article>

      <article className="panel form-stack">
        <div><span className="eyebrow">Contacts</span><h2>Coordonnées</h2></div>
        <label>Email général<input type="email" name="contact_email" defaultValue={value("contact_email")}/></label>
        <label>Email support<input type="email" name="support_email" defaultValue={value("support_email")}/></label>
        <label>Email confidentialité<input type="email" name="privacy_email" defaultValue={value("privacy_email")}/></label>
        <label>Téléphone<input name="contact_phone" defaultValue={value("contact_phone")}/></label>
      </article>

      <article className="panel form-stack">
        <div><span className="eyebrow">Application</span><h2>Affichage & cotisation</h2></div>
        <label>Administrateur affiché<input name="administrator_display_name" defaultValue={value("administrator_display_name","Houssounaine Nourdine")}/></label>
        <label>Cotisation annuelle par défaut (Ar)<input type="number" min="1" name="annual_dues_ariary" defaultValue={Number(value("annual_dues_ariary","30000"))}/></label>
        <label>Texte d’accueil<textarea name="homepage_message" rows={4} defaultValue={value("homepage_message","Une application séparée pour gérer les membres, la vie associative, la trésorerie, les documents et la gouvernance avec des accès sécurisés.")}/></label>
        <label>Note de statut juridique<textarea name="legal_status_note" rows={4} defaultValue={value("legal_status_note","Le statut juridique et les formalités réglementaires de l’association restent à valider avant toute présentation institutionnelle définitive.")}/></label>
      </article>

      <article className="panel form-stack" id="paiement">
        <div><h2>Paiement mobile</h2><p className="muted" style={{margin:"4px 0 0"}}>Numéros sur lesquels les membres envoient leur cotisation depuis l’application. Laisser vide pour masquer un opérateur.</p></div>
        <div className="form-two"><label>Numéro MVola<input name="mobile_money_mvola" type="tel" placeholder="034 00 000 00" defaultValue={value("mobile_money_mvola")}/></label><label>Numéro Orange Money<input name="mobile_money_orange" type="tel" placeholder="032 00 000 00" defaultValue={value("mobile_money_orange")}/></label></div>
        <div className="form-two"><label>Numéro Airtel Money<input name="mobile_money_airtel" type="tel" placeholder="033 00 000 00" defaultValue={value("mobile_money_airtel")}/></label><label>Nom du bénéficiaire affiché<input name="mobile_money_holder" placeholder="AEDBVT · Trésorerie" defaultValue={value("mobile_money_holder")}/></label></div>
        <label>Consignes complémentaires (facultatif)<textarea name="mobile_money_instructions" rows={2} placeholder="Ex. Indiquez la référence AED-… dans le motif du transfert." defaultValue={value("mobile_money_instructions")}/></label>
      </article>

      <div className="settings-save-bar"><p>Les informations publiques sont réutilisées par l’accueil, le support et les pages institutionnelles.</p><button className="button primary">Enregistrer les paramètres</button></div>
    </form>
  </section>;
}
