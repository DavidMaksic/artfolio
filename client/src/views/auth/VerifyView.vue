<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { REGEXP_ONLY_DIGITS } from "vue-input-otp";
import { useAuthStore } from "@/stores/auth.store";
import { otpSchema } from "@artfolio/shared";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useMutation } from "@tanstack/vue-query";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/vue";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const email = computed(() => (route.query.email as string) ?? "");
const autoCode = computed(() => route.query.code as string | undefined);

const otp = ref("");
const isLoading = ref(false);
const error = ref<string | null>(null);
const resendCooldown = ref(0);

onMounted(async () => {
  if (!email.value) {
    await router.replace({ name: "sign-in" });
    return;
  }

  if (autoCode.value) {
    otp.value = autoCode.value.slice(0, 6);
    await verify(otp.value);
  }
});

async function verify(code: string) {
  const parsed = otpSchema.safeParse(code);
  if (!parsed.success) {
    error.value = "Please enter a valid 6-digit code";
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    await auth.verifyOtp(email.value, parsed.data);
    const redirect = (route.query.redirect as string) ?? "/";
    await router.replace(redirect);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Invalid or expired code";
    otp.value = "";
  } finally {
    isLoading.value = false;
  }
}

// Auto-submit when all 6 digits are entered
function onOtpComplete(value: string) {
  if (value.length === 6) verify(value);
}

const { mutate: resendCode, isPending } = useMutation({
  mutationFn: () => auth.requestOtp(email.value),
  onSuccess: () => {
    resendCooldown.value = 60;
    const interval = setInterval(() => {
      resendCooldown.value--;
      if (resendCooldown.value <= 0) clearInterval(interval);
    }, 1000);
  },
  onError: () => {
    error.value = "Failed to resend code";
  },
});
</script>

<template>
  <div class="min-h-[85vh] flex flex-col items-center justify-center bg-neutral-100 gap-6 px-4">
    <Card v-if="!autoCode" class="w-full max-w-sm shadow-2xl">
      <CardHeader class="space-y-1">
        <CardTitle class="text-xl">Check your email</CardTitle>
        <CardDescription>
          We sent a sign-in code to
          <span class="font-medium text-foreground">{{ email }}</span>
        </CardDescription>
      </CardHeader>

      <CardContent class="space-y-4">
        <!-- OTP input -->
        <div class="flex justify-center" :class="{ 'opacity-50 pointer-events-none': isLoading }">
          <InputOTP
            v-model="otp"
            :maxlength="6"
            :pattern="REGEXP_ONLY_DIGITS"
            :class="{ 'border-destructive': error }"
            @update:model-value="onOtpComplete"
          >
            <InputOTPGroup>
              <InputOTPSlot v-for="index in 6" :key="index" :index="index - 1" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        <!-- Error -->
        <p v-if="error" role="alert" class="text-sm text-destructive flex items-center gap-1.5">
          <Icon icon="ph:warning-circle" class="text-base shrink-0" aria-hidden="true" />
          {{ error }}
        </p>

        <!-- Loading -->
        <p v-if="isLoading" class="text-sm text-muted-foreground flex items-center gap-1.5">
          <Icon icon="ph:spinner" class="text-base animate-spin shrink-0" aria-hidden="true" />
          Verifying…
        </p>

        <!-- Resend -->
        <p class="text-sm text-muted-foreground">
          Didn't get it?
          <button
            class="font-medium text-foreground hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="resendCooldown > 0 || isPending"
            @click="() => resendCode()"
          >
            <Icon
              v-if="isPending"
              icon="ph:spinner"
              class="inline text-base animate-spin mr-0.5"
              aria-hidden="true"
            />
            {{
              resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : isPending
                  ? "Sending…"
                  : "Resend code"
            }}
          </button>
        </p>

        <!-- Back -->
        <Button variant="ghost" class="w-full" @click="router.push({ name: 'sign-in' })">
          <Icon icon="ph:arrow-left" class="mr-2 text-base" aria-hidden="true" />
          Back to sign in
        </Button>
      </CardContent>
    </Card>

    <!-- Auto-verify loading state -->
    <div v-else class="flex flex-col items-center gap-3 text-muted-foreground">
      <Icon icon="ph:spinner" class="text-5xl animate-spin" />
      <p>Signing you in…</p>
    </div>
  </div>
</template>
