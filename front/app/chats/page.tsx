"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, getToken, Chat } from "@/lib/api";

export default function ChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    api
      .listChats()
      .then(setChats)
      .catch((e) => setError(e.message));
  }, [router]);

  if (error) return <p className="error-text">{error}</p>;
  if (!chats)
    return (
      <p className="blink" style={{ textAlign: "center" }}>
        ⏳ Загрузка...
      </p>
    );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="wordart" style={{ textAlign: "center", fontSize: 30 }}>
        💬 Мои чаты 💬
      </h1>

      {chats.length === 0 ? (
        <div className="card" style={{ textAlign: "center" }}>
          <p>Пока тишина... 🦗</p>
          <p style={{ opacity: 0.8 }}>
            Найди что-нибудь миленькое в <Link href="/">каталоге</Link> и напиши
            продавцу! 💖
          </p>
        </div>
      ) : (
        chats.map((c) => (
          <Link key={c.id} href={`/chats/${c.id}`} className="chat-item card">
            <div className="chat-item__title">
              💌 <b>{c.peer}</b>
              <span className="chat-item__product">· {c.product_title}</span>
            </div>
            <div className="chat-item__last">
              {c.last_body ? c.last_body : "нет сообщений — начни первой! ✨"}
            </div>
            <div className="chat-item__date">
              {new Date(c.last_at).toLocaleString("ru-RU")}
            </div>
          </Link>
        ))
      )}

      <p style={{ textAlign: "center", marginTop: 18 }}>
        <Link href="/">← назад в каталог</Link>
      </p>
    </div>
  );
}
