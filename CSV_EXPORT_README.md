# CSV Export Feature

This backend automatically exports log data to CSV files when the STM32 device disconnects from the MQTT broker.

## Features

### 1. **Auto-Export on Disconnect**
When the STM32 disconnects from MQTT, the system automatically:
- Exports all freshness classification data to `freshness_YYYY-MM-DD_HH-MM-SS.csv`
- Exports all preservation condition data to `preservation_YYYY-MM-DD_HH-MM-SS.csv`
- Saves files to the `./exports` directory

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

#### Download CSV File
```bash
GET http://localhost:4000/api/export/download/freshness_2025-01-15_14-30-25.csv
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

## File Naming Convention

CSV files are named with a timestamp to prevent overwrites:
- Format: `{type}_YYYY-MM-DD_HH-MM-SS.csv`
- Example: `freshness_2025-01-15_14-30-25.csv`

## Directory Structure

```
backend-mqtt/
├── exports/                    # Auto-created directory for CSV files
│   ├── freshness_*.csv
│   └── preservation_*.csv
├── csvExportService.js         # CSV export service
├── index.js                    # Main server (auto-export on disconnect)
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

**Download file:**
```bash
curl -O http://localhost:4000/api/export/download/freshness_2025-01-15_14-30-25.csv
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
✅ [Auto Export] CSV files created successfully
```

## Notes

- CSV export only includes data that was **saved to MongoDB** (i.e., when classification values changed)
- The system uses change-detection caching, so only classification changes are stored in the database
- Empty data sets will not generate CSV files (you'll see a warning in the logs)
- Export directory is automatically created if it doesn't exist
- Files are sorted by timestamp in ascending order (oldest first)

## Security

- File download endpoint includes security checks to prevent directory traversal attacks
- Only files matching the pattern `(freshness|preservation)_[\d-_]+\.csv` can be downloaded
- All API endpoints use proper error handling

## Troubleshooting

**Problem:** No CSV files generated
- **Solution:** Check if there's data in MongoDB. Run `GET /api/classifications` or `GET /api/preservations` to verify.

**Problem:** File not found error when downloading
- **Solution:** Verify the filename matches the format returned by the export API.

**Problem:** Permission denied when creating exports directory
- **Solution:** Ensure the backend process has write permissions in the backend-mqtt directory.
