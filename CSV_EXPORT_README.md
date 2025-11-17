# CSV Export Feature

This backend automatically exports log data to CSV files when the STM32 device disconnects from the MQTT broker.

## Features

### 1. **Auto-Export on Disconnect**
When the STM32 disconnects from MQTT, the system automatically:
- Exports all freshness classification data to `freshness_YYYY-MM-DD_HH-MM-SS.csv` (from database)
- Exports all preservation condition data to `preservation_YYYY-MM-DD_HH-MM-SS.csv` (from database)
- Exports all raw sensor data to `sensor_data_YYYY-MM-DD_HH-MM-SS.csv` (from memory)
- Saves files to the `./exports` directory
- Clears sensor data from memory after successful export

### 2. **Manual Export API**
You can manually trigger CSV export using the API endpoints:

#### Export All Data
```bash
POST http://localhost:4000/api/export/csv
```

**Response:**
```json
{
  "success": true,
  "message": "CSV files exported successfully",
  "files": {
    "freshness": "freshness_2025-01-15_14-30-25.csv",
    "preservation": "preservation_2025-01-15_14-30-25.csv"
  }
}
```

#### Export Date Range
```bash
POST http://localhost:4000/api/export/csv/range
Content-Type: application/json

{
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-15T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "CSV files exported successfully",
  "range": {
    "start": "2025-01-01T00:00:00.000Z",
    "end": "2025-01-15T23:59:59.000Z"
  },
  "counts": {
    "freshness": 150,
    "preservation": 148
  }
}
```

#### Export Raw Sensor Data Only
```bash
POST http://localhost:4000/api/export/csv/sensor
```

**Response:**
```json
{
  "success": true,
  "message": "Sensor data CSV exported successfully",
  "file": "sensor_data_2025-01-15_14-30-25.csv",
  "recordCount": 1250
}
```

#### Export ALL Data (Classifications + Sensor Data)
```bash
POST http://localhost:4000/api/export/csv/all
```

**Response:**
```json
{
  "success": true,
  "message": "All CSV files exported successfully",
  "files": {
    "freshness": "freshness_2025-01-15_14-30-25.csv",
    "preservation": "preservation_2025-01-15_14-30-25.csv",
    "sensorData": "sensor_data_2025-01-15_14-30-25.csv"
  },
  "counts": {
    "sensorRecords": 1250
  }
}
```

#### Download CSV File
```bash
GET http://localhost:4000/api/export/download/freshness_2025-01-15_14-30-25.csv
GET http://localhost:4000/api/export/download/sensor_data_2025-01-15_14-30-25.csv
```

This endpoint directly downloads the CSV file.

## CSV File Format

### Freshness CSV
```csv
No,Timestamp,Classification,Date,Time
1,2025-01-15T14:25:30.123Z,SS,2025-01-15,14:25:30
2,2025-01-15T14:25:40.456Z,S,2025-01-15,14:25:40
3,2025-01-15T14:26:00.789Z,KS,2025-01-15,14:26:00
```

**Classification Values:**
- `SS` - Sangat Segar (Very Fresh)
- `S` - Segar (Fresh)
- `KS` - Kurang Segar (Less Fresh)
- `B` - Busuk (Spoiled)

### Preservation CSV
```csv
No,Timestamp,Condition,Date,Time
1,2025-01-15T14:25:30.123Z,SB,2025-01-15,14:25:30
2,2025-01-15T14:25:40.456Z,B,2025-01-15,14:25:40
3,2025-01-15T14:26:00.789Z,KB,2025-01-15,14:26:00
```

**Condition Values:**
- `SB` - Sangat Baik (Very Good)
- `B` - Baik (Good)
- `KB` - Kurang Baik (Less Good)
- `BR` - Buruk (Bad)

### Raw Sensor Data CSV
```csv
No,Timestamp,MQ135_PPM,MQ2_PPM,Temperature_C,Humidity_RH,pH,Date,Time
1,2025-01-15T14:25:30.123Z,150.5,450.2,25.3,65.1,6.8,2025-01-15,14:25:30
2,2025-01-15T14:25:40.456Z,148.7,445.8,25.4,65.3,6.9,2025-01-15,14:25:40
3,2025-01-15T14:25:50.789Z,152.1,448.3,25.5,65.0,6.7,2025-01-15,14:25:50
```

**Field Descriptions:**
- `MQ135_PPM` - Ammonia gas concentration in parts per million
- `MQ2_PPM` - Methane gas concentration in parts per million
- `Temperature_C` - Temperature in Celsius
- `Humidity_RH` - Relative humidity percentage
- `pH` - pH value (may be N/A if sensor not present)

## File Naming Convention

CSV files are named with a timestamp to prevent overwrites:
- Format: `{type}_YYYY-MM-DD_HH-MM-SS.csv`
- Types: `freshness`, `preservation`, `sensor_data`
- Example: `freshness_2025-01-15_14-30-25.csv`

## Directory Structure

```
backend-mqtt/
├── exports/                    # Auto-created directory for CSV files
│   ├── freshness_*.csv         # Fish freshness classifications (from DB)
│   ├── preservation_*.csv      # Storage condition classifications (from DB)
│   └── sensor_data_*.csv       # Raw sensor readings (from memory)
├── csvExportService.js         # CSV export service
├── index.js                    # Main server (auto-export on disconnect, sensor caching)
└── routes/
    └── api.js                  # Manual export API endpoints
```

## Usage Examples

### Using cURL

**Manual export:**
```bash
curl -X POST http://localhost:4000/api/export/csv
```

**Date range export:**
```bash
curl -X POST http://localhost:4000/api/export/csv/range \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-15T23:59:59Z"
  }'
```

**Export sensor data:**
```bash
curl -X POST http://localhost:4000/api/export/csv/sensor
```

**Export all data (classifications + sensor):**
```bash
curl -X POST http://localhost:4000/api/export/csv/all
```

**Download file:**
```bash
curl -O http://localhost:4000/api/export/download/freshness_2025-01-15_14-30-25.csv
curl -O http://localhost:4000/api/export/download/sensor_data_2025-01-15_14-30-25.csv
```

### Using JavaScript/Fetch

```javascript
// Manual export
const exportData = async () => {
  const response = await fetch('http://localhost:4000/api/export/csv', {
    method: 'POST',
  });
  const result = await response.json();
  console.log('Export result:', result);
};

// Date range export
const exportRange = async (startDate, endDate) => {
  const response = await fetch('http://localhost:4000/api/export/csv/range', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate }),
  });
  const result = await response.json();
  console.log('Export result:', result);
};

// Export sensor data
const exportSensorData = async () => {
  const response = await fetch('http://localhost:4000/api/export/csv/sensor', {
    method: 'POST',
  });
  const result = await response.json();
  console.log('Sensor export result:', result);
};

// Export all data
const exportAll = async () => {
  const response = await fetch('http://localhost:4000/api/export/csv/all', {
    method: 'POST',
  });
  const result = await response.json();
  console.log('Full export result:', result);
};

// Download file
const downloadCSV = (filename) => {
  window.location.href = `http://localhost:4000/api/export/download/${filename}`;
};
```

## Logs

The system logs CSV export operations:

```
⚠️  [MQTT] STM32 disconnected - triggering auto CSV export...
📄 [CSV Export] Freshness: 150 records exported
📄 [CSV Export] Preservation: 148 records exported
✅ [CSV Export] Files created:
   - ./exports/freshness_2025-01-15_14-30-25.csv
   - ./exports/preservation_2025-01-15_14-30-25.csv
✅ [Auto Export] Classification CSV files created successfully
📄 [CSV Export] Raw Sensor Data: 1250 records exported
   - ./exports/sensor_data_2025-01-15_14-30-25.csv
✅ [Auto Export] Raw sensor data CSV file created successfully
🗑️  [Memory] Sensor data history cleared
```

## Notes

### Classification Data (Freshness & Preservation)
- CSV export only includes data that was **saved to MongoDB** (i.e., when classification values changed)
- The system uses change-detection caching, so only classification changes are stored in the database
- Data persists across server restarts (stored in MongoDB)

### Raw Sensor Data
- Sensor readings are stored **in memory only** (not in database)
- Data includes: MQ135 ppm, MQ2 ppm, Temperature, Humidity, pH
- Every sensor reading from MQTT topic `stm32/sensor/data` is captured
- Memory is automatically cleared after successful CSV export on disconnect
- Data is lost if server crashes before export (trade-off for performance)

### General
- Empty data sets will not generate CSV files (you'll see a warning in the logs)
- Export directory is automatically created if it doesn't exist
- Files are sorted by timestamp in ascending order (oldest first)

## Security

- File download endpoint includes security checks to prevent directory traversal attacks
- Only files matching the pattern `(freshness|preservation|sensor_data)_[\d-_]+\.csv` can be downloaded
- All API endpoints use proper error handling
- In-memory sensor data is scoped to the server process (not accessible externally except via API)

## Troubleshooting

**Problem:** No classification CSV files generated
- **Solution:** Check if there's data in MongoDB. Run `GET /api/classifications` or `GET /api/preservations` to verify.

**Problem:** No sensor data CSV generated
- **Solution:** Ensure the STM32 is publishing to the `stm32/sensor/data` MQTT topic. Check backend logs for `📊 [Memory] Sensor data stored` messages.

**Problem:** File not found error when downloading
- **Solution:** Verify the filename matches the format returned by the export API.

**Problem:** Permission denied when creating exports directory
- **Solution:** Ensure the backend process has write permissions in the backend-mqtt directory.

**Problem:** Sensor data count is lower than expected
- **Solution:** Raw sensor data is stored in memory and cleared on each disconnect/export cycle. It only captures data during the current monitoring session.
