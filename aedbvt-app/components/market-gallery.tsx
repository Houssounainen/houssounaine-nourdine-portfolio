"use client";

import { useState } from "react";
import { UiIcon } from "@/components/ui-icon";

/** Galerie d’une annonce : image principale + vignettes cliquables. */
export function MarketGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  if (!images.length) {
    return <div className="market-gallery-main market-placeholder" aria-hidden="true"><UiIcon name="tag"/></div>;
  }
  const current = images[Math.min(index, images.length - 1)];
  return <div className="market-gallery">
    <div className="market-gallery-main">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={current} alt={alt}/>
    </div>
    {images.length > 1 && <div className="market-thumbs" role="list">
      {images.map((url, i) => <button key={url} type="button" role="listitem" className={i === index ? "active" : ""} aria-label={`Photo ${i + 1}`} aria-pressed={i === index} onClick={() => setIndex(i)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" loading="lazy"/>
      </button>)}
    </div>}
  </div>;
}
