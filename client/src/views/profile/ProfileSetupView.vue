<script setup lang="ts">
import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { UpdateProfileInput } from "@artfolio/shared";
import { extractTrpcError } from "@/lib/trpc-error";
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const router = useRouter();
const queryClient = useQueryClient();

const error = ref<string | null>(null);
const step = ref<1 | 2>(1);

// Step 1
const username = ref("");
const displayName = ref("");

// Step 2
const bio = ref("");
const location = ref("");
const website = ref("");
const availableForCommissions = ref(false);

const isStep1Valid = computed(
  () => username.value.trim().length >= 3 && displayName.value.trim().length > 0,
);

const { mutate, isPending } = useMutation({
  mutationFn: (input: UpdateProfileInput) => trpc.profile.update.mutate(input),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["me"] });
    router.push({ name: "home" });
  },
  onError: (err) => (error.value = extractTrpcError(err)),
});

async function redirect() {
  await trpc.profile.update.mutate({
    username: username.value,
    displayName: displayName.value,
    profileSetupSkipped: true,
  });
  queryClient.invalidateQueries({ queryKey: ["me"] });
  router.push({ name: "home" });
}

function onSubmit() {
  if (step.value === 1) return (step.value = 2);

  mutate({
    username: username.value,
    displayName: displayName.value,
    bio: bio.value || undefined,
    location: location.value || undefined,
    website: website.value || undefined,
    availableForCommissions: availableForCommissions.value,
  });
}
</script>

<template>
  <div class="min-h-[85vh] flex flex-col items-center justify-center bg-neutral-100 gap-6 px-4">
    <Card class="w-full max-w-md shadow-2xl">
      <CardHeader class="pb-2">
        <!-- Step indicator -->
        <div class="flex items-center gap-2 mb-4">
          <div
            class="h-1.5 rounded-full flex-1 transition-colors duration-300"
            :class="step >= 1 ? 'bg-primary' : 'bg-muted'"
          />
          <div
            class="h-1.5 rounded-full flex-1 transition-colors duration-300"
            :class="step >= 2 ? 'bg-primary' : 'bg-muted'"
          />
        </div>

        <p class="text-xs text-muted-foreground uppercase tracking-widest font-medium">
          Step {{ step }} of 2
        </p>
        <h1 class="text-xl font-bold mt-1">
          {{ step === 1 ? "Set up your profile" : "Tell people about yourself" }}
        </h1>
        <p class="text-sm text-muted-foreground mt-1">
          {{
            step === 1
              ? "Choose a username and display name."
              : "Help other artists and collectors find and connect with you."
          }}
        </p>
      </CardHeader>

      <CardContent>
        <form class="space-y-5" @submit.prevent="onSubmit">
          <!-- Step 1 -->
          <template v-if="step === 1">
            <div class="space-y-1.5">
              <Label for="username">Username</Label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"
                  >@</span
                >
                <Input
                  id="username"
                  type="text"
                  class="pl-7"
                  v-model="username"
                  placeholder="yourname"
                  required
                  :disabled="isPending"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                />
              </div>
              <p class="text-xs text-muted-foreground">
                artfolio.com/@{{ username || "yourname" }}
              </p>
            </div>

            <div class="space-y-1.5">
              <Label for="displayName">Display name</Label>
              <Input
                id="displayName"
                type="text"
                v-model="displayName"
                placeholder="Your Name"
                required
                :disabled="isPending"
              />
            </div>
          </template>

          <!-- Step 2 -->
          <template v-else>
            <div class="space-y-1.5">
              <Label for="bio">
                Bio
                <span class="text-muted-foreground font-normal ml-1">— optional</span>
              </Label>
              <Textarea
                id="bio"
                v-model="bio"
                placeholder="A little about your work and what inspires you..."
                :disabled="isPending"
                rows="3"
              />
              <p class="text-xs text-muted-foreground text-right">{{ bio.length }} / 500</p>
            </div>

            <div class="space-y-1.5">
              <Label for="location">
                Location
                <span class="text-muted-foreground font-normal ml-1">— optional</span>
              </Label>
              <div class="relative">
                <Icon
                  icon="ph:map-pin"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="location"
                  type="text"
                  class="pl-8"
                  v-model="location"
                  placeholder="City, Country"
                  :disabled="isPending"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <Label for="website">
                Website
                <span class="text-muted-foreground font-normal ml-1">— optional</span>
              </Label>
              <div class="relative">
                <Icon
                  icon="ph:link"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="website"
                  type="url"
                  class="pl-8"
                  v-model="website"
                  placeholder="https://yoursite.com"
                  :disabled="isPending"
                />
              </div>
            </div>

            <div class="flex items-center justify-between rounded-lg border p-4">
              <div class="space-y-0.5">
                <p class="text-sm font-medium">Available for commissions</p>
                <p class="text-xs text-muted-foreground">
                  Let people know you're open to paid work.
                </p>
              </div>
              <Switch v-model="availableForCommissions" :disabled="isPending" />
            </div>
          </template>

          <!-- Error -->
          <p v-if="error" role="alert" class="text-sm text-destructive flex items-center gap-1.5">
            <Icon icon="ph:warning-circle" />
            {{ error }}
          </p>

          <!-- Actions -->
          <div class="space-y-2 pt-1">
            <Button
              type="submit"
              class="w-full"
              :disabled="(step === 1 && !isStep1Valid) || isPending"
            >
              <Icon v-if="isPending" icon="ph:spinner" class="animate-spin mr-2" />
              {{ step === 1 ? "Continue" : isPending ? "Saving..." : "Finish setup" }}
            </Button>

            <div class="flex items-center gap-2">
              <Button
                v-if="step === 2"
                type="button"
                variant="ghost"
                class="flex-1 text-muted-foreground"
                :disabled="isPending"
                @click="step = 1"
              >
                <Icon icon="ph:arrow-left" class="mr-1" />
                Back
              </Button>

              <Button
                v-if="step === 2"
                type="button"
                variant="ghost"
                class="flex-1 text-muted-foreground"
                @click="redirect"
              >
                Skip for now
                <Icon icon="ph:arrow-right" class="ml-1" />
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>

    <!-- Fine print -->
    <p class="text-xs text-muted-foreground text-center max-w-xs">
      You can update your profile at any time from your settings.
    </p>
  </div>
</template>
