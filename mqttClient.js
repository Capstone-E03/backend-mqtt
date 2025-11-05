const mqtt = require("mqtt");

let client = null;

/**
 * Initializes the MQTT connection and sets up message handling.
 * @param {object} callbacks - Object containing callback functions
 * @param {function} callbacks.onMessageCallback - Callback for incoming messages
 * @param {function} callbacks.onConnect - Callback for connection event
 * @param {function} callbacks.onOffline - Callback for offline event
 */
function initMqtt(callbacks = {}) {
  const { onMessageCallback, onConnect, onOffline } = callbacks;

  const url = process.env.MQTT_URL || "mqtt://localhost:1883";
  const username = process.env.MQTT_USERNAME || undefined;
  const password = process.env.MQTT_PASSWORD || undefined;
  const subTopics = (process.env.MQTT_SUB_TOPICS || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const options = {};
  if (username) options.username = username;
  if (password) options.password = password;

  // Connect to the MQTT broker
  client = mqtt.connect(url, options);

  client.on("connect", () => {
    console.log(`🔌 Connected to MQTT broker at ${url}`);
    if (onConnect) onConnect();

    // Subscribe to default topics
    subTopics.forEach((topic) => {
      client.subscribe(topic, { qos: 0 }, (err) => {
        if (err) console.error(`❌ Failed to subscribe to ${topic}:`, err);
        else console.log(`✅ Subscribed to topic: ${topic}`);
      });
    });
  });

  // Handle incoming messages
  client.on("message", (topic, buffer) => {
    let message = buffer.toString();
    try {
      message = JSON.parse(message);
    } catch {
      // keep as string if not JSON
    }

    if (onMessageCallback) onMessageCallback(topic, message);
  });

  client.on("error", (err) => console.error("⚠️ MQTT Error:", err));

  client.on("offline", () => {
    console.warn("⚠️ MQTT Offline");
    if (onOffline) onOffline();
  });

  client.on("reconnect", () => console.log("🔁 MQTT Reconnecting..."));
}

/**
 * Publishes a message to a topic.
 */
function publish(topic, message, options = {}) {
  if (!client) throw new Error("MQTT client not initialized");

  const payload = typeof message === "string" ? message : JSON.stringify(message);
  client.publish(topic, payload, options, (err) => {
    if (err) console.error("❌ Publish error:", err);
    else console.log(`📤 Published to ${topic}:`, payload);
  });
}

/**
 * Subscribes to a new topic dynamically.
 */
function subscribe(topic, opts = {}) {
  if (!client) throw new Error("MQTT client not initialized");
  client.subscribe(topic, opts, (err) => {
    if (err) console.error("❌ Subscribe error:", err);
    else console.log(`✅ Subscribed to new topic: ${topic}`);
  });
}

module.exports = {
  initMqtt,
  publish,
  subscribe,
};
