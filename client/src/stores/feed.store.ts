import type { QueryClient } from "@tanstack/vue-query";
import type { FeedItem } from "@artfolio/shared";

import { uploadImages, type UploadedImage } from "@/composables/usePostImageUpload";
import { extractTrpcError } from "@/lib/trpc-error";
import { defineStore } from "pinia";
import { trpc } from "@/lib/trpc";
import { ref } from "vue";

type FeedItemWithMeta = FeedItem & { suggested: boolean };

export interface PostDraft {
  files: { file: File; order: number }[];
  description: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  tags: string[];
}

interface PendingPost {
  status: "uploading" | "error";
  error: string | null;
  draft: PostDraft;
  // Kept so a retry after a failed create doesn't upload the images again
  uploaded: UploadedImage[] | null;
}

export const useFeedStore = defineStore("feed", () => {
  const justCreatedPost = ref<FeedItemWithMeta | null>(null);
  const guestSeed = ref(crypto.randomUUID());
  const pendingPost = ref<PendingPost | null>(null);

  function regenerateGuestSeed() {
    guestSeed.value = crypto.randomUUID();
  }

  function setJustCreatedPost(post: FeedItemWithMeta) {
    justCreatedPost.value = post;
  }

  function clearJustCreatedPost() {
    justCreatedPost.value = null;
  }

  async function runPost(queryClient: QueryClient) {
    const current = pendingPost.value;
    if (!current) return;
    pendingPost.value = { ...current, status: "uploading", error: null };
    const { draft } = current;

    try {
      // Fetched first so a failure here can't happen after the post exists
      const me = await trpc.profile.getMe.query();

      const uploaded = current.uploaded ?? (await uploadImages(draft.files));
      if (pendingPost.value) pendingPost.value.uploaded = uploaded;

      const { id } = await trpc.post.create.mutate({
        description: draft.description || undefined,
        categoryId: draft.categoryId,
        tags: draft.tags,
        images: uploaded,
      });

      justCreatedPost.value = {
        id,
        profileId: me.id,
        categoryId: draft.categoryId,
        createdAt: new Date(),
        coverImage: {
          id: crypto.randomUUID(),
          imageUrl: uploaded[0]!.imageUrl,
          publicId: uploaded[0]!.publicId,
          order: 0,
          width: uploaded[0]!.width,
          height: uploaded[0]!.height,
          createdAt: new Date(),
        },
        imageCount: uploaded.length,
        description: draft.description || null,
        category: draft.category,
        tags: draft.tags.map((name) => ({
          id: name,
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
        })),
        profile: {
          username: me.username,
          displayName: me.displayName,
          profileImageUrl: me.profileImageUrl ?? null,
          userIsFollowing: false,
        },
        likeCount: 0,
        bookmarkCount: 0,
        commentCount: 0,
        userHasLiked: false,
        userHasBookmarked: false,
        suggested: false,
      };
      pendingPost.value = null;

      queryClient.invalidateQueries({ queryKey: ["posts", me.username] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    } catch (e) {
      if (pendingPost.value) {
        pendingPost.value = { ...pendingPost.value, status: "error", error: extractTrpcError(e) };
      }
    }
  }

  function startPosting(draft: PostDraft, queryClient: QueryClient) {
    if (pendingPost.value) return;
    pendingPost.value = { status: "uploading", error: null, draft, uploaded: null };
    void runPost(queryClient);
  }

  function retryPosting(queryClient: QueryClient) {
    if (pendingPost.value?.status !== "error") return;
    void runPost(queryClient);
  }

  function discardPosting() {
    if (pendingPost.value?.status === "error") pendingPost.value = null;
  }

  return {
    justCreatedPost,
    guestSeed,
    pendingPost,
    regenerateGuestSeed,
    setJustCreatedPost,
    clearJustCreatedPost,
    startPosting,
    retryPosting,
    discardPosting,
  };
});
