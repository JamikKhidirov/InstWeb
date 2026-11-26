const ENDPOINT = `${import.meta.env.VITE_API_URL || ""}/api/events`;

/**
 * Отправляет в API событие интерфейса: "visit" (открыта страница)
 * или "click" (нажат элемент с атрибутом data-track).
 *
 * ВАЖНО: сюда никогда не попадают значения полей формы — только
 * название действия. Пароли и логины не отправляются.
 */
export function trackEvent(type, label) {
  try {
    const payload = JSON.stringify({
      type,
      label: String(label || "").slice(0, 120),
      path: window.location.pathname,
    });

    // sendBeacon не блокирует переход по ссылке и работает при закрытии вкладки.
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* аналитика не должна ломать страницу */
  }
}
