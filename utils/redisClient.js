const path = require("path");
const dotenv = require("dotenv");
const IORedis = require("ioredis");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

if (!process.env.REDIS_URL) {
    throw new Error("❌ REDIS_URL missing in .env");
}

// Separate connection from the BullMQ one — BullMQ's connection
// shouldn't be shared with general data commands (HSET, INCR, etc.)
const redis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    tls: process.env.REDIS_URL.startsWith("rediss://")
        ? { rejectUnauthorized: false }
        : undefined,
});

redis.on("connect", () => console.log("✅ Redis (data client) Connected"));
redis.on("error", (err) => console.error("❌ Redis (data client) Error:", err.message));

module.exports = redis;