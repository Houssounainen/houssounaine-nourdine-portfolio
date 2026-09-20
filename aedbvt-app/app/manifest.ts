import type { MetadataRoute } from "next";

export default function manifest():MetadataRoute.Manifest{
  return {
    name:"AEDBVT · Gestion associative",
    short_name:"AEDBVT",
    description:"Application officielle de gestion associative AEDBVT.",
    id:"/",
    start_url:"/dashboard",
    scope:"/",
    display:"standalone",
    background_color:"#f4f7fb",
    theme_color:"#07162f",
    orientation:"portrait-primary",
    lang:"fr",
    categories:["productivity","social","education"],
    icons:[
      {
        src:"/aedbvt-pwa.svg",
        sizes:"any",
        type:"image/svg+xml",
        purpose:"any",
      },
      {
        src:"/aedbvt-pwa.svg",
        sizes:"any",
        type:"image/svg+xml",
        purpose:"maskable",
      },
      {
        src:"/aedbvt-logo.webp",
        sizes:"any",
        type:"image/webp",
        purpose:"any",
      },
    ],
    shortcuts:[
      {name:"Tableau de bord",short_name:"Accueil",url:"/dashboard",icons:[{src:"/aedbvt-pwa.svg",sizes:"any",type:"image/svg+xml"}]},
      {name:"Mon espace",short_name:"Profil",url:"/me",icons:[{src:"/aedbvt-pwa.svg",sizes:"any",type:"image/svg+xml"}]},
      {name:"Agenda",short_name:"Agenda",url:"/agenda",icons:[{src:"/aedbvt-pwa.svg",sizes:"any",type:"image/svg+xml"}]},
      {name:"Notifications",short_name:"Alertes",url:"/notifications",icons:[{src:"/aedbvt-pwa.svg",sizes:"any",type:"image/svg+xml"}]},
    ],
  };
}
