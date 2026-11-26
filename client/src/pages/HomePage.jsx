import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { clearToken, getToken } from "../auth.js";
import Logo from "../components/Logo.jsx";

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Pixora · Профиль";
    const token = getToken();
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }
    api("/api/auth/me", { token })
      .then((data) => setUser(data.user))
      .catch((err) => {
        clearToken();
        navigate("/login", {
          replace: true,
          state: { notice: err.status === 401 ? "Сессия истекла, войдите заново." : err.message },
        });
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  function handleLogout() {
    const token = getToken();
    if (token) api("/api/auth/logout", { method: "POST", token }).catch(() => {});
    clearToken();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <div className="page page--center">
        <span className="spinner spinner--dark" aria-label="Загрузка" />
      </div>
    );
  }

  if (!user) return null;

  const initial = user.username.slice(0, 1).toUpperCase();

  return (
    <div className="page page--center">
      <section className="card profile-card">
        <Logo className="wordmark--small" />

        <div className="profile-card__avatar" aria-hidden="true">
          {initial}
        </div>

        <h1 className="profile-card__title">@{user.username}</h1>
        <p className="profile-card__email">{user.email}</p>

        <p className="profile-card__note">
          Вы вошли в демонстрационное приложение. Пароль хранится только в виде хеша на вашем
          сервере и никогда не отправляется в Telegram.
        </p>

        <button type="button" className="btn-primary btn-primary--wide" onClick={handleLogout}>
          Выйти
        </button>
      </section>

      <p className="page__footnote">
        Pixora — учебный проект. Не связан с Instagram или Meta.
      </p>
    </div>
  );
}
