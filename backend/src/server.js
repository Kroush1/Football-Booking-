require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const createPublicRouter = require("./routes/publicRoutes");
const createAdminRouter = require("./routes/adminRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/", createPublicRouter(io));
app.use("/admin", createAdminRouter(io));

app.use((err, _req, res, _next) => {
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    if (field === "phone") {
      return res.status(409).json({ message: "رقم الهاتف لديه حجز مسبقًا" });
    }
    if (field === "date" || field === "time") {
      return res.status(409).json({ message: "This slot is already booked" });
    }
    return res.status(409).json({ message: "Duplicate value error" });
  }
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
});

async function bootstrap() {
  const port = process.env.PORT || 5000;
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("MONGO_URI is missing in environment");
  await mongoose.connect(mongoUri);
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
