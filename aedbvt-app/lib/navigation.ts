export type NavLink = [string, string];

const groups = [
  { label: "Mon quotidien", paths: ["/dashboard", "/me", "/notifications", "/agenda"] },
  { label: "Vie associative", paths: ["/chat", "/news", "/announcements", "/organization", "/governance", "/cases"] },
  { label: "Gestion & pilotage", paths: ["/operations", "/members", "/applications", "/requests", "/administration", "/finance", "/analytics", "/assets", "/partners"] },
  { label: "Outils", paths: ["/search", "/documents", "/communication", "/content", "/exports", "/admin"] },
];

export function groupNavigation(links: NavLink[]) {
  return groups.map(group => ({ label: group.label, links: group.paths.flatMap(path => links.filter(([href]) => href === path)) })).filter(group => group.links.length > 0);
}

export function isActiveLink(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}

export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();
}
