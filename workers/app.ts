import { createRequestHandler, type ServerBuild } from 'react-router';

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
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx, cf: request.cf },
    });
  },
} satisfies ExportedHandler<Env>;
