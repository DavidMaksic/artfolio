<script setup lang="ts">
import { useInfiniteQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";
import PostGrid from "@/components/post/PostGrid.vue";

const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } = useInfiniteQuery({
  queryKey: ["feed", "explore"],
  queryFn: ({ pageParam }) => trpc.feed.getExplorePosts.query({ limit: 20, cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
});

const posts = computed(() => data.value?.pages.flatMap((p) => p.items) ?? []);
</script>

<template>
  <div class="min-h-screen bg-neutral-100">
    <main class="mx-auto px-5 pt-6 pb-8">
      <PostGrid :posts="posts" :is-owner="false" :is-loading-posts="isPending" />

      <!-- Empty state -->
      <div
        v-if="!isPending && posts.length === 0"
        class="flex flex-col items-center gap-3 py-24 text-center"
      >
        <Icon icon="ph:compass-duotone" class="text-6xl text-muted-foreground" />
        <p class="text-muted-foreground">Nothing to explore yet.</p>
      </div>

      <!-- Load more -->
      <div v-if="hasNextPage" class="mt-10 flex justify-center">
        <Button variant="outline" :disabled="isFetchingNextPage" @click="fetchNextPage()">
          <Icon v-if="isFetchingNextPage" icon="ph:spinner" class="mr-2 animate-spin" />
          {{ isFetchingNextPage ? "Loading…" : "Load more" }}
        </Button>
      </div>
    </main>
  </div>
</template>
