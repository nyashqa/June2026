"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, getToken, formatPrice } from "@/lib/api";

type Order = {
  id: number;
  status: string;
  title: string;
  price_cents: number;
  currency: string;
  created_at: string;
};

export default function ProfilePage() {
  const [username, setUsername] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    Promise.all([api.me(), api.myOrders()])
      .then(([me, ord]) => {
        setUsername(me.username);
        setOrders(ord);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <p className="blink" style={{ textAlign: "center" }}>
        ⏳ Загрузка...
      </p>
    );

  if (!username)
    return (
      <div style={{ textAlign: "center" }}>
        <p>Ты не в системе 🥺</p>
        <Link href="/register" className="btn btn--big" style={{ marginTop: 12 }}>
          ✨ Создать аккаунт ✨
        </Link>
      </div>
    );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="wordart" style={{ fontSize: 30, textAlign: "center" }}>
        👛 {username}
      </h1>
      {error && <p className="error-text">{error}</p>}

      <h2 className="neon" style={{ fontSize: 22, margin: "20px 0 10px", textAlign: "center" }}>
        ~ МОИ ПОКУПКИ ~
      </h2>

      {orders.length === 0 ? (
        <div className="card tilt-left" style={{ textAlign: "center" }}>
          <p>Покупок пока нет. <Link href="/">Каталог ждёт 💖</Link></p>
        </div>
      ) : (
        orders.map((o) => (
          <div className="card" key={o.id} style={{ marginBottom: 12 }}>
            <b>{o.title}</b> — {formatPrice(o.price_cents, o.currency)}{" "}
            <span className="badge-new" style={{ animation: "none" }}>
              {o.status}
            </span>
            <p style={{ fontSize: 12, opacity: 0.7 }}>
              {new Date(o.created_at).toLocaleString("ru-RU")}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
