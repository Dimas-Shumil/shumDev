const prisma = require("../lib/prisma");
const {
    SESSION_COOKIE,
    hashToken,
    csrfTokenForSession,
    safeEqual,
    clearCookieOptions,
} = require("../lib/security");

async function loadSession(req, res, next) {
    try {
        const token = req.cookies?.[SESSION_COOKIE];
        if (!token) return next();

        const session = await prisma.session.findUnique({
            where: { tokenHash: hashToken(token) },
            include: { user: true },
        });

        if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
            if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
            res.clearCookie(SESSION_COOKIE, clearCookieOptions());
            return next();
        }

        req.sessionToken = token;
        req.sessionRecord = session;
        req.user = session.user;

        if (Date.now() - session.lastSeenAt.getTime() > 15 * 60 * 1000) {
            prisma.session
                .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
                .catch(() => {});
        }

        return next();
    } catch (error) {
        return next(error);
    }
}

function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Требуется авторизация" });
    }
    return next();
}

function requireRoles(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: "Недостаточно прав" });
        }
        return next();
    };
}

function requireCsrf(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    if (!req.user || !req.sessionToken) {
        return res.status(401).json({ success: false, message: "Требуется авторизация" });
    }
    const expected = csrfTokenForSession(req.sessionToken);
    if (!safeEqual(req.get("x-csrf-token"), expected)) {
        return res.status(403).json({ success: false, message: "Некорректный CSRF-токен" });
    }
    return next();
}

module.exports = { loadSession, requireAuth, requireRoles, requireCsrf };
