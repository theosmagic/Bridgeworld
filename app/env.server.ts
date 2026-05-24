import { env } from 'cloudflare:workers';

export type Env = {
  [K in keyof Cloudflare.Env as Cloudflare.Env[K] extends string
    ? K
    : never]: Cloudflare.Env[K];
};

export type PublicEnv = {
  [K in keyof Env as K extends `PUBLIC_${string}` ? K : never]: Env[K];
};

export function getEnv() {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => key.startsWith('PUBLIC_')),
  ) as PublicEnv;
}

export type PUBLIC_ENV = ReturnType<typeof getEnv>;
