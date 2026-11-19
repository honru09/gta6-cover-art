/**
 * Layout geometry definitions for Neon Coast Cover Studio.
 * Computes panel bounds and title coordinates for 6 distinct cover styles.
 */

export const LAYOUTS = {
  four_panel: {
    id: 'four_panel',
    name: '4-Panel Grid',
    description: 'Classic Vice City comic-panel poster with heavy contrast frames',
  },
  hero_three: {
    id: 'hero_three',
    name: 'Hero & Three',
    description: 'Major cinematic portrait panel paired with three action snapshots',
  },
  full_bleed: {
    id: 'full_bleed',
    name: 'Full Bleed',
    description: 'Immersive full-screen visual with atmospheric gradient letterboxing',
  },
  nine_panel: {
    id: 'nine_panel',
    name: 'Nine-Panel Grid',
    description: 'Intense GTA montage mosaic featuring a centered neon emblem block',
  },
  tilted_snapshot: {
    id: 'tilted_snapshot',
    name: 'Tilted Snapshot',
    description: 'Overlapping dynamic angled crime files with drop-shadow depth',
  },
  story_strip: {
    id: 'story_strip',
    name: 'Story Strip',
    description: 'Cinematic widescreen horizontal trilogy with sleek narrative dividers',
  },
};

/**
 * Calculates panel geometries and title placement for a given layout and canvas dimensions.
 * @param {string} layoutId
 * @param {number} width
 * @param {number} height
 * @returns {{ panels: Array<object>, titleBox: object }}
 */
export function computeLayout(layoutId, width, height) {
  const border = Math.max(6, Math.round(width * 0.008));
  const halfBorder = border / 2;

  switch (layoutId) {
    case 'four_panel': {
      const midX = width / 2;
      const midY = height / 2;
      return {
        panels: [
          { id: 'p0', x: border, y: border, w: midX - border * 1.5, h: midY - border * 1.5 },
          { id: 'p1', x: midX + halfBorder, y: border, w: midX - border * 1.5, h: midY - border * 1.5 },
          { id: 'p2', x: border, y: midY + halfBorder, w: midX - border * 1.5, h: midY - border * 1.5 },
          { id: 'p3', x: midX + halfBorder, y: midY + halfBorder, w: midX - border * 1.5, h: midY - border * 1.5 },
        ],
        titleBox: {
          x: width / 2,
          y: height * 0.52,
          anchor: 'center',
          hasCenterBadge: true,
        },
      };
    }

    case 'hero_three': {
      const heroW = Math.round(width * 0.58);
      const sideW = width - heroW - border * 3;
      const sideH = Math.round((height - border * 4) / 3);

      return {
        panels: [
          // Hero panel
          { id: 'hero', x: border, y: border, w: heroW, h: height - border * 2 },
          // 3 side panels
          { id: 'side1', x: border * 2 + heroW, y: border, w: sideW, h: sideH },
          { id: 'side2', x: border * 2 + heroW, y: border * 2 + sideH, w: sideW, h: sideH },
          { id: 'side3', x: border * 2 + heroW, y: border * 3 + sideH * 2, w: sideW, h: height - (border * 3 + sideH * 2) - border },
        ],
        titleBox: {
          x: width / 2,
          y: height * 0.82,
          anchor: 'center',
          hasCenterBadge: false,
        },
      };
    }

    case 'full_bleed': {
      return {
        panels: [
          { id: 'full', x: 0, y: 0, w: width, h: height },
        ],
        titleBox: {
          x: width / 2,
          y: height * 0.78,
          anchor: 'center',
          hasCenterBadge: false,
        },
      };
    }

    case 'nine_panel': {
      const cellW = (width - border * 4) / 3;
      const cellH = (height - border * 4) / 3;
      const panels = [];

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          // Center cell (r=1, c=1) is reserved for emblem/title
          if (r === 1 && c === 1) continue;
          panels.push({
            id: `tile_${r}_${c}`,
            x: border + c * (cellW + border),
            y: border + r * (cellH + border),
            w: cellW,
            h: cellH,
          });
        }
      }

      return {
        panels,
        centerEmblem: {
          x: border + cellW + border,
          y: border + cellH + border,
          w: cellW,
          h: cellH,
        },
        titleBox: {
          x: width / 2,
          y: height / 2 + cellH * 0.08,
          anchor: 'center',
          hasCenterBadge: true,
        },
      };
    }

    case 'tilted_snapshot': {
      const cardW = width * 0.52;
      const cardH = height * 0.52;
      return {
        panels: [
          {
            id: 'tilt_left',
            x: width * 0.28,
            y: height * 0.45,
            w: cardW,
            h: cardH,
            angle: -0.09, // ~ -5 deg
          },
          {
            id: 'tilt_right',
            x: width * 0.72,
            y: height * 0.48,
            w: cardW,
            h: cardH,
            angle: 0.08, // ~ +4.5 deg
          },
          {
            id: 'tilt_hero',
            x: width * 0.5,
            y: height * 0.65,
            w: cardW * 1.04,
            h: cardH * 1.04,
            angle: -0.02,
          },
        ],
        titleBox: {
          x: width / 2,
          y: height * 0.15,
          anchor: 'center',
          hasCenterBadge: false,
        },
      };
    }

    case 'story_strip': {
      const stripH = (height - border * 4) / 3;
      return {
        panels: [
          { id: 'strip_top', x: border, y: border, w: width - border * 2, h: stripH },
          { id: 'strip_mid', x: border, y: border * 2 + stripH, w: width - border * 2, h: stripH },
          { id: 'strip_bot', x: border, y: border * 3 + stripH * 2, w: width - border * 2, h: stripH },
        ],
        titleBox: {
          x: width / 2,
          y: border * 2 + stripH * 1.5,
          anchor: 'center',
          hasCenterBadge: false,
        },
      };
    }

    default:
      return computeLayout('four_panel', width, height);
  }
}
