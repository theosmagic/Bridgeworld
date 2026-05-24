/**
 * API handlers — shared between the full CF Worker (workers/app.ts) and any
 * future edge-function / API-only deployment. No react-router dependency.
 *
 * Routes handled here:
 *   POST /api/subgraph           — server-side subgraph proxy (keeps API keys out of browser)
 *   GET  /api/manifest           — ecosystem project manifest
 *   GET  /api/agent/:id          — MemOS agent state gateway (Cycle 2)
 *        /agents/chat/*          — Golem WebSocket relay guard (426)
 *   GET  /.well-known/farcaster.json — Farcaster Mini App manifest (needs env secrets)
 *   POST /api/farcaster/webhook  — Farcaster event webhook
 */

import { ecosystemProject } from '../app/data/ecosystem';

export function handleAPI(request: Request, env: Env): Response | null {
  const url = new URL(request.url);

  // ── Subgraph proxy — keeps SUBGRAPH_API_URL server-side ──────────────
  if (url.pathname === '/api/subgraph' && request.method === 'POST') {
    return handleSubgraph(request, env);
  }

  // ── Ecosystem manifest ────────────────────────────────────────────────
  if (url.pathname === '/api/manifest') {
    return new Response(JSON.stringify(ecosystemProject), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // ── MemOS agent state gateway (Cycle 2) ───────────────────────────────
  if (url.pathname.startsWith('/api/agent/')) {
    const agentId = url.pathname.replace('/api/agent/', '');
    return new Response(
      JSON.stringify({ agentId, status: 'LIVE', cycle: 2, backend: 'arweave' }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  }

  // ── Golem WebSocket relay guard ───────────────────────────────────────
  if (url.pathname.startsWith('/agents/chat/')) {
    return new Response('WebSocket upgrade required', { status: 426 });
  }

  // ── Farcaster Mini App manifest ───────────────────────────────────────
  // FARCASTER_MANIFEST_HEADER / _PAYLOAD / _SIGNATURE must be set via:
  //   wrangler secret put FARCASTER_MANIFEST_HEADER
  //   wrangler secret put FARCASTER_MANIFEST_PAYLOAD
  //   wrangler secret put FARCASTER_MANIFEST_SIGNATURE
  // Domain: bridgeworld.lol | FID: 3331886
  // Custody: 0x2001daa82512c29ecea1ea94234fac7c40bac58d
  if (url.pathname === '/.well-known/farcaster.json') {
    return handleFarcasterManifest(env);
  }

  // ── Farcaster webhook ─────────────────────────────────────────────────
  if (url.pathname === '/api/farcaster/webhook' && request.method === 'POST') {
    return handleFarcasterWebhook(request);
  }

  return null; // not an API route
}

async function handleSubgraph(request: Request, env: Env): Promise<Response> {
  const query = await request.text();
  const upstream = await fetch(env.SUBGRAPH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: query,
  });
  return new Response(upstream.body, {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function handleFarcasterManifest(env: Env): Response {
  const manifest = {
    accountAssociation: {
      header:    env.FARCASTER_MANIFEST_HEADER    ?? '',
      payload:   env.FARCASTER_MANIFEST_PAYLOAD   ?? '',
      signature: env.FARCASTER_MANIFEST_SIGNATURE ?? '',
    },
    miniapp: {
      version:               '1',
      name:                  'BridgeWorld',
      iconUrl:               'https://bridgeworld.lol/favicon.ico',
      homeUrl:               'https://bridgeworld.lol',
      imageUrl:              'https://bridgeworld.lol/BridgeWorld.png',
      buttonTitle:           'Enter BridgeWorld',
      splashImageUrl:        'https://bridgeworld.lol/BridgeWorld.png',
      splashBackgroundColor: '#000000',
      description:           'Sovereign avatar economy — SAOL · Bridgeworld · Abstract chain',
      requiredChains:        ['eip155:8453', 'eip155:2741'],
      requiredCapabilities:  ['actions.signIn'],
      webhookUrl:            'https://bridgeworld.lol/api/farcaster/webhook',
    },
    frame: {
      version:               '1',
      name:                  'BridgeWorld',
      iconUrl:               'https://bridgeworld.lol/favicon.ico',
      homeUrl:               'https://bridgeworld.lol',
      imageUrl:              'https://bridgeworld.lol/BridgeWorld.png',
      buttonTitle:           'Enter BridgeWorld',
      splashImageUrl:        'https://bridgeworld.lol/BridgeWorld.png',
      splashBackgroundColor: '#000000',
    },
  };
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      'Content-Type':                'application/json',
      'Cache-Control':               'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function handleFarcasterWebhook(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  // TODO: handle notifications, events
  return new Response(JSON.stringify({ ok: true, received: body }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
