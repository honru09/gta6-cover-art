/**
 * Entry submission runner for Neon Coast Cover Studio (make.fun gta6-cover-art-01).
 * Packages the offline web application and screenshots into the output directory,
 * then generates dossier.json matching the platform evaluator specification.
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// Platform intake constraints
const EVALUATION_CONSTRAINTS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function deployAppAssets(sourceDir: string, targetDir: string): void {
  const sourceApp = join(sourceDir, 'app');
  const targetApp = join(targetDir, 'app');

  mkdirSync(targetApp, { recursive: true });
  cpSync(sourceApp, targetApp, { recursive: true });
}

function deployScreenshots(sourceDir: string, targetDir: string): void {
  const sourceScreenshots = join(sourceDir, 'screenshots');
  const targetScreenshots = join(targetDir, 'screenshots');

  mkdirSync(targetScreenshots, { recursive: true });
  if (existsSync(sourceScreenshots)) {
    cpSync(sourceScreenshots, targetScreenshots, { recursive: true });
  }
}

function produceDossier(targetDir: string): void {
  const dossierContent = buildDossier(targetDir, EVALUATION_CONSTRAINTS);
  const dossierPath = join(targetDir, 'dossier.json');
  writeFileSync(dossierPath, dossierContent, 'utf-8');
}

function run(): void {
  const projectRoot = fileURLToPath(new URL('.', import.meta.url));
  const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR
    ? resolve(process.env.MAKEFUN_OUTPUT_DIR)
    : '/output';

  mkdirSync(outputDirectory, { recursive: true });

  // Stage application files and evidence images
  deployAppAssets(projectRoot, outputDirectory);
  deployScreenshots(projectRoot, outputDirectory);

  // Generate metadata report for jury evaluation
  produceDossier(outputDirectory);

  console.log(`Successfully packaged Neon Coast Cover Studio to: ${outputDirectory}`);
}

run();
