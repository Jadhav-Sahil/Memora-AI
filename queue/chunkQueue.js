const { Queue } = require("bullmq");
const { createRedisInstance } = require("./redisConnection");

const chunkQueue = new Queue("chunk-transcription", {
    connection: createRedisInstance(),
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: {
            age: 1800, // keep for 30 mins
            count: 200,
        },
        removeOnFail: {
            age: 86400, // keep for 24 hours
            count: 1000,
        },
    },
});

module.exports = chunkQueue;