<script setup lang="ts">
import type { Profile } from "@artfolio/shared";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

defineProps<{
  profile: Profile;
  isOwner: boolean;
  paBase: string;
}>();

const router = useRouter();
</script>

<template>
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
    <div v-if="isOwner" class="flex flex-col gap-2 w-full pt-2">
      <Button variant="outline" class="w-full pa-btn" @click="router.push({ name: 'post-create' })">
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
