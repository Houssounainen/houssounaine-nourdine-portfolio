"use strict";

const CONTACT_EMAIL = "houssounainen@gmail.com";
const SITE_ORIGIN = "https://houssounainenourdine.vercel.app";
const GA_MEASUREMENT_ID = "G-1LL57GXLVY";
const FEATURE_FLAGS = Object.freeze({ testimonials: false, publications: false, resume: false });
const RESUME_URL = "";

const translations = {
  fr: {
    skip: "Aller au contenu", findMe: "Retrouvez-moi sur", selectedWork: "Un aperçu de mes créations", exploreWork: "Explorer les créations",
    navAbout: "À propos", navExpertise: "Expertises", navJourney: "Parcours", navProjects: "Projets", navWorks: "Créations", navClients: "Clients", navContact: "Me contacter",
    sidebarTagline: "Stratégie · Création · Influence", topbarLocation: "Toliara · Madagascar", heroGreeting: "Bonjour, je suis", themeDark: "Mode sombre", themeLight: "Mode clair",
    heroEyebrow: "Lead Community Manager · Toliara, Madagascar",
    heroRole: "Marketing digital, relationnel et d’influence",
    heroIntro: "J’aide les marques à structurer leur présence digitale, à développer des communautés engagées et à transformer leur visibilité en résultats mesurables.",
    viewProjects: "Voir mes projets", contactMe: "Me contacter", tagStrategy: "Stratégie social media", tagLeadership: "Management d’équipe", tagInfluence: "Marketing d’influence",
    openTo: "Ouvert aux opportunités", openToTypes: "Emploi · Conseil · Partenariats",
    metricFollowers: "abonnés sur Facebook", metricFollowersNote: "Houssounaine S-FCB", metricViews: "vues Facebook", metricViewsNote: "1 janv. — 29 août 2026", metricClients: "pages clientes supervisées", metricClientsNote: "volume maximal chez Raiky",
    aboutKicker: "À propos", aboutTitle: "Une vision créative, structurée et orientée résultats.",
    aboutLead: "Lead Community Manager chez Raiky et étudiant en Master 2 de marketing international et relationnel à l’Université de Toliara, j’accompagne les marques dans leur stratégie digitale, leur création de contenu et le développement de leurs communautés.",
    aboutBody: "Mon parcours associe management d’équipe, marketing relationnel, analyse des performances et expérience concrète de l’influence grâce à ma propre communauté Houssounaine S-FCB.", aboutPortraitCaption: "Stratégie, création et coordination au quotidien.",
    valueCreativity: "Créativité", valueListening: "Écoute", valueInnovation: "Innovation", valueDiscipline: "Discipline", valueResults: "Résultats",
    thesisKicker: "Recherche & marketing d’influence", thesisTitle: "L’impact du marketing d’influence sur les performances des marques à Madagascar", thesisSubtitle: "Entre notoriété et conversion — cas des influenceurs malgaches. Mémoire entièrement rédigé et déposé, soutenance à venir.",
    expertiseKicker: "Expertises", expertiseTitle: "De la stratégie à la performance.", expertiseIntro: "Une approche complète pour construire une présence digitale cohérente, régulière et mesurable.",
    service1Title: "Community Management", service1Body: "Animation, modération, publication et développement de communautés actives.",
    service2Title: "Stratégie social media", service2Body: "Positionnement, objectifs, piliers éditoriaux et calendriers de contenu.",
    service3Title: "Contenu & rédaction", service3Body: "Copywriting, briefs créatifs, validation des visuels et cohérence de marque.",
    service4Title: "Pilotage de performance", service4Body: "KPI, reporting, analyse des résultats et recommandations d’optimisation.",
    service5Title: "Management d’équipe", service5Body: "Organisation, formation, coordination et contrôle qualité des productions.",
    service6Title: "Influence & conseil", service6Body: "Collaborations de marque et accompagnement en marketing digital relationnel.",
    toolsKicker: "Boîte à outils", toolsTitle: "Des outils maîtrisés au service de l’exécution.", toolsSocial: "Social & programmation", toolsContent: "Création & IA", toolsOps: "Organisation & analyse", toolsAutomation: "Automatisation", advancedLevel: "Avancé", intermediateLevel: "Intermédiaire", beginnerLevel: "Débutant", seoLevel: "Référencement naturel — SEO",
    journeyKicker: "Parcours", journeyTitle: "Une progression construite sur le terrain.", journeyIntro: "Expérience client, influence, engagement associatif et leadership d’équipe.", today: "Aujourd’hui", employment: "Emploi", internship: "Stage", influence: "Influence", engagement: "Engagement", customerRelation: "Relation client", personalMedia: "Média personnel",
    raikyLeadTitle: "Lead Community Manager · Raiky", raikyLeadBody: "Supervision de 24 pages clientes au volume maximal, coordination directe de 4 collaborateurs, stratégie, validation, relation client, KPI et reporting.",
    raikyInternTitle: "Stagiaire Community Manager · Raiky", raikyInternBody: "Intégration en mars 2025, participation aux stratégies, contenus, validations, publications et reportings des pages clientes.",
    betTitle: "Partenaire influenceur · 1xBet", betBody: "Création de contenus sponsorisés avec le code partenaire HOUSSOU9 et 50 inscriptions attribuées.",
    treasurerTitle: "Trésorier · Association des étudiants Anjouanais à Tuléar", treasurerBody: "Gestion du budget, organisation de réunions, d’un événement sportif et d’un repas collectif.",
    akamaTitle: "Gestionnaire relation client · AKAMA SHOP", akamaBody: "Accueil, vente, suivi des commandes, fidélisation, réclamations, communication et analyse du marché.",
    sfcbTimelineBody: "Fondateur, blogueur, rédacteur sportif, créateur de contenu et Community Manager d’une communauté de plus de 271 K abonnés.",
    baccTitle: "Baccalauréat série D", baccSchool: "Lycée de Mutsamudu, Comores", licenceTitle: "Licence — Marketing & commerce international", university: "Université de Toliara", inProgress: "En cours", masterTitle: "Master 2 — Marketing international & relationnel", masterStatus: "Mémoire déposé · Soutenance à venir",
    projectsKicker: "Projets sélectionnés", projectsTitle: "Des stratégies adaptées à chaque réalité.", projectsIntro: "Découvrez mon rôle, mes actions et les résultats disponibles pour chaque projet.",
    filterAll: "Tous", filterPersonal: "Projet personnel", filterManagement: "Management", filterClient: "Clients", projectPersonal: "Projet personnel", projectManagement: "Management", viewCase: "Voir l’étude de cas",
    sfcbSummary: "Un média football construit depuis 2017, devenu une communauté de plus de 271 K abonnés.", views2026: "vues en 2026",
    raikySummary: "Pilotage d’un portefeuille digital, organisation des processus et coordination d’une équipe créative.", managedPages: "pages supervisées",
    tfcSummary: "Une stratégie communautaire régulière soutenant la croissance et les campagnes événementielles.", newFollowers: "nouveaux abonnés",
    univpassSummary: "Déploiement éditorial multiplateforme et reporting d’une marque digitale destinée aux étudiants.", contentsMonth: "contenus en un mois",
    restaurant: "Restaurant", gardenSummary: "Valorisation des plats, de l’expérience du restaurant et de son univers artistique.", sinceMarch: "depuis mars",
    retail: "Commerce", indianSummary: "Stratégie éditoriale produit, nouveautés, offres et présentation fidèle des références.", managedChannel: "canal géré",
    wellness: "Bien-être", homeoSummary: "Vulgarisation responsable, produits naturels, usages et campagnes saisonnières.", localPage: "page locale",
    tools: "Outillage", totalSummary: "Présentation technique, arrivages, contenus pédagogiques et vérification produit.", contentProcess: "processus contenu",
    wedisSummary: "Un chatbot Messenger conçu pour informer, qualifier et orienter les prospects.", botFunctions: "fonctions automatisées",
    tourism: "Tourisme", shainSummary: "Contenus dédiés au tourisme, à l’hébergement, à la restauration et à l’évasion.", managedChannels: "canaux gérés",
    worksKicker: "Créations graphiques", worksTitle: "Des idées conçues pour arrêter le regard.", worksIntro: "Une sélection professionnelle parmi 40 affiches réalisées pour des marques de secteurs variés.", worksViewAll: "Voir toutes les réalisations", worksShowSelection: "Afficher la sélection", workClient: "Client", workRole: "Rôle", workRoleValue: "Conception graphique complète", workDescription: "Affiche de communication imaginée et réalisée pour répondre à l’univers de la marque.", previousWork: "Précédente", nextWork: "Suivante", openWork: "Agrandir la création", allSectors: "Tous les secteurs",
    clientsKicker: "Portefeuille clients", clientsTitle: "Des secteurs différents, une même exigence.", clientsIntro: "18 clients actuels et 3 anciens clients réunis dans un portefeuille multisectoriel.", currentClients: "Clients actuels", formerClients: "Anciens clients", current: "Client actuel", former: "Ancien client",
    languagesKicker: "Langues", languagesTitle: "Communiquer avec clarté, s’adapter aux publics.", comorian: "Comorien", french: "Français", malagasy: "Malagasy", english: "Anglais", native: "Langue maternelle", fluent: "Courant", intermediate: "Intermédiaire", beginner: "Débutant",
    contactKicker: "Construisons la suite", contactTitle: "Une opportunité, une mission ou une collaboration ?", contactIntro: "Décrivez votre besoin. Je vous répondrai dès que possible pour discuter de la meilleure manière d’avancer ensemble.",
    formName: "Nom", formEmail: "E-mail", formSubject: "Objet", formType: "Type de demande", formChoose: "Choisir une option", formRecruitment: "Recrutement", formConsulting: "Mission de conseil", formPartnership: "Partenariat ou influence", formOther: "Autre", formMessage: "Message", formConsent: "J’accepte que mes informations soient utilisées uniquement pour répondre à ma demande.", formSend: "Préparer l’e-mail", formNote: "Le formulaire ouvre votre application de messagerie ; aucune donnée n’est stockée sur ce site.", formReady: "Votre application de messagerie va s’ouvrir.",
    footerTagline: "Créativité, discipline et résultats au service des marques.", privacy: "Confidentialité", privacyKicker: "Données personnelles", privacyTitle: "Politique de confidentialité", privacyBody1: "Ce portfolio ne stocke aucune donnée personnelle sur un serveur. Le formulaire prépare un e-mail dans l’application de messagerie du visiteur.", privacyBody2: "Les informations communiquées sont utilisées uniquement pour répondre à la demande. Avec votre accord, Google Analytics mesure anonymement l’audience et l’utilisation du portfolio.", close: "Fermer",
    cookieTitle: "Respect de votre vie privée", cookieBody: "Ce site utilise des préférences essentielles. Google Analytics est activé uniquement avec votre accord afin de mesurer l’audience.", cookieReject: "Refuser", cookieAccept: "Accepter",
    dialogRole: "Mon rôle", dialogPeriod: "Période", dialogActions: "Actions principales", dialogResults: "Résultats et faits marquants", officialLink: "Lien officiel", siteLink: "Site officiel", testimonialsKicker: "Témoignages", testimonialsTitle: "Ce qu’ils disent de notre collaboration.", publicationsKicker: "Publications & réflexions", publicationsTitle: "Partager les méthodes derrière les résultats.", resumeTitle: "Télécharger mon parcours complet.", resumeDownload: "Télécharger le CV", statsCaption: "Statistiques Facebook — du 1er janvier au 29 août 2026"
  },
  en: {
    skip: "Skip to content", findMe: "Find me on", selectedWork: "A glimpse of my creative work", exploreWork: "Explore creative work",
    navAbout: "About", navExpertise: "Expertise", navJourney: "Journey", navProjects: "Projects", navWorks: "Creative work", navClients: "Clients", navContact: "Contact me",
    sidebarTagline: "Strategy · Creation · Influence", topbarLocation: "Toliara · Madagascar", heroGreeting: "Hello, I’m", themeDark: "Dark mode", themeLight: "Light mode",
    heroEyebrow: "Lead Community Manager · Toliara, Madagascar",
    heroRole: "Digital, relationship and influencer marketing",
    heroIntro: "I help brands structure their digital presence, grow engaged communities and turn visibility into measurable results.",
    viewProjects: "View my projects", contactMe: "Contact me", tagStrategy: "Social media strategy", tagLeadership: "Team management", tagInfluence: "Influencer marketing",
    openTo: "Open to opportunities", openToTypes: "Employment · Consulting · Partnerships",
    metricFollowers: "Facebook followers", metricFollowersNote: "Houssounaine S-FCB", metricViews: "Facebook views", metricViewsNote: "Jan 1 — Aug 29, 2026", metricClients: "client pages supervised", metricClientsNote: "maximum volume at Raiky",
    aboutKicker: "About", aboutTitle: "A creative, structured and results-driven vision.",
    aboutLead: "As Lead Community Manager at Raiky and a Master's student in International and Relationship Marketing at the University of Toliara, I help brands shape their digital strategy, create relevant content and grow their communities.",
    aboutBody: "My background combines team management, relationship marketing, performance analysis and hands-on influencer experience through my own community, Houssounaine S-FCB.", aboutPortraitCaption: "Strategy, creation and coordination in daily practice.",
    valueCreativity: "Creativity", valueListening: "Listening", valueInnovation: "Innovation", valueDiscipline: "Discipline", valueResults: "Results",
    thesisKicker: "Research & influencer marketing", thesisTitle: "The impact of influencer marketing on brand performance in Madagascar", thesisSubtitle: "Between awareness and conversion — the case of Malagasy influencers. Dissertation fully written and submitted; defence forthcoming.",
    expertiseKicker: "Expertise", expertiseTitle: "From strategy to performance.", expertiseIntro: "A complete approach to building a coherent, consistent and measurable digital presence.",
    service1Title: "Community Management", service1Body: "Community engagement, moderation, publishing and sustainable audience growth.",
    service2Title: "Social media strategy", service2Body: "Positioning, objectives, editorial pillars and content calendars.",
    service3Title: "Content & copywriting", service3Body: "Copywriting, creative briefs, visual approval and brand consistency.",
    service4Title: "Performance management", service4Body: "KPIs, reporting, result analysis and optimisation recommendations.",
    service5Title: "Team management", service5Body: "Organisation, training, coordination and production quality control.",
    service6Title: "Influence & consulting", service6Body: "Brand collaborations and relationship-driven digital marketing advice.",
    toolsKicker: "Toolbox", toolsTitle: "The right tools to turn strategy into execution.", toolsSocial: "Social & scheduling", toolsContent: "Creation & AI", toolsOps: "Operations & analytics", toolsAutomation: "Automation", advancedLevel: "Advanced", intermediateLevel: "Intermediate", beginnerLevel: "Beginner", seoLevel: "Search engine optimisation — SEO",
    journeyKicker: "Journey", journeyTitle: "Progress built through hands-on experience.", journeyIntro: "Customer relations, influence, community engagement and team leadership.", today: "Present", employment: "Employment", internship: "Internship", influence: "Influence", engagement: "Engagement", customerRelation: "Customer relations", personalMedia: "Personal media",
    raikyLeadTitle: "Lead Community Manager · Raiky", raikyLeadBody: "Supervision of up to 24 client pages, direct coordination of 4 team members, strategy, approvals, client relations, KPIs and reporting.",
    raikyInternTitle: "Community Management Intern · Raiky", raikyInternBody: "Joined in March 2025 and contributed to client strategy, content, approvals, publishing and reporting.",
    betTitle: "Influencer Partner · 1xBet", betBody: "Sponsored content creation using partner code HOUSSOU9, with 50 attributed registrations.",
    treasurerTitle: "Treasurer · Association of Anjouan Students in Toliara", treasurerBody: "Budget management and organisation of meetings, a sports event and a community meal.",
    akamaTitle: "Customer Relationship Manager · AKAMA SHOP", akamaBody: "Customer reception, sales, order tracking, loyalty, complaints, communications and market analysis.",
    sfcbTimelineBody: "Founder, blogger, sports writer, content creator and Community Manager of a community with over 271K followers.",
    baccTitle: "Scientific Baccalaureate — Series D", baccSchool: "Mutsamudu High School, Comoros", licenceTitle: "Bachelor's Degree — Marketing & International Trade", university: "University of Toliara", inProgress: "In progress", masterTitle: "Master's — International & Relationship Marketing", masterStatus: "Dissertation submitted · Defence forthcoming",
    projectsKicker: "Selected projects", projectsTitle: "Strategies shaped for each context.", projectsIntro: "Explore my role, actions and the available results for each project.",
    filterAll: "All", filterPersonal: "Personal project", filterManagement: "Management", filterClient: "Clients", projectPersonal: "Personal project", projectManagement: "Management", viewCase: "View case study",
    sfcbSummary: "A football media brand launched in 2017 and grown into a community of more than 271K followers.", views2026: "views in 2026",
    raikySummary: "Digital portfolio leadership, process organisation and coordination of a creative team.", managedPages: "pages supervised",
    tfcSummary: "Consistent community strategy supporting growth and event campaigns.", newFollowers: "new followers",
    univpassSummary: "Multi-platform editorial rollout and reporting for a digital brand serving students.", contentsMonth: "pieces in one month",
    restaurant: "Restaurant", gardenSummary: "Showcasing the food, dining experience and distinctive artistic setting.", sinceMarch: "since March",
    retail: "Retail", indianSummary: "Product editorial strategy, new arrivals, offers and accurate product presentation.", managedChannel: "managed channel",
    wellness: "Wellness", homeoSummary: "Responsible educational content, natural products, uses and seasonal campaigns.", localPage: "local page",
    tools: "Tools", totalSummary: "Technical product presentation, arrivals, educational content and specification checks.", contentProcess: "content process",
    wedisSummary: "A Messenger chatbot designed to inform, qualify and route prospects.", botFunctions: "automated functions",
    tourism: "Tourism", shainSummary: "Content focused on tourism, accommodation, dining and escape.", managedChannels: "managed channels",
    worksKicker: "Graphic design", worksTitle: "Ideas designed to stop the scroll.", worksIntro: "A professionally curated selection from 40 posters created for brands across diverse industries.", worksViewAll: "View all creative work", worksShowSelection: "Show curated selection", workClient: "Client", workRole: "Role", workRoleValue: "Full graphic design", workDescription: "A communication poster imagined and designed to reflect the brand’s own visual world.", previousWork: "Previous", nextWork: "Next", openWork: "Open creative work", allSectors: "All industries",
    clientsKicker: "Client portfolio", clientsTitle: "Different industries, the same high standards.", clientsIntro: "18 current and 3 former clients brought together in a multi-industry portfolio.", currentClients: "Current clients", formerClients: "Former clients", current: "Current client", former: "Former client",
    languagesKicker: "Languages", languagesTitle: "Communicating clearly and adapting to different audiences.", comorian: "Comorian", french: "French", malagasy: "Malagasy", english: "English", native: "Native", fluent: "Fluent", intermediate: "Intermediate", beginner: "Beginner",
    contactKicker: "Let’s build what comes next", contactTitle: "A role, a project or a partnership?", contactIntro: "Tell me about your needs. I will get back to you as soon as possible so we can discuss the best way forward.",
    formName: "Name", formEmail: "Email", formSubject: "Subject", formType: "Request type", formChoose: "Choose an option", formRecruitment: "Recruitment", formConsulting: "Consulting project", formPartnership: "Partnership or influence", formOther: "Other", formMessage: "Message", formConsent: "I agree that my information may be used solely to respond to my request.", formSend: "Prepare email", formNote: "The form opens your email application; no data is stored on this website.", formReady: "Your email application is about to open.",
    footerTagline: "Creativity, discipline and results in service of brands.", privacy: "Privacy", privacyKicker: "Personal data", privacyTitle: "Privacy policy", privacyBody1: "This portfolio does not store personal data on a server. The form prepares an email in the visitor's email application.", privacyBody2: "Information provided is used solely to respond to the request. With your consent, Google Analytics anonymously measures portfolio traffic and usage.", close: "Close",
    cookieTitle: "Your privacy matters", cookieBody: "This website uses essential preferences. Google Analytics is enabled only with your consent to measure traffic.", cookieReject: "Reject", cookieAccept: "Accept",
    dialogRole: "My role", dialogPeriod: "Period", dialogActions: "Main actions", dialogResults: "Results and highlights", officialLink: "Official link", siteLink: "Official website", testimonialsKicker: "Testimonials", testimonialsTitle: "What people say about working with me.", publicationsKicker: "Posts & insights", publicationsTitle: "Sharing the methods behind the results.", resumeTitle: "Download my full professional profile.", resumeDownload: "Download résumé", statsCaption: "Facebook statistics — January 1 to August 29, 2026"
  }
};

const clients = [
  { name: "Raiky", logo: "assets/logos/raiky.jpg", sector: ["Agence & digital", "Agency & digital"], status: "current" },
  { name: "Tulear Fitness Club", logo: "assets/logos/tulear-fitness.jpg", sector: ["Fitness", "Fitness"], status: "current" },
  { name: "Univpass", logo: "assets/logos/univpass.jpg", sector: ["EdTech", "EdTech"], status: "current" },
  { name: "Le Jardin Tuléar", logo: "assets/logos/le-jardin.jpg", sector: ["Restaurant", "Restaurant"], status: "current" },
  { name: "Indian Basket", logo: "assets/logos/indian-basket.jpg", sector: ["Commerce", "Retail"], status: "current" },
  { name: "Homeopharma Tuléar", logo: "assets/logos/homeopharma.jpg", sector: ["Bien-être", "Wellness"], status: "current" },
  { name: "Total Tools Shop Tuléar", logo: "assets/logos/total-tools.jpg", sector: ["Outillage", "Tools"], status: "current" },
  { name: "WEDIS Tuléar", logo: "assets/logos/wedis.jpg", sector: ["Télévision & services", "TV & services"], status: "current" },
  { name: "Shain Lodge", logo: "assets/logos/shain-lodge.jpg", sector: ["Tourisme", "Tourism"], status: "current" },
  { name: "Raiky Academy", logo: "assets/logos/raiky-academy.jpg", sector: ["Formation", "Training"], status: "current" },
  { name: "Mad Sud Voyage", logo: "assets/logos/mad-sud-voyage.jpg", sector: ["Voyage", "Travel"], status: "current" },
  { name: "Quincaillerie Tayyebi Tuléar", logo: "assets/logos/quincaillerie-tayyebi.jpg", sector: ["Quincaillerie", "Hardware"], status: "current" },
  { name: "Tranombarotra Moïse", logo: "assets/logos/tranombarotra-moise.jpg", sector: ["Commerce", "Retail"], status: "current" },
  { name: "Gass’Kaly", logo: "assets/logos/gass-kaly.jpg", sector: ["Traiteur", "Catering"], status: "current" },
  { name: "Escapade — Hôtel & Restaurant", logo: "assets/logos/escapade.jpg", sector: ["Hôtellerie", "Hospitality"], status: "current" },
  { name: "Prolavage Tuléar", logo: "assets/logos/prolavage.jpg", sector: ["Services", "Services"], status: "current" },
  { name: "Sunset Madiorano", logo: "assets/logos/sunset-madiorano.jpg", sector: ["Tourisme", "Tourism"], status: "current" },
  { name: "La Signature de Hoby", logo: "assets/logos/signature-hoby.jpg", sector: ["Mode & création", "Fashion & design"], status: "current" },
  { name: "Marina Blue", logo: "assets/logos/marina-blue.jpg", sector: ["Tourisme", "Tourism"], status: "former" },
  { name: "Quincaillerie Vao2 Sanfil Tuléar", logo: "assets/logos/vao2.jpg", sector: ["Quincaillerie", "Hardware"], status: "former" },
  { name: "KS Beauty Toliara", logo: "assets/logos/ks-beauty.jpg", sector: ["Beauté", "Beauty"], status: "former" }
];

const workSectors = {
  retail: ["Commerce & distribution", "Retail & distribution"],
  hardware: ["Outillage & quincaillerie", "Tools & hardware"],
  wellness: ["Beauté & bien-être", "Beauty & wellness"],
  hospitality: ["Restauration & tourisme", "Hospitality & tourism"],
  creative: ["Mode & événementiel", "Fashion & events"],
  media: ["Médias & services", "Media & services"]
};

const works = [
  { id: 1, src: "assets/works/01-indian-basket-italie.jpg", client: "Indian Basket", category: "retail", format: "square", title: ["Campagne teaser — Saveurs d’Italie", "Teaser campaign — Flavours of Italy"] },
  { id: 2, src: "assets/works/02-indian-basket-mango.jpg", client: "Indian Basket", category: "retail", format: "square", featured: true, title: ["Campagne produit — Mango", "Product campaign — Mango"] },
  { id: 3, src: "assets/works/03-indian-basket-mms.jpg", client: "Indian Basket", category: "retail", format: "portrait", featured: true, title: ["Campagne produit — M&M’s", "Product campaign — M&M’s"] },
  { id: 4, src: "assets/works/04-indian-basket-gato.jpg", client: "Indian Basket", category: "retail", format: "square", featured: true, title: ["Campagne produit — Gato", "Product campaign — Gato"] },
  { id: 5, src: "assets/works/05-vao2-grillage-pvc.jpg", client: "Quincaillerie Vao2 Tuléar", category: "hardware", format: "landscape", featured: true, title: ["Arrivage — Grillage moustiquaire", "New arrival — Insect screen"] },
  { id: 6, src: "assets/works/06-vao2-papier-abrasif.jpg", client: "Quincaillerie Vao2 Tuléar", category: "hardware", format: "landscape", title: ["Catalogue produit — Papier abrasif", "Product catalogue — Sandpaper"] },
  { id: 7, src: "assets/works/07-indian-basket-independance.jpg", client: "Indian Basket", category: "retail", format: "square", title: ["Fête de l’Indépendance", "Independence Day"] },
  { id: 8, src: "assets/works/08-indian-basket-glace.jpg", client: "Indian Basket", category: "retail", format: "portrait", title: ["Nouveauté — Glace", "New product — Ice cream"] },
  { id: 9, src: "assets/works/09-signature-academy.jpg", client: "La Signature de Hoby", category: "creative", format: "square", featured: true, title: ["Annonce événementielle — Academy", "Event announcement — Academy"] },
  { id: 10, src: "assets/works/10-signature-hoby.jpg", client: "La Signature de Hoby", category: "creative", format: "square", featured: true, title: ["Présentation de marque", "Brand presentation"] },
  { id: 11, src: "assets/works/11-vao2-abattant.jpg", client: "Quincaillerie Vao2 Tuléar", category: "hardware", format: "landscape", title: ["Arrivage — Abattant WC", "New arrival — Toilet seat"] },
  { id: 12, src: "assets/works/12-homeopharma-soiree.jpg", client: "Homeopharma Tuléar", category: "wellness", format: "portrait", title: ["Routine bien-être du soir", "Evening wellness routine"] },
  { id: 13, src: "assets/works/13-vao2-eid.jpg", client: "Quincaillerie Vao2 Tuléar", category: "hardware", format: "square", title: ["Communication événementielle — Eid", "Event communication — Eid"] },
  { id: 14, src: "assets/works/14-homeopharma-neem.jpg", client: "Homeopharma Tuléar", category: "wellness", format: "portrait", featured: true, title: ["Campagne soin du visage", "Facial care campaign"] },
  { id: 15, src: "assets/works/15-total-testeur.jpg", client: "Total Tools Shop Tuléar", category: "hardware", format: "landscape", title: ["Fiche produit — Testeur digital", "Product card — Digital tester"] },
  { id: 16, src: "assets/works/16-homeopharma-infusion.jpg", client: "Homeopharma Tuléar", category: "wellness", format: "portrait", featured: true, title: ["Campagne infusion après-repas", "After-meal infusion campaign"] },
  { id: 17, src: "assets/works/17-homeopharma-cernes.jpg", client: "Homeopharma Tuléar", category: "wellness", format: "square", title: ["Campagne sérum anti-cernes", "Eye serum campaign"] },
  { id: 18, src: "assets/works/18-total-groupe.jpg", client: "Total Tools Shop Tuléar", category: "hardware", format: "square", featured: true, title: ["Campagne groupe électrogène", "Generator campaign"] },
  { id: 19, src: "assets/works/19-total-agrafeuse.jpg", client: "Total Tools Shop Tuléar", category: "hardware", format: "landscape", title: ["Fiche produit — Agrafeuse", "Product card — Staple gun"] },
  { id: 20, src: "assets/works/20-total-decametre.jpg", client: "Total Tools Shop Tuléar", category: "hardware", format: "portrait", title: ["Nouveauté — Décamètre", "New product — Measuring tape"] },
  { id: 21, src: "assets/works/21-shain-cheat-meal.jpg", client: "Shain Lodge", category: "hospitality", format: "square", title: ["Campagne restauration — Cheat meal", "Dining campaign — Cheat meal"] },
  { id: 22, src: "assets/works/22-homeopharma-ete.jpg", client: "Homeopharma Tuléar", category: "wellness", format: "portrait", title: ["Campagne saisonnière — Été", "Seasonal campaign — Summer"] },
  { id: 23, src: "assets/works/23-shain-salary-nord.jpg", client: "Shain Lodge", category: "hospitality", format: "square", featured: true, title: ["Destination — Salary Nord", "Destination — Salary Nord"] },
  { id: 24, src: "assets/works/24-shain-restauration.jpg", client: "Shain Lodge", category: "hospitality", format: "square", featured: true, title: ["Campagne restauration", "Dining campaign"] },
  { id: 25, src: "assets/works/25-gass-kaly-mariages.jpg", client: "Gass’Kaly", category: "hospitality", format: "square", featured: true, title: ["Campagne mariage & réception", "Wedding & reception campaign"] },
  { id: 26, src: "assets/works/26-gass-kaly-client.jpg", client: "Gass’Kaly", category: "hospitality", format: "square", title: ["Preuve sociale — Client satisfait", "Social proof — Happy client"] },
  { id: 27, src: "assets/works/27-ks-beauty-soins.jpg", client: "KS Beauty Toliara", category: "wellness", format: "square", featured: true, title: ["Campagne soins du visage", "Facial treatment campaign"] },
  { id: 28, src: "assets/works/28-homeopharma-peau.jpg", client: "Homeopharma Tuléar", category: "wellness", format: "square", title: ["Campagne SOS peau", "Skin SOS campaign"] },
  { id: 29, src: "assets/works/29-gass-kaly-saveurs.jpg", client: "Gass’Kaly", category: "hospitality", format: "square", featured: true, title: ["Campagne culinaire — Saveurs raffinées", "Culinary campaign — Refined flavours"] },
  { id: 30, src: "assets/works/30-marina-blue-chandeleur.jpg", client: "Marina Blue", category: "hospitality", format: "square", title: ["Événement enfants — Chandeleur", "Children’s event — Candlemas"] },
  { id: 31, src: "assets/works/31-wedis-weekend.jpg", client: "WEDIS Tuléar", category: "media", format: "square", title: ["Campagne week-end", "Weekend campaign"] },
  { id: 32, src: "assets/works/32-wedis-match.jpg", client: "WEDIS Tuléar", category: "media", format: "square", featured: true, title: ["Affiche sportive — France vs Maroc", "Sports poster — France vs Morocco"] },
  { id: 33, src: "assets/works/33-le-jardin-assiette.jpg", client: "Le Jardin Tuléar", category: "hospitality", format: "portrait", featured: true, title: ["Campagne culinaire — Le kiff pur", "Culinary campaign — Pure enjoyment"] },
  { id: 34, src: "assets/works/34-le-jardin-assiette-vertical.jpg", client: "Le Jardin Tuléar", category: "hospitality", format: "portrait", title: ["Déclinaison culinaire", "Culinary adaptation"] },
  { id: 35, src: "assets/works/35-ks-beauty-hydrafacial.jpg", client: "KS Beauty Toliara", category: "wellness", format: "square", title: ["Campagne Hydrafacial", "Hydrafacial campaign"] },
  { id: 36, src: "assets/works/36-wedis-programmes.jpg", client: "WEDIS Tuléar", category: "media", format: "square", title: ["Campagne programmes du week-end", "Weekend programming campaign"] },
  { id: 37, src: "assets/works/37-ks-beauty-prendre-soin.jpg", client: "KS Beauty Toliara", category: "wellness", format: "square", title: ["Campagne prendre soin de soi", "Self-care campaign"] },
  { id: 38, src: "assets/works/38-le-jardin-aubergine.jpg", client: "Le Jardin Tuléar", category: "hospitality", format: "portrait", featured: true, title: ["Campagne culinaire — Aubergine", "Culinary campaign — Aubergine"] },
  { id: 39, src: "assets/works/39-wedis-bonus-internet.jpg", client: "WEDIS Tuléar", category: "media", format: "square", featured: true, title: ["Campagne promotionnelle — Bonus internet", "Promotional campaign — Internet bonus"] },
  { id: 40, src: "assets/works/40-wedis-film-serie-sport.jpg", client: "WEDIS Tuléar", category: "media", format: "square", title: ["Campagne choix de programmes", "Programming choice campaign"] }
];

const projectData = {
  sfcb: {
    title: "Houssounaine S-FCB", type: ["Projet personnel phare", "Flagship personal project"],
    summary: ["Média consacré à l’actualité du FC Barcelone, développé depuis 2017 autour d’une stratégie de contenu réactive et communautaire.", "FC Barcelona news media project developed since 2017 through a responsive, community-driven content strategy."],
    role: ["Fondateur, administrateur principal, blogueur, rédacteur sportif, créateur de contenu et Community Manager.", "Founder, lead administrator, blogger, sports writer, content creator and Community Manager."],
    period: ["Août 2017 — aujourd’hui", "August 2017 — present"],
    actions: [["Veille et couverture de l’actualité sportive", "Rédaction, création, programmation et publication", "Animation de communauté et analyse des performances", "Contenus viraux et collaborations sponsorisées"], ["Sports news monitoring and coverage", "Writing, creation, scheduling and publishing", "Community engagement and performance analysis", "Viral content and sponsored collaborations"]],
    results: [["Plus de 271 000 abonnés Facebook", "49 M de portée, du 1er janvier au 30 septembre 2024", "100,4 M de vues et 4,2 M d’interactions, du 1er janvier au 29 août 2026", "Une publication à 2,2 M de vues sur la période 2026", "28 publications virales et jusqu’à 60 000 J’aime sur une publication", "50 inscriptions via le code 1xBet HOUSSOU9"], ["Over 271,000 Facebook followers", "49M reach from January 1 to September 30, 2024", "100.4M views and 4.2M interactions from January 1 to August 29, 2026", "One post reached 2.2M views during the 2026 period", "28 viral posts and up to 60,000 likes on one post", "50 registrations through 1xBet code HOUSSOU9"]],
    links: [{ label: "Facebook", url: "https://www.facebook.com/houssounainen/" }, { label: "Instagram", url: "https://www.instagram.com/houssounaine_sfcb/" }],
    media: ["assets/stats-facebook-2026-a.webp", "assets/stats-facebook-2026-b.webp"]
  },
  raiky: {
    title: "Raiky", type: ["Management & Community Management", "Management & Community Management"],
    summary: ["Pilotage d’un portefeuille digital diversifié et structuration du travail d’une équipe créative.", "Leadership of a diverse digital portfolio and structured coordination of a creative team."],
    role: ["Stagiaire Community Manager, puis Lead Community Manager depuis janvier 2026.", "Community Management intern, then Lead Community Manager since January 2026."],
    period: ["Mars 2025 — aujourd’hui", "March 2025 — present"],
    actions: [["Stratégies et calendriers éditoriaux", "Répartition des tâches et contrôle qualité", "Validation des designs, publication et relation client", "KPI, reporting, réunions et suivi hebdomadaire", "Formation et intégration de nouveaux collaborateurs", "Standardisation des workflows dans Trello et Odoo"], ["Strategies and editorial calendars", "Task allocation and quality control", "Visual approval, publishing and client relations", "KPIs, reporting and weekly follow-up", "Training and onboarding of new team members", "Workflow standardisation in Trello and Odoo"]],
    results: [["Jusqu’à 24 pages clientes supervisées simultanément", "4 collaborateurs directs : 2 assistants CM et 2 designers", "12 à 15 publications par client et par mois", "Coordination, délais, validations et cohérence visuelle améliorés"], ["Up to 24 client pages supervised simultaneously", "4 direct team members: 2 assistant CMs and 2 designers", "12 to 15 posts per client per month", "Improved coordination, deadlines, approval cycles and visual consistency"]],
    links: [{ label: "Site", url: "https://raiky.mg/" }, { label: "Facebook", url: "https://www.facebook.com/raiky601/" }, { label: "LinkedIn", url: "https://mg.linkedin.com/company/raiky" }]
  },
  tfc: {
    title: "Tulear Fitness Club", type: ["Fitness & communauté", "Fitness & community"],
    summary: ["Gestion Facebook et campagnes éditoriales destinées à développer la communauté et soutenir les temps forts du club.", "Facebook management and editorial campaigns designed to grow the community and support major club events."],
    role: ["Stratégie, rédaction, supervision des contenus, validation visuelle, publication, animation et suivi.", "Strategy, copywriting, content supervision, visual approval, publishing, engagement and monitoring."],
    period: ["Mars 2025 — aujourd’hui", "March 2025 — present"],
    actions: [["Planification éditoriale et création de contenu", "Animation de la page Facebook", "Campagnes Meet of Goliath — 2e édition", "Contribution à la campagne TEDx Toliara 2025"], ["Editorial planning and content creation", "Facebook page engagement", "Meet of Goliath — 2nd edition campaigns", "Contribution to the TEDx Toliara 2025 campaign"]],
    results: [["Progression de 3 000 à 13 000 abonnés", "+10 000 abonnés, soit environ +333 % par rapport au niveau initial"], ["Growth from 3,000 to 13,000 followers", "+10,000 followers, approximately +333% compared with the initial base"]],
    links: [{ label: "Facebook", url: "https://www.facebook.com/100057171320694/" }]
  },
  univpass: {
    title: "Univpass", type: ["EdTech & communication multiplateforme", "EdTech & multi-platform communication"],
    summary: ["Déploiement d’une présence éditoriale coordonnée sur Facebook, Instagram, TikTok et LinkedIn.", "Coordinated editorial presence across Facebook, Instagram, TikTok and LinkedIn."],
    role: ["Stratégie, supervision, rédaction, validation des designs, publication, reporting et relation client.", "Strategy, supervision, copywriting, visual approval, publishing, reporting and client relations."],
    period: ["14 juillet 2026 — aujourd’hui", "July 14, 2026 — present"],
    actions: [["Calendrier et adaptation multiplateforme", "Rédaction et validation des contenus", "Publication et reporting", "Coordination avec le client"], ["Multi-platform calendar and adaptation", "Copywriting and content approval", "Publishing and reporting", "Client coordination"]],
    results: [["Du 14 juillet au 13 août 2026 : 19 contenus Facebook", "10 publications Instagram et 344 vues", "9 publications TikTok", "10 publications LinkedIn"], ["July 14 to August 13, 2026: 19 Facebook pieces", "10 Instagram posts and 344 views", "9 TikTok posts", "10 LinkedIn posts"]],
    links: [{ label: "Site", url: "https://univ-pass.tech/" }, { label: "Facebook", url: "https://www.facebook.com/people/Univpass/61590341192720/" }, { label: "Instagram", url: "https://www.instagram.com/univpass601/" }]
  },
  "le-jardin": {
    title: "Le Jardin Tuléar", type: ["Restauration & expérience", "Restaurant & experience"],
    summary: ["Une communication culinaire mettant en valeur les plats et l’univers artistique du restaurant.", "Culinary communication showcasing the food and artistic atmosphere of the restaurant."],
    role: ["Stratégie éditoriale, rédaction, supervision, validation et publication.", "Editorial strategy, copywriting, supervision, approval and publishing."],
    period: ["Mars 2025 — aujourd’hui", "March 2025 — present"],
    actions: [["Mise en valeur des plats et expériences", "Création de campagnes régulières", "Cohérence des textes et visuels", "Animation Facebook et Instagram"], ["Food and experience storytelling", "Regular campaign creation", "Copy and visual consistency", "Facebook and Instagram engagement"]],
    results: [["Participation à toutes les activités éditoriales et campagnes depuis mars 2025", "Positionnement distinctif autour de l’expérience culinaire et artistique"], ["Contribution to all editorial activity and campaigns since March 2025", "Distinctive positioning around a culinary and artistic experience"]],
    links: [{ label: "Facebook", url: "https://www.facebook.com/61584415452779/" }, { label: "Instagram", url: "https://www.instagram.com/lejardin601/" }]
  },
  "indian-basket": {
    title: "Indian Basket", type: ["Commerce & produits", "Retail & products"],
    summary: ["Une ligne éditoriale commerciale centrée sur les produits, nouveautés et offres.", "Commercial editorial content focused on products, new arrivals and offers."],
    role: ["Stratégie produit, rédaction commerciale, validation visuelle, publication et animation Facebook.", "Product strategy, commercial copywriting, visual approval, Facebook publishing and engagement."],
    period: ["Mars 2025 — aujourd’hui", "March 2025 — present"],
    actions: [["Promotion des nouveautés et offres", "Présentation fidèle des emballages et produits", "Régularité des publications", "Animation de la page"], ["Promotion of new products and offers", "Accurate packaging and product presentation", "Consistent publishing", "Page engagement"]],
    results: [["Gestion éditoriale continue de la page Facebook", "Aucun KPI public revendiqué sans preuve complémentaire"], ["Ongoing editorial management of the Facebook page", "No public KPI claimed without additional evidence"]],
    links: [{ label: "Facebook", url: "https://www.facebook.com/100079755558409/" }]
  },
  homeopharma: {
    title: "Homeopharma Tuléar", type: ["Bien-être naturel", "Natural wellness"],
    summary: ["Vulgarisation claire et responsable de contenus liés aux produits naturels et au bien-être.", "Clear and responsible educational content about natural products and wellness."],
    role: ["Rédaction, validation, planification et gestion de la page Facebook locale.", "Copywriting, approval, planning and management of the local Facebook page."],
    period: ["Mars 2025 — aujourd’hui", "March 2025 — present"],
    actions: [["Présentation des produits et usages", "Campagnes saisonnières", "Promotion des offres et instituts", "Communication responsable"], ["Product and usage presentation", "Seasonal campaigns", "Promotion of offers and institutes", "Responsible communication"]],
    results: [["Gestion continue de la page Facebook locale", "Le compte Instagram national ne fait pas partie du périmètre"], ["Ongoing management of the local Facebook page", "The national Instagram account is outside the scope"]],
    links: [{ label: "Facebook", url: "https://www.facebook.com/100038813263819/" }]
  },
  "total-tools": {
    title: "Total Tools Shop Tuléar", type: ["Outillage & contenu technique", "Tools & technical content"],
    summary: ["Des contenus commerciaux et pédagogiques fondés sur des caractéristiques produit vérifiées.", "Commercial and educational content based on verified product specifications."],
    role: ["Rédaction, vérification, conception ou validation des visuels, publication et modération.", "Copywriting, verification, visual creation or approval, publishing and moderation."],
    period: ["Mars 2025 — aujourd’hui", "March 2025 — present"],
    actions: [["Présentation technique des outils", "Nouveautés et arrivages", "Contenus pédagogiques de sécurité", "Visuels, carrousels et modération"], ["Technical tool presentation", "New products and arrivals", "Educational safety content", "Visuals, carousels and moderation"]],
    results: [["Processus complet, de la vérification produit à la publication", "Aucun KPI public revendiqué sans preuve complémentaire"], ["End-to-end process from product verification to publishing", "No public KPI claimed without additional evidence"]],
    links: [{ label: "Facebook", url: "https://www.facebook.com/totaltulear/" }]
  },
  wedis: {
    title: "WEDIS Tuléar", type: ["Automatisation Messenger", "Messenger automation"],
    summary: ["Conception d’un chatbot destiné à accélérer l’accès aux offres et l’orientation des prospects.", "Chatbot designed to speed up access to offers and route prospects efficiently."],
    role: ["Stratégie Facebook et conception du chatbot Messenger avec Chatfuel et Botpress.", "Facebook strategy and Messenger chatbot development with Chatfuel and Botpress."],
    period: ["Février 2026 — aujourd’hui", "February 2026 — present"],
    actions: [["Réponses automatiques et FAQ", "Présentation des offres Canal+ et DStv", "Tarifs et aide au réabonnement", "Collecte de contacts et transfert vers un conseiller"], ["Automated replies and FAQs", "Canal+ and DStv offer presentation", "Pricing and subscription renewal support", "Lead capture and transfer to an advisor"]],
    results: [["7 fonctions clés automatisées", "Déploiement final avec Chatfuel et Botpress"], ["7 key automated functions", "Final deployment using Chatfuel and Botpress"]],
    links: [{ label: "Facebook", url: "https://www.facebook.com/61577502127003/" }]
  },
  shain: {
    title: "Shain Lodge", type: ["Tourisme & hospitalité", "Tourism & hospitality"],
    summary: ["Une présence sociale tournée vers l’évasion, l’hébergement et la restauration à Salary Nord.", "A social presence focused on escape, accommodation and dining in Salary Nord."],
    role: ["Stratégie de contenu, rédaction, validation visuelle, publication et animation Facebook/Instagram.", "Content strategy, copywriting, visual approval, Facebook/Instagram publishing and engagement."],
    period: ["Mars 2025 — aujourd’hui", "March 2025 — present"],
    actions: [["Contenus tourisme et destination", "Valorisation de l’hébergement", "Présentation de la restauration", "Animation des communautés Facebook et Instagram"], ["Tourism and destination content", "Accommodation storytelling", "Dining promotion", "Facebook and Instagram community engagement"]],
    results: [["Gestion régulière des deux réseaux sociaux", "Le site officiel est lié mais n’a pas été conçu par Houssounaine"], ["Ongoing management of both social platforms", "The official website is linked but was not created by Houssounaine"]],
    links: [{ label: "Site", url: "https://www.shainlodge.com/" }, { label: "Facebook", url: "https://www.facebook.com/61578050621176/" }, { label: "Instagram", url: "https://www.instagram.com/shainlodge/" }]
  }
};

const root = document.documentElement;
const body = document.body;
const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
let currentLanguage = ["fr", "en"].includes(requestedLanguage) ? requestedLanguage : (localStorage.getItem("portfolio-language") || "fr");
let currentClientFilter = "current";
let currentProjectId = null;
let currentWorksFilter = "all";
let showAllWorks = false;
let currentWorkId = null;
let visibleWorks = [];
let currentRoute = "about";

const ROUTES = Object.freeze(["about", "expertise", "journey", "projects", "works", "clients", "contact"]);
const ROUTE_PATHS = Object.freeze({ about: "", expertise: "expertise", journey: "journey", projects: "projects", works: "works", clients: "clients", contact: "contact" });
const ROUTE_TITLES = Object.freeze({
  fr: { about: "À propos", expertise: "Expertises", journey: "Parcours", projects: "Projets", works: "Créations", clients: "Clients", contact: "Contact" },
  en: { about: "About", expertise: "Expertise", journey: "Journey", projects: "Projects", works: "Creative work", clients: "Clients", contact: "Contact" }
});

function localeIndex() { return currentLanguage === "fr" ? 0 : 1; }

function cleanRoutesEnabled() {
  const host = window.location.hostname;
  return window.location.protocol !== "file:"
    && host !== "localhost"
    && host !== "127.0.0.1"
    && !host.endsWith(".github.io");
}

function routeFromLocation() {
  const hashRoute = window.location.hash.match(/^#\/?([a-z-]+)/)?.[1];
  if (ROUTES.includes(hashRoute)) return hashRoute;
  if (cleanRoutesEnabled()) {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    const route = Object.keys(ROUTE_PATHS).find((key) => ROUTE_PATHS[key] === path);
    if (route) return route;
  }
  return "about";
}

function routeUrl(route) {
  if (cleanRoutesEnabled()) {
    const path = route === "about" ? "/" : `/${ROUTE_PATHS[route]}`;
    return currentLanguage === "en" ? `${path}?lang=en` : path;
  }
  return `#/${route}`;
}

function updateDocumentMetadata() {
  const label = ROUTE_TITLES[currentLanguage][currentRoute];
  const pageTitle = `${label} — Houssounaine Nourdine`;
  const routePath = currentRoute === "about" ? "/" : `/${ROUTE_PATHS[currentRoute]}`;
  const canonicalUrl = new URL(routePath, SITE_ORIGIN);
  if (currentLanguage === "en") canonicalUrl.searchParams.set("lang", "en");

  document.title = pageTitle;
  document.querySelector('link[rel="canonical"]').href = canonicalUrl.href;
  document.querySelector('meta[property="og:url"]').content = canonicalUrl.href;
  document.querySelector('meta[property="og:title"]').content = pageTitle;
  document.querySelector('meta[property="og:locale"]').content = currentLanguage === "fr" ? "fr_FR" : "en_US";
  document.querySelector('meta[name="twitter:title"]').content = pageTitle;

  const frenchUrl = new URL(routePath, SITE_ORIGIN);
  frenchUrl.searchParams.set("lang", "fr");
  const englishUrl = new URL(routePath, SITE_ORIGIN);
  englishUrl.searchParams.set("lang", "en");
  document.querySelector('link[hreflang="fr"]').href = frenchUrl.href;
  document.querySelector('link[hreflang="en"]').href = englishUrl.href;
  document.querySelector('link[hreflang="x-default"]').href = new URL(routePath, SITE_ORIGIN).href;
}

function closeMobileNavigation() {
  const sidebar = document.querySelector(".site-sidebar");
  const navToggle = document.querySelector(".nav-toggle");
  const backdrop = document.querySelector(".sidebar-backdrop");
  sidebar.classList.remove("open");
  body.classList.remove("menu-open");
  navToggle.setAttribute("aria-expanded", "false");
  backdrop.hidden = true;
}

function setRoute(route, shouldScroll = true) {
  currentRoute = ROUTES.includes(route) ? route : "about";
  body.dataset.route = currentRoute;
  const activeSections = [];

  // Animate only page sections: transforming the body also moves the fixed navigation.
  document.querySelectorAll(".site-main > [data-route]").forEach((section) => {
    section.hidden = section.dataset.route !== currentRoute;
    section.classList.remove("route-enter");
    if (!section.hidden) activeSections.push(section);
  });
  document.querySelectorAll("[data-route-link]").forEach((link) => {
    link.classList.toggle("active", link.dataset.routeLink === currentRoute);
    link.setAttribute("aria-current", link.dataset.routeLink === currentRoute ? "page" : "false");
    link.setAttribute("href", routeUrl(link.dataset.routeLink));
  });
  updateDocumentMetadata();
  trackPageView();
  closeMobileNavigation();
  if (shouldScroll) {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    const heading = activeSections[0]?.querySelector("h1, h2");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.requestAnimationFrame(() => activeSections.forEach((section) => section.classList.add("route-enter")));
  }
}

function navigateToRoute(route) {
  const url = routeUrl(route);
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== url) window.history.pushState({ route }, "", url);
  setRoute(route);
}

function setLanguage(language) {
  currentLanguage = language;
  localStorage.setItem("portfolio-language", language);
  root.lang = language;
  const description = document.querySelector('meta[name="description"]');
  description.content = language === "fr"
    ? "Portfolio de Houssounaine Nourdine, Lead Community Manager spécialisé en marketing digital, relationnel et d’influence à Toliara, Madagascar."
    : "Portfolio of Houssounaine Nourdine, Lead Community Manager specialising in digital, relationship and influencer marketing in Toliara, Madagascar.";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (translations[language][key]) element.textContent = translations[language][key];
  });

  document.querySelector(".lang-current").textContent = language.toUpperCase();
  document.querySelector(".lang-next").textContent = language === "fr" ? "EN" : "FR";
  document.querySelector(".lang-toggle").setAttribute("aria-label", language === "fr" ? "Passer le site en anglais" : "Switch website to French");
  document.querySelector(".nav-toggle").setAttribute("aria-label", language === "fr" ? "Ouvrir le menu" : "Open menu");
  document.querySelector(".sidebar-backdrop").setAttribute("aria-label", language === "fr" ? "Fermer le menu" : "Close menu");
  document.querySelectorAll(".dialog-close").forEach((button) => button.setAttribute("aria-label", language === "fr" ? "Fermer" : "Close"));
  setTheme(root.dataset.theme || "dark");
  updateDocumentMetadata();

  renderClients(currentClientFilter);
  renderWorkFilters();
  renderWorks();
  if (currentProjectId && document.querySelector("#project-dialog").open) openProject(currentProjectId);
  if (currentWorkId && document.querySelector("#work-dialog").open) updateWorkDialog();
}

function setTheme(theme) {
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#0b1220" : "#f5f7fb";
  localStorage.setItem("portfolio-theme", theme);
  document.querySelector(".theme-toggle").setAttribute("aria-label", theme === "dark"
    ? (currentLanguage === "fr" ? "Activer le mode clair" : "Enable light mode")
    : (currentLanguage === "fr" ? "Activer le mode sombre" : "Enable dark mode"));
  document.querySelector(".theme-label").textContent = theme === "dark"
    ? translations[currentLanguage].themeDark
    : translations[currentLanguage].themeLight;
}

function renderClients(filter) {
  const grid = document.querySelector("#client-grid");
  grid.replaceChildren();
  clients.filter((client) => client.status === filter).forEach((client) => {
    const card = document.createElement("article");
    card.className = "client-card";

    const logoWrap = document.createElement("span");
    logoWrap.className = "client-logo";
    const logo = document.createElement("img");
    logo.src = client.logo;
    logo.alt = `Logo ${client.name}`;
    logo.loading = "lazy";
    logo.decoding = "async";
    logoWrap.append(logo);

    const copy = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = client.name;
    const sector = document.createElement("small");
    sector.textContent = client.sector[localeIndex()];
    copy.append(name, sector);

    card.append(logoWrap, copy);
    grid.append(card);
  });
}

function renderWorkFilters() {
  const filters = document.querySelector("#works-filters");
  filters.replaceChildren();
  const options = [["all", translations[currentLanguage].allSectors], ...Object.entries(workSectors).map(([key, label]) => [key, label[localeIndex()]])];

  options.forEach(([key, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `filter-button${currentWorksFilter === key ? " active" : ""}`;
    button.dataset.workFilter = key;
    button.setAttribute("aria-pressed", String(currentWorksFilter === key));
    button.textContent = label;
    button.addEventListener("click", () => {
      currentWorksFilter = key;
      // Keep the activated button in place so keyboard focus survives filtering.
      filters.querySelectorAll("[data-work-filter]").forEach((item) => {
        const active = item.dataset.workFilter === key;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderWorks();
    });
    filters.append(button);
  });
}

function renderWorks() {
  const grid = document.querySelector("#works-grid");
  const filteredWorks = works.filter((work) => currentWorksFilter === "all" || work.category === currentWorksFilter);
  visibleWorks = showAllWorks ? filteredWorks : filteredWorks.filter((work) => work.featured);
  grid.replaceChildren();

  visibleWorks.forEach((work) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `work-card work-card--${work.format}`;
    button.dataset.workId = String(work.id);
    button.setAttribute("aria-label", `${translations[currentLanguage].openWork} — ${work.title[localeIndex()]}`);

    const image = document.createElement("img");
    image.src = work.src;
    image.alt = `${work.title[localeIndex()]} — ${work.client}`;
    image.loading = "lazy";
    image.decoding = "async";

    const overlay = document.createElement("span");
    overlay.className = "work-card-overlay";
    const meta = document.createElement("span");
    meta.className = "work-card-meta";
    meta.textContent = `${work.client} · ${workSectors[work.category][localeIndex()]}`;
    const title = document.createElement("strong");
    title.textContent = work.title[localeIndex()];
    const arrow = document.createElement("span");
    arrow.className = "work-card-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    overlay.append(meta, title, arrow);
    button.append(image, overlay);
    button.addEventListener("click", () => openWork(work.id));
    grid.append(button);
  });

  const count = document.querySelector("#works-count");
  count.textContent = currentLanguage === "fr"
    ? `${visibleWorks.length} création${visibleWorks.length > 1 ? "s" : ""} affichée${visibleWorks.length > 1 ? "s" : ""} sur ${filteredWorks.length}`
    : `${visibleWorks.length} of ${filteredWorks.length} creative work${filteredWorks.length > 1 ? "s" : ""} shown`;

  const toggle = document.querySelector("#works-toggle");
  toggle.textContent = showAllWorks ? translations[currentLanguage].worksShowSelection : translations[currentLanguage].worksViewAll;
  toggle.setAttribute("aria-expanded", String(showAllWorks));
}

function updateWorkDialog() {
  const work = works.find((item) => item.id === currentWorkId);
  if (!work) return;
  const index = localeIndex();
  const image = document.querySelector("#work-dialog-image");
  image.src = work.src;
  image.alt = `${work.title[index]} — ${work.client}`;
  document.querySelector("#work-dialog-sector").textContent = workSectors[work.category][index];
  document.querySelector("#work-dialog-title").textContent = work.title[index];
  document.querySelector("#work-dialog-description").textContent = translations[currentLanguage].workDescription;
  document.querySelector("#work-dialog-client").textContent = work.client;

  const position = Math.max(visibleWorks.findIndex((item) => item.id === currentWorkId), 0);
  document.querySelector("#work-dialog-position").textContent = `${position + 1} / ${visibleWorks.length}`;
}

function openWork(id) {
  if (!works.some((work) => work.id === id)) return;
  currentWorkId = id;
  updateWorkDialog();
  const dialog = document.querySelector("#work-dialog");
  if (!dialog.open) dialog.showModal();
  body.classList.add("dialog-open");
  trackEvent("view_creative_work", { work_id: id });
}

function stepWork(direction) {
  if (!visibleWorks.length) return;
  const currentIndex = visibleWorks.findIndex((work) => work.id === currentWorkId);
  const nextIndex = (currentIndex + direction + visibleWorks.length) % visibleWorks.length;
  currentWorkId = visibleWorks[nextIndex].id;
  updateWorkDialog();
}

function openProject(id) {
  const project = projectData[id];
  if (!project) return;
  currentProjectId = id;
  const index = localeIndex();
  document.querySelector("#dialog-type").textContent = project.type[index];
  document.querySelector("#dialog-title").textContent = project.title;
  document.querySelector("#dialog-summary").textContent = project.summary[index];
  document.querySelector("#dialog-role").textContent = project.role[index];
  document.querySelector("#dialog-period").textContent = project.period[index];

  const actions = document.querySelector("#dialog-actions");
  const results = document.querySelector("#dialog-results");
  const links = document.querySelector("#dialog-links");
  const media = document.querySelector("#dialog-media");
  actions.replaceChildren(...project.actions[index].map((item) => Object.assign(document.createElement("li"), { textContent: item })));
  results.replaceChildren(...project.results[index].map((item) => Object.assign(document.createElement("li"), { textContent: item })));
  links.replaceChildren(...project.links.map((link) => {
    const anchor = document.createElement("a");
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    const hostname = new URL(link.url).hostname;
    const network = ["facebook", "instagram", "linkedin"].find((name) => hostname === `${name}.com` || hostname.endsWith(`.${name}.com`));
    if (network) {
      const mark = document.createElement("span");
      mark.className = `brand-icon brand-icon--${network}`;
      const icon = document.createElement("img");
      icon.src = `assets/icons/${network}.svg`;
      icon.alt = "";
      icon.width = 20;
      icon.height = 20;
      mark.append(icon);
      anchor.append(mark);
    }
    const label = document.createElement("span");
    label.textContent = `${link.label} ↗`;
    anchor.append(label);
    return anchor;
  }));
  media.replaceChildren();
  media.hidden = !project.media;
  if (project.media) {
    project.media.forEach((source) => {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = source;
      image.alt = translations[currentLanguage].statsCaption;
      image.loading = "lazy";
      const caption = document.createElement("figcaption");
      caption.textContent = translations[currentLanguage].statsCaption;
      figure.append(image, caption);
      media.append(figure);
    });
  }

  const dialog = document.querySelector("#project-dialog");
  if (!dialog.open) dialog.showModal();
  body.classList.add("dialog-open");
  trackEvent("view_case_study", { project: id });
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
  body.classList.remove("dialog-open");
}

function animateCounter(element) {
  const target = Number(element.dataset.target);
  const decimals = Number(element.dataset.decimals || 0);
  const suffix = element.dataset.suffix || "";
  const duration = 1200;
  const start = performance.now();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    element.textContent = `${target.toFixed(decimals).replace(".", currentLanguage === "fr" ? "," : ".")}${suffix}`;
    return;
  }

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    element.textContent = `${value.toFixed(decimals).replace(".", currentLanguage === "fr" ? "," : ".")}${suffix}`;
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function enableAnalytics() {
  if (!GA_MEASUREMENT_ID || document.querySelector("#ga-script")) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "granted",
    security_storage: "granted"
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.id = "ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.append(script);
  trackPageView();
}

function trackEvent(name, parameters = {}) {
  if (typeof window.gtag === "function") window.gtag("event", name, parameters);
}

function trackPageView() {
  trackEvent("page_view", {
    page_title: document.title,
    page_location: window.location.href,
    page_path: `${window.location.pathname}${window.location.search}`
  });
}

function init() {
  const storedTheme = localStorage.getItem("portfolio-theme");
  const preferredTheme = storedTheme || "dark";
  setTheme(preferredTheme);
  setLanguage(currentLanguage);
  setRoute(routeFromLocation(), false);
  document.querySelector("#year").textContent = new Date().getFullYear();
  document.querySelectorAll("[data-feature]").forEach((section) => { section.hidden = !FEATURE_FLAGS[section.dataset.feature]; });
  const resumeLink = document.querySelector("#resume-link");
  if (FEATURE_FLAGS.resume && RESUME_URL) resumeLink.href = RESUME_URL;

  document.querySelector(".theme-toggle").addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));
  document.querySelector(".lang-toggle").addEventListener("click", () => {
    setLanguage(currentLanguage === "fr" ? "en" : "fr");
    if (cleanRoutesEnabled()) window.history.replaceState({ route: currentRoute }, "", routeUrl(currentRoute));
    updateDocumentMetadata();
  });

  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".site-sidebar");
  const backdrop = document.querySelector(".sidebar-backdrop");
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    body.classList.toggle("menu-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    backdrop.hidden = !open;
  });
  backdrop.addEventListener("click", closeMobileNavigation);
  window.matchMedia("(min-width: 921px)").addEventListener("change", (event) => {
    if (event.matches) closeMobileNavigation();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("open")) {
      closeMobileNavigation();
      navToggle.focus();
    }
  });

  document.querySelectorAll("[data-route-link]").forEach((link) => link.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateToRoute(link.dataset.routeLink);
  }));
  window.addEventListener("popstate", () => setRoute(routeFromLocation()));

  document.querySelectorAll("[data-project-filter], [data-client-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
  });

  window.addEventListener("scroll", () => document.querySelector(".site-header").classList.toggle("scrolled", window.scrollY > 20), { passive: true });

  const counterObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  }), { threshold: 0.65 });
  document.querySelectorAll(".counter").forEach((counter) => counterObserver.observe(counter));

  document.querySelectorAll("[data-project-filter]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-project-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    const filter = button.dataset.projectFilter;
    document.querySelectorAll(".project-card").forEach((card) => { card.hidden = filter !== "all" && card.dataset.category !== filter; });
  }));

  document.querySelectorAll(".project-open").forEach((button) => button.addEventListener("click", () => openProject(button.closest(".project-card").dataset.project)));

  document.querySelectorAll("[data-client-filter]").forEach((button) => button.addEventListener("click", () => {
    currentClientFilter = button.dataset.clientFilter;
    document.querySelectorAll("[data-client-filter]").forEach((item) => {
      item.classList.toggle("active", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    renderClients(currentClientFilter);
  }));

  document.querySelector("#works-toggle").addEventListener("click", () => {
    showAllWorks = !showAllWorks;
    renderWorks();
  });

  const projectDialog = document.querySelector("#project-dialog");
  const workDialog = document.querySelector("#work-dialog");
  const privacyDialog = document.querySelector("#privacy-dialog");
  projectDialog.querySelector(".dialog-close").addEventListener("click", () => closeDialog(projectDialog));
  workDialog.querySelector(".dialog-close").addEventListener("click", () => closeDialog(workDialog));
  privacyDialog.querySelector(".dialog-close").addEventListener("click", () => closeDialog(privacyDialog));
  privacyDialog.querySelector(".privacy-close").addEventListener("click", () => closeDialog(privacyDialog));
  document.querySelector("#work-previous").addEventListener("click", () => stepWork(-1));
  document.querySelector("#work-next").addEventListener("click", () => stepWork(1));
  document.querySelector(".privacy-link").addEventListener("click", (event) => {
    event.preventDefault();
    privacyDialog.showModal();
    body.classList.add("dialog-open");
  });
  [projectDialog, workDialog, privacyDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    });
    dialog.addEventListener("close", () => body.classList.remove("dialog-open"));
  });

  document.addEventListener("keydown", (event) => {
    if (!workDialog.open) return;
    if (event.key === "ArrowLeft") stepWork(-1);
    if (event.key === "ArrowRight") stepWork(1);
  });

  document.querySelector("#contact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const subject = `[Portfolio] ${data.get("type")} — ${data.get("subject")}`;
    const message = `${currentLanguage === "fr" ? "Nom" : "Name"}: ${data.get("name")}\n${currentLanguage === "fr" ? "E-mail" : "Email"}: ${data.get("email")}\n${currentLanguage === "fr" ? "Type de demande" : "Request type"}: ${data.get("type")}\n\n${data.get("message")}`;
    document.querySelector("#form-status").textContent = translations[currentLanguage].formReady;
    trackEvent("contact_form_prepare", { request_type: String(data.get("type")) });
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
  });

  document.querySelectorAll('a[href^="https://wa.me/"]').forEach((link) => link.addEventListener("click", () => trackEvent("click_whatsapp")));
  document.querySelectorAll('a[href^="mailto:"]').forEach((link) => link.addEventListener("click", () => trackEvent("click_email")));
  document.querySelectorAll('a[href*="linkedin.com"]').forEach((link) => link.addEventListener("click", () => trackEvent("click_social", { network: "linkedin" })));
  document.querySelectorAll('a[href*="facebook.com"]').forEach((link) => link.addEventListener("click", () => trackEvent("click_social", { network: "facebook" })));
  document.querySelectorAll('a[href*="instagram.com"]').forEach((link) => link.addEventListener("click", () => trackEvent("click_social", { network: "instagram" })));

  const cookieBanner = document.querySelector("#cookie-banner");
  const consent = localStorage.getItem("portfolio-cookie-consent");
  if (!consent) cookieBanner.hidden = false;
  if (consent === "accepted") enableAnalytics();
  cookieBanner.querySelectorAll("[data-cookie]").forEach((button) => button.addEventListener("click", () => {
    const accepted = button.dataset.cookie === "accept";
    localStorage.setItem("portfolio-cookie-consent", accepted ? "accepted" : "rejected");
    cookieBanner.hidden = true;
    if (accepted) enableAnalytics();
  }));
}

document.addEventListener("DOMContentLoaded", init);
