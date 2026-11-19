<script setup lang="ts">
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { useIntervalFn, useTimeoutFn } from "@vueuse/core";
import { Spinner } from "@/components/ui/spinner";
import { motion } from "motion-v";
import { ref } from "vue";

const MESSAGES = [
  "Posting",
  "Uploading your images",
  "Processing",
  "Almost there",
  "Just a moment more",
];

const INTERVAL_MS = 6000;
const EXIT_MS = 200;

const index = ref(0);
const leaving = ref(false);

// Runs once the old text has faded out: swap the message and fade the new one in
const { start: startSwap } = useTimeoutFn(
  () => {
    index.value = (index.value + 1) % MESSAGES.length;
    leaving.value = false;
  },
  EXIT_MS,
  { immediate: false },
);

useIntervalFn(() => {
  leaving.value = true;
  startSwap();
}, INTERVAL_MS);
</script>

<template>
  <Marker variant="separator" role="status" class="my-12.5 md:my-6 sm:px-4">
    <MarkerIcon>
      <motion.span
        class="flex"
        layout="position"
        :layout-dependency="index"
        :transition="{ duration: 0.2, ease: 'easeOut' }"
      >
        <Spinner />
      </motion.span>
    </MarkerIcon>

    <MarkerContent>
      <motion.span
        :key="index"
        class="shimmer shimmer-spread-18 shimmer-color-[#d6adee] shimmer-duration-1500 inline-block"
        :initial="{ opacity: 0, y: 6 }"
        :animate="leaving ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }"
        :transition="{ duration: 0.2, ease: 'easeOut' }"
      >
        {{ MESSAGES[index] }}
      </motion.span>
    </MarkerContent>
  </Marker>
</template>
