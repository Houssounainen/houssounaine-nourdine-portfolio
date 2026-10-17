// Libellés partagés de la Bibliothèque (serveur et client).

export const LIBRARY_CATEGORIES = [
  { id: "cours", label: "Cours" },
  { id: "memoire", label: "Mémoires" },
  { id: "examen", label: "Sujets d’examen" },
  { id: "modele", label: "Modèles" },
  { id: "livre", label: "Livres" },
  { id: "administratif", label: "Administratif" },
  { id: "autre", label: "Autre" },
] as const;

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
