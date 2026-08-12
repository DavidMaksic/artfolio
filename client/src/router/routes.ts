import { createRouter, createWebHistory, useRouter } from "vue-router";
import { registerAuthGuards } from "./guards";
import { trpc } from "@/lib/trpc";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      beforeEnter: async () => {
        try {
          const profile = await trpc.profile.getMe.query();
          if (!profile.profileSetupSkipped && !profile.displayName) {
            return { name: "profile-setup" };
          }
          return;
        } catch {
          return { name: "sign-in" };
        }
      },
      component: () => import("@/views/HomeView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile-setup",
      name: "profile-setup",
      component: () => import("@/views/profile/ProfileSetupView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/auth/sign-in",
      name: "sign-in",
      component: () => import("@/views/auth/SignInView.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/auth/verify",
      name: "auth-verify",
      component: () => import("@/views/auth/VerifyView.vue"),
    },
  ],
});

registerAuthGuards(router);

export default router;
