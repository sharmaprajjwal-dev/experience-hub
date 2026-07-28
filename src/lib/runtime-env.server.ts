import { env } from 'cloudflare:workers';

export type RuntimeEnvironment = Record<string, string | undefined>;

/**
 * Reads Cloudflare Worker variables and secrets at request time.
 *
 * Keeping server credentials behind this module prevents Vite from replacing
 * secret values in browser bundles. Optional overrides make the dependent
 * utilities straightforward to validate without live credentials.
 */
export function getRuntimeEnvironment(
  override?: RuntimeEnvironment,
): RuntimeEnvironment {
  return override ?? (env as unknown as RuntimeEnvironment);
}
