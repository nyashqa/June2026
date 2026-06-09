// Thin client for the Go backend. Token lives in localStorage —
// the whole point is anonymous, frictionless accounts.
//
// By default requests go to the front's own origin (/api/...) and are
// proxied server-side to the backend (see app/api/[...path]/route.ts).
// Set NEXT_PUBLIC_API_URL at build time only if you want direct calls.

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export type Product = {
  id: number;
  seller_id: number;
  seller: string;
  title: string;
  description: string;
  price_cents: number;
  currency: string;
  size_label: string;
  color: string;
  days_worn: number;
  image_url: string;
  is_sold: boolean;
  created_at: string;
};

export type Chat = {
  id: number;
  product_id: number;
  product_title: string;
  buyer_id: number;
  seller_id: number;
  peer: string;
  last_body: string;
  last_at: string;
};

export type Message = {
  id: number;
  chat_id: number;
  sender_id: number;
  sender: string;
  body: string;
  created_at: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pinky_token");
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pinky_username");
}

export function saveSession(token: string, username: string) {
  localStorage.setItem("pinky_token", token);
  localStorage.setItem("pinky_username", username);
}

export function clearSession() {
  localStorage.removeItem("pinky_token");
  localStorage.removeItem("pinky_username");
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export const api = {
  register: (username?: string, password?: string) =>
    request<{ token: string; username: string; password: string }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ username, password }) }
    ),

  login: (username: string, password: string) =>
    request<{ token: string; username: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ id: number; username: string }>("/api/me", {}, true),

  listProducts: () => request<Product[]>("/api/products"),

  getProduct: (id: string | number) => request<Product>(`/api/products/${id}`),

  createProduct: (p: {
    title: string;
    description: string;
    price_cents: number;
    size_label: string;
    color: string;
    days_worn: number;
  }) =>
    request<{ id: number }>(
      "/api/products",
      { method: "POST", body: JSON.stringify(p) },
      true
    ),

  buyProduct: (id: string | number) =>
    request<{ order_id: number }>(
      `/api/products/${id}/buy`,
      { method: "POST" },
      true
    ),

  startChat: (productId: string | number) =>
    request<{ chat_id: number }>(
      `/api/products/${productId}/chat`,
      { method: "POST" },
      true
    ),

  listChats: () => request<Chat[]>("/api/chats", {}, true),

  listMessages: (chatId: string | number, after = 0) =>
    request<Message[]>(`/api/chats/${chatId}/messages?after=${after}`, {}, true),

  sendMessage: (chatId: string | number, body: string) =>
    request<Message>(
      `/api/chats/${chatId}/messages`,
      { method: "POST", body: JSON.stringify({ body }) },
      true
    ),

  myOrders: () =>
    request<
      {
        id: number;
        status: string;
        title: string;
        price_cents: number;
        currency: string;
        created_at: string;
      }[]
    >("/api/orders", {}, true),
};

export function formatPrice(cents: number, currency: string) {
  const sym = currency === "RUB" ? "₽" : currency === "USD" ? "$" : currency;
  return `${(cents / 100).toLocaleString("ru-RU")} ${sym}`;
}
