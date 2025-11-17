const fs = require("fs");
const path = require("path");
const Classification = require("./models/classification");
const Preservation = require("./models/preservation");

/**
 * Export classification and preservation data to CSV files
 * @param {string} exportDir - Directory where CSV files will be saved
 * @returns {Promise<{freshnessFile: string, preservationFile: string}>}
 */
async function exportToCSV(exportDir = "./exports") {
  try {
    // Create export directory if it doesn't exist
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")
      .join("_")
      .slice(0, -5); // Format: YYYY-MM-DD_HH-MM-SS

    // Export Freshness Data
    const freshnessFile = path.join(
      exportDir,
      `freshness_${timestamp}.csv`
    );
    await exportFreshnessData(freshnessFile);

    // Export Preservation Data
    const preservationFile = path.join(
      exportDir,
      `preservation_${timestamp}.csv`
    );
    await exportPreservationData(preservationFile);

    console.log(`✅ [CSV Export] Files created:`);
    console.log(`   - ${freshnessFile}`);
    console.log(`   - ${preservationFile}`);

    return { freshnessFile, preservationFile };
  } catch (error) {
    console.error("❌ [CSV Export] Failed:", error.message);
    throw error;
  }
}

/**
 * Export freshness classification data to CSV
 */
async function exportFreshnessData(filePath) {
  const data = await Classification.find().sort({ timestamp: 1 }).lean();

  if (data.length === 0) {
    console.log("⚠️  [CSV Export] No freshness data to export");
    return;
  }

  // CSV Header
  const csvHeader = "No,Timestamp,Classification,Date,Time\n";

  // CSV Rows
  const csvRows = data
    .map((item, index) => {
      const date = new Date(item.timestamp);
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
      const timeStr = date.toISOString().split("T")[1].slice(0, 8); // HH:MM:SS

      return `${index + 1},${item.timestamp},${item.result},${dateStr},${timeStr}`;
    })
    .join("\n");

  fs.writeFileSync(filePath, csvHeader + csvRows);
  console.log(`📄 [CSV Export] Freshness: ${data.length} records exported`);
}

/**
 * Export preservation condition data to CSV
 */
async function exportPreservationData(filePath) {
  const data = await Preservation.find().sort({ timestamp: 1 }).lean();

  if (data.length === 0) {
    console.log("⚠️  [CSV Export] No preservation data to export");
    return;
  }

  // CSV Header
  const csvHeader = "No,Timestamp,Condition,Date,Time\n";

  // CSV Rows
  const csvRows = data
    .map((item, index) => {
      const date = new Date(item.timestamp);
      const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
      const timeStr = date.toISOString().split("T")[1].slice(0, 8); // HH:MM:SS

      return `${index + 1},${item.timestamp},${item.result},${dateStr},${timeStr}`;
    })
    .join("\n");

  fs.writeFileSync(filePath, csvHeader + csvRows);
  console.log(`📄 [CSV Export] Preservation: ${data.length} records exported`);
}

/**
 * Export data for a specific date range
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} exportDir
 */
async function exportDateRange(startDate, endDate, exportDir = "./exports") {
  try {
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")
      .join("_")
      .slice(0, -5);

    // Query with date filter
    const dateFilter = {
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Export Freshness
    const freshnessData = await Classification.find(dateFilter)
      .sort({ timestamp: 1 })
      .lean();

    if (freshnessData.length > 0) {
      const freshnessFile = path.join(
        exportDir,
        `freshness_${timestamp}_filtered.csv`
      );
      const csvHeader = "No,Timestamp,Classification,Date,Time\n";
      const csvRows = freshnessData
        .map((item, index) => {
          const date = new Date(item.timestamp);
          const dateStr = date.toISOString().split("T")[0];
          const timeStr = date.toISOString().split("T")[1].slice(0, 8);
          return `${index + 1},${item.timestamp},${item.result},${dateStr},${timeStr}`;
        })
        .join("\n");
      fs.writeFileSync(freshnessFile, csvHeader + csvRows);
      console.log(
        `📄 [CSV Export] Freshness (filtered): ${freshnessData.length} records`
      );
    }

    // Export Preservation
    const preservationData = await Preservation.find(dateFilter)
      .sort({ timestamp: 1 })
      .lean();

    if (preservationData.length > 0) {
      const preservationFile = path.join(
        exportDir,
        `preservation_${timestamp}_filtered.csv`
      );
      const csvHeader = "No,Timestamp,Condition,Date,Time\n";
      const csvRows = preservationData
        .map((item, index) => {
          const date = new Date(item.timestamp);
          const dateStr = date.toISOString().split("T")[0];
          const timeStr = date.toISOString().split("T")[1].slice(0, 8);
          return `${index + 1},${item.timestamp},${item.result},${dateStr},${timeStr}`;
        })
        .join("\n");
      fs.writeFileSync(preservationFile, csvHeader + csvRows);
      console.log(
        `📄 [CSV Export] Preservation (filtered): ${preservationData.length} records`
      );
    }

    return {
      freshnessCount: freshnessData.length,
      preservationCount: preservationData.length,
    };
  } catch (error) {
    console.error("❌ [CSV Export] Date range export failed:", error.message);
    throw error;
  }
}

/**
 * Export raw sensor data to CSV from memory (no database)
 * @param {Array} sensorDataArray - Array of sensor readings from memory
 * @param {string} exportDir - Directory where CSV file will be saved
 * @returns {string} Path to the created CSV file
 */
function exportSensorDataToCSV(sensorDataArray, exportDir = "./exports") {
  try {
    // Create export directory if it doesn't exist
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    if (!sensorDataArray || sensorDataArray.length === 0) {
      console.log("⚠️  [CSV Export] No raw sensor data to export");
      return null;
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")
      .join("_")
      .slice(0, -5); // Format: YYYY-MM-DD_HH-MM-SS

    const sensorFile = path.join(
      exportDir,
      `sensor_data_${timestamp}.csv`
    );

    // CSV Header
    const csvHeader = "No,Timestamp,MQ135_PPM,MQ2_PPM,Temperature_C,Humidity_RH,pH,Date,Time\n";

    // CSV Rows
    const csvRows = sensorDataArray
      .map((item, index) => {
        const date = new Date(item.timestamp);
        const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
        const timeStr = date.toISOString().split("T")[1].slice(0, 8); // HH:MM:SS

        // Handle optional pH field
        const pH = item.pH !== null && item.pH !== undefined ? item.pH : "N/A";

        return `${index + 1},${item.timestamp},${item.mq135_ppm},${item.mq2_ppm},${item.temperature},${item.humidity},${pH},${dateStr},${timeStr}`;
      })
      .join("\n");

    fs.writeFileSync(sensorFile, csvHeader + csvRows);
    console.log(`📄 [CSV Export] Raw Sensor Data: ${sensorDataArray.length} records exported`);
    console.log(`   - ${sensorFile}`);

    return sensorFile;
  } catch (error) {
    console.error("❌ [CSV Export] Sensor data export failed:", error.message);
    throw error;
  }
}

/**
 * Export ALL classification results from memory to CSV
 * @param {Array} classificationArray - Array of classification results from memory
 * @param {string} exportDir - Directory where CSV file will be saved
 * @returns {string} Path to the created CSV file
 */
function exportClassificationHistoryToCSV(classificationArray, exportDir = "./exports") {
  try {
    // Create export directory if it doesn't exist
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    if (!classificationArray || classificationArray.length === 0) {
      console.log("⚠️  [CSV Export] No classification history to export");
      return null;
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")
      .join("_")
      .slice(0, -5);

    const classificationFile = path.join(
      exportDir,
      `classification_history_${timestamp}.csv`
    );

    // CSV Header
    const csvHeader = "No,Timestamp,Type,Result,FuzzyValue,Date,Time\n";

    // CSV Rows
    const csvRows = classificationArray
      .map((item, index) => {
        const date = new Date(item.timestamp);
        const dateStr = date.toISOString().split("T")[0];
        const timeStr = date.toISOString().split("T")[1].slice(0, 8);
        const fuzzyValue = item.value !== null && item.value !== undefined ? item.value.toFixed(2) : "N/A";

        return `${index + 1},${item.timestamp},${item.type},${item.result},${fuzzyValue},${dateStr},${timeStr}`;
      })
      .join("\n");

    fs.writeFileSync(classificationFile, csvHeader + csvRows);
    console.log(`📄 [CSV Export] Classification History: ${classificationArray.length} records exported`);
    console.log(`   - ${classificationFile}`);

    return classificationFile;
  } catch (error) {
    console.error("❌ [CSV Export] Classification history export failed:", error.message);
    throw error;
  }
}

/**
 * Export combined sensor data + classification results to a single CSV
 * Matches records by timestamp (within 1 second tolerance)
 * @param {Array} sensorDataArray - Array of sensor readings
 * @param {Array} classificationArray - Array of classification results
 * @param {string} exportDir - Directory where CSV file will be saved
 * @returns {string} Path to the created CSV file
 */
function exportCombinedDataToCSV(sensorDataArray, classificationArray, exportDir = "./exports") {
  try {
    // Create export directory if it doesn't exist
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    if (!sensorDataArray || sensorDataArray.length === 0) {
      console.log("⚠️  [CSV Export] No sensor data for combined export");
      return null;
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")
      .join("_")
      .slice(0, -5);

    const combinedFile = path.join(
      exportDir,
      `combined_data_${timestamp}.csv`
    );

    // CSV Header
    const csvHeader = "No,Timestamp,MQ135_PPM,MQ2_PPM,Temperature_C,Humidity_RH,pH,Freshness,Freshness_Value,Preservation,Preservation_Value,Date,Time\n";

    // Create lookup maps for classifications by timestamp
    const freshnessMap = new Map();
    const preservationMap = new Map();

    if (classificationArray) {
      classificationArray.forEach(item => {
        const ts = new Date(item.timestamp).getTime();
        if (item.type === "freshness") {
          freshnessMap.set(ts, { result: item.result, value: item.value });
        } else if (item.type === "preservation") {
          preservationMap.set(ts, { result: item.result, value: item.value });
        }
      });
    }

    // CSV Rows
    const csvRows = sensorDataArray
      .map((item, index) => {
        const date = new Date(item.timestamp);
        const dateStr = date.toISOString().split("T")[0];
        const timeStr = date.toISOString().split("T")[1].slice(0, 8);
        const pH = item.pH !== null && item.pH !== undefined ? item.pH : "N/A";

        // Find matching classifications (within 1 second tolerance)
        const sensorTime = date.getTime();
        let freshness = "N/A";
        let freshnessValue = "N/A";
        let preservation = "N/A";
        let preservationValue = "N/A";

        // Search for closest match within 1000ms
        for (let [classTime, classData] of freshnessMap.entries()) {
          if (Math.abs(classTime - sensorTime) < 1000) {
            freshness = classData.result;
            freshnessValue = classData.value !== null ? classData.value.toFixed(2) : "N/A";
            break;
          }
        }

        for (let [classTime, classData] of preservationMap.entries()) {
          if (Math.abs(classTime - sensorTime) < 1000) {
            preservation = classData.result;
            preservationValue = classData.value !== null ? classData.value.toFixed(2) : "N/A";
            break;
          }
        }

        return `${index + 1},${item.timestamp},${item.mq135_ppm},${item.mq2_ppm},${item.temperature},${item.humidity},${pH},${freshness},${freshnessValue},${preservation},${preservationValue},${dateStr},${timeStr}`;
      })
      .join("\n");

    fs.writeFileSync(combinedFile, csvHeader + csvRows);
    console.log(`📄 [CSV Export] Combined Data: ${sensorDataArray.length} records exported`);
    console.log(`   - ${combinedFile}`);

    return combinedFile;
  } catch (error) {
    console.error("❌ [CSV Export] Combined data export failed:", error.message);
    throw error;
  }
}

module.exports = {
  exportToCSV,
  exportDateRange,
  exportSensorDataToCSV,
  exportClassificationHistoryToCSV,
  exportCombinedDataToCSV,
};
