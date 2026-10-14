"use strict";

/* Couche « wow » : préchargeur, constellation, bandeau de clients, palette de commandes,
   transition de thème et effets de texte. Additive : réutilise le contenu et les fonctions existants. */
(() => {
  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const root = document.documentElement;
  const isFrench = () => root.lang !== "en";
  const t = (fr, en) => (isFrench() ? fr : en);
  const reduced = () => reducedQuery.matches;

  /* 1. Préchargeur : une fois par session (la classe est posée dans <head>). */
  function playIntro() {
    const intro = document.querySelector(".wow-intro");
    if (!intro) return;
    if (!root.classList.contains("wow-intro-on")) { intro.remove(); return; }
    const counter = intro.querySelector(".wow-intro-count");
    const start = performance.now();
    const duration = 1250;
    try { sessionStorage.setItem("wow-intro-seen", "1"); } catch (error) { /* stockage indisponible */ }
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      if (counter) counter.textContent = String(Math.round(eased * 100)).padStart(3, "0");
      intro.style.setProperty("--wow-intro-progress", eased.toFixed(3));
      if (progress < 1) window.requestAnimationFrame(tick);
      else finish();
    }
    function finish() {
      intro.classList.add("is-leaving");
      root.classList.add("wow-intro-done");
      window.setTimeout(() => { intro.remove(); root.classList.remove("wow-intro-on"); }, 900);
    }
    intro.addEventListener("click", finish, { once: true });
    window.requestAnimationFrame(tick);
  }

  /* 2. Constellation interactive : la communauté qui se connecte autour du pointeur. */
  function installConstellation() {
    const hero = document.querySelector(".hero");
    if (!hero || !window.HTMLCanvasElement) return;
    const canvas = document.createElement("canvas");
    canvas.className = "wow-constellation";
    canvas.setAttribute("aria-hidden", "true");
    hero.prepend(canvas);
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0, height = 0, ratio = 1, nodes = [], frame = 0, visible = true;
    const pointer = { x: -9999, y: -9999, active: false };

    function resize() {
      const rect = hero.getBoundingClientRect();
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(width < 760 ? 34 : 78, (width * height) / 16000));
      nodes = Array.from({ length: count }, (_, index) => nodes[index] || {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - .5) * .32,
        vy: (Math.random() - .5) * .32,
        r: Math.random() * 1.6 + .6,
        hue: Math.random() < .18 ? "gold" : (Math.random() < .3 ? "violet" : "mint")
      });
      nodes.forEach((node) => { node.x = Math.min(node.x, width); node.y = Math.min(node.y, height); });
      if (reduced()) draw(false);
    }

    const colors = { mint: "79, 209, 163", violet: "164, 139, 250", gold: "248, 185, 0" };
    function draw(move = true) {
      context.clearRect(0, 0, width, height);
      const linkDistance = width < 760 ? 92 : 132;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (move) {
          if (pointer.active) {
            const dx = pointer.x - a.x, dy = pointer.y - a.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 190 && distance > 1) { a.vx += dx / distance * .012; a.vy += dy / distance * .012; }
          }
          a.vx *= .992; a.vy *= .992;
          const speed = Math.hypot(a.vx, a.vy);
          if (speed < .08) { a.vx += (Math.random() - .5) * .04; a.vy += (Math.random() - .5) * .04; }
          if (speed > 1.1) { a.vx *= .9; a.vy *= .9; }
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > width) a.vx *= -1;
          if (a.y < 0 || a.y > height) a.vy *= -1;
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance < linkDistance) {
            context.strokeStyle = `rgba(${colors.mint}, ${((1 - distance / linkDistance) * .2).toFixed(3)})`;
            context.lineWidth = .7;
            context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
          }
        }
        if (pointer.active) {
          const distance = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (distance < 170) {
            context.strokeStyle = `rgba(${colors[a.hue]}, ${((1 - distance / 170) * .45).toFixed(3)})`;
            context.lineWidth = .9;
            context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(pointer.x, pointer.y); context.stroke();
          }
        }
        context.fillStyle = `rgba(${colors[a.hue]}, .8)`;
        context.beginPath(); context.arc(a.x, a.y, a.r, 0, Math.PI * 2); context.fill();
      }
    }

    function loop() {
      frame = 0;
      if (!visible || document.hidden || reduced() || hero.hidden) return;
      draw();
      frame = window.requestAnimationFrame(loop);
    }
    function start() { if (!frame) frame = window.requestAnimationFrame(loop); }

    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = event.pointerType !== "touch";
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { pointer.active = false; });

    if ("ResizeObserver" in window) new ResizeObserver(() => { resize(); start(); }).observe(hero);
    else window.addEventListener("resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", start);
    reducedQuery.addEventListener("change", () => { resize(); start(); });
    resize();
    start();
  }

  /* 3. Bandeau défilant des logos clients (données existantes : assets/logos). */
  function installMarquee() {
    const metrics = document.querySelector(".hero .metrics");
    if (!metrics || typeof clients === "undefined") return;
    const logos = clients.filter((client) => client.status === "current").map((client) => ({ src: client.logo, name: client.name }));
    if (!logos.length) return;
    const band = document.createElement("div");
    band.className = "container wow-marquee";
    const label = document.createElement("a");
    label.className = "wow-marquee-label";
    label.href = "/classique/clients";
    label.dataset.wowRoute = "clients";
    const track = document.createElement("div");
    track.className = "wow-marquee-track";
    track.setAttribute("aria-hidden", "true");
    const group = () => {
      const list = document.createElement("div");
      list.className = "wow-marquee-group";
      logos.forEach((logo) => {
        const item = document.createElement("span");
        item.className = "wow-marquee-item";
        const image = document.createElement("img");
        image.src = logo.src; image.alt = ""; image.loading = "lazy"; image.width = 40; image.height = 40;
        const name = document.createElement("b");
        name.textContent = logo.name;
        item.append(image, name);
        list.append(item);
      });
      return list;
    };
    track.append(group(), group());
    band.append(label, track);
    metrics.after(band);
    const updateLabel = () => {
      label.innerHTML = `<span>${t("Ils me font confiance", "They trust me")}</span><strong>${logos.length}</strong><i aria-hidden="true">↗</i>`;
      label.setAttribute("aria-label", t(`Voir les ${logos.length} clients`, `See all ${logos.length} clients`));
    };
    updateLabel();
    new MutationObserver(updateLabel).observe(root, { attributes: true, attributeFilter: ["lang"] });
  }

  /* Navigation via les liens existants (réutilise navigateToRoute de script.js). */
  function goTo(route) {
    const link = document.querySelector(`.primary-nav a[data-route-link="${route}"]`);
    if (link) link.click();
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("[data-wow-route]");
    if (!link) return;
    event.preventDefault();
    goTo(link.dataset.wowRoute);
  });

  /* 4. Transition circulaire du thème (View Transitions API). */
  function installThemeTransition() {
    const toggle = document.querySelector(".theme-toggle");
    if (!toggle) return;
    document.addEventListener("click", (event) => {
      const button = event.target.closest?.(".theme-toggle");
      if (!button || typeof document.startViewTransition !== "function" || reduced() || typeof window.setTheme !== "function") return;
      event.stopImmediatePropagation();
      event.preventDefault();
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      const transition = document.startViewTransition(() => window.setTheme(next));
      transition.ready.then(() => {
        root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 650, easing: "cubic-bezier(.65,0,.35,1)", pseudoElement: "::view-transition-new(root)" });
      }).catch(() => {});
    }, true);
  }

  /* 5. Effet « décodage » des intitulés de section à leur apparition. */
  function installScramble() {
    const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+";
    const running = new WeakMap();
    function scramble(element) {
      if (reduced() || running.has(element)) return;
      const target = element.textContent;
      if (!target.trim()) return;
      const start = performance.now();
      const duration = Math.min(900, 280 + target.length * 22);
      let written = target;
      running.set(element, true);
      function step(now) {
        if (element.textContent !== written) { running.delete(element); return; }
        const progress = Math.min((now - start) / duration, 1);
        const settled = Math.floor(progress * target.length);
        written = target.split("").map((char, index) => (index < settled || char === " " ? char : glyphs[Math.floor(Math.random() * glyphs.length)])).join("");
        element.textContent = written;
        if (progress < 1) window.requestAnimationFrame(step);
        else { element.textContent = target; running.delete(element); }
      }
      window.requestAnimationFrame(step);
    }
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) scramble(entry.target);
    }), { threshold: .6 });
    document.querySelectorAll("#main .kicker").forEach((kicker) => observer.observe(kicker));
  }

  /* 6. Notifications éphémères. */
  let toastTimer = 0;
  function toast(message) {
    let element = document.querySelector(".wow-toast");
    if (!element) {
      element = document.createElement("div");
      element.className = "wow-toast";
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
      document.body.append(element);
    }
    element.textContent = message;
    element.classList.add("on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => element.classList.remove("on"), 2400);
  }

  /* 7. Palette de commandes : Ctrl/⌘ + K ou « / ». */
  function installPalette() {
    const email = "houssounainen@gmail.com";
    const icons = {
      route: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      theme: '<path d="M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z"/>',
      lang: '<path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 4-3 7-7 8M13 21l4-9 4 9M14.5 18h5"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
      link: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
    };
    function commands() {
      const routes = Array.from(document.querySelectorAll(".primary-nav a[data-route-link]")).map((link) => ({
        group: t("Navigation", "Navigation"), icon: "route", label: link.textContent.trim(),
        run: () => goTo(link.dataset.routeLink)
      }));
      return routes.concat([
        { group: t("Actions", "Actions"), icon: "theme", label: root.dataset.theme === "dark" ? t("Passer en mode clair", "Switch to light mode") : t("Passer en mode sombre", "Switch to dark mode"), run: () => document.querySelector(".theme-toggle")?.click() },
        { group: t("Actions", "Actions"), icon: "lang", label: isFrench() ? "Switch to English" : "Passer en français", run: () => document.querySelector(".lang-toggle")?.click() },
        { group: t("Actions", "Actions"), icon: "copy", label: t("Copier mon adresse e-mail", "Copy my email address"), run: copyEmail },
        { group: t("Contact", "Contact"), icon: "link", label: "WhatsApp", run: () => window.open("https://wa.me/261344886137", "_blank", "noopener") },
        { group: t("Contact", "Contact"), icon: "link", label: "LinkedIn", run: () => window.open("https://mg.linkedin.com/in/houssounaine-nourdine-341108290", "_blank", "noopener") },
        { group: t("Contact", "Contact"), icon: "link", label: "Facebook — Houssounaine S-FCB", run: () => window.open("https://www.facebook.com/houssounainen/", "_blank", "noopener") }
      ]);
    }
    async function copyEmail() {
      try {
        await navigator.clipboard.writeText(email);
        toast(t("Adresse e-mail copiée ✓", "Email address copied ✓"));
      } catch (error) {
        window.location.href = `mailto:${email}`;
      }
    }

    const dialog = document.createElement("dialog");
    dialog.className = "wow-palette";
    dialog.innerHTML = `
      <div class="wow-palette-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input type="text" role="combobox" aria-expanded="true" aria-controls="wow-palette-list" aria-autocomplete="list" autocomplete="off" spellcheck="false">
        <kbd>Esc</kbd>
      </div>
      <ul class="wow-palette-list" id="wow-palette-list" role="listbox"></ul>
      <p class="wow-palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> <em></em></span><span><kbd>↵</kbd> <em></em></span></p>`;
    document.body.append(dialog);
    const input = dialog.querySelector("input");
    const list = dialog.querySelector(".wow-palette-list");
    let items = [], active = 0;

    const normalize = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    function render() {
      const query = normalize(input.value.trim());
      items = commands().filter((command) => !query || normalize(`${command.label} ${command.group}`).includes(query));
      active = Math.min(active, Math.max(items.length - 1, 0));
      list.innerHTML = "";
      if (!items.length) {
        const empty = document.createElement("li");
        empty.className = "wow-palette-empty";
        empty.textContent = t("Aucun résultat", "No results");
        list.append(empty);
        input.removeAttribute("aria-activedescendant");
        return;
      }
      let lastGroup = "";
      items.forEach((command, index) => {
        if (command.group !== lastGroup) {
          lastGroup = command.group;
          const heading = document.createElement("li");
          heading.className = "wow-palette-group";
          heading.setAttribute("role", "presentation");
          heading.textContent = command.group;
          list.append(heading);
        }
        const option = document.createElement("li");
        option.id = `wow-option-${index}`;
        option.className = "wow-palette-item";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(index === active));
        option.style.setProperty("--i", String(index));
        option.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[command.icon]}</svg><span></span>`;
        option.querySelector("span").textContent = command.label;
        option.addEventListener("pointermove", () => { if (active !== index) { active = index; highlight(); } });
        option.addEventListener("click", () => execute(index));
        list.append(option);
      });
      highlight();
    }
    function highlight() {
      list.querySelectorAll(".wow-palette-item").forEach((option) => option.setAttribute("aria-selected", String(option.id === `wow-option-${active}`)));
      const current = list.querySelector(`#wow-option-${active}`);
      if (current) { input.setAttribute("aria-activedescendant", current.id); current.scrollIntoView({ block: "nearest" }); }
    }
    function execute(index) {
      const command = items[index];
      if (!command) return;
      close();
      window.setTimeout(command.run, 60);
    }
    function open() {
      if (dialog.open) return;
      input.value = "";
      active = 0;
      input.placeholder = t("Rechercher une page ou une action…", "Search a page or an action…");
      input.setAttribute("aria-label", input.placeholder);
      const notes = dialog.querySelectorAll(".wow-palette-foot em");
      notes[0].textContent = t("naviguer", "navigate");
      notes[1].textContent = t("ouvrir", "open");
      render();
      dialog.showModal();
      document.body.classList.add("dialog-open");
      input.focus();
    }
    function close() {
      if (dialog.open) dialog.close();
    }
    dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
    dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    input.addEventListener("input", () => { active = 0; render(); });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); active = (active + 1) % Math.max(items.length, 1); highlight(); }
      else if (event.key === "ArrowUp") { event.preventDefault(); active = (active - 1 + items.length) % Math.max(items.length, 1); highlight(); }
      else if (event.key === "Enter") { event.preventDefault(); execute(active); }
    });

    const isTyping = (target) => target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (dialog.open) close(); else open();
        return;
      }
      if (event.key === "/" && !isTyping(event.target) && !document.querySelector("dialog[open]")) {
        event.preventDefault();
        open();
      }
    });

    /* Bouton d'accès dans la barre supérieure. */
    const actions = document.querySelector(".nav-actions");
    if (actions) {
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "wow-palette-trigger";
      const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
      const setLabel = () => {
        trigger.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><span>${t("Rechercher", "Search")}</span><kbd>${mac ? "⌘" : "Ctrl"} K</kbd>`;
        trigger.setAttribute("aria-label", t("Ouvrir la palette de commandes", "Open the command palette"));
      };
      setLabel();
      new MutationObserver(setLabel).observe(root, { attributes: true, attributeFilter: ["lang"] });
      trigger.addEventListener("click", open);
      actions.prepend(trigger);
    }
  }

  /* 8. Gerbe de particules à l'envoi du formulaire de contact. */
  function installBurst() {
    const form = document.querySelector("#contact-form");
    if (!form) return;
    form.addEventListener("submit", () => {
      if (reduced()) return;
      const button = form.querySelector('button[type="submit"]');
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const palette = ["#4fd1a3", "#a48bfa", "#f8b900", "#e5384f", "#ffffff"];
      for (let index = 0; index < 28; index++) {
        const piece = document.createElement("i");
        piece.className = "wow-confetti";
        piece.setAttribute("aria-hidden", "true");
        piece.style.left = `${rect.left + rect.width / 2}px`;
        piece.style.top = `${rect.top + rect.height / 2}px`;
        piece.style.background = palette[index % palette.length];
        document.body.append(piece);
        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 140;
        piece.animate([
          { transform: "translate(-50%, -50%) rotate(0deg)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance + 60}px)) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 }
        ], { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.16,1,.3,1)" }).onfinish = () => piece.remove();
      }
    });
  }

  /* 9. Parallaxe douce de la photo « À propos » et du filigrane du hero. */
  function installParallax() {
    const image = document.querySelector(".about-portrait img");
    if (!image) return;
    let ticking = false;
    function update() {
      ticking = false;
      if (reduced()) { image.style.removeProperty("translate"); return; }
      const rect = image.parentElement.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const offset = ((rect.top + rect.height / 2) - window.innerHeight / 2) / window.innerHeight;
      image.style.translate = `0 ${(offset * -26).toFixed(1)}px`;
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function init() {
    playIntro();
    installThemeTransition();
    installPalette();
    installBurst();
    if (!reduced()) installConstellation();
    installMarquee();
    installScramble();
    if (finePointer.matches) installParallax();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
