import Link from "next/link";
import { Product, formatPrice } from "@/lib/api";

const EMOJIS = ["🩲", "👙", "🎀", "🌸", "💝"];

export default function ProductCard({ product }: { product: Product }) {
  const emoji = EMOJIS[product.id % EMOJIS.length];
  const isFresh =
    Date.now() - new Date(product.created_at).getTime() < 1000 * 60 * 60 * 24;

  return (
    <Link href={`/product/${product.id}`} className="product-card glitter">
      <div className="product-card__emoji">{emoji}</div>
      <h3>{product.title}</h3>
      <p style={{ fontSize: 13, opacity: 0.8 }}>
        от <b>{product.seller}</b>
        {product.size_label && <> · размер {product.size_label}</>}
        {product.days_worn > 0 && <> · {product.days_worn} дн. носки</>}
      </p>
      {product.is_sold ? (
        <span className="badge-sold">ПРОДАНО</span>
      ) : (
        <span className="product-card__price">
          {formatPrice(product.price_cents, product.currency)}
        </span>
      )}
      {isFresh && !product.is_sold && (
        <div>
          <span className="badge-new">NEW!!</span>
        </div>
      )}
    </Link>
  );
}
