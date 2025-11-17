require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const apiRoutes = require("./routes/api");
const { initMqtt } = require("./mqttClient");
const { initSerial } = require("./serialClient");
const connectDB = require("./database");
const Classification = require("./models/classification");
const Preservation = require("./models/preservation");
const { exportToCSV, exportSensorDataToCSV, exportClassificationHistoryToCSV, exportCombinedDataToCSV } = require("./csvExportService");

// Cache per device agar hanya save jika berubah
const lastFreshByDevice = new Map();
const lastPreservationByDevice = new Map();

// In-memory storage for raw sensor data (will be exported to CSV)
const sensorDataHistory = [];

// In-memory storage for ALL classification results (will be exported to CSV)
const classificationHistory = [];

// Helper ambil deviceId bila ada; jika tidak, pakai 'default'
function getDeviceKey(topic, message) {
  return message?.deviceId || message?.message?.deviceId || "default";
}

const app = express();
const server = http.createServer(app);

const liveDataCache = {
  sensor: {},
  fresh: null,
  preservation: null,
  monitoringStartedAt: null, // Akan di-update oleh monitoringStartedAt
};

let monitoringStartedAt = null;

connectDB();

// Enable CORS and JSON parsing
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Middleware untuk meneruskan cache ke API routes
app.use("/api", (req, res, next) => {
  req.liveDataCache = liveDataCache;
  req.sensorDataHistory = sensorDataHistory; // Pass sensor history to API routes
  req.classificationHistory = classificationHistory; // Pass classification history to API routes
  next();
});

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

  socket.emit("mqttStatus", { connectedAt: liveDataCache.monitoringStartedAt });

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Shared message handler for both MQTT and Serial data
async function handleIncomingMessage(topic, message) {
    console.log(`📩 MQTT message received | Topic: ${topic} | Message:`, message);

    switch (topic) {
      case "stm32/sensor/data": {
        let isFirstData = false;
        if (monitoringStartedAt === null) {
          monitoringStartedAt = new Date();
          isFirstData = true;
          console.log(`✅ Monitoring started at: ${monitoringStartedAt}`);
          liveDataCache.monitoringStartedAt = monitoringStartedAt;
        }
        io.emit("sensorData", { topic, message });
        Object.assign(liveDataCache.sensor, message);

        // Store sensor data in memory for CSV export
        const sensorEntry = {
          timestamp: new Date().toISOString(),
          mq135_ppm: message.mq135_ppm || 0,
          mq2_ppm: message.mq2_ppm || 0,
          temperature: message.T || message.temperature || 0,
          humidity: message.RH || message.humidity || 0,
          pH: message.pH || null,
        };
        sensorDataHistory.push(sensorEntry);
        console.log(`📊 [Memory] Sensor data stored (total: ${sensorDataHistory.length} records)`);

        if (isFirstData) {
          io.emit("mqttStatus", { connectedAt: liveDataCache.monitoringStartedAt });
        }
        break;
      }

      case "capstone/e03/fish": {
        // Payload mendukung { fresh: 'KS' } atau { message: { fresh: 'KS' } }
        const fresh = message?.fresh ?? message?.message?.fresh;
        const freshValue = message?.freshValue ?? message?.message?.freshValue;
        io.emit("freshness", { topic, message }); // tetap broadcast ke FE

        liveDataCache.fresh = fresh; // Simpan ke cache

        if (typeof fresh !== "undefined") {
          const devKey = getDeviceKey(topic, message);
          const last = lastFreshByDevice.get(devKey);

          // Store ALL freshness results in memory (for CSV export)
          const classificationEntry = {
            timestamp: new Date().toISOString(),
            type: "freshness",
            result: String(fresh),
            value: freshValue !== undefined ? parseFloat(freshValue) : null,
          };
          classificationHistory.push(classificationEntry);
          console.log(`📊 [Memory] Freshness classification stored: ${fresh} (total: ${classificationHistory.length} records)`);

          // Only save to DB if changed
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
        const preservationValue = message?.preservationValue ?? message?.message?.preservationValue;
        io.emit("preservation", { topic, message }); // tetap broadcast ke FE

        liveDataCache.preservation = preservation; // Simpan ke cache

        if (typeof preservation !== "undefined") {
          const devKey = getDeviceKey(topic, message);
          const last = lastPreservationByDevice.get(devKey);

          // Store ALL preservation results in memory (for CSV export)
          const classificationEntry = {
            timestamp: new Date().toISOString(),
            type: "preservation",
            result: String(preservation),
            value: preservationValue !== undefined ? parseFloat(preservationValue) : null,
          };
          classificationHistory.push(classificationEntry);
          console.log(`📊 [Memory] Preservation classification stored: ${preservation} (total: ${classificationHistory.length} records)`);

          // Only save to DB if changed
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
}

// Auto-export handler when device disconnects
async function handleDisconnect(source = "Device") {
  console.log(`⚠️  [${source}] STM32 disconnected - triggering auto CSV export...`);

  // Auto-export data to CSV when STM32 disconnects
  try {
    // Export classification data (from database)
    await exportToCSV("./exports");
    console.log("✅ [Auto Export] Classification CSV files created successfully");

    // Export raw sensor data (from memory)
    const sensorFile = exportSensorDataToCSV(sensorDataHistory, "./exports");
    if (sensorFile) {
      console.log("✅ [Auto Export] Raw sensor data CSV file created successfully");
    }

    // Export classification history (from memory)
    const classificationFile = exportClassificationHistoryToCSV(classificationHistory, "./exports");
    if (classificationFile) {
      console.log("✅ [Auto Export] Classification history CSV file created successfully");
    }

    // Export combined data (sensor + classification)
    const combinedFile = exportCombinedDataToCSV(sensorDataHistory, classificationHistory, "./exports");
    if (combinedFile) {
      console.log("✅ [Auto Export] Combined data CSV file created successfully");
    }

    // Clear histories after export
    sensorDataHistory.length = 0;
    classificationHistory.length = 0;
    console.log("🗑️  [Memory] Sensor data and classification history cleared");
  } catch (error) {
    console.error("❌ [Auto Export] Failed:", error.message);
  }

  monitoringStartedAt = null;
  liveDataCache.monitoringStartedAt = null;
  liveDataCache.sensor = {};
  io.emit("mqttStatus", { connectedAt: null });
}

// Determine connection mode from environment
const USE_MQTT = process.env.USE_MQTT !== "false"; // default true
const USE_SERIAL = process.env.USE_SERIAL === "true"; // default false

console.log(`\n📡 Connection Mode: MQTT=${USE_MQTT}, Serial=${USE_SERIAL}\n`);

// Initialize MQTT connection (if enabled)
if (USE_MQTT) {
  initMqtt({
    onConnect: () => {
      io.emit("mqttStatus", { connectedAt: liveDataCache.monitoringStartedAt });
    },
    onOffline: () => handleDisconnect("MQTT"),
    onMessageCallback: handleIncomingMessage,
  });
}

// Initialize Serial connection (if enabled)
if (USE_SERIAL) {
  initSerial({
    onConnect: () => {
      console.log("✅ [Serial] STM32 connected via serial port");
      io.emit("mqttStatus", { connectedAt: liveDataCache.monitoringStartedAt });
    },
    onDisconnect: () => handleDisconnect("Serial"),
    onMessageCallback: handleIncomingMessage,
  });
}

if (!USE_MQTT && !USE_SERIAL) {
  console.warn("⚠️  WARNING: Both MQTT and Serial are disabled. No data will be received!");
}

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
