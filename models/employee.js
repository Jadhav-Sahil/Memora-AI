const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
    },

    role: {
        type: String,
        enum: [
            "owner",
            "admin",
            "employee",
            "intern",
            "manager",
            "hr",
            "developer",
            "designer",
            "tester",
            "support",
            "sales",
            "marketing"
        ],
        default: "employee"
    },

    // (OWNER USES THIS)
    isActive: {
        type: Boolean,
        default: true
    },

    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true
    }
}, { timestamps: true });
employeeSchema.pre("save", async function () {

    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 12);
    }

});
module.exports = mongoose.model("Employee", employeeSchema);