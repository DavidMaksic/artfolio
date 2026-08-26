import { ref } from "vue";
import { trpc } from "@/lib/trpc";

interface LocalImage {
  file: File;
  preview: string;
  order: number;
}

export interface UploadedImage {
  imageUrl: string;
  publicId: string;
  order: number;
  width: number;
  height: number;
}

export function usePostImageUpload() {
  const images = ref<LocalImage[]>([]);
  const isUploading = ref(false);
  const error = ref<string | null>(null);

  function addImages(files: File[]) {
    if (files.length === 0) return;
    if (images.value.length + files.length > 10) {
      error.value = "You can upload a maximum of 10 images per post";
      return;
    }
    error.value = null;
    const incoming = files.map((file, i) => ({
      file,
      preview: URL.createObjectURL(file),
      order: images.value.length + i,
    }));
    images.value.push(...incoming);
  }

  function removeImage(index: number) {
    const image = images.value[index];
    if (!image) return;
    URL.revokeObjectURL(image.preview);
    images.value.splice(index, 1);
    images.value.forEach((img, i) => (img.order = i));
  }

  function reorderImages(from: number, to: number) {
    const moved = images.value.splice(from, 1)[0];
    if (!moved) return;
    images.value.splice(to, 0, moved);
    images.value.forEach((img, i) => (img.order = i));
  }

  async function uploadAll(): Promise<UploadedImage[]> {
    if (images.value.length === 0) return [];
    isUploading.value = true;
    error.value = null;

    try {
      const { signature, timestamp, folder, apiKey, cloudName } =
        await trpc.post.getPostImageUploadSignature.mutate();

      const results = await Promise.all(
        images.value.map(async (img) => {
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

      return results;
    } catch {
      error.value = "Something went wrong during upload. Please try again.";
      throw error;
    } finally {
      isUploading.value = false;
    }
  }

  function reset() {
    images.value.forEach((img) => URL.revokeObjectURL(img.preview));
    images.value = [];
    error.value = null;
  }

  return {
    images,
    isUploading,
    error,
    addImages,
    removeImage,
    reorderImages,
    uploadAll,
    reset,
  };
}
