const webpush = require("web-push");
const prisma = require("./prisma");

let configuredSignature = null;

function currentConfig() {
  return {
    publicKey: String(process.env.VAPID_PUBLIC_KEY || "").trim(),
    privateKey: String(process.env.VAPID_PRIVATE_KEY || "").trim(),
    subject: String(process.env.VAPID_SUBJECT || "").trim(),
  };
}

function pushConfigured() {
  const config = currentConfig();
  return Boolean(config.publicKey && config.privateKey && config.subject);
}

function ensureConfigured() {
  if (!pushConfigured()) return false;

  const config = currentConfig();
  const signature = `${config.subject}\n${config.publicKey}\n${config.privateKey}`;

  if (configuredSignature !== signature) {
    webpush.setVapidDetails(
      config.subject,
      config.publicKey,
      config.privateKey,
    );
    configuredSignature = signature;
  }

  return true;
}

async function sendToUsers(userIds, payload) {
  const ids = [...new Set((userIds || []).filter(Boolean))];

  if (!ids.length) return { sent: 0, disabled: false };
  if (!ensureConfigured()) return { sent: 0, disabled: true };

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: ids } },
  });

  let sent = 0;
  let removed = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
      );
      sent += 1;
    } catch (error) {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await prisma.pushSubscription
          .delete({ where: { id: subscription.id } })
          .catch(() => {});
        removed += 1;
      } else {
        console.error(
          `Web Push для подписки #${subscription.id}:`,
          error?.message || error,
        );
      }
    }
  }

  return {
    sent,
    removed,
    disabled: false,
    subscriptions: subscriptions.length,
  };
}

async function sendToUser(userId, payload) {
  return sendToUsers([userId], payload);
}

module.exports = {
  pushConfigured,
  sendToUser,
  sendToUsers,
};
