# 01. Локальный запуск

<p align="center"><img src="assets/divider-animated.svg" alt="" width="100%"></p>

Пошагово, с нуля, для Windows, macOS и Linux.

---

## 1. Установить Node.js

Нужен **Node.js 20 или новее**. Рекомендуется LTS-версия 22.

### Windows

Вариант А — установщик:

1. Открыть https://nodejs.org → кнопка **LTS**.
2. Скачать `.msi`, запустить, везде «Далее».
3. **Закрыть и заново открыть** PowerShell (важно — иначе `node` не найдётся).

Вариант Б — winget:

```powershell
winget install OpenJS.NodeJS.LTS
```

Проверка:

```powershell
node -v
npm -v
```

Должно вывести что-то вроде `v22.12.0` и `10.9.0`.

> Если PowerShell пишет «`node` не является внутренней или внешней командой» — перезапустите терминал. Если не помогло, проверьте, что `C:\Program Files\nodejs` есть в `PATH`.

### macOS

```bash
brew install node
```

или установщик с nodejs.org.

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Проверка везде одна:

```bash
node -v && npm -v
```

---

## 2. Получить проект

Если проект уже лежит папкой — перейдите в неё. Если он в GitHub:

```bash
git clone https://github.com/ВАШ-ЛОГИН/ВАШ-РЕПОЗИТОРИЙ.git InstagramWeb
cd InstagramWeb
```

> Все команды ниже выполняются **из корня проекта** — там, где лежит файл `package.json` с `"workspaces"`.

---

## 3. Установить зависимости

```bash
npm install
```

Что произойдёт: npm поставит пакеты для `client/` и `server/` сразу (workspaces). Появится папка `node_modules` в корне, `client/node_modules` может не быть — это нормально.

Если npm ругается на старую версию Node — обновите Node (шаг 1).

---

## 4. Настроить `server/.env`

Скопировать шаблон:

**Windows PowerShell:**

```powershell
Copy-Item server\.env.example server\.env
```

**macOS / Linux:**

```bash
cp server/.env.example server/.env
```

Открыть `server/.env` в редакторе и заполнить.

### Обязательный минимум

```env
JWT_SECRET=<случайная строка>
TELEGRAM_BOT_TOKEN=<токен бота>
TELEGRAM_CHAT_ID=<id чата>
```

Сгенерировать `JWT_SECRET`:

```bash
# macOS / Linux / Git Bash
openssl rand -hex 32
```

```powershell
# Windows PowerShell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Вставить результат в `JWT_SECRET=`.

### Telegram

Полное руководство: [04-telegram.md](04-telegram.md). Коротко:

1. В Telegram найти **@BotFather** → `/newbot` → получить токен вида `123456789:AAH...`.
2. Написать своему боту любое сообщение.
3. Открыть в браузере `https://api.telegram.org/bot<ТОКЕН>/getUpdates` и найти `"chat":{"id":123456789}`.
4. Вписать токен и id в `.env`.

Если Telegram пока не нужен, поставьте `TELEGRAM_ENABLED=false` — сайт будет работать без уведомлений.

---

## 5. Запустить

```bash
npm run dev
```

Вывод должен быть примерно таким:

```
[api] Pixora API слушает http://localhost:4000
[api] режим: development, доверять прокси: true
  VITE v5.4.11  ready in 300 ms
  ➜  Local:   http://localhost:5173/
```

Открыть:

| URL | Что там |
|---|---|
| http://localhost:5173/login | страница входа |
| http://localhost:5173/register | регистрация |
| http://localhost:4000/api/health | `{"ok":true,...}` |

Проверка сценария:

1. Открыть `/register`, создать аккаунт (email вида `test@mail.ru`, пароль от 8 символов).
2. Вас перебросит на `/`, в шапке — ваш `@username`.
3. В Telegram приходит сообщение о регистрации.
4. Нажать «Выйти», войти тем же логином/паролем — приходит сообщение о входе.
5. Ввести неверный пароль — появится «Неверный логин или пароль», сообщения нет.

---

## 6. Проверить production-сборку

```bash
npm run build
npm start
```

Открыть **http://localhost:4000/login** — Node отдаст собранный фронтенд и API с одного порта, без Vite.

Остановить: `Ctrl + C`.

> На Windows `npm start` использует `.env` с `NODE_ENV=development` — это нормально для локальной проверки. На сервере ставим `production`.

---

## 7. Полезные команды

```bash
# только API (с автоперезапуском)
npm run dev:api

# только фронтенд
npm run dev:web

# пересобрать фронтенд
npm run build

# посмотреть, кто занял порт 4000 (Windows)
Get-NetTCPConnection -LocalPort 4000 | Select-Object OwningProcess
```

---

## 8. Частые проблемы именно на этом шаге

| Симптом | Причина | Решение |
|---|---|---|
| `node` не найден | терминал открыт до установки | закрыть и открыть PowerShell заново |
| `npm install` падает с `EACCES` | нет прав на папку | не запускать от администратора в `C:\Windows`; проект должен лежать в своей папке |
| `EADDRINUSE :4000` | порт занят старым процессом | `Get-NetTCPConnection -LocalPort 4000` → `Stop-Process -Id <PID>` (Windows) или `lsof -i :4000` / `kill <PID>` |
| Страница открылась, но «Нет связи с сервером» | API не запущен или упал | смотреть терминал `npm run dev`; проверить `http://localhost:4000/api/health` |
| Telegram молчит | неверный токен/chat_id или `TELEGRAM_ENABLED=false` | [04-telegram.md](04-telegram.md), раздел «Диагностика» |
| В логах кракозябры (Windows) | кодировка консоли | `chcp 65001` перед запуском |
| Пароль не подходит после регистрации | вводили другой email/логин | вход принимает и email, и username; регистр не важен |

Дальше: [02-vps-deploy.md](02-vps-deploy.md) — как выложить это на сервер.
