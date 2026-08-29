<script setup lang="ts">
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

const router = useRouter();
const auth = useAuthStore();

const { data: me } = useQuery({
  queryKey: ["me"],
  queryFn: () => trpc.profile.getMe.query(),
  enabled: computed(() => auth.isAuthenticated),
});
</script>

<template>
  <header class="z-50 w-full border-b border-b-neutral-300/80 border-border">
    <div class="mx-auto px-10 h-14 flex items-center justify-between gap-4">
      <!-- Logo -->
      <button
        class="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
        @click="router.push({ name: 'home' })"
      >
        Artfolio
      </button>

      <!-- Right side -->
      <div class="flex items-center gap-2">
        <template v-if="auth.isAuthenticated">
          <Button variant="ghost" size="sm" @click="router.push({ name: 'post-create' })">
            <Icon icon="ph:plus" class="mr-1.5" />
            New post
          </Button>

          <Button
            v-if="me"
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'profile', params: { username: me.username } })"
          >
            <Icon icon="ph:user" class="mr-1.5" />
            {{ me.username }}
          </Button>

          <Button variant="ghost" size="sm" @click="auth.signOut()">
            <Icon icon="ph:sign-out" class="mr-1.5" />
            Sign out
          </Button>
        </template>

        <template v-else>
          <Button size="sm" @click="router.push({ name: 'sign-in' })"> Sign in </Button>
        </template>
      </div>
    </div>
  </header>
</template>
