import fs from "node:fs";

const errors=[];
const read=(path)=>fs.readFileSync(path,"utf8");

const access=read("lib/access.ts");
const proxy=read("proxy.ts");
const shell=read("components/app-shell.tsx");
const auth=read("lib/auth.ts");
const protectedLayout=read("app/(protected)/layout.tsx");

const requiredRoutes={
  "/admin":"admin_manage",
  "/finance":"finance_manage",
  "/operations":"operations_manage",
  "/administration":"administration_manage",
  "/members":"members_manage",
  "/requests":"requests_manage",
  "/documents":"documents_manage",
};

for(const [route,capability] of Object.entries(requiredRoutes)){
  if(!access.includes('prefix:"'+route+'"')) errors.push("Route sensible absente de la matrice : "+route);
  if(!access.includes('capability:"'+capability+'"')) errors.push("Capacité absente de la matrice : "+capability);
}

if(!proxy.includes("canAccessPath(")) errors.push("Le proxy n’applique pas canAccessPath.");
if(!proxy.includes('profile?.active===false')) errors.push("Le proxy ne bloque pas les comptes suspendus.");
if(!proxy.includes('reason","profile"')) errors.push("Le proxy ne traite pas les comptes sans profil.");
if(!protectedLayout.includes("if(!profile)")) errors.push("Le layout protégé ne bloque pas les comptes sans profil.");
if(!protectedLayout.includes("profile.active===false")) errors.push("Le layout protégé ne bloque pas les comptes suspendus.");
if(!shell.includes("navigationForRole(")) errors.push("La navigation n’est pas pilotée par la matrice des rôles.");
if(!auth.includes('can(role,"staff")')) errors.push("isStaff doit déléguer à la matrice des capacités.");

const guardedActions={
  "app/(protected)/members/actions.ts":'getAccessContext("members_manage")',
  "app/(protected)/finance/actions.ts":'getAccessContext("finance_manage")',
  "app/(protected)/requests/actions.ts":'getAccessContext("requests_manage")',
  "app/(protected)/admin/actions.ts":'getAccessContext("admin_manage")',
  "lib/financial-files.ts":'getAccessContext("finance_manage")',
};

for(const [path,guard] of Object.entries(guardedActions)){
  const content=read(path);
  if(!content.includes(guard)) errors.push(path+" n’utilise pas le garde attendu "+guard);
}

const documentsActions=read("app/(protected)/documents/actions.ts");
if(!documentsActions.includes('can(role,"documents_manage")')||!documentsActions.includes('can(role,"finance_manage")')){
  errors.push("Les actions Documents doivent utiliser les capacités centralisées documents_manage et finance_manage.");
}

for(const path of [
  "app/(protected)/operations/actions.ts",
  "app/(protected)/administration/actions.ts",
  "app/(protected)/governance/actions.ts",
]){
  const content=read(path);
  if(!content.includes("isStaff(")&&!content.includes("getAccessContext(")){
    errors.push(path+" n’expose aucun garde staff/capacité détectable.");
  }
}

if(!fs.existsSync("app/access-denied/page.tsx")) errors.push("Page access-denied manquante.");
if(!fs.existsSync("app/(protected)/error.tsx")) errors.push("Error boundary protégé manquant.");
if(!fs.existsSync("app/(protected)/loading.tsx")) errors.push("État de chargement protégé manquant.");

if(errors.length){
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Access control and production resilience checks passed.");
