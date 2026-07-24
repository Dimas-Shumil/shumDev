const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const SESSION_COOKIE = "shumdev_session";
const MIN_PASSWORD_LENGTH = 12;

function sessionDays() {
    const parsed = Number(process.env.SESSION_DAYS);
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 30) : 7;
}

function sessionSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("SESSION_SECRET должен содержать минимум 32 символа");
    }
    return secret;
}

async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

function generateSessionToken() {
    return crypto.randomBytes(48).toString("base64url");
}

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function csrfTokenForSession(token) {
    return crypto.createHmac("sha256", sessionSecret()).update(token).digest("hex");
}

function safeEqual(left, right) {
    if (!left || !right) return false;
    const leftBuffer = Buffer.from(String(left));
    const rightBuffer = Buffer.from(String(right));
    return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function cookieOptions(expiresAt) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        expires: expiresAt,
    };
}

function clearCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
    };
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function normalizeText(value, maxLength = 5000) {
    return String(value || "").replace(/\0/g, "").trim().slice(0, maxLength);
}

function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function validPassword(value) {
    return typeof value === "string" && value.length >= MIN_PASSWORD_LENGTH && value.length <= 128;
}

function validHttpUrl(value) {
    if (!value) return true;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

function parsePositiveInt(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

function publicUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        position: user.position,
        avatarPath: user.avatarPath,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
    };
}

module.exports = {
    SESSION_COOKIE,
    MIN_PASSWORD_LENGTH,
    sessionDays,
    sessionSecret,
    hashPassword,
    verifyPassword,
    generateSessionToken,
    hashToken,
    csrfTokenForSession,
    safeEqual,
    cookieOptions,
    clearCookieOptions,
    normalizeEmail,
    normalizeText,
    validEmail,
    validPassword,
    validHttpUrl,
    parsePositiveInt,
    parseOptionalDate,
    publicUser,
};
