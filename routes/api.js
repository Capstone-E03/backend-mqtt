const express = require('express');
const router = express.Router();
const { publish } = require('../mqttClient');
const Classification = require('../models/classification');
const Preservation = require('../models/preservation');
const chatbotService = require('../chatbotService');
const { exportToCSV, exportDateRange } = require('../csvExportService');
const path = require('path');

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

router.post('/chat', async (req, res) => {
  // 'message' adalah properti yang dikirim dari frontend ChatBot.js (dari state 'input')
  const { message } = req.body; 
  
  // Ambil cache yang sudah di-attach oleh middleware di index.js
  const cache = req.liveDataCache; 

  if (!message) {
    return res.status(400).json({ error: 'Missing message content' });
  }

  try {
    // Panggil service untuk mendapatkan respons
    const responseContent = await chatbotService.getChatResponse(message, cache);
    
    // Kirim respons sesuai format yang diharapkan frontend
    res.json({ role: 'assistant', content: responseContent });
    
  } catch (err) {
    console.error('❌ Chatbot service error:', err);
    res.status(500).json({ error: 'Failed to get chat response' });
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

// Manual CSV export endpoint
router.post('/export/csv', async (req, res) => {
  try {
    console.log('📤 [API] Manual CSV export requested');
    const result = await exportToCSV('./exports');

    res.json({
      success: true,
      message: 'CSV files exported successfully',
      files: {
        freshness: path.basename(result.freshnessFile),
        preservation: path.basename(result.preservationFile),
      },
    });
  } catch (err) {
    console.error('❌ [API] CSV export failed:', err);
    res.status(500).json({ error: 'Failed to export CSV files', details: err.message });
  }
});

// Export CSV with date range filter
router.post('/export/csv/range', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing startDate or endDate' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    console.log(`📤 [API] CSV export requested for range: ${start.toISOString()} to ${end.toISOString()}`);
    const result = await exportDateRange(start, end, './exports');

    res.json({
      success: true,
      message: 'CSV files exported successfully',
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      counts: {
        freshness: result.freshnessCount,
        preservation: result.preservationCount,
      },
    });
  } catch (err) {
    console.error('❌ [API] CSV range export failed:', err);
    res.status(500).json({ error: 'Failed to export CSV files', details: err.message });
  }
});

// Download exported CSV file
router.get('/export/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../exports', filename);

    // Security check: prevent directory traversal
    if (!filename.match(/^(freshness|preservation)_[\d-_]+\.csv$/)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('❌ [API] File download failed:', err);
        res.status(404).json({ error: 'File not found' });
      }
    });
  } catch (err) {
    console.error('❌ [API] Download error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
