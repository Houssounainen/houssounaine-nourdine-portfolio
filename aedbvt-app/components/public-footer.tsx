import Image from "next/image";
import Link from "next/link";
import { getPublicSettings } from "@/lib/public-settings";

export async function PublicFooter(){
  const settings=await getPublicSettings();
  const contact=settings.support_email||settings.contact_email;

  return <footer className="public-footer pub-footer">
    <div className="pub-footer-brand">
      <Image src="/aedbvt-logo.webp" alt="" width={36} height={36}/>
      <span><b>{settings.association_short_name}</b><small>{settings.association_city} · {settings.association_country}</small></span>
    </div>
    <nav aria-label="Liens institutionnels">
      <Link href="/news">Actualités</Link>
      <Link href="/events">Événements</Link>
      <Link href="/privacy">Confidentialité</Link>
      <Link href="/terms">Conditions</Link>
      <Link href="/support">Support</Link>
      {contact&&<a href={"mailto:"+contact}>Contact</a>}
    </nav>
  </footer>;
}
