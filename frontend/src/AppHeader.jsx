export default function AppHeader({ page, onGoHome, onGoRules, onGoProfile, authEmail, onLogout }) {
  return (
    <header className="app-header">
      <div className="app-header-brand-wrap">
        <button type="button" className="app-header-brand" onClick={onGoHome}>
          JJK Trading Labs
        </button>
      </div>
      <p className="app-header-disclaimer">
        For education and information only — not financial advice.
      </p>
      <nav className="app-header-nav" aria-label="Site">
        {page !== "app" ? (
          <button type="button" className="app-header-link" onClick={onGoHome}>
            Dashboard
          </button>
        ) : null}
        {page !== "rules" ? (
          <button type="button" className="app-header-link" onClick={onGoRules}>
            Open &amp; close rules
          </button>
        ) : null}
        {page !== "profile" ? (
          <button type="button" className="app-header-link" onClick={onGoProfile}>
            Profile
          </button>
        ) : null}
      </nav>
      <div className="app-header-account">
        <span>{authEmail}</span>
        <button type="button" className="app-header-logout-btn" onClick={onLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}
