/**
 * Neon Coast Cover Studio - Artwork Exporter
 * Generates high-resolution PNGs at 1080x1080, 1080x1350, and 1920x1080 resolutions.
 */

import { CoverRenderer } from './renderer.js';

export const EXPORT_PRESETS = [
  { id: 'square', name: 'Square', width: 1080, height: 1080, filename: 'neon-coast-1080x1080.png' },
  { id: 'story', name: 'Story / Portrait', width: 1080, height: 1350, filename: 'neon-coast-1080x1350.png' },
  { id: 'landscape', name: 'Landscape', width: 1920, height: 1080, filename: 'neon-coast-1920x1080.png' }
];

export async function renderToCanvas(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const renderer = new CoverRenderer(canvas);
  await renderer.initFonts();
  renderer.render(state, { isExport: true });

  return canvas;
}

export async function exportPreset(state, preset) {
  const canvas = await renderToCanvas(state, preset.width, preset.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas export failed to produce blob'));
        return;
      }
      triggerDownload(blob, preset.filename);
      resolve({ blob, width: preset.width, height: preset.height, filename: preset.filename });
    }, 'image/png');
  });
}

export async function exportAllPresets(state) {
  const results = [];
  for (const preset of EXPORT_PRESETS) {
    const res = await exportPreset(state, preset);
    results.push(res);
    // Brief delay between downloads so browser doesn't block multi-download
    await new Promise((r) => setTimeout(r, 180));
  }
  return results;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
