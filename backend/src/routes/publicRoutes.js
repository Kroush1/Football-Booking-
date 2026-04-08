const express = require("express");
const { stringify } = require("csv-stringify/sync");
const Booking = require("../models/Booking");
const asyncHandler = require("../utils/asyncHandler");
const {
  getWeekday,
  dateInRange,
  isValidDateString,
  sanitizeBookingPayload,
  validateBookingPayload,
} = require("../utils/validators");
const { getOrCreateConfig, resolveSlotsForDate } = require("../services/configService");

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

    const existingNameBooking = await Booking.findOne({ name: payload.name }).lean();
    if (existingNameBooking) {
      return res.status(409).json({ message: "الاسم مسجل مسبقًا" });
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

    const booking = await Booking.create(payload);
    io.emit("booking:created", booking);
    return res.status(201).json(booking);
  }));

  router.get("/export", asyncHandler(async (_req, res) => {
    const bookings = await Booking.find().sort({ date: 1, time: 1, createdAt: -1 }).lean();
    const csv = stringify(bookings, {
      header: true,
      columns: [
        { key: "_id", header: "id" },
        { key: "name", header: "name" },
        { key: "phone", header: "phone" },
        { key: "date", header: "date" },
        { key: "time", header: "time" },
      ],
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="bookings.csv"');
    return res.send(csv);
  }));

  return router;
}

module.exports = createPublicRouter;
