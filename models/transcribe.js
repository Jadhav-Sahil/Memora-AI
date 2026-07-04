const mongoose = require("mongoose");

const transcribeSchema = new mongoose.Schema(
    {
        meeting: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
            index: true,
        },

        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },



        correctedTranscript: {
            type: String,
            default: "",
        },

        summary: {
            type: String,
            default: "",
        },

        actionItems: [
            {
                task: String,
                assignee: { type: String, default: null },
                deadline: { type: String, default: null },
            },
        ],

        keyDecisions: {
            type: [String],
            default: [],
        },

        deadlines: [
            {
                description: String,
                date: { type: String, default: null },
                assignee: { type: String, default: null },
            },
        ],

        goalsMentioned: {
            type: [String],
            default: [],
        },

        risksAndConcerns: {
            type: [String],
            default: [],
        },

        projectTags: {
            type: [String],
            default: [],
        },

        questionsRaised: [
            {
                question: String,
                raisedBy: { type: String, default: null },
                resolved: { type: Boolean, default: false },
            },
        ],

        meetingHealth: {
            score: { type: Number, default: 0 },
            clarity: { type: String, enum: ["low", "medium", "high"] },
            actionability: { type: String, enum: ["low", "medium", "high"] },
            participation: { type: String, enum: ["low", "medium", "high"] },
            notes: { type: String, default: "" },
        },

        confidenceWarnings: {
            type: [String],
            default: [],
        },



    },
    { timestamps: true }
);

module.exports = mongoose.model("Transcribe", transcribeSchema);