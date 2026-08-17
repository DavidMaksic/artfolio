<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

const isOwnProfile = computed(() => auth.user?.id === profile.value?.userId);
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="max-w-2xl mx-auto px-4 py-12">
      <!-- Loading -->
      <template v-if="isPending">
        <div class="flex flex-col items-center gap-4">
          <Skeleton class="w-24 h-24 rounded-full" />
          <Skeleton class="h-5 w-40" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-16 w-full mt-2" />
        </div>
      </template>

      <!-- Profile -->
      <template v-else-if="profile">
        <div class="flex flex-col items-center text-center gap-4">
          <!-- Profile image -->
          <div class="relative">
            <img
              v-if="profile.profileImageUrl"
              :src="profile.profileImageUrl"
              :alt="profile.displayName ?? profile.username"
              class="size-32 rounded-full object-cover ring-2 ring-border"
            />
            <div
              v-else
              class="size-32 rounded-full bg-muted flex items-center justify-center ring-2 ring-border"
            >
              <Icon icon="ph:user" class="text-4xl text-muted-foreground" />
            </div>
          </div>

          <!-- Name + username -->
          <div class="space-y-1">
            <h1 class="text-2xl font-bold">
              {{ profile.displayName }}
            </h1>
            <p class="text-sm text-muted-foreground">@{{ profile.username }}</p>
          </div>

          <!-- Commission badge -->
          <Badge v-if="profile.availableForCommissions" variant="secondary" class="gap-1.5">
            <Icon icon="ph:paint-brush" class="text-sm" />
            Available for commissions
          </Badge>

          <!-- Bio -->
          <p v-if="profile.bio" class="text-sm text-muted-foreground max-w-md leading-relaxed">
            {{ profile.bio }}
          </p>

          <!-- Meta: location + website -->
          <div
            class="flex items-center gap-4 text-sm text-muted-foreground flex-wrap justify-center"
          >
            <span v-if="profile.location" class="flex items-center gap-1">
              <Icon icon="ph:map-pin" />
              {{ profile.location }}
            </span>
            <a
              v-if="profile.website"
              :href="profile.website"
              target="_blank"
              rel="noopener
              noreferrer"
              class="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <Icon icon="ph:link" />
              {{ profile.website.replace(/^https?:\/\//, "") }}
            </a>
          </div>

          <!-- Edit button (own profile only) -->
          <Button
            v-if="isOwnProfile"
            variant="outline"
            class="mt-2"
            @click="router.push({ name: 'profile-edit' })"
          >
            <Icon icon="ph:pencil-simple" class="mr-2" />
            Edit profile
          </Button>
        </div>

        <!-- Divider for future content (posts, portfolio, etc.) -->
        <div class="mt-12 border-t pt-8">
          <p class="text-center text-sm text-muted-foreground">No posts yet.</p>
        </div>
      </template>

      <!-- Error / Not found -->
      <template v-else-if="isError">
        <div class="flex flex-col items-center gap-3 text-center py-24">
          <Icon icon="ph:user-circle-dashed" class="text-5xl text-muted-foreground" />
          <h1 class="text-lg font-semibold">Profile not found</h1>
          <p class="text-sm text-muted-foreground">There's no artist at @{{ username }}.</p>
          <Button variant="ghost" @click="router.push({ name: 'home' })"> Go home </Button>
        </div>
      </template>
    </div>
  </div>
</template>
