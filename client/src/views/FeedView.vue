<script setup lang="ts">
import type { FeedItem } from "@artfolio/shared";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import PostDetailModal from "@/components/post/PostDetailModal.vue";
import FeedSidebar from "@/components/feed/FeedSidebar.vue";
import FeedCard from "@/components/feed/FeedCard.vue";

type FeedItemWithMeta = FeedItem & { suggested: boolean };

const SUGGEST_EVERY = 3; // inject a suggested post every N following posts

const router = useRouter();
const auth = useAuthStore();
const activePostId = ref<string | null>(null);
const focusComment = ref(false);
const commentBodies = ref<Record<string, string>>({});

const { data: me } = useQuery({
  queryKey: ["me"],
  queryFn: () => trpc.profile.getMe.query(),
});

watch(me, (profile) => {
  if (profile && !profile.profileSetupSkipped && !profile.displayName) {
    router.push({ name: "profile-setup" });
  }
});

// ── Following feed (authenticated) ─────────────────────────────

const {
  data: followingData,
  fetchNextPage: fetchNextFollowing,
  hasNextPage: hasNextFollowing,
  isFetchingNextPage: isFetchingNextFollowing,
  isPending: isFollowingPending,
} = useInfiniteQuery({
  queryKey: ["feed", "following"],
  queryFn: ({ pageParam }) => trpc.feed.getFollowingFeed.query({ limit: 5, cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  enabled: computed(() => auth.isAuthenticated),
  placeholderData: keepPreviousData,
});

// ── Explore / guest feed ────────────────────────────────────────

const {
  data: exploreData,
  fetchNextPage: fetchNextExplore,
  hasNextPage: hasNextExplore,
  isFetchingNextPage: isFetchingNextExplore,
  isPending: isExplorePending,
} = useInfiniteQuery({
  queryKey: ["feed", "explore"],
  queryFn: ({ pageParam }) => trpc.feed.getExplorePosts.query({ limit: 5, cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  // Guests use explore as the primary feed; authenticated users use it for suggestions
  enabled: computed(() => !auth.isAuthenticated || !!followingData.value),
});

// ── Interleaved feed ────────────────────────────────────────────

const followingProfileIds = computed(() => {
  const ids = new Set<string>();
  followingData.value?.pages.flatMap((p) => p.items).forEach((item) => ids.add(item.profileId));
  return ids;
});

const posts = computed<FeedItemWithMeta[]>(() => {
  if (!auth.isAuthenticated) {
    return (
      exploreData.value?.pages.flatMap((p) =>
        p.items.map((item) => ({ ...item, suggested: false })),
      ) ?? []
    );
  }

  const following = followingData.value?.pages.flatMap((p) => p.items) ?? [];

  // New user with no follows yet — show explore posts with follow buttons
  if (following.length === 0) {
    return (
      exploreData.value?.pages.flatMap((p) =>
        p.items.map((item) => ({ ...item, suggested: true })),
      ) ?? []
    );
  }

  const explore = (exploreData.value?.pages.flatMap((p) => p.items) ?? []).filter(
    (item) => !followingProfileIds.value.has(item.profileId),
  );

  const result: FeedItemWithMeta[] = [];
  let exploreIndex = 0;

  following.forEach((item, i) => {
    result.push({ ...item, suggested: false });
    if ((i + 1) % SUGGEST_EVERY === 0 && exploreIndex < explore.length) {
      result.push({ ...explore[exploreIndex++]!, suggested: true } as FeedItemWithMeta);
    }
  });

  return result;
});

const postIds = computed(() => posts.value.map((p) => p.id));

// ── Load more ───────────────────────────────────────────────────

// Prefer loading more following posts; fall back to explore if exhausted
function loadMore() {
  if (hasNextFollowing.value) {
    fetchNextFollowing();
  } else if (hasNextExplore.value) {
    fetchNextExplore();
  }
}

const hasNextPage = computed(() => hasNextFollowing.value || hasNextExplore.value);
const isFetchingNextPage = computed(
  () => isFetchingNextFollowing.value || isFetchingNextExplore.value,
);
const isPending = computed(() =>
  auth.isAuthenticated ? isFollowingPending.value : isExplorePending.value,
);

function openPost(id: string, focus = false) {
  activePostId.value = id;
  focusComment.value = focus;
  focusCommentId.value = null;
}

const focusCommentId = ref<string | null>(null);

function openPostFromDiscussion(postId: string, commentId: string) {
  activePostId.value = postId;
  focusComment.value = false;
  focusCommentId.value = commentId;
}
</script>

<template>
  <div class="min-h-screen bg-neutral-100">
    <!-- Discovery banner — guests only -->
    <div v-if="!auth.user" class="border-b border-b-neutral-300/80 bg-neutral-200/40 px-6 py-3">
      <p class="text-center text-sm text-muted-foreground">
        Discover work from artists on Artfolio —
        <RouterLink :to="{ name: 'sign-in' }" class="text-foreground underline">
          sign in
        </RouterLink>
        to get a feed tailored to you.
      </p>
    </div>

    <main class="mx-auto max-w-5xl px-5 pt-4 pb-8">
      <div class="flex gap-8 items-start">
        <!-- Feed column -->
        <div class="flex-1 min-w-0 max-w-xl mx-auto lg:mx-0">
          <!-- Loading -->
          <template v-if="isPending">
            <div class="grid grid-cols-1 gap-8">
              <Skeleton v-for="n in 5" :key="n" class="h-160 rounded-2xl" />
            </div>
          </template>

          <template v-else>
            <div v-if="posts.length > 0" class="grid grid-cols-1 gap-8">
              <FeedCard
                v-for="post in posts"
                :key="post.id"
                :post="post"
                :suggested="post.suggested"
                @open="openPost($event)"
                @open-with-comment="openPost($event, true)"
              />
            </div>

            <div
              v-else-if="auth.isAuthenticated"
              class="flex flex-col items-center gap-3 py-24 text-center"
            >
              <Icon icon="ph:users-duotone" class="text-6xl text-muted-foreground" />
              <p class="text-muted-foreground">Follow some artists to see their work here.</p>
              <Button variant="outline" @click="router.push({ name: 'explore' })">
                Explore artists
              </Button>
            </div>

            <div v-else class="flex flex-col items-center gap-3 py-24 text-center">
              <Icon icon="ph:image-square-duotone" class="text-6xl text-muted-foreground" />
              <p class="text-muted-foreground">No posts yet — be the first to share your work.</p>
            </div>

            <div v-if="hasNextPage" class="mt-10 flex justify-center">
              <Button variant="outline" :disabled="isFetchingNextPage" @click="loadMore">
                <Icon v-if="isFetchingNextPage" icon="ph:spinner" class="mr-2 animate-spin" />
                {{ isFetchingNextPage ? "Loading…" : "Load more" }}
              </Button>
            </div>
          </template>
        </div>

        <!-- Sidebar column -->
        <div class="hidden lg:block w-80 sticky mt-14 top-7 shrink-0">
          <FeedSidebar @open-post="openPostFromDiscussion" />
        </div>
      </div>
    </main>

    <PostDetailModal
      v-if="activePostId"
      :post-id="activePostId"
      :post-ids="postIds"
      :focus-comment="focusComment"
      :focus-comment-id="focusCommentId ?? undefined"
      :comment-body="commentBodies[activePostId] ?? ''"
      @close="activePostId = null"
      @navigate="activePostId = $event"
      @update:comment-body="commentBodies[activePostId!] = $event"
    />
  </div>
</template>
