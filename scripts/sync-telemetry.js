#!/usr/bin/env node
// scripts/sync-telemetry.js — single source of truth for service telemetry.
//
// apps/telemetry-collector/src is the ONLY place telemetry code is edited.
// This script builds it and copies the compiled output into each demo-store
// service's lib/telemetry/ directory (which is what the Docker images COPY).
//
// Usage:  node scripts/sync-telemetry.js         # build + sync
//         node scripts/sync-telemetry.js --check # fail if drifted (CI)

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_PKG = path.join(ROOT, 'apps', 'telemetry-collector');
const SRC_DIST = path.join(SRC_PKG, 'dist');
const SERVICES = ['api-gateway', 'auth-service', 'order-service', 'payment-service'];
const CHECK = process.argv.includes('--check');

function listFilesRecursive(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

function relPath(file, base) {
  return path.relative(base, file).split(path.sep).join('/');
}

function main() {
  if (!fs.existsSync(SRC_DIST)) {
    if (CHECK) {
      console.error('[sync-telemetry] apps/telemetry-collector/dist missing — run: npm install && npm run build (in apps/telemetry-collector)');
      process.exit(1);
    }
    console.log('[sync-telemetry] Building apps/telemetry-collector ...');
    execSync('npm install --no-audit --no-fund', { cwd: SRC_PKG, stdio: 'inherit' });
    execSync('npm run build', { cwd: SRC_PKG, stdio: 'inherit' });
  }

  const srcFiles = listFilesRecursive(SRC_DIST);
  if (srcFiles.length === 0) {
    console.error('[sync-telemetry] dist/ is empty — build produced no output');
    process.exit(1);
  }

  let changed = 0;
  let missingOrDrifted = 0;

  for (const svc of SERVICES) {
    const destBase = path.join(ROOT, 'apps', 'demo-store', svc, 'lib', 'telemetry');
    for (const srcFile of srcFiles) {
      const rel = relPath(srcFile, SRC_DIST);
      const destFile = path.join(destBase, rel);
      const srcContent = fs.readFileSync(srcFile);

      if (!fs.existsSync(destFile)) {
        missingOrDrifted++;
        if (CHECK) {
          console.error(`[sync-telemetry] DRIFT: missing in ${svc}: lib/telemetry/${rel}`);
        } else {
          fs.mkdirSync(path.dirname(destFile), { recursive: true });
          fs.writeFileSync(destFile, srcContent);
          changed++;
        }
        continue;
      }

      const destContent = fs.readFileSync(destFile);
      if (!srcContent.equals(destContent)) {
        missingOrDrifted++;
        if (CHECK) {
          console.error(`[sync-telemetry] DRIFT in ${svc}: lib/telemetry/${rel} differs from apps/telemetry-collector/dist`);
        } else {
          fs.writeFileSync(destFile, srcContent);
          changed++;
        }
      }
    }
  }

  if (CHECK) {
    if (missingOrDrifted > 0) {
      console.error(`\n[sync-telemetry] FAILED: ${missingOrDrifted} drifted/missing file(s).`);
      console.error('[sync-telemetry] Fix: run  node scripts/sync-telemetry.js  and commit the result.');
      process.exit(1);
    }
    console.log('[sync-telemetry] OK — all 4 service copies match apps/telemetry-collector/dist');
    return;
  }

  console.log(`[sync-telemetry] Synced ${changed} file(s) into ${SERVICES.length} services from apps/telemetry-collector/dist`);
  if (changed > 0) {
    console.log('[sync-telemetry] NOTE: rebuild Docker images to pick up changes:  docker compose build api-gateway auth-service order-service payment-service');
  }
}

main();
