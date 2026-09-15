import { ref, watch, type Ref } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";

interface EngagementSource {
  id: string;
  likeCount: number;
  bookmarkCount: number;
  userHasLiked: boolean;
  userHasBookmarked: boolean;
}

export function useEngagement(source: Ref<EngagementSource>) {
  const auth = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  const liked = ref(source.value.userHasLiked);
  const bookmarked = ref(source.value.userHasBookmarked);
  const likeCount = ref(source.value.likeCount);
  const bookmarkCount = ref(source.value.bookmarkCount);

  // Sync local state when server data refreshes after invalidation
  watch(source, (post) => {
    liked.value = post.userHasLiked;
    bookmarked.value = post.userHasBookmarked;
    likeCount.value = post.likeCount;
    bookmarkCount.value = post.bookmarkCount;
  });

  function requireAuth(): boolean {
    if (!auth.isAuthenticated) {
      router.push({ name: "sign-in" });
      return false;
    }
    return true;
  }

  const likeMutation = useMutation({
    mutationFn: () => trpc.engagement.toggleLike.mutate({ postId: source.value.id }),
    onMutate: () => {
      const previousLiked = liked.value;
      const previousLikeCount = likeCount.value;
      liked.value = !liked.value;
      likeCount.value += liked.value ? 1 : -1;
      return { previousLiked, previousLikeCount };
    },
    onError: (_, __, context) => {
      if (context) {
        liked.value = context.previousLiked;
        likeCount.value = context.previousLikeCount;
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", source.value.id] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => trpc.engagement.toggleBookmark.mutate({ postId: source.value.id }),
    onMutate: () => {
      const previousBookmarked = bookmarked.value;
      const previousBookmarkCount = bookmarkCount.value;
      bookmarked.value = !bookmarked.value;
      bookmarkCount.value += bookmarked.value ? 1 : -1;
      return { previousBookmarked, previousBookmarkCount };
    },
    onError: (_, __, context) => {
      if (context) {
        bookmarked.value = context.previousBookmarked;
        bookmarkCount.value = context.previousBookmarkCount;
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["post", source.value.id] });
    },
  });

  function toggleLike() {
    if (!requireAuth()) return;
    likeMutation.mutate();
  }

  function toggleBookmark() {
    if (!requireAuth()) return;
    bookmarkMutation.mutate();
  }

  return {
    liked,
    bookmarked,
    likeCount,
    bookmarkCount,
    toggleLike,
    toggleBookmark,
    isLikePending: likeMutation.isPending,
    isBookmarkPending: bookmarkMutation.isPending,
  };
}
