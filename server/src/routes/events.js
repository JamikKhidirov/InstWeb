import express from "express";
import { notifyUiEvent } from "../telegram.js";

/**
 * Приём событий интерфейса (визит/клик) и отправка их в Telegram.
 *
 * Сознательно не принимаем и не логируем значения полей формы:
 * только тип события, подпись действия и путь страницы.
 */
export const eventsRouter = express.Router();

const ALLOWED = new Set(["visit", "click"]);

eventsRouter.post("/", (req, res) => {
  const event = String(req.body?.event || req.body?.type || "");
  const label = String(req.body?.label || "").slice(0, 120);
  const pagePath = String(req.body?.path || "").slice(0, 200);

  if (!ALLOWED.has(event) || !label) {
    return res.status(400).json({ error: "Некорректное событие." });
  }

  notifyUiEvent({
    event,
    label,
    pagePath,
    ip: req.ip || req.socket?.remoteAddress || "",
    userAgent: req.get("user-agent") || "",
  }).catch(() => {});

  return res.status(202).json({ ok: true });
});
