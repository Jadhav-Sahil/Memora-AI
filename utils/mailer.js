require("dotenv").config();
const SibApiV3Sdk = require("sib-api-v3-sdk");

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

async function sendOTP(email, otp) {
    try {
        const response = await tranEmailApi.sendTransacEmail({
            sender: {
                email: process.env.BREVO_SENDER_EMAIL,
                name: "Memora AI",
            },
            to: [{ email }],

            subject: "Your OTP Code",

            textContent: `Your OTP is ${otp}`,
        });

        console.log("OTP sent:", response);
        return response;
    } catch (err) {
        console.error("BREVO ERROR:", err);
        throw err;
    }
}

module.exports = sendOTP;