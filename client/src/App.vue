<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed } from "vue";

import AppHeader from "@/layouts/AppHeader.vue";
import AppFooter from "@/layouts/AppFooter.vue";

const route = useRoute();

const isAuthPage = computed(() => route.name === "sign-in");
</script>

<template>
  <div class="min-h-screen flex flex-col bg-neutral-100">
    <AppHeader v-if="!isAuthPage" />
    <main class="flex-1">
      <RouterView />
    </main>
    <AppFooter v-if="!isAuthPage" />
  </div>
</template>
