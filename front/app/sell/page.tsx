"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken } from "@/lib/api";

export default function SellPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("M");
  const [color, setColor] = useState("розовый");
  const [daysWorn, setDaysWorn] = useState("1");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setAuthed(!!getToken());
  }, []);

  if (authed === null) return null;

  if (!authed) {
    return (
      <div style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <h1 className="wordart" style={{ fontSize: 30 }}>
          СНАЧАЛА АККАУНТ 💁‍♀️
        </h1>
        <p style={{ margin: "14px 0" }}>
          Чтобы продавать, нужен анонимный аккаунт. Это один клик, честно:
        </p>
        <Link href="/register" className="btn btn--big glitter">
          ✨ Создать за 1 клик ✨
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const priceCents = Math.round(parseFloat(price.replace(",", ".")) * 100);
      if (!priceCents || priceCents <= 0) throw new Error("Укажи нормальную цену 💅");
      const res = await api.createProduct({
        title,
        description,
        price_cents: priceCents,
        size_label: size,
        color,
        days_worn: parseInt(daysWorn) || 1,
      });
      router.push(`/product/${res.id}`);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="wordart" style={{ fontSize: 32, textAlign: "center" }}>
        💸 НОВЫЙ ЛОТ 💸
      </h1>
      <form className="form card" style={{ marginTop: 18, maxWidth: "100%" }} onSubmit={submit}>
        {error && <p className="error-text">{error}</p>}

        <label>Название лота 🎀</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Розовые кружевные, неделя в спортзале"
          maxLength={120}
          required
        />

        <label>Описание 📝</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Расскажи подробности: материал, история, особые условия..."
        />

        <label>Цена, ₽ 💰</label>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="3000"
          inputMode="decimal"
          required
        />

        <label>Размер 📏</label>
        <select value={size} onChange={(e) => setSize(e.target.value)}>
          <option>XS</option>
          <option>S</option>
          <option>M</option>
          <option>L</option>
          <option>XL</option>
        </select>

        <label>Цвет 🎨</label>
        <input value={color} onChange={(e) => setColor(e.target.value)} maxLength={40} />

        <label>Дней носки ⏰</label>
        <input
          type="number"
          min={1}
          max={30}
          value={daysWorn}
          onChange={(e) => setDaysWorn(e.target.value)}
        />

        <button className="btn btn--big btn--lime" disabled={busy} type="submit">
          {busy ? "⏳ Выкладываем..." : "🚀 Выложить лот"}
        </button>
      </form>
    </div>
  );
}
