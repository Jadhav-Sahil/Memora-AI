if (process.env.NODE_ENV !== "production") {
    require("dotenv").config();
}
// CORE IMPORTS
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const bcrypt = require("bcrypt");
const helmet = require("helmet");
const streamifier = require("streamifier");
const engine = require("ejs-mate");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const { Server } = require("socket.io");
const http = require("http");
const { initSocket } = require("./services/socket.service");
const { createClient } = require("@deepgram/sdk");
const deepgram = createClient(
    process.env.DEEPGRAM_API_KEY
);
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
app.set("io", io);
io.on("connection", (socket) => {
    socket.on("join-job", (jobId) => {
        socket.join(jobId);
    });
});
io.on("connection", (socket) => {
    socket.on("employee-online", (employeeId) => {
        socket.join(`employee-${employeeId}`);
    });
    socket.on("disconnect", () => {
    });
});
// Middlewere
app.use((req, res, next) => {
    req.io = io;
    next();
});
//middlerwere
const upload = require("./middleware/multer");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { isLoggedIn } = require("./middleware/auth");
const employeeAuth = require("./middleware/employeeAuth");
const {
    generalLimiter,
    loginLimiter,
    signupLimiter,
    forgotPasswordLimiter,
    aiLimiter
} = require("./middleware/rateLimiter");
// MODELS
const Company = require("./models/company");
const Employee = require("./models/employee");
const Meeting = require("./models/meeting");
const Transcribe = require("./models/transcribe")
// UTILS
const { encrypt } = require("./utils/encryption");
const { decrypt } = require("./utils/encryption");
const cloudinary = require("./utils/cloudConfig");
const otpRoutes = require("./utils/otpRoutes");
const employeeOtpRoutes = require("./utils/employeeOtpRoutes");
const forgotOtpRoutes = require("./utils/forgotOtpRoutes");
const generateCompanyCode = require("./utils/function");
const wrapAsync = require("./utils/wrapAsync");
const company = require("./models/company");
const cleanAudio = require("./utils/cleanAudio");
const ExpressError = require("./utils/ExpressError");
const employeeForgotOtpRoutes = require("./utils/employeeForgotOtpRoutes");
//AI
const transcribeAudio = require("./AI/deepgram");
const { correctTranscript } = require("./AI/groq");
//queue
const transcriptionQueue = require("./queue/transcriptionQueue");
//services
const { emitToJob } = require("./services/socket.service");
// VIEW ENGINE
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.use("/bootstrap", express.static(path.join(__dirname, "node_modules/bootstrap/dist")));
app.set("views", path.join(__dirname, "views"));

// BODY + STATIC
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

// RATE LIMITING (applies to every request; route-specific limiters are added below)
app.use(generalLimiter);
app.set("trust proxy", 1);
// SESSION
app.set("trust proxy", 1);

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        proxy: true,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        },
    })
);
// FLASH
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});
// HELMET
app.use(
    helmet({
        contentSecurityPolicy: false,
    })
);

// DB CONNECT
mongoose
    .connect(process.env.MONGO_URL)
    .then(() => { })
    .catch((err) => console.error(err));


// ROUTES (OTP MODULES)
app.use("/otp", otpRoutes);
app.use("/otp", employeeOtpRoutes);
app.use("/forgot", forgotOtpRoutes);
app.use("/employee", employeeForgotOtpRoutes);
// HOME
app.get("/", wrapAsync(async (req, res) => {
    res.render("pages/index");
}));
// SIGNUP COMPANY
app.get("/signup-company", wrapAsync(async (req, res) => {
    res.render("company/signup");
}));

app.post("/signup-company", signupLimiter, wrapAsync(async (req, res) => {

    if (!req.session.otpVerified) {
        req.flash("error", "Please verify OTP first");
        return res.redirect("/signup-company");
    }

    const { companyName, email, password, c_password } = req.body;
    req.session.companyName = companyName.trim()
        .toLowerCase()
        .replace(/\s+/g, "");
    ;
    if (!companyName || !email || !password || !c_password) {
        req.flash("error", "All fields are required");
        return res.redirect("/signup-company");
    }

    if (password !== c_password) {
        req.flash("error", "Passwords do not match");
        return res.redirect("/signup-company");
    }

    const exists = await Company.findOne({ companyEmail: email });
    if (exists) {
        req.flash("error", "Email already exists");
        return res.redirect("/signup-company");
    }

    const companyCode = generateCompanyCode();

    const company = new Company({
        companyName,
        companyEmail: email,
        password,
        companyCode: encrypt(companyCode)
    });

    await company.save();
    const c = await Company.findOne({ companyEmail: email });

    req.session.companyId = c._id;
    req.session.companyName = c.companyName;
    req.session.otpVerified = false;

    req.flash("success", "Company registered successfully");
    res.redirect("/dashboard");
}));
// LOGIN COMPANY
app.get("/login", wrapAsync(async (req, res) => {
    res.render("company/login");
}));

app.post("/login", loginLimiter, wrapAsync(async (req, res) => {

    const { email, password, rememberMe } = req.body;

    const company = await Company.findOne({ companyEmail: email });

    if (!company) {
        req.flash("error", "Account not found");
        return res.redirect("/signup-company");
    }

    const isMatch = await bcrypt.compare(password, company.password);

    if (!isMatch) {
        req.flash("error", "Invalid credentials");
        return res.redirect("/login");
    }

    req.session.regenerate((err) => {
        if (err) {
            req.flash("error", "Login failed");
            return res.redirect("/login");
        }
        // Store session data AFTER regenerate
        req.session.companyId = company._id;
        req.session.companyName = company.companyName;
        if (rememberMe) {
            req.session.cookie.maxAge = 2 * 24 * 60 * 60 * 1000; // 2 days
        }
        req.flash("success", `Welcome ${company.companyName}`);
        res.redirect("/dashboard");
    });
}));
// EMPLOYEE SIGNUP
app.get("/signup-employee", wrapAsync(async (req, res) => {
    res.render("employee/login");
}));

app.post("/signup-employee", signupLimiter, wrapAsync(async (req, res) => {
    const { c_name, name, email, role, companyCode, password, c_password } = req.body;
    if (!c_name || !name || !email || !role || !companyCode || !password || !c_password) {
        req.flash("error", "All fields are required");
        return res.redirect("/signup-employee");
    }
    const normalizedName = c_name.trim().toLowerCase().replace(/\s+/g, "");
    const company = await Company.findOne({ companyName: normalizedName });
    // const employee = await Employee.findOne({ email: email.trim().toLowerCase() });
    if (password !== c_password) {
        req.flash("error", "Passwords do not match");
        return res.redirect("/signup-employee");
    }
    if (!company) {
        req.flash("error", "Invalid company name");
        return res.redirect("/signup-employee");
    }
    const originalCode = decrypt(company.companyCode);

    if (originalCode !== companyCode) {
        req.flash("error", "Invalid Company Code");
        return res.redirect("/signup-employee");
    }


    const employee = new Employee({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        companyId: company._id
    });
    await employee.save();

    req.session.employeeId = employee._id;
    req.session.employeeName = employee.name;
    req.session.companyId = company._id;
    req.session.role = employee.role;
    req.flash("success", `Welcome ${name}`);
    res.redirect("/employee/dashboard");
}));
app.get("/employee-login", (req, res) => {
    res.render("employee/signup")
})
app.post("/employee-login", loginLimiter, wrapAsync(async (req, res) => {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
        req.flash("error", "All fields are required");
        return res.redirect("/employee-login");
    }
    const employee = await Employee.findOne({ email: email.trim().toLowerCase() });

    if (!employee) {
        req.flash("error", "Account not found");
        return res.redirect("/signup-employee");
    }

    const isMatch = await bcrypt.compare(password, employee.password);

    if (!isMatch) {
        req.flash("error", "Invalid credentials");
        return res.redirect("/employee-login");
    }
    req.session.employeeId = employee._id;
    req.session.employeeName = employee.name;
    req.session.companyId = employee.companyId;
    req.session.role = employee.role;
    req.session.regenerate((err) => {
        if (err) {
            req.flash("error", "Login failed");
            return res.redirect("/employee-login");
        }

        req.session.employeeId = employee._id;
        req.session.employeeName = employee.name;
        req.session.companyId = employee.companyId;
        req.session.role = employee.role;

        if (rememberMe) {
            req.session.cookie.maxAge = 2 * 24 * 60 * 60 * 1000;
        }

        req.flash("success", `Welcome ${employee.name}`);
        res.redirect("/employee/dashboard");
    });

}));

app.get("/employee/forgot-password", (req, res) => {
    res.render("employee/forgot")
})

app.post("/employee/forgot-password", forgotPasswordLimiter, wrapAsync(async (req, res) => {

    const { email, password, c_password } = req.body;

    if (!email || !password || !c_password) {
        req.flash("error", "All fields are required");
        return res.redirect("/employee/forgot-password");
    }

    if (password !== c_password) {
        req.flash("error", "Passwords do not match");
        return res.redirect("/employee/forgot-password");
    }
    // Verify OTP first
    if (!req.session.otpVerified) {
        req.flash("error", "Please verify OTP first.");
        return res.redirect("/employee/forgot-password");
    }
    const employee = await Employee.findOne({ email: email.trim().toLowerCase() });
    if (!employee) {
        req.flash("error", "Account not found");
        return res.redirect("/employee/forgot-password");
    }
    // If you have a pre-save hook that hashes passwords
    employee.password = password;
    await employee.save();
    // Clear OTP session data
    delete req.session.otpVerified;
    delete req.session.resetEmail;
    delete req.session.otp;
    req.flash("success", "Password reset successfully.");
    res.redirect("/employee-login");
}));
// FORGOT PASSWORD -company
app.get("/forgot-password", wrapAsync(async (req, res) => {
    res.render("pages/forgot");
}));

app.post("/forgot-password", forgotPasswordLimiter, wrapAsync(async (req, res) => {

    const { email, password, c_password } = req.body;

    if (!email || !password || !c_password) {
        req.flash("error", "All fields are required");
        return res.redirect("/forgot-password");
    }

    if (password !== c_password) {
        req.flash("error", "Passwords do not match");
        return res.redirect("/forgot-password");
    }

    const company = await Company.findOne({
        companyEmail: email.trim().toLowerCase(),
    });

    if (!company) {
        req.flash("error", "Account not found");
        return res.redirect("/forgot-password");
    }

    // IMPORTANT: let schema handle hashing
    company.password = password;
    await company.save();

    delete req.session.otpVerified;

    req.flash("success", "Password reset successfully");
    res.redirect("/login");
}));
// DASHBOARD
app.get("/dashboard", isLoggedIn, wrapAsync(async (req, res) => {
    const company = await Company.findById(req.session.companyId);
    if (!company) {
        req.flash("error", "Account not found");
        return res.redirect("/login");
    }
    const companyCode = decrypt(company.companyCode);
    const employees = await Employee.find({ companyId: req.session.companyId });
    const meetings = await Meeting.find({ company: req.session.companyId });
    const transcribe = await Transcribe.find({ company: req.session.companyId })
    res.render("company/dashboard", {
        companyCode, employees, meetings, transcribe
    });
}));
// LOGOUT company (FIXED)
app.get("/logout", (req, res) => {

    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.redirect("/login");
    });

});
//logout employee
app.get("/employee/logout", (req, res) => {
    req.session.destroy(() => {
        res.clearCookie("connect.sid");
        return res.redirect("/employee-login");
    });
});
// employee
app.get("/employees", isLoggedIn, wrapAsync(async (req, res) => {
    const companyName = req.session.companyName;
    if (!companyName) {
        const err = new Error("Company session missing. Please login again.");
        err.status = 401;
        throw err;
    }
    const company = await Company.findOne({ companyName: companyName });
    if (!company) {
        const err = new Error("Company not found");
        err.status = 404;
        throw err;
    }
    const employees = await Employee.find({ companyId: company._id });
    res.render("employee/employees", { employees });
}));

app.post("/employee/deactivate/:id", isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
        throw new Error("Employee not found");
    }
    employee.isActive = false;
    await employee.save();
    const io = req.app.get("io");
    io.to(`employee-${employee._id}`)
        .emit("employee-deactivated");
    req.flash("success", `${employee.name} has been deactivated`);
    res.redirect("/employees");
}));
//upload meeting
app.get("/upload-meeting", isLoggedIn, (req, res) => {
    res.render("company/uploadMeeting")
});
app.post(
    "/upload-meeting", isLoggedIn,
    upload.single("meetingFile"),
    wrapAsync(async (req, res) => {
        if (!req.file) {
            req.flash("error", "Please upload a meeting recording.");
            return res.redirect("/upload-meeting");
        }
        if (req.file.size > 300 * 1024 * 1024) {
            req.flash("error", "File size must be less than 300 MB");
            return res.redirect("/upload-meeting");
        }
        const allowed = ["audio/mpeg", "video/mp4"];
        if (!allowed.includes(req.file.mimetype)) {
            req.flash("error", "Only MP3 or MP4 files are allowed");
            return res.redirect("/upload-meeting");
        }
        //  STEP 1: Upload to Cloudinary (FIXED PROMISE WRAPPER)
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "meeting-recordings",
                    resource_type: "video" // works for mp4 + audio
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(stream);
        });
        //  safety check
        if (!uploadResult || !uploadResult.secure_url) {
            throw new Error("Cloudinary upload failed");
        }
        let fileUrl = uploadResult.secure_url;
        //  STEP 2: MP4 → MP3 (Cloudinary transformation)
        if (req.file.mimetype === "video/mp4") {
            fileUrl = cloudinary.url(uploadResult.public_id, {
                resource_type: "video",
                format: "mp3",
                secure: true
            });
        }
        // STEP 3: Save in DB
        const meeting = await Meeting.create({
            company: req.session.companyId,
            fileName: req.file.originalname,
            fileUrl,
            fileType:
                req.file.mimetype === "video/mp4"
                    ? "audio/mpeg"
                    : req.file.mimetype,
            fileSize: Number((req.file.size / (1024 * 1024)).toFixed(2))
        });

        req.flash("success", "Meeting uploaded successfully");
        res.redirect("/upload-meeting/terminal");
    })
);
//speech to text 
app.get("/upload-meeting/terminal", isLoggedIn, async (req, res) => {
    const meetings = await Meeting.find({ company: req.session.companyId });
    res.render("company/terminal", { meetings })
})

app.get("/meetings/:id/transcribe", isLoggedIn, async (req, res) => {
    const meeting = await Meeting.findById(req.params.id);
    res.render("company/transcribe-terminal", { meeting });
});

app.post("/meetings/:id/transcribe", isLoggedIn, aiLimiter, wrapAsync(async (req, res) => {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
    }
    const meetingId = meeting._id;
    const companyId = meeting.company;
    const jobId = meeting._id.toString();
    emitToJob(jobId, "progress", {
        step: "Booting transcription engine",
        status: "info",
        percent: 5
    });

    // ===== TEMP FILES (SAFE FOR PROD) =====
    const inputPath = path.join(os.tmpdir(), `${Date.now()}-input.mp3`);
    const outputPath = path.join(os.tmpdir(), `${Date.now()}-cleaned.mp3`);

    try {

        // ===============================
        // STEP 1: STREAM DOWNLOAD (NOT BUFFER)
        // ===============================
        emitToJob(jobId, "progress", {
            step: "Fetching audio from Cloudinary",
            status: "info",
            percent: 15
        });
        const response = await axios({
            method: "GET",
            url: meeting.fileUrl,
            responseType: "stream",
            timeout: 60000, // 60 sec safety
        });

        const writer = fs.createWriteStream(inputPath);

        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        // ===============================
        emitToJob(jobId, "progress", {
            step: "Audio downloaded successfully",
            status: "success",
            percent: 30
        });
        // STEP 2: AUDIO CLEANING (FFMPEG)
        emitToJob(jobId, "progress", {
            step: "Processing audio with FFmpeg",
            status: "info",
            percent: 45
        });

        // ===============================
        await cleanAudio(inputPath, outputPath);
        emitToJob(jobId, "progress", {
            step: "Audio cleaned successfully",
            status: "success",
            percent: 60
        });
        // ===============================
        // STEP 3: SEND TO DEEPGRAM (URL MODE - SIMPLE)
        emitToJob(jobId, "progress", {
            step: "Sending to Deepgram",
            status: "info",
            percent: 75
        });

        // ===============================
        const dgResponse = await axios.post(
            "https://api.deepgram.com/v1/listen",
            {
                url: meeting.fileUrl // OR later replace with cleaned file upload
            },
            {
                params: {
                    model: "nova-3",
                    smart_format: true,
                    punctuate: true,
                    diarize: true,
                    language: "en",
                    filler_words: false,
                    profanity_filter: true,
                    utterances: true
                },
                headers: {
                    Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`
                },
                timeout: 120000 // transcription can take time
            }
        );

        const temp =
            dgResponse.data.results.channels[0].alternatives[0].transcript;
        const words = dgResponse.data.results.channels[0].alternatives[0].words;
        const LOW_CONFIDENCE_THRESHOLD = 0.85;
        const lowConfidenceSegments = words.filter(
            w => w.confidence < LOW_CONFIDENCE_THRESHOLD
        );
        emitToJob(jobId, "progress", {
            step: "Correcting transcript with Groq AI",
            status: "info",
            percent: 85
        });
        const temp_2 = await correctTranscript(temp, lowConfidenceSegments);
        // Remove empty questions
        const questionsRaised = (temp_2.questionsRaised || []).filter(
            q => q.question && q.question.trim() !== ""
        );

        // Convert confidence warning objects into readable strings
        const confidenceWarnings = (temp_2.confidenceWarnings || []).map(
            w => `Low confidence: "${w.punctuated_word}" (${(w.confidence * 100).toFixed(1)}%)`
        );
        const transcribeDoc = await Transcribe.create({
            meeting: meetingId,
            company: companyId,

            correctedTranscript: temp_2.correctedTranscript,
            summary: temp_2.summary,

            actionItems: temp_2.actionItems,
            keyDecisions: temp_2.keyDecisions,
            deadlines: temp_2.deadlines,
            goalsMentioned: temp_2.goalsMentioned,
            risksAndConcerns: temp_2.risksAndConcerns,
            projectTags: temp_2.projectTags,

            // Use filtered data
            questionsRaised: questionsRaised,

            meetingHealth: temp_2.meetingHealth,

            // Use converted strings
            confidenceWarnings: confidenceWarnings,
        });
        const transcript = temp_2.correctedTranscript
        emitToJob(jobId, "progress", {
            step: "Transcript corrected successfully",
            status: "success",
            percent: 95,
            transcript: transcript
        });
        await transcribeDoc.save()
        // ===============================
        // STEP 5: CLEAN TEMP FILES
        // ===============================
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        emitToJob(jobId, "progress", {
            step: "Finalizing result",
            status: "success",
            percent: 100
        });
        meeting.transcribeStatus = 'completed';
        await meeting.save();
        return res.json({
            success: true,
            transcript
        });

    } catch (err) {

        // cleanup even on failure
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        console.error("TRANSCRIBE ERROR:", err.message);
        emitToJob(jobId, "progress", {
            step: "Transcription failed",
            status: "error",
            percent: 100,
            error: err.message
        });

        return res.status(500).json({
            success: false,
            error: "Transcription failed"
        });
    }
}));

app.get("/meeting-history", isLoggedIn, wrapAsync(async (req, res) => {
    if (!req.session.companyId) {
        throw new ExpressError(401, "Unauthorized access. Please login again.");
    }
    const meetings = await Meeting.find({
        company: req.session.companyId,
    }).sort({ uploadedAt: -1 });
    const transcripts = await Transcribe.find({
        company: req.session.companyId,
    });
    const transcriptMap = {};
    transcripts.forEach((transcript) => {
        if (transcript.meeting) {
            transcriptMap[transcript.meeting.toString()] = transcript;
        }
    });
    res.render("company/history", {
        meetings,
        transcriptMap,
    });
})
);

app.get("/transcript/:meetingId", isLoggedIn, wrapAsync(async (req, res) => {
    const { meetingId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(meetingId)) {
        throw new ExpressError(400, "Invalid meeting id");
    }
    const transcript = await Transcribe.findOne({
        _id: meetingId
    });
    if (!transcript) {
        throw new ExpressError(404, "transcript not found");
    }

    res.render("company/transcript", {
        transcript
    });
}));
app.get("/employee/dashboard", employeeAuth, wrapAsync(async (req, res) => {
    const companyId = req.session.companyId;
    const employee = await Employee.findById(req.session.employeeId);
    if (!employee) {
        req.flash("error", "Session expired. Please login again.");
        return res.redirect("/employee-login");
    }
    const meetings = await Meeting.find({ company: companyId })
        .sort({ uploadedAt: -1 })
        .limit(5)
        .lean();

    const totalMeetings = await Meeting.countDocuments({ company: companyId });
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const thisWeek = await Meeting.countDocuments({
        company: companyId,
        uploadedAt: { $gte: startOfWeek }
    });
    const transcribes = await Transcribe.find({ company: companyId }).lean();
    const pendingActionItems = transcribes.reduce(
        (sum, t) => sum + (t.actionItems ? t.actionItems.length : 0),
        0
    );
    const healthScores = transcribes
        .map(t => t.meetingHealth?.score)
        .filter(s => typeof s === "number" && s > 0);
    const avgHealth = healthScores.length
        ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
        : null;
    const stats = {
        totalMeetings,
        pendingActionItems,
        thisWeek,
        avgHealth
    };
    res.render("employee/dashboard", {
        employee,
        currentPage: "dashboard",
        stats,
        meetings
    });
}));

app.get("/employee/meetings", employeeAuth, wrapAsync(async (req, res) => {
    const companyId = req.session.companyId;
    const employeeId = req.session.employeeId;
    const employee = await Employee.findById(employeeId);
    const meetings = await Meeting.find({ company: companyId }).sort({ uploadedAt: -1 });
    res.render("employee/meeting", { meetings, currentPage: "upload", employee });
}));

// Meeting Insights
app.get("/employee/meeting-insight", employeeAuth, wrapAsync(async (req, res) => {
    const companyId = req.session.companyId;
    const transcribe = await Transcribe.find({ company: companyId }).sort({ uploadedAt: -1 });
    const meetings = await Meeting.find({ company: companyId }).sort({ uploadedAt: -1 });
    res.render("employee/meetingInsights", {
        transcribe, meetings,
        currentPage: "insights"
    });
})
);

app.get("/employee/action-items", employeeAuth, wrapAsync(async (req, res) => {
    const companyId = req.session.companyId;
    const transcribe = await Transcribe.find({ company: companyId }).sort({ createdAt: -1 });
    const meetings = await Meeting.find({ company: companyId }).sort({ uploadedAt: -1 });

    res.render("employee/actionItems", {
        transcribe, meetings,
        currentPage: "action-items"
    });
}));
app.get("/employee/transcript/:id", employeeAuth, wrapAsync(async (req, res) => {
    const t = await Transcribe.findById(req.params.id);
    if (!t) {
        throw new ExpressError(400, "Transcript not found");
    }
    const m = await Meeting.findById(t.meeting);
    res.render("employee/transcriptDetail", { t, m, currentPage: "insights" });
}));
app.get("/employee/analytics", employeeAuth, wrapAsync(async (req, res) => {
    const companyId = req.session.companyId;
    const transcribe = await Transcribe.find({ company: companyId }).sort({ createdAt: -1 });
    const meetings = await Meeting.find({ company: companyId }).sort({ uploadedAt: -1 });

    res.render("employee/analytics", { transcribe, meetings, currentPage: "analytics" });
}));

app.get("/employee/meetings/:id", employeeAuth, wrapAsync(async (req, res) => {
    const companyId = req.session.companyId;
    const t = await Transcribe.findOne({ meeting: req.params.id });
    if (!t) {
        throw new ExpressError(404, "Transcript not found");
    }
    if (!companyId) {
        throw new ExpressError(401, "Company ID missing from session");
    }
    if (!t.company) {
        throw new ExpressError(500, "Transcript is not linked to a company");
    }
    if (t.company.toString() !== companyId.toString()) {
        throw new ExpressError(403, "Not authorized to view this transcript");
    }
    const m = await Meeting.findById(t.meeting);
    if (!m) {
        throw new ExpressError(404, "Meeting not found");
    }
    res.render("employee/meetingDetail", { t, m, currentPage: "insights" });
}));
app.get("/employee/profile", employeeAuth, wrapAsync(async (req, res) => {
    const companyId = req.session.companyId;
    const employeeId = req.session.employeeId;
    const [company, employee] = await Promise.all([
        Company.findById(companyId),
        Employee.findById(employeeId)
    ]);
    if (!employee) {
        throw new ExpressError(404, "Employee not found");
    }
    if (!company) {
        throw new ExpressError(404, "Company not found");
    }
    res.render("employee/profile", { company, employee, currentPage: "profile" });
}));
//instant logout for the deactivated emplyoee
app.get("/employee/session-check", wrapAsync(async (req, res) => {
    if (!req.session.employeeId) {
        return res.sendStatus(401);
    }
    const employee = await Employee.findById(req.session.employeeId);

    if (!employee || !employee.isActive) {
        req.session.destroy(() => { });
        res.clearCookie("connect.sid");
        return res.sendStatus(401);
    }

    return res.sendStatus(200);

}));
//error handler
app.use(notFoundHandler);
app.use(errorHandler);
//socket  init 
initSocket(io);
// START SERVER
server.listen(8080, () => {
});