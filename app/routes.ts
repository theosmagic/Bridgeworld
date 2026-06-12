import { index, route, type RouteConfig } from '@react-router/dev/routes';

export default [
  index('routes/index.tsx'),
  route('claim', 'routes/claim.tsx'),
  // treasure.bridgeworld.lol — Fren creation gateway
  // Each Fren gets a Covenant-anchored project space; observers watch silently above and below
  route('fren',           'routes/fren/index.tsx'),
  route('fren/:frenId',   'routes/fren/$frenId.tsx'),
] satisfies RouteConfig;
