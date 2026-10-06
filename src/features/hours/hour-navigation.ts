export function movementHistoryHref(cycleId: string, tutorId: string) {
  const params = new URLSearchParams({ cycleId, tutorId });
  return `/admin/hours/movements?${params.toString()}`;
}
