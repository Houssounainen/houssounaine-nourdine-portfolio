"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Avatar } from "@/components/avatar";
import { ImagePicker } from "@/components/image-picker";
import { UiIcon } from "@/components/ui-icon";
import { POST_CATEGORIES, POST_CATEGORY_STYLE } from "@/lib/social";

function PublishButton() {
  const { pending } = useFormStatus();
  return <button className="button primary" type="submit" disabled={pending}>{pending ? "Publication…" : "Publier"}</button>;
}

export function Composer({ action, authorName, authorAvatar, canAnnounce, defaultOpen = false }: {
  action: (data: FormData) => Promise<void>; authorName: string; authorAvatar: string | null; canAnnounce: boolean; defaultOpen?: boolean;
}) {
  const [round, setRound] = useState(0);
  const [category, setCategory] = useState("social");
  const [expanded, setExpanded] = useState(defaultOpen);
  const [withPhotos, setWithPhotos] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const categories = Object.entries(POST_CATEGORIES).filter(([key]) => key !== "annonce" || canAnnounce);
  const firstName = authorName.split(/\s+/).filter(Boolean)[0] || "";

  useEffect(() => {
    if (!defaultOpen) return;
    form.current?.scrollIntoView({ block: "center" });
    area.current?.focus();
  }, [defaultOpen]);

  function open(photos = false, nextCategory?: string) {
    setExpanded(true);
    if (photos) setWithPhotos(true);
    if (nextCategory) setCategory(nextCategory);
    requestAnimationFrame(() => area.current?.focus());
  }

  return <form ref={form} key={round} id="composer" className={`soc-composer panel${expanded ? " is-open" : ""}`} action={async data => { await action(data); setRound(value => value + 1); setExpanded(false); setWithPhotos(false); setCategory("social"); }}>
    <div className="soc-composer-row">
      <Avatar name={authorName} url={authorAvatar} size={42}/>
      <label className="sr-only" htmlFor="composer-body">Votre publication</label>
      <textarea ref={area} id="composer-body" name="body" rows={expanded ? 4 : 1} maxLength={3000} placeholder={`Quoi de neuf${firstName ? `, ${firstName}` : ""} ?`} onFocus={() => setExpanded(true)}/>
    </div>
    {!expanded && <div className="soc-composer-quick">
      <button type="button" onClick={() => open(true, "photo")}><span className="icon-tile" style={{ "--tile": "#12b76a" } as React.CSSProperties}><UiIcon name="image"/></span>Photo</button>
      <button type="button" onClick={() => open(false, "fete")}><span className="icon-tile" style={{ "--tile": "#ee46bc" } as React.CSSProperties}><UiIcon name="sparkle"/></span>Fête</button>
      <button type="button" onClick={() => open(false, "partage")}><span className="icon-tile" style={{ "--tile": "#15b79e" } as React.CSSProperties}><UiIcon name="book"/></span>Partage</button>
    </div>}
    {expanded && <div className="soc-composer-more">
      <input type="hidden" name="category" value={category}/>
      <div className="soc-chip-row" role="radiogroup" aria-label="Catégorie">
        {categories.map(([key, label]) => {
          const style = POST_CATEGORY_STYLE[key] || POST_CATEGORY_STYLE.social;
          return <button type="button" key={key} role="radio" aria-checked={category === key} className={`soc-cat-chip${category === key ? " is-active" : ""}`} style={{ "--cat": style.color } as React.CSSProperties} onClick={() => setCategory(key)}><UiIcon name={style.icon}/>{label}</button>;
        })}
      </div>
      {withPhotos
        ? <ImagePicker name="images" max={6} folder="posts" label="Ajouter des photos"/>
        : <button type="button" className="soc-add-photos" onClick={() => setWithPhotos(true)}><UiIcon name="camera"/>Ajouter des photos</button>}
      <div className="soc-composer-actions"><button type="button" className="button secondary" onClick={() => { form.current?.reset(); setExpanded(false); setWithPhotos(false); }}>Annuler</button><PublishButton/></div>
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

  // Un simple appui ouvre la visionneuse ; un double appui (« J’aime ») l’annule.
  function openLater(event: React.MouseEvent<HTMLButtonElement>, position: number) {
    if (event.detail === 0) { setIndex(position); return; }
    const host = event.currentTarget.closest<HTMLElement>(".soc-post-media");
    const at = Date.now();
    window.setTimeout(() => { if (Number(host?.dataset.dbl || 0) < at) setIndex(position); }, 280);
  }

  if (!images.length) return null;
  const shown = images.slice(0, 4);
  return <>
    <div className={`post-images count-${Math.min(images.length, 4)}`}>
      {shown.map((url, position) => <button type="button" key={url} onClick={event => openLater(event, position)} aria-label={`Agrandir la photo ${position + 1}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} loading="lazy" draggable={false}/>
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
