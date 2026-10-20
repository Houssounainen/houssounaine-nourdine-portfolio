"use client";

import { useState } from "react";
import { UiIcon } from "@/components/ui-icon";

/** Galerie d’une annonce : grande image carrée, flèches, compteur et vignettes cliquables. */
export function MarketGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  if (!images.length) {
    return <div className="market-gallery">
      <div className="market-gallery-main shop-gallery-empty" aria-hidden="true"><UiIcon name="image"/><span>Pas de photo</span></div>
    </div>;
  }
  const safe = Math.min(index, images.length - 1);
  const current = images[safe];
  const go = (step: number) => setIndex((safe + step + images.length) % images.length);
  return <div className="market-gallery">
    <div className="market-gallery-main">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current} alt={`${alt} — photo ${safe + 1} sur ${images.length}`}/>
      {images.length > 1 && <>
        <button type="button" className="shop-gallery-nav prev" aria-label="Photo précédente" onClick={() => go(-1)}><UiIcon name="chevron" style={{ transform: "rotate(180deg)" }}/></button>
        <button type="button" className="shop-gallery-nav next" aria-label="Photo suivante" onClick={() => go(1)}><UiIcon name="chevron"/></button>
        <span className="shop-gallery-count">{safe + 1} / {images.length}</span>
      </>}
    </div>
    {images.length > 1 && <div className="market-thumbs" role="list">
      {images.map((url, i) => <button key={url} type="button" role="listitem" className={i === safe ? "active" : ""} aria-label={`Photo ${i + 1}`} aria-pressed={i === safe} onClick={() => setIndex(i)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" loading="lazy"/>
      </button>)}
    </div>}
  </div>;
}
