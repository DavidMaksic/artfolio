<script setup lang="ts">
import type { FeedItem } from "@artfolio/shared";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/vue-query";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth.store";
import { useFeedStore } from "@/stores/feed.store";
import { motion } from "motion-v";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import PostDetailModal from "@/components/post/PostDetailModal.vue";
import PostingMarker from "@/components/feed/PostingMarker.vue";
import FeedSidebar from "@/components/feed/FeedSidebar.vue";
import FeedCard from "@/components/feed/FeedCard.vue";

type FeedItemWithMeta = FeedItem & { suggested: boolean };
const feedStore = useFeedStore();
const queryClient = useQueryClient();

const SUGGEST_EVERY = 3; // inject a suggested post every N following posts

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const commentBodies = ref<Record<string, string>>({});

onMounted(() => {
  const postId = route.query.post as string | undefined;
  const commentId = route.query.comment as string | undefined;
  const focus = route.query.focus === "true";

  if (postId && commentId) {
    openPostFromDiscussion(postId, commentId);
  } else if (postId) {
    openPost(postId, focus);
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
  queryFn: ({ pageParam }) => trpc.feed.getFollowingFeed.query({ limit: 15, cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  enabled: computed(() => auth.isAuthenticated),
  placeholderData: keepPreviousData,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

const followingItems = computed(() => followingData.value?.pages.flatMap((p) => p.items) ?? []);

// Following feed takes over once it has content
const showFollowingFeed = computed(() => auth.isAuthenticated && followingItems.value.length > 0);

// ── Explore / guest feed ────────────────────────────────────────

const {
  data: exploreData,
  fetchNextPage: fetchNextExplore,
  hasNextPage: hasNextExplore,
  isFetchingNextPage: isFetchingNextExplore,
  isPending: isExplorePending,
} = useInfiniteQuery({
  queryKey: computed(() => ["feed", "explore", feedStore.guestSeed]),
  queryFn: ({ pageParam }) =>
    trpc.feed.getExplorePosts.query({
      limit: 15,
      cursor: pageParam,
      excludeOwn: true,
      excludeFollowing: true,
      shuffleSeed: feedStore.guestSeed,
    }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  enabled: computed(() => !auth.isAuthenticated || !!followingData.value),
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
// ── Interleaved feed ────────────────────────────────────────────

const exploreItems = computed(() => exploreData.value?.pages.flatMap((p) => p.items) ?? []);

const followingProfileIds = computed(
  () => new Set(followingItems.value.map((item) => item.profileId)),
);

const posts = computed<FeedItemWithMeta[]>(() => {
  if (!auth.isAuthenticated) {
    return exploreItems.value.map((item) => ({ ...item, suggested: false }));
  }

  let result: FeedItemWithMeta[];

  if (!showFollowingFeed.value) {
    result = exploreItems.value.map((item) => ({ ...item, suggested: true }));
  } else {
    const suggestions = exploreItems.value.filter(
      (item) => !item.profile.userIsFollowing && !followingProfileIds.value.has(item.profileId),
    );
    result = [];
    let exploreIndex = 0;

    followingItems.value.forEach((item, i) => {
      result.push({ ...item, suggested: false });
      if ((i + 1) % SUGGEST_EVERY === 0 && exploreIndex < suggestions.length) {
        result.push({ ...suggestions[exploreIndex++]!, suggested: true });
      }
    });

    // Following feed exhausted: continue with the remaining suggestions
    if (!hasNextFollowing.value) {
      while (exploreIndex < suggestions.length) {
        result.push({ ...suggestions[exploreIndex++]!, suggested: true });
      }
    }
  }

  return feedStore.justCreatedPost ? [feedStore.justCreatedPost, ...result] : result;
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

const hasNextPage = computed(() => {
  if (!auth.isAuthenticated) return hasNextExplore.value;
  if (!showFollowingFeed.value) return hasNextExplore.value;
  return hasNextFollowing.value || hasNextExplore.value;
});

const isFetchingNextPage = computed(
  () => isFetchingNextFollowing.value || isFetchingNextExplore.value,
);

const isPending = computed(() =>
  auth.isAuthenticated
    ? isFollowingPending.value || isExplorePending.value
    : isExplorePending.value,
);

const activePostId = computed(() => (route.query.post as string | null) ?? null);
const focusComment = computed(() => route.query.focus === "true");
const focusCommentId = computed(() => (route.query.comment as string | null) ?? null);

function openPost(id: string, focus = false) {
  router.push({ query: { post: id, ...(focus ? { focus: "true" } : {}) } });
}

function openPostFromDiscussion(postId: string, commentId: string) {
  router.push({ query: { post: postId, comment: commentId } });
}

function closePost() {
  if (window.history.state?.back) {
    router.back();
  } else {
    router.replace({ query: { ...route.query, post: undefined, comment: undefined } });
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-100">
    <!-- Discovery banner — guests only -->
    <motion.div
      v-if="!auth.user"
      class="border-b border-b-neutral-300/80 bg-linear-to-r from-blue-accent-400 to-red-accent-300 px-6 py-3 md:border-t md:border-t-neutral-300/80"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      :exit="{ opacity: 0 }"
      :transition="{ type: 'tween', duration: 0.2, ease: 'easeOut' }"
    >
      <p class="text-center text-sm text-white">
        Discover work from artists on Artfolio —
        <RouterLink :to="{ name: 'sign-in' }" class="underline font-semibold">sign in</RouterLink>
        to get a feed tailored to you
      </p>
    </motion.div>

    <main
      class="mx-auto sm:mx-0 max-w-5xl lg:max-w-full px-5 lg:px-10 md:px-28 sm:px-0 pt-4 sm:pt-0 pb-14"
    >
      <div class="flex gap-8 items-start">
        <!-- Feed column -->
        <div class="flex-1 min-w-0 max-w-xl lg:max-w-full md:min-w-full mx-auto md:mx-0">
          <PostingMarker v-if="feedStore.pendingPost?.status === 'uploading'" />

          <Marker
            v-else-if="feedStore.pendingPost?.status === 'error'"
            variant="separator"
            role="alert"
            class="my-11 sm:px-3.5"
          >
            <MarkerIcon class="px-2">
              <Icon icon="ph:warning-circle" />
            </MarkerIcon>
            <MarkerContent>{{ feedStore.pendingPost.error }}</MarkerContent>
            <Button
              variant="ghost"
              size="sm"
              class="px-2"
              @click="feedStore.retryPosting(queryClient)"
              >Retry</Button
            >
            <Button variant="ghost" size="sm" class="px-2" @click="feedStore.discardPosting()"
              >Discard</Button
            >
          </Marker>

          <!-- Loading -->
          <template v-if="isPending">
            <div class="grid grid-cols-1 gap-8">
              <div v-for="n in 5" :key="n" class="flex flex-col">
                <!-- Header -->
                <div class="space-y-2.5 py-2.5">
                  <div class="flex items-center justify-between gap-2 sm:px-2">
                    <div class="flex items-center gap-1.5">
                      <Skeleton class="size-9 rounded-full shrink-0" />
                      <Skeleton class="h-4 w-28 ml-1" />
                      <Skeleton class="h-3 w-14" />
                    </div>
                    <Skeleton class="size-7 rounded-md shrink-0" />
                  </div>
                </div>

                <!-- Card body -->
                <div class="rounded-2xl sm:rounded-none">
                  <Skeleton class="w-full aspect-square rounded-2xl sm:rounded-none" />
                </div>
              </div>
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

            <div v-else class="flex flex-col items-center gap-3 py-24 text-center">
              <Icon icon="ph:image-square-duotone" class="text-6xl text-muted-foreground" />
              <p class="text-muted-foreground">No posts yet — be the first to share your work.</p>
            </div>

            <div v-if="hasNextPage" class="mt-10 flex justify-center">
              <Button variant="outline" :disabled="isFetchingNextPage" @click="loadMore">
                <Icon v-if="isFetchingNextPage" icon="ph:spinner" class="mr-2 animate-spin" />
                <Icon icon="ph:caret-down" class="mr-0.5" />
                {{ isFetchingNextPage ? "Loading…" : "Load more" }}
              </Button>
            </div>
          </template>
        </div>

        <!-- Sidebar column -->
        <div class="md:hidden w-80 md:w-full sticky mt-14 top-22 lg:top-20 shrink-0">
          <FeedSidebar @open-post="openPostFromDiscussion" />
        </div>
      </div>
    </main>

    <PostDetailModal
      :post-id="activePostId"
      :post-ids="postIds"
      :focus-comment="focusComment"
      :focus-comment-id="focusCommentId ?? undefined"
      v-model:comment-body="commentBodies[activePostId!]"
      @close="closePost"
      @navigate="router.replace({ query: { post: $event } })"
      @update:comment-body="commentBodies[activePostId!] = $event"
    />
  </div>
</template>
