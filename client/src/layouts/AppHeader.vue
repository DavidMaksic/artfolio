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

const profileReady = computed(
  () => !!me.value && (me.value.profileSetupSkipped || !!me.value.displayName),
);
</script>

<template>
  <header class="z-50 w-full border-b border-b-neutral-300/80 md:border-b-0">
    <div
      class="mx-auto px-10 md:px-10 sm:px-7 h-14 flex items-center justify-between sm:justify-center gap-4"
    >
      <!-- Left side -->
      <div class="flex items-center gap-2">
        <!-- Logo -->
        <button
          class="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity"
          @click="router.push({ name: 'home' })"
        >
          Artfolio
        </button>

        <span
          class="text-xl ml-5 mr-3 text-neutral-400 font-extralight select-none self-start sm:hidden"
          >|</span
        >

        <Button
          class="hover:bg-neutral-200/60 sm:hidden"
          variant="ghost"
          size="sm"
          @click="router.push({ name: 'explore' })"
        >
          <Icon icon="ph:house" class="mr-0.5 size-5" />
          Home
        </Button>

        <Button
          class="hover:bg-neutral-200/60 sm:hidden"
          variant="ghost"
          size="sm"
          @click="router.push({ name: 'explore' })"
        >
          <Icon icon="ph:compass" class="mr-0.5 size-5" />
          Explore
        </Button>
      </div>

      <!-- Right side -->
      <div class="flex items-center gap-2 sm:hidden">
        <template v-if="auth.isAuthenticated">
          <Button
            v-if="profileReady"
            class="hover:bg-neutral-200/60"
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'post-create' })"
          >
            <Icon icon="ph:plus" class="mr-0.5 size-5" aria-label="New post" />
            <span class="md:hidden">New post</span>
          </Button>

          <Button
            v-if="profileReady"
            class="hover:bg-neutral-200/60"
            variant="ghost"
            size="sm"
            @click="router.push({ name: 'profile', params: { username: me!.username } })"
          >
            <Icon icon="ph:user" class="mr-0.5 size-5" />
            <span class="md:hidden">{{ me!.username }}</span>
          </Button>

          <Button class="hover:bg-neutral-200/60" variant="ghost" size="sm" @click="auth.signOut()">
            <Icon icon="ph:sign-out" class="mr-0.5 size-5" />
            <span class="md:hidden">Sign out</span>
          </Button>
        </template>

        <template v-else>
          <Button size="sm" @click="router.push({ name: 'sign-in' })"> Sign in </Button>
        </template>
      </div>
    </div>
  </header>
</template>
