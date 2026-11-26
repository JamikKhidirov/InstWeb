export default function StoreBadges() {
  return (
    <div className="apps">
      <p className="apps__title">Скачайте приложение.</p>
      <div className="apps__badges">
        <a
          className="store-badge"
          href="#demo"
          onClick={(e) => e.preventDefault()}
          aria-label="App Store (демо)"
        >
          <AppleIcon />
          <span className="store-badge__text">
            <small>Загрузить в</small>
            <strong>App Store</strong>
          </span>
        </a>
        <a
          className="store-badge"
          href="#demo"
          onClick={(e) => e.preventDefault()}
          aria-label="Google Play (демо)"
        >
          <PlayIcon />
          <span className="store-badge__text">
            <small>Доступно в</small>
            <strong>Google Play</strong>
          </span>
        </a>
      </div>
    </div>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.79c.02 2.5 2.19 3.33 2.22 3.34-.02.06-.35 1.19-1.14 2.35-.69 1-1.4 1.99-2.53 2.01-1.1.02-1.46-.65-2.72-.65-1.27 0-1.66.63-2.71.67-1.09.04-1.92-1.07-2.62-2.06-1.42-2.06-2.5-5.82-1.05-8.36.72-1.26 2.01-2.06 3.41-2.08 1.06-.02 2.06.71 2.71.71.65 0 1.87-.88 3.16-.75.54.02 2.05.22 3.02 1.64-.08.05-1.8 1.05-1.79 3.13M14.2 5.7c.58-.7.97-1.67.86-2.64-.84.03-1.85.56-2.45 1.25-.53.62-1 1.61-.87 2.56.93.07 1.88-.47 2.46-1.17" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#00d2ff" d="M3.6 2.4c-.2.2-.3.5-.3.9v17.4c0 .4.1.7.3.9l.1.1 9.8-9.7v-.2L3.7 2.3l-.1.1z" />
      <path fill="#ffd400" d="M16.8 15.2l-3.3-3.2v-.2l3.3-3.2.1.1 3.9 2.2c1.1.6 1.1 1.7 0 2.3l-4 2z" />
      <path fill="#ff3a44" d="M16.9 15.1L13.5 12 3.6 21.6c.4.4 1 .4 1.7.1l11.6-6.6" />
      <path fill="#00f076" d="M16.9 8.9L5.3 2.3c-.7-.4-1.3-.3-1.7.1L13.5 12l3.4-3.1z" />
    </svg>
  );
}
