require("dotenv").config();
const mongoose = require("mongoose");
const Booking = require("../src/models/Booking");

function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in environment");
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const bookings = await Booking.find().sort({ createdAt: 1 }).lean();
  const keepByName = new Map();
  const toDelete = [];

  for (const b of bookings) {
    const key = normalizeName(b.name);
    if (!key) continue;

    if (!keepByName.has(key)) {
      keepByName.set(key, b._id.toString());
    } else {
      toDelete.push(b._id);
    }
  }

  if (toDelete.length === 0) {
    console.log("No duplicate names found.");
    await mongoose.disconnect();
    return;
  }

  const result = await Booking.deleteMany({ _id: { $in: toDelete } });
  console.log(`Deleted duplicate bookings: ${result.deletedCount}`);

  await mongoose.disconnect();
  console.log("Done.");
}

run().catch(async (err) => {
  console.error("Cleanup failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch (_e) {}
  process.exit(1);
});
