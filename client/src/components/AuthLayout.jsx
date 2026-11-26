import PhoneMockup from "./PhoneMockup.jsx";

const FOOTER_LINKS = ["О Pixora", "Помощь", "Конфиденциальность", "Условия", "Язык"];

export default function AuthLayout({ children }) {
  return (
    <div className="page">
      <main className="shell">
        <div className="shell__visual">
          <PhoneMockup />
        </div>
        <div className="shell__column">{children}</div>
      </main>

      <footer className="footer">
        <nav className="footer__links" aria-label="Ссылки в подвале">
          {FOOTER_LINKS.map((label) => (
            <a
              key={label}
              href="#demo"
              data-track={`Клик в подвале: ${label}`}
              onClick={(e) => e.preventDefault()}
            >
              {label}
            </a>
          ))}
        </nav>
        <p className="footer__copy">© 2026 Pixora · демонстрационный проект · не связан с Instagram/Meta</p>
      </footer>
    </div>
  );
}
