import { createRouter, createWebHistory } from "vue-router";
import { registerAuthGuards } from "./guards";
import { trpc } from "@/lib/trpc";
import FeedView from "@/views/FeedView.vue";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: "/",
      name: "home",
      component: FeedView,
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
      meta: { requiresAuth: true },
      component: () => import("@/views/posts/PostEditView.vue"),
      beforeEnter: async (to) => {
        const post = await trpc.post.getById
          .query({ id: to.params.id as string })
          .catch(() => null);
        if (!post) return { name: "home" };

        const me = await trpc.profile.getMe.query().catch(() => null);
        if (!me) return { name: "sign-in" };

        if (post.profile.username !== me.username) {
          return { name: "profile", params: { username: post.profile.username } };
        }
      },
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
