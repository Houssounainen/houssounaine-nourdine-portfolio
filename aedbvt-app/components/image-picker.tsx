"use client";

import { useState } from "react";
import { uploadImage } from "@/lib/media";
import { UiIcon } from "@/components/ui-icon";

/**
 * Sélection et envoi d’images vers le stockage. Les URL publiques sont transmises
 * au formulaire parent par des champs cachés nommés `name`.
 */
export function ImagePicker({ name, max = 4, folder = "media", label = "Ajouter des photos", initial = [] }: { name: string; max?: number; folder?: string; label?: string; initial?: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError("");
    try {
      const room = max - urls.length;
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, room)) {
        if (!file.type.startsWith("image/")) continue;
        if (file.size > 15 * 1024 * 1024) { setError("Image trop lourde (15 Mo maximum)."); continue; }
        uploaded.push((await uploadImage(file, { folder })).publicUrl);
      }
      setUrls(current => [...current, ...uploaded].slice(0, max));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de l’envoi.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="image-picker">
    {urls.map(url => <input type="hidden" name={name} value={url} key={url}/>)}
    <div className="image-picker-grid">
      {urls.map(url => <figure key={url}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt=""/>
        <button type="button" aria-label="Retirer l’image" onClick={() => setUrls(current => current.filter(item => item !== url))}><UiIcon name="close"/></button>
      </figure>)}
      {urls.length < max && <label className={`image-picker-add${busy ? " is-busy" : ""}`}>
        <input type="file" accept="image/*" multiple={max > 1} disabled={busy} onChange={event => { void onFiles(event.target.files); event.target.value = ""; }}/>
        <UiIcon name="image"/><span>{busy ? "Envoi…" : label}</span>
      </label>}
    </div>
    {error && <p className="field-error" role="alert">{error}</p>}
  </div>;
}
