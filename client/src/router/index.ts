import { createRouter, createWebHistory } from "vue-router";
import { registerAuthGuards } from "./guards";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/auth/sign-in",
      name: "sign-in",
      component: () => import("@/views/auth/SigninView.vue"),
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
