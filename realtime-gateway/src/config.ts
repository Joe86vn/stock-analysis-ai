export const CONFIG = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  SSI_MQTT_ENDPOINT: process.env.SSI_MQTT_ENDPOINT || 'wss://price-streaming.ssi.com.vn/mqtt',
  SSI_USERNAME: process.env.SSI_USERNAME || 'mqtt-ssi',
  SSI_PASSWORD: process.env.SSI_PASSWORD || 'mqtt-ssi',
  HEARTBEAT_INTERVAL_MS: 25000,
  CLIENT_PING_INTERVAL_MS: 30000,
};
