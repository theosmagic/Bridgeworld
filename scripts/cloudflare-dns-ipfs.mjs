#!/usr/bin/env node
/**
 * Sync Cloudflare DNS for IPFS bridge (values from ⟐/YubiKey.txt).
 *
 * Records:
 *   TXT  _dnslink.ipfs  →  dnslink=/ipns/<CLOUDFLARE_IPNS_BRIDGEWORLD>
 *   CNAME ipfs          →  ipfs.cloudflare.com (often auto-managed by Web3 Gateway)
 *
 * Usage:
 *   node scripts/cloudflare-dns-ipfs.mjs           # dry-run
 *   node scripts/cloudflare-dns-ipfs.mjs --apply   # push to Cloudflare API
 *   node scripts/cloudflare-dns-ipfs.mjs --list    # show current zone records
 */

import { cloudflareBridgeConfig, loadYubiKeyEnv } from './lib/yubikey-env.mjs';

const apply = process.argv.includes('--apply');
const listOnly = process.argv.includes('--list');

async function cfApi(cfg, path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: {
      'X-Auth-Email': cfg.email,
      'X-Auth-Key': cfg.apiKey,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(JSON.stringify(json.errors ?? json, null, 2));
  }
  return json.result;
}

async function listRecords(cfg, name) {
  const q = new URLSearchParams({ name, per_page: '100' });
  return cfApi(cfg, `/zones/${cfg.zoneId}/dns_records?${q}`);
}

async function upsertRecord(cfg, spec) {
  const existing = await listRecords(cfg, spec.name);
  const match = existing.find(
    (r) => r.type === spec.type && (spec.type !== 'TXT' || r.content === spec.content),
  );
  if (match && match.content === spec.content && match.proxied === spec.proxied) {
    console.log(`  ✓ ${spec.type} ${spec.name} (unchanged)`);
    return match;
  }
  if (!apply) {
    console.log(`  → would ${match ? 'PATCH' : 'POST'} ${spec.type} ${spec.name} = ${spec.content}`);
    return null;
  }
  const write = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      if (String(err.message).includes('1049')) {
        console.log(`  ✓ ${spec.type} ${spec.name} (Web3 Gateway — use CF dashboard)`);
        return match ?? null;
      }
      throw err;
    }
  };

  if (match) {
    return write(async () => {
      const result = await cfApi(cfg, `/zones/${cfg.zoneId}/dns_records/${match.id}`, {
        method: 'PATCH',
        body: spec,
      });
      console.log(`  ✓ updated ${spec.type} ${spec.name}`);
      return result;
    });
  }
  return write(async () => {
    const result = await cfApi(cfg, `/zones/${cfg.zoneId}/dns_records`, {
      method: 'POST',
      body: spec,
    });
    console.log(`  ✓ created ${spec.type} ${spec.name}`);
    return result;
  });
}

async function main() {
  loadYubiKeyEnv(); // validate file exists
  const cfg = cloudflareBridgeConfig();

  console.log('⟐ Cloudflare IPFS bridge — bridgeworld.lol');
  console.log(`  account: ${cfg.accountId}`);
  console.log(`  zone:    ${cfg.zoneId}`);
  console.log(`  ipns:    ${cfg.ipnsKey}`);
  console.log(`  gateway: ${cfg.gatewayUrls.custom}`);
  console.log('');

  if (listOnly) {
    for (const name of [`${cfg.dnslinkName}.bridgeworld.lol`, `${cfg.ipfsCname}.bridgeworld.lol`]) {
      const rows = await listRecords(cfg, name);
      console.log(name);
      for (const r of rows) console.log(`  ${r.type} ${r.content} (proxied=${r.proxied})`);
    }
    return;
  }

  const desired = [
    {
      type: 'TXT',
      name: `${cfg.dnslinkName}.bridgeworld.lol`,
      content: cfg.dnslinkContent,
      ttl: 1,
      proxied: false,
    },
    {
      type: 'CNAME',
      name: `${cfg.ipfsCname}.bridgeworld.lol`,
      content: cfg.ipfsTarget,
      ttl: 1,
      proxied: true,
    },
  ];

  if (!apply) console.log('Dry run (pass --apply to push):\n');

  for (const spec of desired) {
    await upsertRecord(cfg, spec);
  }

  console.log('');
  if (!apply) {
    console.log('Run: node scripts/cloudflare-dns-ipfs.mjs --apply');
  } else {
    console.log('Verify:');
    console.log(`  curl -sI "${cfg.gatewayUrls.custom}"`);
    console.log(`  dig TXT ${cfg.dnslinkName}.bridgeworld.lol +short`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
