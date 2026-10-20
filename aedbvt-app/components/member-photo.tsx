"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/media";
import { UiIcon } from "@/components/ui-icon";
import { toast } from "@/components/toaster";
import { cropSquare, uploadAvatar } from "@/lib/square-image";

/** Photo d’identité de la carte : recadrée en carré, compressée, stockée dans un espace privé. */
export function MemberPhoto({ url, name, editable = true, syncAvatar = true }: { url: string | null; name: string; editable?: boolean; syncAvatar?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(url);

  async function onFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choisissez une image."); return; }
    setBusy(true); setError("");
    try {
      setPreview(URL.createObjectURL(file));
      const square = await cropSquare(file);
      const { path } = await uploadImage(square, { bucket: "identity-photos", folder: "card", maxSize: 720 });
      const { error: rpcError } = await createClient().rpc("set_my_member_photo", { p_path: path });
      if (rpcError) throw new Error("La photo n’a pas pu être associée à votre fiche.");
      // La même photo devient la photo de profil visible dans la discussion, le fil, le marché…
      if (syncAvatar) await uploadAvatar(file).catch(() => undefined);
      toast("Photo enregistrée");
      router.refresh();
    } catch (cause) {
      setPreview(url);
      setError(cause instanceof Error ? cause.message : "Échec de l’envoi.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="member-photo">
    <div className={`member-photo-frame${busy ? " is-busy" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={preview} alt={`Photo d’identité de ${name}`}/> : <UiIcon name="user"/>}
    </div>
    {editable && <label className="member-photo-edit no-print">
      <input type="file" accept="image/*" capture="user" disabled={busy} onChange={event => { void onFile(event.target.files?.[0]); event.target.value = ""; }}/>
      <UiIcon name="camera"/><span>{busy ? "Envoi…" : preview ? "Changer" : "Ajouter une photo"}</span>
    </label>}
    {error && <p className="field-error no-print" role="alert">{error}</p>}
  </div>;
}
