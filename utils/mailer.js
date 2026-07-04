const nodemailer = require("nodemailer");
console.log("BREVO_EMAIL:", process.env.BREVO_EMAIL);
console.log(
    "BREVO_SMTP_KEY:",
    process.env.BREVO_SMTP_KEY ? "Loaded" : "Missing"
);
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_EMAIL,
        pass: process.env.BREVO_SMTP_KEY,
    },
});

module.exports = transporter;