"use client";

/** Recadre une image en carré centré (photos de profil). */
export async function cropSquare(file: File, size = 720): Promise<File> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const side = Math.min(bitmap.width, bitmap.height);
  const target = Math.min(side, size);
  const canvas = document.createElement("canvas");
  canvas.width = target; canvas.height = target;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, target, target);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.86));
  return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
}

/** Envoie la photo de profil publique (visible par les membres) et l’enregistre sur le compte. */
export async function uploadAvatar(file: File) {
  const [{ uploadImage }, { createClient }] = await Promise.all([import("@/lib/media"), import("@/lib/supabase/client")]);
  const square = await cropSquare(file, 512);
  const { publicUrl } = await uploadImage(square, { folder: "avatars", maxSize: 512 });
  const { error } = await createClient().rpc("set_my_avatar", { p_url: publicUrl });
  if (error) throw new Error("La photo de profil n’a pas pu être enregistrée.");
  return publicUrl;
}
