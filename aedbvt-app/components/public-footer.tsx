import Link from "next/link";
import { getPublicSettings } from "@/lib/public-settings";

export async function PublicFooter(){
  const settings=await getPublicSettings();
  const contact=settings.support_email||settings.contact_email;

  return <footer className="public-footer">
    <div><b>{settings.association_short_name}</b><small>{settings.association_city} · {settings.association_country}</small></div>
    <nav aria-label="Liens institutionnels">
      <Link href="/privacy">Confidentialité</Link>
      <Link href="/terms">Conditions</Link>
      <Link href="/support">Support</Link>
      {contact&&<a href={"mailto:"+contact}>Contact</a>}
    </nav>
  </footer>;
}
