// Server-side data fetching for SSR pages (server components).
// Talks to the Go backend directly via runtime API_URL (internal docker
// network in Dokploy) — no proxy hop, no client round-trip.
//
// Only PUBLIC data can be fetched here: auth token lives in localStorage
// and never reaches the Next server, so /chats, /profile etc. stay client-side.

import { cache } from "react";
import type { Product } from "./api";

const API_URL = process.env.API_URL || "http://localhost:8080";

async function serverFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data as T;
}

export function fetchProducts(): Promise<Product[]> {
  return serverFetch<Product[]>("/api/products");
}

// cache(): generateMetadata и страница зовут fetchProduct в одном запросе —
// в бэкенд уйдёт только один запрос
export const fetchProduct = cache((id: string): Promise<Product> => {
  return serverFetch<Product>(`/api/products/${id}`);
});
