/**
 * Canvas 2D rendering engine for Neon Coast Cover Studio.
 * Renders multi-panel GTA 6-style cover art posters with authentic typography and effects.
 */

import { computeLayout } from './layouts.js';
import { applyGrade } from './grades.js';

/**
 * Draws a 5-point star on the canvas context.
 */
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

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
}

/**
 * Renders the full cover art composition onto the target canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {object} state
 */
export function renderCover(canvas, state) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const W = canvas.width;
  const H = canvas.height;
  const scale = W / 1080; // Base scale reference against 1080px square

  // 1. Dark foundational background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  // 2. Compute Layout Geometries
  const layoutData = computeLayout(state.layout || 'four_panel', W, H);

  // Draw background palm/neon atmosphere if tilted snapshot
  if (state.layout === 'tilted_snapshot') {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#120a1f');
    bgGrad.addColorStop(0.5, '#240b36');
    bgGrad.addColorStop(1, '#0c0714');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Subtle retro grid lines
    ctx.strokeStyle = 'rgba(255, 42, 109, 0.12)';
    ctx.lineWidth = 2 * scale;
    const gridStep = 45 * scale;
    for (let gy = 0; gy < H; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }
  }

  // 3. Render Each Panel
  const photo = state.photo;
  if (layoutData.panels) {
    layoutData.panels.forEach((p, idx) => {
      ctx.save();

      // Handle tilted snapshots
      if (p.angle) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.translate(-p.w / 2, -p.h / 2);

        // Polaroid card drop shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 24 * scale;
        ctx.shadowOffsetX = 6 * scale;
        ctx.shadowOffsetY = 12 * scale;
        ctx.fillStyle = '#f8f8fa';
        ctx.fillRect(-8 * scale, -8 * scale, p.w + 16 * scale, p.h + 40 * scale);
        ctx.shadowColor = 'transparent';

        // Clip image area
        ctx.beginPath();
        ctx.rect(0, 0, p.w, p.h);
        ctx.clip();
      } else {
        // Standard comic panel clip
        ctx.beginPath();
        ctx.rect(p.x, p.y, p.w, p.h);
        ctx.clip();
      }

      // Draw photo with pan & zoom
      if (photo && photo.complete && photo.naturalWidth > 0) {
        // Dynamic multi-angle crops per panel for authentic comic poster feel
        const defaultOffsets = [
          { panX: -45, panY: -35, zoom: 1.4 },  // Close-up portrait
          { panX: 65, panY: -15, zoom: 1.15 },  // Scene / horizon
          { panX: -30, panY: 70, zoom: 1.55 },  // Action / hands
          { panX: 40, panY: 55, zoom: 1.05 },   // Scenery
          { panX: 0, panY: -50, zoom: 1.5 },
          { panX: 50, panY: 30, zoom: 1.2 },
          { panX: -60, panY: 20, zoom: 1.35 },
          { panX: 20, panY: -40, zoom: 1.25 },
        ];
        let def = defaultOffsets[idx % defaultOffsets.length];
        if (state.layout === 'story_strip') {
          if (idx === 0) def = { panX: 0, panY: 90, zoom: 1.25 };
          else if (idx === 1) def = { panX: 0, panY: 0, zoom: 1.15 };
          else def = { panX: 0, panY: -90, zoom: 1.25 };
        }

        const userOffset = state.panelOffsets && state.panelOffsets[p.id];
        const zoom = Math.max(0.5, Math.min(3, (userOffset ? userOffset.zoom : def.zoom)));
        const panX = ((userOffset ? userOffset.panX : def.panX) || 0) * scale;
        const panY = ((userOffset ? userOffset.panY : def.panY) || 0) * scale;

        // Cover aspect fill
        const imgAspect = photo.naturalWidth / photo.naturalHeight;
        const panelAspect = p.w / p.h;

        let drawW, drawH;
        if (imgAspect > panelAspect) {
          drawH = p.h * zoom;
          drawW = drawH * imgAspect;
        } else {
          drawW = p.w * zoom;
          drawH = drawW / imgAspect;
        }

        const originX = p.angle ? 0 : p.x;
        const originY = p.angle ? 0 : p.y;
        const drawX = originX + (p.w - drawW) / 2 + panX;
        const drawY = originY + (p.h - drawH) / 2 + panY;

        ctx.drawImage(photo, drawX, drawY, drawW, drawH);

        // Apply selected color grade to this panel
        if (state.grade) {
          applyGrade(ctx, state.grade, originX, originY, p.w, p.h);
        }
      } else {
        // Placeholder gradient if photo is not loaded
        const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y + p.h);
        grad.addColorStop(0, '#2d114d');
        grad.addColorStop(1, '#ff2a6d');
        ctx.fillStyle = grad;
        ctx.fillRect(p.angle ? 0 : p.x, p.angle ? 0 : p.y, p.w, p.h);
      }

      ctx.restore();

      // Outer panel frame (thick black border)
      if (!p.angle) {
        ctx.strokeStyle = '#050508';
        ctx.lineWidth = Math.max(4, 7 * scale);
        ctx.strokeRect(p.x, p.y, p.w, p.h);
      }
    });
  }

  // 4. Center emblem block for nine_panel layout
  if (layoutData.centerEmblem) {
    const e = layoutData.centerEmblem;
    ctx.save();
    ctx.fillStyle = '#0f051d';
    ctx.fillRect(e.x, e.y, e.w, e.h);

    // Neon frame around center block
    const emblemGrad = ctx.createLinearGradient(e.x, e.y, e.x + e.w, e.y + e.h);
    emblemGrad.addColorStop(0, '#ff2a6d');
    emblemGrad.addColorStop(0.5, '#00f5d4');
    emblemGrad.addColorStop(1, '#ffc837');
    ctx.strokeStyle = emblemGrad;
    ctx.lineWidth = 5 * scale;
    ctx.strokeRect(e.x, e.y, e.w, e.h);

    // Palm tree silhouette icon in center
    ctx.fillStyle = 'rgba(255, 42, 109, 0.15)';
    ctx.fillRect(e.x + 8 * scale, e.y + 8 * scale, e.w - 16 * scale, e.h - 16 * scale);
    ctx.restore();
  }

  // 5. Global Vignette
  if (state.vignette > 0) {
    const vRadius = Math.max(W, H) * 0.75;
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, vRadius * 0.35, W / 2, H / 2, vRadius);
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(1, `rgba(5, 2, 12, ${0.75 * state.vignette})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // 6. Global Film Grain
  if (state.grain > 0) {
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 128;
    grainCanvas.height = 128;
    const gCtx = grainCanvas.getContext('2d');
    const gData = gCtx.createImageData(128, 128);
    const d = gData.data;
    const intensity = state.grain * 42;

    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * intensity;
      const v = Math.min(255, Math.max(0, 128 + noise));
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = Math.floor(state.grain * 38);
    }
    gCtx.putImageData(gData, 0, 0);

    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const pattern = ctx.createPattern(grainCanvas, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 7. Badge Ribbon
  if (state.showBadge !== false && state.badgeText) {
    ctx.save();
    const ribbonText = (state.badgeText || 'VICE CITY NIGHTS').toUpperCase();
    const ribbonW = 280 * scale;
    const ribbonH = 34 * scale;
    const ribbonX = 35 * scale;
    const ribbonY = 40 * scale;

    ctx.fillStyle = '#0f051d';
    ctx.fillRect(ribbonX, ribbonY, ribbonW, ribbonH);

    // Gold/Pink neon border
    const borderGrad = ctx.createLinearGradient(ribbonX, ribbonY, ribbonX + ribbonW, ribbonY);
    borderGrad.addColorStop(0, '#ff007f');
    borderGrad.addColorStop(1, '#ffb703');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 2.5 * scale;
    ctx.strokeRect(ribbonX, ribbonY, ribbonW, ribbonH);

    // Text inside badge
    ctx.font = `800 ${14 * scale}px Anton, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ribbonText, ribbonX + ribbonW / 2, ribbonY + ribbonH / 2);
    ctx.restore();
  }

  // 8. Heat Meter (Star Rating Row)
  if (state.stars > 0) {
    ctx.save();
    const starCount = 5;
    const activeStars = Math.min(5, Math.max(1, state.stars || 5));
    const starSize = 16 * scale;
    const starGap = 8 * scale;
    const startX = W - (starCount * (starSize * 2 + starGap) + 30 * scale);
    const startY = 55 * scale;

    for (let s = 0; s < starCount; s++) {
      const cx = startX + s * (starSize * 2 + starGap) + starSize;
      const cy = startY;
      const isActive = s < activeStars;

      if (isActive) {
        ctx.shadowColor = '#ff2a6d';
        ctx.shadowBlur = 10 * scale;
        ctx.fillStyle = '#ffd700'; // Gold star
        ctx.strokeStyle = '#05020a';
        ctx.lineWidth = 2 * scale;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1 * scale;
      }

      drawStar(ctx, cx, cy, 5, starSize, starSize * 0.45);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 9. Lettering: Anton Title + Pacifico Subtitle
  const titleBox = layoutData.titleBox || { x: W / 2, y: H * 0.78, anchor: 'center' };
  const titleText = (state.title || 'NEON SHORE').toUpperCase();
  const subText = state.subtitle || 'Vice City Nights';
  const tagText = state.subcaption || 'DIRECTED BY MAKE.FUN // LEONIDA';

  ctx.save();
  ctx.textAlign = titleBox.anchor || 'center';

  // Compute title font size
  let titleFontSize = Math.round(92 * scale);
  if (state.layout === 'nine_panel') {
    titleFontSize = Math.round(54 * scale);
  } else if (state.layout === 'story_strip') {
    titleFontSize = Math.round(76 * scale);
  }

  // Background banner backing for readability if in grid layouts
  if (state.layout === 'four_panel' || state.layout === 'story_strip' || state.layout === 'hero_three') {
    const bannerW = state.layout === 'hero_three' ? W * 0.92 : W * 0.84;
    const bannerH = 170 * scale;
    const bannerX = (W - bannerW) / 2;
    const bannerY = titleBox.y - bannerH * 0.46;

    ctx.fillStyle = 'rgba(8, 4, 18, 0.92)';
    ctx.fillRect(bannerX, bannerY, bannerW, bannerH);

    const bannerBorder = ctx.createLinearGradient(bannerX, 0, bannerX + bannerW, 0);
    bannerBorder.addColorStop(0, '#ff2a6d');
    bannerBorder.addColorStop(0.5, '#ffd700');
    bannerBorder.addColorStop(1, '#00f5d4');
    ctx.strokeStyle = bannerBorder;
    ctx.lineWidth = 3.5 * scale;
    ctx.strokeRect(bannerX, bannerY, bannerW, bannerH);
  } else if (state.layout === 'full_bleed') {
    const gradH = H * 0.42;
    const grad = ctx.createLinearGradient(0, H - gradH, 0, H);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.5, 'rgba(5, 2, 12, 0.7)');
    grad.addColorStop(1, 'rgba(5, 2, 12, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, H - gradH, W, gradH);
  }

  // Title: Anton font with sunset gradient fill and neon outer glow
  ctx.font = `900 ${titleFontSize}px Anton, sans-serif`;
  ctx.textBaseline = 'middle';

  // Multi-pass neon glow
  ctx.shadowColor = '#ff007f';
  ctx.shadowBlur = 24 * scale;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Heavy dark stroke for crisp contrast against any background
  ctx.strokeStyle = '#05020a';
  ctx.lineWidth = Math.max(6, 12 * scale);
  ctx.lineJoin = 'round';
  ctx.strokeText(titleText, titleBox.x, titleBox.y);

  // Sunset gradient fill
  const titleGrad = ctx.createLinearGradient(0, titleBox.y - titleFontSize / 2, 0, titleBox.y + titleFontSize / 2);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.2, '#fff44f'); // Golden yellow
  titleGrad.addColorStop(0.65, '#ff2a6d'); // Neon magenta
  titleGrad.addColorStop(1, '#7a00ff'); // Deep electric purple
  ctx.fillStyle = titleGrad;
  ctx.fillText(titleText, titleBox.x, titleBox.y);

  // Subtitle: Pacifico cursive neon script angled across or underneath
  if (subText) {
    const subFontSize = Math.round(titleFontSize * 0.44);
    ctx.font = `400 ${subFontSize}px Pacifico, cursive`;

    const subY = titleBox.y + titleFontSize * 0.52;
    const subX = titleBox.x;

    // Outer neon glow pass
    ctx.shadowColor = '#00f5d4'; // Electric neon cyan
    ctx.shadowBlur = 18 * scale;
    ctx.lineWidth = Math.max(3, 5 * scale);
    ctx.strokeStyle = '#020d1a';
    ctx.strokeText(subText, subX, subY);

    // Inner bright neon fill
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subText, subX, subY);
  }

  // Sub-tagline
  if (tagText && state.layout !== 'nine_panel') {
    const tagFontSize = Math.round(13 * scale);
    ctx.font = `700 ${tagFontSize}px sans-serif`;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffcf70';
    ctx.letterSpacing = `${3 * scale}px`;
    const tagY = state.layout === 'four_panel' || state.layout === 'story_strip'
      ? titleBox.y + titleFontSize * 0.72
      : titleBox.y + titleFontSize * 0.92;
    ctx.fillText(tagText.toUpperCase(), titleBox.x, tagY);
  }

  ctx.restore();
}
