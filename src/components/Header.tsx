interface HeaderProps {
  lastUpdate: string;
  onRefresh: () => void;
  loading: boolean;
}

export function Header({ lastUpdate, onRefresh, loading }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>🗳️ Urna</h1>
          <span className="subtitle">Apuração em tempo real</span>
        </div>
        <div className="header-info">
          {lastUpdate && (
            <span className="last-update">
              Atualizado: {lastUpdate}
            </span>
          )}
          <button
            className="refresh-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? "⏳" : "🔄"} Atualizar
          </button>
        </div>
      </div>
    </header>
  );
}
