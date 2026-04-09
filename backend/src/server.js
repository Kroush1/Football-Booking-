require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const createPublicRouter = require("./routes/publicRoutes");
const createAdminRouter = require("./routes/adminRoutes");

const app = express();
const isVercel = Boolean(process.env.VERCEL);
const io = isVercel
  ? { emit: () => {} } // Vercel serverless does not keep WebSocket connections.
  : new Server(http.createServer(app), {
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
    const keyPattern = err.keyPattern || {};
    const hasSameWeekKeys =
      keyPattern.normalizedName && keyPattern.normalizedPhone && keyPattern.weekStart;
    if (hasSameWeekKeys) {
      return res
        .status(409)
        .json({ message: "لا يمكن الحجز بنفس الاسم ورقم الهاتف في نفس الأسبوع" });
    }

    const field = Object.keys(keyPattern)[0];
    if (field === "date" || field === "time") {
      return res.status(409).json({ message: "هذا الموعد محجوز بالفعل" });
    }
    return res.status(409).json({ message: "قيمة مكررة غير مسموح بها" });
  }
  console.error(err);
  return res.status(500).json({ message: "حدث خطأ داخلي في الخادم" });
});

let mongoConnectPromise = null;
function connectToDatabase() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in environment");
  }
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }
  if (!mongoConnectPromise) {
    mongoConnectPromise = mongoose.connect(mongoUri);
  }
  return mongoConnectPromise;
}

if (!isVercel) {
  const server = io.httpServer;
  const port = process.env.PORT || 5000;
  connectToDatabase()
    .then(() => {
      server.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server", error);
      process.exit(1);
    });
}

module.exports = async (req, res) => {
  try {
    await connectToDatabase();
    return app(req, res);
  } catch (error) {
    console.error("Database connection failed", error);
    return res.status(500).json({ message: "فشل الاتصال بقاعدة البيانات" });
  }
};
