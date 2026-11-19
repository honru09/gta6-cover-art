/**
 * Color grading filters for Neon Coast Cover Studio.
 * Applies GTA/Vice City-style cinematic color grading to canvas imagery.
 */

export const GRADES = {
  sunset_gradient: {
    id: 'sunset_gradient',
    name: 'Sunset Gradient-Map',
    description: 'Vice City dusk: deep purple shadows, hot magenta midtones, golden yellow highlights',
  },
  neon_night: {
    id: 'neon_night',
    name: 'Neon Night',
    description: 'Electric night: midnight indigo shadows with vivid cyan and hot pink neon highlights',
  },
  golden_hour: {
    id: 'golden_hour',
    name: 'Golden Hour',
    description: 'Tropical warmth: rich amber saturation, golden sunbeam wash, and warm chocolate contrast',
  },
  teal_orange: {
    id: 'teal_orange',
    name: 'Teal & Orange',
    description: 'Cinematic duotone: oceanic teal shadows contrasted with punchy warm sunset highlights',
  },
  halftone_bw: {
    id: 'halftone_bw',
    name: 'B&W Halftone',
    description: 'Gritty crime noir: high-contrast monochrome with stylized print texture',
  },
};

/**
 * Applies the selected grade directly to a 2D rendering context within a given rectangle.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} gradeId
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
export function applyGrade(ctx, gradeId, x, y, w, h) {
  const rx = Math.max(0, Math.floor(x));
  const ry = Math.max(0, Math.floor(y));
  const rw = Math.min(ctx.canvas.width - rx, Math.floor(w));
  const rh = Math.min(ctx.canvas.height - ry, Math.floor(h));

  if (rw <= 0 || rh <= 0) return;

  const imgData = ctx.getImageData(rx, ry, rw, rh);
  const data = imgData.data;
  const len = data.length;

  switch (gradeId) {
    case 'sunset_gradient': {
      // Gradient map: Shadow (30, 8, 48) -> Mid (225, 42, 115) -> Highlight (255, 222, 60)
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        if (lum < 0.5) {
          const t = lum / 0.5;
          data[i] = Math.round(30 + (225 - 30) * t);
          data[i + 1] = Math.round(8 + (42 - 8) * t);
          data[i + 2] = Math.round(48 + (115 - 48) * t);
        } else {
          const t = (lum - 0.5) / 0.5;
          data[i] = Math.min(255, Math.round(225 + (255 - 225) * t));
          data[i + 1] = Math.min(255, Math.round(42 + (222 - 42) * t));
          data[i + 2] = Math.min(255, Math.round(115 + (60 - 115) * t));
        }
      }
      break;
    }

    case 'neon_night': {
      // Midnight shadows (10, 15, 45) -> Electric magenta mid (160, 20, 140) -> Cyan highlight (0, 245, 212)
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        if (lum < 0.45) {
          const t = lum / 0.45;
          data[i] = Math.round(10 + (160 - 10) * t);
          data[i + 1] = Math.round(15 + (20 - 15) * t);
          data[i + 2] = Math.round(45 + (140 - 45) * t);
        } else {
          const t = (lum - 0.45) / 0.55;
          data[i] = Math.round(160 + (0 - 160) * t);
          data[i + 1] = Math.min(255, Math.round(20 + (245 - 20) * t));
          data[i + 2] = Math.min(255, Math.round(140 + (212 - 140) * t));
        }
      }
      break;
    }

    case 'golden_hour': {
      // Warm golden sun wash: boost reds and warm yellow, deep warm shadows
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        data[i] = Math.min(255, Math.round(r * 1.25 + 30 * lum));
        data[i + 1] = Math.min(255, Math.round(g * 1.05 + 15 * lum));
        data[i + 2] = Math.max(0, Math.round(b * 0.75 - 10 * (1 - lum)));
      }
      break;
    }

    case 'teal_orange': {
      // Shadows -> Teal (0, 95, 115) | Highlights -> Orange (238, 155, 0)
      for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        if (lum < 0.5) {
          const t = lum / 0.5;
          data[i] = Math.round(0 + (10 - 0) * t);
          data[i + 1] = Math.round(40 + (110 - 40) * t);
          data[i + 2] = Math.round(60 + (140 - 60) * t);
        } else {
          const t = (lum - 0.5) / 0.5;
          data[i] = Math.min(255, Math.round(150 + (255 - 150) * t));
          data[i + 1] = Math.min(255, Math.round(90 + (170 - 90) * t));
          data[i + 2] = Math.round(60 + (20 - 60) * t);
        }
      }
      break;
    }

    case 'halftone_bw': {
      // High contrast B&W with subtle dot halftone effect
      for (let yIdx = 0; yIdx < rh; yIdx++) {
        for (let xIdx = 0; xIdx < rw; xIdx++) {
          const idx = (yIdx * rw + xIdx) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          let lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

          // High contrast curve
          lum = lum < 0.5 ? Math.pow(lum * 2, 1.4) / 2 : 1 - Math.pow((1 - lum) * 2, 1.4) / 2;

          // Stylized halftone pattern (4x4 dot matrix)
          const dot = ((xIdx % 4) - 1.5) ** 2 + ((yIdx % 4) - 1.5) ** 2;
          const threshold = dot / 4.5;
          const finalVal = lum > threshold ? 245 : 15;

          data[idx] = finalVal;
          data[idx + 1] = finalVal;
          data[idx + 2] = finalVal;
        }
      }
      break;
    }
  }

  ctx.putImageData(imgData, rx, ry);
}
