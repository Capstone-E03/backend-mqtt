require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const apiRoutes = require("./routes/api");
const { initMqtt } = require("./mqttClient");
const connectDB = require("./database");
const Classification = require("./models/classification");
const Preservation = require("./models/preservation");

// Cache per device agar hanya save jika berubah
const lastFreshByDevice = new Map();
const lastPreservationByDevice = new Map();

// Helper ambil deviceId bila ada; jika tidak, pakai 'default'
function getDeviceKey(topic, message) {
  return message?.deviceId || message?.message?.deviceId || "default";
}

const app = express();
const server = http.createServer(app);

connectDB();

// Enable CORS and JSON parsing
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Mount API routes
app.use("/api", apiRoutes);

// Initialize Socket.IO for real-time communication
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // frontend URL in production
    methods: ["GET", "POST"],
  },
});

// Handle WebSocket connections
io.on("connection", (socket) => {
  console.log(`🧠 Socket connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Initialize MQTT connection
// Initialize MQTT connection
initMqtt(async (topic, message) => {
  console.log(`📩 MQTT message received | Topic: ${topic} | Message:`, message);

  switch (topic) {
    case "stm32/sensor/data": {
      io.emit("sensorData", { topic, message });
      break;
    }

    case "capstone/e03/fish": {
      // Payload mendukung { fresh: 'KS' } atau { message: { fresh: 'KS' } }
      const fresh = message?.fresh ?? message?.message?.fresh;
      io.emit("freshness", { topic, message }); // tetap broadcast ke FE

      if (typeof fresh !== "undefined") {
        const devKey = getDeviceKey(topic, message);
        const last = lastFreshByDevice.get(devKey);

        if (last !== fresh) {
          lastFreshByDevice.set(devKey, fresh);
          try {
            await new Classification({
              result: String(fresh),
              timestamp: new Date(),
            }).save();
            console.log(
              `✅ [DB] Freshness changed (${devKey}): ${last} -> ${fresh}`
            );
          } catch (err) {
            console.error("❌ [DB] Save freshness failed:", err.message);
          }
        } else {
          console.log(
            `↔️  [DB] Freshness unchanged (${devKey}): ${fresh} (skip save)`
          );
        }
      }
      break;
    }

    case "capstone/e03/preservation": {
      // Payload mendukung { preservation: 'SB' } atau { message: { preservation: 'SB' } }
      const preservation =
        message?.preservation ?? message?.message?.preservation;
      io.emit("preservation", { topic, message }); // tetap broadcast ke FE

      if (typeof preservation !== "undefined") {
        const devKey = getDeviceKey(topic, message);
        const last = lastPreservationByDevice.get(devKey);

        if (last !== preservation) {
          lastPreservationByDevice.set(devKey, preservation);
          try {
            await new Preservation({
              result: String(preservation),
              timestamp: new Date(),
            }).save();
            console.log(
              `✅ [DB] Preservation changed (${devKey}): ${last} -> ${preservation}`
            );
          } catch (err) {
            console.error("❌ [DB] Save preservation failed:", err.message);
          }
        } else {
          console.log(
            `↔️  [DB] Preservation unchanged (${devKey}): ${preservation} (skip save)`
          );
        }
      }
      break;
    }

    default: {
      console.log("Unknown topic:", topic);
    }
  }
});

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
