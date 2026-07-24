const prisma = require("./prisma");

async function recordActivity(data) {
    return prisma.activity.create({
        data: {
            actorId: data.actorId || null,
            type: data.type,
            entityType: data.entityType,
            entityId: data.entityId || null,
            title: data.title,
            details: data.details || undefined,
            projectId: data.projectId || null,
            taskId: data.taskId || null,
            leadId: data.leadId || null,
        },
    });
}

async function notifyUsers(userIds, payload) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) return;
    await prisma.notification.createMany({
        data: ids.map((userId) => ({
            userId,
            type: payload.type,
            title: payload.title,
            message: payload.message || null,
            href: payload.href || null,
        })),
    });
}

module.exports = { recordActivity, notifyUsers };
