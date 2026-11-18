// feed.store.ts
import type { FeedItem } from "@artfolio/shared";
import { defineStore } from "pinia";
import { ref } from "vue";

type FeedItemWithMeta = FeedItem & { suggested: boolean };

export const useFeedStore = defineStore("feed", () => {
  const justCreatedPost = ref<FeedItemWithMeta | null>(null);

  // Created once per page load, survives SPA navigation, resets on reload
  const guestSeed = ref(crypto.randomUUID());

  function regenerateGuestSeed() {
    guestSeed.value = crypto.randomUUID();
  }

  function setJustCreatedPost(post: FeedItemWithMeta) {
    justCreatedPost.value = post;
  }

  function clearJustCreatedPost() {
    justCreatedPost.value = null;
  }

  return {
    justCreatedPost,
    guestSeed,
    regenerateGuestSeed,
    setJustCreatedPost,
    clearJustCreatedPost,
  };
});
