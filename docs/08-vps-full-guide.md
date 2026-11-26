# 08. Полный гайд: хостинг Pixora на VPS

Пошаговая инструкция «с нуля»: от покупки сервера до рабочего HTTPS-сайта,
уведомлений в Telegram, обновлений и бэкапов. Все команды можно копировать.

> **Что мы хостим.** Это учебный демо-проект **Pixora** с собственным логотипом
> и названием. Он не является копией Instagram, не использует его логотипы и
> не предназначен для сбора чужих паролей. Не переименовывайте проект в
> Instagram/Meta и не используйте его для имитации чужих сервисов.

**Итоговая схема:**

```
Интернет
   │  HTTPS :443
   ▼
 nginx (TLS, заголовки, gzip)
   │  proxy_pass http://127.0.0.1:4000
   ▼
 Node.js / Express  ──►  client/dist (React-сборка)
   │
   └──► Telegram Bot API (визиты, клики, входы)
```

Один Node-процесс отдаёт и статику, и API. nginx принимает внешние запросы,
терминирует HTTPS и проксирует всё на localhost. Так проще: один сервис,
один порт, меньше точек отказа.

---

## Содержание

1. [Что понадобится](#1-что-понадобится)
2. [Создание VPS](#2-создание-vps)
3. [Первый вход по SSH](#3-первый-вход-по-ssh)
4. [Базовая настройка сервера](#4-базовая-настройка-сервера)
5. [Пользователь и SSH-ключи](#5-пользователь-и-ssh-ключи)
6. [Firewall и fail2ban](#6-firewall-и-fail2ban)
7. [Swap для 1 ГБ RAM](#7-swap-для-1-гб-ram)
8. [Node.js, nginx, certbot](#8-nodejs-nginx-certbot)
9. [Загрузка проекта](#9-загрузка-проекта)
10. [Настройка `.env`](#10-настройка-env)
11. [Telegram-бот](#11-telegram-бот)
12. [Сборка и демо-аккаунт](#12-сборка-и-демо-аккаунт)
13. [systemd-сервис](#13-systemd-сервис)
14. [nginx](#14-nginx)
15. [Домен и DNS](#15-домен-и-dns)
16. [HTTPS через Let's Encrypt](#16-https-через-lets-encrypt)
17. [Проверка сайта и событий](#17-проверка-сайта-и-событий)
18. [Обновление проекта](#18-обновление-проекта)
19. [Бэкапы](#19-бэкапы)
20. [Логи и диагностика](#20-логи-и-диагностика)
21. [Безопасность: чек-лист](#21-безопасность-чек-лист)
22. [Типовые ошибки](#22-типовые-ошибки)
23. [Шпаргалка команд](#23-шпаргалка-команд)

---

## 1. Что понадобится

| Что | Зачем | Минимум |
|---|---|---|
| VPS | Сервер, на котором живёт сайт | 1 vCPU, 1 ГБ RAM, 10 ГБ SSD |
| Ubuntu | ОС сервера | 24.04 LTS (или 22.04) |
| Домен | Красивый адрес и HTTPS | любой, например `pixora-demo.ru` |
| Telegram | Уведомления о событиях | аккаунт и бот |
| Ваш ПК | SSH-клиент | Windows 10/11, macOS или Linux |

Подойдут любые провайдеры: Timeweb Cloud, Aeza, Hetzner, DigitalOcean, Vultr,
REG.RU, Selectel. Выбирайте локацию ближе к аудитории.

> **Домен не обязателен на первом этапе.** Сайт заработает и по IP
> (`http://203.0.113.10/login`), но без HTTPS. Для «показать маме» лучше
> сразу сделать домен и сертификат — это 15 минут.

---

## 2. Создание VPS

1. Зарегистрируйтесь у провайдера и создайте сервер.
2. Выберите **Ubuntu 24.04 LTS**, 1 vCPU, 1 ГБ RAM, 10 ГБ SSD.
3. При создании добавьте **SSH-ключ** (если провайдер позволяет) или запомните
   root-пароль.
4. Запишите **IP-адрес**, например `203.0.113.10`.
5. Если у провайдера есть «облачный firewall» — пока не закрывайте порты 22/80/443.

---

## 3. Первый вход по SSH

На своём компьютере откройте PowerShell (Windows) или терминал (macOS/Linux):

```bash
ssh root@203.0.113.10
```

Первый раз появится вопрос про fingerprint — введите `yes`. Затем пароль
(при вводе он не отображается — это нормально).

Если SSH нет в Windows:

```
Settings → Apps → Optional Features → Add a feature → OpenSSH Client
```

Сразу обновите систему:

```bash
apt update && apt upgrade -y
apt install -y git curl ufw nano unzip
```

Если обновилось ядро и просит перезагрузку:

```bash
reboot
```

Подождите 30–60 секунд и подключитесь снова.

---

## 4. Базовая настройка сервера

### Часовой пояс

```bash
timedatectl set-timezone Europe/Moscow
timedatectl
```

### Имя сервера (необязательно)

```bash
hostnamectl set-hostname pixora
```

### Автообновления безопасности

```bash
apt install -y unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
```

Выберите `Yes`.

---

## 5. Пользователь и SSH-ключи

Работать под `root` постоянно — плохая практика. Создадим пользователя `pixora`:

```bash
adduser pixora
usermod -aG sudo pixora
```

Придумайте пароль (или пропустите, если будете входить только по ключу).

### Создать SSH-ключ (на своём компьютере)

В **новом** окне PowerShell/терминала, не на сервере:

```bash
ssh-keygen -t ed25519 -C "pixora-vps"
```

Три раза Enter (или задайте пароль на ключ). Скопируйте публичный ключ на сервер.

**Windows PowerShell:**

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@203.0.113.10 "mkdir -p /home/pixora/.ssh && cat >> /home/pixora/.ssh/authorized_keys && chown -R pixora:pixora /home/pixora/.ssh && chmod 700 /home/pixora/.ssh && chmod 600 /home/pixora/.ssh/authorized_keys"
```

**macOS / Linux:**

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub pixora@203.0.113.10
```

Проверка — должно пустить **без пароля**:

```bash
ssh pixora@203.0.113.10
```

### Отключить вход по паролю и под root

Только после успешной проверки ключа! На сервере:

```bash
sudo nano /etc/ssh/sshd_config
```

Приведите строки к виду (уберите `#` в начале):

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Сохранить: `Ctrl+O`, Enter, `Ctrl+X`. Перезапустить SSH:

```bash
sudo systemctl restart ssh
```

> **Важно:** не закрывайте текущую сессию, пока не проверите вход в новом окне.
> Иначе можно остаться без доступа к серверу.

---

## 6. Firewall и fail2ban

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

На вопрос ответить `y`. Проверка:

```bash
sudo ufw status verbose
```

Ожидаемо: `Status: active`, открыты только 22, 80, 443.

Защита от перебора SSH:

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

---

## 7. Swap для 1 ГБ RAM

Сборка React и npm могут потребовать больше памяти. Создадим 2 ГБ swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

В выводе появится строка `Swap: 2.0Gi`.

---

## 8. Node.js, nginx, certbot

### Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node -v
npm -v
```

Ожидаемо `v22.x.x` и `10.x.x`.

### nginx и certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx
nginx -v
```

---

## 9. Загрузка проекта

### Вариант А: из GitHub (рекомендуется)

```bash
sudo mkdir -p /var/www
sudo chown pixora:pixora /var/www
cd /var/www
git clone https://github.com/ВАШ-ЛОГИН/ВАШ-РЕПО.git pixora
cd pixora
```

Если репозиторий приватный, GitHub попросит логин и **Personal Access Token**
вместо пароля.

### Вариант Б: с вашего компьютера через scp/rsync

На **своём компьютере**, из папки проекта:

```powershell
# Windows PowerShell (rsync может отсутствовать — используйте scp)
scp -r .\* pixora@203.0.113.10:/var/www/pixora/
```

Лучше исключить `node_modules`:

```bash
rsync -av --exclude node_modules --exclude client/dist \
  ./ pixora@203.0.113.10:/var/www/pixora/
```

Проверьте, что вы в корне проекта:

```bash
cd /var/www/pixora
ls
# client  deploy  docs  package.json  README.md  server
```

---

## 10. Настройка `.env`

```bash
cd /var/www/pixora/server
cp .env.example .env
chmod 600 .env
nano .env
```

Заполните:

```env
PORT=4000
NODE_ENV=production

# Сгенерируйте: openssl rand -hex 32
JWT_SECRET=вставьте_сюда_длинную_случайную_строку
JWT_EXPIRES_IN=7d

# Ваш домен (через запятую, без пробелов)
CLIENT_ORIGIN=https://example.com,https://www.example.com
TRUST_PROXY=true
SERVE_STATIC=true

# Telegram (см. следующий раздел)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_ENABLED=true
TZ_NAME=Europe/Moscow
GEOIP_ENABLED=false

DATA_DIR=./data
```

Сгенерировать секрет прямо на сервере:

```bash
openssl rand -hex 32
```

Важные моменты:

- `NODE_ENV=production` — обязательно.
- `CLIENT_ORIGIN` — точный адрес сайта с `https://`. Пока домена нет, можно
  указать `http://203.0.113.10` и потом поменять.
- `TRUST_PROXY=true` — чтобы в Telegram попадал реальный IP посетителя,
  а не `127.0.0.1`.
- `chmod 600` — файл читает только владелец.
- `.env` уже в `.gitignore`. Проверьте: `git status` не должен его показывать.

---

## 11. Telegram-бот

### 1. Создать бота

1. Откройте Telegram, найдите **@BotFather**.
2. Отправьте `/newbot`.
3. Задайте имя (например, `Pixora Demo`) и username (должен заканчиваться на `bot`).
4. BotFather пришлёт токен вида `123456789:AAH...` — это `TELEGRAM_BOT_TOKEN`.

### 2. Узнать chat_id

**Личный чат:**

1. Напишите своему боту любое сообщение (нажмите Start).
2. Выполните на сервере:

```bash
curl -s "https://api.telegram.org/bot<ТОКЕН>/getUpdates" | head -c 2000
```

В ответе найдите `"chat":{"id":123456789,...}` — это `TELEGRAM_CHAT_ID`.

**Группа или канал:**

1. Добавьте бота в группу (или сделайте админом канала).
2. Напишите сообщение в группу.
3. Снова `getUpdates` — id будет отрицательным, например `-1001234567890`.
4. Для канала бот должен быть администратором.

### 3. Проверить отправку

```bash
curl -s -X POST "https://api.telegram.org/bot<ТОКЕН>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":"<CHAT_ID>","text":"Проверка Pixora"}'
```

Должно прийти сообщение и ответ `"ok":true`.

### 4. Вписать в `.env`

```env
TELEGRAM_BOT_TOKEN=123456789:AAH...
TELEGRAM_CHAT_ID=123456789
TELEGRAM_ENABLED=true
```

> Безопасность: токен — это пароль от бота. Не публикуйте его, не коммитьте
> `.env`, не вставляйте в скриншоты.

---

## 12. Сборка и демо-аккаунт

Из корня проекта:

```bash
cd /var/www/pixora
npm ci --no-audit --no-fund
npm run build
```

Если `npm ci` ругается на отсутствие `package-lock.json`, используйте
`npm install --no-audit --no-fund`.

Проверьте сборку:

```bash
ls client/dist
# assets  index.html
```

Создайте демо-аккаунт (регистрации на сайте нет):

```bash
npm run user:add -- demo@example.com demo_user "Пароль12345"
```

Требования: корректный email, логин 3–30 символов (латиница, цифры, `.`, `_`),
пароль от 8 символов. Пароль хешируется bcrypt и в открытом виде не хранится.

Проверить, что пользователь появился:

```bash
cat server/data/users.json
```

Там будет `passwordHash`, а не пароль.

---

## 13. systemd-сервис

Скопируйте unit из проекта:

```bash
cd /var/www/pixora
sudo cp deploy/pixora-api.service /etc/systemd/system/pixora-api.service
sudo nano /etc/systemd/system/pixora-api.service
```

Проверьте пути и пользователя:

```ini
[Unit]
Description=Pixora auth API (Node.js)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pixora
Group=pixora
WorkingDirectory=/var/www/pixora/server
EnvironmentFile=/var/www/pixora/server/.env
ExecStart=/usr/bin/node src/index.js

Restart=always
RestartSec=3
KillSignal=SIGTERM
TimeoutStopSec=15

NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true
RestrictSUIDSGID=true
LockPersonality=true
ReadWritePaths=/var/www/pixora/server/data

StandardOutput=journal
StandardError=journal
SyslogIdentifier=pixora-api

[Install]
WantedBy=multi-user.target
```

Запуск:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pixora-api
sudo systemctl status pixora-api --no-pager
```

Ожидаемо: `Active: active (running)`.

Проверка API:

```bash
curl http://127.0.0.1:4000/api/health
# {"ok":true,"uptime":3,"env":"production"}
```

Если `failed` — смотрите логи:

```bash
sudo journalctl -u pixora-api -n 80 --no-pager
```

---

## 14. nginx

```bash
cd /var/www/pixora
sudo cp deploy/nginx.conf /etc/nginx/sites-available/pixora
sudo nano /etc/nginx/sites-available/pixora
```

Замените `server_name` на свой домен. **Пока домена нет** можно поставить `_`
(nginx будет отвечать на любой Host, сайт откроется по IP):

```nginx
server_name _;
```

Полный конфиг (для домена):

```nginx
server {
    listen 80;
    listen [::]:80;

    server_name example.com www.example.com;

    client_max_body_size 1m;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    gzip on;
    gzip_comp_level 5;
    gzip_min_length 512;
    gzip_vary on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_read_timeout    30s;
        proxy_send_timeout    30s;
    }
}
```

Включить сайт и убрать дефолтный:

```bash
sudo ln -sf /etc/nginx/sites-available/pixora /etc/nginx/sites-enabled/pixora
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` должен сказать `syntax is ok` и `test is successful`.

Проверка по IP:

```
http://203.0.113.10/login
```

Если 502 — Node не запущен или слушает другой порт:

```bash
sudo systemctl status pixora-api
curl http://127.0.0.1:4000/api/health
```

---

## 15. Домен и DNS

1. Купите домен у регистратора (REG.RU, Namecheap, Cloudflare и т.д.).
2. В панели DNS создайте записи:

| Тип | Имя | Значение | TTL |
|---|---|---|---|
| A | `@` | `203.0.113.10` | 300 |
| A | `www` | `203.0.113.10` | 300 |

3. Подождите 5–30 минут. Проверка:

```bash
dig +short example.com
dig +short www.example.com
```

Должен вернуться ваш IP.

4. Вернитесь в nginx-конфиг и укажите домен в `server_name`, затем:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 16. HTTPS через Let's Encrypt

Сертификат бесплатный, продлевается автоматически.

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Что будет:

1. Certbot спросит email — укажите реальный (для уведомлений об истечении).
2. Согласитесь с условиями (`A`).
3. На вопрос про редирект выберите **Redirect** (перенаправить HTTP на HTTPS).

Проверка автопродления:

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

Готово: `https://example.com/login`.

Не забудьте обновить `.env`:

```env
CLIENT_ORIGIN=https://example.com,https://www.example.com
```

И перезапустить сервис:

```bash
sudo systemctl restart pixora-api
```

---

## 17. Проверка сайта и событий

1. Откройте `https://example.com/login`.
2. Должна открыться страница **Pixora** с вашим логотипом.
3. В Telegram должно прийти сообщение **«👀 Открыта страница»**.
4. Нажмите «Показать», «Войти» (с неверным паролем), «Забыли пароль?»,
   ссылки в подвале — придут сообщения **«🖱️ Клик на странице»**.
5. Войдите демо-аккаунтом — придёт **«🔐 Вход в аккаунт»**.

Проверка, что IP реальный (а не `127.0.0.1`):

- в сообщении о визите должен быть ваш домашний/мобильный IP;
- если там `127.0.0.1` — проверьте `TRUST_PROXY=true` в `.env` и
  `X-Forwarded-For` в nginx, затем перезапустите сервис.

Проверка API вручную:

```bash
curl -X POST https://example.com/api/events \
  -H "Content-Type: application/json" \
  -d '{"type":"visit","label":"Проверка с сервера","path":"/login"}'
# {"ok":true}
```

---

## 18. Обновление проекта

После изменений в GitHub — на сервере:

```bash
cd /var/www/pixora
bash deploy/deploy.sh
```

Скрипт делает: `git pull` → `npm install` → `npm run build` →
`systemctl restart` → проверка `/api/health`.

Если менялся `.env` — перезапустите сервис вручную:

```bash
sudo systemctl restart pixora-api
```

Если менялся `nginx.conf`:

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/pixora
sudo nginx -t && sudo systemctl reload nginx
```

> `deploy.sh` использует `npm install`. Для строгой воспроизводимости можно
> заменить на `npm ci` (нужен актуальный `package-lock.json`).

---

## 19. Бэкапы

Пользователи лежат в `server/data/users.json`. Ежедневный архив:

```bash
sudo mkdir -p /var/backups/pixora
sudo crontab -e
```

Добавьте в конец:

```cron
0 4 * * * tar -czf /var/backups/pixora/users-$(date +\%F).tgz -C /var/www/pixora/server/data users.json
0 5 1 * * find /var/backups/pixora -name 'users-*.tgz' -mtime +30 -delete
```

Проверка:

```bash
sudo ls -la /var/backups/pixora
```

Скачать архив к себе:

```powershell
scp pixora@203.0.113.10:/var/backups/pixora/users-2026-11-26.tgz .
```

> `.env` тоже стоит сохранить в надёжном месте (менеджер паролей), но **не**
> в публичном репозитории.

---

## 20. Логи и диагностика

### Сервис

```bash
sudo systemctl status pixora-api
sudo journalctl -u pixora-api -n 100 --no-pager
sudo journalctl -u pixora-api -f          # в реальном времени
```

### nginx

```bash
sudo tail -n 100 /var/log/nginx/access.log
sudo tail -n 100 /var/log/nginx/error.log
sudo nginx -t
```

### Порты и процессы

```bash
sudo ss -tulpn | grep -E ':(22|80|443|4000)'
sudo systemctl list-units --type=service --state=running
```

### Проверка API

```bash
curl -i http://127.0.0.1:4000/api/health
curl -i https://example.com/api/health
```

### Перезапуск всего

```bash
sudo systemctl restart pixora-api
sudo systemctl reload nginx
```

---

## 21. Безопасность: чек-лист

- [ ] `PermitRootLogin no`, `PasswordAuthentication no` в `/etc/ssh/sshd_config`.
- [ ] Вход по SSH-ключу проверен в новом окне.
- [ ] `ufw` активен, открыты только 22/80/443.
- [ ] `fail2ban` установлен и работает.
- [ ] `NODE_ENV=production`.
- [ ] `JWT_SECRET` — случайные 32+ байта, не дефолтное значение.
- [ ] `server/.env` имеет права `600`.
- [ ] `.env` не в git (`git status` чистый).
- [ ] `TELEGRAM_BOT_TOKEN` не публиковался в чатах/скриншотах.
- [ ] HTTPS включён, HTTP перенаправляется на HTTPS.
- [ ] `TRUST_PROXY=true` и nginx передаёт `X-Forwarded-For`.
- [ ] Регулярные бэкапы `users.json` проверены восстановлением.
- [ ] Обновления: `sudo apt update && sudo apt upgrade -y` раз в месяц.
- [ ] Нет чужих логотипов/названий: проект остаётся **Pixora**.

---

## 22. Типовые ошибки

| Симптом | Причина | Решение |
|---|---|---|
| `502 Bad Gateway` | Node не запущен / другой порт | `systemctl status pixora-api`, `curl 127.0.0.1:4000/api/health` |
| `404` на `/login` | nginx ищет файл, а не проксирует | Проверьте `location / { proxy_pass ... }` и симлинк сайта |
| Сайт открывается по IP, но не по домену | DNS ещё не обновился / неверный `server_name` | `dig +short domain`, подождите, проверьте конфиг |
| `certbot` не выдаёт сертификат | Домен не указывает на сервер / закрыт 80 | Проверьте DNS и `ufw`, затем повторите |
| В Telegram IP `127.0.0.1` | Не включён `TRUST_PROXY` | `TRUST_PROXY=true`, перезапуск сервиса |
| Telegram-сообщения не приходят | Неверный токен/chat_id или бот не начат | Проверьте `curl sendMessage`, напишите боту `/start` |
| `EADDRINUSE :4000` | Порт занят другим процессом | `sudo ss -tulpn \| grep 4000`, остановите старый процесс |
| `npm run build` падает по памяти | Мало RAM | Добавьте swap (раздел 7) |
| `Permission denied` при записи в `data` | Неверный владелец | `sudo chown -R pixora:pixora /var/www/pixora` |
| `Invalid environment variable` | Опечатка в `.env` | Сравните с `.env.example`, перезапустите |
| События не приходят, вход работает | Заблокирован `sendBeacon` / лимит | Проверьте консоль браузера и `journalctl` |
| `429 Too Many Requests` | Сработал rate limit | Подождите 15 минут (логин) или минуту (события) |

---

## 23. Шпаргалка команд

```bash
# Статус и логи
sudo systemctl status pixora-api
sudo journalctl -u pixora-api -f

# Перезапуск после изменений
sudo systemctl restart pixora-api

# Обновление проекта
cd /var/www/pixora && bash deploy/deploy.sh

# Пересборка вручную
cd /var/www/pixora && npm ci && npm run build

# Новый демо-аккаунт
cd /var/www/pixora && npm run user:add -- user@example.com user_name "Пароль12345"

# Проверка API
curl http://127.0.0.1:4000/api/health

# nginx
sudo nginx -t && sudo systemctl reload nginx

# Сертификат
sudo certbot renew --dry-run

# Firewall
sudo ufw status verbose

# Бэкап сейчас
sudo tar -czf /var/backups/pixora/users-$(date +%F).tgz -C /var/www/pixora/server/data users.json
```

---

## Что дальше

- Домен и HTTPS можно сделать сразу — см. разделы 15–16.
- Для реального проекта замените JSON-хранилище на PostgreSQL/SQLite.
- Добавьте мониторинг (Uptime Kuma, Healthchecks) и алерты.
- Не превращайте демо в имитацию Instagram/Meta: это незаконно и нарушает
  правила сервисов. Учебный проект с собственным брендом — отличное портфолио.
