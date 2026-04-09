const mongoose = require("mongoose");
const { normalizeName, normalizePhone, getWeekStartDate } = require("../utils/validators");

const bookingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      trim: true,
    },
    normalizedPhone: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    weekStart: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ date: 1, time: 1 }, { unique: true });
bookingSchema.index(
  { normalizedName: 1, normalizedPhone: 1, weekStart: 1 },
  { unique: true }
);

bookingSchema.pre("validate", function setDerivedFields(next) {
  this.normalizedName = normalizeName(this.name);
  this.normalizedPhone = normalizePhone(this.phone);
  this.weekStart = getWeekStartDate(this.date);
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
