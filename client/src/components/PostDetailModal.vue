<script setup lang="ts">
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const props = defineProps<{
  postId: string;
  postIds: string[];
}>();

const emit = defineEmits<{
  close: [];
  navigate: [postId: string];
}>();

const router = useRouter();
const auth = useAuthStore();
const queryClient = useQueryClient();

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

const { data: post, isPending } = useQuery({
  queryKey: computed(() => ["post", props.postId]),
  queryFn: () => trpc.post.getById.query({ id: props.postId }),
  staleTime: 1000 * 60 * 2, // 2 minutes
});

const { data: me } = useQuery({
  queryKey: ["me"],
  queryFn: () => trpc.profile.getMe.query(),
  enabled: computed(() => !!auth.user),
});

const isPostOwner = computed(
  () => !!me.value && !!post.value && me.value.username === post.value.profile.username,
);

const deleteMutation = useMutation({
  mutationFn: () => trpc.post.delete.mutate({ id: props.postId }),
  onSuccess: () => {
    if (me.value) queryClient.invalidateQueries({ queryKey: ["posts", me.value.username] });
    queryClient.invalidateQueries({ queryKey: ["post", props.postId] });
    emit("close");
  },
});
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex backdrop-blur-2xl bg-neutral-100/40"
      data-testid="post-modal"
    >
      <!-- Left 80% — blurred backdrop + images -->
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

      <!-- Right 20% — post details -->
      <div class="flex-1 p-6 flex flex-col justify-between gap-3" @click="emit('close')">
        <!-- Post content -->
        <div
          v-if="post"
          class="p-6 flex flex-col gap-5 bg-background rounded-2xl border border-border shadow-2xl"
          @click.stop
        >
          <!-- Author -->
          <div
            class="flex items-center gap-3 cursor-pointer group w-fit"
            @click="
              router.push({ name: 'profile', params: { username: post.profile.username } });
              emit('close');
            "
          >
            <img
              v-if="post.profile.profileImageUrl"
              :src="post.profile.profileImageUrl"
              class="size-20 rounded-full object-cover ring-1 ring-border"
            />
            <div v-else class="size-20 rounded-full bg-muted flex items-center justify-center">
              <Icon icon="ph:user" class="text-muted-foreground" />
            </div>
            <div>
              <p class="text-xl font-semibold group-hover:text-neutral-500 transition-colors">
                {{ post.profile.displayName ?? post.profile.username }}
              </p>
              <p class="text-sm text-muted-foreground">@{{ post.profile.username }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between gap-1.5">
            <Button class="bg-black/80 hover:bg-black/60 text-white flex-1">
              <Icon class="size-5" icon="ph:user-plus" />Follow</Button
            >
            <Button class="flex-1" variant="secondary"
              ><Icon class="size-5" icon="ph:heart" />Like</Button
            >
            <Button class="flex-1" variant="outline"
              ><Icon class="size-5" icon="ph:bookmark-simple-fill" />Save</Button
            >
          </div>

          <!-- Description -->
          <p
            v-if="post.description"
            class="text-md text-neutral-800 leading-relaxed py-4 border-t border-b border-border"
          >
            {{ post.description }}
          </p>

          <!-- Misc -->
          <div class="space-x-5 text-md text-neutral-600 leading-relaxed">
            <span><span class="font-bold">23</span> likes</span>
            <span><span class="font-bold">4</span> comments</span>
            <span></span>
          </div>

          <!-- Panel header -->
          <div class="flex items-center justify-end shrink-0">
            <div v-if="isPostOwner" class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label="Edit button"
                @click="router.push({ name: 'post-edit', params: { id: postId } })"
              >
                <Icon icon="ph:pencil-simple" class="mr-1" />
                Edit
              </Button>

              <AlertDialog>
                <AlertDialogTrigger as-child>
                  <Button
                    variant="destructive"
                    size="sm"
                    :disabled="deleteMutation.isPending.value"
                  >
                    <Icon
                      v-if="deleteMutation.isPending.value"
                      icon="ph:spinner"
                      class="animate-spin mr-1"
                    />
                    <Icon v-else icon="ph:trash" class="mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The post and all its images will be permanently
                      removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      class="bg-destructive hover:bg-destructive/90"
                      @click="deleteMutation.mutate()"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        <!-- Comments -->
        <div
          class="flex flex-1 flex-col gap-1.5 bg-background rounded-2xl border border-border p-6 space-y-3 shadow-2xl"
          @click.stop
        >
          <span class="font-semibold">Comments</span>
        </div>

        <!-- Category + tags -->
        <div
          v-if="post"
          class="flex flex-col gap-1.5 bg-background rounded-2xl border border-border p-6 space-y-3 shadow-2xl"
          @click.stop
        >
          <p class="font-semibold">Category <span v-if="post.tags">and Tags</span></p>
          <div class="flex flex-wrap gap-1.5">
            <Badge class="py-1.5 px-3.5 text-xs bg-neutral-200" variant="secondary">{{
              post.category.name
            }}</Badge>
            <Badge
              class="py-1.5 px-3.5 text-xs"
              v-for="tag in post.tags"
              :key="tag.id"
              variant="outline"
            >
              {{ tag.name }}
            </Badge>
          </div>
        </div>

        <!-- Loading shimmer for right panel -->
        <div v-if="isPending" class="p-4 flex flex-col gap-4">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-full bg-muted animate-pulse" />
            <div class="space-y-1.5">
              <div class="h-3 w-24 bg-muted rounded animate-pulse" />
              <div class="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div class="h-16 bg-muted rounded animate-pulse" />
          <div class="flex gap-1.5">
            <div class="h-6 w-20 bg-muted rounded-full animate-pulse" />
            <div class="h-6 w-14 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
