// app/routes/auth.$.jsx
import { authenticate, login } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const pathname = url.pathname || "";

  // Log some useful stuff so you can inspect server logs
  console.log("[/auth/*] loader hit:", { pathname, search: url.search });

  // If this is the login path, call login() and return its response directly
  if (pathname === "/auth/login" || pathname.endsWith("/auth/login")) {
    try {
      const resp = await login(request);
      console.log("[/auth/login] login() response:", resp && { status: resp.status, headers: [...resp.headers] });
      return resp;
    } catch (e) {
      console.error("[/auth/login] login() threw:", e);
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  // For other /auth routes keep authenticate behavior
  try {
    return await authenticate.admin(request);
  } catch (e) {
    console.error("[/auth/*] authenticate.admin threw:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
};
