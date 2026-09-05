<script setup lang="ts">
import type { PostDetail } from "@artfolio/shared";
import { computed, onMounted, onUnmounted } from "vue";
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
</script>

<template>
  <div
    class="relative flex-4 scrollbar-none"
    :class="
      post && post.images.length > 1
        ? 'overflow-y-auto'
        : 'overflow-hidden flex items-center justify-center'
    "
    @click.self="emit('close')"
  >
    <!-- Loading -->
    <div v-if="isPending" class="flex items-center justify-center h-full">
      <Icon icon="ph:spinner" class="animate-spin text-white text-4xl" />
    </div>

    <!-- Single image — centered -->
    <template v-else-if="post && post.images.length === 1">
      <div
        class="w-full h-full flex items-center justify-center px-10 py-6"
        @click.self="emit('close')"
      >
        <img
          :src="post.images[0]!.imageUrl"
          :alt="post.category.name"
          class="max-h-[90vh] w-auto max-w-full object-contain rounded-md shadow-2xl"
          @click.stop
        />
      </div>
    </template>

    <!-- Multiple images — scrollable column -->
    <template v-else-if="post">
      <div class="flex flex-col items-center gap-6 py-8 px-10" @click.self="emit('close')">
        <div
          v-for="image in post.images"
          :key="image.id"
          class="w-full flex justify-center"
          @click.self="emit('close')"
        >
          <img
            :src="image.imageUrl"
            :alt="post.category.name"
            class="max-h-[90vh] w-auto max-w-full object-contain rounded-md shadow-2xl"
            @click.stop
          />
        </div>
      </div>
    </template>

    <!-- Close button -->
    <button
      class="fixed left-4 top-8 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2 transition-colors z-10"
      aria-label="Close button"
      @click="emit('close')"
    >
      <Icon icon="ph:x" class="text-xl" />
    </button>

    <!-- Prev button -->
    <button
      v-if="hasPrev"
      class="fixed left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2.5 transition-colors z-10"
      aria-label="Previous post"
      @click="navigatePrev"
    >
      <Icon icon="ph:caret-left-bold" class="text-xl" />
    </button>

    <!-- Next button — sits just inside the left panel -->
    <button
      v-if="hasNext"
      class="fixed right-104 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full p-2.5 transition-colors z-10"
      aria-label="Next post"
      @click="navigateNext"
    >
      <Icon icon="ph:caret-right-bold" class="text-xl" />
    </button>
  </div>
</template>
