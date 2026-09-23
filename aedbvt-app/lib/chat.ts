import type { SupabaseClient } from "@supabase/supabase-js";

export const CHAT_PAGE_SIZE = 50;
export const CHAT_MAX_LENGTH = 2000;
export const CHAT_COLUMNS = "id,author_id,author_name,body,created_at,deleted_at";

export type ChatMessage = {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  deleted_at: string | null;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

export function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && uuid.test(row.id)
    && typeof row.author_id === "string" && uuid.test(row.author_id)
    && typeof row.author_name === "string" && typeof row.body === "string"
    && typeof row.created_at === "string" && timestamp.test(row.created_at) && Number.isFinite(Date.parse(row.created_at))
    && (row.deleted_at === null || typeof row.deleted_at === "string");
}

function rows(data: unknown): ChatMessage[] {
  if (!Array.isArray(data) || !data.every(isChatMessage)) throw new Error("CHAT_INVALID_RESPONSE");
  return data;
}

export function mergeChatMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const messages = new Map(current.map(message => [message.id, message]));
  for (const message of incoming) {
    // A delayed insert/snapshot must never bring a removed message back.
    if (!messages.get(message.id)?.deleted_at || message.deleted_at) messages.set(message.id, message);
  }
  return [...messages.values()].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id));
}

export function reconcileChatMessages(current: ChatMessage[], requestedIds: string[], incoming: ChatMessage[]) {
  const requested = new Set(requestedIds);
  const available = new Set(incoming.map(message => message.id));
  return mergeChatMessages(current.filter(message => !requested.has(message.id) || available.has(message.id)), incoming);
}

export function chatCursor(message: Pick<ChatMessage, "id" | "created_at">, direction: "lt" | "gt") {
  if (!uuid.test(message.id) || !timestamp.test(message.created_at)) throw new Error("CHAT_INVALID_CURSOR");
  return `created_at.${direction}.${message.created_at},and(created_at.eq.${message.created_at},id.${direction}.${message.id})`;
}

export async function loadChatPage(client: SupabaseClient, before?: ChatMessage) {
  let query = client.from("chat_messages").select(CHAT_COLUMNS)
    .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(CHAT_PAGE_SIZE + 1);
  if (before) query = query.or(chatCursor(before, "lt"));
  const { data, error } = await query.abortSignal(AbortSignal.timeout(15000));
  if (error) throw error;
  const page = rows(data);
  return { messages: page.slice(0, CHAT_PAGE_SIZE).reverse(), hasMore: page.length > CHAT_PAGE_SIZE };
}

export async function synchronizeChat(client: SupabaseClient, snapshot: ChatMessage[]) {
  if (!snapshot.length) return loadChatPage(client);

  const messages: ChatMessage[] = [];
  // Recheck loaded rows as well as new ones: removals can happen while offline.
  for (let offset = 0; offset < snapshot.length; offset += 100) {
    const { data, error } = await client.from("chat_messages").select(CHAT_COLUMNS)
      .in("id", snapshot.slice(offset, offset + 100).map(message => message.id))
      .abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    messages.push(...rows(data));
  }

  let cursor = snapshot[snapshot.length - 1];
  // Paginate catch-up too, so a long disconnection cannot create a history gap.
  for (;;) {
    const { data, error } = await client.from("chat_messages").select(CHAT_COLUMNS)
      .or(chatCursor(cursor, "gt")).order("created_at").order("id").limit(500)
      .abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    const page = rows(data);
    messages.push(...page);
    if (page.length < 500) break;
    cursor = page[page.length - 1];
  }
  return { messages, hasMore: undefined };
}

export function validateChatBody(body: string) {
  const text = body.trim();
  if (!text || text.length > CHAT_MAX_LENGTH) throw new Error("CHAT_INVALID_BODY");
  return text;
}

export async function sendChatMessage(client: SupabaseClient, id: string, body: string, authorId: string) {
  if (!uuid.test(id)) throw new Error("CHAT_INVALID_ID");
  const text = validateChatBody(body);
  const { data, error } = await client.from("chat_messages").insert({ id, body: text })
    .select(CHAT_COLUMNS).abortSignal(AbortSignal.timeout(15000)).single();
  if (!error && isChatMessage(data)) return data;

  // The request may have committed even if its response was lost. Retry the same
  // UUID and recover the existing row instead of creating a duplicate message.
  const existing = await client.from("chat_messages").select(CHAT_COLUMNS)
    .eq("id", id).eq("author_id", authorId).abortSignal(AbortSignal.timeout(15000)).maybeSingle();
  if (!existing.error && isChatMessage(existing.data)) return existing.data;
  throw error || new Error("CHAT_INVALID_RESPONSE");
}

export async function removeChatMessage(client: SupabaseClient, id: string) {
  const { data, error } = await client.from("chat_messages").update({ deleted_at: new Date().toISOString() })
    .eq("id", id).is("deleted_at", null).select(CHAT_COLUMNS).abortSignal(AbortSignal.timeout(15000)).maybeSingle();
  if (error) throw error;
  if (isChatMessage(data)) return data;
  const existing = await client.from("chat_messages").select(CHAT_COLUMNS).eq("id", id)
    .abortSignal(AbortSignal.timeout(15000)).maybeSingle();
  if (!existing.error && isChatMessage(existing.data) && existing.data.deleted_at) return existing.data;
  throw new Error("CHAT_REMOVAL_DENIED");
}

export function chatErrorMessage(error: unknown) {
  const value = error && typeof error === "object" ? error as { code?: string; message?: string } : {};
  if (value.message?.includes("CHAT_RATE_LIMIT")) return "Patientez deux secondes avant d’envoyer un autre message.";
  if (value.code === "42501" || value.message?.includes("CHAT_ACCESS_DENIED")) return "Votre accès au salon n’est plus disponible. Vérifiez votre connexion ou contactez le Bureau.";
  if (value.code === "23514" || value.message === "CHAT_INVALID_BODY") return "Votre message doit contenir entre 1 et 2 000 caractères.";
  return "L’opération n’a pas abouti. Réessayez ; votre texte reste dans le champ de saisie.";
}
