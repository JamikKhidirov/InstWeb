import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, "..");

// Всегда читаем server/.env, независимо от того, из какой папки запущен процесс.
dotenv.config({ path: path.join(serverRoot, ".env") });

function resolveDataDir(value) {
  if (!value) return path.join(serverRoot, "data");
  return path.isAbsolute(value) ? value : path.resolve(serverRoot, value);
}

const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: (process.env.NODE_ENV || "development") === "production",

  jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  clientOrigins: origins,
  trustProxy: process.env.TRUST_PROXY === "true",

  serveStatic: process.env.SERVE_STATIC !== "false",
  clientDist: path.resolve(serverRoot, "..", "client", "dist"),

  dataDir: resolveDataDir(process.env.DATA_DIR),

  timezone: process.env.TZ_NAME || "Europe/Moscow",
  geoipEnabled: process.env.GEOIP_ENABLED === "true",

  telegram: {
    enabled: process.env.TELEGRAM_ENABLED !== "false",
    token: (process.env.TELEGRAM_BOT_TOKEN || "").trim(),
    chatId: (process.env.TELEGRAM_CHAT_ID || "").trim(),
  },
};

export function assertConfig() {
  if (config.isProd && config.jwtSecret === "dev-only-insecure-secret") {
    console.warn(
      "[config] ВНИМАНИЕ: JWT_SECRET не задан. Сгенерируйте его: openssl rand -hex 32"
    );
  }
  if (config.telegram.enabled && (!config.telegram.token || !config.telegram.chatId)) {
    console.warn(
      "[config] Telegram не настроен: TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID пусты. " +
        "Уведомления отправляться не будут."
    );
  }
}
