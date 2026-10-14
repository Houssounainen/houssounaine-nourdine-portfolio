"use strict";

/* Pages projet : langue (FR/EN), partage et lien WhatsApp. Les textes des deux langues sont dans la page. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const UI = window.CASE_UI;
  const params = new URLSearchParams(window.location.search);
  let lang = ["fr", "en"].includes(params.get("lang")) ? params.get("lang") : (() => {
    try { return localStorage.getItem("portfolio-language") === "en" ? "en" : "fr"; } catch (error) { return "fr"; }
  })();

  function apply() {
    document.documentElement.lang = lang;
    $$("[data-fr]").forEach((element) => { element.textContent = element.dataset[lang] || element.dataset.fr; });
    $$("[data-ui]").forEach((element) => { element.textContent = UI[lang][element.dataset.ui]; });
    const other = lang === "fr" ? "en" : "fr";
    const switcher = $("[data-lang-switch]");
    switcher.textContent = UI[lang].lang;
    switcher.setAttribute("aria-label", UI[lang].langLabel);
    switcher.href = `?lang=${other}`;
    $("[data-wa]").href = `https://wa.me/261344886137?text=${encodeURIComponent(UI[lang].message)}`;
    $$('a[href^="/"]:not([data-lang-switch])').forEach((link) => {
      const url = new URL(link.getAttribute("href"), window.location.origin);
      if (lang === "en") url.searchParams.set("lang", "en"); else url.searchParams.delete("lang");
      link.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
    });
  }
  $("[data-lang-switch]").addEventListener("click", (event) => {
    event.preventDefault();
    lang = lang === "fr" ? "en" : "fr";
    try { localStorage.setItem("portfolio-language", lang); } catch (error) { /* stockage indisponible */ }
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.history.replaceState(null, "", url);
    apply();
  });

  let timer = 0;
  function toast(message) {
    const element = $("[data-toast]");
    element.textContent = message;
    element.classList.add("on");
    window.clearTimeout(timer);
    timer = window.setTimeout(() => element.classList.remove("on"), 2400);
  }
  $("[data-share]").addEventListener("click", async () => {
    const url = new URL(window.location.pathname, window.location.origin);
    if (lang === "en") url.searchParams.set("lang", "en");
    if (navigator.share) {
      try { await navigator.share({ title: document.title, url: url.href }); return; } catch (error) { if (error.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(url.href); toast(UI[lang].copied); } catch (error) { /* presse-papiers indisponible */ }
  });

  /* Statistiques : uniquement si le visiteur a déjà accepté sur la page d'accueil. */
  try {
    if (localStorage.getItem("portfolio-cookie-consent") === "accepted") {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
      window.gtag("js", new Date());
      window.gtag("config", "G-1LL57GXLVY", { send_page_view: true });
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=G-1LL57GXLVY";
      document.head.append(script);
    }
  } catch (error) { /* stockage indisponible */ }

  apply();
})();
