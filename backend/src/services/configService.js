const Config = require("../models/Config");
const { normalizeSlots } = require("../utils/validators");

const DEFAULT_CONFIG = {
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10),
  availableSlots: ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00"],
  slotsByDay: {},
};

async function getOrCreateConfig() {
  let config = await Config.findOne();
  if (!config) {
    config = await Config.create(DEFAULT_CONFIG);
  }

  config.availableSlots = normalizeSlots(config.availableSlots);
  if (config.isModified("availableSlots")) {
    await config.save();
  }
  return config;
}

function resolveSlotsForDate(config, date, weekday) {
  const daySlots = config.slotsByDay?.get?.(weekday) || config.slotsByDay?.[weekday];
  if (Array.isArray(daySlots) && daySlots.length > 0) {
    return normalizeSlots(daySlots);
  }
  return normalizeSlots(config.availableSlots);
}

module.exports = { getOrCreateConfig, resolveSlotsForDate };
