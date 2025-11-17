/**
 * Test script to verify WIB timezone conversion
 * Run: node test-wib-timezone.js
 */

function toWIB(timestamp) {
  const date = new Date(timestamp);

  // Convert to WIB by adding 7 hours (25200000 milliseconds)
  const wibDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));

  // Extract date and time components
  const year = wibDate.getUTCFullYear();
  const month = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(wibDate.getUTCDate()).padStart(2, '0');
  const hours = String(wibDate.getUTCHours()).padStart(2, '0');
  const minutes = String(wibDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(wibDate.getUTCSeconds()).padStart(2, '0');

  const dateStr = `${year}-${month}-${day}`;
  const timeStr = `${hours}:${minutes}:${seconds}`;
  const fullStr = `${dateStr} ${timeStr}`;

  return { dateStr, timeStr, fullStr };
}

console.log("WIB Timezone Conversion Test\n");
console.log("=" .repeat(60));

// Test Case 1: Current time
const now = new Date();
const nowWIB = toWIB(now);
console.log("\nTest 1: Current Time");
console.log("UTC:  ", now.toISOString());
console.log("WIB:  ", nowWIB.fullStr, "(UTC+7)");
console.log("Date: ", nowWIB.dateStr);
console.log("Time: ", nowWIB.timeStr);

// Test Case 2: Known timestamp (midnight UTC)
const midnight = new Date("2025-01-15T00:00:00.000Z");
const midnightWIB = toWIB(midnight);
console.log("\nTest 2: Midnight UTC (should be 07:00 AM WIB)");
console.log("UTC:  ", midnight.toISOString());
console.log("WIB:  ", midnightWIB.fullStr);

// Test Case 3: Noon UTC
const noon = new Date("2025-01-15T12:00:00.000Z");
const noonWIB = toWIB(noon);
console.log("\nTest 3: Noon UTC (should be 07:00 PM WIB)");
console.log("UTC:  ", noon.toISOString());
console.log("WIB:  ", noonWIB.fullStr);

// Test Case 4: Late evening UTC (day rollover test)
const evening = new Date("2025-01-15T23:00:00.000Z");
const eveningWIB = toWIB(evening);
console.log("\nTest 4: 11 PM UTC (should be 06:00 AM next day WIB)");
console.log("UTC:  ", evening.toISOString());
console.log("WIB:  ", eveningWIB.fullStr);

console.log("\n" + "=".repeat(60));
console.log("✅ All conversions completed successfully!");
console.log("WIB is UTC+7 (Jakarta Time)");
