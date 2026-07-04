const express = require("express");
const Company = require("../models/company");
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
   SEND OTP (FORGOT PASSWORD)
========================= */
router.post("/send-otp-forgot", async (req, res) => {
    try {
        const email = (req.body.email || "").trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        const company = await Company.findOne({
            companyEmail: email
        });

        if (!company) {
            return res.status(400).json({
                success: false,
                message: "No account found with this email"
            });
        }

        const otp = generateOTP();

        req.session.email = email;
        req.session.otp = otp;
        req.session.otpTime = Date.now();
        req.session.otpAttempts = 0;
        req.session.resendTime = Date.now();
        req.session.otpVerified = false;

        console.log("========== FORGOT OTP ==========");
        console.log("Session :", req.sessionID);
        console.log("Email   :", email);
        console.log("OTP     :", otp);
        console.log("================================");

        req.session.save(async (err) => {

            if (err) {
                console.error("SESSION ERROR:", err);

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

router.post("/verify-otp-forgot", (req, res) => {

    try {

        const otp = String(req.body.otp || "").trim();

        console.log("========== VERIFY OTP ==========");
        console.log("Session :", req.sessionID);
        console.log("Entered :", otp);
        console.log("Stored  :", req.session.otp);
        console.log("================================");

        if (!req.session.otp || !req.session.otpTime) {

            return res.status(400).json({
                success: false,
                message: "OTP not found. Please request a new OTP."
            });

        }

        if (Date.now() - req.session.otpTime > OTP_EXPIRY) {

            req.session.otp = null;
            req.session.otpTime = null;
            req.session.otpAttempts = 0;

            return res.status(400).json({
                success: false,
                message: "OTP expired. Please resend OTP."
            });

        }

        req.session.otpAttempts =
            (req.session.otpAttempts || 0) + 1;

        if (req.session.otpAttempts > MAX_ATTEMPTS) {

            req.session.otp = null;
            req.session.otpTime = null;

            return res.status(429).json({
                success: false,
                message: "Too many attempts. Please resend OTP."
            });

        }

        if (otp !== req.session.otp) {

            return res.status(400).json({
                success: false,
                message: "Invalid OTP"
            });

        }

        req.session.otpVerified = true;
        req.session.otp = null;
        req.session.otpTime = null;
        req.session.otpAttempts = 0;

        req.session.save((err) => {

            if (err) {

                console.error("SESSION ERROR:", err);

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

router.post("/resend-otp-forgot", async (req, res) => {

    try {

        const email = req.session.email;

        if (!email) {

            return res.status(400).json({
                success: false,
                message: "Session expired. Please request OTP again."
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
        console.log("Session :", req.sessionID);
        console.log("Email   :", email);
        console.log("OTP     :", otp);
        console.log("================================");

        req.session.save(async (err) => {

            if (err) {

                console.error("SESSION ERROR:", err);

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