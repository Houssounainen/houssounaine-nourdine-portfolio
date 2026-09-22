"use client";

import Link from "next/link";
import { useState } from "react";
import { normalizeSearch } from "@/lib/navigation";
import { UiIcon, routeIcon } from "@/components/ui-icon";

export function ModuleExplorer({ links }: { links: string[][] }) {
  const [query, setQuery] = useState("");
  const visible = links.filter(item => normalizeSearch(item.slice(1).join(" ")).includes(normalizeSearch(query)));
  return <section className="module-explorer" aria-labelledby="module-heading">
    <div className="module-explorer-head"><div><span className="eyebrow">Vos raccourcis</span><h2 id="module-heading">Que souhaitez-vous faire ?</h2></div><label className="module-search"><UiIcon name="search"/><span className="sr-only">Rechercher un service</span><input type="search" placeholder="Cotisations, documents…" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
    <p className="sr-only" role="status">{visible.length} services disponibles</p>
    <div className="quick-links">{visible.map(([href,kicker,title,copy]) => <Link className="quick-card" href={href} key={href}><div className="quick-card-top"><UiIcon name={routeIcon(href)}/><UiIcon name="arrowUp" width={16} height={16}/></div><span>{kicker}</span><b>{title}</b><small>{copy}</small></Link>)}</div>
    {!visible.length && <div className="module-empty"><UiIcon name="search"/><h3>Aucun service trouvé</h3><p>Essayez un autre mot ou retrouvez tous vos raccourcis.</p><button className="button secondary" type="button" onClick={() => setQuery("")}>Effacer la recherche</button></div>}
  </section>;
}
