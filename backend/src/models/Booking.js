const mongoose = require("mongoose");

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
      unique: true,
      trim: true,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
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
  },
  { timestamps: true }
);

bookingSchema.index({ date: 1, time: 1 }, { unique: true });

bookingSchema.pre("validate", function setNormalizedName(next) {
  this.normalizedName = String(this.name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
  next();
});

module.exports = mongoose.model("Booking", bookingSchema);
