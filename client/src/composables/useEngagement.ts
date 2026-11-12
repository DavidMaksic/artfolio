import { ref, watch, type Ref } from "vue";
import { useMutation, useQueryClient, type InfiniteData } from "@tanstack/vue-query";
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

  // Update query cache when liking a post
  type PostLike = { id: string; userHasLiked: boolean; likeCount: number };
  type Cache = InfiniteData<{ items: PostLike[] }> | { items: PostLike[] } | PostLike[];

  function setLikeInCache(liked: boolean, likeCount: number) {
    const id = source.value.id;
    const patch = <T extends PostLike>(p: T): T =>
      p.id === id ? { ...p, userHasLiked: liked, likeCount } : p;

    queryClient.setQueriesData<Cache>(
      { predicate: (q) => ["feed", "explore", "posts"].includes(q.queryKey[0] as string) },
      (old) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.map(patch);
        if ("pages" in old) {
          return {
            ...old,
            pages: old.pages.map((pg) => ({ ...pg, items: pg.items.map(patch) })),
          };
        }
        return { ...old, items: old.items.map(patch) };
      },
    );
  }

  const likeMutation = useMutation({
    mutationFn: () => trpc.engagement.toggleLike.mutate({ postId: source.value.id }),
    onMutate: () => {
      const previousLiked = liked.value;
      const previousLikeCount = likeCount.value;
      liked.value = !liked.value;
      likeCount.value += liked.value ? 1 : -1;
      setLikeInCache(liked.value, likeCount.value);
      return { previousLiked, previousLikeCount };
    },
    onError: (_, __, context) => {
      if (context) {
        liked.value = context.previousLiked;
        likeCount.value = context.previousLikeCount;
        setLikeInCache(context.previousLiked, context.previousLikeCount);
      }
    },
    onSettled: () => {
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
      queryClient.invalidateQueries({ queryKey: ["post", source.value.id] });
    },
  });

  function toggleLike() {
    if (!requireAuth()) return;
    if (likeMutation.isPending.value) return;
    likeMutation.mutate();
  }

  function toggleBookmark() {
    if (!requireAuth()) return;
    if (bookmarkMutation.isPending.value) return;
    bookmarkMutation.mutate();
  }

  // Sync local state when server data refreshes after invalidation
  watch(source, (post) => {
    if (likeMutation.isPending.value || bookmarkMutation.isPending.value) return;

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

  return {
    liked,
    bookmarked,
    likeCount,
    bookmarkCount,
    toggleLike,
    toggleBookmark,
  };
}
