/**
 * Neon Coast Cover Studio - Color Grades
 * High-performance 2D Canvas color grading with precomputed LUTs and comic halftone.
 */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createRampLut(stops) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let segIdx = 0;
    while (segIdx < stops.length - 2 && t > stops[segIdx + 1].pos) {
      segIdx++;
    }
    const s0 = stops[segIdx];
    const s1 = stops[segIdx + 1];
    const localT = (t - s0.pos) / (s1.pos - s0.pos || 1);
    const clampedT = Math.max(0, Math.min(1, localT));

    lut[i * 3 + 0] = Math.round(lerp(s0.r, s1.r, clampedT));
    lut[i * 3 + 1] = Math.round(lerp(s0.g, s1.g, clampedT));
    lut[i * 3 + 2] = Math.round(lerp(s0.b, s1.b, clampedT));
  }
  return lut;
}

// 1. Sunset Gradient-Map (Vice City dusk / magenta to gold)
const SUNSET_LUT = createRampLut([
  { pos: 0.0, r: 35, g: 10, b: 58 },
  { pos: 0.45, r: 235, g: 35, b: 115 },
  { pos: 0.8, r: 255, g: 140, b: 40 },
  { pos: 1.0, r: 255, g: 230, b: 100 }
]);

// 2. Neon Night (Navy, electric purple, neon cyan)
const NEON_NIGHT_LUT = createRampLut([
  { pos: 0.0, r: 12, g: 15, b: 42 },
  { pos: 0.5, r: 175, g: 25, b: 195 },
  { pos: 1.0, r: 15, g: 245, b: 255 }
]);

// 3. Golden Hour (Terracotta, rich amber, champagne gold)
const GOLDEN_HOUR_LUT = createRampLut([
  { pos: 0.0, r: 45, g: 22, b: 15 },
  { pos: 0.5, r: 240, g: 125, b: 25 },
  { pos: 1.0, r: 255, g: 245, b: 175 }
]);

// 4. Teal & Orange Duotone (Cinematic teal shadows, peachy-orange highlights)
const TEAL_ORANGE_LUT = createRampLut([
  { pos: 0.0, r: 8, g: 60, b: 78 },
  { pos: 0.48, r: 145, g: 110, b: 90 },
  { pos: 1.0, r: 255, g: 145, b: 35 }
]);

export const GRADES = {
  sunset: {
    id: 'sunset',
    name: 'Sunset Gradient',
    apply(imageData) {
      applyLut(imageData, SUNSET_LUT, 0.95);
    }
  },
  neon_night: {
    id: 'neon_night',
    name: 'Neon Night',
    apply(imageData) {
      applyLut(imageData, NEON_NIGHT_LUT, 0.95);
    }
  },
  golden_hour: {
    id: 'golden_hour',
    name: 'Golden Hour',
    apply(imageData) {
      applyLut(imageData, GOLDEN_HOUR_LUT, 0.95);
    }
  },
  teal_orange: {
    id: 'teal_orange',
    name: 'Teal & Orange',
    apply(imageData) {
      applyLut(imageData, TEAL_ORANGE_LUT, 0.95);
    }
  },
  halftone: {
    id: 'halftone',
    name: 'B&W Halftone',
    apply(imageData) {
      applyHalftone(imageData);
    }
  }
};

function applyLut(imageData, lut, blend = 1.0) {
  const data = imageData.data;
  const len = data.length;
  const invBlend = 1 - blend;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Perceptual luminance
    const lum = (r * 77 + g * 150 + b * 29) >> 8;
    const lutIdx = lum * 3;

    if (blend >= 0.99) {
      data[i] = lut[lutIdx];
      data[i + 1] = lut[lutIdx + 1];
      data[i + 2] = lut[lutIdx + 2];
    } else {
      data[i] = Math.round(r * invBlend + lut[lutIdx] * blend);
      data[i + 1] = Math.round(g * invBlend + lut[lutIdx + 1] * blend);
      data[i + 2] = Math.round(b * invBlend + lut[lutIdx + 2] * blend);
    }
  }
}

function applyHalftone(imageData) {
  const { width, height, data } = imageData;
  const cellSize = 6;
  const halfCell = cellSize / 2;
  const maxRadius = halfCell * 1.35;

  // First pass: compute luminance and apply high-contrast comic curve with screen dot
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    const cy = (y % cellSize) - halfCell + 0.5;

    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Luminance
      let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      // High contrast comic curve
      lum = Math.pow(lum, 1.3);

      const cx = (x % cellSize) - halfCell + 0.5;
      const dist = Math.sqrt(cx * cx + cy * cy);
      const dotThreshold = 1 - (dist / maxRadius);

      // Ink black vs cream white
      if (lum > dotThreshold) {
        data[idx] = 246;
        data[idx + 1] = 244;
        data[idx + 2] = 240;
      } else {
        data[idx] = 16;
        data[idx + 1] = 14;
        data[idx + 2] = 24;
      }
    }
  }
}
