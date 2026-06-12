/**
 * Parse `export KEY=value` lines from Covenant YubiKey.txt (no secrets in repo).
 */
import { readFileSync, existsSync } from 'fs';

const DEFAULT_PATH = '/mnt/VAULT/Treasure/Covenant/⟐/YubiKey.txt';

export function loadYubiKeyEnv(path = process.env.COVENANT_YUBIKEY ?? DEFAULT_PATH) {
  if (!existsSync(path)) {
    throw new Error(`YubiKey env not found: ${path}`);
  }
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^export\s+([A-Za-z0-9_]+)=(.*)$/);
    if (!m) continue;
    env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return env;
}

/** Non-secret Cloudflare / IPNS constants from YubiKey.txt */
export function cloudflareBridgeConfig(env = loadYubiKeyEnv()) {
  const ipns = env.CLOUDFLARE_IPNS_BRIDGEWORLD;
  if (!ipns) throw new Error('CLOUDFLARE_IPNS_BRIDGEWORLD missing in YubiKey.txt');

  return {
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    zoneId: env.CLOUDFLARE_ZONE_ID,
    email: env.CLOUDFLARE_EMAIL,
    apiKey: env.CLOUDFLARE_API_KEY ?? env.CLOUDFLARE_GLOBAL_API,
    ipnsKey: ipns,
    dnslinkName: '_dnslink.ipfs',
    dnslinkContent: `dnslink=/ipns/${ipns}`,
    ipfsCname: 'ipfs',
    // Web3 Gateway provisions CNAME → ipfs.cloudflare.com (API error 1049 if edited manually)
    ipfsTarget: 'ipfs.cloudflare.com',
    gatewayUrls: {
      cloudflare: `https://cloudflare-ipfs.com/ipns/${ipns}`,
      custom: `https://ipfs.bridgeworld.lol/ipns/${ipns}`,
    },
  };
}
