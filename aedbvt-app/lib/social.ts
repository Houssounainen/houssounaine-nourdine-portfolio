import type { IconName } from "@/components/ui-icon";

/** Catégories du fil de la Communauté (partagées serveur / client). */
export const POST_CATEGORIES: Record<string, string> = { social: "Social", fete: "Fête", partage: "Partage", photo: "Photos", annonce: "Annonce" };

/** Couleur et pictogramme de chaque catégorie du fil (pastilles, filtres, composer). */
export const POST_CATEGORY_STYLE: Record<string, { color: string; icon: IconName }> = {
  social: { color: "#2453d6", icon: "users" },
  fete: { color: "#ee46bc", icon: "sparkle" },
  partage: { color: "#15b79e", icon: "book" },
  photo: { color: "#f79009", icon: "image" },
  annonce: { color: "#f2545b", icon: "bell" },
};

/** Couleur des badges de rôle (annuaire, profils). */
export const ROLE_COLORS: Record<string, string> = { admin: "#7a5af8", bureau: "#2453d6", tresorier: "#15b79e", secretaire: "#0ba5ec", membre: "#667085" };
