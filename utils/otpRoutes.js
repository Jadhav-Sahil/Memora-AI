const express = require("express");
const router = express.Router();

const sendOTP = require("../utils/mailer");

/* =========================
   CONFIG
========================= */
const OTP_EXPIRY = 2 * 60 * 1000; // 2 minutes
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
                message: "Email is required"
            });
        }

        const otp = generateOTP();

        req.session.email = email.trim().toLowerCase();
        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.otpAttempts = 0;
        req.session.resendTime = Date.now();
        req.session.otpVerified = false;

        console.log("========== OTP GENERATED ==========");
        console.log("Session ID :", req.sessionID);
        console.log("Email      :", email);
        console.log("OTP        :", otp);
        console.log("===================================");

        req.session.save(async (err) => {
            if (err) {
                console.error("SESSION SAVE ERROR:", err);

                return res.status(500).json({
                    success: false,
                    message: "Session error"
                });
            }

            try {
                await sendOTP(email, otp);

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

router.post("/verify-otp", (req, res) => {

    try {

        const otp = String(req.body.otp || "").trim();

        console.log("========== VERIFY OTP ==========");
        console.log("Session ID :", req.sessionID);
        console.log("Entered OTP:", otp);
        console.log("Stored OTP :", req.session.otp);
        console.log("================================");

        if (!req.session.otp || !req.session.otpTime) {
            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request again."
            });
        }

        // OTP expired

        if (Date.now() - req.session.otpTime > OTP_EXPIRY) {

            req.session.otp = null;
            req.session.otpTime = null;
            req.session.otpAttempts = 0;

            return res.status(400).json({
                success: false,
                message: "OTP expired"
            });
        }

        req.session.otpAttempts =
            (req.session.otpAttempts || 0) + 1;

        if (req.session.otpAttempts > MAX_ATTEMPTS) {

            req.session.otp = null;
            req.session.otpTime = null;

            return res.status(429).json({
                success: false,
                message: "Too many incorrect attempts"
            });
        }

        if (otp !== req.session.otp) {

            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });
        }

        // Success

        req.session.otpVerified = true;
        req.session.otp = null;
        req.session.otpTime = null;
        req.session.otpAttempts = 0;

        req.session.save((err) => {

            if (err) {

                console.error("SESSION SAVE ERROR:", err);

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
            message: "Server error"
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
                message: "Session expired. Please send OTP again."
            });

        }

        if (
            Date.now() - (req.session.resendTime || 0)
            < RESEND_COOLDOWN
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

        console.log("========== RESEND OTP ==========");
        console.log("Session ID :", req.sessionID);
        console.log("Email      :", email);
        console.log("OTP        :", otp);
        console.log("================================");

        req.session.save(async (err) => {

            if (err) {

                console.error("SESSION SAVE ERROR:", err);

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

                console.error("MAIL ERROR:", mailErr);

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