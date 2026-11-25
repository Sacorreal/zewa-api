const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Bogota',
});

/** Fecha y hora legibles en hora de Colombia. */
export function formatDateTime(date: Date): string {
  return DATE_TIME_FORMATTER.format(date);
}
