require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const apiRoutes = require('./routes/api');
const { initMqtt } = require('./mqttClient');
const connectDB = require('./database');
const Classification = require('./models/classification'); // asumsi schema: { result, timestamp, topic?, tag? }

const app = express();
const server = http.createServer(app);

connectDB();

// ————————————————————————————————————————————
// CORS & JSON
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// REST routes
app.use('/api', apiRoutes);

// ————————————————————————————————————————————
// Socket.IO (multi-namespace)
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

// default namespace (opsional untuk log)
io.on('connection', (socket) => {
  console.log(`🧠 [/] Socket connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`❌ [/] Socket disconnected: ${socket.id}`));
});

// /sensor namespace
const nspSensor = io.of('/sensor');
nspSensor.on('connection', (socket) => {
  console.log(`🧪 [/sensor] connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`❌ [/sensor] disconnected: ${socket.id}`));
});

// /freshness namespace
const nspFresh = io.of('/freshness');
nspFresh.on('connection', (socket) => {
  console.log(`🥗 [/freshness] connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`❌ [/freshness] disconnected: ${socket.id}`));
});

// /preservation namespace
const nspPres = io.of('/preservation');
nspPres.on('connection', (socket) => {
  console.log(`🧊 [/preservation] connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`❌ [/preservation] disconnected: ${socket.id}`));
});

// ————————————————————————————————————————————
// Helper: ekstrak deviceId dari topik prefix
function deviceKeyFromTopic(topic, prefix) {
  if (!topic || !prefix) return 'default';
  if (!topic.startsWith(prefix)) return 'default';
  const rest = topic.slice(prefix.length); // sisa setelah prefix
  const key = rest.replace(/^\//, '');     // buang slash awal
  return key || 'default';
}

// Cache untuk deteksi perubahan
const lastFreshByDevice = new Map();        // key: deviceId → value: 'SS'|'S'|'KS'|'B'
const lastPreservationByDevice = new Map(); // key: deviceId → value: mis. 'Aman'|'Wajib Es'

// ————————————————————————————————————————————
// MQTT handler → routing ke Socket.IO + simpan jika berubah
initMqtt(async (topic, message) => {
  // message diasumsikan sudah berupa object
  console.log(`📩 MQTT | Topic: ${topic} | Message:`, message);

  try {
    // 1) SENSOR DATA
    //   topic contoh: "stm32/sensor/" atau "stm32/sensor/DEV123"
    if (topic.startsWith('stm32/sensor')) {
      nspSensor.emit('sensorData', { topic, message });
    }

    // 2) FRESHNESS
    //   topic: "capstone/e03/fish"
    if (topic === 'capstone/e03/fish') {
      // dukung {fresh:'KS'} atau {message:{fresh:'KS'}}
      const fresh = message?.fresh ?? message?.message?.fresh;
      if (typeof fresh !== 'undefined') {
        nspFresh.emit('freshness', { topic, fresh });

        // simpan jika berubah
        const devKey = deviceKeyFromTopic(topic, 'capstone/e03/fish'); // topik ini fixed → 'default'
        const last = lastFreshByDevice.get(devKey);
        if (last !== fresh) {
          lastFreshByDevice.set(devKey, fresh);

          // simpan ke MongoDB (bebas sesuaikan schema)
          try {
            const doc = new Classification({
              result: String(fresh),                     // simpan kode fresh
              timestamp: new Date(),
              topic,
              tag: 'freshness',                          // kalau schema ada field tambahan
            });
            await doc.save();
            console.log(`✅ Freshness changed → saved: ${fresh}`);
          } catch (e) {
            console.error('❌ Failed to save freshness:', e.message);
          }
        }
      }
    }

    // 3) PRESERVATION
    //   topic: "capstone/e03/preservation"
    if (topic === 'capstone/e03/preservation') {
      // dukung {preservation:'Aman'} atau {message:{preservation:'Aman'}}
      const preservation = message?.preservation ?? message?.message?.preservation;
      if (typeof preservation !== 'undefined') {
        nspPres.emit('preservation', { topic, preservation });

        // simpan jika berubah
        const devKey = deviceKeyFromTopic(topic, 'capstone/e03/preservation'); // fixed → 'default'
        const last = lastPreservationByDevice.get(devKey);
        if (last !== preservation) {
          lastPreservationByDevice.set(devKey, preservation);

          try {
            const doc = new Classification({
              result: String(preservation),
              timestamp: new Date(),
              topic,
              tag: 'preservation',
            });
            await doc.save();
            console.log(`✅ Preservation changed → saved: ${preservation}`);
          } catch (e) {
            console.error('❌ Failed to save preservation:', e.message);
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ MQTT routing error:', err);
  }
});

// ————————————————————————————————————————————
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
