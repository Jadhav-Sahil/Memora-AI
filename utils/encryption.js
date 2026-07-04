const crypto = require("crypto");

const algorithm = "aes-256-gcm";

// 32-byte key
const key = Buffer.from(process.env.COMPANY_CODE_SECRET, "hex");

if (key.length !== 32) {
    throw new Error("COMPANY_CODE_SECRET must be a 64-character hexadecimal string (32 bytes).");
}

function encrypt(text) {

    // 12-byte IV is recommended for AES-GCM
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    const tag = cipher.getAuthTag();

    return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

function decrypt(data) {

    if (!data || typeof data !== "string") {
        throw new Error("Invalid encrypted data.");
    }

    const parts = data.split(":");

    if (parts.length !== 3) {
        throw new Error("Encrypted data format is invalid.");
    }

    const [ivHex, tagHex, encrypted] = parts;

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");

    // AES-GCM recommended IV size
    if (iv.length !== 12) {
        throw new Error(`Invalid IV length: ${iv.length}. Expected 12 bytes.`);
    }

    if (authTag.length !== 16) {
        throw new Error(`Invalid Auth Tag length: ${authTag.length}. Expected 16 bytes.`);
    }

    const decipher = crypto.createDecipheriv(
        algorithm,
        key,
        iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

module.exports = {
    encrypt,
    decrypt
};