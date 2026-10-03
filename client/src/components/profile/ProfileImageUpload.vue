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

const MAX_SIZE = 512; // max width or height in pixels

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  img.onload = () => {
    URL.revokeObjectURL(objectUrl);

    // Calculate new dimensions
    let { width, height } = img;
    if (width > MAX_SIZE || height > MAX_SIZE) {
      if (width > height) {
        height = Math.round((height / width) * MAX_SIZE);
        width = MAX_SIZE;
      } else {
        width = Math.round((width / height) * MAX_SIZE);
        height = MAX_SIZE;
      }
    }

    // Draw onto canvas at reduced size
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;

        // Revoke old preview
        if (preview.value && preview.value !== props.currentImageUrl) {
          URL.revokeObjectURL(preview.value);
        }

        const resizedFile = new File([blob], file.name, { type: "image/webp" });
        preview.value = URL.createObjectURL(resizedFile);
        emit("fileSelected", resizedFile);
      },
      "image/webp",
      1,
    );
  };

  img.src = objectUrl;
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
        class="size-28 rounded-full bg-white flex items-center justify-center ring-2 ring-border"
      >
        <Icon icon="ph:user" class="text-5xl text-muted-foreground" />
      </div>

      <div
        class="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center opacity-0 backdrop-blur-xs group-hover:opacity-100 group-hover:saturate-80 transition-opacity"
      >
        <Icon icon="ph:camera" class="text-white text-4xl" />
      </div>
    </button>

    <p class="text-xs text-muted-foreground">Click to upload a profile image</p>

    <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
  </div>
</template>
