<script setup lang="ts">
import { computed, watch, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProfilePalette } from "@/composables/useProfilePalette";
import { useMediaQuery, useTitle } from "@vueuse/core";
import { useAuthStore } from "@/stores/auth.store";
import { useQuery } from "@tanstack/vue-query";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import ProfileSidebar from "@/components/profile/ProfileSidebar.vue";
import PostGrid from "@/components/post/PostGrid.vue";

const route = useRoute();
const router = useRouter();
const username = computed(() => route.params.username as string);

const {
  data: profile,
  isPending,
  isError,
} = useQuery({
  queryKey: computed(() => ["profile", username.value]),
  queryFn: () => trpc.profile.getByUsername.query({ username: username.value }),
});

const { data: posts, isPending: isLoadingPosts } = useQuery({
  queryKey: computed(() => ["posts", username.value]),
  queryFn: () => trpc.post.getByUsername.query({ username: username.value }),
});

const title = useTitle();
watch(
  profile,
  (p) => {
    if (p) title.value = `${p.displayName} (@${p.username}) · Artfolio`;
  },
  { immediate: true },
);

const auth = useAuthStore();
const isOwner = computed(() => auth.user?.id === profile.value?.userId);
const isPhone = useMediaQuery("(min-width: 640px)");

// Palette theming
const { accentHsl, extractPalette } = useProfilePalette();

watchEffect(() => {
  extractPalette(profile.value?.profileImageUrl);
});

const cssVars = computed(() => {
  const [h, s, l] = accentHsl.value ?? [0, 0, 50];
  return {
    "--pa-h": String(h),
    "--pa-s": `${s}%`,
    "--pa-l": `${Math.max(l - 10, 40)}%`,
    "--pa-ring-l": `${Math.min(l + 45, 82)}%`,
  };
});

// Shorthand used in :style bindings so the template stays readable.
const paBase = computed(() => "var(--pa-h) var(--pa-s) var(--pa-l)");
</script>

<template>
  <div class="min-h-screen bg-neutral-100" :style="cssVars">
    <!-- Loading or Profile -->
    <template v-if="isPending || profile">
      <div class="relative md:pt-5 sm:pt-0 flex md:flex-col min-h-screen transition duration-700">
        <!-- Background accent (only when profile is ready) -->
        <div
          v-if="profile"
          class="fixed top-0 left-0 inset-0 z-0 pointer-events-none"
          :class="
            cn(
              '[--bg-size:200%_200%] [--bg-pos:-80%_60%]',
              'md:[--bg-size:220%_220%] md:[--bg-pos:-80%_20%]',
              'sm:[--bg-size:200%_200%] sm:[--bg-pos:-80%_10%]',
            )
          "
          :style="`background: radial-gradient(ellipse var(--bg-size) at var(--bg-pos), hsl(${paBase} / 0.6) 0%, transparent 65%)`"
        />

        <!-- Sidebar: skeleton while pending, real once profile is ready -->
        <Skeleton
          v-if="isPending"
          class="w-76 lg:w-62 shrink-0 h-[calc(100vh-7.2rem)] mt-5 md:mt-2 ml-5 sticky top-10 rounded-2xl md:relative md:top-auto md:w-[60%] sm:w-3/4 xs:w-[94%] md:h-32 md:mx-auto"
        />
        <ProfileSidebar
          v-else-if="profile"
          :profile
          :isOwner
          :paBase
          :postCount="posts?.items.length"
        />

        <!-- Grid: single persistent instance, skeleton handled internally -->
        <PostGrid
          :posts="posts?.items"
          :isOwner="isPending ? false : isOwner"
          :isLoadingPosts="isPending || isLoadingPosts"
          :accentOverlay="true"
          :rowHeight="!isPhone ? 200 : 380"
          :minWidth="!isPhone ? 200 : 340"
        />
      </div>
    </template>

    <!-- Error / Not found -->
    <template v-else-if="isError">
      <div class="flex flex-col items-center gap-3 text-center py-24">
        <Icon icon="ph:user-circle-dashed" class="text-5xl text-muted-foreground" />
        <h1 class="text-lg font-semibold">Profile not found</h1>
        <p class="text-sm text-muted-foreground">There's no artist at @{{ username }}.</p>
        <Button variant="ghost" @click="router.push({ name: 'home' })">Go home</Button>
      </div>
    </template>
  </div>
</template>
