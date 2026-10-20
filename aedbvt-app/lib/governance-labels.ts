/** Libellés français des statuts de gouvernance et des signalements (jamais de valeur brute en anglais à l’écran). */

export type Tone = "ok" | "info" | "warn" | "danger" | "muted";

export const ASSEMBLY_STATUS: Record<string, [string, Tone]> = {
  draft: ["Brouillon", "muted"], published: ["Convoquée", "info"], open: ["Séance ouverte", "ok"],
  closed: ["Clôturée", "muted"], archived: ["Archivée", "muted"], cancelled: ["Annulée", "danger"],
};
export const ASSEMBLY_ACTIONS: Record<string, string> = {
  published: "Publier la convocation", open: "Ouvrir la séance", closed: "Clôturer", archived: "Archiver",
};
export const ELECTION_STATUS: Record<string, [string, Tone]> = {
  draft: ["Brouillon", "muted"], published: ["Candidatures ouvertes", "info"], open: ["Scrutin ouvert", "ok"],
  closed: ["Clôturée", "muted"], cancelled: ["Annulée", "danger"],
};
export const ELECTION_ACTIONS: Record<string, string> = {
  published: "Publier", open: "Ouvrir le scrutin", closed: "Clôturer", cancelled: "Annuler",
};
export const MOTION_STATUS: Record<string, [string, Tone]> = {
  draft: ["Brouillon", "muted"], open: ["Vote ouvert", "ok"], closed: ["Vote clos", "muted"], cancelled: ["Annulée", "danger"],
};
export const PROXY_STATUS: Record<string, [string, Tone]> = {
  pending: ["En attente", "warn"], accepted: ["Acceptée", "ok"], revoked: ["Révoquée", "muted"], rejected: ["Refusée", "danger"],
};
export const CANDIDATE_STATUS: Record<string, [string, Tone]> = {
  pending: ["En attente de validation", "warn"], approved: ["Candidature validée", "ok"], withdrawn: ["Retirée", "muted"], rejected: ["Refusée", "danger"],
};
export const VERSION_STATUS: Record<string, [string, Tone]> = {
  draft: ["Brouillon", "muted"], review: ["En revue", "warn"], approved: ["Approuvée", "info"], published: ["En vigueur", "ok"],
  superseded: ["Remplacée", "muted"], rejected: ["Rejetée", "danger"],
};
export const AMENDMENT_STATUS: Record<string, [string, Tone]> = {
  proposed: ["Proposé", "info"], review: ["En revue", "warn"], adopted: ["Adopté", "ok"], rejected: ["Rejeté", "danger"], withdrawn: ["Retiré", "muted"],
};
export const APPROVAL_DECISION: Record<string, [string, Tone]> = { approved: ["Approuvé", "ok"], rejected: ["Rejeté", "danger"] };
export const DECISION_TYPE: Record<string, string> = {
  motion: "Motion", election: "Élection", administrative: "Administrative", document: "Texte officiel", other: "Autre", assembly: "Assemblée",
};
export const DECISION_OUTCOME: Record<string, [string, Tone]> = {
  adopted: ["Adoptée", "ok"], rejected: ["Rejetée", "danger"], noted: ["Prise d’acte", "info"], elected: ["Élu·e", "ok"],
  cancelled: ["Annulée", "muted"], published: ["Publiée", "ok"], recorded: ["Consignée", "info"], withdrawn: ["Retirée", "muted"],
};
export const TASK_STATUS: Record<string, string> = {
  backlog: "À planifier", todo: "À faire", in_progress: "En cours", blocked: "Bloquée", done: "Terminée", cancelled: "Annulée",
};
export const APP_ROLE: Record<string, string> = {
  admin: "Administrateur", bureau: "Bureau", tresorier: "Trésorier", secretaire: "Secrétaire", membre: "Membre",
};

export const CASE_CATEGORY: Record<string, string> = {
  conduct: "Comportement / conduite", harassment: "Harcèlement", discrimination: "Discrimination", finance: "Finances",
  governance: "Gouvernance", safety: "Sécurité", other: "Autre",
};
export const CASE_STATUS: Record<string, [string, Tone]> = {
  received: ["Reçu", "info"], in_review: ["En examen", "warn"], action_required: ["Action requise", "danger"],
  resolved: ["Résolu", "ok"], closed: ["Clôturé", "muted"], dismissed: ["Classé sans suite", "muted"],
};
export const CASE_PRIORITY: Record<string, [string, Tone]> = { normal: ["Priorité normale", "muted"], high: ["Priorité élevée", "warn"], urgent: ["Urgent", "danger"] };
export const CASE_EVENT: Record<string, string> = {
  message: "Message", status: "Changement de statut", assignment: "Attribution", created: "Dépôt", status_changed: "Changement de statut", note: "Note",
};

/** [libellé, ton] pour une valeur, avec repli lisible si la valeur est inconnue. */
export function label(map: Record<string, [string, Tone]>, value?: string | null): [string, Tone] {
  return (value && map[value]) || [value ? value.replace(/_/g, " ") : "—", "muted"];
}

/** « 1 votant », « 3 votants » ; `plural` explicite pour les formes irrégulières. */
export function plural(count: number, singular: string, pluralForm = singular + "s") {
  return `${count.toLocaleString("fr-FR")} ${Math.abs(count) > 1 ? pluralForm : singular}`;
}

/** Date et heure sans les secondes : « 17 oct. 2026 à 17:03 ». */
export function dateTime(value?: string | null, style: "medium" | "long" = "medium") {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: style, timeStyle: "short", timeZone: "Indian/Antananarivo" });
}
export function dateOnly(value?: string | null, style: "medium" | "long" = "medium") {
  if (!value) return "—";
  return new Date(value.length <= 10 ? value + "T12:00:00" : value).toLocaleDateString("fr-FR", { dateStyle: style, timeZone: "Indian/Antananarivo" });
}
