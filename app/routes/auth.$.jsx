// app/routes/auth.$.jsx
import * as ShopifyServer from "../shopify.server"; // import whole module for inspection

const authenticate = ShopifyServer.authenticate;
const login = ShopifyServer.login;

export const loader = async ({ request }) => {
  console.log("[auth.$] typeof authenticate:", typeof authenticate);
  console.log("[auth.$] typeof login:", typeof login);

  const url = new URL(request.url);
  const pathname = url.pathname || "";

  if (pathname === "/auth/login" || pathname.endsWith("/auth/login")) {
    if (typeof login !== "function") {
      console.error("[auth.$] login is not a function. Value:", login);
      return new Response(JSON.stringify({ error: "login is not a function", loginType: typeof login, loginValue: login }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const resp = await login(request);
      // If resp is a Response, return it
      if (resp && typeof resp.status === "number" && typeof resp.headers !== "undefined") {
        return resp;
      }
      // Otherwise return the object so we can see it
      return new Response(JSON.stringify({ resp }), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
      console.error("[auth.$] login threw:", e);
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }

  // non-login auth verification
  if (typeof authenticate !== "function") {
    console.error("[auth.$] authenticate.admin is not available. Value:", authenticate);
    return new Response(JSON.stringify({ error: "authenticate not available" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }

  try {
    return await authenticate.admin(request);
  } catch (e) {
    console.error("[auth.$] authenticate.admin threw:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
};
