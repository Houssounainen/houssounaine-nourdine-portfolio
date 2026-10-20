import type { SVGProps } from "react";

const paths = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/></>,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>,
  chat: <><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a9.5 9.5 0 0 1 19 0Z"/><path d="M7 10h9m-9 4h6"/></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="m22 2-11 11"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-2-4"/></>,
  document: <path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h6"/>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  arrowUp: <path d="M6 18 18 6M6 6h12v12"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  wallet: <><path d="M20 7V4H5a2 2 0 0 0 0 4h16v12H5a2 2 0 0 1-2-2V6"/><path d="M21 12h-6v4h6"/></>,
  chart: <path d="M4 3v17h17M8 15v-4m5 4V7m5 8V5"/>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <path d="m3 3 18 18M10.6 5.1 12 5c6 0 10 7 10 7a19 19 0 0 1-3.1 3.8M6.2 6.2A21 21 0 0 0 2 12s4 7 10 7a12 12 0 0 0 5.8-1.8"/>,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5m5 5H3"/>,
  external: <path d="M14 4h6v6m0-6-9 9m7 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/></>,
  tag: <><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9Z"/><circle cx="8" cy="8" r="1.5"/></>,
  book: <path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Zm0 16V5m4 3h8"/>,
  game: <><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3m-1.5-1.5h3M16 12h.01M18 14h.01"/></>,
  sparkle: <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6"/>,
  download: <path d="M12 4v11m-5-5 5 5 5-5M4 20h16"/>,
  comment: <path d="M4 5h16v11H9l-5 4Z"/>,
  trash: <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3"/>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4Z"/><circle cx="12" cy="13" r="3.5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  phone: <path d="M5 3h4l2 5-3 2a12 12 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z"/>,
  filter: <path d="M4 5h16l-6 8v6l-4-2v-4Z"/>,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>,
  shirt: <path d="M8 3 3 6l2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0Z"/>,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>,
  cup: <><path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6Z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 2v3m4-3v3"/></>,
  trophy: <><path d="M8 4h8v6a4 4 0 0 1-8 0Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4m8-5h4v1a4 4 0 0 1-4 4M12 14v4m-4 3h8l-1-3H9Z"/></>,
  flame: <path d="M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 2-5 5-5 8a7 7 0 0 0 7 7Z"/>,
  link: <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1m2 5a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>,
  cap: <><path d="m2 9 10-5 10 5-10 5Z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6"/></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9Z"/>,
  receipt: <><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6m-6 4h6m-6 4h3"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  mapPin: <><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></>,
  pencil: <path d="m4 20 4-1 11-11a2.1 2.1 0 0 0-3-3L5 16Z M14 6l3 3"/>,
  share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/></>,
  pushpin: <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3Zm3 10v7"/>,
  vote: <><path d="M4 21h16M6 17h12l-1-4H7Z"/><path d="m9 9 2 2 4-5"/></>,
  gavel: <><path d="m14 4 6 6M11 7l6 6M12.5 5.5l-6 6 6 6 6-6M3 21l6-6"/></>,
} as const;

export type IconName = keyof typeof paths;

export function UiIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}

export function routeIcon(href: string): IconName {
  const icons: Record<string, IconName> = {dashboard:"home",me:"user",notifications:"bell",agenda:"calendar",events:"calendar",news:"document",announcements:"bell",members:"users",applications:"users",organization:"users",governance:"shield",cases:"shield",search:"search",finance:"wallet",analytics:"chart",partners:"heart",soutiens:"heart",association:"users",content:"document",documents:"document",administration:"document",exports:"document",communication:"bell",pay:"wallet",community:"image",people:"users",communaute:"image",market:"tag",marche:"tag",library:"book",bibliotheque:"book",games:"game",jeux:"game"};
  return href === "/chat" ? "chat" : icons[href.split("/")[1]] || "grid";
}
