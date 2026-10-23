import { cloudinaryUrl } from "@/lib/cloudinary";
import { useMediaQuery } from "@vueuse/core";

export function useCloudinaryUrl() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const dpr = Math.min(window.devicePixelRatio ?? 1, isMobile.value ? 3 : 2);

  return {
    dpr,
    thumb: (url: string | null | undefined, width: number, height: number) =>
      cloudinaryUrl(url, {
        width: Math.round(width * dpr),
        height: Math.round(height * dpr),
        crop: "fill",
      }),
    detail: (url: string | null | undefined, width: number) =>
      cloudinaryUrl(url, {
        width: Math.round(width * dpr),
        crop: "limit",
      }),
  };
}
