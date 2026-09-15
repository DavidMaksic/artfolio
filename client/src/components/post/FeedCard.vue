<script setup lang="ts">
import type { FeedItem } from "@artfolio/shared";
import { useEngagement } from "@/composables/useEngagement";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/vue";

const props = defineProps<{ post: FeedItem }>();
defineEmits<{
  open: [id: string];
  openWithComment: [id: string];
}>();

const router = useRouter();

const {
  liked,
  bookmarked,
  likeCount,
  bookmarkCount,
  toggleLike,
  toggleBookmark,
  isLikePending,
  isBookmarkPending,
} = useEngagement(computed(() => props.post));
</script>

<template>
  <div class="flex flex-col" :data-post-id="post.id">
    <!-- Card body -->
    <div class="space-y-2.5 py-2.5">
      <!-- Author -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <div
            class="flex items-center gap-2 cursor-pointer"
            @click="router.push({ name: 'profile', params: { username: post.profile.username } })"
          >
            <img
              v-if="post.profile.profileImageUrl"
              :src="post.profile.profileImageUrl"
              class="size-9 rounded-full object-cover"
            />
            <div v-else class="size-9 rounded-full bg-muted flex items-center justify-center">
              <Icon icon="ph:user" class="text-muted-foreground" />
            </div>
            <p class="truncate text-sm font-medium leading-tight min-w-0 ml-1">
              {{ post.profile.displayName ?? post.profile.username }}
            </p>
          </div>
          <span class="text-xs text-muted-foreground">• 1 day</span>
        </div>

        <Button class="bg-black/80 hover:bg-black/60 text-white h-8 px-5 rounded-lg">
          Follow
        </Button>
      </div>
    </div>

    <div
      class="border border-neutral-200 rounded-2xl overflow-hidden transition-shadow duration-300 bg-white"
    >
      <div class="relative group" @click="$emit('open', post.id)">
        <!-- Cover image -->
        <img
          :src="post.coverImage.imageUrl"
          :alt="post.category.name"
          class="w-full max-h-180 object-cover transition-transform duration-500 rounded-2xl shadow-xs"
        />
        <div
          v-if="post.imageCount > 1"
          class="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-black/35 px-1 py-1"
        >
          <Icon icon="famicons:copy-outline" class="text-white drop-shadow text-lg" />
        </div>
        <div
          class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3"
          style="
            background: radial-gradient(
              ellipse at top right,
              hsl(0 0% 80% / 0.3) 0%,
              transparent 100%
            );
          "
        />
      </div>

      <div class="flex items-center justify-start gap-1.5 p-1.5 text-neutral-700">
        <div class="flex-1 flex items-center">
          <!-- Like -->
          <Button
            variant="ghost"
            data-testid="like-button"
            :data-liked="liked"
            class="flex items-center justify-center gap-2 hover:bg-transparent hover:text-red-400"
            :disabled="isLikePending"
            @click="toggleLike"
          >
            <Icon
              class="size-6 transition-colors"
              :icon="liked ? 'ph:heart-fill' : 'ph:heart'"
              :class="liked && 'text-red-400'"
            />
            <span v-if="likeCount" class="inline-block text-left text-sm tabular-nums">
              {{ likeCount || "" }}
            </span>
          </Button>

          <!-- Comment — opens modal -->
          <Button
            variant="ghost"
            data-testid="comment-button"
            class="flex items-center justify-center gap-2 hover:bg-transparent hover:text-yellow-600"
            @click="$emit('openWithComment', post.id)"
          >
            <Icon class="size-6" icon="ph:chat-circle" />
            <span v-if="post.commentCount" class="inline-block text-left text-sm tabular-nums">{{
              post.commentCount || ""
            }}</span>
          </Button>

          <!-- Bookmark -->
          <Button
            variant="ghost"
            data-testid="bookmark-button"
            :data-bookmarked="bookmarked"
            class="flex items-center justify-center gap-2 hover:bg-transparent hover:text-blue-400"
            :disabled="isBookmarkPending"
            @click="toggleBookmark"
          >
            <Icon
              class="size-6 transition-colors"
              :icon="bookmarked ? 'ph:bookmark-simple-fill' : 'ph:bookmark-simple'"
              :class="bookmarked && 'text-blue-400'"
            />
            <span v-if="bookmarkCount" class="inline-block text-left text-sm tabular-nums">{{
              bookmarkCount || ""
            }}</span>
          </Button>
        </div>

        <Badge variant="secondary" class="py-1 px-3 text-xs border-neutral-200">
          {{ post.category.name }}
        </Badge>
      </div>

      <div
        v-if="post.description"
        class="flex items-center gap-2 py-3.5 px-5.5 border-t border-t-neutral-200/80 text-[0.9rem]"
      >
        <p>
          <span class="font-semibold">{{ post.profile.displayName }}:</span>
          {{ post.description }}
        </p>
      </div>
    </div>
  </div>
</template>
