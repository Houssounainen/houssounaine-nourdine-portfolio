"use client";

import { useEffect, useState } from "react";
import { UiIcon } from "@/components/ui-icon";
import { toast } from "@/components/toaster";

// Favoris du Marché : gardés dans le navigateur (localStorage), propres à chaque appareil.
const KEY = "aedbvt-market-favorites";
const EVENT = "aedbvt-market-favorites";

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try { window.localStorage.setItem(KEY, JSON.stringify(list.slice(-200))); } catch { /* stockage indisponible */ }
  window.dispatchEvent(new Event(EVENT));
}

function useFavorites() {
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setList(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return list;
}

/** Cœur « favori » posé sur une annonce. */
export function MarketFavButton({ id, title, variant = "overlay" }: { id: string; title: string; variant?: "overlay" | "button" }) {
  const favorites = useFavorites();
  const active = favorites.includes(id);
  function toggle() {
    const current = read();
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    write(next);
    toast(next.includes(id) ? "Ajoutée à vos favoris" : "Retirée de vos favoris", "info");
  }
  if (variant === "button") {
    return <button type="button" className={`button secondary shop-fav-wide${active ? " is-on" : ""}`} aria-pressed={active} onClick={toggle}>
      <UiIcon name="heart"/>{active ? "Dans vos favoris" : "Ajouter aux favoris"}
    </button>;
  }
  return <button type="button" className={`shop-fav${active ? " is-on" : ""}`} aria-pressed={active} aria-label={active ? `Retirer « ${title} » des favoris` : `Ajouter « ${title} » aux favoris`} onClick={toggle}>
    <UiIcon name="heart"/>
  </button>;
}

/** Filtre « Favoris » : masque (en CSS) les annonces non favorites de la grille ciblée. */
export function MarketFavFilter({ target }: { target: string }) {
  const favorites = useFavorites();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const grid = document.getElementById(target);
    if (grid) grid.toggleAttribute("data-only-fav", on);
  }, [on, target]);
  return <button type="button" className={`shop-chip${on ? " active" : ""}`} aria-pressed={on} onClick={() => setOn(value => !value)}>
    <UiIcon name="heart"/>Favoris{favorites.length > 0 && <span className="shop-chip-count">{favorites.length}</span>}
  </button>;
}
