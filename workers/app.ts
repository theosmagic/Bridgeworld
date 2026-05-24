import { createRequestHandler, type ServerBuild } from 'react-router';
import { handleAPI } from './api';

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
    // ── API routes (subgraph proxy, manifests, agents, webhooks) ─────
    const apiResponse = handleAPI(request, env);
    if (apiResponse) return apiResponse;

    // ── React Router SSR (Cloudflare Workers only) ───────────────────
    const response = await requestHandler(request, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cloudflare: { env, ctx, cf: request.cf as any },
    });

    // Inject Farcaster snap discovery Link header on HTML responses
    const ct = response.headers.get('Content-Type') ?? '';
    if (ct.includes('text/html')) {
      const headers = new Headers(response.headers);
      headers.set(
        'Link',
        '<https://bridgeworld.lol/.well-known/farcaster.json>; rel="alternate"; type="application/vnd.farcaster.snap+json"',
      );
      return new Response(response.body, { status: response.status, headers });
    }

    return response;
  },
} satisfies ExportedHandler<Env>;
