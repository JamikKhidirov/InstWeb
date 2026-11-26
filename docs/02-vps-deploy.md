# 02. Деплой на VPS (Ubuntu 24.04)

Инструкция «с нуля»: от пустого сервера до работающего сайта по IP.
Домен и HTTPS — в следующем файле: [03-domain-https.md](03-domain-https.md).

**Схема, которую мы собираем:**

```
Интернет → nginx (:80/:443) → Node/Express (:4000) → client/dist + API
                                                  ↘ Telegram Bot API
```

Один Node-процесс отдаёт и статику, и API. nginx принимает внешние запросы и проксирует их на localhost. Так проще всего: не нужно настраивать два сервиса и права на папку `dist`.

---

## 1. Арендовать VPS

Минимальные требования:

| Параметр | Значение |
|---|---|
| ОС | Ubuntu 24.04 LTS (или 22.04) |
| CPU | 1 vCPU |
| RAM | 1 ГБ |
| Диск | 10 ГБ |
| IPv4 | обязателен |

Подойдут Timeweb Cloud, Aeza, Hetzner, DigitalOcean, Vultr, REG.RU. Выбирайте локацию ближе к аудитории (для России/СНГ — Москва, Санкт-Петербург, Франкфурт).

После создания сервера провайдер даст:

- **IP-адрес**, например `203.0.113.10`
- **root-пароль** или сразу SSH-ключ

---

## 2. Первый вход по SSH

На своём компьютере (Windows 10/11 — PowerShell):

```powershell
ssh root@203.0.113.10
```

Первый раз спросит `Are you sure you want to continue connecting?` — введите `yes`. Затем пароль (при вводе он не отображается — это нормально).

> Если SSH нет в Windows: `Settings → Apps → Optional Features → Add a feature → OpenSSH Client`.

Сразу обновим систему:

```bash
apt update && apt upgrade -y
apt install -y git curl ufw nano
```

Если ядро обновилось и просит перезагрузку:

```bash
reboot
```

и подождите 30–60 секунд, затем подключитесь снова.

---

## 3. Создать пользователя и настроить SSH-ключ

Работать под `root` постоянно — плохая практика. Создадим пользователя `pixora`:

```bash
adduser pixora
```

Придумайте пароль (или пропустите — если будете входить только по ключу). Затем:

```bash
usermod -aG sudo pixora
```

### Ключ (рекомендуется)

На **своём компьютере** (не на сервере), в новом окне PowerShell:

```powershell
ssh-keygen -t ed25519 -C "pixora-vps"
```

Enter → Enter → Enter (без пароля к ключу или с паролем — на ваш выбор). Скопировать ключ на сервер:

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@203.0.113.10 "mkdir -p /home/pixora/.ssh && cat >> /home/pixora/.ssh/authorized_keys && chown -R pixora:pixora /home/pixora/.ssh && chmod 700 /home/pixora/.ssh && chmod 600 /home/pixora/.ssh/authorized_keys"
```

Проверка (на своём компьютере):

```powershell
ssh pixora@203.0.113.10
```

Должно пустить **без пароля**. Если пустило — можно отключать вход по паролю.

### Отключить вход по паролю и под root

На сервере:

```bash
sudo nano /etc/ssh/sshd_config
```

Найти/изменить (строки могут быть закомментированы — уберите `#`):

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Сохранить: `Ctrl+O`, Enter, `Ctrl+X`.

```bash
sudo systemctl restart ssh
```

> **Важно:** не закрывайте текущую сессию, пока не проверите вход в новом окне. Иначе можно остаться без доступа.

---

## 4. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

На вопрос ответить `y`. Проверка:

```bash
sudo ufw status
```

Должно быть:

```
Status: active
OpenSSH     ALLOW
80/tcp      ALLOW
443/tcp     ALLOW
```

---

## 5. Установить Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/nodesource_setup.sh
sudo bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
```

Проверка:

```bash
node -v    # v22.x.x
npm -v     # 10.x.x
```

---

## 6. Загрузить проект

```bash
sudo mkdir -p /var/www
sudo chown pixora:pixora /var/www
cd /var/www
git clone https://github.com/ВАШ-ЛОГИН/ВАШ-РЕПО.git pixora
cd pixora
```

Если репозиторий приватный, GitHub попросит логин и **Personal Access Token** вместо пароля (см. [07-github.md](07-github.md)).

Проверьте, что вы в корне проекта:

```bash
ls
# client  deploy  docs  package.json  README.md  server
```

Установить зависимости и собрать фронтенд:

```bash
npm install --no-audit --no-fund
npm run build
```

После сборки появится `client/dist/index.html`:

```bash
ls client/dist
```

---

## 7. Настроить `server/.env`

```bash
cd /var/www/pixora/server
cp .env.example .env
chmod 600 .env
nano .env
```

Заполнить (пример):

```env
PORT=4000
NODE_ENV=production

JWT_SECRET=<вставьте вывод openssl rand -hex 32>
JWT_EXPIRES_IN=7d

CLIENT_ORIGIN=https://example.com,https://www.example.com
TRUST_PROXY=true
SERVE_STATIC=true

TELEGRAM_BOT_TOKEN=123456789:AAH...
TELEGRAM_CHAT_ID=123456789
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
- `CLIENT_ORIGIN` — ваш будущий домен. Пока домена нет, можно указать `http://203.0.113.10` (и потом поменять).
- `TRUST_PROXY=true` — чтобы в Telegram попадал реальный IP посетителя, а не `127.0.0.1`.
- `chmod 600` — файл читает только владелец.

Сохранить и проверить, что `.env` не попал в git:

```bash
cd /var/www/pixora
git status
```

`.env` в списке быть не должно (он в `.gitignore`).

---

## 8. Сервис systemd

Скопировать unit из проекта:

```bash
cd /var/www/pixora
sudo cp deploy/pixora-api.service /etc/systemd/system/pixora-api.service
sudo nano /etc/systemd/system/pixora-api.service
```

Проверьте, что пути совпадают с вашими (`/var/www/pixora`), и что `User=pixora` — существующий пользователь.

Запустить:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pixora-api
sudo systemctl status pixora-api --no-pager
```

Ожидаемо: `Active: active (running)`.

Если статус `failed` — смотрите логи:

```bash
sudo journalctl -u pixora-api -n 50 --no-pager
```

Проверить API:

```bash
curl http://127.0.0.1:4000/api/health
# {"ok":true,"uptime":3,"env":"production"}
```

Если ответ есть — Node работает. Дальше nginx.

---

## 9. nginx

Установить:

```bash
sudo apt install -y nginx
```

Скопировать конфиг:

```bash
cd /var/www/pixora
sudo cp deploy/nginx.conf /etc/nginx/sites-available/pixora
sudo nano /etc/nginx/sites-available/pixora
```

В строке `server_name` заменить `example.com www.example.com` на ваш домен. **Пока домена нет** можно поставить:

```nginx
server_name _;
```

— тогда nginx будет отвечать на любой Host, и сайт откроется по IP.

Включить сайт и убрать дефолтный:

```bash
sudo ln -sf /etc/nginx/sites-available/pixora /etc/nginx/sites-enabled/pixora
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

`nginx -t` должен сказать `syntax is ok` и `test is successful`.

---

## 10. Проверка по IP

Откройте в браузере:

```
http://203.0.113.10/login
```

Должна открыться страница входа Pixora. Проверьте регистрацию — в Telegram придёт сообщение, а IP в нём будет **ваш реальный**, а не `127.0.0.1`.

Если nginx отдаёт 502 — Node не запущен или слушает другой порт:

```bash
sudo systemctl status pixora-api
curl http://127.0.0.1:4000/api/health
```

Если 404 на `/login` — nginx не проксирует, а ищет файл. Проверьте, что в конфиге есть `location / { proxy_pass http://127.0.0.1:4000; }`, и что сайт включён.

---

## 11. Обновление проекта

После изменений в GitHub — на сервере:

```bash
cd /var/www/pixora
bash deploy/deploy.sh
```

Скрипт делает: `git pull` → `npm install` → `npm run build` → `systemctl restart` → проверка `/api/health`.

Если скрипт просит пароль sudo — это нормально, он перезапускает сервис.

---

## 12. Бэкап данных

Пользователи лежат в `server/data/users.json`. Простой ежедневный бэкап:

```bash
sudo mkdir -p /var/backups/pixora
sudo crontab -e
```

Добавить строку (в конце файла):

```cron
0 4 * * * tar -czf /var/backups/pixora/users-$(date +\%F).tgz -C /var/www/pixora/server/data users.json
```

Сохранить. Проверить:

```bash
sudo ls -la /var/backups/pixora
```

Раз в месяц можно удалять старые архивы:

```cron
0 5 1 * * find /var/backups/pixora -name 'users-*.tgz' -mtime +30 -delete
```

Скачать бэкап к себе:

```powershell
scp pixora@203.0.113.10:/var/backups/pixora/users-2026-11-26.tgz .
```

---

## 13. Чек-лист после деплоя

- [ ] `sudo systemctl status pixora-api` — `active (running)`
- [ ] `curl http://127.0.0.1:4000/api/health` — `{"ok":true,...}`
- [ ] `sudo nginx -t` — `test is successful`
- [ ] `http://IP/login` открывается
- [ ] Регистрация работает, в Telegram приходит сообщение с реальным IP
- [ ] `server/.env` имеет права `600` и не виден в `git status`
- [ ] `sudo ufw status` — активен, открыты только 22/80/443
- [ ] В `.env` стоит `NODE_ENV=production` и длинный `JWT_SECRET`

Дальше — домен и HTTPS: [03-domain-https.md](03-domain-https.md).
