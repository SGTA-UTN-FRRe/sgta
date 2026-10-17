export function movementHistoryHref(cycleId?: string, tutorId?: string, categoryId?: string) {
  const params = new URLSearchParams();
  if (cycleId) params.set("cycleId", cycleId);
  if (tutorId) params.set("tutorId", tutorId);
  if (categoryId) params.set("categoryId", categoryId);
  const query = params.toString();
  return `/admin/hours/movements${query ? `?${query}` : ""}`;
}
