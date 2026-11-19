/**
 * Neon Coast Cover Studio - Canvas 2D Renderer
 * Renders multi-panel layouts, color grading, Anton sunset lettering, Pacifico neon script,
 * wanted heat stars, badge ribbons, grain, and vignette.
 */

import { LAYOUTS } from './layouts.js';
import { GRADES } from './grades.js';

let fontLoadingPromise = null;

export async function loadEmbeddedFonts() {
  if (fontLoadingPromise) {
    return fontLoadingPromise;
  }
  fontLoadingPromise = (async () => {
    try {
      const res = await fetch('./fonts/fonts.json');
      const data = await res.json();

      const antonFace = new FontFace('Anton', 'url(data:font/woff2;base64,' + data.Anton + ')');
      const pacificoFace = new FontFace('Pacifico', 'url(data:font/woff2;base64,' + data.Pacifico + ')');

      document.fonts.add(antonFace);
      document.fonts.add(pacificoFace);

      await Promise.all([antonFace.load(), pacificoFace.load()]);

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }
    } catch (err) {
      console.error('Failed to load embedded fonts:', err);
    }
  })();
  return fontLoadingPromise;
}

export class CoverRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.fontsLoaded = false;
  }

  async initFonts() {
    await loadEmbeddedFonts();
    this.fontsLoaded = true;
  }

  render(state, options = {}) {
    const { isExport = false, activePanel = 0 } = options;
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    // 1. Base Canvas Clear & Background
    ctx.save();
    ctx.fillStyle = '#0b0914';
    ctx.fillRect(0, 0, width, height);

    // Subtle neon ambient glow in background
    const bgGlow = ctx.createRadialGradient(
      width * 0.5, height * 0.45, width * 0.1,
      width * 0.5, height * 0.5, width * 0.75
    );
    bgGlow.addColorStop(0, 'rgba(255, 42, 133, 0.12)');
    bgGlow.addColorStop(0.6, 'rgba(0, 240, 255, 0.05)');
    bgGlow.addColorStop(1, 'rgba(11, 9, 20, 0.95)');
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 2. Layout & Panels
    const layout = LAYOUTS[state.layout] || LAYOUTS.four_grid;
    const panels = layout.getPanels(width, height);

    // Render photo into each panel
    panels.forEach((panel) => {
      this.renderPanelPhoto(panel, state);
    });

    // 3. Panel Borders & Dividers
    this.renderPanelBorders(panels, layout, state);

    // 4. Color Grade (applied to photo compositions)
    const grade = GRADES[state.grade] || GRADES.sunset;
    const imgData = ctx.getImageData(0, 0, width, height);
    grade.apply(imgData);
    ctx.putImageData(imgData, 0, 0);

    // 5. Film Grain Effect
    if (state.effects && state.effects.grain) {
      this.applyGrain(ctx, width, height);
    }

    // 6. Vignette Falloff
    if (state.effects && state.effects.vignette) {
      this.applyVignette(ctx, width, height);
    }

    // 7. Center Card for 9-Panel Layout
    if (layout.id === 'nine_grid' && layout.getCenterCard) {
      const centerCard = layout.getCenterCard(width, height);
      this.renderCenterTitleCard(centerCard, state);
    } else {
      // 8. Typography & Title Banner for other layouts
      this.renderTitleBanner(layout, state);
    }

    // 9. Badge Ribbon
    if (state.effects && state.effects.badge && state.captions.badge) {
      this.renderBadgeRibbon(state.captions.badge);
    }

    // 10. Editor Active Panel Highlight
    if (!isExport && panels.length > 1) {
      const active = panels.find(p => p.id === activePanel);
      if (active) {
        this.renderActivePanelHighlight(active);
      }
    }
  }

  renderPanelPhoto(panel, state) {
    const ctx = this.ctx;
    const img = state.image;
    if (!img || !img.complete || img.naturalWidth === 0) return;

    ctx.save();

    // Panel transform / clipping
    if (panel.isTilted) {
      ctx.translate(panel.cx, panel.cy);
      ctx.rotate(panel.rotation);
      // Photo frame area inside polaroid border
      const photoW = panel.w * 0.88;
      const photoH = panel.h * 0.76;
      const photoY = -panel.h * 0.08;

      ctx.beginPath();
      ctx.rect(-photoW / 2, photoY - photoH / 2, photoW, photoH);
      ctx.clip();
      this.drawTransformedImage(img, -photoW / 2, photoY - photoH / 2, photoW, photoH, state, panel.id);
    } else {
      ctx.beginPath();
      ctx.rect(panel.x, panel.y, panel.w, panel.h);
      ctx.clip();
      this.drawTransformedImage(img, panel.x, panel.y, panel.w, panel.h, state, panel.id);
    }

    ctx.restore();
  }

  drawTransformedImage(img, x, y, w, h, state, panelId) {
    const ctx = this.ctx;
    const defaultPanY = (state.layout === 'full_bleed' && panelId === 0) ? 140 : 0;
    const transform = (state.panelTransforms && state.panelTransforms[panelId]) || {
      zoom: 1.0,
      panX: 0,
      panY: defaultPanY
    };

    // Calculate aspect fill
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const panelAspect = w / h;

    let baseW, baseH;
    if (imgAspect > panelAspect) {
      baseH = h;
      baseW = h * imgAspect;
    } else {
      baseW = w;
      baseH = w / imgAspect;
    }

    const scale = Math.max(0.2, transform.zoom);
    const finalW = baseW * scale;
    const finalH = baseH * scale;

    const centerX = x + w / 2;
    const centerY = y + h / 2;

    const drawX = centerX - finalW / 2 + transform.panX;
    const drawY = centerY - finalH / 2 + transform.panY;

    ctx.drawImage(img, drawX, drawY, finalW, finalH);
  }

  renderPanelBorders(panels, layout, state) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    if (layout.id === 'tilted_snapshot') {
      panels.forEach((p) => {
        ctx.save();
        ctx.translate(p.cx, p.cy);
        ctx.rotate(p.rotation);

        // Snapshot Polaroid frame
        const pw = p.w;
        const ph = p.h;

        // Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 25;
        ctx.shadowOffsetY = 12;

        // White/cream card
        ctx.fillStyle = '#faf8f5';
        ctx.fillRect(-pw / 2, -ph / 2, pw, ph);

        // Reset shadow
        ctx.shadowColor = 'transparent';

        // Inner border around photo
        const photoW = pw * 0.88;
        const photoH = ph * 0.76;
        const photoY = -ph * 0.08;
        ctx.strokeStyle = '#2b233a';
        ctx.lineWidth = 2;
        ctx.strokeRect(-photoW / 2, photoY - photoH / 2, photoW, photoH);

        // Bottom neon accent dot or line
        ctx.fillStyle = 'rgba(255, 42, 133, 0.7)';
        ctx.fillRect(-pw * 0.15, ph * 0.36, pw * 0.3, 4);

        ctx.restore();
      });
      return;
    }

    if (layout.id === 'full_bleed') {
      // Solid outer border
      ctx.strokeStyle = '#100c1e';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, width - 8, height - 8);
      return;
    }

    // Grid & Strip borders
    panels.forEach((p) => {
      ctx.save();
      // Outer dark border
      ctx.strokeStyle = '#0d0b16';
      ctx.lineWidth = 6;
      ctx.strokeRect(p.x, p.y, p.w, p.h);

      // Subtle inner neon glow
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);
      ctx.restore();
    });
  }

  applyGrain(ctx, width, height) {
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 128;
    grainCanvas.height = 128;
    const gCtx = grainCanvas.getContext('2d');
    const gData = gCtx.createImageData(128, 128);
    const d = gData.data;

    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 22; // subtle opacity
    }
    gCtx.putImageData(gData, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const pattern = ctx.createPattern(grainCanvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  applyVignette(ctx, width, height) {
    ctx.save();
    const rad = Math.max(width, height) * 0.75;
    const vig = ctx.createRadialGradient(
      width * 0.5, height * 0.5, rad * 0.35,
      width * 0.5, height * 0.5, rad
    );
    vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vig.addColorStop(0.7, 'rgba(8, 6, 16, 0.45)');
    vig.addColorStop(1, 'rgba(4, 3, 10, 0.88)');

    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  renderTitleBanner(layout, state) {
    const ctx = this.ctx;
    const { width, height } = this.canvas;
    const scale = width / 1080;

    const bannerW = width * 0.88;
    const bannerH = 194 * scale;
    const bannerX = (width - bannerW) / 2;
    // Lower third position
    const bannerY = (layout.id === 'story_strip')
      ? height * 0.74
      : height * 0.75;

    ctx.save();

    // 1. Dark frosted backing card for clear text separation
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 30 * scale;
    ctx.shadowOffsetY = 10 * scale;

    ctx.fillStyle = 'rgba(12, 10, 24, 0.90)';
    this.roundRect(ctx, bannerX, bannerY, bannerW, bannerH, 16 * scale);
    ctx.fill();

    // Neon Card Border
    ctx.strokeStyle = 'rgba(255, 42, 133, 0.65)';
    ctx.lineWidth = 2.5 * scale;
    ctx.stroke();

    // Subtle Cyan Corner Accents
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3 * scale;
    const cornerSize = 18 * scale;
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(bannerX, bannerY + cornerSize);
    ctx.lineTo(bannerX, bannerY);
    ctx.lineTo(bannerX + cornerSize, bannerY);
    ctx.stroke();
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(bannerX + bannerW - cornerSize, bannerY);
    ctx.lineTo(bannerX + bannerW, bannerY);
    ctx.lineTo(bannerX + bannerW, bannerY + cornerSize);
    ctx.stroke();
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(bannerX, bannerY + bannerH - cornerSize);
    ctx.lineTo(bannerX, bannerY + bannerH);
    ctx.lineTo(bannerX + cornerSize, bannerY + bannerH);
    ctx.stroke();
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(bannerX + bannerW - cornerSize, bannerY + bannerH);
    ctx.lineTo(bannerX + bannerW, bannerY + bannerH);
    ctx.lineTo(bannerX + bannerW, bannerY + bannerH - cornerSize);
    ctx.stroke();

    ctx.restore();

    const centerX = width / 2;
    const centerY = bannerY + bannerH / 2;

    // 2. Heat Meter (Stars) - top line
    const heatStars = state.heatLevel || 5;
    const starY = centerY - 54 * scale;
    this.drawStarRating(ctx, centerX, starY, heatStars, 5, 11 * scale);

    // 3. Anton Title - middle line (sunset gradient + glow)
    const titleText = (state.captions.title || 'SUNSET HEIST').toUpperCase();
    const titleFontSize = Math.round(58 * scale);
    ctx.font = `900 ${titleFontSize}px 'Anton', 'Impact', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleY = centerY - 6 * scale;

    // Title gradient fill
    const grad = ctx.createLinearGradient(0, titleY - titleFontSize * 0.5, 0, titleY + titleFontSize * 0.5);
    grad.addColorStop(0.0, '#fff677');
    grad.addColorStop(0.35, '#ff8c00');
    grad.addColorStop(0.75, '#ff1a75');
    grad.addColorStop(1.0, '#9d12c9');

    // Title drop shadow & glow
    ctx.save();
    ctx.shadowColor = 'rgba(255, 42, 133, 0.85)';
    ctx.shadowBlur = 18 * scale;
    ctx.shadowOffsetY = 4 * scale;

    // Stroke
    ctx.lineWidth = 8 * scale;
    ctx.strokeStyle = '#0a0815';
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;
    ctx.strokeText(titleText, centerX, titleY);

    // Fill
    ctx.fillStyle = grad;
    ctx.fillText(titleText, centerX, titleY);
    ctx.restore();

    // 4. Pacifico Subtitle - neon cursive script on bottom line
    const subtitleText = state.captions.subtitle || 'Vice City Nights';
    if (subtitleText.trim()) {
      const subFontSize = Math.round(30 * scale);
      ctx.font = `400 ${subFontSize}px 'Pacifico', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const subY = centerY + 52 * scale;

      ctx.save();
      // Glowing neon cyan effect
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 14 * scale;

      ctx.lineWidth = 4 * scale;
      ctx.strokeStyle = '#051824';
      ctx.strokeText(subtitleText, centerX, subY);

      ctx.fillStyle = '#baf7ff';
      ctx.fillText(subtitleText, centerX, subY);
      ctx.restore();
    }

    ctx.restore();
  }

  renderCenterTitleCard(card, state) {
    const ctx = this.ctx;
    const { x, y, w, h } = card;
    const scale = w / 340;

    ctx.save();
    // Solid dark backdrop
    ctx.fillStyle = '#0f0c1e';
    ctx.fillRect(x, y, w, h);

    // Border with neon pink accent
    ctx.strokeStyle = 'rgba(255, 42, 133, 0.85)';
    ctx.lineWidth = 4 * scale;
    ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

    // Subtle inner cyan frame
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeRect(x + 8 * scale, y + 8 * scale, w - 16 * scale, h - 16 * scale);

    const centerX = x + w / 2;
    const centerY = y + h / 2;

    // 1. Stars at top
    const heatStars = state.heatLevel || 5;
    const starY = centerY - h * 0.28;
    this.drawStarRating(ctx, centerX, starY, heatStars, 5, 8 * scale);

    // 2. Anton Title
    const titleText = (state.captions.title || 'SUNSET HEIST').toUpperCase();
    const titleFontSize = Math.round(Math.min(38 * scale, (w - 20) / (titleText.length * 0.65)));
    ctx.font = `900 ${titleFontSize}px 'Anton', 'Impact', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const titleY = centerY - 4 * scale;

    const grad = ctx.createLinearGradient(0, titleY - titleFontSize * 0.5, 0, titleY + titleFontSize * 0.5);
    grad.addColorStop(0.0, '#fff677');
    grad.addColorStop(0.4, '#ff8c00');
    grad.addColorStop(0.8, '#ff1a75');
    grad.addColorStop(1.0, '#9d12c9');

    ctx.save();
    ctx.shadowColor = 'rgba(255, 42, 133, 0.9)';
    ctx.shadowBlur = 12 * scale;
    ctx.lineWidth = 6 * scale;
    ctx.strokeStyle = '#090714';
    ctx.strokeText(titleText, centerX, titleY);

    ctx.fillStyle = grad;
    ctx.fillText(titleText, centerX, titleY);
    ctx.restore();

    // 3. Subtitle
    const subtitleText = state.captions.subtitle || 'Vice City Nights';
    if (subtitleText.trim()) {
      const subFontSize = Math.round(22 * scale);
      ctx.font = `400 ${subFontSize}px 'Pacifico', cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const subY = centerY + h * 0.26;

      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10 * scale;
      ctx.lineWidth = 3 * scale;
      ctx.strokeStyle = '#051824';
      ctx.strokeText(subtitleText, centerX, subY);

      ctx.fillStyle = '#c5f9ff';
      ctx.fillText(subtitleText, centerX, subY);
      ctx.restore();
    }

    ctx.restore();
  }

  drawStarRating(ctx, cx, cy, activeCount, total = 5, size = 10) {
    const spacing = size * 2.5;
    const startX = cx - ((total - 1) * spacing) / 2;

    for (let i = 0; i < total; i++) {
      const x = startX + i * spacing;
      const isActive = i < activeCount;
      this.drawStar(ctx, x, cy, 5, size, size * 0.45, isActive);
    }
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, isActive) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();

    if (isActive) {
      ctx.shadowColor = 'rgba(255, 183, 3, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffb703';
      ctx.fill();

      ctx.strokeStyle = '#fff199';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#2c2545';
      ctx.fill();
      ctx.strokeStyle = '#433b66';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  renderBadgeRibbon(text) {
    const ctx = this.ctx;
    const { width } = this.canvas;
    const scale = width / 1080;

    // Corner badge at top right
    const ribbonW = 280 * scale;
    const ribbonH = 34 * scale;

    ctx.save();
    ctx.translate(width - 95 * scale, 95 * scale);
    ctx.rotate(Math.PI / 4); // 45 degrees

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10 * scale;
    ctx.shadowOffsetY = 4 * scale;

    // Gradient background
    const grad = ctx.createLinearGradient(-ribbonW / 2, 0, ribbonW / 2, 0);
    grad.addColorStop(0, '#ff1a75');
    grad.addColorStop(0.5, '#ff8c00');
    grad.addColorStop(1, '#ff1a75');

    ctx.fillStyle = grad;
    ctx.fillRect(-ribbonW / 2, -ribbonH / 2, ribbonW, ribbonH);

    // Border lines
    ctx.strokeStyle = '#ffe894';
    ctx.lineWidth = 1.5 * scale;
    ctx.strokeRect(-ribbonW / 2, -ribbonH / 2, ribbonW, ribbonH);

    // Text
    ctx.shadowColor = 'transparent';
    ctx.font = `800 ${Math.round(13 * scale)}px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '1.5px';
    ctx.fillText(text.toUpperCase(), 0, 0);

    ctx.restore();
  }

  renderActivePanelHighlight(panel) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);

    if (panel.isTilted) {
      ctx.translate(panel.cx, panel.cy);
      ctx.rotate(panel.rotation);
      ctx.strokeRect(-panel.w / 2, -panel.h / 2, panel.w, panel.h);
    } else {
      ctx.strokeRect(panel.x, panel.y, panel.w, panel.h);
    }
    ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
