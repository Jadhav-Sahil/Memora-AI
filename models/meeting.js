const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    },

    fileName: {
        type: String,
        required: true
    },

    fileUrl: {
        type: String,
        required: true
    },

    fileType: {
        type: String,
        required: true
    },

    fileSize: {
        type: Number,
        required: true
    },
    transcribeStatus: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending",
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Meeting", meetingSchema);