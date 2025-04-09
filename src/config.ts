import "dotenv/config";

export default {
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: process.env.HOST || "0.0.0.0",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    prefix: "whiteboard:",
  },

  socketIO: {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 5e6, // 5MB
  },

  room: {
    cleanupTimeout: 60000, // 1 minute timeout to remove empty room
    updateThrottleMs: 50, // minimum interval between room updates
  },
};
