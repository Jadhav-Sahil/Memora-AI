const crypto = require("crypto");

// MUST come from .env (VERY IMPORTANT)
const key = crypto
    .createHash("sha256")
    .update(process.env.CRYPTO_SECRET_KEY)
    .digest(); // 32 bytes key

const algorithm = "aes-256-cbc";

function encrypt(text) {
    const iv = crypto.randomBytes(16); // unique per encryption

    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return {
        encrypted,
        iv: iv.toString("hex")
    };
}

function decrypt(encryptedText, iv) {
    const decipher = crypto.createDecipheriv(
        algorithm,
        key,
        Buffer.from(iv, "hex")
    );

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

module.exports = { encrypt, decrypt };