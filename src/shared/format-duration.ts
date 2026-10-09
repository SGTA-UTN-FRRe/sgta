/** Formats minute-based durations; signs are reserved for movement values. */
export function formatDuration(minutes: number, { signed = false }: { signed?: boolean } = {}) {
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const remainder = absolute % 60;
  const duration = hours ? `${hours} h${remainder ? ` ${remainder} min` : ""}` : `${remainder} min`;
  return `${signed && minutes !== 0 ? (minutes < 0 ? "−" : "+") : ""}${duration}`;
}
