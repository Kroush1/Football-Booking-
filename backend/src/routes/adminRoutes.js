const express = require("express");
const Booking = require("../models/Booking");
const adminAuth = require("../middleware/adminAuth");
const asyncHandler = require("../utils/asyncHandler");
const {
  getWeekday,
  dateInRange,
  isValidDateString,
  normalizeName,
  normalizeSlots,
  sanitizeBookingPayload,
  validateBookingPayload,
} = require("../utils/validators");
const { getOrCreateConfig, resolveSlotsForDate } = require("../services/configService");

function createAdminRouter(io) {
  const router = express.Router();

  router.post("/auth/login", (_req, res) => {
    return res.json({ ok: true });
  });

  router.use(adminAuth);

  router.get("/bookings", asyncHandler(async (_req, res) => {
    const bookings = await Booking.find().sort({ date: 1, time: 1, createdAt: -1 });
    return res.json(bookings);
  }));

  router.put("/booking/:id", asyncHandler(async (req, res) => {
    const payload = sanitizeBookingPayload(req.body);
    const errors = validateBookingPayload(payload);
    if (errors.length > 0) {
      return res.status(400).json({ message: errors.join(", ") });
    }

    const config = await getOrCreateConfig();
    if (!dateInRange(payload.date, config.startDate, config.endDate)) {
      return res.status(400).json({ message: "Date is outside allowed range" });
    }

    const weekday = getWeekday(payload.date);
    const allowedSlots = resolveSlotsForDate(config, payload.date, weekday);
    if (!allowedSlots.includes(payload.time)) {
      return res.status(400).json({ message: "Time is not in available slots" });
    }

    const existing = await Booking.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const sameNameBooking = await Booking.findOne({
      normalizedName: normalizeName(payload.name),
      _id: { $ne: req.params.id },
    }).lean();
    if (sameNameBooking) {
      return res.status(409).json({ message: "الاسم مسجل مسبقًا" });
    }

    existing.name = payload.name;
    existing.phone = payload.phone;
    existing.date = payload.date;
    existing.time = payload.time;
    await existing.save();

    io.emit("booking:updated", existing);
    return res.json(existing);
  }));

  router.delete("/booking/:id", asyncHandler(async (req, res) => {
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Booking not found" });
    }
    io.emit("booking:deleted", deleted._id.toString());
    return res.json({ message: "Booking deleted" });
  }));

  router.put("/config", asyncHandler(async (req, res) => {
    const { startDate, endDate, availableSlots, slotsByDay } = req.body || {};
    if (!isValidDateString(String(startDate)) || !isValidDateString(String(endDate))) {
      return res.status(400).json({ message: "startDate and endDate must be YYYY-MM-DD" });
    }
    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      return res.status(400).json({ message: "startDate must be before or equal to endDate" });
    }

    const config = await getOrCreateConfig();
    config.startDate = startDate;
    config.endDate = endDate;
    config.availableSlots = normalizeSlots(availableSlots);

    if (slotsByDay && typeof slotsByDay === "object") {
      const sanitized = {};
      for (const [day, slots] of Object.entries(slotsByDay)) {
        sanitized[day] = normalizeSlots(slots);
      }
      config.slotsByDay = sanitized;
    }

    await config.save();
    io.emit("config:updated", config);
    return res.json(config);
  }));

  return router;
}

module.exports = createAdminRouter;
