const BASE = import.meta.env.VITE_API_URL || "";

/**
 * Тонкая обёртка над fetch: JSON, токен, человекочитаемые ошибки.
 */
export async function api(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Нет связи с сервером. Проверьте, запущен ли API.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* пустой ответ */
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Ошибка ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
