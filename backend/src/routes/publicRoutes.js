const express = require("express");
const { stringify } = require("csv-stringify/sync");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");
const {
  getWeekday,
  dateInRange,
  isValidDateString,
  isPastDate,
  normalizeName,
  normalizePhone,
  getWeekStartDate,
  sanitizeBookingPayload,
  validateBookingPayload,
} = require("../utils/validators");
const { getOrCreateConfig, resolveSlotsForDate } = require("../services/configService");

function formatTimeArabicPeriod(time24) {
  if (!time24 || !/^\d{2}:\d{2}$/.test(time24)) return time24;
  const [h, m] = time24.split(":").map(Number);
  let period = "الليل";
  if (h >= 3 && h <= 5) period = "الفجر";
  else if (h >= 6 && h <= 11) period = "الصباح";
  else if (h >= 12 && h <= 17) period = "العصر";
  else period = "الليل";
  const hour12 = h % 12 || 12;
  if (m === 0) return `${hour12} ${period}`;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatArabicDateWithWeekday(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const weekday = new Date(`${date}T00:00:00.000Z`).toLocaleDateString("ar-EG", {
    weekday: "long",
    timeZone: "UTC",
  });
  return `${date} (${weekday})`;
}

function createPublicRouter(io) {
  const router = express.Router();

  router.get("/config", asyncHandler(async (_req, res) => {
    const config = await getOrCreateConfig();
    res.json(config);
  }));

  router.get("/slots", asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date || !isValidDateString(String(date))) {
      return res.status(400).json({ message: "date query is required and must be YYYY-MM-DD" });
    }

    const config = await getOrCreateConfig();
    if (isPastDate(String(date))) {
      return res.json({ date: String(date), slots: [] });
    }
    if (!dateInRange(date, config.startDate, config.endDate)) {
      return res.json({ date, slots: [] });
    }

    const weekday = getWeekday(date);
    const baseSlots = resolveSlotsForDate(config, date, weekday);
    const booked = await Booking.find({ date }).select("time -_id");
    const bookedTimes = new Set(booked.map((b) => b.time));
    const slots = baseSlots.filter((slot) => !bookedTimes.has(slot));

    return res.json({ date, slots });
  }));

  router.post("/book", asyncHandler(async (req, res) => {
    const payload = sanitizeBookingPayload(req.body);
    const errors = validateBookingPayload(payload);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(", ") });
    }

    const weekStart = getWeekStartDate(payload.date);
    const existingSameWeek = await Booking.findOne({
      normalizedName: normalizeName(payload.name),
      normalizedPhone: normalizePhone(payload.phone),
      weekStart,
    }).lean();
    if (existingSameWeek) {
      return res.status(409).json({
        message: "لا يمكن الحجز بنفس الاسم ورقم الهاتف في نفس الأسبوع",
      });
    }

    const config = await getOrCreateConfig();
    if (isPastDate(payload.date)) {
      return res.status(400).json({ message: "لا يمكن الحجز في يوم انتهى" });
    }
    if (!dateInRange(payload.date, config.startDate, config.endDate)) {
      return res.status(400).json({ message: "Date is outside allowed range" });
    }

    const weekday = getWeekday(payload.date);
    const allowedSlots = resolveSlotsForDate(config, payload.date, weekday);
    if (!allowedSlots.includes(payload.time)) {
      return res.status(400).json({ message: "Time is not in available slots" });
    }

    const booking = await Booking.create(payload);
    io.emit("booking:created", booking);
    return res.status(201).json(booking);
  }));

  router.get("/export", asyncHandler(async (req, res) => {
    const { date } = req.query || {};
    const dateStr = date ? String(date) : "";
    if (dateStr && !isValidDateString(dateStr)) {
      return res.status(400).json({ message: "date query must be YYYY-MM-DD" });
    }

    const filter = dateStr ? { date: dateStr } : {};
    const bookings = await Booking.find(filter).sort({ date: 1, time: 1, createdAt: -1 }).lean();
    const rows = bookings.map((b) => ({
      id: String(b._id),
      name: b.name,
      phone: b.phone,
      date: formatArabicDateWithWeekday(b.date),
      time: formatTimeArabicPeriod(b.time),
    }));
    const csv = stringify(rows, {
      header: true,
      columns: [
        { key: "id", header: "id" },
        { key: "name", header: "name" },
        { key: "phone", header: "phone" },
        { key: "date", header: "date" },
        { key: "time", header: "time" },
      ],
    });
    const bom = "\ufeff"; // Helps Excel detect UTF-8 for Arabic text.
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const safeSuffix = dateStr ? `-${dateStr}` : "-all";
    res.setHeader("Content-Disposition", `attachment; filename="bookings${safeSuffix}.csv"`);
    return res.send(bom + csv);
  }));

  return router;
}

module.exports = createPublicRouter;
