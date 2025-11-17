const express = require('express');
const router = express.Router();
const { publish } = require('../mqttClient');
const Classification = require('../models/classification');
const Preservation = require('../models/preservation');
const chatbotService = require('../chatbotService');
const { exportToCSV, exportDateRange, exportSensorDataToCSV, exportClassificationHistoryToCSV, exportCombinedDataToCSV } = require('../csvExportService');
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

// Export raw sensor data from memory
router.post('/export/csv/sensor', (req, res) => {
  try {
    console.log('📤 [API] Manual sensor data CSV export requested');
    const sensorDataHistory = req.sensorDataHistory; // From middleware

    if (!sensorDataHistory || sensorDataHistory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No sensor data available in memory'
      });
    }

    const sensorFile = exportSensorDataToCSV(sensorDataHistory, './exports');

    if (!sensorFile) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create sensor data CSV'
      });
    }

    res.json({
      success: true,
      message: 'Sensor data CSV exported successfully',
      file: path.basename(sensorFile),
      recordCount: sensorDataHistory.length,
    });
  } catch (err) {
    console.error('❌ [API] Sensor CSV export failed:', err);
    res.status(500).json({ error: 'Failed to export sensor data CSV', details: err.message });
  }
});

// Export ALL data: classifications + sensor data
router.post('/export/csv/all', async (req, res) => {
  try {
    console.log('📤 [API] Full CSV export requested (classifications + sensor data)');

    // Export classification data from database
    const classificationResult = await exportToCSV('./exports');

    // Export sensor data from memory
    const sensorDataHistory = req.sensorDataHistory;
    const sensorFile = exportSensorDataToCSV(sensorDataHistory, './exports');

    res.json({
      success: true,
      message: 'All CSV files exported successfully',
      files: {
        freshness: path.basename(classificationResult.freshnessFile),
        preservation: path.basename(classificationResult.preservationFile),
        sensorData: sensorFile ? path.basename(sensorFile) : null,
      },
      counts: {
        sensorRecords: sensorDataHistory?.length || 0,
      },
    });
  } catch (err) {
    console.error('❌ [API] Full CSV export failed:', err);
    res.status(500).json({ error: 'Failed to export all CSV files', details: err.message });
  }
});

// Export classification history from memory
router.post('/export/csv/classification-history', (req, res) => {
  try {
    console.log('📤 [API] Classification history CSV export requested');
    const classificationHistory = req.classificationHistory; // From middleware

    if (!classificationHistory || classificationHistory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No classification history available in memory'
      });
    }

    const classificationFile = exportClassificationHistoryToCSV(classificationHistory, './exports');

    if (!classificationFile) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create classification history CSV'
      });
    }

    res.json({
      success: true,
      message: 'Classification history CSV exported successfully',
      file: path.basename(classificationFile),
      recordCount: classificationHistory.length,
    });
  } catch (err) {
    console.error('❌ [API] Classification history CSV export failed:', err);
    res.status(500).json({ error: 'Failed to export classification history CSV', details: err.message });
  }
});

// Export combined data (sensor + classification)
router.post('/export/csv/combined', (req, res) => {
  try {
    console.log('📤 [API] Combined data CSV export requested');
    const sensorDataHistory = req.sensorDataHistory; // From middleware
    const classificationHistory = req.classificationHistory; // From middleware

    if (!sensorDataHistory || sensorDataHistory.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No sensor data available in memory'
      });
    }

    const combinedFile = exportCombinedDataToCSV(sensorDataHistory, classificationHistory, './exports');

    if (!combinedFile) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create combined data CSV'
      });
    }

    res.json({
      success: true,
      message: 'Combined data CSV exported successfully',
      file: path.basename(combinedFile),
      recordCounts: {
        sensor: sensorDataHistory.length,
        classification: classificationHistory?.length || 0,
      },
    });
  } catch (err) {
    console.error('❌ [API] Combined data CSV export failed:', err);
    res.status(500).json({ error: 'Failed to export combined data CSV', details: err.message });
  }
});

// Download exported CSV file
router.get('/export/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../exports', filename);

    // Security check: prevent directory traversal
    // Updated to include all export file patterns
    if (!filename.match(/^(freshness|preservation|sensor_data|classification_history|combined_data)_[\d-_]+\.csv$/)) {
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
