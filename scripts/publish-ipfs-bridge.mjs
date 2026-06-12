#!/usr/bin/env node
/**
 * Build → IPFS add (kubo) → update Cloudflare DNSLink → verify gateway.
 * Cloudflare creds from ⟐/YubiKey.txt.
 *
 * Env:
 *   KUBO_BIN     default /tmp/kubo/ipfs
 *   IPFS_PATH    default /tmp/ipfs-repo
 *   SKIP_BUILD=1 skip npm run build:ipfs
 *
 * Usage:
 *   node scripts/publish-ipfs-bridge.mjs
 *   node scripts/publish-ipfs-bridge.mjs --cid=Qm...
 *   node scripts/publish-ipfs-bridge.mjs --dnslink=ipns   # keep IPNS dnslink (default: ipfs CID)
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { cloudflareBridgeConfig, loadYubiKeyEnv } from './lib/yubikey-env.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const DIST = join(ROOT, 'build', 'client');
const KUBO = process.env.KUBO_BIN ?? '/tmp/kubo/ipfs';
const IPFS_PATH = process.env.IPFS_PATH ?? '/tmp/ipfs-repo';

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, v] = a.slice(2).split('=');
    return [k, v ?? 'true'];
  }),
);

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
  if (!json.success) throw new Error(JSON.stringify(json.errors ?? json, null, 2));
  return json.result;
}

async function upsertDnslink(cfg, content) {
  const name = `${cfg.dnslinkName}.bridgeworld.lol`;
  const q = new URLSearchParams({ name, type: 'TXT', per_page: '100' });
  const rows = await cfApi(cfg, `/zones/${cfg.zoneId}/dns_records?${q}`);
  const match = rows.find((r) => r.content === content);
  if (match) {
    console.log(`  ✓ DNSLink unchanged: ${content}`);
    return;
  }
  const old = rows.filter((r) => r.content.startsWith('dnslink='));
  for (const r of old) {
    if (r.content !== content) {
      await cfApi(cfg, `/zones/${cfg.zoneId}/dns_records/${r.id}`, { method: 'DELETE' });
      console.log(`  ✓ removed old DNSLink: ${r.content}`);
    }
  }
  await cfApi(cfg, `/zones/${cfg.zoneId}/dns_records`, {
    method: 'POST',
    body: { type: 'TXT', name, content, ttl: 1, proxied: false },
  });
  console.log(`  ✓ DNSLink → ${content}`);
}

function ensureKubo() {
  if (!existsSync(KUBO)) {
    console.error(`Kubo not found at ${KUBO}. Run: curl -sL https://dist.ipfs.tech/kubo/v0.32.1/kubo_v0.32.1_linux-amd64.tar.gz | tar -xz -C /tmp`);
    process.exit(1);
  }
  if (!existsSync(IPFS_PATH)) {
    execSync(`${KUBO} init --profile=server`, { env: { ...process.env, IPFS_PATH }, stdio: 'inherit' });
  }
  const ping = spawnSync(KUBO, ['id'], { env: { ...process.env, IPFS_PATH }, encoding: 'utf8' });
  if (ping.status !== 0) {
    console.log('Starting ipfs daemon…');
    spawnSync(KUBO, ['daemon'], { env: { ...process.env, IPFS_PATH }, detached: true, stdio: 'ignore' });
    execSync('sleep 3');
  }
}

function ipfsAdd(dir) {
  const out = execSync(`${KUBO} add -r -Q "${dir}"`, {
    env: { ...process.env, IPFS_PATH },
    encoding: 'utf8',
  }).trim();
  return out.split('\n').pop();
}

async function main() {
  loadYubiKeyEnv();
  const cfg = cloudflareBridgeConfig();
  const useIpnsLink = args.dnslink === 'ipns';

  if (!args.cid && !existsSync(DIST)) {
    if (process.env.SKIP_BUILD === '1') {
      console.error(`Missing ${DIST} and no --cid=`);
      process.exit(1);
    }
    console.log('⟐ npm run build:ipfs');
    execSync('npm run build:ipfs', { cwd: ROOT, stdio: 'inherit' });
  }

  let cid = args.cid;
  if (!cid) {
    ensureKubo();
    console.log(`⟐ ipfs add ${DIST}`);
    cid = ipfsAdd(DIST);
  }

  console.log(`\n  CID: ${cid}`);

  const dnslink = useIpnsLink
    ? cfg.dnslinkContent
    : `dnslink=/ipfs/${cid}`;

  console.log('\n⟐ Cloudflare DNSLink');
  await upsertDnslink(cfg, dnslink);

  const urls = {
    cfIpfs: `https://cloudflare-ipfs.com/ipfs/${cid}`,
    customIpfs: `https://ipfs.bridgeworld.lol/ipfs/${cid}`,
    customIpns: cfg.gatewayUrls.custom,
  };

  console.log('\n═══════════════════════════════════════');
  console.log('Gateway URLs:');
  console.log(`  ${urls.customIpfs}`);
  console.log(`  ${urls.cfIpfs}`);
  if (!useIpnsLink) {
    console.log('\nUD (optional):');
    console.log(`  ud domains dns record add bridgeworld.nft --type IPFS_REDIRECT --value ipfs://${cid}`);
  }
  console.log('\nNote: local kubo must stay pinned or use a remote pin service for global availability.');
  console.log('IPNS key (YubiKey): publish with holder of k51qzi5… private key for /ipns/ URL.');
  console.log('═════════════════════════════════════\n');

  for (const url of [urls.customIpfs, urls.cfIpfs]) {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      console.log(`  ${res.status} ${url}`);
    } catch (e) {
      console.log(`  ERR ${url}`);
    }
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
