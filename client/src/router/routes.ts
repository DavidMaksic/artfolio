import { createRouter, createWebHistory } from "vue-router";
import { registerAuthGuards } from "./guards";
import { trpc } from "@/lib/trpc";
import FeedView from "@/views/FeedView.vue";

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    description?: string;
    requiresAuth?: boolean;
    requiresGuest?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.query.post || from.query.post) return false;
    return { top: 0 };
  },
  routes: [
    {
      path: "/",
      name: "home",
      component: FeedView,
      meta: {
        title: "Artfolio · Social platform for artists",
      },
    },
    {
      path: "/profile-setup",
      name: "profile-setup",
      component: () => import("@/views/profile/ProfileSetupView.vue"),
      meta: { requiresAuth: true, title: "Set up your profile" },
    },
    {
      path: "/profile/edit",
      name: "profile-edit",
      component: () => import("@/views/profile/ProfileEditView.vue"),
      meta: { requiresAuth: true, title: "Edit profile" },
    },
    {
      path: "/auth/sign-in",
      name: "sign-in",
      component: () => import("@/views/auth/SignInView.vue"),
      meta: { requiresGuest: true, title: "Sign in" },
    },
    {
      path: "/auth/verify",
      name: "auth-verify",
      component: () => import("@/views/auth/VerifyView.vue"),
      meta: { title: "Verify your email" },
    },
    {
      path: "/posts/create",
      name: "post-create",
      component: () => import("@/views/posts/PostCreateView.vue"),
      meta: { requiresAuth: true, title: "New post" },
    },
    {
      path: "/posts/:id/edit",
      name: "post-edit",
      meta: { requiresAuth: true, title: "Edit post" },
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
      path: "/explore",
      name: "explore",
      component: () => import("@/views/ExploreView.vue"),
      meta: { requiresAuth: true, title: "Explore" },
    },
    {
      path: "/:username",
      name: "profile",
      component: () => import("@/views/profile/ProfileView.vue"),
      meta: { title: "Profile" },
    },
  ],
});

registerAuthGuards(router);

const APP_NAME = "Artfolio";
const DEFAULT_TITLE = `${APP_NAME} · Social platform for artists`;

router.afterEach((to) => {
  const title = to.meta.title;
  document.title = !title || title === DEFAULT_TITLE ? DEFAULT_TITLE : `${title} · ${APP_NAME}`;
});

export default router;
