import { createRequestHandler, type ServerBuild } from 'react-router';
import { ecosystemProject } from '../app/data/ecosystem';

declare module 'react-router' {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
      cf: IncomingRequestCfProperties | undefined;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build') as Promise<ServerBuild>,
  import.meta.env.MODE,
);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // ── Subgraph proxy — keeps API keys server-side ───────────────────
    if (url.pathname === '/api/subgraph' && request.method === 'POST') {
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

    // ── Ecosystem manifest discovery ──────────────────────────────────
    if (url.pathname === '/api/manifest') {
      return new Response(JSON.stringify(ecosystemProject), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // ── MemOS agent state gateway (Cycle 2) ───────────────────────────
    if (url.pathname.startsWith('/api/agent/')) {
      const agentId = url.pathname.replace('/api/agent/', '');
      return new Response(
        JSON.stringify({ agentId, status: 'LIVE', cycle: 2, backend: 'arweave' }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
      );
    }

    // ── Golem WebSocket relay — upgrade required ───────────────────────
    if (url.pathname.startsWith('/agents/chat/')) {
      return new Response('WebSocket upgrade required', { status: 426 });
    }

    return requestHandler(request, {
      cloudflare: { env, ctx, cf: request.cf },
    });
  },
} satisfies ExportedHandler<Env>;
