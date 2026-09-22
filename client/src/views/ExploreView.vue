<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useInfiniteQuery } from "@tanstack/vue-query";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";
import PostGrid from "@/components/post/PostGrid.vue";

// ── Search state ───────────────────────────────────────────────────────────

const router = useRouter();
const route = useRoute();

// Source of truth is the URL
const debouncedQuery = computed(() => (route.query.q as string) ?? "");
const rawQuery = ref(debouncedQuery.value); // input model, local only

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(rawQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    router.replace({ query: val.trim() ? { q: val.trim() } : {} });
  }, 400);
});

// Keep rawQuery in sync if URL changes externally (e.g. back/forward)
watch(debouncedQuery, (val) => {
  if (val !== rawQuery.value) rawQuery.value = val;
});

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});

const isSearching = computed(() => debouncedQuery.value.length > 0);

function clearSearch() {
  rawQuery.value = "";
  router.replace({ query: {} });
}
// ── Explore feed (always enabled — stays cached when user searches) ─────────

const exploreResult = useInfiniteQuery({
  queryKey: ["feed", "explore"],
  queryFn: ({ pageParam }) => trpc.feed.getExplorePosts.query({ limit: 20, cursor: pageParam }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
});

// ── Search query (fires only when debounced query is non-empty) ─────────────
// Each unique query string gets its own cache entry, so switching between
// previous searches is instant.

const searchResult = useInfiniteQuery({
  queryKey: computed(() => ["posts", "search", debouncedQuery.value]),
  queryFn: ({ pageParam }) =>
    trpc.post.search.query({
      query: debouncedQuery.value,
      limit: 20,
      cursor: pageParam,
    }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  enabled: isSearching,
});

// ── Active query (switches cleanly between explore and search) ──────────────

const posts = computed(() =>
  isSearching.value
    ? (searchResult.data.value?.pages.flatMap((p) => p.items) ?? [])
    : (exploreResult.data.value?.pages.flatMap((p) => p.items) ?? []),
);

const isPending = computed(() =>
  isSearching.value ? searchResult.isPending.value : exploreResult.isPending.value,
);

const hasNextPage = computed(() =>
  isSearching.value ? searchResult.hasNextPage.value : exploreResult.hasNextPage.value,
);

const isFetchingNextPage = computed(() =>
  isSearching.value
    ? searchResult.isFetchingNextPage.value
    : exploreResult.isFetchingNextPage.value,
);

function fetchNextPage() {
  if (isSearching.value) {
    searchResult.fetchNextPage();
  } else {
    exploreResult.fetchNextPage();
  }
}
</script>

<template>
  <div class="min-h-screen bg-neutral-100">
    <main class="w-full mx-auto px-5 pt-6 pb-8 flex flex-col">
      <!-- Search bar -->
      <div class="relative mb-6 min-w-2xl self-center">
        <Icon
          icon="ph:magnifying-glass"
          class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none"
        />
        <input
          v-model="rawQuery"
          type="text"
          placeholder="Search by tag, category or description…"
          class="w-full h-10 rounded-lg border border-neutral-200 bg-white pl-9 pr-9 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          v-if="rawQuery"
          class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          @click="clearSearch"
        >
          <Icon icon="ph:x" class="text-base" />
        </button>
      </div>

      <!-- Grid (explore or search results — same component, different data) -->
      <PostGrid
        :posts="posts"
        :is-owner="false"
        :is-loading-posts="isPending"
        :show-empty-state="false"
      />

      <!-- Empty state: no search results -->
      <div
        v-if="isSearching && !isPending && posts.length === 0"
        class="flex flex-col items-center gap-3 py-24 text-center"
      >
        <Icon icon="ph:magnifying-glass-duotone" class="text-6xl text-muted-foreground" />
        <p class="text-muted-foreground">
          No posts found for
          <span class="font-medium text-foreground">"{{ debouncedQuery }}"</span>
        </p>
        <button
          class="text-sm text-muted-foreground underline underline-offset-2"
          @click="clearSearch"
        >
          Clear search
        </button>
      </div>

      <!-- Empty state: explore is just empty -->
      <div
        v-if="!isSearching && !isPending && posts.length === 0"
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
