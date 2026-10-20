"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { UiIcon } from "@/components/ui-icon";
import { toast } from "@/components/toaster";
import { uploadAvatar } from "@/lib/square-image";

/** Photo de profil cliquable : un appui ouvre la galerie ou l’appareil photo. */
export function AvatarEditor({ name, url, size = 96 }: { name: string; url: string | null; size?: number }) {
  const router = useRouter();
  const [preview, setPreview] = useState(url);
  const [busy, setBusy] = useState(false);

  async function onFile(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    const previous = preview;
    setPreview(URL.createObjectURL(file));
    try { await uploadAvatar(file); toast("Photo de profil mise à jour"); router.refresh(); }
    catch (error) { setPreview(previous); toast(error instanceof Error ? error.message : "Échec de l’envoi", "error"); }
    finally { setBusy(false); }
  }

  return <label className={`avatar-editor${busy ? " is-busy" : ""}`} style={{ width: size, height: size }} aria-label="Changer la photo de profil">
    <Avatar name={name} url={preview} size={size}/>
    <span className="avatar-editor-badge"><UiIcon name="camera"/></span>
    <input type="file" accept="image/*" disabled={busy} onChange={event => { void onFile(event.target.files?.[0]); event.target.value = ""; }}/>
  </label>;
}
