import Image from "next/image";
import Link from "next/link";
import { getPublicSettings } from "@/lib/public-settings";
import { PublicNavigation } from "@/components/public-navigation";

export async function PublicNav(){
  const settings=await getPublicSettings();

  return <header className="public-nav">
    <Link className="brand-mini public-nav-brand" href="/">
      <Image src="/aedbvt-logo.webp" alt={"Logo "+settings.association_short_name} width={42} height={42}/>
      <span><b>{settings.association_short_name}</b><small>{settings.association_city}</small></span>
    </Link>

    <PublicNavigation/>
  </header>;
}
