<script setup lang="ts">
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@artfolio/server/router";

import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type PostSummaryItem = RouterOutputs["post"]["getByUsername"]["items"][number];

const props = defineProps<{
  posts: PostSummaryItem[];
  isOwner?: boolean;
}>();

const emit = defineEmits<{
  delete: [postId: string];
  open: [postId: string];
}>();

const router = useRouter();
const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const TARGET_ROW_HEIGHT = 380;

function updateWidth() {
  if (containerRef.value) containerWidth.value = containerRef.value.clientWidth;
}

onMounted(() => {
  updateWidth();
  window.addEventListener("resize", updateWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWidth);
});

type Row = { post: PostSummaryItem; width: number }[];

const rows = computed<Row[]>(() => {
  if (!containerWidth.value || props.posts.length === 0) return [];

  const gap = 4;
  const rows: Row[] = [];
  let currentRow: { post: PostSummaryItem; aspectRatio: number }[] = [];
  let currentRowWidth = 0;

  for (const post of props.posts) {
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
  <div
    v-if="posts.length === 0"
    class="fixed top-1/2 left-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col items-center justify-center py-24 text-center gap-2"
  >
    <Icon icon="ph:image-square-duotone" class="text-6xl text-muted-foreground" />
    <p class="text-lg text-muted-foreground">No posts yet</p>
  </div>

  <div v-else ref="containerRef" class="w-full">
    <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="flex gap-1 mb-1">
      <div
        v-for="{ post, width } in row"
        :key="post.id"
        :data-post-id="post.id"
        class="relative overflow-hidden rounded-xl border border-neutral-200 group select-none shrink-0"
        :style="{ width: `${width}px`, height: `${TARGET_ROW_HEIGHT}px` }"
        @click="emit('open', post.id)"
      >
        <img
          :src="post.coverImage?.imageUrl"
          :alt="post.category.name"
          class="w-full h-full object-cover transition-transform duration-300"
        />

        <!-- Hover overlay -->
        <div
          class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3"
          style="
            background: radial-gradient(
              ellipse at top right,
              hsl(var(--pa-h) var(--pa-s) var(--pa-l) / 0.4) 0%,
              hsl(0 0% 0% / 0.55) 100%
            );
          "
        >
          <div class="flex gap-2">
            <span class="text-white text-sm font-medium">{{ post.category.name }}</span>
            <span v-if="post.imageCount > 1" class="text-white text-sm font-light">|</span>
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

        <!-- Owner controls -->
        <div
          v-if="isOwner"
          class="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          @click.stop
        >
          <button
            class="bg-black/60 hover:bg-black/80 rounded-full p-1.5 transition"
            @click="router.push({ name: 'post-edit', params: { id: post.id } })"
          >
            <Icon icon="ph:pencil-simple" class="text-white text-xs" />
          </button>
          <button
            class="bg-black/60 hover:bg-destructive rounded-full p-1.5 transition"
            @click="emit('delete', post.id)"
          >
            <Icon icon="ph:trash" class="text-white text-xs" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
