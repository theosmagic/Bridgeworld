/**
 * Archivist API — server-side access-key verification (Tier boundaries).
 */

const LORE_HUNTRESS =
  '58eaa6d95bf4d8f054b99519d1cef395c92171bad5973db9e113329d574f3ab7';
const LORE_NFT =
  '1a0e1e52c29d8e3878d66b78dd73b2d0086e9de6e2193de847f46fce416564a2';
const SYRIAC_ROOT = '3108372e36d8';

function normalizeHex(s: string): string {
  return s.trim().toLowerCase().replace(/^0x/, '');
}

export function classifyAccessKey(hexRaw: string) {
  const hex = normalizeHex(hexRaw);
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    return {
      tier: 2,
      accepted: false,
      note: 'invalid_hex',
      gate: null,
    };
  }
  if (hex === LORE_HUNTRESS) {
    return {
      tier: 1,
      accepted: true,
      note: 'lore_embroidery',
      gate: 'huntress_den',
      provenance: 'chapter-2-a-new-home.md',
    };
  }
  if (hex === LORE_NFT) {
    return {
      tier: 1,
      accepted: false,
      note: 'nft_attestation_not_den_key',
      gate: 'nft_attestation',
      provenance: 'bridgeworld.nft',
    };
  }
  return {
    tier: 2,
    accepted: false,
    note: 'unattested_hex',
    gate: null,
  };
}

export async function handleArchivistAPI(request: Request, url: URL): Promise<Response | null> {
  if (url.pathname === '/api/archivist/verify-access' && request.method === 'POST') {
    return handleVerifyAccess(request);
  }
  if (url.pathname === '/api/archivist/shield' && request.method === 'GET') {
    return new Response(
      JSON.stringify({
        I_s: '78c13108372e36d8e8aaef31f12516800aec17759fca56b62465cc6c354fad15',
        syriac_root: SYRIAC_ROOT,
        corruption_stripped: '78c1',
        cycles: 9,
        nodes_rendered: 22,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
  return null;
}

async function handleVerifyAccess(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    accessKey?: string;
    address?: string;
  };
  const result = classifyAccessKey(body.accessKey ?? '');
  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
