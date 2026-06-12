/**
 * Golem / Cycle-2 agent WebSocket gateway.
 * Path: /agents/chat/external:{agentId}  (CFConnector.cs)
 *
 * AGENT_WS_BACKEND — optional upstream, e.g. ws://system76.ht.local:8787
 * When unset, accepts connections and returns JSON ack frames (dev stub).
 */

export async function handleAgentWebSocket(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/agents/chat/')) {
    return null;
  }

  const upgrade = request.headers.get('Upgrade');
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return new Response('WebSocket upgrade required', {
      status: 426,
      headers: { Upgrade: 'websocket', Connection: 'Upgrade' },
    });
  }

  const backend = env.AGENT_WS_BACKEND?.trim();
  if (backend) {
    const target = new URL(url.pathname + url.search, backend);
    target.protocol = target.protocol === 'https:' ? 'wss:' : target.protocol === 'http:' ? 'ws:' : target.protocol;
    return fetch(target.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
  }

  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();

  const agentId =
    url.pathname.replace(/^\/agents\/chat\/external:/, '') ||
    url.pathname.split('/').pop() ||
    'unknown';

  server.send(
    JSON.stringify({
      type: 'connected',
      agentId,
      backend: 'bridgeworld-worker-stub',
      cycle: 2,
      path: url.pathname,
    }),
  );

  server.addEventListener('message', (event) => {
    const raw = typeof event.data === 'string' ? event.data : '';
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      server.send(
        JSON.stringify({
          type: 'ack',
          agentId,
          received: parsed,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch {
      server.send(
        JSON.stringify({
          type: 'echo',
          agentId,
          data: raw,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  });

  server.addEventListener('error', (err) => {
    console.error('[agent-ws]', agentId, err);
  });

  return new Response(null, { status: 101, webSocket: client });
}
