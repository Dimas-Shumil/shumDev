# ShumDev + ShumDev Control

Готовый сайт ShumDev и отдельная внутренняя система команды. Публичная часть
осталась независимой: новый блок «Над чем сейчас мы работаем» — статический и не
редактируется через админку. Control доступен по `/control/`.

## Что реализовано

- роли `OWNER`, `MANAGER`, `STAFF` и серверная проверка прав;
- безопасные сессии в HttpOnly-cookie, CSRF-защита и ограничение попыток входа;
- заявки с сайта сохраняются в SQLite до отправки email;
- проекты, участники, этапы, сроки и прогресс;
- назначенные и свободные задачи, атомарное взятие задачи сотрудником;
- карточка задачи: описание, результат, чек-лист, комментарии, вложения, история;
- один активный таймер на сотрудника, ручные записи времени для руководителей;
- лента действий, уведомления и глобальный поиск;
- адаптивные экраны для компьютера, планшета и телефона;
- приватные вложения: они выдаются только после проверки доступа к задаче.

## Локальный запуск

Требуется Node.js 20 LTS или 22 LTS. Node.js 24 тоже поддерживается приложением,
но для production рекомендуется LTS.

```bash
npm ci
copy .env.example .env
npm run prisma:generate
npm run prisma:deploy
npm run create-owner
npm run build:css
npm start
```

На macOS/Linux вместо `copy`:

```bash
cp .env.example .env
```

Перед запуском обязательно задайте в `.env`:

- `DATABASE_URL="file:./production.db"`;
- случайный `SESSION_SECRET` длиной не менее 32 символов;
- SMTP-параметры, если нужны email-уведомления о заявках.

После создания OWNER:

- сайт: `http://localhost:3000/`;
- Control: `http://localhost:3000/control/`;
- проверка сервера и БД: `http://localhost:3000/health`.

## Команды

```bash
npm run dev
npm run build:css
npm test
npm audit
npm run prisma:deploy
npm run create-owner
```

Демо-данные удаляют текущие данные и поэтому включаются только явно:

```bash
set ALLOW_DEMO_SEED=true
set DEMO_PASSWORD=your-long-demo-password
npm run seed:demo
```

## Production: PM2 + Nginx

1. Скопируйте проект на сервер и создайте production `.env`.
2. Выполните `npm ci --omit=dev`, `npm run prisma:generate`,
   `npm run prisma:deploy`.
3. Соберите CSS до `npm ci --omit=dev` либо установите dev-зависимости на этапе
   сборки.
4. Запустите `pm2 start ecosystem.config.cjs` и `pm2 save`.
5. Возьмите конфигурацию из `deploy/nginx-shumdev.conf`, проверьте пути к
   сертификатам и выполните `nginx -t` перед перезагрузкой Nginx.

SQLite-файл и каталог `uploads/control` должны быть доступны на запись
пользователю PM2. Делайте резервную копию обоих. Не публикуйте `.env`, базу,
загрузки или резервные копии через веб-сервер.

## Безопасность

- Не используйте `npm audit fix --force` без отдельного тестирования.
- После смены зависимостей выполните `npm audit`, `npm test` и ручной smoke-test.
- Пароли хешируются `bcrypt` с cost 12; исходные пароли не сохраняются.
- Для удаления/отключения сотрудника используйте OWNER-аккаунт.
- Control закрыт от индексации HTTP-заголовком и `robots.txt`, но это не замена
  аутентификации — доступ проверяется на сервере.
