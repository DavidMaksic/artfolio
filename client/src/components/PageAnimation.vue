<script setup lang="ts">
import { motion } from "motion-v";
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <motion.div
      :key="route.path"
      :initial="{ opacity: 0 }"
      :animate="{ opacity: 1 }"
      :exit="{ opacity: 0 }"
      :transition="{ type: 'tween', duration: 0.2, ease: 'easeOut' }"
    >
      <component :is="Component" />
    </motion.div>
  </RouterView>
</template>
