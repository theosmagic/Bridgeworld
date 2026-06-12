/**
 * Standalone claim edge worker — /claim + /covenant.phase0.json
 * Deploy: pnpm run deploy:claim
 */
import { handleClaimEdge } from './claim';

export default {
  fetch(request: Request): Response {
    const claim = handleClaimEdge(request);
    if (claim) return claim;
    return Response.redirect('https://bridgeworld.lol/', 302);
  },
} satisfies ExportedHandler;
