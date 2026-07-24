const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const prisma = require("./src/lib/prisma");
const { loadSession } = require("./src/middleware/auth");
const controlRoutes = require("./src/routes/control");
const createPublicRoutes = require("./src/routes/public");

dotenv.config({ quiet: true });

function cliValue(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

const app = express();
const HOST = cliValue("--host") || process.env.HOST || "0.0.0.0";
const PORT = Number(cliValue("--port") || process.env.PORT || 3000);
const root = __dirname;

app.disable("x-powered-by");
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
}));
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true, limit: "200kb" }));
app.use(cookieParser());
app.use(loadSession);

let transporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        disableFileAccess: true,
        disableUrlAccess: true,
    });
    transporter.verify()
        .then(() => console.log("SMTP готов к отправке писем"))
        .catch((error) => console.error("SMTP недоступен:", error.message));
}

app.use("/api/control", (req, res, next) => {
    res.set({
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    next();
}, controlRoutes);
app.use(createPublicRoutes({ transporter }));

app.use("/control", (req, res, next) => {
    res.set({
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
        "Content-Security-Policy": [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'",
            "connect-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
            "form-action 'self'",
        ].join("; "),
    });
    next();
});
app.use("/control/vendor/tabler", express.static(path.join(root, "node_modules", "@tabler", "icons-webfont", "dist")));
app.use("/control/assets", express.static(path.join(root, "control", "assets"), { maxAge: process.env.NODE_ENV === "production" ? "1h" : 0 }));
app.use("/control/media", express.static(path.join(root, "site", "image"), { maxAge: "1d" }));

app.get("/control", (req, res) => res.redirect(req.user ? "/control/app.html" : "/control/login.html"));
app.get("/control/", (req, res) => res.redirect(req.user ? "/control/app.html" : "/control/login.html"));
app.get("/control/login.html", (req, res) => {
    if (req.user) return res.redirect("/control/app.html");
    return res.sendFile(path.join(root, "control", "login.html"));
});
app.get("/control/app.html", (req, res) => {
    if (!req.user) return res.redirect("/control/login.html");
    return res.sendFile(path.join(root, "control", "app.html"));
});

app.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ success: true, status: "ok" });
    } catch {
        res.status(503).json({ success: false, status: "database_unavailable" });
    }
});

app.use(express.static(root, {
    index: "index.html",
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    },
}));
app.use("/site", express.static(path.join(root, "site")));

app.use((req, res) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ success: false, message: "Маршрут не найден" });
    return res.status(404).sendFile(path.join(root, "404.html"));
});

app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || (error.code === "P2002" ? 409 : 500);
    if (status >= 500) console.error("Внутренняя ошибка:", error);
    const message = error.code === "P2002"
        ? "Такая запись уже существует"
        : status >= 500 ? "Внутренняя ошибка сервера" : error.message;
    return res.status(status).json({ success: false, message });
});

if (require.main === module) {
    const server = app.listen(PORT, HOST, () => {
        console.log(`ShumDev запущен на http://${HOST}:${PORT}`);
    });
    const shutdown = (signal) => {
        console.log(`${signal}: корректная остановка`);
        server.close(async () => {
            await prisma.$disconnect();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = app;
