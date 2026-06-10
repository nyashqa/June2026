import Link from "next/link";
import { Product } from "@/lib/api";
import { fetchProducts } from "@/lib/server-api";
import ProductCard from "@/components/ProductCard";
import BounceText from "@/components/BounceText";

// SSR: каталог рендерится на сервере при каждом запросе (данные свежие,
// страница приходит готовой — без клиентского "Загрузка...")
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let products: Product[] = [];
  let error = "";
  try {
    products = await fetchProducts();
  } catch (e) {
    error = e instanceof Error ? e.message : "backend unreachable";
  }

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

      {error && (
        <p className="error-text" style={{ marginTop: 20 }}>
          Не удалось загрузить каталог: {error}
        </p>
      )}
      {!error && products.length === 0 && (
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
