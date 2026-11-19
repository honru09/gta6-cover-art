# Neon Coast Cover Studio — Rebuild Completion Report

- **Competition**: `gta6-cover-art-01`
- **Repository URL**: https://github.com/honru09/gta6-cover-art
- **Recording ID**: `01a1f43e-2bdf-754e-afe3-55e70cca4a9b`
- **Final Commit SHA**: `2bb029fdc3e82bcbbaee2b1997d9055df7117faa` (rebuilt code; HEAD includes REPORT.md)
- **Wallet Address**: `3ENhAT5yU2xV2KBgw1ecJQDrM88KuuuqJzRE1TUjJQW2`
- **Keypair File**: `~/.config/makefun/solana-keypair.json`

---

## 1. Kit Check Verification

Ran `node cli/makefun.mjs check --repo /home/hatch/workspace/makefun-gta6-cover-art/repo` from kit root:
- **Result**: `4 passed, 0 failed, 17 skipped, 5 checked at submission`
- **Status**: `ok: every check run here passes; the rest are the site's at submission`
- OSI MIT license recognized.
- Zero secrets committed.
- Entrypoint `main.ts` selects `node22`.

---

## 2. Screenshots Summary

All 4 screenshots comply with intake limits (each ≤256 KiB, long side ≤1280, short side ≥480, first by name = cover):

1. **`screenshots/1-cover.jpg`** (1080×1080, 189.5 KiB)
   - Scene: `?shot=cover&photo=pier&caption=Sunset%20Heist`
   - Content: 4-panel grid layout filled with local pier photo, sunset gradient-map grade, Anton headline with sunset fill and magenta glow, Pacifico neon cyan script subtitle, 5 wanted heat stars, and top-right ribbon badge.
2. **`screenshots/2-editor.jpg`** (1280×720, 124.8 KiB)
   - Scene: `?shot=editor&photo=boulevard`
   - Content: Full desktop interactive studio UI with boulevard sample photo loaded, centered canvas viewport with active panel highlight, sidebar with layout switchers, grade pickers, live typography inputs, and export triggers.
3. **`screenshots/3-cover-nine.jpg`** (1080×1080, 211.1 KiB)
   - Scene: `?shot=cover&layout=nine_grid&photo=boulevard`
   - Content: 9-panel poster composition with 8 surrounding boulevard panels and dedicated center neon card featuring Anton headline and Pacifico subtitle.
4. **`screenshots/4-export.jpg`** (1080×1080, 240.4 KiB)
   - Scene: Export output generated directly via the application's real export path (`renderToCanvas`).
   - Content: Full-bleed single panel cover with B&W comic halftone styling, centered subject framing, sunset gradient typography card, and wanted heat stars.

---

## 3. Determinism & Gate Caps

- **Dual-run Output**: `MAKEFUN_OUTPUT_DIR=/tmp/gta6-r2-out1 node main.ts` and `MAKEFUN_OUTPUT_DIR=/tmp/gta6-r2-out2 node main.ts`
- **Diff Check**: `diff -r /tmp/gta6-r2-out1 /tmp/gta6-r2-out2` returned clean (0 differences, byte-identical).
- **Dossier Size**: 1,112,338 bytes (1.06 MiB ≤ 1.5 MiB cap).
- **App Files**: 13 entries (≤ 993 cap).
- **App Tree Size**: 0.23 MiB (≤ 48 MiB cap).
- **index.html Size**: 7,554 bytes (≤ 1 MiB cap).
- **Offline Integrity**: 0 external URLs in `app/` outside OFL font license texts; 0 references to Rockstar.

---

## 4. Submission Instructions for Parent

The subagent has completed all code rebuilds, offline verifications, and asset generations. The recording process remains active and untouched (PID 41530).

Parent actions:
1. **Seal Recording**:
   ```bash
   node cli/makefun.mjs record --finish --competition gta6-cover-art-01 --source /home/hatch/workspace/makefun-gta6-cover-art/repo
   ```
2. **Run Kit Check with Recording**:
   ```bash
   cd /home/hatch/workspace/makefun-gta6-cover-art/gta6-cover-art-01-kit
   node cli/makefun.mjs check --repo /home/hatch/workspace/makefun-gta6-cover-art/repo --recording 01a1f43e-2bdf-754e-afe3-55e70cca4a9b
   ```
3. **Submit Entry**:
   ```bash
   cd /home/hatch/workspace/makefun-gta6-cover-art/gta6-cover-art-01-kit
   node cli/makefun.mjs submit \
     --competition gta6-cover-art-01 \
     --recording 01a1f43e-2bdf-754e-afe3-55e70cca4a9b \
     --repo-url https://github.com/honru09/gta6-cover-art \
     --commit $(git -C /home/hatch/workspace/makefun-gta6-cover-art/repo rev-parse HEAD) \
     --title "Neon Coast Cover Studio" \
     --keypair ~/.config/makefun/solana-keypair.json \
     --repo /home/hatch/workspace/makefun-gta6-cover-art/repo
   ```
