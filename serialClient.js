const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

let port = null;
let parser = null;

/**
 * Initializes the Serial Port connection and sets up message handling.
 * @param {object} callbacks - Object containing callback functions
 * @param {function} callbacks.onMessageCallback - Callback for incoming messages
 * @param {function} callbacks.onConnect - Callback for connection event
 * @param {function} callbacks.onDisconnect - Callback for disconnect event
 */
function initSerial(callbacks = {}) {
  const { onMessageCallback, onConnect, onDisconnect } = callbacks;

  const portPath = process.env.SERIAL_PORT || "/dev/ttyUSB0"; // Default for Linux
  const baudRate = parseInt(process.env.SERIAL_BAUD_RATE || "115200");

  console.log(`🔌 Attempting to connect to serial port: ${portPath} @ ${baudRate} baud`);

  // Create serial port instance
  port = new SerialPort({
    path: portPath,
    baudRate: baudRate,
    autoOpen: false,
  });

  // Create line parser (reads data line by line)
  parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

  // Open the port
  port.open((err) => {
    if (err) {
      console.error(`❌ Failed to open serial port ${portPath}:`, err.message);
      return;
    }
    console.log(`✅ Serial port opened: ${portPath} @ ${baudRate} baud`);
    if (onConnect) onConnect();
  });

  // Handle incoming data (line by line)
  parser.on("data", (line) => {
    // STM32 sends data in format: TOPIC:<topic>|<json>
    // Example: TOPIC:stm32/sensor/data|{"mq135_ppm":150.5,"mq2_ppm":450.2,"T":25.3,"RH":65.1}

    if (line.startsWith("TOPIC:")) {
      const parts = line.substring(6).split("|"); // Remove "TOPIC:" prefix and split by "|"
      if (parts.length === 2) {
        const topic = parts[0].trim();
        const jsonString = parts[1].trim();

        try {
          const message = JSON.parse(jsonString);
          console.log(`📩 Serial message received | Topic: ${topic} | Message:`, message);

          if (onMessageCallback) {
            onMessageCallback(topic, message);
          }
        } catch (parseError) {
          console.error("❌ Failed to parse JSON from serial data:", jsonString);
        }
      }
    } else {
      // Debug output or other non-topic data
      console.log(`[Serial Debug] ${line}`);
    }
  });

  // Handle port errors
  port.on("error", (err) => {
    console.error("⚠️  Serial Port Error:", err.message);
  });

  // Handle port close
  port.on("close", () => {
    console.warn("⚠️  Serial Port Closed");
    if (onDisconnect) onDisconnect();
  });
}

/**
 * Check if serial port is open
 */
function isOpen() {
  return port && port.isOpen;
}

/**
 * Close the serial port
 */
function closeSerial() {
  if (port && port.isOpen) {
    port.close((err) => {
      if (err) console.error("❌ Error closing serial port:", err);
      else console.log("✅ Serial port closed");
    });
  }
}

/**
 * List available serial ports (useful for debugging)
 */
async function listPorts() {
  try {
    const ports = await SerialPort.list();
    console.log("📋 Available serial ports:");
    ports.forEach((port) => {
      console.log(`   - ${port.path} (${port.manufacturer || "Unknown"})`);
    });
    return ports;
  } catch (err) {
    console.error("❌ Failed to list serial ports:", err);
    return [];
  }
}

module.exports = {
  initSerial,
  isOpen,
  closeSerial,
  listPorts,
};
