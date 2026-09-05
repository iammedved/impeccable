import fs from 'node:fs';
import path from 'node:path';

function packageNameFromBundleComment(line) {
  const rel = line.slice('// node_modules/'.length);
  const [first, second] = rel.split('/');
  return first.startsWith('@') ? `${first}/${second}` : first;
}

export function bundledPackageNames(bundle) {
  const packageNames = new Set(
    bundle.split('\n')
      .filter(line => line.startsWith('// node_modules/'))
      .map(packageNameFromBundleComment),
  );
  // mdn-data is inlined after Bun leaves its CJS JSON imports unresolved.
  packageNames.add('mdn-data');
  return [...packageNames].sort();
}

function licenseText(packageDir) {
  const licenseName = fs.readdirSync(packageDir).find(name => /^(license|copying|notice)(\.|$)/i.test(name));
  if (!licenseName) throw new Error(`Bundled package has no license file: ${packageDir}`);
  return fs.readFileSync(path.join(packageDir, licenseName), 'utf8').trim();
}

function writeThirdPartyNotices(rootDir, bundle, outputPath) {
  const sections = bundledPackageNames(bundle).map(name => {
    const packageDir = path.join(rootDir, 'node_modules', name);
    const manifest = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'));
    const author = typeof manifest.author === 'string' ? `\nAuthor: ${manifest.author}` : '';
    return `## ${manifest.name} ${manifest.version}\nLicense: ${manifest.license || 'not declared'}${author}\n\n${licenseText(packageDir)}`;
  });

  fs.writeFileSync(outputPath,
    `# Third-party notices for the bundled static detector\n\n` +
    `Generated from the locked package closure embedded in detect-antipatterns.mjs.\n\n${sections.join('\n\n')}\n`);
}

/**
 * Bundle the detector's production parser dependencies into the provider
 * payload. The source CLI deliberately retains its lazy-import fallback for
 * damaged or partial installations; this artifact entry supplies the modules
 * before that code runs.
 */
export async function bundleDetectorRuntime(rootDir, outputPath) {
  if (typeof Bun === 'undefined') {
    throw new Error('Detector runtime bundling requires the repository Bun build toolchain.');
  }

  const outdir = path.dirname(outputPath);
  fs.mkdirSync(outdir, { recursive: true });
  const result = await Bun.build({
    entrypoints: [path.join(rootDir, 'scripts', 'detector-runtime-entry.mjs')],
    outdir,
    target: 'node',
    format: 'esm',
    minify: false,
    sourcemap: 'none',
    // The plugin has never shipped browser automation. Keep these optional
    // browser-only paths external instead of pulling their unused closure into
    // the static HTML/CSS detector bundle.
    external: ['puppeteer', 'puppeteer-core'],
  });

  if (!result.success) {
    const messages = result.logs.map(log => log.message).join('\n');
    throw new Error(`Detector runtime bundle failed: ${messages}`);
  }
  const emitted = result.outputs.find(output => output.kind === 'entry-point');
  if (!emitted) throw new Error('Detector runtime bundle did not emit an entry point.');
  let content = fs.readFileSync(emitted.path, 'utf8');
  const runtimeData = [
    ['patch = require2("../data/patch.json");', 'patch', 'css-tree/data/patch.json'],
    ['mdnAtrules = require3("mdn-data/css/at-rules.json");', 'mdnAtrules', 'mdn-data/css/at-rules.json'],
    ['mdnProperties = require3("mdn-data/css/properties.json");', 'mdnProperties', 'mdn-data/css/properties.json'],
    ['mdnSyntaxes = require3("mdn-data/css/syntaxes.json");', 'mdnSyntaxes', 'mdn-data/css/syntaxes.json'],
  ];
  for (const [needle, variable, relPath] of runtimeData) {
    if (!content.includes(needle)) throw new Error(`Detector bundle missing expected runtime data import: ${relPath}`);
    const json = JSON.stringify(JSON.parse(fs.readFileSync(path.join(rootDir, 'node_modules', relPath), 'utf8')));
    content = content.replace(needle, () => `${variable} = ${json};`);
  }
  const versionNeedle = '({ version } = require4("../package.json"));';
  if (!content.includes(versionNeedle)) throw new Error('Detector bundle missing expected css-tree version import.');
  const cssTreeVersion = JSON.parse(fs.readFileSync(path.join(rootDir, 'node_modules', 'css-tree', 'package.json'), 'utf8')).version;
  content = content.replace(versionNeedle, `version = ${JSON.stringify(cssTreeVersion)};`);
  fs.writeFileSync(outputPath, content);
  writeThirdPartyNotices(rootDir, content, path.join(outdir, 'THIRD_PARTY_NOTICES.md'));
  return outputPath;
}
