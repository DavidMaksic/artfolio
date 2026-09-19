import { computed, ref, watch, type Ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { trpc } from "@/lib/trpc";

interface FollowSource {
  profileId: string;
  userIsFollowing: boolean;
}

export function useFollow(source: Ref<FollowSource>, onToggle?: (following: boolean) => void) {
  const auth = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Dedicated follow state query — seeded from feed item, kept fresh independently
  const { data: followState } = useQuery({
    queryKey: computed(() => ["follow", source.value.profileId]),
    queryFn: () => trpc.follow.getFollowState.query({ profileId: source.value.profileId }),
    initialData: { following: source.value.userIsFollowing },
    enabled: false,
  });

  const following = ref(source.value.userIsFollowing);

  watch(
    followState,
    (state) => {
      if (state) following.value = state.following;
    },
    { immediate: true },
  );

  function requireAuth(): boolean {
    if (!auth.isAuthenticated) {
      router.push({ name: "sign-in" });
      return false;
    }
    return true;
  }

  const followMutation = useMutation({
    mutationFn: () => trpc.follow.toggleFollow.mutate({ followingId: source.value.profileId }),
    onMutate: () => {
      const previous = following.value;
      const next = !previous;

      // Update the single source of truth
      queryClient.setQueryData(["follow", source.value.profileId], { following: next });
      onToggle?.(next);

      return { previous };
    },
    onError: (_, __, context) => {
      if (context) {
        queryClient.setQueryData(["follow", source.value.profileId], {
          following: context.previous,
        });
        onToggle?.(context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["post"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  function toggleFollow() {
    if (!requireAuth()) return;
    followMutation.mutate();
  }

  return {
    following,
    toggleFollow,
    isFollowPending: followMutation.isPending,
  };
}
