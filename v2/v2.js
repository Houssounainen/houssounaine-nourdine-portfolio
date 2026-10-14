"use strict";

/* Houssounaine Nourdine — Édition 2026 (V2). Les contenus proviennent de data.js (identiques à la version principale). */
(() => {
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => reducedQuery.matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const EMAIL = "houssounainen@gmail.com";
  const GA_MEASUREMENT_ID = "G-1LL57GXLVY";
  const CONSENT_KEY = "portfolio-cookie-consent";
  /* Sources vidéo : WebM (VP9) puis MP4 (H.264) pour couvrir tous les navigateurs. */
  const setVideoSources = (video, paths) => {
    video.replaceChildren(...paths.map((path) => Object.assign(document.createElement("source"), {
      src: asset(path), type: path.endsWith(".webm") ? "video/webm" : "video/mp4"
    })));
    video.load();
  };
  const asset = (path) => `/${path.replace(/^\/+/, "")}`;

  const store = {
    get(key) { try { return localStorage.getItem(key); } catch (error) { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch (error) { /* stockage indisponible */ } }
  };

  /* Textes propres à la mise en page V2 (les contenus restent ceux de data.js). */
  const extra = {
    fr: {
      edition: "Édition", values: "Valeurs", localTime: "heure locale", sinceText: "au service des communautés",
      assocOpen: "Ouvrir l’espace AEDBVT", copyHint: "Cliquer pour copier", copied: "Adresse e-mail copiée ✓",
      classic: "Version classique", backTop: "Haut de page ↑", cookieSettings: "Gérer les cookies",
      cursorView: "Voir", cursorOpen: "Ouvrir", worksShown: (shown, total) => `${shown} / ${total} créations`,
      themeToDark: "Activer le mode sombre", themeToLight: "Activer le mode clair", langLabel: "Passer le site en anglais",
      thanks: "Merci !", thanksScan: "Scannez pour partager mon portfolio", follow: "Suivez-moi", rights: "Tous droits réservés.",
      dockLabel: "Raccourcis vers les sections",
      casePage: "Voir la page du projet", share: "Partager", linkCopied: "Lien copié ✓",
      videoDescription: "Film de présentation en motion design, conçu pour raconter l’offre et l’équipe de la marque.", videoRole: "Motion design & montage", cursorPlay: "Lire", videoBadge: "Vidéo",
      ticker: ["<b>271 K+</b> abonnés Facebook", "<b>100,4 M</b> vues en 2026", "<b>24</b> pages clientes supervisées", "<b>51</b> affiches conçues", "<b>21</b> marques accompagnées", "Master en Gestion <b>2026</b>"]
    },
    en: {
      edition: "Edition", values: "Values", localTime: "local time", sinceText: "serving communities",
      assocOpen: "Open the AEDBVT space", copyHint: "Click to copy", copied: "Email address copied ✓",
      classic: "Classic version", backTop: "Back to top ↑", cookieSettings: "Manage cookies",
      cursorView: "View", cursorOpen: "Open", worksShown: (shown, total) => `${shown} / ${total} creative works`,
      themeToDark: "Enable dark mode", themeToLight: "Enable light mode", langLabel: "Switch website to French",
      thanks: "Thank you!", thanksScan: "Scan to share my portfolio", follow: "Follow me", rights: "All rights reserved.",
      dockLabel: "Section shortcuts",
      casePage: "Open the project page", share: "Share", linkCopied: "Link copied ✓",
      videoDescription: "Motion design brand film, made to tell the story of the brand’s offer and team.", videoRole: "Motion design & editing", cursorPlay: "Play", videoBadge: "Video",
      ticker: ["<b>271 K+</b> Facebook followers", "<b>100.4 M</b> views in 2026", "<b>24</b> client pages supervised", "<b>51</b> posters designed", "<b>21</b> brands supported", "Master’s in Management <b>2026</b>"]
    }
  };

  /* Cartes projets : définies dans data.js (partagées avec les pages projet). */
  const cases = caseCards;

  const state = {
    lang: (() => {
      const requested = new URLSearchParams(window.location.search).get("lang");
      if (["fr", "en"].includes(requested)) return requested;
      return store.get("portfolio-language") === "en" ? "en" : "fr";
    })(),
    projectFilter: "all", clientFilter: "current", worksFilter: "all", allWorks: false, visibleWorks: [], workId: null
  };
  /* Icônes (symboles SVG déclarés dans index.html). */
  const BRANDS = { facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn", whatsapp: "WhatsApp", globe: "Site" };
  const icon = (name, className = "ico") => `<svg class="${className} ${className}-${name}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const iconFor = (label) => ({ facebook: "facebook", instagram: "instagram", linkedin: "linkedin", whatsapp: "whatsapp" })[label.toLowerCase()] || "globe";
  const T = (key) => translations[state.lang][key] ?? extra[state.lang][key] ?? "";
  const idx = () => (state.lang === "fr" ? 0 : 1);

  /* ---------- Langue ---------- */
  function applyLanguage() {
    root.lang = state.lang;
    window.setTimeout(() => document.dispatchEvent(new CustomEvent("hn:lang", { detail: state.lang })), 0);
    $$("[data-i18n]").forEach((element) => {
      const value = translations[state.lang][element.dataset.i18n];
      if (value) element.textContent = value;
    });
    $$("[data-x]").forEach((element) => {
      const value = extra[state.lang][element.dataset.x];
      if (typeof value === "string") element.textContent = value;
    });
    $(".lang-now").textContent = state.lang.toUpperCase();
    $(".lang-alt").textContent = state.lang === "fr" ? "EN" : "FR";
    $("[data-lang-toggle]").setAttribute("aria-label", T("langLabel"));
    $$("[data-close]").forEach((button) => button.setAttribute("aria-label", T("close")));
    updateThemeLabel();
    $(".dock").setAttribute("aria-label", T("dockLabel"));
    renderTicker();
    renderCases();
    renderWorkFilters();
    renderWorks();
    renderClients();
    splitWords();
    rotatorIndex = 0;
    const rotator = $(".rotator-word");
    if (rotator) rotator.textContent = T(rotator.dataset.rotate.split(",")[0]);
    $$(".count").forEach((counter) => { if (counter.dataset.done) counter.textContent = formatCount(counter, 1); });
    if (state.workId && $("[data-lightbox]").open) updateLightbox();
    if ($("[data-case-modal]").open && state.caseId) fillCase(state.caseId);
    tickClock();
  }

  /* ---------- Thème ---------- */
  function updateThemeLabel() {
    $("[data-theme-toggle]").setAttribute("aria-label", root.dataset.theme === "dark" ? T("themeToLight") : T("themeToDark"));
    $('meta[name="theme-color"]').content = root.dataset.theme === "dark" ? "#050b14" : "#eef6f3";
  }
  function toggleTheme(event) {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const apply = () => { root.dataset.theme = next; store.set("v2-theme", next); updateThemeLabel(); };
    if (typeof document.startViewTransition !== "function" || reduced()) { apply(); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate({ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(.65,0,.35,1)", pseudoElement: "::view-transition-new(root)" });
    }).catch(() => {});
  }

  /* ---------- Horloge de Toliara ---------- */
  let clockFormatter = null;
  function tickClock() {
    try {
      clockFormatter = new Intl.DateTimeFormat(state.lang === "fr" ? "fr-FR" : "en-GB", { timeZone: "Indian/Antananarivo", hour: "2-digit", minute: "2-digit" });
    } catch (error) { return; }
    const time = clockFormatter.format(new Date());
    $$("[data-clock]").forEach((element) => { element.textContent = `Toliara ${time}`; });
    $$("[data-clock-big]").forEach((element) => { element.textContent = time; });
  }

  /* ---------- Typographie cinétique ---------- */
  /* Ajuste la taille du nom pour qu'il occupe exactement la largeur disponible. */
  function fitText(element, lines, available) {
    if (!element) return;
    element.style.removeProperty("--fit");
    const widest = Math.max(...lines.map((line) => line.scrollWidth));
    if (!available || !widest) return;
    const size = parseFloat(getComputedStyle(element).fontSize) * (available / widest) * .985;
    element.style.setProperty("--fit", `${Math.min(size, 260).toFixed(1)}px`);
  }
  function fitTitle() {
    const title = $(".hero-title");
    if (title) fitText(title, $$(".line", title), title.clientWidth);
    const giant = $(".foot-giant");
    if (giant) fitText(giant, [giant], giant.parentElement.clientWidth - parseFloat(getComputedStyle(giant.parentElement).paddingLeft) * 2);
  }
  function splitChars() {
    $$("[data-split]").forEach((element, groupIndex) => {
      const text = element.textContent;
      element.textContent = "";
      Array.from(text).forEach((char, index) => {
        const span = document.createElement("span");
        span.className = "char";
        span.textContent = char;
        span.style.setProperty("--i", String(index + groupIndex * 6));
        span.style.setProperty("--p", (index / Math.max(text.length - 1, 1)).toFixed(3));
        element.append(span);
      });
    });
  }
  function splitWords() {
    $$(".reveal-words").forEach((element) => {
      const words = element.textContent.trim().split(/\s+/);
      element.setAttribute("aria-label", element.textContent.trim());
      element.textContent = "";
      words.forEach((word, index) => {
        const wrap = document.createElement("span");
        wrap.className = "w";
        wrap.setAttribute("aria-hidden", "true");
        const inner = document.createElement("span");
        inner.textContent = word;
        inner.style.setProperty("--i", String(index));
        const gradientFrom = words.length - Math.max(1, Math.round(words.length / 3));
        if (index >= gradientFrom) {
          inner.className = "grad";
          inner.style.setProperty("--p", ((index - gradientFrom) / Math.max(words.length - 1 - gradientFrom, 1)).toFixed(3));
        }
        wrap.append(inner);
        element.append(wrap, document.createTextNode(" "));
      });
    });
  }
  let rotatorIndex = 0;
  function startRotator() {
    const element = $(".rotator-word");
    if (!element) return;
    window.setInterval(() => {
      if (document.hidden) return;
      const keys = element.dataset.rotate.split(",");
      rotatorIndex = (rotatorIndex + 1) % keys.length;
      const swap = () => { element.textContent = T(keys[rotatorIndex]); element.classList.remove("out"); element.classList.add("in"); };
      if (reduced()) { swap(); return; }
      element.classList.remove("in");
      element.classList.add("out");
      window.setTimeout(swap, 420);
    }, 2600);
  }
  function renderTicker() {
    const track = $("[data-ticker]");
    if (!track) return;
    const group = () => {
      const wrap = document.createElement("div");
      wrap.className = "ticker-group";
      extra[state.lang].ticker.forEach((item) => {
        const span = document.createElement("span");
        span.className = "ticker-item";
        span.innerHTML = item;
        wrap.append(span);
      });
      return wrap;
    };
    track.replaceChildren(group(), group());
  }

  /* ---------- Compteurs ---------- */
  function formatCount(element, ratio) {
    const target = Number(element.dataset.target);
    const decimals = Number(element.dataset.decimals || 0);
    const value = (target * ratio).toFixed(decimals);
    return `${state.lang === "fr" ? value.replace(".", ",") : value}${element.dataset.suffix || ""}`;
  }
  function runCount(element) {
    element.dataset.done = "1";
    if (reduced()) { element.textContent = formatCount(element, 1); return; }
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / 1600, 1);
      element.textContent = formatCount(element, 1 - Math.pow(1 - progress, 4));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  /* ---------- Projets ---------- */
  function renderCases() {
    const grid = $("[data-cases]");
    grid.replaceChildren();
    cases.forEach((item, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `case reveal${item.featured ? " case-featured" : ""}`;
      card.dataset.case = item.id;
      card.dataset.category = item.category;
      card.dataset.cursor = "open";
      card.style.setProperty("--d", String(index % 3));
      card.hidden = state.projectFilter !== "all" && item.category !== state.projectFilter;
      const project = projectData[item.id];
      card.innerHTML = `
        <span class="case-top"><img alt="" loading="lazy" width="54" height="54"><span class="case-type"></span></span>
        <span class="case-copy"><h3></h3><p></p></span>
        <span class="case-proof"><strong></strong><span></span></span>
        <span class="case-more" aria-hidden="true">↗</span>`;
      $("img", card).src = asset(item.logo);
      $(".case-type", card).textContent = item.typeText || T(item.type);
      $("h3", card).textContent = project.title;
      $(".case-copy p", card).textContent = T(item.summary);
      const proof = $(".case-proof strong", card);
      if (item.proofIcons) {
        proof.className = "proof-icons";
        proof.innerHTML = item.proofIcons.map((name) => icon(name, "brand")).join("");
        proof.setAttribute("aria-label", item.proofIcons.map((name) => BRANDS[name]).join(" + "));
        proof.setAttribute("role", "img");
      } else proof.textContent = item.proof;
      $(".case-proof span", card).textContent = T(item.proofKey);
      card.setAttribute("aria-label", `${T("viewCase")} — ${project.title}`);
      card.addEventListener("click", () => openCase(item.id, card));
      grid.append(card);
    });
    observeReveals(grid);
  }
  function fillCase(id) {
    const project = projectData[id];
    const i = idx();
    const modal = $("[data-case-modal]");
    $("[data-case-type]", modal).textContent = project.type[i];
    $("[data-case-title]", modal).textContent = project.title;
    $("[data-case-summary]", modal).textContent = project.summary[i];
    $("[data-case-role]", modal).textContent = project.role[i];
    $("[data-case-period]", modal).textContent = project.period[i];
    const list = (items) => items.map((text) => Object.assign(document.createElement("li"), { textContent: text }));
    $("[data-case-actions]", modal).replaceChildren(...list(project.actions[i]));
    $("[data-case-results]", modal).replaceChildren(...list(project.results[i]));
    $("[data-case-links]", modal).replaceChildren(...project.links.map((link) => {
      const anchor = Object.assign(document.createElement("a"), { href: link.url, target: "_blank", rel: "noopener noreferrer" });
      anchor.className = `social-link social-${iconFor(link.label)}`;
      anchor.innerHTML = `${icon(iconFor(link.label))}<span></span><i aria-hidden="true">↗</i>`;
      $("span", anchor).textContent = link.label;
      return anchor;
    }));
    const page = $("[data-case-page]", modal);
    page.href = `/projets/${id}${state.lang === "en" ? "?lang=en" : ""}`;
    $("[data-case-page-label]", modal).textContent = T("casePage");
    $("[data-case-share-label]", modal).textContent = T("share");
    const media = $("[data-case-media]", modal);
    media.hidden = !project.media;
    media.replaceChildren(...(project.media || []).map((source) => {
      const figure = document.createElement("figure");
      const image = Object.assign(document.createElement("img"), { src: asset(source), alt: T("statsCaption"), loading: "lazy" });
      figure.append(image, Object.assign(document.createElement("figcaption"), { textContent: T("statsCaption") }));
      return figure;
    }));
  }
  /* La carte cliquée s'agrandit jusqu'à devenir la fenêtre de l'étude de cas (et s'y referme). */
  let caseOrigin = null;
  function flip(dialog, from, reverse = false) {
    const target = dialog.getBoundingClientRect();
    const origin = from.getBoundingClientRect();
    if (!target.width || !origin.width) return null;
    const start = {
      transform: `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${origin.width / target.width}, ${origin.height / target.height})`,
      borderRadius: "22px", opacity: 1
    };
    const end = { transform: "none", borderRadius: "28px", opacity: 1 };
    const frames = reverse ? [end, { ...start, opacity: .4 }] : [start, end];
    const animation = dialog.animate(frames, { duration: reverse ? 420 : 620, easing: "cubic-bezier(.16,1,.3,1)", fill: "both" });
    $$(":scope > *", dialog).forEach((child, index) => child.animate(
      reverse ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, translate: "0 18px" }, { opacity: 1, translate: "0 0" }],
      { duration: reverse ? 160 : 420, delay: reverse ? 0 : 220 + Math.min(index, 6) * 35, easing: "ease-out", fill: "both" }
    ));
    return animation;
  }
  function openCase(id, origin = null) {
    if (!projectData[id]) return;
    state.caseId = id;
    fillCase(id);
    track("view_case_study", { project: id });
    const dialog = $("[data-case-modal]");
    caseOrigin = origin;
    dialog.classList.toggle("flip", Boolean(origin) && !reduced());
    openModal(dialog);
    if (origin && !reduced() && typeof dialog.animate === "function") {
      dialog.scrollTop = 0;
      const animation = flip(dialog, origin);
      if (animation) animation.onfinish = () => { animation.cancel(); $$(":scope > *", dialog).forEach((child) => child.getAnimations().forEach((item) => item.cancel())); };
    }
  }
  function closeModal(dialog) {
    if (!dialog.open || dialog.dataset.closing) return;
    const origin = dialog.matches("[data-case-modal]") ? caseOrigin : null;
    if (!origin || reduced() || typeof dialog.animate !== "function" || !origin.isConnected || origin.hidden) { dialog.close(); return; }
    dialog.dataset.closing = "1";
    const animation = flip(dialog, origin, true);
    const done = () => {
      delete dialog.dataset.closing;
      dialog.close();
      dialog.getAnimations().forEach((item) => item.cancel());
      $$(":scope > *", dialog).forEach((child) => child.getAnimations().forEach((item) => item.cancel()));
    };
    if (animation) animation.onfinish = done; else done();
  }
  async function shareCase() {
    const id = state.caseId;
    const url = new URL(`/projets/${id}${state.lang === "en" ? "?lang=en" : ""}`, window.location.origin).href;
    const title = `${projectData[id].title} — Houssounaine Nourdine`;
    track("share_case_study", { project: id });
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch (error) { if (error.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url); toast(T("linkCopied")); } catch (error) { window.location.href = url; }
  }

  /* ---------- Créations ---------- */
  function renderWorkFilters() {
    const wrap = $("[data-work-filters]");
    wrap.replaceChildren();
    [["all", T("allSectors")], ...Object.entries(workSectors).map(([key, label]) => [key, label[idx()]])].forEach(([key, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter${state.worksFilter === key ? " is-on" : ""}`;
      button.textContent = label;
      button.setAttribute("aria-pressed", String(state.worksFilter === key));
      button.addEventListener("click", () => { state.worksFilter = key; renderWorkFilters(); renderWorks(); });
      wrap.append(button);
    });
  }
  function renderWorks() {
    const grid = $("[data-works]");
    const filtered = works.filter((work) => state.worksFilter === "all" || work.category === state.worksFilter);
    state.visibleWorks = state.allWorks ? filtered : filtered.filter((work) => work.featured);
    grid.replaceChildren();
    state.visibleWorks.forEach((work, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `work reveal${work.video ? " work-video" : ""}`;
      button.dataset.cursor = work.video ? "play" : "view";
      button.style.setProperty("--d", String(index % 4));
      button.setAttribute("aria-label", `${T("openWork")} — ${work.title[idx()]}`);
      const image = Object.assign(document.createElement("img"), { src: asset(work.src), alt: `${work.title[idx()]} — ${work.client}`, loading: "lazy", decoding: "async" });
      const info = document.createElement("span");
      info.className = "work-info";
      info.append(
        Object.assign(document.createElement("small"), { textContent: `${work.client} · ${workSectors[work.category][idx()]}` }),
        Object.assign(document.createElement("strong"), { textContent: work.title[idx()] })
      );
      button.append(image, info);
      if (work.video) {
        /* Aperçu muet au survol, lecture complète dans la visionneuse. */
        const badge = document.createElement("span");
        badge.className = "work-play";
        badge.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5Z"/></svg><b></b>`;
        $("b", badge).textContent = T("videoBadge");
        button.append(badge);
        if (finePointer.matches && !reduced()) {
          const preview = Object.assign(document.createElement("video"), { muted: true, loop: true, playsInline: true, preload: "none", poster: asset(work.src) });
          setVideoSources(preview, work.video);
          preview.className = "work-preview";
          preview.setAttribute("aria-hidden", "true");
          button.insertBefore(preview, info);
          button.addEventListener("pointerenter", () => { preview.play().catch(() => {}); });
          button.addEventListener("pointerleave", () => { preview.pause(); });
        }
      }
      button.addEventListener("click", () => openWork(work.id));
      grid.append(button);
    });
    $("[data-works-count]").textContent = extra[state.lang].worksShown(state.visibleWorks.length, filtered.length);
    const toggle = $("[data-works-toggle]");
    toggle.textContent = state.allWorks ? T("worksShowSelection") : T("worksViewAll");
    toggle.setAttribute("aria-expanded", String(state.allWorks));
    observeReveals(grid);
  }
  function updateLightbox() {
    const work = works.find((item) => item.id === state.workId);
    if (!work) return;
    const box = $("[data-lightbox]");
    const image = $("[data-lb-image]", box);
    const video = $("[data-lb-video]", box);
    video.pause();
    image.hidden = Boolean(work.video);
    video.hidden = !work.video;
    if (work.video) {
      video.poster = asset(work.src);
      if (video.dataset.work !== String(work.id)) { setVideoSources(video, work.video); video.dataset.work = String(work.id); }
      video.setAttribute("aria-label", `${work.title[idx()]} — ${work.client}`);
    } else {
      if (video.dataset.work) { video.replaceChildren(); video.load(); delete video.dataset.work; }
      image.src = asset(work.src);
      image.alt = `${work.title[idx()]} — ${work.client}`;
    }
    $("[data-lb-sector]", box).textContent = workSectors[work.category][idx()];
    $("[data-lb-title]", box).textContent = work.title[idx()];
    $("[data-lb-description]", box).textContent = work.video ? T("videoDescription") : T("workDescription");
    $('[data-i18n="workRoleValue"]', box).textContent = work.video ? T("videoRole") : T("workRoleValue");
    $("[data-lb-client]", box).textContent = work.client;
    const position = Math.max(state.visibleWorks.findIndex((item) => item.id === state.workId), 0);
    $("[data-lb-pos]", box).textContent = `${String(position + 1).padStart(2, "0")} / ${String(state.visibleWorks.length).padStart(2, "0")}`;
    const media = work.video ? video : image;
    if (!reduced() && typeof media.animate === "function") media.animate([{ opacity: 0, scale: .96 }, { opacity: 1, scale: 1 }], { duration: 450, easing: "cubic-bezier(.16,1,.3,1)" });
  }
  function openWork(id) {
    if (hooks.openStories) { hooks.openStories(state.visibleWorks, id); return; }
    state.workId = id;
    updateLightbox();
    track("view_creative_work", { work_id: id });
    openModal($("[data-lightbox]"));
  }
  function stepWork(direction) {
    const list = state.visibleWorks;
    if (!list.length) return;
    const current = list.findIndex((work) => work.id === state.workId);
    state.workId = list[(current + direction + list.length) % list.length].id;
    updateLightbox();
  }

  /* ---------- Clients ---------- */
  function renderClients() {
    const wall = $("[data-clients]");
    wall.replaceChildren();
    clients.filter((client) => client.status === state.clientFilter).forEach((client, index) => {
      const item = document.createElement("li");
      item.className = "client reveal";
      item.style.setProperty("--d", String(index % 6));
      item.append(
        Object.assign(document.createElement("img"), { src: asset(client.logo), alt: `Logo ${client.name}`, loading: "lazy", decoding: "async", width: 76, height: 76 }),
        Object.assign(document.createElement("strong"), { textContent: client.name }),
        Object.assign(document.createElement("small"), { textContent: client.sector[idx()] })
      );
      wall.append(item);
    });
    observeReveals(wall);
  }

  /* ---------- Modales ---------- */
  function openModal(dialog) {
    if (!dialog.open) dialog.showModal();
    document.body.classList.add("locked");
  }
  function setupModals() {
    $$("dialog.modal").forEach((dialog) => {
      dialog.addEventListener("close", () => { if (!$("dialog[open]")) document.body.classList.remove("locked"); });
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
          const rect = dialog.getBoundingClientRect();
          const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
          if (!inside) closeModal(dialog);
        }
      });
      $$("[data-close]", dialog).forEach((button) => button.addEventListener("click", () => closeModal(dialog)));
      dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeModal(dialog); });
    });
    const lightbox = $("[data-lightbox]");
    $("[data-lb-prev]").addEventListener("click", () => stepWork(-1));
    $("[data-lb-next]").addEventListener("click", () => stepWork(1));
    document.addEventListener("keydown", (event) => {
      if (!lightbox.open || event.target instanceof HTMLVideoElement) return;
      if (event.key === "ArrowLeft") stepWork(-1);
      if (event.key === "ArrowRight") stepWork(1);
    });
    let touchX = null;
    lightbox.addEventListener("close", () => $("[data-lb-video]", lightbox).pause());
    lightbox.addEventListener("touchstart", (event) => { touchX = event.touches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", (event) => {
      if (touchX === null) return;
      const delta = event.changedTouches[0].clientX - touchX;
      if (Math.abs(delta) > 50) stepWork(delta < 0 ? 1 : -1);
      touchX = null;
    });
    $("[data-privacy]").addEventListener("click", (event) => { event.preventDefault(); openModal($("[data-privacy-modal]")); });
  }

  /* ---------- Apparitions ---------- */
  let revealObserver = null;
  function observeReveals(scope = document) {
    const targets = $$(".reveal:not(.in), .reveal-words:not(.in), .toolbox:not(.in)", scope);
    if (scope !== document && scope.matches?.(".reveal")) targets.push(scope);
    if (!revealObserver) {
      targets.forEach((element) => element.classList.add("in"));
      return;
    }
    targets.forEach((element) => revealObserver.observe(element));
  }
  function setupReveals() {
    if (!("IntersectionObserver" in window)) { revealObserver = null; observeReveals(); return; }
    revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in");
      $$(".count:not([data-done])", entry.target).forEach(runCount);
      if (entry.target.matches(".count:not([data-done])")) runCount(entry.target);
      revealObserver.unobserve(entry.target);
    }), { threshold: .14, rootMargin: "0px 0px -6% 0px" });
    observeReveals();
  }

  /* ---------- Navigation : ruban fixe de raccourcis ---------- */
  function setupNav() {
    const dock = $(".dock");
    const track = $(".dock-track", dock);
    const pill = $(".dock-pill", dock);
    const links = $$(".dock a", dock);
    let current = null;
    function movePill(link) {
      if (link === current) return;
      current = link;
      links.forEach((item) => {
        item.classList.toggle("is-on", item === link);
        if (item === link) item.setAttribute("aria-current", "true"); else item.removeAttribute("aria-current");
      });
      if (!link) { pill.style.opacity = "0"; return; }
      pill.style.opacity = "1";
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.translate = `${link.offsetLeft}px 0`;
      /* Sur mobile, garder le raccourci actif visible dans le ruban. */
      if (track.scrollWidth > track.clientWidth) {
        track.scrollTo({ left: link.offsetLeft - track.clientWidth / 2 + link.offsetWidth / 2, behavior: reduced() ? "auto" : "smooth" });
      }
    }
    const sections = links.map((link) => $(link.getAttribute("href"))).filter(Boolean);
    if ("IntersectionObserver" in window) {
      const visible = new Map();
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((entry) => visible.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0));
        let best = null, ratio = 0;
        visible.forEach((value, section) => { if (value > ratio) { ratio = value; best = section; } });
        movePill(best ? links.find((link) => link.getAttribute("href") === `#${best.id}`) : null);
      }, { threshold: [0, .15, .3, .5], rootMargin: "-30% 0px -40% 0px" });
      sections.forEach((section) => spy.observe(section));
    }
    window.addEventListener("resize", () => { const link = current; current = null; movePill(link); });

    /* Masquer la barre du haut en descendant ; progression de lecture dans le ruban. */
    const bar = $(".bar");
    const progress = $(".progress");
    let lastY = window.scrollY, ticking = false;
    function onScroll() {
      ticking = false;
      const y = window.scrollY;
      bar.classList.toggle("hide", y > 400 && y > lastY);
      dock.classList.toggle("is-visible", y > innerHeight * .35);
      lastY = y;
      const max = document.documentElement.scrollHeight - innerHeight;
      const ratio = max > 0 ? Math.min(y / max, 1) : 0;
      progress.style.transform = `scaleX(${ratio})`;
      dock.style.setProperty("--read", ratio.toFixed(3));
      updateTimeline();
    }
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
  }

  /* Ligne de progression du parcours. */
  function updateTimeline() {
    const timeline = $("[data-timeline]");
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const anchor = innerHeight * .6;
    const ratio = Math.max(0, Math.min(1, (anchor - rect.top) / rect.height));
    timeline.style.setProperty("--tl", ratio.toFixed(3));
    $$(".step", timeline).forEach((step) => step.classList.toggle("is-past", step.getBoundingClientRect().top < anchor));
  }

  /* ---------- Curseur et boutons magnétiques ---------- */
  function setupPointer() {
    if (!finePointer.matches) return;
    const cursor = $(".cursor");
    const label = $("span", cursor);
    let x = 0, y = 0, cx = 0, cy = 0, frame = 0;
    const follow = () => {
      cx += (x - cx) * .2; cy += (y - cy) * .2;
      cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      frame = Math.abs(x - cx) + Math.abs(y - cy) > .3 ? window.requestAnimationFrame(follow) : 0;
    };
    document.addEventListener("pointermove", (event) => {
      if (reduced()) return;
      x = event.clientX; y = event.clientY;
      cursor.classList.add("on");
      if (!frame) frame = window.requestAnimationFrame(follow);
      const target = event.target.closest?.("[data-cursor]");
      cursor.classList.toggle("big", Boolean(target));
      if (target) label.textContent = T({ view: "cursorView", play: "cursorPlay" }[target.dataset.cursor] || "cursorOpen");

      const glow = event.target.closest?.(".tile, .case, .diploma, .client, .qr-card");
      if (glow) {
        const rect = glow.getBoundingClientRect();
        glow.style.setProperty("--mx", `${(x - rect.left).toFixed(0)}px`);
        glow.style.setProperty("--my", `${(y - rect.top).toFixed(0)}px`);
      }

      const magnet = event.target.closest?.(".magnetic");
      if (magnet) {
        const rect = magnet.getBoundingClientRect();
        magnet.style.translate = `${((x - rect.left - rect.width / 2) * .18).toFixed(1)}px ${((y - rect.top - rect.height / 2) * .3).toFixed(1)}px`;
      }
    }, { passive: true });
    document.addEventListener("pointerout", (event) => {
      const magnet = event.target.closest?.(".magnetic");
      if (magnet && !magnet.contains(event.relatedTarget)) magnet.style.translate = "";
    });
    document.documentElement.addEventListener("pointerleave", () => cursor.classList.remove("on"));
  }

  /* ---------- Contact ---------- */
  let toastTimer = 0;
  function toast(message) {
    const element = $("[data-toast]");
    element.textContent = message;
    element.classList.add("on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => element.classList.remove("on"), 2400);
  }
  function setupContact() {
    $("[data-copy-email]").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(EMAIL); toast(T("copied")); }
      catch (error) { window.location.href = `mailto:${EMAIL}`; }
    });
    $("[data-contact-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const fr = state.lang === "fr";
      const type = $('input[name="type"]:checked + span', event.currentTarget)?.textContent || data.get("type");
      const subject = `[Portfolio] ${type} — ${data.get("subject")}`;
      const message = `${fr ? "Nom" : "Name"}: ${data.get("name")}\n${fr ? "E-mail" : "Email"}: ${data.get("email")}\n${fr ? "Type de demande" : "Request type"}: ${type}\n\n${data.get("message")}`;
      $("[data-form-status]").textContent = T("formReady");
      track("contact_form_prepare", { request_type: String(data.get("type")) });
      window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    });
  }

  /* Anciennes adresses (/projects, /works…) : défilement vers la section correspondante. */
  const LEGACY_SECTIONS = { expertise: "expertises", journey: "parcours", projects: "projets", works: "creations", clients: "clients", contact: "contact" };
  function scrollToLegacyRoute() {
    const target = LEGACY_SECTIONS[window.location.pathname.replace(/^\/+|\/+$/g, "")];
    const section = target && document.getElementById(target);
    if (!section) return;
    window.history.replaceState(null, "", `/${window.location.search}#${target}`);
    window.requestAnimationFrame(() => section.scrollIntoView({ behavior: "auto" }));
  }

  /* ---------- Statistiques (Google Analytics, uniquement avec consentement) ---------- */
  function track(name, parameters = {}) {
    if (typeof window.gtag === "function") window.gtag("event", name, parameters);
  }
  function enableAnalytics() {
    if (!GA_MEASUREMENT_ID) return;
    if (document.querySelector("#ga-script")) {
      window.gtag("consent", "update", { analytics_storage: "granted" });
      return;
    }
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
      functionality_storage: "granted", security_storage: "granted"
    });
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
    const script = document.createElement("script");
    script.id = "ga-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.append(script);
    track("page_view", { page_title: document.title, page_location: window.location.href, page_path: `${window.location.pathname}${window.location.search}` });
  }
  function setupConsent() {
    const bar = $("[data-consent]");
    const consent = store.get(CONSENT_KEY);
    if (consent === "accepted") enableAnalytics();
    if (!consent) bar.hidden = false;
    $$("[data-cookie]", bar).forEach((button) => button.addEventListener("click", () => {
      const accepted = button.dataset.cookie === "accept";
      store.set(CONSENT_KEY, accepted ? "accepted" : "rejected");
      bar.hidden = true;
      if (accepted) enableAnalytics();
      else if (typeof window.gtag === "function") window.gtag("consent", "update", { analytics_storage: "denied" });
    }));
    $("[data-cookie-settings]").addEventListener("click", () => {
      $("[data-privacy-modal]").close();
      bar.hidden = false;
    });

    /* Événements utiles, identiques à la version classique. */
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.("a[href]");
      if (!link) return;
      const href = link.getAttribute("href");
      if (href.startsWith("https://wa.me/")) track("click_whatsapp");
      else if (href.startsWith("mailto:")) track("click_email");
      else if (href.includes("linkedin.com")) track("click_social", { network: "linkedin" });
      else if (href.includes("facebook.com")) track("click_social", { network: "facebook" });
      else if (href.includes("instagram.com")) track("click_social", { network: "instagram" });
    });
  }

  /* ---------- API pour les modules complémentaires (features.js) ---------- */
  const hooks = {};
  window.HN = {
    T, asset, icon, track, toast: (message) => toast(message), reduced, finePointer,
    lang: () => state.lang, cases, openCase, openModal, closeModal, setVideoSources, hooks
  };

  /* ---------- Démarrage ---------- */
  function init() {
    if (typeof translations === "undefined") return;
    $$("[data-year]").forEach((element) => { element.textContent = String(new Date().getFullYear()); });
    splitChars();
    fitTitle();
    if (document.fonts?.ready) document.fonts.ready.then(fitTitle);
    window.addEventListener("resize", fitTitle);
    setupReveals();
    applyLanguage();
    setupModals();
    setupNav();
    setupPointer();
    setupContact();
    $("[data-case-share]").addEventListener("click", shareCase);
    setupConsent();
    startRotator();
    scrollToLegacyRoute();
    tickClock();
    window.setInterval(tickClock, 20000);

    $("[data-theme-toggle]").addEventListener("click", toggleTheme);
    $("[data-lang-toggle]").addEventListener("click", () => {
      state.lang = state.lang === "fr" ? "en" : "fr";
      store.set("portfolio-language", state.lang);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", state.lang);
      window.history.replaceState(null, "", url);
      applyLanguage();
      observeReveals();
      $$(".reveal-words").forEach((element) => element.classList.add("in"));
    });
    $$("[data-project-filters] .filter").forEach((button) => button.addEventListener("click", () => {
      state.projectFilter = button.dataset.filter;
      $$("[data-project-filters] .filter").forEach((item) => { item.classList.toggle("is-on", item === button); item.setAttribute("aria-pressed", String(item === button)); });
      $$("[data-cases] .case").forEach((card) => {
        card.hidden = state.projectFilter !== "all" && card.dataset.category !== state.projectFilter;
        if (!card.hidden && !reduced() && typeof card.animate === "function") card.animate([{ opacity: 0, scale: .95 }, { opacity: 1, scale: 1 }], { duration: 450, easing: "cubic-bezier(.16,1,.3,1)" });
      });
    }));
    $$("[data-client-filters] .filter").forEach((button) => button.addEventListener("click", () => {
      state.clientFilter = button.dataset.filter;
      $$("[data-client-filters] .filter").forEach((item) => { item.classList.toggle("is-on", item === button); item.setAttribute("aria-pressed", String(item === button)); });
      renderClients();
    }));
    $("[data-works-toggle]").addEventListener("click", () => { state.allWorks = !state.allWorks; renderWorks(); });
    $$(".filter.is-on").forEach((button) => button.setAttribute("aria-pressed", "true"));
    $$(".filter:not(.is-on)").forEach((button) => button.setAttribute("aria-pressed", "false"));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
