<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth.store";
import { useFeedStore } from "@/stores/feed.store";
import { useRouter } from "vue-router";
import { computed } from "vue";
import { trpc } from "@/lib/trpc";
import { Icon } from "@iconify/vue";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const props = defineProps<{
  postId: string;
  isPostOwner: boolean;
  iconStyle?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const router = useRouter();
const queryClient = useQueryClient();

const feedStore = useFeedStore();
const auth = useAuthStore();
const me = computed(() => auth.me);

const deletePostMutation = useMutation({
  mutationFn: () => trpc.post.delete.mutate({ id: props.postId }),
  onSuccess: () => {
    if (me.value) queryClient.invalidateQueries({ queryKey: ["posts", me.value.username] });
    queryClient.invalidateQueries({ queryKey: ["post", props.postId] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    feedStore.clearJustCreatedPost();
    emit("close");
  },
});

function copyPostLink() {
  const url = `${window.location.origin}${window.location.pathname}?post=${props.postId}`;
  navigator.clipboard.writeText(url);
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger class="self-start">
      <Icon
        icon="ph:dots-three"
        :class="
          cn(
            'text-4xl text-neutral-700 hover:bg-neutral-100 transition-colors p-1.5 rounded-md',
            props.iconStyle,
          )
        "
      />
    </DropdownMenuTrigger>
    <AlertDialog>
      <DropdownMenuContent align="end" class="rounded-lg w-36">
        <DropdownMenuItem class="text-[0.92rem]" @click="copyPostLink">
          <Icon icon="ph:link" class="mr-2 text-sm" />
          Copy link
        </DropdownMenuItem>
        <template v-if="isPostOwner">
          <DropdownMenuItem
            class="text-[0.92rem]"
            @click="router.push({ name: 'post-edit', params: { id: postId } })"
          >
            <Icon icon="ph:pencil-simple-line" class="mr-2 text-sm text-neutral-600" />
            Edit
          </DropdownMenuItem>
          <AlertDialogTrigger as-child>
            <DropdownMenuItem
              class="text-destructive hover:text-destructive! hover:bg-red-50! text-[0.92rem]"
            >
              <Icon icon="ph:x" class="mr-2 text-sm" />
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </template>
      </DropdownMenuContent>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this post?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The post and all its images will be permanently removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            class="from-red-700/70 to-red-700/70 hover:from-red-700/80 hover:to-red-700/80"
            @click="deletePostMutation.mutate()"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </DropdownMenu>
</template>
