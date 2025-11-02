const express = require('express');
const router = express.Router();
const { publish } = require('../mqttClient');
const Classification = require('../models/classification');
const Preservation = require('../models/preservation');

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

router.get('/classifications', async (req, res) => {
  try {
    // Find all classifications from the database
    // Sort by timestamp in descending order (newest first)
    const data = await Classification.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    console.error('❌ Failed to fetch classifications:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

router.get('/preservations', async (req, res) => {
  try {
    // Find all preservations, sort by newest first
    const data = await Preservation.find().sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    console.error('❌ Failed to fetch preservations:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

module.exports = router;
