import type { UploadedImage } from "./usePostImageUpload";
import { trpc } from "@/lib/trpc";
import { ref } from "vue";

export interface ExistingImage {
  kind: "existing";
  id: string;
  imageUrl: string;
  publicId: string;
  width: number;
  height: number;
  order: number;
}

export interface PendingImage {
  kind: "pending";
  file: File;
  preview: string;
  order: number;
}

export type EditImage = ExistingImage | PendingImage;

export function usePostImageEdit() {
  const images = ref<EditImage[]>([]);
  const removedImageIds = ref<string[]>([]);
  const isUploading = ref(false);
  const error = ref<string | null>(null);

  function initFromExisting(existing: Omit<ExistingImage, "kind">[]) {
    images.value = existing.map((img) => ({ kind: "existing" as const, ...img }));
    removedImageIds.value = [];
  }

  function addImages(files: File[]) {
    if (files.length === 0) return;
    if (images.value.length + files.length > 10) {
      error.value = "You can upload a maximum of 10 images per post";
      return;
    }
    error.value = null;
    const incoming: PendingImage[] = files.map((file, i) => ({
      kind: "pending" as const,
      file,
      preview: URL.createObjectURL(file),
      order: images.value.length + i,
    }));
    images.value.push(...incoming);
    syncOrders();
  }

  function removeImage(index: number) {
    const image = images.value[index];
    if (!image) return;
    if (image.kind === "existing") {
      removedImageIds.value.push(image.id);
    } else {
      URL.revokeObjectURL(image.preview);
    }
    images.value.splice(index, 1);
    syncOrders();
  }

  function reorderImages(from: number, to: number) {
    const moved = images.value.splice(from, 1)[0];
    if (!moved) return;
    images.value.splice(to, 0, moved);
    syncOrders();
  }

  function syncOrders() {
    images.value.forEach((img, i) => (img.order = i));
  }

  async function uploadAndCollect(): Promise<UploadedImage[]> {
    isUploading.value = true;
    error.value = null;

    try {
      const pending = images.value.filter((img): img is PendingImage => img.kind === "pending");

      let uploadedPending: UploadedImage[] = [];

      if (pending.length > 0) {
        const { signature, timestamp, folder, apiKey, cloudName } =
          await trpc.post.getPostImageUploadSignature.mutate();

        uploadedPending = await Promise.all(
          pending.map(async (img) => {
            const formData = new FormData();
            formData.append("file", img.file);
            formData.append("signature", signature);
            formData.append("timestamp", String(timestamp));
            formData.append("folder", folder);
            formData.append("api_key", apiKey);

            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
              method: "POST",
              body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();

            return {
              imageUrl: data.secure_url as string,
              publicId: data.public_id as string,
              order: img.order,
              width: data.width as number,
              height: data.height as number,
            };
          }),
        );
      }

      // Merge existing + uploaded pending in current order
      let pendingIdx = 0;
      const merged: UploadedImage[] = images.value.map((img) => {
        if (img.kind === "existing") {
          return {
            imageUrl: img.imageUrl,
            publicId: img.publicId,
            order: img.order,
            width: img.width,
            height: img.height,
          };
        }
        const uploaded = uploadedPending[pendingIdx++];
        if (!uploaded) throw new Error("Uploaded pending image missing at expected index");
        return uploaded;
      });

      return merged.map((img, i) => ({ ...img, order: i }));
    } catch {
      error.value = "Something went wrong during upload. Please try again.";
      throw error;
    } finally {
      isUploading.value = false;
    }
  }

  function reset() {
    images.value
      .filter((img): img is PendingImage => img.kind === "pending")
      .forEach((img) => URL.revokeObjectURL(img.preview));
    images.value = [];
    removedImageIds.value = [];
    error.value = null;
  }

  return {
    images,
    removedImageIds,
    isUploading,
    error,
    initFromExisting,
    addImages,
    removeImage,
    reorderImages,
    uploadAndCollect,
    reset,
  };
}
