import type { Destination } from './types';
import { webhookDestination } from './webhook';

/**
 * Registry of available destinations.
 *
 * To add a CRM: implement Destination in its own file, import it here, and add
 * it to this array. Nothing in the toolbar, service worker or options page
 * needs to change.
 */
export const DESTINATIONS: readonly Destination[] = [webhookDestination];

export const DEFAULT_DESTINATION_ID = webhookDestination.id;

export function getDestination(id: string): Destination {
  return DESTINATIONS.find((d) => d.id === id) ?? webhookDestination;
}

export type { Destination, DestinationConfig, PushResult, PushRequest } from './types';
