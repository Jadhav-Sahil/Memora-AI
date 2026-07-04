const errorHandler = (err, req, res, next) => {
    console.error("\n========== ERROR ==========");
    console.error("Time:", new Date().toISOString());
    console.error("Route:", req.method, req.originalUrl);
    console.error("Error:", err);
    console.error("===========================\n");

    let statusCode = err.statusCode || 500;
    let message = "Something went wrong. Please try again later.";

    // ─── Safe message string (fixes: err.message.includes is not a function) ─
    const errMessage = typeof err.message === "string" ? err.message : "";

    // ─── Custom App Errors ───────────────────────────────────────────────────
    if (err.statusCode && errMessage) {
        message = errMessage;
    }

    // ─── Mongoose ────────────────────────────────────────────────────────────
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors).map(e => e.message).join(", ");
    }

    else if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid value for field '${err.path}': ${err.value}`;
    }

    else if (err.name === "MongooseServerSelectionError") {
        statusCode = 503;
        message = "Database service is temporarily unavailable. Please try again later.";
    }

    else if (err.name === "MongooseError") {
        statusCode = 500;
        message = "A database error occurred.";
    }

    else if (err.name === "DocumentNotFoundError") {
        statusCode = 404;
        message = "Requested document was not found in the database.";
    }

    else if (err.name === "MongooseTimeoutError" || errMessage.includes("buffering timed out")) {
        statusCode = 503;
        message = "Database connection timeout. Please try again in a moment.";
    }

    else if (err.name === "MongoNetworkError") {
        statusCode = 503;
        message = "Unable to connect to the database.";
    }

    else if (err.name === "MongoParseError") {
        statusCode = 500;
        message = "Database connection string is invalid.";
    }

    else if (err.name === "MongoExpiredSessionError") {
        statusCode = 503;
        message = "Database session expired. Please try again.";
    }

    else if (err.name === "StrictModeError") {
        statusCode = 400;
        message = `Field '${err.path}' is not allowed in the schema.`;
    }

    else if (err.name === "VersionError") {
        statusCode = 409;
        message = "Document was modified by another request. Please retry.";
    }

    else if (err.name === "ParallelSaveError") {
        statusCode = 409;
        message = "Concurrent save conflict. Please retry.";
    }

    // ─── Mongo Driver ────────────────────────────────────────────────────────
    else if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyPattern || {})[0];
        message = field ? `${field} already exists.` : "Duplicate data found.";
    }

    else if (err.code === 11001) {
        statusCode = 409;
        message = "Duplicate key error on update.";
    }

    else if (err.code === 121) {
        statusCode = 400;
        message = "Document failed schema validation rules.";
    }

    else if (err.code === 112) {
        statusCode = 409;
        message = "Write conflict detected. Please retry the operation.";
    }

    else if (err.code === 13) {
        statusCode = 403;
        message = "Database authorization denied.";
    }

    else if (err.code === 18) {
        statusCode = 401;
        message = "Database authentication failed. Check credentials.";
    }

    // ─── JWT ─────────────────────────────────────────────────────────────────
    else if (err.name === "JsonWebTokenError") {
        statusCode = 401;
        message = "Invalid authentication token.";
    }

    else if (err.name === "TokenExpiredError") {
        statusCode = 401;
        message = "Session expired. Please login again.";
    }

    else if (err.name === "NotBeforeError") {
        statusCode = 401;
        message = "Token is not yet active.";
    }

    // ─── HTTP / Axios / External API ─────────────────────────────────────────
    else if (err.response) {
        statusCode = err.response.status || 500;
        if (statusCode === 400) message = "Bad request sent to external service.";
        else if (statusCode === 401) message = "External API authentication failed.";
        else if (statusCode === 403) message = "Access denied by external service.";
        else if (statusCode === 404) message = "Requested resource not found on external service.";
        else if (statusCode === 409) message = "Conflict on external service.";
        else if (statusCode === 422) message = "External service rejected the request data.";
        else if (statusCode === 429) message = "API rate limit exceeded. Please try again later.";
        else if (statusCode === 500) message = "External service encountered an internal error.";
        else if (statusCode === 502) message = "External service returned an invalid response.";
        else if (statusCode === 503) message = "External service is currently unavailable.";
        else if (statusCode === 504) message = "External service timed out.";
        else message = "External service error.";
    }

    // ─── Network / Node.js System ────────────────────────────────────────────
    else if (err.code === "ECONNREFUSED") {
        statusCode = 503;
        message = "Connection refused by the target service.";
    }

    else if (err.code === "ENOTFOUND") {
        statusCode = 503;
        message = "Service host not found. Check DNS or network configuration.";
    }

    else if (err.code === "ECONNRESET") {
        statusCode = 503;
        message = "Connection was reset by the remote server.";
    }

    else if (err.code === "ETIMEDOUT" || err.code === "ECONNABORTED") {
        statusCode = 504;
        message = "Request timed out. Please try again.";
    }

    else if (err.code === "EPIPE") {
        statusCode = 503;
        message = "Connection was closed unexpectedly.";
    }

    else if (err.code === "EADDRINUSE") {
        statusCode = 500;
        message = "Server port is already in use.";
    }

    else if (err.code === "EACCES") {
        statusCode = 500;
        message = "Server lacks permission to perform this operation.";
    }

    else if (err.code === "EMFILE") {
        statusCode = 500;
        message = "Server has too many open files. Please try again later.";
    }

    else if (err.code === "ENOMEM") {
        statusCode = 500;
        message = "Server is out of memory. Please try again later.";
    }

    else if (err.code === "ENOENT") {
        statusCode = 404;
        message = "Required file or resource not found on the server.";
    }

    else if (err.code === "EISDIR") {
        statusCode = 400;
        message = "Expected a file but found a directory.";
    }

    else if (err.code === "ENOTDIR") {
        statusCode = 400;
        message = "Expected a directory but found a file.";
    }

    else if (err.code === "ENOTEMPTY") {
        statusCode = 400;
        message = "Directory is not empty.";
    }

    else if (err.code === "EEXIST") {
        statusCode = 409;
        message = "File or resource already exists.";
    }

    // ─── Multer ──────────────────────────────────────────────────────────────
    else if (err.name === "MulterError") {
        statusCode = 400;
        switch (err.code) {
            case "LIMIT_FILE_SIZE": message = "Uploaded file is too large."; break;
            case "LIMIT_FILE_COUNT": message = "Too many files uploaded at once."; break;
            case "LIMIT_FIELD_KEY": message = "Field name is too long."; break;
            case "LIMIT_FIELD_VALUE": message = "Field value is too large."; break;
            case "LIMIT_FIELD_COUNT": message = "Too many form fields submitted."; break;
            case "LIMIT_UNEXPECTED_FILE": message = `Unexpected file field: '${err.field}'.`; break;
            case "LIMIT_PART_COUNT": message = "Too many parts in the multipart form."; break;
            default: message = "File upload failed.";
        }
    }

    // ─── Cloudinary ──────────────────────────────────────────────────────────
    else if (err.http_code && err.http_code >= 400) {
        statusCode = err.http_code;
        if (statusCode === 400) message = "Invalid file or parameters sent to Cloudinary.";
        else if (statusCode === 401) message = "Cloudinary authentication failed.";
        else if (statusCode === 403) message = "Cloudinary access denied. Check API permissions.";
        else if (statusCode === 404) message = "Resource not found on Cloudinary.";
        else if (statusCode === 420) message = "Cloudinary rate limit reached.";
        else message = "File upload service is unavailable.";
    }

    // ─── Nodemailer / SMTP ───────────────────────────────────────────────────
    else if (err.code === "EAUTH") {
        statusCode = 500;
        message = "Email service authentication failed.";
    }

    else if (err.code === "ESOCKET") {
        statusCode = 503;
        message = "Unable to connect to the email server.";
    }

    else if (err.code === "ECONNECTION") {
        statusCode = 503;
        message = "Email server connection failed.";
    }

    else if (err.code === "EMESSAGE") {
        statusCode = 500;
        message = "Failed to send email. Message was rejected.";
    }

    else if (err.code === "EENVELOPE") {
        statusCode = 400;
        message = "Invalid email address in recipient list.";
    }

    // ─── BullMQ / Redis ──────────────────────────────────────────────────────
    else if (errMessage.includes("connect ECONNREFUSED") && errMessage.includes("6379")) {
        statusCode = 503;
        message = "Job queue service (Redis) is unavailable.";
    }

    else if (errMessage.toLowerCase().includes("redis")) {
        statusCode = 503;
        message = "Queue service is temporarily unavailable.";
    }

    else if (errMessage.includes("Job") && errMessage.includes("not found")) {
        statusCode = 404;
        message = "Requested job was not found in the queue.";
    }

    // ─── Syntax / Parsing ────────────────────────────────────────────────────
    else if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        statusCode = 400;
        message = "Invalid JSON in request body.";
    }

    else if (err instanceof URIError) {
        statusCode = 400;
        message = "Malformed URL in request.";
    }

    else if (err instanceof RangeError) {
        statusCode = 400;
        message = "A value in the request is out of the allowed range.";
    }

    // ─── Auth / Permission ───────────────────────────────────────────────────
    else if (err.name === "UnauthorizedError") {
        statusCode = 401;
        message = "Authentication is required to access this resource.";
    }

    else if (err.name === "ForbiddenError" || statusCode === 403) {
        statusCode = 403;
        message = "You do not have permission to perform this action.";
    }

    // ─── HTTP Status Codes (generic fallback) ────────────────────────────────
    else if (statusCode === 400) message = "Bad request. Please check your input.";
    else if (statusCode === 401) message = "Authentication required.";
    else if (statusCode === 403) message = "Access denied.";
    else if (statusCode === 404) message = "The requested resource was not found.";
    else if (statusCode === 405) message = "HTTP method not allowed for this route.";
    else if (statusCode === 408) message = "Request timeout.";
    else if (statusCode === 409) message = "Conflict with current state of the resource.";
    else if (statusCode === 410) message = "This resource is no longer available.";
    else if (statusCode === 413) message = "Request payload is too large.";
    else if (statusCode === 415) message = "Unsupported media type.";
    else if (statusCode === 422) message = "Unprocessable request data.";
    else if (statusCode === 429) message = "Too many requests. Please slow down.";
    else if (statusCode === 500) message = "Internal server error.";
    else if (statusCode === 501) message = "This feature is not implemented.";
    else if (statusCode === 502) message = "Bad gateway response from upstream.";
    else if (statusCode === 503) message = "Service temporarily unavailable.";
    else if (statusCode === 504) message = "Gateway timeout.";

    // ─── Response ────────────────────────────────────────────────────────────
    if (req.originalUrl.startsWith("/api")) {
        return res.status(statusCode).json({ success: false, message });
    }

    return res.status(statusCode).render("pages/error", { statusCode, message });
};

// ─── 404 Handler (mount BEFORE errorHandler in app.js) ───────────────────────
const notFoundHandler = (req, res, next) => {
    const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    err.statusCode = 404;

    next(err);
};

module.exports = { errorHandler, notFoundHandler }; 