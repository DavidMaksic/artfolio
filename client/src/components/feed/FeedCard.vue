<script setup lang="ts">
import type { FeedItem } from "@artfolio/shared";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { computed, watch } from "vue";
import { useQueryClient } from "@tanstack/vue-query";
import { useEngagement } from "@/composables/useEngagement";
import { useFollow } from "@/composables/useFollow";
import { useRouter } from "vue-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  post: FeedItem;
  suggested: boolean;
}>();

defineEmits<{
  open: [id: string];
  openWithComment: [id: string];
}>();

const router = useRouter();
const queryClient = useQueryClient();

// Seed the follow state cache from the feed item on mount
watch(
  () => props.post.profile.userIsFollowing,
  () => {
    const existing = queryClient.getQueryData(["follow", props.post.profileId]);
    if (!existing) {
      queryClient.setQueryData(["follow", props.post.profileId], {
        following: props.post.profile.userIsFollowing,
      });
    }
  },
  { immediate: true },
);

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

const { following, toggleFollow, isFollowPending } = useFollow(
  computed(() => ({
    profileId: props.post.profileId,
    userIsFollowing: props.post.profile.userIsFollowing,
  })),
);

function copyPostLink() {
  navigator.clipboard.writeText(`${window.location.origin}/?post=${props.post.id}`);
}
</script>

<template>
  <div class="flex flex-col" :data-post-id="post.id">
    <div class="space-y-2.5 py-2.5">
      <!-- Author -->
      <div class="flex items-center justify-between gap-2 sm:px-2">
        <div class="flex items-center gap-1.5">
          <div
            class="flex items-center gap-1.5 cursor-default group"
            @click="router.push({ name: 'profile', params: { username: post.profile.username } })"
          >
            <img
              v-if="post.profile.profileImageUrl"
              :src="post.profile.profileImageUrl"
              class="size-9 rounded-full object-cover border group-hover:opacity-80 transition-opacity"
            />
            <div
              v-else
              class="size-9 rounded-full bg-white flex items-center justify-center border"
            >
              <Icon icon="ph:user" class="text-muted-foreground" />
            </div>
            <p class="truncate text-sm font-medium leading-tight min-w-0 ml-1">
              {{ post.profile.displayName ?? post.profile.username }}
            </p>
          </div>
          <p class="text-xs text-muted-foreground">
            <span class="mr-0.5">•</span>
            {{ formatDistanceToNow(post.createdAt, { addSuffix: false }) }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <!-- Only show follow button on suggested posts -->
          <Button
            v-if="suggested"
            class="h-7 px-4 rounded-lg transition-colors"
            :class="
              following
                ? 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
                : 'bg-black/80 hover:bg-black/60 text-white'
            "
            :disabled="isFollowPending"
            data-testid="follow-button"
            :data-following="following"
            @click="toggleFollow"
          >
            {{ following ? "Following" : "Follow" }}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Icon
                icon="ph:dots-three"
                class="text-3xl text-neutral-700 hover:bg-white transition-colors p-1 rounded-md"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="rounded-lg w-36">
              <DropdownMenuItem class="text-[0.92rem] cursor-pointer" @click="copyPostLink">
                <Icon icon="ph:link" class="mr-2 text-sm" />
                Copy link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>

    <div
      class="border border-neutral-200 sm:border-none rounded-2xl sm:rounded-none sm:shadow-card overflow-hidden transition-shadow duration-300 bg-white"
    >
      <div class="relative group" @click="$emit('open', post.id)">
        <img
          :src="post.coverImage.imageUrl"
          :alt="post.category.name"
          class="w-full max-h-180 xs:max-h-140 2xs:max-h-120 object-cover transition-transform duration-500 rounded-2xl sm:rounded-none shadow-xs"
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

      <div class="flex items-center justify-start gap-1.5 p-1.5 text-neutral-700 sm:px-3.5">
        <div class="flex-1 flex items-center">
          <Button
            variant="ghost"
            data-testid="like-button"
            :data-liked="liked"
            class="flex items-center justify-center gap-2 hover:bg-transparent hover:text-red-400 sm:pl-0!"
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

          <Button
            variant="ghost"
            data-testid="comment-button"
            class="flex items-center justify-center gap-2 hover:bg-transparent hover:text-yellow-600"
            @click="$emit('openWithComment', post.id)"
          >
            <Icon class="size-6" icon="ph:chat-circle" />
            <span v-if="post.commentCount" class="inline-block text-left text-sm tabular-nums">
              {{ post.commentCount || "" }}
            </span>
          </Button>

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
            <span v-if="bookmarkCount" class="inline-block text-left text-sm tabular-nums">
              {{ bookmarkCount || "" }}
            </span>
          </Button>
        </div>

        <Badge
          variant="secondary"
          class="py-1 px-3 text-xs border-neutral-200 cursor-default hover:border-neutral-400/80 transition-[border-color]"
          @click="
            router.push({
              name: 'explore',
              query: { q: post.category.name },
            })
          "
        >
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
