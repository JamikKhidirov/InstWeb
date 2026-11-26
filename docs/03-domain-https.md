# 03. Домен и HTTPS

<p align="center"><img src="assets/divider-animated.svg" alt="" width="100%"></p>

Итог этого файла: сайт открывается по `https://ваш-домен.ru/login`, сертификат продлевается сам.

Предполагается, что VPS уже настроен по [02-vps-deploy.md](02-vps-deploy.md) и сайт открывается по IP.

---

## 1. Купить домен

Регистраторы: REG.RU, Timeweb, Beget, Namecheap, Cloudflare Registrar, Porkbun.

Что важно:

- Домен **свой**, не похожий на чужой бренд (не `instagram-login.ru` и т. п.).
- После покупки домен появится в панели регистратора, а NS-серверы обычно уже настроены на регистратора.
- Изменения DNS применяются от 5 минут до 24 часов (обычно 10–30 минут).

В примерах ниже домен — `example.com`, IP сервера — `203.0.113.10`. Замените на свои.

---

## 2. DNS-записи

В панели регистратора (раздел «DNS» / «Управление зоной») добавьте:

| Тип | Имя (Host) | Значение | TTL |
|---|---|---|---|
| `A` | `@` | `203.0.113.10` | 300 |
| `A` | `www` | `203.0.113.10` | 300 |

- `@` — это сам домен (`example.com`).
- `www` — поддомен (`www.example.com`).
- TTL 300 секунд — чтобы правки применялись быстро. Позже можно поставить 3600.

Если провайдер даёт IPv6 — можно добавить `AAAA` с адресом сервера, но это необязательно.

### Проверка, что DNS применился

```bash
nslookup example.com 1.1.1.1
```

Ожидаемо:

```
Name:    example.com
Address: 203.0.113.10
```

Или:

```bash
dig +short example.com
dig +short www.example.com
```

Оба должны вернуть IP сервера. Если пусто — подождите и проверьте снова. Онлайн-сервис: https://dnschecker.org.

> Пока DNS не применился, certbot не сможет выпустить сертификат. Это главная причина ошибок на следующем шаге.

---

## 3. Обновить `server_name` в nginx

На сервере:

```bash
sudo nano /etc/nginx/sites-available/pixora
```

Заменить:

```nginx
server_name _;
```

на:

```nginx
server_name example.com www.example.com;
```

Проверить и перезагрузить:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Теперь `http://example.com/login` должен открываться.

Если открывается, а по IP — нет, это нормально: nginx теперь отвечает только на указанные Host.

---

## 4. Выпустить сертификат Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Запустить:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Что спросит:

1. **Email** — для уведомлений об истечении (можно указать свой).
2. **Согласие с условиями** — `A` (Agree).
3. **Рассылка** — `N` или `Y` на ваш вкус.
4. **Redirect HTTP → HTTPS** — выберите **2 (Redirect)**, чтобы весь трафик шёл по HTTPS.

Certbot сам:

- получит сертификат;
- добавит в конфиг nginx `listen 443 ssl` и пути к файлам;
- настроит редирект с 80 на 443;
- перезагрузит nginx.

Проверка:

```bash
curl -I https://example.com
```

Ожидаемо: `HTTP/2 200` и заголовок `strict-transport-security` (если включите HSTS, см. ниже).

В браузере — замок и `https://`.

---

## 5. Автопродление

Сертификат Let's Encrypt живёт 90 дней. Пакет certbot ставит systemd-таймер, который продлевает его автоматически.

Проверить, что таймер есть:

```bash
systemctl list-timers | grep certbot
```

Проверить, что продление сработает (без реального продления):

```bash
sudo certbot renew --dry-run
```

Если в конце `Congratulations, all simulated renewals succeeded` — всё хорошо.

Ручное продление (если понадобится):

```bash
sudo certbot renew
sudo systemctl reload nginx
```

---

## 6. HSTS (необязательно, но полезно)

HSTS заставляет браузер всегда открывать сайт по HTTPS. Добавьте в `server`-блок для 443 (certbot уже создал его) строку:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

Затем:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

> Включайте HSTS только когда уверены, что HTTPS работает стабильно. Браузер запоминает это на год.

---

## 7. Обновить `CLIENT_ORIGIN`

В `server/.env`:

```env
CLIENT_ORIGIN=https://example.com,https://www.example.com
```

Перезапустить:

```bash
sudo systemctl restart pixora-api
```

> Если фронтенд и API на одном домене (как у нас), CORS вообще не участвует. Переменная нужна на случай отдельных origin и для порядка.

---

## 8. Проверка «как у друга»

Отправить другу ссылку:

```
https://example.com/login
```

Что он должен увидеть:

1. Замок в адресной строке, `https://`.
2. Страницу входа Pixora.
3. Регистрацию → вас перекидывает в профиль.
4. Вам в Telegram — сообщение с его IP и браузером.

Проверить сертификат и конфигурацию: https://www.ssllabs.com/ssltest/ (оценка A или A+ — норма).

---

## 9. Если используете Cloudflare

Cloudflare может проксировать трафик (оранжевая тучка). Два варианта:

**Вариант А — проще (рекомендуется для старта):**

1. В DNS-записях Cloudflare переключить тучку в **DNS only** (серая).
2. Выпустить сертификат через certbot как обычно.
3. При желании потом включить прокси.

**Вариант Б — с прокси:**

1. Включить оранжевую тучку.
2. SSL/TLS → режим **Full (strict)** (не «Flexible»!).
3. Сертификат на сервере всё равно нужен: либо Let's Encrypt (порт 80 должен быть доступен для проверки), либо Cloudflare Origin Certificate.

Если после включения прокси появляется `522 Connection timed out` — сервер недоступен по 80/443 (firewall или nginx).

---

## 10. Частые ошибки

| Ошибка | Причина | Решение |
|---|---|---|
| `DNS problem: NXDOMAIN` | домен ещё не указывает на сервер | проверить `dig +short`, подождать propagation |
| `Timeout during connect (port 80)` | закрыт 80 порт или nginx не слушает | `sudo ufw allow 80`, `sudo systemctl status nginx` |
| `unauthorized` / `challenge failed` | неверный `server_name`, Cloudflare proxy | проверить конфиг, выключить прокси на время выпуска |
| Браузер: `NET::ERR_CERT_AUTHORITY_INVALID` | сертификат не выпущен/не применён | `sudo certbot --nginx ...`, перезагрузить nginx |
| `www` не открывается | нет A-записи `www` или его нет в сертификате | добавить запись и перевыпустить с `-d www.example.com` |
| После смены DNS сайт недоступен | старый IP в кэше | подождать TTL, проверить с другого устройства/сети |
| `too many certificates already issued` | лимит Let's Encrypt (5/неделю на домен) | подождать, использовать staging для тестов: `--staging` |

---

## 11. Чек-лист

- [ ] `dig +short example.com` → IP сервера
- [ ] `dig +short www.example.com` → IP сервера
- [ ] `server_name` в nginx содержит оба имени
- [ ] `sudo certbot --nginx -d example.com -d www.example.com` прошёл успешно
- [ ] `curl -I http://example.com` → `301` на `https://`
- [ ] `curl -I https://example.com` → `200`
- [ ] `sudo certbot renew --dry-run` → успех
- [ ] `CLIENT_ORIGIN` в `.env` содержит `https://...`
- [ ] Ссылка другу отправлена и проверена
