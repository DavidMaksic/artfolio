<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { ref } from "vue";

const props = defineProps<{
  currentImageUrl?: string | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  fileSelected: [file: File];
}>();

const preview = ref<string | null>(props.currentImageUrl ?? null);
const fileInputRef = ref<HTMLInputElement | null>(null);

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (preview.value && preview.value !== props.currentImageUrl) {
    URL.revokeObjectURL(preview.value);
  }

  preview.value = URL.createObjectURL(file);
  emit("fileSelected", file);
}
</script>

<template>
  <div class="flex flex-col items-center gap-2.5">
    <button
      type="button"
      class="relative group size-28 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :disabled="disabled"
      @click="fileInputRef?.click()"
    >
      <img
        v-if="preview"
        :src="preview"
        alt="Profile image"
        class="size-28 rounded-full object-cover ring-2 ring-border"
      />
      <div
        v-else
        class="size-28 rounded-full bg-muted flex items-center justify-center ring-2 ring-border"
      >
        <Icon icon="ph:user" class="text-4xl text-muted-foreground" />
      </div>

      <div
        class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Icon icon="ph:camera" class="text-white text-2xl" />
      </div>
    </button>

    <p class="text-xs text-muted-foreground">Click to upload a profile image</p>

    <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
  </div>
</template>
