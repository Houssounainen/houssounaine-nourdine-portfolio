export type AppRole="admin"|"bureau"|"tresorier"|"secretaire"|"membre";

export type Capability=
  |"staff"
  |"members_manage"
  |"requests_manage"
  |"documents_manage"
  |"operations_manage"
  |"administration_manage"
  |"finance_manage"
  |"governance_manage"
  |"analytics_view"
  |"communication_manage"
  |"content_manage"
  |"exports_manage"
  |"audit_view"
  |"member_import"
  |"case_manage"
  |"admin_manage";

const ALL_ROLES:AppRole[]=["admin","bureau","tresorier","secretaire","membre"];

const CAPABILITIES:Record<Capability,readonly AppRole[]>={
  staff:["admin","bureau","tresorier","secretaire"],
  members_manage:["admin","bureau","tresorier","secretaire"],
  requests_manage:["admin","bureau","tresorier","secretaire"],
  documents_manage:["admin","bureau","tresorier","secretaire"],
  operations_manage:["admin","bureau","tresorier","secretaire"],
  administration_manage:["admin","bureau","tresorier","secretaire"],
  finance_manage:["admin","bureau","tresorier"],
  governance_manage:["admin","bureau","tresorier","secretaire"],
  analytics_view:["admin","bureau","tresorier","secretaire"],
  communication_manage:["admin","bureau","tresorier","secretaire"],
  content_manage:["admin","bureau","secretaire"],
  exports_manage:["admin","bureau","tresorier","secretaire"],
  audit_view:["admin"],
  member_import:["admin","bureau","secretaire"],
  case_manage:["admin","bureau"],
  admin_manage:["admin"],
};

export const ROLE_LABELS:Record<AppRole,string>={
  admin:"Administrateur",
  bureau:"Bureau",
  tresorier:"Trésorier",
  secretaire:"Secrétaire",
  membre:"Membre",
};

export function normalizeRole(role?:string|null):AppRole{
  return ALL_ROLES.includes(role as AppRole)?role as AppRole:"membre";
}

export function can(role:string|null|undefined,capability:Capability){
  return CAPABILITIES[capability].includes(normalizeRole(role));
}

const SENSITIVE_ROUTES:{prefix:string;capability:Capability}[]=[
  {prefix:"/admin/audit",capability:"audit_view"},
  {prefix:"/members/import",capability:"member_import"},
  {prefix:"/admin",capability:"admin_manage"},
  {prefix:"/finance",capability:"finance_manage"},
  {prefix:"/operations",capability:"operations_manage"},
  {prefix:"/administration",capability:"administration_manage"},
  {prefix:"/members",capability:"members_manage"},
  {prefix:"/applications",capability:"members_manage"},
  {prefix:"/requests",capability:"requests_manage"},
  {prefix:"/documents",capability:"documents_manage"},
  {prefix:"/analytics",capability:"analytics_view"},
  {prefix:"/communication",capability:"communication_manage"},
  {prefix:"/content",capability:"content_manage"},
  {prefix:"/exports",capability:"exports_manage"},
];

export function canAccessPath(role:string|null|undefined,pathname:string){
  const match=SENSITIVE_ROUTES.find((rule)=>pathname===rule.prefix||pathname.startsWith(rule.prefix+"/"));
  return match?can(role,match.capability):true;
}

export function navigationForRole(role:string|null|undefined):[string,string][]{
  const r=normalizeRole(role);
  const links:[string,string][]=[
    ["/dashboard","Tableau de bord"],
    ["/me","Mon espace"],
    ["/notifications","Notifications"],
    ["/news","Actualités"],
    ["/agenda","Agenda"],
    ["/announcements","Annonces"],
    ["/organization","Organigramme"],
    ["/governance","Gouvernance"],
    ["/cases","Signalements"],
  ];

  if(can(r,"operations_manage")) links.push(["/operations","Pilotage"]);
  if(can(r,"administration_manage")) links.push(["/administration","Secrétariat"]);
  if(can(r,"members_manage")) {
    links.push(["/members","Membres"]);
    links.push(["/applications","Candidatures"]);
  }
  if(can(r,"requests_manage")) links.push(["/requests","Demandes"]);
  if(can(r,"documents_manage")) links.push(["/documents","Documents"]);
  if(can(r,"finance_manage")) links.push(["/finance","Finances"]);
  if(can(r,"analytics_view")) links.push(["/analytics","Statistiques"]);
  if(can(r,"communication_manage")) links.push(["/communication","Communication"]);
  if(can(r,"content_manage")) links.push(["/content","Contenu"]);
  if(can(r,"exports_manage")) links.push(["/exports","Exports"]);
  if(can(r,"admin_manage")) links.push(["/admin","Paramètres"]);

  return links;
}

export const ACCESS_MATRIX=CAPABILITIES;
