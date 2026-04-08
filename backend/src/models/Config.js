const mongoose = require("mongoose");

const configSchema = new mongoose.Schema(
  {
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },
    availableSlots: {
      type: [String],
      default: [],
    },
    slotsByDay: {
      type: Map,
      of: [String],
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Config", configSchema);
