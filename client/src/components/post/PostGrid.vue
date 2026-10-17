<script setup lang="ts">
import type { FeedItem, Post } from "@artfolio/shared";
import { ref, computed, watch, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCloudinaryUrl } from "@/composables/useCloudinaryUrl";
import { useMediaQuery } from "@vueuse/core";
import { Icon } from "@iconify/vue";
import PostDetailModal from "@/components/post/PostDetailModal.vue";
import { motion } from "motion-v";
import { reactive } from "vue";

type Row = { post: Post; width: number }[];

const props = defineProps<{
  posts: Post[] | FeedItem[] | undefined;
  isOwner: boolean;
  isLoadingPosts: boolean;
  accentOverlay?: boolean;
  showEmptyState?: boolean;
}>();

const route = useRoute();
const router = useRouter();
const { thumb } = useCloudinaryUrl();

const activePostId = computed(() => (route.query.post as string | null) ?? null);
const postIds = computed(() => props.posts?.map((p) => p.id) ?? []);

function openPost(id: string) {
  router.push({ query: { ...route.query, post: id } });
}

function closePost() {
  if (window.history.state?.back) {
    router.back();
  } else {
    router.replace({ query: { ...route.query, post: undefined, comment: undefined } });
  }
}

const isDesktop = useMediaQuery("(min-width: 1920px)");
const isLaptop = useMediaQuery("(min-width: 1290px)");
const isTablet = useMediaQuery("(min-width: 1024px)");
const isVerticalTablet = useMediaQuery("(min-width: 768px)");
const isPhone = useMediaQuery("(min-width: 640px)");

const rowHeight = computed(() => {
  if (isDesktop.value) return 380;
  if (isLaptop.value) return 340;
  if (isTablet.value) return 280;
  if (isVerticalTablet.value) return 280;
  if (isPhone.value) return 240;
  return 200;
});

const minWidth = computed(() => {
  if (isDesktop.value) return 340;
  if (isLaptop.value) return 340;
  if (isTablet.value) return 260;
  if (isVerticalTablet.value) return 280;
  if (isPhone.value) return 220;
  return 200;
});

const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const TARGET_ROW_HEIGHT = rowHeight.value ?? 380;

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
  const isPhoneRow = computed(() => containerWidth.value <= 640);

  const gap = isPhoneRow.value ? 0 : 4;
  const rows: Row[] = [];
  let currentRow: { post: Post; aspectRatio: number }[] = [];
  let currentRowWidth = 0;
  const MIN_WIDTH = minWidth.value ?? 280;

  for (const post of props.posts ?? []) {
    const cover = post.coverImage;
    const naturalRatio = cover ? cover.width / cover.height : 1;

    // Never lay an item out narrower than MIN_WIDTH at the target height
    const aspectRatio = Math.max(naturalRatio, MIN_WIDTH / TARGET_ROW_HEIGHT);
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

const columnsPerRow = computed(() => {
  if (isLaptop.value) return 4;
  if (isTablet.value) return 3;
  if (isPhone.value) return 2;
  return 2;
});

function getSkeletonGrow(row: number, col: number): number {
  return skeletonWidths[row]?.[col] ?? 1;
}

const skeletonWidths: number[][] = [
  [1.4, 0.8, 1.1, 0.6, 1.3],
  [0.9, 1.5, 0.7, 1.2, 1.0],
  [1.1, 0.6, 1.4, 0.9, 1.3],
];

const imageLoaded = reactive<Record<string, boolean>>({});

function preloadImage(postId: string, url: string | undefined) {
  if (!url || imageLoaded[postId]) return;
  const img = new Image();
  img.onload = () => {
    imageLoaded[postId] = true;
  };
  img.src = url;
}

watch(
  rows,
  (newRows) => {
    for (const row of newRows) {
      for (const { post, width } of row) {
        preloadImage(post.id, thumb(post.coverImage?.imageUrl, width, TARGET_ROW_HEIGHT));
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <section class="flex-1 min-w-0 p-5 sm:px-0 sm:pt-4">
    <div ref="containerRef" class="w-full overflow-x-hidden">
      <template v-if="isLoadingPosts">
        <div
          v-for="(row, rowIndex) in 4"
          :key="rowIndex"
          class="flex gap-1 sm:gap-0.5 mb-1 sm:mb-0.5"
        >
          <Skeleton
            v-for="col in columnsPerRow"
            :key="col"
            class="min-w-0 bg-neutral-200 rounded-xl sm:first:rounded-tl-none sm:first:rounded-bl-none sm:last:rounded-tr-none sm:last:rounded-br-none"
            :style="{
              height: `${TARGET_ROW_HEIGHT || 200}px`,
              flexGrow: getSkeletonGrow(rowIndex, col - 1),
              flexBasis: 0,
            }"
          />
        </div>
      </template>

      <template v-else>
        <div
          v-for="(row, rowIndex) in rows"
          :key="rowIndex"
          class="flex gap-1 sm:gap-0.5 mb-1 sm:mb-0.5"
        >
          <div
            v-for="{ post, width } in row"
            :key="post.id"
            :data-post-id="post.id"
            class="relative overflow-hidden rounded-xl border border-neutral-300/80 sm:border-neutral-300/70 sm:first:border-l-0 sm:last:border-r-0 group select-none sm:rounded-lg sm:first:rounded-tl-none sm:first:rounded-bl-none sm:last:rounded-tr-none sm:last:rounded-br-none"
            :style="{ width: `${width}px`, height: `${TARGET_ROW_HEIGHT}px` }"
            @click="openPost(post.id)"
          >
            <!-- Placeholder holds space while image fetches -->
            <div
              v-if="!imageLoaded[post.id]"
              class="absolute inset-0 w-full h-full bg-neutral-200 animate-pulse"
            />

            <motion.img
              :src="thumb(post.coverImage?.imageUrl, width, TARGET_ROW_HEIGHT)"
              :alt="post.category.name"
              class="w-full h-full object-cover transition-transform duration-300"
              :initial="{ opacity: 0 }"
              :animate="{ opacity: imageLoaded[post.id] ? 1 : 0 }"
              :transition="{ type: 'tween', duration: 0.3, ease: 'easeOut' }"
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
              <div class="flex items-center gap-4 text-neutral-200">
                <div v-if="post.likeCount" class="flex items-center gap-1.5">
                  <Icon class="size-4.5" icon="ph:heart" />
                  <span class="text-sm">{{ post.likeCount }}</span>
                </div>
                <div v-if="post.commentCount" class="flex items-center gap-1.5">
                  <Icon class="size-4.5" icon="ph:chat-circle" />
                  <span class="text-sm">{{ post.commentCount }}</span>
                </div>
                <Icon
                  v-if="post.imageCount > 1"
                  icon="famicons:copy-outline"
                  class="drop-shadow text-lg"
                />
              </div>
            </div>

            <span
              v-if="post.description"
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 italic text-white/85 text-center px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-full sm:text-sm"
            >
              "{{ post.description }}"
            </span>
          </div>
        </div>
      </template>
    </div>

    <PostDetailModal
      :post-id="activePostId"
      :post-ids="postIds"
      @close="closePost"
      @navigate="router.replace({ query: { ...route.query, post: $event } })"
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
