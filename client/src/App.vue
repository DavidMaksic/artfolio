<script setup lang="ts">
import AppHeader from "@/layouts/AppHeader.vue";
import AppFooter from "@/layouts/AppFooter.vue";
</script>

<template>
  <div class="min-h-screen flex flex-col bg-neutral-100">
    <AppHeader />
    <main class="flex-1">
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>
