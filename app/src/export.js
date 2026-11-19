/**
 * High-resolution multi-size PNG export generator for Neon Coast Cover Studio.
 * Renders full 1080x1080, 1080x1350, and 1920x1080 posters.
 */

import { renderCover } from './renderer.js';

export const EXPORT_PRESETS = [
  { id: 'square', label: '1080 × 1080 (Square Poster)', w: 1080, h: 1080, fileSuffix: '1080x1080' },
  { id: 'story', label: '1080 × 1350 (Portrait Story)', w: 1080, h: 1350, fileSuffix: '1080x1350' },
  { id: 'landscape', label: '1920 × 1080 (Cinematic Wall)', w: 1920, h: 1080, fileSuffix: '1920x1080' },
];

/**
 * Creates an offscreen high-res canvas, renders the state onto it, and returns the canvas.
 * @param {object} state
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
export function createExportCanvas(state, width, height) {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  renderCover(offscreen, state);
  return offscreen;
}

/**
 * Initiates browser download of a given canvas as a PNG file.
 * @param {HTMLCanvasElement} canvas
 * @param {string} filename
 */
export function triggerDownload(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports a single preset size.
 * @param {object} state
 * @param {string} presetId
 */
export function exportSinglePreset(state, presetId) {
  const preset = EXPORT_PRESETS.find((p) => p.id === presetId) || EXPORT_PRESETS[0];
  const slug = (state.title || 'gta6-cover').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `${slug}-${preset.fileSuffix}.png`;
  const canvas = createExportCanvas(state, preset.w, preset.h);
  triggerDownload(canvas, filename);
}

/**
 * Exports all three target PNG sizes in a single action.
 * @param {object} state
 */
export async function exportAllPresets(state) {
  const slug = (state.title || 'gta6-cover').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  for (let i = 0; i < EXPORT_PRESETS.length; i++) {
    const preset = EXPORT_PRESETS[i];
    const filename = `${slug}-${preset.fileSuffix}.png`;
    const canvas = createExportCanvas(state, preset.w, preset.h);
    triggerDownload(canvas, filename);

    // Minor tick between downloads to allow browser download manager to register
    if (i < EXPORT_PRESETS.length - 1) {
      await new Promise((r) => setTimeout(r, 280));
    }
  }
}
