"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UiIcon } from "@/components/ui-icon";
import { Avatar, AvatarStack } from "@/components/avatar";
import {
  CHAT_MAX_LENGTH, chatErrorMessage, isChatMessage, loadChatPage, mergeChatMessages,
  reconcileChatMessages, removeChatMessage, sendChatMessage, synchronizeChat, type ChatMessage,
} from "@/lib/chat";
import "@/app/chat.css";

type Props = {
  viewerId: string;
  canModerate: boolean;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  initiallyUnavailable: boolean;
  /** Noms et photos de profil connus (auteurs des messages, membres). */
  people?: Record<string, ChatPerson>;
  /** Membres actifs, pour la liste latérale du salon. */
  members?: ChatPerson[];
};

export type ChatPerson = { id: string; full_name: string; avatar_url: string | null };

/** Deux messages se suivent « en rafale » s’ils viennent du même auteur à moins de 5 minutes. */
const GROUP_GAP = 5 * 60 * 1000;

const dayLabel = (date: string) => new Date(date).toLocaleDateString("fr-FR", {
  day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Antananarivo",
});
const timeLabel = (date: string) => new Date(date).toLocaleTimeString("fr-FR", {
  hour: "2-digit", minute: "2-digit", timeZone: "Indian/Antananarivo",
});

export function ChatRoom({ viewerId, canModerate, initialMessages, initialHasMore, initiallyUnavailable, people: initialPeople = {}, members = [] }: Props) {
  const [client] = useState(() => createClient());
  const [messages, setMessages] = useState(initialMessages);
  const messagesRef = useRef(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(initiallyUnavailable);
  const [blocked, setBlocked] = useState(false);
  const [online, setOnline] = useState(true);
  const [live, setLive] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [newMessages, setNewMessages] = useState(false);
  const mounted = useRef(false);
  const blockedRef = useRef(false);
  const syncingRef = useRef(false);
  const sendingRef = useRef(false);
  const historyRef = useRef(false);
  const retry = useRef<{ id: string; text: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);
  const historyAnchor = useRef<{ height: number; top: number } | null>(null);

  // Mentions « J’aime » : chargées à part, pour ne pas alourdir la synchronisation des messages.
  const [likes, setLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const likeIds = messages.filter(message => !message.deleted_at).map(message => message.id).join(",");
  useEffect(() => {
    const ids = likeIds ? likeIds.split(",") : [];
    if (!ids.length) return;
    let cancelled = false;
    void client.from("chat_message_likes").select("message_id,user_id").in("message_id", ids.slice(-150)).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      const next: Record<string, { count: number; liked: boolean }> = {};
      for (const row of data as { message_id: string; user_id: string }[]) {
        const entry = next[row.message_id] || { count: 0, liked: false };
        entry.count += 1; if (row.user_id === viewerId) entry.liked = true;
        next[row.message_id] = entry;
      }
      setLikes(next);
    });
    return () => { cancelled = true; };
  }, [client, likeIds, viewerId]);
  const toggleLike = useCallback(async (id: string) => {
    const current = likes[id] || { count: 0, liked: false };
    const liked = !current.liked;
    setLikes(state => ({ ...state, [id]: { liked, count: Math.max(0, current.count + (liked ? 1 : -1)) } }));
    const { error } = liked
      ? await client.from("chat_message_likes").insert({ message_id: id })
      : await client.from("chat_message_likes").delete().eq("message_id", id).eq("user_id", viewerId);
    if (error && error.code !== "23505") setLikes(state => ({ ...state, [id]: current }));
  }, [client, likes, viewerId]);

  // Photos de profil des auteurs : celles connues au chargement, complétées à l’arrivée de nouveaux auteurs.
  const [people, setPeople] = useState<Record<string, ChatPerson>>(initialPeople);
  const missingAuthors = [...new Set(messages.map(message => message.author_id))].filter(id => !people[id]).sort().join(",");
  useEffect(() => {
    if (!missingAuthors) return;
    let cancelled = false;
    void client.rpc("get_people", { p_ids: missingAuthors.split(",") }).then(({ data, error }) => {
      if (cancelled || error || !Array.isArray(data)) return;
      setPeople(state => {
        const next = { ...state };
        for (const person of data as ChatPerson[]) next[person.id] = person;
        // Évite de redemander en boucle un auteur introuvable (compte désactivé).
        for (const id of missingAuthors.split(",")) if (!next[id]) next[id] = { id, full_name: "", avatar_url: null };
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [client, missingAuthors]);

  const updateMessages = useCallback((update: (current: ChatMessage[]) => ChatMessage[]) => {
    if (!mounted.current || blockedRef.current) return;
    const next = update(messagesRef.current);
    messagesRef.current = next;
    setMessages(next);
  }, []);

  const blockAccess = useCallback(() => {
    blockedRef.current = true;
    messagesRef.current = [];
    setMessages([]);
    setDraft("");
    retry.current = null;
    setBlocked(true);
    setLive(false);
  }, []);

  const synchronize = useCallback(async () => {
    if (syncingRef.current || blockedRef.current || !mounted.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    const snapshot = messagesRef.current;
    try {
      const profile = await client.from("profiles").select("id,active").eq("id", viewerId)
        .abortSignal(AbortSignal.timeout(15000)).maybeSingle();
      if (profile.error) throw profile.error;
      if (!mounted.current) return;
      if (!profile.data?.active) { blockAccess(); return; }
      const result = await synchronizeChat(client, snapshot);
      if (!mounted.current || blockedRef.current) return;
      if (!nearBottom.current && result.messages.some(row => !messagesRef.current.some(item => item.id === row.id))) setNewMessages(true);
      updateMessages(current => reconcileChatMessages(current, snapshot.map(row => row.id), result.messages));
      if (result.hasMore !== undefined) setHasMore(result.hasMore);
      setUnavailable(false);
    } catch {
      if (mounted.current) setUnavailable(true);
    } finally {
      syncingRef.current = false;
      if (mounted.current) setSyncing(false);
    }
  }, [client, viewerId, blockAccess, updateMessages]);

  useEffect(() => {
    mounted.current = true;
    setOnline(navigator.onLine);
    const receive = (payload: { new: unknown }) => {
      if (!mounted.current || blockedRef.current || !isChatMessage(payload.new)) return;
      const message = payload.new;
      if (!nearBottom.current && !messagesRef.current.some(row => row.id === message.id)) setNewMessages(true);
      updateMessages(current => mergeChatMessages(current, [message]));
    };
    const channel = client.channel(`aedbvt-chat:${viewerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, receive)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, receive)
      .subscribe(status => {
        if (!mounted.current || blockedRef.current) return;
        setLive(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") void synchronize();
      });
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (mounted.current && (event === "SIGNED_OUT" || (session && session.user.id !== viewerId))) blockAccess();
    });
    const reconnect = () => { setOnline(navigator.onLine); void synchronize(); };
    const offline = () => { setOnline(false); setLive(false); };
    const visible = () => { if (document.visibilityState === "visible") void synchronize(); };
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    // Keeps the room usable when WebSockets are temporarily unavailable.
    const interval = window.setInterval(visible, 30000);
    void synchronize();
    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      subscription.unsubscribe();
      void client.removeChannel(channel);
    };
  }, [client, viewerId, synchronize, blockAccess, updateMessages]);

  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (historyAnchor.current) {
      element.scrollTop = historyAnchor.current.top + element.scrollHeight - historyAnchor.current.height;
      historyAnchor.current = null;
    } else if (nearBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  async function loadHistory() {
    const oldest = messagesRef.current[0];
    if (!oldest || historyRef.current || blockedRef.current) return;
    historyRef.current = true;
    setLoadingHistory(true);
    setError(null);
    try {
      const page = await loadChatPage(client, oldest);
      if (!mounted.current || blockedRef.current) return;
      if (scroller.current) historyAnchor.current = { height: scroller.current.scrollHeight, top: scroller.current.scrollTop };
      nearBottom.current = false;
      updateMessages(current => mergeChatMessages(current, page.messages));
      setHasMore(page.hasMore);
    } catch {
      if (mounted.current) setError("Les messages précédents n’ont pas pu être chargés. Réessayez.");
    } finally {
      historyRef.current = false;
      if (mounted.current) setLoadingHistory(false);
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || text.length > CHAT_MAX_LENGTH || sendingRef.current || blockedRef.current || !online) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    const originalDraft = draft;
    if (retry.current?.text !== text) retry.current = { id: crypto.randomUUID(), text };
    try {
      const message = await sendChatMessage(client, retry.current.id, text, viewerId);
      if (!mounted.current || blockedRef.current) return;
      nearBottom.current = true;
      setNewMessages(false);
      updateMessages(current => mergeChatMessages(current, [message]));
      setDraft(current => current === originalDraft ? "" : current);
      retry.current = null;
      composer.current?.focus();
    } catch (reason) {
      if (mounted.current && !blockedRef.current) setError(chatErrorMessage(reason));
    } finally {
      sendingRef.current = false;
      if (mounted.current) setSending(false);
    }
  }

  async function remove(id: string) {
    if (removingId || blockedRef.current) return;
    setRemovingId(id);
    setError(null);
    try {
      const message = await removeChatMessage(client, id);
      updateMessages(current => mergeChatMessages(current, [message]));
      if (mounted.current) setConfirmId(null);
    } catch {
      if (mounted.current) setError("Ce message n’a pas pu être retiré. Vérifiez vos droits ou réessayez.");
    } finally {
      if (mounted.current) setRemovingId(null);
    }
  }

  function goToLatest() {
    nearBottom.current = true;
    setNewMessages(false);
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }

  const last = messages[messages.length - 1];
  const me = people[viewerId] || members.find(member => member.id === viewerId);
  const nameOf = (message: ChatMessage) => people[message.author_id]?.full_name || message.author_name;
  const photoOf = (id: string) => people[id]?.avatar_url || null;
  const participants = members.length ? members : Object.values(people).filter(person => person.full_name);
  const sameRun = (a: ChatMessage | undefined, b: ChatMessage | undefined) => Boolean(a && b && a.author_id === b.author_id
    && dayLabel(a.created_at) === dayLabel(b.created_at) && Math.abs(Date.parse(b.created_at) - Date.parse(a.created_at)) < GROUP_GAP);

  return <section className="page chat-page soc-chat">
    <div className="chat-layout soc-chat-layout">
      <aside className="soc-chat-list" aria-label="Conversations">
        <header><h1>Discussions</h1></header>
        <div className="soc-chat-convo is-active" aria-current="true">
          <span className="soc-chat-group-icon"><UiIcon name="chat"/></span>
          <span className="soc-chat-convo-text"><b>Salon général</b><small>{last ? `${last.author_id === viewerId ? "Vous" : nameOf(last).split(/\s+/)[0]} : ${last.deleted_at ? "message retiré" : last.body}` : "Aucun message pour l’instant"}</small></span>
          {last && <time dateTime={last.created_at}>{timeLabel(last.created_at)}</time>}
        </div>
        {participants.length > 0 && <>
          <p className="soc-chat-list-label">Membres · {participants.length}</p>
          <ul className="soc-chat-members">
            {participants.slice(0, 30).map(person => <li key={person.id}><Link href={`/people/${person.id}`}>
              <Avatar name={person.full_name} url={person.avatar_url} size={36}/>
              <span>{person.full_name}{person.id === viewerId && <small> (vous)</small>}</span>
            </Link></li>)}
          </ul>
        </>}
      </aside>
      <section className="chat-room" aria-labelledby="chat-room-title">
        <header className="chat-room-header">
          <span className="soc-chat-group-icon"><UiIcon name="chat"/></span>
          <div className="soc-chat-room-title"><h2 id="chat-room-title">Salon général</h2><p>Tous les membres actifs · le Bureau peut retirer un message</p></div>
          {participants.length > 0 && <span className="soc-chat-stack"><AvatarStack people={participants.map(person => ({ name: person.full_name, url: person.avatar_url }))} max={4} size={28}/></span>}
          <span className={`chat-connection ${live && online && !blocked ? "is-live" : ""}`} role="status"><i aria-hidden="true"/>{blocked ? "Accès fermé" : !online ? "Hors connexion" : syncing ? "Synchronisation…" : live ? "En direct" : "Actualisation auto"}</span>
        </header>
        {blocked ? <div className="chat-empty" role="alert"><UiIcon name="shield" width={36} height={36}/><h3>Votre accès au salon est fermé.</h3><p>Reconnectez-vous avec un compte membre actif pour retrouver la discussion.</p><Link className="button primary" href="/login">Se reconnecter</Link></div> : <>
          {unavailable && <div className="chat-notice" role="status">La discussion n’a pas pu être actualisée. <button type="button" onClick={() => void synchronize()} disabled={syncing || !online}>Réessayer</button></div>}
          {!online && <div className="chat-notice" role="status">Vous êtes hors connexion. Votre texte reste ici pendant que vous retrouvez le réseau.</div>}
          <div ref={scroller} className="chat-scroll" role="region" aria-label="Historique de la discussion" tabIndex={0} onScroll={() => {
            const element = scroller.current;
            if (!element) return;
            nearBottom.current = element.scrollHeight - element.clientHeight - element.scrollTop < 80;
            if (nearBottom.current) setNewMessages(false);
          }}>
            {hasMore && <div className="chat-history-control"><button className="chat-text-button" type="button" disabled={loadingHistory || !online} onClick={() => void loadHistory()}>{loadingHistory ? "Chargement…" : "Voir les messages précédents"}</button></div>}
            {!messages.length && !unavailable && <div className="chat-empty"><span className="icon-tile lg solid" style={{ "--tile": "#0ba5ec" } as React.CSSProperties}><UiIcon name="chat"/></span><h3>Aucun message</h3><p>Les messages envoyés ici sont visibles par tous les membres actifs.</p><button className="chat-text-button" type="button" onClick={() => composer.current?.focus()}>Écrire le premier message <UiIcon name="arrow"/></button></div>}
            <ol className="chat-messages" aria-label="Messages">
              {messages.map((message, index) => {
                const own = message.author_id === viewerId;
                const day = dayLabel(message.created_at);
                const showDay = index === 0 || dayLabel(messages[index - 1].created_at) !== day;
                const joinsPrev = sameRun(messages[index - 1], message);
                const joinsNext = sameRun(message, messages[index + 1]);
                const name = nameOf(message);
                const like = likes[message.id];
                const position = joinsPrev ? (joinsNext ? "is-middle" : "is-last") : (joinsNext ? "is-first" : "is-single");
                return <li className={`chat-message-item soc-msg-item ${position}`} key={message.id}>
                  {showDay && <div className="chat-day"><span>{day}</span></div>}
                  <article className={`chat-message soc-msg ${own ? "is-own" : ""} ${position}${selectedId === message.id ? " is-selected" : ""}`} aria-label={`Message de ${own ? "vous" : name}`}>
                    {!own && (joinsNext ? <span className="soc-msg-spacer" aria-hidden="true"/> : <Avatar name={name} url={photoOf(message.author_id)} size={32} href={`/people/${message.author_id}`} className="soc-msg-avatar"/>)}
                    <div className="chat-message-content">
                      {!joinsPrev && !own && <div className="chat-message-meta"><b>{name}</b></div>}
                      <div className="soc-msg-line">
                        <div className={`chat-bubble ${message.deleted_at ? "is-removed" : ""}`} onClick={() => setSelectedId(current => current === message.id ? null : message.id)} onDoubleClick={() => { if (!message.deleted_at) void toggleLike(message.id); }}>
                          {message.deleted_at ? <em>Message retiré</em> : message.body}
                          <time className="soc-msg-time" dateTime={message.created_at} title={day}>{timeLabel(message.created_at)}</time>
                          {!message.deleted_at && like?.count ? <span className={`soc-msg-reaction${like.liked ? " is-liked" : ""}`} aria-hidden="true"><UiIcon name="heart"/>{like.count > 1 && like.count}</span> : null}
                        </div>
                        {!message.deleted_at && <div className="soc-msg-tools">
                          <button type="button" className={`chat-like${like?.liked ? " is-liked" : ""}${like?.count ? " has-count" : ""}`} aria-pressed={Boolean(like?.liked)} aria-label={`${like?.liked ? "Je n’aime plus" : "J’aime"}${like?.count ? ` (${like.count})` : ""}`} onClick={() => void toggleLike(message.id)}><UiIcon name="heart"/></button>
                          {(own || canModerate) && confirmId !== message.id && <button type="button" className="soc-msg-remove" onClick={() => setConfirmId(message.id)} disabled={!online} aria-label={`${own ? "Retirer" : "Modérer"} le message de ${name} à ${timeLabel(message.created_at)}`}><UiIcon name="trash"/></button>}
                        </div>}
                      </div>
                      {!message.deleted_at && (own || canModerate) && confirmId === message.id && <div className="chat-message-actions">
                        <div className="chat-remove-confirm" role="group" aria-label="Confirmer le retrait du message"><span>Retirer ce message pour tous ?</span><button type="button" onClick={() => setConfirmId(null)} disabled={removingId === message.id}>Annuler</button><button type="button" onClick={() => void remove(message.id)} disabled={Boolean(removingId)}>{removingId === message.id ? "Retrait…" : "Confirmer"}</button></div>
                      </div>}
                    </div>
                  </article>
                </li>;
              })}
            </ol>
          </div>
          {newMessages && <button className="chat-new-messages" type="button" onClick={goToLatest}>Nouveaux messages <UiIcon name="arrow"/></button>}
          <div className="sr-only" role="status" aria-live="polite">{newMessages ? "De nouveaux messages sont disponibles." : ""}</div>
          <form ref={form} onSubmit={send} className="chat-composer">
            {error && <p className="chat-error" role="alert">{error}</p>}
            <label htmlFor="chat-draft" className="sr-only">Message</label>
            <div className="chat-composer-input">
              <Avatar name={me?.full_name || "Vous"} url={me?.avatar_url || null} size={36} className="soc-composer-avatar"/>
              <textarea ref={composer} id="chat-draft" name="message" value={draft} maxLength={CHAT_MAX_LENGTH} rows={1} placeholder="Écrire un message…" aria-describedby="chat-composer-hint" onChange={event => setDraft(event.target.value)} onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); form.current?.requestSubmit(); }
              }}/>
              <button className="button primary chat-send" type="submit" disabled={sending || !online || !draft.trim()} aria-busy={sending}><UiIcon name="send"/><span>{sending ? "Envoi…" : "Envoyer"}</span></button>
            </div>
            <div className="chat-composer-footer" id="chat-composer-hint"><span>Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</span><span>{draft.length.toLocaleString("fr-FR")} / 2 000</span></div>
          </form>
        </>}
      </section>
    </div>
  </section>;
}
