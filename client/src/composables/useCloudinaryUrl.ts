import { cloudinaryUrl } from "@/lib/cloudinary";

export function useCloudinaryUrl() {
  const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

  return {
    dpr,
    thumb: (url: string | null | undefined, width: number, height: number) =>
      cloudinaryUrl(url, {
        width: Math.round(width * dpr),
        height: Math.round(height * dpr),
        crop: "fill",
      }),
  };
}
