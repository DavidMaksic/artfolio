<script setup lang="ts">
import { useQuery, keepPreviousData } from "@tanstack/vue-query";
import { computed } from "vue";
import { trpc } from "@/lib/trpc";

import PostImages from "@/components/post/PostImages.vue";
import PostSidebar from "@/components/post/PostSidebar.vue";

const props = defineProps<{
  postId: string;
  postIds: string[];
}>();

const emit = defineEmits<{
  close: [];
  navigate: [postId: string];
}>();

const { data: post, isPending } = useQuery({
  queryKey: computed(() => ["post", props.postId]),
  queryFn: () => trpc.post.getById.query({ id: props.postId }),
  placeholderData: keepPreviousData,
  staleTime: 1000 * 60 * 2, // 2 minutes
});
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex backdrop-blur-2xl bg-neutral-100/40"
      data-testid="post-modal"
    >
      <!-- Left 80% — blurred backdrop + images -->
      <PostImages
        :post
        :isPending
        :postId
        :postIds
        @close="emit('close')"
        @navigate="emit('navigate', $event)"
      />

      <!-- Right 20% — post details -->
      <PostSidebar :post :postId @close="emit('close')" />
    </div>
  </Teleport>
</template>
