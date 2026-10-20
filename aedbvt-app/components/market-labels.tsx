// Libellés et formats partagés du Marché (utilisables côté serveur et client).

import type { IconName } from "@/components/ui-icon";

export const MARKET_CATEGORIES: readonly { id: string; label: string; icon: IconName; color: string }[] = [
  { id: "livres", label: "Livres", icon: "book", color: "#7a5af8" },
  { id: "electronique", label: "Électronique", icon: "bolt", color: "#0ba5ec" },
  { id: "vetements", label: "Vêtements", icon: "shirt", color: "#ee46bc" },
  { id: "maison", label: "Maison", icon: "home", color: "#f79009" },
  { id: "services", label: "Services", icon: "users", color: "#15b79e" },
  { id: "alimentation", label: "Alimentation", icon: "cup", color: "#f2545b" },
  { id: "autre", label: "Autre", icon: "grid", color: "#667085" },
];

export function marketCategory(id?: string | null) {
  return MARKET_CATEGORIES.find(item => item.id === id) || MARKET_CATEGORIES[MARKET_CATEGORIES.length - 1];
}

export const MARKET_CONDITIONS = [
  { id: "neuf", label: "Neuf" },
  { id: "tres_bon", label: "Très bon état" },
  { id: "bon", label: "Bon état" },
  { id: "usage", label: "Usagé" },
] as const;

export const MARKET_STATUSES = [
  { id: "available", label: "Disponible" },
  { id: "reserved", label: "Réservé" },
  { id: "sold", label: "Vendu" },
] as const;

export type MarketListing = {
  id: string;
  author_id: string;
  author_name: string;
  title: string;
  description: string;
  category: string;
  price: number | string | null;
  condition: string | null;
  contact: string;
  images: string[] | null;
  status: string;
  created_at: string;
};

export const MARKET_COLUMNS = "id,author_id,author_name,title,description,category,price,condition,contact,images,status,created_at";

export function categoryLabel(id?: string | null) {
  return MARKET_CATEGORIES.find(item => item.id === id)?.label || "Autre";
}

export function conditionLabel(id?: string | null) {
  return MARKET_CONDITIONS.find(item => item.id === id)?.label || "";
}

export function statusLabel(id?: string | null) {
  return MARKET_STATUSES.find(item => item.id === id)?.label || "Disponible";
}

export function formatPrice(price: number | string | null | undefined) {
  if (price === null || price === undefined || price === "") return "Prix à discuter";
  const value = Number(price);
  if (!Number.isFinite(value)) return "Prix à discuter";
  return `${value.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, "\u00a0")}\u00a0Ar`;
}

/** Lien tel: — conserve uniquement le « + » initial et les chiffres. */
export function telHref(contact: string) {
  const trimmed = contact.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/** Lien WhatsApp : numéro malgache local (0XX XX XXX XX) converti en +261. */
export function whatsappHref(contact: string) {
  let digits = contact.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("0")) digits = `261${digits.slice(1)}`;
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return `https://wa.me/${digits}`;
}
