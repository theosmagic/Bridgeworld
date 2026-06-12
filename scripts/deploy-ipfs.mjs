#!/usr/bin/env node
/**
 * deploy-ipfs.mjs — Build + pin BridgeWorld SPA to IPFS via Arweave Turbo SDK
 *
 * Flow:
 *   1. BUILD_TARGET=ipfs react-router build  → dist/ipfs/
 *   2. Upload dist/ipfs/ directory to Arweave via @ardrive/turbo-sdk (x402 USDC on Base)
 *   3. Print the Arweave manifest txId → use as IPFS CID anchor
 *   4. Print the ud-cli command to set the IPFS hash on bridgeworld.nft
 *
 * Prerequisites:
 *   npm install @ardrive/turbo-sdk
 *   TURBO_PRIVATE_KEY=<base58 Arweave JWK or hex ETH privkey> in env or .env
 */

import { execSync } from 'child_process';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dir = fileURLToPath(new URL('.', import.meta.url));
const ROOT  = join(__dir, '..');
// React Router v7 builds SPA to build/client/ (outDir in vite.config is ignored by RR)
const DIST  = join(ROOT, 'build', 'client');

// ── 1. Build ──────────────────────────────────────────────────────────────
console.log('Building SPA (BUILD_TARGET=ipfs)...');
execSync('BUILD_TARGET=ipfs pnpm run build:ipfs', { cwd: ROOT, stdio: 'inherit' });
console.log(`Build complete → ${DIST}`);

// ── 2. Upload to Arweave via Turbo SDK ───────────────────────────────────
const { TurboFactory } = await import('@ardrive/turbo-sdk');

const privateKey = process.env.TURBO_PRIVATE_KEY;
if (!privateKey) {
  console.error('TURBO_PRIVATE_KEY not set — export your Arweave JWK or ETH private key');
  process.exit(1);
}

// x402: USDC on Base — Turbo SDK handles micropayment automatically
const turbo = TurboFactory.authenticated({
  privateKey: JSON.parse(privateKey),
  // token: 'base-eth'  // uncomment for Base ETH payment instead of AR
});

// Collect all files under dist/ipfs/
function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) entries.push(...walk(full));
    else entries.push(full);
  }
  return entries;
}

const files = walk(DIST);
console.log(`Uploading ${files.length} files to Arweave Turbo...`);

const uploadResults = [];
for (const file of files) {
  const data = readFileSync(file);
  const relPath = relative(DIST, file);
  const contentType = guessContentType(file);

  const result = await turbo.uploadFile({
    fileStreamFactory: () => data,
    fileSizeFactory:   () => data.length,
    dataItemOpts: {
      tags: [
        { name: 'Content-Type',            value: contentType },
        { name: 'App-Name',                value: 'BridgeWorld' },
        { name: 'App-Version',             value: '1.0.0' },
        { name: 'BridgeWorld-Path',        value: relPath },
        { name: 'Covenant-Seal',           value: '•⟐•' },
      ],
    },
  });

  uploadResults.push({ path: relPath, id: result.id, contentType });
  console.log(`  ✓ ${relPath} → ar://${result.id}`);
}

// ── 3. Create Arweave path manifest ─────────────────────────────────────
const { ArFSManifest } = await import('@ardrive/turbo-sdk').catch(() => null) ?? {};

const manifest = {
  manifest: 'arweave/paths',
  version:  '0.1.0',
  index:    { path: 'index.html' },
  paths:    Object.fromEntries(
    uploadResults.map(({ path, id }) => [path, { id }])
  ),
};

const manifestData = JSON.stringify(manifest);
const manifestResult = await turbo.uploadFile({
  fileStreamFactory: () => Buffer.from(manifestData),
  fileSizeFactory:   () => manifestData.length,
  dataItemOpts: {
    tags: [
      { name: 'Content-Type',     value: 'application/x.arweave-manifest+json' },
      { name: 'App-Name',         value: 'BridgeWorld' },
      { name: 'Covenant-Seal',    value: '•⟐•' },
    ],
  },
});

console.log('\n═══════════════════════════════════════════════════════');
console.log(`Arweave Manifest TxID: ${manifestResult.id}`);
console.log(`Gateway URL:           https://arweave.net/${manifestResult.id}`);
console.log('═══════════════════════════════════════════════════════\n');

// ── 4. Set on bridgeworld.nft via UD ─────────────────────────────────────
console.log('Next step — set IPFS hash on bridgeworld.nft:');
console.log(`  ud domains dns record add bridgeworld.nft --type IPFS_REDIRECT --value ar://${manifestResult.id}`);
console.log('');
console.log('Or point to IPFS CID (if pinned separately):');
console.log('  ud domains dns record add bridgeworld.nft --type IPFS_REDIRECT --value ipfs://<CID>');
console.log('');
console.log('Cloudflare IPNS bridge (⟐/YubiKey.txt CLOUDFLARE_IPNS_BRIDGEWORLD):');
console.log('  ipfs name publish /ipfs/<CID> --key=bridgeworld  # or publish manifest to existing IPNS key');
console.log('  pnpm run cf:dns-ipfs:apply');
console.log('  https://ipfs.bridgeworld.lol/ipns/k51qzi5uqu5dgu4makc3vj55pcnkzvvq5ako1kk8u6udon6j85eypuudm4psus');

function guessContentType(file) {
  if (file.endsWith('.html'))   return 'text/html';
  if (file.endsWith('.css'))    return 'text/css';
  if (file.endsWith('.js'))     return 'application/javascript';
  if (file.endsWith('.json'))   return 'application/json';
  if (file.endsWith('.svg'))    return 'image/svg+xml';
  if (file.endsWith('.png'))    return 'image/png';
  if (file.endsWith('.ico'))    return 'image/x-icon';
  if (file.endsWith('.woff2'))  return 'font/woff2';
  if (file.endsWith('.mp4'))    return 'video/mp4';
  return 'application/octet-stream';
}
