"use strict";

/* Modules interactifs de la page d'accueil : visionneuse « Stories », visite guidée,
   quiz « Quel service pour vous ? » et mode présentation. S'appuie sur window.HN (v2.js)
   et sur les données partagées de data.js. */
(() => {
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  const WHATSAPP = "261344886137";

  const text = {
    fr: {
      storiesLabel: "Créations en story", storyPause: "Mettre en pause", storyPlay: "Reprendre", storyPrev: "Création précédente", storyNext: "Création suivante",
      storyClose: "Fermer", storyCta: "Je veux un visuel comme celui-ci", storyCtaMessage: (title, client) => `Bonjour Houssounaine, j’ai vu « ${title} » (${client}) sur votre portfolio et j’aimerais un visuel dans ce style.`,
      highlightsLabel: "Créations par marque", highlightCount: (count) => `${count} création${count > 1 ? "s" : ""}`,
      tourStart: "Découvrir en 30 s", tourStop: "Arrêter la visite", tourLabel: "Visite guidée", tourDone: "Visite terminée — à vous de jouer !",
      tour: [
        "Houssounaine Nourdine, Lead Community Manager à Toliara : stratégie, création et influence.",
        "Master en Gestion 2026, 271 K abonnés et 100,4 M de vues Facebook en 2026.",
        "Six expertises, de la stratégie social media au pilotage de la performance.",
        "Une progression construite sur le terrain, jusqu’au poste de Lead CM chez Raiky.",
        "Dix études de cas avec le rôle, les actions et les résultats de chaque projet.",
        "51 affiches et un film en motion design, à parcourir comme des stories.",
        "21 marques accompagnées : restauration, tourisme, commerce, bien-être, médias…",
        "Une mission, un poste, un partenariat ? Écrivez-moi, je réponds vite."
      ],
      quizOpen: "Faire le test", quizKicker: "Test express · 3 questions", quizTitle: "Quel service est fait pour vous ?",
      quizLead: "Trois clics pour savoir comment je peux vous aider, avec un message déjà rédigé.",
      quizStep: (step, total) => `Question ${step} / ${total}`, quizBack: "Retour", quizRestart: "Recommencer",
      quizResult: "Ma recommandation", quizCase: "Voir un projet similaire", quizWhatsApp: "Envoyer sur WhatsApp", quizEmail: "Préparer l’e-mail",
      quizWhy: (who, need, rhythm) => `Vous êtes ${who.toLowerCase()}, vous souhaitez ${need.toLowerCase()} et vous cherchez ${rhythm.toLowerCase()}.`,
      quizMessage: (who, need, rhythm, service) => `Bonjour Houssounaine, j’ai fait le test sur votre portfolio. Profil : ${who}. Besoin : ${need}. Format : ${rhythm}. Service recommandé : ${service}. Pouvons-nous en parler ?`,
      quizSubject: (service) => `Demande — ${service}`,
      questions: [
        { title: "Vous êtes…", options: { brand: "Une entreprise ou une marque", recruiter: "Un recruteur ou un employeur", creator: "Un créateur ou une créatrice de contenu", org: "Une association, une école ou une ONG" } },
        { title: "Votre besoin principal ?", options: { visibility: "Gagner en visibilité et en abonnés", structure: "Organiser et animer mes réseaux", content: "Créer des visuels et des vidéos", automate: "Automatiser les réponses aux clients", team: "Renforcer une équipe digitale" } },
        { title: "Quel format ?", options: { oneoff: "Une campagne ponctuelle", monthly: "Un accompagnement mensuel", job: "Un poste à pourvoir", advice: "Des conseils ou une formation" } }
      ],
      deckOpen: "Mode présentation", deckClose: "Quitter la présentation", deckPrev: "Diapositive précédente", deckNext: "Diapositive suivante",
      deckHint: "← → pour naviguer · Échap pour quitter", deckClients: "Ils me font confiance", deckWorks: "Créations récentes", deckContact: "Travaillons ensemble"
    },
    en: {
      storiesLabel: "Creative work stories", storyPause: "Pause", storyPlay: "Resume", storyPrev: "Previous work", storyNext: "Next work",
      storyClose: "Close", storyCta: "I want a visual like this one", storyCtaMessage: (title, client) => `Hello Houssounaine, I saw “${title}” (${client}) on your portfolio and would like a visual in this style.`,
      highlightsLabel: "Creative work by brand", highlightCount: (count) => `${count} work${count > 1 ? "s" : ""}`,
      tourStart: "Discover in 30 s", tourStop: "Stop the tour", tourLabel: "Guided tour", tourDone: "Tour complete — over to you!",
      tour: [
        "Houssounaine Nourdine, Lead Community Manager in Toliara: strategy, creation and influence.",
        "Master’s in Management 2026, 271K followers and 100.4M Facebook views in 2026.",
        "Six areas of expertise, from social media strategy to performance management.",
        "A career built in the field, up to Lead CM at Raiky.",
        "Ten case studies with the role, actions and results of each project.",
        "51 posters and a motion design film, to browse like stories.",
        "21 brands supported: food, tourism, retail, wellness, media…",
        "A project, a job or a partnership? Write to me, I reply quickly."
      ],
      quizOpen: "Take the test", quizKicker: "Quick test · 3 questions", quizTitle: "Which service is right for you?",
      quizLead: "Three clicks to find out how I can help, with a ready-to-send message.",
      quizStep: (step, total) => `Question ${step} / ${total}`, quizBack: "Back", quizRestart: "Start again",
      quizResult: "My recommendation", quizCase: "See a similar project", quizWhatsApp: "Send on WhatsApp", quizEmail: "Prepare the email",
      quizWhy: (who, need, rhythm) => `You are ${who.toLowerCase()}, you want to ${need.toLowerCase()} and you are looking for ${rhythm.toLowerCase()}.`,
      quizMessage: (who, need, rhythm, service) => `Hello Houssounaine, I took the test on your portfolio. Profile: ${who}. Need: ${need}. Format: ${rhythm}. Recommended service: ${service}. Can we talk?`,
      quizSubject: (service) => `Request — ${service}`,
      questions: [
        { title: "You are…", options: { brand: "A business or a brand", recruiter: "A recruiter or an employer", creator: "A content creator", org: "An association, a school or an NGO" } },
        { title: "Your main need?", options: { visibility: "Grow visibility and followers", structure: "Organise and run my social media", content: "Create visuals and videos", automate: "Automate customer replies", team: "Strengthen a digital team" } },
        { title: "Which format?", options: { oneoff: "A one-off campaign", monthly: "Monthly support", job: "A job opening", advice: "Advice or training" } }
      ],
      deckOpen: "Presentation mode", deckClose: "Exit presentation", deckPrev: "Previous slide", deckNext: "Next slide",
      deckHint: "← → to navigate · Esc to exit", deckClients: "They trust me", deckWorks: "Recent work", deckContact: "Let’s work together"
    }
  };

  function init() {
    const HN = window.HN;
    if (!HN || typeof works === "undefined") return;
    const L = () => text[HN.lang()];
    const T = HN.T;
    const idx = () => (HN.lang() === "fr" ? 0 : 1);
    const reduced = HN.reduced;

    /* Logo d'une marque à partir du portefeuille clients. */
    function logoFor(client) {
      const first = client.split(/\s+/)[0].toLowerCase();
      const match = clients.find((item) => item.name === client) || clients.find((item) => item.name.toLowerCase().startsWith(first));
      return match ? HN.asset(match.logo) : null;
    }

    /* ================= 6. Visionneuse « Stories » ================= */
    const IMAGE_DURATION = 5200;
    const stories = document.createElement("dialog");
    stories.className = "stories";
    stories.innerHTML = `
      <div class="stories-stage">
        <div class="stories-bars" aria-hidden="true"></div>
        <header class="stories-head">
          <span class="stories-avatar"><img alt="" width="40" height="40"></span>
          <span class="stories-who"><strong></strong><small></small></span>
          <button class="stories-btn" type="button" data-story-pause><svg aria-hidden="true"><use href="#i-pause"/></svg></button>
          <button class="stories-btn" type="button" data-story-close>×</button>
        </header>
        <div class="stories-media">
          <img data-story-image alt="">
          <video data-story-video playsinline hidden></video>
        </div>
        <button class="stories-zone stories-prev" type="button" data-story-prev></button>
        <button class="stories-zone stories-next" type="button" data-story-next></button>
        <footer class="stories-foot">
          <p data-story-title></p>
          <a class="stories-cta" data-story-cta target="_blank" rel="noopener noreferrer"><svg aria-hidden="true"><use href="#i-whatsapp"/></svg><span></span></a>
        </footer>
      </div>`;
    document.body.append(stories);
    const story = { list: [], index: 0, start: 0, elapsed: 0, paused: false, frame: 0, duration: IMAGE_DURATION, holdTimer: 0, held: false };
    const bars = $(".stories-bars", stories);
    const image = $("[data-story-image]", stories);
    const video = $("[data-story-video]", stories);
    const pauseButton = $("[data-story-pause]", stories);

    function labelStories() {
      stories.setAttribute("aria-label", L().storiesLabel);
      $("[data-story-close]", stories).setAttribute("aria-label", L().storyClose);
      $("[data-story-prev]", stories).setAttribute("aria-label", L().storyPrev);
      $("[data-story-next]", stories).setAttribute("aria-label", L().storyNext);
      $(".stories-cta span", stories).textContent = L().storyCta;
      pauseButton.setAttribute("aria-label", story.paused ? L().storyPlay : L().storyPause);
    }
    function setProgress(ratio) {
      const bar = bars.children[story.index];
      if (bar) bar.style.setProperty("--p", Math.min(ratio, 1).toFixed(4));
    }
    function tick(now) {
      story.frame = 0;
      if (!stories.open) return;
      if (!story.paused) {
        const current = story.list[story.index];
        if (current.video && !video.paused && video.duration) {
          setProgress(video.currentTime / video.duration);
        } else if (!current.video) {
          story.elapsed += now - story.start;
          setProgress(story.elapsed / story.duration);
          if (story.elapsed >= story.duration) { go(1); return; }
        }
      }
      story.start = now;
      story.frame = window.requestAnimationFrame(tick);
    }
    function show(index) {
      story.index = index;
      story.elapsed = 0;
      story.start = performance.now();
      const item = story.list[index];
      Array.from(bars.children).forEach((bar, position) => bar.style.setProperty("--p", position < index ? "1" : "0"));
      const avatar = logoFor(item.client);
      const avatarImage = $(".stories-avatar img", stories);
      avatarImage.hidden = !avatar;
      if (avatar) avatarImage.src = avatar;
      $(".stories-avatar", stories).dataset.initial = item.client.charAt(0);
      $(".stories-who strong", stories).textContent = item.client;
      $(".stories-who small", stories).textContent = `${workSectors[item.category][idx()]} · ${String(index + 1).padStart(2, "0")}/${String(story.list.length).padStart(2, "0")}`;
      $("[data-story-title]", stories).textContent = item.title[idx()];
      $("[data-story-cta]", stories).href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(L().storyCtaMessage(item.title[idx()], item.client))}`;
      video.pause();
      if (item.video) {
        image.hidden = true;
        video.hidden = false;
        video.poster = HN.asset(item.src);
        HN.setVideoSources(video, item.video);
        video.setAttribute("aria-label", `${item.title[idx()]} — ${item.client}`);
        video.onended = () => go(1);
        const playing = video.play();
        if (playing) playing.catch(() => { video.muted = true; video.play().catch(() => {}); });
      } else {
        video.hidden = true;
        video.replaceChildren();
        image.hidden = false;
        image.src = HN.asset(item.src);
        image.alt = `${item.title[idx()]} — ${item.client}`;
        const next = story.list[index + 1];
        if (next && !next.video) new Image().src = HN.asset(next.src);
      }
      if (!reduced() && typeof image.animate === "function") {
        (item.video ? video : image).animate([{ opacity: 0, scale: 1.04 }, { opacity: 1, scale: 1 }], { duration: 420, easing: "cubic-bezier(.16,1,.3,1)" });
      }
      HN.track("view_creative_work", { work_id: item.id, viewer: "stories" });
      markSeen(item.client);
    }
    function go(step) {
      const next = story.index + step;
      if (next < 0) { show(0); return; }
      if (next >= story.list.length) { closeStories(); return; }
      show(next);
    }
    function setPaused(paused) {
      story.paused = paused;
      stories.classList.toggle("is-paused", paused);
      $("use", pauseButton).setAttribute("href", paused ? "#i-play" : "#i-pause");
      pauseButton.setAttribute("aria-label", paused ? L().storyPlay : L().storyPause);
      const item = story.list[story.index];
      if (item && item.video) { if (paused) video.pause(); else video.play().catch(() => {}); }
      story.start = performance.now();
    }
    function openStories(list, id) {
      if (!list.length) return;
      story.list = list;
      bars.replaceChildren(...list.map(() => { const bar = document.createElement("span"); bar.append(document.createElement("i")); return bar; }));
      labelStories();
      setPaused(false);
      if (!stories.open) stories.showModal();
      document.body.classList.add("locked");
      show(Math.max(list.findIndex((item) => item.id === id), 0));
      if (!story.frame) story.frame = window.requestAnimationFrame(tick);
    }
    function closeStories() {
      video.pause();
      if (stories.open) stories.close();
    }
    stories.addEventListener("close", () => {
      video.pause();
      window.cancelAnimationFrame(story.frame);
      story.frame = 0;
      if (!$("dialog[open]")) document.body.classList.remove("locked");
      renderHighlights();
    });
    $("[data-story-close]", stories).addEventListener("click", closeStories);
    pauseButton.addEventListener("click", () => setPaused(!story.paused));
    /* Appui long = pause ; appui court = précédente / suivante. */
    ["prev", "next"].forEach((side) => {
      const zone = $(`[data-story-${side}]`, stories);
      zone.addEventListener("pointerdown", () => {
        story.held = false;
        story.holdTimer = window.setTimeout(() => { story.held = true; setPaused(true); }, 260);
      });
      zone.addEventListener("pointerup", () => {
        window.clearTimeout(story.holdTimer);
        if (story.held) { setPaused(false); story.held = false; }
      });
      zone.addEventListener("click", (event) => {
        if (story.held) { event.preventDefault(); return; }
        go(side === "prev" ? -1 : 1);
      });
    });
    let touch = null;
    stories.addEventListener("touchstart", (event) => { touch = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }, { passive: true });
    stories.addEventListener("touchend", (event) => {
      if (!touch) return;
      const dx = event.changedTouches[0].clientX - touch.x;
      const dy = event.changedTouches[0].clientY - touch.y;
      touch = null;
      if (dy > 90 && Math.abs(dy) > Math.abs(dx)) closeStories();
      else if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
    });
    stories.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLVideoElement && event.key.startsWith("Arrow")) return;
      if (event.key === "ArrowRight") { event.preventDefault(); go(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); go(-1); }
      if (event.key === " ") { event.preventDefault(); setPaused(!story.paused); }
    });
    stories.addEventListener("click", (event) => { if (event.target === stories) closeStories(); });
    document.addEventListener("visibilitychange", () => { if (document.hidden && stories.open && !story.paused) setPaused(true); });
    HN.hooks.openStories = openStories;

    /* Bulles « à la une » par marque, comme sur Instagram. */
    const highlights = $("[data-highlights]");
    const seenKey = "hn-stories-seen";
    const seen = new Set((() => { try { return JSON.parse(sessionStorage.getItem(seenKey)) || []; } catch (error) { return []; } })());
    function markSeen(client) {
      seen.add(client);
      try { sessionStorage.setItem(seenKey, JSON.stringify([...seen])); } catch (error) { /* stockage indisponible */ }
    }
    function renderHighlights() {
      if (!highlights) return;
      const groups = new Map();
      works.forEach((work) => { if (!groups.has(work.client)) groups.set(work.client, []); groups.get(work.client).push(work); });
      highlights.setAttribute("aria-label", L().highlightsLabel);
      highlights.replaceChildren(...[...groups.entries()].map(([client, list]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `highlight${seen.has(client) ? " is-seen" : ""}${list.some((item) => item.video) ? " has-video" : ""}`;
        const logo = logoFor(client);
        button.innerHTML = `<span class="highlight-ring">${logo ? `<img src="${esc(logo)}" alt="" loading="lazy" width="64" height="64">` : `<b>${esc(client.charAt(0))}</b>`}</span><span class="highlight-name"></span><small></small>`;
        $(".highlight-name", button).textContent = client.replace(/\s+(Tuléar|Toliara|Shop Tuléar)$/u, "");
        $("small", button).textContent = L().highlightCount(list.length);
        button.setAttribute("aria-label", `${client} — ${L().highlightCount(list.length)}`);
        button.addEventListener("click", () => openStories(list, list[0].id));
        return button;
      }));
    }
    renderHighlights();

    /* ================= 12. Visite guidée de 30 secondes ================= */
    const tourSteps = ["top", "profil", "expertises", "parcours", "projets", "creations", "clients", "contact"];
    const STEP_TIME = 3750;
    const hud = document.createElement("div");
    hud.className = "tour";
    hud.hidden = true;
    hud.setAttribute("role", "status");
    hud.innerHTML = `<div class="tour-bar"><i></i></div><div class="tour-body"><span class="tour-step"></span><p class="tour-text"></p><button class="tour-stop" type="button">×</button></div>`;
    document.body.append(hud);
    const tour = { active: false, step: 0, timer: 0, frame: 0, startedAt: 0 };
    function smoothScroll(targetY, duration) {
      window.cancelAnimationFrame(tour.frame);
      const startY = window.scrollY;
      const distance = targetY - startY;
      if (reduced() || Math.abs(distance) < 2) { window.scrollTo({ top: targetY, behavior: "instant" }); return; }
      const begin = performance.now();
      const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const stepFrame = (now) => {
        const progress = Math.min((now - begin) / duration, 1);
        window.scrollTo({ top: startY + distance * ease(progress), behavior: "instant" });
        if (progress < 1 && tour.active) tour.frame = window.requestAnimationFrame(stepFrame);
      };
      tour.frame = window.requestAnimationFrame(stepFrame);
    }
    function tourGo(step) {
      if (!tour.active) return;
      if (step >= tourSteps.length) { stopTour(true); return; }
      tour.step = step;
      const section = document.getElementById(tourSteps[step]);
      $$(".tour-focus").forEach((element) => element.classList.remove("tour-focus"));
      if (section) {
        section.classList.add("tour-focus");
        smoothScroll(step === 0 ? 0 : section.getBoundingClientRect().top + window.scrollY - 70, 1100);
      }
      $(".tour-step", hud).textContent = `${String(step + 1).padStart(2, "0")} / ${String(tourSteps.length).padStart(2, "0")}`;
      const textElement = $(".tour-text", hud);
      textElement.textContent = L().tour[step];
      if (!reduced()) textElement.animate([{ opacity: 0, translate: "0 8px" }, { opacity: 1, translate: "0 0" }], { duration: 450, easing: "ease-out" });
      tour.timer = window.setTimeout(() => tourGo(step + 1), STEP_TIME);
    }
    function hudLoop() {
      if (!tour.active) return;
      const ratio = Math.min((performance.now() - tour.startedAt) / (STEP_TIME * tourSteps.length), 1);
      $(".tour-bar i", hud).style.transform = `scaleX(${ratio.toFixed(4)})`;
      window.requestAnimationFrame(hudLoop);
    }
    function startTour() {
      if (tour.active) return;
      tour.active = true;
      tour.startedAt = performance.now();
      hud.hidden = false;
      $(".tour-stop", hud).setAttribute("aria-label", L().tourStop);
      hud.setAttribute("aria-label", L().tourLabel);
      document.body.classList.add("touring");
      HN.track("start_guided_tour");
      window.requestAnimationFrame(hudLoop);
      /* Laisser le temps au clic de se terminer avant d'écouter les interruptions. */
      window.setTimeout(() => {
        ["wheel", "touchstart", "keydown"].forEach((type) => window.addEventListener(type, interruptTour, { passive: true }));
      }, 300);
      tourGo(0);
    }
    function interruptTour(event) {
      if (event.type === "keydown" && ["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
      stopTour(false);
    }
    function stopTour(finished) {
      if (!tour.active) return;
      tour.active = false;
      window.clearTimeout(tour.timer);
      window.cancelAnimationFrame(tour.frame);
      ["wheel", "touchstart", "keydown"].forEach((type) => window.removeEventListener(type, interruptTour));
      $$(".tour-focus").forEach((element) => element.classList.remove("tour-focus"));
      document.body.classList.remove("touring");
      hud.hidden = true;
      if (finished) { HN.toast(L().tourDone); HN.track("complete_guided_tour"); }
    }
    $(".tour-stop", hud).addEventListener("click", () => stopTour(false));
    $$("[data-tour]").forEach((button) => button.addEventListener("click", startTour));

    /* ================= 13. Quiz « Quel service pour vous ? » ================= */
    const SERVICES = ["service1", "service2", "service3", "service4", "service5", "service6"];
    const SCORES = {
      brand: { service2: 2, service1: 1 }, recruiter: { service5: 3, service1: 1 }, creator: { service6: 3, service3: 1 }, org: { service1: 2, service3: 1 },
      visibility: { service2: 3, service4: 2 }, structure: { service1: 3, service5: 1 }, content: { service3: 4 }, automate: { service2: 2, service4: 1 }, team: { service5: 4 },
      oneoff: { service3: 1, service2: 1 }, monthly: { service1: 2, service4: 1 }, job: { service5: 3 }, advice: { service6: 2, service2: 1 }
    };
    const CASE_FOR_NEED = { visibility: "sfcb", structure: "tfc", content: "le-jardin", automate: "wedis", team: "raiky" };
    const TYPE_FOR = { recruiter: "Recrutement", job: "Recrutement", advice: "Mission de conseil", creator: "Partenariat ou influence" };
    const quiz = document.createElement("dialog");
    quiz.className = "modal quiz";
    document.body.append(quiz);
    const answers = [];
    function renderQuiz() {
      const l = L();
      const step = answers.length;
      if (step >= l.questions.length) { renderResult(); return; }
      const question = l.questions[step];
      quiz.innerHTML = `
        <button class="modal-close" type="button" data-quiz-close aria-label="${esc(T("close"))}">×</button>
        <p class="label"><span>${esc(l.quizKicker)}</span></p>
        <h2 class="quiz-title">${esc(l.quizTitle)}</h2>
        <div class="quiz-progress" aria-hidden="true">${l.questions.map((_, index) => `<i class="${index < step ? "done" : index === step ? "now" : ""}"></i>`).join("")}</div>
        <p class="quiz-step">${esc(l.quizStep(step + 1, l.questions.length))}</p>
        <h3 class="quiz-question" tabindex="-1">${esc(question.title)}</h3>
        <div class="quiz-options">${Object.entries(question.options).map(([key, label], index) => `<button type="button" class="quiz-option" data-answer="${key}" style="--i:${index}"><span>${esc(label)}</span><svg aria-hidden="true"><use href="#i-arrow"/></svg></button>`).join("")}</div>
        ${step ? `<button class="quiz-back" type="button" data-quiz-back>← ${esc(l.quizBack)}</button>` : ""}`;
      bindQuiz();
      $(".quiz-question", quiz).focus({ preventScroll: true });
    }
    function scoreFor() {
      const totals = Object.fromEntries(SERVICES.map((key) => [key, 0]));
      answers.forEach((answer) => Object.entries(SCORES[answer] || {}).forEach(([key, value]) => { totals[key] += value; }));
      return SERVICES.reduce((best, key) => (totals[key] > totals[best] ? key : best), SERVICES[0]);
    }
    function renderResult() {
      const l = L();
      const service = scoreFor();
      const [who, need, rhythm] = answers.map((answer, index) => l.questions[index].options[answer]);
      const serviceTitle = T(`${service}Title`);
      const caseId = CASE_FOR_NEED[answers[1]] || "raiky";
      const message = l.quizMessage(who, need, rhythm, serviceTitle);
      HN.track("complete_service_quiz", { service, need: answers[1] });
      quiz.innerHTML = `
        <button class="modal-close" type="button" data-quiz-close aria-label="${esc(T("close"))}">×</button>
        <p class="label"><span>${esc(l.quizResult)}</span></p>
        <div class="quiz-result">
          <span class="quiz-badge">0${SERVICES.indexOf(service) + 1}</span>
          <h2 tabindex="-1">${esc(serviceTitle)}</h2>
          <p class="quiz-service">${esc(T(`${service}Body`))}</p>
          <p class="quiz-why">${esc(l.quizWhy(who, need, rhythm))}</p>
        </div>
        <div class="quiz-actions">
          <a class="btn btn-solid btn-pill" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}" target="_blank" rel="noopener noreferrer" data-quiz-whatsapp><span>${esc(l.quizWhatsApp)}</span><span class="btn-arrow" aria-hidden="true"><svg><use href="#i-whatsapp"/></svg></span></a>
          <button class="btn btn-line" type="button" data-quiz-email>${esc(l.quizEmail)}</button>
          <button class="btn btn-line" type="button" data-quiz-case>${esc(l.quizCase)} · ${esc(projectData[caseId].title)}</button>
        </div>
        <button class="quiz-back" type="button" data-quiz-restart>↺ ${esc(l.quizRestart)}</button>`;
      bindQuiz();
      $("[data-quiz-email]", quiz).addEventListener("click", () => {
        const form = $("[data-contact-form]");
        quiz.close();
        if (form) {
          form.elements.subject.value = l.quizSubject(serviceTitle);
          form.elements.message.value = message;
          const type = form.querySelector(`input[name="type"][value="${TYPE_FOR[answers[0]] || TYPE_FOR[answers[2]] || "Mission de conseil"}"]`);
          if (type) type.checked = true;
          document.getElementById("contact").scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
          window.setTimeout(() => form.elements.name.focus({ preventScroll: true }), reduced() ? 0 : 700);
        }
      });
      $("[data-quiz-case]", quiz).addEventListener("click", () => { quiz.close(); HN.openCase(caseId); });
      if (!reduced()) $(".quiz-result", quiz).animate([{ opacity: 0, scale: .94 }, { opacity: 1, scale: 1 }], { duration: 520, easing: "cubic-bezier(.16,1,.3,1)" });
      $(".quiz-result h2", quiz).focus({ preventScroll: true });
      burst($(".quiz-badge", quiz));
    }
    function bindQuiz() {
      $("[data-quiz-close]", quiz).addEventListener("click", () => quiz.close());
      $$("[data-answer]", quiz).forEach((button) => button.addEventListener("click", () => { answers.push(button.dataset.answer); renderQuiz(); }));
      $("[data-quiz-back]", quiz)?.addEventListener("click", () => { answers.pop(); renderQuiz(); });
      $("[data-quiz-restart]", quiz)?.addEventListener("click", () => { answers.length = 0; renderQuiz(); });
    }
    function burst(anchor) {
      if (!anchor || reduced()) return;
      const rect = anchor.getBoundingClientRect();
      const colors = ["#22c55e", "#38bdf8", "#f43f5e", "#a3e635", "#ffffff"];
      for (let index = 0; index < 26; index++) {
        const piece = document.createElement("i");
        piece.className = "confetti";
        piece.style.background = colors[index % colors.length];
        piece.style.left = `${rect.left + rect.width / 2}px`;
        piece.style.top = `${rect.top + rect.height / 2}px`;
        quiz.append(piece);
        const angle = Math.random() * Math.PI * 2;
        const distance = 70 + Math.random() * 130;
        piece.animate([
          { transform: "translate(-50%, -50%) rotate(0)", opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance + 50}px)) rotate(${Math.random() * 600 - 300}deg)`, opacity: 0 }
        ], { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.16,1,.3,1)" }).onfinish = () => piece.remove();
      }
    }
    quiz.addEventListener("close", () => { if (!$("dialog[open]")) document.body.classList.remove("locked"); });
    quiz.addEventListener("click", (event) => { if (event.target === quiz) quiz.close(); });
    $$("[data-quiz-open]").forEach((button) => button.addEventListener("click", () => {
      answers.length = 0;
      renderQuiz();
      HN.openModal(quiz);
      HN.track("start_service_quiz");
    }));
    function labelQuizButtons() {
      $$("[data-quiz-label]").forEach((element) => { element.textContent = L()[element.dataset.quizLabel]; });
    }

    /* ================= 14. Mode présentation ================= */
    const deck = document.createElement("dialog");
    deck.className = "deck";
    document.body.append(deck);
    const deckState = { index: 0, slides: [] };
    function slideHTML() {
      const l = L();
      const i = idx();
      const metrics = [
        ["271 K+", T("metricFollowers")], [HN.lang() === "fr" ? "100,4 M" : "100.4 M", T("metricViews")], ["24", T("metricClients")]
      ];
      const steps = [
        ["2026", "raikyLeadTitle"], ["2025", "raikyInternTitle"], ["2024", "betTitle"], ["2024", "treasurerTitle"], ["2022", "akamaTitle"], ["2017", "personalMedia"]
      ];
      const featuredCases = HN.cases.slice(0, 4);
      const recent = works.filter((work) => !work.video).slice(0, 8);
      const logos = clients.filter((client) => client.status === "current");
      return [
        `<section class="slide slide-cover">
           <div><p class="greeting">${esc(T("heroGreeting"))}</p><h2>Houssounaine <span class="grad-text">Nourdine.</span></h2>
           <p class="slide-role">${esc(T("heroEyebrow"))}</p><p class="slide-lead">${esc(T("heroIntro"))}</p></div>
           <img src="${HN.asset("assets/portrait-hero-cutout.webp")}" alt="" class="slide-portrait">
         </section>`,
        `<section class="slide">
           <p class="label"><i>01</i><span>${esc(T("aboutKicker"))}</span></p><h2>${esc(T("aboutTitle"))}</h2>
           <p class="slide-lead">${esc(T("aboutLead"))}</p>
           <div class="slide-metrics">${metrics.map(([value, label]) => `<div><strong>${esc(value)}</strong><span>${esc(label)}</span></div>`).join("")}</div>
         </section>`,
        `<section class="slide">
           <p class="label"><i>02</i><span>${esc(T("expertiseKicker"))}</span></p><h2>${esc(T("expertiseTitle"))}</h2>
           <ol class="slide-services">${SERVICES.map((key, index) => `<li><b>0${index + 1}</b><strong>${esc(T(`${key}Title`))}</strong><span>${esc(T(`${key}Body`))}</span></li>`).join("")}</ol>
         </section>`,
        `<section class="slide">
           <p class="label"><i>03</i><span>${esc(T("journeyKicker"))}</span></p><h2>${esc(T("journeyTitle"))}</h2>
           <ol class="slide-timeline">${steps.map(([year, key]) => `<li><b>${year}</b><span>${esc(key === "personalMedia" ? "Houssounaine S-FCB" : T(key))}</span></li>`).join("")}</ol>
           <p class="slide-note">🎓 ${esc(T("masterTitle"))} · ${esc(T("masterStatus"))}</p>
         </section>`,
        `<section class="slide">
           <p class="label"><i>04</i><span>${esc(T("projectsKicker"))}</span></p><h2>${esc(T("projectsTitle"))}</h2>
           <div class="slide-cases">${featuredCases.map((item) => `<article><img src="${HN.asset(item.logo)}" alt="" width="48" height="48"><h3>${esc(projectData[item.id].title)}</h3><p>${esc(T(item.summary))}</p><strong>${esc(item.proof)}</strong><small>${esc(T(item.proofKey))}</small></article>`).join("")}</div>
         </section>`,
        `<section class="slide">
           <p class="label"><i>05</i><span>${esc(l.deckWorks)}</span></p><h2>${esc(T("worksTitle"))}</h2>
           <div class="slide-works">${recent.map((work) => `<img src="${HN.asset(work.src)}" alt="${esc(`${work.title[i]} — ${work.client}`)}" loading="lazy">`).join("")}</div>
         </section>`,
        `<section class="slide">
           <p class="label"><i>06</i><span>${esc(l.deckClients)}</span></p><h2>${esc(T("clientsTitle"))}</h2>
           <div class="slide-logos">${logos.map((client) => `<figure><img src="${HN.asset(client.logo)}" alt="" width="72" height="72"><figcaption>${esc(client.name)}</figcaption></figure>`).join("")}</div>
         </section>`,
        `<section class="slide slide-end">
           <div><h2 class="script">${esc(T("thanks"))}</h2><p class="slide-lead">${esc(l.deckContact)}</p>
           <ul class="slide-contact"><li><svg aria-hidden="true"><use href="#i-mail"/></svg>houssounainen@gmail.com</li><li><svg aria-hidden="true"><use href="#i-whatsapp"/></svg>+261 34 48 861 37</li><li><svg aria-hidden="true"><use href="#i-globe"/></svg>houssounainenourdine.vercel.app</li></ul></div>
           <img src="${HN.asset("assets/qr-portfolio.svg")}" alt="QR code" class="slide-qr">
         </section>`
      ];
    }
    function renderDeck() {
      const l = L();
      deckState.slides = slideHTML();
      deck.setAttribute("aria-label", l.deckOpen);
      deck.innerHTML = `
        <div class="deck-track">${deckState.slides.join("")}</div>
        <div class="deck-ui">
          <span class="deck-brand">Houssounaine Nourdine · Portfolio 2026</span>
          <span class="deck-count" aria-live="polite"></span>
          <button class="deck-btn" type="button" data-deck-prev aria-label="${esc(l.deckPrev)}">←</button>
          <button class="deck-btn" type="button" data-deck-next aria-label="${esc(l.deckNext)}">→</button>
          <button class="deck-btn" type="button" data-deck-close aria-label="${esc(l.deckClose)}">×</button>
        </div>
        <div class="deck-progress" aria-hidden="true"><i></i></div>
        <p class="deck-hint">${esc(l.deckHint)}</p>`;
      $("[data-deck-prev]", deck).addEventListener("click", () => deckGo(deckState.index - 1));
      $("[data-deck-next]", deck).addEventListener("click", () => deckGo(deckState.index + 1));
      $("[data-deck-close]", deck).addEventListener("click", closeDeck);
      deckGo(deckState.index, true);
    }
    function deckGo(index, instant = false) {
      const slides = $$(".slide", deck);
      if (!slides.length) return;
      const previous = deckState.index;
      deckState.index = Math.max(0, Math.min(index, slides.length - 1));
      slides.forEach((slide, position) => {
        slide.classList.toggle("is-on", position === deckState.index);
        slide.classList.toggle("is-before", position < deckState.index);
        slide.setAttribute("aria-hidden", String(position !== deckState.index));
      });
      if (instant || reduced()) slides.forEach((slide) => slide.classList.add("no-anim"));
      else slides.forEach((slide) => slide.classList.remove("no-anim"));
      $(".deck-count", deck).textContent = `${String(deckState.index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      $(".deck-progress i", deck).style.transform = `scaleX(${((deckState.index + 1) / slides.length).toFixed(3)})`;
      $("[data-deck-prev]", deck).disabled = deckState.index === 0;
      $("[data-deck-next]", deck).disabled = deckState.index === slides.length - 1;
      if (previous !== deckState.index) HN.track("presentation_slide", { slide: deckState.index + 1 });
    }
    function openDeck() {
      deckState.index = 0;
      renderDeck();
      deck.showModal();
      document.body.classList.add("locked");
      if (deck.requestFullscreen && !document.fullscreenElement) deck.requestFullscreen().catch(() => {});
      HN.track("open_presentation");
    }
    function closeDeck() {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (deck.open) deck.close();
    }
    deck.addEventListener("close", () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      if (!$("dialog[open]")) document.body.classList.remove("locked");
    });
    deck.addEventListener("keydown", (event) => {
      if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); deckGo(deckState.index + 1); }
      if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); deckGo(deckState.index - 1); }
      if (event.key === "Home") { event.preventDefault(); deckGo(0); }
      if (event.key === "End") { event.preventDefault(); deckGo(deckState.slides.length - 1); }
    });
    let deckTouch = null;
    deck.addEventListener("touchstart", (event) => { deckTouch = event.touches[0].clientX; }, { passive: true });
    deck.addEventListener("touchend", (event) => {
      if (deckTouch === null) return;
      const dx = event.changedTouches[0].clientX - deckTouch;
      deckTouch = null;
      if (Math.abs(dx) > 50) deckGo(deckState.index + (dx < 0 ? 1 : -1));
    });
    /* Quitter le plein écran (Échap) ferme aussi la présentation. */
    document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && deck.open) deck.close(); });
    $$("[data-deck-open]").forEach((button) => button.addEventListener("click", openDeck));

    /* Langue : mise à jour des libellés et des contenus ouverts. */
    function relabel() {
      labelStories();
      renderHighlights();
      labelQuizButtons();
      $$("[data-tour] [data-tour-label]").forEach((element) => { element.textContent = L().tourStart; });
      $$("[data-deck-open]").forEach((button) => button.setAttribute("aria-label", L().deckOpen));
      if (stories.open) show(story.index);
      if (quiz.open) renderQuiz();
      if (deck.open) renderDeck();
    }
    document.addEventListener("hn:lang", relabel);
    relabel();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
