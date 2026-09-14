import type { Href } from 'expo-router';

/** Bypass typedRoutes until expo-router regenerates route unions after new screens. */
export function href(path: string): Href {
  return path as Href;
}
