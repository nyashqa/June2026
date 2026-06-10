"use client";

// Интерактивная часть страницы товара (купить / написать продавцу).
// Сама страница — серверный компонент (SSR), см. app/product/[id]/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, formatPrice } from "@/lib/api";

type Props = {
  productId: number;
  priceCents: number;
  currency: string;
  isSold: boolean;
};

export default function BuyBox({ productId, priceCents, currency, isSold }: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [bought, setBought] = useState(false);
  const [busy, setBusy] = useState(false);

  async function writeSeller() {
    if (!getToken()) {
      router.push("/register");
      return;
    }
    setError("");
    try {
      const { chat_id } = await api.startChat(productId);
      router.push(`/chats/${chat_id}`);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function buy() {
    if (!getToken()) {
      router.push("/register");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.buyProduct(productId);
      setBought(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (bought) {
    return (
      <>
        <div className="success-box">
          🎉 Заказ оформлен! Обсуди доставку с продавцом. 💖
        </div>
        <button className="btn btn--lime" onClick={writeSeller}>
          💬 Написать продавцу
        </button>
      </>
    );
  }

  if (isSold) {
    return (
      <span className="badge-sold" style={{ fontSize: 20 }}>
        ПРОДАНО 💔
      </span>
    );
  }

  return (
    <>
      <p className="neon" style={{ fontSize: 30, margin: "8px 0" }}>
        {formatPrice(priceCents, currency)}
      </p>
      {error && <p className="error-text">{error}</p>}
      <button className="btn btn--big glitter" onClick={buy} disabled={busy}>
        {busy ? "⏳..." : "💖 КУПИТЬ 💖"}
      </button>
      <p style={{ marginTop: 12 }}>
        <button className="btn btn--lime" onClick={writeSeller}>
          💬 Написать продавцу
        </button>
      </p>
    </>
  );
}
