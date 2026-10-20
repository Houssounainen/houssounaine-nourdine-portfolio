import { redirect } from "next/navigation";
import { ChatRoom } from "@/components/chat-room";
import { getAccessContext } from "@/lib/server-access";
import { can } from "@/lib/access";
import { loadChatPage, type ChatMessage } from "@/lib/chat";
import { getPeople } from "@/lib/people";
import type { ChatPerson } from "@/components/chat-room";

export const metadata = { title: "Discussion | AEDBVT" };
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const context = await getAccessContext();
  if (!context.user) redirect("/login?next=/chat");
  if (!context.allowed) redirect("/access-denied");

  let initialMessages: ChatMessage[] = [];
  let hasMore = false;
  let unavailable = false;
  try {
    const page = await loadChatPage(context.supabase);
    initialMessages = page.messages;
    hasMore = page.hasMore;
  } catch {
    unavailable = true;
  }

  // Photos de profil des auteurs et liste des membres du salon (dégradation silencieuse si indisponible).
  const [known, { data: memberRows }] = await Promise.all([
    getPeople(context.supabase, [context.user.id, ...initialMessages.map(message => message.author_id)]).catch(() => new Map()),
    Promise.resolve(context.supabase.rpc("list_people", { p_query: null, p_limit: 60 })).catch(() => ({ data: null })),
  ]);
  const people: Record<string, ChatPerson> = {};
  for (const person of known.values()) people[person.id] = { id: person.id, full_name: person.full_name, avatar_url: person.avatar_url };
  const members = (Array.isArray(memberRows) ? memberRows : []).map((row: ChatPerson) => ({ id: row.id, full_name: row.full_name, avatar_url: row.avatar_url }));

  return <ChatRoom viewerId={context.user.id} canModerate={can(context.role, "chat_moderate")}
    initialMessages={initialMessages} initialHasMore={hasMore} initiallyUnavailable={unavailable}
    people={people} members={members}/>;
}
