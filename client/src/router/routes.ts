import { createRouter, createWebHistory } from "vue-router";
import { registerAuthGuards } from "./guards";
import { trpc } from "@/lib/trpc";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: "/",
      name: "home",
      beforeEnter: async () => {
        const profile = await trpc.profile.getMe.query();
        if (!profile.profileSetupSkipped && !profile.displayName) {
          return { name: "profile-setup" };
        }
      },
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/profile-setup",
      name: "profile-setup",
      component: () => import("@/views/profile/ProfileSetupView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/profile/edit",
      name: "profile-edit",
      component: () => import("@/views/profile/ProfileEditView.vue"),
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
    {
      path: "/posts/create",
      name: "post-create",
      component: () => import("@/views/posts/PostCreateView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/posts/:id/edit",
      name: "post-edit",
      component: () => import("@/views/posts/PostEditView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/:username",
      name: "profile",
      component: () => import("@/views/profile/ProfileView.vue"),
    },
  ],
});

registerAuthGuards(router);

export default router;
