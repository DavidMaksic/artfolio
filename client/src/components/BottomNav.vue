<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import { Icon } from "@iconify/vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const items = [
  { icon: "ph:house", activeIcon: "ph:house-fill", label: "Home", name: "home" },
  { icon: "ph:compass", activeIcon: "ph:compass-fill", label: "Explore", name: "explore" },
  { icon: "ph:plus-circle", activeIcon: "ph:plus-circle-fill", label: "New", name: "post-create" },
  { icon: "ph:user", activeIcon: "ph:user-fill", label: "Profile", name: "profile" },
];

function isActive(item: (typeof items)[number]) {
  if (item.name === "profile") {
    return route.name === "profile" && route.params.username === auth.username;
  }
  return route.name === item.name;
}

function go(name: string) {
  if (name === "profile") {
    if (!auth.username) {
      router.push({ name: "sign-in" });
      return;
    }
    router.push({ name: "profile", params: { username: auth.username } });
    return;
  }
  router.push({ name });
}
</script>

<template>
  <nav
    class="hidden sm:flex fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 items-center justify-around"
    style="padding-bottom: env(safe-area-inset-bottom, 0px)"
  >
    <button
      v-for="item in items"
      :key="item.name"
      class="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-muted-foreground transition-colors"
      :class="{ 'text-foreground': isActive(item) }"
      @click="go(item.name)"
    >
      <Icon :icon="isActive(item) ? item.activeIcon : item.icon" class="text-2xl" />
      <span class="text-[0.68rem] font-medium">{{ item.label }}</span>
    </button>
  </nav>
</template>
