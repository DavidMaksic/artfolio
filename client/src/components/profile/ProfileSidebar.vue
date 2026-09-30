<script setup lang="ts">
import type { ProfileWithFollow } from "@artfolio/shared";
import { computed, ref, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth.store";
import { useFollow } from "@/composables/useFollow";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMediaQuery } from "@vueuse/core";

const auth = useAuthStore();

const props = defineProps<{
  profile: ProfileWithFollow;
  isOwner: boolean;
  paBase: string;
  postCount: number | undefined;
}>();

const router = useRouter();
const queryClient = useQueryClient();
const isPhone = useMediaQuery("(min-width: 768px)");
const followerCount = ref(props.profile.followerCount);

const existing = queryClient.getQueryData(["follow", props.profile.id]);
if (!existing) {
  queryClient.setQueryData(["follow", props.profile.id], {
    following: props.profile.userIsFollowing,
  });
}

watch(
  () => props.profile.followerCount,
  (val) => {
    followerCount.value = val;
  },
);

const { following, toggleFollow, isFollowPending } = useFollow(
  computed(() => ({
    profileId: props.profile.id,
    userIsFollowing: props.profile.userIsFollowing,
  })),
  (isFollowing) => {
    followerCount.value += isFollowing ? 1 : -1;
  },
);
</script>

<template>
  <aside
    class="w-76 lg:w-62 bg-white/80 shrink-0 h-[calc(100vh-7.2rem)] mt-5 md:mt-2 ml-5 lg:px-6 flex flex-col items-center sticky top-10 text-center gap-4 justify-center rounded-2xl transition duration-700 md:relative md:top-auto md:w-[60%] sm:w-3/4 xs:w-[94%] md:h-auto md:mx-auto md:rounded-2xl md:px-6 md:py-5 md:grid md:grid-cols-[auto_1fr] md:justify-start md:justify-items-start md:items-center md:text-left md:gap-x-8 md:gap-y-3 md:mb-2"
    :class="cn(!isOwner ? 'px-12' : 'px-6')"
  >
    <!-- Profile image (spans name + stats rows on mobile) -->
    <img
      v-if="profile.profileImageUrl"
      :src="profile.profileImageUrl"
      :alt="profile.displayName ?? profile.username"
      class="size-32 lg:size-30 md:size-22 md:row-span-2 rounded-full object-cover ring-2 transition-shadow duration-700"
      :style="{ boxShadow: `0 0 0 3px hsl(var(--pa-h) var(--pa-s) var(--pa-ring-l))` }"
    />
    <div
      v-else
      class="size-32 lg:size-30 md:size-22 md:row-span-2 rounded-full bg-white flex items-center justify-center ring-2 ring-border"
    >
      <Icon icon="ph:user" class="text-5xl md:text-3xl text-muted-foreground" />
    </div>

    <!-- Name + username -->
    <div class="space-y-1 md:self-end md:-mb-3">
      <h1 class="text-2xl md:text-xl font-bold md:font-semibold">{{ profile.displayName }}</h1>
      <p class="text-sm text-muted-foreground md:hidden">@{{ profile.username }}</p>
    </div>

    <!-- Follow counts -->
    <div
      class="grid grid-cols-3 items-center justify-between gap-4 text-md md:justify-self-start md:gap-6 md:self-start md:w-full md:text-lg"
    >
      <div
        v-for="{ label, value } in [
          { label: 'Posts', value: postCount },
          { label: 'Followers', value: followerCount },
          { label: 'Following', value: profile.followingCount },
        ]"
        :key="label"
        class="text-center flex-1"
      >
        <p class="font-semibold md:text-start">
          {{ value }}
        </p>
        <p class="text-muted-foreground text-xs md:text-start">
          {{ label }}
        </p>
      </div>
    </div>

    <!-- Commission badge -->
    <Badge
      v-if="profile.availableForCommissions"
      variant="secondary"
      class="gap-1.5 transition-colors duration-700 md:col-span-2 absolute top-0 right-0 rounded-tl-none rounded-br-none rounded-tr-2xl rounded-bl-2xl border-none py-1.5 px-3.5"
      :style="{
        backgroundColor: `hsl(${paBase} / 0.${!isPhone ? '2' : '3'})`,
        color: `hsl(var(--pa-h) var(--pa-s) calc(var(--pa-l) - 15%))`,
        borderColor: `hsl(${paBase} / 0.35)`,
      }"
    >
      <Icon icon="ph:paint-brush" class="text-sm" />
      <span>Open for work</span>
    </Badge>

    <!-- Bio -->
    <p
      v-if="profile.bio"
      class="text-sm py-2 md:text-base text-neutral-800 leading-relaxed md:col-span-2 md:pt-1 whitespace-pre-wrap"
    >
      {{ profile.bio }}
    </p>

    <!-- Location + website -->
    <div
      v-if="profile.location || profile.website"
      class="flex flex-col items-center gap-2 text-sm text-muted-foreground w-full md:col-span-2 md:items-start"
    >
      <span v-if="profile.location" class="flex items-center gap-1">
        <Icon icon="ph:map-pin" />
        {{ profile.location }}
      </span>
      <a
        v-if="profile.website"
        :href="profile.website"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-1 hover:text-foreground transition-colors cursor-default"
      >
        <Icon icon="ph:link" />
        {{ profile.website.replace(/^https?:\/\//, "") }}
      </a>
    </div>

    <!-- Actions -->
    <div
      class="gap-2 w-full pt-2 md:col-span-2 md:flex-row md:pt-0"
      :class="cn(!isOwner ? 'flex' : 'grid grid-cols-2 md:grid-cols-[1fr_1fr_auto]')"
    >
      <!-- Owner actions -->
      <template v-if="isOwner">
        <Button
          variant="outline"
          class="w-full pa-btn md:flex-1"
          @click="router.push({ name: 'post-create' })"
        >
          <Icon icon="ph:plus" />
          New post
        </Button>
        <Button
          variant="outline"
          class="w-full pa-btn md:flex-1"
          @click="router.push({ name: 'profile-edit' })"
        >
          <Icon icon="ph:pencil-simple" />
          Edit profile
        </Button>
        <Button
          variant="outline"
          class="w-full pa-btn hidden sm:block sm:w-fit"
          @click="auth.signOut()"
        >
          <Icon icon="ph:sign-out" />
        </Button>
      </template>

      <!-- Visitor follow button -->
      <Button
        v-else
        variant="outline"
        class="w-full pa-btn md:flex-1 md:mt-2"
        :style="
          following
            ? {
                backgroundColor: `hsl(var(--pa-h) var(--pa-s) calc(var(--pa-l) + 30%) / 0.2)`,
                borderColor: `hsl(var(--pa-h) var(--pa-s) var(--pa-l) / 0.3)`,
              }
            : {}
        "
        :disabled="isFollowPending"
        @click="toggleFollow"
      >
        <Icon class="mr-0.5 size-5" :icon="following ? 'ph:user-check' : 'ph:user-plus'" />
        {{ following ? "Following" : "Follow" }}
      </Button>
    </div>
  </aside>
</template>

<style scoped>
.pa-btn {
  border-color: hsl(var(--pa-h) var(--pa-s) var(--pa-l) / 0.2);
  color: hsl(var(--pa-h) var(--pa-s) calc(var(--pa-l) - 15%));
}

.pa-btn:hover {
  background-color: hsl(var(--pa-h) var(--pa-s) calc(var(--pa-l) + 30%) / 0.2);
  border-color: hsl(var(--pa-h) var(--pa-s) var(--pa-l) / 0.3);
  color: hsl(var(--pa-h) var(--pa-s) calc(var(--pa-l) - 15%));
}
</style>
