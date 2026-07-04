const express = require("express");
const router = express.Router();

const sendOTP = require("../utils/mailer");

/* =========================
   CONFIG
========================= */
const OTP_EXPIRY = 2 * 60 * 1000; // 2 minutes
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN = 30 * 1000; // 30 seconds

/* =========================
   GENERATE OTP
========================= */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/* =========================
   SEND OTP (EMPLOYEE)
========================= */
router.post("/send-otp-employee", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const otp = generateOTP();

        req.session.email = normalizedEmail;
        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.otpAttempts = 0;
        req.session.resendTime = Date.now();
        req.session.otpVerified = false;

        req.session.save(async (err) => {
            if (err) {
                console.error("SESSION SAVE ERROR:", err);
                return res.status(500).json({
                    success: false,
                    message: "Session error"
                });
            }

            try {
                await sendOTP(normalizedEmail, otp);

                return res.json({
                    success: true,
                    message: "OTP sent successfully"
                });

            } catch (mailErr) {
                console.error("MAIL ERROR:", mailErr);

                return res.status(500).json({
                    success: false,
                    message: "Failed to send OTP"
                });
            }
        });

    } catch (err) {
        console.error("SEND OTP ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

/* =========================
   VERIFY OTP
========================= */
router.post("/verify-otp-employee", (req, res) => {
    try {
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: "OTP is required"
            });
        }

        const storedOtp = req.session.otp;
        const otpTime = req.session.otpTime;

        if (!storedOtp || !otpTime) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request again."
            });
        }

        if (Date.now() - otpTime > OTP_EXPIRY) {

            req.session.otp = null;
            req.session.otpTime = null;
            req.session.otpAttempts = 0;

            return req.session.save(() => {
                return res.status(400).json({
                    success: false,
                    message: "OTP expired"
                });
            });
        }

        req.session.otpAttempts = (req.session.otpAttempts || 0) + 1;

        if (req.session.otpAttempts > MAX_ATTEMPTS) {

            req.session.otp = null;
            req.session.otpTime = null;
            req.session.otpAttempts = 0;

            return req.session.save(() => {
                return res.status(429).json({
                    success: false,
                    message: "Too many attempts. Please resend OTP."
                });
            });
        }

        if (String(otp).trim() !== String(storedOtp).trim()) {
            return req.session.save(() => {
                return res.status(400).json({
                    success: false,
                    message: "Invalid OTP"
                });
            });
        }

        req.session.otpVerified = true;

        req.session.otp = null;
        req.session.otpTime = null;
        req.session.otpAttempts = 0;

        req.session.save((err) => {
            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Session error"
                });
            }

            return res.json({
                success: true,
                message: "OTP verified successfully"
            });
        });

    } catch (err) {
        console.error("VERIFY OTP ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

/* =========================
   RESEND OTP
========================= */
router.post("/resend-otp-employee", async (req, res) => {
    try {

        const email = req.session.email;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Please send OTP again."
            });
        }

        if (
            req.session.resendTime &&
            Date.now() - req.session.resendTime < RESEND_COOLDOWN
        ) {
            return res.status(429).json({
                success: false,
                message: "Please wait before requesting another OTP."
            });
        }

        const otp = generateOTP();

        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.otpAttempts = 0;
        req.session.resendTime = Date.now();
        req.session.otpVerified = false;

        req.session.save(async (err) => {

            if (err) {
                console.error(err);

                return res.status(500).json({
                    success: false,
                    message: "Session error"
                });
            }

            try {

                await sendOTP(email, otp);

                return res.json({
                    success: true,
                    message: "OTP resent successfully"
                });

            } catch (mailErr) {

                console.error(mailErr);

                return res.status(500).json({
                    success: false,
                    message: "Failed to resend OTP"
                });
            }

        });

    } catch (err) {

        console.error("RESEND OTP ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

module.exports = router;