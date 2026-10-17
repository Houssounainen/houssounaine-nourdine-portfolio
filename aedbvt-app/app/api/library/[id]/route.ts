import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new NextResponse("Ressource introuvable", { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Non autorisé", { status: 401 });

  // RLS : seuls les comptes actifs lisent les ressources non supprimées.
  const { data: item } = await supabase.from("library_items").select("id,file_path,file_name").is("deleted_at", null).eq("id", id).maybeSingle();
  if (!item?.file_path) return new NextResponse("Ressource introuvable", { status: 404 });

  const { data, error } = await supabase.storage.from("library-files").createSignedUrl(item.file_path, 60, { download: item.file_name || true });
  if (error || !data?.signedUrl) return new NextResponse("Fichier indisponible", { status: 404 });

  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
