# 07. Публикация в GitHub

<p align="center"><img src="assets/divider-animated.svg" alt="" width="100%"></p>

Цель: положить проект в репозиторий так, чтобы **не утащить с собой секреты** и чтобы CI собирал фронтенд.

---

## 1. Что не должно попасть в репозиторий

В проекте уже есть `.gitignore`, который исключает:

```
node_modules/
dist/
.env
server/data/*.json
*.log
```

Проверьте себя:

- `server/.env` — токен бота, JWT-секрет.
- `server/data/users.json` — реальные email и хеши паролей.
- `client/dist` — сборка (собирается заново).
- `node_modules` — ставятся заново.

Если сомневаетесь — перед первым коммитом выполните:

```bash
git status --short
```

В списке не должно быть `.env` и `users.json`.

---

## 2. Инициализировать git

В корне проекта:

```bash
git init
git add .
git status
```

Проверьте список файлов. Затем:

```bash
git -c user.name="Ваше Имя" -c user.email="you@example.com" commit -m "Pixora: страница входа на React + Express + Telegram"
```

Чтобы не указывать имя каждый раз:

```bash
git config user.name "Ваше Имя"
git config user.email "you@example.com"
```

Переименовать ветку в `main`:

```bash
git branch -M main
```

---

## 3. Создать репозиторий на GitHub

1. Открыть https://github.com/new.
2. **Repository name**: `pixora` (или любое).
3. **Public** или **Private** — на ваше усмотрение. Секретов в коде нет, но приватный безопаснее.
4. **Не** ставьте галочки «Add a README», «Add .gitignore», «Choose a license» — они уже есть локально, иначе будет конфликт.
5. **Create repository**.

---

## 4. Загрузить код

### Вариант А — HTTPS + токен (проще)

```bash
git remote add origin https://github.com/ВАШ-ЛОГИН/pixora.git
git push -u origin main
```

GitHub попросит логин и пароль. **Пароль от аккаунта не подойдёт** — нужен Personal Access Token:

1. https://github.com/settings/tokens → **Generate new token (classic)**.
2. Note: `pixora-push`, Expiration: 90 дней.
3. Scope: только `repo`.
4. Сгенерировать и скопировать токен (`ghp_...`).
5. В качестве пароля вставить токен.

Токен хранится в диспетчере учётных данных Windows. Чтобы не вводить каждый раз, можно использовать `git config credential.helper manager`.

### Вариант Б — SSH

```bash
ssh-keygen -t ed25519 -C "github-pixora"      # если ключа ещё нет
cat ~/.ssh/id_ed25519.pub                      # Windows: type $env:USERPROFILE\.ssh\id_ed25519.pub
```

Скопировать вывод → GitHub → **Settings → SSH and GPG keys → New SSH key** → вставить.

```bash
ssh -T git@github.com                          # проверить
git remote add origin git@github.com:ВАШ-ЛОГИН/pixora.git
git push -u origin main
```

---

## 5. GitHub Actions (уже настроено)

Файл `.github/workflows/ci.yml` при каждом пуше:

1. ставит Node 22;
2. выполняет `npm install`;
3. собирает клиент (`npm run build`);
4. проверяет синтаксис серверного файла.

Смотреть: вкладка **Actions** в репозитории. Зелёная галочка — всё собралось.

> CI **не** деплоит на сервер. Деплой — вручную по [02-vps-deploy.md](02-vps-deploy.md) или через `deploy/deploy.sh`.

---

## 6. GitHub Pages не подойдёт

Важно понимать: **GitHub Pages, Netlify и Vercel (static) не смогут запустить этот проект целиком**.

Причина: нужен Node-сервер, который:

- принимает `/api/auth/*`,
- проверяет пароли через bcrypt,
- хранит пользователей,
- отправляет запросы в Telegram Bot API.

Статический хостинг умеет отдавать только файлы. Поэтому для полноценной работы нужен **VPS** (или другой хостинг с Node). Инструкция: [02-vps-deploy.md](02-vps-deploy.md).

Можно выложить только фронтенд на Vercel, а API — на VPS, но это лишняя сложность: проще всё на одном сервере.

---

## 7. Если `.env` уже попал в коммит

Даже если вы удалили файл новым коммитом — он остаётся в истории. Порядок действий:

1. **Немедленно перевыпустить секреты:**
   - Telegram: BotFather → `/revoke`.
   - `JWT_SECRET`: новый `openssl rand -hex 32` (все сессии сбросятся).
2. Удалить файл из истории. Установить `git-filter-repo` (или использовать BFG):

```bash
pip install git-filter-repo
git filter-repo --path server/.env --invert-paths
git push --force --all
git push --force --tags
```

3. Если репозиторий форкали/клонировали — попросить удалить и клонировать заново.
4. Проверить, что в истории пусто:

```bash
git log --all --full-history -- server/.env
```

5. Включить **Secret scanning** в настройках репозитория (Settings → Code security).

> `git push --force` перезаписывает историю. Если с репозиторием работают другие — предупредите их.

---

## 8. Как дать другу ссылку

Другу нужен **работающий сайт**, а не репозиторий. После деплоя на VPS и привязки домена ([02](02-vps-deploy.md), [03](03-domain-https.md)) отправьте:

```
Привет! Посмотри, пожалуйста: https://example.com/login
Зарегистрируйся, залогинься, выйди и зайди снова — проверь, что всё работает.
```

Что проверить другу:

1. Открывается по HTTPS, замок в адресной строке.
2. Форма выглядит как задумано, на телефоне тоже.
3. Регистрация → профиль → выход → вход.
4. Неверный пароль → понятная ошибка.
5. Обновление страницы `/login` (F5) не даёт 404.
6. Ссылка `https://example.com/` ведёт в профиль или на вход.

---

## 9. Обновление репозитория

```bash
git add .
git commit -m "Описание изменений"
git push
```

На сервере:

```bash
cd /var/www/pixora
bash deploy/deploy.sh
```

---

## 10. Чек-лист публикации

- [ ] `git status` не показывает `.env`, `users.json`, `node_modules`, `dist`
- [ ] `.gitignore` закоммичен
- [ ] В коде нет захардкоженных токенов (`grep -r "AAH" .` → пусто)
- [ ] README содержит инструкцию запуска
- [ ] Actions зелёные
- [ ] Репозиторий не содержит историю с секретами
- [ ] Сайт задеплоен на VPS, HTTPS работает
- [ ] Друг получил ссылку и проверил
