import type { Router } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { watch } from "vue";

export function registerAuthGuards(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore();

    // Wait for the initial session fetch to settle
    if (auth.isPending) {
      await new Promise<void>((resolve) => {
        const stop = watch(
          () => auth.isPending,
          (pending) => {
            if (!pending) {
              stop();
              resolve();
            }
          },
        );
      });
    }

    if (to.meta.requiresAuth && !auth.isAuthenticated) {
      return { name: "sign-in", query: { redirect: to.fullPath } };
    }

    if (to.meta.requiresGuest && auth.isAuthenticated) {
      return { name: "home" };
    }
  });
}
