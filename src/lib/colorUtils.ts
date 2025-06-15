
import { colord, extend } from "colord";
import hslPlugin from "colord/plugins/hsl";

extend([hslPlugin]);

// Simplified color mood detection.

const isWarm = (hsl: { h: number; s: number; l: number; a: number }): boolean => {
  // Hue for red, orange, yellow is roughly 0-60 and 330-360
  return (hsl.h >= 0 && hsl.h <= 60) || hsl.h >= 330;
};

const isCool = (hsl: { h: number; s: number; l: number; a: number }): boolean => {
  // Hue for green, blue, violet is roughly 100-280
  return hsl.h >= 100 && hsl.h <= 280;
};

const isMonochromatic = (hues: number[]): boolean => {
  if (hues.length < 2) return true;
  const hueRange = Math.max(...hues) - Math.min(...hues);
  // Small hue range suggests monochromatic palette
  return hueRange < 25;
};

const isVibrant = (saturations: number[]): boolean => {
  if (saturations.length === 0) return false;
  const avgSaturation = saturations.reduce((a, b) => a + b, 0) / saturations.length;
  // High average saturation suggests vibrancy
  return avgSaturation > 55;
};

export const getPaletteMoods = (palette: string[]): string[] => {
  if (!palette || palette.length === 0) return [];

  const hsls = palette.map(hex => colord(hex).toHsl());
  const hues = hsls.map(hsl => hsl.h);
  const saturations = hsls.map(hsl => hsl.s);

  let warmCount = 0;
  let coolCount = 0;

  for (const hsl of hsls) {
    if (isWarm(hsl)) warmCount++;
    if (isCool(hsl)) coolCount++;
  }

  const moods: Set<string> = new Set();

  if (warmCount / hsls.length > 0.6) moods.add("Warm Tones");
  if (coolCount / hsls.length > 0.6) moods.add("Cool Tones");
  if (isMonochromatic(hues)) moods.add("Monochromatic");
  if (isVibrant(saturations)) moods.add("Vibrant");

  return Array.from(moods);
};
