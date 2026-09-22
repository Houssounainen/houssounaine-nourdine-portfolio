import type { SVGProps } from "react";

const paths = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18m-13 5h2m4 0h2"/></>,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>,
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
} as const;

export type IconName = keyof typeof paths;

export function UiIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}

export function routeIcon(href: string): IconName {
  const icons: Record<string, IconName> = {dashboard:"home",me:"user",notifications:"bell",agenda:"calendar",events:"calendar",news:"document",announcements:"bell",members:"users",applications:"users",organization:"users",governance:"shield",cases:"shield",search:"search",finance:"wallet",analytics:"chart",partners:"heart",soutiens:"heart",association:"users",content:"document",documents:"document",administration:"document",exports:"document",communication:"bell"};
  return icons[href.split("/")[1]] || "grid";
}
