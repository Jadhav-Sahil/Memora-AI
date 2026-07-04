const { Queue } = require("bullmq");
const { createRedisInstance } = require("./redisConnection");

const transcriptionQueue = new Queue("transcription", {
    connection: createRedisInstance(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: {
            age: 3600, // keep for 1 hour for debugging
            count: 100,
        },
        removeOnFail: {
            age: 86400, // keep for 24 hours
            count: 500,
        },
    },
});

module.exports = transcriptionQueue;