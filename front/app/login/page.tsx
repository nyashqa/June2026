"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, saveSession } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.login(username, password);
      saveSession(res.token, res.username);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1 className="wordart" style={{ fontSize: 32, textAlign: "center" }}>
        ВХОД 🔑
      </h1>
      <form className="form card" style={{ marginTop: 18 }} onSubmit={submit}>
        {error && <p className="error-text">{error}</p>}
        <label>Ник</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="glitter_kitten_1337"
          required
        />
        <label>Пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn btn--big" disabled={busy} type="submit">
          {busy ? "⏳..." : "💖 Войти"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: 14 }}>
        Нет аккаунта? <Link href="/register">Создать анонимно ✨</Link>
      </p>
    </div>
  );
}
