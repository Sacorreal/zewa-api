/** Canales por los que se consume un evento. */
export const EVENT_CHANNELS = [
  'email',
  'websocket',
  'in-app',
  'audit',
  'internal',
] as const;

export type EventChannel = (typeof EVENT_CHANNELS)[number];
