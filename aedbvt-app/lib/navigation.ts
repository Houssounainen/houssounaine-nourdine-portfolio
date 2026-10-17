export type NavLink = [string, string];

const groups = [
  { label: "Mon quotidien", paths: ["/dashboard", "/me", "/pay", "/notifications", "/agenda"] },
  { label: "Vie associative", paths: ["/community", "/chat", "/people", "/news", "/announcements", "/market", "/library", "/games", "/organization", "/governance", "/cases"] },
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

/** Couleur de la pastille d’icône de chaque rubrique (navigation façon application mobile). */
const ROUTE_COLORS: Record<string, string> = {
  dashboard: "#2453d6", me: "#7a5af8", pay: "#12b76a", notifications: "#f04438", agenda: "#f79009",
  community: "#ee46bc", chat: "#0ba5ec", news: "#2453d6", announcements: "#f79009", market: "#15b79e",
  library: "#7a5af8", games: "#ee46bc", organization: "#0ba5ec", governance: "#344054", cases: "#f04438",
  people: "#2453d6", search: "#344054", operations: "#7a5af8", members: "#2453d6", applications: "#12b76a",
  requests: "#f79009", administration: "#0ba5ec", documents: "#344054", finance: "#12b76a", analytics: "#7a5af8",
  communication: "#f04438", content: "#ee46bc", exports: "#344054", assets: "#f79009", partners: "#ee46bc", admin: "#344054",
};

export function routeColor(href: string) {
  return ROUTE_COLORS[href.split("/")[1]] || "#2453d6";
}
