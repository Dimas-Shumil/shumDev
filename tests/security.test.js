const test = require("node:test");
const assert = require("node:assert/strict");
const {
    hashPassword,
    verifyPassword,
    generateSessionToken,
    hashToken,
    normalizeEmail,
    normalizeText,
    validEmail,
    validPassword,
    validHttpUrl,
    parsePositiveInt,
    parseOptionalDate,
} = require("../src/lib/security");

test("пароль хешируется и проверяется", async () => {
    const password = "very-long-password-2026";
    const hash = await hashPassword(password);
    assert.notEqual(hash, password);
    assert.equal(await verifyPassword(password, hash), true);
    assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("сессионные токены случайны и не хранятся открыто", () => {
    const first = generateSessionToken();
    const second = generateSessionToken();
    assert.notEqual(first, second);
    assert.equal(hashToken(first).length, 64);
    assert.notEqual(hashToken(first), first);
});

test("валидаторы нормализуют безопасные поля", () => {
    assert.equal(normalizeEmail("  PAVEL@SHUMDEV.RU "), "pavel@shumdev.ru");
    assert.equal(normalizeText(" a\0b "), "ab");
    assert.equal(validEmail("pavel@shumdev.ru"), true);
    assert.equal(validEmail("not-an-email"), false);
    assert.equal(validPassword("123456789012"), true);
    assert.equal(validPassword("short"), false);
    assert.equal(validHttpUrl("https://shumdev.ru"), true);
    assert.equal(validHttpUrl("javascript:alert(1)"), false);
});

test("идентификаторы и даты разбираются строго", () => {
    assert.equal(parsePositiveInt("12"), 12);
    assert.equal(parsePositiveInt("-1"), null);
    assert.equal(parsePositiveInt("abc"), null);
    assert.equal(parseOptionalDate("bad-date"), undefined);
    assert.equal(parseOptionalDate(""), null);
});
