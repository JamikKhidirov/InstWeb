import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api.js";
import { trackEvent } from "../analytics.js";
import AuthLayout from "../components/AuthLayout.jsx";
import FloatingInput from "../components/FloatingInput.jsx";
import Logo from "../components/Logo.jsx";

// В dev-режиме React StrictMode запускает эффекты дважды,
// поэтому визит отправляем один раз за загрузку страницы.
let visitSent = false;

export default function LoginPage() {
  const location = useLocation();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(location.state?.notice || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Pixora · Вход";

    if (!visitSent) {
      visitSent = true;
      trackEvent("visit", "Открыта страница входа");
    }

    // Делегирование кликов: отправляем только название действия
    // из data-track. Значения полей формы не читаются.
    const onClick = (event) => {
      const target =
        event.target instanceof Element ? event.target.closest("[data-track]") : null;
      if (!target) return;
      trackEvent("click", target.getAttribute("data-track") || "Клик");
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const canSubmit = login.trim().length > 0 && password.length > 0 && !loading;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { login: login.trim(), password },
      });
      setPassword("");
      setInfo(
        `Вход выполнен: @${data.user.username}. Это демо — дальше экрана входа приложение не идёт.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <section className="card card--auth">
        <Logo />

        <form className="form" onSubmit={handleSubmit} noValidate>
          <FloatingInput
            label="Телефон, имя пользователя или эл. адрес"
            name="login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="text"
          />

          <FloatingInput
            label="Пароль"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            rightSlot={
              <button
                type="button"
                className="field__action"
                data-track={showPassword ? "Скрыть пароль" : "Показать пароль"}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? "Скрыть" : "Показать"}
              </button>
            }
          />

          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="alert alert--info" role="status">
              {info}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            data-track="Нажата кнопка «Войти»"
            disabled={!canSubmit}
          >
            {loading ? <span className="spinner" aria-hidden="true" /> : "Войти"}
          </button>
        </form>

        <button
          type="button"
          className="forgot"
          data-track="Нажата ссылка «Забыли пароль?»"
          onClick={() =>
            setInfo(
              "Демо-режим: восстановление пароля отключено. Демо-аккаунт создаёт администратор сервера."
            )
          }
        >
          Забыли пароль?
        </button>

        <p className="demo-note">
          Pixora — учебный демо-проект. Не связан с Instagram или Meta.
          Вход возможен только в демо-аккаунт, созданный администратором.
        </p>
      </section>
    </AuthLayout>
  );
}
