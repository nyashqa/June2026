"use client";

import { useState } from "react";
import Link from "next/link";
import { api, saveSession } from "@/lib/api";

export default function RegisterPage() {
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function register(username?: string) {
    setBusy(true);
    setError("");
    try {
      const res = await api.register(username || undefined);
      saveSession(res.token, res.username);
      setCreds({ username: res.username, password: res.password });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (creds) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <h1 className="wordart" style={{ fontSize: 32 }}>
          ✨ ГОТОВО! ✨
        </h1>
        <div className="success-box" style={{ marginTop: 16 }}>
          <p style={{ marginBottom: 10 }}>
            Твой анонимный аккаунт создан! Сохрани это — пароль показывается{" "}
            <span className="blink">ОДИН РАЗ</span>:
          </p>
          <p className="credentials">
            логин: <b>{creds.username}</b>
            <br />
            пароль: <b>{creds.password}</b>
          </p>
          <button
            className="btn"
            style={{ marginTop: 12 }}
            onClick={() =>
              navigator.clipboard.writeText(
                `${creds.username} / ${creds.password}`
              )
            }
          >
            📋 Скопировать
          </button>
        </div>
        <p style={{ marginTop: 20 }}>
          <Link href="/" className="btn btn--big">
            🛍️ В каталог!
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <h1 className="wordart" style={{ fontSize: 32 }}>
        АНОНИМНАЯ РЕГИСТРАЦИЯ
      </h1>
      <p style={{ margin: "14px 0" }}>
        Без email. Без телефона. Без имени. <b>Вообще без всего.</b>
        <br />
        Жмёшь кнопку — получаешь милый ник и пароль. Всё. 💅
      </p>

      {error && <p className="error-text">{error}</p>}

      <button
        className="btn btn--big glitter"
        disabled={busy}
        onClick={() => register()}
        style={{ marginTop: 10 }}
      >
        {busy ? "⏳ Колдуем..." : "🎀 Создать аккаунт в 1 клик 🎀"}
      </button>

      <hr className="hr-hearts" />

      <details className="card tilt-right" style={{ textAlign: "left" }}>
        <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
          Хочу свой ник 💁‍♀️
        </summary>
        <div className="form" style={{ marginTop: 12 }}>
          <input
            placeholder="например: glitter_queen_2000"
            value={customName}
            maxLength={32}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <button
            className="btn"
            disabled={busy || !customName.trim()}
            onClick={() => register(customName.trim())}
          >
            Создать с этим ником
          </button>
          <p style={{ fontSize: 13 }}>Пароль всё равно сгенерируем сами — безопаснее.</p>
        </div>
      </details>

      <p style={{ marginTop: 16 }}>
        Уже есть аккаунт? <Link href="/login">Войти 🔑</Link>
      </p>
    </div>
  );
}
