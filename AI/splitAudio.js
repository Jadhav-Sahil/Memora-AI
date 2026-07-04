const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const fs = require("fs");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);

async function splitAudio(fileUrl, meetingId) {
    return new Promise((resolve, reject) => {

        const tempDir = path.join(__dirname, "../temp", meetingId);

        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });

        const outputPattern = path.join(tempDir, "chunk_%03d.mp3");

        console.log("🎵 Splitting Audio for meeting:", meetingId);
        console.log("Source:", fileUrl);

        ffmpeg(fileUrl)
            .inputOptions([
                "-reconnect 1",
                "-reconnect_streamed 1",
                "-reconnect_delay_max 5",
            ])
            .outputOptions([
                "-f segment",
                "-segment_time 30",
                "-reset_timestamps 1",
                "-c:a libmp3lame",
                "-ar 16000",
                "-ac 1",
                "-b:a 64k",
            ])
            .output(outputPattern)
            .on("end", () => {
                const files = fs
                    .readdirSync(tempDir)
                    .filter((file) => file.startsWith("chunk_"))
                    .sort((a, b) => {
                        const aNum = parseInt(a.match(/\d+/)[0]);
                        const bNum = parseInt(b.match(/\d+/)[0]);
                        return aNum - bNum;
                    });

                const chunks = files.map((file) => path.join(tempDir, file));
                console.log(`✅ Created ${chunks.length} chunks for ${meetingId}`);
                resolve({ chunks, tempDir });
            })
            .on("error", (err) => {
                console.error("❌ FFmpeg Error:", err.message);
                fs.rmSync(tempDir, { recursive: true, force: true });
                reject(err);
            })
            .run();
    });
}

module.exports = splitAudio;