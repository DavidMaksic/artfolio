import { trpc } from "@/lib/trpc";
import { ref } from "vue";

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, Math.round(l * 100)];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

// Pick the most saturated colour that isn't near-black or near-white. Falls back to null when no suitable candidate is found.

function pickAccent(colors: { hex: string; weight: number }[]): [number, number, number] | null {
  const candidates = colors
    .map((c) => ({ ...c, hsl: hexToHsl(c.hex) }))
    .filter(({ hsl: [, s, l] }) => s > 25 && l > 25 && l < 70)
    .sort((a, b) => b.hsl[1] - a.hsl[1]);

  return candidates[0]?.hsl ?? null;
}

// Composable

export function useProfilePalette() {
  const accentHsl = ref<[number, number, number] | null>(null);
  const isLoading = ref(false);

  async function extractPalette(imageUrl: string | null | undefined) {
    if (!imageUrl) {
      accentHsl.value = null;
      return;
    }

    isLoading.value = true;
    try {
      const { colors } = await trpc.profile.getProfilePalette.query({
        profileImageUrl: imageUrl,
      });
      accentHsl.value = pickAccent(colors);
    } catch {
      accentHsl.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  return { accentHsl, isLoading, extractPalette };
}
