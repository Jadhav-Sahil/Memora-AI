const express = require("express");
const Company = require("../models/company");
const router = express.Router();

const sendOTP = require("../utils/mailer"); // Brevo API mailer

/* =========================
   OTP CONFIG
========================= */
const OTP_EXPIRY = 2 * 60 * 1000; // 2 minutes
const MAX_ATTEMPTS = 3;

/* =========================
   GENERATE OTP
========================= */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/* =========================
   SEND FORGOT OTP
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

        const company = await Company.findOne({
            companyEmail: email.trim().toLowerCase(),
        });

        if (!company) {
            return res.status(400).json({
                success: false,
                message: "No account found with this email",
            });
        }

        const otp = generateOTP();

        req.session.email = email.trim().toLowerCase();
        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.otpAttempts = 0;
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
router.post("/verify-otp-forgot", (req, res) => {
    try {
        const { otp } = req.body;

        const storedOtp = req.session.otp;
        const otpTime = req.session.otpTime;

        if (!storedOtp || !otpTime) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Send OTP first.",
            });
        }

        // expiry check
        const isExpired = Date.now() - otpTime > OTP_EXPIRY;

        if (isExpired) {
            req.session.otp = null;
            req.session.otpTime = null;

            return res.status(400).json({
                success: false,
                message: "OTP expired. Please resend OTP.",
            });
        }

        // attempts
        req.session.otpAttempts = (req.session.otpAttempts || 0) + 1;

        if (req.session.otpAttempts > MAX_ATTEMPTS) {
            req.session.otp = null;
            req.session.otpTime = null;

            return res.status(429).json({
                success: false,
                message: "Too many attempts. Please resend OTP.",
            });
        }

        if (String(otp) !== String(storedOtp)) {
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
                message: "Session expired. Send OTP again.",
            });
        }

        const otp = generateOTP();

        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.otpAttempts = 0;
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