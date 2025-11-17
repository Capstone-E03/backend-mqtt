# Serial Port Communication Setup

This guide explains how to use the backend with Serial Port communication instead of (or in addition to) MQTT.

## Overview

The backend now supports three connection modes:
1. **MQTT Only** (default) - Receives data from STM32 via WiFi/MQTT
2. **Serial Only** - Receives data from STM32 via USB/Serial port
3. **Dual Mode** - Receives data from both MQTT and Serial simultaneously

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Connection Mode
USE_MQTT=true          # Enable/disable MQTT (default: true)
USE_SERIAL=false       # Enable/disable Serial (default: false)

# Serial Port Settings (when USE_SERIAL=true)
SERIAL_PORT=/dev/ttyUSB0   # Port path (Linux/Mac)
# SERIAL_PORT=COM3         # Port path (Windows)
SERIAL_BAUD_RATE=115200    # Baud rate (must match STM32 setting)
```

### Connection Modes

#### Mode 1: MQTT Only (Default)
```env
USE_MQTT=true
USE_SERIAL=false
```
- Standard operation with WiFi/ESP8266
- Data received via MQTT broker

#### Mode 2: Serial Only
```env
USE_MQTT=false
USE_SERIAL=true
SERIAL_PORT=/dev/ttyUSB0
```
- Direct USB connection to STM32
- No WiFi/MQTT required
- **STM32 firmware must have `USE_SERIAL_OUTPUT=1`**

#### Mode 3: Dual Mode (Both)
```env
USE_MQTT=true
USE_SERIAL=true
SERIAL_PORT=/dev/ttyUSB0
```
- Receives data from both sources
- Useful for redundancy or testing

## STM32 Firmware Configuration

### Enable Serial Output on STM32

In `Integrasi/Core/Src/main.c`:

```c
// Set to 1 to send data via serial instead of MQTT
#define USE_SERIAL_OUTPUT      1
```

When `USE_SERIAL_OUTPUT=1`:
- STM32 sends data via USART2 (PA2 TX)
- WiFi/MQTT connection is skipped
- Output format: `TOPIC:<topic>|<json_data>`

### Serial Output Format

The STM32 sends data in this format:
```
TOPIC:stm32/sensor/data|{"mq135_ppm":150.5,"mq2_ppm":450.2,"T":25.3,"RH":65.1}
TOPIC:capstone/e03/fish|{"fresh":"KS","freshValue":0.6}
TOPIC:capstone/e03/preservation|{"preservation":"B","preservationValue":0.7}
```

The backend parses this and emits to WebSocket clients exactly like MQTT data.

## Hardware Connection

### Linux/Mac
1. Connect STM32 to PC via USB (ST-Link or USB-Serial adapter)
2. Find serial port:
   ```bash
   ls /dev/ttyUSB*     # USB-Serial adapter
   ls /dev/ttyACM*     # ST-Link or CDC device
   ```
3. Set `SERIAL_PORT=/dev/ttyUSB0` (or the correct port)

### Windows
1. Connect STM32 to PC via USB
2. Open Device Manager → Ports (COM & LPT)
3. Find the COM port (e.g., COM3)
4. Set `SERIAL_PORT=COM3`

### Permissions (Linux/Mac)
Add your user to the dialout group:
```bash
sudo usermod -a -G dialout $USER
# Log out and log back in
```

Or use sudo (not recommended for production):
```bash
sudo npm start
```

## Installation

Install the new dependencies:

```bash
cd backend-mqtt
npm install
```

This installs:
- `serialport` - Serial port communication library
- `@serialport/parser-readline` - Line-by-line parser

## Testing

### 1. List Available Ports

Create a test script `test-serial.js`:

```javascript
const { SerialPort } = require('serialport');

async function listPorts() {
  const ports = await SerialPort.list();
  console.log('Available ports:');
  ports.forEach(port => {
    console.log(`  ${port.path} - ${port.manufacturer || 'Unknown'}`);
  });
}

listPorts();
```

Run:
```bash
node test-serial.js
```

### 2. Test Serial Connection

1. Set STM32 firmware to `USE_SERIAL_OUTPUT=1`
2. Flash firmware to STM32
3. Configure `.env`:
   ```env
   USE_SERIAL=true
   SERIAL_PORT=/dev/ttyUSB0
   ```
4. Start backend:
   ```bash
   npm run dev
   ```
5. Watch for serial messages in the console:
   ```
   ✅ Serial port opened: /dev/ttyUSB0 @ 115200 baud
   📩 Serial message received | Topic: stm32/sensor/data | Message: { mq135_ppm: 150.5, ... }
   ```

## Troubleshooting

### Error: "Cannot find module 'serialport'"
```bash
npm install
```

### Error: "Access denied" (Linux/Mac)
```bash
sudo usermod -a -G dialout $USER
# Log out and log back in
```

### Error: "Port not found"
- **Linux/Mac**: Check `ls /dev/tty*` for correct port
- **Windows**: Check Device Manager for COM port number
- Make sure STM32 is connected via USB

### Error: "Port already in use"
- Close other programs using the port (Arduino IDE, PuTTY, etc.)
- On Linux: `sudo fuser -k /dev/ttyUSB0` (kills processes using the port)

### No data received
1. Check STM32 firmware has `USE_SERIAL_OUTPUT=1`
2. Verify baud rate matches (115200)
3. Check serial port path is correct
4. Look for debug output on the serial line (non-TOPIC lines)

### Data format issues
The backend expects this format:
```
TOPIC:<topic_name>|<json_payload>
```

If you see `[Serial Debug]` messages, the data format doesn't match. Check STM32 firmware.

## Data Flow

```
┌─────────────┐
│   STM32     │
│  (Sensors)  │
└──────┬──────┘
       │ USART2 (Serial)
       │ PA2 TX → USB
       ↓
┌─────────────────────┐
│  Backend (Node.js)  │
│  - serialClient.js  │
│  - Parses TOPIC|JSON│
└──────┬──────────────┘
       │ WebSocket
       ↓
┌─────────────┐
│  Frontend   │
│  (Next.js)  │
└─────────────┘
```

## Advantages of Serial Mode

✅ **No WiFi Required** - Test without ESP8266 or network
✅ **Faster Development** - No WiFi connection delays
✅ **Direct Connection** - Easier debugging
✅ **Lower Latency** - No MQTT broker overhead
✅ **Portable Testing** - Works offline

## Production Recommendations

- **Development**: Use Serial mode for testing
- **Production**: Use MQTT mode for wireless operation
- **Debugging**: Use Dual mode to compare MQTT and Serial data

## API Compatibility

Serial data is processed identically to MQTT data:
- Same WebSocket events emitted
- Same database storage logic
- Same CSV export functionality
- Frontend receives data without any changes

The frontend doesn't need to know if data came from MQTT or Serial!
