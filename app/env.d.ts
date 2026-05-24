import type { Env, PUBLIC_ENV } from './env.server';

declare global {
  var ENV: PUBLIC_ENV;
  interface Window {
    ENV: ENV;
  }

  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}
