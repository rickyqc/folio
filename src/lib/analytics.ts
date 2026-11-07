// Link-click tracking for the opt-in analytics providers. Nothing here runs unless the owner
// turned analytics on in folio.config.yaml.
import type { FolioConfig } from '../config/schema.ts';

type Provider = FolioConfig['analytics']['provider'];

/**
 * Plausible's script variant that also records clicks on links to other sites, as
 * "Outbound Link: Click" events with the address. Owners add that goal once in Plausible.
 */
export const PLAUSIBLE_SRC = 'https://plausible.io/js/script.outbound-links.js';
export const UMAMI_SRC = 'https://cloud.umami.is/script.js';

/**
 * Attributes that make Umami record a tap on a link, with which link it was. Umami's script
 * reads these itself, so no extra JavaScript is added. Empty for other providers: Plausible's
 * script tracks outbound clicks on its own.
 */
export function clickAttributes(
  provider: Provider,
  label: string,
  url: string,
): Record<string, string> {
  if (provider !== 'umami') return {};
  return {
    'data-umami-event': 'Link click',
    'data-umami-event-link': label.slice(0, 100),
    'data-umami-event-url': url,
  };
}
