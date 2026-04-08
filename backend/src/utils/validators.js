const PHONE_REGEX = /^[0-9+\-\s]{7,20}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):00$/;

function isValidDateString(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const d = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime());
}

function dateInRange(date, startDate, endDate) {
  const target = new Date(`${date}T00:00:00.000Z`).getTime();
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return target >= start && target <= end;
}

function normalizeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  const filtered = slots
    .map((slot) => String(slot).trim())
    .filter((slot) => TIME_REGEX.test(slot));
  return [...new Set(filtered)].sort();
}

function getWeekday(date) {
  const d = new Date(`${date}T00:00:00.000Z`);
  return d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
}

function sanitizeBookingPayload(payload) {
  const name = String(payload?.name || "").trim();
  const phone = String(payload?.phone || "").trim();
  const date = String(payload?.date || "").trim();
  const time = String(payload?.time || "").trim();
  return { name, phone, date, time };
}

function validateBookingPayload(payload) {
  const errors = [];
  if (!payload.name) errors.push("Name is required");
  if (!payload.phone) errors.push("Phone is required");
  if (payload.phone && !PHONE_REGEX.test(payload.phone)) {
    errors.push("Phone format is invalid");
  }
  if (!payload.date || !isValidDateString(payload.date)) {
    errors.push("Date is invalid");
  }
  if (!payload.time || !TIME_REGEX.test(payload.time)) {
    errors.push("Time must be full hour format like 09:00");
  }
  return errors;
}

module.exports = {
  TIME_REGEX,
  isValidDateString,
  dateInRange,
  normalizeSlots,
  getWeekday,
  sanitizeBookingPayload,
  validateBookingPayload,
};
