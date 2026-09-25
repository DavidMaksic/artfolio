<script setup lang="ts">
import type { PostDetail } from "@artfolio/shared";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/vue-query";
import { computed, ref, useTemplateRef, watch } from "vue";
import { useTextareaAutosize } from "@vueuse/core";
import { useRoute, useRouter } from "vue-router";
import { formatDistanceToNow } from "date-fns";
import { useEngagement } from "@/composables/useEngagement";
import { useAuthStore } from "@/stores/auth.store";
import { useFeedStore } from "@/stores/feed.store";
import { nextTick } from "vue";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

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
import { useFollow } from "@/composables/useFollow";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const props = defineProps<{
  post: PostDetail | undefined;
  postId: string;
  focusComment?: boolean;
  focusCommentId?: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const queryClient = useQueryClient();

// ── Auth ───────────────────────────────────────────

const { data: me } = useQuery({
  queryKey: ["me"],
  queryFn: () => trpc.profile.getMe.query(),
  enabled: computed(() => !!auth.user),
});

const isPostOwner = computed(
  () => !!me.value && !!props.post && me.value.username === props.post.profile.username,
);

// ── Engagement ───────────────────────────────────────────

const engagementSource = computed(() => ({
  id: props.postId,
  likeCount: props.post?.likeCount ?? 0,
  bookmarkCount: props.post?.bookmarkCount ?? 0,
  commentCount: props.post?.commentCount ?? 0,
  userHasLiked: props.post?.userHasLiked ?? false,
  userHasBookmarked: props.post?.userHasBookmarked ?? false,
}));

const { liked, bookmarked, toggleLike, toggleBookmark, isLikePending, isBookmarkPending } =
  useEngagement(engagementSource);

// Seed follow state from post detail on mount
watch(
  () => props.post,
  (post) => {
    if (!post?.profileId) return;
    const existing = queryClient.getQueryData(["follow", post.profileId]);
    if (!existing) {
      queryClient.setQueryData(["follow", post.profileId], {
        following: post.profile.userIsFollowing,
      });
    }
  },
  { immediate: true },
);

const followSource = computed(() => ({
  profileId: props.post?.profileId ?? "",
  userIsFollowing: props.post?.profile.userIsFollowing ?? false,
}));

const { following, toggleFollow, isFollowPending } = useFollow(followSource);

// ── Comments ───────────────────────────────────────────

const commentBody = defineModel<string>("commentBody", { default: "" });
const textarea = useTemplateRef<HTMLTextAreaElement>("textarea");

const editingBody = defineModel<string>("editingBody", { default: "" });
const editTextarea = useTemplateRef<HTMLTextAreaElement>("editTextarea");
const editingCommentId = ref<string | null>(null);

watch(
  () => props.focusComment,
  (val) => {
    if (val) nextTick(() => textarea.value?.focus());
  },
  { immediate: true },
);

useTextareaAutosize({
  element: textarea,
  input: commentBody,
  maxHeight: 345,
});

const {
  data: commentsData,
  isPending: isCommentsPending,
  fetchNextPage,
} = useInfiniteQuery({
  queryKey: computed(() => ["comments", props.postId]),
  queryFn: ({ pageParam }) =>
    trpc.engagement.getComments.query({
      postId: props.postId,
      limit: 20,
      cursor: pageParam,
    }),
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  initialPageParam: undefined as string | undefined,
});

// Fetch the focused comment if provided
const { data: focusedComment } = useQuery({
  queryKey: computed(() => ["comment", props.focusCommentId]),
  queryFn: () => trpc.engagement.getCommentById.query({ commentId: props.focusCommentId! }),
  enabled: computed(() => !!props.focusCommentId),
});

// Merge focused comment at the top, deduplicate rest
const comments = computed(() => {
  const pages = commentsData.value?.pages.flatMap((p) => p.items) ?? [];
  if (!focusedComment.value) return pages;
  const rest = pages.filter((c) => c.id !== focusedComment.value!.id);
  return [focusedComment.value, ...rest];
});

const nextCursor = computed(() => commentsData.value?.pages.at(-1)?.nextCursor ?? null);

const createCommentMutation = useMutation({
  mutationFn: () =>
    trpc.engagement.createComment.mutate({ postId: props.postId, body: commentBody.value }),
  onSuccess: () => {
    commentBody.value = "";
    queryClient.invalidateQueries({ queryKey: ["comments", props.postId] });
    queryClient.invalidateQueries({ queryKey: ["post", props.postId] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  },
});

const deleteCommentMutation = useMutation({
  mutationFn: (commentId: string) =>
    trpc.engagement.deleteComment.mutate({ commentId, postId: props.postId }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["comments", props.postId] });
    queryClient.invalidateQueries({ queryKey: ["post", props.postId] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  },
});

function canDeleteComment(commentUsername: string) {
  if (!me.value) return false;
  return me.value.username === commentUsername || isPostOwner.value;
}

function submitComment() {
  if (!commentBody.value.trim()) return;
  commentBody.value = commentBody.value.trim();
  createCommentMutation.mutate();
}

// ── Edit comment ───────────────────────────────────────────

function startEdit(comment: { id: string; body: string }) {
  editingCommentId.value = comment.id;
  editingBody.value = comment.body;
}

function cancelEdit() {
  editingCommentId.value = null;
  editingBody.value = "";
}

const updateCommentMutation = useMutation({
  mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
    trpc.engagement.updateComment.mutate({ commentId, body }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["comments", props.postId] });
    cancelEdit();
  },
});

// ── Delete post ───────────────────────────────────────────

const feedStore = useFeedStore();

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

function copyCommentLink(commentId: string) {
  const url = `${window.location.origin}${window.location.pathname}?post=${props.postId}&comment=${commentId}`;
  navigator.clipboard.writeText(url);
}
</script>

<template>
  <aside class="flex-1 py-6 pr-6 flex flex-col justify-between gap-3" @click="emit('close')">
    <template v-if="post">
      <!-- Post content -->
      <div
        class="p-6 flex flex-col gap-5 bg-background rounded-2xl border border-border shadow-2xl"
        @click.stop
      >
        <!-- Author -->
        <div class="flex justify-between">
          <div
            class="flex items-center gap-3 cursor-default group w-fit"
            @click="router.push({ name: 'profile', params: { username: post.profile.username } })"
          >
            <img
              v-if="post.profile.profileImageUrl"
              :src="post.profile.profileImageUrl"
              class="size-20 rounded-full object-cover ring-1 ring-border group-hover:opacity-80 transition-opacity"
            />
            <div v-else class="size-20 rounded-full bg-muted flex items-center justify-center">
              <Icon icon="ph:user" class="text-muted-foreground text-3xl" />
            </div>
            <div>
              <p class="text-xl font-semibold">
                {{ post.profile.displayName ?? post.profile.username }}
              </p>
              <p class="text-sm text-muted-foreground">@{{ post.profile.username }}</p>
            </div>
          </div>

          <!-- Post options -->
          <DropdownMenu>
            <DropdownMenuTrigger class="self-start">
              <Icon
                icon="ph:dots-three"
                class="text-4xl text-neutral-700 hover:bg-neutral-100 transition-colors p-1.5 rounded-md"
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
                    This action cannot be undone. The post and all its images will be permanently
                    removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    class="bg-destructive hover:bg-destructive/90"
                    @click="deletePostMutation.mutate()"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenu>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between gap-1.5">
          <Button
            v-if="!isPostOwner"
            class="flex-1 transition-colors"
            :class="
              following
                ? 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
                : 'bg-black/80 hover:bg-black/60 text-white'
            "
            :disabled="isFollowPending"
            @click="toggleFollow"
          >
            <Icon class="size-5" :icon="following ? 'ph:user-check' : 'ph:user-plus'" />
            {{ following ? "Following" : "Follow" }}
          </Button>

          <Button
            class="flex-1"
            variant="secondary"
            data-testid="like-button"
            :data-liked="liked"
            :disabled="isLikePending"
            @click="toggleLike"
          >
            <Icon
              class="size-5 transition-colors"
              :icon="liked ? 'ph:heart-fill' : 'ph:heart'"
              :class="liked ? 'text-red-500' : ''"
            />
            Like
          </Button>
          <Button
            class="flex-1"
            variant="outline"
            data-testid="bookmark-button"
            :data-bookmarked="bookmarked"
            :disabled="isBookmarkPending"
            @click="toggleBookmark"
          >
            <Icon
              class="size-5 transition-colors"
              :icon="bookmarked ? 'ph:bookmark-simple-fill' : 'ph:bookmark-simple'"
              :class="bookmarked ? 'text-blue-500' : ''"
            />
            Save
          </Button>
        </div>

        <!-- Description -->
        <p v-if="post.description" class="text-md text-neutral-800 leading-relaxed py-0.5">
          {{ post.description }}
        </p>
      </div>

      <!-- Comments -->
      <div
        class="flex flex-1 flex-col bg-background rounded-2xl border border-border shadow-2xl overflow-hidden z-10"
        @click.stop
      >
        <div class="flex flex-col flex-1 overflow-y-auto px-6 py-5 gap-4 scrollbar">
          <div class="font-semibold">
            Comments
            <span v-if="comments.length > 1" class="text-muted-foreground"
              >({{ comments.length }})</span
            >
          </div>

          <!-- Loading -->
          <div v-if="isCommentsPending" class="flex flex-col gap-3">
            <div v-for="i in 3" :key="i" class="flex items-start gap-2">
              <Skeleton class="size-8 rounded-full shrink-0" />
              <div class="flex flex-col gap-1.5 flex-1">
                <Skeleton class="h-3 w-24 rounded" />
                <Skeleton class="h-3 w-full rounded" />
              </div>
            </div>
          </div>

          <!-- Empty -->
          <p v-else-if="comments.length === 0" class="text-sm text-muted-foreground">
            No comments yet.
          </p>

          <!-- Comment list -->
          <div
            v-else
            class="flex flex-col divide-y divide-neutral-200/60 last:border-b last:border-b-neutral-200/60"
          >
            <div
              v-for="comment in comments"
              :key="comment.id"
              :data-comment-id="comment.id"
              class="space-y-2 py-4 first:pt-1.5"
            >
              <div class="flex items-center justify-between gap-1.5">
                <div class="flex items-center gap-1.5 cursor-default">
                  <div
                    class="flex items-center gap-2 group"
                    @click="
                      router.push({
                        name: 'profile',
                        params: { username: comment.profile.username },
                      })
                    "
                  >
                    <img
                      v-if="comment.profile.profileImageUrl"
                      :src="comment.profile.profileImageUrl"
                      class="size-8 rounded-full object-cover shrink-0 group-hover:opacity-80 transition-opacity"
                    />
                    <div
                      v-else
                      class="size-8 rounded-full bg-muted flex items-center justify-center shrink-0"
                    >
                      <Icon icon="ph:user" class="text-muted-foreground text-sm" />
                    </div>

                    <span class="text-sm font-semibold">
                      {{ comment.profile.displayName ?? comment.profile.username }}
                    </span>
                  </div>

                  <p class="text-xs text-muted-foreground">
                    <span class="mr-0.5">•</span>
                    {{ formatDistanceToNow(comment.createdAt, { addSuffix: false }) }}
                  </p>
                </div>

                <!-- Comment options -->
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Icon
                      icon="ph:dots-three"
                      class="text-4xl text-neutral-700 hover:bg-neutral-100 transition-colors p-1.5 rounded-md"
                    />
                  </DropdownMenuTrigger>
                  <AlertDialog>
                    <DropdownMenuContent align="end" class="rounded-lg w-36">
                      <DropdownMenuItem class="text-[0.92rem]" @click="copyCommentLink(comment.id)">
                        <Icon icon="ph:link" class="mr-2 text-sm" />
                        Copy link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="me?.username === comment.profile.username"
                        class="text-[0.92rem]"
                        @click="startEdit(comment)"
                      >
                        <Icon icon="ph:pencil-simple-line" class="mr-2 text-sm text-neutral-600" />
                        Edit
                      </DropdownMenuItem>
                      <AlertDialogTrigger
                        as-child
                        v-if="canDeleteComment(comment.profile.username)"
                      >
                        <DropdownMenuItem
                          class="text-destructive hover:text-destructive! hover:bg-red-50! text-[0.92rem]"
                        >
                          <Icon icon="ph:x" class="mr-2 text-sm" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
                        <AlertDialogDescription
                          >This action cannot be undone.</AlertDialogDescription
                        >
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          class="bg-destructive hover:bg-destructive/90"
                          @click="deleteCommentMutation.mutate(comment.id)"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenu>
              </div>

              <div class="flex flex-col flex-1 min-w-0">
                <!-- Editing state -->
                <div v-if="editingCommentId === comment.id" class="flex flex-col gap-1.5">
                  <textarea
                    ref="editTextarea"
                    v-model="editingBody"
                    maxlength="1000"
                    class="flex-1 min-h-33 resize-none text-sm bg-muted rounded-md px-3 py-2 outline-none w-full scrollbar"
                    @keydown.enter.exact.prevent="
                      updateCommentMutation.mutate({ commentId: comment.id, body: editingBody })
                    "
                    @keydown.shift.enter.exact="() => {}"
                    @keydown.escape="cancelEdit"
                  />
                  <div class="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" class="text-xs" @click="cancelEdit"
                      >Cancel</Button
                    >
                    <Button
                      size="sm"
                      class="text-xs"
                      :disabled="!editingBody.trim() || updateCommentMutation.isPending.value"
                      @click="
                        updateCommentMutation.mutate({ commentId: comment.id, body: editingBody })
                      "
                    >
                      Save
                    </Button>
                  </div>
                </div>

                <!-- Normal state -->
                <p v-else class="text-sm wrap-break-word whitespace-pre-wrap">{{ comment.body }}</p>
              </div>
            </div>

            <!-- Load more -->
            <button
              v-if="nextCursor"
              class="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
              @click="() => fetchNextPage()"
            >
              Load more comments
            </button>
          </div>
        </div>

        <!-- Comment input -->
        <div v-if="auth.isAuthenticated" class="border-t border-border p-4 flex items-center gap-2">
          <img
            v-if="me?.profileImageUrl"
            :src="me.profileImageUrl"
            class="self-start size-8 rounded-full object-cover shrink-0"
          />
          <div
            v-else
            class="size-8 rounded-full bg-muted flex items-center justify-center shrink-0"
          >
            <Icon icon="ph:user" class="text-muted-foreground text-sm" />
          </div>
          <textarea
            ref="textarea"
            v-model="commentBody"
            placeholder="Add a comment…"
            maxlength="1000"
            rows="1"
            class="flex-1 resize-none text-sm bg-transparent outline-none placeholder:text-muted-foreground textarea-scrollbar pr-1"
            @keydown.enter.exact.prevent="submitComment"
            @keydown.shift.enter.exact="() => {}"
          />
          <Button
            variant="ghost"
            class="self-start text-sm font-semibold text-neutral-800 transition-colors disabled:opacity-40 px-3"
            :disabled="!commentBody.trim() || createCommentMutation.isPending.value"
            @click="submitComment"
          >
            <Icon
              v-if="createCommentMutation.isPending.value"
              icon="ph:spinner"
              class="animate-spin"
            />
            <span v-else>Post</span>
          </Button>
        </div>

        <div
          v-else
          class="border-t border-border p-4 text-sm text-muted-foreground text-center hover:text-foreground"
          @click="router.push({ name: 'sign-in' })"
        >
          <span class="cursor-default transition-colors"> Sign in to comment </span>
        </div>
      </div>

      <!-- Category + tags -->
      <div
        class="flex flex-col gap-1.5 bg-background rounded-2xl border border-border px-6 py-5 space-y-3 shadow-2xl z-10"
        @click.stop
      >
        <p class="font-semibold">Category <span v-if="post.tags.length">and Tags</span></p>
        <div class="flex flex-wrap gap-1.5">
          <Badge
            class="py-1.5 px-3.5 text-xs border-neutral-200 cursor-default hover:border-neutral-400/80 transition-[border-color]"
            variant="secondary"
            @click="
              () => {
                if (route.name === 'explore') emit('close');
                router.push({ name: 'explore', query: { q: post?.category.name } });
              }
            "
          >
            {{ post.category.name }}
          </Badge>
          <Badge
            v-for="tag in post.tags"
            :key="tag.id"
            class="py-1.5 px-3.5 text-xs cursor-default hover:border-neutral-400/80 transition-[border-color]"
            variant="outline"
            @click="
              () => {
                if (route.name === 'explore') emit('close');
                router.push({ name: 'explore', query: { q: tag.name } });
              }
            "
          >
            {{ tag.name }}
          </Badge>
        </div>
      </div>
    </template>

    <!-- Skeleton -->
    <template v-else>
      <div class="flex-1 p-6 flex flex-col justify-between gap-3">
        <Skeleton class="h-72 rounded-2xl" />
        <Skeleton class="flex-1 rounded-2xl" />
        <Skeleton class="h-24 rounded-2xl" />
      </div>
    </template>
  </aside>
</template>
