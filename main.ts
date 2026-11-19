/**
 * Neon Coast Cover Studio - Packaging and Dossier Builder
 * Prepares /output bundle with app/ and screenshots/ and generates dossier.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPackaging(): Promise<void> {
  const targetDir: string = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  const outPath: string = path.resolve(targetDir);

  const appSource: string = path.resolve(__dirname, 'app');
  const appDestination: string = path.join(outPath, 'app');

  const screenshotsSource: string = path.resolve(__dirname, 'screenshots');
  const screenshotsDestination: string = path.join(outPath, 'screenshots');

  // Prepare clean output structure
  if (fs.existsSync(outPath)) {
    fs.rmSync(outPath, { recursive: true, force: true });
  }
  fs.mkdirSync(outPath, { recursive: true });

  // Copy app directory tree
  if (fs.existsSync(appSource)) {
    fs.cpSync(appSource, appDestination, { recursive: true });
  } else {
    throw new Error(`Source app directory missing at: ${appSource}`);
  }

  // Copy screenshots directory tree
  if (fs.existsSync(screenshotsSource)) {
    fs.cpSync(screenshotsSource, screenshotsDestination, { recursive: true });
  } else {
    fs.mkdirSync(screenshotsDestination, { recursive: true });
  }

  // Generate deterministic dossier.json using vendored makefun-app library
  const dossierBytes = buildDossier(outPath, {
    text_max_bytes: 163840,
    screenshots: {
      max: 4,
      max_bytes: 262144
    },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000
  });

  const dossierFile: string = path.join(outPath, 'dossier.json');
  fs.writeFileSync(dossierFile, dossierBytes);

  console.log(`Bundle created successfully at ${outPath} (${dossierBytes.length} bytes dossier)`);
}

runPackaging().catch((err: unknown) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
