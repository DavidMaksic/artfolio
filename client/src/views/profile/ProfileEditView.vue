<script setup lang="ts">
import type { UpdateProfileInput } from "@artfolio/shared";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { extractTrpcError } from "@/lib/trpc-error";
import { useAuthStore } from "@/stores/auth.store";
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import { trpc } from "@/lib/trpc";

import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import ProfileImageUpload from "@/components/profile/ProfileImageUpload.vue";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const router = useRouter();
const queryClient = useQueryClient();
const auth = useAuthStore();

const error = ref<string | null>(null);

const username = ref("");
const displayName = ref("");
const bio = ref("");
const location = ref("");
const website = ref("");

const availableForCommissions = ref(false);
const pendingProfileImage = ref<File | null>(null);

const { data: profile, isPending: isLoadingProfile } = useQuery({
  queryKey: ["profile", "me"],
  queryFn: () => trpc.profile.getMe.query(),
});

watch(
  profile,
  (p) => {
    if (!p) return;
    username.value = p.username;
    displayName.value = p.displayName ?? "";
    bio.value = p.bio ?? "";
    location.value = p.location ?? "";
    website.value = p.website ?? "";
    availableForCommissions.value = p.availableForCommissions;
  },
  { immediate: true },
);

function onProfileImageSelected(file: File) {
  pendingProfileImage.value = file;
}

async function uploadProfileImage(file: File): Promise<string> {
  const { signature, timestamp, folder, transformation, apiKey, cloudName } =
    await trpc.profile.getProfileImageUploadSignature.mutate();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", folder);
  formData.append("transformation", transformation);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.secure_url;
}

const { mutate, isPending } = useMutation({
  mutationFn: async (input: UpdateProfileInput) => {
    if (pendingProfileImage.value) {
      input.profileImageUrl = await uploadProfileImage(pendingProfileImage.value);
    }
    return trpc.profile.update.mutate(input);
  },
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    router.push({ name: "profile", params: { username: username.value } });
  },
  onError: (err) => (error.value = extractTrpcError(err)),
});

function onSubmit(e: SubmitEvent) {
  e.preventDefault();
  error.value = null;
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
  <div
    class="min-h-screen flex flex-col justify-center bg-neutral-100 gap-4 pt-4 pb-20 px-4 max-w-lg mx-auto"
  >
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" @click="router.back()">
        <Icon icon="ph:arrow-left" class="size-5 mt-0.5" />
      </Button>
      <h1 class="text-xl font-bold">Edit profile</h1>
    </div>

    <template v-if="isLoadingProfile">
      <Card>
        <CardContent class="space-y-5 pt-6">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-4 w-24" />
          <Skeleton class="h-24 w-full" />
        </CardContent>
      </Card>
    </template>

    <template v-else>
      <Card>
        <CardContent>
          <form class="space-y-5" @submit="onSubmit">
            <div class="flex justify-center mb-4">
              <ProfileImageUpload
                :current-image-url="profile?.profileImageUrl"
                @file-selected="onProfileImageSelected"
                :disabled="isPending"
              />
            </div>

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
                  required
                  :disabled="isPending"
                  autocomplete="off"
                  autocorrect="off"
                  autocapitalize="off"
                  spellcheck="false"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <Label for="displayName">Display name</Label>
              <Input
                id="displayName"
                type="text"
                v-model="displayName"
                required
                :disabled="isPending"
              />
            </div>

            <div class="space-y-1.5">
              <Label for="bio">Bio</Label>
              <Textarea
                id="bio"
                v-model="bio"
                placeholder="A little about your work..."
                :disabled="isPending"
                rows="3"
              />
              <p class="text-xs text-muted-foreground text-right">{{ bio.length }} / 500</p>
            </div>

            <div class="space-y-1.5">
              <Label for="location">Location</Label>
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
              <Label for="website">Website</Label>
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

            <p v-if="error" role="alert" class="text-sm text-destructive flex items-center gap-1.5">
              <Icon icon="ph:warning-circle" />
              {{ error }}
            </p>

            <div class="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                class="flex-1"
                :disabled="isPending"
                @click="router.back()"
              >
                Cancel
              </Button>
              <Button type="submit" class="flex-1" :disabled="isPending">
                <Icon v-if="isPending" icon="ph:spinner" class="animate-spin mr-2" />
                {{ isPending ? "Saving..." : "Save changes" }}
              </Button>

              <div class="flex gap-2 pt-1">
                <!-- existing cancel + save buttons -->
              </div>
            </div>

            <div class="pt-4 border-t border-border">
              <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Danger zone
              </p>
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm font-medium">Delete account</p>
                  <p class="text-xs text-muted-foreground">
                    Permanently removes your profile and all posts.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger as-child>
                    <Button variant="destructive" size="sm" class="px-6" type="button">
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove your profile, all your posts, and their images.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        class="bg-destructive hover:bg-destructive/90"
                        @click="auth.deleteAccount()"
                      >
                        Yes, delete everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
