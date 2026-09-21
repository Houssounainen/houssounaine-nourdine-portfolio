import Image from "next/image";
import Link from "next/link";
import { getPublicSettings } from "@/lib/public-settings";

export async function PublicNav(){
  const settings=await getPublicSettings();

  return <header className="public-nav">
    <Link className="brand-mini public-nav-brand" href="/">
      <Image src="/aedbvt-logo.webp" alt={"Logo "+settings.association_short_name} width={42} height={42}/>
      <span><b>{settings.association_short_name}</b><small>{settings.association_city}</small></span>
    </Link>

    <nav className="public-nav-links" aria-label="Navigation publique">
      <Link className="button secondary" href="/news">Actualités</Link>
      <Link className="button secondary" href="/events">Événements</Link>
      <Link className="button secondary" href="/association">Association</Link>
      <Link className="button secondary" href="/soutiens">Partenaires</Link>
      <Link className="button primary" href="/login">Espace membre</Link>
    </nav>
  </header>;
}
