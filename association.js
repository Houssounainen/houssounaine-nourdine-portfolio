"use strict";

/* Rubrique Association (AEDBVT) — simulation complète.
   Toutes les données sont fictives et restent dans le navigateur du visiteur (localStorage). */
(() => {
  const root = document.querySelector("#aed-app");
  if (!root) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ } },
    del(key) { try { localStorage.removeItem(key); } catch { /* stockage indisponible */ } }
  };

  const KEY = "aedbvt_state_v1";
  const COTISATION = 30000;
  const LOGO = "assets/aedbvt-logo.webp";
  const ar = (n) => `${Number(n).toLocaleString("fr-FR")} Ar`;
  const parse = (s) => new Date(s);
  const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fmtDate = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const fmtTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const fmtMonth = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  const ICONS = {
    dash: '<path d="M4 11 12 4l8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
    news: '<path d="M5 4h11v16H5z"/><path d="M16 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3"/>',
    events: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    meetings: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    members: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.5M17 14a5 5 0 0 1 4 5"/>',
    org: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
    pay: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
    alerts: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    warn: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17v.5"/>',
    circle: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;

  const TABS = [
    ["dash", "Accueil"], ["news", "Actualités"], ["events", "Événements"], ["meetings", "Réunions"], ["members", "Membres"],
    ["org", "Organigramme"], ["pay", "Paiements"], ["alerts", "Alertes & annonces"], ["info", "Infos"]
  ];

  /* ---------- Données de démonstration ---------- */
  function seed() {
    return {
      tab: "dash", role: "membre", seen: [], rsvp: {}, newsCat: "Toutes", newsQ: "", memQ: "", memV: "Tous", selDay: null, cal: null, orgSel: "pres",
      members: [
        { id: 1, name: "Abdou Salim", village: "Darsalama", filiere: "Droit", niveau: "Master 1", role: "Président" },
        { id: 2, name: "Fatima Said", village: "Bandrani-Vouani", filiere: "Économie & Gestion", niveau: "Licence 3", role: "Vice-présidente" },
        { id: 3, name: "Ibrahim Mze", village: "Darsalama", filiere: "Informatique", niveau: "Licence 3", role: "Secrétaire général" },
        { id: 4, name: "Nadjat Ahmed", village: "Bandrani-Vouani", filiere: "Économie & Gestion", niveau: "Master 1", role: "Trésorière" },
        { id: 5, name: "Soilihi Youssouf", village: "Darsalama", filiere: "Sciences", niveau: "Master 2", role: "Commissaire aux comptes" },
        { id: 6, name: "Zaharia Ali", village: "Bandrani-Vouani", filiere: "Médecine", niveau: "3e année", role: "Membre" },
        { id: 7, name: "Mouhidine Ben", village: "Darsalama", filiere: "Lettres", niveau: "Licence 2", role: "Membre" },
        { id: 8, name: "Rahma Abdallah", village: "Bandrani-Vouani", filiere: "Droit", niveau: "Licence 1", role: "Membre" },
        { id: 9, name: "Ahmed Kassim", village: "Darsalama", filiere: "Sciences", niveau: "Licence 2", role: "Membre" },
        { id: 10, name: "Mariama Toihir", village: "Bandrani-Vouani", filiere: "Lettres", niveau: "Licence 3", role: "Resp. Vie étudiante" },
        { id: 11, name: "Anfane Mohamed", village: "Darsalama", filiere: "Communication", niveau: "Master 2", role: "Resp. Communication" },
        { id: 12, name: "Saadia Nassur", village: "Bandrani-Vouani", filiere: "Économie & Gestion", niveau: "Licence 2", role: "Resp. Cotisations" },
        { id: 13, name: "Yahaya Said", village: "Darsalama", filiere: "Médecine", niveau: "2e année", role: "Resp. Social & solidarité" },
        { id: 14, name: "Bacar Hamadi", village: "Darsalama", filiere: "Informatique", niveau: "Licence 1", role: "Membre" },
        { id: 15, name: "Sitti Djaé", village: "Bandrani-Vouani", filiere: "Sciences", niveau: "Licence 1", role: "Membre" },
        { id: 16, name: "Moustoifa Ali", village: "Darsalama", filiere: "Droit", niveau: "Licence 2", role: "Membre" }
      ],
      payments: [
        { id: 1, mid: 1, amount: 30000, method: "MVola", date: "2026-09-02", ref: "AED-2026-0001" },
        { id: 2, mid: 2, amount: 30000, method: "Orange Money", date: "2026-09-03", ref: "AED-2026-0002" },
        { id: 3, mid: 3, amount: 30000, method: "Espèces", date: "2026-09-04", ref: "AED-2026-0003" },
        { id: 4, mid: 4, amount: 30000, method: "MVola", date: "2026-09-05", ref: "AED-2026-0004" },
        { id: 5, mid: 5, amount: 15000, method: "Airtel Money", date: "2026-09-06", ref: "AED-2026-0005" },
        { id: 6, mid: 6, amount: 30000, method: "Orange Money", date: "2026-09-08", ref: "AED-2026-0006" },
        { id: 7, mid: 7, amount: 15000, method: "Espèces", date: "2026-09-09", ref: "AED-2026-0007" },
        { id: 8, mid: 9, amount: 30000, method: "MVola", date: "2026-09-11", ref: "AED-2026-0008" },
        { id: 9, mid: 10, amount: 30000, method: "MVola", date: "2026-09-12", ref: "AED-2026-0009" },
        { id: 10, mid: 11, amount: 30000, method: "Orange Money", date: "2026-09-14", ref: "AED-2026-0010" },
        { id: 11, mid: 12, amount: 10000, method: "Espèces", date: "2026-09-15", ref: "AED-2026-0011" },
        { id: 12, mid: 13, amount: 30000, method: "Airtel Money", date: "2026-09-16", ref: "AED-2026-0012" }
      ],
      expenses: [
        { id: 1, label: "Impression des affiches de l’AG", amount: 12000, date: "2026-09-10" },
        { id: 2, label: "Rafraîchissements — accueil des bacheliers", amount: 25000, date: "2026-09-14" }
      ],
      events: [
        { id: 1, title: "Sortie de fin d’année universitaire", date: "2026-06-27T09:00:00", place: "Bord de mer, Tuléar", type: "Culturel", desc: "Journée conviviale pour clôturer l’année.", going: 38 },
        { id: 2, title: "Assemblée générale de rentrée", date: "2026-10-04T15:00:00", place: "Salle de réunion (à confirmer)", type: "Assemblée", desc: "Bilan moral et financier, calendrier 2026-2027, élection des responsables de commission.", going: 24 },
        { id: 3, title: "Accueil des nouveaux bacheliers", date: "2026-10-11T09:00:00", place: "Campus (à confirmer)", type: "Académique", desc: "Guide de la vie étudiante à Tuléar, logement, inscriptions, parrainage.", going: 31 },
        { id: 4, title: "Tournoi de football inter-villages", date: "2026-10-25T14:00:00", place: "Terrain (à confirmer)", type: "Sport", desc: "Darsalama contre Bandrani-Vouani, dans un esprit fair-play.", going: 45 },
        { id: 5, title: "Journée de solidarité", date: "2026-11-08T08:30:00", place: "Tuléar", type: "Solidarité", desc: "Collecte et entraide entre membres.", going: 19 },
        { id: 6, title: "Conférence « Réussir ses études »", date: "2026-11-22T16:00:00", place: "Amphithéâtre (à confirmer)", type: "Académique", desc: "Méthodes de travail, mémoires, orientation.", going: 27 },
        { id: 7, title: "Soirée culturelle", date: "2026-12-13T18:00:00", place: "À définir", type: "Culturel", desc: "Chants, danses et gastronomie de nos villages.", going: 52 }
      ],
      meetings: [
        { id: 1, title: "Réunion du bureau", date: "2026-09-13T18:00:00", mode: "Présentiel", place: "Tuléar", agenda: ["Bilan de l’été", "Préparation de la rentrée"], pv: "Le bureau a validé le lancement de la campagne de cotisation et la création de cet espace en ligne. Tâches réparties entre les commissions." },
        { id: 2, title: "Réunion du bureau", date: "2026-09-27T18:00:00", mode: "Visio", place: "Lien envoyé aux membres du bureau", agenda: ["Préparation de l’AG du 4 octobre", "Campagne de cotisation 2026-2027", "Budget de l’accueil des nouveaux", "Questions diverses"], pv: null },
        { id: 3, title: "Assemblée générale de rentrée", date: "2026-10-04T15:00:00", mode: "Présentiel", place: "Salle de réunion (à confirmer)", agenda: ["Bilan moral", "Bilan financier", "Calendrier 2026-2027", "Élection des responsables de commission"], pv: null },
        { id: 4, title: "Réunion des commissions", date: "2026-10-18T18:00:00", mode: "Visio", place: "Lien envoyé aux responsables", agenda: ["Points d’avancement par commission", "Organisation du tournoi"], pv: null }
      ],
      news: [
        { id: 1, title: "Notre association a désormais son espace en ligne", cat: "Annonce", date: "2026-09-20", excerpt: "Retrouvez ici toutes les informations de l’AEDBVT.", body: "Actualités, événements, réunions, membres, organigramme, cotisations et annonces sont réunis dans un seul espace, accessible depuis le téléphone." },
        { id: 2, title: "Lancement de la campagne de cotisation 2026-2027", cat: "Vie associative", date: "2026-09-18", excerpt: "La cotisation annuelle est fixée à 30 000 Ar.", body: "Le paiement peut se faire par MVola, Orange Money, Airtel Money ou en espèces auprès de la trésorière. Un reçu numéroté est délivré pour chaque versement." },
        { id: 3, title: "Rentrée universitaire : le guide pratique des nouveaux", cat: "Académique", date: "2026-09-15", excerpt: "Inscriptions, logement, transports : l’essentiel à savoir.", body: "Nos anciens partagent leurs conseils pour bien démarrer à Tuléar. Un parrain ou une marraine est attribué à chaque nouveau bachelier." },
        { id: 4, title: "Permanence d’aide aux inscriptions", cat: "Académique", date: "2026-09-10", excerpt: "Des membres vous aident pour vos démarches.", body: "Une permanence est assurée chaque week-end par la commission Vie étudiante pour aider les nouveaux dans leurs démarches administratives." },
        { id: 5, title: "Collecte solidaire : merci aux participants", cat: "Solidarité", date: "2026-09-08", excerpt: "Un bel élan de générosité entre membres.", body: "La commission Social & solidarité remercie tous les membres qui ont contribué. Le détail sera présenté à l’assemblée générale." }
      ],
      alerts: [
        { id: 1, level: "alerte", title: "Cotisation : échéance le 31 octobre", msg: "Pensez à régler votre cotisation 2026-2027 avant la date limite.", date: "2026-09-18", pinned: true },+        { id: 2, level: "info", title: "AG de rentrée le 4 octobre", msg: "La présence de tous les membres est attendue.", date: "2026-09-17", pinned: true },
        { id: 3, level: "urgent", title: "Réunion du bureau confirmée le 27 septembre", msg: "Elle se tiendra à 18h00, en visioconférence.", date: "2026-09-19", pinned: false }
      ]
    };
  }

  const ORG = {
    id: "ag", title: "Assemblée générale", sub: "Instance suprême", mission: "Tous les membres se réunissent pour voter le bilan, le budget et élire le bureau.",
    children: [{
      id: "pres", title: "Président", mid: 1, mission: "Représente l’association, dirige le bureau et veille à l’application des décisions.",
      children: [
        { id: "vp", title: "Vice-présidente", mid: 2, mission: "Seconde le président et coordonne les commissions.", children: [{ id: "vie", title: "Vie étudiante", mid: 10, mission: "Accueil des nouveaux, parrainage, activités culturelles et sportives." }] },
        { id: "sg", title: "Secrétaire général", mid: 3, mission: "Rédige les comptes rendus, tient le registre des membres et les archives.", children: [{ id: "com", title: "Communication", mid: 11, mission: "Réseaux sociaux, affiches, annonces et espace en ligne de l’association." }] },
        { id: "tres", title: "Trésorière", mid: 4, mission: "Encaisse les cotisations, tient la caisse et présente le bilan financier.", children: [{ id: "cot", title: "Cotisations", mid: 12, mission: "Suivi des paiements, rappels et délivrance des reçus." }] },
        { id: "cac", title: "Commissaire aux comptes", mid: 5, mission: "Contrôle la régularité des comptes et rend compte à l’assemblée.", children: [{ id: "soc", title: "Social & solidarité", mid: 13, mission: "Entraide entre membres, collectes et soutien en cas de difficulté." }] }
      ]
    }]
  };

  let S = store.get(KEY, null) || seed();

  /* ---------- Sélecteurs de données ---------- */
  const save = () => store.set(KEY, S);
  const nextId = (list) => list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const member = (id) => S.members.find((m) => m.id === id);
  const paidBy = (id) => S.payments.filter((p) => p.mid === id).reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = () => S.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalExpenses = () => S.expenses.reduce((sum, e) => sum + e.amount, 0);
  const upcoming = (list) => list.filter((item) => parse(item.date) >= new Date()).sort((a, b) => parse(a.date) - parse(b.date));
  const nextEvent = () => upcoming(S.events)[0];
  const nextMeeting = () => upcoming(S.meetings)[0];
  const daysTo = (date) => { const d = Math.ceil((parse(date) - new Date()) / 864e5); return d <= 0 ? "Aujourd’hui" : `J-${d}`; };
  const statusOf = (id) => { const p = paidBy(id); return p >= COTISATION ? ["Soldé", "aed-b-ok"] : p > 0 ? ["Partiel", "aed-b-part"] : ["En attente", "aed-b-no"]; };
  const initials = (name) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const isBureau = () => S.role === "bureau";
  const unseen = () => S.alerts.filter((a) => !S.seen.includes(a.id)).length;
  const todayKey = () => dayKey(new Date());

  if (!S.cal) { const base = nextEvent() ? parse(nextEvent().date) : new Date(); S.cal = { y: base.getFullYear(), m: base.getMonth() }; }

  const findOrg = (node, id) => { if (node.id === id) return node; for (const child of node.children || []) { const found = findOrg(child, id); if (found) return found; } return null; };
  const orgNode = (node, isRoot) => {
    const m = node.mid ? member(node.mid) : null;
    return `<li><button class="aed-node${isRoot ? " root" : ""}${S.orgSel === node.id ? " on" : ""}" type="button" data-aed="org" data-id="${node.id}"><b>${esc(node.title)}</b><span>${m ? esc(m.name) : esc(node.sub || "")}</span></button>${node.children ? `<ul>${node.children.map((c) => orgNode(c)).join("")}</ul>` : ""}</li>`;
  };

  /* ---------- Rendu des rubriques ---------- */
  const newsCard = (n) => `<article class="aed-card aed-hov"><div class="aed-meta"><span class="aed-badge aed-b-info">${esc(n.cat)}</span>${fmtDate.format(parse(n.date))}</div><h4>${esc(n.title)}</h4><p>${esc(n.excerpt)}</p><details class="aed-news" style="margin-top:10px"><summary>Lire la suite</summary><p>${esc(n.body)}</p>${isBureau() ? `<button class="aed-btn aed-danger aed-sm" style="margin-top:10px" type="button" data-aed="del" data-k="news" data-id="${n.id}">Supprimer</button>` : ""}</details></article>`;

  const memberFiltered = () => {
    const q = S.memQ.toLowerCase();
    return S.members.filter((m) => (S.memV === "Tous" || m.village === S.memV) && (!q || `${m.name} ${m.filiere} ${m.role}`.toLowerCase().includes(q)));
  };
  const memberCards = (list) => list.length ? list.map((m, i) => {
    const st = statusOf(m.id);
    return `<div class="aed-card aed-hov aed-mem" style="animation:aedPanel 520ms ${i * 40}ms both"><div class="aed-mav ${m.village === "Darsalama" ? "dar" : "ban"}">${initials(m.name)}</div><div style="flex:1;min-width:0"><b>${esc(m.name)}</b><small>${esc(m.role)}<br>${esc(m.filiere)} · ${esc(m.niveau)}</small><div style="margin-top:6px"><span class="aed-badge ${st[1]}">${st[0]}</span></div></div>${isBureau() && m.id > 16 ? `<button class="aed-btn aed-danger aed-sm" type="button" data-aed="del" data-k="members" data-id="${m.id}" aria-label="Supprimer">×</button>` : ""}</div>`;
  }).join("") : '<div class="aed-empty">Aucun membre trouvé.</div>';

  const newsFiltered = () => {
    const q = S.newsQ.toLowerCase();
    return S.news.filter((n) => (S.newsCat === "Toutes" || n.cat === S.newsCat) && (!q || `${n.title} ${n.excerpt} ${n.body}`.toLowerCase().includes(q))).sort((a, b) => parse(b.date) - parse(a.date));
  };

  function calendarHtml() {
    const { y, m } = S.cal;
    const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), marks = {}, today = todayKey();
    S.events.forEach((e) => { (marks[dayKey(parse(e.date))] ||= {}).e = 1; });
    S.meetings.forEach((e) => { (marks[dayKey(parse(e.date))] ||= {}).m = 1; });
    let html = `<div class="aed-cal-h"><button class="aed-tool" type="button" data-aed="cal" data-v="-1" aria-label="Mois précédent">‹</button><b>${fmtMonth.format(first)}</b><button class="aed-tool" type="button" data-aed="cal" data-v="1" aria-label="Mois suivant">›</button></div><div class="aed-cal">`;
    ["L", "M", "M", "J", "V", "S", "D"].forEach((d) => { html += `<div class="aed-dn">${d}</div>`; });
    for (let i = 0; i < offset; i++) html += "<div></div>";
    for (let d = 1; d <= days; d++) {
      const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, mark = marks[key] || {};
      html += `<button type="button" class="${key === today ? "today " : ""}${S.selDay === key ? "sel" : ""}" data-aed="day" data-v="${key}">${d}${mark.e || mark.m ? `<span class="dots">${mark.e ? "<s></s>" : ""}${mark.m ? '<s class="m"></s>' : ""}</span>` : ""}</button>`;
    }
    return `${html}</div><div class="aed-leg"><span><i></i>Événement</span><span><i class="m"></i>Réunion</span></div>`;
  }

  const R = {};

  R.dash = () => {
    const ev = nextEvent(), mt = nextMeeting(), paid = totalPaid(), target = S.members.length * COTISATION, pct = Math.min(100, Math.round(paid / target * 100)), circ = 2 * Math.PI * 40;
    const recent = S.payments.slice().sort((a, b) => b.id - a.id).slice(0, 4);
    return `<div class="aed-grid aed-g4">
      <div class="aed-card aed-stat" style="--c:var(--aed-blue)"><small>Membres</small><span class="aed-num" data-count="${S.members.length}">0</span><small>Darsalama · Bandrani-Vouani</small></div>
      <div class="aed-card aed-stat" style="--c:var(--aed-gold)"><small>Cotisations 2026-2027</small><div class="aed-row"><div class="aed-ring"><svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true"><circle class="aed-ring-bg" cx="48" cy="48" r="40" fill="none" stroke-width="9"/><circle class="aed-ring-fg" cx="48" cy="48" r="40" fill="none" stroke-width="9" stroke-dasharray="${circ}" stroke-dashoffset="${circ}" data-off="${circ * (1 - pct / 100)}"/></svg><b data-count="${pct}" data-suf=" %">0 %</b></div><small>${ar(paid)}<br>sur ${ar(target)}</small></div></div>
      <div class="aed-card aed-stat" style="--c:var(--aed-red)"><small>Prochain événement</small><span class="aed-num">${ev ? daysTo(ev.date) : "—"}</span><small>${ev ? esc(ev.title) : "Aucun événement prévu"}</small></div>
      <div class="aed-card aed-stat" style="--c:var(--aed-green)"><small>Alertes actives</small><span class="aed-num" data-count="${S.alerts.length}">0</span><small>${S.alerts.filter((a) => a.level === "urgent").length} urgente(s)</small></div>
    </div>
    <div class="aed-split" style="margin-top:18px"><div class="aed-stack"><h3 class="aed-h4" style="margin:0">À la une</h3>${S.news.slice().sort((a, b) => parse(b.date) - parse(a.date)).slice(0, 3).map(newsCard).join("")}</div>
    <div class="aed-stack"><h3 class="aed-h4" style="margin:0">Agenda</h3>
      ${ev ? `<div class="aed-card aed-hov"><span class="aed-badge aed-b-info">${esc(ev.type)}</span><h4>${esc(ev.title)}</h4><div class="aed-meta"><span>${fmtDate.format(parse(ev.date))} · ${fmtTime.format(parse(ev.date))}</span><span>${esc(ev.place)}</span></div><div class="aed-row" style="margin-top:12px"><button class="aed-btn aed-primary aed-sm" type="button" data-aed="rsvp" data-id="e${ev.id}">${S.rsvp[`e${ev.id}`] ? "✓ Je participe" : "Je participe"}</button></div></div>` : ""}
      ${mt ? `<div class="aed-card aed-hov"><span class="aed-badge aed-b-part">${esc(mt.mode)}</span><h4>${esc(mt.title)}</h4><div class="aed-meta"><span>${fmtDate.format(parse(mt.date))} · ${fmtTime.format(parse(mt.date))}</span></div><ul style="margin:10px 0 0;padding-left:18px;color:var(--text-muted);font-size:14px">${mt.agenda.slice(0, 3).map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>` : ""}
      <h3 class="aed-h4" style="margin:6px 0 0">Activité récente</h3>
      <div class="aed-card" style="padding:6px 16px">${recent.map((p) => { const m = member(p.mid); return `<div class="aed-row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span><b>${esc(m ? m.name : "?")}</b><br><small class="aed-muted">${esc(p.method)} · ${p.date}</small></span><span class="aed-badge aed-b-ok">+ ${ar(p.amount)}</span></div>`; }).join("")}</div>
    </div></div>`;
  };

  R.news = () => {
    const cats = ["Toutes", "Vie associative", "Académique", "Solidarité", "Annonce"], list = newsFiltered();
    return `<div class="aed-ph"><h3>Actualités</h3>${isBureau() ? '<button class="aed-btn aed-primary aed-sm" type="button" data-aed="open-pub">+ Publier</button>' : ""}</div>
      <input class="aed-input aed-search" id="aed-newsq" type="search" placeholder="Rechercher une actualité…" aria-label="Rechercher une actualité" value="${esc(S.newsQ)}">
      <div class="aed-chips">${cats.map((c) => `<button class="filter-button${S.newsCat === c ? " active" : ""}" type="button" data-aed="ncat" data-v="${c}">${c}</button>`).join("")}</div>
      <div class="aed-grid aed-g2" id="aed-newslist">${list.length ? list.map(newsCard).join("") : '<div class="aed-empty">Aucune actualité trouvée.</div>'}</div>`;
  };

  R.events = () => {
    const now = new Date();
    let list = S.events.slice().sort((a, b) => parse(a.date) - parse(b.date));
    if (S.selDay) list = list.filter((e) => dayKey(parse(e.date)) === S.selDay);
    return `<div class="aed-ph"><h3>Événements</h3>${isBureau() ? '<button class="aed-btn aed-primary aed-sm" type="button" data-aed="open-ev">+ Événement</button>' : ""}</div>
      <div class="aed-split"><div class="aed-card">${calendarHtml()}${S.selDay ? `<button class="aed-btn aed-ghost aed-sm" style="margin-top:12px" type="button" data-aed="day" data-v="${S.selDay}">Voir tous les événements</button>` : ""}</div>
      <div class="aed-stack">${list.length ? list.map((e) => {
        const d = parse(e.date), past = d < now, going = Boolean(S.rsvp[`e${e.id}`]);
        return `<div class="aed-ev${past ? " past" : ""}"><div class="aed-date"><b>${d.getDate()}</b><small>${MONTHS[d.getMonth()]}</small></div><div><span class="aed-badge aed-b-info">${esc(e.type)}</span><b style="display:block;margin-top:4px">${esc(e.title)}</b><div class="aed-meta"><span>${fmtTime.format(d)}</span><span>${esc(e.place)}</span></div><div class="aed-meta" style="margin-top:4px">${esc(e.desc)}</div></div><div class="aed-act">${past ? '<span class="aed-badge aed-b-no">Terminé</span>' : `<button class="aed-btn ${going ? "aed-primary" : "aed-ghost"} aed-sm" type="button" data-aed="rsvp" data-id="e${e.id}">${going ? "✓ J’y vais" : "Participer"}</button><div class="aed-meta" style="margin-top:6px">${e.going + (going ? 1 : 0)} inscrits</div>`}${isBureau() ? `<button class="aed-btn aed-danger aed-sm" style="margin-top:6px" type="button" data-aed="del" data-k="events" data-id="${e.id}" aria-label="Supprimer">×</button>` : ""}</div></div>`;
      }).join("") : '<div class="aed-empty">Aucun événement ce jour-là.</div>'}</div></div>`;
  };

  R.meetings = () => {
    const up = upcoming(S.meetings), past = S.meetings.filter((m) => parse(m.date) < new Date()).sort((a, b) => parse(b.date) - parse(a.date));
    const card = (m, isPast) => {
      const d = parse(m.date), ok = Boolean(S.rsvp[`m${m.id}`]);
      return `<div class="aed-card aed-hov"><div class="aed-row" style="justify-content:space-between"><span class="aed-badge ${m.mode === "Visio" ? "aed-b-part" : "aed-b-info"}">${esc(m.mode)}</span>${isPast ? '<span class="aed-badge aed-b-ok">PV disponible</span>' : `<span class="aed-badge aed-b-no">${daysTo(m.date)}</span>`}</div><h4>${esc(m.title)}</h4><div class="aed-meta"><span>${fmtDate.format(d)} · ${fmtTime.format(d)}</span><span>${esc(m.place)}</span></div><b style="display:block;margin-top:12px;font-size:13px">Ordre du jour</b><ol style="margin:6px 0 0;padding-left:18px;color:var(--text-muted);font-size:14px">${m.agenda.map((a) => `<li>${esc(a)}</li>`).join("")}</ol>${isPast && m.pv ? `<details class="aed-news" style="margin-top:12px"><summary>Lire le compte rendu</summary><p>${esc(m.pv)}</p></details>` : ""}${!isPast ? `<div class="aed-row" style="margin-top:14px"><button class="aed-btn ${ok ? "aed-primary" : "aed-ghost"} aed-sm" type="button" data-aed="rsvp" data-id="m${m.id}">${ok ? "✓ Présence confirmée" : "Confirmer ma présence"}</button></div>` : ""}</div>`;
    };
    return `<div class="aed-ph"><h3>Réunions</h3></div><h4 class="aed-h4" style="margin-top:0">À venir</h4><div class="aed-grid aed-g2">${up.length ? up.map((m) => card(m, false)).join("") : '<div class="aed-empty">Aucune réunion planifiée.</div>'}</div><h4 class="aed-h4">Passées</h4><div class="aed-grid aed-g2">${past.map((m) => card(m, true)).join("")}</div>`;
  };

  R.members = () => {
    const list = memberFiltered();
    return `<div class="aed-ph"><h3>Membres <span class="aed-badge aed-b-info" id="aed-memcount">${list.length}</span></h3>${isBureau() ? '<button class="aed-btn aed-primary aed-sm" type="button" data-aed="open-mem">+ Membre</button>' : ""}</div>
      <input class="aed-input aed-search" id="aed-memq" type="search" placeholder="Nom, filière, rôle…" aria-label="Rechercher un membre" value="${esc(S.memQ)}">
      <div class="aed-chips">${["Tous", "Darsalama", "Bandrani-Vouani"].map((v) => `<button class="filter-button${S.memV === v ? " active" : ""}" type="button" data-aed="mv" data-v="${v}">${v}</button>`).join("")}</div>
      <div class="aed-grid aed-g3" id="aed-memlist">${memberCards(list)}</div>`;
  };

  R.org = () => {
    const node = findOrg(ORG, S.orgSel) || ORG, m = node.mid ? member(node.mid) : null;
    return `<div class="aed-ph"><h3>Organigramme</h3><span class="aed-meta">Touchez un poste pour voir sa mission</span></div><div class="aed-tree"><ul>${orgNode(ORG, true)}</ul></div>
      <div class="aed-card"><div class="aed-mem">${m ? `<div class="aed-mav ${m.village === "Darsalama" ? "dar" : "ban"}">${initials(m.name)}</div>` : '<div class="aed-mav dar">AG</div>'}<div><b>${esc(node.title)}</b><small>${m ? `${esc(m.name)} · ${esc(m.village)}` : esc(node.sub || "")}</small></div></div><p style="margin-top:12px">${esc(node.mission)}</p></div>`;
  };

  R.pay = () => {
    const paid = totalPaid(), target = S.members.length * COTISATION, pct = Math.min(100, Math.round(paid / target * 100)), cash = paid - totalExpenses();
    const rows = S.members.map((m) => {
      const p = paidBy(m.id), st = statusOf(m.id), last = S.payments.filter((x) => x.mid === m.id).sort((a, b) => b.id - a.id)[0];
      return `<tr><td><b>${esc(m.name)}</b></td><td>${ar(p)}</td><td>${ar(Math.max(0, COTISATION - p))}</td><td><span class="aed-badge ${st[1]}">${st[0]}</span></td><td>${last ? `<button class="aed-btn aed-ghost aed-sm" type="button" data-aed="receipt" data-id="${last.id}">Reçu</button>` : "—"}</td></tr>`;
    }).join("");
    return `<div class="aed-ph"><h3>Paiements & cotisations</h3><button class="aed-btn aed-primary aed-sm" type="button" data-aed="open-pay">${isBureau() ? "Enregistrer un paiement" : "Payer ma cotisation"}</button></div>
      <div class="aed-grid aed-g4"><div class="aed-card aed-stat"><small>Collecté</small><span class="aed-num" data-count="${paid}">0</span><small>Ariary</small></div><div class="aed-card aed-stat" style="--c:var(--aed-gold)"><small>Objectif</small><span class="aed-num">${target.toLocaleString("fr-FR")}</span><small>${S.members.length} × ${COTISATION.toLocaleString("fr-FR")} Ar</small></div><div class="aed-card aed-stat" style="--c:var(--aed-red)"><small>Reste à collecter</small><span class="aed-num" data-count="${Math.max(0, target - paid)}">0</span><small>Ariary</small></div><div class="aed-card aed-stat" style="--c:var(--aed-green)"><small>Solde de caisse</small><span class="aed-num" data-count="${cash}">0</span><small>après dépenses</small></div></div>
      <div class="aed-card" style="margin-top:16px"><div class="aed-row" style="justify-content:space-between;margin-bottom:8px"><b>Progression de la campagne</b><b>${pct} %</b></div><div class="aed-track"><i data-w="${pct}"></i></div></div>
      <div class="aed-card aed-tw" style="margin-top:16px;padding:8px 12px"><table class="aed-table"><thead><tr><th>Membre</th><th>Versé</th><th>Reste</th><th>Statut</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
      <h4 class="aed-h4">Dépenses</h4><div class="aed-card" style="padding:6px 16px">${S.expenses.map((x) => `<div class="aed-row" style="justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span>${esc(x.label)}<br><small class="aed-muted">${x.date}</small></span><span class="aed-badge aed-b-no">− ${ar(x.amount)}</span></div>`).join("")}</div>
      <p class="aed-note">Simulation : aucun vrai paiement n’est effectué.</p>`;
  };

  R.alerts = () => {
    const order = { urgent: 0, alerte: 1, info: 2 }, glyph = { urgent: "warn", alerte: "warn", info: "circle" };
    const list = S.alerts.slice().sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (order[a.level] - order[b.level]) || (b.id - a.id));
    return `<div class="aed-ph"><h3>Alertes & annonces</h3>${isBureau() ? '<button class="aed-btn aed-primary aed-sm" type="button" data-aed="open-alert">+ Nouvelle annonce</button>' : ""}</div>
      <div class="aed-stack">${list.length ? list.map((a, i) => `<div class="aed-alert ${a.level}" style="animation-delay:${i * 60}ms">${icon(glyph[a.level])}<div style="flex:1"><div class="aed-row" style="justify-content:space-between"><b>${esc(a.title)}</b>${a.pinned ? '<span class="aed-badge aed-b-part">Épinglée</span>' : ""}</div><div class="aed-muted" style="margin-top:4px;font-size:14px">${esc(a.msg)}</div><div class="aed-meta" style="margin-top:6px">${fmtDate.format(parse(a.date))}</div>${isBureau() ? `<div class="aed-row" style="margin-top:10px"><button class="aed-btn aed-ghost aed-sm" type="button" data-aed="pin" data-id="${a.id}">${a.pinned ? "Désépingler" : "Épingler"}</button><button class="aed-btn aed-danger aed-sm" type="button" data-aed="del" data-k="alerts" data-id="${a.id}">Supprimer</button></div>` : ""}</div></div>`).join("") : '<div class="aed-empty">Aucune alerte pour le moment.</div>'}</div>`;
  };

  R.info = () => {
    const docs = ["Statuts de l’association", "Règlement intérieur", "Modèle de compte rendu", "Fiche d’adhésion"];
    const faq = [
      ["Comment adhérer à l’AEDBVT ?", "Toute étudiante ou tout étudiant originaire de Darsalama ou de Bandrani-Vouani à Tuléar peut adhérer en remplissant la fiche d’adhésion et en réglant sa cotisation."],
      ["Comment payer ma cotisation ?", "Par MVola, Orange Money, Airtel Money ou en espèces auprès de la trésorière. Un reçu numéroté vous est remis."],
      ["Comment recevoir les alertes ?", "Ouvrez l’onglet « Alertes & annonces » : les alertes épinglées défilent aussi en haut de cet espace."],
      ["Comment proposer une idée d’événement ?", "Contactez la commission Vie étudiante ou présentez votre idée en assemblée générale."]
    ];
    return `<div class="aed-ph"><h3>Informations</h3></div><div class="aed-split"><div class="aed-stack">
      <div class="aed-card"><h4 style="margin-top:0">Qui sommes-nous ?</h4><p>L’AEDBVT rassemble, soutient et accompagne les étudiants de Darsalama et de Bandrani-Vouani à Tuléar : entraide, vie associative, réussite académique et solidarité.</p></div>
      <div class="aed-card"><h4 style="margin-top:0">Documents</h4><div class="aed-stack" style="margin-top:10px">${docs.map((d) => `<div class="aed-row" style="justify-content:space-between"><span>${d}</span><button class="aed-btn aed-ghost aed-sm" type="button" data-aed="doc">Consulter</button></div>`).join("")}</div></div>
      <div class="aed-card"><h4 style="margin-top:0">Contact</h4><p>Adresse e-mail, téléphone et permanences : à compléter par le bureau.</p></div>
    </div><div class="aed-stack"><h4 class="aed-h4" style="margin:0">Questions fréquentes</h4>${faq.map((f) => `<details class="aed-faq"><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join("")}</div></div>`;
  };

  /* ---------- Squelette, moteur de rendu ---------- */
  root.innerHTML = `
    <div class="aed-bar">
      <div class="aed-seg" role="group" aria-label="Type de vue"><button type="button" data-aed="role" data-v="membre">Vue Membre</button><button type="button" data-aed="role" data-v="bureau">Vue Bureau</button></div>
      <div class="aed-row"><button class="aed-tool" type="button" data-aed="tab" data-v="alerts" aria-label="Alertes">${icon("alerts")}<span class="aed-count" id="aed-bell" hidden>0</span></button><button class="aed-tool" type="button" data-aed="reset" title="Réinitialiser la démonstration">↺ Démo</button></div>
    </div>
    <div class="aed-ticker" aria-label="Alertes épinglées"><div id="aed-ticker"></div></div>
    <div class="aed-tabs" id="aed-tabs" role="tablist" aria-label="Rubriques de l’association"><span class="aed-ind" id="aed-ind"></span></div>
    <div class="aed-panel" id="aed-panel" role="tabpanel" aria-live="polite"></div>`;

  const modal = document.createElement("div");
  modal.className = "aed-modal";
  modal.innerHTML = '<div class="aed-sheet" id="aed-sheet" role="dialog" aria-modal="true" tabindex="-1"></div>';
  const toastEl = document.createElement("div");
  toastEl.className = "aed-toast";
  toastEl.setAttribute("role", "status");
  document.body.append(modal, toastEl);

  const panel = $("#aed-panel");
  const sheet = $("#aed-sheet", modal);

  function paintTicker() {
    const pinned = S.alerts.filter((a) => a.pinned || a.level === "urgent");
    const text = pinned.length ? pinned.map((a) => `<span><b>${esc(a.title)}</b> — ${esc(a.msg)}</span>`).join("") : "<span>Bienvenue sur l’espace de l’AEDBVT</span>";
    $("#aed-ticker").innerHTML = text + text;
  }
  function paintChrome() {
    $$('[data-aed="role"]', root).forEach((b) => { const on = b.dataset.v === S.role; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
    const n = unseen(), bell = $("#aed-bell");
    bell.hidden = !n; bell.textContent = n;
    paintTicker();
  }
  function renderTabs() {
    const bar = $("#aed-tabs");
    $$(".aed-tab", bar).forEach((b) => b.remove());
    TABS.forEach(([id, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = `aed-tab${S.tab === id ? " on" : ""}`; b.dataset.aed = "tab"; b.dataset.v = id;
      b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(S.tab === id));
      b.innerHTML = `${icon(id)}<span>${label}</span>`;
      bar.append(b);
    });
    moveIndicator(true);
  }
  function moveIndicator(scroll) {
    const on = $(".aed-tab.on"), ind = $("#aed-ind"), bar = $("#aed-tabs");
    if (!on || !ind) return;
    ind.style.width = `${on.offsetWidth}px`;
    ind.style.transform = `translateX(${on.offsetLeft}px)`;
    if (scroll && bar.scrollTo) bar.scrollTo({ left: Math.max(0, on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2), behavior: reduced ? "auto" : "smooth" });
  }

  function countUp(el) {
    const to = parseFloat(el.dataset.count), suffix = el.dataset.suf || "", duration = reduced ? 1 : 1200;
    let start = null;
    const step = (t) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1), v = Math.round(to * (1 - Math.pow(1 - p, 3)));
      el.textContent = `${v.toLocaleString("fr-FR")}${suffix}`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function animateIn(scope) {
    $$("[data-count]", scope).forEach(countUp);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$(".aed-track i[data-w]", scope).forEach((b) => { b.style.width = `${b.dataset.w}%`; });
      $$(".aed-ring-fg[data-off]", scope).forEach((r) => { r.style.strokeDashoffset = r.dataset.off; });
    }));
  }
  function render() {
    panel.style.animation = "none"; void panel.offsetWidth; panel.style.animation = "";
    panel.innerHTML = R[S.tab]();
    animateIn(panel);
    paintChrome();
    if (S.tab === "alerts" && unseen()) { S.seen = S.alerts.map((a) => a.id); save(); setTimeout(paintChrome, 700); }
  }
  function go(tab) { S.tab = tab; save(); renderTabs(); render(); }

  /* ---------- Fenêtres, notifications, confettis ---------- */
  let toastTimer;
  function toast(message) { toastEl.textContent = message; toastEl.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600); }
  function openModal(html) { sheet.innerHTML = html; modal.classList.add("open"); sheet.focus({ preventScroll: true }); }
  function closeModal() { modal.classList.remove("open"); }
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("open")) closeModal(); });
  function confetti() {
    if (reduced) return;
    const colors = ["#f8b900", "#2a5bd7", "#e5384f", "#4fd1a3", "#ffffff"];
    for (let i = 0; i < 48; i++) {
      const piece = document.createElement("div");
      piece.className = "aed-conf";
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = colors[i % colors.length];
      piece.style.setProperty("--x", `${Math.random() * 160 - 80}px`);
      piece.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
      piece.style.animationDelay = `${Math.random() * .4}s`;
      document.body.append(piece);
      setTimeout(() => piece.remove(), 3800);
    }
  }

  const val = (id) => { const el = $(`#${id}`, modal); return el ? el.value.trim() : ""; };
  const memberOptions = (selected) => S.members.map((m) => `<option value="${m.id}"${m.id === selected ? " selected" : ""}>${esc(m.name)}</option>`).join("");
  let payMethod = "MVola";

  function payForm() {
    payMethod = "MVola";
    const first = S.members.find((m) => paidBy(m.id) < COTISATION) || S.members[0];
    openModal(`<h3>${isBureau() ? "Enregistrer un paiement" : "Payer ma cotisation"}</h3>
      <label class="aed-f">Membre<select class="aed-input" id="pmem">${memberOptions(first.id)}</select></label>
      <label class="aed-f">Montant (Ar)<input class="aed-input" id="pamt" type="number" min="1000" step="1000" value="${COTISATION}"></label>
      <div class="aed-f">Moyen de paiement<div class="aed-pm">${["MVola", "Orange Money", "Airtel Money", "Espèces"].map((m) => `<button type="button" data-aed="pm" data-v="${m}" class="${m === payMethod ? "on" : ""}">${m}</button>`).join("")}</div></div>
      <label class="aed-f">Numéro / référence (facultatif)<input class="aed-input" id="pref" placeholder="034 00 000 00"></label>
      <div class="aed-row" style="justify-content:flex-end;margin-top:6px"><button class="aed-btn aed-ghost aed-sm" type="button" data-aed="close">Annuler</button><button class="aed-btn aed-primary aed-sm" type="button" data-aed="do-pay">Confirmer (simulation)</button></div>`);
    const select = $("#pmem", modal);
    const update = () => { $("#pamt", modal).value = Math.max(1000, COTISATION - paidBy(parseInt(select.value, 10))); };
    select.addEventListener("change", update); update();
  }
  function receiptHtml(p) {
    const m = member(p.mid) || { name: "—", village: "" };
    return `<div class="aed-receipt"><span class="aed-stamp">SIMULATION</span><img src="${LOGO}" alt="AEDBVT" width="64" height="64"><h3 style="margin:8px 0 2px">Reçu de cotisation</h3><small class="aed-muted">${esc(p.ref)}</small><dl><dt>Membre</dt><dd>${esc(m.name)}</dd><dt>Village</dt><dd>${esc(m.village)}</dd><dt>Montant</dt><dd>${ar(p.amount)}</dd><dt>Moyen</dt><dd>${esc(p.method)}</dd><dt>Date</dt><dd>${esc(p.date)}</dd><dt>Objet</dt><dd>Cotisation 2026-2027</dd></dl><small class="aed-muted">Association des Étudiants de Darsalama et Bandrani-Vouani à Tuléar</small></div><div class="aed-row" style="justify-content:flex-end;margin-top:14px"><button class="aed-btn aed-primary aed-sm" type="button" data-aed="close">Fermer</button></div>`;
  }+  const pubForm = () => openModal(`<h3>Publier une actualité</h3><label class="aed-f">Titre<input class="aed-input" id="nt"></label><label class="aed-f">Catégorie<select class="aed-input" id="nc"><option>Vie associative</option><option>Académique</option><option>Solidarité</option><option>Annonce</option></select></label><label class="aed-f">Résumé<input class="aed-input" id="ne"></label><label class="aed-f">Contenu<textarea class="aed-input" id="nb" rows="4"></textarea></label><div class="aed-row" style="justify-content:flex-end"><button class="aed-btn aed-ghost aed-sm" type="button" data-aed="close">Annuler</button><button class="aed-btn aed-primary aed-sm" type="button" data-aed="do-pub">Publier</button></div>`);
  const evForm = () => openModal(`<h3>Nouvel événement</h3><label class="aed-f">Titre<input class="aed-input" id="et"></label><label class="aed-f">Date et heure<input class="aed-input" id="ed" type="datetime-local"></label><label class="aed-f">Lieu<input class="aed-input" id="ep"></label><label class="aed-f">Type<select class="aed-input" id="ey"><option>Assemblée</option><option>Culturel</option><option>Sport</option><option>Solidarité</option><option>Académique</option></select></label><label class="aed-f">Description<textarea class="aed-input" id="es" rows="3"></textarea></label><div class="aed-row" style="justify-content:flex-end"><button class="aed-btn aed-ghost aed-sm" type="button" data-aed="close">Annuler</button><button class="aed-btn aed-primary aed-sm" type="button" data-aed="do-ev">Ajouter</button></div>`);
  const memForm = () => openModal(`<h3>Nouveau membre</h3><label class="aed-f">Nom complet<input class="aed-input" id="mn"></label><label class="aed-f">Village<select class="aed-input" id="mv"><option>Darsalama</option><option>Bandrani-Vouani</option></select></label><label class="aed-f">Filière<input class="aed-input" id="mf"></label><label class="aed-f">Niveau<input class="aed-input" id="ml" placeholder="Licence 1"></label><div class="aed-row" style="justify-content:flex-end"><button class="aed-btn aed-ghost aed-sm" type="button" data-aed="close">Annuler</button><button class="aed-btn aed-primary aed-sm" type="button" data-aed="do-mem">Ajouter</button></div>`);
  const alertForm = () => openModal(`<h3>Nouvelle annonce</h3><label class="aed-f">Titre<input class="aed-input" id="at"></label><label class="aed-f">Niveau<select class="aed-input" id="al"><option value="info">Information</option><option value="alerte">Alerte</option><option value="urgent">Urgent</option></select></label><label class="aed-f">Message<textarea class="aed-input" id="am" rows="3"></textarea></label><label class="aed-row" style="margin-bottom:12px;font-size:13px;font-weight:700"><input type="checkbox" id="ap" checked> Épingler dans le bandeau défilant</label><div class="aed-row" style="justify-content:flex-end"><button class="aed-btn aed-ghost aed-sm" type="button" data-aed="close">Annuler</button><button class="aed-btn aed-primary aed-sm" type="button" data-aed="do-alert">Diffuser</button></div>`);

  /* ---------- Actions ---------- */
  const A = {
    tab: (t) => go(t.dataset.v),
    role: (t) => { S.role = t.dataset.v; save(); render(); toast(S.role === "bureau" ? "Vue Bureau : outils de gestion activés" : "Vue Membre"); },
    reset: () => { store.del(KEY); S = seed(); const b = nextEvent() ? parse(nextEvent().date) : new Date(); S.cal = { y: b.getFullYear(), m: b.getMonth() }; save(); renderTabs(); render(); toast("Démonstration réinitialisée"); },
    ncat: (t) => { S.newsCat = t.dataset.v; save(); render(); },
    mv: (t) => { S.memV = t.dataset.v; save(); render(); },
    rsvp: (t) => { const k = t.dataset.id; if (S.rsvp[k]) { delete S.rsvp[k]; toast("Participation annulée"); } else { S.rsvp[k] = 1; toast("Participation enregistrée"); confetti(); } save(); render(); },
    cal: (t) => { let m = S.cal.m + parseInt(t.dataset.v, 10), y = S.cal.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } S.cal = { y, m }; save(); render(); },
    day: (t) => { S.selDay = S.selDay === t.dataset.v ? null : t.dataset.v; save(); render(); },
    org: (t) => { S.orgSel = t.dataset.id; save(); render(); },
    pin: (t) => { const a = S.alerts.find((x) => String(x.id) === t.dataset.id); if (a) a.pinned = !a.pinned; save(); render(); },
    del: (t) => { const k = t.dataset.k, id = parseInt(t.dataset.id, 10); S[k] = S[k].filter((x) => x.id !== id); save(); render(); toast("Supprimé"); },
    doc: () => toast("Document de démonstration — bientôt disponible"),
    close: closeModal,
    "open-pay": payForm, "open-pub": pubForm, "open-ev": evForm, "open-mem": memForm, "open-alert": alertForm,
    pm: (t) => { payMethod = t.dataset.v; $$(".aed-pm button", modal).forEach((b) => b.classList.toggle("on", b === t)); },
    receipt: (t) => { const p = S.payments.find((x) => String(x.id) === t.dataset.id); if (p) openModal(receiptHtml(p)); },
    "do-pay": () => {
      const mid = parseInt(val("pmem"), 10), amount = parseInt(val("pamt"), 10);
      if (!amount || amount < 1000) { toast("Montant invalide"); return; }
      openModal(`<div style="text-align:center;padding:16px 0"><div class="aed-spin"></div><b>Traitement du paiement ${esc(payMethod)}…</b><br><small class="aed-muted">Simulation en cours</small></div>`);
      setTimeout(() => {
        const n = nextId(S.payments), p = { id: n, mid, amount, method: payMethod, date: todayKey(), ref: `AED-${new Date().getFullYear()}-${String(n).padStart(4, "0")}` };
        S.payments.push(p); save();
        openModal(`<h3 style="text-align:center">Paiement enregistré</h3>${receiptHtml(p)}`);
        confetti(); render();
      }, 1400);
    },
    "do-pub": () => { const title = val("nt"); if (!title) { toast("Ajoutez un titre"); return; } S.news.push({ id: nextId(S.news), title, cat: val("nc"), date: todayKey(), excerpt: val("ne") || title, body: val("nb") || val("ne") || title }); save(); closeModal(); render(); toast("Actualité publiée"); confetti(); },
    "do-ev": () => { const title = val("et"), date = val("ed"); if (!title || !date) { toast("Titre et date requis"); return; } S.events.push({ id: nextId(S.events), title, date: date.length === 16 ? `${date}:00` : date, place: val("ep") || "À définir", type: val("ey"), desc: val("es"), going: 0 }); save(); closeModal(); render(); toast("Événement ajouté"); },
    "do-mem": () => { const name = val("mn"); if (!name) { toast("Nom requis"); return; } S.members.push({ id: nextId(S.members), name, village: val("mv"), filiere: val("mf") || "—", niveau: val("ml") || "—", role: "Membre" }); save(); closeModal(); render(); toast("Membre ajouté"); },
    "do-alert": () => { const title = val("at"); if (!title) { toast("Ajoutez un titre"); return; } S.alerts.push({ id: nextId(S.alerts), level: val("al"), title, msg: val("am"), date: todayKey(), pinned: $("#ap", modal).checked }); save(); closeModal(); render(); toast("Annonce diffusée"); }
  };

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-aed]");
    if (!target || !(root.contains(target) || modal.contains(target))) return;
    const action = A[target.dataset.aed];
    if (action) { event.preventDefault(); action(target); }
  });
  root.addEventListener("input", (event) => {
    if (event.target.id === "aed-newsq") {
      S.newsQ = event.target.value;
      const list = newsFiltered();
      $("#aed-newslist").innerHTML = list.length ? list.map(newsCard).join("") : '<div class="aed-empty">Aucune actualité trouvée.</div>';
    }
    if (event.target.id === "aed-memq") {
      S.memQ = event.target.value;
      const list = memberFiltered();
      $("#aed-memlist").innerHTML = memberCards(list);
      $("#aed-memcount").textContent = list.length;
    }
  });
  window.addEventListener("resize", () => moveIndicator(false));
  /* La rubrique est masquée au chargement : on recale l'indicateur dès qu'elle devient visible. */
  const section = root.closest("[data-route]");
  if (section && "MutationObserver" in window) {
    new MutationObserver(() => { if (!section.hidden) requestAnimationFrame(() => moveIndicator(true)); }).observe(section, { attributes: true, attributeFilter: ["hidden"] });
  }

  renderTabs();
  render();
})();
