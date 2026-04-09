require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in environment");
  }

  await mongoose.connect(mongoUri);

  // Ensure model is registered with new schema + indexes
  const Booking = require("../src/models/Booking");

  const collection = Booking.collection;
  const existing = await collection.indexes();

  const indexNames = new Set(existing.map((i) => i.name));
  const toDrop = ["phone_1", "normalizedName_1"].filter((n) => indexNames.has(n));

  for (const name of toDrop) {
    // eslint-disable-next-line no-console
    console.log(`Dropping index: ${name}`);
    await collection.dropIndex(name);
  }

  // eslint-disable-next-line no-console
  console.log("Syncing indexes from schema...");
  await Booking.syncIndexes();

  const after = await collection.indexes();
  // eslint-disable-next-line no-console
  console.log("Indexes after migration:");
  for (const i of after) {
    // eslint-disable-next-line no-console
    console.log(`- ${i.name}: ${JSON.stringify(i.key)}`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

