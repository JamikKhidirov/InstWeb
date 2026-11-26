import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import fs from "node:fs";
import path from "node:path";

import { config, assertConfig } from "./config.js";
import { initStore } from "./store.js";
import { authRouter } from "./routes/auth.js";
import { eventsRouter } from "./routes/events.js";

assertConfig();

const app = express();

// За nginx: доверяем первому прокси, чтобы req.ip был реальным IP клиента.
app.set("trust proxy", config.trustProxy ? 1 : false);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false, // статику отдаём отдельно; CSP настраивается в nginx при желании
  })
);

// CORS нужен только для API. Статику (JS/CSS с атрибутом crossorigin)
// браузер запрашивает с Origin, и глобальный CORS её бы блокировал.
app.use(
  "/api",
  cors({
    origin(origin, callback) {
      // Запросы без Origin (curl, мобильные приложения) пропускаем.
      if (!origin) return callback(null, true);
      if (config.clientOrigins.includes(origin)) return callback(null, true);
      // Не бросаем ошибку: просто не отдаём CORS-заголовки,
      // браузер сам заблокирует межсайтовый ответ.
      return callback(null, false);
    },
  })
);

app.use(express.json({ limit: "16kb" }));

// Простой лог запросов: тела запросов (и пароли) не логируются.
app.use((req, res, next) => {
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms ip=${req.ip}`
    );
  });
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Слишком много попыток. Попробуйте через 15 минут." },
});

// События интерфейса: визиты и клики. Лимит выше, чем у логина,
// потому что за одну сессию их может быть несколько.
const eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Слишком много событий. Подождите минуту." },
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, uptime: Math.round(process.uptime()), env: config.nodeEnv });
});

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/events", eventsLimiter, eventsRouter);

// 404 для неизвестных API-маршрутов
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Метод не найден." });
});

// Отдача собранного фронтенда (удобно для деплоя «одним сервисом»)
const indexHtml = path.join(config.clientDist, "index.html");
if (config.serveStatic && fs.existsSync(indexHtml)) {
  app.use(express.static(config.clientDist, { index: false, maxAge: "1h" }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(indexHtml);
  });
} else if (config.isProd) {
  console.warn(
    `[static] ${indexHtml} не найден. Соберите фронтенд: npm run build ` +
      "(или отдавайте статику через nginx)."
  );
}

// Обработчик ошибок
app.use((err, _req, res, _next) => {
  console.error("[error]", err.message);
  if (res.headersSent) return;
  const status = err.status || 500;
  res.status(status).json({ error: status === 500 ? "Внутренняя ошибка сервера." : err.message });
});

const storeInfo = await initStore(config.dataDir);
console.log(`[store] пользователей в базе: ${storeInfo.count} (${storeInfo.filePath})`);

app.listen(config.port, () => {
  console.log(`[api] Pixora API слушает http://localhost:${config.port}`);
  console.log(`[api] режим: ${config.nodeEnv}, доверять прокси: ${config.trustProxy}`);
  if (config.telegram.enabled && config.telegram.token && config.telegram.chatId) {
    console.log("[api] Telegram-уведомления включены");
  }
});
