/**
 * Main application coordinator for Neon Coast Cover Studio.
 * Handles state, user interactions, query-parameter scene automation, and rendering pipeline.
 */

import { LAYOUTS } from './layouts.js';
import { GRADES } from './grades.js';
import { renderCover } from './renderer.js';
import { exportAllPresets, exportSinglePreset, createExportCanvas } from './export.js';

// Application State
const state = {
  layout: 'four_panel',
  grade: 'sunset_gradient',
  title: 'SUNSET HEIST',
  subtitle: 'Vice City Nights',
  subcaption: 'LEONIDA STATE // MISSION ACCOMPLISHED',
  badgeText: 'VICE CITY NIGHTS',
  showBadge: true,
  stars: 5,
  grain: 0.35,
  vignette: 0.45,
  photo: null,
  activeSample: 'pier',
  panelOffsets: {},
};

// Undo / Redo History
const undoStack = [];
const redoStack = [];

function saveHistory() {
  const snapshot = JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    subcaption: state.subcaption,
    badgeText: state.badgeText,
    showBadge: state.showBadge,
    stars: state.stars,
    grain: state.grain,
    vignette: state.vignette,
    panelOffsets: state.panelOffsets,
  });
  undoStack.push(snapshot);
  if (undoStack.length > 30) undoStack.shift();
  redoStack.length = 0; // Clear redo
}

/**
 * Loads an image from a URL or data URL and triggers re-render when ready.
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      state.photo = img;
      render();
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Executes a full render pass on the live preview canvas.
 */
export function render() {
  const previewCanvas = document.getElementById('previewCanvas');
  if (!previewCanvas) return;
  renderCover(previewCanvas, state);
}

/**
 * Parses query parameters for headless screenshot automation.
 * Supports ?shot=cover|editor, &photo=pier|boulevard, &caption=..., &sub=..., &layout=..., &grade=...
 */
function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const shotMode = params.get('shot');

  if (shotMode === 'cover') {
    document.body.classList.add('shot-cover');
    const previewCanvas = document.getElementById('previewCanvas');
    if (previewCanvas) {
      previewCanvas.width = window.innerWidth;
      previewCanvas.height = window.innerHeight;
    }
  } else if (shotMode === 'editor') {
    document.body.classList.add('shot-editor');
  }

  if (params.get('layout') && LAYOUTS[params.get('layout')]) {
    state.layout = params.get('layout');
  }

  if (params.get('grade') && GRADES[params.get('grade')]) {
    state.grade = params.get('grade');
  }

  if (params.get('caption')) {
    state.title = params.get('caption');
  }

  if (params.get('sub')) {
    state.subtitle = params.get('sub');
  }

  const photoParam = params.get('photo');
  if (photoParam === 'boulevard') {
    state.activeSample = 'boulevard';
  } else if (photoParam === 'pier') {
    state.activeSample = 'pier';
  }
}

/**
 * Binds UI DOM elements and event listeners.
 */
function initializeUI() {
  // Sync text inputs
  const titleInput = document.getElementById('titleInput');
  const subtitleInput = document.getElementById('subtitleInput');
  const subcaptionInput = document.getElementById('subcaptionInput');
  const badgeTextInput = document.getElementById('badgeTextInput');
  const showBadgeCheck = document.getElementById('showBadgeCheck');
  const starsSelect = document.getElementById('starsSelect');
  const grainSlider = document.getElementById('grainSlider');
  const vignetteSlider = document.getElementById('vignetteSlider');

  if (titleInput) {
    titleInput.value = state.title;
    titleInput.addEventListener('input', (e) => {
      saveHistory();
      state.title = e.target.value;
      render();
    });
  }

  if (subtitleInput) {
    subtitleInput.value = state.subtitle;
    subtitleInput.addEventListener('input', (e) => {
      saveHistory();
      state.subtitle = e.target.value;
      render();
    });
  }

  if (subcaptionInput) {
    subcaptionInput.value = state.subcaption;
    subcaptionInput.addEventListener('input', (e) => {
      saveHistory();
      state.subcaption = e.target.value;
      render();
    });
  }

  if (badgeTextInput) {
    badgeTextInput.value = state.badgeText;
    badgeTextInput.addEventListener('input', (e) => {
      saveHistory();
      state.badgeText = e.target.value;
      render();
    });
  }

  if (showBadgeCheck) {
    showBadgeCheck.checked = state.showBadge;
    showBadgeCheck.addEventListener('change', (e) => {
      saveHistory();
      state.showBadge = e.target.checked;
      render();
    });
  }

  if (starsSelect) {
    starsSelect.value = String(state.stars);
    starsSelect.addEventListener('change', (e) => {
      saveHistory();
      state.stars = parseInt(e.target.value, 10);
      render();
    });
  }

  if (grainSlider) {
    grainSlider.value = state.grain;
    grainSlider.addEventListener('input', (e) => {
      state.grain = parseFloat(e.target.value);
      render();
    });
  }

  if (vignetteSlider) {
    vignetteSlider.value = state.vignette;
    vignetteSlider.addEventListener('input', (e) => {
      state.vignette = parseFloat(e.target.value);
      render();
    });
  }

  // Populate & bind Layout Picker
  const layoutContainer = document.getElementById('layoutPicker');
  if (layoutContainer) {
    layoutContainer.innerHTML = '';
    Object.values(LAYOUTS).forEach((l) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `option-chip ${state.layout === l.id ? 'active' : ''}`;
      btn.textContent = l.name;
      btn.title = l.description;
      btn.addEventListener('click', () => {
        saveHistory();
        state.layout = l.id;
        document.querySelectorAll('#layoutPicker .option-chip').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
      layoutContainer.appendChild(btn);
    });
  }

  // Populate & bind Grade Picker
  const gradeContainer = document.getElementById('gradePicker');
  if (gradeContainer) {
    gradeContainer.innerHTML = '';
    Object.values(GRADES).forEach((g) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `option-chip ${state.grade === g.id ? 'active' : ''}`;
      btn.textContent = g.name;
      btn.title = g.description;
      btn.addEventListener('click', () => {
        saveHistory();
        state.grade = g.id;
        document.querySelectorAll('#gradePicker .option-chip').forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
      gradeContainer.appendChild(btn);
    });
  }

  // Sample photo switcher buttons
  const samplePierBtn = document.getElementById('samplePier');
  const sampleBoulevardBtn = document.getElementById('sampleBoulevard');

  if (samplePierBtn) {
    samplePierBtn.addEventListener('click', () => {
      state.activeSample = 'pier';
      loadImage('./samples/pier.jpg');
    });
  }

  if (sampleBoulevardBtn) {
    sampleBoulevardBtn.addEventListener('click', () => {
      state.activeSample = 'boulevard';
      loadImage('./samples/boulevard.jpg');
    });
  }

  // File upload input
  const fileInput = document.getElementById('fileUpload');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          saveHistory();
          loadImage(loadEvt.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Undo / Redo buttons
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');

  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      if (undoStack.length > 0) {
        const current = JSON.stringify(state);
        redoStack.push(current);
        const prev = JSON.parse(undoStack.pop());
        Object.assign(state, prev);
        syncUIToState();
        render();
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      if (redoStack.length > 0) {
        const current = JSON.stringify(state);
        undoStack.push(current);
        const next = JSON.parse(redoStack.pop());
        Object.assign(state, next);
        syncUIToState();
        render();
      }
    });
  }

  // Export buttons
  const exportAllBtn = document.getElementById('exportAllBtn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => {
      exportAllPresets(state);
    });
  }

  const exportSquareBtn = document.getElementById('exportSquareBtn');
  if (exportSquareBtn) {
    exportSquareBtn.addEventListener('click', () => {
      exportSinglePreset(state, 'square');
    });
  }

  const exportStoryBtn = document.getElementById('exportStoryBtn');
  if (exportStoryBtn) {
    exportStoryBtn.addEventListener('click', () => {
      exportSinglePreset(state, 'story');
    });
  }

  const exportLandscapeBtn = document.getElementById('exportLandscapeBtn');
  if (exportLandscapeBtn) {
    exportLandscapeBtn.addEventListener('click', () => {
      exportSinglePreset(state, 'landscape');
    });
  }

  // Canvas pan / drag interactions
  const canvas = document.getElementById('previewCanvas');
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  if (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = e.clientX;
      startY = e.clientY;

      // Adjust primary panel offset
      if (!state.panelOffsets['p0']) state.panelOffsets['p0'] = { panX: 0, panY: 0, zoom: 1 };
      state.panelOffsets['p0'].panX += dx * 1.5;
      state.panelOffsets['p0'].panY += dy * 1.5;
      render();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        saveHistory();
      }
    });

    // Zoom on wheel
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (!state.panelOffsets['p0']) state.panelOffsets['p0'] = { panX: 0, panY: 0, zoom: 1 };
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      state.panelOffsets['p0'].zoom = Math.max(0.5, Math.min(3, state.panelOffsets['p0'].zoom + delta));
      render();
    });
  }
}

function syncUIToState() {
  const titleInput = document.getElementById('titleInput');
  const subtitleInput = document.getElementById('subtitleInput');
  const subcaptionInput = document.getElementById('subcaptionInput');
  if (titleInput) titleInput.value = state.title;
  if (subtitleInput) subtitleInput.value = state.subtitle;
  if (subcaptionInput) subcaptionInput.value = state.subcaption;

  document.querySelectorAll('#layoutPicker .option-chip').forEach((c) => {
    c.classList.toggle('active', c.textContent === LAYOUTS[state.layout]?.name);
  });
  document.querySelectorAll('#gradePicker .option-chip').forEach((c) => {
    c.classList.toggle('active', c.textContent === GRADES[state.grade]?.name);
  });
}

// Test and automation hook
window.__neonStudio = {
  state,
  render,
  loadImage,
  createExportCanvas,
  exportSinglePreset,
  exportAllPresets,
  testExport: (w = 1080, h = 1080) => {
    const c = createExportCanvas(state, w, h);
    return {
      width: c.width,
      height: c.height,
      dataLength: c.toDataURL('image/png').length,
    };
  },
};

// Bootstrap Application
window.addEventListener('DOMContentLoaded', async () => {
  applyQueryParams();
  initializeUI();

  // Load selected sample photo
  const samplePath = state.activeSample === 'boulevard' ? './samples/boulevard.jpg' : './samples/pier.jpg';
  try {
    await loadImage(samplePath);
  } catch (err) {
    console.error('Failed to load initial sample image:', err);
  }

  // Ensure fonts are loaded before first full render pass
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      render();
    });
  } else {
    render();
  }
});
