#!/usr/bin/env node
/* Génère les pages projet statiques (/projets/<id>/), le sitemap et les images de partage.
   Les contenus viennent de v2/data.js : relancer ce script après toute modification des études de cas.
     node scripts/build-pages.mjs            → pages + sitemap
     node scripts/build-pages.mjs --images   → pages + sitemap + images de partage (Playwright requis) */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://houssounainenourdine.vercel.app";
const TODAY = new Date().toISOString().slice(0, 10);

/* Chargement des données partagées. */
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(`${readFileSync(join(ROOT, "v2/data.js"), "utf8")}
  this.data = { translations, clients, works, workSectors, projectData, caseCards };`, sandbox);
const { translations, works, projectData, caseCards } = sandbox.data;

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
const T = (lang, key) => translations[lang][key] ?? key;
const pick = (pair, lang) => (Array.isArray(pair) ? pair[lang === "fr" ? 0 : 1] : pair);

/* Créations liées à chaque projet (même marque). */
const CLIENT_MATCH = {
  sfcb: null, raiky: "Raiky", tfc: "Tulear Fitness", univpass: "Univpass", "le-jardin": "Le Jardin", "indian-basket": "Indian Basket",
  homeopharma: "Homeopharma", "total-tools": "Total Tools", wedis: "WEDIS", shain: "Shain Lodge"
};
const relatedWorks = (id) => {
  const needle = CLIENT_MATCH[id];
  return needle ? works.filter((work) => work.client.startsWith(needle)).slice(0, 8) : [];
};

const UI = {
  fr: {
    back: "Retour au portfolio", role: "Mon rôle", period: "Période", actions: "Actions principales", results: "Résultats et faits marquants",
    links: "Liens officiels", works: "Créations réalisées", others: "Autres études de cas", cta: "Un projet similaire ?", ctaText: "Parlons de votre marque : stratégie, contenus, communauté et résultats mesurables.",
    whatsapp: "Écrire sur WhatsApp", email: "Envoyer un e-mail", share: "Partager", copied: "Lien copié ✓", caseOf: "Étude de cas", lang: "EN", langLabel: "Read in English",
    message: (title) => `Bonjour Houssounaine, j’ai lu l’étude de cas « ${title} » sur votre portfolio et j’aimerais échanger sur un projet similaire.`
  },
  en: {
    back: "Back to portfolio", role: "My role", period: "Period", actions: "Main actions", results: "Results and highlights",
    links: "Official links", works: "Creative work produced", others: "Other case studies", cta: "A similar project?", ctaText: "Let’s talk about your brand: strategy, content, community and measurable results.",
    whatsapp: "Message on WhatsApp", email: "Send an email", share: "Share", copied: "Link copied ✓", caseOf: "Case study", lang: "FR", langLabel: "Lire en français",
    message: (title) => `Hello Houssounaine, I read the “${title}” case study on your portfolio and would like to discuss a similar project.`
  }
};

const ICONS = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
    <symbol id="i-facebook" viewBox="0 0 24 24"><path fill="currentColor" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"/></symbol>
    <symbol id="i-instagram" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><circle cx="12" cy="12" r="4.3"/></g><circle cx="17.6" cy="6.4" r="1.3" fill="currentColor"/></symbol>
    <symbol id="i-linkedin" viewBox="0 0 24 24"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></symbol>
    <symbol id="i-whatsapp" viewBox="0 0 32 32"><path fill="currentColor" d="M16 3a12.7 12.7 0 0 0-11 19.1L3.3 28.7l6.8-1.8A12.8 12.8 0 1 0 16 3Zm0 23.2c-2 0-3.9-.5-5.5-1.5l-.4-.2-4 1 1.1-3.9-.2-.4a10.3 10.3 0 1 1 9 5Zm5.7-7.7c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.8-.9-3-1.6-4.2-3.7-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 3s1.3 3.5 1.5 3.8c.2.2 2.6 4 6.4 5.6.9.4 1.6.6 2.1.8.9.3 1.7.2 2.4.1.7-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.2-.3-.2-.6-.4Z"/></symbol>
    <symbol id="i-mail" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="3"/><path d="m3.5 7 8.5 6 8.5-6"/></g></symbol>
    <symbol id="i-globe" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 3.9 6 3.9 9.5S14.6 18.7 12 21.5M12 2.5C9.4 5.3 8.1 8.5 8.1 12s1.3 6.7 3.9 9.5"/></g></symbol>
    <symbol id="i-arrow" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></symbol>
    <symbol id="i-back" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M11 6l-6 6 6 6"/></symbol>
    <symbol id="i-send" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M21.5 2.5 10 14M21.5 2.5 14.5 21.5 10 14 2.5 9.5Z"/></symbol>
  </svg>`;

const linkIcon = (label) => ({ facebook: "facebook", instagram: "instagram", linkedin: "linkedin", whatsapp: "whatsapp" })[label.toLowerCase()] || "globe";

function casePage(id) {
  const project = projectData[id];
  const card = caseCards.find((item) => item.id === id);
  const fr = UI.fr;
  const path = `/projets/${id}`;
  const description = `${project.summary[0]} — ${project.role[0]}`.slice(0, 300);
  const others = caseCards.filter((item) => item.id !== id);
  const related = relatedWorks(id);
  const proof = card.proofIcons
    ? `<span class="proof-icons">${card.proofIcons.map((name) => `<svg class="brand brand-${name}" aria-hidden="true"><use href="#i-${name}"/></svg>`).join("")}</span>`
    : esc(card.proof);
  /* Les contenus FR et EN sont tous deux présents ; la langue active est choisie au chargement. */
  const bilingual = (pair, tag = "span", attrs = "") => `<${tag} ${attrs} data-fr="${esc(pick(pair, "fr"))}" data-en="${esc(pick(pair, "en"))}">${esc(pick(pair, "fr"))}</${tag}>`;
  const ui = (key) => `<span data-ui="${key}">${esc(fr[key])}</span>`;
  const list = (pairs) => pairs[0].map((_, index) => `<li data-fr="${esc(pairs[0][index])}" data-en="${esc(pairs[1][index] ?? pairs[0][index])}">${esc(pairs[0][index])}</li>`).join("");
  const json = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: `${project.title} — Étude de cas`,
    headline: project.title,
    description: project.summary[0],
    url: `${SITE}${path}`,
    image: `${SITE}/assets/og/${id}.jpg`,
    inLanguage: ["fr", "en"],
    author: { "@type": "Person", name: "Houssounaine Nourdine", jobTitle: "Lead Community Manager", url: `${SITE}/` },
    about: project.type[0]
  };
  return `<!doctype html>
<html lang="fr" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#050b14">
  <title>${esc(project.title)} — Étude de cas · Houssounaine Nourdine</title>
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="Houssounaine Nourdine">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${SITE}${path}">
  <link rel="alternate" hreflang="fr" href="${SITE}${path}?lang=fr">
  <link rel="alternate" hreflang="en" href="${SITE}${path}?lang=en">
  <link rel="alternate" hreflang="x-default" href="${SITE}${path}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="og:site_name" content="Houssounaine Nourdine — Portfolio">
  <meta property="og:url" content="${SITE}${path}">
  <meta property="og:title" content="${esc(project.title)} — Étude de cas">
  <meta property="og:description" content="${esc(project.summary[0])}">
  <meta property="og:image" content="${SITE}/assets/og/${id}.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(project.title)} — étude de cas de Houssounaine Nourdine">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(project.title)} — Étude de cas">
  <meta name="twitter:description" content="${esc(project.summary[0])}">
  <meta name="twitter:image" content="${SITE}/assets/og/${id}.jpg">
  <link rel="icon" href="/assets/profile.webp" type="image/webp">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,500..900;1,800..900&family=Kaushan+Script&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/v2/v2.css">
  <link rel="stylesheet" href="/v2/case.css">
  <script type="application/ld+json">${JSON.stringify(json)}</script>
  <script>
    (function () {
      try { document.documentElement.dataset.theme = localStorage.getItem("v2-theme") === "light" ? "light" : "dark"; } catch (error) { /* stockage indisponible */ }
      document.documentElement.classList.add("js");
    })();
  </script>
</head>
<body class="case-page" data-case="${esc(id)}">
${ICONS}
  <header class="case-bar">
    <a class="case-back" href="/#projets"><svg aria-hidden="true"><use href="#i-back"/></svg>${ui("back")}</a>
    <a class="chip" href="?lang=en" data-lang-switch aria-label="${esc(fr.langLabel)}">${esc(fr.lang)}</a>
  </header>

  <main id="main">
    <section class="case-hero">
      <div class="case-hero-copy">
        <p class="label"><i>${esc(fr.caseOf)}</i>${bilingual(project.type)}</p>
        <h1>${esc(project.title)}</h1>
        ${bilingual(project.summary, "p", 'class="case-lead"')}
      </div>
      <div class="case-proof-card">
        <img src="/${esc(card.logo)}" alt="" width="96" height="96">
        <strong>${proof}</strong>
        ${bilingual([T("fr", card.proofKey), T("en", card.proofKey)], "span")}
      </div>
    </section>

    <section class="case-body">
      <dl class="case-facts">
        <div><dt>${ui("role")}</dt>${bilingual(project.role, "dd")}</div>
        <div><dt>${ui("period")}</dt>${bilingual(project.period, "dd")}</div>
      </dl>
      <div class="case-cols">
        <section><h2>${ui("actions")}</h2><ul>${list(project.actions)}</ul></section>
        <section><h2>${ui("results")}</h2><ul class="results">${list(project.results)}</ul></section>
      </div>
      ${project.media ? `<div class="case-media">${project.media.map((source) => `<figure><img src="/${esc(source)}" alt="${esc(T("fr", "statsCaption"))}" loading="lazy">${bilingual([T("fr", "statsCaption"), T("en", "statsCaption")], "figcaption")}</figure>`).join("")}</div>` : ""}
      ${related.length ? `<section class="case-works"><h2>${ui("works")}</h2><div class="case-works-grid">${related.map((work) => `<figure><img src="/${esc(work.src)}" alt="${esc(`${work.title[0]} — ${work.client}`)}" loading="lazy">${bilingual(work.title, "figcaption")}</figure>`).join("")}</div></section>` : ""}
      ${project.links.length ? `<section><h2>${ui("links")}</h2><div class="case-links">${project.links.map((link) => `<a class="social-link social-${linkIcon(link.label)}" href="${esc(link.url)}" target="_blank" rel="noopener noreferrer"><svg class="ico" aria-hidden="true"><use href="#i-${linkIcon(link.label)}"/></svg><span>${esc(link.label)}</span><i aria-hidden="true">↗</i></a>`).join("")}</div></section>` : ""}
    </section>

    <section class="case-cta">
      <h2>${ui("cta")}</h2>
      <p>${ui("ctaText")}</p>
      <div class="case-cta-actions">
        <a class="btn btn-solid btn-pill" data-wa href="https://wa.me/261344886137?text=${encodeURIComponent(fr.message(project.title))}" target="_blank" rel="noopener noreferrer">${ui("whatsapp")}<span class="btn-arrow" aria-hidden="true"><svg><use href="#i-whatsapp"/></svg></span></a>
        <a class="btn btn-line" href="mailto:houssounainen@gmail.com?subject=${encodeURIComponent(`[Portfolio] ${project.title}`)}"><svg class="ico" aria-hidden="true"><use href="#i-mail"/></svg>${ui("email")}</a>
        <button class="btn btn-line" type="button" data-share><svg class="ico" aria-hidden="true"><use href="#i-send"/></svg>${ui("share")}</button>
      </div>
    </section>

    <nav class="case-others" aria-label="${esc(fr.others)}">
      <h2>${ui("others")}</h2>
      <div class="case-others-grid">${others.map((item) => `<a href="/projets/${esc(item.id)}"><img src="/${esc(item.logo)}" alt="" width="48" height="48" loading="lazy"><strong>${esc(projectData[item.id].title)}</strong>${bilingual([T("fr", item.summary), T("en", item.summary)], "span")}</a>`).join("")}</div>
    </nav>
  </main>

  <footer class="case-foot"><a href="/">Houssounaine Nourdine</a> · Lead Community Manager · Toliara</footer>
  <div class="toast" role="status" aria-live="polite" data-toast></div>
  <script>window.CASE_UI = ${JSON.stringify(Object.fromEntries(Object.entries(UI).map(([lang, values]) => [lang, { ...values, message: values.message(project.title) }])))};</script>
  <script src="/v2/case.js" defer></script>
</body>
</html>
`;
}

function sitemap() {
  const urls = [{ loc: "/", priority: "1.0" }, ...caseCards.map((item) => ({ loc: `/projets/${item.id}`, priority: "0.8" }))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map(({ loc, priority }) => `  <url>
    <loc>${SITE}${loc}</loc>
    <xhtml:link rel="alternate" hreflang="fr" href="${SITE}${loc}?lang=fr"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${loc}?lang=en"/>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`).join("\n")}
</urlset>
`;
}

/* ---------- Images de partage (1200×630) ---------- */
function ogHTML({ kicker, title, subtitle, proof, proofLabel, logo, portrait }) {
  const font = "https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;800;900&family=Kaushan+Script&display=swap";
  return `<!doctype html><html><head><meta charset="utf-8"><link href="${font}" rel="stylesheet"><style>
    *{box-sizing:border-box;margin:0}
    body{width:1200px;height:630px;overflow:hidden;font-family:Montserrat,sans-serif;color:#eaf4ff;
      background:radial-gradient(55% 70% at 8% 10%,rgba(34,197,94,.35),transparent 70%),radial-gradient(50% 70% at 95% 90%,rgba(56,189,248,.35),transparent 70%),#050b14;position:relative}
    body::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,rgba(255,255,255,.035) 0 16px,transparent 16px 34px)}
    .top{position:absolute;left:64px;right:64px;top:40px;display:flex;justify-content:space-between;padding-bottom:14px;border-bottom:2px solid rgba(244,63,94,.6);font:800 15px Montserrat;letter-spacing:.28em;color:#8ea1b7}
    .top b{color:#f43f5e;letter-spacing:.1em}
    .copy{position:absolute;left:64px;top:118px;width:${portrait ? 680 : 760}px}
    .kicker{display:inline-block;padding:7px 16px;border-radius:999px;background:#f43f5e;color:#fff;font:800 16px Montserrat;letter-spacing:.12em;text-transform:uppercase}
    h1{margin:22px 0 16px;font:900 ${title.length > 22 ? 64 : 82}px/0.98 Montserrat;letter-spacing:-.04em}
    h1 span{background:linear-gradient(100deg,#22c55e,#38bdf8);-webkit-background-clip:text;background-clip:text;color:transparent}
    p{font:600 23px/1.4 Montserrat;color:#c7d4e3;max-width:640px}
    .proof{position:absolute;left:64px;bottom:52px;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;max-width:${portrait ? 680 : 640}px}
    .proof strong{font:900 ${proof && proof.length > 9 ? 44 : 64}px/1 Montserrat;letter-spacing:-.04em;background:linear-gradient(100deg,#22c55e,#38bdf8);-webkit-background-clip:text;background-clip:text;color:transparent}
    .proof span{font:700 22px Montserrat;color:#eaf4ff}
    .card{position:absolute;right:64px;top:118px;width:360px;height:420px;border-radius:32px;overflow:hidden;
      background:repeating-linear-gradient(135deg,rgba(255,255,255,.12) 0 16px,transparent 16px 34px),linear-gradient(140deg,#22c55e,#38bdf8);box-shadow:0 40px 80px rgba(0,0,0,.45);display:grid;place-items:center}
    .card img.logo{width:200px;height:200px;border-radius:50%;object-fit:cover;background:#fff;border:8px solid rgba(255,255,255,.85);box-shadow:0 20px 50px rgba(0,0,0,.3)}
    .card img.portrait{position:absolute;bottom:0;width:100%;height:100%;object-fit:cover;object-position:top}
    .sig{position:absolute;right:76px;bottom:44px;font:400 30px 'Kaushan Script',cursive;color:#38bdf8;transform:rotate(-4deg)}
  </style></head><body>
    <div class="top"><span>HOUSSOUNAINE · PORTFOLIO 2026</span><b>houssounainenourdine.vercel.app</b></div>
    <div class="copy"><span class="kicker">${esc(kicker)}</span><h1>${title}</h1><p>${esc(subtitle)}</p></div>
    ${proof ? `<div class="proof"><strong>${esc(proof)}</strong><span>${esc(proofLabel)}</span></div>` : ""}
    <div class="card">${portrait ? `<img class="portrait" src="${portrait}">` : `<img class="logo" src="${logo}">`}</div>
    ${portrait ? "" : `<div class="sig">Houssounaine Nourdine</div>`}
  </body></html>`;
}

async function buildImages() {
  let chromium;
  try {
    ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright"));
  } catch (error) {
    console.warn("Playwright introuvable : images de partage non générées (définir PLAYWRIGHT_MODULE).");
    return;
  }
  const outDir = join(ROOT, "assets/og");
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  const fileUrl = (path) => `file://${join(ROOT, path)}`;
  const jobs = [
    { out: join(ROOT, "assets/og.jpg"), html: ogHTML({
      kicker: "Lead Community Manager", title: "Houssounaine <span>Nourdine.</span>",
      subtitle: "Stratégie social media, communautés engagées et résultats mesurables · Toliara, Madagascar.",
      proof: "271 K+", proofLabel: "abonnés · 100,4 M de vues en 2026", portrait: fileUrl("assets/portrait-hero-cutout.webp")
    }) },
    ...caseCards.map((card) => {
      const project = projectData[card.id];
      const proof = card.proofIcons ? card.proofIcons.map((name) => ({ facebook: "Facebook", instagram: "Instagram" })[name]).join(" + ") : card.proof;
      return { out: join(outDir, `${card.id}.jpg`), html: ogHTML({
        kicker: `Étude de cas · ${project.type[0]}`, title: esc(project.title).replace(/(\S+)$/u, "<span>$1</span>"),
        subtitle: project.summary[0], proof, proofLabel: T("fr", card.proofKey), logo: fileUrl(card.logo)
      }) };
    })
  ];
  for (const job of jobs) {
    const tmp = join(ROOT, "assets/og/.render.html");
    writeFileSync(tmp, job.html);
    await page.goto(`file://${tmp}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: job.out, type: "jpeg", quality: 88 });
  }
  await browser.close();
  (await import("node:fs")).rmSync(join(outDir, ".render.html"), { force: true });
  console.log(`${jobs.length} images de partage générées.`);
}

for (const card of caseCards) {
  const dir = join(ROOT, "projets", card.id);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), casePage(card.id));
}
writeFileSync(join(ROOT, "sitemap.xml"), sitemap());
console.log(`${caseCards.length} pages projet et sitemap générés.`);
if (process.argv.includes("--images")) await buildImages();
