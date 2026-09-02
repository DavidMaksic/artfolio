<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useProfilePalette } from "@/composables/useProfilePalette";
import { useAuthStore } from "@/stores/auth.store";
import { useQuery } from "@tanstack/vue-query";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import PostDetailModal from "@/components/PostDetailModal.vue";
import PostGrid from "@/components/PostGrid.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

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

const isOwnProfile = computed(() => auth.user?.id === profile.value?.userId);
const activePostId = ref<string | null>(null);
const postIds = computed(() => posts.value?.items.map((p) => p.id) ?? []);

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
        <Skeleton class="w-72 shrink-0 h-[calc(100vh-5rem)] mt-10 ml-5 rounded-2xl" />
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
        <aside
          class="w-72 bg-white/80 shrink-0 h-[calc(100vh-7.2rem)] mt-5 ml-5 px-10 flex flex-col items-center sticky top-10 text-center gap-4 justify-center rounded-2xl transition duration-700"
        >
          <!-- Profile image -->
          <img
            v-if="profile.profileImageUrl"
            :src="profile.profileImageUrl"
            :alt="profile.displayName ?? profile.username"
            class="size-32 rounded-full object-cover ring-2 transition-shadow duration-700"
            :style="{ boxShadow: `0 0 0 3px hsl(var(--pa-h) var(--pa-s) var(--pa-ring-l))` }"
          />
          <div
            v-else
            class="size-32 rounded-full bg-muted flex items-center justify-center ring-2 ring-border"
          >
            <Icon icon="ph:user" class="text-4xl text-muted-foreground" />
          </div>

          <!-- Name + username -->
          <div class="space-y-1">
            <h1 class="text-xl font-bold">{{ profile.displayName }}</h1>
            <p class="text-sm text-muted-foreground">@{{ profile.username }}</p>
          </div>

          <!-- Commission badge -->
          <Badge
            v-if="profile.availableForCommissions"
            variant="secondary"
            class="gap-1.5 transition-colors duration-700"
            :style="{
              backgroundColor: `hsl(${paBase} / 0.15)`,
              color: `hsl(var(--pa-h) var(--pa-s) calc(var(--pa-l) - 10%))`,
              borderColor: `hsl(${paBase} / 0.35)`,
            }"
          >
            <Icon icon="ph:paint-brush" class="text-sm" />
            Available for commissions
          </Badge>

          <!-- Bio -->
          <p v-if="profile.bio" class="text-sm text-muted-foreground leading-relaxed">
            {{ profile.bio }}
          </p>

          <!-- Location + website -->
          <div class="flex flex-col items-center gap-2 text-sm text-muted-foreground w-full">
            <span v-if="profile.location" class="flex items-center gap-1">
              <Icon icon="ph:map-pin" />
              {{ profile.location }}
            </span>
            <a
              v-if="profile.website"
              :href="profile.website"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Icon icon="ph:link" />
              {{ profile.website.replace(/^https?:\/\//, "") }}
            </a>
          </div>

          <!-- Actions -->
          <div v-if="isOwnProfile" class="flex flex-col gap-2 w-full pt-2">
            <Button
              variant="outline"
              class="w-full pa-btn"
              aria-label="Create post"
              @click="router.push({ name: 'post-create' })"
            >
              <Icon icon="ph:plus" class="mr-2" />
              New post
            </Button>
            <Button
              variant="outline"
              class="w-full pa-btn"
              @click="router.push({ name: 'profile-edit' })"
            >
              <Icon icon="ph:pencil-simple" class="mr-2" />
              Edit profile
            </Button>
          </div>
        </aside>

        <!-- Right — posts -->
        <main class="flex-1 min-w-0 p-5 pl-5">
          <template v-if="isLoadingPosts">
            <div class="grid grid-cols-3 gap-1">
              <Skeleton v-for="n in 9" :key="n" class="h-95 w-full rounded-xl" />
            </div>
          </template>
          <PostGrid
            v-else
            :posts="posts?.items ?? []"
            :is-owner="isOwnProfile"
            @open="activePostId = $event"
          />

          <PostDetailModal
            v-if="activePostId"
            :post-id="activePostId"
            :post-ids="postIds"
            @close="activePostId = null"
            @navigate="activePostId = $event"
          />
        </main>
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

<style scoped>
.pa-btn {
  border-color: hsl(var(--pa-h) var(--pa-s) var(--pa-l) / 0.2);
  color: hsl(var(--pa-h) var(--pa-s) calc(var(--pa-l) - 25%));
}

.pa-btn:hover {
  background-color: hsl(var(--pa-h) var(--pa-s) calc(var(--pa-l) + 30%) / 0.2);
  border-color: hsl(var(--pa-h) var(--pa-s) var(--pa-l) / 0.3);
  color: hsl(var(--pa-h) var(--pa-s) calc(var(--pa-l) - 25%));
}
</style>
