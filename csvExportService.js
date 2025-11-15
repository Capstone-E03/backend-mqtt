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

module.exports = {
  exportToCSV,
  exportDateRange,
};
