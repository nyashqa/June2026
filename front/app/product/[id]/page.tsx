import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatPrice, Product } from "@/lib/api";
import { fetchProduct } from "@/lib/server-api";
import BuyBox from "@/components/BuyBox";

// SSR: товар рендерится на сервере; интерактив (купить/написать) — в <BuyBox/>
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    const p = await fetchProduct(id);
    return {
      title: `${p.title} — ${formatPrice(p.price_cents, p.currency)} | Pinky Market 💖`,
      description: p.description.slice(0, 160) || `Лот от ${p.seller} на Pinky Market`,
    };
  } catch {
    return { title: "Лот не найден | Pinky Market 💖" };
  }
}

export default async function ProductPage({ params }: Params) {
  const { id } = await params;

  let product: Product;
  try {
    product = await fetchProduct(id);
  } catch {
    notFound();
  }

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

        <BuyBox
          productId={product.id}
          priceCents={product.price_cents}
          currency={product.currency}
          isSold={product.is_sold}
        />
      </div>

      <p style={{ textAlign: "center", marginTop: 18 }}>
        <Link href="/">← назад в каталог</Link>
      </p>
    </div>
  );
}
