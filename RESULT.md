# Результат: Pixora — демо-страница входа

Готово. Проект собран и проверен: страница открывается, API отвечает, вход работает,
события уходят в Telegram (при включённых уведомлениях).

![Страница входа Pixora](login-preview.jpeg)

---

## Что сделано

- **Только экран входа.** `/login` — единственная публичная страница, все остальные
  адреса перенаправляются на неё.
- **Свой бренд.** Название **Pixora** и оригинальный знак-апертура. Логотипы и
  фирменные элементы Instagram/Meta не используются.
- **Убрано лишнее.** Нет кнопки «Войти через Facebook», нет App Store / Google Play,
  нет ссылки на регистрацию.
- **Telegram-события:**
  - «👀 Открыта страница» — при заходе на `/login`;
  - «🖱️ Клик на странице» — при нажатии кнопок и ссылок;
  - «🔐 Вход в аккаунт» — при успешном входе.
  - В сообщении: время, IP, браузер/ОС, страница и название действия.
  - **Значения полей формы и пароли не отправляются.**
- **Демо-аккаунт** создаётся командой, регистрации на сайте нет.
- **Документация по VPS:** [docs/08-vps-full-guide.md](docs/08-vps-full-guide.md).

---

## Локальный запуск

Нужен Node.js 20+ (проверено на 22).

```bash
npm install
```

Создайте `server/.env`:

```bash
cp server/.env.example server/.env
```

Заполните минимум:

```env
JWT_SECRET=<openssl rand -hex 32>
TELEGRAM_BOT_TOKEN=<токен от @BotFather>
TELEGRAM_CHAT_ID=<ваш chat_id>
```

Создайте демо-аккаунт:

```bash
npm run user:add -- demo@example.com demo_user "Пароль12345"
```

Запустите:

```bash
npm run dev
```

Откройте `http://localhost:5173/login`.

Production-сборка локально:

```bash
npm run build
npm start
# http://localhost:4000/login
```

---

## Как проверить Telegram

1. Создайте бота у `@BotFather` → получите токен.
2. Напишите боту `/start`.
3. Узнайте `chat_id`:

```bash
curl -s "https://api.telegram.org/bot<ТОКЕН>/getUpdates"
```

4. Вставьте токен и `chat_id` в `server/.env`.
5. Перезапустите сервер, откройте `/login` и нажмите пару кнопок.

Должны прийти три типа сообщений: визит, клик, вход.

---

## Быстрый деплой на VPS (кратко)

Подробная версия со всеми командами, DNS, HTTPS, systemd, nginx, бэкапами и
диагностикой — в **[docs/08-vps-full-guide.md](docs/08-vps-full-guide.md)**.

```bash
# 1. На сервере (Ubuntu 24.04)
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw nginx certbot python3-certbot-nginx

# 2. Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs

# 3. Firewall
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable

# 4. Проект
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone <ВАШ-РЕПО> pixora
cd pixora
npm ci && npm run build

# 5. .env
cd server
cp .env.example .env
chmod 600 .env
nano .env        # NODE_ENV=production, JWT_SECRET, домен, Telegram

# 6. Демо-аккаунт
cd ..
npm run user:add -- demo@example.com demo_user "Пароль12345"

# 7. systemd
sudo cp deploy/pixora-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now pixora-api

# 8. nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/pixora
sudo nano /etc/nginx/sites-available/pixora   # server_name = ваш домен
sudo ln -sf /etc/nginx/sites-available/pixora /etc/nginx/sites-enabled/pixora
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 9. HTTPS
sudo certbot --nginx -d example.com -d www.example.com

# 10. Проверка
curl https://example.com/api/health
```

После деплоя откройте `https://example.com/login` — в Telegram придут визит и клики.

---

## Важное ограничение

Проект остаётся учебным демо под собственным брендом **Pixora**. Он не является
копией Instagram, не использует чужие логотипы и не предназначен для сбора
чужих паролей. Для портфолио и демонстрации навыков этого достаточно: видно
React, Express, JWT, bcrypt, rate limit, Telegram Bot API, systemd, nginx и HTTPS.
