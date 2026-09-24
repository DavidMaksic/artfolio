<script setup lang="ts">
import type { FeedItem, Post } from "@artfolio/shared";
import PostDetailModal from "@/components/post/PostDetailModal.vue";

import { ref, computed, watch, onUnmounted } from "vue";
import { Icon } from "@iconify/vue";

type Row = { post: Post; width: number }[];

const props = defineProps<{
  posts: Post[] | FeedItem[] | undefined;
  isOwner: boolean;
  isLoadingPosts: boolean;
  accentOverlay?: boolean;
  showEmptyState?: boolean;
  rowHeight?: number;
}>();

const activePostId = ref<string | null>(null);
const postIds = computed(() => props.posts?.map((p) => p.id) ?? []);

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const TARGET_ROW_HEIGHT = props.rowHeight ?? 380;

let ro: ResizeObserver | null = null;

watch(containerRef, (el) => {
  ro?.disconnect();
  ro = null;
  if (!el) return;

  ro = new ResizeObserver(() => {
    containerWidth.value = el.clientWidth;
  });
  ro.observe(el);
  containerWidth.value = el.clientWidth;
});

onUnmounted(() => ro?.disconnect());

const rows = computed<Row[]>(() => {
  if (!containerWidth.value || !props.posts?.length) return [];

  const gap = 4;
  const rows: Row[] = [];
  let currentRow: { post: Post; aspectRatio: number }[] = [];
  let currentRowWidth = 0;

  for (const post of props.posts ?? []) {
    const cover = post.coverImage;
    const aspectRatio = cover ? cover.width / cover.height : 1;
    const scaledWidth = aspectRatio * TARGET_ROW_HEIGHT;

    currentRow.push({ post, aspectRatio });
    currentRowWidth += scaledWidth;

    const totalGaps = (currentRow.length - 1) * gap;
    const availableWidth = containerWidth.value - totalGaps;

    if (currentRowWidth >= availableWidth) {
      const scale = availableWidth / currentRowWidth;
      const rowHeight = TARGET_ROW_HEIGHT * scale;
      rows.push(
        currentRow.map(({ post, aspectRatio }) => ({
          post,
          width: aspectRatio * rowHeight,
        })),
      );
      currentRow = [];
      currentRowWidth = 0;
    }
  }

  if (currentRow.length > 0) {
    rows.push(
      currentRow.map(({ post, aspectRatio }) => ({
        post,
        width: aspectRatio * TARGET_ROW_HEIGHT,
      })),
    );
  }

  return rows;
});
</script>

<template>
  <section class="flex-1 min-w-0 p-5 pl-5">
    <div ref="containerRef" class="w-full">
      <template v-if="isLoadingPosts">
        <div class="grid grid-cols-3 gap-1">
          <Skeleton v-for="n in 9" :key="n" class="h-95 w-full rounded-xl" />
        </div>
      </template>

      <template v-else>
        <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="flex gap-1 mb-1">
          <div
            v-for="{ post, width } in row"
            :key="post.id"
            :data-post-id="post.id"
            class="relative overflow-hidden rounded-xl border border-neutral-200 group select-none shrink-0"
            :style="{ width: `${width}px`, height: `${TARGET_ROW_HEIGHT}px` }"
            @click="activePostId = post.id"
          >
            <img
              :src="post.coverImage?.imageUrl"
              :alt="post.category.name"
              class="w-full h-full object-cover transition-transform duration-300"
            />

            <!-- Hover overlay -->
            <div
              class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3"
              :style="
                accentOverlay
                  ? 'background: radial-gradient(ellipse at top right, hsl(var(--pa-h) var(--pa-s) var(--pa-l) / 0.4) 0%, hsl(0 0% 0% / 0.55) 100%);'
                  : 'background: radial-gradient(ellipse at top right, hsl(0 0% 40% / 0.4) 0%, hsl(0 0% 0% / 0.55) 100%);'
              "
            >
              <div class="flex items-center gap-4">
                <div v-if="post.likeCount" class="flex items-center gap-1.5 text-white">
                  <Icon class="size-4.5" icon="ph:heart" />
                  <span class="text-sm">{{ post.likeCount }}</span>
                </div>
                <div v-if="post.commentCount" class="flex items-center gap-1.5 text-white">
                  <Icon class="size-4.5" icon="ph:chat-circle" />
                  <span class="text-sm">{{ post.commentCount }}</span>
                </div>
                <Icon
                  v-if="post.imageCount > 1"
                  icon="famicons:copy-outline"
                  class="text-white drop-shadow text-lg"
                />
              </div>
            </div>

            <span
              v-if="post.description"
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 italic text-neutral-300 text-center px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            >
              "{{ post.description }}"
            </span>
          </div>
        </div>
      </template>
    </div>

    <PostDetailModal
      v-if="activePostId"
      :post-id="activePostId"
      :post-ids="postIds"
      @close="activePostId = null"
      @navigate="activePostId = $event"
    />

    <div
      v-if="(props.showEmptyState ?? true) && posts?.length === 0"
      class="flex flex-col items-center justify-center -translate-y-20 h-full text-center gap-3"
    >
      <Icon icon="ph:image-square-duotone" class="text-6xl text-muted-foreground" />
      <p class="text-lg text-muted-foreground">
        {{ isOwner ? "No posts yet — share your first work" : "No posts yet" }}
      </p>
    </div>
  </section>
</template>
