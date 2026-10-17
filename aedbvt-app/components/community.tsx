"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ImagePicker } from "@/components/image-picker";
import { UiIcon } from "@/components/ui-icon";

export const POST_CATEGORIES: Record<string, string> = { social: "Social", fete: "Fête", partage: "Partage", photo: "Photos", annonce: "Annonce" };

function PublishButton() {
  const { pending } = useFormStatus();
  return <button className="button primary" type="submit" disabled={pending}>{pending ? "Publication…" : "Publier"}</button>;
}

export function Composer({ action, authorInitials, canAnnounce }: { action: (data: FormData) => Promise<void>; authorInitials: string; canAnnounce: boolean }) {
  const [round, setRound] = useState(0);
  const [category, setCategory] = useState("social");
  const [expanded, setExpanded] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const categories = Object.entries(POST_CATEGORIES).filter(([key]) => key !== "annonce" || canAnnounce);

  return <form ref={form} key={round} className="composer panel" action={async data => { await action(data); setRound(value => value + 1); setExpanded(false); setCategory("social"); }}>
    <div className="composer-row">
      <span className="avatar" aria-hidden="true">{authorInitials}</span>
      <label className="sr-only" htmlFor="composer-body">Votre publication</label>
      <textarea id="composer-body" name="body" rows={expanded ? 4 : 1} maxLength={3000} placeholder="Partager une nouvelle, une photo, une idée…" onFocus={() => setExpanded(true)}/>
    </div>
    {expanded && <div className="composer-more">
      <input type="hidden" name="category" value={category}/>
      <div className="chip-row" role="radiogroup" aria-label="Catégorie">
        {categories.map(([key, label]) => <button type="button" key={key} role="radio" aria-checked={category === key} className={`chip${category === key ? " active" : ""}`} onClick={() => setCategory(key)}>{label}</button>)}
      </div>
      <ImagePicker name="images" max={6} folder="posts" label="Photos"/>
      <div className="composer-actions"><button type="button" className="button secondary" onClick={() => { form.current?.reset(); setExpanded(false); }}>Annuler</button><PublishButton/></div>
    </div>}
  </form>;
}

/** Grille de photos d’une publication, avec visionneuse plein écran (flèches, Échap, balayage). */
export function PostImages({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef(0);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (index !== null && !element.open) element.showModal();
    if (index === null && element.open) element.close();
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setIndex(value => value === null ? value : (value + 1) % images.length);
      if (event.key === "ArrowLeft") setIndex(value => value === null ? value : (value - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length]);

  if (!images.length) return null;
  const shown = images.slice(0, 4);
  return <>
    <div className={`post-images count-${Math.min(images.length, 4)}`}>
      {shown.map((url, position) => <button type="button" key={url} onClick={() => setIndex(position)} aria-label={`Agrandir la photo ${position + 1}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} loading="lazy"/>
        {position === 3 && images.length > 4 && <span className="post-images-more">+{images.length - 4}</span>}
      </button>)}
    </div>
    <dialog ref={dialog} className="lightbox" onClose={() => setIndex(null)} onClick={event => { if (event.target === event.currentTarget) setIndex(null); }}
      onTouchStart={event => { touch.current = event.touches[0].clientX; }}
      onTouchEnd={event => { const delta = event.changedTouches[0].clientX - touch.current; if (Math.abs(delta) > 50) setIndex(value => value === null ? value : (value + (delta < 0 ? 1 : -1) + images.length) % images.length); }}>
      {index !== null && <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[index]} alt={alt}/>
        <button type="button" className="lightbox-close" onClick={() => setIndex(null)} aria-label="Fermer"><UiIcon name="close"/></button>
        {images.length > 1 && <>
          <button type="button" className="lightbox-nav prev" onClick={() => setIndex((index - 1 + images.length) % images.length)} aria-label="Photo précédente"><UiIcon name="chevron"/></button>
          <button type="button" className="lightbox-nav next" onClick={() => setIndex((index + 1) % images.length)} aria-label="Photo suivante"><UiIcon name="chevron"/></button>
          <p className="lightbox-count">{index + 1} / {images.length}</p>
        </>}
      </>}
    </dialog>
  </>;
}
