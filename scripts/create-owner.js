const readline = require("readline");
const prisma = require("../src/lib/prisma");
const { hashPassword, validEmail, validPassword, normalizeEmail, normalizeText } = require("../src/lib/security");

function ask(question, hidden = false) {
    if (!hidden) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        return new Promise((resolve) => rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        }));
    }

    return new Promise((resolve) => {
        const stdin = process.stdin;
        const stdout = process.stdout;
        stdout.write(question);
        stdin.setRawMode?.(true);
        stdin.resume();
        stdin.setEncoding("utf8");
        let value = "";
        const onData = (char) => {
            if (char === "\r" || char === "\n") {
                stdin.setRawMode?.(false);
                stdin.pause();
                stdin.removeListener("data", onData);
                stdout.write("\n");
                resolve(value);
            } else if (char === "\u0003") {
                process.exit(130);
            } else if (char === "\u007f") {
                value = value.slice(0, -1);
            } else {
                value += char;
            }
        };
        stdin.on("data", onData);
    });
}

async function main() {
    const name = normalizeText(process.env.OWNER_NAME || await ask("Имя владельца: "), 120);
    const email = normalizeEmail(process.env.OWNER_EMAIL || await ask("Email владельца: "));
    const password = process.env.OWNER_PASSWORD || await ask("Пароль (минимум 12 символов): ", true);

    if (!name) throw new Error("Имя обязательно");
    if (!validEmail(email)) throw new Error("Некорректный email");
    if (!validPassword(password)) throw new Error("Пароль должен содержать 12–128 символов");

    const user = await prisma.user.upsert({
        where: { email },
        update: { name, role: "OWNER", isActive: true, passwordHash: await hashPassword(password) },
        create: { name, email, role: "OWNER", passwordHash: await hashPassword(password), position: "Владелец" },
    });
    console.log(`OWNER готов: ${user.name} <${user.email}>`);
}

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
