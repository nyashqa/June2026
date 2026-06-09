import { NextRequest } from "next/server";

// Server-side proxy to the Go backend. The browser always talks to the
// front's own origin (/api/...), so no CORS and no build-time URL baking.
// API_URL is a runtime env var — internal docker-network host works fine,
// e.g. http://yoonaproject-backend-xxxxx:8080
const API_URL = process.env.API_URL || "http://localhost:8080";

export const dynamic = "force-dynamic";

async function proxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${API_URL}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const auth = req.headers.get("authorization");
  if (auth) headers["Authorization"] = auth;

  try {
    const res = await fetch(url, {
      method: req.method,
      headers,
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : await req.text(),
      cache: "no-store",
    });
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return Response.json(
      { error: "backend unreachable — check API_URL on the front service" },
      { status: 502 }
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
