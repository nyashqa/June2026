"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken, getUsername, Message } from "@/lib/api";

const POLL_MS = 3000;

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);
  const me = getUsername();

  const appendNew = useCallback((incoming: Message[]) => {
    if (incoming.length === 0) return;
    lastIdRef.current = incoming[incoming.length - 1].id;
    setMessages((prev) => [...(prev ?? []), ...incoming]);
  }, []);

  // initial load + polling for new messages
  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    let stopped = false;

    api
      .listMessages(id)
      .then((msgs) => {
        if (stopped) return;
        setMessages([]);
        appendNew(msgs);
      })
      .catch((e) => setError(e.message));

    const timer = setInterval(() => {
      api
        .listMessages(id, lastIdRef.current)
        .then((msgs) => !stopped && appendNew(msgs))
        .catch(() => {}); // transient poll errors are fine
    }, POLL_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [id, router, appendNew]);

  // scroll to the newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      const m = await api.sendMessage(id, body);
      setText("");
      // полл мог уже принести это сообщение — не дублируем
      if (m.id > lastIdRef.current) appendNew([m]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !messages) return <p className="error-text">{error}</p>;
  if (!messages)
    return (
      <p className="blink" style={{ textAlign: "center" }}>
        ⏳ Загрузка...
      </p>
    );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="wordart" style={{ textAlign: "center", fontSize: 26 }}>
        💬 Чат 💬
      </h1>

      <div className="card chat-box">
        {messages.length === 0 && (
          <p style={{ textAlign: "center", opacity: 0.7 }}>
            Сообщений пока нет — напиши первой! ✨
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              "chat-msg " + (m.sender === me ? "chat-msg--mine" : "chat-msg--theirs")
            }
          >
            <div className="chat-msg__sender">{m.sender === me ? "ты 💖" : m.sender}</div>
            <div className="chat-msg__body">{m.body}</div>
            <div className="chat-msg__time">
              {new Date(m.created_at).toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="error-text">{error}</p>}

      <form className="chat-input" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Напиши что-нибудь миленькое... 💕"
          maxLength={2000}
        />
        <button className="btn glitter" type="submit" disabled={busy || !text.trim()}>
          {busy ? "⏳" : "💌 Отправить"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 18 }}>
        <Link href="/chats">← все чаты</Link>
      </p>
    </div>
  );
}
