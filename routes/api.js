const express = require('express');
const router = express.Router();
const { publish } = require('../mqttClient');

// Example test route
router.get('/', (req, res) => {
  res.json({ message: 'Backend MQTT API is running 🚀' });
});

// Example route to publish message to MQTT
router.post('/publish', (req, res) => {
  const { topic, message } = req.body;

  if (!topic || !message) {
    return res.status(400).json({ error: 'Missing topic or message' });
  }

  try {
    publish(topic, message);
    res.json({ success: true, topic, message });
  } catch (err) {
    console.error('Publish error:', err);
    res.status(500).json({ error: 'Failed to publish message' });
  }
});

module.exports = router;
