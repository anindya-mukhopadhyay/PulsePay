import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";
import app from "./app.js";

const PORT = env.PORT;

async function main() {
  try {
    const conn = await connectDatabase();
    console.log(`✅ MongoDB connected: ${conn.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 PulsePay server running on port ${PORT} (${env.NODE_ENV})`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received — shutting down gracefully…`);
    server.close(() => {
      console.log("HTTP server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main();
