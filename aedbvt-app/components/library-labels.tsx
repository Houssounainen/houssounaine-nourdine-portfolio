// Libellés partagés de la Bibliothèque (serveur et client).

import type { IconName } from "@/components/ui-icon";

export const LIBRARY_CATEGORIES: readonly { id: string; label: string; icon: IconName; color: string }[] = [
  { id: "cours", label: "Cours", icon: "book", color: "#2453d6" },
  { id: "memoire", label: "Mémoires", icon: "cap", color: "#7a5af8" },
  { id: "examen", label: "Sujets d’examen", icon: "document", color: "#f2545b" },
  { id: "modele", label: "Modèles", icon: "grid", color: "#15b79e" },
  { id: "livre", label: "Livres", icon: "book", color: "#f79009" },
  { id: "administratif", label: "Administratif", icon: "shield", color: "#0ba5ec" },
  { id: "autre", label: "Autre", icon: "sparkle", color: "#667085" },
];

export function libraryCategory(id?: string | null) {
  return LIBRARY_CATEGORIES.find(item => item.id === id) || LIBRARY_CATEGORIES[LIBRARY_CATEGORIES.length - 1];
}

/** Type de fichier affiché sur la tuile : libellé court + couleur. */
export function libraryFileType(fileName?: string | null, isLink = false): { label: string; color: string; icon: IconName } {
  if (isLink) return { label: "LIEN", color: "#0ba5ec", icon: "link" };
  const ext = (/\.([a-z0-9]{1,5})$/i.exec(fileName || "")?.[1] || "").toLowerCase();
  if (ext === "pdf") return { label: "PDF", color: "#e5484d", icon: "document" };
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return { label: ext.toUpperCase(), color: "#2b6cf0", icon: "document" };
  if (["xls", "xlsx", "ods", "csv"].includes(ext)) return { label: ext.toUpperCase(), color: "#12a150", icon: "chart" };
  if (["ppt", "pptx", "odp"].includes(ext)) return { label: ext.toUpperCase(), color: "#f76808", icon: "image" };
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return { label: ext === "jpeg" ? "JPG" : ext.toUpperCase(), color: "#ee46bc", icon: "image" };
  if (ext === "txt") return { label: "TXT", color: "#667085", icon: "document" };
  return { label: ext ? ext.toUpperCase() : "DOC", color: "#7a5af8", icon: "document" };
}

export function libraryCategoryLabel(id?: string | null) {
  return LIBRARY_CATEGORIES.find(item => item.id === id)?.label || "Autre";
}

export const LIBRARY_MAX_BYTES = 15 * 1024 * 1024;

export const LIBRARY_MIME_TYPES = [
  "application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export const LIBRARY_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx," + LIBRARY_MIME_TYPES.join(",");
