<script setup lang="ts">
import type { PostDetail } from "@artfolio/shared";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { computed } from "vue";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const props = defineProps<{
  post: PostDetail | undefined;
  postId: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const auth = useAuthStore();
const queryClient = useQueryClient();

const { data: me } = useQuery({
  queryKey: ["me"],
  queryFn: () => trpc.profile.getMe.query(),
  enabled: computed(() => !!auth.user),
});

const isPostOwner = computed(
  () => !!me.value && !!props.post && me.value.username === props.post.profile.username,
);

const deleteMutation = useMutation({
  mutationFn: () => trpc.post.delete.mutate({ id: props.postId }),
  onSuccess: () => {
    if (me.value) queryClient.invalidateQueries({ queryKey: ["posts", me.value.username] });
    queryClient.invalidateQueries({ queryKey: ["post", props.postId] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    emit("close");
  },
});
</script>

<template>
  <aside class="flex-1 p-6 flex flex-col justify-between gap-3" @click="emit('close')">
    <!-- Post content -->
    <template v-if="post">
      <div
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
            ><Icon class="size-5" icon="ph:bookmark-simple" />Save</Button
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
                <Button variant="destructive" size="sm" :disabled="deleteMutation.isPending.value">
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
          <Badge class="py-1.5 px-3.5 text-xs border-neutral-200" variant="secondary">{{
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
    </template>

    <template v-else>
      <div class="flex-1 p-6 flex flex-col justify-between gap-3">
        <Skeleton class="h-72 rounded-2xl" />
        <Skeleton class="flex-1 rounded-2xl" />
        <Skeleton class="h-24 rounded-2xl" />
      </div>
    </template>
  </aside>
</template>
