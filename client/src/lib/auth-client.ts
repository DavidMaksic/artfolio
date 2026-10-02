import { createAuthClient } from "better-auth/vue";
import { emailOTPClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
  plugins: [emailOTPClient()],
});

export const { useSession, signOut, signIn } = authClient;
