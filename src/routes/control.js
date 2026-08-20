const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const prisma = require("../lib/prisma");
const { recordActivity, notifyUsers } = require("../lib/activity");
const {
    SESSION_COOKIE,
    sessionDays,
    hashPassword,
    verifyPassword,
    generateSessionToken,
    hashToken,
    csrfTokenForSession,
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
} = require("../lib/security");
const { requireAuth, requireRoles, requireCsrf } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const OWNER_MANAGER = ["OWNER", "MANAGER"];
const TASK_STATUSES = new Set(["DRAFT", "AVAILABLE", "ASSIGNED", "IN_PROGRESS", "PAUSED", "BLOCKED", "REVIEW", "DONE", "ARCHIVED"]);
const TASK_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const PROJECT_STATUSES = new Set(["PLANNED", "ACTIVE", "PAUSED", "REVIEW", "LAUNCHED", "SUPPORT", "ARCHIVED"]);
const LEAD_STATUSES = new Set(["NEW", "IN_PROGRESS", "WAITING", "PROPOSAL", "WON", "LOST", "SPAM"]);
const ROLES = new Set(["OWNER", "MANAGER", "STAFF"]);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Слишком много попыток. Повторите через 15 минут." },
});

function isManager(user) {
    return OWNER_MANAGER.includes(user.role);
}

function taskAccessWhere(user) {
    if (isManager(user)) return {};
    return {
        OR: [
            { visibility: "TEAM" },
            { assigneeId: user.id },
            { creatorId: user.id },
            { project: { members: { some: { userId: user.id } } } },
        ],
    };
}

function projectAccessWhere(user) {
    if (isManager(user)) return {};
    return {
        OR: [
            { members: { some: { userId: user.id } } },
            { tasks: { some: { OR: [{ assigneeId: user.id }, { creatorId: user.id }, { visibility: "TEAM" }] } } },
        ],
    };
}

async function getTaskForUser(id, user, include = {}) {
    return prisma.task.findFirst({
        where: { id, ...taskAccessWhere(user) },
        include,
    });
}

function parsePage(query) {
    return {
        page: Math.max(Number.parseInt(query.page, 10) || 1, 1),
        take: Math.min(Math.max(Number.parseInt(query.limit, 10) || 50, 1), 100),
    };
}

function textRequired(value, field, maxLength = 500) {
    const normalized = normalizeText(value, maxLength);
    if (!normalized) {
        const error = new Error(`Заполните поле «${field}»`);
        error.status = 400;
        throw error;
    }
    return normalized;
}

function enumValue(value, allowed, fallback) {
    return allowed.has(value) ? value : fallback;
}

async function nextTaskCode(tx = prisma) {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `SHD-${year}-`;
    const last = await tx.task.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { id: "desc" },
        select: { code: true },
    });
    const number = last ? Number(last.code.split("-").at(-1)) + 1 : 1;
    return `${prefix}${String(number).padStart(3, "0")}`;
}

router.post("/auth/login", loginLimiter, asyncRoute(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
    const valid = user?.isActive && await verifyPassword(password, user.passwordHash);

    if (!valid) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return res.status(401).json({ success: false, message: "Неверный email или пароль" });
    }

    const rawToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + sessionDays() * 24 * 60 * 60 * 1000);
    await prisma.$transaction([
        prisma.session.create({
            data: {
                tokenHash: hashToken(rawToken),
                userId: user.id,
                expiresAt,
                ipAddress: normalizeText(req.ip, 80),
                userAgent: normalizeText(req.get("user-agent"), 400),
            },
        }),
        prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);

    res.cookie(SESSION_COOKIE, rawToken, cookieOptions(expiresAt));
    return res.json({
        success: true,
        user: publicUser(user),
        csrfToken: csrfTokenForSession(rawToken),
    });
}));

router.get("/auth/me", requireAuth, (req, res) => {
    res.json({
        success: true,
        user: publicUser(req.user),
        csrfToken: csrfTokenForSession(req.sessionToken),
    });
});

router.use(requireAuth, requireCsrf);

router.post("/auth/logout", asyncRoute(async (req, res) => {
    await prisma.session.delete({ where: { id: req.sessionRecord.id } }).catch(() => {});
    res.clearCookie(SESSION_COOKIE, clearCookieOptions());
    res.json({ success: true });
}));

router.post("/auth/password", asyncRoute(async (req, res) => {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (!await verifyPassword(currentPassword, req.user.passwordHash)) {
        return res.status(400).json({ success: false, message: "Текущий пароль указан неверно" });
    }
    if (!validPassword(newPassword)) {
        return res.status(400).json({ success: false, message: "Новый пароль должен содержать 12–128 символов" });
    }
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
        prisma.user.update({ where: { id: req.user.id }, data: { passwordHash } }),
        prisma.session.deleteMany({ where: { userId: req.user.id, id: { not: req.sessionRecord.id } } }),
    ]);
    await recordActivity({
        actorId: req.user.id,
        type: "SECURITY",
        entityType: "USER",
        entityId: req.user.id,
        title: `${req.user.name} изменил пароль`,
    });
    res.json({ success: true, message: "Пароль изменён" });
}));

router.get("/dashboard", asyncRoute(async (req, res) => {
    const access = taskAccessWhere(req.user);
    const [newLeads, activeProjects, reviewTasks, tasks, projects, leads] = await Promise.all([
        isManager(req.user) ? prisma.lead.count({ where: { status: "NEW" } }) : 0,
        prisma.project.count({
            where: {
                ...projectAccessWhere(req.user),
                status: { in: ["ACTIVE", "REVIEW", "SUPPORT"] },
            },
        }),
        prisma.task.count({ where: { ...access, status: "REVIEW" } }),
        prisma.task.findMany({
            where: {
                ...access,
                status: { in: ["AVAILABLE", "ASSIGNED", "IN_PROGRESS", "PAUSED", "BLOCKED", "REVIEW"] },
            },
            include: {
                project: { select: { id: true, name: true, accentColor: true } },
                assignee: { select: { id: true, name: true, avatarPath: true } },
            },
            orderBy: [{ deadline: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
            take: 8,
        }),
        prisma.project.findMany({
            where: {
                ...projectAccessWhere(req.user),
                status: { in: ["ACTIVE", "REVIEW", "SUPPORT"] },
            },
            include: {
                _count: { select: { tasks: true } },
                tasks: { select: { status: true } },
            },
            orderBy: { updatedAt: "desc" },
            take: 4,
        }),
        isManager(req.user)
            ? prisma.lead.findMany({
                include: { assignee: { select: { id: true, name: true, avatarPath: true } } },
                orderBy: { createdAt: "desc" },
                take: 5,
            })
            : [],
    ]);

    const projectRows = projects.map((project) => {
        const done = project.tasks.filter((task) => task.status === "DONE").length;
        const progress = project.tasks.length
            ? Math.round((done / project.tasks.length) * 100)
            : 0;
        return { ...project, progress };
    });

    res.json({
        success: true,
        metrics: { newLeads, activeProjects, reviewTasks },
        tasks,
        projects: projectRows,
        leads,
    });
}));

router.get("/users", asyncRoute(async (req, res) => {
    const users = await prisma.user.findMany({
        where: req.user.role === "STAFF" ? { isActive: true } : {},
        select: {
            id: true, name: true, email: true, role: true, position: true, avatarPath: true,
            isActive: true, lastLoginAt: true, createdAt: true,
            _count: { select: { assignedTasks: true, memberships: true } },
        },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });
    res.json({ success: true, users });
}));

router.post("/users", requireRoles("OWNER"), asyncRoute(async (req, res) => {
    const name = textRequired(req.body.name, "Имя", 120);
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    const role = enumValue(req.body.role, ROLES, "STAFF");
    if (!validEmail(email)) return res.status(400).json({ success: false, message: "Укажите корректный email" });
    if (!validPassword(password)) return res.status(400).json({ success: false, message: "Пароль должен содержать 12–128 символов" });
    const user = await prisma.user.create({
        data: {
            name,
            email,
            passwordHash: await hashPassword(password),
            role,
            position: normalizeText(req.body.position, 120) || null,
            avatarPath: normalizeText(req.body.avatarPath, 300) || null,
        },
    });
    await recordActivity({ actorId: req.user.id, type: "USER_CREATED", entityType: "USER", entityId: user.id, title: `${req.user.name} добавил сотрудника ${user.name}` });
    res.status(201).json({ success: true, user: publicUser(user) });
}));

router.patch("/users/:id", requireRoles("OWNER"), asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: "Сотрудник не найден" });
    if (existing.id === req.user.id && req.body.isActive === false) {
        return res.status(400).json({ success: false, message: "Нельзя отключить собственный аккаунт" });
    }
    const data = {};
    if (req.body.name !== undefined) data.name = textRequired(req.body.name, "Имя", 120);
    if (req.body.email !== undefined) {
        const email = normalizeEmail(req.body.email);
        if (!validEmail(email)) return res.status(400).json({ success: false, message: "Некорректный email" });
        data.email = email;
    }
    if (req.body.role !== undefined) data.role = enumValue(req.body.role, ROLES, existing.role);
    if (req.body.position !== undefined) data.position = normalizeText(req.body.position, 120) || null;
    if (typeof req.body.isActive === "boolean") data.isActive = req.body.isActive;
    if (req.body.password) {
        if (!validPassword(req.body.password)) return res.status(400).json({ success: false, message: "Пароль должен содержать 12–128 символов" });
        data.passwordHash = await hashPassword(req.body.password);
    }
    const user = await prisma.user.update({ where: { id }, data });
    if (data.isActive === false || data.passwordHash) await prisma.session.deleteMany({ where: { userId: id } });
    await recordActivity({ actorId: req.user.id, type: "USER_UPDATED", entityType: "USER", entityId: id, title: `${req.user.name} обновил профиль ${user.name}` });
    res.json({ success: true, user: publicUser(user) });
}));

router.get("/leads", requireRoles(...OWNER_MANAGER), asyncRoute(async (req, res) => {
    const { page, take } = parsePage(req.query);
    const search = normalizeText(req.query.search, 120);
    const status = LEAD_STATUSES.has(req.query.status) ? req.query.status : undefined;
    const where = {
        ...(status ? { status } : {}),
        ...(search ? { OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { message: { contains: search } },
        ] } : {}),
    };
    const [leads, total] = await Promise.all([
        prisma.lead.findMany({
            where,
            include: { assignee: { select: { id: true, name: true, avatarPath: true } }, _count: { select: { notes: true } } },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * take,
            take,
        }),
        prisma.lead.count({ where }),
    ]);
    res.json({ success: true, leads, total, page });
}));

router.get("/leads/:id", requireRoles(...OWNER_MANAGER), asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    const lead = await prisma.lead.findUnique({
        where: { id },
        include: {
            assignee: { select: { id: true, name: true, avatarPath: true } },
            notes: { include: { author: { select: { id: true, name: true, avatarPath: true } } }, orderBy: { createdAt: "desc" } },
            activities: { include: { actor: { select: { id: true, name: true, avatarPath: true } } }, orderBy: { createdAt: "desc" } },
        },
    });
    if (!lead) return res.status(404).json({ success: false, message: "Заявка не найдена" });
    res.json({ success: true, lead });
}));

router.patch("/leads/:id", requireRoles(...OWNER_MANAGER), asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: "Заявка не найдена" });
    const data = {};
    if (req.body.status !== undefined) data.status = enumValue(req.body.status, LEAD_STATUSES, existing.status);
    if (req.body.assigneeId !== undefined) data.assigneeId = parsePositiveInt(req.body.assigneeId);
    if (req.body.nextContactAt !== undefined) {
        const parsed = parseOptionalDate(req.body.nextContactAt);
        if (parsed === undefined) return res.status(400).json({ success: false, message: "Некорректная дата контакта" });
        data.nextContactAt = parsed;
    }
    const lead = await prisma.lead.update({ where: { id }, data, include: { assignee: { select: { id: true, name: true } } } });
    await recordActivity({
        actorId: req.user.id, type: "LEAD_UPDATED", entityType: "LEAD", entityId: id, leadId: id,
        title: `${req.user.name} обновил заявку ${lead.name}`, details: { status: lead.status, assigneeId: lead.assigneeId },
    });
    res.json({ success: true, lead });
}));

router.post("/leads/:id/notes", requireRoles(...OWNER_MANAGER), asyncRoute(async (req, res) => {
    const leadId = parsePositiveInt(req.params.id);
    const text = textRequired(req.body.text, "Комментарий", 3000);
    const note = await prisma.leadNote.create({
        data: { leadId, authorId: req.user.id, text },
        include: { author: { select: { id: true, name: true, avatarPath: true } } },
    });
    await recordActivity({ actorId: req.user.id, type: "LEAD_NOTE", entityType: "LEAD", entityId: leadId, leadId, title: `${req.user.name} добавил комментарий к заявке` });
    res.status(201).json({ success: true, note });
}));

router.get("/projects", asyncRoute(async (req, res) => {
    const search = normalizeText(req.query.search, 120);
    const where = {
        ...projectAccessWhere(req.user),
        ...(search ? { name: { contains: search } } : {}),
    };
    const projects = await prisma.project.findMany({
        where,
        include: {
            members: { include: { user: { select: { id: true, name: true, avatarPath: true } } } },
            tasks: { select: { status: true } },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });
    res.json({
        success: true,
        projects: projects.map((project) => {
            const done = project.tasks.filter((task) => task.status === "DONE").length;
            return { ...project, progress: project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0 };
        }),
    });
}));

router.post("/projects", requireRoles(...OWNER_MANAGER), asyncRoute(async (req, res) => {
    const name = textRequired(req.body.name, "Название проекта", 160);
    const siteUrl = normalizeText(req.body.siteUrl, 500) || null;
    const repositoryUrl = normalizeText(req.body.repositoryUrl, 500) || null;
    const designUrl = normalizeText(req.body.designUrl, 500) || null;
    if (![siteUrl, repositoryUrl, designUrl].every(validHttpUrl)) return res.status(400).json({ success: false, message: "Одна из ссылок некорректна" });
    const memberIds = Array.isArray(req.body.memberIds) ? [...new Set(req.body.memberIds.map(parsePositiveInt).filter(Boolean))] : [];
    const project = await prisma.project.create({
        data: {
            name,
            description: normalizeText(req.body.description, 5000) || null,
            status: enumValue(req.body.status, PROJECT_STATUSES, "PLANNED"),
            stage: normalizeText(req.body.stage, 120) || null,
            priority: enumValue(req.body.priority, new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), "MEDIUM"),
            startDate: parseOptionalDate(req.body.startDate),
            deadline: parseOptionalDate(req.body.deadline),
            siteUrl,
            repositoryUrl,
            designUrl,
            accentColor: /^#[0-9a-f]{6}$/i.test(req.body.accentColor || "") ? req.body.accentColor : "#6c4cff",
            coverPath: normalizeText(req.body.coverPath, 500) || null,
            createdById: req.user.id,
            members: { create: memberIds.map((userId) => ({ userId })) },
        },
        include: { members: { include: { user: { select: { id: true, name: true, avatarPath: true } } } } },
    });
    await recordActivity({ actorId: req.user.id, type: "PROJECT_CREATED", entityType: "PROJECT", entityId: project.id, projectId: project.id, title: `${req.user.name} создал проект ${project.name}` });
    res.status(201).json({ success: true, project });
}));

router.patch("/projects/:id", requireRoles(...OWNER_MANAGER), asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    const current = await prisma.project.findUnique({ where: { id } });
    if (!current) return res.status(404).json({ success: false, message: "Проект не найден" });
    const data = {};
    for (const field of ["name", "description", "stage", "siteUrl", "repositoryUrl", "designUrl", "coverPath"]) {
        if (req.body[field] !== undefined) data[field] = normalizeText(req.body[field], field === "description" ? 5000 : 500) || null;
    }
    if (data.name === null) return res.status(400).json({ success: false, message: "Название не может быть пустым" });
    if (["siteUrl", "repositoryUrl", "designUrl"].some((field) => data[field] && !validHttpUrl(data[field]))) {
        return res.status(400).json({ success: false, message: "Одна из ссылок некорректна" });
    }
    if (req.body.status !== undefined) data.status = enumValue(req.body.status, PROJECT_STATUSES, current.status);
    if (req.body.priority !== undefined) data.priority = enumValue(req.body.priority, new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]), current.priority);
    if (req.body.startDate !== undefined) data.startDate = parseOptionalDate(req.body.startDate);
    if (req.body.deadline !== undefined) data.deadline = parseOptionalDate(req.body.deadline);
    const project = await prisma.$transaction(async (tx) => {
        const updated = await tx.project.update({ where: { id }, data });
        if (Array.isArray(req.body.memberIds)) {
            const memberIds = [...new Set(req.body.memberIds.map(parsePositiveInt).filter(Boolean))];
            await tx.projectMember.deleteMany({ where: { projectId: id } });
            if (memberIds.length) await tx.projectMember.createMany({ data: memberIds.map((userId) => ({ projectId: id, userId })) });
        }
        return updated;
    });
    await recordActivity({ actorId: req.user.id, type: "PROJECT_UPDATED", entityType: "PROJECT", entityId: id, projectId: id, title: `${req.user.name} обновил проект ${project.name}` });
    res.json({ success: true, project });
}));

router.get("/tasks", asyncRoute(async (req, res) => {
    const search = normalizeText(req.query.search, 120);
    const mine = req.query.mine === "true";
    const free = req.query.free === "true";
    const status = TASK_STATUSES.has(req.query.status) ? req.query.status : undefined;
    const projectId = parsePositiveInt(req.query.projectId);
    const where = {
        ...taskAccessWhere(req.user),
        ...(mine ? { assigneeId: req.user.id } : {}),
        ...(free ? { assignmentType: "POOL", assigneeId: null, status: "AVAILABLE" } : {}),
        ...(status ? { status } : {}),
        ...(projectId ? { projectId } : {}),
        ...(search ? { OR: [{ title: { contains: search } }, { code: { contains: search } }, { description: { contains: search } }] } : {}),
    };
    const tasks = await prisma.task.findMany({
        where,
        include: {
            project: { select: { id: true, name: true, accentColor: true } },
            creator: { select: { id: true, name: true, avatarPath: true } },
            assignee: { select: { id: true, name: true, avatarPath: true } },
            checklist: { select: { id: true, isCompleted: true } },
        },
        orderBy: [{ status: "asc" }, { deadline: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });
    res.json({ success: true, tasks });
}));

router.post("/tasks", requireRoles(...OWNER_MANAGER), asyncRoute(async (req, res) => {
    const title = textRequired(req.body.title, "Название задачи", 240);
    const projectId = parsePositiveInt(req.body.projectId);
    const assigneeId = parsePositiveInt(req.body.assigneeId);
    const assignmentType = req.body.assignmentType === "POOL" ? "POOL" : "DIRECT";
    if (assignmentType === "DIRECT" && !assigneeId) return res.status(400).json({ success: false, message: "Для назначенной задачи выберите исполнителя" });
    const checklist = Array.isArray(req.body.checklist) ? req.body.checklist.map((item) => normalizeText(item, 500)).filter(Boolean).slice(0, 50) : [];
    const task = await prisma.$transaction(async (tx) => {
        const code = await nextTaskCode(tx);
        return tx.task.create({
            data: {
                code,
                title,
                description: normalizeText(req.body.description, 10000) || null,
                expectedResult: normalizeText(req.body.expectedResult, 5000) || null,
                status: assignmentType === "POOL" ? "AVAILABLE" : "ASSIGNED",
                priority: enumValue(req.body.priority, TASK_PRIORITIES, "MEDIUM"),
                assignmentType,
                visibility: enumValue(req.body.visibility, new Set(["TEAM", "PROJECT", "PRIVATE"]), "TEAM"),
                estimatedMinutes: Number.isInteger(Number(req.body.estimatedMinutes)) ? Math.max(0, Math.min(Number(req.body.estimatedMinutes), 100000)) : null,
                deadline: parseOptionalDate(req.body.deadline),
                projectId,
                creatorId: req.user.id,
                assigneeId: assignmentType === "DIRECT" ? assigneeId : null,
                checklist: { create: checklist.map((text, sortOrder) => ({ text, sortOrder })) },
            },
            include: {
                project: { select: { id: true, name: true } },
                creator: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
                checklist: true,
            },
        });
    });
    const recipients = task.assigneeId
        ? [task.assigneeId]
        : (await prisma.user.findMany({ where: { isActive: true }, select: { id: true } })).map((user) => user.id).filter((id) => id !== req.user.id);
    await Promise.all([
        recordActivity({ actorId: req.user.id, type: "TASK_CREATED", entityType: "TASK", entityId: task.id, taskId: task.id, projectId: task.projectId, title: `${req.user.name} создал задачу ${task.code}` }),
        notifyUsers(recipients, { type: "TASK", title: assignmentType === "POOL" ? "Новая свободная задача" : "Вам назначена задача", message: task.title, href: `#/tasks/${task.id}` }),
    ]);
    res.status(201).json({ success: true, task });
}));

router.get("/tasks/:id", asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    const task = await getTaskForUser(id, req.user, {
        project: { select: { id: true, name: true, accentColor: true } },
        creator: { select: { id: true, name: true, avatarPath: true } },
        assignee: { select: { id: true, name: true, avatarPath: true } },
        checklist: { include: { completedBy: { select: { id: true, name: true } } }, orderBy: { sortOrder: "asc" } },
        comments: { include: { author: { select: { id: true, name: true, avatarPath: true, role: true } } }, orderBy: { createdAt: "asc" } },
        attachments: { include: { uploader: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
        activities: { include: { actor: { select: { id: true, name: true, avatarPath: true } } }, orderBy: { createdAt: "desc" } },
    });
    if (!task) return res.status(404).json({ success: false, message: "Задача не найдена или недоступна" });
    res.json({ success: true, task });
}));

router.patch("/tasks/:id", asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    const current = await getTaskForUser(id, req.user);
    if (!current) return res.status(404).json({ success: false, message: "Задача не найдена" });
    if (!isManager(req.user) && current.creatorId !== req.user.id && current.assigneeId !== req.user.id) {
        return res.status(403).json({ success: false, message: "Недостаточно прав для изменения задачи" });
    }
    const data = {};
    if (isManager(req.user) || current.creatorId === req.user.id) {
        if (req.body.title !== undefined) data.title = textRequired(req.body.title, "Название", 240);
        if (req.body.description !== undefined) data.description = normalizeText(req.body.description, 10000) || null;
        if (req.body.expectedResult !== undefined) data.expectedResult = normalizeText(req.body.expectedResult, 5000) || null;
        if (req.body.priority !== undefined) data.priority = enumValue(req.body.priority, TASK_PRIORITIES, current.priority);
        if (req.body.deadline !== undefined) data.deadline = parseOptionalDate(req.body.deadline);
        if (req.body.assigneeId !== undefined) {
            data.assigneeId = parsePositiveInt(req.body.assigneeId);
            data.assignmentType = "DIRECT";
            if (current.status === "AVAILABLE") data.status = "ASSIGNED";
        }
    }
    if (req.body.completed !== undefined) {
        if (typeof req.body.completed !== "boolean") {
            return res.status(400).json({ success: false, message: "Поле completed должно быть логическим значением" });
        }
        if (!isManager(req.user) && current.assigneeId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Статус меняет исполнитель или руководитель" });
        }

        if (req.body.completed && current.status !== "DONE") {
            data.previousStatus = current.status;
            data.status = "DONE";
            data.completedAt = new Date();
        } else if (!req.body.completed && current.status === "DONE") {
            const previousStatus = current.previousStatus && TASK_STATUSES.has(current.previousStatus) && !["DONE", "ARCHIVED"].includes(current.previousStatus)
                ? current.previousStatus
                : current.assignmentType === "POOL" && !current.assigneeId
                    ? "AVAILABLE"
                    : current.assigneeId
                        ? (current.startedAt ? "IN_PROGRESS" : "ASSIGNED")
                        : "DRAFT";
            data.status = previousStatus;
            data.previousStatus = null;
            data.completedAt = null;
        }
    } else if (req.body.status !== undefined) {
        const nextStatus = enumValue(req.body.status, TASK_STATUSES, current.status);
        if (!isManager(req.user) && current.assigneeId !== req.user.id) {
            return res.status(403).json({ success: false, message: "Статус меняет исполнитель или руководитель" });
        }
        data.status = nextStatus;
        if (nextStatus === "IN_PROGRESS" && !current.startedAt) data.startedAt = new Date();
        if (nextStatus === "DONE") {
            if (current.status !== "DONE") data.previousStatus = current.status;
            data.completedAt = new Date();
        }
        if (nextStatus !== "DONE" && current.status === "DONE") {
            data.previousStatus = null;
            data.completedAt = null;
        }
    }
    const task = await prisma.task.update({
        where: { id },
        data,
        include: { project: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } },
    });
    await recordActivity({
        actorId: req.user.id, type: "TASK_UPDATED", entityType: "TASK", entityId: id, taskId: id, projectId: task.projectId,
        title: `${req.user.name} обновил задачу ${task.code}`, details: { status: task.status, assigneeId: task.assigneeId },
    });
    res.json({ success: true, task });
}));

router.delete("/tasks/:id", requireRoles("OWNER"), asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    if (!id) {
        return res.status(400).json({ success: false, message: "Некорректный идентификатор задачи" });
    }

    const task = await prisma.task.findUnique({
        where: { id },
        select: {
            id: true,
            code: true,
            title: true,
            attachments: { select: { storedName: true } },
        },
    });

    if (!task) {
        return res.status(404).json({ success: false, message: "Задача не найдена" });
    }

    const storedNames = task.attachments
        .map((attachment) => attachment.storedName)
        .filter(Boolean);

    await prisma.$transaction(async (tx) => {
        await tx.notification.deleteMany({
            where: { href: `#/tasks/${id}` },
        });

        await tx.task.delete({ where: { id } });
    });

    const cleanupResults = await Promise.allSettled(
        storedNames.map((storedName) => {
            const safeName = path.basename(storedName);
            const filePath = path.join(process.cwd(), "uploads", "control", safeName);
            return fs.promises.unlink(filePath);
        }),
    );

    cleanupResults.forEach((result, index) => {
        if (result.status === "rejected" && result.reason?.code !== "ENOENT") {
            console.error(`Не удалось удалить вложение ${storedNames[index]}:`, result.reason);
        }
    });

    res.json({
        success: true,
        message: `Задача ${task.code} удалена`,
    });
}));

router.post("/tasks/:id/claim", asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    const result = await prisma.task.updateMany({
        where: { id, assignmentType: "POOL", assigneeId: null, status: "AVAILABLE", ...taskAccessWhere(req.user) },
        data: { assigneeId: req.user.id, claimedAt: new Date(), status: "ASSIGNED" },
    });
    if (!result.count) return res.status(409).json({ success: false, message: "Задачу уже забрали или она недоступна" });
    const task = await prisma.task.findUnique({ where: { id } });
    await Promise.all([
        recordActivity({ actorId: req.user.id, type: "TASK_CLAIMED", entityType: "TASK", entityId: id, taskId: id, projectId: task.projectId, title: `${req.user.name} взял задачу ${task.code}` }),
        notifyUsers([task.creatorId], { type: "TASK", title: `${req.user.name} взял задачу`, message: task.title, href: `#/tasks/${task.id}` }),
    ]);
    res.json({ success: true, task });
}));

router.post("/tasks/:id/checklist", requireRoles(...OWNER_MANAGER), asyncRoute(async (req, res) => {
    const taskId = parsePositiveInt(req.params.id);
    const task = await getTaskForUser(taskId, req.user);
    if (!task) return res.status(404).json({ success: false, message: "Задача не найдена" });
    const text = textRequired(req.body.text, "Пункт", 500);
    const count = await prisma.taskChecklistItem.count({ where: { taskId } });
    const item = await prisma.taskChecklistItem.create({ data: { taskId, text, sortOrder: count } });
    res.status(201).json({ success: true, item });
}));

router.patch("/tasks/:taskId/checklist/:itemId", asyncRoute(async (req, res) => {
    const taskId = parsePositiveInt(req.params.taskId);
    const itemId = parsePositiveInt(req.params.itemId);
    const task = await getTaskForUser(taskId, req.user);
    if (!task || (!isManager(req.user) && task.assigneeId !== req.user.id)) {
        return res.status(403).json({ success: false, message: "Недостаточно прав" });
    }
    const isCompleted = Boolean(req.body.isCompleted);
    const item = await prisma.taskChecklistItem.update({
        where: { id: itemId, taskId },
        data: { isCompleted, completedById: isCompleted ? req.user.id : null, completedAt: isCompleted ? new Date() : null },
    });
    await recordActivity({ actorId: req.user.id, type: "CHECKLIST", entityType: "TASK", entityId: taskId, taskId, projectId: task.projectId, title: `${req.user.name} ${isCompleted ? "выполнил" : "вернул"} пункт чек-листа` });
    res.json({ success: true, item });
}));

router.post("/tasks/:id/comments", asyncRoute(async (req, res) => {
    const taskId = parsePositiveInt(req.params.id);
    const task = await getTaskForUser(taskId, req.user);
    if (!task) return res.status(404).json({ success: false, message: "Задача не найдена" });
    const text = textRequired(req.body.text, "Комментарий", 5000);
    const comment = await prisma.taskComment.create({
        data: { taskId, authorId: req.user.id, text },
        include: { author: { select: { id: true, name: true, avatarPath: true, role: true } } },
    });
    const recipients = [task.creatorId, task.assigneeId].filter((id) => id && id !== req.user.id);
    await Promise.all([
        recordActivity({ actorId: req.user.id, type: "TASK_COMMENT", entityType: "TASK", entityId: taskId, taskId, projectId: task.projectId, title: `${req.user.name} добавил комментарий к ${task.code}` }),
        notifyUsers(recipients, { type: "COMMENT", title: `Новый комментарий в ${task.code}`, message: text.slice(0, 160), href: `#/tasks/${taskId}` }),
    ]);
    res.status(201).json({ success: true, comment });
}));

router.post("/tasks/:id/attachments", upload.single("file"), asyncRoute(async (req, res) => {
    const taskId = parsePositiveInt(req.params.id);
    const task = await getTaskForUser(taskId, req.user);
    if (!task) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(404).json({ success: false, message: "Задача не найдена" });
    }
    const externalUrl = normalizeText(req.body.externalUrl, 1000) || null;
    if (!req.file && !externalUrl) return res.status(400).json({ success: false, message: "Добавьте файл или ссылку" });
    if (externalUrl && !validHttpUrl(externalUrl)) return res.status(400).json({ success: false, message: "Некорректная ссылка" });
    const attachment = await prisma.taskAttachment.create({
        data: {
            taskId,
            uploaderId: req.user.id,
            originalName: req.file?.originalname || normalizeText(req.body.name, 200) || new URL(externalUrl).hostname,
            storedName: req.file?.filename || null,
            mimeType: req.file?.mimetype || null,
            sizeBytes: req.file?.size || null,
            externalUrl,
        },
    });
    await recordActivity({ actorId: req.user.id, type: "ATTACHMENT", entityType: "TASK", entityId: taskId, taskId, projectId: task.projectId, title: `${req.user.name} добавил вложение к ${task.code}` });
    res.status(201).json({ success: true, attachment });
}));

router.get("/attachments/:id/download", asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.params.id);
    const attachment = await prisma.taskAttachment.findUnique({ where: { id }, include: { task: true } });
    if (!attachment || !await getTaskForUser(attachment.taskId, req.user)) return res.status(404).json({ success: false, message: "Вложение не найдено" });
    if (attachment.externalUrl) return res.redirect(302, attachment.externalUrl);
    const filePath = path.join(process.cwd(), "uploads", "control", attachment.storedName || "");
    if (!attachment.storedName || !fs.existsSync(filePath)) return res.status(404).json({ success: false, message: "Файл отсутствует" });
    res.download(filePath, attachment.originalName);
}));

router.get("/notifications", asyncRoute(async (req, res) => {
    const notifications = await prisma.notification.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: "desc" }, take: 50 });
    const unread = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ success: true, notifications, unread });
}));

router.post("/notifications/read", asyncRoute(async (req, res) => {
    const id = parsePositiveInt(req.body.id);
    await prisma.notification.updateMany({ where: { userId: req.user.id, ...(id ? { id } : {}) }, data: { isRead: true } });
    res.json({ success: true });
}));

router.get("/search", asyncRoute(async (req, res) => {
    const query = normalizeText(req.query.q, 100);
    if (query.length < 2) return res.json({ success: true, results: [] });
    const [tasks, projects, leads] = await Promise.all([
        prisma.task.findMany({
            where: { ...taskAccessWhere(req.user), OR: [{ title: { contains: query } }, { code: { contains: query } }] },
            select: { id: true, code: true, title: true },
            take: 8,
        }),
        prisma.project.findMany({ where: { ...projectAccessWhere(req.user), name: { contains: query } }, select: { id: true, name: true }, take: 5 }),
        isManager(req.user) ? prisma.lead.findMany({ where: { OR: [{ name: { contains: query } }, { email: { contains: query } }, { phone: { contains: query } }] }, select: { id: true, name: true }, take: 5 }) : [],
    ]);
    res.json({
        success: true,
        results: [
            ...tasks.map((item) => ({ type: "task", id: item.id, title: `${item.code} · ${item.title}`, href: `#/tasks/${item.id}` })),
            ...projects.map((item) => ({ type: "project", id: item.id, title: item.name, href: "#/projects" })),
            ...leads.map((item) => ({ type: "lead", id: item.id, title: item.name, href: "#/leads" })),
        ],
    });
}));

module.exports = router;
