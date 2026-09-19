import { ref, watch, type Ref } from "vue";
import { useMutation, useQueryClient } from "@tanstack/vue-query";
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

  const following = ref(source.value.userIsFollowing);

  watch(source, (s) => {
    following.value = s.userIsFollowing;
  });

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
      following.value = !following.value;
      onToggle?.(following.value);
      return { previous };
    },
    onError: (_, __, context) => {
      if (context) {
        following.value = context.previous;
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
