<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { computed, ref } from "vue";

import PageAnimation from "@/components/PageAnimation.vue";
import AppHeader from "@/layouts/AppHeader.vue";
import AppFooter from "@/layouts/AppFooter.vue";
import BottomNav from "@/components/BottomNav.vue";

const route = useRoute();
const router = useRouter();

const routerReady = ref(false);
router.isReady().then(() => {
  routerReady.value = true;
});

const isAuthPage = computed(() => route.name === "sign-in");
const showChrome = computed(() => routerReady.value && !isAuthPage.value);
</script>

<template>
  <div class="min-h-screen flex flex-col bg-neutral-100">
    <AppHeader v-if="showChrome" />
    <main class="flex-1">
      <PageAnimation />
      <BottomNav />
    </main>
    <AppFooter v-if="showChrome" />
  </div>
</template>
