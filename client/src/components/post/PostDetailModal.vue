<script setup lang="ts">
import { AnimatePresence, motion } from "motion-v";
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { trpc } from "@/lib/trpc";

import PostSidebar from "@/components/post/PostSidebar.vue";
import PostImages from "@/components/post/PostImages.vue";

const props = defineProps<{
  postId: string | null;
  postIds: string[];
  focusComment?: boolean;
  focusCommentId?: string;
}>();

const emit = defineEmits<{
  close: [];
  navigate: [postId: string];
}>();

const commentBody = defineModel<string>("commentBody", { default: "" });

const { data: post, isPending } = useQuery({
  queryKey: computed(() => ["post", props.postId]),
  queryFn: () => trpc.post.getById.query({ id: props.postId! }),
  enabled: computed(() => !!props.postId),
  staleTime: 1000 * 60 * 2, // 2 minutes
});
</script>

<template>
  <Teleport to="body">
    <AnimatePresence mode="wait">
      <motion.div
        v-if="postId"
        key="post-detail-modal"
        class="fixed inset-0 z-50 grid grid-cols-[3.76fr_1fr] 2xl:grid-cols-[3fr_1fr] xl:grid-cols-[2fr_1fr] md:flex md:flex-col md:overflow-y-auto backdrop-blur-2xl bg-neutral-100/40 sm:bg-neutral-200/90"
        data-testid="post-modal"
        :initial="{ opacity: 0 }"
        :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }"
        :transition="{ type: 'tween', duration: 0.1, ease: 'easeOut' }"
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
        <PostSidebar
          :post
          :postId
          :focus-comment
          :focus-comment-id="focusCommentId"
          v-model:comment-body="commentBody"
          @close="emit('close')"
        />
      </motion.div>
    </AnimatePresence>
  </Teleport>
</template>
