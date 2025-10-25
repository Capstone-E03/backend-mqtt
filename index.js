require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const apiRoutes = require('./routes/api');
const { initMqtt } = require('./mqttClient');

const app = express();
const server = http.createServer(app);

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
initMqtt((topic, message) => {
  console.log(`📩 MQTT message received | Topic: ${topic} | Message:`, message);

  // Forward the message to all connected Socket.IO clients
  io.emit('sensorData', { topic, message });

  // TODO: Save data to PostgreSQL (optional)
  // e.g., insertSensorData(topic, message);
});

const PORT = process.env.PORT ;
server.listen(PORT, () =>
  console.log(`Backend running on port ${PORT}`)
);

