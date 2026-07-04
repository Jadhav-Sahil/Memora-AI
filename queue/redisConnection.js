const path = require("path");
const dotenv = require("dotenv");
const IORedis = require("ioredis");

dotenv.config({
    path: path.resolve(__dirname, "../.env"),
});

if (!process.env.REDIS_URL) {
    throw new Error("❌ REDIS_URL missing in .env");
}

function createRedisInstance() {
    const conn = new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        connectTimeout: 30000,
        keepAlive: 30000, // Keep connection alive under serverless Upstash limits
        tls: process.env.REDIS_URL.startsWith("rediss://")
            ? { rejectUnauthorized: false }
            : undefined,
        retryStrategy(times) {
            // Reconnect strategy with jitter
            return Math.min(times * 1000 + Math.random() * 500, 10000);
        },
    });

    conn.on("error", (err) => {
        // Suppress unhandled promise rejections for connection errors
        console.error("❌ Redis Client Connection Error:", err.message);
    });

    return conn;
}

module.exports = { createRedisInstance };