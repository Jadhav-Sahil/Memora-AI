const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

/* =========================
   NODEMAILER SETUP
========================= */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
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
router.post("/send-otp-employee", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }

        const otp = generateOTP();

        req.session.otp = otp;
        req.session.email = email;
        req.session.otpTime = Date.now();
        req.session.otpVerified = false;
        req.session.otpAttempts = 0;

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Memora AI OTP Verification",
            text: `Your OTP is ${otp}. It is valid for 1 minutes.`,
        });

        console.log("Email Sent:", info.messageId);
        console.log("OTP:", otp);

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
router.post("/verify-otp-employee", (req, res) => {
    try {
        const { otp } = req.body;

        const storedOtp = req.session.otp;
        const otpTime = req.session.otpTime;

        if (!storedOtp) {
            return res.status(400).json({
                success: false,
                message: "No OTP found. Send OTP first.",
            });
        }

        if (!otpTime) {
            return res.status(400).json({
                success: false,
                message: "OTP session expired.",
            });
        }

        // 2 minutes expiry
        const isExpired =
            Date.now() - otpTime > 1 * 60 * 1000;

        if (isExpired) {
            delete req.session.otp;
            delete req.session.otpTime;

            return res.status(400).json({
                success: false,
                message: "OTP expired. Please resend OTP.",
            });
        }

        req.session.otpAttempts =
            (req.session.otpAttempts || 0) + 1;

        if (req.session.otpAttempts > 3) {

            delete req.session.otp;
            delete req.session.otpTime;

            return res.status(400).json({
                success: false,
                message:
                    "Too many attempts. Please resend OTP.",
            });
        }

        if (String(otp) !== String(storedOtp)) {
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
router.post("/resend-otp-employee", async (req, res) => {
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

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Memora AI OTP Verification",
            text: `Your new OTP is ${otp}. It is valid for 2 minutes.`,
        });

        console.log("Resend Email:", info.messageId);
        console.log("New OTP:", otp);

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