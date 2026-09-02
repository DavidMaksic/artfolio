import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { defineStore } from "pinia";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "vue-router";
import { computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: session, isPending } = useQuery({
    queryKey: ["session"],
    queryFn: () => authClient.getSession(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const user = computed(() => session.value?.data?.user ?? null);
  const isAuthenticated = computed(() => !!user.value);
  const error = computed(() => session.value?.error ?? null);

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
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    return result;
  }

  // ── OAuth ──────────────
  async function signInWithGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "http://localhost:5173/",
    });
  }

  async function signInWithDiscord() {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: "http://localhost:5173/",
    });
  }

  // ── Sign out ──────────────
  async function signOut() {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    await router.push({ name: "home" });
  }

  // ── Delete profile ──────────────
  async function deleteAccount() {
    const result = await authClient.deleteUser();
    if (result.error) throw new Error(result.error.message);
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    await router.push({ name: "home" });
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
