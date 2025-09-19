// app/routes/auth.$.jsx
import { authenticate, login } from "../shopify.server";
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  // If the route is /auth/login, start the OAuth/login flow
  if (url.pathname === "/auth/login" || url.pathname.endsWith("/auth/login")) {
    return await login(request);
  }

  // For other /auth/* routes, validate existing admin session
  return await authenticate.admin(request);
};

// Optional: if you expect POSTs to /auth/login to start login too
export const action = async ({ request }) => {
  const url = new URL(request.url);
  if (url.pathname === "/auth/login" || url.pathname.endsWith("/auth/login")) {
    return await login(request);
  }
  // Other POST handlers can call authenticate.admin or return a 405
  return await authenticate.admin(request);
};
