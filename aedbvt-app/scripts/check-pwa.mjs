import fs from "node:fs";

const errors=[];
const sw=fs.readFileSync("public/sw.js","utf8");
const manifest=fs.readFileSync("app/manifest.ts","utf8");
const env=fs.readFileSync(".env.example","utf8");

const precacheMatch=sw.match(/const PRECACHE=\[([^\]]*)\]/);
const precache=precacheMatch?.[1]||"";
const protectedPaths=["/dashboard","/me","/members","/finance","/documents","/governance","/operations","/administration","/requests","/admin"];

for(const path of protectedPaths){
  if(precache.includes(path)) errors.push("Le service worker ne doit pas pré-cacher "+path);
}

if(!sw.includes('request.mode==="navigate"')) errors.push("Fallback de navigation hors ligne manquant");
if(!sw.includes("caches.match(OFFLINE_URL)")) errors.push("Écran hors ligne non utilisé par le service worker");
if(!sw.includes('addEventListener("push"')) errors.push("Gestionnaire push manquant");
if(!sw.includes('addEventListener("notificationclick"')) errors.push("Gestionnaire de clic notification manquant");
if(!manifest.includes('display:"standalone"')) errors.push("Manifest non configuré en standalone");
if(!manifest.includes('url:"/notifications"')) errors.push("Raccourci Notifications manquant dans le manifest");
if(!fs.existsSync("public/aedbvt-pwa.svg")) errors.push("Icône PWA manquante");
if(!fs.existsSync("app/offline/page.tsx")) errors.push("Page hors ligne manquante");

for(const key of ["NEXT_PUBLIC_VAPID_PUBLIC_KEY","VAPID_PRIVATE_KEY","VAPID_SUBJECT"]){
  if(!env.includes(key+"=")) errors.push("Variable "+key+" absente de .env.example");
}

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("PWA safety checks passed.");
