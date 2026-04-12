# 🚀 ShumDev — Web Development Portfolio & Lead Generation Platform

ShumDev — это современный веб-проект, который объединяет:

* 💼 портфолио разработчика
* 📩 систему сбора заявок (lead generation)
* ⚙️ backend на Node.js (Express)
* 🔍 SEO-оптимизированную структуру

Проект ориентирован на реальные задачи бизнеса: привлечение клиентов, обработка заявок и масштабирование.

---

## 🌐 Live Demo

👉 https://shumdev.ru/ 

---

## 🧠 Архитектура проекта

### Frontend

* HTML5 + SCSS (модульная структура)
* Vanilla JavaScript
* Адаптивная верстка (mobile-first)

### Backend

* Node.js + Express
* REST API (обработка форм)
* SMTP (отправка писем через Nodemailer)
* Rate Limiting (защита от спама)
* Валидация и санитизация данных

---

## ⚙️ Основной функционал

* 📩 Форма обратной связи
* 🛡️ Защита от спама (honeypot + rate limit)
* 📧 Отправка заявок на email
* 🔍 SEO (robots.txt, sitemap.xml)
* 🧪 Healthcheck endpoint `/health`

---

## 🗂️ Структура проекта

```
shumDev/
├── site/              # frontend (HTML, SCSS, JS)
├── server.js          # backend (Express сервер)
├── .env               # переменные окружения
├── robots.txt         # SEO
├── sitemap.xml        # SEO
├── package.json
```

---

## 🚀 Быстрый старт

### 1. Клонирование проекта

```bash
git clone https://github.com/Dimas-Shumil/shumDev.git
cd shumDev
```

### 2. Установка зависимостей

```bash
npm install
```

### 3. Настройка .env

Создай файл `.env`:

```env
PORT=5000

SMTP_HOST=smtp.yourmail.com
SMTP_PORT=465
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
SMTP_TO=your@email.com
```

### 4. Запуск проекта

```bash
node server.js
```

или (рекомендуется):

```bash
npm run dev
```

---

## 🔐 Безопасность

* Ограничение количества запросов (rate limit)
* Honeypot-поле для защиты от ботов
* Валидация email
* Санитизация HTML
* Ограничение размера тела запроса

---

## 📈 SEO

* robots.txt
* sitemap.xml
* SSR-ready структура (под расширение)
* Чистые URL

---

## 💡 Планы развития

* [ ] Перевод фронта на Next.js
* [ ] Добавление блога (SEO трафик)
* [ ] Подключение аналитики (Google Analytics / Yandex Metrika)
* [ ] Интеграция CRM
* [ ] UI улучшения (анимации, UX)
* [ ] API для управления заявками

---

## 🧠 Чему учит проект

* Построение fullstack-приложения
* Работа с формами и SMTP
* Защита backend
* SEO-основа
* Архитектура проекта

---

## 👨‍💻 Автор

Dimas Shumil
Frontend / Fullstack Developer
PabloAlligator
Frontend / Fullstack Developer

GitHub: https://github.com/Dimas-Shumil

---

## ⭐ Если проект полезен — поставь звезду

