#!/usr/bin/env node
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';

const root = process.cwd();

async function exists(p) {
  try { await fsp.access(p); return true; } catch { return false; }
}

async function rmrf(p) {
  try {
    await fsp.rm(p, { recursive: true, force: true });
    console.log(`[clean] removed ${path.relative(root, p)}`);
  } catch (e) {
    console.warn(`[clean] failed to remove ${p}:`, e?.message || e);
  }
}

async function main() {
  const targets = new Set([
    path.join(root, 'dist'),
    path.join(root, 'app', 'dist'),
    path.join(root, 'marketing', 'dist'),
  ]);

  // Clean package dists if present (top-level packages only)
  const packagesDir = path.join(root, 'packages');
  if (fs.existsSync(packagesDir)) {
    const entries = await fsp.readdir(packagesDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        targets.add(path.join(packagesDir, ent.name, 'dist'));
      }
    }
  }

  for (const t of targets) {
    if (await exists(t)) {
      await rmrf(t);
    }
  }
}

main().catch(err => {
  console.error('[clean] unexpected error:', err?.stack || err?.message || String(err));
  process.exit(1);
});

