interface CloudinaryOptions {
  width?: number;
  height?: number;
  quality?: number | "auto";
  crop?: "fill" | "fit" | "limit" | "scale" | "thumb";
  format?: "auto" | "webp" | "avif";
  dpr?: number;
  paddingFactor?: number;
}

export function cloudinaryUrl(
  url: string | null | undefined,
  options: CloudinaryOptions = {},
): string {
  if (!url) return "";

  const {
    width,
    height,
    quality = "auto:best",
    crop = "fill",
    format = "auto",
    dpr,
    paddingFactor = 1,
  } = options;

  const innerWidth = width ? Math.round(width * paddingFactor - 2) : undefined;
  const innerHeight = height ? Math.round(height * paddingFactor - 2) : undefined;

  const transforms = [
    width && `w_${innerWidth}`,
    height && `h_${innerHeight}`,
    crop && `c_${crop}`,
    `q_${quality}`,
    `f_${format}`,
    dpr && `dpr_${dpr}`,
  ]
    .filter(Boolean)
    .join(",");

  return url.replace("/upload/", `/upload/${transforms}/`);
}
