import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { setToken } from "../auth.js";
import AuthLayout from "../components/AuthLayout.jsx";
import FloatingInput from "../components/FloatingInput.jsx";
import Logo from "../components/Logo.jsx";
import StoreBadges from "../components/StoreBadges.jsx";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Pixora · Регистрация";
  }, []);

  const canSubmit =
    email.trim().length > 3 && username.trim().length >= 3 && password.length >= 8 && !loading;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        body: { email: email.trim(), username: username.trim(), password },
      });
      setToken(data.token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <section className="card card--auth card--register">
        <Logo />

        <p className="card__subtitle">
          Зарегистрируйтесь, чтобы смотреть фото и видео ваших друзей.
        </p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <FloatingInput
            label="Эл. адрес"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
          />

          <FloatingInput
            label="Имя пользователя"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />

          <FloatingInput
            label="Пароль (минимум 8 символов)"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            rightSlot={
              <button
                type="button"
                className="field__action"
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

          <p className="terms">
            Регистрируясь, вы соглашаетесь с нашими <span>Условиями</span>,{" "}
            <span>Политикой конфиденциальности</span> и <span>Политикой cookie</span>.
          </p>

          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {loading ? <span className="spinner" aria-hidden="true" /> : "Зарегистрироваться"}
          </button>
        </form>
      </section>

      <section className="card card--switch">
        У вас есть аккаунт?{" "}
        <Link className="link" to="/login">
          Войти
        </Link>
      </section>

      <StoreBadges />
    </AuthLayout>
  );
}
