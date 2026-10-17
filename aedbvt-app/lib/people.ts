import type { SupabaseClient } from "@supabase/supabase-js";

export type Person = { id: string; full_name: string; avatar_url: string | null; role: string };

/** Noms et photos de profil d’un ensemble de comptes, en une seule requête. */
export async function getPeople(supabase: SupabaseClient, ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  const map = new Map<string, Person>();
  if (!unique.length) return map;
  const { data } = await supabase.rpc("get_people", { p_ids: unique });
  for (const person of (data || []) as Person[]) map.set(person.id, person);
  return map;
}
