export default function PhoneMockup() {
  return (
    <div className="phone" aria-hidden="true">
      <div className="phone__notch" />
      <div className="phone__screen">
        <div className="phone__topbar">
          <span className="phone__brand">Pixora</span>
          <span className="phone__topbar-icons">
            <i />
            <i />
          </span>
        </div>

        <div className="phone__stories">
          {Array.from({ length: 5 }).map((_, i) => (
            <span className="phone__story" key={i} />
          ))}
        </div>

        <article className="phone__post">
          <div className="phone__post-head">
            <span className="phone__avatar" />
            <span className="phone__meta">
              <i />
              <i />
            </span>
          </div>
          <div className="phone__media" />
          <div className="phone__actions">
            <span />
            <span />
            <span />
          </div>
          <div className="phone__caption">
            <i />
            <i />
          </div>
        </article>

        <article className="phone__post phone__post--peek">
          <div className="phone__post-head">
            <span className="phone__avatar" />
            <span className="phone__meta">
              <i />
              <i />
            </span>
          </div>
          <div className="phone__media phone__media--alt" />
        </article>
      </div>
    </div>
  );
}
