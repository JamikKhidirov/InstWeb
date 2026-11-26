/**
 * Оригинальный знак Pixora: стилизованная диафрагма (апертура).
 * Не является логотипом Instagram или Meta.
 */
export default function Logo({ className = "" }) {
  return (
    <div className={`brand ${className}`.trim()} aria-label="Pixora">
      <svg
        className="brand__mark"
        viewBox="0 0 48 48"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pixora-mark" x1="6" y1="4" x2="42" y2="44">
            <stop offset="0" stopColor="#2ec5ff" />
            <stop offset="0.55" stopColor="#6a5cff" />
            <stop offset="1" stopColor="#b44dff" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="20" fill="none" stroke="url(#pixora-mark)" strokeWidth="3.5" />
        <path
          d="M24 6.5 35.6 13v12.4L24 32 12.4 25.4V13L24 6.5Z"
          fill="none"
          stroke="url(#pixora-mark)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="19.2" r="3.4" fill="url(#pixora-mark)" />
      </svg>
      <span className="wordmark">Pixora</span>
    </div>
  );
}
