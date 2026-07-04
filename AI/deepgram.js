const axios = require("axios");

async function transcribeAudio(audioBuffer) {
    try {
        console.log("📡 Sending audio chunk to Deepgram...");

        const response = await axios.post(
            "https://api.deepgram.com/v1/listen?model=nova-2",
            audioBuffer,
            {
                headers: {
                    Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
                    "Content-Type": "audio/mpeg",
                },
                maxBodyLength: Infinity,
                timeout: 45000,
            }
        );

        const transcript =
            response?.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

        if (!transcript) {
            console.log("⚠️ Empty transcript received");
        }

        return transcript;
    } catch (err) {
        console.error("❌ Deepgram Error:", err.response?.data || err.message);
        throw err;
    }
}

module.exports = transcribeAudio;