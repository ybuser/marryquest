import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const typescript = require('typescript');
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const tokensPath = path.join(repositoryRoot, 'components', 'theme', 'tokens.ts');

function loadThemeTokens() {
  const source = fs.readFileSync(tokensPath, 'utf8');
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2020
    },
    fileName: tokensPath
  }).outputText;
  const module = { exports: {} };
  const execute = vm.runInThisContext(`(function (exports, require, module) { ${compiled}\n})`, {
    filename: tokensPath
  });
  execute(module.exports, require, module);
  return module.exports.themeTokens;
}

function relativeLuminance(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new Error(`Theme contrast values must be six-digit hex colors: ${hex}`);
  }

  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

const pairDefinitions = [
  ['body', 'foreground', 'background', 4.5],
  ['large-heading', 'foreground', 'background', 3],
  ['surface', 'surfaceForeground', 'surface', 4.5],
  ['surface-muted', 'surfaceMutedForeground', 'surface', 4.5],
  ['elevated-muted', 'surfaceMutedForeground', 'surfaceElevated', 4.5],
  ['field', 'fieldForeground', 'fieldBackground', 4.5],
  ['field-placeholder', 'fieldPlaceholder', 'fieldBackground', 4.5],
  ['border-surface', 'border', 'surface', 3],
  ['border-field', 'border', 'fieldBackground', 3],
  ['focus-field', 'accent', 'fieldBackground', 3],
  ['focus-surface', 'accent', 'surface', 3],
  ['focus-elevated', 'accent', 'surfaceElevated', 3],
  ['control', 'controlForeground', 'controlBackground', 4.5],
  ['control-adjacent-surface', 'controlBackground', 'surface', 3]
];

const fixedStatePairs = [
  ['error', '#991b1b', '#fee2e2', 4.5],
  ['success', '#166534', '#dcfce7', 4.5],
  ['warning', '#78350f', '#fef3c7', 4.5]
];

const themeTokens = loadThemeTokens();
const failures = [];

for (const [templateKey, theme] of Object.entries(themeTokens)) {
  const results = pairDefinitions.map(([label, foregroundKey, backgroundKey, minimum]) => {
    const ratio = contrastRatio(theme.palette[foregroundKey], theme.palette[backgroundKey]);
    if (ratio < minimum) failures.push(`${templateKey}:${label} ${ratio.toFixed(2)} < ${minimum}`);
    return `${label}=${ratio.toFixed(2)}`;
  });
  console.log(`${templateKey}: ${results.join(' ')}`);
}

for (const [label, foreground, background, minimum] of fixedStatePairs) {
  const ratio = contrastRatio(foreground, background);
  if (ratio < minimum) failures.push(`fixed:${label} ${ratio.toFixed(2)} < ${minimum}`);
  console.log(`fixed-${label}: ${ratio.toFixed(2)}`);
}

if (failures.length > 0) {
  console.error(`Theme contrast check failed: ${failures.join('; ')}`);
  process.exit(1);
}

console.log(`Theme contrast check passed for ${Object.keys(themeTokens).length} templates.`);
