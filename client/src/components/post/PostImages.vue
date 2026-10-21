<script setup lang="ts">
import type { PostDetail } from "@artfolio/shared";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { motion } from "motion-v";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  post: PostDetail | undefined;
  isPending: boolean;
  postId: string;
  postIds: string[];
}>();

const emit = defineEmits<{
  close: [];
  navigate: [postId: string];
}>();

// Navigation logic
const currentIndex = computed(() => props.postIds.indexOf(props.postId));
const hasPrev = computed(() => currentIndex.value > 0);
const hasNext = computed(() => currentIndex.value < props.postIds.length - 1);

function navigatePrev() {
  if (!hasPrev.value) return;
  emit("navigate", props.postIds[currentIndex.value - 1]!);
}

function navigateNext() {
  if (!hasNext.value) return;
  emit("navigate", props.postIds[currentIndex.value + 1]!);
}

// Lock body scroll
onMounted(() => (document.body.style.overflow = "hidden"));
onUnmounted(() => (document.body.style.overflow = ""));

// Keyboard navigation
function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
  if (e.key === "ArrowLeft") navigatePrev();
  if (e.key === "ArrowRight") navigateNext();
}

onMounted(() => window.addEventListener("keydown", handleKeydown));
onUnmounted(() => window.removeEventListener("keydown", handleKeydown));

const imageLoaded = ref(false);
const loadedImages = ref(new Set<string>());

// reset when the image source changes (e.g. switching posts)
watch(
  () => props.post?.images[0]?.imageUrl,
  () => {
    imageLoaded.value = false;
  },
);

function markLoaded(id: string) {
  loadedImages.value.add(id);
}

watch(
  () => props.post?.id,
  () => {
    loadedImages.value = new Set();
  },
);
</script>

<template>
  <section
    class="relative flex-4 scrollbar-none md:h-auto md:min-h-0 md:w-full md:flex-none"
    :class="
      post && post.images.length > 1
        ? 'overflow-y-auto'
        : 'overflow-hidden flex items-center justify-center'
    "
    @click.self="emit('close')"
  >
    <!-- Loading -->
    <div
      v-if="isPending"
      class="flex items-center justify-center h-full md:min-h-[45vh] xs:min-h-[55vh]"
    >
      <Icon icon="ph:spinner" class="animate-spin text-white text-5xl" />
    </div>

    <!-- Single image — centered -->
    <template v-else-if="post && post.images.length === 1">
      <div
        class="w-full h-full flex items-center justify-center px-18 py-6 md:p-0"
        @click.self="emit('close')"
      >
        <motion.img
          :src="post.images[0]!.imageUrl"
          :alt="post.category.name"
          :width="post.images[0]!.width"
          :height="post.images[0]!.height"
          :style="{ aspectRatio: `${post.images[0]!.width} / ${post.images[0]!.height}` }"
          class="max-h-[90vh] md:max-h-full w-auto max-w-full object-contain rounded-md md:rounded-none shadow-2xl md:shadow-none"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: imageLoaded ? 1 : 0 }"
          :transition="{ type: 'tween', duration: 0.1, ease: 'easeOut' }"
          @load="imageLoaded = true"
          @click.stop
        />
      </div>
    </template>

    <!-- Multiple images — scrollable column -->
    <template v-else-if="post">
      <div
        class="flex flex-col items-center gap-6 md:gap-0 py-8 px-18 md:p-0"
        @click.self="emit('close')"
      >
        <div
          v-for="image in post.images"
          :key="image.id"
          class="w-full flex justify-center md:border-t md:border-t-neutral-400/70 md:first:border-t-0"
          @click.self="emit('close')"
        >
          <motion.img
            :src="image.imageUrl"
            :alt="post.category.name"
            :width="image.width"
            :height="image.height"
            :style="{ aspectRatio: `${image.width} / ${image.height}` }"
            class="max-h-[90vh] w-auto max-w-full object-contain rounded-md md:rounded-none shadow-2xl md:shadow-none"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: loadedImages.has(image.id) ? 1 : 0 }"
            :transition="{ type: 'tween', duration: 0.1, ease: 'easeOut' }"
            @click.stop
            @load="markLoaded(image.id)"
          />
        </div>
      </div>
    </template>

    <!-- Close button -->
    <button
      class="absolute left-4 md:left-2 top-8 md:top-6 -translate-y-1/2 bg-neutral-800/20 hover:bg-black/30 text-white rounded-full p-2 md:p-1.5 transition-colors z-10 backdrop-blur-xl"
      aria-label="Close button"
      @click="emit('close')"
    >
      <Icon icon="ph:x" class="text-xl md:text-lg" />
    </button>

    <!-- Prev button -->
    <button
      v-if="hasPrev"
      class="absolute left-4 md:left-2 top-1/2 -translate-y-1/2 bg-neutral-800/20 hover:bg-black/30 text-white rounded-full p-2.5 md:p-2 transition-colors z-10 backdrop-blur-xl"
      aria-label="Previous post"
      @click="navigatePrev"
    >
      <Icon icon="ph:caret-left-bold" class="text-xl md:text-lg" />
    </button>

    <!-- Next button — sits just inside the left panel -->
    <button
      v-if="hasNext"
      class="absolute right-4 md:right-2 top-1/2 -translate-y-1/2 bg-neutral-800/20 hover:bg-black/30 text-white rounded-full p-2.5 md:p-2 transition-colors z-10 backdrop-blur-xl"
      aria-label="Next post"
      @click="navigateNext"
    >
      <Icon icon="ph:caret-right-bold" class="text-xl md:text-lg" />
    </button>
  </section>
</template>
