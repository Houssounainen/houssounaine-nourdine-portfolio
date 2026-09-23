"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { UiIcon } from "@/components/ui-icon";
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
};

const dayLabel = (date: string) => new Date(date).toLocaleDateString("fr-FR", {
  day: "numeric", month: "long", year: "numeric", timeZone: "Indian/Antananarivo",
});
const timeLabel = (date: string) => new Date(date).toLocaleTimeString("fr-FR", {
  hour: "2-digit", minute: "2-digit", timeZone: "Indian/Antananarivo",
});

export function ChatRoom({ viewerId, canModerate, initialMessages, initialHasMore, initiallyUnavailable }: Props) {
  const [client] = useState(() => createClient());
  const [messages, setMessages] = useState(initialMessages);
  const messagesRef = useRef(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
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

  return <section className="page chat-page">
    <header className="page-header chat-page-header">
      <div><span className="eyebrow">Le lien entre nous</span><h1>Discussion</h1><p className="dashboard-subtitle">Une question, une idée, une bonne nouvelle : partagez-la avec le groupe.</p></div>
      <span className="status-pill"><UiIcon name="shield"/> Espace membres</span>
    </header>
    <div className="chat-layout">
      <section className="chat-room" aria-labelledby="chat-room-title">
        <header className="chat-room-header">
          <span className="chat-room-icon"><UiIcon name="chat" width={25} height={25}/></span>
          <div><h2 id="chat-room-title">Le salon AEDBVT</h2><p>Tous les membres, une seule conversation.</p></div>
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
            {!messages.length && !unavailable && <div className="chat-empty"><span className="chat-empty-icon"><UiIcon name="chat" width={32} height={32}/></span><span className="eyebrow">Bienvenue chez vous</span><h3>La conversation commence avec vous.</h3><p>Présentez-vous, posez une question ou partagez une idée avec les membres de l’association.</p><button className="chat-text-button" type="button" onClick={() => composer.current?.focus()}>Écrire le premier message <UiIcon name="arrow"/></button></div>}
            <ol className="chat-messages" aria-label="Messages">
              {messages.map((message, index) => {
                const own = message.author_id === viewerId;
                const day = dayLabel(message.created_at);
                const showDay = index === 0 || dayLabel(messages[index - 1].created_at) !== day;
                return <li className="chat-message-item" key={message.id}>
                  {showDay && <div className="chat-day"><span>{day}</span></div>}
                  <article className={`chat-message ${own ? "is-own" : ""}`} aria-label={`Message de ${own ? "vous" : message.author_name}`}>
                    {!own && <span className="chat-avatar" aria-hidden="true">{message.author_name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</span>}
                    <div className="chat-message-content">
                      <div className="chat-message-meta"><b>{own ? "Vous" : message.author_name}</b><time dateTime={message.created_at} title={day}>{timeLabel(message.created_at)}</time></div>
                      <div className={`chat-bubble ${message.deleted_at ? "is-removed" : ""}`}>{message.deleted_at ? <em>Message retiré</em> : message.body}</div>
                      {!message.deleted_at && (own || canModerate) && <div className="chat-message-actions">
                        {confirmId === message.id ? <div className="chat-remove-confirm" role="group" aria-label="Confirmer le retrait du message"><span>Retirer ce message pour tous ?</span><button type="button" onClick={() => setConfirmId(null)} disabled={removingId === message.id}>Annuler</button><button type="button" onClick={() => void remove(message.id)} disabled={Boolean(removingId)}>{removingId === message.id ? "Retrait…" : "Confirmer"}</button></div> : <button type="button" onClick={() => setConfirmId(message.id)} disabled={!online}>{own ? "Retirer" : "Modérer"}<span className="sr-only"> le message de {message.author_name} à {timeLabel(message.created_at)}</span></button>}
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
            <label htmlFor="chat-draft">Votre message au groupe</label>
            <div className="chat-composer-input"><textarea ref={composer} id="chat-draft" name="message" value={draft} maxLength={CHAT_MAX_LENGTH} rows={2} placeholder="Écrivez quelque chose…" aria-describedby="chat-composer-hint" onChange={event => setDraft(event.target.value)} onKeyDown={event => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); form.current?.requestSubmit(); }
            }}/><button className="button primary chat-send" type="submit" disabled={sending || !online || !draft.trim()} aria-busy={sending}><UiIcon name="send"/><span>{sending ? "Envoi…" : "Envoyer"}</span></button></div>
            <div className="chat-composer-footer" id="chat-composer-hint"><span>Entrée pour envoyer · Maj + Entrée pour une nouvelle ligne</span><span>{draft.length.toLocaleString("fr-FR")} / 2 000</span></div>
          </form>
        </>}
      </section>
      <aside className="chat-about">
        <span className="chat-about-emblem"><UiIcon name="users" width={28} height={28}/></span>
        <span className="eyebrow">Notre espace commun</span><h2>Plus proches,<br/>même à distance.</h2>
        <p>Un lieu pour s’entraider, organiser un rendez-vous et garder le contact au quotidien.</p>
        <div className="chat-about-note"><UiIcon name="shield"/><p>Les messages sont visibles par tous les membres actifs connectés. Le Bureau et l’administrateur peuvent retirer un message.</p></div>
        <p className="chat-about-kindness">Un bon échange commence par le respect de chacun.</p>
        <Link href="/agenda">Voir nos prochains rendez-vous <UiIcon name="arrow"/></Link>
      </aside>
    </div>
  </section>;
}
