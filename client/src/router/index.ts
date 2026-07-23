import { createRouter, createWebHistory } from "vue-router";
import { registerAuthGuards } from "./guards";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/auth/sign-in",
      name: "sign-in",
      component: () => import("@/views/auth/SigninView.vue"),
      meta: { requiresGuest: true },
    },
    {
      path: "/auth/verify",
      name: "auth-verify",
      component: () => import("@/views/auth/VerifyView.vue"),
      // Not guest-only: OAuth callbacks may land here while already authed
    },
  ],
});

registerAuthGuards(router);

export default router;
