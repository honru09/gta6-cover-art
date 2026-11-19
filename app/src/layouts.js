/**
 * Neon Coast Cover Studio - Layouts
 * 6 switchable cover art poster layouts with responsive geometry and clipping.
 */

export const LAYOUTS = {
  four_grid: {
    id: 'four_grid',
    name: '4-Panel Grid',
    panelCount: 4,
    titleStyle: 'bottom_banner',
    getPanels(width, height) {
      const margin = 14;
      const gap = 12;
      const colW = (width - margin * 2 - gap) / 2;
      const rowH = (height - margin * 2 - gap) / 2;

      return [
        { id: 0, x: margin, y: margin, w: colW, h: rowH },
        { id: 1, x: margin + colW + gap, y: margin, w: colW, h: rowH },
        { id: 2, x: margin, y: margin + rowH + gap, w: colW, h: rowH },
        { id: 3, x: margin + colW + gap, y: margin + rowH + gap, w: colW, h: rowH }
      ];
    }
  },

  hero_three: {
    id: 'hero_three',
    name: 'Hero & Three',
    panelCount: 4,
    titleStyle: 'bottom_banner',
    getPanels(width, height) {
      const margin = 14;
      const gap = 12;
      const heroW = (width - margin * 2 - gap) * 0.62;
      const sideW = (width - margin * 2 - gap) * 0.38;
      const sideH = (height - margin * 2 - gap * 2) / 3;
      const totalH = height - margin * 2;

      return [
        { id: 0, x: margin, y: margin, w: heroW, h: totalH }, // Hero left
        { id: 1, x: margin + heroW + gap, y: margin, w: sideW, h: sideH },
        { id: 2, x: margin + heroW + gap, y: margin + sideH + gap, w: sideW, h: sideH },
        { id: 3, x: margin + heroW + gap, y: margin + (sideH + gap) * 2, w: sideW, h: sideH }
      ];
    }
  },

  full_bleed: {
    id: 'full_bleed',
    name: 'Full Bleed',
    panelCount: 1,
    titleStyle: 'lower_third',
    getPanels(width, height) {
      return [
        { id: 0, x: 0, y: 0, w: width, h: height }
      ];
    }
  },

  nine_grid: {
    id: 'nine_grid',
    name: '9-Panel Grid',
    panelCount: 8,
    titleStyle: 'center_card',
    getPanels(width, height) {
      const margin = 12;
      const gap = 10;
      const colW = (width - margin * 2 - gap * 2) / 3;
      const rowH = (height - margin * 2 - gap * 2) / 3;

      const panels = [];
      let photoPanelId = 0;

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const x = margin + c * (colW + gap);
          const y = margin + r * (rowH + gap);

          if (r === 1 && c === 1) {
            // Center cell is the dedicated Title Card
            continue;
          }

          panels.push({
            id: photoPanelId++,
            x,
            y,
            w: colW,
            h: rowH
          });
        }
      }

      return panels;
    },
    getCenterCard(width, height) {
      const margin = 12;
      const gap = 10;
      const colW = (width - margin * 2 - gap * 2) / 3;
      const rowH = (height - margin * 2 - gap * 2) / 3;
      return {
        x: margin + (colW + gap),
        y: margin + (rowH + gap),
        w: colW,
        h: rowH
      };
    }
  },

  tilted_snapshot: {
    id: 'tilted_snapshot',
    name: 'Tilted Snapshot',
    panelCount: 3,
    titleStyle: 'bottom_banner',
    getPanels(width, height) {
      const cardW = width * 0.52;
      const cardH = height * 0.48;

      return [
        // Snapshot 0 - top-left, rotated counter-clockwise
        {
          id: 0,
          cx: width * 0.32,
          cy: height * 0.32,
          w: cardW,
          h: cardH,
          rotation: -0.10,
          isTilted: true
        },
        // Snapshot 1 - top-right, rotated clockwise
        {
          id: 1,
          cx: width * 0.70,
          cy: height * 0.38,
          w: cardW * 0.94,
          h: cardH * 0.94,
          rotation: 0.08,
          isTilted: true
        },
        // Snapshot 2 - center/bottom, slight tilt
        {
          id: 2,
          cx: width * 0.48,
          cy: height * 0.58,
          w: cardW * 1.05,
          h: cardH * 1.05,
          rotation: -0.03,
          isTilted: true
        }
      ];
    }
  },

  story_strip: {
    id: 'story_strip',
    name: 'Story Strip',
    panelCount: 3,
    titleStyle: 'bottom_banner',
    getPanels(width, height) {
      const marginX = width * 0.06;
      const stripW = width - marginX * 2;
      const stripH = height * 0.22;
      const gapY = height * 0.035;
      const startY = height * 0.08;

      return [
        { id: 0, x: marginX, y: startY, w: stripW, h: stripH },
        { id: 1, x: marginX, y: startY + stripH + gapY, w: stripW, h: stripH },
        { id: 2, x: marginX, y: startY + (stripH + gapY) * 2, w: stripW, h: stripH }
      ];
    }
  }
};
