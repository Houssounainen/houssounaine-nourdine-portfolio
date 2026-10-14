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
      classic: "Version classique", backTop: "Haut de page ↑", privacyV2: "Cette version n’utilise ni cookie ni outil de mesure d’audience.",
      cursorView: "Voir", cursorOpen: "Ouvrir", worksShown: (shown, total) => `${shown} / ${total} créations`,
      themeToDark: "Activer le mode sombre", themeToLight: "Activer le mode clair", langLabel: "Passer le site en anglais",
      menuOpen: "Ouvrir le menu", menuClose: "Fermer le menu",
      ticker: ["<b>271 K+</b> abonnés Facebook", "<b>100,4 M</b> vues en 2026", "<b>24</b> pages clientes supervisées", "<b>40</b> affiches conçues", "<b>21</b> marques accompagnées", "Master en Gestion <b>2026</b>"]
    },
    en: {
      edition: "Edition", values: "Values", localTime: "local time", sinceText: "serving communities",
      assocOpen: "Open the AEDBVT space", copyHint: "Click to copy", copied: "Email address copied ✓",
      classic: "Classic version", backTop: "Back to top ↑", privacyV2: "This version uses no cookies and no audience measurement tools.",
      cursorView: "View", cursorOpen: "Open", worksShown: (shown, total) => `${shown} / ${total} creative works`,
      themeToDark: "Enable dark mode", themeToLight: "Enable light mode", langLabel: "Switch website to French",
      menuOpen: "Open menu", menuClose: "Close menu",
      ticker: ["<b>271 K+</b> Facebook followers", "<b>100.4 M</b> views in 2026", "<b>24</b> client pages supervised", "<b>40</b> posters designed", "<b>21</b> brands supported", "Master’s in Management <b>2026</b>"]
    }
  };

  /* Cartes projets : reprise des éléments de la version principale. */
  const cases = [
    { id: "sfcb", category: "personal", logo: "assets/portrait-hero-cutout.webp", type: "projectPersonal", summary: "sfcbSummary", proof: "100,4 M", proofKey: "views2026", featured: true },
    { id: "raiky", category: "management", logo: "assets/logos/raiky.jpg", type: "projectManagement", summary: "raikySummary", proof: "24", proofKey: "managedPages" },
    { id: "tfc", category: "client", logo: "assets/logos/tulear-fitness.jpg", typeText: "Fitness", summary: "tfcSummary", proof: "+10 K", proofKey: "newFollowers" },
    { id: "univpass", category: "client", logo: "assets/logos/univpass.jpg", typeText: "EdTech", summary: "univpassSummary", proof: "48", proofKey: "contentsMonth" },
    { id: "le-jardin", category: "client", logo: "assets/logos/le-jardin.jpg", type: "restaurant", summary: "gardenSummary", proof: "2025", proofKey: "sinceMarch" },
    { id: "indian-basket", category: "client", logo: "assets/logos/indian-basket.jpg", type: "retail", summary: "indianSummary", proof: "FB", proofKey: "managedChannel" },
    { id: "homeopharma", category: "client", logo: "assets/logos/homeopharma.jpg", type: "wellness", summary: "homeoSummary", proof: "FB", proofKey: "localPage" },
    { id: "total-tools", category: "client", logo: "assets/logos/total-tools.jpg", type: "tools", summary: "totalSummary", proof: "360°", proofKey: "contentProcess" },
    { id: "wedis", category: "client", logo: "assets/logos/wedis.jpg", typeText: "Automation", summary: "wedisSummary", proof: "7", proofKey: "botFunctions" },
    { id: "shain", category: "client", logo: "assets/logos/shain-lodge.jpg", type: "tourism", summary: "shainSummary", proof: "FB + IG", proofKey: "managedChannels" }
  ];

  const state = {
    lang: (() => {
      const requested = new URLSearchParams(window.location.search).get("lang");
      if (["fr", "en"].includes(requested)) return requested;
      return store.get("portfolio-language") === "en" ? "en" : "fr";
    })(),
    projectFilter: "all", clientFilter: "current", worksFilter: "all", allWorks: false, visibleWorks: [], workId: null
  };
  const T = (key) => translations[state.lang][key] ?? extra[state.lang][key] ?? "";
  const idx = () => (state.lang === "fr" ? 0 : 1);

  /* ---------- Langue ---------- */
  function applyLanguage() {
    root.lang = state.lang;
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
    updateMenuLabel();
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
    $('meta[name="theme-color"]').content = root.dataset.theme === "dark" ? "#0f0e0d" : "#f2eee5";
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
      $(".case-proof strong", card).textContent = item.proof;
      $(".case-proof span", card).textContent = T(item.proofKey);
      card.setAttribute("aria-label", `${T("viewCase")} — ${project.title}`);
      card.addEventListener("click", () => openCase(item.id));
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
    $("[data-case-links]", modal).replaceChildren(...project.links.map((link) => Object.assign(document.createElement("a"), {
      href: link.url, target: "_blank", rel: "noopener noreferrer", textContent: `${link.label} ↗`
    })));
    const media = $("[data-case-media]", modal);
    media.hidden = !project.media;
    media.replaceChildren(...(project.media || []).map((source) => {
      const figure = document.createElement("figure");
      const image = Object.assign(document.createElement("img"), { src: asset(source), alt: T("statsCaption"), loading: "lazy" });
      figure.append(image, Object.assign(document.createElement("figcaption"), { textContent: T("statsCaption") }));
      return figure;
    }));
  }
  function openCase(id) {
    if (!projectData[id]) return;
    state.caseId = id;
    fillCase(id);
    openModal($("[data-case-modal]"));
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
      button.className = "work reveal";
      button.dataset.cursor = "view";
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
    image.src = asset(work.src);
    image.alt = `${work.title[idx()]} — ${work.client}`;
    $("[data-lb-sector]", box).textContent = workSectors[work.category][idx()];
    $("[data-lb-title]", box).textContent = work.title[idx()];
    $("[data-lb-description]", box).textContent = T("workDescription");
    $("[data-lb-client]", box).textContent = work.client;
    const position = Math.max(state.visibleWorks.findIndex((item) => item.id === state.workId), 0);
    $("[data-lb-pos]", box).textContent = `${String(position + 1).padStart(2, "0")} / ${String(state.visibleWorks.length).padStart(2, "0")}`;
    if (!reduced() && typeof image.animate === "function") image.animate([{ opacity: 0, scale: .96 }, { opacity: 1, scale: 1 }], { duration: 450, easing: "cubic-bezier(.16,1,.3,1)" });
  }
  function openWork(id) {
    state.workId = id;
    updateLightbox();
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
          if (!inside) dialog.close();
        }
      });
      $$("[data-close]", dialog).forEach((button) => button.addEventListener("click", () => dialog.close()));
    });
    const lightbox = $("[data-lightbox]");
    $("[data-lb-prev]").addEventListener("click", () => stepWork(-1));
    $("[data-lb-next]").addEventListener("click", () => stepWork(1));
    document.addEventListener("keydown", (event) => {
      if (!lightbox.open) return;
      if (event.key === "ArrowLeft") stepWork(-1);
      if (event.key === "ArrowRight") stepWork(1);
    });
    let touchX = null;
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

  /* ---------- Navigation ---------- */
  function setupNav() {
    const nav = $(".bar-nav");
    const pill = $(".bar-nav-pill");
    const links = $$(".bar-nav a");
    function movePill(link) {
      if (!link) { pill.style.opacity = "0"; links.forEach((item) => item.classList.remove("is-on")); return; }
      links.forEach((item) => item.classList.toggle("is-on", item === link));
      pill.style.opacity = "1";
      pill.style.width = `${link.offsetWidth}px`;
      pill.style.translate = `${link.offsetLeft}px 0`;
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

    /* Masquer la barre en descendant, la montrer en remontant. */
    const bar = $(".bar");
    const progress = $(".progress");
    let lastY = window.scrollY, ticking = false;
    function onScroll() {
      ticking = false;
      const y = window.scrollY;
      bar.classList.toggle("hide", y > 400 && y > lastY && !$(".sheet.open"));
      lastY = y;
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      updateTimeline();
    }
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    /* Menu plein écran (mobile et tablette). */
    const toggle = $(".menu-toggle");
    const sheet = $("#sheet");
    function setMenu(open) {
      toggle.setAttribute("aria-expanded", String(open));
      updateMenuLabel();
      if (open) {
        sheet.hidden = false;
        window.requestAnimationFrame(() => sheet.classList.add("open"));
        document.body.classList.add("locked");
      } else {
        sheet.classList.remove("open");
        document.body.classList.remove("locked");
        window.setTimeout(() => { if (!sheet.classList.contains("open")) sheet.hidden = true; }, reduced() ? 0 : 700);
      }
    }
    toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
    $$("a", sheet).forEach((link) => link.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && sheet.classList.contains("open")) { setMenu(false); toggle.focus(); } });
  }
  function updateMenuLabel() {
    const toggle = $(".menu-toggle");
    toggle.setAttribute("aria-label", toggle.getAttribute("aria-expanded") === "true" ? T("menuClose") : T("menuOpen"));
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
      if (target) label.textContent = T(target.dataset.cursor === "view" ? "cursorView" : "cursorOpen");

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

  /* ---------- Démarrage ---------- */
  function init() {
    if (typeof translations === "undefined") return;
    $("[data-year]").textContent = String(new Date().getFullYear());
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
