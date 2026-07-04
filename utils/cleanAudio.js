const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

function cleanAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioFrequency(16000)
            .audioChannels(1)
            .audioFilters("highpass=f=80,lowpass=f=3000,afftdn,loudnorm")
            .audioBitrate("128k")
            .on("end", () => {
                console.log("Audio cleaned successfully");
                resolve(outputPath);
            })
            .on("error", (err) => {
                console.error("FFmpeg error:", err.message);
                reject(err);
            })
            .save(outputPath);
    });
}

module.exports = cleanAudio;