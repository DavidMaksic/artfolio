import type { FeedItem } from "@artfolio/shared";
import { defineStore } from "pinia";
import { ref } from "vue";

type FeedItemWithMeta = FeedItem & { suggested: boolean };

export const useFeedStore = defineStore("feed", () => {
  const justCreatedPost = ref<FeedItemWithMeta | null>(null);

  function setJustCreatedPost(post: FeedItemWithMeta) {
    justCreatedPost.value = post;
  }

  function clearJustCreatedPost() {
    justCreatedPost.value = null;
  }

  return {
    justCreatedPost,
    setJustCreatedPost,
    clearJustCreatedPost,
  };
});
