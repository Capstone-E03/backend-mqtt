import mqtt from "mqtt";

let client = null;

/**
 * Initializes the MQTT connection and sets up message handling.
 * @param {function} onMessageCallback - Callback function to handle incoming messages
 */
export function initMqtt(onMessageCallback) {
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
  client.on("offline", () => console.warn("⚠️ MQTT Offline"));
  client.on("reconnect", () => console.log("🔁 MQTT Reconnecting..."));
}

/**
 * Publishes a message to a topic.
 */
export function publish(topic, message, options = {}) {
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
export function subscribe(topic, opts = {}) {
  if (!client) throw new Error("MQTT client not initialized");
  client.subscribe(topic, opts, (err) => {
    if (err) console.error("❌ Subscribe error:", err);
    else console.log(`✅ Subscribed to new topic: ${topic}`);
  });
}
