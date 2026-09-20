"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";

type NavLink=[string,string];

export function MobileNavigation({
  links,
  profileName,
  role,
}:{links:NavLink[];profileName:string;role:string}){
  const pathname=usePathname();
  const [open,setOpen]=useState(false);

  useEffect(()=>setOpen(false),[pathname]);

  const primary:NavLink[]=[
    ["/dashboard","Accueil"],
    ["/agenda","Agenda"],
    ["/notifications","Alertes"],
    ["/me","Mon espace"],
  ];

  function active(href:string){
    return pathname===href||pathname.startsWith(href+"/");
  }

  return <>
    <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
      {primary.map(([href,label])=><Link className={active(href)?"active":""} href={href} key={href}><span aria-hidden="true">{href==="/dashboard"?"⌂":href==="/agenda"?"▦":href==="/notifications"?"●":"◎"}</span><small>{label}</small></Link>)}
      <button type="button" className={open?"active":""} onClick={()=>setOpen((value)=>!value)} aria-expanded={open} aria-controls="mobile-menu"><span aria-hidden="true">≡</span><small>Menu</small></button>
    </nav>

    {open&&<div className="mobile-menu-layer" onClick={()=>setOpen(false)}>
      <aside id="mobile-menu" className="mobile-menu-drawer" onClick={(event)=>event.stopPropagation()}>
        <div className="mobile-menu-head"><div className="avatar">{profileName.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><span><b>{profileName}</b><small>{role}</small></span><button onClick={()=>setOpen(false)} aria-label="Fermer le menu">×</button></div>
        <nav>{links.map(([href,label])=><Link className={active(href)?"active":""} href={href} key={href}>{label}<span>›</span></Link>)}</nav>
        <div className="mobile-menu-signout"><SignOutButton/></div>
      </aside>
    </div>}
  </>;
}
