"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Product } from "@/lib/api";
import ProductCard from "@/components/ProductCard";
import BounceText from "@/components/BounceText";

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listProducts()
      .then(setProducts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section style={{ textAlign: "center", padding: "24px 0" }}>
        <h1 className="wordart" style={{ fontSize: 44 }}>
          <BounceText text="PINKY MARKET" />
        </h1>
        <p style={{ fontSize: 18, marginTop: 12 }}>
          🩲 Маркетплейс ношеных трусиков 🩲
        </p>
        <p className="blink" style={{ fontWeight: 900, marginTop: 8 }}>
          !!! ПОЛНОСТЬЮ АНОНИМНО — РЕГИСТРАЦИЯ В ОДИН КЛИК !!!
        </p>
        <div style={{ marginTop: 18, display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/register" className="btn btn--big glitter">
            ✨ Начать анонимно ✨
          </Link>
          <Link href="/sell" className="btn btn--big btn--lime">
            💸 Продать свои
          </Link>
        </div>
      </section>

      <hr className="hr-hearts" />

      <h2 className="neon" style={{ textAlign: "center", fontSize: 26 }}>
        ~ СВЕЖИЕ ЛОТЫ ~
      </h2>

      {loading && (
        <p style={{ textAlign: "center", marginTop: 20 }} className="blink">
          ⏳ Загрузка... (почти как на dial-up)
        </p>
      )}
      {error && (
        <p className="error-text" style={{ marginTop: 20 }}>
          Не удалось загрузить каталог: {error}
        </p>
      )}
      {!loading && !error && products.length === 0 && (
        <div className="card tilt-left" style={{ textAlign: "center", margin: "24px auto", maxWidth: 420 }}>
          <p style={{ fontSize: 40 }}>🛍️</p>
          <p>
            Пока пусто! Стань первым продавцом —{" "}
            <Link href="/sell">выложи лот</Link> 💖
          </p>
        </div>
      )}

      <div className="product-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
