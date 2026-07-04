const crypto = require("crypto");

// proper prime pool
const primes = [31, 37, 41, 43, 47, 53, 59, 61];

function generateCompanyCode() {
    const time = Date.now();

    // stronger randomness than Math.random()
    const random1 = crypto.randomInt(1e6, 1e9);
    const random2 = parseInt(crypto.randomBytes(4).toString("hex"), 16);

    // pick random prime
    const prime = primes[crypto.randomInt(0, primes.length)];

    // mix everything
    const raw = (time * prime) + random1 ^ random2;

    // convert to readable format
    const code = Math.abs(raw).toString(36).toUpperCase();

    return `MEMORA-${code}`;
}

module.exports = generateCompanyCode;