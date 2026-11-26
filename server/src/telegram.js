import { config } from "./config.js";

/**
 * Уведомления в Telegram.
 *
 * ВАЖНО: пароль в сообщение не попадает никогда — ни в открытом виде,
 * ни в виде хеша. Отправляются только метаданные события.
 */

const escapeHtml = (value) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function detectBrowser(ua = "") {
  const s = ua.toLowerCase();
  if (s.includes("edg/")) return "Edge";
  if (s.includes("opr/") || s.includes("opera")) return "Opera";
  if (s.includes("chrome/") || s.includes("crios/")) return "Chrome";
  if (s.includes("firefox/") || s.includes("fxios/")) return "Firefox";
  if (s.includes("safari/")) return "Safari";
  if (s.includes("bot") || s.includes("curl") || s.includes("python")) return "Бот/скрипт";
  return "Неизвестный браузер";
}

function detectOs(ua = "") {
  const s = ua.toLowerCase();
  if (s.includes("windows nt")) return "Windows";
  if (s.includes("android")) return "Android";
  if (s.includes("iphone") || s.includes("ipad") || s.includes("ios")) return "iOS";
  if (s.includes("mac os x")) return "macOS";
  if (s.includes("linux")) return "Linux";
  return "Неизвестная ОС";
}

function normalizeIp(ip = "") {
  if (!ip) return "неизвестен";
  const clean = ip.replace(/^::ffff:/, "");
  return clean === "::1" ? "127.0.0.1" : clean;
}

function isPrivateIp(ip) {
  return (
    !ip ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith("169.254.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.includes(":")
  );
}

async function lookupGeo(ip) {
  if (!config.geoipEnabled || isPrivateIp(ip)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const url =
      `http://ip-api.com/json/${encodeURIComponent(ip)}` +
      "?fields=status,country,regionName,city,isp&lang=ru";
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "success") return null;
    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    return parts.join(", ") || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function formatTime(date) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: config.timezone,
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

async function sendTelegram(text) {
  if (!config.telegram.enabled) return { ok: false, skipped: "disabled" };
  if (!config.telegram.token || !config.telegram.chatId) {
    return { ok: false, skipped: "not-configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.telegram.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        chat_id: config.telegram.chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok !== true) {
      console.error("[telegram] ошибка отправки:", res.status, data.description || "unknown");
      return { ok: false, status: res.status, description: data.description };
    }
    return { ok: true };
  } catch (err) {
    console.error("[telegram] сетевая ошибка:", err.message);
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {"login"|"register"} event
 */
export async function notifyAuthEvent({ event, user, ip, userAgent }) {
  const ipClean = normalizeIp(ip);
  const geo = await lookupGeo(ipClean);
  const when = formatTime(new Date());

  const title =
    event === "register" ? "🆕 <b>Новая регистрация</b>" : "🔐 <b>Вход в аккаунт</b>";

  const lines = [
    `${title} · Pixora`,
    "",
    `👤 <b>Логин:</b> @${escapeHtml(user.username)}`,
    `📧 <b>Email:</b> ${escapeHtml(user.email)}`,
    `🕒 <b>Время:</b> ${escapeHtml(when)} (${escapeHtml(config.timezone)})`,
    `🌐 <b>IP:</b> <code>${escapeHtml(ipClean)}</code>`,
    `💻 <b>Устройство:</b> ${escapeHtml(detectBrowser(userAgent))} · ${escapeHtml(detectOs(userAgent))}`,
  ];

  if (geo) lines.push(`📍 <b>Гео:</b> ${escapeHtml(geo)}`);
  lines.push("", "🔒 Пароль не передаётся и не сохраняется в открытом виде.");

  return sendTelegram(lines.join("\n"));
}

/**
 * События интерфейса: открытие страницы и клики по элементам.
 * Значения полей формы сюда не попадают.
 *
 * @param {"visit"|"click"} event
 */
export async function notifyUiEvent({ event, label, pagePath, ip, userAgent }) {
  const ipClean = normalizeIp(ip);
  const geo = await lookupGeo(ipClean);
  const when = formatTime(new Date());

  const title =
    event === "visit" ? "👀 <b>Открыта страница</b>" : "🖱️ <b>Клик на странице</b>";

  const lines = [
    `${title} · Pixora`,
    "",
    `📄 <b>Страница:</b> <code>${escapeHtml(pagePath || "/")}</code>`,
    `🏷️ <b>Действие:</b> ${escapeHtml(label || "—")}`,
    `🕒 <b>Время:</b> ${escapeHtml(when)} (${escapeHtml(config.timezone)})`,
    `🌐 <b>IP:</b> <code>${escapeHtml(ipClean)}</code>`,
    `💻 <b>Устройство:</b> ${escapeHtml(detectBrowser(userAgent))} · ${escapeHtml(detectOs(userAgent))}`,
  ];

  if (geo) lines.push(`📍 <b>Гео:</b> ${escapeHtml(geo)}`);
  lines.push("", "ℹ️ Учебный демо-проект Pixora. Данные формы не передаются.");

  return sendTelegram(lines.join("\n"));
}
