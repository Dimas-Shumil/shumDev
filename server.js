import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cors from "cors";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== БАЗОВЫЕ НАСТРОЙКИ =====
app.disable("x-powered-by");
app.set("trust proxy", 1);

// ===== CORS =====
app.use(cors());

// ===== BODY PARSER =====
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// ===== RATE LIMIT =====
const sendLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Слишком много запросов. Попробуйте позже.",
    },
});

// ===== СТАТИКА =====
app.use(express.static(__dirname));
app.use("/site", express.static(path.join(__dirname, "site")));

// ===== SMTP =====
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Проверка SMTP при запуске
transporter.verify((error) => {
    if (error) {
        console.error("SMTP ошибка:", error);
    } else {
        console.log("SMTP готов к отправке писем");
    }
});

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function isValidEmail(email = "") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeText(value) {
    return String(value || "").trim();
}

// ===== РОУТЫ =====
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Server is running",
    });
});

// ===== ОТПРАВКА ФОРМЫ =====
app.post("/send", sendLimiter, async (req, res) => {
    try {
        const {
            name,
            phone,
            email,
            message,
            personal_data_consent,
            company,
        } = req.body;

        // honeypot
        if (company) {
            return res.status(400).json({
                success: false,
                message: "Спам обнаружен",
            });
        }

        const safeName = normalizeText(name);
        const safePhone = normalizeText(phone);
        const safeEmail = normalizeText(email);
        const safeMessage = normalizeText(message);
        const now = new Date().toLocaleString("ru-RU");

        if (!safeName) {
            return res.status(400).json({
                success: false,
                message: "Имя обязательно для заполнения",
            });
        }

        if (!safeMessage) {
            return res.status(400).json({
                success: false,
                message: "Сообщение обязательно для заполнения",
            });
        }

        if (!safePhone && !safeEmail) {
            return res.status(400).json({
                success: false,
                message: "Укажите хотя бы телефон или email",
            });
        }

        if (safeEmail && !isValidEmail(safeEmail)) {
            return res.status(400).json({
                success: false,
                message: "Некорректный email",
            });
        }

        if (!personal_data_consent) {
            return res.status(400).json({
                success: false,
                message: "Необходимо согласие на обработку персональных данных",
            });
        }

        const escapedName = escapeHtml(safeName);
        const escapedPhone = escapeHtml(safePhone);
        const escapedEmail = escapeHtml(safeEmail);
        const escapedMessage = escapeHtml(safeMessage);

        console.log("Новая заявка:", {
            name: safeName,
            phone: safePhone,
            email: safeEmail,
            message: safeMessage,
            time: now,
            ip: req.ip,
        });

        await transporter.sendMail({
            from: `"ShumDev" <${process.env.SMTP_USER}>`,
            to: process.env.MAIL_TO,
            subject: "Новая заявка с сайта ShumDev",
            html: `
                <div style="background:#0b0f19;padding:30px 20px;font-family:Arial,sans-serif;">
                    <div style="max-width:600px;margin:0 auto;background:#111827;border-radius:16px;padding:30px;color:#fff;box-shadow:0 20px 40px rgba(0,0,0,0.4);">
                        <h2 style="margin:0 0 20px;font-size:22px;color:#facc15;">
                            🚀 Новая заявка с ShumDev
                        </h2>

                        <div style="margin-bottom:15px;">
                            <span style="color:#9ca3af;">Имя:</span><br>
                            <strong style="font-size:16px;">${escapedName || "Не указано"}</strong>
                        </div>

                        <div style="margin-bottom:15px;">
                            <span style="color:#9ca3af;">Телефон:</span><br>
                            <strong style="font-size:16px;">${escapedPhone || "Не указан"}</strong>
                        </div>

                        <div style="margin-bottom:15px;">
                            <span style="color:#9ca3af;">Email:</span><br>
                            <strong style="font-size:16px;">${escapedEmail || "Не указан"}</strong>
                        </div>

                        <div style="margin-bottom:20px;">
                            <span style="color:#9ca3af;">Сообщение:</span><br>
                            <div style="margin-top:5px;padding:12px;background:#1f2937;border-radius:10px;white-space:pre-line;">
                                ${escapedMessage || "Нет сообщения"}
                            </div>
                        </div>

                        <hr style="border:none;border-top:1px solid #374151;margin:20px 0;">

                        <p style="font-size:12px;color:#6b7280;margin:0 0 8px;">
                            Время заявки: ${now}
                        </p>

                        <p style="font-size:12px;color:#6b7280;margin:0 0 8px;">
                            IP: ${escapeHtml(req.ip || "Не определён")}
                        </p>

                        <p style="font-size:12px;color:#6b7280;margin:0;">
                            Это письмо отправлено автоматически с сайта ShumDev
                        </p>
                    </div>
                </div>
            `,
        });

        return res.status(200).json({
            success: true,
            message: "Сообщение успешно отправлено",
        });
    } catch (error) {
        console.error("Ошибка отправки письма:", error);

        return res.status(500).json({
            success: false,
            message: "Ошибка при отправке сообщения",
        });
    }
});

// ===== 404 =====
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Маршрут не найден",
    });
});

// ===== ОБЩИЙ ОБРАБОТЧИК ОШИБОК =====
app.use((err, req, res, next) => {
    console.error("Внутренняя ошибка сервера:", err);

    res.status(500).json({
        success: false,
        message: "Внутренняя ошибка сервера",
    });
});

app.listen(PORT, () => {
    console.log(`Server started: http://localhost:${PORT}`);
});