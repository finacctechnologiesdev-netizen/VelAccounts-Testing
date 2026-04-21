// scripts/patch-primeng-table.js
// Patches ChangeDetectionStrategy.Eager → Default across ALL primeng fesm bundles.
// Required for Angular 19 + esbuild compatibility.
// Runs automatically via "postinstall" in package.json.
const fs   = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'node_modules', 'primeng', 'fesm2022');
if (!fs.existsSync(dir)) {
  console.log('[patch-primeng] fesm2022 dir not found, skipping.');
  process.exit(0);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.mjs'));
let totalFiles = 0, totalOccurrences = 0;

files.forEach(filename => {
  const filepath = path.join(dir, filename);
  const original = fs.readFileSync(filepath, 'utf8');
  if (!original.includes('ChangeDetectionStrategy.Eager')) return;
  const count   = (original.match(/ChangeDetectionStrategy\.Eager/g) || []).length;
  const patched = original.replace(/ChangeDetectionStrategy\.Eager/g, 'ChangeDetectionStrategy.Default');
  fs.writeFileSync(filepath, patched);
  console.log(`[patch-primeng] ${filename}: ${count} replacement(s)`);
  totalFiles++;
  totalOccurrences += count;
});

if (totalFiles === 0) {
  console.log('[patch-primeng] All bundles already patched.');
} else {
  console.log(`[patch-primeng] Done — ${totalOccurrences} replacement(s) across ${totalFiles} file(s).`);
}
