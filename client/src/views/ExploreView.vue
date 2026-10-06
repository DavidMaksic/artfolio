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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computed, ref, watch, onUnmounted } from "vue";
import { useInfiniteQuery, useQuery } from "@tanstack/vue-query";
import { useRouter, useRoute } from "vue-router";
import { useMediaQuery } from "@vueuse/core";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import FilterPanelContent from "@/components/FilterPanelContent.vue";
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
      limit: 23,
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
      limit: 23,
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

// ── Styles change on lg: breakpoint and bellow ───────────────────────────────────

const filtersOpen = ref(false);
const isDesktop = useMediaQuery("(min-width: 768px)");
const isPhone = useMediaQuery("(min-width: 640px)");

const activeFilterCount = computed(() => {
  let count = 0;
  if (selectedCategory.value) count++;
  if (sort.value !== "popular") count++;
  return count;
});

function clearAllFilters() {
  rawQuery.value = "";
  const query = { ...route.query };
  delete query.category;
  delete query.sort;
  delete query.q;
  router.replace({ query });
}
</script>

<template>
  <div class="min-h-screen bg-neutral-100">
    <main class="w-full mx-auto px-5 sm:px-0 py-8 md:pt-6 sm:pt-2 flex flex-col">
      <!-- Filter bar -->
      <div class="grid grid-cols-3 xl:grid-cols-2 md:grid-cols-[1fr_auto] md:gap-4 mb-1 px-5">
        <!-- Trending tags — hidden on xl and below -->
        <div class="flex items-center gap-2 flex-wrap flex-1 xl:hidden">
          <span class="text-[0.92rem] font-medium text-foreground shrink-0 mr-0.5">Trending:</span>

          <template v-if="trendingTags.length">
            <button
              v-for="tag in trendingTags"
              :key="tag.id"
              class="text-[0.92rem] px-4 py-1.5 rounded-full border border-neutral-200 bg-white text-muted-foreground hover:border-neutral-400/80 transition-colors"
              :class="{
                'border-neutral-300 text-foreground bg-neutral-100!': debouncedQuery === tag.name,
              }"
              @click="selectTag(tag.name)"
            >
              {{ tag.name }}
            </button>
          </template>

          <template v-else>
            <div
              v-for="w in ['w-20', 'w-26', 'w-22']"
              :key="w"
              :class="['h-8 rounded-full', w]"
              class="animate-pulse bg-neutral-200"
            />
          </template>
        </div>

        <!-- Search bar -->
        <div class="relative w-xl 2xl:w-md xl:w-full justify-self-center xl:justify-self-start">
          <Icon
            icon="ph:magnifying-glass"
            class="absolute left-4 top-1/2 sm:top-5 -translate-y-1/2 text-muted-foreground text-lg pointer-events-none"
          />
          <input
            v-model="rawQuery"
            type="text"
            :placeholder="!isPhone ? 'Search…' : 'Search by tag, category or description…'"
            class="w-full h-12 sm:h-10 rounded-2xl border border-neutral-200 bg-white px-11 text-[0.92rem] shadow-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            v-if="rawQuery"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
            @click="clearSearch"
          >
            <Icon icon="ph:x" class="text-base" />
          </button>
        </div>

        <!-- Category + sort — hidden on lg and below -->
        <div class="flex items-center gap-4 xl:hidden justify-self-end">
          <Combobox
            :model-value="selectedCategory"
            by="value"
            @update:model-value="
              (val) => selectCategory(val as { value: string; label: string } | null)
            "
          >
            <ComboboxAnchor as-child>
              <ComboboxTrigger as-child>
                <Button
                  variant="outline"
                  class="w-50 h-10 pl-4! rounded-lg justify-between font-normal hover:bg-white text-[0.92rem]"
                >
                  {{ selectedCategory?.label ?? "All categories" }}
                  <Icon icon="ph:caret-up-down" class="opacity-50" />
                </Button>
              </ComboboxTrigger>
            </ComboboxAnchor>
            <ComboboxList class="rounded-lg">
              <ComboboxInput class="text-[0.92rem]" placeholder="Search category..." />
              <ComboboxEmpty class="text-[0.92rem]">No category found</ComboboxEmpty>
              <ComboboxGroup>
                <ComboboxItem
                  :value="null"
                  class="px-2.5 text-[0.92rem]"
                  @select="selectCategory(null)"
                >
                  All categories
                  <ComboboxItemIndicator><Icon icon="ph:check" /></ComboboxItemIndicator>
                </ComboboxItem>
                <ComboboxItem
                  v-for="cat in categories"
                  :key="cat.value"
                  :value="cat"
                  class="px-2.5 text-[0.92rem] rounded-md"
                >
                  {{ cat.label }}
                  <ComboboxItemIndicator><Icon icon="ph:check" /></ComboboxItemIndicator>
                </ComboboxItem>
              </ComboboxGroup>
            </ComboboxList>
          </Combobox>

          <Select :model-value="sort" @update:model-value="setSort">
            <SelectTrigger class="w-32 pl-4! bg-white h-10! rounded-lg text-[0.92rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent class="rounded-lg">
              <SelectItem value="popular" class="text-[0.92rem] rounded-md">Popular</SelectItem>
              <SelectItem value="new" class="text-[0.92rem] rounded-lg">New</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Filters button — visible on lg and below -->
        <Button
          variant="outline"
          data-testid="filters-button"
          class="relative hidden xl:flex h-12 sm:h-10 px-4! xl:justify-self-end rounded-2xl bg-white"
          @click="filtersOpen = true"
        >
          <Icon icon="ph:sliders" class="text-lg" />
          Filters
          <span
            v-if="activeFilterCount > 0"
            class="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center font-medium"
          >
            {{ activeFilterCount }}
          </span>
        </Button>
      </div>

      <Sheet v-model:open="filtersOpen">
        <SheetContent
          :side="isDesktop ? 'right' : 'bottom'"
          class="flex flex-col gap-2"
          :class="
            isDesktop
              ? 'w-84 rounded-l-2xl bg-neutral-100'
              : 'px-5 sm:px-8 sm:pt-4 pb-8 rounded-t-2xl'
          "
        >
          <div
            v-if="!isDesktop"
            class="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-2 rounded-full bg-neutral-300/80"
          />
          <SheetHeader
            class="flex-row sm:justify-center sm:text-lg items-center justify-between px-6 sm:px-0"
          >
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>

          <FilterPanelContent
            :categories
            :selected-category
            :sort
            :trending-tags
            :debounced-query
            @select-category="selectCategory"
            @set-sort="setSort"
            @select-tag="selectTag"
          />

          <div
            class="mt-auto flex gap-3 px-5 py-5 sm:pb-0 sm:pt-6 sm:px-0 border-t border-neutral-200/80"
          >
            <Button
              variant="outline"
              class="flex-1 h-10 rounded-xl"
              :disabled="activeFilterCount === 0"
              @click="clearAllFilters"
            >
              Clear all
            </Button>
            <Button class="flex-1 h-10 rounded-xl" @click="filtersOpen = false"> Done </Button>
          </div>
        </SheetContent>
      </Sheet>

      <!-- Grid (explore or search results — same component, different data) -->
      <PostGrid
        :posts="posts"
        :is-owner="false"
        :is-loading-posts="isPending"
        :show-empty-state="false"
        :rowHeight="!isPhone ? 300 : 380"
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
