const express = require("express");
const router = express.Router();

const sendOTP = require("../utils/mailer");

/* =========================
   CONFIG
========================= */
const OTP_EXPIRY = 2 * 60 * 1000; // 2 min
const MAX_ATTEMPTS = 3;
const RESEND_COOLDOWN = 30 * 1000;

/* =========================
   GENERATE OTP
========================= */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/* =========================
   SEND OTP
========================= */
router.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email required",
            });
        }

        const otp = generateOTP();

        req.session.email = email;
        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.otpAttempts = 0;
        req.session.resendTime = Date.now();
        req.session.otpVerified = false;

        await sendOTP(email, otp);

        return res.json({
            success: true,
            message: "OTP sent successfully",
        });

    } catch (err) {
        console.error("SEND OTP ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Failed to send OTP",
        });
    }
});

/* =========================
   VERIFY OTP
========================= */
router.post("/verify-otp", (req, res) => {
    try {
        const { otp } = req.body;

        const storedOtp = req.session.otp;
        const otpTime = req.session.otpTime;

        if (!storedOtp || !otpTime) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Request again.",
            });
        }

        // expiry check
        if (Date.now() - otpTime > OTP_EXPIRY) {
            req.session.otp = null;
            req.session.otpTime = null;

            return res.status(400).json({
                success: false,
                message: "OTP expired",
            });
        }

        // attempts
        req.session.otpAttempts = (req.session.otpAttempts || 0) + 1;

        if (req.session.otpAttempts > MAX_ATTEMPTS) {
            req.session.otp = null;
            req.session.otpTime = null;

            return res.status(429).json({
                success: false,
                message: "Too many attempts",
            });
        }

        if (otp !== storedOtp) {
            return res.status(400).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // success
        req.session.otpVerified = true;

        req.session.otp = null;
        req.session.otpTime = null;
        req.session.otpAttempts = 0;

        return res.json({
            success: true,
            message: "OTP verified successfully",
        });

    } catch (err) {
        console.error("VERIFY OTP ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
});

/* =========================
   RESEND OTP
========================= */
router.post("/resend-otp", async (req, res) => {
    try {
        const email = req.session.email;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Send OTP again.",
            });
        }

        // cooldown
        if (Date.now() - (req.session.resendTime || 0) < RESEND_COOLDOWN) {
            return res.status(429).json({
                success: false,
                message: "Wait before resending OTP",
            });
        }

        const otp = generateOTP();

        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.otpAttempts = 0;
        req.session.resendTime = Date.now();
        req.session.otpVerified = false;

        await sendOTP(email, otp);

        return res.json({
            success: true,
            message: "OTP resent successfully",
        });

    } catch (err) {
        console.error("RESEND OTP ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Failed to resend OTP",
        });
    }
});

module.exports = router;