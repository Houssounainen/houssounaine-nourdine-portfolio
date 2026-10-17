"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { uploadFile } from "@/lib/media";
import { UiIcon } from "@/components/ui-icon";
import { LIBRARY_ACCEPT, LIBRARY_CATEGORIES, LIBRARY_MAX_BYTES, LIBRARY_MIME_TYPES } from "@/components/library-labels";

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="button primary" disabled={disabled || pending} aria-busy={pending}>{pending ? "Partage…" : "Partager"}</button>;
}

/**
 * Formulaire de partage. Le fichier est envoyé directement au stockage depuis le navigateur
 * (les actions serveur sont limitées à 1 Mo) ; seuls son chemin et son nom sont transmis.
 */
export function LibraryForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [file, setFile] = useState<{ path: string; name: string; size: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");

  async function onFile(selected: File | undefined) {
    if (!selected) return;
    setError("");
    if (selected.size > LIBRARY_MAX_BYTES) { setError("Fichier trop lourd (15 Mo maximum)."); return; }
    if (selected.type && !LIBRARY_MIME_TYPES.includes(selected.type)) { setError("Format non accepté : PDF, image, Word, Excel, PowerPoint ou texte."); return; }
    setBusy(true);
    try {
      const uploaded = await uploadFile(selected, "library-files", "library");
      setFile({ ...uploaded, size: selected.size });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Échec de l’envoi.");
    } finally {
      setBusy(false);
    }
  }

  const ready = mode === "file" ? Boolean(file) : /^https?:\/\/\S+$/i.test(url.trim());

  return <form action={action} className="form-stack">
    <label>Titre<input name="title" required minLength={2} maxLength={160} placeholder="Ex. Cours d’économie L2 — chapitre 3"/></label>
    <label>Catégorie<select name="category" defaultValue="cours">{LIBRARY_CATEGORIES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label>Description<textarea name="description" rows={3} maxLength={1000} placeholder="Facultatif"/></label>

    <div className="library-source">
      <div className="library-switch" role="tablist" aria-label="Type de ressource">
        <button type="button" role="tab" aria-selected={mode === "file"} className={mode === "file" ? "active" : ""} onClick={() => setMode("file")}><UiIcon name="document"/>Fichier</button>
        <button type="button" role="tab" aria-selected={mode === "link"} className={mode === "link" ? "active" : ""} onClick={() => setMode("link")}><UiIcon name="external"/>Lien</button>
      </div>

      {mode === "file" ? <div className="library-file">
        {file ? <>
          <input type="hidden" name="file_path" value={file.path}/>
          <input type="hidden" name="file_name" value={file.name}/>
          <div className="library-file-chosen">
            <UiIcon name="document"/>
            <div><b>{file.name}</b><small>{formatSize(file.size)} · envoyé</small></div>
            <button type="button" className="icon-button" aria-label="Retirer le fichier" onClick={() => setFile(null)}><UiIcon name="close"/></button>
          </div>
        </> : <label className={`library-drop${busy ? " is-busy" : ""}`}>
          <input type="file" accept={LIBRARY_ACCEPT} disabled={busy} onChange={event => { void onFile(event.target.files?.[0]); event.target.value = ""; }}/>
          <UiIcon name="download"/>
          <span>{busy ? "Envoi…" : "Choisir un fichier"}</span>
          <small>PDF, image, Word, Excel, PowerPoint ou texte · 15 Mo max.</small>
        </label>}
        {error && <p className="field-error" role="alert">{error}</p>}
      </div> : <label>Adresse du lien<input name="url" type="url" inputMode="url" placeholder="https://" value={url} onChange={event => setUrl(event.target.value)} required/></label>}
    </div>

    <Submit disabled={busy || !ready}/>
  </form>;
}
