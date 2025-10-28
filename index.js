require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const apiRoutes = require('./routes/api');
const { initMqtt } = require('./mqttClient');
const connectDB = require('./database');
const Classification = require('./models/Classification');

const app = express();
const server = http.createServer(app);

connectDB();

// Enable CORS and JSON parsing
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

// Initialize Socket.IO for real-time communication
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*', // frontend URL in production
    methods: ['GET', 'POST'],
  },
});

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log(`🧠 Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Initialize MQTT connection
initMqtt(async (topic, message) => {
  console.log(`📩 MQTT message received | Topic: ${topic} | Message:`, message);

  // Forward the message to all connected Socket.IO clients
  io.emit('sensorData', { topic, message });

  try {
    const classification = new Classification({
      result: message.result || JSON.stringify(message),
      timestamp: message.timestamp || new Date(),
    });

    await classification.save();
    console.log("✅ Classification data saved to MongoDB");
  } catch (err) {
    console.error("❌ Failed to save classification:", err.message);
  }
});

const PORT = process.env.PORT ;
server.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);

