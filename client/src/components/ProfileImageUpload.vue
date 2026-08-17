<script setup lang="ts">
import { extractTrpcError } from "@/lib/trpc-error";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";
import { ref } from "vue";

const props = defineProps<{
  currentImageUrl?: string | null;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  uploaded: [url: string];
}>();

const preview = ref<string | null>(props.currentImageUrl ?? null);
const isUploading = ref(false);
const error = ref<string | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  // Local preview
  preview.value = URL.createObjectURL(file);
  isUploading.value = true;
  error.value = null;

  try {
    // 1. Get signed upload params from server
    const { signature, timestamp, folder, transformation, apiKey, cloudName } =
      await trpc.profile.getProfileImageUploadSignature.mutate();

    // 2. Upload directly to Cloudinary
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", signature);
    formData.append("folder", folder);
    formData.append("transformation", transformation);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Upload failed");

    const data = await response.json();

    // 3. Emit the secure URL to the parent
    emit("uploaded", data.secure_url);
  } catch (err) {
    error.value = extractTrpcError(err);
    preview.value = props.currentImageUrl ?? null;
  } finally {
    isUploading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-2.5">
    <button
      type="button"
      class="relative group size-28 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :disabled="disabled || isUploading"
      @click="fileInputRef?.click()"
    >
      <!-- Image / placeholder -->
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

      <!-- Overlay -->
      <div
        class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        :class="{ 'opacity-100': isUploading }"
      >
        <Icon v-if="isUploading" icon="ph:spinner" class="text-white text-2xl animate-spin" />
        <Icon v-else icon="ph:camera" class="text-white text-2xl" />
      </div>
    </button>

    <p class="text-xs text-muted-foreground">
      {{ isUploading ? "Uploading..." : "Click to upload a profile image" }}
    </p>

    <p v-if="error" role="alert" class="text-xs text-destructive flex items-center gap-1">
      <Icon icon="ph:warning-circle" />
      {{ error }}
    </p>

    <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileChange" />
  </div>
</template>
