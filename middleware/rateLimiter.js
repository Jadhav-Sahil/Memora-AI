const rateLimit = require("express-rate-limit");

// General Limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests. Please try again after 15 minutes."
});

// Login Limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many login attempts. Please try again after 15 minutes."
});

// Company Signup Limiter
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many signup attempts. Please try again later."
});

// Forgot Password Limiter
const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many password reset requests. Please try again later."
});

// AI Limiter
const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: "AI request limit exceeded. Please wait one minute."
});

module.exports = {
    generalLimiter,
    loginLimiter,
    signupLimiter,
    forgotPasswordLimiter,
    aiLimiter
};