<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProfilePalette } from "@/composables/useProfilePalette";
import { useAuthStore } from "@/stores/auth.store";
import { useQuery } from "@tanstack/vue-query";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import ProfileSidebar from "@/components/profile/ProfileSidebar.vue";
import ProfileGrid from "@/components/profile/ProfileGrid.vue";

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

const auth = useAuthStore();
const isOwner = computed(() => auth.user?.id === profile.value?.userId);

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
    <!-- Loading -->
    <template v-if="isPending">
      <div class="relative flex min-h-screen w-full">
        <Skeleton class="w-72 shrink-0 h-[calc(100vh-7.2rem)] mt-5 ml-5 rounded-2xl" />
      </div>
    </template>

    <!-- Profile -->
    <template v-else-if="profile">
      <div class="relative flex min-h-screen transition duration-700">
        <div
          class="fixed top-0 left-0 inset-0 z-0 pointer-events-none"
          :style="`background: radial-gradient(ellipse 200% 200% at -80% 60%, hsl(${paBase} / 0.6) 0%, transparent 65%)`"
        ></div>

        <!-- Left — profile sidebar -->
        <ProfileSidebar :profile :isOwner :paBase />

        <!-- Right — posts -->
        <ProfileGrid :posts="posts?.items" :isOwner :isLoadingPosts />
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
