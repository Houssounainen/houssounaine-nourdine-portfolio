export const ARTICLE_CATEGORIES=[
  "Vie associative",
  "Académique",
  "Solidarité",
  "Annonce",
  "Gouvernance",
] as const;

export function slugifyArticle(value:string){
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/(^-|-$)/g,"");
}

export function articleStatusLabel(status:string){
  return ({
    draft:"Brouillon",
    scheduled:"Programmé",
    published:"Publié",
    archived:"Archivé",
  } as Record<string,string>)[status]||status;
}
