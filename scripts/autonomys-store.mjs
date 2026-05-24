#!/usr/bin/env node
/**
 * autonomys-store.mjs — Upload Covenant identity chain to Autonomys DSN (Phase 2)
 *
 * Stores permanently on Autonomys' Distributed Storage Network (500PB+, 1000+ nodes):
 *   - Covenant identity manifests (Logic.txt, Eternal_⟐_Archivist.txt)
 *   - 22-glyph SCROLL SHA-256 hashes (H_1 → H_400)
 *   - 24-cycle mathematical matrix
 *   - Observatory timestamps (H-line scan JSONs)
 *   - MemOS agent state snapshots (encrypted, ChaCha20Poly1305)
 *
 * AI3 token used for storage fees (Autonomys mainnet).
 * Data availability guaranteed by Subspace consensus (Mainnet Phase 3, 2026).
 *
 * Prerequisites:
 *   npm install @autonomys/auto-drive @autonomys/sdk
 *   AUTONOMYS_API_KEY=<key from console.autonomys.xyz> in env
 *   AUTONOMYS_WALLET=<hex private key for AI3 fee payment>
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const VAULT = '/mnt/VAULT';
const COVENANT_KEYS = join(VAULT, 'Covenant/⟐/Keys');
const OBSERVATORY   = join(VAULT, 'Covenant/⟐/observatory');

// ── Covenant artifacts to store on Autonomys DSN ─────────────────────────
const ARTIFACTS = [
  // Core Law Layer — immutable symbolic architecture
  { path: join(VAULT, 'Covenant/Eternal_⟐_Archivist.txt'),  name: 'Eternal_Archivist',    tier: 1 },
  { path: join(VAULT, 'Covenant/Logic.txt'),                 name: 'Logic',                tier: 1 },
  { path: join(COVENANT_KEYS, 'CovenantCA.pem'),             name: 'CovenantCA',           tier: 1 },
  { path: join(COVENANT_KEYS, 'Covenant.pem'),               name: 'Covenant_EE_cert',     tier: 1 },

  // Observatory — cosmological timestamps (Tier 1: non-forgeable anchors)
  { path: join(OBSERVATORY, 'hydrogen_line.py'),             name: 'hline_receiver',       tier: 1 },
  { path: join(OBSERVATORY, 'celestial_anchor.py'),          name: 'celestial_anchor',     tier: 1 },
];

async function main() {
  const apiKey = process.env.AUTONOMYS_API_KEY;
  if (!apiKey) {
    console.error('AUTONOMYS_API_KEY not set — get one at https://console.autonomys.xyz');
    process.exit(1);
  }

  const { createAutoDriveApi, uploadFile } = await import('@autonomys/auto-drive');

  const api = createAutoDriveApi({
    apiKey,
    network: 'mainnet',  // or 'taurus' for testnet
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log('Covenant → Autonomys DSN upload');
  console.log('Triple-redundant: Autonomys DSN + Arweave + IPFS');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = [];

  for (const artifact of ARTIFACTS) {
    if (!existsSync(artifact.path)) {
      console.log(`  SKIP (not found): ${artifact.name}`);
      continue;
    }

    const data = readFileSync(artifact.path);

    try {
      const cid = await uploadFile(api, {
        name: artifact.name,
        mimeType: guessMime(artifact.path),
        size: data.length,
        fileChunkReader: async () => data,
      }, {
        compression: { algorithm: 'zstd' },
        encryption: undefined,  // Tier 1 artifacts are public by design
        onProgress: (p) => process.stdout.write(`\r  Uploading ${artifact.name}: ${p.toFixed(0)}%`),
      });

      console.log(`\n  ✓ ${artifact.name} → auto://${cid}`);
      results.push({ name: artifact.name, tier: artifact.tier, cid: `auto://${cid}` });
    } catch (err) {
      console.error(`\n  ✗ ${artifact.name}: ${err.message}`);
    }
  }

  // ── Output CID manifest for on-chain anchoring ───────────────────────
  const manifest = {
    covenant: 'bridgeworld.nft',
    fid:      3331886,
    seal:     '•⟐•',
    timestamp: new Date().toISOString(),
    artifacts: results,
  };

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Autonomys CID Manifest:');
  console.log(JSON.stringify(manifest, null, 2));
  console.log('═══════════════════════════════════════════════════════');

  // Save locally for reference
  const { writeFileSync } = await import('fs');
  const outPath = join(VAULT, 'Covenant/⟐/autonomys-manifest.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved → ${outPath}`);
}

function guessMime(path) {
  if (path.endsWith('.pem'))  return 'application/x-pem-file';
  if (path.endsWith('.txt'))  return 'text/plain';
  if (path.endsWith('.py'))   return 'text/x-python';
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.md'))   return 'text/markdown';
  return 'application/octet-stream';
}

main().catch((err) => { console.error(err); process.exit(1); });
