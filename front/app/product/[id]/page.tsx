"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, getToken, Product, formatPrice } from "@/lib/api";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [bought, setBought] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getProduct(id)
      .then(setProduct)
      .catch((e) => setError(e.message));
  }, [id]);

  async function buy() {
    if (!getToken()) {
      router.push("/register");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.buyProduct(id);
      setBought(true);
      setProduct((p) => (p ? { ...p, is_sold: true } : p));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !product) return <p className="error-text">{error}</p>;
  if (!product)
    return (
      <p className="blink" style={{ textAlign: "center" }}>
        ⏳ Загрузка...
      </p>
    );

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="card glitter" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 90 }}>🩲</div>
        <h1 className="wordart" style={{ fontSize: 28 }}>
          {product.title}
        </h1>
        <p style={{ margin: "10px 0", opacity: 0.85 }}>
          продаёт <b>{product.seller}</b>
        </p>

        <table style={{ margin: "12px auto", textAlign: "left", fontSize: 15 }}>
          <tbody>
            {product.size_label && (
              <tr>
                <td>📏 Размер:</td>
                <td><b>{product.size_label}</b></td>
              </tr>
            )}
            {product.color && (
              <tr>
                <td>🎨 Цвет:</td>
                <td><b>{product.color}</b></td>
              </tr>
            )}
            <tr>
              <td>⏰ Дней носки:</td>
              <td><b>{product.days_worn}</b></td>
            </tr>
          </tbody>
        </table>

        {product.description && (
          <p style={{ margin: "12px 0", whiteSpace: "pre-wrap" }}>{product.description}</p>
        )}

        <hr className="hr-hearts" />

        {bought ? (
          <div className="success-box">
            🎉 Заказ оформлен! Продавец свяжется с тобой. 💖
          </div>
        ) : product.is_sold ? (
          <span className="badge-sold" style={{ fontSize: 20 }}>
            ПРОДАНО 💔
          </span>
        ) : (
          <>
            <p className="neon" style={{ fontSize: 30, margin: "8px 0" }}>
              {formatPrice(product.price_cents, product.currency)}
            </p>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn--big glitter" onClick={buy} disabled={busy}>
              {busy ? "⏳..." : "💖 КУПИТЬ 💖"}
            </button>
          </>
        )}
      </div>

      <p style={{ textAlign: "center", marginTop: 18 }}>
        <Link href="/">← назад в каталог</Link>
      </p>
    </div>
  );
}
