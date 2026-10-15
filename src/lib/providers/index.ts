import { geoapifyProvider } from "./geoapify";
import { googleProvider } from "./google";
import { osmProvider } from "./osm";
import type { Provider } from "./types";

/** Order = preference when several providers are configured (best phone coverage first). */
export const ALL_PROVIDERS: Provider[] = [googleProvider, geoapifyProvider, osmProvider];

export function getProvider(name: string): Provider | undefined {
  return ALL_PROVIDERS.find((p) => p.name === name);
}

export function configuredProviders(): Provider[] {
  return ALL_PROVIDERS.filter((p) => p.isConfigured());
}

export type { Provider, RawBusiness } from "./types";
