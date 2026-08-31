<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useRoute, useRouter } from "vue-router";
import { usePostImageEdit } from "@/composables/usePostImageEdit";
import { extractTrpcError } from "@/lib/trpc-error";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import {
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
  Select,
} from "@/components/ui/select";
import {
  TagsInput,
  TagsInputItem,
  TagsInputInput,
  TagsInputItemText,
  TagsInputItemDelete,
} from "@/components/ui/tags-input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const postId = computed(() => route.params.id as string);

const {
  images,
  removedImageIds,
  isUploading,
  error: uploadError,
  initFromExisting,
  addImages,
  removeImage,
  reorderImages,
  uploadAndCollect,
} = usePostImageEdit();

const description = ref("");
const categoryId = ref("");
const tags = ref<string[]>([]);
const categories = ref<{ id: string; name: string; slug: string }[]>([]);
const submitError = ref<string | null>(null);
const isSubmitting = ref(false);
const dragFromIndex = ref<number | null>(null);

const {
  data: post,
  isPending,
  isError,
} = useQuery({
  queryKey: computed(() => ["post", postId.value]),
  queryFn: () => trpc.post.getById.query({ id: postId.value }),
});

// Pre-populate form once post loads
watch(
  post,
  (p) => {
    if (!p) return;
    description.value = p.description ?? "";
    categoryId.value = p.categoryId;
    tags.value = p.tags.map((t) => t.name);
    initFromExisting(p.images);
  },
  { immediate: true },
);

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

const gridClass = computed(() => {
  const count = images.value.length;
  if (count === 1) return "grid-single";
  if (count === 2) return "grid-two";
  if (count === 3) return "grid-three";
  return "grid-many";
});

// Preview URL — existing images use their Cloudinary URL, pending use the blob URL
function previewUrl(img: (typeof images.value)[number]) {
  return img.kind === "existing" ? img.imageUrl : img.preview;
}

const canSubmit = computed(
  () =>
    images.value.length > 0 && categoryId.value !== "" && !isUploading.value && !isSubmitting.value,
);

async function handleSubmit() {
  if (!canSubmit.value) return;
  isSubmitting.value = true;
  submitError.value = null;

  try {
    const finalImages = await uploadAndCollect();

    await trpc.post.update.mutate({
      id: postId.value,
      description: description.value.trim() || undefined,
      categoryId: categoryId.value,
      tags: tags.value,
      images: finalImages,
      removedImageIds: removedImageIds.value,
    });

    queryClient.invalidateQueries({ queryKey: ["post", postId.value] });
    const me = await trpc.profile.getMe.query();
    queryClient.invalidateQueries({ queryKey: ["posts", me.username] });

    router.push({ name: "profile", params: { username: me.username } });
  } catch (e) {
    submitError.value = extractTrpcError(e);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen pt-4 pb-20 flex flex-col bg-background gap-4 px-4 max-w-xl mx-auto">
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" @click="router.back()">
        <Icon icon="ph:arrow-left" class="size-5 mt-0.5" />
      </Button>
      <h1 class="text-xl font-bold">Edit Post</h1>
    </div>

    <div v-if="isPending" class="space-y-3">
      <div class="h-64 bg-muted rounded-2xl animate-pulse" />
      <div class="h-10 bg-muted rounded animate-pulse" />
    </div>

    <div v-else-if="isError" class="flex flex-col items-center gap-3 text-center py-24">
      <Icon icon="ph:image-broken" class="text-5xl text-muted-foreground" />
      <p class="text-lg font-semibold">Post not found</p>
      <Button variant="ghost" @click="router.back()">Go back</Button>
    </div>

    <Card v-else>
      <CardContent>
        <form class="space-y-5" @submit.prevent="handleSubmit">
          <!-- Image Upload -->
          <div class="space-y-2">
            <Label>Images <span class="text-destructive">*</span></Label>

            <div v-if="images.length > 0" :class="['image-grid', gridClass]">
              <div
                v-for="(image, index) in images"
                :key="image.kind === 'existing' ? image.id : image.preview"
                class="image-cell group"
                :class="{ 'image-cell--large': gridClass === 'grid-three' && index === 0 }"
                draggable="true"
                @dragstart="onDragStart(index)"
                @dragover="onDragOver($event, index)"
                @dragend="onDragEnd"
              >
                <img :src="previewUrl(image)" class="w-full h-full object-cover" />

                <div
                  class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center"
                >
                  <Icon
                    icon="ph:arrows-out-cardinal"
                    class="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                <button
                  type="button"
                  class="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 rounded-full p-1 transition z-10"
                  @click.stop="removeImage(index)"
                >
                  <Icon icon="ph:x-bold" class="text-white text-xs" />
                </button>
              </div>
            </div>

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
              {{ isSubmitting ? "Saving..." : "Save changes" }}
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
  max-height: 40rem;
}

.image-cell:active {
  cursor: grabbing;
}

.grid-three .image-cell--large {
  grid-row: 1 / 3;
}
</style>
