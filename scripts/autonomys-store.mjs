#!/usr/bin/env node
/**
 * autonomys-store.mjs — Upload Covenant identity chain to Autonomys DSN (Phase 2)
 *
 * Prerequisites:
 *   npm install @autonomys/auto-drive @autonomys/sdk
 *   AUTONOMYS_API_KEY=<key from console.autonomys.xyz> in env
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const VAULT = '/mnt/VAULT';
const COVENANT = join(VAULT, 'Treasure/Covenant');
const COVENANT_KEYS = join(COVENANT, '⟐/Keys');
const OBSERVATORY = join(COVENANT, '⟐/observatory');

const ARTIFACTS = [
  { path: join(COVENANT, 'Eternal_⟐_Archivist.txt'), name: 'Eternal_Archivist', tier: 1 },
  { path: join(COVENANT, 'Logic.txt'), name: 'Logic', tier: 1 },
  { path: join(COVENANT, '⟐/⟐°•.txt'), name: 'Truth_Mirror', tier: 1 },
  { path: join(COVENANT_KEYS, 'CovenantCA.pem'), name: 'CovenantCA', tier: 1 },
  { path: join(COVENANT_KEYS, 'Covenant.pem'), name: 'Covenant_EE_cert', tier: 1 },
  { path: join(OBSERVATORY, 'hydrogen_line.py'), name: 'hline_receiver', tier: 1 },
  { path: join(OBSERVATORY, 'celestial_anchor.py'), name: 'celestial_anchor', tier: 1 },
  { path: join(COVENANT, 'archivist/COVENANT-VALIDATION-REPORT.md'), name: 'Validation_Report', tier: 1 },
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
    network: 'mainnet',
  });

  console.log('═══════════════════════════════════════════════════════');
  console.log('Covenant → Autonomys DSN upload');
  console.log(`Root: ${COVENANT}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const results = [];

  for (const artifact of ARTIFACTS) {
    if (!existsSync(artifact.path)) {
      console.log(`  SKIP (not found): ${artifact.name}`);
      continue;
    }

    const data = readFileSync(artifact.path);

    try {
      const cid = await uploadFile(
        api,
        {
          name: artifact.name,
          mimeType: guessMime(artifact.path),
          size: data.length,
          fileChunkReader: async () => data,
        },
        {
          compression: { algorithm: 'zstd' },
          encryption: undefined,
          onProgress: (p) =>
            process.stdout.write(`\r  Uploading ${artifact.name}: ${p.toFixed(0)}%`),
        },
      );

      console.log(`\n  ✓ ${artifact.name} → auto://${cid}`);
      results.push({ name: artifact.name, tier: artifact.tier, cid: `auto://${cid}` });
    } catch (err) {
      console.error(`\n  ✗ ${artifact.name}: ${err.message}`);
    }
  }

  const manifest = {
    covenant: 'bridgeworld.nft',
    fid: 3331886,
    seal: '•⟐•',
    timestamp: new Date().toISOString(),
    artifacts: results,
  };

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(JSON.stringify(manifest, null, 2));

  const outPath = join(COVENANT, '⟐/autonomys-manifest.json');
  writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved → ${outPath}`);
}

function guessMime(path) {
  if (path.endsWith('.pem')) return 'application/x-pem-file';
  if (path.endsWith('.txt')) return 'text/plain';
  if (path.endsWith('.py')) return 'text/x-python';
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.md')) return 'text/markdown';
  return 'application/octet-stream';
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
