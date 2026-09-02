<script setup lang="ts">
import { computed, ref } from "vue";
import { useInfiniteQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth.store";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import PostDetailModal from "@/components/PostDetailModal.vue";
import FeedCard from "@/components/FeedCard.vue";

const auth = useAuthStore();
const activePostId = ref<string | null>(null);

const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery({
  queryKey: ["feed"],
  queryFn: ({ pageParam }) =>
    trpc.feed.getFeed.query({
      limit: 5,
      cursor: pageParam,
    }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
});

const posts = computed(() => data.value?.pages.flatMap((p) => p.items) ?? []);
const postIds = computed(() => posts.value.map((p) => p.id));
</script>

<template>
  <div class="min-h-screen bg-neutral-100">
    <!-- Discovery banner — guests only -->
    <div v-if="!auth.user" class="border-b bg-muted/50 px-6 py-3">
      <p class="text-center text-sm text-muted-foreground">
        Discover work from artists on Artfolio —
        <RouterLink :to="{ name: 'sign-in' }" class="text-foreground underline">
          sign in
        </RouterLink>
        to get a feed tailored to you.
      </p>
    </div>

    <main class="mx-auto max-w-xl px-5 py-8">
      <!-- Loading -->
      <template v-if="isPending">
        <div class="grid grid-cols-1 gap-8">
          <Skeleton v-for="n in 9" :key="n" class="h-80 rounded-2xl" />
        </div>
      </template>

      <template v-else>
        <!-- Grid -->
        <div v-if="posts.length > 0" class="grid grid-cols-1 gap-8">
          <FeedCard
            v-for="post in posts"
            :key="post.id"
            :post="post"
            @open="activePostId = $event"
          />
        </div>

        <!-- Empty state -->
        <div v-else class="flex flex-col items-center gap-3 py-24 text-center">
          <Icon icon="ph:image-square-duotone" class="text-6xl text-muted-foreground" />
          <p class="text-muted-foreground">No posts yet — be the first to share your work.</p>
        </div>

        <!-- Load more -->
        <div v-if="hasNextPage" class="mt-10 flex justify-center">
          <Button variant="outline" :disabled="isFetchingNextPage" @click="fetchNextPage()">
            <Icon v-if="isFetchingNextPage" icon="ph:spinner" class="mr-2 animate-spin" />
            {{ isFetchingNextPage ? "Loading…" : "Load more" }}
          </Button>
        </div>
      </template>
    </main>

    <!-- Reuse existing modal -->
    <PostDetailModal
      v-if="activePostId"
      :post-id="activePostId"
      :post-ids="postIds"
      @close="activePostId = null"
      @navigate="activePostId = $event"
    />
  </div>
</template>
