#!/usr/bin/env node
/**
 * Prepares .next/standalone for deployment by copying static assets and public,
 * then zips the .next/standalone directory.
 * Run after: npm run build
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');
const staticSrc = path.join(root, '.next', 'static');
const staticDst = path.join(standalone, '.next', 'static');
const publicSrc = path.join(root, 'public');
const publicDst = path.join(standalone, 'public');

function copyRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) {
      copyRecursive(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

if (!fs.existsSync(standalone)) {
  console.error('Run "npm run build" first.');
  process.exit(1);
}

if (fs.existsSync(staticSrc)) {
  copyRecursive(staticSrc, staticDst);
  console.log('Copied .next/static -> .next/standalone/.next/static');
}
if (fs.existsSync(publicSrc)) {
  copyRecursive(publicSrc, publicDst);
  console.log('Copied public -> .next/standalone/public');
}

const zipPath = path.join(root, 'standalone.zip');
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

new Promise((resolve, reject) => {
  output.on('close', resolve);
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(standalone, 'standalone');
  archive.finalize();
})
  .then(() => {
    console.log('Standalone bundle ready.');
    console.log('Zip file:', path.resolve(zipPath));
  })
  .catch((err) => {
    console.error('Failed to create zip:', err.message);
    process.exit(1);
  });
