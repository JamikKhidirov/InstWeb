import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { createUser, findByLogin, findById, isTaken, publicUser } from "../store.js";
import { notifyAuthEvent } from "../telegram.js";

export const authRouter = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const USERNAME_RE = /^[a-z0-9._]{3,30}$/i;

// Валидный хеш-заглушка: сравнение выполняется даже для несуществующего
// пользователя, чтобы время ответа не выдавало наличие аккаунта.
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", 12);

function signToken(user) {
  return jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || "";
}

function fail(res, status, error) {
  return res.status(status).json({ error });
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!EMAIL_RE.test(email)) return fail(res, 400, "Введите корректный email.");
    if (!USERNAME_RE.test(username))
      return fail(res, 400, "Логин: 3–30 символов, латиница, цифры, точка и _.");
    if (password.length < 8) return fail(res, 400, "Пароль должен быть не короче 8 символов.");
    if (password.length > 200) return fail(res, 400, "Слишком длинный пароль.");
    if (isTaken(email, username))
      return fail(res, 409, "Такой email или логин уже зарегистрирован.");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({ email, username, passwordHash });

    // Пароль никуда не передаётся: в Telegram уходят только метаданные.
    notifyAuthEvent({
      event: "register",
      user,
      ip: clientIp(req),
      userAgent: req.get("user-agent") || "",
    }).catch(() => {});

    return res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const login = String(req.body?.login || "").trim();
    const password = String(req.body?.password || "");

    if (!login || !password) return fail(res, 400, "Заполните оба поля.");

    const user = findByLogin(login);
    const ok = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);

    if (!user || !ok) return fail(res, 401, "Неверный логин или пароль.");

    notifyAuthEvent({
      event: "login",
      user,
      ip: clientIp(req),
      userAgent: req.get("user-agent") || "",
    }).catch(() => {});

    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

export function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return fail(res, 401, "Требуется авторизация.");
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = findById(payload.sub);
    if (!user) return fail(res, 401, "Сессия недействительна.");
    req.user = user;
    next();
  } catch {
    return fail(res, 401, "Сессия истекла, войдите заново.");
  }
}

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

authRouter.post("/logout", (_req, res) => {
  // JWT хранится на клиенте — достаточно удалить его там.
  res.json({ ok: true });
});
