<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { usePostImageUpload } from "@/composables/usePostImageUpload";
import { extractTrpcError } from "@/lib/trpc-error";
import { useQueryClient } from "@tanstack/vue-query";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TagsInput,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
} from "@/components/ui/tags-input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const router = useRouter();
const queryClient = useQueryClient();

const {
  images,
  isUploading,
  error: uploadError,
  addImages,
  removeImage,
  reorderImages,
  uploadAll,
} = usePostImageUpload();

const description = ref("");
const categoryId = ref("");
const tags = ref<string[]>([]);
const isSubmitting = ref(false);
const submitError = ref<string | null>(null);
const categories = ref<{ id: string; name: string; slug: string }[]>([]);

const dragFromIndex = ref<number | null>(null);

onMounted(async () => {
  categories.value = await trpc.post.getCategories.query();
});

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files) return;
  addImages(Array.from(input.files));
  input.value = "";
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
  addImages(files);
}

function onDragStart(index: number) {
  dragFromIndex.value = index;
}

function onDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  if (dragFromIndex.value === null || dragFromIndex.value === index) return;
  reorderImages(dragFromIndex.value, index);
  dragFromIndex.value = index;
}

function onDragEnd() {
  dragFromIndex.value = null;
}

// Grid layout based on image count
const gridClass = computed(() => {
  const count = images.value.length;
  if (count === 1) return "grid-single";
  if (count === 2) return "grid-two";
  if (count === 3) return "grid-three";
  return "grid-many";
});

const canSubmit = computed(
  () =>
    images.value.length > 0 && categoryId.value !== "" && !isUploading.value && !isSubmitting.value,
);

async function handleSubmit() {
  if (!canSubmit.value) return;
  isSubmitting.value = true;
  submitError.value = null;

  try {
    const uploaded = await uploadAll();

    await trpc.post.create.mutate({
      description: description.value.trim() || undefined,
      categoryId: categoryId.value,
      tags: tags.value,
      images: uploaded,
    });

    const me = await trpc.profile.getMe.query();
    queryClient.removeQueries({ queryKey: ["posts", me.username] });
    router.push({ name: "profile", params: { username: me.username } });
  } catch (e) {
    submitError.value = extractTrpcError(e);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen py-10 flex flex-col bg-background gap-4 px-4 max-w-xl mx-auto">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" @click="router.back()">
        <Icon icon="ph:arrow-left" class="size-5 mt-0.5" />
      </Button>
      <h1 class="text-xl font-bold">New Post</h1>
    </div>

    <Card>
      <CardContent>
        <form class="space-y-5" @submit.prevent="handleSubmit">
          <!-- Image Upload -->
          <div class="space-y-2">
            <Label>Images <span class="text-destructive">*</span></Label>

            <!-- Grid -->
            <div v-if="images.length > 0" :class="['image-grid', gridClass]">
              <div
                v-for="(image, index) in images"
                :key="image.preview"
                class="image-cell group"
                :class="{ 'image-cell--large': gridClass === 'grid-three' && index === 0 }"
                draggable="true"
                @dragstart="onDragStart(index)"
                @dragover="onDragOver($event, index)"
                @dragend="onDragEnd"
              >
                <img :src="image.preview" class="w-full h-full object-cover" />

                <!-- Hover overlay -->
                <div
                  class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center"
                >
                  <Icon
                    icon="ph:arrows-out-cardinal"
                    class="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                <!-- Remove button -->
                <button
                  type="button"
                  class="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 rounded-full p-1 transition z-10"
                  @click.stop="removeImage(index)"
                >
                  <Icon icon="ph:x-bold" class="text-white text-xs" />
                </button>
              </div>
            </div>

            <!-- Drop zone (always visible, compact when images exist) -->
            <div
              :class="[
                'border-2 border-dashed rounded-lg text-center cursor-pointer transition hover:border-muted-foreground',
                images.length > 0 ? 'py-3' : 'py-8',
              ]"
              @drop="handleDrop"
              @dragover.prevent
              @click="($refs.fileInput as HTMLInputElement).click()"
            >
              <Icon
                icon="ph:image-square-duotone"
                :class="[
                  'mx-auto text-muted-foreground mb-1',
                  images.length > 0 ? 'text-2xl' : 'text-4xl',
                ]"
              />
              <p class="text-sm text-muted-foreground">
                {{ images.length > 0 ? "Add more images" : "Drag and drop or click to upload" }}
              </p>
              <p v-if="images.length === 0" class="text-xs text-muted-foreground mt-1">
                Up to 10 images
              </p>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleFileChange"
              />
            </div>

            <p
              v-if="uploadError"
              role="alert"
              class="text-sm text-destructive flex items-center gap-1.5"
            >
              <Icon icon="ph:warning-circle" />
              {{ uploadError }}
            </p>
          </div>

          <!-- Description -->
          <div class="space-y-1.5">
            <Label for="description">Description</Label>
            <Textarea
              id="description"
              v-model="description"
              placeholder="Tell people about this work..."
              :disabled="isUploading || isSubmitting"
              rows="4"
            />
            <p class="text-xs text-muted-foreground text-right">{{ description.length }} / 2000</p>
          </div>

          <!-- Category -->
          <div class="space-y-1.5">
            <Label for="category">Category <span class="text-destructive">*</span></Label>
            <Select v-model="categoryId" :disabled="isUploading || isSubmitting">
              <SelectTrigger id="category" class="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem v-for="cat in categories" :key="cat.id" :value="String(cat.id)">
                  {{ cat.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- Tags -->
          <div class="space-y-1.5">
            <Label>Tags</Label>
            <TagsInput v-model="tags" :disabled="isUploading || isSubmitting">
              <TagsInputItem v-for="tag in tags" :key="tag" :value="tag">
                <TagsInputItemText />
                <TagsInputItemDelete />
              </TagsInputItem>
              <TagsInputInput
                placeholder="Add a tag..."
                @keydown="
                  (e: KeyboardEvent) => {
                    if (tags.length >= 10) e.preventDefault();
                  }
                "
              />
            </TagsInput>
            <p class="text-xs text-muted-foreground">
              Press Enter or comma to add · {{ tags.length }}/10
            </p>
          </div>

          <p
            v-if="submitError"
            role="alert"
            class="text-sm text-destructive flex items-center gap-1.5"
          >
            <Icon icon="ph:warning-circle" />
            {{ submitError }}
          </p>

          <div class="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              class="flex-1"
              :disabled="isUploading || isSubmitting"
              @click="router.back()"
            >
              Cancel
            </Button>
            <Button type="submit" class="flex-1" :disabled="!canSubmit">
              <Icon v-if="isSubmitting" icon="ph:spinner" class="animate-spin mr-2" />
              {{ isSubmitting ? "Publishing..." : "Publish" }}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>

<style scoped>
.image-grid {
  display: grid;
  overflow: hidden;
  gap: 4px;
}

.grid-single {
  grid-template-columns: 1fr;
}

.grid-two {
  grid-template-columns: 1fr 1fr;
  aspect-ratio: 3 / 2;
}

.grid-three {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  aspect-ratio: 3 / 2;
}

.grid-many {
  grid-template-columns: 1fr 1fr;
}

.grid-many .image-cell {
  aspect-ratio: 1 / 1;
}

.image-cell {
  position: relative;
  overflow: hidden;
  cursor: grab;
  border: 1px solid var(--color-neutral-200);
  border-radius: 12px;
}

.image-cell:active {
  cursor: grabbing;
}

.grid-three .image-cell--large {
  grid-row: 1 / 3;
}
</style>
