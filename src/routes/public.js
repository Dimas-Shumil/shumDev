const express = require("express");
const rateLimit = require("express-rate-limit");
const prisma = require("../lib/prisma");
const { normalizeText, validEmail } = require("../lib/security");

const router = express.Router();
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Слишком много запросов. Попробуйте позже." },
});

function escapeHtml(value = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

module.exports = function publicRoutes({ transporter }) {
    router.post("/send", limiter, async (req, res, next) => {
        try {
            const name = normalizeText(req.body.name, 120);
            const phone = normalizeText(req.body.phone, 60);
            const email = normalizeText(req.body.email, 180).toLowerCase();
            const message = normalizeText(req.body.message, 5000);

            if (req.body.company) return res.status(400).json({ success: false, message: "Спам обнаружен" });
            if (!name) return res.status(400).json({ success: false, message: "Имя обязательно для заполнения" });
            if (!message) return res.status(400).json({ success: false, message: "Сообщение обязательно для заполнения" });
            if (!phone && !email) return res.status(400).json({ success: false, message: "Укажите телефон или email" });
            if (email && !validEmail(email)) return res.status(400).json({ success: false, message: "Некорректный email" });
            if (!req.body.personal_data_consent) return res.status(400).json({ success: false, message: "Необходимо согласие на обработку персональных данных" });

            const lead = await prisma.lead.create({
                data: {
                    name,
                    phone: phone || null,
                    email: email || null,
                    message,
                    source: "Сайт",
                    sourcePage: normalizeText(req.body.sourcePage || req.get("referer"), 500) || null,
                    utmSource: normalizeText(req.body.utm_source, 120) || null,
                    utmMedium: normalizeText(req.body.utm_medium, 120) || null,
                    utmCampaign: normalizeText(req.body.utm_campaign, 120) || null,
                    ipAddress: normalizeText(req.ip, 80) || null,
                    userAgent: normalizeText(req.get("user-agent"), 400) || null,
                },
            });

            await prisma.activity.create({
                data: {
                    type: "LEAD_CREATED",
                    entityType: "LEAD",
                    entityId: lead.id,
                    leadId: lead.id,
                    title: `Новая заявка от ${name}`,
                    details: { source: "Сайт" },
                },
            });

            if (transporter && process.env.MAIL_TO && process.env.SMTP_USER) {
                try {
                    await transporter.sendMail({
                        from: `"ShumDev" <${process.env.SMTP_USER}>`,
                        to: process.env.MAIL_TO,
                        subject: `Новая заявка #${lead.id} с сайта ShumDev`,
                        html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:28px;background:#0b1020;color:#fff;border-radius:16px">
                            <h2 style="color:#8b6cff">Новая заявка #${lead.id}</h2>
                            <p><b>Имя:</b> ${escapeHtml(name)}</p>
                            <p><b>Телефон:</b> ${escapeHtml(phone || "—")}</p>
                            <p><b>Email:</b> ${escapeHtml(email || "—")}</p>
                            <p style="white-space:pre-line"><b>Сообщение:</b><br>${escapeHtml(message)}</p>
                            <p style="color:#94a3b8">Заявка уже сохранена в ShumDev Control.</p>
                        </div>`,
                    });
                } catch (mailError) {
                    console.error(`Не удалось отправить email по заявке #${lead.id}:`, mailError.message);
                }
            }

            res.status(201).json({ success: true, message: "Сообщение успешно отправлено" });
        } catch (error) {
            next(error);
        }
    });

    return router;
};
