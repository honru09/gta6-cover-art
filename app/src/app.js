/**
 * Neon Coast Cover Studio - Main Application Controller
 * Handles user interactions, undo/redo state stack, canvas rendering, and URL query scenes.
 */

import { LAYOUTS } from './layouts.js';
import { GRADES } from './grades.js';
import { CoverRenderer } from './renderer.js';
import { EXPORT_PRESETS, exportPreset, exportAllPresets, renderToCanvas } from './export.js';

class NeonCoastApp {
  constructor() {
    this.canvas = document.getElementById('cover-canvas');
    this.renderer = new CoverRenderer(this.canvas);

    // Initial state
    this.state = {
      layout: 'four_grid',
      grade: 'sunset',
      captions: {
        title: 'SUNSET HEIST',
        subtitle: 'Vice City Nights',
        badge: 'VICE CITY NIGHTS'
      },
      heatLevel: 5,
      effects: {
        grain: true,
        vignette: true,
        badge: true
      },
      activePanel: 0,
      panelTransforms: {},
      image: null
    };

    this.history = [];
    this.historyIndex = -1;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.initialPan = { x: 0, y: 0 };

    this.init();
  }

  async init() {
    await this.renderer.initFonts();
    this.setupUI();
    this.setupEventListeners();
    await this.handleQueryParams();

    // Default image if none loaded by query
    if (!this.state.image) {
      await this.loadSamplePhoto('pier');
    }

    this.updatePanelSelector();
    this.pushHistoryState(true);
    this.render();

    // Expose app controller for headless tests and verification
    window.__NEON_COAST__ = {
      app: this,
      state: this.state,
      renderer: this.renderer,
      exportPreset,
      exportAllPresets,
      renderToCanvas
    };
  }

  setupUI() {
    // Sync UI elements with initial state
    document.getElementById('input-title').value = this.state.captions.title;
    document.getElementById('input-subtitle').value = this.state.captions.subtitle;
    document.getElementById('input-badge').value = this.state.captions.badge;

    document.getElementById('toggle-badge').checked = this.state.effects.badge;
    document.getElementById('toggle-grain').checked = this.state.effects.grain;
    document.getElementById('toggle-vignette').checked = this.state.effects.vignette;

    this.updateActiveLayoutBtn();
    this.updateActiveGradeBtn();
    this.updateStarsUI();
  }

  setupEventListeners() {
    // 1. Layout Selection
    const layoutContainer = document.getElementById('layout-options');
    layoutContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-layout]');
      if (!btn) return;
      const layoutId = btn.dataset.layout;
      if (LAYOUTS[layoutId]) {
        this.state.layout = layoutId;
        this.state.activePanel = 0;
        this.updateActiveLayoutBtn();
        this.updatePanelSelector();
        this.updateTransformSliders();
        this.pushHistoryState();
        this.render();
      }
    });

    // 2. Grade Selection
    const gradeContainer = document.getElementById('grade-options');
    gradeContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-grade]');
      if (!btn) return;
      const gradeId = btn.dataset.grade;
      if (GRADES[gradeId]) {
        this.state.grade = gradeId;
        this.updateActiveGradeBtn();
        this.pushHistoryState();
        this.render();
      }
    });

    // 3. Captions
    const inputTitle = document.getElementById('input-title');
    inputTitle.addEventListener('input', (e) => {
      this.state.captions.title = e.target.value;
      this.render();
    });
    inputTitle.addEventListener('change', () => this.pushHistoryState());

    const inputSubtitle = document.getElementById('input-subtitle');
    inputSubtitle.addEventListener('input', (e) => {
      this.state.captions.subtitle = e.target.value;
      this.render();
    });
    inputSubtitle.addEventListener('change', () => this.pushHistoryState());

    const inputBadge = document.getElementById('input-badge');
    inputBadge.addEventListener('input', (e) => {
      this.state.captions.badge = e.target.value;
      this.render();
    });
    inputBadge.addEventListener('change', () => this.pushHistoryState());

    // 4. Panel Adjustment Sliders
    const sliderZoom = document.getElementById('slider-zoom');
    sliderZoom.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('label-zoom-val').textContent = `${val}%`;
      const t = this.getOrCreateTransform(this.state.activePanel);
      t.zoom = val / 100;
      this.render();
    });
    sliderZoom.addEventListener('change', () => this.pushHistoryState());

    const sliderPanX = document.getElementById('slider-pan-x');
    sliderPanX.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('label-pan-x-val').textContent = val;
      const t = this.getOrCreateTransform(this.state.activePanel);
      t.panX = val;
      this.render();
    });
    sliderPanX.addEventListener('change', () => this.pushHistoryState());

    const sliderPanY = document.getElementById('slider-pan-y');
    sliderPanY.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      document.getElementById('label-pan-y-val').textContent = val;
      const t = this.getOrCreateTransform(this.state.activePanel);
      t.panY = val;
      this.render();
    });
    sliderPanY.addEventListener('change', () => this.pushHistoryState());

    // 5. Canvas Drag to Pan & Wheel to Zoom
    this.canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.canvas.classList.add('dragging');
      this.canvas.setPointerCapture(e.pointerId);

      this.dragStart = { x: e.clientX, y: e.clientY };
      const t = this.getOrCreateTransform(this.state.activePanel);
      this.initialPan = { x: t.panX, y: t.panY };
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const dx = (e.clientX - this.dragStart.x) * scaleX;
      const dy = (e.clientY - this.dragStart.y) * scaleY;

      const t = this.getOrCreateTransform(this.state.activePanel);
      t.panX = Math.round(this.initialPan.x + dx);
      t.panY = Math.round(this.initialPan.y + dy);

      this.updateTransformSliders();
      this.render();
    });

    const stopDrag = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.classList.remove('dragging');
        try { this.canvas.releasePointerCapture(e.pointerId); } catch (_) {}
        this.pushHistoryState();
      }
    };
    this.canvas.addEventListener('pointerup', stopDrag);
    this.canvas.addEventListener('pointercancel', stopDrag);

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const t = this.getOrCreateTransform(this.state.activePanel);
      const zoomDelta = e.deltaY > 0 ? -0.08 : 0.08;
      t.zoom = Math.max(0.5, Math.min(3.0, t.zoom + zoomDelta));
      this.updateTransformSliders();
      this.render();
    }, { passive: false });

    // 6. Extras: Stars & Toggles
    const starsContainer = document.getElementById('heat-stars');
    starsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-star]');
      if (!btn) return;
      this.state.heatLevel = parseInt(btn.dataset.star, 10);
      this.updateStarsUI();
      this.pushHistoryState();
      this.render();
    });

    document.getElementById('toggle-badge').addEventListener('change', (e) => {
      this.state.effects.badge = e.target.checked;
      this.pushHistoryState();
      this.render();
    });

    document.getElementById('toggle-grain').addEventListener('change', (e) => {
      this.state.effects.grain = e.target.checked;
      this.pushHistoryState();
      this.render();
    });

    document.getElementById('toggle-vignette').addEventListener('change', (e) => {
      this.state.effects.vignette = e.target.checked;
      this.pushHistoryState();
      this.render();
    });

    // 7. Samples & Local Upload
    document.getElementById('btn-sample-pier').addEventListener('click', () => {
      this.loadSamplePhoto('pier');
    });

    document.getElementById('btn-sample-boulevard').addEventListener('click', () => {
      this.loadSamplePhoto('boulevard');
    });

    const fileInput = document.getElementById('input-file');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          this.state.image = img;
          this.resetTransforms();
          this.pushHistoryState();
          this.render();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    // 8. Undo / Redo
    document.getElementById('btn-undo').addEventListener('click', () => this.undo());
    document.getElementById('btn-redo').addEventListener('click', () => this.redo());

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        this.redo();
      }
    });

    // 9. Export Buttons
    document.getElementById('btn-export-1080-square').addEventListener('click', () => {
      exportPreset(this.state, EXPORT_PRESETS[0]);
    });
    document.getElementById('btn-export-1080-story').addEventListener('click', () => {
      exportPreset(this.state, EXPORT_PRESETS[1]);
    });
    document.getElementById('btn-export-1920-land').addEventListener('click', () => {
      exportPreset(this.state, EXPORT_PRESETS[2]);
    });
    document.getElementById('btn-export-all').addEventListener('click', () => {
      exportAllPresets(this.state);
    });
  }

  async handleQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    const photo = params.get('photo');
    const caption = params.get('caption');
    const subtitle = params.get('subtitle');
    const layout = params.get('layout');
    const grade = params.get('grade');

    if (shot === 'cover') {
      document.body.classList.add('shot-cover');
    } else if (shot === 'editor') {
      document.body.classList.add('shot-editor');
    }

    if (layout && LAYOUTS[layout]) {
      this.state.layout = layout;
      this.updateActiveLayoutBtn();
    }

    if (grade && GRADES[grade]) {
      this.state.grade = grade;
      this.updateActiveGradeBtn();
    }

    if (caption) {
      this.state.captions.title = caption;
      document.getElementById('input-title').value = caption;
    }

    if (subtitle) {
      this.state.captions.subtitle = subtitle;
      document.getElementById('input-subtitle').value = subtitle;
    }

    if (photo === 'boulevard') {
      await this.loadSamplePhoto('boulevard');
    } else if (photo === 'pier') {
      await this.loadSamplePhoto('pier');
    }

    // Default pan framing adjustment for full bleed hero shots
    if (this.state.layout === 'full_bleed') {
      const t = this.getOrCreateTransform(0);
      t.panY = 120;
    }
  }

  async loadSamplePhoto(name) {
    const src = name === 'boulevard' ? './samples/boulevard.jpg' : './samples/pier.jpg';
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.state.image = img;
        this.resetTransforms();
        if (this.state.layout === 'full_bleed') {
          const t = this.getOrCreateTransform(0);
          t.panY = 120;
        }
        this.pushHistoryState();
        this.render();
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  getOrCreateTransform(panelId) {
    if (!this.state.panelTransforms[panelId]) {
      this.state.panelTransforms[panelId] = {
        zoom: 1.0,
        panX: 0,
        panY: (this.state.layout === 'full_bleed' && panelId === 0) ? 120 : 0
      };
    }
    return this.state.panelTransforms[panelId];
  }

  resetTransforms() {
    this.state.panelTransforms = {};
  }

  updatePanelSelector() {
    const container = document.getElementById('panel-selector-group');
    if (!container) return;
    container.innerHTML = '';

    const layout = LAYOUTS[this.state.layout] || LAYOUTS.four_grid;
    const count = layout.panelCount;

    for (let i = 0; i < count; i++) {
      const btn = document.createElement('button');
      btn.className = `btn-option ${i === this.state.activePanel ? 'active' : ''}`;
      btn.textContent = `P${i + 1}`;
      btn.dataset.panel = i;
      btn.addEventListener('click', () => {
        this.state.activePanel = i;
        this.updatePanelSelector();
        this.updateTransformSliders();
        this.render();
      });
      container.appendChild(btn);
    }

    document.getElementById('active-panel-num').textContent = this.state.activePanel + 1;
  }

  updateTransformSliders() {
    const t = this.getOrCreateTransform(this.state.activePanel);
    const zoomPct = Math.round(t.zoom * 100);

    const sliderZoom = document.getElementById('slider-zoom');
    sliderZoom.value = zoomPct;
    document.getElementById('label-zoom-val').textContent = `${zoomPct}%`;

    const sliderPanX = document.getElementById('slider-pan-x');
    sliderPanX.value = t.panX;
    document.getElementById('label-pan-x-val').textContent = t.panX;

    const sliderPanY = document.getElementById('slider-pan-y');
    sliderPanY.value = t.panY;
    document.getElementById('label-pan-y-val').textContent = t.panY;
  }

  updateActiveLayoutBtn() {
    document.querySelectorAll('#layout-options button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.layout === this.state.layout);
    });
  }

  updateActiveGradeBtn() {
    document.querySelectorAll('#grade-options button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.grade === this.state.grade);
    });
  }

  updateStarsUI() {
    document.querySelectorAll('#heat-stars button').forEach((btn) => {
      const val = parseInt(btn.dataset.star, 10);
      btn.classList.toggle('active', val <= this.state.heatLevel);
    });
  }

  pushHistoryState(isInitial = false) {
    const snap = JSON.stringify({
      layout: this.state.layout,
      grade: this.state.grade,
      captions: this.state.captions,
      heatLevel: this.state.heatLevel,
      effects: this.state.effects,
      activePanel: this.state.activePanel,
      panelTransforms: this.state.panelTransforms
    });

    if (this.historyIndex >= 0 && this.history[this.historyIndex] === snap) {
      return;
    }

    // Discard any redos
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snap);
    this.historyIndex = this.history.length - 1;

    // Cap history length
    if (this.history.length > 40) {
      this.history.shift();
      this.historyIndex--;
    }

    this.updateUndoRedoBtns();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.applySnapshot(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.applySnapshot(this.history[this.historyIndex]);
    }
  }

  applySnapshot(jsonStr) {
    const data = JSON.parse(jsonStr);
    this.state.layout = data.layout;
    this.state.grade = data.grade;
    this.state.captions = data.captions;
    this.state.heatLevel = data.heatLevel;
    this.state.effects = data.effects;
    this.state.activePanel = data.activePanel;
    this.state.panelTransforms = data.panelTransforms;

    this.setupUI();
    this.updatePanelSelector();
    this.updateTransformSliders();
    this.updateUndoRedoBtns();
    this.render();
  }

  updateUndoRedoBtns() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    if (btnUndo) btnUndo.disabled = this.historyIndex <= 0;
    if (btnRedo) btnRedo.disabled = this.historyIndex >= this.history.length - 1;
  }

  render() {
    const isShotCover = document.body.classList.contains('shot-cover');
    this.renderer.render(this.state, {
      isExport: isShotCover,
      activePanel: this.state.activePanel
    });
  }
}

// Start application once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new NeonCoastApp();
});
