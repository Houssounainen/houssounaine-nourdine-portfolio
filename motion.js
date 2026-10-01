"use strict";

/* Couche d'animations additive : n'utilise que des éléments et classes déjà présents.
   Chargé avant script.js afin que les délais d'apparition soient posés avant l'affichage. */
(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const SPOT_SELECTOR = ".service-card, .project-card, .client-card, .work-card, .metric, .thesis-card, .education-card, .timeline-card, .aed-card, .aed-doc-card, .aed-law";
  const MAGNET_SELECTOR = ".button, .sidebar-cta";

  /* 1. Apparition échelonnée des éléments frères */
  function applyStagger(scope = document) {
    scope.querySelectorAll(".reveal:not([data-stagger])").forEach((element) => {
      const siblings = Array.from(element.parentElement.children).filter((child) => child.classList.contains("reveal"));
      element.style.setProperty("--stagger", String(Math.max(0, siblings.indexOf(element))));
      element.dataset.stagger = "1";
    });
  }
  applyStagger();

  if (reduced) return;

  /* 2. Barre de progression de lecture */
  const progress = document.createElement("div");
  progress.className = "motion-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);
  let progressTicking = false;
  function updateProgress() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0})`;
    progressTicking = false;
  }
  window.addEventListener("scroll", () => {
    if (!progressTicking) { progressTicking = true; window.requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener("resize", updateProgress);
  updateProgress();

  /* 3. Nouveaux éléments .reveal ajoutés dynamiquement (clients, créations…) */
  const main = document.querySelector("#main");
  if (main && "MutationObserver" in window) {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() => { applyStagger(main); updateProgress(); queued = false; });
    }).observe(main, { childList: true, subtree: true });
  }

  if (!finePointer) return;

  /* 4. Halo doux qui suit le curseur */
  const cursor = document.createElement("div");
  cursor.className = "motion-cursor";
  cursor.setAttribute("aria-hidden", "true");
  document.body.append(cursor);
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0, running = false;
  function follow() {
    currentX += (targetX - currentX) * 0.14;
    currentY += (targetY - currentY) * 0.14;
    cursor.style.transform = `translate3d(${currentX.toFixed(1)}px, ${currentY.toFixed(1)}px, 0)`;
    if (Math.abs(targetX - currentX) > 0.5 || Math.abs(targetY - currentY) > 0.5) window.requestAnimationFrame(follow);
    else running = false;
  }
  document.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    cursor.classList.add("on");
    if (!running) { running = true; window.requestAnimationFrame(follow); }
  }, { passive: true });
  document.addEventListener("pointerleave", () => cursor.classList.remove("on"));

  /* 5. Éclairage des cartes + boutons magnétiques (délégation d'événements) */
  document.addEventListener("pointerover", (event) => {
    const card = event.target.closest?.(SPOT_SELECTOR);
    if (!card || card.classList.contains("has-spot")) return;
    if (window.getComputedStyle(card).position === "static") card.style.position = "relative";
    const glow = document.createElement("span");
    glow.className = "spot-glow";
    glow.setAttribute("aria-hidden", "true");
    card.prepend(glow);
    card.classList.add("has-spot");
  });

  document.addEventListener("pointermove", (event) => {
    const card = event.target.closest?.(".has-spot");
    if (card) {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    }
    const magnet = event.target.closest?.(MAGNET_SELECTOR);
    if (magnet) {
      const rect = magnet.getBoundingClientRect();
      const x = (event.clientX - rect.left - rect.width / 2) * 0.14;
      const y = (event.clientY - rect.top - rect.height / 2) * 0.22;
      magnet.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    }
  }, { passive: true });

  document.addEventListener("pointerout", (event) => {
    const magnet = event.target.closest?.(MAGNET_SELECTOR);
    if (magnet && !magnet.contains(event.relatedTarget)) magnet.style.translate = "";
  });
})();

/* Direction artistique : entrée cinématique, aurore et profondeur interactive. */
(() => {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const aura = document.createElement("div");
  aura.className = "wow-aurora";
  aura.setAttribute("aria-hidden", "true");
  aura.innerHTML = "<i></i><i></i><i></i>";
  hero.prepend(aura);

  const tiltSelector = ".portrait-frame, .service-card, .project-card, .work-card, .education-card";
  let activeCard = null, frame = 0, latestEvent = null;
  function reset() {
    if (activeCard) {
      activeCard.style.removeProperty("--tilt-x");
      activeCard.style.removeProperty("--tilt-y");
      activeCard.classList.remove("wow-tilting");
      activeCard = null;
    }
  }
  document.addEventListener("pointermove", (event) => {
    if (preference.matches || !pointer.matches || event.pointerType === "touch") return;
    latestEvent = event;
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      const card = latestEvent.target.closest?.(tiltSelector);
      if (card !== activeCard) reset();
      if (!card) return;
      activeCard = card;
      const rect = card.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (latestEvent.clientX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (latestEvent.clientY - rect.top) / rect.height * 2 - 1));
      card.style.setProperty("--tilt-x", (-y * 7).toFixed(2) + "deg");
      card.style.setProperty("--tilt-y", (x * 9).toFixed(2) + "deg");
      card.classList.add("wow-tilting");
    });
  }, { passive: true });
  document.addEventListener("pointerout", (event) => {
    if (activeCard && !activeCard.contains(event.relatedTarget)) reset();
  });
  window.addEventListener("blur", reset);
  preference.addEventListener("change", reset);
  pointer.addEventListener("change", reset);

  /* Rejouer une transition une seule fois par changement de rubrique. */
  let route = null;
  function enterRoute() {
    const next = document.body.dataset.route;
    if (!next || route === next) return;
    route = next;
    reset();
    if (preference.matches) return;
    document.querySelectorAll('[data-route]:not([hidden])').forEach(section => {
      section.getAnimations().filter(animation => animation.id === "wow-route").forEach(animation => animation.cancel());
      if (typeof section.animate !== "function") return;
      section.animate([
        { opacity: .2, translate: "0 32px" },
        { opacity: 1, translate: "0 0" }
      ], { id: "wow-route", duration: 650, easing: "cubic-bezier(.16,1,.3,1)" });
    });
  }
  new MutationObserver(enterRoute).observe(document.body, { attributes: true, attributeFilter: ["data-route"] });
  enterRoute();
})();
