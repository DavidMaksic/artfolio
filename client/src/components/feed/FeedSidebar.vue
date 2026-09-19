<script setup lang="ts">
import type { DiscussionItem } from "@artfolio/shared";
import { useQuery, useInfiniteQuery } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { computed } from "vue";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

const router = useRouter();
const auth = useAuthStore();

const emit = defineEmits<{
  openPost: [postId: string, commentId: string];
}>();

// ── Profile card ───────────────────────────────────────────────

const { data: me } = useQuery({
  queryKey: ["me"],
  queryFn: () => trpc.profile.getMe.query(),
  enabled: computed(() => auth.isAuthenticated),
});

// ── Latest discussions ─────────────────────────────────────────

const {
  data: discussionsData,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ["discussions"],
  queryFn: ({ pageParam }) =>
    trpc.engagement.getLatestDiscussions.query({
      limit: 5,
      cursor: pageParam,
    }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  refetchInterval: 30_000,
});

const discussions = computed<DiscussionItem[]>(
  () => discussionsData.value?.pages.flatMap((p) => p.items) ?? [],
);

const totalLoaded = computed(() => discussions.value.length);

// Cap at 10 total — hide button after second page
const canLoadMore = computed(() => hasNextPage.value && totalLoaded.value < 10);
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Profile card -->
    <div
      v-if="auth.isAuthenticated && me"
      class="bg-white rounded-2xl border border-neutral-200 p-4 flex items-center gap-3 cursor-default hover:bg-neutral-50 transition-colors"
      @click="router.push({ name: 'profile', params: { username: me.username } })"
    >
      <img
        v-if="me.profileImageUrl"
        :src="me.profileImageUrl"
        class="size-12 rounded-full object-cover shrink-0 border"
      />
      <div
        v-else
        class="size-12 rounded-full bg-white border flex items-center justify-center shrink-0"
      >
        <Icon icon="ph:user" class="text-muted-foreground text-[1.35rem]" />
      </div>
      <div class="min-w-0">
        <p class="font-semibold truncate">
          {{ me.displayName ?? me.username }}
        </p>
        <p class="text-xs text-muted-foreground truncate">@{{ me.username }}</p>
      </div>
      <Icon icon="ph:arrow-right" class="text-muted-foreground ml-auto shrink-0" />
    </div>

    <!-- Latest discussions -->
    <div class="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div class="px-4 py-3 border-b border-neutral-100">
        <p class="font-semibold text-sm">Latest Discussions</p>
      </div>

      <div class="divide-y divide-neutral-100">
        <div
          v-for="item in discussions"
          :key="item.id"
          class="flex items-center gap-3 py-3 px-3 hover:bg-neutral-50 transition-colors cursor-default"
          @click="emit('openPost', item.postId, item.id)"
        >
          <!-- Comment content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2.5 mb-0.5">
              <img
                v-if="item.profile.profileImageUrl"
                :src="item.profile.profileImageUrl"
                class="size-10 rounded-full object-cover shrink-0 self-start border"
              />
              <div
                v-else
                class="size-10 rounded-full bg-white border flex items-center justify-center shrink-0"
              >
                <Icon icon="ph:user" class="text-muted-foreground text-lg" />
              </div>
              <div class="flex items-center gap-1">
                <p class="text-sm text-neutral-600 line-clamp-3">
                  <span class="text-sm font-medium truncate">
                    {{ item.profile.displayName ?? item.profile.username }}: </span
                  >{{ item.body }}
                </p>
              </div>
            </div>
          </div>

          <!-- Post thumbnail -->
          <img
            :src="item.coverImage.imageUrl"
            class="size-12 rounded-lg object-cover shrink-0 border"
          />
        </div>

        <!-- Empty state -->
        <div v-if="discussions.length === 0" class="p-4 text-center text-sm text-muted-foreground">
          No discussions yet.
        </div>
      </div>

      <!-- View more -->
      <div v-if="canLoadMore" class="p-2 border-t border-neutral-100">
        <Button
          variant="ghost"
          size="sm"
          class="w-full text-xs text-muted-foreground hover:text-foreground"
          :disabled="isFetchingNextPage"
          @click="fetchNextPage()"
        >
          <Icon v-if="isFetchingNextPage" icon="ph:spinner" class="mr-1.5 animate-spin" />
          {{ isFetchingNextPage ? "Loading…" : "View more" }}
        </Button>
      </div>
    </div>
  </div>
</template>
