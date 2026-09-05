import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { bundledPackageNames, bundleDetectorRuntime } from '../scripts/lib/detector-runtime-bundle.js';

const ROOT = process.cwd();
const tempDirs = [];

function makeCleanArtifact() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'impeccable-detector-artifact-'));
  tempDirs.push(root);
  const scriptsDir = path.join(root, 'skills', 'impeccable', 'scripts');
  const detectorPath = path.join(scriptsDir, 'detector', 'detect-antipatterns.mjs');
  fs.mkdirSync(path.dirname(detectorPath), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'skill', 'scripts', 'detect.mjs'), path.join(scriptsDir, 'detect.mjs'));
  return { root, scriptsDir, detectorPath };
}

function sourceLicense(name) {
  const packageDir = path.join(ROOT, 'node_modules', name);
  const licenseFile = fs.readdirSync(packageDir).find(entry => /^(license|copying|notice)(\.|$)/i.test(entry));
  return fs.readFileSync(path.join(packageDir, licenseFile), 'utf8').trim();
}

afterEach(() => {
  while (tempDirs.length > 0) fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
});

describe('packaged detector runtime', () => {
  test('runs the full static HTML/CSS engine from a clean artifact', async () => {
    const { root, scriptsDir, detectorPath } = makeCleanArtifact();
    const fixtureDir = path.join(root, 'fixture');
    fs.mkdirSync(fixtureDir);
    fs.writeFileSync(path.join(fixtureDir, 'index.html'),
      '<!doctype html><html><head><link rel="stylesheet" href="style.css"></head><body><p class="muted">Check</p></body></html>');
    fs.writeFileSync(path.join(fixtureDir, 'style.css'),
      ':root { --paper: #ffffff; --faint: #e5e7eb; } .muted { color: var(--faint); background-color: var(--paper); }');

    await bundleDetectorRuntime(ROOT, detectorPath);

    const result = spawnSync(process.execPath, [path.join(scriptsDir, 'detect.mjs'), '--json', path.join(fixtureDir, 'index.html')], {
      cwd: fixtureDir,
      encoding: 'utf8',
    });
    expect(result.status).toBe(2);
    expect(result.stderr).not.toContain('DEGRADED');
    expect(JSON.parse(result.stdout).some(finding => finding.antipattern === 'low-contrast')).toBe(true);
    expect(fs.existsSync(path.join(root, 'node_modules'))).toBe(false);

    const bundle = fs.readFileSync(detectorPath, 'utf8');
    const notices = fs.readFileSync(path.join(path.dirname(detectorPath), 'THIRD_PARTY_NOTICES.md'), 'utf8');
    for (const name of bundledPackageNames(bundle)) {
      expect(notices).toContain(`## ${name} `);
      expect(notices).toContain(sourceLicense(name));
    }
    for (const name of ['htmlparser2', 'css-select', 'css-tree', 'domutils']) {
      expect(bundle).not.toMatch(new RegExp(`(?:import\\(|require\\()\\s*['\"]${name}(?:/[^'\"]*)?['\"]`));
    }
  });
});
