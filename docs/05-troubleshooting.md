# 05. Диагностика: симптом → причина → решение

Сначала определите, где проблема:

```bash
# 1. Жив ли Node
curl http://127.0.0.1:4000/api/health

# 2. Жив ли nginx
sudo nginx -t
sudo systemctl status nginx --no-pager

# 3. Логи приложения
sudo journalctl -u pixora-api -n 80 --no-pager

# 4. Логи nginx
sudo tail -n 50 /var/log/nginx/error.log
```

---

## Сайт не открывается

| Симптом | Причина | Решение |
|---|---|---|
| Браузер: «сайт недоступен», таймаут | сервер выключен, firewall, неверный IP | проверить IP, `ping`, панель провайдера, `sudo ufw status` |
| `502 Bad Gateway` | Node не запущен / упал / другой порт | `sudo systemctl status pixora-api`, `sudo journalctl -u pixora-api -n 50` |
| `503 Service Unavailable` | nginx не может достучаться до upstream | то же + `curl http://127.0.0.1:4000/api/health` |
| `404 Not Found` на `/login` | nginx ищет файл вместо проксирования | в конфиге должен быть `location / { proxy_pass http://127.0.0.1:4000; }`; `sudo nginx -t && sudo systemctl reload nginx` |
| `403 Forbidden` | нет прав на файлы / index | `ls -la /var/www/pixora`, владелец должен быть `pixora` |
| Пустая белая страница | не собрат фронтенд или ошибка JS | `npm run build`, открыть консоль браузера (F12) |
| `NET::ERR_CONNECTION_REFUSED` | порт закрыт или сервис не слушает | `sudo ss -tlnp \| grep 4000` |
| Открывается дефолтная страница nginx | включён `default` сайт | `sudo rm /etc/nginx/sites-enabled/default`, reload |

---

## 502 после перезагрузки сервера

Сервис не включён в автозапуск:

```bash
sudo systemctl enable pixora-api
sudo systemctl start pixora-api
```

Проверить: `systemctl is-enabled pixora-api` → `enabled`.

---

## Ошибки Node при старте

Смотреть:

```bash
sudo journalctl -u pixora-api -n 100 --no-pager
```

| Сообщение | Причина | Решение |
|---|---|---|
| `Cannot find module 'express'` | не установлены зависимости | `cd /var/www/pixora && npm install` |
| `EADDRINUSE` | порт 4000 занят | `sudo ss -tlnp \| grep 4000`, остановить лишний процесс |
| `EACCES` на `data/users.json` | нет прав на папку данных | `sudo chown -R pixora:pixora /var/www/pixora/server/data` |
| `JWT_SECRET не задан` (warning) | пустой `.env` | заполнить `JWT_SECRET` |
| `ERR_MODULE_NOT_FOUND` | запуск не из `server/` | проверить `WorkingDirectory` в systemd |
| `SyntaxError: Unexpected token` | повреждён файл / старая версия Node | `node -v` ≥ 20, переустановить зависимости |

---

## Не работает вход/регистрация

| Симптом | Причина | Решение |
|---|---|---|
| «Нет связи с сервером» | API недоступен или CORS | открыть `http://localhost:4000/api/health`; проверить `CLIENT_ORIGIN` |
| CORS-ошибка в консоли | origin не в списке | добавить точный origin (со схемой и портом) в `CLIENT_ORIGIN`, перезапустить |
| «Неверный логин или пароль» при верных данных | другой регистр/пробел, аккаунт не создан | логин и email нечувствительны к регистру; проверить `server/data/users.json` |
| «Такой email или логин уже зарегистрирован» | запись уже есть | войти или использовать другие данные |
| «Пароль должен быть не короче 8 символов» | короткий пароль | от 8 символов |
| «Слишком много попыток» (429) | сработал rate limit (30/15 мин) | подождать 15 минут; для тестов временно увеличить лимит в `server/src/index.js` |
| После входа сразу выкидывает на `/login` | JWT не сохраняется / истёк / секрет сменили | проверить localStorage, `JWT_SECRET` не менялся; войти заново |
| «Сессия истекла» | токен старше 7 дней или секрет изменён | войти заново |

Проверить API вручную:

```bash
curl -s http://127.0.0.1:4000/api/health
curl -s -X POST http://127.0.0.1:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"test@mail.ru","password":"12345678"}'
```

---

## Telegram не присылает сообщения

Полная таблица — в [04-telegram.md](04-telegram.md), раздел 7. Кратко:

```bash
# 1. Настройки видны процессу?
sudo systemctl show pixora-api -p Environment
# 2. В логах есть ошибки Telegram?
sudo journalctl -u pixora-api -n 100 --no-pager | grep -i telegram
# 3. Ручная отправка работает?
curl -s -X POST "https://api.telegram.org/bot<ТОКЕН>/sendMessage" -d chat_id=<ID> -d text=test
```

- `401` — токен неверный.
- `400 chat not found` — неверный `chat_id` или боту не писали.
- `403` — бот заблокирован или не добавлен в чат.
- Пусто — `TELEGRAM_ENABLED=false`, либо `.env` не подхватился (перезапустить сервис).

---

## Домен и HTTPS

| Симптом | Причина | Решение |
|---|---|---|
| Домен не открывается, IP открывается | DNS ещё не применился | `dig +short example.com`, подождать TTL |
| `NXDOMAIN` | нет A-записи | добавить в панели регистратора |
| Сертификат не выпускается | порт 80 закрыт / DNS неверный | `sudo ufw allow 80`, проверить `dig` |
| `too many certificates` | лимит Let's Encrypt | подождать неделю или тестировать с `--staging` |
| `522` (Cloudflare) | сервер недоступен | проверить nginx/firewall, режим SSL Full (strict) |
| `ERR_CERT_DATE_INVALID` | сертификат истёк | `sudo certbot renew`, reload nginx |
| `www` без сертификата | домен не включён в выпуск | `sudo certbot --nginx -d example.com -d www.example.com` |

---

## Обновление не применилось

```bash
cd /var/www/pixora
git log -1 --oneline        # та ли версия?
git status                  # нет ли локальных правок
npm run build               # пересобрался ли dist
ls -la client/dist          # свежие ли файлы
sudo systemctl restart pixora-api
```

Если `git pull` ругается на локальные изменения:

```bash
git stash        # спрятать
git pull
git stash pop    # вернуть (если нужно)
```

Или сбросить жёстко (потеряете локальные правки):

```bash
git reset --hard origin/main
```

Кэш браузера: `Ctrl + F5`. Кэш Cloudflare: очистить в панели.

---

## Windows-специфика (локально)

| Проблема | Решение |
|---|---|
| `NODE_ENV=production` не работает | в PowerShell: `$env:NODE_ENV="production"; npm start` |
| Кракозябры в консоли | `chcp 65001` |
| `npm` не найден | перезапустить PowerShell после установки Node |
| Порт занят | `Get-NetTCPConnection -LocalPort 4000 \| Select-Object OwningProcess` → `Stop-Process -Id <PID>` |
| Скрипты `cp`/`openssl` не работают | использовать `Copy-Item`, `node -e "..."` или Git Bash |
| Антивирус блокирует порт | разрешить Node.js в брандмауэре Windows |

---

## Как собрать информацию для помощи

Если просите кого-то помочь, приложите:

```bash
node -v
npm -v
cat /etc/os-release | head -3
sudo systemctl status pixora-api --no-pager
sudo journalctl -u pixora-api -n 50 --no-pager
sudo tail -n 30 /var/log/nginx/error.log
curl -I http://127.0.0.1:4000/api/health
```

**Не прикладывайте** `.env`, токен бота, пароли и содержимое `users.json`.
