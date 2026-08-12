<script setup lang="ts">
import { sendOtpSchema } from "@artfolio/shared";
import { useAuthStore } from "@/stores/auth.store";
import { useMutation } from "@tanstack/vue-query";
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
const error = ref<string | null>(null);

const { mutate: submitEmail, isPending } = useMutation({
  mutationFn: (email: string) => auth.requestOtp(email),
  onSuccess: async (_, email) => {
    await router.push({
      name: "auth-verify",
      query: { email },
    });
  },
  onError: (err) => {
    error.value = err instanceof Error ? err.message : "Something went wrong";
  },
});

function handleEmailSubmit() {
  const parsed = sendOtpSchema.safeParse({ email: email.value });
  if (!parsed.success) {
    error.value = parsed.error.issues[0]?.message ?? "Invalid input";
    return;
  }
  error.value = null;
  submitEmail(parsed.data.email);
}
</script>

<template>
  <div
    class="min-h-screen flex flex-col items-center justify-center bg-background gap-6 px-4 -translate-y-5"
  >
    <!-- Logo / Brand -->
    <div class="flex items-center gap-2 text-foreground">
      <Icon icon="ph:paint-brush-duotone" class="text-2xl text-primary" />
      <span class="text-lg font-semibold tracking-tight">Artfolio</span>
    </div>

    <Card class="w-full max-w-sm shadow-2xl">
      <CardHeader class="pb-3 mr-3">
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
              :disabled="isPending"
            />
          </div>

          <p v-if="error" role="alert" class="text-sm text-destructive">
            {{ error }}
          </p>

          <Button type="submit" class="w-full" :disabled="isPending">
            <Icon
              v-if="isPending"
              icon="ph:spinner"
              class="mr-2 text-base animate-spin"
              aria-hidden="true"
            />
            {{ isPending ? "Sending code…" : "Continue with email" }}
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
