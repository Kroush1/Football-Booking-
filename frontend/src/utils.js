export function dateRange(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  const result = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

export function dayName(dateString) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  return date.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}
