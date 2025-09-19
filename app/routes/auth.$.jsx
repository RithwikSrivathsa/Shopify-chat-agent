// app/routes/auth.$.jsx
import { authenticate, login } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const pathname = url.pathname || "";

  console.log("[/auth/*] loader hit:", { pathname, search: url.search });

  if (pathname === "/auth/login" || pathname.endsWith("/auth/login")) {
    try {
      const resp = await login(request);

      // Safe inspection of resp for logging
      let loggedResp;
      try {
        if (typeof resp === "object" && resp !== null && typeof resp.status === "number") {
          // If it's a Response-like object (Remix/Fetch)
          if (typeof resp.headers?.entries === "function") {
            loggedResp = {
              status: resp.status,
              headers: Array.from(resp.headers.entries())
            };
          } else {
            // headers is not iterable — stringify it safely
            loggedResp = {
              status: resp.status,
              headers: typeof resp.headers === "object" ? JSON.stringify(resp.headers) : String(resp.headers)
            };
          }
        } else {
          // resp is not a Response — stringify whatever it is
          loggedResp = JSON.parse(JSON.stringify(resp));
        }
      } catch (e) {
        loggedResp = { inspectError: String(e) };
      }

      console.log("[/auth/login] login() response (inspected):", loggedResp);

      // If resp is a fetch/Remix Response, return it directly.
      if (resp && typeof resp.headers !== "undefined" && typeof resp.status === "number") {
        return resp;
      }

      // Otherwise return it as JSON so the caller sees what it is
      return new Response(JSON.stringify({ resp: loggedResp }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      console.error("[/auth/login] login() threw:", e);
      return new Response(JSON.stringify({ error: e.message || String(e) }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  try {
    return await authenticate.admin(request);
  } catch (e) {
    console.error("[/auth/*] authenticate.admin threw:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
};
