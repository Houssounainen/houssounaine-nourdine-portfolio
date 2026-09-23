import { redirect } from "next/navigation";
import { ChatRoom } from "@/components/chat-room";
import { getAccessContext } from "@/lib/server-access";
import { can } from "@/lib/access";
import { loadChatPage, type ChatMessage } from "@/lib/chat";

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

  return <ChatRoom viewerId={context.user.id} canModerate={can(context.role, "chat_moderate")}
    initialMessages={initialMessages} initialHasMore={hasMore} initiallyUnavailable={unavailable}/>;
}
