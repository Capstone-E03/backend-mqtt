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
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', apiRoutes);

// Initialize Socket.IO for real-time communication
const io = new Server(server, {
  cors: {
    origin: '*', // Change this to your frontend URL in production
    methods: ['GET', 'POST']
  }
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
  io.emit('mqtt_message', { topic, message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
