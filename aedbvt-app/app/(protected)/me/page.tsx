import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { MemberCardActions } from "@/components/member-card-actions";
import { MemberPhoto } from "@/components/member-photo";
import { AvatarEditor } from "@/components/avatar-editor";
import { UiIcon } from "@/components/ui-icon";
import { normalizeRole, ROLE_LABELS } from "@/lib/access";
import { createMyRequest, updateMyBio, updateMyProfile } from "./actions";

const requestLabels: Record<string,string> = {
  attestation:"Attestation", information:"Information", correction:"Correction", aide:"Demande d’aide", document:"Document", autre:"Autre"
};
const statusLabels: Record<string,string> = {
  pending:"Reçue", in_review:"En traitement", completed:"Terminée", rejected:"Refusée"
};

export default async function MySpacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, { data: member }] = await Promise.all([
    supabase.from("profiles").select("full_name,role,active").eq("id", user!.id).single(),
    supabase.from("members").select("*").eq("profile_id", user!.id).maybeSingle(),
  ]);

  // Profil social (photo, bio) et compteurs d’activité : requêtes séparées pour dégrader proprement.
  const [{ data: social }, { count: postCount }] = await Promise.all([
    supabase.from("profiles").select("avatar_url,bio").eq("id", user!.id).maybeSingle(),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("author_id", user!.id).is("deleted_at", null),
  ]);
  const displayName = member?.full_name || profile?.full_name || "Membre";
  const hero = (stats: { label: string; value: number; href: string }[]) => <article className="soc-me-hero panel no-print" id="profil">
    <div className="soc-me-cover" aria-hidden="true"/>
    <div className="soc-me-main">
      <div className="soc-me-avatar"><AvatarEditor name={displayName} url={social?.avatar_url || null} size={112}/></div>
      <div className="soc-me-id">
        <h1>{displayName}</h1>
        <p><span className="soc-role-badge">{ROLE_LABELS[normalizeRole(profile?.role)]}</span>{member?.member_number && <span className="soc-me-number">{member.member_number}</span>}</p>
      </div>
      <div className="soc-me-links">
        <Link className="button secondary" href={`/people/${user!.id}`}><UiIcon name="eye"/>Voir mon profil public</Link>
        <Link className="button secondary" href="/update-password"><UiIcon name="lock"/>Mot de passe</Link>
      </div>
    </div>
    <div className="soc-me-stats">
      {stats.map(stat => <Link key={stat.label} href={stat.href}><b>{stat.value}</b><small>{stat.label}</small></Link>)}
    </div>
    <form action={updateMyBio} className="soc-me-bio">
      <label htmlFor="me-bio"><UiIcon name="pencil"/>Ma bio <small>visible par les membres dans l’annuaire</small></label>
      <div><textarea id="me-bio" name="bio" maxLength={280} rows={2} defaultValue={social?.bio || ""} placeholder="Présentez-vous en quelques mots : études, passions, ce que vous pouvez apporter…"/><button className="button primary" type="submit">Enregistrer</button></div>
    </form>
  </article>;

  if (!member) {
    return (
      <section className="page">
        {hero([{ label: "Publications", value: postCount || 0, href: `/people/${user!.id}` }])}
        <article className="panel warning"><h2>Compte non lié à une fiche membre</h2><p>Ton compte existe, mais aucune fiche membre AEDBVT n’est encore liée. L’administration doit effectuer le rattachement avant d’activer la carte et l’historique personnel.</p></article>
      </section>
    );
  }

  const [{ data: payments }, { data: requests }, { data: issuedDocs }, { data: eventRegs }, { data: meetingRegs }, { data: duesOverview }] = await Promise.all([
    supabase.from("payments").select("id,amount,method,receipt_number,paid_at,status,dues_cycle_id,membership_dues_cycles(label)").eq("member_id", member.id).eq("status","confirmed").order("paid_at",{ascending:false}),
    supabase.from("member_service_requests").select("id,request_type,subject,details,status,response,created_at,updated_at").eq("member_id",member.id).order("created_at",{ascending:false}),
    supabase.from("administrative_issuances").select("id,number,document_type,subject,purpose,issued_at,verification_token").eq("member_id",member.id).eq("status","issued").order("issued_at",{ascending:false}),
    supabase.from("event_registrations").select("event_id,status").eq("user_id",user!.id).eq("status","going"),
    supabase.from("meeting_attendance").select("meeting_id,status").eq("user_id",user!.id).eq("status","confirmed"),
    supabase.from("member_dues_overview").select("id,cycle_id,cycle_label,starts_on,ends_on,due_on,cycle_status,amount_due,waived_amount,paid_amount,balance,current_status").eq("member_id",member.id).order("starts_on",{ascending:false}),
  ]);

  const eventIds=(eventRegs||[]).map((x)=>x.event_id);
  const meetingIds=(meetingRegs||[]).map((x)=>x.meeting_id);
  const [{ data: events }, { data: meetings }] = await Promise.all([
    eventIds.length ? supabase.from("events").select("id,title,starts_at,location,category").in("id",eventIds).order("starts_at",{ascending:false}) : Promise.resolve({data:[]}),
    meetingIds.length ? supabase.from("meetings").select("id,title,starts_at,location,mode").in("id",meetingIds).order("starts_at",{ascending:false}) : Promise.resolve({data:[]}),
  ]);

  const currentDue=(duesOverview||[]).find((row:any)=>row.cycle_status==="open")||(duesOverview||[])[0]||null;
  const effectiveDue=currentDue?Math.max(0,Number(currentDue.amount_due)-Number(currentDue.waived_amount)):0;
  const paid=currentDue?Number(currentDue.paid_amount||0):0;
  const due=currentDue?Number(currentDue.balance||0):0;
  const dueProgress=effectiveDue>0?Math.min(100,Math.round(paid/effectiveDue*100)):100;
  const dueLabels:Record<string,string>={due:"À régler",partial:"Paiement partiel",paid:"À jour",overdue:"En retard",exempt:"Exonéré"};
  const appUrl=(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/,"");
  const verificationUrl=appUrl+"/verify/member/"+member.verification_token;
  const photoUrl=member.photo_path?(await supabase.storage.from("identity-photos").createSignedUrl(member.photo_path,3600)).data?.signedUrl||null:null;
  const qr=await QRCode.toDataURL(verificationUrl,{width:220,margin:1,errorCorrectionLevel:"M"});

  return (
    <section className="page my-space">
      {hero([
        { label: "Publications", value: postCount || 0, href: `/people/${user!.id}` },
        { label: "Reçus", value: payments?.length || 0, href: "#recus" },
        { label: "Participations", value: (eventRegs?.length || 0) + (meetingRegs?.length || 0), href: "#participations" },
      ])}
      <h2 className="soc-me-section no-print"><UiIcon name="shield"/>Ma carte de membre</h2>

      <div className="member-hero" id="carte">
        <article className="member-card printable-card">
          <div className="member-card-top"><Image src="/aedbvt-logo.webp" alt="AEDBVT" width={64} height={64}/><div><span>CARTE DE MEMBRE</span><b>AEDBVT</b></div></div>
          <div className="member-card-body">
            <MemberPhoto url={photoUrl} name={member.full_name}/><div><small>Nom complet</small><h2>{member.full_name}</h2><small>Numéro</small><strong>{member.member_number}</strong><div className="card-meta"><span>{member.village || "Village non renseigné"}</span><span>{member.program || "Filière non renseignée"}</span><span>{member.study_level || "Niveau non renseigné"}</span></div></div>
            <div className="qr-wrap"><img src={qr} alt="QR code de vérification de la carte membre"/><small>Scanner pour vérifier</small></div>
          </div>
          <div className="member-card-foot"><span>Adhésion : {member.joined_at ? new Date(member.joined_at).toLocaleDateString("fr-FR") : "—"}</span><span>Statut : {member.status === "active" ? "ACTIF" : member.status.toUpperCase()}</span></div>
        </article>
        <div className="member-side">
          <MemberCardActions verificationUrl={verificationUrl}/>
          <div className="dues-card panel">
            <span className="eyebrow">Cotisation annuelle</span>
            {currentDue?<><div className="dues-card-title"><strong>{currentDue.cycle_label}</strong><span className={"badge dues-"+currentDue.current_status}>{dueLabels[currentDue.current_status]||currentDue.current_status}</span></div>
            <strong>{paid.toLocaleString("fr-FR")} / {effectiveDue.toLocaleString("fr-FR")} Ar</strong>
            <div className="progress-track"><i style={{width:dueProgress+"%"}} /></div>
            <p>{due===0?"Cotisation à jour.":"Reste à régler : "+due.toLocaleString("fr-FR")+" Ar · échéance "+new Date(currentDue.due_on+"T12:00:00").toLocaleDateString("fr-FR")}</p>{due>0&&<Link className="button primary" href="/pay" style={{width:"100%",marginTop:8}}>Payer par mobile money</Link>}</>:<p>Aucun exercice de cotisation ne vous est actuellement attribué.</p>}
          </div>
        </div>
      </div>

      <div className="content-grid no-print">
        <form action={updateMyProfile} className="panel form-stack">
          <div><span className="eyebrow">Mes informations</span><h2>Mettre à jour mon profil</h2></div>
          <label>Téléphone<input name="phone" defaultValue={member.phone||""}/></label>
          <label>Filière<input name="program" defaultValue={member.program||""}/></label>
          <label>Niveau d’étude<input name="study_level" defaultValue={member.study_level||""}/></label>
          <button className="button secondary">Enregistrer mes informations</button>
        </form>

        <form action={createMyRequest} className="panel form-stack">
          <div><span className="eyebrow">Secrétariat</span><h2>Faire une demande</h2></div>
          <label>Type<select name="request_type"><option value="attestation">Attestation</option><option value="information">Information</option><option value="correction">Correction de données</option><option value="aide">Demande d’aide</option><option value="document">Document</option><option value="autre">Autre</option></select></label>
          <label>Objet<input name="subject" required/></label>
          <label>Détails<textarea name="details" rows={4}/></label>
          <button className="button primary">Envoyer la demande</button>
        </form>
      </div>

      <div className="content-grid no-print">
        <article className="panel" id="recus">
          <div className="panel-head"><div><span className="eyebrow">Finances personnelles</span><h2>Mes reçus</h2></div><span>{payments?.length||0}</span></div>
          <div className="receipt-list">
            {(payments||[]).map((p)=><div key={p.id}><span><b>{p.receipt_number||"Reçu"}</b><small>{new Date(p.paid_at||Date.now()).toLocaleDateString("fr-FR")} · {p.method}</small></span><strong>{Number(p.amount).toLocaleString("fr-FR")} Ar</strong><a className="button secondary" href={"/api/receipts/"+p.id}>PDF</a></div>)}
            {!payments?.length&&<p>Aucun paiement confirmé pour le moment.</p>}
          </div>
        </article>

        <article className="panel">
          <span className="eyebrow">Suivi</span><h2>Mes demandes</h2>
          <div className="request-list">
            {(requests||[]).map((request)=><details key={request.id}><summary><span><b>{request.subject}</b><small>{requestLabels[request.request_type]||request.request_type} · {new Date(request.created_at).toLocaleDateString("fr-FR")}</small></span><span className={"badge request-"+request.status}>{statusLabels[request.status]||request.status}</span></summary><p>{request.details||"Aucun détail."}</p>{request.response&&<div className="staff-response"><b>Réponse du Bureau</b><p>{request.response}</p></div>}</details>)}
            {!requests?.length&&<p>Aucune demande envoyée.</p>}
          </div>
        </article>
      </div>

      <article className="panel no-print">
        <div className="panel-head"><div><span className="eyebrow">Adhésion</span><h2>Historique des cotisations</h2></div><span>{duesOverview?.length||0}</span></div>
        <div className="dues-history-list">
          {(duesOverview||[]).map((row:any)=><div key={row.id}><span><b>{row.cycle_label}</b><small>Échéance {new Date(row.due_on+"T12:00:00").toLocaleDateString("fr-FR")}</small></span><span><strong>{Number(row.paid_amount).toLocaleString("fr-FR")} / {Math.max(0,Number(row.amount_due)-Number(row.waived_amount)).toLocaleString("fr-FR")} Ar</strong><em className={"badge dues-"+row.current_status}>{dueLabels[row.current_status]||row.current_status}</em></span></div>)}
          {!duesOverview?.length&&<p>Aucun historique de cotisation disponible.</p>}
        </div>
      </article>

      <article className="panel no-print member-documents">
        <div className="panel-head"><div><span className="eyebrow">Secrétariat</span><h2>Mes documents administratifs</h2></div><span>{issuedDocs?.length||0}</span></div>
        <div className="member-document-list">
          {(issuedDocs||[]).map((doc:any)=><div key={doc.id}><span><small>{doc.number} · {doc.document_type}</small><b>{doc.subject}</b><em>{doc.issued_at?new Date(doc.issued_at).toLocaleDateString("fr-FR"):"Délivré"}</em></span><div><a className="button secondary" href={"/api/administration/issuances/"+doc.id}>PDF</a><Link href={"/verify/admin/"+doc.verification_token}>Vérifier →</Link></div></div>)}
          {!issuedDocs?.length&&<p>Aucun document administratif délivré pour le moment.</p>}
        </div>
      </article>

      <article className="panel no-print" id="participations">
        <span className="eyebrow">Vie associative</span><h2>Mes participations</h2>
        <div className="participation-grid">
          {(events||[]).map((event:any)=><div key={"e-"+event.id}><span className="badge">Événement</span><b>{event.title}</b><small>{new Date(event.starts_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})} · {event.location||"Lieu à confirmer"}</small></div>)}
          {(meetings||[]).map((meeting:any)=><div key={"m-"+meeting.id}><span className="badge pinned">Réunion</span><b>{meeting.title}</b><small>{new Date(meeting.starts_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})} · {meeting.location||"Lieu à confirmer"}</small></div>)}
          {!events?.length&&!meetings?.length&&<p>Aucune participation enregistrée.</p>}
        </div>
      </article>
    </section>
  );
}
