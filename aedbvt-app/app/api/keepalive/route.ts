import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Appelée chaque jour par le cron Vercel : une requête réelle empêche la mise en pause
// automatique du projet Supabase (offre gratuite) après une semaine sans activité.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ ok: false, reason: "config" }, { status: 503 });
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.rpc("get_public_app_settings");
  return Response.json({ ok: !error, at: new Date().toISOString() }, { status: error ? 502 : 200, headers: { "Cache-Control": "no-store" } });
}
