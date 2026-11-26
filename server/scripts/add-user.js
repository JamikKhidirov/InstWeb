import bcrypt from "bcryptjs";
import { config } from "../src/config.js";
import { initStore, createUser, isTaken } from "../src/store.js";

/**
 * Создание демо-аккаунта из командной строки.
 *
 * Использование (из корня проекта):
 *   npm run user:add -- demo@example.com demo_user "Пароль12345"
 *
 * Пароль передаётся только в аргументах локального процесса,
 * хешируется bcrypt и в открытом виде не сохраняется.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const USERNAME_RE = /^[a-z0-9._]{3,30}$/i;

const [, , emailArg, usernameArg, passwordArg] = process.argv;

function usage() {
  console.error(
    [
      "Использование:",
      '  npm run user:add -- demo@example.com demo_user "Пароль12345"',
      "",
      "Требования:",
      "  email    — корректный адрес;",
      "  username — 3–30 символов: латиница, цифры, точка, _;",
      "  password — не короче 8 символов.",
    ].join("\n")
  );
}

if (!emailArg || !usernameArg || !passwordArg) {
  usage();
  process.exit(1);
}

const email = emailArg.trim();
const username = usernameArg.trim();
const password = passwordArg;

if (!EMAIL_RE.test(email)) {
  console.error("Ошибка: некорректный email.");
  process.exit(1);
}
if (!USERNAME_RE.test(username)) {
  console.error("Ошибка: логин — 3–30 символов, латиница, цифры, точка и _.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("Ошибка: пароль должен быть не короче 8 символов.");
  process.exit(1);
}

await initStore(config.dataDir);

if (isTaken(email, username)) {
  console.error("Ошибка: такой email или логин уже существует.");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
const user = await createUser({ email, username, passwordHash });

console.log(`Готово: @${user.username} <${user.email}>`);
console.log("Теперь можно войти на странице /login.");
