import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { defineStore } from "pinia";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "vue-router";
import { computed } from "vue";
import { trpc } from "@/lib/trpc";

const STALE_TIME = 1000 * 60 * 5;

const sessionQuery = {
  queryKey: ["session"],
  queryFn: () => authClient.getSession(),
  staleTime: STALE_TIME,
} as const;

const meQuery = {
  queryKey: ["me"],
  queryFn: () => trpc.profile.getMe.query(),
  staleTime: STALE_TIME,
} as const;

export const useAuthStore = defineStore("auth", () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: session, isPending } = useQuery(sessionQuery);

  const user = computed(() => session.value?.data?.user ?? null);
  const isAuthenticated = computed(() => !!user.value);
  const error = computed(() => session.value?.error ?? null);

  async function ensureUser() {
    const result = await queryClient.fetchQuery(sessionQuery);
    return result.data?.user ?? null;
  }

  async function ensureMe() {
    return queryClient.fetchQuery(meQuery);
  }

  // ── Profile (username, display name, etc.) ──────────────
  const { data: me } = useQuery({
    ...meQuery,
    enabled: isAuthenticated,
  });

  const username = computed(() => me.value?.username ?? null);

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
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    return result;
  }

  // ── OAuth ──────────────
  async function signInWithGoogle() {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}/`,
    });
  }

  async function signInWithDiscord() {
    await authClient.signIn.social({
      provider: "discord",
      callbackURL: `${window.location.origin}/`,
    });
  }

  // ── Sign out ──────────────
  async function signOut() {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    queryClient.removeQueries({ queryKey: ["feed"] });
    await router.replace({ name: "home" });
    window.scrollTo(0, 0);
  }

  // ── Delete profile ──────────────
  async function deleteAccount() {
    // Cleanup Cloudinary first
    await trpc.profile.deleteAccount.mutate();

    // Then delete the user via Better Auth
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
    me,
    username,
    requestOtp,
    verifyOtp,
    signInWithGoogle,
    signInWithDiscord,
    signOut,
    deleteAccount,
    ensureMe,
    ensureUser,
  };
});
