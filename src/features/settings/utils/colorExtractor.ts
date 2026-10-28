// Client-side image color extraction and contrasting text color suggestion.
// Samples an image using offscreen canvas and computes 3 readable, high-contrast text colors.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "").trim();
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (isNaN(num)) return { r: 255, g: 255, b: 255 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getLuminance({ r, g, b }: RGB): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function isLightColor(hex: string): boolean {
  return getLuminance(hexToRgb(hex)) >= 128;
}

export function colorDistance(c1: string, c2: string): number {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

const DEFAULT_SUGGESTIONS: [string, string, string] = ["#ffffff", "#fef08a", "#0f172a"];

/**
 * Samples an image from a URL, determines overall brightness and dominant hue,
 * and suggests the top 3 readable, high-contrast text colors.
 */
export async function extractTopColors(imageUrl: string): Promise<[string, string, string]> {
  if (typeof window === "undefined" || !imageUrl || !imageUrl.startsWith("http")) {
    return DEFAULT_SUGGESTIONS;
  }

  return new Promise(resolve => {
    let resolved = false;
    const finish = (colors: [string, string, string]) => {
      if (!resolved) {
        resolved = true;
        resolve(colors);
      }
    };

    // Safety timeout: never hang the UI if network or CORS stalls
    const timer = setTimeout(() => finish(DEFAULT_SUGGESTIONS), 2000);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return finish(DEFAULT_SUGGESTIONS);

        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;

        let totalLum = 0;
        let count = 0;
        const buckets: Record<string, { r: number; g: number; b: number; count: number }> = {};

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 128) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          totalLum += getLuminance({ r, g, b });
          count++;

          // Quantize into 32-step buckets (8 levels per channel)
          const qr = Math.min(255, Math.floor(r / 32) * 32 + 16);
          const qg = Math.min(255, Math.floor(g / 32) * 32 + 16);
          const qb = Math.min(255, Math.floor(b / 32) * 32 + 16);
          const key = `${qr},${qg},${qb}`;
          if (!buckets[key]) {
            buckets[key] = { r: qr, g: qg, b: qb, count: 0 };
          }
          buckets[key].count++;
        }

        if (count === 0) return finish(DEFAULT_SUGGESTIONS);

        const avgLum = totalLum / count;
        const sorted = Object.values(buckets).sort((a, b) => b.count - a.count);
        const dominant = sorted[0] ?? { r: 128, g: 128, b: 128 };

        // Generate suggestions based on luminance and dominant hue
        let c1: string;
        let c2: string;
        let c3: string;

        if (avgLum >= 140) {
          // Light image: prioritize dark text colors
          c1 = "#0f172a"; // Deep slate / obsidian
          // Deep shade with dominant image tint
          const darkTint: RGB = {
            r: Math.round(dominant.r * 0.2),
            g: Math.round(dominant.g * 0.2),
            b: Math.round(dominant.b * 0.2),
          };
          c2 = rgbToHex(darkTint);
          c3 = "#ffffff"; // Crisp pure white with dark shadow as alternative
        } else {
          // Medium / Dark / Vibrant image: prioritize light text colors
          c1 = "#ffffff"; // Crisp pure white
          // High-luminance tinted pastel based on dominant tone
          const lightTint: RGB = {
            r: Math.min(255, Math.round(dominant.r * 0.35 + 185)),
            g: Math.min(255, Math.round(dominant.g * 0.35 + 185)),
            b: Math.min(255, Math.round(dominant.b * 0.35 + 185)),
          };
          c2 = rgbToHex(lightTint);
          c3 = "#0f172a"; // Deep slate option for light areas
        }

        // Ensure c1 and c2 are visually distinct
        if (colorDistance(c1, c2) < 45) {
          c2 = avgLum >= 140 ? "#1e293b" : "#fef08a";
        }
        // Ensure c3 is distinct from c1 and c2
        if (colorDistance(c1, c3) < 45 || colorDistance(c2, c3) < 45) {
          c3 = avgLum >= 140 ? "#27272a" : "#fef3c7";
        }

        finish([c1, c2, c3]);
      } catch {
        finish(DEFAULT_SUGGESTIONS);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      finish(DEFAULT_SUGGESTIONS);
    };

    img.src = imageUrl;
  });
}
