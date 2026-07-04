const express = require("express");
const nodemailer = require("nodemailer");
const Employee = require("../models/employee");

const router = express.Router();

/* =========================
   NODEMAILER SETUP
========================= */
const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.BREVO_EMAIL,
        pass: process.env.BREVO_SMTP_KEY,
    },
});
/* =========================
   OTP GENERATOR
========================= */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/* =========================
   SEND OTP
========================= */
router.post("/send-otp-forgot", async (req, res) => {
    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const employee = await Employee.findOne({
            email: normalizedEmail,
        });

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee account not found",
            });
        }

        const otp = generateOTP();

        req.session.otp = otp;
        req.session.email = normalizedEmail;
        req.session.otpTime = Date.now();
        req.session.otpVerified = false;
        req.session.otpAttempts = 0;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: normalizedEmail,
            subject: "Memora AI Employee Password Reset OTP",
            text: `Your OTP is ${otp}. It is valid for 1 minute.`,
        });

        return res.json({
            success: true,
            message: "OTP sent successfully",
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Failed to send OTP",
        });

    }
});

/* =========================
   VERIFY OTP
========================= */
router.post("/verify-otp-forgot", (req, res) => {

    try {

        const { otp } = req.body;

        if (!req.session.otp) {
            return res.status(400).json({
                success: false,
                message: "Please send OTP first",
            });
        }

        if (!req.session.otpTime) {
            return res.status(400).json({
                success: false,
                message: "OTP session expired",
            });
        }

        const expired =
            Date.now() - req.session.otpTime >
            60 * 1000;

        if (expired) {

            delete req.session.otp;
            delete req.session.otpTime;

            return res.status(400).json({
                success: false,
                message: "OTP expired",
            });
        }

        req.session.otpAttempts =
            (req.session.otpAttempts || 0) + 1;

        if (req.session.otpAttempts > 3) {

            delete req.session.otp;
            delete req.session.otpTime;

            return res.status(400).json({
                success: false,
                message: "Too many attempts. Please resend OTP.",
            });

        }

        if (String(otp) !== String(req.session.otp)) {

            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });

        }

        req.session.otpVerified = true;

        delete req.session.otp;
        delete req.session.otpTime;
        req.session.otpAttempts = 0;

        return res.json({
            success: true,
            message: "OTP verified successfully",
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Something went wrong",
        });

    }

});

/* =========================
   RESEND OTP
========================= */
router.post("/resend-otp-forgot", async (req, res) => {

    try {

        const email = req.session.email;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email session not found",
            });
        }

        const otp = generateOTP();

        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.otpVerified = false;
        req.session.otpAttempts = 0;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Memora AI Employee Password Reset OTP",
            text: `Your new OTP is ${otp}. It is valid for 1 minute.`,
        });

        return res.json({
            success: true,
            message: "OTP resent successfully",
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Failed to resend OTP",
        });

    }

});

module.exports = router;