const { PrismaClient } = require("@prisma/client");

const prisma =
    global.__shumdevPrisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") {
    global.__shumdevPrisma = prisma;
}

module.exports = prisma;
