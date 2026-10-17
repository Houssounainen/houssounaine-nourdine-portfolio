"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupNavigation, normalizeSearch, type NavLink } from "@/lib/navigation";
import { UiIcon, routeIcon, type IconName } from "@/components/ui-icon";

type Command = { href: string; label: string; group: string; icon: IconName; hint?: string };

// Mots-clés pour retrouver une rubrique par ce qu’on y fait, pas seulement par son nom.
const KEYWORDS: Record<string, string> = {
  "/dashboard": "accueil aujourd'hui",
  "/me": "profil carte qr cotisation reçus demandes",
  "/notifications": "alertes",
  "/agenda": "événements réunions calendrier",
  "/chat": "messages discussion groupe",
  "/community": "fil photos publications fête social partage annonce j'aime",
  "/market": "vente acheter vendre annonces petites annonces boutique",
  "/library": "documents cours mémoires livres partage fichiers",
  "/games": "quiz jeux mot mémoire calcul classement",
  "/announcements": "annonces informations",
  "/organization": "organigramme bureau missions",
  "/governance": "statuts décisions assemblées élections votes",
  "/cases": "signalement problème plainte",
  "/operations": "tâches commissions mandats pilotage",
  "/administration": "courriers attestations registre modèles",
  "/members": "registre adhérents numéros filières rôles",
  "/applications": "candidatures adhésions inscriptions",
  "/finance": "trésorerie budget caisse grand livre comptes",
  "/analytics": "statistiques indicateurs",
  "/communication": "messages ciblés envoi",
  "/content": "publication articles brouillons",
  "/exports": "csv excel pdf sauvegarde",
  "/assets": "patrimoine équipements stock",
  "/partners": "partenaires dons sponsoring",
  "/admin": "paramètres réglages",
};

const RECENT_KEY = "aedbvt:recent-routes";
const OPEN_EVENT = "aedbvt:palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function readRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}

export function CommandPalette({ links }: { links: NavLink[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  const commands = useMemo<Command[]>(() => [
    ...groupNavigation(links).flatMap(group => group.links.map(([href, label]) => ({ href, label, group: group.label, icon: routeIcon(href), hint: KEYWORDS[href] }))),
    ...(links.some(([href]) => href === "/finance") ? [{ href: "/finance/dues", label: "Cotisations annuelles", group: "Actions rapides", icon: "wallet" as IconName, hint: "Échéances, restes et relances" }] : []),
    { href: "/me#carte", label: "Afficher ma carte de membre", group: "Actions rapides", icon: "user", hint: "Carte & QR code" },
    { href: "/agenda", label: "Voir les prochains rendez-vous", group: "Actions rapides", icon: "calendar" },
    { href: "/cases", label: "Faire un signalement", group: "Actions rapides", icon: "shield" },
    { href: "/", label: "Ouvrir le site public", group: "Actions rapides", icon: "arrowUp" },
  ], [links]);

  // Mémorise les rubriques visitées pour les proposer en tête de liste.
  useEffect(() => {
    const label = links.find(([href]) => href === pathname)?.[1];
    if (!label) return;
    try {
      const next = [pathname, ...readRecent().filter(href => href !== pathname)].slice(0, 4);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  }, [pathname, links]);

  const results = useMemo(() => {
    const term = normalizeSearch(query);
    if (!term) {
      const recentCommands = recent.map(href => commands.find(command => command.href === href)).filter(Boolean).map(command => ({ ...command!, group: "Récemment" }));
      return [...recentCommands, ...commands.filter(command => !recent.includes(command.href))];
    }
    return commands
      .map(command => {
        const haystack = normalizeSearch(`${command.label} ${command.group} ${command.hint || ""} ${KEYWORDS[command.href] || ""}`);
        const score = haystack.startsWith(term) ? 0 : haystack.split(" ").some(word => word.startsWith(term)) ? 1 : haystack.includes(term) ? 2 : -1;
        return { command, score };
      })
      .filter(item => item.score >= 0)
      .sort((a, b) => a.score - b.score)
      .map(item => item.command);
  }, [commands, query, recent]);

  const show = useCallback(() => { setRecent(readRecent()); setQuery(""); setActive(0); setOpen(true); }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_EVENT, show); };
  }, [show]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) { element.showModal(); input.current?.focus(); }
    if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  const go = (command: Command | undefined) => {
    if (!command) return;
    setOpen(false);
    router.push(command.href);
  };

  const onInputKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => Math.min(index + 1, results.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
    if (event.key === "Enter") { event.preventDefault(); go(results[active]); }
  };

  useEffect(() => {
    dialog.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let lastGroup = "";
  return <dialog ref={dialog} className="command-palette" aria-label="Recherche rapide" onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
    <div className="command-box">
      <label className="command-input"><UiIcon name="search"/><span className="sr-only">Rechercher une rubrique ou une action</span>
        <input ref={input} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={onInputKey} placeholder="Où voulez-vous aller ?" role="combobox" aria-expanded="true" aria-controls="command-results" aria-activedescendant={results[active] ? `command-${active}` : undefined} autoComplete="off" spellCheck={false}/>
        <kbd>Échap</kbd>
      </label>
      <div className="command-results" id="command-results" role="listbox">
        {results.map((command, index) => {
          const heading = command.group !== lastGroup ? command.group : null;
          lastGroup = command.group;
          return <div key={command.group + command.href + command.label}>
            {heading && <p className="command-group">{heading}</p>}
            <button type="button" id={`command-${index}`} data-index={index} role="option" aria-selected={index === active} className={index === active ? "active" : ""} onMouseMove={() => setActive(index)} onClick={() => go(command)}>
              <span className="command-icon"><UiIcon name={command.icon}/></span>
              <span className="command-label">{command.label}{command.group === "Actions rapides" && command.hint && <small>{command.hint}</small>}</span>
              <UiIcon name="arrow" className="command-go"/>
            </button>
          </div>;
        })}
        {!results.length && <p className="command-empty">Aucun résultat pour « {query} ».</p>}
      </div>
      <footer className="command-foot"><span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span><span><kbd>↵</kbd> ouvrir</span><span><kbd>Ctrl</kbd><kbd>K</kbd> à tout moment</span></footer>
    </div>
  </dialog>;
}
