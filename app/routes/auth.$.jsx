// routes/auth.$.jsx
import { login } from "../shopify.server";

export const loader = async ({ request }) => {
  // The shopify.login helper will initiate the OAuth/redirect flow.
  // It both validates the incoming request and returns a Response (redirect).
  return await login(request);
};
