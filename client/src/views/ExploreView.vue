<script setup lang="ts">
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxItem,
  ComboboxList,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxAnchor,
  ComboboxTrigger,
  ComboboxItemIndicator,
} from "@/components/ui/combobox";
import type { AcceptableValue } from "reka-ui";
import { computed, ref, watch, onUnmounted } from "vue";
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { useRouter, useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";
import PostGrid from "@/components/post/PostGrid.vue";

const router = useRouter();
const route = useRoute();

// ── Search state ───────────────────────────────────────────────────────────

const sort = computed(() => (route.query.sort as "new" | "popular") ?? "popular");
function setSort(value: AcceptableValue) {
  if (!value) return;
  router.replace({ query: { ...route.query, sort: value as string } });
}

const debouncedQuery = computed(() => (route.query.q as string) ?? "");
const rawQuery = ref(debouncedQuery.value);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(rawQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const query = { ...route.query };
    if (val.trim()) {
      query.q = val.trim();
    } else {
      delete query.q;
    }
    router.replace({ query });
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
  const query = { ...route.query };
  delete query.q;
  router.replace({ query });
}

// ── Category filter ────────────────────────────────────────
const { data: categoriesData } = useQuery({
  queryKey: ["categories"],
  queryFn: () => trpc.tag.getCategories.query(),
  staleTime: 1000 * 60 * 10,
});

const categories = computed(
  () => categoriesData.value?.map((c) => ({ value: c.slug, label: c.name })) ?? [],
);

function selectCategory(cat: { value: string; label: string } | null) {
  const query = { ...route.query };
  if (cat) {
    query.category = cat.value;
  } else {
    delete query.category;
  }
  router.replace({ query });
}

const selectedCategory = computed(() => {
  const slug = route.query.category as string | undefined;
  return categories.value.find((c) => c.value === slug) ?? null;
});

// ── Explore feed (always enabled — stays cached when user searches) ─────────

const exploreResult = useInfiniteQuery({
  queryKey: computed(() => ["feed", "explore", sort.value, selectedCategory.value?.value ?? ""]),
  queryFn: ({ pageParam }) =>
    trpc.feed.getExplorePosts.query({
      limit: 20,
      cursor: pageParam,
      sort: sort.value,
      category: selectedCategory.value?.value,
    }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
});

// ── Search query (fires only when debounced query is non-empty) ─────────────

const searchResult = useInfiniteQuery({
  queryKey: computed(() => [
    "posts",
    "search",
    debouncedQuery.value,
    sort.value,
    selectedCategory.value?.value ?? "",
  ]),
  queryFn: ({ pageParam }) =>
    trpc.post.search.query({
      query: debouncedQuery.value,
      limit: 20,
      cursor: pageParam,
      sort: sort.value,
      category: selectedCategory.value?.value,
    }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  enabled: () => debouncedQuery.value.length > 0,
});

// ── Tag filter ────────────────────────────────────────

const { data: trendingData } = useQuery({
  queryKey: ["tags", "trending"],
  queryFn: () => trpc.tag.getTrending.query(),
  staleTime: 1000 * 60 * 5, // 5 minutes
});

const trendingTags = computed(() => trendingData.value?.tags ?? []);

function selectTag(tagName: string) {
  const next = debouncedQuery.value === tagName ? "" : tagName;
  rawQuery.value = next;
  const query = { ...route.query };
  if (next) {
    query.q = next;
  } else {
    delete query.q;
  }
  router.replace({ query });
}

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
    <main class="w-full mx-auto px-5 py-8 flex flex-col">
      <!-- Tag filter -->
      <div class="grid grid-cols-3 mb-1 px-5 flex-wrap gap-2">
        <!-- Trending tags -->
        <div v-if="trendingTags.length" class="flex items-center gap-2 flex-wrap">
          <span class="text-sm font-medium text-foreground shrink-0">Trending:</span>
          <button
            v-for="tag in trendingTags"
            :key="tag.id"
            class="text-sm px-3 py-1 rounded-full border border-neutral-200 bg-white text-muted-foreground hover:border-neutral-400/80 transition-colors"
            :class="{
              'border-neutral-300 text-foreground bg-neutral-100!': debouncedQuery === tag.name,
            }"
            @click="selectTag(tag.name)"
          >
            {{ tag.name }}
          </button>
        </div>

        <!-- Search bar -->
        <div class="relative min-w-md justify-self-center">
          <Icon
            icon="ph:magnifying-glass"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none"
          />
          <input
            v-model="rawQuery"
            type="text"
            placeholder="Search by tag, category or description…"
            class="w-full h-9 rounded-md border border-neutral-200 bg-white pl-9 pr-9 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            v-if="rawQuery"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            @click="clearSearch"
          >
            <Icon icon="ph:x" class="text-base" />
          </button>
        </div>

        <div class="flex items-center gap-4 justify-self-end">
          <!-- Category combobox -->
          <Combobox
            :model-value="selectedCategory"
            by="value"
            @update:model-value="
              (val) => selectCategory(val as { value: string; label: string } | null)
            "
          >
            <ComboboxAnchor as-child>
              <ComboboxTrigger as-child>
                <Button variant="outline" class="w-50 justify-between font-normal">
                  {{ selectedCategory?.label ?? "All categories" }}
                  <Icon icon="ph:caret-up-down" class="opacity-50" />
                </Button>
              </ComboboxTrigger>
            </ComboboxAnchor>
            <ComboboxList>
              <ComboboxInput placeholder="Search category..." />
              <ComboboxEmpty>No category found.</ComboboxEmpty>
              <ComboboxGroup>
                <ComboboxItem :value="null" @select="selectCategory(null)">
                  All categories
                  <ComboboxItemIndicator>
                    <Icon icon="ph:check" />
                  </ComboboxItemIndicator>
                </ComboboxItem>
                <ComboboxItem v-for="cat in categories" :key="cat.value" :value="cat">
                  {{ cat.label }}
                  <ComboboxItemIndicator>
                    <Icon icon="ph:check" />
                  </ComboboxItemIndicator>
                </ComboboxItem>
              </ComboboxGroup>
            </ComboboxList>
          </Combobox>

          <!-- Sort toggle -->
          <Select :model-value="sort" @update:model-value="setSort">
            <SelectTrigger class="w-32 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="new">New</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <!-- Grid (explore or search results — same component, different data) -->
      <PostGrid
        :posts="posts"
        :is-owner="false"
        :is-loading-posts="isPending"
        :show-empty-state="false"
        :rowHeight="420"
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
      <div v-if="hasNextPage" class="mt-2 flex justify-center">
        <Button variant="outline" :disabled="isFetchingNextPage" @click="fetchNextPage()">
          <Icon v-if="isFetchingNextPage" icon="ph:spinner" class="mr-2 animate-spin" />
          <Icon icon="ph:caret-down" class="mr-0.5" />
          {{ isFetchingNextPage ? "Loading…" : "Load more" }}
        </Button>
      </div>
    </main>
  </div>
</template>
