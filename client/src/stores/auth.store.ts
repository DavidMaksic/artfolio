import { defineStore } from "pinia";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "vue-router";
import { computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  const router = useRouter();
  const sessionRef = authClient.useSession();

  const session = computed(() => sessionRef.value.data);
  const isPending = computed(() => sessionRef.value.isPending);
  const error = computed(() => sessionRef.value.error);
  const user = computed(() => session.value?.user ?? null);
  const isAuthenticated = computed(() => !!user.value);

  // ── Email OTP ──────────────
  async function requestOtp(email: string) {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type: "sign-in",
    });
    if (result.error) throw new Error(result.error.message);
    return result;
  }

  async function verifyOtp(email: string, otp: string) {
    const result = await authClient.signIn.emailOtp({ email, otp });
    if (result.error) throw new Error(result.error.message);
    return result;
  }

  // ── OAuth ──────────────
  async function signInWithGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/", // redirect after OAuth
    });
  }

  async function signInWithDiscord() {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: "/",
    });
  }

  // ── Sign out ──────────────
  async function signOut() {
    await authClient.signOut();
    await router.push({ name: "sign-in" });
  }

  // ── Delete profile ──────────────
  async function deleteAccount() {
    const result = await authClient.deleteUser();
    if (result.error) throw new Error(result.error.message);
    await router.push({ name: "sign-in" });
  }

  return {
    session,
    user,
    isAuthenticated,
    isPending,
    error,
    requestOtp,
    verifyOtp,
    signInWithGoogle,
    signInWithDiscord,
    signOut,
    deleteAccount,
  };
});
