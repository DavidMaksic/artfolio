<script setup lang="ts">
import { sendOtpSchema } from "@artfolio/shared";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import { ref } from "vue";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@iconify/vue";

const router = useRouter();
const auth = useAuthStore();

const email = ref("");
const isLoading = ref(false);
const error = ref<string | null>(null);

async function handleEmailSubmit() {
  const parsed = sendOtpSchema.safeParse({ email: email.value });
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? "Invalid input";
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    await auth.requestOtp(parsed.data.email);
    await router.push({
      name: "auth-verify",
      query: { email: parsed.data.email },
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Something went wrong.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4 -translate-y-5">
    <Card class="w-full max-w-sm shadow-2xl">
      <CardHeader class="pb-3 mr-3">
        <div class="flex items-center justify-center gap-1 mb-2">
          <Icon icon="ph:paint-brush-duotone" class="text-primary text-2xl" aria-hidden="true" />
          <span class="text-xl font-bold tracking-tight">Artfolio</span>
        </div>
        <CardTitle class="text-xl">Sign in</CardTitle>
        <CardDescription>Enter your email to receive a sign-in code</CardDescription>
      </CardHeader>

      <CardContent class="space-y-4">
        <!-- Email form -->
        <form class="space-y-3" @submit.prevent="handleEmailSubmit">
          <div class="space-y-1.5">
            <Label for="email">Email address</Label>
            <Input
              id="email"
              v-model="email"
              type="email"
              placeholder="you@example.com"
              autocomplete="email"
              required
              :disabled="isLoading"
            />
          </div>

          <p v-if="error" role="alert" class="text-sm text-destructive">
            {{ error }}
          </p>

          <Button type="submit" class="w-full" :disabled="isLoading">
            <Icon
              v-if="isLoading"
              icon="ph:spinner"
              class="mr-2 text-base animate-spin"
              aria-hidden="true"
            />
            {{ isLoading ? "Sending code…" : "Continue with email" }}
          </Button>
        </form>

        <!-- Divider -->
        <div class="relative">
          <div class="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <!-- OAuth buttons -->
        <div class="space-y-2">
          <Button type="button" variant="outline" class="w-full" @click="auth.signInWithGoogle()">
            <Icon icon="logos:google-icon" class="mr-2 text-base" aria-hidden="true" />
            Continue with Google
          </Button>

          <Button type="button" variant="outline" class="w-full" @click="auth.signInWithDiscord()">
            <Icon icon="logos:discord-icon" class="mr-2 text-base" aria-hidden="true" />
            Continue with Discord
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
