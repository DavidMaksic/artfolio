<script setup lang="ts">
import { useAuthStore } from "@/stores/auth.store";
import { RouterView } from "vue-router";
const auth = useAuthStore();
</script>

<template>
  <RouterView />

  <template v-if="auth.isAuthenticated">
    <button
      @click="auth.deleteAccount()"
      style="
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        background: red;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        z-index: 9999;
      "
    >
      Delete Account
    </button>
    <button
      @click="auth.signOut()"
      style="
        position: fixed;
        bottom: 1rem;
        right: 10.5rem;
        background: #333;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        z-index: 9999;
      "
    >
      Sign Out
    </button>
  </template>
</template>
