import Image from "next/image";
import Link from "next/link";
import { getPublicSettings } from "@/lib/public-settings";

export async function PublicNav(){
  const settings=await getPublicSettings();
  return <header className="panel" style={{margin:"18px auto 0",width:"min(1180px,calc(100% - 28px))",display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
    <Link className="brand-mini" href="/">
      <Image src="/aedbvt-logo.webp" alt="" width={42} height={42}/>
      <span><b>{settings.association_short_name}</b><small style={{display:"block",color:"var(--muted)"}}>{settings.association_city}</small></span>
    </Link>
    <nav aria-label="Navigation publique" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <Link className="button secondary" href="/news">Actualités</Link>
      <Link className="button secondary" href="/events">Événements</Link>
      <Link className="button secondary" href="/association">Association</Link>
      <Link className="button secondary" href="/soutiens">Partenaires</Link>
      <Link className="button primary" href="/login">Espace membre</Link>
    </nav>
  </header>;
}
