const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const companySchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
        trim: true,
    },

    companyEmail: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },

    password: {
        type: String,
        required: true,
    },

    companyCode: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

companySchema.pre("save", async function () {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12);
    }
    this.companyName = this.companyName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");

});

module.exports = mongoose.model("Company", companySchema);