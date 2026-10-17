"use client";

import { createClient } from "@/lib/supabase/client";

export const COMMUNITY_BUCKET = "community-media";

// Réduit une photo avant envoi : connexions mobiles lentes et quota de stockage limité.
export async function compressImage(file: File, maxSize = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
  return blob && blob.size < file.size ? blob : file;
}

export async function uploadImage(file: File, { bucket = COMMUNITY_BUCKET, folder = "media", maxSize = 1600 } = {}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expirée. Reconnectez-vous.");
  const blob = await compressImage(file, maxSize);
  const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : blob.type === "image/gif" ? "gif" : "jpg";
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type || "image/jpeg", cacheControl: "31536000", upsert: false });
  if (error) throw new Error(error.message.includes("row-level") ? "Envoi refusé : compte inactif." : "Échec de l’envoi de l’image.");
  const publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  return { path, publicUrl };
}

export async function uploadFile(file: File, bucket: string, folder = "files") {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Session expirée. Reconnectez-vous.");
  const safe = file.name.normalize("NFD").replace(/[^\w.-]+/g, "-").slice(-80);
  const path = `${user.id}/${folder}/${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw new Error("Échec de l’envoi du fichier.");
  return { path, name: file.name };
}
