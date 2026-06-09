"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUsername, clearSession } from "@/lib/api";

export default function Header() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(getUsername());
    const onStorage = () => setUsername(getUsername());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="logo wordart">
          💖 PINKY MARKET 💖
        </Link>
        <nav className="nav">
          <Link href="/" className="btn">
            🛍️ Каталог
          </Link>
          <Link href="/sell" className="btn btn--lime">
            💸 Продать
          </Link>
          {username ? (
            <>
              <Link href="/chats" className="btn">
                💬 Чаты
              </Link>
              <Link href="/profile" className="btn">
                👛 {username}
              </Link>
              <button
                className="btn"
                onClick={() => {
                  clearSession();
                  setUsername(null);
                  window.location.href = "/";
                }}
              >
                🚪 Выйти
              </button>
            </>
          ) : (
            <>
              <Link href="/register" className="btn">
                ✨ Регистрация
              </Link>
              <Link href="/login" className="btn">
                🔑 Вход
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
